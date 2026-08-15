import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildPptx } from "./pptx";
import { clampToBox, fitFontSize, measureText, wrapText } from "./text-fit";
import type { Deck } from "@/lib/types/deck";

const META = { title: "Strengthening Rural Health Systems", country: "Cambodia", sector: "health" };
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const EMU = 914400;

/** A deck whose every block is overrun well past its documented budget. */
const OVERRUN_DECK: Deck = {
  slides: [
    {
      kind: "cover",
      title: "Strengthening Maternal and Child Healthcare System in Rural Cambodia Across Three Provinces",
      subtitle: "A four-year investment in facilities, workforce and communities",
      blocks: [
        {
          kind: "stats",
          stats: [
            { value: "150,000 women of reproductive age (15-49) and 80,000 children under five", label: "Direct beneficiaries across the three target provinces and surrounding districts" },
            { value: "USD 12.0M", label: "Total cost" },
            { value: "4 years", label: "Duration" },
            { value: "78", label: "Health centres upgraded" },
          ],
        },
      ],
      notes: "Cover notes.",
    },
    {
      kind: "content",
      title: "Problem Analysis With An Unreasonably Long Title That Should Still Fit The Header Band",
      subtitle: "Core problem and root causes, described at a length no subtitle should reach",
      blocks: [
        {
          kind: "lead",
          label: "CORE PROBLEM",
          text: "Rural Cambodia's maternal mortality ratio of 160 per 100,000 live births is three times Vietnam's. ".repeat(6),
        },
        {
          kind: "numbered",
          items: Array.from({ length: 6 }, (_, i) => ({
            title: `Root cause number ${i + 1} with a long heading`,
            body: "Facilities lack equipment, staff lack competency, and communities lack awareness. ".repeat(4),
          })),
        },
      ],
    },
    {
      kind: "content",
      title: "Budget Plan",
      blocks: [
        {
          kind: "bars",
          items: [
            { label: "Infrastructure and Equipment", value: 4800000, display: "USD 4.8M" },
            { label: "Capacity Building", value: 2400000, display: "USD 2.4M", note: "Training for 465 health workers across three provinces." },
            { label: "Community Health Programs", value: 1700000, display: "USD 1.7M" },
            { label: "Medicine and Supplies", value: 1200000, display: "USD 1.2M" },
            { label: "Project Management", value: 960000, display: "USD 960K" },
            { label: "Monitoring and Evaluation", value: 600000, display: "USD 600K" },
            { label: "Sustainability and Knowledge Management", value: 360000, display: "USD 360K" },
          ],
        },
      ],
    },
    {
      kind: "content",
      title: "Performance Indicators",
      blocks: [
        {
          kind: "table",
          columns: [
            { header: "Indicator", width: 4 },
            { header: "Baseline", width: 1, align: "center" },
            { header: "Target", width: 1, align: "center" },
            { header: "Means of verification", width: 3 },
          ],
          rows: Array.from({ length: 8 }, (_, i) => ({
            cells: [
              `Indicator ${i + 1} described at considerable length so that the cell has to wrap onto several lines`,
              "28%",
              "75%",
              "Health facility assessment conducted annually by the Provincial Health Department",
            ],
            accents: [null, "orange", "light", null],
          })),
        },
      ],
    },
    {
      kind: "content",
      title: "Sustainability",
      blocks: [
        {
          kind: "cards",
          cards: Array.from({ length: 6 }, (_, i) => ({
            title: `Pillar ${i + 1} with a title that runs long`,
            body: "Government commits to maintaining operational costs post-project, including staff incentives and facility maintenance. ".repeat(3),
          })),
        },
      ],
    },
    {
      kind: "content",
      title: "Implementation Timeline",
      blocks: [
        {
          kind: "timeline",
          phases: Array.from({ length: 4 }, (_, i) => ({
            label: `Year ${i + 1} (202${7 + i})`,
            items: Array.from({ length: 5 }, (_, j) => `Milestone ${j + 1} for this phase, described at some length.`),
          })),
        },
      ],
    },
    {
      kind: "content",
      title: "Results Chain",
      blocks: [
        {
          kind: "chain",
          levels: [
            { label: "GOAL", text: "Improved health and well-being of women and children in rural Cambodia. ".repeat(3) },
            { label: "PURPOSE", text: "Strengthened maternal-child healthcare system in target provinces." },
            { label: "OUTCOMES", text: "Quality services available; competent workforce; increased utilisation." },
            { label: "OUTPUTS", text: "78 facilities upgraded; 465 workers trained; 450 village groups active." },
            { label: "ACTIVITIES", text: "Renovate, equip, train, mentor, mobilise communities." },
          ],
        },
      ],
    },
    {
      kind: "content",
      title: "Key Activities",
      blocks: [{ kind: "bullets", columns: 2, items: Array.from({ length: 8 }, (_, i) => `Activity ${i + 1} described at a length that exceeds the two-column budget by a fair margin.`) }],
    },
    {
      kind: "statement",
      title: "Why This Project",
      subtitle: "Three reasons the committee should fund it",
      blocks: [
        {
          kind: "numbered",
          items: Array.from({ length: 3 }, (_, i) => ({
            title: `Reason ${i + 1}`,
            body: "Anchored in the KOICA Country Partnership Strategy and the National Health Strategic Plan. ".repeat(2),
          })),
        },
      ],
    },
    { kind: "closing", title: "Thank You", subtitle: META.title, blocks: [] },
  ],
};

