"use client";

import { useEffect } from "react";

export function ThemeScript() {
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      const d = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme:dark)").matches);
      document.documentElement.classList.toggle("dark", d);
    } catch {}
  }, []);

  return null;
}
