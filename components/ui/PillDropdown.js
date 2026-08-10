// ============================================================
// PillDropdown — small shared filter pill with a simple
// absolutely-positioned menu. Used by History (ReviewHub) and
// the Mistake Vault filter line. No external lib.
//
// API:
//   <PillDropdown
//     label="Source"                 // caption before the value
//     value={fSource}                // matches option.value (null ok)
//     options={[{ value: null, label: "All" }, …]}
//     onChange={(value) => …}        // called with option.value
//   />
//
// Portal CSS vars only. Click outside / Escape closes.
// ============================================================

import { useEffect, useRef, useState } from "react";

export default function PillDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const opts = Array.isArray(options) ? options : [];
  const current = opts.find((o) => o.value === value) || opts[0] || { label: "All" };

  return (
    <span ref={rootRef} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12,
          fontWeight: 500,
          color: "var(--c-text-secondary)",
          background: "var(--c-surface)",
          border: "1px solid var(--c-border-faint)",
          borderRadius: 999,
          padding: "8px 14px",
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: "var(--c-shadow-xs)",
          whiteSpace: "nowrap",
        }}
      >
        {label}:{" "}
        <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>{current.label}</b>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block", transform: open ? "rotate(180deg)" : "none", transition: "transform 120ms" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 60,
            minWidth: 190,
            maxHeight: 280,
            overflowY: "auto",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 12,
            boxShadow: "var(--c-shadow-md, var(--c-shadow-xs))",
            padding: 6,
          }}
        >
          {opts.map((o, i) => {
            const selected = o.value === value;
            return (
              <button
                key={String(o.value)}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setOpen(false);
                  if (onChange) onChange(o.value);
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(-1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  fontSize: 12.5,
                  fontWeight: selected ? 600 : 500,
                  color: selected ? "var(--c-brand-gold)" : "var(--c-text-primary)",
                  background: selected
                    ? "var(--c-brand-gold-tint)"
                    : hover === i
                      ? "var(--c-surface-muted, var(--c-bg))"
                      : "transparent",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
                {o.count != null && (
                  <span style={{ fontSize: 11, color: selected ? "var(--c-brand-gold)" : "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                    {o.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
