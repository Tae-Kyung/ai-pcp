import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { FAST_REVIEW_SYSTEM_PROMPT, FAST_REVIEW_PROMPT } from "@/lib/prompts/evaluation";

export const maxDuration = 120;

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found");

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

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Get latest document
  const { data: doc } = await supabase
    .from("pcp_documents")
    .select("content")
    .eq("project_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!doc?.content) {
    return new Response(JSON.stringify({ error: "No document found" }), { status: 404 });
  }

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
        send("status", { message: "Connecting to AI expert..." });

        const client = getClaudeClient();
        const prompt = FAST_REVIEW_PROMPT.replace("{pcp_document}", JSON.stringify(doc.content));

        send("status", { message: "AI expert is reviewing your PCP..." });

        let rawOutput = "";
        const streamResponse = client.messages.stream({
          model: MODELS.standard,
          max_tokens: 2000,
          system: FAST_REVIEW_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        streamResponse.on("text", (text) => {
          rawOutput += text;
          send("text", { chunk: text });
        });

        await streamResponse.finalMessage();

        send("status", { message: "Parsing review results..." });

        let result;
        try {
          result = extractJSON(rawOutput);
        } catch {
          send("error", { error: "Failed to parse review. Please try again." });
          controller.close();
          return;
        }

        // Save review to latest document
        const { data: latestDoc } = await supabase
          .from("pcp_documents")
          .select("id")
          .eq("project_id", id)
          .order("version", { ascending: false })
          .limit(1)
          .single();

        if (latestDoc) {
          await supabase
            .from("pcp_documents")
            .update({ review: result })
            .eq("id", latestDoc.id);
        }

        send("done", { review: result });
      } catch (error) {
        console.error("[PCP Review] Error:", error);
        send("error", { error: error instanceof Error ? error.message : "Review failed" });
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