type Shape = { x: number; y: number; w: number; h: number; pt: number; text: string };

function parseShapes(xml: string): Shape[] {
  const shapes: Shape[] = [];
  for (const match of xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)) {
    const sp = match[0];
    const off = sp.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/);
    const ext = sp.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    const text = [...sp.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((m) => m[1])
      .join("")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'").replace(/&quot;/g, '"');
    if (!off || !ext || !text.trim()) continue;
    const sz = sp.match(/sz="(\d+)"/);
    shapes.push({
      x: +off[1] / EMU, y: +off[2] / EMU,
      w: +ext[1] / EMU, h: +ext[2] / EMU,
      pt: sz ? +sz[1] / 100 : 18,
      text,
    });
  }
  return shapes;
}

async function renderSlides(deck: Deck): Promise<{ name: string; shapes: Shape[]; xml: string }[]> {
  const buffer = (await buildPptx(deck, META).write({ outputType: "nodebuffer" })) as Buffer;
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  const out = [];
  for (const name of names) {
    const xml = await zip.file(name)!.async("string");
    out.push({ name, shapes: parseShapes(xml), xml });
  }
  return out;
}

describe("text-fit", () => {
  it("wraps on word boundaries and never exceeds the box width", () => {
    const style = { fontSize: 12 };
    const lines = wrapText("The quick brown fox jumps over the lazy dog near the river bank", 2, style);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureText(line, 99, style)).toBeLessThanOrEqual(2.001);
    }
  });

  it("splits a single word that is wider than the box", () => {
    const lines = wrapText("Supercalifragilisticexpialidocious", 0.4, { fontSize: 14 });
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe("Supercalifragilisticexpialidocious");
  });

  it("fitFontSize returns a size whose rendered text fits", () => {
    const text = "Strengthening Maternal and Child Healthcare System in Rural Cambodia";
    const size = fitFontSize(text, 4, 1, { max: 32, min: 8 });
    expect(size).toBeLessThan(32);
    expect(measureText(text, 4, { fontSize: size })).toBeLessThanOrEqual(1);
  });

  it("clampToBox trims on a word boundary and fits", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve";
    const style = { fontSize: 12 };
    const out = clampToBox(text, 1.5, 0.4, style);
    expect(out.endsWith("…")).toBe(true);
    // Whole words only — the old renderer cut mid-word.
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(measureText(out, 1.5, style)).toBeLessThanOrEqual(0.4);
  });
});

describe("pptx renderer", () => {
  it("renders one slide per deck entry", async () => {
    const slides = await renderSlides(OVERRUN_DECK);
    expect(slides).toHaveLength(OVERRUN_DECK.slides.length);
  });

  it("keeps every shape inside the slide canvas", async () => {
    const slides = await renderSlides(OVERRUN_DECK);
    const escapes: string[] = [];
    for (const { name, shapes } of slides) {
      for (const s of shapes) {
        if (s.x < -0.01 || s.y < -0.01 || s.x + s.w > SLIDE_W + 0.01 || s.y + s.h > SLIDE_H + 0.01) {
          escapes.push(`${name} [${s.x.toFixed(2)},${s.y.toFixed(2)} ${s.w.toFixed(2)}x${s.h.toFixed(2)}] "${s.text.slice(0, 40)}"`);
        }
      }
    }
    expect(escapes).toEqual([]);
  });

  it("fits every text run inside its own shape", async () => {
    const slides = await renderSlides(OVERRUN_DECK);
    const overflows: string[] = [];
    for (const { name, shapes } of slides) {
      for (const s of shapes) {
        // 0.04" tolerance absorbs rounding in the EMU round-trip.
        const needed = measureText(s.text, s.w, { fontSize: s.pt });
        if (needed > s.h + 0.04) {
          overflows.push(`${name} ${s.pt}pt needs ${needed.toFixed(2)}" in ${s.h.toFixed(2)}" — "${s.text.slice(0, 50)}"`);
        }
      }
    }
    expect(overflows).toEqual([]);
  });

  it("never leaves an empty or placeholder-looking run on a slide", async () => {
    const slides = await renderSlides(OVERRUN_DECK);
    for (const { name, shapes } of slides) {
      for (const s of shapes) {
        expect(s.text.trim(), `${name}: blank run`).not.toBe("");
        // "; ; " and "1 · 2 · 3" were the signature of dropped source fields.
        expect(s.text.replace(/[\s;·,]/g, ""), `${name}: separator-only run "${s.text}"`).not.toBe("");
      }
    }
  });

  it("writes speaker notes when the author supplied them", async () => {
    const buffer = (await buildPptx(OVERRUN_DECK, META).write({ outputType: "nodebuffer" })) as Buffer;
    const zip = await JSZip.loadAsync(buffer);
    const notes = await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string");
    expect(notes).toContain("Cover notes.");
  });

  it("puts a bar's figure outside the bar when it cannot fit inside", async () => {
    const slides = await renderSlides(OVERRUN_DECK);
    const budget = slides.find((s) => s.shapes.some((sh) => sh.text === "USD 360K"));
    expect(budget).toBeDefined();
    const label = budget!.shapes.find((sh) => sh.text === "USD 360K")!;
    // The smallest bar is ~0.24" wide; the label must not be drawn on top of it.
    expect(label.w).toBeGreaterThan(0.5);
  });
});
