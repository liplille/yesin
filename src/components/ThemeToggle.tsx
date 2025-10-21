// src/components/ThemeToggle.tsx
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export default function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  // Init depuis localStorage / prefers-color-scheme
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") {
        setMode(saved);
        return;
      }
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setMode(prefersDark ? "dark" : "light");
    } catch {
      setMode("light");
    }
  }, []);

  // Applique la classe .dark au <html> + persiste
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.toggle("dark", mode === "dark");
      localStorage.setItem("theme", mode);
    } catch {
      /* no-op */
    }
  }, [mode]);

  const isDark = mode === "dark";
  const label = isDark ? "Clair" : "Sombre";
  const aria = isDark ? "Activer le mode clair" : "Activer le mode sombre";

  return (
    <button
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 dark:border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors"
      aria-label={aria}
      title={aria}
    >
      {/* Icône colorée + transition */}
      {isDark ? (
        // Mode sombre actif → on propose "Clair" → icône Soleil
        <SunIcon
          className="h-5 w-5 text-yellow-400 dark:text-yellow-300 drop-shadow-sm transition-colors"
          aria-hidden="true"
        />
      ) : (
        // Mode clair actif → on propose "Sombre" → icône Lune
        <MoonIcon
          className="h-5 w-5 text-indigo-600 dark:text-indigo-400 transition-colors"
          aria-hidden="true"
        />
      )}

      {/* Texte masqué en mobile, visible dès sm */}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
