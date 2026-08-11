import { getClaudeClient, MODELS } from "@/lib/claude/client";
import { EVALUATION_SYSTEM_PROMPT, EVALUATION_PROMPT } from "@/lib/prompts/evaluation";
import {
  EVALUATION_WEIGHTS,
  type EvaluationDimensions,
  type EvaluationResult,
  type DimensionScore,
} from "@/lib/types/harness";

export interface RawEvaluationOutput {
  dimensions: Record<string, { score: number; feedback: string; details: string[] }>;
  improvements: string[];
  strengths: string[];
}

/**
 * Claude API를 호출하여 PCP 문서를 평가한다.
 */
export async function evaluatePCP(
  pcpContent: string,
  testCaseId: string,
  promptVersion: string
): Promise<EvaluationResult> {
  const client = getClaudeClient();
  const startTime = Date.now();

  const prompt = EVALUATION_PROMPT.replace("{pcp_document}", pcpContent);

  const response = await client.messages.create({
    model: MODELS.standard,
    max_tokens: 4096,
    system: EVALUATION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const rawOutput =
    response.content[0].type === "text" ? response.content[0].text : "";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  // JSON 파싱
  const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse evaluation response as JSON");
  }

  const parsed: RawEvaluationOutput = JSON.parse(jsonMatch[0]);

  // 가중치를 적용하여 DimensionScore로 변환
  const dimensions = buildDimensions(parsed.dimensions);

  // 가중 평균 종합 점수 계산
  const overallScore = calculateOverallScore(dimensions);

  return {
    id: crypto.randomUUID(),
    testCaseId,
    promptVersion,
    overallScore,
    dimensions,
    improvements: parsed.improvements ?? [],
    strengths: parsed.strengths ?? [],
    evaluatedAt: new Date().toISOString(),
    generationTimeMs: 0, // 호출자가 설정
    evaluationTimeMs: Date.now() - startTime,
    tokensUsed: {
      generation: 0, // 호출자가 설정
      evaluation: tokensUsed,
    },
  };
}

function buildDimensions(
  raw: Record<string, { score: number; feedback: string; details: string[] }>
): EvaluationDimensions {
  const keys: (keyof EvaluationDimensions)[] = [
    "structure",
    "logic",
    "sdgsAlignment",
    "relevance",
    "resultsFramework",
    "riskSustainability",
    "writingQuality",
    "budget",
  ];

  const dimensions = {} as EvaluationDimensions;

  for (const key of keys) {
    const rawKey = toRawKey(key);
    const rawDim = raw[rawKey] ?? raw[key] ?? { score: 0, feedback: "Not evaluated", details: [] };

    dimensions[key] = {
      score: clamp(rawDim.score, 0, 100),
      weight: EVALUATION_WEIGHTS[key],
      feedback: rawDim.feedback,
      details: rawDim.details ?? [],
    };
  }

  return dimensions;
}

/**
 * camelCase를 Claude가 반환할 수 있는 여러 키 형식으로 매핑
 */
function toRawKey(key: string): string {
  const map: Record<string, string> = {
    sdgsAlignment: "sdgs_alignment",
    resultsFramework: "results_framework",
    riskSustainability: "risk_sustainability",
    writingQuality: "writing_quality",
  };
  return map[key] ?? key;
}

/**
 * 8개 항목의 가중 평균 점수를 산출한다.
 */
export function calculateOverallScore(dimensions: EvaluationDimensions): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, dim] of Object.entries(dimensions) as [keyof EvaluationDimensions, DimensionScore][]) {
    const weight = EVALUATION_WEIGHTS[key];
    weightedSum += dim.score * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
