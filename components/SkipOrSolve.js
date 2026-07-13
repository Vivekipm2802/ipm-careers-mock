// ============================================================
// Skip or Solve — DSB Challenge skill trainer (Phase B).
// 8 seconds per question: solve it (+10 right / −5 wrong) or
// skip it (0, time saved). Timeout counts as wrong. Trains the
// single highest-leverage IPMAT skill — question selection.
//
// Data:
//   - questions come from the get_trainer_questions(p_count) RPC
//     (random MCQ rows from the existing question bank)
//   - each finished run is inserted into trainer_runs
//     (user, trainer, score, details) → +30 XP via the XP RPCs
// Pure game logic is exported (applyAction) so it can be unit
// tested without React.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flame } from "lucide-react";

export const RUN_LENGTH = 10;
export const SECONDS_PER_Q = 8;
export const XP_PER_RUN = 50;

export const initialRun = () => ({
  i: 0,
  score: 0,
  streak: 0,
  best: 0,
  right: 0,
  wrong: 0,
  skipped: 0,
});

// Pure reducer for one game event. action: "right" | "wrong" | "skip" | "timeout"
export function applyAction(s, action) {
  const n = { ...s, i: s.i + 1 };
  if (action === "right") {
    n.score = s.score + 10;
    n.streak = s.streak + 1;
    n.best = Math.max(s.best, n.streak);
    n.right = s.right + 1;
  } else if (action === "wrong" || action === "timeout") {
    n.score = s.score - 5;
    n.streak = 0;
    n.wrong = s.wrong + 1;
  } else if (action === "skip") {
    n.streak = 0;
    n.skipped = s.skipped + 1;
  }
  return n;
}

export function verdictFor(s) {
  if (s.wrong === 0 && s.right >= 7)
    return "Elite decision-making. You attempted only what you could convert — this is exactly the exam temperament IIM Indore rewards.";
  if (s.wrong >= 3)
    return `You're attempting traps. ${s.wrong} wrong answers cost you ${s.wrong * 5} points. In IPMAT, skipping those same questions would have ranked you higher. Train the skip.`;
  if (s.skipped >= 6)
    return `Too cautious. You skipped ${s.skipped} — some of those were free points. Trust your prep on the easy ones.`;
  return "Solid balance. You're converting attempts and dodging most traps. Push the streak next run.";
}

const RING_C = 2 * Math.PI * 27; // circumference for r=27

