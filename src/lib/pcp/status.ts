import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A generation run cannot outlive the serverless function that started it. When
 * Vercel kills the function mid-stream, the route's error handler never runs and
 * the row is left at "generating" forever — so anything older than the function
 * budget is dead, not in flight.
 */
export const GENERATION_TIMEOUT_MS = 6 * 60 * 1000;

export type ProjectStatusRow = {
  id: string;
  status: string;
  updated_at: string;
};

export function isStaleGenerating(project: ProjectStatusRow, now = Date.now()): boolean {
  if (project.status !== "generating") return false;
  const startedAt = Date.parse(project.updated_at);
  if (Number.isNaN(startedAt)) return true;
  return now - startedAt > GENERATION_TIMEOUT_MS;
}

/**
 * Reset abandoned "generating" rows so the UI stops claiming work is in
 * progress. Returns the statuses to display, keyed by project id.
 */
export async function reconcileStaleGenerating<T extends ProjectStatusRow>(
  db: SupabaseClient,
  projects: T[]
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>(projects.map((p) => [p.id, p.status]));
  const stale = projects.filter((p) => isStaleGenerating(p));
  if (stale.length === 0) return resolved;

  // Projects that did produce a document finished; only the final status write
  // was lost. Everything else has nothing to show and goes back to draft.
  const { data: docs } = await db
    .from("pcp_documents")
    .select("project_id")
    .in("project_id", stale.map((p) => p.id));
  const withDocument = new Set((docs ?? []).map((d) => d.project_id as string));

  for (const status of ["generated", "draft"] as const) {
    const ids = stale
      .filter((p) => (status === "generated") === withDocument.has(p.id))
      .map((p) => p.id);
    if (ids.length === 0) continue;
    const { error } = await db.from("pcp_projects").update({ status }).in("id", ids);
    if (error) {
      console.warn("[PCP Status] Failed to clear stale generating rows:", error.message);
      continue;
    }
    for (const id of ids) resolved.set(id, status);
  }

  return resolved;
}
