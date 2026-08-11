"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  country: string | null;
  role: string | null;
  created_at: string;
  lastSignIn: string | null;
  projectCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.organization ?? "").toLowerCase().includes(q) ||
      (u.country ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {users.length} registered users · {users.reduce((s, u) => s + u.projectCount, 0)} total projects
          </p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email, name, organization, or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading users...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium text-center">Projects</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Last Sign-in</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-4 py-3 font-medium">{user.email}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{user.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{user.organization ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{user.country ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block min-w-[2rem] rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.projectCount > 0
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {user.projectCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                    >
                      View Projects
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    {search ? "No users matching the search criteria." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
