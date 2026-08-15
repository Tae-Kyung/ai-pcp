import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { PCP_EXPERT_SYSTEM_PROMPT, PCP_GENERATION_PROMPT } from "@/lib/prompts/system";
import { pcpGenerateInputSchema } from "@/lib/validations/pcp";
import { extractJSON } from "@/lib/claude/json";

export const maxDuration = 300;


export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = pcpGenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;

  // Ensure profile exists
  await supabase.from("pcp_profiles").upsert({ id: user.id }, { onConflict: "id" });

  // Create project
  const projectRow = {
    user_id: user.id,
    title: input.projectTitle,
    country: input.requestingCountry,
    sector: input.sector,
    status: "generating",
  };

  // `input` is kept so regeneration can reuse the problem statement, budget,
  // duration and SDGs the user entered. Its column ships in
  // supabase/add-project-input-column.sql; until that migration is applied,
  // fall back rather than blocking project creation.
  let { data: project, error: projectError } = await supabase
    .from("pcp_projects")
    .insert({ ...projectRow, input })
    .select()
    .single();

  if (projectError?.code === "PGRST204") {
    console.warn("[PCP Generate] pcp_projects.input missing; run add-project-input-column.sql");
    ({ data: project, error: projectError } = await supabase
      .from("pcp_projects")
      .insert(projectRow)
      .select()
      .single());
  }

  if (projectError || !project) {
    console.error("Failed to create project:", projectError);
    return NextResponse.json({ error: "Failed to create project", details: projectError?.message }, { status: 500 });
  }

  // Stream response using SSE
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

        // Use streaming API
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

        // Parse JSON robustly with multiple strategies
        let content;
        try {
          content = extractJSON(rawOutput);
        } catch (parseError) {
          console.error("[PCP Generate] JSON parse error:", parseError, "\nRaw output length:", rawOutput.length, "\nFirst 500 chars:", rawOutput.slice(0, 500), "\nLast 500 chars:", rawOutput.slice(-500));
          await supabase.from("pcp_projects").update({ status: "draft" }).eq("id", project.id);
          send("error", { error: "Failed to parse AI response. Please try again." });
          controller.close();
          return;
        }

        send("status", { step: "saving", message: "Saving document..." });

        // Save document
        const { data: doc, error: docError } = await supabase
          .from("pcp_documents")
          .insert({
            project_id: project.id,
            version: 1,
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

        await supabase.from("pcp_projects").update({ status: "generated" }).eq("id", project.id);

        send("done", {
          projectId: project.id,
          documentId: doc.id,
          tokensUsed,
          generationTimeMs: timeMs,
        });
      } catch (error) {
        console.error("[PCP Generate] Error:", error);
        await supabase.from("pcp_projects").update({ status: "draft" }).eq("id", project.id);
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
