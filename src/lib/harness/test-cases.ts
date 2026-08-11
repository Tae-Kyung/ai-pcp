import type { HarnessTestCase } from "@/lib/types/harness";

export const TEST_CASES: HarnessTestCase[] = [
  {
    id: "TC-01",
    name: "Cambodia Maternal & Child Health",
    country: "Cambodia",
    sector: "health",
    difficulty: "medium",
    description: "Strengthening maternal and child health capacity in rural Cambodia",
    expectedMinScore: 70,
    input: {
      projectTitle: "Strengthening Maternal and Child Health Services in Rural Cambodia",
      requestingCountry: "Cambodia",
      sector: "health",
      problemStatement:
        "Cambodia's maternal mortality ratio remains at 160 per 100,000 live births, significantly higher than the regional average. Rural areas face severe shortages of trained health workers, inadequate health facilities, and limited access to emergency obstetric care. Only 89% of births are attended by skilled health personnel, with significant urban-rural disparities.",
      targetBeneficiaries:
        "Direct: 50,000 women of reproductive age and children under 5 in Kampong Cham and Prey Veng provinces. Indirect: 200,000 community members.",
      projectDuration: "4 years (2027-2030)",
      estimatedBudget: 12000000,
      sdgs: [3, 5],
      additionalContext:
        "Cambodia's National Health Strategic Plan 2016-2025 prioritizes maternal and child health. KOICA CPS for Cambodia includes health as a priority sector.",
    },
  },
  {
    id: "TC-02",
    name: "Ethiopia Agricultural Value Chain",
    country: "Ethiopia",
    sector: "agriculture",
    difficulty: "high",
    description: "Improving agricultural value chain for smallholder farmers in Ethiopia",
    expectedMinScore: 70,
    input: {
      projectTitle: "Enhancing Agricultural Value Chain and Market Access for Smallholder Farmers in Ethiopia",
      requestingCountry: "Ethiopia",
      sector: "agriculture",
      problemStatement:
        "Ethiopia's agricultural sector employs over 70% of the population but contributes only 33% of GDP. Smallholder farmers face low productivity (average cereal yield 2.8 tons/ha vs. 5.5 tons/ha potential), limited access to improved inputs, post-harvest losses of 20-30%, and poor market linkages. Climate change exacerbates food insecurity affecting 7.7 million people annually.",
      targetBeneficiaries:
        "Direct: 30,000 smallholder farming households in Oromia and SNNPR regions. Indirect: 150,000 household members and local market participants.",
      projectDuration: "5 years (2027-2031)",
      estimatedBudget: 15000000,
      sdgs: [1, 2, 8, 13],
      additionalContext:
        "Ethiopia's Growth and Transformation Plan II targets agricultural transformation. Multiple donor programs exist in agriculture requiring careful coordination.",
    },
  },
  {
    id: "TC-03",
    name: "Bangladesh TVET System",
    country: "Bangladesh",
    sector: "education",
    difficulty: "medium",
    description: "Building technical and vocational education and training system in Bangladesh",
    expectedMinScore: 70,
    input: {
      projectTitle: "Strengthening Technical and Vocational Education and Training (TVET) System in Bangladesh",
      requestingCountry: "Bangladesh",
      sector: "education",
      problemStatement:
        "Bangladesh faces a significant skills gap with youth unemployment at 10.6%. Only 3% of the labor force has formal technical training. TVET institutions lack modern equipment, qualified instructors, and industry-relevant curricula. The mismatch between training outputs and labor market demands results in 47% of TVET graduates being underemployed.",
      targetBeneficiaries:
        "Direct: 10,000 TVET students and 500 instructors across 20 institutions. Indirect: 50,000 youth and employers in target regions.",
      projectDuration: "4 years (2027-2030)",
      estimatedBudget: 11000000,
      sdgs: [4, 8],
      additionalContext:
        "Bangladesh National Skills Development Policy 2022 prioritizes TVET reform. KOICA has prior experience in TVET projects in the region.",
    },
  },
  {
    id: "TC-04",
    name: "Senegal e-Government",
    country: "Senegal",
    sector: "ict",
    difficulty: "low",
    description: "Implementing e-government system for public service delivery in Senegal",
    expectedMinScore: 70,
    input: {
      projectTitle: "Digital Transformation of Public Service Delivery in Senegal",
      requestingCountry: "Senegal",
      sector: "ict",
      problemStatement:
        "Senegal's public service delivery suffers from inefficiency, with citizens spending an average of 4 hours per government transaction. Only 12% of government services are available online. Paper-based processes lead to delays, errors, and corruption risks. The Government Service Index ranks Senegal 146th out of 193 countries.",
      targetBeneficiaries:
        "Direct: 500,000 citizens accessing digital government services. 2,000 government officials trained. Indirect: 5 million citizens benefiting from improved service delivery.",
      projectDuration: "3 years (2027-2029)",
      estimatedBudget: 10000000,
      sdgs: [9, 16],
      additionalContext:
        "Senegal Digital 2025 strategy provides strong government ownership. Existing fiber optic infrastructure covers major cities.",
    },
  },
  {
    id: "TC-05",
    name: "Uzbekistan Public Administration",
    country: "Uzbekistan",
    sector: "governance",
    difficulty: "high",
    description: "Strengthening public administration capacity in Uzbekistan",
    expectedMinScore: 70,
    input: {
      projectTitle: "Strengthening Public Administration and Governance Capacity in Uzbekistan",
      requestingCountry: "Uzbekistan",
      sector: "governance",
      problemStatement:
        "Uzbekistan's ongoing governance reforms require significant institutional capacity building. The public administration system faces challenges including outdated management practices, limited evidence-based policy-making capacity, weak inter-ministerial coordination, and insufficient citizen engagement mechanisms. The Government Effectiveness Index score is 0.12, below the regional average of 0.35.",
      targetBeneficiaries:
        "Direct: 3,000 government officials from 15 central and local government agencies. Indirect: 10 million citizens benefiting from improved governance.",
      projectDuration: "5 years (2027-2031)",
      estimatedBudget: 13000000,
      sdgs: [16, 17],
      additionalContext:
        "Uzbekistan's Development Strategy 2022-2026 prioritizes governance reform. Complex political environment requires sensitive stakeholder management.",
    },
  },
];
