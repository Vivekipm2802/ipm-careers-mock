// ============================================================
// lib/lang.js — portal-wide language switch (Hinglish ⇄ English).
//
// Owner decision (Sep 2026): ENGLISH is the default; Hinglish is
// the opt-in. Choice persists per device in localStorage under
// "ipm-lang" ("en" | "hi"; default "en" when unset). No pre-paint
// script needed — this flips copy, not colors (unlike ipm-theme).
//
// API — ONE clean shape, used everywhere:
//   const { lang, setLang, t } = useLang();
//   t("<hinglish>", "<english>")  → picks by current lang.
// Inline-pair t(hi, en) keeps translations next to the copy they
// translate — no giant key registry to drift out of sync.
//
// Implementation: useSyncExternalStore over localStorage + a
// custom window event, so EVERY mounted component that calls
// useLang() re-renders the moment the toggle flips — no context
// provider to thread through _app/NMNContext. SSR + first client
// (hydration) render always see "en" (getServerSnapshot), then
// React syncs to the stored choice right after mount.
// ============================================================

import { useCallback, useSyncExternalStore } from "react";

const KEY = "ipm-lang";
const EVT = "ipm-lang-change";

export function getLang() {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "hi" ? "hi" : "en";
  } catch (e) {
    return "en";
  }
}

export function setLang(next) {
  const v = next === "hi" ? "hi" : "en";
  try {
    window.localStorage.setItem(KEY, v);
  } catch (e) {
    // storage may be unavailable (private mode) — event still fires,
    // so the choice works for this page-load at least.
  }
  window.dispatchEvent(new Event(EVT));
}

// Pure helper (unit-tested in scripts/ssr-check.js): pick the string
// for an explicit lang. useLang()'s t() is this, curried on lang.
export function pick(lang, hi, en) {
  return lang === "hi" ? hi : en;
}

function subscribe(cb) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb); // cross-tab sync for free
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getServerSnapshot() {
  return "en";
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, getLang, getServerSnapshot);
  const t = useCallback((hi, en) => (lang === "hi" ? hi : en), [lang]);
  return { lang, setLang, t };
}
