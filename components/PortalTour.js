// ============================================================
// PortalTour — controlled spotlight tour, zero dependencies.
//
// Renders three fixed overlays while `run` is true:
//   · a dark veil with a clip-path hole cut around the target
//   · a gold spot ring hugging the hole
//   · a coach card with title / desc / Next / Skip / progress dots
//
// steps: [{ target, title, desc, doit?, nextLabel? }]
//   target — a CSS selector (usually [data-tour='x']). Resolved
//   with document.querySelector at each step; missing or hidden
//   targets are SKIPPED, never crash.
//
// Finishing (Next on the last step) and skipping both write
// localStorage[storageKey] = "1" so the tour auto-runs only on
// the first visit. Every localStorage touch is try/catch'd.
// ============================================================

import { useEffect, useRef, useState } from "react";

// First-visit helper: returns [run, setRun]; flips run to true
// ~600ms after mount when storageKey has never been written.
export function useFirstVisitTour(storageKey) {
  const [run, setRun] = useState(false);
  useEffect(() => {
    let t;
    try {
      if (!window.localStorage.getItem(storageKey)) {
        t = setTimeout(() => setRun(true), 600);
      }
    } catch (e) {
      /* storage unavailable — never auto-run, never crash */
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [run, setRun];
}

const PAD = 8; // px of breathing room around the target rect
const CARD_W = 330;

export default function PortalTour({
  steps = [],
  storageKey,
  run,
  onClose,
  onFinish,
  labelPrefix = "Portal tour",
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const elRef = useRef(null); // current spotlighted element
  const timerRef = useRef(null);

  const markSeen = () => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch (e) {
      /* ignore */
    }
  };

  // display:contents wrappers generate no box of their own — descend
  // to the first child that actually has one so we can measure it.
  const boxOf = (el) => {
    let n = el;
    while (n && !n.getClientRects().length && n.firstElementChild) n = n.firstElementChild;
    return n && n.getClientRects().length ? n : null;
  };

  // Find the first step at or after `from` whose target exists AND
  // is actually laid out (display:none nav items report 0×0 — skip).
  const resolveFrom = (from) => {
    for (let j = from; j < steps.length; j++) {
      try {
        const el = document.querySelector(steps[j].target);
        const box = el && boxOf(el);
        if (box) return { j, el: box };
      } catch (e) {
        /* bad selector — treat as missing */
      }
    }
    return null;
  };

  const goTo = (from) => {
    const hit = resolveFrom(from);
    if (!hit) {
      // nothing left to show — behave like a skip
      markSeen();
      if (onClose) onClose();
      return;
    }
    setIdx(hit.j);
    elRef.current = hit.el;
    try {
      hit.el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (e) {
      /* older browsers */
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (elRef.current) setRect(elRef.current.getBoundingClientRect());
    }, 380);
  };

  useEffect(() => {
    if (!run) return undefined;
    setRect(null);
    goTo(0);
    const reposition = () => {
      if (elRef.current) setRect(elRef.current.getBoundingClientRect());
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  if (!run || !rect) return null;

  const total = steps.length;
  const step = steps[idx] || {};
  const isLast = idx >= total - 1;

  const next = () => {
    if (isLast) {
      markSeen();
      if (onFinish) onFinish();
      onClose();
      return;
    }
    goTo(idx + 1);
  };

  const skip = () => {
    markSeen();
    onClose();
  };

  // ── hole geometry ──
  const hL = rect.left - PAD;
  const hT = rect.top - PAD;
  const hR = rect.right + PAD;
  const hB = rect.bottom + PAD;
  const clip = `polygon(0% 0%, 0% 100%, ${hL}px 100%, ${hL}px ${hT}px, ${hR}px ${hT}px, ${hR}px ${hB}px, ${hL}px ${hB}px, ${hL}px 100%, 100% 100%, 100% 0%)`;

  // ── coach card position ──
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const coachLeft =
    rect.right + CARD_W + 20 < vw ? rect.right + 18 : Math.max(16, rect.left - (CARD_W + 20));
  const coachTop = Math.min(Math.max(16, rect.top), vh - 280);

  return (
    <>
      {/* veil with the spotlight hole */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5,4,2,0.72)",
          zIndex: 9998,
          clipPath: clip,
          WebkitClipPath: clip,
          transition: "clip-path .35s ease",
          pointerEvents: "none",
        }}
      />
      {/* spot ring */}
      <div
        style={{
          position: "fixed",
          left: hL,
          top: hT,
          width: hR - hL,
          height: hB - hT,
          border: "2px solid var(--c-brand-gold)",
          borderRadius: 14,
          boxShadow: "0 0 0 6px rgba(255,182,39,.15), 0 0 34px rgba(255,182,39,.25)",
          zIndex: 9999,
          pointerEvents: "none",
          transition: "all .35s ease",
        }}
      />
      {/* coach card */}
      <div
        role="dialog"
        aria-label={`${labelPrefix} step ${idx + 1} of ${total}`}
        style={{
          position: "fixed",
          left: coachLeft,
          top: coachTop,
          width: CARD_W,
          maxWidth: "90vw",
          background: "var(--c-surface)",
          border: "1px solid rgba(255,182,39,.4)",
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: "0 18px 50px rgba(0,0,0,.6)",
          zIndex: 10000,
          transition: "all .35s ease",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--c-brand-gold)",
          }}
        >
          {labelPrefix} · {idx + 1} of {total}
        </div>
        <div className="ds-display" style={{ fontSize: 16, marginTop: 6, color: "var(--c-text-primary)" }}>
          {step.title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.65, marginTop: 6, color: "var(--c-text-secondary)" }}>
          {step.desc}
        </div>
        {step.doit && (
          <div style={{ fontSize: 11, marginTop: 8, color: "var(--c-success)", fontWeight: 600 }}>
            ✦ {step.doit}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <button
            type="button"
            onClick={next}
            style={{
              background: "var(--c-mock-banner-btn-bg)",
              color: "var(--c-mock-banner-btn-fg)",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: 999,
              padding: "9px 22px",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {step.nextLabel || (isLast ? "Done ✓" : "Next →")}
          </button>
          <button
            type="button"
            onClick={skip}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              color: "var(--c-text-tertiary)",
              padding: 0,
            }}
          >
            Skip tour
          </button>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 5, alignItems: "center" }}>
            {steps.map((_, d) => (
              <i
                key={d}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  display: "inline-block",
                  background: d <= idx ? "var(--c-brand-gold)" : "var(--c-surface-muted)",
                }}
              />
            ))}
          </span>
        </div>
      </div>
    </>
  );
}
