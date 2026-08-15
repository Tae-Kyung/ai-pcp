/**
 * Recover a JSON object from a model response that may be wrapped in prose or
 * markdown fences, or contain trailing commas / stray control characters.
 */
export function extractJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found");

  let jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
  try { return JSON.parse(jsonStr); } catch { /* try repairs */ }

  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(jsonStr); } catch { /* try repairs */ }

  jsonStr = jsonStr.replace(/[\x00-\x1f\x7f]/g, (ch) =>
    ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
  );
  return JSON.parse(jsonStr);
}
