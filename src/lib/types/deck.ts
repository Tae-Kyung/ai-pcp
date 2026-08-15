/**
 * Slide deck plan.
 *
 * Claude authors this structure from a PCP document; `src/lib/export/pptx.ts`
 * renders it. The renderer owns all geometry, so the author only decides what
 * goes on each slide and how it is grouped.
 */

export type Accent = "primary" | "light" | "teal" | "orange" | "red" | "dark";

export type Stat = {
  /** Short figure, e.g. "USD 12.0M". Long sentences do not belong here. */
  value: string;
  label: string;
};

export type DeckBlock =
  /** Row of headline figures. */
  | { kind: "stats"; stats: Stat[] }
  /** Single emphasised paragraph, optionally with a small label above it. */
  | { kind: "lead"; label?: string; text: string; accent?: Accent }
  /** Flat bullet list. */
  | { kind: "bullets"; items: string[]; columns?: 1 | 2 }
  /** Titled boxes laid out in a grid. */
  | { kind: "cards"; cards: { title: string; body: string; accent?: Accent }[] }
  /** Ordered list where each entry has a heading and a short body. */
  | { kind: "numbered"; items: { title: string; body: string }[] }
  /** Vertical results chain (goal → purpose → outcomes → outputs). */
  | { kind: "chain"; levels: { label: string; text: string; accent?: Accent }[] }
  /** Data table. Column `width` values are relative weights. */
  | {
      kind: "table";
      columns: { header: string; width: number; align?: "left" | "center" }[];
      rows: { cells: string[]; accents?: (Accent | null)[] }[];
    }
  /** Horizontal bar chart, e.g. budget breakdown. */
  | { kind: "bars"; items: { label: string; value: number; display: string; note?: string }[] }
  /** Phase columns across the slide. */
  | { kind: "timeline"; phases: { label: string; items: string[] }[] };

export type DeckSlide = {
  kind: "cover" | "content" | "statement" | "closing";
  title: string;
  subtitle?: string;
  blocks: DeckBlock[];
  /** Speaker notes. Rendered into the notes pane, never onto the slide. */
  notes?: string;
};

export type Deck = {
  slides: DeckSlide[];
};

/** Accent applied when the author omits one. */
export const DEFAULT_ACCENT: Accent = "primary";

export function isDeck(value: unknown): value is Deck {
  if (!value || typeof value !== "object") return false;
  const slides = (value as Deck).slides;
  return Array.isArray(slides) && slides.length > 0 && slides.every(isDeckSlide);
}

function isDeckSlide(value: unknown): value is DeckSlide {
  if (!value || typeof value !== "object") return false;
  const slide = value as DeckSlide;
  return (
    typeof slide.title === "string" &&
    ["cover", "content", "statement", "closing"].includes(slide.kind) &&
    Array.isArray(slide.blocks)
  );
}
