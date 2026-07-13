// ============================================================
// XP chip — DSB Challenge Phase A.
// Floating pill in the top bar (left of the theme toggle) showing
// level + XP with a progress bar. Visible on every portal page so
// XP feels like a property of the whole product, not one screen.
// Clicking it opens the DSB Challenge section.
// Renders nothing until the RPC answers (and hides gracefully if
// the SQL functions haven't been installed yet).
// ============================================================

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useNMNContext } from "./NMNContext";
import { levelFromXp } from "./DSBChallenge";

export default function XPChip() {
  const { userDetails, setCTXSlug } = useNMNContext();
  const [xp, setXp] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!userDetails?.email) return;
    supabase
      .rpc("get_my_xp", { p_email: userDetails.email })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length) setXp(data[0]);
      });
  }, [userDetails?.email]);

  if (!mounted || xp == null) return null;

  const lvl = levelFromXp(xp.total_xp || 0);

  return (
    <button
      onClick={() => setCTXSlug("dsbchallenge")}
      title={`${lvl.name} — ${(xp.total_xp || 0).toLocaleString()} XP. Open DSB Challenge`}
      className="fixed z-30 hidden lg:inline-flex items-center gap-2 rounded-full transition-all hover:-translate-y-0.5"
      style={{
        top: "12px",
        right: "196px",
        height: "38px",
        padding: "0 14px",
        fontSize: "13px",
        fontWeight: 600,
        background: "var(--c-surface)",
        color: "var(--c-text-primary)",
        border: "1px solid var(--c-mock-banner-line)",
        boxShadow: "var(--c-shadow-xs)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span className="ds-display" style={{ color: "var(--c-brand-gold)", fontSize: 14 }}>
        Lv {lvl.level}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {(xp.total_xp || 0).toLocaleString()} XP
      </span>
      <span
        style={{
          width: 56,
          height: 5,
          borderRadius: 5,
          background: "var(--c-surface-sunken, var(--c-surface-muted))",
          overflow: "hidden",
          display: "inline-block",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${lvl.progress}%`,
            background: "var(--c-mock-banner-btn-bg)",
            borderRadius: 5,
          }}
        />
      </span>
    </button>
  );
}
