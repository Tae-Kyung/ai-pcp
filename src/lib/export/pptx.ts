import PptxGenJS from "pptxgenjs";
import type { Accent, Deck, DeckBlock, DeckSlide } from "@/lib/types/deck";
import { clampToBox, fitFontSize, measureLine, measureText } from "./text-fit";

// === Palette ===
const PRIMARY = "2C5F2D";
const PRIMARY_LIGHT = "97BC62";
const DEEP_GREEN = "17392C";
const DARK = "1F2A24";
const GRAY = "6B7A70";
const LIGHT_GRAY = "8FA394";
const WHITE = "FFFFFF";
const ACCENT_RED = "B85042";
const ACCENT_ORANGE = "D4804E";
const ACCENT_TEAL = "3A7D6E";
const BORDER_COLOR = "C9D6BE";
const CARD_BG = "F5F8F2";

const FONT_TITLE = "Cambria";
const FONT_BODY = "Calibri";

// === Canvas ===
const SLIDE_W = 13.33;
const MARGIN = 0.6;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const HEADER_H = 1.05;
const BODY_TOP = 1.34;
const BODY_BOTTOM = 6.78;
const FOOTER_Y = 6.92;
const BLOCK_GAP = 0.24;

type Box = { x: number; y: number; w: number; h: number };
type Slide = PptxGenJS.Slide;

type Theme = {
  text: string;
  muted: string;
  cardBg: string;
  cardLine: string;
  /** Accents are remapped on dark backgrounds so they stay legible. */
  dark: boolean;
};

const LIGHT_THEME: Theme = {
  text: DARK, muted: GRAY, cardBg: CARD_BG, cardLine: BORDER_COLOR, dark: false,
};
const ON_PRIMARY_THEME: Theme = {
  text: WHITE, muted: BORDER_COLOR, cardBg: DEEP_GREEN, cardLine: DEEP_GREEN, dark: true,
};
const ON_DEEP_THEME: Theme = {
  text: WHITE, muted: BORDER_COLOR, cardBg: PRIMARY, cardLine: PRIMARY, dark: true,
};

const ACCENT_COLORS: Record<Accent, string> = {
  primary: PRIMARY,
  light: PRIMARY_LIGHT,
  teal: ACCENT_TEAL,
  orange: ACCENT_ORANGE,
  red: ACCENT_RED,
  dark: DEEP_GREEN,
};

/** Dark-background substitutes for accents that would disappear. */
const ACCENT_ON_DARK: Partial<Record<Accent, string>> = {
  primary: PRIMARY_LIGHT,
  dark: PRIMARY_LIGHT,
  teal: "6FBFA8",
};

function accentColor(accent: Accent | null | undefined, theme: Theme): string {
  const key = (accent ?? "primary") as Accent;
  const base = ACCENT_COLORS[key] ?? PRIMARY;
  return theme.dark ? ACCENT_ON_DARK[key] ?? base : base;
}

/** Accent rotation for parallel items the author left unstyled. */
const ACCENT_CYCLE: Accent[] = ["primary", "light", "teal", "orange"];

const rect = "rect" as PptxGenJS.ShapeType;
const roundRect = "roundRect" as PptxGenJS.ShapeType;
const ellipse = "ellipse" as PptxGenJS.ShapeType;

// === Text helper ===
type FitOpts = {
  max: number;
  min?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  fontFace?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  charSpacing?: number;
};

/**
 * Draw text at the largest size that fits `box`, trimming only if the author
 * overran the budget by so much that even the minimum size overflows.
 */
function addFitted(slide: Slide, box: Box, text: string, o: FitOpts): void {
  const body = (text ?? "").trim();
  if (!body) return;
  const fontFace = o.fontFace ?? FONT_BODY;
  const style = { bold: o.bold, fontFace, charSpacing: o.charSpacing };
  const fontSize = fitFontSize(body, box.w, box.h, { ...style, max: o.max, min: o.min ?? 8.5 });
  const shown = clampToBox(body, box.w, box.h, { ...style, fontSize });

  slide.addText(shown, {
    x: box.x, y: box.y, w: box.w, h: box.h,
    fontSize,
    bold: o.bold,
    italic: o.italic,
    color: o.color ?? DARK,
    fontFace,
    align: o.align ?? "left",
    valign: o.valign ?? "top",
    charSpacing: o.charSpacing,
    margin: 0,
  });
}

