import { useEffect, useState } from "react";

function getSystemPref(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || getSystemPref()
  );

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="btn inline-flex items-center gap-2 rounded-xl border border-[--border] bg-[--surface-2] px-3 py-2 text-sm text-[--text] hover:bg-[--surface-3] transition"
      aria-label="Basculer le thème"
      title="Basculer le thème"
    >
      <span className="i">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">
        {theme === "dark" ? "Sombre" : "Clair"}
      </span>
    </button>
  );
}
