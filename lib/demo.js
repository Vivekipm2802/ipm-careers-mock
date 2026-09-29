// ============================================================
// lib/demo.js — demo-portal identity + the shared upsell trigger
// (2026-09 demo-that-sells project).
//
// The demo experience is the REAL portal signed in as the demo
// account below — no forked pages (the old /demo fork rotted and
// was retired). Anything demo-specific keys off this email.
//
// openUpsell(source) fires the global upgrade modal (mounted once
// in DefaultLayout) — used by the mock Unlock buttons, demo
// mentor booking, and the demo banner. It serves ALL free
// students, not just the demo account.
// ============================================================

export const DEMO_EMAIL = "slee23137@gmail.com";

export function isDemoEmail(email) {
  return String(email || "").toLowerCase() === DEMO_EMAIL;
}

export const WHATSAPP_UPSELL_URL =
  "https://wa.me/918299470392?text=" +
  encodeURIComponent(
    "Hi! I explored the IPM Careers portal and want to unlock full access. Please share the details."
  );

export const PLANS_URL = "https://ipmcareer.com/courses/";

export function openUpsell(source) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ipm:upsell", { detail: { source: source || "generic" } }));
}