// ============================================================
// Block measurement — natural height in inches at a given width
// ============================================================
function measureBlock(block: DeckBlock, w: number): number {
  switch (block.kind) {
    case "stats":
      return 1.34;

    case "lead": {
      const inner = w - 0.62;
      const labelH = block.label ? 0.3 : 0;
      return Math.max(1.0, labelH + measureText(block.text, inner, { fontSize: 13 }) + 0.4);
    }

    case "bullets": {
      const cols = block.columns === 2 ? 2 : 1;
      const colW = (w - (cols - 1) * 0.5) / cols;
      const textW = colW - 0.34;
      const perCol = Math.ceil(block.items.length / cols);
      let tallest = 0;
      for (let c = 0; c < cols; c++) {
        const slice = block.items.slice(c * perCol, (c + 1) * perCol);
        const h = slice.reduce(
          (sum, item) => sum + measureText(item, textW, { fontSize: 12.5 }) + 0.18,
          0
        );
        tallest = Math.max(tallest, h);
      }
      return tallest;
    }

    case "cards": {
      const { cols, rows } = cardGrid(block.cards.length);
      const cardW = (w - (cols - 1) * 0.28) / cols;
      const inner = cardW - 0.5;
      let total = 0;
      for (let r = 0; r < rows; r++) {
        const slice = block.cards.slice(r * cols, (r + 1) * cols);
        const rowH = slice.reduce((max, card) => {
          const titleH = measureText(card.title, inner, { fontSize: 13.5, bold: true, fontFace: FONT_TITLE });
          const bodyH = measureText(card.body, inner, { fontSize: 11.5 });
          return Math.max(max, titleH + bodyH + 0.46);
        }, 0);
        total += rowH + (r < rows - 1 ? 0.24 : 0);
      }
      return total;
    }

    case "numbered": {
      const textW = w - 0.66;
      return block.items.reduce((sum, item) => {
        const titleH = measureText(item.title, textW, { fontSize: 13.5, bold: true });
        const bodyH = measureText(item.body, textW, { fontSize: 11.5 });
        return sum + Math.max(0.52, titleH + bodyH + 0.08) + 0.2;
      }, 0);
    }

    case "chain": {
      const textW = w - CHAIN_LABEL_W - 0.5;
      return block.levels.reduce((sum, level, i) => {
        const h = Math.max(0.62, measureText(level.text, textW, { fontSize: 11.5 }) + 0.26);
        return sum + h + (i < block.levels.length - 1 ? CHAIN_ARROW_H : 0);
      }, 0);
    }

    case "table": {
      const colW = tableColWidths(block.columns, w);
      const headerH = Math.max(
        0.36,
        block.columns.reduce(
          (max, col, i) =>
            Math.max(max, measureText(col.header, colW[i] - 0.2, { fontSize: 10.5, bold: true })),
          0
        ) + 0.16
      );
      const rowsH = block.rows.reduce((sum, row) => {
        const h = row.cells.reduce(
          (max, cell, i) => Math.max(max, measureText(cell, (colW[i] ?? 1) - 0.2, { fontSize: 10.5 })),
          0
        );
        return sum + Math.max(0.34, h + 0.16);
      }, 0);
      return headerH + rowsH;
    }

    case "bars":
      return block.items.reduce(
        (sum, item) =>
          sum + 0.46 + (item.note ? measureText(item.note, w - 0.4, { fontSize: 9.5 }) + 0.04 : 0),
        0
      );

    case "timeline": {
      const n = Math.min(block.phases.length, 5) || 1;
      const colW = (w - (n - 1) * 0.22) / n;
      const inner = colW - 0.34;
      const tallest = block.phases.slice(0, 5).reduce((max, phase) => {
        const h = phase.items.reduce(
          (sum, item) => sum + measureText(item, inner - 0.16, { fontSize: 10.5 }) + 0.16,
          0
        );
        return Math.max(max, h);
      }, 0);
      return 0.56 + tallest + 0.3;
    }

    default:
      return 0;
  }
}

const CHAIN_LABEL_W = 1.7;
const CHAIN_ARROW_H = 0.2;

