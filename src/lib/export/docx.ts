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
  ShadingType,
  VerticalAlign,
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
  description: "Description",
  likelihood: "Likelihood",
  impact: "Impact",
  mitigation: "Mitigation",
  name: "Name",
  type: "Type",
  role: "Role",
  coordinationMechanism: "Coordination",
  category: "Category",
  amount: "Amount",
  percentage: "%",
  id: "ID",
  indicators: "Indicators",
  outputs: "Outputs",
  activities: "Activities",
  direct: "Direct",
  indirect: "Indirect",
  totalCount: "Total Count",
};

function getLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
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
      .map(([k, v]) => `${getLabel(k)}: ${stringify(v)}`)
      .join("\n");
  }
  return String(value);
}

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
} as const;

const HEADER_SHADING = { type: ShadingType.SOLID, color: "1a56db", fill: "1a56db" } as const;
const ALT_SHADING = { type: ShadingType.SOLID, color: "F5F7FA", fill: "F5F7FA" } as const;

function makeHeaderCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 20, color: "FFFFFF", font: "Calibri" })],
      spacing: { before: 40, after: 40 },
    })],
    borders: BORDER,
    shading: HEADER_SHADING,
    verticalAlign: VerticalAlign.CENTER,
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function makeCell(text: string, bold = false, shading?: typeof ALT_SHADING): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, bold, font: "Calibri" })],
      spacing: { before: 40, after: 40 },
    })],
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    ...(shading ? { shading } : {}),
  });
}

// Key-value table (for basicInfo-like flat objects)
function makeKeyValueTable(data: Record<string, unknown>): Table {
  const rows: TableRow[] = [];
  let idx = 0;
  for (const [key, value] of Object.entries(data)) {
    // Skip deeply nested objects - render them separately
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Flatten one level for nested objects like targetBeneficiaries
      for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
        const shading = idx % 2 === 1 ? ALT_SHADING : undefined;
        rows.push(new TableRow({
          children: [
            makeCell(`${getLabel(key)} - ${getLabel(subKey)}`, true, shading),
            makeCell(stringify(subVal), false, shading),
          ],
        }));
        idx++;
      }
      continue;
    }
    const shading = idx % 2 === 1 ? ALT_SHADING : undefined;
    rows.push(new TableRow({
      children: [
        makeCell(getLabel(key), true, shading),
        makeCell(stringify(value), false, shading),
      ],
    }));
    idx++;
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Check if an array of objects has consistent keys (suitable for a columnar table)
function isTabularArray(arr: unknown[]): arr is Record<string, unknown>[] {
  if (arr.length === 0) return false;
  return arr.every((item) => typeof item === "object" && item !== null && !Array.isArray(item));
}

