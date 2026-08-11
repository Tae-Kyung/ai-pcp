// PCP 관련 타입 정의

export interface PCPBasicInfo {
  projectTitle: string;
  requestingCountry: string;
  implementingAgency: string;
  responsibleMinistry: string;
  projectLocation: string;
  projectDuration: string;
  totalProjectCost: number;
  currency: string;
  targetBeneficiaries: {
    direct: string;
    indirect: string;
    totalCount: number;
  };
  projectObjectives: string;
  sector: PCPSector;
  sdgsAlignment: number[]; // SDG 1~17
}

export type PCPSector =
  | "health"
  | "education"
  | "agriculture"
  | "ict"
  | "governance"
  | "water_sanitation"
  | "transport"
  | "energy"
  | "environment"
  | "gender";

export interface PCPRationale {
  countryContext: string;
  sectorContext: string;
  problemAnalysis: string;
  needsAssessment: string;
  nationalPlanAlignment: string;
  cpsAlignment: string;
  similarProjects: string;
  genderAnalysis: string;
}

export interface PCPDescription {
  overallGoal: string;
  projectPurpose: string;
  expectedOutcomes: PCPOutcome[];
  budgetPlan: PCPBudgetItem[];
  timeline: string;
}

export interface PCPOutcome {
  id: string;
  description: string;
  indicators: string[];
  outputs: PCPOutput[];
}

export interface PCPOutput {
  id: string;
  description: string;
  activities: string[];
}

export interface PCPBudgetItem {
  category: string;
  amount: number;
  percentage: number;
  description: string;
}

export interface PCPStakeholder {
  name: string;
  type: "government" | "international_org" | "ngo" | "donor" | "private_sector" | "other";
  role: string;
  coordinationMechanism: string;
}

export interface PCPStakeholderAnalysis {
  stakeholders: PCPStakeholder[];
  beneficiaryParticipation: string;
}

export interface PCPManagement {
  implementationArrangement: string;
  managementStructure: string;
  meFramework: string;
  risks: PCPRisk[];
  sustainabilityPlan: string;
  localProcurement: string;
}

export interface PCPRisk {
  description: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
}

// 전체 PCP 문서
export interface PCPDocument {
  id: string;
  projectId: string;
  basicInfo: PCPBasicInfo;
  rationale: PCPRationale;
  description: PCPDescription;
  stakeholderAnalysis: PCPStakeholderAnalysis;
  management: PCPManagement;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// 위저드 입력 데이터 (AI 생성용)
export interface PCPWizardInput {
  basicInfo: Partial<PCPBasicInfo>;
  rationale: Partial<PCPRationale>;
  description: Partial<PCPDescription>;
  stakeholderAnalysis: Partial<PCPStakeholderAnalysis>;
  management: Partial<PCPManagement>;
}