function cardGrid(n: number): { cols: number; rows: number } {
  if (n <= 2) return { cols: Math.max(n, 1), rows: 1 };
  if (n === 3) return { cols: 3, rows: 1 };
  if (n === 4) return { cols: 2, rows: 2 };
  return { cols: 3, rows: Math.ceil(n / 3) };
}

function tableColWidths(columns: { width: number }[], w: number): number[] {
  const weights = columns.map((c) => (Number(c.width) > 0 ? Number(c.width) : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((weight) => (w * weight) / total);
}

/** Blocks that look wrong when stretched beyond their natural height. */
function isFixedHeight(kind: DeckBlock["kind"]): boolean {
  return kind === "stats" || kind === "lead";
}

// ============================================================
// Block rendering
// ============================================================
function renderBlock(slide: Slide, block: DeckBlock, box: Box, theme: Theme): void {
  switch (block.kind) {
    case "stats": return renderStats(slide, block, box, theme);
    case "lead": return renderLead(slide, block, box, theme);
    case "bullets": return renderBullets(slide, block, box, theme);
    case "cards": return renderCards(slide, block, box, theme);
    case "numbered": return renderNumbered(slide, block, box, theme);
    case "chain": return renderChain(slide, block, box, theme);
    case "table": return renderTable(slide, block, box, theme);
    case "bars": return renderBars(slide, block, box, theme);
    case "timeline": return renderTimeline(slide, block, box, theme);
  }
}

function renderStats(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "stats" }>,
  box: Box,
  theme: Theme
): void {
  const stats = block.stats.slice(0, 4);
  if (stats.length === 0) return;

  const gap = 0.26;
  const cardW = (box.w - gap * (stats.length - 1)) / stats.length;
  const cardH = Math.min(box.h, 1.34);

  stats.forEach((stat, i) => {
    const x = box.x + i * (cardW + gap);
    slide.addShape(roundRect, {
      x, y: box.y, w: cardW, h: cardH, rectRadius: 0.1,
      fill: { color: theme.cardBg },
      line: theme.dark ? undefined : { color: theme.cardLine, width: 0.75 },
    });
    addFitted(
      slide,
      { x: x + 0.14, y: box.y + 0.13, w: cardW - 0.28, h: cardH * 0.48 },
      stat.value,
      {
        max: 24, min: 11, bold: true, fontFace: FONT_TITLE,
        color: theme.dark ? WHITE : PRIMARY,
        align: "center", valign: "bottom",
      }
    );
    addFitted(
      slide,
      { x: x + 0.14, y: box.y + cardH * 0.63, w: cardW - 0.28, h: cardH * 0.31 },
      stat.label,
      { max: 11, min: 8, color: theme.muted, align: "center", valign: "top" }
    );
  });
}

function renderLead(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "lead" }>,
  box: Box,
  theme: Theme
): void {
  const color = accentColor(block.accent, theme);
  slide.addShape(rect, { x: box.x, y: box.y, w: 0.07, h: box.h, fill: { color } });
  slide.addShape(roundRect, {
    x: box.x + 0.07, y: box.y, w: box.w - 0.07, h: box.h, rectRadius: 0.05,
    fill: { color: theme.cardBg },
    line: theme.dark ? undefined : { color: theme.cardLine, width: 0.5 },
  });

  const inner = { x: box.x + 0.28, y: box.y + 0.16, w: box.w - 0.56, h: box.h - 0.32 };
  if (block.label) {
    addFitted(slide, { ...inner, h: 0.26 }, block.label.toUpperCase(), {
      max: 10.5, min: 8.5, bold: true, color, charSpacing: 1,
    });
    inner.y += 0.32;
    inner.h -= 0.32;
  }
  addFitted(slide, inner, block.text, { max: 13, min: 9.5, color: theme.text });
}

function renderBullets(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "bullets" }>,
  box: Box,
  theme: Theme
): void {
  const cols = block.columns === 2 ? 2 : 1;
  const colW = (box.w - (cols - 1) * 0.5) / cols;
  const textW = colW - 0.34;
  const perCol = Math.ceil(block.items.length / cols);

  for (let c = 0; c < cols; c++) {
    const slice = block.items.slice(c * perCol, (c + 1) * perCol);
    const colX = box.x + c * (colW + 0.5);
    let y = box.y;
    for (const item of slice) {
      const h = measureText(item, textW, { fontSize: 12.5 });
      if (y + h > box.y + box.h) break;
      slide.addShape(ellipse, {
        x: colX + 0.04, y: y + 0.09, w: 0.1, h: 0.1,
        fill: { color: accentColor("light", theme) },
      });
      addFitted(slide, { x: colX + 0.34, y, w: textW, h }, item, {
        max: 12.5, min: 9.5, color: theme.text,
      });
      y += h + 0.18;
    }
  }
}