export default function SkipOrSolve({ userData, onExit, onSimComplete }) {
  const [phase, setPhase] = useState("start"); // start | loading | play | done | empty
  const [questions, setQuestions] = useState([]);
  const [run, setRun] = useState(initialRun());
  const [tleft, setTleft] = useState(SECONDS_PER_Q);
  const [picked, setPicked] = useState(null); // option index the student clicked
  const [reveal, setReveal] = useState(false); // showing right/wrong colors
  const [flash, setFlash] = useState(null); // { text, tone }
  const [personalBest, setPersonalBest] = useState(null);
  const timerRef = useRef(null);
  const advanceRef = useRef(null);
  // Guards against double-firing (React 18 StrictMode double-invokes
  // updaters in dev; also protects against timeout + click racing).
  const lockRef = useRef(false);

  // ── personal best ──
  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .from("trainer_runs")
      .select("score")
      .eq("user", userData.email)
      .eq("trainer", "skip-or-solve")
      .order("score", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.length) setPersonalBest(data[0].score);
      });
  }, [userData?.email]);

  // ── cleanup on unmount ──
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(advanceRef.current);
    };
  }, []);

  // Sim Room: skip the start screen and launch straight into the run.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (onSimComplete && !autoStartedRef.current) {
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

  const begin = async () => {
    setPhase("loading");
    const { data, error } = await supabase.rpc("get_trainer_questions", {
      p_count: RUN_LENGTH,
    });
    const usable = (data || []).filter(
      (q) => Array.isArray(q.options) && q.options.length >= 2 && (q.title || q.question)
    );
    if (error || usable.length < 3) {
      setPhase("empty");
      return;
    }
    setQuestions(usable.slice(0, RUN_LENGTH));
    setRun(initialRun());
    setPicked(null);
    setReveal(false);
    setFlash(null);
    setPhase("play");
    startTimer();
  };

  const advance = (nextRun, delay) => {
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      setPicked(null);
      setReveal(false);
      setFlash(null);
      if (nextRun.i >= Math.min(questions.length, RUN_LENGTH)) {
        finish(nextRun);
      } else {
        startTimer();
      }
    }, delay);
  };

  const handleAnswer = (idx) => {
    if (reveal || lockRef.current) return;
    lockRef.current = true;
    clearInterval(timerRef.current);
    const q = questions[run.i];
    const correct = !!q.options[idx]?.isCorrect;
    const next = applyAction(run, correct ? "right" : "wrong");
    setPicked(idx);
    setReveal(true);
    setFlash(
      correct
        ? { text: "+10 — banked.", tone: "var(--c-success)" }
        : { text: "−5 — that was a trap for you.", tone: "var(--c-danger)" }
    );
    setRun(next);
    advance(next, 900);
  };

  const handleSkip = () => {
    if (reveal || lockRef.current) return;
    lockRef.current = true;
    clearInterval(timerRef.current);
    const next = applyAction(run, "skip");
    setReveal(true);
    setFlash({ text: "Skipped — 0 points, time saved.", tone: "var(--c-text-tertiary)" });
    setRun(next);
    advance(next, 600);
  };

  const handleTimeout = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setRun((prev) => {
      const next = applyAction(prev, "timeout");
      setReveal(true);
      setFlash({ text: "⏱ Time out = wrong. −5. Decide faster.", tone: "var(--c-danger)" });
      advance(next, 1100);
      return next;
    });
  };

  const finish = async (finalRun) => {
    setPhase("done");
    if (finalRun.score > (personalBest ?? -Infinity)) setPersonalBest(finalRun.score);
    if (userData?.email) {
      await supabase.from("trainer_runs").insert({
        user: userData.email,
        trainer: "skip-or-solve",
        score: finalRun.score,
        details: {
          right: finalRun.right,
          wrong: finalRun.wrong,
          skipped: finalRun.skipped,
          best_streak: finalRun.best,
        },
      });
    }
  };

  const q = questions[run.i];
  const cardStyle = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: 16,
    boxShadow: "var(--c-shadow-xs)",
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
          8 seconds to decide. Solve the scorers, skip the traps — the skill that separates a 60 from a 90 in IPMAT.
          {personalBest != null && (
            <span style={{ color: "var(--c-brand-gold)", fontWeight: 600 }}> · Personal best: {personalBest}</span>
          )}
        </p>
      </header>

      {/* ── START ── */}
      {(phase === "start" || phase === "loading") && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <h2 className="ds-display" style={{ fontSize: 19 }}>How it works</h2>
          {[
            <>You get <b>{RUN_LENGTH} questions</b>, one at a time. A timer gives you <b>{SECONDS_PER_Q} seconds</b> per question.</>,
            <><b>Solve</b> — answer it. Correct = <b style={{ color: "var(--c-success)" }}>+10</b>, wrong = <b style={{ color: "var(--c-danger)" }}>−5</b>.</>,
            <><b>Skip</b> — costs nothing, saves your time. But skipping an easy one loses you +10 you should have banked.</>,
            <>Timer runs out? Counts as a <b style={{ color: "var(--c-danger)" }}>wrong answer</b>. Indecision is the worst decision.</>,
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
              disabled={phase === "loading"}
              className="inline-flex items-center gap-2"
              style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit", opacity: phase === "loading" ? 0.7 : 1 }}
            >
              {phase === "loading" ? "Loading questions…" : "Start run"} <ArrowRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_RUN} XP per run</span>
          </div>
        </div>
      )}

      {/* ── EMPTY / ERROR ── */}
      {phase === "empty" && (
        <div className="p-7 max-w-[760px]" style={cardStyle}>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>
            Couldn&apos;t load questions right now. Please try again in a moment.
          </p>
          <button type="button" onClick={() => setPhase("start")} className="mt-4" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 24px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Back
          </button>
        </div>
      )}

      {/* ── PLAY ── */}
      {phase === "play" && q && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              Question
              <b style={{ display: "block", fontSize: 17, letterSpacing: 0, textTransform: "none", color: "var(--c-text-primary)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                {run.i + 1} / {Math.min(questions.length, RUN_LENGTH)}
              </b>
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              Score
              <b style={{ display: "block", fontSize: 17, letterSpacing: 0, color: "var(--c-text-primary)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {run.score}
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

          {q.questionimage && (
            <img src={q.questionimage} alt="Question" style={{ maxHeight: "26vh", marginTop: 18, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
          )}
          {q.title && (
            <div className="mt-5" style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.5, color: "var(--c-text-primary)" }}>
              {q.title}
            </div>
          )}
          {q.question && (
            <div
              className={"qcontent " + (q.title ? "mt-2" : "mt-5")}
              style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--c-text-primary)", maxHeight: "34vh", overflowY: "auto" }}
              dangerouslySetInnerHTML={{ __html: q.question }}
            />
          )}

          <div className="grid gap-2.5 mt-4">
            {q.options.map((o, d) => {
              let border = "var(--c-border-faint)";
              let bg = "var(--c-surface-muted, var(--c-bg))";
              if (reveal && o.isCorrect) {
                border = "var(--c-success)";
                bg = "var(--c-success-soft)";
              } else if (reveal && picked === d && !o.isCorrect) {
                border = "var(--c-danger)";
                bg = "var(--c-danger-soft)";
              }
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleAnswer(d)}
                  className="text-left"
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--c-text-primary)", cursor: reveal ? "default" : "pointer", fontFamily: "inherit", transition: "border-color 0.12s" }}
                >
                  <span style={{ fontWeight: 700, marginRight: 10, color: "var(--c-text-tertiary)" }}>{String.fromCharCode(65 + d)}.</span>
                  <span dangerouslySetInnerHTML={{ __html: o.title }} />
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-5 gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSkip}
              style={{ background: "transparent", border: "1px dashed var(--c-border-soft, var(--c-border-faint))", color: "var(--c-text-tertiary)", borderRadius: 999, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: reveal ? "default" : "pointer", fontFamily: "inherit" }}
            >
              Skip — save the time →
            </button>
            <div style={{ fontSize: 12.5, fontWeight: 600, minHeight: 18, color: flash?.tone }}>{flash?.text}</div>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === "done" && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
            Run complete
          </div>
          <h2 className="ds-display" style={{ fontSize: 25 }}>
            Decision score: <span className="ds-grad-text">{run.score}</span>
          </h2>
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {[
              ["Solved right", run.right, "var(--c-success)"],
              ["Solved wrong", run.wrong, "var(--c-danger)"],
              ["Skipped", run.skipped, "var(--c-text-primary)"],
              ["Best streak", run.best, "var(--c-brand-gold)"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-[12px] border p-4" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div className="ds-display" style={{ fontSize: 25, marginTop: 6, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
            {verdictFor(run)}
            <br />
            <br />
            XP earned this run: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>
          </div>
          <div className="mt-6 flex gap-3">
            {onSimComplete ? (
              <button
                type="button"
                onClick={() => onSimComplete(`${run.score} pts`)}
                className="inline-flex items-center gap-2"
                style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Continue simulation <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button type="button" onClick={begin} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Run it again <ArrowRight size={15} />
                </button>
                <button type="button" onClick={onExit} style={{ background: "transparent", color: "var(--c-text-secondary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-soft, var(--c-border-faint))", borderRadius: 999, padding: "11px 24px", cursor: "pointer", fontFamily: "inherit" }}>
                  Back to DSB
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
