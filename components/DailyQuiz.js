// ============================================================
// Daily QA Quiz — DSB Challenge mission (Sim Room stage 1).
// 10 questions, SAME set for every student that day (the
// get_daily_quiz RPC orders the bank deterministically by a
// date-seeded hash), rotating automatically at midnight IST.
//
// 2026-09 overhaul (owner-approved):
//   · NO instant right/wrong — picking an option shows only a
//     neutral gold-tint selected state, then auto-advances.
//   · After Q10: an END SUMMARY — score headline + per-question
//     review cards (your answer, correct answer, explanation).
//   · Once today's run is banked, the mission reopens in READ-ONLY
//     review of today's run (prop `banked`); the run detail lives
//     in trainer_runs.details.report (see lib/trainerReport.js).
// Run logs to trainer_runs (trainer: "daily-quiz",
// score = correct answers) → +40 XP. Unchanged.
// Pure logic (verdictFor) exported for unit testing.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck } from "lucide-react";
import { saveRunWithReport, loadTodayRun, todayKey } from "@/lib/trainerReport";

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

// Placeholder-aware explanation filter: the bank stores junk like
// "<p><strong>Write your Hint Here...</strong></p>" in empty fields.
export function cleanExplanation(html) {
  if (!html) return null;
  const s = String(html);
  if (!s.replace(/<[^>]*>/g, "").trim()) return null;
  if (/Write your (Hint|Explanation|Win\/Lose)/i.test(s)) return null;
  return s;
}

