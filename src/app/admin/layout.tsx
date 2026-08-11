import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { AdminHeader } from "./header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader email={user.email ?? ""} />
      {children}
    </div>
  );
}
