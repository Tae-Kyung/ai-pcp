import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "./header";
import { DashboardContent } from "./content";
import { reconcileStaleGenerating } from "@/lib/pcp/status";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("pcp_profiles").upsert({ id: user.id }, { onConflict: "id" });

  const { data: projects } = await supabase
    .from("pcp_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  // Runs killed by the function timeout leave rows stuck at "generating".
  const statuses = await reconcileStaleGenerating(supabase, projects ?? []);
  const reconciled = (projects ?? []).map((p) => ({ ...p, status: statuses.get(p.id) ?? p.status }));

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader email={user.email ?? ""} />
      <DashboardContent projects={reconciled} />
    </div>
  );
}
