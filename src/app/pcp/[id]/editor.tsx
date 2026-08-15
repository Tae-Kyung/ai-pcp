"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateDocx } from "@/lib/export/docx";
import { generatePptx } from "@/lib/export/pptx";
import type { Deck } from "@/lib/types/deck";

interface Project {
  id: string;
  title: string;
  country: string;
  sector: string;
  status: string;
  /** The wizard answers that produced this project; absent on older rows. */
  input?: Record<string, unknown> | null;
}

interface Document {
  id: string;
  version: number;
  content: Record<string, unknown>;
  review?: ReviewResult | null;
  created_at: string;
}

interface DimensionScore {
  score: number;
  feedback: string;
  details: string[];
}

interface ReviewImprovement {
  section: string;
  suggestion: string;
}

interface ReviewResult {
  dimensions: Record<string, DimensionScore>;
  improvements: (ReviewImprovement | string)[];
  strengths: string[];
}

const DIMENSION_LABELS: Record<string, { label: string; weight: string; icon: string }> = {
  structure: { label: "Structure Compliance", weight: "15%", icon: "📋" },
  logic: { label: "Logical Consistency", weight: "20%", icon: "🔗" },
  sdgsAlignment: { label: "SDGs Alignment", weight: "10%", icon: "🌍" },
  relevance: { label: "Relevance", weight: "15%", icon: "🎯" },
  resultsFramework: { label: "Results Framework", weight: "15%", icon: "📊" },
  riskSustainability: { label: "Risk & Sustainability", weight: "10%", icon: "🛡" },
  writingQuality: { label: "Writing Quality", weight: "10%", icon: "✍" },
  budget: { label: "Budget", weight: "5%", icon: "💰" },
};

const SECTION_TITLES: Record<string, string> = {
  basicInfo: "1. Basic Project Information",
  rationale: "2. Project Rationale",
  description: "3. Project Description",
  stakeholderAnalysis: "4. Stakeholder Analysis",
  management: "5. Project Management & Implementation",
};

