import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { extractJSON } from "@/lib/claude/json";
import { DECK_SYSTEM_PROMPT, buildDeckPrompt } from "@/lib/prompts/deck";
import { isDeck } from "@/lib/types/deck";

// Authoring a full deck runs well past the 120s used elsewhere.
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

function sseResponse(run: (send: (event: string, data: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        await run(send);
      } catch (error) {
        console.error("[PCP Deck] Error:", error);
        send("error", { error: error instanceof Error ? error.message : "Deck generation failed" });
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

// POST /api/pcp/[id]/deck - Author (or return a cached) slide plan.
// Pass ?refresh=1 to re-author even when a cached plan exists.
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = isAdmin(user.email) ? createAdminClient() : supabase;

  return sseResponse(async (send) => {
    const { data: project } = await db
      .from("pcp_projects")
      .select("title, country, sector")
      .eq("id", id)
      .single();

    if (!project) {
      send("error", { error: "Project not found" });
      return;
    }

    const { data: doc } = await db
      .from("pcp_documents")
      .select("id, content, deck")
      .eq("project_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (!doc?.content) {
      send("error", { error: "No document found" });
      return;
    }

    if (!refresh && isDeck(doc.deck)) {
      send("done", { deck: doc.deck, cached: true });
      return;
    }

    send("status", { message: "Reading the project concept paper..." });

    const client = getClaudeClient();
    const streamed = client.messages.stream({
      model: MODELS.standard,
      max_tokens: 16000,
      system: DECK_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildDeckPrompt({
            content: doc.content,
            title: project.title,
            country: project.country,
            sector: project.sector,
          }),
        },
      ],
    });

    // Slide titles surface as they are written, so the wait shows real progress.
    let raw = "";
    let announced = 0;
    streamed.on("text", (text) => {
      raw += text;
      const titles = [...raw.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g)];
      if (titles.length > announced) {
        announced = titles.length;
        send("status", {
          message: `Writing slide ${announced}: ${titles[announced - 1][1]}`,
        });
      }
    });

    await streamed.finalMessage();
    send("status", { message: "Laying out the deck..." });

    const deck = extractJSON(raw);
    if (!isDeck(deck)) {
      send("error", { error: "AI returned an unusable slide plan. Please try again." });
      return;
    }

    // Cache is best-effort: a missing `deck` column must not fail the download.
    const { error: cacheError } = await db
      .from("pcp_documents")
      .update({ deck })
      .eq("id", doc.id);
    if (cacheError) console.warn("[PCP Deck] Cache write failed:", cacheError.message);

    send("done", { deck, cached: false });
  });
}
