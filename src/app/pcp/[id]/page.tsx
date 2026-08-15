import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/header";
import { PCPEditor } from "./editor";
import { reconcileStaleGenerating } from "@/lib/pcp/status";

type Params = { params: Promise<{ id: string }> };

export default async function PCPDetailPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Admin can view any project; regular users are restricted by RLS
  const db = isAdmin(user.email) ? createAdminClient() : supabase;

  const { data: project } = await db
    .from("pcp_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: document } = await db
    .from("pcp_documents")
    .select("*")
    .eq("project_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  // A run killed by the function timeout leaves the row stuck at "generating".
  const statuses = await reconcileStaleGenerating(db, [project]);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader email={user.email ?? ""} />
      <PCPEditor
        project={{ ...project, status: statuses.get(project.id) ?? project.status }}
        document={document}
      />
    </div>
  );
}
