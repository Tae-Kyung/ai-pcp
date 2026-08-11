import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
} from "docx";

const SECTION_TITLES: Record<string, string> = {
  basicInfo: "1. Basic Project Information",
  rationale: "2. Project Rationale",
  description: "3. Project Description",
  stakeholderAnalysis: "4. Stakeholder Analysis",
  management: "5. Project Management & Implementation",
};

const FIELD_LABELS: Record<string, string> = {
  projectTitle: "Project Title",
  requestingCountry: "Requesting Country",
  implementingAgency: "Implementing Agency",
  responsibleMinistry: "Responsible Ministry",
  projectLocation: "Project Location",
  projectDuration: "Project Duration",
  totalProjectCost: "Total Project Cost",
  currency: "Currency",
  targetBeneficiaries: "Target Beneficiaries",
  projectObjectives: "Project Objectives",
  sector: "Sector",
  sdgsAlignment: "SDGs Alignment",
  countryContext: "Country Context",
  sectorContext: "Sector Context",
  problemAnalysis: "Problem Analysis",
  needsAssessment: "Needs Assessment",
  nationalPlanAlignment: "National Plan Alignment",
  cpsAlignment: "CPS Alignment",
  similarProjects: "Similar Projects",
  genderAnalysis: "Gender Analysis",
  overallGoal: "Overall Goal",
  projectPurpose: "Project Purpose",
  expectedOutcomes: "Expected Outcomes",
  budgetPlan: "Budget Plan",
  timeline: "Timeline",
  stakeholders: "Stakeholders",
  beneficiaryParticipation: "Beneficiary Participation",
  implementationArrangement: "Implementation Arrangement",
  managementStructure: "Management Structure",
  meFramework: "M&E Framework",
  risks: "Risks",
  sustainabilityPlan: "Sustainability Plan",
  localProcurement: "Local Procurement",
};

function getLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function renderValueToParagraphs(value: unknown, level: number = 0): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (value === null || value === undefined) return paragraphs;

  if (typeof value === "string") {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: value, size: 22 })],
        spacing: { after: 120 },
        indent: { left: level * 360 },
      })
    );
    return paragraphs;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: String(value), size: 22 })],
        spacing: { after: 120 },
        indent: { left: level * 360 },
      })
    );
    return paragraphs;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" || typeof item === "number") {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${String(item)}`, size: 22 })],
            spacing: { after: 60 },
            indent: { left: level * 360 },
          })
        );
      } else {
        paragraphs.push(...renderValueToParagraphs(item, level));
        paragraphs.push(new Paragraph({ spacing: { after: 80 } }));
      }
    }
    return paragraphs;
  }

  if (typeof value === "object") {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Field label
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: getLabel(key), bold: true, size: 22, color: "333333" })],
          spacing: { before: 120, after: 40 },
          indent: { left: level * 360 },
        })
      );
      paragraphs.push(...renderValueToParagraphs(val, level + 1));
    }
    return paragraphs;
  }

  return paragraphs;
}

export async function generateDocx(
  content: Record<string, unknown>,
  title: string,
  country: string,
  sector: string
): Promise<Blob> {
  const sections: Paragraph[] = [];

  // Title page
  sections.push(
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      children: [new TextRun({ text: "PROJECT CONCEPT PAPER", bold: true, size: 36, color: "1a56db" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${country} | ${sector}`, size: 24, color: "666666" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, size: 20, color: "999999" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Prepared with AI-PCP (KOICA Standard Format)", size: 20, italics: true, color: "999999" })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ spacing: { after: 400 } }),
    // Divider
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1a56db" } },
      spacing: { after: 400 },
    })
  );

  // Table of contents style section headers
  const sectionKeys = ["basicInfo", "rationale", "description", "stakeholderAnalysis", "management"];
  for (const key of sectionKeys) {
    const sectionTitle = SECTION_TITLES[key];
    const sectionData = content[key];

    // Section heading
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: sectionTitle, bold: true, size: 28, color: "1a56db" })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "1a56db" } },
      })
    );

    if (sectionData) {
      sections.push(...renderValueToParagraphs(sectionData, 0));
    } else {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "(No content)", italics: true, color: "999999", size: 22 })],
          spacing: { after: 200 },
        })
      );
    }

    sections.push(new Paragraph({ spacing: { after: 200 } }));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: sections,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
