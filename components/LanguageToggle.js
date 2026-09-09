import { useLang } from "@/lib/lang";

/**
 * हिं/EN segmented pill — sits beside the floating ThemeToggle in the
 * top-right chrome (approved preview: preview-language-toggle.html).
 * Active segment gets the portal accent gradient with dark text; the
 * pill itself matches the theme toggle's surface/border/shadow.
 *
 * English is the default; Hinglish is the opt-in. Persisted per
 * device via lib/lang.js (localStorage "ipm-lang").
 */
export default function LanguageToggle() {
  const { lang, setLang } = useLang();

  const seg = (on) => ({
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
    padding: "8px 13px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    transition: "all .15s",
    background: on ? "var(--c-accent-grad)" : "transparent",
    color: on ? "#131316" : "var(--c-text-tertiary)",
  });

  return (
    <div
      role="group"
      aria-label="Language"
      className="fixed z-30 inline-flex items-center rounded-full"
      style={{
        top: "12px",
        right: "166px",
        height: "38px",
        padding: "3px",
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-soft)",
        boxShadow: "var(--c-shadow-xs)",
      }}
    >
      <button
        type="button"
        onClick={() => setLang("hi")}
        aria-pressed={lang === "hi"}
        aria-label="Hinglish"
        style={seg(lang === "hi")}
      >
        हिं
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        aria-label="English"
        style={seg(lang === "en")}
      >
        EN
      </button>
    </div>
  );
}
