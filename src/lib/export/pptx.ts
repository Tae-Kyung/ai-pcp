import PptxGenJS from "pptxgenjs";

const BLUE = "1a56db";
const DARK = "333333";
const GRAY = "666666";
const LIGHT_BG = "F0F4FF";
const WHITE = "FFFFFF";

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return value.join(", ");
    }
    return value.map((v) => stringify(v)).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${formatLabel(k)}: ${stringify(v)}`)
      .join("\n");
  }
  return String(value);
}

function formatLabel(key: string): string {
  const labels: Record<string, string> = {
    projectTitle: "Project Title", requestingCountry: "Country",
    implementingAgency: "Implementing Agency", responsibleMinistry: "Ministry",
    projectLocation: "Location", projectDuration: "Duration",
    totalProjectCost: "Total Cost", targetBeneficiaries: "Beneficiaries",
    projectObjectives: "Objectives", sdgsAlignment: "SDGs",
    countryContext: "Country Context", sectorContext: "Sector Context",
    problemAnalysis: "Problem Analysis", needsAssessment: "Needs Assessment",
    nationalPlanAlignment: "National Plan", cpsAlignment: "CPS Alignment",
    overallGoal: "Overall Goal", projectPurpose: "Project Purpose",
    expectedOutcomes: "Outcomes", budgetPlan: "Budget",
    stakeholders: "Stakeholders", beneficiaryParticipation: "Beneficiary Participation",
    implementationArrangement: "Implementation", managementStructure: "Management",
    meFramework: "M&E Framework", risks: "Risks",
    sustainabilityPlan: "Sustainability", localProcurement: "Procurement",
    description: "Description", likelihood: "Likelihood",
    impact: "Impact", mitigation: "Mitigation",
    name: "Name", type: "Type", role: "Role",
    category: "Category", amount: "Amount", percentage: "%",
  };
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

export async function generatePptx(
  content: Record<string, unknown>,
  title: string,
  country: string,
  sector: string
): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "AI-PCP";
  pptx.title = title;

  // --- Slide 1: Title ---
  const s1 = pptx.addSlide();
  s1.background = { fill: BLUE };
  s1.addText("PROJECT CONCEPT PAPER", {
    x: 0.8, y: 1.0, w: 11.5, h: 0.6,
    fontSize: 16, color: "A0C0FF", fontFace: "Calibri", bold: true,
    align: "left", charSpacing: 4,
  });
  s1.addText(title, {
    x: 0.8, y: 1.8, w: 11.5, h: 1.4,
    fontSize: 32, color: WHITE, fontFace: "Calibri", bold: true,
    align: "left",
  });
  s1.addText(`${country}  |  ${sector.replace(/_/g, " ").toUpperCase()}`, {
    x: 0.8, y: 3.4, w: 11.5, h: 0.5,
    fontSize: 18, color: "A0C0FF", fontFace: "Calibri",
    align: "left",
  });
  s1.addText(`Generated: ${new Date().toLocaleDateString()}  •  Prepared with AI-PCP`, {
    x: 0.8, y: 6.5, w: 11.5, h: 0.4,
    fontSize: 11, color: "7090CC", fontFace: "Calibri", italic: true,
    align: "left",
  });

  // --- Slide 2: Overview (from basicInfo) ---
  const basicInfo = (content.basicInfo ?? {}) as Record<string, unknown>;
  const s2 = pptx.addSlide();
  addSlideHeader(s2, "Project Overview");

  const overviewFields = [
    "projectTitle", "requestingCountry", "implementingAgency", "responsibleMinistry",
    "projectLocation", "projectDuration", "totalProjectCost", "targetBeneficiaries",
    "sdgsAlignment", "projectObjectives",
  ];

  const rows: PptxGenJS.TableRow[] = [];
  for (const key of overviewFields) {
    const val = basicInfo[key];
    if (val === undefined) continue;
    rows.push([
      { text: formatLabel(key), options: { bold: true, fontSize: 11, color: DARK, fill: { color: LIGHT_BG } } },
      { text: truncate(stringify(val), 200), options: { fontSize: 11, color: DARK } },
    ]);
  }
  // Add remaining fields
  for (const [key, val] of Object.entries(basicInfo)) {
    if (overviewFields.includes(key) || val === undefined) continue;
    rows.push([
      { text: formatLabel(key), options: { bold: true, fontSize: 11, color: DARK, fill: { color: LIGHT_BG } } },
      { text: truncate(stringify(val), 200), options: { fontSize: 11, color: DARK } },
    ]);
  }

  if (rows.length > 0) {
    s2.addTable(rows, {
      x: 0.5, y: 1.2, w: 12.2,
      colW: [3.0, 9.2],
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      rowH: 0.4,
      autoPage: true,
    });
  }

  // --- Slide 3: Problem & Rationale ---
  const rationale = (content.rationale ?? {}) as Record<string, unknown>;
  const s3 = pptx.addSlide();
  addSlideHeader(s3, "Problem Analysis & Rationale");

  const rationaleText = [
    rationale.problemAnalysis,
    rationale.countryContext,
    rationale.needsAssessment,
  ].filter(Boolean).map((v) => truncate(stringify(v), 500));

  if (rationaleText.length > 0) {
    s3.addText(rationaleText.map((t, i) => ({
      text: (i > 0 ? "\n\n" : "") + t,
      options: { fontSize: 12, color: DARK, fontFace: "Calibri", breakType: undefined },
    })), {
      x: 0.5, y: 1.2, w: 12.2, h: 5.5,
      valign: "top",
    });
  }

  // --- Slide 4: Goals & Outcomes ---
  const description = (content.description ?? {}) as Record<string, unknown>;
  const s4 = pptx.addSlide();
  addSlideHeader(s4, "Goals & Expected Outcomes");

  let yPos = 1.2;
  if (description.overallGoal) {
    s4.addText([
      { text: "Overall Goal\n", options: { bold: true, fontSize: 13, color: BLUE } },
      { text: truncate(stringify(description.overallGoal), 300), options: { fontSize: 11, color: DARK } },
    ], { x: 0.5, y: yPos, w: 12.2, h: 1.0, valign: "top" });
    yPos += 1.1;
  }
  if (description.projectPurpose) {
    s4.addText([
      { text: "Project Purpose\n", options: { bold: true, fontSize: 13, color: BLUE } },
      { text: truncate(stringify(description.projectPurpose), 300), options: { fontSize: 11, color: DARK } },
    ], { x: 0.5, y: yPos, w: 12.2, h: 1.0, valign: "top" });
    yPos += 1.1;
  }

  const outcomes = description.expectedOutcomes;
  if (Array.isArray(outcomes) && outcomes.length > 0) {
    const outcomeRows: PptxGenJS.TableRow[] = [
      [
        { text: "Outcome", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Description", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Indicators", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
      ],
    ];
    for (const o of outcomes.slice(0, 5)) {
      const obj = o as Record<string, unknown>;
      outcomeRows.push([
        { text: stringify(obj.id ?? ""), options: { fontSize: 9, color: DARK } },
        { text: truncate(stringify(obj.description ?? ""), 150), options: { fontSize: 9, color: DARK } },
        { text: truncate(stringify(obj.indicators ?? ""), 150), options: { fontSize: 9, color: DARK } },
      ]);
    }
    s4.addTable(outcomeRows, {
      x: 0.5, y: yPos, w: 12.2,
      colW: [1.5, 5.5, 5.2],
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      rowH: 0.45,
    });
  }

  // --- Slide 5: Budget ---
  const budget = description.budgetPlan;
  if (Array.isArray(budget) && budget.length > 0) {
    const s5 = pptx.addSlide();
    addSlideHeader(s5, "Budget Plan");

    const budgetRows: PptxGenJS.TableRow[] = [
      [
        { text: "Category", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Amount (USD)", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "%", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Description", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
      ],
    ];
    for (const item of budget) {
      const b = item as Record<string, unknown>;
      budgetRows.push([
        { text: stringify(b.category ?? ""), options: { fontSize: 10, color: DARK, bold: true } },
        { text: stringify(b.amount ?? ""), options: { fontSize: 10, color: DARK, align: "right" } },
        { text: stringify(b.percentage ?? ""), options: { fontSize: 10, color: DARK, align: "center" } },
        { text: truncate(stringify(b.description ?? ""), 120), options: { fontSize: 9, color: GRAY } },
      ]);
    }
    s5.addTable(budgetRows, {
      x: 0.5, y: 1.2, w: 12.2,
      colW: [3.0, 2.5, 1.0, 5.7],
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      rowH: 0.45,
    });
  }

  // --- Slide 6: Stakeholders ---
  const stakeholderAnalysis = (content.stakeholderAnalysis ?? {}) as Record<string, unknown>;
  const stakeholders = stakeholderAnalysis.stakeholders;
  if (Array.isArray(stakeholders) && stakeholders.length > 0) {
    const s6 = pptx.addSlide();
    addSlideHeader(s6, "Stakeholder Analysis");

    const stRows: PptxGenJS.TableRow[] = [
      [
        { text: "Stakeholder", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Type", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Role", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
      ],
    ];
    for (const s of stakeholders.slice(0, 8)) {
      const st = s as Record<string, unknown>;
      stRows.push([
        { text: stringify(st.name ?? ""), options: { fontSize: 10, color: DARK, bold: true } },
        { text: stringify(st.type ?? ""), options: { fontSize: 9, color: GRAY } },
        { text: truncate(stringify(st.role ?? ""), 150), options: { fontSize: 9, color: DARK } },
      ]);
    }
    s6.addTable(stRows, {
      x: 0.5, y: 1.2, w: 12.2,
      colW: [3.5, 2.5, 6.2],
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      rowH: 0.45,
    });
  }

  // --- Slide 7: Risks ---
  const management = (content.management ?? {}) as Record<string, unknown>;
  const risks = management.risks;
  if (Array.isArray(risks) && risks.length > 0) {
    const s7 = pptx.addSlide();
    addSlideHeader(s7, "Risk Analysis");

    const riskRows: PptxGenJS.TableRow[] = [
      [
        { text: "Risk", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Likelihood", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Impact", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
        { text: "Mitigation", options: { bold: true, fontSize: 10, color: WHITE, fill: { color: BLUE } } },
      ],
    ];
    for (const r of risks.slice(0, 6)) {
      const risk = r as Record<string, unknown>;
      riskRows.push([
        { text: truncate(stringify(risk.description ?? ""), 120), options: { fontSize: 9, color: DARK } },
        { text: stringify(risk.likelihood ?? ""), options: { fontSize: 9, color: DARK, align: "center" } },
        { text: stringify(risk.impact ?? ""), options: { fontSize: 9, color: DARK, align: "center" } },
        { text: truncate(stringify(risk.mitigation ?? ""), 120), options: { fontSize: 9, color: DARK } },
      ]);
    }
    s7.addTable(riskRows, {
      x: 0.5, y: 1.2, w: 12.2,
      colW: [3.5, 1.5, 1.5, 5.7],
      border: { type: "solid", pt: 0.5, color: "CCCCCC" },
      rowH: 0.5,
    });
  }

  // --- Slide 8: Sustainability ---
  const s8 = pptx.addSlide();
  addSlideHeader(s8, "Sustainability & Implementation");

  let sy = 1.2;
  const sustainFields = [
    { key: "sustainabilityPlan", label: "Sustainability Plan" },
    { key: "implementationArrangement", label: "Implementation" },
    { key: "meFramework", label: "M&E Framework" },
  ];
  for (const { key, label } of sustainFields) {
    const val = management[key];
    if (!val) continue;
    s8.addText([
      { text: label + "\n", options: { bold: true, fontSize: 13, color: BLUE } },
      { text: truncate(stringify(val), 400), options: { fontSize: 11, color: DARK } },
    ], { x: 0.5, y: sy, w: 12.2, h: 1.6, valign: "top" });
    sy += 1.7;
  }

  // --- Slide 9: Thank you ---
  const sLast = pptx.addSlide();
  sLast.background = { fill: BLUE };
  sLast.addText("Thank You", {
    x: 0, y: 2.0, w: 13.33, h: 1.5,
    fontSize: 44, color: WHITE, fontFace: "Calibri", bold: true,
    align: "center",
  });
  sLast.addText(title, {
    x: 1, y: 4.0, w: 11.33, h: 0.8,
    fontSize: 18, color: "A0C0FF", fontFace: "Calibri",
    align: "center",
  });
  sLast.addText("Generated with AI-PCP | KOICA Standard Format", {
    x: 1, y: 5.5, w: 11.33, h: 0.5,
    fontSize: 12, color: "7090CC", fontFace: "Calibri", italic: true,
    align: "center",
  });

  return await pptx.write({ outputType: "blob" }) as Blob;
}

function addSlideHeader(slide: PptxGenJS.Slide, title: string) {
  slide.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 1.0,
    fill: { color: BLUE },
  });
  slide.addText(title, {
    x: 0.5, y: 0.15, w: 12.2, h: 0.7,
    fontSize: 24, color: WHITE, fontFace: "Calibri", bold: true,
  });
}
