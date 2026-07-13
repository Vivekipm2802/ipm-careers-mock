// ============================================================
// Sudden Death — DSB Challenge skill trainer (Phase B).
// Endless question stream, no timer, no skips. One wrong answer
// ends the run. Score = survival streak.
//
// Data: questions via get_trainer_questions RPC (batches of 30,
// auto-refills as the streak grows); each finished run inserts
// into trainer_runs (trainer: "sudden-death", score = streak)
// → +30 XP via the XP RPCs.
// Pure logic (applyAnswer, heatFor, verdictFor) is exported for
// unit testing without React.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Skull } from "lucide-react";

export const XP_PER_RUN = 30;
export const BATCH_SIZE = 30;

export const initialRun = () => ({ streak: 0, alive: true });

// Pure: apply one answer. Returns next state.
export function applyAnswer(s, correct) {
  if (!s.alive) return s;
  return correct ? { streak: s.streak + 1, alive: true } : { streak: s.streak, alive: false };
}

export function heatFor(streak) {
  if (streak >= 15) return "🌋 INFERNO";
  if (streak >= 10) return "🔥🔥🔥 Blazing";
  if (streak >= 6) return "🔥🔥 Hot";
  if (streak >= 3) return "🔥 Warming up";
  return "—";
}

export function verdictFor(streak) {
  if (streak >= 15)
    return `Legendary survival. ${streak} straight under sudden-death pressure — this is genuine exam temperament. Screenshot this.`;
  if (streak >= 8)
    return `Strong run. ${streak} survived. You cracked under heat, not knowledge — one more careful read and you'd still be alive.`;
  if (streak >= 4)
    return `Decent, but the arena is unforgiving. Question #${streak + 1} ended you. Was it a knowledge gap or a rushed read? Avenge it.`;
  return "Early death. The first few questions are usually the easy ones — that suggests a rushed read, not a gap. Slow down 2 seconds per question and go again.";
}

