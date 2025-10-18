// src/components/ThemeToggle.tsx
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("dark"); // valeur par défaut sûre

  // Init côté client, hors rendu
  useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined" ? localStorage.getItem("theme") : null;

      if (saved === "light" || saved === "dark") {
        setMode(saved);
        return;
      }

      const prefersDark =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      setMode(prefersDark ? "dark" : "light");
    } catch {
      // si localStorage bloqué : rester en "light"
      setMode("light");
    }
  }, []);

  // Appliquer la classe & persister
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.toggle("dark", mode === "dark");
      localStorage.setItem("theme", mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  return (
    <button
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      className="rounded-xl border border-black/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 dark:border-white/10"
      aria-label="Basculer le thème"
      title="Basculer le thème"
    >
      {mode === "dark" ? "☀️ Clair" : "🌙 Sombre"}
    </button>
  );
}
