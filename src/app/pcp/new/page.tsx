"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/header";
import { createClient } from "@/lib/supabase/client";
import { pcpSectors } from "@/lib/validations/pcp";

const SDG_LABELS = [
  "1. No Poverty",
  "2. Zero Hunger",
  "3. Good Health",
  "4. Quality Education",
  "5. Gender Equality",
  "6. Clean Water",
  "7. Affordable Energy",
  "8. Decent Work",
  "9. Industry & Innovation",
  "10. Reduced Inequalities",
  "11. Sustainable Cities",
  "12. Responsible Consumption",
  "13. Climate Action",
  "14. Life Below Water",
  "15. Life on Land",
  "16. Peace & Justice",
  "17. Partnerships",
];

const SECTOR_LABELS: Record<string, string> = {
  health: "Health",
  education: "Education",
  agriculture: "Agriculture",
  ict: "ICT",
  governance: "Governance",
  water_sanitation: "Water & Sanitation",
  transport: "Transport",
  energy: "Energy",
  environment: "Environment",
  gender: "Gender",
};

const STEPS = ["Basic Info", "Problem & Context", "Objectives", "Stakeholders", "Management"];

const SAMPLE_DATA_OPTIONS: { label: string; data: WizardData }[] = [
  {
    label: "Cambodia - Maternal Health",
    data: {
      projectTitle: "Strengthening Maternal and Child Healthcare System in Rural Cambodia",
      requestingCountry: "Cambodia",
      sector: "health",
      targetBeneficiaries: "500,000 women of reproductive age and children under 5 in rural provinces of Battambang, Siem Reap, and Kampong Cham",
      projectDuration: "4 years (2027-2030)",
      estimatedBudget: 12000000,
      sdgs: [3, 5, 10],
      problemStatement: "Cambodia's maternal mortality ratio remains at 160 per 100,000 live births, significantly higher than the regional average. Rural areas face severe shortages of skilled birth attendants, with only 35% of deliveries attended by trained health personnel. Health facilities in target provinces lack essential equipment, medicines, and trained staff. The referral system between community health centers and provincial hospitals is fragmented, leading to delays in emergency obstetric care. Additionally, cultural barriers and low health literacy contribute to low utilization of antenatal care services, with only 45% of pregnant women completing the recommended four visits.",
      additionalContext: "Cambodia's National Health Strategic Plan 2024-2030 prioritizes maternal and child health. KOICA has previous experience in health sector support in Cambodia through the Health Center Strengthening Project (2018-2022). The Ministry of Health has committed to co-financing 15% of project costs.",
    },
  },
  {
    label: "Ethiopia - Agriculture",
    data: {
      projectTitle: "Enhancing Agricultural Value Chain and Food Security in Southern Ethiopia",
      requestingCountry: "Ethiopia",
      sector: "agriculture",
      targetBeneficiaries: "80,000 smallholder farmers and 200,000 household members in SNNPR and Sidama regions",
      projectDuration: "5 years (2027-2031)",
      estimatedBudget: 15000000,
      sdgs: [1, 2, 8, 12],
      problemStatement: "Ethiopia's agricultural sector employs 70% of the population but suffers from low productivity, post-harvest losses of 25-30%, and limited market access. Smallholder farmers in southern regions face recurring food insecurity due to climate variability, soil degradation, and lack of improved seeds and farming techniques. The agricultural extension system reaches only 40% of farmers, and access to agricultural finance remains below 15%. Post-harvest infrastructure is inadequate, resulting in significant crop losses, and farmers receive only 30-40% of final market prices due to long intermediary chains and poor market information systems.",
      additionalContext: "Ethiopia's Growth and Transformation Plan II emphasizes agricultural modernization. KOICA's Country Partnership Strategy for Ethiopia (2024-2028) identifies agriculture as a priority sector. The project will build on KOICA's previous rural development project in Oromia region.",
    },
  },
  {
    label: "Bangladesh - TVET Education",
    data: {
      projectTitle: "Technical and Vocational Education and Training (TVET) System Modernization in Bangladesh",
      requestingCountry: "Bangladesh",
      sector: "education",
      targetBeneficiaries: "15,000 TVET students and 500 instructors across 20 polytechnic institutes in Dhaka, Chittagong, and Rajshahi divisions",
      projectDuration: "4 years (2027-2030)",
      estimatedBudget: 10000000,
      sdgs: [4, 8, 9],
      problemStatement: "Bangladesh faces a critical skills gap with youth unemployment at 12.3% despite rapid industrial growth. The current TVET system produces graduates whose skills do not match industry demands, with only 25% of TVET graduates finding employment in their trained field within one year. Training facilities are outdated, curricula have not been updated since 2015, and instructors lack industry experience. The garment, IT, and manufacturing sectors report significant shortages of mid-level technical workers, while TVET enrollment remains low due to social stigma and perceived low quality of training.",
      additionalContext: "Bangladesh's National Skills Development Policy 2022 calls for TVET modernization. Korea has strong expertise in TVET through KOPOLCO model. Industry partners Samsung Bangladesh and Hyundai have expressed interest in curriculum co-development and internship programs.",
    },
  },
];

interface WizardData {
  projectTitle: string;
  requestingCountry: string;
  sector: string;
  targetBeneficiaries: string;
  projectDuration: string;
  estimatedBudget: number;
  sdgs: number[];
  problemStatement: string;
  additionalContext: string;
}