function renderCards(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "cards" }>,
  box: Box,
  theme: Theme
): void {
  const cards = block.cards.slice(0, 6);
  const { cols, rows } = cardGrid(cards.length);
  const gap = 0.28;
  const cardW = (box.w - (cols - 1) * gap) / cols;
  const cardH = (box.h - (rows - 1) * 0.24) / rows;

  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = box.x + col * (cardW + gap);
    const y = box.y + row * (cardH + 0.24);
    const color = accentColor(card.accent ?? ACCENT_CYCLE[i % ACCENT_CYCLE.length], theme);

    slide.addShape(rect, { x, y, w: 0.07, h: cardH, fill: { color } });
    slide.addShape(roundRect, {
      x: x + 0.07, y, w: cardW - 0.07, h: cardH, rectRadius: 0.05,
      fill: { color: theme.cardBg },
      line: theme.dark ? undefined : { color: theme.cardLine, width: 0.5 },
    });

    const inner = cardW - 0.5;
    const titleH = Math.min(
      cardH - 0.4,
      measureText(card.title, inner, { fontSize: 13.5, bold: true, fontFace: FONT_TITLE })
    );
    addFitted(slide, { x: x + 0.28, y: y + 0.16, w: inner, h: titleH }, card.title, {
      max: 13.5, min: 10, bold: true, fontFace: FONT_TITLE, color,
    });
    addFitted(
      slide,
      { x: x + 0.28, y: y + 0.2 + titleH, w: inner, h: cardH - titleH - 0.36 },
      card.body,
      { max: 11.5, min: 8.5, color: theme.text }
    );
  });
}

function renderNumbered(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "numbered" }>,
  box: Box,
  theme: Theme
): void {
  const textW = box.w - 0.66;
  const gap = 0.2;
  const natural = block.items.map((item) => {
    const titleH = measureText(item.title, textW, { fontSize: 13.5, bold: true });
    const bodyH = measureText(item.body, textW, { fontSize: 11.5 });
    return Math.max(0.52, titleH + bodyH + 0.08);
  });
  const total = natural.reduce((a, b) => a + b, 0) + gap * (block.items.length - 1);
  const scale = total > box.h ? box.h / total : 1;
  const slack = total < box.h ? (box.h - total) / Math.max(block.items.length, 1) : 0;

  let y = box.y;
  block.items.forEach((item, i) => {
    const h = natural[i] * scale + slack;
    const color = accentColor(ACCENT_CYCLE[i % ACCENT_CYCLE.length], theme);
    slide.addShape(ellipse, {
      x: box.x, y: y + 0.04, w: 0.42, h: 0.42, fill: { color },
    });
    slide.addText(String(i + 1), {
      x: box.x, y: y + 0.04, w: 0.42, h: 0.42,
      fontSize: 12, color: WHITE, fontFace: FONT_TITLE, bold: true,
      align: "center", valign: "middle", margin: 0,
    });

    const titleH = Math.min(h * 0.55, measureText(item.title, textW, { fontSize: 13.5, bold: true }));
    addFitted(slide, { x: box.x + 0.66, y, w: textW, h: titleH }, item.title, {
      max: 13.5, min: 10, bold: true, color: theme.dark ? WHITE : theme.text,
    });
    addFitted(
      slide,
      { x: box.x + 0.66, y: y + titleH + 0.04, w: textW, h: h - titleH - 0.04 },
      item.body,
      { max: 11.5, min: 8.5, color: theme.muted }
    );
    y += h + gap;
  });
}

