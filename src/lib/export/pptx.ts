import PptxGenJS from "pptxgenjs";

// === Color Palette (Ethiopia-inspired green/neutral tones) ===
const PRIMARY = "2C5F2D";
const PRIMARY_LIGHT = "97BC62";
const DARK = "1F2A24";
const GRAY = "6B7A70";
const LIGHT_GRAY = "8FA394";
const WHITE = "FFFFFF";
const ACCENT_RED = "B85042";
const ACCENT_ORANGE = "D4804E";
const ACCENT_TEAL = "3A7D6E";
const BORDER_COLOR = "C9D6BE";
const CARD_BG = "F5F8F2";
const SECTION_BG = "ECF2E6";
// Legacy aliases used in code
const BLUE = PRIMARY;
const DARK_BLUE = "17392C";

// === Typography ===
const FONT_TITLE = "Cambria";
const FONT_BODY = "Calibri";
// Font sizes
const SIZE_SLIDE_TITLE = 26;
const SIZE_SLIDE_SUBTITLE = 14;
const SIZE_HEADING = 14;
const SIZE_BODY = 12;
const SIZE_BODY_SM = 11;
const SIZE_SMALL = 10;
const SIZE_CARD_VALUE = 24;
const SIZE_CARD_LABEL = 11;
const SIZE_TABLE = 11;
const SIZE_TABLE_HEADER = 11;
const SIZE_FOOTER = 10;
// Layout
const MARGIN_L = 0.6;
const MARGIN_R = 0.6;
const CONTENT_W = 13.33 - MARGIN_L - MARGIN_R; // ~12.13"
const CONTENT_START_Y = 1.2;

// === SDG Names ===
const SDG_NAMES: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Production", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

// === Helpers ===
function asArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  return [];
}

function asRecordArray(val: unknown): Record<string, unknown>[] {
  if (Array.isArray(val)) return val.filter((v) => v && typeof v === "object") as Record<string, unknown>[];
  return [];
}

function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((v) => String(v));
  return [];
}

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
    direct: "Direct", indirect: "Indirect", totalCount: "Total Count",
    similarProjects: "Similar Projects", genderAnalysis: "Gender Analysis",
    timeline: "Timeline", coordinationMechanism: "Coordination",
  };
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function formatCurrency(amount: unknown, currency?: string): string {
  const cur = currency || "USD";
  const num = Number(amount);
  if (isNaN(num)) return stringify(amount);
  if (num >= 1_000_000) return `${cur} ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${cur} ${(num / 1_000).toFixed(0)}K`;
  return `${cur} ${num.toLocaleString()}`;
}

function splitIntoParagraphs(text: string, maxPerParagraph = 500): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const paragraphs: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length > maxPerParagraph && current.length > 0) {
      paragraphs.push(current.trim());
      current = s;
    } else {
      current += (current ? " " : "") + s;
    }
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs;
}

function riskColor(level: string): string {
  const l = (level || "").toLowerCase();
  if (l === "high") return ACCENT_RED;
  if (l === "medium") return ACCENT_ORANGE;
  return PRIMARY_LIGHT;
}

// Try to extract baseline→target from indicator text like "increased from 28% to 75%"
function parseIndicatorMetrics(text: string): { indicator: string; baseline: string; target: string } {
  // Pattern: "X increased/decreased from A to B"
  const fromTo = text.match(/(.+?)\s+(?:increased?|decreased?|reduced?|improved?|raised?)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s|$|,|\.)/i);
  if (fromTo) {
    return { indicator: fromTo[1].trim(), baseline: fromTo[2].trim(), target: fromTo[3].trim() };
  }
  // Pattern: "A → B" or "A to B"
  const arrow = text.match(/(.+?):\s*(.+?)\s*(?:→|->|to)\s*(.+?)(?:\s|$|,|\.)/i);
  if (arrow) {
    return { indicator: arrow[1].trim(), baseline: arrow[2].trim(), target: arrow[3].trim() };
  }
  return { indicator: text, baseline: "", target: "" };
}

// Split sustainability text into pillars by keywords
function parseSustainabilityPillars(text: string): { title: string; text: string; color: string }[] {
  const pillars: { title: string; text: string; color: string }[] = [];
  const pillarDefs = [
    { keywords: ["financial", "economic", "budget", "cost recovery", "user fee", "revenue"], title: "Financial", color: BLUE },
    { keywords: ["technical", "capacity", "training", "skill", "knowledge"], title: "Technical", color: PRIMARY_LIGHT },
    { keywords: ["institutional", "government", "policy", "legal", "structure"], title: "Institutional", color: ACCENT_TEAL },
    { keywords: ["social", "community", "ownership", "participation", "women", "youth"], title: "Social", color: ACCENT_ORANGE },
  ];

  // Try to split by sentence and classify
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const classified: Record<string, string[]> = {};

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    let matched = false;
    for (const def of pillarDefs) {
      if (def.keywords.some((kw) => lower.includes(kw))) {
        if (!classified[def.title]) classified[def.title] = [];
        classified[def.title].push(sentence);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Add to first pillar or "General"
      const first = Object.keys(classified)[0] || "General";
      if (!classified[first]) classified[first] = [];
      classified[first].push(sentence);
    }
  }

  const keys = Object.keys(classified);
  if (keys.length >= 2) {
    for (const key of keys) {
      const def = pillarDefs.find((d) => d.title === key);
      pillars.push({
        title: key,
        text: classified[key].join(" "),
        color: def?.color || BLUE,
      });
    }
  }
  return pillars;
}

// === Slide building blocks ===
function addSlideHeader(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  slide.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 1.05,
    fill: { color: PRIMARY },
  });
  slide.addText(title.toUpperCase(), {
    x: MARGIN_L, y: 0.12, w: 10, h: 0.55,
    fontSize: SIZE_SLIDE_TITLE, color: WHITE, fontFace: FONT_TITLE, bold: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MARGIN_L, y: 0.6, w: 10, h: 0.35,
      fontSize: SIZE_SLIDE_SUBTITLE, color: BORDER_COLOR, fontFace: FONT_BODY,
    });
  }
  slide.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 1.02, w: 13.33, h: 0.03,
    fill: { color: PRIMARY_LIGHT },
  });
}

function addStatCard(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  value: string, label: string, accentColor = PRIMARY
) {
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x, y, w, h, rectRadius: 0.1,
    fill: { color: CARD_BG },
    line: { color: BORDER_COLOR, width: 0.75 },
  });
  slide.addText(value, {
    x, y: y + 0.08, w, h: h * 0.5,
    fontSize: SIZE_CARD_VALUE, color: accentColor, fontFace: FONT_TITLE, bold: true,
    align: "center", valign: "bottom",
  });
  slide.addText(label, {
    x: x + 0.1, y: y + h * 0.55, w: w - 0.2, h: h * 0.4,
    fontSize: SIZE_CARD_LABEL, color: GRAY, fontFace: FONT_BODY,
    align: "center", valign: "top",
  });
}

