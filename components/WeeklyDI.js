// ============================================================
// Weekly DI — one Data Interpretation set per week (resets
// Monday). Replaces Duels in the DSB trainer lineup (2026-09).
//
// Flow: intro card → the week's set (table/caselet + 5 MCQs,
// no instant feedback) → submit all → scored summary with
// explanations → run banked to trainer_runs (trainer:
// "weekly-di", score = correct count) → +40 XP. For the rest
// of the ISO week the trainer reopens in read-only review of
// the banked run — same no-re-attempt rule as the daily
// trainers, just on a weekly clock.
//
// Set rotation: seeded no-repeat cycle over the 12-set bank
// (weeklyDIBank.js), cloned from Gulp's passage rotation —
// mulberry32/cycleOrder are imported from GulpProtocol so the
// shuffle math stays identical. weekNumberFor is Monday-
// anchored (ISO-style): every student worldwide sees the same
// set for the same week, and no set repeats until all 12 have
// run.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, XCircle } from "lucide-react";
import DI_SETS from "./weeklyDIBank";
import { supabase } from "@/utils/supabaseClient";
import { saveRunWithReport } from "@/lib/trainerReport";
import { mulberry32, cycleOrder } from "./GulpProtocol";

export const XP_PER_RUN = 40;

// ── Week math (pure, exported for checks) ───────────────────────
// Day number in UTC days; Jan 1 1970 was a Thursday, so +3 shifts
// the boundary to Monday 00:00 local-date.
export function dayNumberFor(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
export function weekNumberFor(date = new Date()) {
  return Math.floor((dayNumberFor(date) + 3) / 7);
}
export function setIndexForWeek(weekNumber, n) {
  if (!n) return 0;
  const w = Math.floor(weekNumber);
  const cycle = Math.floor(w / n);
  const step = ((w % n) + n) % n;
  return cycleOrder(n, cycle)[step];
}
// Monday 00:00 of the current week, for the "already ran this
// week?" query.
export function startOfWeekISO(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// keep the import "used" for tree-shakers even though cycleOrder
// already pulls it in transitively
void mulberry32;

export default function WeeklyDI({ userData, onExit }) {
  const set = DI_SETS[setIndexForWeek(weekNumberFor(), DI_SETS.length)];
  const [phase, setPhase] = useState("loading"); // loading | intro | run | done
  const [picked, setPicked] = useState({}); // qIndex -> option index
  const [banked, setBanked] = useState(null); // this week's saved run (review mode)
  const startRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  // ── Already banked this week? → read-only review ──────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userData?.email) {
        setPhase("intro");
        return;
      }
      const { data } = await supabase
        .from("trainer_runs")
        .select("id, created_at, score, details")
        .eq("user", userData.email)
        .eq("trainer", "weekly-di")
        .gte("created_at", startOfWeekISO())
        .order("created_at", { ascending: false })
        .limit(1);
      if (!alive) return;
      if (data?.length) {
        const row = data[0];
        const report = row.details?.report || null;
        setBanked({ score: row.score, report });
        // rebuild picks for the summary if the report has them
        if (report?.set_id === set.id && Array.isArray(report.items)) {
          const p = {};
          report.items.forEach((it) => {
            if (it && it.picked != null) p[it.i] = it.picked;
          });
          setPicked(p);
        }
        setElapsed(report?.seconds || 0);
        setPhase("done");
      } else {
        setPhase("intro");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userData?.email, set.id]);

  const allAnswered = set.questions.every((_, i) => picked[i] != null);
  const rightCount = set.questions.reduce((n, qq, i) => n + (picked[i] === qq.a ? 1 : 0), 0);

  const begin = () => {
    startRef.current = Date.now();
    setPhase("run");
  };

  const submit = async () => {
    const secs = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0;
    setElapsed(secs);
    setPhase("done");
    if (userData?.email && !banked) {
      await saveRunWithReport({
        email: userData.email,
        trainer: "weekly-di",
        score: rightCount,
        details: { set_id: set.id, seconds: secs },
        report: {
          v: 1,
          week: weekNumberFor(),
          set_id: set.id,
          score: rightCount,
          seconds: secs,
          items: set.questions.map((_, i) => ({ i, picked: picked[i] ?? null })),
        },
      });
      setBanked({ score: rightCount, report: null });
    }
  };

  const card = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: 16,
    boxShadow: "var(--c-shadow-xs)",
  };

  const DataBlock = () => (
    <div className="rounded-[12px] p-4 md:p-5" style={{ background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)" }}>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--c-text-secondary)", margin: 0 }}>{set.intro}</p>
      {set.table && (
        <div className="overflow-x-auto mt-4">
          <table style={{ borderCollapse: "collapse", fontSize: 13.5, minWidth: 320 }}>
            <thead>
              <tr>
                {set.table.head.map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "2px solid var(--c-border-faint)", color: "var(--c-text-primary)", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {set.table.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} style={{ padding: "8px 16px", borderBottom: "1px solid var(--c-border-faint)", color: ci === 0 ? "var(--c-text-primary)" : "var(--c-text-secondary)", fontWeight: ci === 0 ? 600 : 400, whiteSpace: "nowrap" }}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const BackBtn = () => (
    <button type="button" onClick={onExit} className="inline-flex items-center gap-1.5 mb-4" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", fontSize: 13, fontWeight: 600, padding: 0, fontFamily: "inherit" }}>
      <ArrowLeft size={15} /> Back to missions
    </button>
  );

  if (phase === "loading") {
    return (
      <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
        <div className="mt-10 max-w-[760px]">
          <BackBtn />
          <div className="p-6" style={card}>
            <span style={{ fontSize: 13.5, color: "var(--c-text-tertiary)" }}>Loading this week's set…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Intro ─────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
        <div className="mt-10 max-w-[760px]">
          <BackBtn />
          <div className="p-6 md:p-7" style={card}>
            <div className="inline-flex items-center gap-2 mb-3" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
              <BarChart3 size={15} /> Weekly DI · resets Monday
            </div>
            <h2 className="ds-display" style={{ fontSize: 26 }}>{set.title}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--c-text-secondary)", marginTop: 10 }}>
              One Data Interpretation set drops every week — a table or caselet with 5 questions on it.
              Read the data first, then work through all five. No feedback until you submit, exactly like
              the real exam. One attempt per week; after that this page shows your review.
            </p>
            <ul style={{ fontSize: 13.5, lineHeight: 1.9, color: "var(--c-text-secondary)", marginTop: 10, paddingLeft: 18 }}>
              <li>5 questions on one data set — answer all, then submit.</li>
              <li>No negative marking here. Accuracy first, speed next.</li>
              <li>Banked run earns <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>. A fresh set arrives Monday.</li>
            </ul>
            <button type="button" onClick={begin} className="mt-5 inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Start this week's set <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Run ───────────────────────────────────────────────────────
  if (phase === "run") {
    return (
      <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
        <div className="mt-10 mb-16 max-w-[760px]">
          <BackBtn />
          <div className="p-6 md:p-7" style={card}>
            <div className="inline-flex items-center gap-2 mb-3" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
              <BarChart3 size={15} /> {set.title}
            </div>
            <DataBlock />
            {set.questions.map((qq, i) => (
              <div key={i} className="mt-6">
                <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.6 }}>
                  <span style={{ color: "var(--c-text-tertiary)", marginRight: 8 }}>Q{i + 1}.</span>
                  {qq.q}
                </div>
                <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  {qq.o.map((opt, oi) => {
                    const on = picked[i] === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setPicked((p) => ({ ...p, [i]: oi }))}
                        style={{
                          textAlign: "left",
                          fontSize: 13.5,
                          lineHeight: 1.5,
                          padding: "10px 14px",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          border: on ? "1.5px solid var(--c-brand-gold)" : "1px solid var(--c-border-faint)",
                          background: on ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
                          color: "var(--c-text-primary)",
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-8 flex items-center gap-4">
              <button
                type="button"
                onClick={submit}
                disabled={!allAnswered}
                style={{
                  background: allAnswered ? "var(--c-mock-banner-btn-bg)" : "var(--c-surface-sunken, var(--c-surface-muted))",
                  color: allAnswered ? "var(--c-mock-banner-btn-fg)" : "var(--c-text-tertiary)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  borderRadius: 999,
                  padding: "11px 26px",
                  border: "none",
                  cursor: allAnswered ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                Submit all 5
              </button>
              {!allAnswered && (
                <span style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
                  {set.questions.filter((_, i) => picked[i] != null).length}/5 answered
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Done / weekly review ──────────────────────────────────────
  const score = banked && phase === "done" && startRef.current == null ? banked.score : rightCount;
  const hasPicks = Object.keys(picked).length > 0;
  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <div className="mt-10 mb-16 max-w-[760px]">
        <BackBtn />
        <div className="p-6 md:p-7" style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
            📊 Weekly DI banked
          </div>
          <h2 className="ds-display" style={{ fontSize: 26 }}>
            {set.title}: <span className="ds-grad-text">{score}/5</span>
          </h2>
          <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)", marginTop: 6 }}>
            +{XP_PER_RUN} XP earned{elapsed ? <> · finished in {Math.floor(elapsed / 60)}m {elapsed % 60}s</> : null}. A fresh set drops Monday — until then this page shows your review.
          </div>
          <div className="mt-5">
            <DataBlock />
          </div>
          {set.questions.map((qq, i) => {
            const my = picked[i];
            const right = my === qq.a;
            return (
              <div key={i} className="mt-5 rounded-[12px] p-4" style={{ border: "1px solid var(--c-border-faint)", background: "var(--c-surface)" }}>
                <div className="flex items-start gap-2" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>
                  {hasPicks && (right ? <CheckCircle2 size={17} style={{ color: "var(--c-success)", marginTop: 3, flexShrink: 0 }} /> : <XCircle size={17} style={{ color: "var(--c-danger)", marginTop: 3, flexShrink: 0 }} />)}
                  <span>
                    <span style={{ color: "var(--c-text-tertiary)", marginRight: 6 }}>Q{i + 1}.</span>
                    {qq.q}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7, color: "var(--c-text-secondary)" }}>
                  {hasPicks && my != null && !right && (
                    <div>
                      Your answer: <b style={{ color: "var(--c-danger)" }}>{String.fromCharCode(65 + my)}. {qq.o[my]}</b>
                    </div>
                  )}
                  <div>
                    Correct answer: <b style={{ color: "var(--c-success)" }}>{String.fromCharCode(65 + qq.a)}. {qq.o[qq.a]}</b>
                  </div>
                  <div style={{ marginTop: 4 }}>{qq.e}</div>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={onExit} className="mt-6 inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Back to missions <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
