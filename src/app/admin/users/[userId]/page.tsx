"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  country: string | null;
  role: string | null;
  created_at: string;
}

interface ProjectDoc {
  version: number;
  tokens_used: number;
  generation_time_ms: number;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  country: string;
  sector: string;
  status: string;
  created_at: string;
  updated_at: string;
  pcp_documents: ProjectDoc[];
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  generating: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  generated: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  reviewed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  final: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

export default function AdminUserProjectsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/projects`)
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile ?? null);
        setProjects(data.projects ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Back to Users
      </Link>

      {/* User info card */}
      {profile && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-xl font-bold">{profile.full_name || profile.email}</h1>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500">
            <span>Email: <span className="text-zinc-700 dark:text-zinc-300">{profile.email}</span></span>
            {profile.organization && (
              <span>Organization: <span className="text-zinc-700 dark:text-zinc-300">{profile.organization}</span></span>
            )}
            {profile.country && (
              <span>Country: <span className="text-zinc-700 dark:text-zinc-300">{profile.country}</span></span>
            )}
            <span>Registered: <span className="text-zinc-700 dark:text-zinc-300">{new Date(profile.created_at).toLocaleDateString()}</span></span>
          </div>
        </div>
      )}

      {/* Projects */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          This user has no projects yet.
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const latestDoc = project.pcp_documents?.sort(
              (a, b) => b.version - a.version
            )[0];
            const totalTokens = project.pcp_documents?.reduce(
              (sum, d) => sum + (d.tokens_used ?? 0), 0
            ) ?? 0;

            return (
              <div
                key={project.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{project.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] ?? ""}`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {project.country} &middot; {project.sector.replace(/_/g, " ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                      <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(project.updated_at).toLocaleDateString()}</span>
                      {latestDoc && <span>Version: {latestDoc.version}</span>}
                      {totalTokens > 0 && <span>Tokens used: {totalTokens.toLocaleString()}</span>}
                    </div>
                  </div>
                  <Link
                    href={`/pcp/${project.id}`}
                    className="ml-4 shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Open PCP
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
