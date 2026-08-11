import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { PCP_EXPERT_SYSTEM_PROMPT, PCP_GENERATION_PROMPT } from "@/lib/prompts/system";
import type { HarnessTestInput } from "@/lib/types/harness";
import type { PCPDocument } from "@/lib/types/pcp";

export interface GenerationResult {
  pcp: PCPDocument | null;
  rawOutput: string;
  tokensUsed: number;
  timeMs: number;
  error?: string;
}

export async function generatePCP(input: HarnessTestInput): Promise<GenerationResult> {
  const client = getClaudeClient();
  const startTime = Date.now();

  const prompt = PCP_GENERATION_PROMPT.replace("{input_data}", JSON.stringify(input, null, 2));

  try {
    const response = await client.messages.create({
      model: MODELS.standard,
      max_tokens: 8192,
      system: PCP_EXPERT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const rawOutput =
      response.content[0].type === "text" ? response.content[0].text : "";

    const tokensUsed =
      (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    // JSON 파싱 시도
    let pcp: PCPDocument | null = null;
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        pcp = {
          id: crypto.randomUUID(),
          projectId: "",
          ...parsed,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // JSON 파싱 실패 시 rawOutput만 반환
    }

    return {
      pcp,
      rawOutput,
      tokensUsed,
      timeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      pcp: null,
      rawOutput: "",
      tokensUsed: 0,
      timeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
