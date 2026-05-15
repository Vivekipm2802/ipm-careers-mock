import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Floating light/dark toggle. Sits in the top-right of the app so students
 * can flip modes whenever they want. Theme persists in localStorage.
 *
 * Initial paint is handled in pages/_document.js (inline script before
 * hydration) — this component takes over after mount.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(t);
    setMounted(true);
  }, []);

  function flip() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("ipm-theme", next);
    } catch (e) {
      // ignore storage errors
    }
  }

  if (!mounted) return null;

  const isLight = theme === "light";

  return (
    <button
      onClick={flip}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="fixed z-30 inline-flex items-center gap-2 rounded-full transition-all hover:-translate-y-0.5"
      style={{
        top: "12px",
        right: "64px",
        height: "38px",
        padding: "0 14px",
        fontSize: "13px",
        fontWeight: 500,
        background: "var(--c-surface)",
        color: "var(--c-text-secondary)",
        border: "1px solid var(--c-border-soft)",
        boxShadow: "var(--c-shadow-xs)",
      }}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
      <span>{isLight ? "Dark" : "Light"}</span>
    </button>
  );
}