// Columnar table for arrays of objects
function makeColumnarTable(arr: Record<string, unknown>[]): Table {
  // Collect all keys across all items
  const allKeys = new Set<string>();
  for (const item of arr) {
    for (const key of Object.keys(item)) allKeys.add(key);
  }
  const keys = Array.from(allKeys);

  // Header row
  const headerRow = new TableRow({
    children: keys.map((key) => makeHeaderCell(getLabel(key))),
  });

  // Data rows
  const dataRows = arr.map((item, idx) => {
    const shading = idx % 2 === 1 ? ALT_SHADING : undefined;
    return new TableRow({
      children: keys.map((key) => makeCell(stringify(item[key]), false, shading)),
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Budget-specific table with fixed column order and total row
function makeBudgetTable(arr: Record<string, unknown>[]): Table {
  const hasDesc = arr.some((item) => item.description);
  const headerCols = [
    makeHeaderCell("Category", 30),
    makeHeaderCell("Amount (USD)", 20),
    makeHeaderCell("%", 10),
  ];
  if (hasDesc) headerCols.push(makeHeaderCell("Description", 40));

  const headerRow = new TableRow({ children: headerCols });

  const dataRows = arr.map((item, idx) => {
    const shading = idx % 2 === 1 ? ALT_SHADING : undefined;
    const amount = Number(item.amount) || 0;
    const pct = Number(item.percentage) || 0;
    const cols = [
      makeCell(stringify(item.category || ""), true, shading),
      makeCell(amount.toLocaleString(), false, shading),
      makeCell(`${pct}%`, false, shading),
    ];
    if (hasDesc) cols.push(makeCell(stringify(item.description || "-"), false, shading));
    return new TableRow({ children: cols });
  });

  // Total row
  const totalAmount = arr.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalCols = [
    makeCell("Total", true, ALT_SHADING),
    makeCell(totalAmount.toLocaleString(), true, ALT_SHADING),
    makeCell("100%", true, ALT_SHADING),
  ];
  if (hasDesc) totalCols.push(makeCell("", false, ALT_SHADING));
  const totalRow = new TableRow({ children: totalCols });

  return new Table({
    rows: [headerRow, ...dataRows, totalRow],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Sections that should use key-value table format
const KEY_VALUE_SECTIONS = new Set(["basicInfo"]);

// Fields within sections that are arrays of objects (should be columnar tables)
// These are auto-detected, but we can hint for known fields
const KNOWN_TABLE_FIELDS = new Set([
  "budgetPlan", "risks", "stakeholders", "expectedOutcomes",
  "outputs", "activities", "indicators",
]);

type DocChild = Paragraph | Table;

function renderSection(key: string, data: unknown): DocChild[] {
  const elements: DocChild[] = [];

  if (data === null || data === undefined) {
    elements.push(new Paragraph({
      children: [new TextRun({ text: "(No content)", italics: true, color: "999999", size: 22 })],
    }));
    return elements;
  }

  // Key-value table for basicInfo
  if (KEY_VALUE_SECTIONS.has(key) && typeof data === "object" && !Array.isArray(data)) {
    elements.push(makeKeyValueTable(data as Record<string, unknown>));
    return elements;
  }

  // For other sections, render field by field
  if (typeof data === "object" && !Array.isArray(data)) {
    for (const [fieldKey, fieldVal] of Object.entries(data as Record<string, unknown>)) {
      // Sub-heading
      elements.push(new Paragraph({
        children: [new TextRun({ text: getLabel(fieldKey), bold: true, size: 24, color: "333333" })],
        spacing: { before: 200, after: 80 },
      }));

      elements.push(...renderValue(fieldVal, fieldKey));
    }
    return elements;
  }

  elements.push(...renderValue(data, key));
  return elements;
}

function renderValue(value: unknown, fieldKey: string = ""): DocChild[] {
  const elements: DocChild[] = [];

  if (value === null || value === undefined) return elements;

  if (typeof value === "string") {
    // Split long text into paragraphs
    const paras = value.split("\n").filter((p) => p.trim());
    for (const para of paras) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: para, size: 22 })],
        spacing: { after: 100 },
      }));
    }
    return elements;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    elements.push(new Paragraph({
      children: [new TextRun({ text: String(value), size: 22 })],
      spacing: { after: 100 },
    }));
    return elements;
  }

  if (Array.isArray(value)) {
    // Array of simple values → bullet list
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      for (const item of value) {
        elements.push(new Paragraph({
          children: [new TextRun({ text: `• ${String(item)}`, size: 22 })],
          spacing: { after: 40 },
          indent: { left: 360 },
        }));
      }
      return elements;
    }

    // Array of objects → columnar table
    if (isTabularArray(value)) {
      // Budget Plan: use specialized table with fixed column order
      if (fieldKey === "budgetPlan" && value.every((item) => "category" in item && "amount" in item)) {
        elements.push(makeBudgetTable(value));
      } else {
        elements.push(makeColumnarTable(value));
      }
      elements.push(new Paragraph({ spacing: { after: 120 } }));
      return elements;
    }

    // Mixed array
    for (const item of value) {
      elements.push(...renderValue(item));
    }
    return elements;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    // Small flat object → key-value table
    const isFlat = entries.every(([, v]) =>
      typeof v === "string" || typeof v === "number" || typeof v === "boolean" ||
      (Array.isArray(v) && v.every((i) => typeof i === "string" || typeof i === "number"))
    );

    if (isFlat && entries.length >= 2) {
      elements.push(makeKeyValueTable(value as Record<string, unknown>));
      elements.push(new Paragraph({ spacing: { after: 120 } }));
      return elements;
    }

    // Complex object → render each field
    for (const [key, val] of entries) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: getLabel(key), bold: true, size: 22, color: "555555" })],
        spacing: { before: 80, after: 40 },
      }));
      elements.push(...renderValue(val, key));
    }
    return elements;
  }

  return elements;
}

export async function generateDocx(
  content: Record<string, unknown>,
  title: string,
  country: string,
  sector: string
): Promise<Blob> {
  const children: DocChild[] = [];

  // Title page
  children.push(
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
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1a56db" } },
      spacing: { after: 400 },
    })
  );

  // Sections
  const sectionKeys = ["basicInfo", "rationale", "description", "stakeholderAnalysis", "management"];
  for (const key of sectionKeys) {
    const sectionTitle = SECTION_TITLES[key];
    const sectionData = content[key];

    children.push(
      new Paragraph({
        children: [new TextRun({ text: sectionTitle, bold: true, size: 28, color: "1a56db" })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "1a56db" } },
      })
    );

    children.push(...renderSection(key, sectionData));
    children.push(new Paragraph({ spacing: { after: 200 } }));
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
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
