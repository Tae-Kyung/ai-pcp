"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { locales, localeNames, type Locale } from "@/lib/i18n/translations";
import { isAdmin } from "@/lib/admin";

export function DashboardHeader({ email }: { email: string }) {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme, resolved } = useTheme();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-bold">{t("appName")}</Link>
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {locales.map((l) => (
              <option key={l} value={l}>{localeNames[l]}</option>
            ))}
          </select>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title={resolved === "dark" ? t("lightMode") : t("darkMode")}
          >
            {resolved === "dark" ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {isAdmin(email) && (
            <Link
              href="/admin"
              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
            >
              Admin
            </Link>
          )}
          <span className="text-sm text-zinc-500">{email}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    </header>
  );
}
