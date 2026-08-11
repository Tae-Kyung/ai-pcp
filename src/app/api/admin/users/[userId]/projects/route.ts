import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const adminClient = createAdminClient();

  // Fetch user profile
  const { data: profile } = await adminClient
    .from("pcp_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // Fetch user email from auth
  const { data: authData } = await adminClient.auth.admin.getUserById(userId);
  const email = authData?.user?.email ?? "";

  // Fetch user's projects with latest document info
  const { data: projects } = await adminClient
    .from("pcp_projects")
    .select("*, pcp_documents(version, tokens_used, generation_time_ms, created_at)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return NextResponse.json({
    profile: { ...profile, email },
    projects: projects ?? [],
  });
}
