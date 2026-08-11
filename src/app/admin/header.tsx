"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AdminHeader({ email }: { email: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-red-50 dark:border-zinc-800 dark:bg-red-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/users" className="text-lg font-bold text-red-700 dark:text-red-400">
            AI-PCP Admin
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/admin/users"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
            >
              Users
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <span className="text-sm text-zinc-500">{email}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
