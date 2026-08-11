"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateDocx } from "@/lib/export/docx";

interface Project {
  id: string;
  title: string;
  country: string;
  sector: string;
  status: string;
}

interface Document {
  id: string;
  version: number;
  content: Record<string, unknown>;
  created_at: string;
}

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
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiRefining, setAiRefining] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
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

  async function handleDownloadWord() {
    try {
      const blob = await generateDocx(content, project.title, project.country, project.sector);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}_PCP.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate Word file:", e);
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
      return (
        <dl className="space-y-3">
          {entries.map(([key, val]) => (
            <div key={key}>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </dt>
              <dd className="mt-0.5 text-sm">{renderValue(val, `${path}.${key}`, depth + 1)}</dd>
            </div>
          ))}
        </dl>
      );
    }

    return <span>{String(value)}</span>;
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
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Edit hint */}
      <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Click any text to edit it. Press Ctrl+Enter to confirm, Esc to cancel.
      </div>

      {!document ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">No document generated yet.</p>
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