export function PCPEditor({ project, document }: { project: Project; document: Document | null }) {
  const router = useRouter();
  const [content, setContent] = useState(document?.content ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("basicInfo");
  const [deleting, setDeleting] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [buildingDeck, setBuildingDeck] = useState(false);
  const [deckStatus, setDeckStatus] = useState("");
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiRefining, setAiRefining] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenStatus, setRegenStatus] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewStreamText, setReviewStreamText] = useState("");
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(document?.review ?? null);
  const [showReview, setShowReview] = useState(!!document?.review);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingPath && editRef.current) {
      editRef.current.focus();
      // Auto-resize
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [editingPath]);

  function getNestedValue(obj: unknown, path: string[]): unknown {
    let current = obj;
    for (const key of path) {
      if (current && typeof current === "object" && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[key];
      } else if (Array.isArray(current)) {
        current = current[Number(key)];
      } else {
        return undefined;
      }
    }
    return current;
  }

  function setNestedValue(obj: unknown, path: string[], value: unknown): unknown {
    if (path.length === 0) return value;
    const [head, ...rest] = path;
    if (Array.isArray(obj)) {
      const arr = [...obj];
      arr[Number(head)] = setNestedValue(arr[Number(head)], rest, value);
      return arr;
    }
    const record = { ...(obj as Record<string, unknown>) };
    record[head] = setNestedValue(record[head], rest, value);
    return record;
  }

  function startEdit(path: string, value: string) {
    setEditingPath(path);
    setEditValue(value);
  }

  function saveEdit() {
    if (!editingPath) return;
    const pathParts = editingPath.split(".");
    const section = pathParts[0];
    const fieldPath = pathParts.slice(1);

    // Try to preserve number type
    let newValue: unknown = editValue;
    const num = Number(editValue);
    if (editValue.trim() !== "" && !isNaN(num) && String(num) === editValue.trim()) {
      newValue = num;
    }

    const sectionData = content[section];
    const updatedSection = setNestedValue(sectionData, fieldPath, newValue);
    setContent({ ...content, [section]: updatedSection });
    setEditingPath(null);
  }

  function cancelEdit() {
    setEditingPath(null);
    setEditValue("");
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/pcp/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filePrefix = project.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");

  async function handleDownloadWord() {
    try {
      const blob = await generateDocx(content, project.title, project.country, project.sector);
      downloadBlob(blob, `${filePrefix}_PCP.docx`);
    } catch (e) {
      console.error("Failed to generate Word file:", e);
    }
  }

  /** Claude authors the slide plan server-side; the renderer only draws it. */
  async function fetchDeck(refresh: boolean): Promise<Deck> {
    const res = await fetch(`/api/pcp/${project.id}/deck${refresh ? "?refresh=1" : ""}`, {
      method: "POST",
    });
    if (!res.ok || !res.body) {
      const message = await res.json().catch(() => ({}));
      throw new Error(message.error ?? "Failed to start deck generation");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ") && eventType) {
          const payload = JSON.parse(line.slice(6));
          if (eventType === "status") setDeckStatus(payload.message);
          if (eventType === "done") return payload.deck as Deck;
          if (eventType === "error") throw new Error(payload.error);
          eventType = "";
        }
      }
    }
    throw new Error("Deck generation timed out. Please try again.");
  }

  async function handleDownloadPptx(refresh = false) {
    if (buildingDeck) return;
    setBuildingDeck(true);
    setDeckStatus("Connecting...");
    try {
      const deck = await fetchDeck(refresh);
      setDeckStatus("Rendering slides...");
      const blob = await generatePptx(deck, {
        title: project.title,
        country: project.country,
        sector: project.sector,
      });
      downloadBlob(blob, `${filePrefix}_PCP.pptx`);
    } catch (e) {
      console.error("Failed to generate PowerPoint file:", e);
      alert("Failed to generate PowerPoint file: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBuildingDeck(false);
      setDeckStatus("");
    }
  }

  async function handleAiRefine() {
    if (!aiPrompt.trim() || aiRefining) return;
    setAiRefining(true);
    setAiStatus("Connecting...");

    try {
      const res = await fetch("/api/pcp/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: activeSection,
          sectionData: content[activeSection],
          prompt: aiPrompt,
          fullDocument: content,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAiStatus(`Error: ${err.error}`);
        setAiRefining(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setAiStatus("Stream error"); setAiRefining(false); return; }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7);
          if (line.startsWith("data: ") && eventType) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventType === "status") setAiStatus(eventData.message);
              if (eventType === "progress") setAiStatus("AI is rewriting...");
              if (eventType === "done") {
                setContent({ ...content, [eventData.section]: eventData.updatedData });
                setAiPrompt("");
                setAiStatus("Section updated by AI!");
                setTimeout(() => setAiStatus(""), 3000);
                setAiRefining(false);
                return;
              }
              if (eventType === "error") {
                setAiStatus(`Error: ${eventData.error}`);
                setAiRefining(false);
                return;
              }
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
      setAiRefining(false);
    } catch {
      setAiStatus("Network error");
      setAiRefining(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setDeleting(true);
    const res = await fetch(`/api/pcp/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    }
    setDeleting(false);
  }

  async function handleRegenerate() {
    if (regenerating) return;
    if (!confirm("This will generate a new PCP document for this project. Continue?")) return;
    setRegenerating(true);
    setRegenStatus("Connecting to AI...");

    try {
      const res = await fetch(`/api/pcp/${project.id}/regenerate`, { method: "POST" });
      if (!res.ok || !res.body) {
        setRegenStatus("Failed to start generation");
        setRegenerating(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventType === "status") setRegenStatus(eventData.message);
              if (eventType === "done") {
                setRegenStatus("Done! Reloading...");
                setRegenerating(false);
                router.refresh();
                // Force full page reload to get new document
                window.location.reload();
                return;
              }
              if (eventType === "error") {
                setRegenStatus(`Error: ${eventData.error}`);
                setRegenerating(false);
                return;
              }
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
      // The stream ended without a "done" event, so the function was killed
      // mid-generation rather than finishing.
      setRegenStatus("Error: Connection ended unexpectedly. The generation may have timed out. Please try again.");
      setRegenerating(false);
    } catch {
      setRegenStatus("Network error");
      setRegenerating(false);
    }
  }

  async function handleReview() {
    if (reviewing) return;
    setReviewing(true);
    setReviewStatus("Connecting to AI expert...");
    setReviewStreamText("");
    setReviewResult(null);
    setShowReview(true);

    try {
      const res = await fetch(`/api/pcp/${project.id}/review`, { method: "POST" });
      if (!res.ok || !res.body) {
        setReviewStatus("Failed to start review");
        setReviewing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventType === "status") setReviewStatus(eventData.message);
              if (eventType === "text") setReviewStreamText((prev) => prev + eventData.chunk);
              if (eventType === "done") {
                setReviewStreamText("");
                setReviewResult(eventData.review as ReviewResult);
                setReviewStatus("");
                setReviewing(false);
                return;
              }
              if (eventType === "error") {
                setReviewStatus(`Error: ${eventData.error}`);
                setReviewing(false);
                return;
              }
            } catch { /* skip */ }
            eventType = "";
          }
        }
      }
      // Stream ended without "done" event — likely timeout
      setReviewStatus("Review timed out. Please try again.");
      setReviewing(false);
    } catch {
      setReviewStatus("Network error. Please try again.");
      setReviewing(false);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  function getScoreBg(score: number): string {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-blue-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getWeightedTotal(): number {
    if (!reviewResult?.dimensions) return 0;
    const weights: Record<string, number> = {
      structure: 0.15, logic: 0.20, sdgsAlignment: 0.10, relevance: 0.15,
      resultsFramework: 0.15, riskSustainability: 0.10, writingQuality: 0.10, budget: 0.05,
    };
    let total = 0;
    for (const [key, dim] of Object.entries(reviewResult.dimensions)) {
      total += (dim.score || 0) * (weights[key] || 0);
    }
    return Math.round(total);
  }

  function renderValue(value: unknown, path: string, depth = 0): React.ReactNode {
    if (value === null || value === undefined) {
      return (
        <span
          className="text-zinc-400 cursor-pointer hover:text-blue-500"
          onClick={() => startEdit(path, "")}
        >
          (click to add)
        </span>
      );
    }

    if (typeof value === "string") {
      if (editingPath === path) {
        return (
          <div className="space-y-1">
            <textarea
              ref={editRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelEdit();
                if (e.key === "Enter" && e.ctrlKey) saveEdit();
              }}
              className="w-full rounded border border-blue-400 bg-blue-50 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-blue-950 dark:border-blue-600"
              rows={2}
            />
            <div className="flex gap-1">
              <button onClick={saveEdit} className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700">
                Save (Ctrl+Enter)
              </button>
              <button onClick={cancelEdit} className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50 dark:border-zinc-700">
                Cancel (Esc)
              </button>
            </div>
          </div>
        );
      }
      return (
        <p
          className="whitespace-pre-wrap cursor-pointer rounded px-1 -mx-1 hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-colors"
          onClick={() => startEdit(path, value)}
          title="Click to edit"
        >
          {value}
        </p>
      );
    }

    if (typeof value === "number") {
      if (editingPath === path) {
        return (
          <div className="inline-flex gap-1 items-center">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelEdit();
                if (e.key === "Enter") saveEdit();
              }}
              className="w-32 rounded border border-blue-400 bg-blue-50 px-2 py-0.5 text-sm focus:outline-none dark:bg-blue-950 dark:border-blue-600"
              autoFocus
            />
            <button onClick={saveEdit} className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white">OK</button>
            <button onClick={cancelEdit} className="rounded border border-zinc-300 px-2 py-0.5 text-xs">Cancel</button>
          </div>
        );
      }
      return (
        <span
          className="cursor-pointer rounded px-1 -mx-1 hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-colors"
          onClick={() => startEdit(path, String(value))}
          title="Click to edit"
        >
          {value.toLocaleString()}
        </span>
      );
    }

    if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-zinc-400">None</span>;
      if (typeof value[0] === "string" || typeof value[0] === "number") {
        return (
          <ul className="list-disc pl-4 space-y-1">
            {value.map((item, i) => (
              <li key={i} className="text-sm">{renderValue(item, `${path}.${i}`, depth + 1)}</li>
            ))}
          </ul>
        );
      }
      // Array of objects → columnar table
      if (value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
        // Budget Plan: specialized rendering with bar chart
        const isBudget = path.endsWith("budgetPlan") && value.length > 0 &&
          value.every((item) => {
            const r = item as Record<string, unknown>;
            return "category" in r && "amount" in r;
          });

        if (isBudget) {
          const maxAmount = Math.max(...value.map((item) => Number((item as Record<string, unknown>).amount) || 0), 1);
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Category</th>
                    <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 w-28">Amount (USD)</th>
                    <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 w-16">%</th>
                    <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Allocation</th>
                    {value.some((item) => (item as Record<string, unknown>).description) && (
                      <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Description</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {value.map((item, i) => {
                    const row = item as Record<string, unknown>;
                    const amount = Number(row.amount) || 0;
                    const pct = Number(row.percentage) || 0;
                    const barWidth = Math.max(5, (amount / maxAmount) * 100);
                    const hasDesc = value.some((it) => (it as Record<string, unknown>).description);
                    return (
                      <tr key={i} className={i % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}>
                        <td className="border border-zinc-200 px-3 py-2 font-medium dark:border-zinc-700">
                          {renderValue(row.category, `${path}.${i}.category`, depth + 1)}
                        </td>
                        <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums dark:border-zinc-700">
                          {renderValue(row.amount, `${path}.${i}.amount`, depth + 1)}
                        </td>
                        <td className="border border-zinc-200 px-3 py-2 text-center dark:border-zinc-700">
                          <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {pct}%
                          </span>
                        </td>
                        <td className="border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
                              <div
                                className="h-2.5 rounded-full bg-blue-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        {hasDesc && (
                          <td className="border border-zinc-200 px-3 py-2 text-zinc-500 dark:border-zinc-700">
                            {row.description ? renderValue(row.description, `${path}.${i}.description`, depth + 1) : "-"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 font-semibold">
                    <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">Total</td>
                    <td className="border border-zinc-300 px-3 py-2 text-right tabular-nums dark:border-zinc-600">
                      {value.reduce((sum, item) => sum + (Number((item as Record<string, unknown>).amount) || 0), 0).toLocaleString()}
                    </td>
                    <td className="border border-zinc-300 px-3 py-2 text-center dark:border-zinc-600">100%</td>
                    <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600" />
                    {value.some((item) => (item as Record<string, unknown>).description) && (
                      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600" />
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        }

        // Generic object array → columnar table
        const allKeys = new Set<string>();
        for (const item of value) {
          for (const k of Object.keys(item as Record<string, unknown>)) allKeys.add(k);
        }
        const keys = Array.from(allKeys);
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {keys.map((key) => (
                    <th key={key} className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {formatLabel(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.map((item, i) => {
                  const row = item as Record<string, unknown>;
                  return (
                    <tr key={i} className={i % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}>
                      {keys.map((key) => (
                        <td key={key} className="border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                          {renderValue(row[key], `${path}.${i}.${key}`, depth + 1)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {value.map((item, i) => (
            <div key={i} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
              {renderValue(item, `${path}.${i}`, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      // Top-level section object with mostly simple values → key-value table
      const isTopLevel = !path.includes(".");
      const simpleCount = entries.filter(([, v]) =>
        typeof v === "string" || typeof v === "number" || typeof v === "boolean" ||
        (Array.isArray(v) && v.every((i) => typeof i === "string" || typeof i === "number"))
      ).length;
      const useTable = isTopLevel && simpleCount >= 3;

      if (useTable) {
        // Split into simple fields (table) and complex fields (below)
        const simpleEntries = entries.filter(([, v]) =>
          typeof v === "string" || typeof v === "number" || typeof v === "boolean" ||
          (Array.isArray(v) && v.every((i) => typeof i === "string" || typeof i === "number"))
        );
        const complexEntries = entries.filter(([, v]) =>
          !(typeof v === "string" || typeof v === "number" || typeof v === "boolean" ||
          (Array.isArray(v) && v.every((i) => typeof i === "string" || typeof i === "number")))
        );
        return (
          <div className="space-y-4">
            {simpleEntries.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {simpleEntries.map(([key, val], i) => (
                    <tr key={key} className={i % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}>
                      <td className="border border-zinc-200 px-3 py-2 font-medium text-zinc-600 w-1/3 dark:border-zinc-700 dark:text-zinc-400">
                        {formatLabel(key)}
                      </td>
                      <td className="border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                        {renderValue(val, `${path}.${key}`, depth + 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {complexEntries.map(([key, val]) => (
              <div key={key}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-2 mt-4">
                  {formatLabel(key)}
                </h3>
                {renderValue(val, `${path}.${key}`, depth + 1)}
              </div>
            ))}
          </div>
        );
      }

      return (
        <dl className="space-y-3">
          {entries.map(([key, val]) => (
            <div key={key}>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {formatLabel(key)}
              </dt>
              <dd className="mt-0.5 text-sm">{renderValue(val, `${path}.${key}`, depth + 1)}</dd>
            </div>
          ))}
        </dl>
      );
    }

    return <span>{String(value)}</span>;
  }

  function formatLabel(key: string): string {
    const labels: Record<string, string> = {
      projectTitle: "Project Title", requestingCountry: "Requesting Country",
      implementingAgency: "Implementing Agency", responsibleMinistry: "Responsible Ministry",
      projectLocation: "Project Location", projectDuration: "Project Duration",
      totalProjectCost: "Total Project Cost", targetBeneficiaries: "Target Beneficiaries",
      projectObjectives: "Project Objectives", sdgsAlignment: "SDGs Alignment",
      countryContext: "Country Context", sectorContext: "Sector Context",
      problemAnalysis: "Problem Analysis", needsAssessment: "Needs Assessment",
      nationalPlanAlignment: "National Plan Alignment", cpsAlignment: "CPS Alignment",
      similarProjects: "Similar Projects", genderAnalysis: "Gender Analysis",
      overallGoal: "Overall Goal", projectPurpose: "Project Purpose",
      expectedOutcomes: "Expected Outcomes", budgetPlan: "Budget Plan",
      stakeholders: "Stakeholders", beneficiaryParticipation: "Beneficiary Participation",
      implementationArrangement: "Implementation Arrangement",
      managementStructure: "Management Structure", meFramework: "M&E Framework",
      risks: "Risks", sustainabilityPlan: "Sustainability Plan",
      localProcurement: "Local Procurement", description: "Description",
      likelihood: "Likelihood", impact: "Impact", mitigation: "Mitigation",
      name: "Name", type: "Type", role: "Role", category: "Category",
      amount: "Amount", percentage: "%", indicators: "Indicators",
      outputs: "Outputs", activities: "Activities", coordinationMechanism: "Coordination",
    };
    return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
  }

  const sectionData = content[activeSection];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-500">&larr; Back to projects</Link>
          <h1 className="mt-2 text-2xl font-bold">{project.title}</h1>
          <p className="text-sm text-zinc-500">
            {project.country} &middot; {project.sector}
            {document && ` \u00B7 Version ${document.version}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-green-600">Saved!</span>}
          {/* Saving, exporting and reviewing all need a document to act on. */}
          {document && (
            <>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={handleDownloadWord}
            className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
          >
            Download .docx
          </button>
          <button
            onClick={() => handleDownloadPptx(false)}
            // Shift-click re-authors the deck instead of reusing the cached plan.
            onMouseDown={(e) => { if (e.shiftKey) { e.preventDefault(); handleDownloadPptx(true); } }}
            disabled={buildingDeck}
            title="Download the slide deck (shift-click to re-author it)"
            className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            {buildingDeck ? "Building deck..." : "Download .pptx"}
          </button>
          {buildingDeck && deckStatus && (
            <span className="self-center text-xs text-neutral-500 dark:text-neutral-400">
              {deckStatus}
            </span>
          )}
          <button
            onClick={() => {
              if (reviewResult && !reviewing) {
                setShowReview(!showReview);
              } else {
                handleReview();
              }
            }}
            disabled={reviewing}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
          >
            {reviewing ? "Reviewing..." : reviewResult ? "View Review" : "AI Expert Review"}
          </button>
            </>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Edit hint */}
      <div className={`mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300 ${document ? "" : "hidden"}`}>
        Click any text to edit it. Press Ctrl+Enter to confirm, Esc to cancel.
      </div>

      {/* Expert Review Panel */}
      {showReview && (
        <div className="mb-6 rounded-lg border border-indigo-200 bg-white dark:border-indigo-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-3 dark:border-indigo-800">
            <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
              AI Expert Review
            </h3>
            <div className="flex items-center gap-2">
              {reviewResult && !reviewing && (
                <button
                  onClick={handleReview}
                  className="rounded border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950"
                >
                  Re-review
                </button>
              )}
              <button
                onClick={() => setShowReview(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>

          {reviewing && (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{reviewStatus}</p>
              </div>
              {reviewStreamText && (
                <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 whitespace-pre-wrap font-mono dark:bg-zinc-800 dark:text-zinc-400">
                  {reviewStreamText}
                </pre>
              )}
            </div>
          )}

          {reviewResult && (
            <div className="p-4 space-y-4">
              {/* Overall Score */}
              <div className="flex items-center gap-4 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-950">
                <div className={`text-4xl font-bold ${getScoreColor(getWeightedTotal())}`}>
                  {getWeightedTotal()}
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Overall Score (Weighted)</div>
                  <div className="text-xs text-zinc-500">
                    {getWeightedTotal() >= 90 ? "Excellent" : getWeightedTotal() >= 80 ? "Good" : getWeightedTotal() >= 70 ? "Acceptable" : "Needs Improvement"}
                  </div>
                </div>
              </div>

              {/* Dimension Scores */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(reviewResult.dimensions || {}).map(([key, dim]) => {
                  const meta = DIMENSION_LABELS[key] || { label: key, weight: "", icon: "" };
                  return (
                    <div key={key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {meta.icon} {meta.label}
                        </span>
                        <span className={`text-lg font-bold ${getScoreColor(dim.score)}`}>
                          {dim.score}
                        </span>
                      </div>
                      <div className="mb-2 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div
                          className={`h-1.5 rounded-full ${getScoreBg(dim.score)}`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">{dim.feedback}</p>
                      {dim.details && dim.details.length > 0 && (
                        <ul className="space-y-0.5">
                          {dim.details.slice(0, 3).map((d, i) => (
                            <li key={i} className="text-xs text-zinc-500 dark:text-zinc-500">
                              - {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {reviewResult.strengths && reviewResult.strengths.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                    <h4 className="mb-2 text-sm font-semibold text-green-700 dark:text-green-300">Strengths</h4>
                    <ul className="space-y-1">
                      {reviewResult.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-green-700 dark:text-green-400">+ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {reviewResult.improvements && reviewResult.improvements.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                    <h4 className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-300">Suggested Improvements</h4>
                    <ul className="space-y-2">
                      {reviewResult.improvements.map((imp, i) => {
                        const isObj = typeof imp === "object" && imp !== null && "section" in imp;
                        const section = isObj ? (imp as ReviewImprovement).section : "";
                        const suggestion = isObj ? (imp as ReviewImprovement).suggestion : String(imp);
                        const sectionLabel = section && SECTION_TITLES[section] ? SECTION_TITLES[section] : "";
                        return (
                          <li key={i} className="text-xs text-amber-700 dark:text-amber-400">
                            <button
                              className="text-left hover:underline w-full"
                              onClick={() => {
                                if (section && SECTION_TITLES[section]) {
                                  setActiveSection(section);
                                }
                                setAiPrompt(suggestion);
                                setShowReview(false);
                                setTimeout(() => aiInputRef.current?.focus(), 100);
                              }}
                            >
                              {sectionLabel && (
                                <span className="inline-block rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 mr-1.5 dark:bg-amber-800 dark:text-amber-200">
                                  {sectionLabel.split(".")[0].trim()}
                                </span>
                              )}
                              {suggestion}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-500 italic">
                      Click a suggestion to apply it via AI Refine
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!reviewing && !reviewResult && reviewStatus && (
            <div className="p-4">
              <p className={`text-sm ${reviewStatus.startsWith("Error") ? "text-red-600" : "text-indigo-600"}`}>
                {reviewStatus}
              </p>
            </div>
          )}
        </div>
      )}

      {!document ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="mb-4 text-zinc-500">
            {project.status === "generating"
              ? "Generation is still running. Reload in a minute."
              : "No document generated yet."}
          </p>
          {!project.input && (
            <p className="mx-auto mb-4 max-w-xl text-sm text-amber-700 dark:text-amber-400">
              This project predates saving the wizard answers, so the problem statement,
              budget, duration and SDGs you entered are no longer on file. Generating now
              will use defaults. For a faithful document, start a new project instead.
            </p>
          )}
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {regenerating ? "Generating..." : "Generate PCP Document"}
          </button>
          {regenStatus && (
            <p className={`mt-3 text-sm ${regenStatus.startsWith("Error") ? "text-red-600" : "text-blue-600 dark:text-blue-400"}`}>
              {regenStatus}
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Section nav */}
          <nav className="w-56 shrink-0 space-y-1">
            {Object.entries(SECTION_TITLES).map(([key, title]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === key
                    ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {title}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 space-y-4">
            {/* AI Refine */}
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                AI Edit: Describe how to modify this section
              </label>
              <div className="flex gap-2">
                <textarea
                  ref={aiInputRef}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiRefine(); }
                  }}
                  placeholder='e.g., "Add more detail about climate risks" or "Make the budget more realistic" or "Translate to Korean"'
                  rows={2}
                  disabled={aiRefining}
                  className="flex-1 rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-purple-700 dark:bg-zinc-900"
                />
                <button
                  onClick={handleAiRefine}
                  disabled={aiRefining || !aiPrompt.trim()}
                  className="shrink-0 self-end rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {aiRefining ? "Refining..." : "AI Refine"}
                </button>
              </div>
              {aiStatus && (
                <p className={`mt-2 text-xs ${aiStatus.startsWith("Error") ? "text-red-600" : "text-purple-600 dark:text-purple-400"}`}>
                  {aiStatus}
                </p>
              )}
            </div>

            {/* Section content */}
            <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
              <h2 className="mb-4 text-lg font-semibold">
                {SECTION_TITLES[activeSection]}
              </h2>
              <div className="max-w-none">
                {sectionData ? renderValue(sectionData, activeSection) : (
                  <p className="text-zinc-400">No content for this section.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