function addNumberedItem(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number,
  num: number, title: string, description: string,
  numColor = PRIMARY
) {
  slide.addShape("ellipse" as PptxGenJS.ShapeType, {
    x, y: y + 0.05, w: 0.38, h: 0.38,
    fill: { color: numColor },
  });
  slide.addText(String(num), {
    x, y: y + 0.05, w: 0.38, h: 0.38,
    fontSize: SIZE_BODY, color: WHITE, fontFace: FONT_TITLE, bold: true,
    align: "center", valign: "middle",
  });
  slide.addText([
    { text: title + "\n", options: { bold: true, fontSize: SIZE_BODY, color: DARK } },
    { text: description, options: { fontSize: SIZE_BODY_SM, color: GRAY } },
  ], {
    x: x + 0.5, y, w: w - 0.55, h: 0.85,
    fontFace: FONT_BODY, valign: "top",
  });
}

function addSectionBox(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  title: string, body: string, accentColor = PRIMARY
) {
  slide.addShape("rect" as PptxGenJS.ShapeType, {
    x, y, w: 0.06, h,
    fill: { color: accentColor },
  });
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x: x + 0.06, y, w: w - 0.06, h, rectRadius: 0.05,
    fill: { color: CARD_BG },
    line: { color: BORDER_COLOR, width: 0.5 },
  });
  slide.addText([
    { text: title + "\n", options: { bold: true, fontSize: SIZE_HEADING, color: accentColor, fontFace: FONT_TITLE } },
    { text: body, options: { fontSize: SIZE_BODY_SM, color: DARK } },
  ], {
    x: x + 0.2, y: y + 0.1, w: w - 0.35, h: h - 0.2,
    fontFace: FONT_BODY, valign: "top",
  });
}

function addFooter(slide: PptxGenJS.Slide, text: string) {
  slide.addText(text, {
    x: MARGIN_L, y: 7.0, w: CONTENT_W, h: 0.3,
    fontSize: SIZE_FOOTER, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
    align: "right",
  });
}

function slide_addFrameworkLevel(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string, text: string, color: string
) {
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x, y, w: 1.6, h, rectRadius: 0.08,
    fill: { color },
  });
  slide.addText(label, {
    x, y, w: 1.6, h,
    fontSize: SIZE_BODY, color: WHITE, fontFace: FONT_TITLE, bold: true,
    align: "center", valign: "middle",
  });
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x: x + 1.65, y, w: w - 1.65, h, rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color, width: 1 },
  });
  slide.addText(text, {
    x: x + 1.8, y, w: w - 1.95, h,
    fontSize: SIZE_BODY_SM, color: DARK, fontFace: FONT_BODY,
    valign: "middle",
  });
}

