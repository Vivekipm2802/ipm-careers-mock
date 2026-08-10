// ============================================================
// Question Audit — admin-only quality control dashboard.
//
// Why: a past typist introduced wrong answers into the question
// bank. /api/audit/run makes Gemini solve every question
// independently and flag mismatches / broken text; this screen
// runs the audit and works the review queue.
//
// The browser NEVER reads question_audits directly (RLS on, no
// policies) — everything flows through the admin-guarded
// /api/audit/status | run | resolve routes.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/utils/authHeaders";
import { toast } from "react-hot-toast";
import { ShieldCheck, Play, Square, Check, X, Sparkles } from "lucide-react";

const card = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 16,
  boxShadow: "var(--c-shadow-xs)",
  flexShrink: 0,
};

const kicker = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--c-brand-gold)",
  marginBottom: 8,
};

const goldBtn = (disabled) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--c-brand-gold)",
  color: "var(--c-surface)",
  fontWeight: 600,
  fontSize: 13.5,
  borderRadius: 999,
  padding: "11px 24px",
  border: "none",
  cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit",
  opacity: disabled ? 0.55 : 1,
  flexShrink: 0,
});

const ghostBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "transparent",
  color: "var(--c-text-secondary)",
  fontWeight: 600,
  fontSize: 12.5,
  borderRadius: 999,
  padding: "9px 18px",
  border: "1px solid var(--c-border-faint)",
  cursor: "pointer",
  fontFamily: "inherit",
};

// AI answers arrive canonically as "B — option text" (run.js).
// Map back to an option index: letter first, title equality fallback.
export function aiOptionIndex(aiAnswer, options) {
  if (!aiAnswer || !Array.isArray(options) || options.length === 0) return -1;
  const raw = String(aiAnswer).trim();
  const m = raw.match(/^\(?([A-Za-z])\)?\s*(?:[—–\-.:)]|$)/);
  if (m) {
    const idx = m[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < options.length) return idx;
  }
  const norm = (s) =>
    String(s ?? "")
      .replace(/<[^>]*>/g, " ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const body = norm(raw.replace(/^\(?[A-Za-z]\)?\s*[—–\-.:)]\s*/, ""));
  const target = body || norm(raw);
  if (!target) return -1;
  return options.findIndex((o) => norm(o && (o.title ?? o.text)) === target);
}

// Queue rows carry a nested question object from status.js, but be
// tolerant of flat rows (and of the render-test harness's samples).
function qOf(item) {
  const q = item && item.question;
  if (q && typeof q === "object" && !Array.isArray(q)) return q;
  return {
    html: typeof q === "string" ? q : "",
    image: (item && item.questionimage) || null,
    type: (item && item.type) || (Array.isArray(item && item.options) ? "options" : "input"),
    options: Array.isArray(item && item.options) ? item.options : null,
    answer: (item && item.answer) || null,
    chapter: (item && item.chapter) || null,
    test: (item && item.test_title) || null,
  };
}

const VERDICT_STYLE = {
  mismatch: { label: "WRONG ANSWER?", color: "var(--c-danger)", bg: "var(--c-danger-soft, rgba(248,113,113,0.14))" },
  broken: { label: "BROKEN", color: "var(--c-danger)", bg: "var(--c-danger-soft, rgba(248,113,113,0.14))" },
  unclear: { label: "UNCLEAR", color: "var(--c-brand-gold)", bg: "var(--c-brand-gold-tint)" },
};

