// ============================================================
// Daily QA Quiz — DSB Challenge mission (Sim Room stage 1).
// 10 questions, SAME set for every student that day (the
// get_daily_quiz RPC orders the bank deterministically by a
// date-seeded hash), rotating automatically at midnight IST.
// No per-question timer — accuracy is the metric here.
//
// Run logs to trainer_runs (trainer: "daily-quiz",
// score = correct answers) → +40 XP.
// Pure logic (verdictFor) exported for unit testing.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck } from "lucide-react";

export const XP_PER_RUN = 40;
export const QUIZ_LENGTH = 10;

export function verdictFor(right, total) {
  const pct = total ? right / total : 0;
  if (pct === 1)
    return "Perfect 10. Every student in India saw these same questions today — and you cleared the board. Screenshot-worthy.";
  if (pct >= 0.8)
    return `${right}/${total} — strong. The ones you missed are today's revision list; fix them while they're fresh.`;
  if (pct >= 0.5)
    return `${right}/${total}. Half the board is yours — the other half is telling you exactly which topics need a concept test this week.`;
  return `${right}/${total}. Rough day, but everyone got the same set — tomorrow's quiz is a fresh start. Review the reds before you leave.`;
}

export default function DailyQuiz({ userData, onExit, onSimComplete }) {
  const [phase, setPhase] = useState("loading"); // loading | play | done | empty
  const [questions, setQuestions] = useState([]);
  const [qi, setQi] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const advanceRef = useRef(null);
  const lockRef = useRef(false);
  const rightRef = useRef(0);

  useEffect(() => {
    let alive = true;
    supabase.rpc("get_daily_quiz").then(({ data, error }) => {
      if (!alive) return;
      const usable = (data || []).filter(
        (q) => Array.isArray(q.options) && q.options.length >= 2 && (q.title || q.question)
      );
      if (error || usable.length < 3) setPhase("empty");
      else {
        setQuestions(usable.slice(0, QUIZ_LENGTH));
        setPhase("play");
      }
    });
    return () => {
      alive = false;
      clearTimeout(advanceRef.current);
    };
  }, []);

  const q = questions[qi];

  const handleAnswer = (idx) => {
    if (reveal || lockRef.current || !q) return;
    lockRef.current = true;
    const correct = !!q.options[idx]?.isCorrect;
    if (correct) {
      rightRef.current += 1;
      setRight(rightRef.current);
    }
    setPicked(idx);
    setReveal(true);
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      setPicked(null);
      setReveal(false);
      lockRef.current = false;
      if (qi + 1 >= questions.length) finish();
      else setQi(qi + 1);
    }, 850);
  };

  const finish = async () => {
    setPhase("done");
    if (userData?.email) {
      await supabase.from("trainer_runs").insert({
        user: userData.email,
        trainer: "daily-quiz",
        score: rightRef.current,
        details: { total: questions.length },
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
    <div className="w-full flex flex-col" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {!onSimComplete && (
        <header className="mb-6 mt-2">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 mb-4"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", padding: 0 }}
          >
            <ArrowLeft size={15} /> DSB Challenge
          </button>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
            Daily Mission · Same 10 for all of India
          </div>
          <h1 className="ds-display" style={{ fontSize: "clamp(24px, 3.6vw, 32px)", lineHeight: 1.1 }}>
            Daily QA <span className="ds-accent ds-grad-text">Quiz.</span>
          </h1>
        </header>
      )}

      {phase === "loading" && (
        <div className="p-7 max-w-[760px]" style={cardStyle}>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>Loading today&apos;s quiz…</p>
        </div>
      )}

      {phase === "empty" && (
        <div className="p-7 max-w-[760px]" style={cardStyle}>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>
            Couldn&apos;t load today&apos;s quiz right now. Please try again in a moment.
          </p>
          <button type="button" onClick={onExit} className="mt-4" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 24px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Back
          </button>
        </div>
      )}

      {phase === "play" && q && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div className="flex justify-between items-center" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 6 }}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck size={13} /> Daily QA quiz · today&apos;s shared set
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {qi + 1} / {questions.length} · {right} right
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", width: `${(100 * qi) / questions.length}%`, background: "var(--c-mock-banner-btn-bg)", borderRadius: 4, transition: "width 0.3s ease" }} />
          </div>

          {q.questionimage && (
            <img src={q.questionimage} alt="Question" style={{ maxHeight: "24vh", marginBottom: 14, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
          )}
          {q.title && (
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: "var(--c-text-primary)" }}>{q.title}</div>
          )}
          {q.question && (
            <div
              className={"qcontent " + (q.title ? "mt-2" : "")}
              style={{ fontSize: 15, lineHeight: 1.6, color: "var(--c-text-primary)", maxHeight: "30vh", overflowY: "auto" }}
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
        </div>
      )}

      {phase === "done" && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
            Quiz complete
          </div>
          <h2 className="ds-display" style={{ fontSize: 25 }}>
            Today&apos;s score: <span className="ds-grad-text">{right} / {questions.length}</span>
          </h2>
          <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
            {verdictFor(right, questions.length)}
            <br />
            <br />
            XP earned: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>
          </div>
          <div className="mt-6 flex gap-3">
            {onSimComplete ? (
              <button
                type="button"
                onClick={() => onSimComplete(`${right}/${questions.length}`)}
                className="inline-flex items-center gap-2"
                style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Continue simulation <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" onClick={onExit} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Back to missions <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
