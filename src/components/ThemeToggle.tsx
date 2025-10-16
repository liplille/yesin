// src/components/ThemeToggle.tsx
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    // fallback: préférence système
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement; // <html>
    root.classList.toggle("dark", mode === "dark");
    localStorage.setItem("theme", mode);
  }, [mode]);

  return (
    <button
      type="button"
      className="rounded-xl border px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      aria-label="Basculer le thème"
      title="Basculer le thème"
    >
      {mode === "dark" ? "🌙 Sombre" : "☀️ Clair"}
    </button>
  );
}
