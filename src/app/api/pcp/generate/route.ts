import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { PCP_EXPERT_SYSTEM_PROMPT, PCP_GENERATION_PROMPT } from "@/lib/prompts/system";
import { pcpGenerateInputSchema } from "@/lib/validations/pcp";

export const maxDuration = 120;

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
  const { data: project, error: projectError } = await supabase
    .from("pcp_projects")
    .insert({
      user_id: user.id,
      title: input.projectTitle,
      country: input.requestingCountry,
      sector: input.sector,
      status: "generating",
    })
    .select()
    .single();

  if (projectError || !project) {
    console.error("Failed to create project:", projectError);
    return NextResponse.json({ error: "Failed to create project", details: projectError?.message }, { status: 500 });
  }

  // Stream response using SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
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
          max_tokens: 16384,
          system: PCP_EXPERT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        let charCount = 0;
        streamResponse.on("text", (text) => {
          rawOutput += text;
          charCount += text.length;
          // Send progress every ~200 chars
          if (charCount > 200) {
            send("progress", { chars: rawOutput.length });
            charCount = 0;
          }
        });

        const finalMessage = await streamResponse.finalMessage();
        inputTokens = finalMessage.usage?.input_tokens ?? 0;
        outputTokens = finalMessage.usage?.output_tokens ?? 0;
        const tokensUsed = inputTokens + outputTokens;
        const timeMs = Date.now() - startTime;

        send("status", { step: "parsing", message: "Parsing AI response..." });

        // Parse JSON robustly
        let content;
        try {
          // Strip markdown code fences if present
          let cleaned = rawOutput.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "");
          // Find balanced JSON, skipping braces inside strings
          const start = cleaned.indexOf("{");
          if (start === -1) throw new Error("No JSON object found");
          let depth = 0;
          let end = -1;
          let inString = false;
          let escape = false;
          for (let i = start; i < cleaned.length; i++) {
            const ch = cleaned[i];
            if (escape) { escape = false; continue; }
            if (ch === "\\") { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === "{") depth++;
            if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
          }
          if (end === -1) throw new Error("Unbalanced JSON");
          let jsonStr = cleaned.slice(start, end);
          // Fix trailing commas
          jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
          content = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error("[PCP Generate] JSON parse error:", parseError, "\nRaw output (first 1000):", rawOutput.slice(0, 1000));
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