export default function QuestionAudit() {
  const [status, setStatus] = useState(undefined); // {totals} from /api/audit/status
  const [queue, setQueue] = useState([]); // flagged, unreviewed audits
  const [reports, setReports] = useState([]); // D4: open student question_reports
  const [run, setRun] = useState({ active: null, audited: 0, flagged: 0, total: null, error: null });
  const [acting, setActing] = useState(null); // auditId mid-resolve
  const [reportActing, setReportActing] = useState(null); // reportId mid-resolve
  const stopRef = useRef(false);

  const totals = status && typeof status === "object" && !Array.isArray(status) && status.totals ? status.totals : null;
  const runState = run && typeof run === "object" && !Array.isArray(run) ? run : {};
  const rows = Array.isArray(queue) ? queue : [];

  const refreshStatus = async () => {
    try {
      const headers = (await getAuthHeaders()) || {};
      const r = await fetch("/api/audit/status", { headers });
      if (!r || !r.json) return;
      const j = await r.json();
      if (j && j.totals) {
        setStatus(j);
        setQueue(Array.isArray(j.queue) ? j.queue : []);
        setReports(Array.isArray(j.reports) ? j.reports : []);
      }
    } catch (e) {
      /* status is decorative — never crash the screen */
    }
  };

  useEffect(() => {
    refreshStatus();
    return () => {
      stopRef.current = true; // leaving the tab stops the loop
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loop /api/audit/run until nothing remains or the admin stops it.
  // Thousands of questions = hours; the loop just keeps going while
  // the tab is open, and the server cursor means stopping is always
  // safe — the next run resumes exactly where this one ended.
  const runAudit = async (source) => {
    if (runState.active) return;
    stopRef.current = false;
    let audited = 0;
    let flagged = 0;
    setRun({ active: source, audited: 0, flagged: 0, total: null, error: null });
    try {
      while (!stopRef.current) {
        const headers = (await getAuthHeaders()) || {};
        const r = await fetch("/api/audit/run", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ source, batchSize: 5 }),
        });
        let j = null;
        try {
          j = await r.json();
        } catch (e) {
          j = null;
        }
        if (!r.ok || !j) {
          setRun((p) => ({ ...(p || {}), error: (j && j.error) || "Run failed — check the audit table + GEMINI_API_KEY." }));
          break;
        }
        audited += Number(j.processed) || 0;
        flagged += Number(j.flagged) || 0;
        const remaining = Number(j.remaining_estimate) || 0;
        setRun({ active: source, audited, flagged, total: audited + remaining, error: null });
        if (!j.processed || remaining <= 0) break;
      }
    } catch (e) {
      setRun((p) => ({ ...(p || {}), error: "Network hiccup — hit the button again, it resumes where it stopped." }));
    }
    stopRef.current = false;
    setRun((p) => ({ ...(p && typeof p === "object" && !Array.isArray(p) ? p : {}), active: null }));
    refreshStatus();
  };

  const act = async (item, action) => {
    if (!item || acting) return;
    setActing(item.id);
    try {
      const headers = (await getAuthHeaders()) || {};
      const r = await fetch("/api/audit/resolve", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ auditId: item.id, action }),
      });
      let j = null;
      try {
        j = await r.json();
      } catch (e) {
        j = null;
      }
      if (!r.ok) {
        try {
          toast.error((j && j.error) || "Action failed");
        } catch (e2) {}
      } else {
        setQueue((prev) => (Array.isArray(prev) ? prev.filter((x) => x && x.id !== item.id) : []));
        refreshStatus();
      }
    } catch (e) {
      try {
        toast.error("Action failed — try again");
      } catch (e2) {}
    }
    setActing(null);
  };

  // D4: mark one student report handled (question_reports.resolved = true).
  const resolveReport = async (item) => {
    if (!item || reportActing) return;
    setReportActing(item.id);
    try {
      const headers = (await getAuthHeaders()) || {};
      const r = await fetch("/api/audit/resolve", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: item.id, action: "resolve_report" }),
      });
      let j = null;
      try {
        j = await r.json();
      } catch (e) {
        j = null;
      }
      if (!r.ok) {
        try {
          toast.error((j && j.error) || "Could not resolve the report");
        } catch (e2) {}
      } else {
        setReports((prev) => (Array.isArray(prev) ? prev.filter((x) => x && x.id !== item.id) : []));
      }
    } catch (e) {
      try {
        toast.error("Could not resolve the report — try again");
      } catch (e2) {}
    }
    setReportActing(null);
  };

  const fmt = (n) => (typeof n === "number" && isFinite(n) ? n.toLocaleString("en-IN") : "—");
  const running = runState.active;
  const reportRows = Array.isArray(reports) ? reports : [];
  // plain-text snippet of a question's html for the reports list
  const snippetOf = (html) =>
    String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {/* ── header ── */}
      <header className="mt-10" style={{ flexShrink: 0 }}>
        <div style={kicker}>Quality Control</div>
        <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08 }}>
          Every question, <span className="ds-accent ds-grad-text">verified.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.6, maxWidth: 720 }}>
          AI solves every question in the bank independently — no peeking at the marked answer — and flags anything
          that doesn&apos;t add up. You make the final call on every flag.
        </p>
      </header>

      {/* ── stat strip ── */}
      <div className="grid gap-4 mt-7 max-w-[1000px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", flexShrink: 0 }}>
        {[
          ["Bank audited", totals ? `${fmt(totals.bankAudited)} / ${fmt(totals.bankTotal)}` : "—"],
          ["Flagged for review", totals ? fmt(totals.flagged) : "—"],
          ["Fixed", totals ? fmt(totals.fixed) : "—"],
          ["PYQ audited", totals ? `${fmt(totals.pyqAudited)} / ${fmt(totals.pyqTotal)}` : "—"],
        ].map(([label, value]) => (
          <div key={label} style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-tertiary)" }}>
              {label}
            </div>
            <div className="ds-stat-value" style={{ fontSize: 26, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── run panel ── */}
      <div className="mt-5 max-w-[1000px]" style={{ ...card, padding: "20px 24px" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => runAudit("bank")} disabled={!!running} style={goldBtn(!!running)}>
            {running === "bank" ? <Sparkles size={15} /> : <Play size={15} />}
            {running === "bank" ? "Auditing bank…" : "Audit bank"}
          </button>
          <button type="button" onClick={() => runAudit("pyq")} disabled={!!running} style={goldBtn(!!running)}>
            {running === "pyq" ? <Sparkles size={15} /> : <Play size={15} />}
            {running === "pyq" ? "Auditing PYQs…" : "Audit PYQs"}
          </button>
          {running ? (
            <button type="button" onClick={() => { stopRef.current = true; }} style={ghostBtn}>
              <Square size={13} /> Stop
            </button>
          ) : null}
        </div>
        {running ? (
          <div className="mt-3" style={{ fontSize: 13, color: "var(--c-text-secondary)" }}>
            Audited <b style={{ color: "var(--c-text-primary)" }}>{fmt(runState.audited)}</b>
            {runState.total ? <> of ~<b style={{ color: "var(--c-text-primary)" }}>{fmt(runState.total)}</b></> : null}
            {" · "}
            <b style={{ color: "var(--c-danger)" }}>{fmt(runState.flagged)}</b> flagged this run
          </div>
        ) : null}
        {runState.error ? (
          <div className="mt-3" style={{ fontSize: 13, color: "var(--c-danger)" }}>{runState.error}</div>
        ) : null}
        <div className="mt-3" style={{ fontSize: 12, color: "var(--c-text-tertiary)", lineHeight: 1.6 }}>
          Runs in small batches and saves after each one — a full bank can take hours, so keep this tab open while it
          works. Stop anytime; the next run resumes exactly where it left off. Nothing is changed until you approve a
          fix below.
        </div>
      </div>

      {/* ── review queue ── */}
      <div className="mt-8 max-w-[1000px]" style={{ flexShrink: 0 }}>
        <div style={kicker}>Review queue{rows.length ? ` · ${rows.length}` : ""}</div>
        {rows.length === 0 ? (
          <div style={{ ...card, padding: "26px 24px" }}>
            <div className="flex items-center gap-3">
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <ShieldCheck size={19} />
              </span>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                  {totals && totals.bankAudited + totals.pyqAudited > 0 ? "Nothing waiting on you." : "No audits yet."}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--c-text-secondary)", marginTop: 2 }}>
                  {totals && totals.bankAudited + totals.pyqAudited > 0
                    ? "Every flagged question has been reviewed. Run the audit again after new questions are added."
                    : "Hit Audit bank to make the AI proof-solve the entire question bank."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((item, i) => {
              if (!item) return null;
              const q = qOf(item);
              const opts = Array.isArray(q.options) ? q.options : null;
              const aiIdx = opts ? aiOptionIndex(item.ai_answer, opts) : -1;
              const isBankMcq = (item.source || "bank") === "bank" && opts && opts.length > 0;
              const canAccept = isBankMcq && aiIdx >= 0 && !!item.ai_answer;
              const v = VERDICT_STYLE[item.verdict] || VERDICT_STYLE.unclear;
              return (
                <div key={item.id ?? i} style={{ ...card, padding: "20px 24px" }}>
                  {/* tags line */}
                  <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em" }}>
                    <span style={{ borderRadius: 999, padding: "4px 10px", background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)" }}>
                      {String(item.source || "bank").toUpperCase()}
                    </span>
                    <span style={{ borderRadius: 999, padding: "4px 10px", background: v.bg, color: v.color }}>{v.label}</span>
                    {q.chapter || q.test ? (
                      <span style={{ fontWeight: 500, letterSpacing: 0, fontSize: 12, color: "var(--c-text-tertiary)" }}>
                        {[q.chapter, q.test].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    <span style={{ marginLeft: "auto", fontWeight: 500, letterSpacing: 0, fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                      #{item.question_id ?? "—"}
                    </span>
                  </div>

                  {/* question body */}
                  <div
                    className="qforce qcontent mt-3"
                    style={{ fontSize: 14, lineHeight: 1.65 }}
                    dangerouslySetInnerHTML={{ __html: String(q.html || "") }}
                  />
                  {q.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={q.image} alt="question attachment" className="mt-2" style={{ maxWidth: 320, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
                  ) : null}

                  {/* options / answers */}
                  {opts ? (
                    <div className="flex flex-col gap-2 mt-4">
                      {opts.map((o, oi) => {
                        const marked = !!(o && (o.isCorrect ?? o.is_correct));
                        const aiPick = oi === aiIdx;
                        return (
                          <div
                            key={oi}
                            className="flex items-start gap-3"
                            style={{
                              borderRadius: 12,
                              padding: "10px 14px",
                              fontSize: 13.5,
                              border: aiPick
                                ? "1.5px solid var(--c-success)"
                                : marked
                                ? "1.5px solid var(--c-brand-gold)"
                                : "1px solid var(--c-border-faint)",
                              background: aiPick
                                ? "var(--c-success-soft, rgba(74,222,128,0.12))"
                                : marked
                                ? "var(--c-brand-gold-tint)"
                                : "transparent",
                            }}
                          >
                            <b style={{ flexShrink: 0, color: aiPick ? "var(--c-success)" : marked ? "var(--c-brand-gold)" : "var(--c-text-tertiary)" }}>
                              {String.fromCharCode(65 + oi)}.
                            </b>
                            <span className="qforce" style={{ minWidth: 0 }} dangerouslySetInnerHTML={{ __html: String((o && (o.title ?? o.text)) ?? "") }} />
                            <span className="flex gap-2" style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>
                              {marked ? <span style={{ color: "var(--c-brand-gold)" }}>MARKED</span> : null}
                              {aiPick ? <span style={{ color: "var(--c-success)" }}>AI PICK</span> : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mt-4" style={{ fontSize: 13.5 }}>
                      <div style={{ borderRadius: 12, padding: "10px 14px", border: "1.5px solid var(--c-brand-gold)", background: "var(--c-brand-gold-tint)" }}>
                        <b style={{ color: "var(--c-brand-gold)", fontSize: 10.5, letterSpacing: "0.06em" }}>MARKED ANSWER</b>
                        <div className="mt-1">{item.marked_answer || q.answer || "— (none stored — text check only)"}</div>
                      </div>
                      {item.ai_answer ? (
                        <div style={{ borderRadius: 12, padding: "10px 14px", border: "1.5px solid var(--c-success)", background: "var(--c-success-soft, rgba(74,222,128,0.12))" }}>
                          <b style={{ color: "var(--c-success)", fontSize: 10.5, letterSpacing: "0.06em" }}>AI ANSWER</b>
                          <div className="mt-1">{item.ai_answer}</div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* AI note */}
                  {item.note || item.ai_answer ? (
                    <div className="mt-3" style={{ fontSize: 12.5, color: "var(--c-text-secondary)", lineHeight: 1.6 }}>
                      {item.ai_answer && opts ? (
                        <>AI solved it as <b style={{ color: "var(--c-text-primary)" }}>{item.ai_answer}</b>{item.note ? " · " : ""}</>
                      ) : null}
                      {item.note || ""}
                      {item.model ? <span style={{ color: "var(--c-text-tertiary)" }}> · {item.model}</span> : null}
                    </div>
                  ) : null}

                  {/* actions */}
                  <div className="flex items-center gap-2 flex-wrap mt-4">
                    {canAccept ? (
                      <button type="button" onClick={() => act(item, "accept_ai")} disabled={!!acting} style={goldBtn(!!acting)}>
                        <Check size={14} /> Accept AI answer
                      </button>
                    ) : null}
                    <button type="button" onClick={() => act(item, "keep")} disabled={!!acting} style={ghostBtn}>
                      Marked answer is right
                    </button>
                    <button
                      type="button"
                      onClick={() => act(item, "dismiss")}
                      disabled={!!acting}
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--c-text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5, padding: "9px 10px" }}
                    >
                      <X size={13} /> Dismiss
                    </button>
                    {(item.source || "bank") === "pyq" ? (
                      <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                        PYQ fixes are manual — edit in the PYQ Manager, then dismiss.
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── D4: student reports — "Report an issue" from the result pages ── */}
      <div className="mt-8 max-w-[1000px]" style={{ flexShrink: 0 }}>
        <div style={kicker}>Student reports{reportRows.length ? ` · ${reportRows.length}` : ""}</div>
        {reportRows.length === 0 ? (
          <div style={{ ...card, padding: "22px 24px" }}>
            <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>
              No open reports. Students see a &quot;Report an issue&quot; link under every reviewed
              question — anything they flag lands here.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reportRows.map((item, i) => {
              if (!item) return null;
              const snippet = snippetOf(item.question && item.question.html);
              return (
                <div key={item.id ?? i} style={{ ...card, padding: "16px 20px" }}>
                  <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em" }}>
                    <span style={{ borderRadius: 999, padding: "4px 10px", background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)" }}>
                      {String(item.reason || "Report").toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 500, letterSpacing: 0, fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                      {String(item.source || "bank").toUpperCase()} · #{item.question_id ?? "—"}
                    </span>
                    <span style={{ marginLeft: "auto", fontWeight: 500, letterSpacing: 0, fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                        : "—"}
                    </span>
                  </div>
                  {snippet ? (
                    <div className="mt-2" style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--c-text-primary)" }}>
                      {snippet}
                      {snippet.length >= 140 ? "…" : ""}
                    </div>
                  ) : (
                    <div className="mt-2" style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
                      Question no longer exists (deleted since the report).
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-3 flex-wrap" style={{ fontSize: 12, color: "var(--c-text-secondary)" }}>
                    <span>{item.user || "—"}</span>
                    {item.note ? <span style={{ fontStyle: "italic" }}>&ldquo;{item.note}&rdquo;</span> : null}
                    <button
                      type="button"
                      onClick={() => resolveReport(item)}
                      disabled={!!reportActing}
                      style={{ ...ghostBtn, marginLeft: "auto", opacity: reportActing === item.id ? 0.6 : 1 }}
                    >
                      <Check size={13} /> Resolved
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ height: 40, flexShrink: 0 }} />
    </div>
  );
}
