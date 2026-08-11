"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { locales, localeNames, type Locale } from "@/lib/i18n/translations";

export default function HomePage() {
  const { locale, setLocale, t } = useI18n();
  const { setTheme, resolved } = useTheme();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-bold">{t("appName")}</span>
          <div className="flex items-center gap-3">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {locales.map((l) => (
                <option key={l} value={l}>{localeNames[l]}</option>
              ))}
            </select>
            <button
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
            <Link href="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
              {t("signIn")}
            </Link>
            <Link href="/auth/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {t("getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="max-w-2xl space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">{t("heroDesc")}</p>
          <div className="flex justify-center gap-4">
            <Link href="/auth/signup" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700">
              {t("heroCta")}
            </Link>
          </div>
        </div>

        <div className="mt-20 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-semibold">{t("featKoicaTitle")}</h3>
            <p className="text-sm text-zinc-500">{t("featKoicaDesc")}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">{t("featAiTitle")}</h3>
            <p className="text-sm text-zinc-500">{t("featAiDesc")}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">{t("featQualityTitle")}</h3>
            <p className="text-sm text-zinc-500">{t("featQualityDesc")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
