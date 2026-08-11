import { describe, it, expect } from "vitest";
import { calculateOverallScore } from "./evaluator";
import { EVALUATION_WEIGHTS, type EvaluationDimensions } from "@/lib/types/harness";

function makeDimensions(overrides: Partial<Record<keyof EvaluationDimensions, number>> = {}): EvaluationDimensions {
  const defaults: Record<keyof EvaluationDimensions, number> = {
    structure: 80,
    logic: 75,
    sdgsAlignment: 85,
    relevance: 78,
    resultsFramework: 70,
    riskSustainability: 72,
    writingQuality: 82,
    budget: 80,
  };

  const merged = { ...defaults, ...overrides };

  const dims = {} as EvaluationDimensions;
  for (const [key, score] of Object.entries(merged)) {
    const k = key as keyof EvaluationDimensions;
    dims[k] = {
      score,
      weight: EVALUATION_WEIGHTS[k],
      feedback: "test",
      details: [],
    };
  }
  return dims;
}

describe("calculateOverallScore", () => {
  it("should return weighted average of all dimensions", () => {
    // 모든 항목이 동일 점수일 때 그 점수가 나와야 함
    const dims = makeDimensions({
      structure: 80,
      logic: 80,
      sdgsAlignment: 80,
      relevance: 80,
      resultsFramework: 80,
      riskSustainability: 80,
      writingQuality: 80,
      budget: 80,
    });

    expect(calculateOverallScore(dims)).toBe(80);
  });

  it("should weight logic (20%) more heavily than budget (5%)", () => {
    // logic이 높고 budget이 낮은 경우 vs 반대의 경우
    const highLogic = makeDimensions({ logic: 100, budget: 0 });
    const highBudget = makeDimensions({ logic: 0, budget: 100 });

    expect(calculateOverallScore(highLogic)).toBeGreaterThan(calculateOverallScore(highBudget));
  });

  it("should return 0 when all scores are 0", () => {
    const dims = makeDimensions({
      structure: 0, logic: 0, sdgsAlignment: 0, relevance: 0,
      resultsFramework: 0, riskSustainability: 0, writingQuality: 0, budget: 0,
    });

    expect(calculateOverallScore(dims)).toBe(0);
  });

  it("should return 100 when all scores are 100", () => {
    const dims = makeDimensions({
      structure: 100, logic: 100, sdgsAlignment: 100, relevance: 100,
      resultsFramework: 100, riskSustainability: 100, writingQuality: 100, budget: 100,
    });

    expect(calculateOverallScore(dims)).toBe(100);
  });
});

describe("EVALUATION_WEIGHTS", () => {
  it("should sum to 1.0", () => {
    const sum = Object.values(EVALUATION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("should have 8 dimensions", () => {
    expect(Object.keys(EVALUATION_WEIGHTS)).toHaveLength(8);
  });
});
