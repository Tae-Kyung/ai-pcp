import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Fetch all profiles with project counts
  const { data: profiles, error } = await adminClient
    .from("pcp_profiles")
    .select("id, full_name, organization, country, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch auth users to get emails
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, { email: string; lastSignIn: string | null }>();
  if (authData?.users) {
    for (const u of authData.users) {
      emailMap.set(u.id, { email: u.email ?? "", lastSignIn: u.last_sign_in_at ?? null });
    }
  }

  // Fetch project counts per user
  const { data: projectCounts } = await adminClient
    .from("pcp_projects")
    .select("user_id");

  const countMap = new Map<string, number>();
  if (projectCounts) {
    for (const p of projectCounts) {
      countMap.set(p.user_id, (countMap.get(p.user_id) ?? 0) + 1);
    }
  }

  const users = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id)?.email ?? "",
    lastSignIn: emailMap.get(p.id)?.lastSignIn ?? null,
    projectCount: countMap.get(p.id) ?? 0,
  }));

  return NextResponse.json({ users });
}
