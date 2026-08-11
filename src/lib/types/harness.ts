// 하네스 평가 관련 타입 정의

export interface HarnessTestCase {
  id: string;
  name: string;
  country: string;
  sector: string;
  difficulty: "low" | "medium" | "high";
  description: string;
  input: HarnessTestInput;
  expectedMinScore: number;
}

export interface HarnessTestInput {
  projectTitle: string;
  requestingCountry: string;
  sector: string;
  problemStatement: string;
  targetBeneficiaries: string;
  projectDuration: string;
  estimatedBudget: number;
  sdgs: number[];
  additionalContext?: string;
}

// 8개 평가 항목
export interface EvaluationDimensions {
  structure: DimensionScore;      // 구조 준수
  logic: DimensionScore;          // 논리적 일관성
  sdgsAlignment: DimensionScore;  // SDGs 정합성
  relevance: DimensionScore;      // 적절성
  resultsFramework: DimensionScore; // 결과 프레임워크
  riskSustainability: DimensionScore; // 리스크/지속가능성
  writingQuality: DimensionScore; // 문서 품질
  budget: DimensionScore;         // 예산 적정성
}

export interface DimensionScore {
  score: number;       // 0~100
  weight: number;      // 가중치 (합계 1.0)
  feedback: string;    // 평가 피드백
  details: string[];   // 세부 사항
}

export interface EvaluationResult {
  id: string;
  testCaseId: string;
  promptVersion: string;
  overallScore: number;
  dimensions: EvaluationDimensions;
  improvements: string[];
  strengths: string[];
  evaluatedAt: string;
  generationTimeMs: number;
  evaluationTimeMs: number;
  tokensUsed: {
    generation: number;
    evaluation: number;
  };
}

// 하네스 실행 결과 요약
export interface HarnessRunSummary {
  runId: string;
  promptVersion: string;
  startedAt: string;
  completedAt: string;
  testCases: number;
  averageScore: number;
  results: EvaluationResult[];
  regression: RegressionCheck | null;
}

export interface RegressionCheck {
  previousRunId: string;
  previousAvgScore: number;
  currentAvgScore: number;
  scoreDelta: number;
  isRegression: boolean; // 5% 이상 하락 시 true
  details: {
    testCaseId: string;
    previousScore: number;
    currentScore: number;
    delta: number;
  }[];
}

// 평가 가중치 설정
export const EVALUATION_WEIGHTS: Record<keyof EvaluationDimensions, number> = {
  structure: 0.15,
  logic: 0.20,
  sdgsAlignment: 0.10,
  relevance: 0.15,
  resultsFramework: 0.15,
  riskSustainability: 0.10,
  writingQuality: 0.10,
  budget: 0.05,
};
