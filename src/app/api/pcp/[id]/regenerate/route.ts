import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { PCP_EXPERT_SYSTEM_PROMPT, PCP_GENERATION_PROMPT } from "@/lib/prompts/system";

export const maxDuration = 120;

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found in response");

  let jsonStr = cleaned.slice(firstBrace, lastBrace + 1);

  try { return JSON.parse(jsonStr); } catch { /* continue */ }

  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(jsonStr); } catch { /* continue */ }

  jsonStr = jsonStr.replace(/[\x00-\x1f\x7f]/g, (ch) => {
    if (ch === "\n" || ch === "\r" || ch === "\t") return ch;
    return "";
  });

  return JSON.parse(jsonStr);
}

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Get existing project
  const { data: project, error: projectError } = await supabase
    .from("pcp_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  // Update status to generating
  await supabase.from("pcp_projects").update({ status: "generating" }).eq("id", id);

  // Build input from project data
  const input = {
    projectTitle: project.title,
    requestingCountry: project.country,
    sector: project.sector,
    problemStatement: "Generate a comprehensive PCP for this project",
    targetBeneficiaries: "",
    projectDuration: "3 years",
    estimatedBudget: 10000000,
    sdgs: [1],
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      try {
        send("status", { step: "generating", message: "Connecting to AI..." });

        const client = getClaudeClient();
        const prompt = PCP_GENERATION_PROMPT.replace("{input_data}", JSON.stringify(input, null, 2));
        const startTime = Date.now();

        send("status", { step: "generating", message: "AI is writing your PCP document..." });

        let rawOutput = "";
        let inputTokens = 0;
        let outputTokens = 0;

        const streamResponse = client.messages.stream({
          model: MODELS.standard,
          max_tokens: 16000,
          system: PCP_EXPERT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        streamResponse.on("text", (text) => {
          rawOutput += text;
          send("text", { chunk: text });
        });

        const finalMessage = await streamResponse.finalMessage();
        inputTokens = finalMessage.usage?.input_tokens ?? 0;
        outputTokens = finalMessage.usage?.output_tokens ?? 0;
        const tokensUsed = inputTokens + outputTokens;
        const timeMs = Date.now() - startTime;

        send("status", { step: "parsing", message: "Parsing AI response..." });

        let content;
        try {
          content = extractJSON(rawOutput);
        } catch (parseError) {
          console.error("[PCP Regenerate] JSON parse error:", parseError);
          await supabase.from("pcp_projects").update({ status: "draft" }).eq("id", id);
          send("error", { error: "Failed to parse AI response. Please try again." });
          controller.close();
          return;
        }

        send("status", { step: "saving", message: "Saving document..." });

        // Get latest version
        const { data: latest } = await supabase
          .from("pcp_documents")
          .select("version")
          .eq("project_id", id)
          .order("version", { ascending: false })
          .limit(1)
          .single();

        const newVersion = (latest?.version ?? 0) + 1;

        const { data: doc, error: docError } = await supabase
          .from("pcp_documents")
          .insert({
            project_id: id,
            version: newVersion,
            content,
            raw_output: rawOutput,
            tokens_used: tokensUsed,
            generation_time_ms: timeMs,
          })
          .select()
          .single();

        if (docError) {
          send("error", { error: "Failed to save document" });
          controller.close();
          return;
        }

        await supabase.from("pcp_projects").update({ status: "generated" }).eq("id", id);

        send("done", {
          projectId: id,
          documentId: doc.id,
          tokensUsed,
          generationTimeMs: timeMs,
        });
      } catch (error) {
        console.error("[PCP Regenerate] Error:", error);
        await supabase.from("pcp_projects").update({ status: "draft" }).eq("id", id);
        send("error", { error: error instanceof Error ? error.message : "Generation failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
