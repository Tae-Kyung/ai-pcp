import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

// GET /api/pcp/[id] - Get project with latest document
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin can view any project; regular users are restricted by RLS
  const db = isAdmin(user.email) ? createAdminClient() : supabase;

  const { data: project, error } = await db
    .from("pcp_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: document } = await db
    .from("pcp_documents")
    .select("*")
    .eq("project_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ project, document });
}

// PUT /api/pcp/[id] - Update document content (creates new version)
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Get latest version
  const { data: latest } = await supabase
    .from("pcp_documents")
    .select("version")
    .eq("project_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const newVersion = (latest?.version ?? 0) + 1;

  const { data: doc, error } = await supabase
    .from("pcp_documents")
    .insert({
      project_id: id,
      version: newVersion,
      content: body.content,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  await supabase.from("pcp_projects").update({ status: "reviewed" }).eq("id", id);

  return NextResponse.json({ document: doc });
}

// DELETE /api/pcp/[id] - Delete project and all documents
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("pcp_projects").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