export default function DailyQuiz({ userData, onExit, onSimComplete, banked }) {
  // ── ALL hooks above any conditional render (shipped crash class) ──
  const [phase, setPhase] = useState(banked ? "review" : "loading"); // loading | play | done | review | empty
  const [questions, setQuestions] = useState([]);
  const [qi, setQi] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState(null);
  const [records, setRecords] = useState([]); // picked option index per question
  const [reviewInfo, setReviewInfo] = useState(null); // { score, total, thin }
  const advanceRef = useRef(null);
  const lockRef = useRef(false);
  const rightRef = useRef(0);
  const recordsRef = useRef([]);

  useEffect(() => {
    let alive = true;
    supabase.rpc("get_daily_quiz").then(async ({ data, error }) => {
      if (!alive) return;
      const usable = (data || []).filter(
        (q) => Array.isArray(q.options) && q.options.length >= 2 && (q.title || q.question)
      );
      if (banked) {
        // Read-only review of TODAY'S banked run — never restart it.
        const run = await loadTodayRun(userData?.email, "daily-quiz");
        if (!alive) return;
        const items = run?.report?.items;
        if (items?.length && usable.length) {
          const byId = new Map(usable.map((q) => [String(q.id), q]));
          const qs = [];
          const recs = [];
          items.forEach((it) => {
            const q = byId.get(String(it.id));
            if (q) {
              qs.push(q);
              recs.push(it.picked);
            }
          });
          setQuestions(qs);
          setRecords(recs);
          setReviewInfo({ score: run.score ?? run.report?.score ?? 0, total: items.length, thin: qs.length === 0 });
        } else {
          setReviewInfo({ score: run?.score ?? 0, total: run?.details?.total ?? QUIZ_LENGTH, thin: true });
        }
        setPhase("review");
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banked, userData?.email]);

  const q = questions[qi];

  const handleAnswer = (idx) => {
    if (lockRef.current || !q || phase !== "play") return;
    lockRef.current = true;
    const correct = !!q.options[idx]?.isCorrect;
    if (correct) {
      rightRef.current += 1;
      setRight(rightRef.current);
    }
    recordsRef.current = [...recordsRef.current, idx];
    setRecords(recordsRef.current);
    setPicked(idx); // neutral gold-tint only — no right/wrong until the summary
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      setPicked(null);
      lockRef.current = false;
      if (qi + 1 >= questions.length) finish();
      else setQi(qi + 1);
    }, 600);
  };

  const finish = async () => {
    setPhase("done");
    if (userData?.email) {
      await saveRunWithReport({
        email: userData.email,
        trainer: "daily-quiz",
        score: rightRef.current,
        details: { total: questions.length },
        report: {
          v: 1,
          date: todayKey(),
          score: rightRef.current,
          total: questions.length,
          items: questions.map((qq, i) => ({ id: qq.id, picked: recordsRef.current[i] ?? null })),
        },
      });
    }
  };

  const cardStyle = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: 16,
    boxShadow: "var(--c-shadow-xs)",
  };

  // Per-question review card (used by BOTH the end summary and the
  // banked read-only review).
  const renderReviewCard = (qq, i) => {
    const pickedIdx = records[i];
    const expl = cleanExplanation(qq.explanation);
    return (
      <div key={qq.id ?? i} className="rounded-[14px] border p-5 mt-3" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 8 }}>
          Question {i + 1}
        </div>
        {qq.questionimage && (
          <img src={qq.questionimage} alt="Question" style={{ maxWidth: "100%", maxHeight: "24vh", marginBottom: 10, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
        )}
        {qq.title && <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{qq.title}</div>}
        {qq.question && (
          <div
            className={"qcontent qforce " + (qq.title ? "mt-2" : "")}
            style={{ fontSize: 14, lineHeight: 1.6, maxHeight: "30vh", overflowY: "auto", overflowX: "auto", wordBreak: "break-word" }}
            dangerouslySetInnerHTML={{ __html: qq.question }}
          />
        )}
        <div className="grid gap-2 mt-3">
          {qq.options.map((o, d) => {
            const isCorrect = !!o.isCorrect;
            const isPicked = pickedIdx === d;
            let border = "var(--c-border-faint)";
            let bg = "var(--c-surface-muted, var(--c-bg))";
            if (isCorrect) {
              border = "var(--c-success)";
              bg = "var(--c-success-soft)";
            } else if (isPicked) {
              border = "var(--c-danger)";
              bg = "var(--c-danger-soft)";
            }
            return (
              <div key={d} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "10px 14px", fontSize: 13.5, display: "flex", gap: 10, alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, color: "var(--c-text-tertiary)", flexShrink: 0 }}>{String.fromCharCode(65 + d)}.</span>
                <span style={{ minWidth: 0 }} dangerouslySetInnerHTML={{ __html: o.title }} />
                <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: isCorrect ? "var(--c-success)" : "var(--c-danger)" }}>
                  {isCorrect && isPicked ? "Your answer ✓" : isCorrect ? "Correct answer" : isPicked ? "Your answer" : ""}
                </span>
              </div>
            );
          })}
        </div>
        {pickedIdx == null && (
          <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 8 }}>Not answered.</div>
        )}
        {expl && (
          <div className="rounded-[10px] mt-3 p-3" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 4 }}>Explanation</div>
            <div className="qcontent qforce" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--c-text-secondary)", overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: expl }} />
          </div>
        )}
      </div>
    );
  };

  const backBtn = (label) => (
    <button type="button" onClick={onExit} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
      {label} <ArrowRight size={15} />
    </button>
  );

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
              {qi + 1} / {questions.length} · answers at the end
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", width: `${(100 * qi) / questions.length}%`, background: "var(--c-mock-banner-btn-bg)", borderRadius: 4, transition: "width 0.3s ease" }} />
          </div>

          {q.questionimage && (
            <img src={q.questionimage} alt="Question" style={{ maxWidth: "100%", maxHeight: "24vh", marginBottom: 14, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
          )}
          {q.title && (
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: "var(--c-text-primary)" }}>{q.title}</div>
          )}
          {q.question && (
            <div
              className={"qcontent qforce " + (q.title ? "mt-2" : "")}
              style={{ fontSize: 15, lineHeight: 1.6, color: "var(--c-text-primary)", maxHeight: "30vh", overflowY: "auto", overflowX: "auto", wordBreak: "break-word" }}
              dangerouslySetInnerHTML={{ __html: q.question }}
            />
          )}

          {/* No mid-run verdicts: a pick shows ONLY the neutral gold
              selected state, then the quiz advances. */}
          <div className="grid gap-2.5 mt-4">
            {q.options.map((o, d) => {
              const isSel = picked === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleAnswer(d)}
                  className="text-left"
                  style={{
                    background: isSel ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted, var(--c-bg))",
                    border: `1px solid ${isSel ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`,
                    borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--c-text-primary)",
                    cursor: picked != null ? "default" : "pointer", fontFamily: "inherit", transition: "border-color 0.12s",
                  }}
                >
                  <span style={{ fontWeight: 700, marginRight: 10, color: "var(--c-text-tertiary)" }}>{String.fromCharCode(65 + d)}.</span>
                  <span dangerouslySetInnerHTML={{ __html: o.title }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(phase === "done" || phase === "review") && (
        <div className="max-w-[760px]">
          <div className="p-6 md:p-7" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
              {phase === "review" ? "Today's run · review" : "Quiz complete"}
            </div>
            <h2 className="ds-display" style={{ fontSize: 25 }}>
              Today&apos;s score:{" "}
              <span className="ds-grad-text">
                {phase === "review" ? reviewInfo?.score ?? 0 : right} / {phase === "review" ? reviewInfo?.total ?? questions.length : questions.length}
              </span>
            </h2>
            <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
              {phase === "review" ? (
                <>Banked earlier today — this is a read-only walkthrough of your run. The next quiz drops at midnight.</>
              ) : (
                <>
                  {verdictFor(right, questions.length)}
                  <br />
                  <br />
                  XP earned: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>
                </>
              )}
            </div>
          </div>

          {phase === "review" && reviewInfo?.thin ? (
            <div className="p-5 mt-3 rounded-[14px] border" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)", fontSize: 13.5, color: "var(--c-text-secondary)" }}>
              Question-by-question detail isn&apos;t available for this run on this device — your score above is banked and counted.
            </div>
          ) : (
            questions.map(renderReviewCard)
          )}

          <div className="mt-6 mb-8 flex gap-3">
            {onSimComplete && phase === "done" ? (
              <button
                type="button"
                onClick={() => onSimComplete(`${right}/${questions.length}`)}
                className="inline-flex items-center gap-2"
                style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Continue simulation <ArrowRight size={15} />
              </button>
            ) : (
              backBtn("Back to missions")
            )}
          </div>
        </div>
      )}
    </div>
  );
}
