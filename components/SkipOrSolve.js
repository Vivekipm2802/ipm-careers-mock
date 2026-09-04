// ============================================================
// Skip or Solve — DSB Challenge skill trainer (Phase B).
// 2026-09 flow overhaul (owner-approved): the student never picks
// an answer option. Each round shows ONLY the question stem and two
// big calls — "Skip it" / "Solve it" — under the same 8-second
// timer. Every bank item is deliberately classified (sosBank.js):
//   scorer → right call is SOLVE   ·   trap → right call is SKIP
// Scoring: +1 correct call, −1 wrong call, timeout = 0 and resets
// the streak. After EVERY decision a verdict card explains the why,
// auto-advancing after ~2.5s (or tap to continue). The end summary
// lists every round: your call vs the right call + rationale.
//
// Data: curated local bank (sosBank.js — the old
// get_trainer_questions RPC had no trap flag); finished runs still
// insert into trainer_runs (trainer: "skip-or-solve") → +50 XP.
// details.mode = "calls-v2" marks the new ±1 scale so personal best
// never compares against old ±10/−5 scores.
// Banked today → read-only review (details.report).
// Pure game logic (applyCall, judgeCall, rightCall) exported for
// unit testing.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flame } from "lucide-react";
import SOS_BANK from "./sosBank";
import { supabase } from "@/utils/supabaseClient";
import { saveRunWithReport, loadTodayRun, todayKey } from "@/lib/trainerReport";

export const RUN_LENGTH = 10;
export const SECONDS_PER_Q = 8;
export const XP_PER_RUN = 50;

export const initialRun = () => ({
  i: 0,
  score: 0,
  streak: 0,
  best: 0,
  good: 0,
  bad: 0,
  timeouts: 0,
});

// Pure: the right call for a bank item.
export const rightCall = (item) => (item?.kind === "scorer" ? "solve" : "skip");

// Pure: judge a student call against the item. call: "solve" | "skip"
export const judgeCall = (item, call) => (call === rightCall(item) ? "good" : "bad");

// Pure reducer for one round. verdict: "good" | "bad" | "timeout"
export function applyCall(s, verdict) {
  const n = { ...s, i: s.i + 1 };
  if (verdict === "good") {
    n.score = s.score + 1;
    n.streak = s.streak + 1;
    n.best = Math.max(s.best, n.streak);
    n.good = s.good + 1;
  } else if (verdict === "bad") {
    n.score = s.score - 1;
    n.streak = 0;
    n.bad = s.bad + 1;
  } else {
    // timeout: 0 points, streak resets — indecision is its own tax
    n.streak = 0;
    n.timeouts = s.timeouts + 1;
  }
  return n;
}

export function verdictFor(s) {
  if (s.bad === 0 && s.timeouts === 0 && s.good >= 8)
    return "Elite judgement. You read every question for what it was — this is exactly the exam temperament IIM Indore rewards.";
  if (s.bad >= 4)
    return `${s.bad} wrong calls. You're either solving traps or skipping sitters — in IPMAT both cost rank. Re-read the whys below; they're the pattern.`;
  if (s.timeouts >= 3)
    return `${s.timeouts} timeouts. A non-decision loses the streak AND the question. Train the gut: long and multi-step means skip, clean single-concept means solve.`;
  return "Solid judgement. You're reading most questions correctly — push for a clean 10 and protect the streak.";
}

const RING_C = 2 * Math.PI * 27; // circumference for r=27

// Fisher–Yates on a copy.
function drawDeck(count) {
  const a = SOS_BANK.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}

