import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { PCP_EXPERT_SYSTEM_PROMPT, PCP_SECTION_ASSIST_PROMPT } from "@/lib/prompts/system";
import { pcpAssistInputSchema } from "@/lib/validations/pcp";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = pcpAssistInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const { section, context, userInput } = parsed.data;

  try {
    const client = getClaudeClient();
    const prompt = PCP_SECTION_ASSIST_PROMPT
      .replace("{context}", JSON.stringify(context ?? {}, null, 2))
      .replace("{section}", section)
      .replace("{user_input}", JSON.stringify(userInput ?? {}, null, 2));

    const response = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 4096,
      system: PCP_EXPERT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const rawOutput = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json({ suggestion: JSON.parse(jsonMatch[0]) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assist failed" },
      { status: 500 }
    );
  }
}
