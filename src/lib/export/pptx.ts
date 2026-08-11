import PptxGenJS from "pptxgenjs";

// === Color Palette ===
const BLUE = "1a56db";
const DARK_BLUE = "0f3d9e";
const DARK = "333333";
const GRAY = "666666";
const LIGHT_GRAY = "999999";
const LIGHT_BG = "F0F4FF";
const WHITE = "FFFFFF";
const ACCENT_GREEN = "16a34a";
const ACCENT_ORANGE = "ea580c";
const ACCENT_RED = "dc2626";
const ACCENT_TEAL = "0d9488";
const BORDER_COLOR = "D0D5DD";
const CARD_BG = "F8FAFC";
const SECTION_BG = "EEF2FF";

// === SDG Names ===
const SDG_NAMES: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Production", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

// === Helpers ===
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
  return ACCENT_GREEN;
}

// === Slide building blocks ===
function addSlideHeader(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  slide.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 1.0,
    fill: { color: BLUE },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.6, y: 0.1, w: 10, h: 0.5,
    fontSize: 22, color: WHITE, fontFace: "Calibri", bold: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6, y: 0.55, w: 10, h: 0.35,
      fontSize: 12, color: "A0C0FF", fontFace: "Calibri", italic: true,
    });
  }
  // Bottom accent line
  slide.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0.97, w: 13.33, h: 0.03,
    fill: { color: DARK_BLUE },
  });
}

function addStatCard(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  value: string, label: string, accentColor = BLUE
) {
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x, y, w, h, rectRadius: 0.1,
    fill: { color: CARD_BG },
    line: { color: BORDER_COLOR, width: 0.75 },
  });
  slide.addText(value, {
    x, y: y + 0.1, w, h: h * 0.5,
    fontSize: 22, color: accentColor, fontFace: "Calibri", bold: true,
    align: "center", valign: "bottom",
  });
  slide.addText(label, {
    x: x + 0.1, y: y + h * 0.55, w: w - 0.2, h: h * 0.4,
    fontSize: 9, color: GRAY, fontFace: "Calibri",
    align: "center", valign: "top",
  });
}

function addNumberedItem(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number,
  num: number, title: string, description: string,
  numColor = BLUE
) {
  // Number circle
  slide.addShape("ellipse" as PptxGenJS.ShapeType, {
    x, y: y + 0.05, w: 0.35, h: 0.35,
    fill: { color: numColor },
  });
  slide.addText(String(num), {
    x, y: y + 0.05, w: 0.35, h: 0.35,
    fontSize: 12, color: WHITE, fontFace: "Calibri", bold: true,
    align: "center", valign: "middle",
  });
  // Title and description
  slide.addText([
    { text: title + "\n", options: { bold: true, fontSize: 11, color: DARK } },
    { text: description, options: { fontSize: 9.5, color: GRAY } },
  ], {
    x: x + 0.45, y, w: w - 0.5, h: 0.8,
    fontFace: "Calibri", valign: "top",
  });
}

function addSectionBox(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  title: string, body: string, accentColor = BLUE
) {
  // Left accent bar
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
    { text: title + "\n", options: { bold: true, fontSize: 11, color: accentColor } },
    { text: body, options: { fontSize: 9.5, color: DARK } },
  ], {
    x: x + 0.2, y: y + 0.08, w: w - 0.35, h: h - 0.16,
    fontFace: "Calibri", valign: "top",
  });
}