function renderChain(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "chain" }>,
  box: Box,
  theme: Theme
): void {
  const textW = box.w - CHAIN_LABEL_W - 0.5;
  const natural = block.levels.map((level) =>
    Math.max(0.62, measureText(level.text, textW, { fontSize: 11.5 }) + 0.26)
  );
  const arrows = CHAIN_ARROW_H * Math.max(block.levels.length - 1, 0);
  const total = natural.reduce((a, b) => a + b, 0) + arrows;
  const scale = total > box.h ? (box.h - arrows) / (total - arrows) : 1;
  const slack = total < box.h ? (box.h - total) / Math.max(block.levels.length, 1) : 0;

  let y = box.y;
  block.levels.forEach((level, i) => {
    const h = natural[i] * scale + slack;
    const color = accentColor(level.accent ?? ACCENT_CYCLE[i % ACCENT_CYCLE.length], theme);

    slide.addShape(roundRect, {
      x: box.x, y, w: CHAIN_LABEL_W, h, rectRadius: 0.08, fill: { color },
    });
    addFitted(
      slide,
      { x: box.x + 0.08, y, w: CHAIN_LABEL_W - 0.16, h },
      level.label.toUpperCase(),
      { max: 12, min: 8, bold: true, fontFace: FONT_TITLE, color: WHITE, align: "center", valign: "middle" }
    );
    slide.addShape(roundRect, {
      x: box.x + CHAIN_LABEL_W + 0.16, y, w: box.w - CHAIN_LABEL_W - 0.16, h, rectRadius: 0.08,
      fill: { color: theme.cardBg },
      line: { color, width: 1 },
    });
    addFitted(
      slide,
      { x: box.x + CHAIN_LABEL_W + 0.32, y: y + 0.1, w: textW, h: h - 0.2 },
      level.text,
      { max: 11.5, min: 8.5, color: theme.text, valign: "middle" }
    );

    y += h;
    if (i < block.levels.length - 1) {
      slide.addText("▼", {
        x: box.x + box.w / 2 - 0.3, y: y - 0.04, w: 0.6, h: CHAIN_ARROW_H,
        fontSize: 11, color, align: "center", valign: "middle", margin: 0,
      });
      y += CHAIN_ARROW_H;
    }
  });
}

function renderTable(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "table" }>,
  box: Box,
  theme: Theme
): void {
  const colW = tableColWidths(block.columns, box.w);
  const headerFill = theme.dark ? DEEP_GREEN : PRIMARY;

  const headerRow: PptxGenJS.TableRow = block.columns.map((col) => ({
    text: col.header.toUpperCase(),
    options: {
      bold: true, fontSize: 10.5, color: WHITE, fill: { color: headerFill },
      fontFace: FONT_BODY, align: col.align ?? "left", valign: "middle" as const,
    },
  }));

  const bodyRows: PptxGenJS.TableRow[] = block.rows.map((row) =>
    block.columns.map((col, i) => {
      const accent = row.accents?.[i];
      return {
        text: clampToBox(row.cells[i] ?? "", colW[i] - 0.2, 1.6, { fontSize: 10.5 }),
        options: {
          fontSize: 10.5,
          color: accent ? accentColor(accent, LIGHT_THEME) : theme.text,
          bold: Boolean(accent),
          fontFace: FONT_BODY,
          align: col.align ?? "left",
          valign: "top" as const,
        },
      };
    })
  );

  const headerH = Math.max(
    0.36,
    block.columns.reduce(
      (max, col, i) => Math.max(max, measureText(col.header, colW[i] - 0.2, { fontSize: 10.5, bold: true })),
      0
    ) + 0.16
  );
  const rowH = block.rows.map((row) =>
    Math.max(
      0.34,
      row.cells.reduce(
        (max, cell, i) => Math.max(max, measureText(cell, (colW[i] ?? 1) - 0.2, { fontSize: 10.5 })),
        0
      ) + 0.16
    )
  );

  slide.addTable([headerRow, ...bodyRows], {
    x: box.x, y: box.y, w: box.w,
    colW,
    rowH: [headerH, ...rowH],
    border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
    margin: 0.08,
    autoPage: false,
  });
}