export default function SuddenDeath({ userData, onExit }) {
  const [phase, setPhase] = useState("start"); // start | loading | play | done | empty
  const [queue, setQueue] = useState([]); // upcoming questions
  const [qIndex, setQIndex] = useState(0);
  const [run, setRun] = useState(initialRun());
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [flash, setFlash] = useState(null);
  const [personalBest, setPersonalBest] = useState(null);
  const [sessionBest, setSessionBest] = useState(0);
  const lockRef = useRef(false);
  const advanceRef = useRef(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .from("trainer_runs")
      .select("score")
      .eq("user", userData.email)
      .eq("trainer", "sudden-death")
      .order("score", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.length) setPersonalBest(data[0].score);
      });
  }, [userData?.email]);

  useEffect(() => () => clearTimeout(advanceRef.current), []);

  const fetchBatch = async () => {
    if (fetchingRef.current) return [];
    fetchingRef.current = true;
    const { data } = await supabase.rpc("get_trainer_questions", { p_count: BATCH_SIZE });
    fetchingRef.current = false;
    return (data || []).filter(
      (q) => Array.isArray(q.options) && q.options.length >= 2 && (q.title || q.question)
    );
  };

  const begin = async () => {
    setPhase("loading");
    const batch = await fetchBatch();
    if (batch.length < 3) {
      setPhase("empty");
      return;
    }
    setQueue(batch);
    setQIndex(0);
    setRun(initialRun());
    setPicked(null);
    setReveal(false);
    setFlash(null);
    lockRef.current = false;
    setPhase("play");
  };

  // Refill the queue in the background when running low.
  useEffect(() => {
    if (phase !== "play") return;
    if (queue.length - qIndex <= 5) {
      fetchBatch().then((more) => {
        if (more.length) {
          setQueue((prev) => {
            const seen = new Set(prev.map((q) => q.id));
            return [...prev, ...more.filter((q) => !seen.has(q.id))];
          });
        }
      });
    }
  }, [phase, qIndex, queue.length]);

  const q = queue[qIndex];

  const handleAnswer = (idx) => {
    if (reveal || lockRef.current || !q) return;
    lockRef.current = true;
    const correct = !!q.options[idx]?.isCorrect;
    const next = applyAnswer(run, correct);
    setPicked(idx);
    setReveal(true);
    setRun(next);
    if (correct) {
      setSessionBest((b) => Math.max(b, next.streak));
      setFlash({ text: `Alive. +1 — question ${next.streak + 1} incoming…`, tone: "var(--c-success)" });
      clearTimeout(advanceRef.current);
      advanceRef.current = setTimeout(() => {
        setPicked(null);
        setReveal(false);
        setFlash(null);
        lockRef.current = false;
        setQIndex((i) => i + 1);
      }, 650);
    } else {
      setFlash({ text: "💀 Dead. That one got you.", tone: "var(--c-danger)" });
      clearTimeout(advanceRef.current);
      advanceRef.current = setTimeout(() => finish(next), 1200);
    }
  };

  const finish = async (finalRun) => {
    setPhase("done");
    if (finalRun.streak > (personalBest ?? -1)) setPersonalBest(finalRun.streak);
    if (userData?.email) {
      await supabase.from("trainer_runs").insert({
        user: userData.email,
        trainer: "sudden-death",
        score: finalRun.streak,
        details: { killer_question_id: q?.id ?? null, session_best: Math.max(sessionBest, finalRun.streak) },
      });
    }
  };

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
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-danger)", marginBottom: 8 }}>
          Skill Trainer · One wrong = out
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.1 }}>
          Sudden <span className="ds-accent ds-grad-text">Death.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 14.5, color: "var(--c-text-secondary)" }}>
          One wrong answer and the run is over. How long can you survive when every question is match point?
          {personalBest != null && (
            <span style={{ color: "var(--c-brand-gold)", fontWeight: 600 }}> · Survival record: {personalBest}</span>
          )}
        </p>
      </header>

      {/* ── START ── */}
      {(phase === "start" || phase === "loading") && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <h2 className="ds-display" style={{ fontSize: 19 }}>The rules are brutal</h2>
          {[
            <>Questions keep coming, <b>no timer, no skips</b>. Just you and the question.</>,
            <>Every correct answer = <b style={{ color: "var(--c-success)" }}>+1 to your survival streak</b>. The pace is yours — accuracy is everything.</>,
            <><b style={{ color: "var(--c-danger)" }}>One wrong answer ends the run.</b> Instantly. No second chances.</>,
            <>Your longest run is your <b>survival record</b> — beat it, and the DSB page updates.</>,
          ].map((r, d) => (
            <div key={d} className="flex gap-3 mt-3.5" style={{ fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.55 }}>
              <span className="grid place-items-center shrink-0" style={{ width: 26, height: 26, borderRadius: 8, background: "var(--c-danger-soft)", color: "var(--c-danger)", fontWeight: 700, fontSize: 12 }}>
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
              {phase === "loading" ? "Loading questions…" : "Enter the arena"} <ArrowRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_RUN} XP per run</span>
          </div>
        </div>
      )}

      {/* ── EMPTY ── */}
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
              Survival streak
              <b style={{ display: "block", fontSize: 22, letterSpacing: 0, textTransform: "none", color: "var(--c-text-primary)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {run.streak}
              </b>
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              Heat
              <b style={{ display: "block", fontSize: 20, letterSpacing: 0, textTransform: "none", color: "var(--c-brand-gold)", marginTop: 2 }}>
                {heatFor(run.streak)}
              </b>
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              Status
              <b style={{ display: "block", fontSize: 14, letterSpacing: "0.06em", color: run.alive ? "var(--c-success)" : "var(--c-danger)", marginTop: 8 }}>
                {run.alive ? "ALIVE" : "DEAD"}
              </b>
            </div>
          </div>

          {q.questionimage && (
            <img src={q.questionimage} alt="Question" style={{ maxWidth: "100%", maxHeight: "26vh", marginTop: 18, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
          )}
          {q.title && (
            <div className="mt-5" style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.5, color: "var(--c-text-primary)" }}>
              {q.title}
            </div>
          )}
          {q.question && (
            <div
              className={"qcontent " + (q.title ? "mt-2" : "mt-5")}
              style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--c-text-primary)", maxHeight: "34vh", overflowY: "auto", overflowX: "auto", wordBreak: "break-word" }}
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

          <div style={{ fontSize: 12.5, fontWeight: 600, minHeight: 18, marginTop: 18, color: flash?.tone }}>{flash?.text}</div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === "done" && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div className="inline-flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-danger)", marginBottom: 8 }}>
            <Skull size={14} /> Run over
          </div>
          <h2 className="ds-display" style={{ fontSize: 25 }}>
            You survived <span className="ds-grad-text">{run.streak}</span> questions
          </h2>
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {[
              ["Survival streak", run.streak, "var(--c-brand-gold)"],
              ["Killer question", `#${run.streak + 1}`, "var(--c-danger)"],
              ["Your record", Math.max(personalBest ?? 0, run.streak), "var(--c-text-primary)"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-[12px] border p-4" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div className="ds-display" style={{ fontSize: 25, marginTop: 6, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-danger-soft)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
            {verdictFor(run.streak)}
            <br />
            <br />
            XP earned this run: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={begin} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Avenge the run <ArrowRight size={15} />
            </button>
            <button type="button" onClick={onExit} style={{ background: "transparent", color: "var(--c-text-secondary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-soft, var(--c-border-faint))", borderRadius: 999, padding: "11px 24px", cursor: "pointer", fontFamily: "inherit" }}>
              Back to DSB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
