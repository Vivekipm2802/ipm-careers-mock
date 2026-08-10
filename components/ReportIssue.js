// ============================================================
// Report an issue — D4 student-facing question report (per the
// approved preview-result-coaching.html popover).
//
// Self-contained: a quiet link under a reviewed question opens an
// inline popover (four fixed radio reasons + optional note); Send
// inserts into question_reports (RLS: "user" = auth.email()) and
// collapses to a quiet "Report sent ✓". A duplicate report is
// treated as success — the student's point was already made.
//
// Used by the concept result page (source 'bank') and the mock
// result page (source 'mock'). All hooks live at the top, and the
// only early return sits BELOW them — safe hook order by
// construction.
// ============================================================

import { useState } from "react";
import { Check, Flag } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";

export const REPORT_REASONS = [
  "The answer looks wrong",
  "Question has an error",
  "Options are confusing",
  "Doesn't display properly",
];

// Presentational popover — exported separately so the render checks
// can exercise the OPEN state without simulating clicks.
export function ReportPopover({ reason, setReason, note, setNote, busy, onSend }) {
  return (
    <div
      style={{
        maxWidth: 340,
        margin: "10px 0 0 auto",
        padding: "16px 18px",
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 14,
        boxShadow: "var(--c-shadow-xs)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--c-text-primary)" }}>
        Report this question
      </div>
      {REPORT_REASONS.map((r) => (
        <div
          key={r}
          onClick={() => setReason(r)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "6px 0",
            fontSize: 12.5,
            cursor: "pointer",
            color: reason === r ? "var(--c-text-primary)" : "var(--c-text-secondary)",
          }}
        >
          <span
            style={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              flexShrink: 0,
              boxSizing: "border-box",
              border: reason === r ? "4.5px solid var(--c-brand-gold)" : "1.5px solid var(--c-border-soft)",
            }}
          />
          {r}
        </div>
      ))}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Tell us what you found (optional)…"
        style={{
          width: "100%",
          marginTop: 8,
          border: "1px solid var(--c-border-faint)",
          borderRadius: 10,
          background: "var(--c-surface-muted, var(--c-bg))",
          color: "var(--c-text-primary)",
          fontFamily: "inherit",
          fontSize: 12,
          padding: "9px 11px",
          resize: "vertical",
          minHeight: 52,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={busy}
        style={{
          display: "inline-block",
          marginTop: 10,
          background: "var(--c-brand-gold)",
          color: "var(--c-surface)",
          borderRadius: 999,
          padding: "8px 18px",
          fontSize: 12,
          fontWeight: 600,
          border: "none",
          cursor: busy ? "default" : "pointer",
          fontFamily: "inherit",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Sending…" : "Send report"}
      </button>
      <div style={{ fontSize: 10.5, color: "var(--c-text-tertiary)", marginTop: 8, lineHeight: 1.5 }}>
        Goes straight to our review team — every question here is AI-checked and mentor-approved, and
        reports get looked at within a day.
      </div>
    </div>
  );
}

export default function ReportIssue({ source, questionId, user }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Below every hook — no viewer identity means no reporting.
  if (!user || questionId == null) return null;

  const send = async () => {
    if (busy) return;
    setBusy(true);
    // AWAITED on purpose — supabase builders only run when awaited.
    const { error } = await supabase.from("question_reports").insert({
      user,
      source,
      question_id: questionId,
      reason,
      note: note.trim() ? note.trim() : null,
    });
    // A duplicate report is still a delivered report.
    if (!error || /duplicate|unique/i.test(error.message || "")) {
      setSent(true);
      setOpen(false);
    }
    setBusy(false);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {sent ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              color: "var(--c-success)",
              fontWeight: 500,
            }}
          >
            <Check size={12} /> Report sent ✓
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              color: "var(--c-text-tertiary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            <Flag size={12} /> Report an issue
          </button>
        )}
      </div>
      {open && !sent && (
        <ReportPopover
          reason={reason}
          setReason={setReason}
          note={note}
          setNote={setNote}
          busy={busy}
          onSend={send}
        />
      )}
    </div>
  );
}
