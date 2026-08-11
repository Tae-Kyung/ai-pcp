import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { DashboardHeader } from "@/app/dashboard/header";
import { PCPEditor } from "./editor";

type Params = { params: Promise<{ id: string }> };

export default async function PCPDetailPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("pcp_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: document } = await supabase
    .from("pcp_documents")
    .select("*")
    .eq("project_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader email={user.email ?? ""} />
      <PCPEditor
        project={project}
        document={document}
      />
    </div>
  );
}