function renderBars(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "bars" }>,
  box: Box,
  theme: Theme
): void {
  const items = block.items.slice(0, 8);
  if (items.length === 0) return;

  const labelW = Math.min(3.3, box.w * 0.28);
  const pctW = 0.8;
  const barGap = 0.18;
  const trackW = box.w - labelW - barGap - pctW - 0.2;
  const maxValue = Math.max(...items.map((it) => Number(it.value) || 0), 1);
  const sum = items.reduce((total, it) => total + (Number(it.value) || 0), 0);

  let y = box.y;
  for (const item of items) {
    const value = Number(item.value) || 0;
    const barW = Math.max(0.24, (value / maxValue) * trackW);
    const barX = box.x + labelW + barGap;

    addFitted(slide, { x: box.x, y: y + 0.02, w: labelW - 0.14, h: 0.34 }, item.label, {
      max: 10.5, min: 8, bold: true, color: theme.text, align: "right", valign: "middle",
    });

    slide.addShape(roundRect, {
      x: barX, y: y + 0.05, w: barW, h: 0.3, rectRadius: 0.04,
      fill: { color: accentColor("primary", theme) },
    });

    // Keep the figure inside the bar only when it genuinely fits; otherwise it
    // would be white-on-white just past the bar's edge.
    const insideStyle = { fontSize: 10, bold: true, fontFace: FONT_BODY };
    const fitsInside = measureLine(item.display, insideStyle) + 0.22 <= barW;
    if (fitsInside) {
      slide.addText(item.display, {
        x: barX + 0.11, y: y + 0.05, w: barW - 0.22, h: 0.3,
        fontSize: 10, bold: true, color: WHITE, fontFace: FONT_BODY,
        valign: "middle", margin: 0,
      });
    } else {
      slide.addText(item.display, {
        x: barX + barW + 0.08, y: y + 0.05, w: 1.1, h: 0.3,
        fontSize: 10, bold: true, color: theme.text, fontFace: FONT_BODY,
        valign: "middle", margin: 0,
      });
    }

    // Percentage sits in a fixed right-hand gutter, never pushed off-slide by a
    // long bar.
    if (sum > 0) {
      slide.addText(`${Math.round((value / sum) * 100)}%`, {
        x: box.x + box.w - pctW, y: y + 0.05, w: pctW, h: 0.3,
        fontSize: 10, bold: true, color: accentColor("primary", theme), fontFace: FONT_BODY,
        align: "right", valign: "middle", margin: 0,
      });
    }

    y += 0.46;
    if (item.note) {
      const noteH = measureText(item.note, box.w - 0.4, { fontSize: 9.5 });
      addFitted(slide, { x: box.x + labelW + barGap, y: y - 0.06, w: box.w - labelW - barGap, h: noteH }, item.note, {
        max: 9.5, min: 8, italic: true, color: theme.muted,
      });
      y += noteH + 0.04;
    }
    if (y > box.y + box.h) break;
  }
}

function renderTimeline(
  slide: Slide,
  block: Extract<DeckBlock, { kind: "timeline" }>,
  box: Box,
  theme: Theme
): void {
  const phases = block.phases.slice(0, 5);
  if (phases.length === 0) return;

  const gap = 0.22;
  const colW = (box.w - gap * (phases.length - 1)) / phases.length;
  const headerH = 0.54;

  phases.forEach((phase, i) => {
    const x = box.x + i * (colW + gap);
    const color = accentColor(ACCENT_CYCLE[i % ACCENT_CYCLE.length], theme);

    slide.addShape(roundRect, {
      x, y: box.y, w: colW, h: box.h, rectRadius: 0.09,
      fill: { color: theme.cardBg },
      line: theme.dark ? undefined : { color: theme.cardLine, width: 0.75 },
    });
    slide.addShape(rect, { x, y: box.y, w: colW, h: headerH, fill: { color } });
    addFitted(slide, { x: x + 0.1, y: box.y, w: colW - 0.2, h: headerH }, phase.label, {
      max: 13, min: 9, bold: true, fontFace: FONT_TITLE, color: WHITE,
      align: "center", valign: "middle",
    });

    const inner = colW - 0.34;
    let y = box.y + headerH + 0.16;
    const limit = box.y + box.h - 0.1;
    for (const item of phase.items) {
      const h = measureText(item, inner - 0.16, { fontSize: 10.5 });
      if (y + h > limit) break;
      slide.addShape(ellipse, {
        x: x + 0.17, y: y + 0.08, w: 0.08, h: 0.08, fill: { color },
      });
      addFitted(slide, { x: x + 0.33, y, w: inner - 0.16, h }, item, {
        max: 10.5, min: 8, color: theme.text,
      });
      y += h + 0.16;
    }
  });
}

