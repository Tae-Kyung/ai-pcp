import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { PCP_EXPERT_SYSTEM_PROMPT } from "@/lib/prompts/system";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { section, sectionData, prompt, fullDocument } = await request.json();

  if (!section || !prompt) {
    return NextResponse.json({ error: "section and prompt are required" }, { status: 400 });
  }

  const sectionLabels: Record<string, string> = {
    basicInfo: "Basic Project Information",
    rationale: "Project Rationale",
    description: "Project Description",
    stakeholderAnalysis: "Stakeholder Analysis",
    management: "Project Management & Implementation",
  };

  const userPrompt = `You are editing a PCP (Project Concept Paper) document. The user wants to modify the "${sectionLabels[section] ?? section}" section.

## CURRENT FULL DOCUMENT (for context):
${JSON.stringify(fullDocument, null, 2)}

## CURRENT SECTION DATA ("${sectionLabels[section] ?? section}"):
${JSON.stringify(sectionData, null, 2)}

## USER'S EDIT REQUEST:
${prompt}

## INSTRUCTIONS:
- Apply the user's requested changes to the section data
- Keep the same JSON structure and field names
- Only modify what the user asked for; preserve everything else
- Ensure consistency with the rest of the document
- Return ONLY the updated section as a JSON object, no explanation

Respond with the updated JSON object only.`;

  try {
    const client = getClaudeClient();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        try {
          send("status", { message: "AI is refining the section..." });

          let rawOutput = "";
          const streamResponse = client.messages.stream({
            model: MODELS.fast,
            max_tokens: 4096,
            system: PCP_EXPERT_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          let charCount = 0;
          streamResponse.on("text", (text) => {
            rawOutput += text;
            charCount += text.length;
            if (charCount > 100) {
              send("progress", { chars: rawOutput.length });
              charCount = 0;
            }
          });

          await streamResponse.finalMessage();

          send("status", { message: "Parsing result..." });

          // Parse JSON robustly
          let result;
          try {
            let cleaned = rawOutput.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON found");
            let jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
            try { result = JSON.parse(jsonStr); } catch {
              jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
              result = JSON.parse(jsonStr);
            }
          } catch {
            send("error", { error: "Failed to parse AI response. Please try again." });
            controller.close();
            return;
          }

          send("done", { section, updatedData: result });
        } catch (error) {
          send("error", { error: error instanceof Error ? error.message : "Refine failed" });
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refine failed" },
      { status: 500 }
    );
  }
}