export default function NewPCPPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [streamText, setStreamText] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  const [userEmail, setUserEmail] = useState("");
  const [data, setData] = useState<WizardData>({
    projectTitle: "",
    requestingCountry: "",
    sector: "health",
    targetBeneficiaries: "",
    projectDuration: "3 years",
    estimatedBudget: 10000000,
    sdgs: [],
    problemStatement: "",
    additionalContext: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email ?? "");
    });
  }, []);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamText]);

  function updateField<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSDG(sdg: number) {
    setData((prev) => ({
      ...prev,
      sdgs: prev.sdgs.includes(sdg) ? prev.sdgs.filter((s) => s !== sdg) : [...prev.sdgs, sdg],
    }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setStatusMessage("Connecting...");
    setStreamText("");

    try {
      const res = await fetch("/api/pcp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        let msg = result.error ?? "Generation failed";
        if (result.details && Array.isArray(result.details)) {
          msg += ": " + result.details.map((d: { message?: string; path?: string[] }) =>
            `${d.path?.join(".") ?? ""} - ${d.message ?? ""}`
          ).join("; ");
        }
        setError(msg);
        setLoading(false);
        return;
      }

      // Handle SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setError("Stream error"); setLoading(false); return; }

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
              if (eventType === "status") setStatusMessage(eventData.message);
              if (eventType === "text") setStreamText((prev) => prev + eventData.chunk);
              if (eventType === "done") { router.push(`/pcp/${eventData.projectId}`); return; }
              if (eventType === "error") { setError(eventData.error); setLoading(false); return; }
            } catch { /* skip malformed event */ }
            eventType = "";
          }
        }
      }
      setError("Connection ended unexpectedly. The generation may have timed out. Please try again.");
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0: return data.projectTitle.length >= 5 && data.requestingCountry.length >= 2;
      case 1: return data.problemStatement.length >= 50;
      case 2: return data.sdgs.length > 0;
      default: return true;
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader email={userEmail} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create New PCP</h1>
          <div className="flex gap-2">
            {SAMPLE_DATA_OPTIONS.map((sample) => (
              <button
                key={sample.label}
                onClick={() => { setData(sample.data); setStep(0); }}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${i <= step ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"}`}
              />
              <p className={`mt-1 text-xs ${i === step ? "font-medium text-blue-600" : "text-zinc-400"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Title *</label>
              <input
                type="text"
                value={data.projectTitle}
                onChange={(e) => updateField("projectTitle", e.target.value)}
                placeholder="e.g., Strengthening Maternal and Child Healthcare in Cambodia"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Requesting Country *</label>
              <input
                type="text"
                value={data.requestingCountry}
                onChange={(e) => updateField("requestingCountry", e.target.value)}
                placeholder="e.g., Cambodia"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sector</label>
              <select
                value={data.sector}
                onChange={(e) => updateField("sector", e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              >
                {pcpSectors.map((s) => (
                  <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Duration</label>
                <input
                  type="text"
                  value={data.projectDuration}
                  onChange={(e) => updateField("projectDuration", e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Budget (USD)</label>
                <input
                  type="number"
                  value={data.estimatedBudget}
                  onChange={(e) => updateField("estimatedBudget", Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Beneficiaries</label>
              <input
                type="text"
                value={data.targetBeneficiaries}
                onChange={(e) => updateField("targetBeneficiaries", e.target.value)}
                placeholder="e.g., 500,000 women of reproductive age in rural areas"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        )}

        {/* Step 1: Problem & Context */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Problem Statement * (min 50 chars)</label>
              <textarea
                value={data.problemStatement}
                onChange={(e) => updateField("problemStatement", e.target.value)}
                rows={6}
                placeholder="Describe the core problem, root causes, and current situation in the target country/sector..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-400">{data.problemStatement.length} / 50 characters minimum</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Additional Context (optional)</label>
              <textarea
                value={data.additionalContext}
                onChange={(e) => updateField("additionalContext", e.target.value)}
                rows={4}
                placeholder="Any additional context: existing programs, government priorities, relevant data..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        )}

        {/* Step 2: SDGs */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">SDGs Alignment * (select at least one)</label>
              <div className="grid grid-cols-2 gap-2">
                {SDG_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSDG(i + 1)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      data.sdgs.includes(i + 1)
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Stakeholders (informational) */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 text-sm dark:bg-blue-950">
              <p className="font-medium text-blue-700 dark:text-blue-300">AI will auto-generate stakeholder analysis</p>
              <p className="mt-1 text-blue-600 dark:text-blue-400">
                Based on your project info, the AI will identify key stakeholders including government agencies,
                international organizations, NGOs, and community groups. You can edit the generated content.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Management (informational) */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 text-sm dark:bg-blue-950">
              <p className="font-medium text-blue-700 dark:text-blue-300">AI will auto-generate management plan</p>
              <p className="mt-1 text-blue-600 dark:text-blue-400">
                The AI will generate implementation arrangements, M&E framework, risk analysis,
                sustainability plan, and procurement strategy based on your inputs.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <h3 className="font-semibold mb-3">Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Title</dt>
                  <dd className="font-medium">{data.projectTitle}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Country</dt>
                  <dd>{data.requestingCountry}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Sector</dt>
                  <dd>{SECTOR_LABELS[data.sector]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Budget</dt>
                  <dd>${data.estimatedBudget.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Duration</dt>
                  <dd>{data.projectDuration}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">SDGs</dt>
                  <dd>{data.sdgs.sort((a, b) => a - b).join(", ")}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.push("/dashboard")}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading || !canProceed()}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Generating PCP..." : "Generate PCP with AI"}
            </button>
          )}
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
              <p className="text-sm font-medium text-blue-600">{statusMessage}</p>
            </div>
            {streamText && (
              <div ref={streamRef} className="max-h-96 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <pre className="whitespace-pre-wrap">{streamText}</pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