// ============================================================
// Slide chrome
// ============================================================
function addSlideHeader(slide: Slide, title: string, subtitle?: string): void {
  slide.addShape(rect, { x: 0, y: 0, w: SLIDE_W, h: HEADER_H, fill: { color: PRIMARY } });
  slide.addShape(rect, { x: 0, y: HEADER_H - 0.03, w: SLIDE_W, h: 0.03, fill: { color: PRIMARY_LIGHT } });

  const hasSubtitle = Boolean(subtitle?.trim());
  addFitted(
    slide,
    { x: MARGIN, y: hasSubtitle ? 0.14 : 0.3, w: CONTENT_W - 0.4, h: hasSubtitle ? 0.5 : 0.48 },
    title.toUpperCase(),
    { max: 25, min: 14, bold: true, fontFace: FONT_TITLE, color: WHITE, valign: "middle" }
  );
  if (hasSubtitle) {
    addFitted(slide, { x: MARGIN, y: 0.65, w: CONTENT_W - 0.4, h: 0.3 }, subtitle!, {
      max: 13.5, min: 9.5, color: BORDER_COLOR, valign: "middle" }
    );
  }
}

function addFooter(slide: Slide, text: string): void {
  slide.addText(text, {
    x: MARGIN, y: FOOTER_Y, w: CONTENT_W, h: 0.3,
    fontSize: 9.5, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
    align: "right", valign: "middle", margin: 0,
  });
}

/**
 * Place blocks down the body area. Fixed-height blocks keep their natural size;
 * the remaining space goes to blocks that read well when stretched.
 */
function layoutBlocks(slide: Slide, blocks: DeckBlock[], area: Box, theme: Theme): void {
  if (blocks.length === 0) return;

  const gaps = BLOCK_GAP * (blocks.length - 1);
  const available = area.h - gaps;
  const natural = blocks.map((b) => measureBlock(b, area.w));
  const total = natural.reduce((a, b) => a + b, 0);

  let heights: number[];
  if (total > available) {
    heights = natural.map((n) => (n / total) * available);
  } else {
    const growable = blocks
      .map((b, i) => (isFixedHeight(b.kind) ? -1 : i))
      .filter((i) => i >= 0);
    const slack = available - total;
    heights = natural.slice();
    if (growable.length > 0) {
      const share = slack / growable.length;
      for (const i of growable) heights[i] += share;
    }
  }

  let y = area.y;
  blocks.forEach((block, i) => {
    renderBlock(slide, block, { x: area.x, y, w: area.w, h: heights[i] }, theme);
    y += heights[i] + BLOCK_GAP;
  });
}

function renderCover(pptx: PptxGenJS, slide: DeckSlide, footer: string): void {
  const s = pptx.addSlide();
  s.background = { fill: PRIMARY };
  s.addShape(rect, { x: 0, y: 0, w: SLIDE_W, h: 0.06, fill: { color: PRIMARY_LIGHT } });

  addFitted(
    s,
    { x: MARGIN, y: 0.85, w: CONTENT_W, h: 0.4 },
    "PROJECT CONCEPT PAPER  ·  KOICA STANDARD FORMAT",
    { max: 14, min: 10, bold: true, color: BORDER_COLOR, charSpacing: 2.5, valign: "middle" }
  );
  addFitted(s, { x: MARGIN, y: 1.45, w: CONTENT_W, h: 1.85 }, slide.title, {
    max: 34, min: 18, bold: true, fontFace: FONT_TITLE, color: WHITE, valign: "top",
  });
  if (slide.subtitle) {
    addFitted(s, { x: MARGIN, y: 3.45, w: CONTENT_W, h: 0.7 }, slide.subtitle, {
      max: 15, min: 11, color: BORDER_COLOR, valign: "top",
    });
  }

  const stats = slide.blocks.find((b) => b.kind === "stats");
  if (stats) {
    renderBlock(s, stats, { x: MARGIN, y: 4.4, w: CONTENT_W, h: 1.34 }, ON_PRIMARY_THEME);
  }

  s.addText(footer, {
    x: MARGIN, y: 6.45, w: CONTENT_W, h: 0.4,
    fontSize: 11.5, color: LIGHT_GRAY, fontFace: FONT_BODY, valign: "middle", margin: 0,
  });
  if (slide.notes) s.addNotes(slide.notes);
}

