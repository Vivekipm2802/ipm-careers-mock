// ============================================================
// UpsellModal — the portal-wide upgrade modal (2026-09).
// Mounted ONCE in DefaultLayout; opened from anywhere via
// lib/demo.openUpsell() (mock Unlock buttons, demo mentor
// booking, demo banner). Replaces the old "Please contact us to
// unlock" toast with an actual conversion surface:
//   primary   → WhatsApp (prefilled message → counsellor flow)
//   secondary → plans page on ipmcareer.com
// Also exports DemoBanner — the slim "you're in demo" strip shown
// only to the demo account.
// ============================================================

import { useEffect, useState } from "react";
import { X, Lock, MessageCircle, ArrowRight } from "lucide-react";
import { WHATSAPP_UPSELL_URL, PLANS_URL } from "@/lib/demo";

const PERKS = [
  "Every full mock — 100+ across IPMAT Indore, Rohtak, JIPMAT, Kozhikode & IIM Bangalore",
  "All real past-year papers as timed mocks, with the deep analytics report after every attempt",
  "Live classes, recordings and class notes from IIM-alumni faculty",
  "1-on-1 mentor sessions, doubt solving and the daily skill trainers",
];

export default function UpsellModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fire = () => setOpen(true);
    window.addEventListener("ipm:upsell", fire);
    return () => window.removeEventListener("ipm:upsell", fire);
  }, []);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 470, width: "100%", background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 20, padding: "26px 26px 22px", position: "relative", boxShadow: "0 18px 60px rgba(0,0,0,0.35)" }}
      >
        <button
          onClick={() => setOpen(false)}
          style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", padding: 4 }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", marginBottom: 14 }}>
          <Lock size={20} />
        </div>
        <div className="ds-display" style={{ fontSize: 22, lineHeight: 1.2, color: "var(--c-text-primary)" }}>
          Unlock the full <span className="ds-grad-text">IPM Careers</span> portal
        </div>
        <ul style={{ margin: "14px 0 4px", padding: 0, listStyle: "none" }}>
          {PERKS.map((p) => (
            <li key={p} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, lineHeight: 1.55, color: "var(--c-text-secondary)", marginBottom: 8 }}>
              <span style={{ color: "var(--c-brand-gold)", fontWeight: 800, flexShrink: 0 }}>✓</span>
              {p}
            </li>
          ))}
        </ul>
        <a
          href={WHATSAPP_UPSELL_URL}
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, padding: "13px 18px", borderRadius: 999, background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
        >
          <MessageCircle size={16} /> WhatsApp us — instant reply
        </a>
        <a
          href={PLANS_URL}
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 9, padding: "11px 18px", borderRadius: 999, background: "transparent", border: "1px solid var(--c-border-soft)", color: "var(--c-text-secondary)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
        >
          See plans & pricing <ArrowRight size={14} />
        </a>
        <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", textAlign: "center", marginTop: 10 }}>
          Talk to an IIM-alumni mentor before you decide — the call is free.
        </div>
      </div>
    </div>
  );
}

// Slim persistent strip for the demo account only.
export function DemoBanner() {
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "8px 14px", background: "var(--c-brand-gold-tint)", borderBottom: "1px solid var(--c-border-faint)", fontSize: 12.5, color: "var(--c-text-secondary)", flexWrap: "wrap" }}
    >
      <span>
        You&apos;re exploring the <b style={{ color: "var(--c-brand-gold)" }}>demo portal</b> as a sample student.
      </span>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("ipm:upsell", { detail: { source: "banner" } }))}
        style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", border: "none", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
      >
        Unlock full access →
      </button>
    </div>
  );
}
