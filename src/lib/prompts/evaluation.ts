// 하네스 평가용 프롬프트 (full version for harness CLI)

export const EVALUATION_SYSTEM_PROMPT = `You are a senior PCP (Project Concept Paper) quality evaluator for KOICA international development cooperation projects.

Your task is to rigorously evaluate PCP documents against 8 quality dimensions. You must be objective, specific, and constructive in your feedback.

For each dimension, provide:
- A score from 0 to 100
- Specific feedback explaining the score
- Detailed points (strengths and weaknesses)

Be strict but fair. A score of 70+ means "acceptable quality", 80+ means "good quality", 90+ means "excellent quality".`;

export const EVALUATION_PROMPT = `Evaluate the following PCP document against 8 quality dimensions.

## PCP DOCUMENT TO EVALUATE:
{pcp_document}

## EVALUATION DIMENSIONS

### 1. Structure Compliance (구조 준수) - Weight: 15%
Does the PCP follow KOICA's standard 5-section format?
- Are all required fields in Section 1 (Basic Info) present and complete?
- Are all subsections in Sections 2-5 adequately addressed?
- Is the document within the 10-page limit?

### 2. Logical Consistency (논리적 일관성) - Weight: 20%
Is there a clear logical chain from problem to solution?
- Problem Analysis -> Objectives -> Outcomes -> Outputs -> Activities
- Are the cause-effect relationships clear and valid?
- Does the Results Framework reflect a coherent theory of change?

### 3. SDGs Alignment (SDGs 정합성) - Weight: 10%
Is the SDGs alignment substantive (not superficial)?
- Are the selected SDGs directly relevant to the project?
- Does the project description demonstrate how it contributes to specific SDG targets?
- Are SDG indicators incorporated into the results framework?

### 4. Relevance (적절성) - Weight: 15%
Does the project address real needs of the recipient country?
- Is the problem analysis based on evidence/data?
- Does it align with national development plans?
- Is the target beneficiary group well-defined and appropriate?
- Is there alignment with KOICA CPS priorities?

### 5. Results Framework Quality (결과 프레임워크) - Weight: 15%
Are the outcomes, outputs, and indicators well-defined?
- Are indicators SMART (Specific, Measurable, Achievable, Relevant, Time-bound)?
- Are baseline and target values specified?
- Is the logical framework matrix complete and coherent?

### 6. Risk & Sustainability (리스크/지속가능성) - Weight: 10%
Are risks properly identified and mitigated?
- Are political, technical, financial, and social risks covered?
- Are mitigation strategies realistic?
- Does the sustainability plan address institutional, financial, and technical aspects?
- Is there an exit strategy?

### 7. Writing Quality (문서 품질) - Weight: 10%
Is the document well-written and professional?
- Is the language clear, concise, and professional?
- Are claims supported by evidence or data?
- Is the overall flow logical and readable?
- Is development cooperation terminology used correctly?

### 8. Budget Appropriateness (예산 적정성) - Weight: 5%
Is the budget realistic and well-structured?
- Are budget categories clear and comprehensive?
- Is the total within KOICA's typical range (USD 10-15M)?
- Is the allocation between categories reasonable?

## RESPONSE FORMAT
Respond in the following JSON format:
{
  "dimensions": {
    "structure": {
      "score": <0-100>,
      "feedback": "<overall assessment>",
      "details": ["<specific point 1>", "<specific point 2>", ...]
    },
    "logic": { "score": <0-100>, "feedback": "...", "details": [...] },
    "sdgsAlignment": { "score": <0-100>, "feedback": "...", "details": [...] },
    "relevance": { "score": <0-100>, "feedback": "...", "details": [...] },
    "resultsFramework": { "score": <0-100>, "feedback": "...", "details": [...] },
    "riskSustainability": { "score": <0-100>, "feedback": "...", "details": [...] },
    "writingQuality": { "score": <0-100>, "feedback": "...", "details": [...] },
    "budget": { "score": <0-100>, "feedback": "...", "details": [...] }
  },
  "improvements": ["<improvement suggestion 1>", "<improvement suggestion 2>", ...],
  "strengths": ["<strength 1>", "<strength 2>", ...]
}`;

// Fast review prompt for web UI (optimized for speed within Vercel timeout)
export const FAST_REVIEW_SYSTEM_PROMPT = `You are a KOICA PCP quality evaluator. Score 8 dimensions (0-100). Be concise.`;

export const FAST_REVIEW_PROMPT = `Rate this PCP across 8 dimensions. Be brief — 1 sentence feedback, max 2 detail points per dimension.

PCP:
{pcp_document}

Dimensions: structure(15%), logic(20%), sdgsAlignment(10%), relevance(15%), resultsFramework(15%), riskSustainability(10%), writingQuality(10%), budget(5%).

RULES:
- Each dimension: score (0-100), feedback (1 sentence), details (1-2 short strings)
- MUST include "improvements" array with exactly 3 actionable suggestions
- MUST include "strengths" array with exactly 3 positive points
- Respond ONLY with valid JSON, no markdown

JSON format:
{"dimensions":{"structure":{"score":N,"feedback":"...","details":["..."]},"logic":{"score":N,"feedback":"...","details":["..."]},"sdgsAlignment":{"score":N,"feedback":"...","details":["..."]},"relevance":{"score":N,"feedback":"...","details":["..."]},"resultsFramework":{"score":N,"feedback":"...","details":["..."]},"riskSustainability":{"score":N,"feedback":"...","details":["..."]},"writingQuality":{"score":N,"feedback":"...","details":["..."]},"budget":{"score":N,"feedback":"...","details":["..."]}},"improvements":["actionable suggestion 1","actionable suggestion 2","actionable suggestion 3"],"strengths":["strength 1","strength 2","strength 3"]}`;