export default function SkipOrSolve({ userData, onExit, onSimComplete, banked }) {
  // ── ALL hooks above any conditional render (shipped crash class) ──
  const [phase, setPhase] = useState(banked ? "review-loading" : "start"); // start | play | done | review-loading | review
  const [deck, setDeck] = useState([]);
  const [run, setRun] = useState(initialRun());
  const [tleft, setTleft] = useState(SECONDS_PER_Q);
  const [verdict, setVerdict] = useState(null); // { v: "good"|"bad"|"timeout", item, call }
  const [records, setRecords] = useState([]); // [{ id, call, v }]
  const [reviewInfo, setReviewInfo] = useState(null); // { score, best, thin }
  const [personalBest, setPersonalBest] = useState(null);
  const timerRef = useRef(null);
  const advanceRef = useRef(null);
  const pendingRef = useRef(null); // nextRun waiting behind the verdict card
  const deckRef = useRef([]);
  const runRef = useRef(initialRun()); // timer-safe copy (interval closures go stale)
  const recordsRef = useRef([]);
  // Guards against double-firing (React 18 StrictMode double-invokes
  // updaters in dev; also protects against timeout + click racing).
  const lockRef = useRef(false);

  // ── personal best — only among new-scale (calls-v2) runs ──
  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .from("trainer_runs")
      .select("score, details")
      .eq("user", userData.email)
      .eq("trainer", "skip-or-solve")
      .order("created_at", { ascending: false })
      .limit(120)
      .then(({ data }) => {
        const scores = (data || [])
          .filter((r) => r.details?.mode === "calls-v2")
          .map((r) => r.score);
        if (scores.length) setPersonalBest(Math.max(...scores));
      });
  }, [userData?.email]);

  // ── cleanup on unmount ──
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(advanceRef.current);
    };
  }, []);

  // Banked today → load the read-only review of today's run.
  useEffect(() => {
    if (!banked || !userData?.email) return;
    let alive = true;
    loadTodayRun(userData.email, "skip-or-solve").then((r) => {
      if (!alive) return;
      const items = r?.report?.items;
      if (items?.length) {
        const byId = new Map(SOS_BANK.map((x) => [x.id, x]));
        const recs = items.filter((it) => byId.has(it.id));
        setDeck(recs.map((it) => byId.get(it.id)));
        setRecords(recs);
        setReviewInfo({
          score: r.score ?? r.report?.score ?? 0,
          best: r?.details?.best_streak ?? r.report?.best_streak ?? 0,
          thin: recs.length === 0,
        });
      } else {
        setReviewInfo({ score: r?.score ?? 0, best: r?.details?.best_streak ?? 0, thin: true });
      }
      setPhase("review");
    });
    return () => {
      alive = false;
    };
  }, [banked, userData?.email]);

  // Sim Room: skip the start screen and launch straight into the run.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (onSimComplete && !banked && !autoStartedRef.current) {
      autoStartedRef.current = true;
      begin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    clearInterval(timerRef.current);
    lockRef.current = false;
    setTleft(SECONDS_PER_Q);
    timerRef.current = setInterval(() => {
      setTleft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const begin = () => {
    if (banked) return; // no re-attempts once today's run is banked
    const d = drawDeck(RUN_LENGTH);
    setDeck(d);
    deckRef.current = d;
    runRef.current = initialRun();
    setRun(runRef.current);
    setVerdict(null);
    setRecords([]);
    recordsRef.current = [];
    pendingRef.current = null;
    setPhase("play");
    startTimer();
  };

  // Tap-to-continue / auto-advance behind the verdict card.
  const proceed = () => {
    const nr = pendingRef.current;
    if (!nr) return;
    pendingRef.current = null;
    clearTimeout(advanceRef.current);
    setVerdict(null);
    if (nr.i >= deckRef.current.length) finish(nr);
    else startTimer();
  };

  const scheduleAdvance = (nextRun) => {
    pendingRef.current = nextRun;
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(proceed, 2500);
  };

  const decide = (call) => {
    if (verdict || lockRef.current) return;
    lockRef.current = true;
    clearInterval(timerRef.current);
    const cur = runRef.current;
    const item = deckRef.current[cur.i];
    const v = judgeCall(item, call);
    const next = applyCall(cur, v);
    runRef.current = next;
    recordsRef.current = [...recordsRef.current, { id: item.id, call, v }];
    setRecords(recordsRef.current);
    setVerdict({ v, item, call });
    setRun(next);
    scheduleAdvance(next);
  };

  const handleTimeout = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    const cur = runRef.current; // interval closure — state would be stale
    const item = deckRef.current[cur.i];
    const next = applyCall(cur, "timeout");
    runRef.current = next;
    recordsRef.current = [...recordsRef.current, { id: item?.id, call: null, v: "timeout" }];
    setRecords(recordsRef.current);
    setVerdict({ v: "timeout", item, call: null });
    setRun(next);
    scheduleAdvance(next);
  };

  const finish = async (finalRun) => {
    setPhase("done");
    if (finalRun.score > (personalBest ?? -Infinity)) setPersonalBest(finalRun.score);
    if (userData?.email) {
      await saveRunWithReport({
        email: userData.email,
        trainer: "skip-or-solve",
        score: finalRun.score,
        details: {
          mode: "calls-v2",
          good: finalRun.good,
          bad: finalRun.bad,
          timeouts: finalRun.timeouts,
          best_streak: finalRun.best,
        },
        report: {
          v: 1,
          date: todayKey(),
          score: finalRun.score,
          best_streak: finalRun.best,
          items: recordsRef.current,
        },
      });
    }
  };

  const item = deck[run.i];
  const isReview = phase === "review";
  const cardStyle = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: 16,
    boxShadow: "var(--c-shadow-xs)",
  };
  const callLabel = (c) => (c === "solve" ? "Solve it" : c === "skip" ? "Skip it" : "No call (timed out)");

  const verdictChrome = (v) =>
    v === "good"
      ? { label: "Good call · +1", color: "var(--c-success)", bg: "var(--c-success-soft)" }
      : v === "bad"
      ? { label: "Wrong call · −1", color: "var(--c-danger)", bg: "var(--c-danger-soft)" }
      : { label: "Out of time · 0 — streak resets", color: "var(--c-text-tertiary)", bg: "var(--c-surface-muted, var(--c-bg))" };

  // One row of the end summary / review list.
  const renderRoundRow = (rec, i) => {
    const it = SOS_BANK.find((x) => x.id === rec.id) || deck[i];
    if (!it) return null;
    const chrome = verdictChrome(rec.v);
    return (
      <div key={i} className="rounded-[14px] border p-4 mt-3" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)" }}>
        <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
          <span style={{ fontWeight: 700 }}>Round {i + 1}</span>
          <span>· {it.section}</span>
          <span style={{ marginLeft: "auto", fontWeight: 700, letterSpacing: "0.04em", color: chrome.color }}>{chrome.label}</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--c-text-primary)", marginTop: 8 }}>{it.stem}</div>
        <div className="flex gap-4 flex-wrap" style={{ fontSize: 12.5, marginTop: 8 }}>
          <span style={{ color: "var(--c-text-secondary)" }}>
            Your call: <b style={{ color: rec.v === "good" ? "var(--c-success)" : rec.v === "bad" ? "var(--c-danger)" : "var(--c-text-tertiary)" }}>{callLabel(rec.call)}</b>
          </span>
          <span style={{ color: "var(--c-text-secondary)" }}>
            Right call: <b style={{ color: "var(--c-brand-gold)" }}>{callLabel(rightCall(it))}</b>
          </span>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--c-text-secondary)", marginTop: 6, borderTop: "1px dashed var(--c-border-faint)", paddingTop: 6 }}>
          {it.why}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mb-6 mt-10">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 mb-4"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", padding: 0 }}
        >
          <ArrowLeft size={15} /> DSB Challenge
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
          Skill Trainer · Decision Training
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.1 }}>
          Skip or <span className="ds-accent ds-grad-text">Solve.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 14.5, color: "var(--c-text-secondary)" }}>
          8 seconds to make the call — solve the scorers, skip the traps. The skill that separates a 60 from a 90 in IPMAT.
          {personalBest != null && (
            <span style={{ color: "var(--c-brand-gold)", fontWeight: 600 }}> · Personal best: {personalBest > 0 ? `+${personalBest}` : personalBest}</span>
          )}
        </p>
      </header>

      {/* ── START ── */}
      {phase === "start" && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <h2 className="ds-display" style={{ fontSize: 19 }}>How it works</h2>
          {[
            <>You get <b>{RUN_LENGTH} questions</b>, one at a time — but you never answer them. You only <b>make the call</b>: solve or skip, within <b>{SECONDS_PER_Q} seconds</b>.</>,
            <>Some are <b>scorers</b> — clean, single-concept, worth your time. Some are <b>traps</b> — long, multi-step, built to eat your clock.</>,
            <>Right call = <b style={{ color: "var(--c-success)" }}>+1</b>. Wrong call = <b style={{ color: "var(--c-danger)" }}>−1</b>. Timer runs out = 0 and your streak resets.</>,
            <>After every call you see the verdict and the <b>why</b> — that one line is the actual training.</>,
          ].map((r, d) => (
            <div key={d} className="flex gap-3 mt-3.5" style={{ fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.55 }}>
              <span className="grid place-items-center shrink-0" style={{ width: 26, height: 26, borderRadius: 8, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", fontWeight: 700, fontSize: 12 }}>
                {d + 1}
              </span>
              <span>{r}</span>
            </div>
          ))}
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={begin}
              className="inline-flex items-center gap-2"
              style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Start run <ArrowRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_RUN} XP per run</span>
          </div>
        </div>
      )}

      {/* ── REVIEW LOADING ── */}
      {phase === "review-loading" && (
        <div className="p-7 max-w-[760px]" style={cardStyle}>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>Loading today&apos;s review…</p>
        </div>
      )}

      {/* ── PLAY ── */}
      {phase === "play" && item && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              Round
              <b style={{ display: "block", fontSize: 17, letterSpacing: 0, textTransform: "none", color: "var(--c-text-primary)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                {run.i + 1} / {deck.length}
              </b>
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              Score
              <b style={{ display: "block", fontSize: 17, letterSpacing: 0, color: "var(--c-text-primary)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {run.score > 0 ? `+${run.score}` : run.score}
              </b>
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              Streak
              <b className="flex items-center gap-1" style={{ fontSize: 17, letterSpacing: 0, color: "var(--c-brand-gold)", marginTop: 2 }}>
                <Flame size={15} /> {run.streak}
              </b>
            </div>
            <div style={{ position: "relative", width: 64, height: 64 }}>
              <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="32" cy="32" r="27" stroke="var(--c-surface-sunken, var(--c-surface-muted))" strokeWidth="5" fill="none" />
                <circle
                  cx="32" cy="32" r="27"
                  stroke={tleft <= 3 ? "var(--c-danger)" : "var(--c-brand-gold)"}
                  strokeWidth="5" fill="none" strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - tleft / SECONDS_PER_Q)}
                  style={{ transition: "stroke-dashoffset 0.9s linear" }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center" style={{ fontSize: 19, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                {tleft}
              </div>
            </div>
          </div>

          {/* Stem only — no options, ever. The whole skill is the call. */}
          <div className="mt-5" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
            {item.section} · would you attempt this in the exam?
          </div>
          <div className="mt-2" style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.55, color: "var(--c-text-primary)" }}>
            {item.stem}
          </div>
          {item.directions && (
            <div className="mt-2" style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--c-text-secondary)" }}>{item.directions}</div>
          )}

          {verdict ? (
            /* ── VERDICT CARD — tap anywhere to continue ── */
            <div
              onClick={proceed}
              className="rounded-[14px] mt-6 p-5"
              style={{ background: verdictChrome(verdict.v).bg, border: `1px solid ${verdictChrome(verdict.v).color}`, cursor: "pointer" }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: verdictChrome(verdict.v).color }}>
                {verdictChrome(verdict.v).label}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--c-text-secondary)", marginTop: 4 }}>
                This was a <b style={{ color: "var(--c-brand-gold)" }}>{verdict.item?.kind === "scorer" ? "scorer — solve it" : "trap — skip it"}</b>.
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--c-text-secondary)", marginTop: 8 }}>
                {verdict.item?.why}
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginTop: 10 }}>
                Tap to continue
              </div>
            </div>
          ) : (
            /* ── THE TWO CALLS ── */
            <div className="grid sm:grid-cols-2 gap-3 mt-7">
              <button
                type="button"
                onClick={() => decide("skip")}
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--c-border-soft, var(--c-border-faint))",
                  color: "var(--c-text-primary)",
                  borderRadius: 999, padding: "16px 24px", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--c-text-tertiary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-border-soft, var(--c-border-faint))"; }}
              >
                Skip it
              </button>
              <button
                type="button"
                onClick={() => decide("solve")}
                style={{
                  background: "var(--c-accent-grad, var(--c-brand-gold))",
                  color: "var(--c-text-on-brand)",
                  border: "none",
                  borderRadius: 999, padding: "16px 24px", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Solve it
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS / REVIEW ── */}
      {(phase === "done" || phase === "review") && (
        <div className="max-w-[760px]">
          <div className="p-6 md:p-7" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
              {isReview ? "Today's run · review" : "Run complete"}
            </div>
            <h2 className="ds-display" style={{ fontSize: 25 }}>
              Decision score:{" "}
              <span className="ds-grad-text">
                {(() => {
                  const s = isReview ? reviewInfo?.score ?? 0 : run.score;
                  return s > 0 ? `+${s}` : s;
                })()}
              </span>{" "}
              <span style={{ fontSize: 15, color: "var(--c-text-secondary)" }}>/ {isReview ? records.length || RUN_LENGTH : deck.length}</span>
            </h2>
            <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
              {(isReview
                ? [
                    ["Good calls", records.filter((r) => r.v === "good").length, "var(--c-success)"],
                    ["Wrong calls", records.filter((r) => r.v === "bad").length, "var(--c-danger)"],
                    ["Timeouts", records.filter((r) => r.v === "timeout").length, "var(--c-text-primary)"],
                    ["Best streak", reviewInfo?.best ?? 0, "var(--c-brand-gold)"],
                  ]
                : [
                    ["Good calls", run.good, "var(--c-success)"],
                    ["Wrong calls", run.bad, "var(--c-danger)"],
                    ["Timeouts", run.timeouts, "var(--c-text-primary)"],
                    ["Best streak", run.best, "var(--c-brand-gold)"],
                  ]
              ).map(([l, v, c]) => (
                <div key={l} className="rounded-[12px] border p-4" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                  <div className="ds-display" style={{ fontSize: 25, marginTop: 6, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
              {isReview ? (
                <>Banked earlier today — this is a read-only walkthrough of your calls. A fresh run unlocks at midnight.</>
              ) : (
                <>
                  {verdictFor(run)}
                  <br />
                  <br />
                  XP earned this run: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>
                </>
              )}
            </div>
          </div>

          {isReview && reviewInfo?.thin ? (
            <div className="p-5 mt-3 rounded-[14px] border" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)", fontSize: 13.5, color: "var(--c-text-secondary)" }}>
              Round-by-round detail isn&apos;t available for this run on this device — the banked score above still counts.
            </div>
          ) : (
            records.map(renderRoundRow)
          )}

          <div className="mt-6 mb-8 flex gap-3">
            {onSimComplete && phase === "done" ? (
              <button
                type="button"
                onClick={() => onSimComplete(`${run.score > 0 ? "+" : ""}${run.score} calls`)}
                className="inline-flex items-center gap-2"
                style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Continue simulation <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" onClick={onExit} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Back to DSB <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
