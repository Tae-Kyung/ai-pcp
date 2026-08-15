/**
 * Text measurement for PPTX layout.
 *
 * PowerPoint's own autofit (`fit: "shrink"`) only applies once a user edits the
 * shape, so it cannot be relied on at export time. Instead we measure text up
 * front with approximate font metrics and pick a size that provably fits.
 */

/** Calibri advance widths in em units, keyed by character. */
const CALIBRI: Record<string, number> = {
  " ": 0.226, "!": 0.303, '"': 0.418, "#": 0.498, $: 0.498, "%": 0.712,
  "&": 0.606, "'": 0.239, "(": 0.303, ")": 0.303, "*": 0.42, "+": 0.498,
  ",": 0.25, "-": 0.306, ".": 0.252, "/": 0.386,
  ":": 0.268, ";": 0.268, "<": 0.498, "=": 0.498, ">": 0.498, "?": 0.463,
  "@": 0.894, "[": 0.303, "\\": 0.386, "]": 0.303, "^": 0.498, _: 0.498, "`": 0.5,
  "{": 0.314, "|": 0.23, "}": 0.314, "~": 0.498,
  A: 0.579, B: 0.544, C: 0.533, D: 0.615, E: 0.488, F: 0.459, G: 0.631,
  H: 0.623, I: 0.252, J: 0.319, K: 0.52, L: 0.42, M: 0.855, N: 0.646,
  O: 0.662, P: 0.517, Q: 0.673, R: 0.543, S: 0.459, T: 0.487, U: 0.642,
  V: 0.567, W: 0.89, X: 0.519, Y: 0.487, Z: 0.468,
  a: 0.479, b: 0.525, c: 0.423, d: 0.525, e: 0.498, f: 0.305, g: 0.471,
  h: 0.525, i: 0.229, j: 0.239, k: 0.455, l: 0.229, m: 0.799, n: 0.525,
  o: 0.527, p: 0.525, q: 0.525, r: 0.349, s: 0.391, t: 0.335, u: 0.525,
  v: 0.452, w: 0.715, x: 0.433, y: 0.453, z: 0.395,
};
const DIGIT = 0.507;
const FALLBACK = 0.52;

/** Cambria runs wider than Calibri at the same point size. */
const CAMBRIA_FACTOR = 1.06;
/** Bold adds a little tracking. */
const BOLD_FACTOR = 1.03;
/** PowerPoint single line spacing. */
const LINE_HEIGHT = 1.22;

export type TextStyle = {
  fontSize: number;
  bold?: boolean;
  fontFace?: string;
  /** Extra per-character spacing in points (pptxgenjs `charSpacing`). */
  charSpacing?: number;
};

function charWidth(ch: string): number {
  if (ch >= "0" && ch <= "9") return DIGIT;
  return CALIBRI[ch] ?? FALLBACK;
}

/** Width of a single line in inches. */
export function measureLine(text: string, style: TextStyle): number {
  const { fontSize, bold, fontFace, charSpacing = 0 } = style;
  let em = 0;
  for (const ch of text) em += charWidth(ch);
  if (fontFace && fontFace !== "Calibri") em *= CAMBRIA_FACTOR;
  if (bold) em *= BOLD_FACTOR;
  const tracking = (charSpacing * text.length) / 72;
  return (em * fontSize) / 72 + tracking;
}

/** Greedy word wrap. Honours existing newlines and breaks over-long words. */
export function wrapText(text: string, widthIn: number, style: TextStyle): string[] {
  if (!text) return [];
  const out: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureLine(candidate, style) <= widthIn || !line) {
        // A single word wider than the box still has to start somewhere; it is
        // hard-split below on the next iteration.
        if (measureLine(candidate, style) > widthIn && !line) {
          out.push(...hardSplit(word, widthIn, style));
          line = out.pop() ?? "";
          continue;
        }
        line = candidate;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function hardSplit(word: string, widthIn: number, style: TextStyle): string[] {
  const parts: string[] = [];
  let chunk = "";
  for (const ch of word) {
    if (chunk && measureLine(chunk + ch, style) > widthIn) {
      parts.push(chunk);
      chunk = ch;
    } else {
      chunk += ch;
    }
  }
  if (chunk) parts.push(chunk);
  return parts;
}

/** Rendered height in inches for `text` laid out in a box `widthIn` wide. */
export function measureText(text: string, widthIn: number, style: TextStyle): number {
  const lines = wrapText(text, widthIn, style);
  return (lines.length * style.fontSize * LINE_HEIGHT) / 72;
}

export function lineCount(text: string, widthIn: number, style: TextStyle): number {
  return wrapText(text, widthIn, style).length;
}

/** Height in inches occupied by `n` lines at `fontSize`. */
export function linesHeight(n: number, fontSize: number): number {
  return (n * fontSize * LINE_HEIGHT) / 72;
}

/**
 * Largest font size in `[min, max]` at which `text` fits inside the box.
 * Returns `min` when nothing fits — pair with `clampToBox` in that case.
 */
export function fitFontSize(
  text: string,
  widthIn: number,
  heightIn: number,
  opts: {
    max: number;
    min?: number;
    bold?: boolean;
    fontFace?: string;
    charSpacing?: number;
    step?: number;
  }
): number {
  const { max, min = 8, bold, fontFace, charSpacing, step = 0.5 } = opts;
  for (let size = max; size >= min; size -= step) {
    if (measureText(text, widthIn, { fontSize: size, bold, fontFace, charSpacing }) <= heightIn) {
      return size;
    }
  }
  return min;
}

/**
 * Trim `text` on a word boundary so it fits the box, appending an ellipsis.
 * Only a safety net — the deck author is expected to write to length.
 */
export function clampToBox(
  text: string,
  widthIn: number,
  heightIn: number,
  style: TextStyle
): string {
  if (measureText(text, widthIn, style) <= heightIn) return text;

  const maxLines = Math.max(1, Math.floor(heightIn / linesHeight(1, style.fontSize)));
  const words = text.split(/\s+/).filter(Boolean);

  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = words.slice(0, mid).join(" ") + "…";
    if (wrapText(candidate, widthIn, style).length <= maxLines) lo = mid;
    else hi = mid - 1;
  }
  if (lo === 0) return "…";
  return words.slice(0, lo).join(" ").replace(/[,;:.]$/, "") + "…";
}