// === Main export ===
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

  const basicInfo = (content.basicInfo ?? {}) as Record<string, unknown>;
  const rationale = (content.rationale ?? {}) as Record<string, unknown>;
  const description = (content.description ?? {}) as Record<string, unknown>;
  const stakeholderAnalysis = (content.stakeholderAnalysis ?? {}) as Record<string, unknown>;
  const management = (content.management ?? {}) as Record<string, unknown>;

  const beneficiaries = basicInfo.targetBeneficiaries as Record<string, unknown> | undefined;
  const currency = (basicInfo.currency as string) || "USD";
  const outcomes = asRecordArray(description.expectedOutcomes);
  const budgetItems = asRecordArray(description.budgetPlan);
  const stakeholders = asRecordArray(stakeholderAnalysis.stakeholders);
  const risks = asRecordArray(management.risks);
  const sdgs = Array.isArray(basicInfo.sdgsAlignment) ? basicInfo.sdgsAlignment as number[] : [];
  const sectorLabel = sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const totalCost = basicInfo.totalProjectCost;
  const directBenef = beneficiaries?.direct || beneficiaries?.totalCount;
  const indirectBenef = beneficiaries?.indirect;
  const duration = basicInfo.projectDuration;
  const footerText = `${title} | ${country}`;

  // ============================================================
  // SLIDE 1: TITLE
  // ============================================================
  const s1 = pptx.addSlide();
  s1.background = { fill: PRIMARY };

  s1.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: PRIMARY_LIGHT },
  });

  s1.addText("PROJECT CONCEPT PAPER  ·  KOICA STANDARD FORMAT", {
    x: MARGIN_L, y: 0.8, w: CONTENT_W, h: 0.5,
    fontSize: 15, color: BORDER_COLOR, fontFace: FONT_BODY, bold: true,
    charSpacing: 3,
  });
  s1.addText(title, {
    x: MARGIN_L, y: 1.5, w: CONTENT_W, h: 1.8,
    fontSize: 32, color: WHITE, fontFace: FONT_TITLE, bold: true,
    valign: "top",
  });

  const subtitleParts = [
    basicInfo.responsibleMinistry ? stringify(basicInfo.responsibleMinistry) : "",
    basicInfo.projectLocation ? stringify(basicInfo.projectLocation) : "",
    basicInfo.projectDuration ? stringify(basicInfo.projectDuration) : "",
  ].filter(Boolean);
  if (subtitleParts.length > 0) {
    s1.addText(subtitleParts.join("  ·  "), {
      x: MARGIN_L, y: 3.3, w: CONTENT_W, h: 0.5,
      fontSize: 15, color: BORDER_COLOR, fontFace: FONT_BODY,
    });
  }

  // Stat cards on title slide
  const titleStats: { value: string; label: string }[] = [];
  if (totalCost) titleStats.push({ value: formatCurrency(totalCost, currency), label: "Total project cost" });
  if (duration) titleStats.push({ value: stringify(duration), label: "Project duration" });
  if (directBenef) titleStats.push({ value: stringify(directBenef), label: "Direct beneficiaries" });
  if (indirectBenef) titleStats.push({ value: stringify(indirectBenef), label: "Indirect beneficiaries" });

  if (titleStats.length > 0) {
    const cardW = Math.min(2.6, CONTENT_W / titleStats.length - 0.2);
    const startX = MARGIN_L;
    titleStats.forEach((stat, i) => {
      const cx = startX + i * (cardW + 0.25);
      s1.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: cx, y: 4.3, w: cardW, h: 1.4, rectRadius: 0.1,
        fill: { color: DARK_BLUE },
      });
      s1.addText(stat.value, {
        x: cx, y: 4.35, w: cardW, h: 0.75,
        fontSize: 22, color: WHITE, fontFace: FONT_TITLE, bold: true,
        align: "center", valign: "bottom",
      });
      s1.addText(stat.label, {
        x: cx + 0.1, y: 5.15, w: cardW - 0.2, h: 0.45,
        fontSize: SIZE_BODY_SM, color: BORDER_COLOR, fontFace: FONT_BODY,
        align: "center", valign: "top",
      });
    });
  }

  s1.addText(`${sectorLabel}  |  ${country}  |  Prepared with AI-PCP`, {
    x: MARGIN_L, y: 6.5, w: CONTENT_W, h: 0.4,
    fontSize: SIZE_BODY, color: LIGHT_GRAY, fontFace: FONT_BODY,
  });

  // ============================================================
  // SLIDE 2: BASIC PROJECT INFORMATION
  // ============================================================
  const s2 = pptx.addSlide();
  addSlideHeader(s2, "Basic Project Information", "The project at a glance");

  const infoStats: { value: string; label: string; color: string }[] = [];
  if (directBenef) infoStats.push({ value: stringify(directBenef), label: "direct beneficiaries", color: BLUE });
  if (totalCost) infoStats.push({ value: formatCurrency(totalCost, currency), label: "total cost", color: PRIMARY_LIGHT });
  if (indirectBenef) infoStats.push({ value: stringify(indirectBenef), label: "indirect beneficiaries", color: ACCENT_TEAL });
  if (duration) infoStats.push({ value: stringify(duration), label: "duration", color: ACCENT_ORANGE });

  if (infoStats.length > 0) {
    const cw = Math.min(2.8, 12 / infoStats.length - 0.3);
    infoStats.forEach((stat, i) => {
      addStatCard(s2, 0.5 + i * (cw + 0.3), 1.2, cw, 1.1, stat.value, stat.label, stat.color);
    });
  }

  const objectiveY = infoStats.length > 0 ? 2.6 : 1.2;
  if (basicInfo.projectObjectives) {
    addSectionBox(s2, 0.5, objectiveY, 12.2, 1.2, "Objective", truncate(stringify(basicInfo.projectObjectives), 400));
  }

  const infoGridY = objectiveY + (basicInfo.projectObjectives ? 1.4 : 0);
  const infoFields: { label: string; value: string }[] = [];
  if (basicInfo.projectLocation) infoFields.push({ label: "Location", value: stringify(basicInfo.projectLocation) });
  if (basicInfo.implementingAgency) infoFields.push({ label: "Implementing Agency", value: stringify(basicInfo.implementingAgency) });
  if (basicInfo.responsibleMinistry) infoFields.push({ label: "Responsible Ministry", value: stringify(basicInfo.responsibleMinistry) });
  if (sdgs.length > 0) {
    const sdgText = sdgs.map((n) => `SDG ${n} ${SDG_NAMES[n] || ""}`).join(" · ");
    infoFields.push({ label: "SDG Alignment", value: sdgText });
  }

  if (infoFields.length > 0) {
    const rows: PptxGenJS.TableRow[] = infoFields.map((f) => [
      { text: f.label, options: { bold: true, fontSize: 10, color: DARK, fill: { color: SECTION_BG }, fontFace: "Calibri" as const } },
      { text: truncate(f.value, 250), options: { fontSize: 10, color: DARK, fontFace: "Calibri" as const } },
    ]);
    s2.addTable(rows, {
      x: 0.5, y: infoGridY, w: 12.2,
      colW: [3.0, 9.2],
      border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
      rowH: 0.4,
    });
  }
  addFooter(s2, footerText);

  // ============================================================
  // SLIDE 3: PROBLEM ANALYSIS
  // ============================================================
  const s3 = pptx.addSlide();
  addSlideHeader(s3, "Problem Analysis", "Core problem and root causes");

  const problemText = stringify(rationale.problemAnalysis || "");
  const problemParagraphs = splitIntoParagraphs(problemText, 300);

  if (problemParagraphs.length > 0) {
    s3.addShape("roundRect" as PptxGenJS.ShapeType, {
      x: 0.5, y: 1.2, w: 12.2, h: 1.2, rectRadius: 0.1,
      fill: { color: SECTION_BG },
      line: { color: BLUE, width: 1.5 },
    });
    s3.addText("CORE PROBLEM", {
      x: 0.7, y: 1.25, w: 3, h: 0.3,
      fontSize: SIZE_TABLE, color: BLUE, fontFace: FONT_BODY, bold: true,
    });
    s3.addText(truncate(problemParagraphs[0], 350), {
      x: 0.7, y: 1.55, w: 11.8, h: 0.75,
      fontSize: 11, color: DARK, fontFace: FONT_BODY, valign: "top",
    });
  }

  const rootCauses: { title: string; text: string }[] = [];
  if (rationale.countryContext) rootCauses.push({ title: "Country Context", text: stringify(rationale.countryContext) });
  if (rationale.sectorContext) rootCauses.push({ title: "Sector Context", text: stringify(rationale.sectorContext) });
  if (rationale.needsAssessment) rootCauses.push({ title: "Needs Assessment", text: stringify(rationale.needsAssessment) });
  if (rationale.genderAnalysis) rootCauses.push({ title: "Gender Analysis", text: stringify(rationale.genderAnalysis) });

  const colW = 5.9;
  rootCauses.slice(0, 6).forEach((cause, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 0.5 + col * (colW + 0.3);
    const cy = 2.65 + row * 1.5;
    addNumberedItem(s3, cx, cy, colW, i + 1, cause.title, truncate(cause.text, 200));
  });
  addFooter(s3, footerText);

  // ============================================================
  // SLIDE 4: NEEDS ASSESSMENT & CONSEQUENCES
  // ============================================================
  if (rationale.needsAssessment || rationale.countryContext) {
    const s4 = pptx.addSlide();
    addSlideHeader(s4, "Consequences & Needs Assessment", "What the status quo means for the target population");

    let yPos = 1.3;
    if (rationale.needsAssessment) {
      const needsText = stringify(rationale.needsAssessment);
      const needsParagraphs = splitIntoParagraphs(needsText, 500);
      for (const para of needsParagraphs.slice(0, 3)) {
        s4.addText("●  " + truncate(para, 400), {
          x: 0.7, y: yPos, w: 11.8, h: 0.8,
          fontSize: 11, color: DARK, fontFace: FONT_BODY, valign: "top",
          paraSpaceAfter: 6,
        });
        yPos += 0.85;
      }
    }

    if (rationale.genderAnalysis) {
      addSectionBox(s4, 0.5, yPos + 0.1, 12.2, 1.5,
        "Gender Analysis", truncate(stringify(rationale.genderAnalysis), 400), ACCENT_TEAL);
    }
    addFooter(s4, footerText);
  }

  // ============================================================
  // SLIDE 5: PROJECT RATIONALE
  // ============================================================
  const s5 = pptx.addSlide();
  addSlideHeader(s5, "Project Rationale", "Anchored in donor, national and global frameworks");

  const rationaleBoxes: { title: string; text: string; color: string }[] = [];
  if (rationale.cpsAlignment) rationaleBoxes.push({
    title: "KOICA Country Partnership Strategy",
    text: stringify(rationale.cpsAlignment), color: BLUE,
  });
  if (rationale.nationalPlanAlignment) rationaleBoxes.push({
    title: "National Policy Alignment",
    text: stringify(rationale.nationalPlanAlignment), color: PRIMARY_LIGHT,
  });
  if (sdgs.length > 0) {
    const sdgText = sdgs.map((n) => `SDG ${n} ${SDG_NAMES[n] || ""}`).join(" · ");
    rationaleBoxes.push({ title: "Global Goals (SDGs)", text: sdgText, color: ACCENT_TEAL });
  }
  if (rationale.similarProjects) rationaleBoxes.push({
    title: "Coordination with Related Programmes",
    text: stringify(rationale.similarProjects), color: ACCENT_ORANGE,
  });

  // If we only have CPS, also try to add other rationale fields to make slide fuller
  if (rationaleBoxes.length < 2) {
    if (rationale.countryContext && !rationaleBoxes.some((b) => b.title.includes("Country"))) {
      rationaleBoxes.push({ title: "Country Context", text: truncate(stringify(rationale.countryContext), 300), color: PRIMARY_LIGHT });
    }
    if (rationale.sectorContext && rationaleBoxes.length < 3) {
      rationaleBoxes.push({ title: "Sector Context", text: truncate(stringify(rationale.sectorContext), 300), color: ACCENT_TEAL });
    }
  }

  if (rationaleBoxes.length > 0) {
    if (rationaleBoxes.length <= 2) {
      const boxH = Math.min(1.8, 5.5 / rationaleBoxes.length);
      rationaleBoxes.forEach((box, i) => {
        addSectionBox(s5, 0.5, 1.3 + i * (boxH + 0.2), 12.2, boxH, box.title, truncate(box.text, 350), box.color);
      });
    } else {
      const boxH = Math.min(1.8, 5.5 / Math.ceil(rationaleBoxes.length / 2));
      rationaleBoxes.forEach((box, i) => {
        const bCol = i % 2;
        const bRow = Math.floor(i / 2);
        addSectionBox(s5, 0.5 + bCol * 6.25, 1.3 + bRow * (boxH + 0.2), 5.95, boxH, box.title, truncate(box.text, 250), box.color);
      });
    }
  }
  addFooter(s5, footerText);

  // ============================================================
  // SLIDE 6: LOGICAL FRAMEWORK
  // ============================================================
  const s6 = pptx.addSlide();
  addSlideHeader(s6, "Logical Framework", "From activities to impact");

  const frameworkLevels: { label: string; text: string; color: string }[] = [];
  if (description.overallGoal) frameworkLevels.push({
    label: "GOAL", text: truncate(stringify(description.overallGoal), 200), color: DARK_BLUE,
  });
  if (description.projectPurpose) frameworkLevels.push({
    label: "PURPOSE", text: truncate(stringify(description.projectPurpose), 200), color: BLUE,
  });
  if (outcomes.length > 0) {
    const outcomeSummary = outcomes.map((o, i) => {
      const desc = stringify(o.description || "");
      const id = stringify(o.id || String(i + 1));
      return `${id} ${truncate(desc, 80)}`;
    }).join("  ·  ");
    frameworkLevels.push({ label: "OUTCOMES", text: outcomeSummary, color: ACCENT_TEAL });
  }
  const allOutputs = outcomes.flatMap((o) => asRecordArray(o.outputs));
  if (allOutputs.length > 0) {
    const outputSummary = allOutputs.slice(0, 6).map((o) => truncate(stringify(o.description || ""), 60)).join(" · ");
    frameworkLevels.push({ label: "OUTPUTS", text: outputSummary, color: PRIMARY_LIGHT });
  }
  const allActivities = allOutputs.flatMap((o) => asStringArray(o.activities));
  if (allActivities.length > 0) {
    const actSummary = allActivities.slice(0, 6).map((a) => truncate(stringify(a), 50)).join(" · ");
    frameworkLevels.push({ label: "ACTIVITIES", text: actSummary, color: ACCENT_ORANGE });
  }

  if (frameworkLevels.length > 0) {
    const levelH = Math.min(1.1, 5.8 / frameworkLevels.length);
    frameworkLevels.forEach((level, i) => {
      const ly = 1.2 + i * (levelH + 0.1);
      slide_addFrameworkLevel(s6, 0.5, ly, 12.2, levelH, level.label, level.text, level.color);
      if (i < frameworkLevels.length - 1) {
        s6.addText("▼", {
          x: 6.2, y: ly + levelH - 0.05, w: 1, h: 0.2,
          fontSize: 12, color: level.color, align: "center",
        });
      }
    });
  }

  s6.addText("Key assumptions: supportive government policy · stable markets · active community participation", {
    x: 0.5, y: 6.6, w: 12.2, h: 0.3,
    fontSize: SIZE_TABLE, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
  });
  addFooter(s6, footerText);

  // ============================================================
  // SLIDE 7: EXPECTED OUTCOMES
  // ============================================================
  if (outcomes.length > 0) {
    const s7 = pptx.addSlide();
    addSlideHeader(s7, "Expected Outcomes", "Measurable shifts across key dimensions");

    const outcomeH = Math.min(1.3, 5.5 / outcomes.length);
    outcomes.slice(0, 5).forEach((outcome, i) => {
      const oy = 1.3 + i * (outcomeH + 0.15);
      const indicators = asStringArray(outcome.indicators);

      // Number badge
      s7.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: 0.5, y: oy, w: 0.5, h: outcomeH, rectRadius: 0.08,
        fill: { color: BLUE },
      });
      s7.addText(String(i + 1), {
        x: 0.5, y: oy, w: 0.5, h: outcomeH,
        fontSize: 18, color: WHITE, fontFace: FONT_BODY, bold: true,
        align: "center", valign: "middle",
      });

      // Outcome card
      s7.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: 1.1, y: oy, w: 11.6, h: outcomeH, rectRadius: 0.08,
        fill: { color: CARD_BG },
        line: { color: BORDER_COLOR, width: 0.5 },
      });

      const descText = truncate(stringify(outcome.description || ""), 200);
      const indicatorText = indicators.length > 0
        ? indicators.slice(0, 3).map((ind) => "● " + truncate(stringify(ind), 100)).join("\n")
        : "";

      s7.addText([
        { text: `Outcome ${stringify(outcome.id || String(i + 1))}: `, options: { bold: true, fontSize: 11, color: BLUE } },
        { text: descText + "\n", options: { fontSize: 11, color: DARK } },
        ...(indicatorText ? [{ text: indicatorText, options: { fontSize: SIZE_TABLE, color: GRAY, italic: true } }] : []),
      ], {
        x: 1.25, y: oy + 0.08, w: 11.3, h: outcomeH - 0.16,
        fontFace: FONT_BODY, valign: "top",
      });
    });
    addFooter(s7, footerText);
  }

  // ============================================================
  // SLIDE 8: KEY OUTPUTS
  // ============================================================
  if (outcomes.some((o) => asRecordArray(o.outputs).length > 0)) {
    const s8 = pptx.addSlide();
    addSlideHeader(s8, "Key Outputs", "Deliverables across all components");

    let yPos = 1.3;
    outcomes.slice(0, 4).forEach((outcome, oi) => {
      const outputs = asRecordArray(outcome.outputs);
      if (outputs.length === 0) return;

      s8.addShape("rect" as PptxGenJS.ShapeType, {
        x: 0.5, y: yPos, w: 0.4, h: 0.3,
        fill: { color: BLUE },
      });
      s8.addText(String(oi + 1), {
        x: 0.5, y: yPos, w: 0.4, h: 0.3,
        fontSize: 11, color: WHITE, fontFace: FONT_BODY, bold: true,
        align: "center", valign: "middle",
      });
      s8.addText(truncate(stringify(outcome.description || `Component ${oi + 1}`), 100), {
        x: 1.0, y: yPos, w: 11.7, h: 0.3,
        fontSize: 11, color: BLUE, fontFace: FONT_BODY, bold: true,
        valign: "middle",
      });
      yPos += 0.35;

      outputs.slice(0, 3).forEach((output) => {
        s8.addText("▸  " + truncate(stringify(output.description || ""), 200), {
          x: 1.2, y: yPos, w: 11.5, h: 0.3,
          fontSize: 10, color: DARK, fontFace: FONT_BODY,
          valign: "top",
        });
        yPos += 0.3;
      });
      yPos += 0.15;
    });
    addFooter(s8, footerText);
  }

  // ============================================================
  // SLIDE 9: KEY ACTIVITIES
  // ============================================================
  {
    const activities: { text: string; component: string }[] = [];
    outcomes.forEach((o, oi) => {
      const outputs = asRecordArray(o.outputs);
      outputs.forEach((output) => {
        const acts = asStringArray(output.activities);
        acts.forEach((a) => activities.push({ text: stringify(a), component: `Component ${oi + 1}` }));
      });
    });

    if (activities.length > 0) {
      const s9 = pptx.addSlide();
      addSlideHeader(s9, "Key Activities", "How the outputs get delivered");

      const displayActs = activities.slice(0, 8);
      const colCount = displayActs.length > 4 ? 2 : 1;
      const perCol = Math.ceil(displayActs.length / colCount);
      const itemH = Math.min(1.0, 5.5 / perCol);

      displayActs.forEach((act, i) => {
        const col = Math.floor(i / perCol);
        const row = i % perCol;
        const cx = 0.5 + col * 6.25;
        const cy = 1.3 + row * (itemH + 0.15);
        addNumberedItem(s9, cx, cy, colCount === 2 ? 5.95 : 12.2, i + 1, act.component, truncate(act.text, 180));
      });
      addFooter(s9, footerText);
    }
  }

  // ============================================================
  // SLIDE 10: BUDGET PLAN
  // ============================================================
  if (budgetItems.length > 0) {
    const s10 = pptx.addSlide();
    addSlideHeader(s10, "Budget Plan", `${formatCurrency(basicInfo.totalProjectCost, currency)} over ${stringify(basicInfo.projectDuration || "the project period")}`);

    const maxAmount = Math.max(...budgetItems.map((b) => Number(b.amount) || 0), 1);
    let yPos = 1.3;

    budgetItems.slice(0, 8).forEach((item) => {
      const amount = Number(item.amount) || 0;
      const pct = Number(item.percentage) || 0;
      const barWidth = Math.max(0.5, (amount / maxAmount) * 8);

      s10.addText(stringify(item.category || ""), {
        x: 0.5, y: yPos, w: 3.5, h: 0.35,
        fontSize: 10, color: DARK, fontFace: FONT_BODY, bold: true,
        align: "right", valign: "middle",
      });

      s10.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: 4.2, y: yPos + 0.03, w: barWidth, h: 0.3, rectRadius: 0.05,
        fill: { color: BLUE },
      });

      s10.addText(`${formatCurrency(amount, currency)}`, {
        x: 4.3, y: yPos, w: barWidth - 0.2, h: 0.35,
        fontSize: 10, color: WHITE, fontFace: FONT_BODY, bold: true,
        valign: "middle",
      });

      s10.addText(`${pct}%`, {
        x: 4.2 + barWidth + 0.15, y: yPos, w: 1, h: 0.35,
        fontSize: 10, color: BLUE, fontFace: FONT_BODY, bold: true,
        valign: "middle",
      });

      if (item.description) {
        s10.addText(truncate(stringify(item.description), 120), {
          x: 0.5, y: yPos + 0.35, w: 12.2, h: 0.25,
          fontSize: SIZE_SMALL, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
        });
        yPos += 0.7;
      } else {
        yPos += 0.5;
      }
    });

    if (management.localProcurement) {
      s10.addText("● " + truncate(stringify(management.localProcurement), 200), {
        x: 0.5, y: 6.3, w: 12.2, h: 0.4,
        fontSize: SIZE_TABLE, color: PRIMARY_LIGHT, fontFace: FONT_BODY, italic: true,
      });
    }
    addFooter(s10, footerText);
  }

  // ============================================================
  // SLIDE 11: IMPLEMENTATION TIMELINE
  // ============================================================
  if (description.timeline) {
    const s11 = pptx.addSlide();
    addSlideHeader(s11, "Implementation Timeline", "Phased approach from set-up to handover");

    // Handle timeline as array of phase objects
    if (Array.isArray(description.timeline)) {
      const phases = description.timeline as Record<string, unknown>[];
      const phaseW = Math.min(2.3, 12 / Math.max(phases.length, 1) - 0.2);
      phases.slice(0, 5).forEach((phase, i) => {
        const px = 0.5 + i * (phaseW + 0.2);
        s11.addShape("roundRect" as PptxGenJS.ShapeType, {
          x: px, y: 1.3, w: phaseW, h: 5.0, rectRadius: 0.1,
          fill: { color: i === 0 ? SECTION_BG : CARD_BG },
          line: { color: BORDER_COLOR, width: 0.75 },
        });
        s11.addShape("rect" as PptxGenJS.ShapeType, {
          x: px, y: 1.3, w: phaseW, h: 0.5,
          fill: { color: BLUE },
        });
        const phaseTitle = stringify(phase.phase || phase.year || `Phase ${i + 1}`);
        s11.addText(phaseTitle, {
          x: px, y: 1.3, w: phaseW, h: 0.5,
          fontSize: 13, color: WHITE, fontFace: FONT_BODY, bold: true,
          align: "center", valign: "middle",
        });
        const milestones = stringify(phase.milestones || phase.activities || phase.description || "");
        s11.addText(truncate(milestones, 300), {
          x: px + 0.1, y: 1.9, w: phaseW - 0.2, h: 4.3,
          fontSize: SIZE_TABLE, color: DARK, fontFace: FONT_BODY,
          valign: "top", paraSpaceAfter: 4,
        });
      });
    } else {
      const timelineText = stringify(description.timeline);

      // Try to parse year/phase-based sections
      const phasePattern = /(?=(?:Year|Phase)\s*\d)/i;
      const hasPhases = phasePattern.test(timelineText);

      if (hasPhases) {
        const phases = timelineText.split(phasePattern).filter(Boolean);
        const phaseW = Math.min(2.3, 12 / Math.max(phases.length, 1) - 0.2);
        phases.slice(0, 5).forEach((phase, i) => {
          const px = 0.5 + i * (phaseW + 0.2);
          s11.addShape("roundRect" as PptxGenJS.ShapeType, {
            x: px, y: 1.3, w: phaseW, h: 5.0, rectRadius: 0.1,
            fill: { color: i === 0 ? SECTION_BG : CARD_BG },
            line: { color: BORDER_COLOR, width: 0.75 },
          });
          s11.addShape("rect" as PptxGenJS.ShapeType, {
            x: px, y: 1.3, w: phaseW, h: 0.5,
            fill: { color: BLUE },
          });
          const yearMatch = phase.match(/(?:Year|Phase)\s*(\d)/i);
          s11.addText(yearMatch ? `Year ${yearMatch[1]}` : `Phase ${i + 1}`, {
            x: px, y: 1.3, w: phaseW, h: 0.5,
            fontSize: 13, color: WHITE, fontFace: FONT_BODY, bold: true,
            align: "center", valign: "middle",
          });
          const phaseContent = phase.replace(/(?:Year|Phase)\s*\d\s*[:–\-]?\s*/i, "").trim();
          s11.addText(truncate(phaseContent, 300), {
            x: px + 0.1, y: 1.9, w: phaseW - 0.2, h: 4.3,
            fontSize: SIZE_TABLE, color: DARK, fontFace: FONT_BODY,
            valign: "top", paraSpaceAfter: 4,
          });
        });
      } else {
        const timelineParagraphs = splitIntoParagraphs(timelineText, 400);
        s11.addText(timelineParagraphs.map((p) => ({ text: p + "\n\n", options: { fontSize: 11, color: DARK, fontFace: "Calibri" as const } })), {
          x: 0.5, y: 1.3, w: 12.2, h: 5.5,
          valign: "top",
        });
      }
    }
    addFooter(s11, footerText);
  }

  // ============================================================
  // SLIDE 12: PERFORMANCE INDICATORS (enhanced 4-column table)
  // ============================================================
  if (outcomes.length > 0 && outcomes.some((o) => asStringArray(o.indicators).length > 0)) {
    const s12 = pptx.addSlide();
    addSlideHeader(s12, "Performance Indicators", "Baseline to target, and how it is verified");

    // Check if we can extract baseline/target from indicator text
    const allIndicators: { outcome: string; indicator: string; baseline: string; target: string }[] = [];
    outcomes.forEach((outcome) => {
      const indicators = asStringArray(outcome.indicators);
      const outName = truncate(stringify(outcome.description || outcome.id || ""), 60);
      indicators.slice(0, 3).forEach((ind) => {
        const parsed = parseIndicatorMetrics(stringify(ind));
        allIndicators.push({
          outcome: outName,
          indicator: parsed.indicator || stringify(ind),
          baseline: parsed.baseline,
          target: parsed.target,
        });
      });
    });

    const hasMetrics = allIndicators.some((ind) => ind.baseline && ind.target);

    if (hasMetrics) {
      // 4-column table like Ethiopia
      const headerOpts = { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const };
      const indicatorRows: PptxGenJS.TableRow[] = [
        [
          { text: "INDICATOR", options: headerOpts },
          { text: "BASELINE", options: { ...headerOpts, align: "center" as const } },
          { text: "TARGET", options: { ...headerOpts, align: "center" as const } },
          { text: "MEANS OF VERIFICATION", options: headerOpts },
        ],
      ];

      allIndicators.forEach((ind) => {
        indicatorRows.push([
          { text: truncate(ind.indicator, 120), options: { fontSize: SIZE_TABLE, color: DARK, fontFace: "Calibri" as const } },
          { text: ind.baseline || "-", options: { fontSize: SIZE_TABLE, color: ACCENT_ORANGE, fontFace: "Calibri" as const, bold: true, align: "center" as const } },
          { text: ind.target || "-", options: { fontSize: SIZE_TABLE, color: PRIMARY_LIGHT, fontFace: "Calibri" as const, bold: true, align: "center" as const } },
          { text: "Surveys, records, reports", options: { fontSize: SIZE_SMALL, color: GRAY, fontFace: "Calibri" as const } },
        ]);
      });

      s12.addTable(indicatorRows, {
        x: 0.5, y: 1.3, w: 12.2,
        colW: [4.5, 1.5, 1.5, 4.7],
        border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
        rowH: 0.4,
        autoPage: true,
      });
    } else {
      // 2-column fallback
      const indicatorRows: PptxGenJS.TableRow[] = [
        [
          { text: "Outcome", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
          { text: "Indicator", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
        ],
      ];

      let prevOutcome = "";
      allIndicators.forEach((ind) => {
        const showOutcome = ind.outcome !== prevOutcome;
        prevOutcome = ind.outcome;
        indicatorRows.push([
          { text: showOutcome ? ind.outcome : "", options: { fontSize: SIZE_TABLE, color: DARK, bold: showOutcome, fontFace: "Calibri" as const, fill: { color: showOutcome ? SECTION_BG : WHITE } } },
          { text: truncate(ind.indicator, 200), options: { fontSize: SIZE_TABLE, color: DARK, fontFace: "Calibri" as const } },
        ]);
      });

      s12.addTable(indicatorRows, {
        x: 0.5, y: 1.3, w: 12.2,
        colW: [4.0, 8.2],
        border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
        rowH: 0.4,
        autoPage: true,
      });
    }

    if (management.meFramework) {
      s12.addText("M&E: " + truncate(stringify(management.meFramework), 250), {
        x: 0.5, y: 6.3, w: 12.2, h: 0.5,
        fontSize: SIZE_TABLE, color: ACCENT_TEAL, fontFace: FONT_BODY, italic: true,
      });
    }
    addFooter(s12, footerText);
  }

  // ============================================================
  // SLIDE 13: STAKEHOLDERS & IMPLEMENTATION
  // ============================================================
  if (stakeholders.length > 0) {
    const s13 = pptx.addSlide();
    addSlideHeader(s13, "Stakeholders & Implementation", "Who does what");

    const stRows: PptxGenJS.TableRow[] = [
      [
        { text: "Stakeholder", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
        { text: "Type", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
        { text: "Role & Coordination", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
      ],
    ];
    stakeholders.slice(0, 8).forEach((st) => {
      const roleText = [stringify(st.role || ""), stringify(st.coordinationMechanism || "")].filter((t) => t !== "-").join(" — ");
      stRows.push([
        { text: stringify(st.name || ""), options: { fontSize: SIZE_TABLE, color: DARK, bold: true, fontFace: "Calibri" as const } },
        { text: stringify(st.type || "").replace(/_/g, " "), options: { fontSize: SIZE_SMALL, color: GRAY, fontFace: "Calibri" as const } },
        { text: truncate(roleText, 180), options: { fontSize: SIZE_TABLE, color: DARK, fontFace: "Calibri" as const } },
      ]);
    });

    const tableH = Math.min(3.5, (stakeholders.length + 1) * 0.4 + 0.1);
    s13.addTable(stRows, {
      x: 0.5, y: 1.3, w: 12.2,
      colW: [3.0, 2.0, 7.2],
      border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
      rowH: 0.38,
    });

    const bottomY = 1.3 + tableH + 0.3;
    const remainingH = 6.5 - bottomY;

    if (management.managementStructure && stakeholderAnalysis.beneficiaryParticipation) {
      const halfW = 5.95;
      addSectionBox(s13, 0.5, bottomY, halfW, Math.min(remainingH, 2.0),
        "Management Structure", truncate(stringify(management.managementStructure), 300), BLUE);
      addSectionBox(s13, 6.75, bottomY, halfW, Math.min(remainingH, 2.0),
        "Beneficiary Participation", truncate(stringify(stakeholderAnalysis.beneficiaryParticipation), 300), PRIMARY_LIGHT);
    } else if (management.managementStructure) {
      addSectionBox(s13, 0.5, bottomY, 12.2, Math.min(remainingH, 1.8),
        "Management Structure", truncate(stringify(management.managementStructure), 400), BLUE);
    } else if (stakeholderAnalysis.beneficiaryParticipation) {
      addSectionBox(s13, 0.5, bottomY, 12.2, Math.min(remainingH, 1.8),
        "Beneficiary Participation", truncate(stringify(stakeholderAnalysis.beneficiaryParticipation), 400), PRIMARY_LIGHT);
    }
    addFooter(s13, footerText);
  } else if (management.managementStructure || stakeholderAnalysis.beneficiaryParticipation) {
    // Fallback: show management/participation even without structured stakeholders
    const s13 = pptx.addSlide();
    addSlideHeader(s13, "Implementation Arrangement", "How the project is managed");

    let yPos = 1.3;
    if (management.implementationArrangement) {
      addSectionBox(s13, 0.5, yPos, 12.2, 1.8,
        "Implementation Arrangement", truncate(stringify(management.implementationArrangement), 500), BLUE);
      yPos += 2.0;
    }
    if (management.managementStructure) {
      addSectionBox(s13, 0.5, yPos, 12.2, 1.8,
        "Management Structure", truncate(stringify(management.managementStructure), 500), ACCENT_TEAL);
      yPos += 2.0;
    }
    if (stakeholderAnalysis.beneficiaryParticipation) {
      addSectionBox(s13, 0.5, yPos, 12.2, 1.5,
        "Beneficiary Participation", truncate(stringify(stakeholderAnalysis.beneficiaryParticipation), 400), PRIMARY_LIGHT);
    }
    addFooter(s13, footerText);
  }

  // ============================================================
  // SLIDE 14: RISK ANALYSIS
  // ============================================================
  if (risks.length > 0) {
    const s14 = pptx.addSlide();
    addSlideHeader(s14, "Risk Analysis", "Key risks and mitigation strategies");

    const riskHeaderRow: PptxGenJS.TableRow = [
      { text: "RISK", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const } },
      { text: "IMPACT", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const, align: "center" as const } },
      { text: "LIKELIHOOD", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const, align: "center" as const } },
      { text: "MITIGATION", options: { bold: true, fontSize: SIZE_TABLE, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const } },
    ];

    const riskDataRows: PptxGenJS.TableRow[] = risks.slice(0, 7).map((risk) => {
      const impact = stringify(risk.impact || "").toLowerCase();
      const likelihood = stringify(risk.likelihood || "").toLowerCase();
      return [
        { text: truncate(stringify(risk.description || ""), 150), options: { fontSize: SIZE_TABLE, color: DARK, fontFace: "Calibri" as const } },
        { text: impact.charAt(0).toUpperCase() + impact.slice(1), options: { fontSize: SIZE_TABLE, color: riskColor(impact), fontFace: "Calibri" as const, bold: true, align: "center" as const } },
        { text: likelihood.charAt(0).toUpperCase() + likelihood.slice(1), options: { fontSize: SIZE_TABLE, color: riskColor(likelihood), fontFace: "Calibri" as const, bold: true, align: "center" as const } },
        { text: truncate(stringify(risk.mitigation || ""), 180), options: { fontSize: SIZE_TABLE, color: DARK, fontFace: "Calibri" as const } },
      ] as PptxGenJS.TableRow;
    });

    s14.addTable([riskHeaderRow, ...riskDataRows], {
      x: 0.5, y: 1.3, w: 12.2,
      colW: [3.0, 1.2, 1.2, 6.8],
      border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
      rowH: 0.55,
    });
    addFooter(s14, footerText);
  } else if (management.risks && typeof management.risks === "string") {
    // Fallback: risk as text block
    const s14 = pptx.addSlide();
    addSlideHeader(s14, "Risk Analysis", "Key risks and mitigation strategies");
    addSectionBox(s14, 0.5, 1.3, 12.2, 5.0, "Risk Analysis", truncate(stringify(management.risks), 1000), ACCENT_RED);
    addFooter(s14, footerText);
  }

  // ============================================================
  // SLIDE 15: SUSTAINABILITY PLAN
  // ============================================================
  {
    const sustainPillars: { title: string; text: string; color: string }[] = [];
    if (management.sustainabilityPlan) {
      const sustText = stringify(management.sustainabilityPlan);
      // Try to intelligently split into pillars
      const parsed = parseSustainabilityPillars(sustText);
      if (parsed.length >= 2) {
        sustainPillars.push(...parsed);
      } else {
        // Fallback: split by sentences into 3 pillars
        const chunks = splitIntoParagraphs(sustText, 300);
        if (chunks.length >= 3) {
          sustainPillars.push({ title: "Financial & Economic", text: chunks[0], color: BLUE });
          sustainPillars.push({ title: "Technical & Capacity", text: chunks[1], color: PRIMARY_LIGHT });
          sustainPillars.push({ title: "Institutional & Social", text: chunks.slice(2).join(" "), color: ACCENT_TEAL });
        } else {
          sustainPillars.push({ title: "Sustainability Plan", text: sustText, color: BLUE });
        }
      }
    }
    if (management.implementationArrangement && !sustainPillars.some((p) => p.title.includes("Implementation"))) {
      sustainPillars.push({ title: "Implementation Arrangement", text: stringify(management.implementationArrangement), color: ACCENT_ORANGE });
    }
    if (management.meFramework && !sustainPillars.some((p) => p.title.includes("M&E"))) {
      sustainPillars.push({ title: "M&E Framework", text: stringify(management.meFramework), color: DARK_BLUE });
    }

    if (sustainPillars.length > 0) {
      const s15 = pptx.addSlide();
      addSlideHeader(s15, "Sustainability & Implementation", "Designed to outlive the funding");

      if (sustainPillars.length <= 2) {
        const boxH = 2.2;
        sustainPillars.forEach((pillar, i) => {
          addSectionBox(s15, 0.5, 1.3 + i * (boxH + 0.2), 12.2, boxH, pillar.title, truncate(pillar.text, 500), pillar.color);
        });
      } else if (sustainPillars.length <= 4) {
        const colW2 = 5.95;
        const boxH = 2.2;
        sustainPillars.forEach((pillar, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          addSectionBox(s15, 0.5 + col * 6.25, 1.3 + row * (boxH + 0.2), colW2, boxH, pillar.title, truncate(pillar.text, 300), pillar.color);
        });
      } else {
        const boxH = Math.min(1.5, 5.5 / sustainPillars.length);
        sustainPillars.slice(0, 5).forEach((pillar, i) => {
          addSectionBox(s15, 0.5, 1.3 + i * (boxH + 0.15), 12.2, boxH, pillar.title, truncate(pillar.text, 350), pillar.color);
        });
      }
      addFooter(s15, footerText);
    }
  }

  // ============================================================
  // SLIDE 16: WHY THIS PROJECT
  // ============================================================
  {
    const whyPoints: { title: string; text: string }[] = [];

    // Build compelling arguments from the data
    if (rationale.cpsAlignment || rationale.nationalPlanAlignment) {
      whyPoints.push({
        title: "Anchored in proven strategy",
        text: truncate(stringify(rationale.cpsAlignment || rationale.nationalPlanAlignment), 180),
      });
    }
    if (rationale.similarProjects) {
      whyPoints.push({
        title: "Built on evidence",
        text: truncate(stringify(rationale.similarProjects), 180),
      });
    }
    if (management.sustainabilityPlan) {
      whyPoints.push({
        title: "Designed to outlive the funding",
        text: truncate(stringify(management.sustainabilityPlan), 180),
      });
    }
    if (whyPoints.length < 2 && rationale.problemAnalysis) {
      whyPoints.push({
        title: "Addresses a critical gap",
        text: truncate(stringify(rationale.problemAnalysis), 180),
      });
    }
    if (whyPoints.length < 3 && outcomes.length > 0) {
      const outcomesSummary = outcomes.map((o) => stringify(o.description || "")).join("; ");
      whyPoints.push({
        title: "Clear measurable outcomes",
        text: truncate(outcomesSummary, 180),
      });
    }

    if (whyPoints.length > 0) {
      const sWhy = pptx.addSlide();
      sWhy.background = { fill: DARK_BLUE };
      sWhy.addShape("rect" as PptxGenJS.ShapeType, {
        x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: PRIMARY_LIGHT },
      });

      sWhy.addText("WHY THIS PROJECT", {
        x: 0, y: 0.6, w: 13.33, h: 0.8,
        fontSize: 30, color: WHITE, fontFace: FONT_TITLE, bold: true,
        align: "center",
      });

      // Subtitle
      const whySubtitle = basicInfo.projectObjectives
        ? truncate(stringify(basicInfo.projectObjectives), 120)
        : `A targeted investment in ${sectorLabel.toLowerCase()} for ${country}`;
      sWhy.addText(whySubtitle, {
        x: 1, y: 1.3, w: 11.33, h: 0.5,
        fontSize: 13, color: BORDER_COLOR, fontFace: FONT_BODY, italic: true,
        align: "center",
      });

      whyPoints.slice(0, 3).forEach((point, i) => {
        const py = 2.2 + i * 1.5;
        // Number circle
        sWhy.addShape("ellipse" as PptxGenJS.ShapeType, {
          x: 1.0, y: py + 0.1, w: 0.5, h: 0.5,
          fill: { color: BLUE },
        });
        sWhy.addText(String(i + 1), {
          x: 1.0, y: py + 0.1, w: 0.5, h: 0.5,
          fontSize: 16, color: WHITE, fontFace: FONT_BODY, bold: true,
          align: "center", valign: "middle",
        });
        // Title and text
        sWhy.addText(point.title, {
          x: 1.7, y: py, w: 10.5, h: 0.4,
          fontSize: 16, color: WHITE, fontFace: FONT_BODY, bold: true,
        });
        sWhy.addText(point.text, {
          x: 1.7, y: py + 0.45, w: 10.5, h: 0.8,
          fontSize: 11, color: BORDER_COLOR, fontFace: FONT_BODY,
          valign: "top",
        });
      });

      // Bottom summary
      const whySummaryParts = [
        basicInfo.responsibleMinistry ? stringify(basicInfo.responsibleMinistry) : "",
        country,
        totalCost ? formatCurrency(totalCost, currency) : "",
        duration ? stringify(duration) : "",
      ].filter(Boolean);
      sWhy.addText(whySummaryParts.join("  ·  "), {
        x: 1, y: 6.5, w: 11.33, h: 0.4,
        fontSize: 11, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
        align: "center",
      });
    }
  }

  // ============================================================
  // SLIDE 17: THANK YOU
  // ============================================================
  const sLast = pptx.addSlide();
  sLast.background = { fill: BLUE };

  sLast.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: PRIMARY_LIGHT },
  });

  sLast.addText("Thank You", {
    x: 0, y: 1.5, w: 13.33, h: 1.2,
    fontSize: 44, color: WHITE, fontFace: FONT_TITLE, bold: true,
    align: "center",
  });
  sLast.addText(title, {
    x: 1, y: 3.0, w: 11.33, h: 0.8,
    fontSize: 18, color: BORDER_COLOR, fontFace: FONT_BODY,
    align: "center",
  });

  const summaryParts = [
    basicInfo.responsibleMinistry ? stringify(basicInfo.responsibleMinistry) : "",
    country,
    totalCost ? formatCurrency(totalCost, currency) : "",
    basicInfo.projectDuration ? stringify(basicInfo.projectDuration) : "",
  ].filter(Boolean);
  sLast.addText(summaryParts.join("  ·  "), {
    x: 1, y: 4.2, w: 11.33, h: 0.5,
    fontSize: 13, color: BORDER_COLOR, fontFace: FONT_BODY,
    align: "center",
  });

  sLast.addText(`Generated: ${new Date().toLocaleDateString()}  |  Prepared with AI-PCP  |  KOICA Standard Format`, {
    x: 1, y: 5.8, w: 11.33, h: 0.5,
    fontSize: 11, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
    align: "center",
  });

  return await pptx.write({ outputType: "blob" }) as Blob;
}
