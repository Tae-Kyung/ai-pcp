"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

interface Project {
  id: string;
  title: string;
  country: string;
  sector: string;
  status: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  generating: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  generated: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  reviewed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  final: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

const statusKeyMap: Record<string, string> = {
  draft: "statusDraft",
  generating: "statusGenerating",
  generated: "statusGenerated",
  reviewed: "statusReviewed",
  final: "statusFinal",
};

export function DashboardContent({ projects }: { projects: Project[] }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("myProjects")}</h1>
        <Link href="/pcp/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {t("newPcp")}
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">{t("noProjects")}</p>
          <Link href="/pcp/new" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t("createPcp")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/pcp/${project.id}`}
              className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{project.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{project.country} &middot; {project.sector}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] ?? ""}`}>
                  {t(statusKeyMap[project.status] as keyof ReturnType<typeof t> extends string ? string : never) ?? project.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                {t("updated")} {new Date(project.updated_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