function renderStatement(pptx: PptxGenJS, slide: DeckSlide, footer: string): void {
  const s = pptx.addSlide();
  s.background = { fill: DEEP_GREEN };
  s.addShape(rect, { x: 0, y: 0, w: SLIDE_W, h: 0.06, fill: { color: PRIMARY_LIGHT } });

  addFitted(s, { x: MARGIN, y: 0.65, w: CONTENT_W, h: 0.8 }, slide.title.toUpperCase(), {
    max: 30, min: 18, bold: true, fontFace: FONT_TITLE, color: WHITE,
    align: "center", valign: "middle",
  });
  let top = 1.6;
  if (slide.subtitle) {
    addFitted(s, { x: 1.2, y: 1.5, w: SLIDE_W - 2.4, h: 0.5 }, slide.subtitle, {
      max: 13.5, min: 10, italic: true, color: BORDER_COLOR, align: "center", valign: "middle",
    });
    top = 2.2;
  }

  layoutBlocks(
    s,
    slide.blocks,
    { x: 1.2, y: top, w: SLIDE_W - 2.4, h: 6.3 - top },
    ON_DEEP_THEME
  );

  s.addText(footer, {
    x: MARGIN, y: 6.5, w: CONTENT_W, h: 0.4,
    fontSize: 11, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
    align: "center", valign: "middle", margin: 0,
  });
  if (slide.notes) s.addNotes(slide.notes);
}

function renderClosing(pptx: PptxGenJS, slide: DeckSlide, footer: string): void {
  const s = pptx.addSlide();
  s.background = { fill: PRIMARY };
  s.addShape(rect, { x: 0, y: 0, w: SLIDE_W, h: 0.06, fill: { color: PRIMARY_LIGHT } });

  addFitted(s, { x: MARGIN, y: 1.6, w: CONTENT_W, h: 1.2 }, slide.title, {
    max: 44, min: 24, bold: true, fontFace: FONT_TITLE, color: WHITE,
    align: "center", valign: "middle",
  });
  if (slide.subtitle) {
    addFitted(s, { x: 1.0, y: 3.1, w: SLIDE_W - 2.0, h: 0.9 }, slide.subtitle, {
      max: 18, min: 12, color: BORDER_COLOR, align: "center", valign: "top",
    });
  }
  s.addText(footer, {
    x: 1.0, y: 4.5, w: SLIDE_W - 2.0, h: 0.5,
    fontSize: 13, color: BORDER_COLOR, fontFace: FONT_BODY,
    align: "center", valign: "middle", margin: 0,
  });
  s.addText("Prepared with AI-PCP  |  KOICA Standard Format", {
    x: 1.0, y: 5.9, w: SLIDE_W - 2.0, h: 0.4,
    fontSize: 11, color: LIGHT_GRAY, fontFace: FONT_BODY, italic: true,
    align: "center", valign: "middle", margin: 0,
  });
  if (slide.notes) s.addNotes(slide.notes);
}

function renderContent(pptx: PptxGenJS, slide: DeckSlide, footer: string): void {
  const s = pptx.addSlide();
  addSlideHeader(s, slide.title, slide.subtitle);
  layoutBlocks(
    s,
    slide.blocks,
    { x: MARGIN, y: BODY_TOP, w: CONTENT_W, h: BODY_BOTTOM - BODY_TOP },
    LIGHT_THEME
  );
  addFooter(s, footer);
  if (slide.notes) s.addNotes(slide.notes);
}

export type DeckMeta = { title: string; country: string; sector: string };

/** Build the presentation without serialising it — the seam used by tests. */
export function buildPptx(deck: Deck, meta: DeckMeta): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "AI-PCP";
  pptx.title = meta.title;

  const footer = `${meta.title} | ${meta.country}`;

  for (const slide of deck.slides) {
    switch (slide.kind) {
      case "cover": renderCover(pptx, slide, `${sectorLabel(meta.sector)}  |  ${meta.country}`); break;
      case "statement": renderStatement(pptx, slide, footer); break;
      case "closing": renderClosing(pptx, slide, footer); break;
      default: renderContent(pptx, slide, footer);
    }
  }
  return pptx;
}

export async function generatePptx(deck: Deck, meta: DeckMeta): Promise<Blob> {
  return (await buildPptx(deck, meta).write({ outputType: "blob" })) as Blob;
}

function sectorLabel(sector: string): string {
  return sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
