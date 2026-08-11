import { TEST_CASES } from "./test-cases";
import { generatePCP } from "./generator";
import { evaluatePCP } from "./evaluator";
import type {
  HarnessTestCase,
  HarnessRunSummary,
  EvaluationResult,
  RegressionCheck,
} from "@/lib/types/harness";

const PROMPT_VERSION = "v1.0.0";
const REGRESSION_THRESHOLD = 5; // 5% 이상 하락 시 regression

export interface RunOptions {
  testCaseIds?: string[];       // 특정 케이스만 실행 (미지정 시 전체)
  promptVersion?: string;
  previousRun?: HarnessRunSummary; // 회귀 비교 대상
  onProgress?: (msg: string) => void;
}

/**
 * 하네스 테스트를 실행한다.
 * 1. 테스트 케이스별로 PCP 생성
 * 2. 생성된 PCP를 평가
 * 3. 결과를 종합하여 반환
 */
export async function runHarness(options: RunOptions = {}): Promise<HarnessRunSummary> {
  const version = options.promptVersion ?? PROMPT_VERSION;
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const log = options.onProgress ?? console.log;

  // 실행할 테스트 케이스 필터링
  const cases: HarnessTestCase[] = options.testCaseIds
    ? TEST_CASES.filter((tc) => options.testCaseIds!.includes(tc.id))
    : TEST_CASES;

  log(`[Harness] Starting run ${runId} with ${cases.length} test cases (prompt ${version})`);

  const results: EvaluationResult[] = [];

  for (const tc of cases) {
    log(`[Harness] Running ${tc.id}: ${tc.name}...`);

    // Step 1: PCP 생성
    log(`[Harness]   Generating PCP...`);
    const genResult = await generatePCP(tc.input);

    if (genResult.error || !genResult.pcp) {
      log(`[Harness]   Generation FAILED: ${genResult.error ?? "empty output"}`);
      results.push(createFailedResult(tc.id, version, genResult.error ?? "Generation failed"));
      continue;
    }

    log(`[Harness]   Generated in ${genResult.timeMs}ms (${genResult.tokensUsed} tokens)`);

    // Step 2: PCP 평가
    log(`[Harness]   Evaluating PCP...`);
    try {
      const evalResult = await evaluatePCP(genResult.rawOutput, tc.id, version);

      // 생성 메트릭 병합
      evalResult.generationTimeMs = genResult.timeMs;
      evalResult.tokensUsed.generation = genResult.tokensUsed;

      results.push(evalResult);

      const passed = evalResult.overallScore >= tc.expectedMinScore;
      log(
        `[Harness]   Score: ${evalResult.overallScore}/100 (min: ${tc.expectedMinScore}) ${passed ? "PASS" : "FAIL"}`
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      log(`[Harness]   Evaluation FAILED: ${errMsg}`);
      results.push(createFailedResult(tc.id, version, errMsg));
    }
  }

  // 종합 결과
  const completedAt = new Date().toISOString();
  const scoredResults = results.filter((r) => r.overallScore > 0);
  const averageScore =
    scoredResults.length > 0
      ? Math.round(scoredResults.reduce((sum, r) => sum + r.overallScore, 0) / scoredResults.length)
      : 0;

  // 회귀 체크
  let regression: RegressionCheck | null = null;
  if (options.previousRun) {
    regression = checkRegression(options.previousRun, results, averageScore);
  }

  const summary: HarnessRunSummary = {
    runId,
    promptVersion: version,
    startedAt,
    completedAt,
    testCases: cases.length,
    averageScore,
    results,
    regression,
  };

  log(`[Harness] Run complete. Average score: ${averageScore}/100`);

  if (regression?.isRegression) {
    log(
      `[Harness] WARNING: Regression detected! Score dropped by ${Math.abs(regression.scoreDelta).toFixed(1)}%`
    );
  }

  return summary;
}

function checkRegression(
  previousRun: HarnessRunSummary,
  currentResults: EvaluationResult[],
  currentAvg: number
): RegressionCheck {
  const details = currentResults.map((curr) => {
    const prev = previousRun.results.find((r) => r.testCaseId === curr.testCaseId);
    return {
      testCaseId: curr.testCaseId,
      previousScore: prev?.overallScore ?? 0,
      currentScore: curr.overallScore,
      delta: curr.overallScore - (prev?.overallScore ?? 0),
    };
  });

  const scoreDelta = currentAvg - previousRun.averageScore;

  return {
    previousRunId: previousRun.runId,
    previousAvgScore: previousRun.averageScore,
    currentAvgScore: currentAvg,
    scoreDelta,
    isRegression: scoreDelta < -REGRESSION_THRESHOLD,
    details,
  };
}

function createFailedResult(testCaseId: string, version: string, error: string): EvaluationResult {
  const emptyDimension = { score: 0, weight: 0, feedback: error, details: [] };
  return {
    id: crypto.randomUUID(),
    testCaseId,
    promptVersion: version,
    overallScore: 0,
    dimensions: {
      structure: { ...emptyDimension, weight: 0.15 },
      logic: { ...emptyDimension, weight: 0.20 },
      sdgsAlignment: { ...emptyDimension, weight: 0.10 },
      relevance: { ...emptyDimension, weight: 0.15 },
      resultsFramework: { ...emptyDimension, weight: 0.15 },
      riskSustainability: { ...emptyDimension, weight: 0.10 },
      writingQuality: { ...emptyDimension, weight: 0.10 },
      budget: { ...emptyDimension, weight: 0.05 },
    },
    improvements: [],
    strengths: [],
    evaluatedAt: new Date().toISOString(),
    generationTimeMs: 0,
    evaluationTimeMs: 0,
    tokensUsed: { generation: 0, evaluation: 0 },
  };
}
