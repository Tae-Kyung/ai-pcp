import { z } from "zod/v4";

export const pcpSectors = [
  "health",
  "education",
  "agriculture",
  "ict",
  "governance",
  "water_sanitation",
  "transport",
  "energy",
  "environment",
  "gender",
] as const;

export const pcpGenerateInputSchema = z.object({
  projectTitle: z.string().min(5, "Project title must be at least 5 characters"),
  requestingCountry: z.string().min(2, "Country is required"),
  sector: z.enum(pcpSectors),
  problemStatement: z.string().min(50, "Problem statement must be at least 50 characters"),
  targetBeneficiaries: z.string().min(10, "Target beneficiaries required"),
  projectDuration: z.string().min(1, "Project duration required"),
  estimatedBudget: z.number().min(100000, "Budget must be at least $100,000"),
  sdgs: z.array(z.number().min(1).max(17)).min(1, "At least one SDG required"),
  additionalContext: z.string().optional(),
});

export type PCPGenerateInput = z.infer<typeof pcpGenerateInputSchema>;

export const pcpAssistInputSchema = z.object({
  section: z.enum(["basicInfo", "rationale", "description", "stakeholderAnalysis", "management"]),
  context: z.record(z.string(), z.unknown()).optional(),
  userInput: z.record(z.string(), z.unknown()).optional(),
});

export type PCPAssistInput = z.infer<typeof pcpAssistInputSchema>;

export const pcpUpdateInputSchema = z.object({
  content: z.record(z.string(), z.unknown()),
});

export type PCPUpdateInput = z.infer<typeof pcpUpdateInputSchema>;
