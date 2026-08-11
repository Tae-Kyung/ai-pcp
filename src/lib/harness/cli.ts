/**
 * 하네스 CLI 실행기
 *
 * 사용법:
 *   npx tsx src/lib/harness/cli.ts                    # 전체 테스트 실행
 *   npx tsx src/lib/harness/cli.ts --case TC-01       # 특정 케이스 실행
 *   npx tsx src/lib/harness/cli.ts --case TC-01,TC-03 # 복수 케이스 실행
 *   npx tsx src/lib/harness/cli.ts --list             # 테스트 케이스 목록
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { runHarness } from "./runner";
import { TEST_CASES } from "./test-cases";
import { EVALUATION_WEIGHTS } from "@/lib/types/harness";
import type { EvaluationResult, EvaluationDimensions } from "@/lib/types/harness";
import * as fs from "fs";
import * as path from "path";

const RESULTS_DIR = path.join(process.cwd(), "harness-results");

async function main() {
  const args = process.argv.slice(2);

  // --list: 테스트 케이스 목록 출력
  if (args.includes("--list")) {
    console.log("\n=== Harness Test Cases ===\n");
    for (const tc of TEST_CASES) {
      console.log(`  ${tc.id} | ${tc.country.padEnd(15)} | ${tc.sector.padEnd(12)} | ${tc.difficulty.padEnd(6)} | ${tc.name}`);
    }
    console.log(`\n  Total: ${TEST_CASES.length} cases\n`);
    return;
  }

  // --case: 특정 케이스 필터
  let testCaseIds: string[] | undefined;
  const caseIdx = args.indexOf("--case");
  if (caseIdx !== -1 && args[caseIdx + 1]) {
    testCaseIds = args[caseIdx + 1].split(",").map((s) => s.trim());
  }

  // 결과 디렉터리 생성
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // 이전 실행 결과 로드 (회귀 비교)
  const previousRun = loadLatestResult();

  console.log("\n" + "=".repeat(60));
  console.log("  AI-PCP Harness - PCP Quality Evaluation Pipeline");
  console.log("=".repeat(60) + "\n");

  const summary = await runHarness({
    testCaseIds,
    previousRun: previousRun ?? undefined,
    onProgress: (msg) => console.log(msg),
  });

  // 결과 출력
  console.log("\n" + "=".repeat(60));
  console.log("  RESULTS SUMMARY");
  console.log("=".repeat(60) + "\n");

  for (const result of summary.results) {
    const tc = TEST_CASES.find((t) => t.id === result.testCaseId);
    const passed = result.overallScore >= (tc?.expectedMinScore ?? 70);
    const status = passed ? "PASS" : "FAIL";

    console.log(`  ${result.testCaseId} | ${(tc?.name ?? "Unknown").padEnd(45)} | Score: ${String(result.overallScore).padStart(3)}/100 | ${status}`);
    printDimensionBreakdown(result);
  }

  console.log("\n" + "-".repeat(60));
  console.log(`  Average Score: ${summary.averageScore}/100`);
  console.log(`  Test Cases:    ${summary.testCases}`);
  console.log(`  Prompt:        ${summary.promptVersion}`);

  if (summary.regression) {
    const reg = summary.regression;
    const arrow = reg.scoreDelta >= 0 ? "+" : "";
    console.log(`\n  Regression Check: ${arrow}${reg.scoreDelta.toFixed(1)}% vs previous run`);
    if (reg.isRegression) {
      console.log(`  *** REGRESSION DETECTED *** (threshold: -5%)`);
    }
  }

  console.log("-".repeat(60) + "\n");

  // 결과 저장
  const resultFile = path.join(RESULTS_DIR, `run-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(summary, null, 2));
  console.log(`Results saved to: ${resultFile}\n`);
}

function printDimensionBreakdown(result: EvaluationResult) {
  const dims = result.dimensions;
  const keys: (keyof EvaluationDimensions)[] = [
    "structure", "logic", "sdgsAlignment", "relevance",
    "resultsFramework", "riskSustainability", "writingQuality", "budget",
  ];

  const labels: Record<string, string> = {
    structure: "Structure",
    logic: "Logic",
    sdgsAlignment: "SDGs",
    relevance: "Relevance",
    resultsFramework: "Results FW",
    riskSustainability: "Risk/Sust.",
    writingQuality: "Writing",
    budget: "Budget",
  };

  const parts = keys.map((k) => {
    const score = dims[k].score;
    const w = Math.round(EVALUATION_WEIGHTS[k] * 100);
    return `${labels[k]}:${score}(${w}%)`;
  });

  console.log(`           ${parts.join(" | ")}`);
}

function loadLatestResult(): import("@/lib/types/harness").HarnessRunSummary | null {
  if (!fs.existsSync(RESULTS_DIR)) return null;

  const files = fs.readdirSync(RESULTS_DIR)
    .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  try {
    const content = fs.readFileSync(path.join(RESULTS_DIR, files[0]), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error("Harness execution failed:", err);
  process.exit(1);
});