function addFooter(slide: PptxGenJS.Slide, text: string) {
  slide.addText(text, {
    x: 0.5, y: 7.0, w: 12.3, h: 0.3,
    fontSize: 8, color: LIGHT_GRAY, fontFace: "Calibri", italic: true,
    align: "right",
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
  const outcomes = Array.isArray(description.expectedOutcomes) ? description.expectedOutcomes as Record<string, unknown>[] : [];
  const budgetItems = Array.isArray(description.budgetPlan) ? description.budgetPlan as Record<string, unknown>[] : [];
  const stakeholders = Array.isArray(stakeholderAnalysis.stakeholders) ? stakeholderAnalysis.stakeholders as Record<string, unknown>[] : [];
  const risks = Array.isArray(management.risks) ? management.risks as Record<string, unknown>[] : [];
  const sdgs = Array.isArray(basicInfo.sdgsAlignment) ? basicInfo.sdgsAlignment as number[] : [];
  const sectorLabel = sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // ============================================================
  // SLIDE 1: TITLE
  // ============================================================
  const s1 = pptx.addSlide();
  s1.background = { fill: BLUE };

  // Subtle top decoration
  s1.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: WHITE },
  });

  s1.addText("PROJECT CONCEPT PAPER  ·  KOICA STANDARD FORMAT", {
    x: 0.8, y: 0.8, w: 11.5, h: 0.5,
    fontSize: 13, color: "A0C0FF", fontFace: "Calibri", bold: true,
    charSpacing: 3,
  });
  s1.addText(title, {
    x: 0.8, y: 1.5, w: 11.5, h: 1.8,
    fontSize: 30, color: WHITE, fontFace: "Calibri", bold: true,
    valign: "top",
  });

  // Agency / Location / Duration subtitle
  const subtitleParts = [
    basicInfo.responsibleMinistry ? stringify(basicInfo.responsibleMinistry) : "",
    basicInfo.projectLocation ? stringify(basicInfo.projectLocation) : "",
    basicInfo.projectDuration ? stringify(basicInfo.projectDuration) : "",
  ].filter(Boolean);
  if (subtitleParts.length > 0) {
    s1.addText(subtitleParts.join("  ·  "), {
      x: 0.8, y: 3.3, w: 11.5, h: 0.5,
      fontSize: 14, color: "A0C0FF", fontFace: "Calibri",
    });
  }

  // Stat cards on title slide
  const totalCost = basicInfo.totalProjectCost;
  const directBenef = beneficiaries?.direct || beneficiaries?.totalCount;
  const indirectBenef = beneficiaries?.indirect;
  const duration = basicInfo.projectDuration;

  const titleStats: { value: string; label: string }[] = [];
  if (totalCost) titleStats.push({ value: formatCurrency(totalCost, currency), label: "Total project cost" });
  if (duration) titleStats.push({ value: stringify(duration), label: "Project duration" });
  if (directBenef) titleStats.push({ value: stringify(directBenef), label: "Direct beneficiaries" });
  if (indirectBenef) titleStats.push({ value: stringify(indirectBenef), label: "Indirect beneficiaries" });

  if (titleStats.length > 0) {
    const cardW = Math.min(2.6, 11.5 / titleStats.length - 0.2);
    const startX = 0.8;
    titleStats.forEach((stat, i) => {
      const cx = startX + i * (cardW + 0.25);
      // Semi-transparent card
      s1.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: cx, y: 4.3, w: cardW, h: 1.3, rectRadius: 0.1,
        fill: { color: DARK_BLUE },
      });
      s1.addText(stat.value, {
        x: cx, y: 4.35, w: cardW, h: 0.7,
        fontSize: 20, color: WHITE, fontFace: "Calibri", bold: true,
        align: "center", valign: "bottom",
      });
      s1.addText(stat.label, {
        x: cx + 0.1, y: 5.1, w: cardW - 0.2, h: 0.4,
        fontSize: 9, color: "A0C0FF", fontFace: "Calibri",
        align: "center", valign: "top",
      });
    });
  }

  s1.addText(`${sectorLabel}  |  ${country}  |  Prepared with AI-PCP`, {
    x: 0.8, y: 6.5, w: 11.5, h: 0.4,
    fontSize: 11, color: "7090CC", fontFace: "Calibri", italic: true,
  });

  // ============================================================
  // SLIDE 2: BASIC PROJECT INFORMATION
  // ============================================================
  const s2 = pptx.addSlide();
  addSlideHeader(s2, "Basic Project Information", "The project at a glance");

  // Top stat cards row
  const infoStats: { value: string; label: string; color: string }[] = [];
  if (directBenef) infoStats.push({ value: stringify(directBenef), label: "direct beneficiaries", color: BLUE });
  if (totalCost) infoStats.push({ value: formatCurrency(totalCost, currency), label: "total cost", color: ACCENT_GREEN });
  if (indirectBenef) infoStats.push({ value: stringify(indirectBenef), label: "indirect beneficiaries", color: ACCENT_TEAL });
  if (duration) infoStats.push({ value: stringify(duration), label: "duration", color: ACCENT_ORANGE });

  if (infoStats.length > 0) {
    const cw = Math.min(2.8, 12 / infoStats.length - 0.3);
    infoStats.forEach((stat, i) => {
      addStatCard(s2, 0.5 + i * (cw + 0.3), 1.2, cw, 1.1, stat.value, stat.label, stat.color);
    });
  }

  // Objective box
  const objectiveY = infoStats.length > 0 ? 2.6 : 1.2;
  if (basicInfo.projectObjectives) {
    addSectionBox(s2, 0.5, objectiveY, 12.2, 1.2, "Objective", truncate(stringify(basicInfo.projectObjectives), 400));
  }

  // Info grid below
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
  addFooter(s2, `${title} | ${country}`);

  // ============================================================
  // SLIDE 3: PROBLEM ANALYSIS
  // ============================================================
  const s3 = pptx.addSlide();
  addSlideHeader(s3, "Problem Analysis", "Core problem and root causes");

  const problemText = stringify(rationale.problemAnalysis || "");
  const problemParagraphs = splitIntoParagraphs(problemText, 300);

  // Core problem box
  if (problemParagraphs.length > 0) {
    s3.addShape("roundRect" as PptxGenJS.ShapeType, {
      x: 0.5, y: 1.2, w: 12.2, h: 1.2, rectRadius: 0.1,
      fill: { color: SECTION_BG },
      line: { color: BLUE, width: 1.5 },
    });
    s3.addText("CORE PROBLEM", {
      x: 0.7, y: 1.25, w: 3, h: 0.3,
      fontSize: 9, color: BLUE, fontFace: "Calibri", bold: true,
    });
    s3.addText(truncate(problemParagraphs[0], 350), {
      x: 0.7, y: 1.55, w: 11.8, h: 0.75,
      fontSize: 11, color: DARK, fontFace: "Calibri", valign: "top",
    });
  }

  // Additional problem analysis and needs as numbered items
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
  addFooter(s3, `${title} | ${country}`);

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
          fontSize: 11, color: DARK, fontFace: "Calibri", valign: "top",
          paraSpaceAfter: 6,
        });
        yPos += 0.85;
      }
    }

    // Gender analysis box
    if (rationale.genderAnalysis) {
      addSectionBox(s4, 0.5, yPos + 0.1, 12.2, 1.5,
        "Gender Analysis", truncate(stringify(rationale.genderAnalysis), 400), ACCENT_TEAL);
    }
    addFooter(s4, `${title} | ${country}`);
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
    text: stringify(rationale.nationalPlanAlignment), color: ACCENT_GREEN,
  });
  if (sdgs.length > 0) {
    const sdgText = sdgs.map((n) => `SDG ${n} ${SDG_NAMES[n] || ""}`).join(" · ");
    rationaleBoxes.push({ title: "Global Goals (SDGs)", text: sdgText, color: ACCENT_TEAL });
  }
  if (rationale.similarProjects) rationaleBoxes.push({
    title: "Coordination with Related Programmes",
    text: stringify(rationale.similarProjects), color: ACCENT_ORANGE,
  });

  if (rationaleBoxes.length > 0) {
    const boxH = Math.min(1.8, 5.5 / rationaleBoxes.length);
    rationaleBoxes.forEach((box, i) => {
      if (rationaleBoxes.length <= 2) {
        // Stack vertically full width
        addSectionBox(s5, 0.5, 1.3 + i * (boxH + 0.2), 12.2, boxH, box.title, truncate(box.text, 350), box.color);
      } else {
        // 2-column grid
        const col = i % 2;
        const row = Math.floor(i / 2);
        addSectionBox(s5, 0.5 + col * 6.25, 1.3 + row * (boxH + 0.2), 5.95, boxH, box.title, truncate(box.text, 250), box.color);
      }
    });
  }
  addFooter(s5, `${title} | ${country}`);

  // ============================================================
  // SLIDE 6: LOGICAL FRAMEWORK
  // ============================================================
  const s6 = pptx.addSlide();
  addSlideHeader(s6, "Logical Framework", "From activities to impact");

  // Framework chain: Goal -> Purpose -> Outcomes -> Outputs -> Activities
  const frameworkLevels: { label: string; text: string; color: string }[] = [];
  if (description.overallGoal) frameworkLevels.push({
    label: "GOAL", text: truncate(stringify(description.overallGoal), 200), color: DARK_BLUE,
  });
  if (description.projectPurpose) frameworkLevels.push({
    label: "PURPOSE", text: truncate(stringify(description.projectPurpose), 200), color: BLUE,
  });
  if (outcomes.length > 0) {
    const outcomeSummary = outcomes.map((o, i) => `${i + 1}. ${truncate(stringify(o.description || o.id || ""), 80)}`).join("  ·  ");
    frameworkLevels.push({ label: "OUTCOMES", text: outcomeSummary, color: ACCENT_TEAL });
  }
  // Collect all outputs
  const allOutputs = outcomes.flatMap((o) => Array.isArray(o.outputs) ? o.outputs as Record<string, unknown>[] : []);
  if (allOutputs.length > 0) {
    const outputSummary = allOutputs.slice(0, 6).map((o) => truncate(stringify(o.description || ""), 60)).join(" · ");
    frameworkLevels.push({ label: "OUTPUTS", text: outputSummary, color: ACCENT_GREEN });
  }
  // Collect all activities
  const allActivities = allOutputs.flatMap((o) => Array.isArray(o.activities) ? o.activities as string[] : []);
  if (allActivities.length > 0) {
    const actSummary = allActivities.slice(0, 6).map((a) => truncate(stringify(a), 50)).join(" · ");
    frameworkLevels.push({ label: "ACTIVITIES", text: actSummary, color: ACCENT_ORANGE });
  }

  if (frameworkLevels.length > 0) {
    const levelH = Math.min(1.1, 5.8 / frameworkLevels.length);
    frameworkLevels.forEach((level, i) => {
      const ly = 1.2 + i * (levelH + 0.1);
      // Arrow-like shape
      slide_addFrameworkLevel(s6, 0.5, ly, 12.2, levelH, level.label, level.text, level.color);
      // Down arrow between levels
      if (i < frameworkLevels.length - 1) {
        s6.addText("▼", {
          x: 6.2, y: ly + levelH - 0.05, w: 1, h: 0.2,
          fontSize: 12, color: level.color, align: "center",
        });
      }
    });
  }

  // Key assumptions footer
  s6.addText("Key assumptions: supportive government policy · stable markets · active community participation", {
    x: 0.5, y: 6.6, w: 12.2, h: 0.3,
    fontSize: 9, color: LIGHT_GRAY, fontFace: "Calibri", italic: true,
  });
  addFooter(s6, `${title} | ${country}`);

  // ============================================================
  // SLIDE 7: EXPECTED OUTCOMES
  // ============================================================
  if (outcomes.length > 0) {
    const s7 = pptx.addSlide();
    addSlideHeader(s7, "Expected Outcomes", "Measurable shifts across key dimensions");

    const outcomeH = Math.min(1.3, 5.5 / outcomes.length);
    outcomes.slice(0, 5).forEach((outcome, i) => {
      const oy = 1.3 + i * (outcomeH + 0.15);
      const indicators = Array.isArray(outcome.indicators) ? outcome.indicators as string[] : [];

      // Number badge
      s7.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: 0.5, y: oy, w: 0.5, h: outcomeH, rectRadius: 0.08,
        fill: { color: BLUE },
      });
      s7.addText(String(i + 1), {
        x: 0.5, y: oy, w: 0.5, h: outcomeH,
        fontSize: 18, color: WHITE, fontFace: "Calibri", bold: true,
        align: "center", valign: "middle",
      });

      // Outcome description
      s7.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: 1.1, y: oy, w: 11.6, h: outcomeH, rectRadius: 0.08,
        fill: { color: CARD_BG },
        line: { color: BORDER_COLOR, width: 0.5 },
      });
      const descText = truncate(stringify(outcome.description || ""), 200);
      const indicatorText = indicators.length > 0 ? indicators.slice(0, 3).map((ind) => "● " + truncate(stringify(ind), 100)).join("\n") : "";

      s7.addText([
        { text: `Outcome ${stringify(outcome.id || String(i + 1))}: `, options: { bold: true, fontSize: 11, color: BLUE } },
        { text: descText + "\n", options: { fontSize: 11, color: DARK } },
        ...(indicatorText ? [{ text: indicatorText, options: { fontSize: 9, color: GRAY, italic: true } }] : []),
      ], {
        x: 1.25, y: oy + 0.08, w: 11.3, h: outcomeH - 0.16,
        fontFace: "Calibri", valign: "top",
      });
    });
    addFooter(s7, `${title} | ${country}`);
  }

  // ============================================================
  // SLIDE 8: KEY OUTPUTS
  // ============================================================
  if (outcomes.some((o) => Array.isArray(o.outputs) && o.outputs.length > 0)) {
    const s8 = pptx.addSlide();
    addSlideHeader(s8, "Key Outputs", "Deliverables across all components");

    let yPos = 1.3;
    outcomes.slice(0, 4).forEach((outcome, oi) => {
      const outputs = Array.isArray(outcome.outputs) ? outcome.outputs as Record<string, unknown>[] : [];
      if (outputs.length === 0) return;

      // Component header
      s8.addShape("rect" as PptxGenJS.ShapeType, {
        x: 0.5, y: yPos, w: 0.4, h: 0.3,
        fill: { color: BLUE },
      });
      s8.addText(String(oi + 1), {
        x: 0.5, y: yPos, w: 0.4, h: 0.3,
        fontSize: 11, color: WHITE, fontFace: "Calibri", bold: true,
        align: "center", valign: "middle",
      });
      s8.addText(truncate(stringify(outcome.description || `Component ${oi + 1}`), 100), {
        x: 1.0, y: yPos, w: 11.7, h: 0.3,
        fontSize: 11, color: BLUE, fontFace: "Calibri", bold: true,
        valign: "middle",
      });
      yPos += 0.35;

      outputs.slice(0, 3).forEach((output) => {
        s8.addText("▸  " + truncate(stringify(output.description || ""), 200), {
          x: 1.2, y: yPos, w: 11.5, h: 0.3,
          fontSize: 10, color: DARK, fontFace: "Calibri",
          valign: "top",
        });
        yPos += 0.3;
      });
      yPos += 0.15;
    });
    addFooter(s8, `${title} | ${country}`);
  }

  // ============================================================
  // SLIDE 9: KEY ACTIVITIES
  // ============================================================
  {
    const activities: { text: string; component: string }[] = [];
    outcomes.forEach((o, oi) => {
      const outputs = Array.isArray(o.outputs) ? o.outputs as Record<string, unknown>[] : [];
      outputs.forEach((output) => {
        const acts = Array.isArray(output.activities) ? output.activities as string[] : [];
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
      addFooter(s9, `${title} | ${country}`);
    }
  }

  // ============================================================
  // SLIDE 10: BUDGET PLAN
  // ============================================================
  if (budgetItems.length > 0) {
    const s10 = pptx.addSlide();
    addSlideHeader(s10, "Budget Plan", `${formatCurrency(basicInfo.totalProjectCost, currency)} over ${stringify(basicInfo.projectDuration || "the project period")}`);

    // Visual budget bars
    const maxAmount = Math.max(...budgetItems.map((b) => Number(b.amount) || 0), 1);
    let yPos = 1.3;

    budgetItems.slice(0, 8).forEach((item) => {
      const amount = Number(item.amount) || 0;
      const pct = Number(item.percentage) || 0;
      const barWidth = Math.max(0.5, (amount / maxAmount) * 8);

      // Category label
      s10.addText(stringify(item.category || ""), {
        x: 0.5, y: yPos, w: 3.5, h: 0.35,
        fontSize: 10, color: DARK, fontFace: "Calibri", bold: true,
        align: "right", valign: "middle",
      });

      // Budget bar
      s10.addShape("roundRect" as PptxGenJS.ShapeType, {
        x: 4.2, y: yPos + 0.03, w: barWidth, h: 0.3, rectRadius: 0.05,
        fill: { color: BLUE },
      });

      // Amount + percentage
      s10.addText(`${formatCurrency(amount, currency)}`, {
        x: 4.3, y: yPos, w: barWidth - 0.2, h: 0.35,
        fontSize: 10, color: WHITE, fontFace: "Calibri", bold: true,
        valign: "middle",
      });

      s10.addText(`${pct}%`, {
        x: 4.2 + barWidth + 0.15, y: yPos, w: 1, h: 0.35,
        fontSize: 10, color: BLUE, fontFace: "Calibri", bold: true,
        valign: "middle",
      });

      // Description
      if (item.description) {
        s10.addText(truncate(stringify(item.description), 120), {
          x: 0.5, y: yPos + 0.35, w: 12.2, h: 0.25,
          fontSize: 8, color: LIGHT_GRAY, fontFace: "Calibri", italic: true,
        });
        yPos += 0.7;
      } else {
        yPos += 0.5;
      }
    });

    // Local procurement note
    if (management.localProcurement) {
      s10.addText("● " + truncate(stringify(management.localProcurement), 200), {
        x: 0.5, y: 6.3, w: 12.2, h: 0.4,
        fontSize: 9, color: ACCENT_GREEN, fontFace: "Calibri", italic: true,
      });
    }
    addFooter(s10, `${title} | ${country}`);
  }

  // ============================================================
  // SLIDE 11: IMPLEMENTATION TIMELINE
  // ============================================================
  if (description.timeline) {
    const s11 = pptx.addSlide();
    addSlideHeader(s11, "Implementation Timeline", "Phased approach from set-up to handover");

    const timelineText = stringify(description.timeline);
    const timelineParagraphs = splitIntoParagraphs(timelineText, 400);

    // Try to parse year-based phases
    const yearPattern = /year\s*(\d)/gi;
    const hasYears = yearPattern.test(timelineText);

    if (hasYears) {
      // Display as timeline phases
      const phases = timelineText.split(/(?=Year\s*\d)/i).filter(Boolean);
      const phaseW = Math.min(2.3, 12 / Math.max(phases.length, 1) - 0.2);
      phases.slice(0, 5).forEach((phase, i) => {
        const px = 0.5 + i * (phaseW + 0.2);
        // Phase box
        s11.addShape("roundRect" as PptxGenJS.ShapeType, {
          x: px, y: 1.3, w: phaseW, h: 5.0, rectRadius: 0.1,
          fill: { color: i === 0 ? SECTION_BG : CARD_BG },
          line: { color: BORDER_COLOR, width: 0.75 },
        });
        // Phase header
        s11.addShape("rect" as PptxGenJS.ShapeType, {
          x: px, y: 1.3, w: phaseW, h: 0.5,
          fill: { color: BLUE },
        });
        const yearMatch = phase.match(/Year\s*(\d)/i);
        s11.addText(yearMatch ? `Year ${yearMatch[1]}` : `Phase ${i + 1}`, {
          x: px, y: 1.3, w: phaseW, h: 0.5,
          fontSize: 13, color: WHITE, fontFace: "Calibri", bold: true,
          align: "center", valign: "middle",
        });
        // Phase content
        const phaseContent = phase.replace(/Year\s*\d\s*[:–-]?\s*/i, "").trim();
        s11.addText(truncate(phaseContent, 300), {
          x: px + 0.1, y: 1.9, w: phaseW - 0.2, h: 4.3,
          fontSize: 9, color: DARK, fontFace: "Calibri",
          valign: "top", paraSpaceAfter: 4,
        });
      });
    } else {
      // Fallback: display as text block
      s11.addText(timelineParagraphs.map((p) => ({ text: p + "\n\n", options: { fontSize: 11, color: DARK, fontFace: "Calibri" as const } })), {
        x: 0.5, y: 1.3, w: 12.2, h: 5.5,
        valign: "top",
      });
    }
    addFooter(s11, `${title} | ${country}`);
  }

  // ============================================================
  // SLIDE 12: PERFORMANCE INDICATORS
  // ============================================================
  if (outcomes.length > 0 && outcomes.some((o) => (Array.isArray(o.indicators) ? o.indicators.length : 0) > 0)) {
    const s12 = pptx.addSlide();
    addSlideHeader(s12, "Performance Indicators", "Baseline to target, and how it is verified");

    const indicatorRows: PptxGenJS.TableRow[] = [
      [
        { text: "Outcome", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
        { text: "Indicator", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
      ],
    ];

    outcomes.forEach((outcome) => {
      const indicators = Array.isArray(outcome.indicators) ? outcome.indicators as string[] : [];
      const outName = truncate(stringify(outcome.description || outcome.id || ""), 60);
      indicators.slice(0, 3).forEach((ind, ii) => {
        indicatorRows.push([
          { text: ii === 0 ? outName : "", options: { fontSize: 9, color: DARK, bold: ii === 0, fontFace: "Calibri" as const, fill: { color: ii === 0 ? SECTION_BG : WHITE } } },
          { text: truncate(stringify(ind), 200), options: { fontSize: 9, color: DARK, fontFace: "Calibri" as const } },
        ]);
      });
    });

    s12.addTable(indicatorRows, {
      x: 0.5, y: 1.3, w: 12.2,
      colW: [4.0, 8.2],
      border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
      rowH: 0.4,
      autoPage: true,
    });

    // M&E note
    if (management.meFramework) {
      s12.addText("M&E: " + truncate(stringify(management.meFramework), 250), {
        x: 0.5, y: 6.3, w: 12.2, h: 0.5,
        fontSize: 9, color: ACCENT_TEAL, fontFace: "Calibri", italic: true,
      });
    }
    addFooter(s12, `${title} | ${country}`);
  }

  // ============================================================
  // SLIDE 13: STAKEHOLDERS & IMPLEMENTATION
  // ============================================================
  if (stakeholders.length > 0) {
    const s13 = pptx.addSlide();
    addSlideHeader(s13, "Stakeholders & Implementation", "Who does what");

    // Stakeholder table
    const stRows: PptxGenJS.TableRow[] = [
      [
        { text: "Stakeholder", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
        { text: "Type", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
        { text: "Role & Coordination", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: BLUE }, fontFace: "Calibri" as const } },
      ],
    ];
    stakeholders.slice(0, 8).forEach((st) => {
      const roleText = [stringify(st.role || ""), stringify(st.coordinationMechanism || "")].filter((t) => t !== "-").join(" — ");
      stRows.push([
        { text: stringify(st.name || ""), options: { fontSize: 9, color: DARK, bold: true, fontFace: "Calibri" as const } },
        { text: stringify(st.type || "").replace(/_/g, " "), options: { fontSize: 8, color: GRAY, fontFace: "Calibri" as const } },
        { text: truncate(roleText, 180), options: { fontSize: 9, color: DARK, fontFace: "Calibri" as const } },
      ]);
    });

    const tableH = Math.min(3.5, (stakeholders.length + 1) * 0.4 + 0.1);
    s13.addTable(stRows, {
      x: 0.5, y: 1.3, w: 12.2,
      colW: [3.0, 2.0, 7.2],
      border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
      rowH: 0.38,
    });

    // Management structure & beneficiary participation
    const bottomY = 1.3 + tableH + 0.3;
    const remainingH = 6.5 - bottomY;

    if (management.managementStructure && stakeholderAnalysis.beneficiaryParticipation) {
      const halfW = 5.95;
      addSectionBox(s13, 0.5, bottomY, halfW, Math.min(remainingH, 2.0),
        "Management Structure", truncate(stringify(management.managementStructure), 300), BLUE);
      addSectionBox(s13, 6.75, bottomY, halfW, Math.min(remainingH, 2.0),
        "Beneficiary Participation", truncate(stringify(stakeholderAnalysis.beneficiaryParticipation), 300), ACCENT_GREEN);
    } else if (management.managementStructure) {
      addSectionBox(s13, 0.5, bottomY, 12.2, Math.min(remainingH, 1.8),
        "Management Structure", truncate(stringify(management.managementStructure), 400), BLUE);
    } else if (stakeholderAnalysis.beneficiaryParticipation) {
      addSectionBox(s13, 0.5, bottomY, 12.2, Math.min(remainingH, 1.8),
        "Beneficiary Participation", truncate(stringify(stakeholderAnalysis.beneficiaryParticipation), 400), ACCENT_GREEN);
    }
    addFooter(s13, `${title} | ${country}`);
  }

  // ============================================================
  // SLIDE 14: RISK ANALYSIS
  // ============================================================
  if (risks.length > 0) {
    const s14 = pptx.addSlide();
    addSlideHeader(s14, "Risk Analysis", "Key risks and mitigation strategies");

    // Risk matrix header
    const riskHeaderRow: PptxGenJS.TableRow = [
      { text: "RISK", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const } },
      { text: "IMPACT", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const, align: "center" as const } },
      { text: "LIKELIHOOD", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const, align: "center" as const } },
      { text: "MITIGATION", options: { bold: true, fontSize: 9, color: WHITE, fill: { color: DARK_BLUE }, fontFace: "Calibri" as const } },
    ];

    const riskDataRows: PptxGenJS.TableRow[] = risks.slice(0, 7).map((risk) => {
      const impact = stringify(risk.impact || "").toLowerCase();
      const likelihood = stringify(risk.likelihood || "").toLowerCase();
      return [
        { text: truncate(stringify(risk.description || ""), 150), options: { fontSize: 9, color: DARK, fontFace: "Calibri" as const } },
        { text: impact.charAt(0).toUpperCase() + impact.slice(1), options: { fontSize: 9, color: riskColor(impact), fontFace: "Calibri" as const, bold: true, align: "center" as const } },
        { text: likelihood.charAt(0).toUpperCase() + likelihood.slice(1), options: { fontSize: 9, color: riskColor(likelihood), fontFace: "Calibri" as const, bold: true, align: "center" as const } },
        { text: truncate(stringify(risk.mitigation || ""), 180), options: { fontSize: 9, color: DARK, fontFace: "Calibri" as const } },
      ] as PptxGenJS.TableRow;
    });

    s14.addTable([riskHeaderRow, ...riskDataRows], {
      x: 0.5, y: 1.3, w: 12.2,
      colW: [3.0, 1.2, 1.2, 6.8],
      border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
      rowH: 0.55,
    });
    addFooter(s14, `${title} | ${country}`);
  }

  // ============================================================
  // SLIDE 15: SUSTAINABILITY PLAN
  // ============================================================
  {
    const sustainPillars: { title: string; text: string; color: string }[] = [];
    if (management.sustainabilityPlan) {
      const sustText = stringify(management.sustainabilityPlan);
      // Try to split into sub-pillars
      const chunks = splitIntoParagraphs(sustText, 300);
      if (chunks.length >= 3) {
        sustainPillars.push({ title: "Financial & Economic", text: chunks[0], color: BLUE });
        sustainPillars.push({ title: "Technical & Capacity", text: chunks[1], color: ACCENT_GREEN });
        sustainPillars.push({ title: "Institutional & Social", text: chunks.slice(2).join(" "), color: ACCENT_TEAL });
      } else {
        sustainPillars.push({ title: "Sustainability Plan", text: sustText, color: BLUE });
      }
    }
    if (management.implementationArrangement) {
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
        // Stack
        const boxH = Math.min(1.5, 5.5 / sustainPillars.length);
        sustainPillars.slice(0, 5).forEach((pillar, i) => {
          addSectionBox(s15, 0.5, 1.3 + i * (boxH + 0.15), 12.2, boxH, pillar.title, truncate(pillar.text, 350), pillar.color);
        });
      }
      addFooter(s15, `${title} | ${country}`);
    }
  }

  // ============================================================
  // SLIDE 16: WHY THIS PROJECT + THANK YOU
  // ============================================================
  const sLast = pptx.addSlide();
  sLast.background = { fill: BLUE };

  // Top accent
  sLast.addShape("rect" as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: WHITE },
  });

  sLast.addText("Thank You", {
    x: 0, y: 1.5, w: 13.33, h: 1.2,
    fontSize: 44, color: WHITE, fontFace: "Calibri", bold: true,
    align: "center",
  });
  sLast.addText(title, {
    x: 1, y: 3.0, w: 11.33, h: 0.8,
    fontSize: 18, color: "A0C0FF", fontFace: "Calibri",
    align: "center",
  });

  // Summary line with key facts
  const summaryParts = [
    basicInfo.responsibleMinistry ? stringify(basicInfo.responsibleMinistry) : "",
    country,
    totalCost ? formatCurrency(totalCost, currency) : "",
    basicInfo.projectDuration ? stringify(basicInfo.projectDuration) : "",
  ].filter(Boolean);
  sLast.addText(summaryParts.join("  ·  "), {
    x: 1, y: 4.2, w: 11.33, h: 0.5,
    fontSize: 13, color: "C0D0FF", fontFace: "Calibri",
    align: "center",
  });

  sLast.addText(`Generated: ${new Date().toLocaleDateString()}  |  Prepared with AI-PCP  |  KOICA Standard Format`, {
    x: 1, y: 5.8, w: 11.33, h: 0.5,
    fontSize: 11, color: "7090CC", fontFace: "Calibri", italic: true,
    align: "center",
  });

  return await pptx.write({ outputType: "blob" }) as Blob;
}

// Helper for logical framework level
function slide_addFrameworkLevel(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string, text: string, color: string
) {
  // Label badge
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x, y, w: 1.5, h, rectRadius: 0.08,
    fill: { color },
  });
  slide.addText(label, {
    x, y, w: 1.5, h,
    fontSize: 10, color: WHITE, fontFace: "Calibri", bold: true,
    align: "center", valign: "middle",
  });
  // Content area
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x: x + 1.55, y, w: w - 1.55, h, rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color, width: 1 },
  });
  slide.addText(text, {
    x: x + 1.7, y, w: w - 1.85, h,
    fontSize: 10, color: DARK, fontFace: "Calibri",
    valign: "middle",
  });
}
