// ============================================================
// Concept Test Result page — Phase 8 redesign
// Premium scoring summary matching the mock result layout:
// hero, KPIs, question review, leaderboard. All data fetching
// and scoring logic preserved from the original file.
// ============================================================

import React, { useState, useMemo } from "react";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { serversupabase } from "@/utils/supabaseClient";
import { motion } from "framer-motion";
import {
  Play,
  Printer,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BarChart3,
  Trophy,
  XCircle,
  Home,
} from "lucide-react";
import Leaderboard from "../components/Leaderboard2";

const ResultPage = ({ result, questions, leaderboard }) => {
  const [activeExplanation, setActiveExplanation] = useState(undefined);
  const [activeVideo, setActiveVideo] = useState();
  const [activeFilter, setActiveFilter] = useState("all");
  const router = useRouter();

  // Ship 2 fix (2026-07): return the actual time interval a student spent
  // on THIS question, not a delta-of-deltas (which is a second derivative
  // and mathematically nonsensical for a "seconds spent" label).
  //
  // `timestamp` in each report entry is the cumulative seconds elapsed
  // since the test started, at the moment the student submitted that
  // question. To get time-on-question we need:
  //   this question's timestamp − the previous ATTEMPTED question's
  //   timestamp (chronological, not display order).
  //
  // The prior version indexed by display order (`qs[d-1]`) and, for
  // d≥2, subtracted two intervals and returned that (ci−pi). Both of
  // those were wrong.
  function calculateIntervalDelta(report, qs, d, i) {
    if (!Array.isArray(report) || report.length === 0) return 0;
    const currentEntry = report.find((item) => item.id === i.id);
    if (!currentEntry || typeof currentEntry.timestamp !== "number") return 0;

    // Find the most recent attempt BEFORE this one, ordered by timestamp
    // rather than display order — students often answer out of order.
    const earlier = report.filter(
      (r) => typeof r.timestamp === "number" && r.timestamp < currentEntry.timestamp
    );
    if (earlier.length === 0) return currentEntry.timestamp; // first answered

    const prevTs = Math.max(...earlier.map((r) => r.timestamp));
    const delta = currentEntry.timestamp - prevTs;
    return delta >= 0 ? delta : 0;
  }

  if (!result || !questions) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        Loading…
      </div>
    );
  }

  const report = result.report || [];
  const increment = result?.config?.increment ?? 4;
  const decrement = result?.config?.decrement ?? 1;
  const score = useMemo(() => {
    let s = 0;
    if (Array.isArray(report)) {
      const sorted = [...report].sort((a, b) => {
        if (typeof a.timestamp === "number" && typeof b.timestamp === "number") return a.timestamp - b.timestamp;
        return 0;
      });
      sorted.forEach((item) => {
        if (item.isCorrect === true) s += increment;
        else if (item.isCorrect === false) s -= decrement;
      });
    }
    return s;
  }, [report, increment, decrement]);

  const correctCount = report.filter((item) => item.isCorrect === true).length;
  const wrongCount = report.filter((item) => item.isCorrect === false).length;
  const totalQ = questions.length;
  const skippedCount = Math.max(0, totalQ - correctCount - wrongCount);
  const attempted = correctCount + wrongCount;
  const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;
  const maxScore = totalQ * increment;
  const positiveScore = correctCount * increment;
  const negativeScore = wrongCount * decrement;
  const timeTakenMin = useMemo(() => {
    if (!report || report.length === 0) return 0;
    const maxT = report.reduce((m, r) => (typeof r.timestamp === "number" && r.timestamp > m ? r.timestamp : m), 0);
    return Math.round(maxT / 60);
  }, [report]);
  const testTitle = result?.test_uuid?.parent?.title || result?.test_uuid?.title || "Concept test";

  function printPage() { window.print(); }

  function getStatusLocal(q) {
    const r = report.find((item) => item.id === q.id);
    if (!r) return "skipped";
    if (r.isCorrect === true) return "correct";
    if (r.isCorrect === false) return "wrong";
    return "skipped";
  }

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>
      {/* === EXPLANATION MODAL === */}
      {activeExplanation !== undefined && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ background: "rgba(0,0,0,0.55)", zIndex: 40 }}
          key="modal-backdrop"
        />
      )}
      {activeExplanation !== undefined && (
        <motion.div
          key="modal-content"
          className="fixed inset-0 flex justify-center items-start overflow-y-auto"
          style={{ zIndex: 50, padding: "40px 20px" }}
          initial={{ opacity: 0, y: "10%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "10%" }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ background: "var(--c-surface)", borderRadius: 20, overflow: "hidden", maxWidth: 900, width: "100%", border: "1px solid var(--c-border-faint)" }}>
            <div style={{ padding: 20, borderBottom: "1px solid var(--c-border-faint)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--c-text-primary)", margin: 0 }}>Explanation</h2>
              <button onClick={() => setActiveExplanation(undefined)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)" }}>
                <XCircle size={24} />
              </button>
            </div>
            <div style={{ padding: 24, maxHeight: "70vh", overflowY: "auto" }}>
              {questions[activeExplanation]?.explanationvideo && (
                <iframe
                  style={{ width: "100%", aspectRatio: "16/9", borderRadius: 12, marginBottom: 16, background: "var(--c-surface-muted, var(--c-bg))" }}
                  src={questions[activeExplanation]?.explanationvideo}
                  frameBorder="0"
                  allowFullScreen
                />
              )}
              <div className="qcontent" style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--c-text-primary)" }}
                   dangerouslySetInnerHTML={{ __html: questions[activeExplanation]?.question }} />
              {questions[activeExplanation]?.questionimage && (
                <img src={questions[activeExplanation].questionimage} style={{ marginTop: 16, borderRadius: 12, maxWidth: "100%", border: "1px solid var(--c-border-faint)" }} />
              )}
              <div className="qcontent" style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: "var(--c-text-secondary)" }}
                   dangerouslySetInnerHTML={{ __html: questions[activeExplanation]?.explanation }} />
            </div>
            <div style={{ padding: 20, borderTop: "1px solid var(--c-border-faint)", background: "var(--c-surface-muted, var(--c-bg))" }}>
              <div style={{ fontSize: 13, color: "var(--c-success)", fontWeight: 600 }}>
                Correct answer: {Array.isArray(questions[activeExplanation]?.options)
                  ? questions[activeExplanation].options.find((item) => item.isCorrect)?.title ?? "N/A"
                  : "N/A"}
              </div>
              <div style={{ fontSize: 13, color: "var(--c-brand-primary)", fontWeight: 600, marginTop: 4 }}>
                {/* BUG FIX (2026-07): report is stored in the ORDER the student
                    answered questions (chronological), not the display order
                    of questions[]. Indexing report[activeExplanation] grabbed
                    a DIFFERENT question's answer text (e.g. showing "A^2 – B^2"
                    on a Binomial question). Match report → question by id. */}
                Your answer: {(() => {
                  const activeQ = questions[activeExplanation];
                  const r = activeQ ? report.find((item) => item.id === activeQ.id) : null;
                  return r?.answer ?? "—";
                })()}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px 80px" }}>

        {/* === TOP ACTION BAR === */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600, fontSize: 14 }}>
            <img src="/newlog.svg" style={{ height: 32, width: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/")} style={pillGhost}>
              <Home size={14} /> Back to dashboard
            </button>
            <button onClick={() => printPage()} style={pillGhost}>
              <Printer size={14} /> Print
            </button>
            {result?.uid && (
              <button onClick={() => router.push(`/test/analytics/${result.uid}`)} style={pillPrimary}>
                <BarChart3 size={14} /> View detailed analysis <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* === HERO SCORE === */}
        <div style={heroCard}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 280, height: 280, background: "radial-gradient(circle, var(--c-brand-primary-tint) 0%, transparent 70%)", opacity: 0.6, transform: "translate(20%, -30%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={eyebrowStyle}>Test result · Concept test · {testTitle}</div>
            <h1 style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--c-text-primary)", lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>
              You scored{" "}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
                {Math.max(0, score)}
              </span>
            </h1>
            <div style={{ marginTop: 14, fontSize: 15, color: "var(--c-text-secondary)", display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
              <span>out of {maxScore}</span>
              <span style={{ color: "var(--c-text-tertiary)" }}>·</span>
              <span>{accuracy}% accuracy</span>
              <span style={{ color: "var(--c-text-tertiary)" }}>·</span>
              <span>{correctCount} of {totalQ} correct</span>
            </div>
          </div>
        </div>
        <div style={{ height: 16 }} />

        {/* === KPI ROW === */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          <Kpi label="Total score" value={Math.max(0, score)} unit={`/ ${maxScore}`} sub={`+${increment} correct · −${decrement} wrong`} />
          <Kpi label="Accuracy" value={accuracy} unit="%" sub={`Of ${attempted} attempted`} />
          <Kpi label="Time taken" value={timeTakenMin || "—"} unit={timeTakenMin ? "min" : ""} sub={timeTakenMin ? `Avg ${Math.round((timeTakenMin * 60) / totalQ)}s / Q` : ""} />
          <Kpi label="Without negatives" value={Math.max(0, positiveScore)} unit="" sub={negativeScore > 0 ? `+${negativeScore} from negatives` : "No negatives"} success />
        </div>

        {/* === PERFORMANCE — single big ring === */}
        {(() => {
          const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
          const color = pct >= 90 ? "#1FA463" : pct >= 70 ? "var(--c-brand-primary)" : "#B66C00";
          const dashArray = (pct / 100) * 314;
          return (
            <>
              <h2 style={{ ...sectionTitle }}>Performance</h2>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
                <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 18, padding: 32, maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 160, height: 160, position: "relative", marginBottom: 14 }}>
                    <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" stroke="var(--c-border-faint)" />
                      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" stroke={color} strokeLinecap="round" strokeDasharray={`${dashArray} 314`} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 32, fontWeight: 600, color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>
                      {pct}<span style={{ fontSize: 16, color: "var(--c-text-tertiary)", marginLeft: 1 }}>%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em", textAlign: "center" }}>
                    {testTitle}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                    {Math.max(0, score)} / {maxScore} · {correctCount} of {totalQ} correct
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* === TOP SCORERS — new unified design === */}
        {leaderboard && leaderboard.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "32px 0 16px" }}>
              <Trophy size={18} style={{ color: "var(--c-brand-gold)" }} />
              <h2 style={{ ...sectionTitle, margin: 0 }}>Top scorers</h2>
            </div>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 18, padding: "24px 28px", marginBottom: 32 }}>
              {leaderboard.slice(0, 10).map((row, idx) => {
                const isYou = row?.uid === result?.uid;
                const isGold = idx === 0;
                return (
                  <div key={row.uid || idx} style={{
                    display: "grid", gridTemplateColumns: "36px 1fr 80px",
                    padding: "10px 0", alignItems: "center",
                    borderTop: idx === 0 ? "none" : (isYou ? "1px solid var(--c-brand-primary-soft)" : "1px solid var(--c-border-faint)"),
                    background: isYou ? "var(--c-brand-primary-tint)" : "transparent",
                    margin: isYou ? "0 -10px" : "0",
                    paddingLeft: isYou ? 10 : 0,
                    paddingRight: isYou ? 10 : 0,
                    borderRadius: isYou ? 10 : 0,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: isGold ? "linear-gradient(135deg, var(--c-brand-gold), var(--c-brand-gold-tint))" : "var(--c-surface-muted, var(--c-bg))",
                      color: isGold ? "#fff" : "var(--c-text-secondary)",
                      display: "grid", placeItems: "center",
                      fontWeight: 600, fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--c-text-primary)", fontWeight: isYou ? 600 : 500 }}>
                      {isYou ? "You" : (row.name || "Anonymous")}
                    </div>
                    <div style={{ textAlign: "right", fontSize: 14, color: "var(--c-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {row.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* === QUESTION REVIEW === */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "32px 0 16px", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Question-by-question review</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <FilterPill label="All" count={totalQ} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            <FilterPill label="Correct" count={correctCount} active={activeFilter === "correct"} onClick={() => setActiveFilter("correct")} />
            <FilterPill label="Wrong" count={wrongCount} active={activeFilter === "wrong"} onClick={() => setActiveFilter("wrong")} />
            <FilterPill label="Skipped" count={skippedCount} active={activeFilter === "skipped"} onClick={() => setActiveFilter("skipped")} />
          </div>
        </div>

        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--c-border-faint)" }}>
          {questions.map((q, d) => {
            const status = getStatusLocal(q);
            if (activeFilter !== "all" && activeFilter !== status) return null;
            const r = report.find((item) => item.id === q.id);
            const correctIdx = Array.isArray(q.options) ? q.options.findIndex((o) => o?.isCorrect) : -1;
            // Ship 3 fix (2026-07): concept test runner stores the picked
            // option as `selectedOption` (a STRING like "1"..."4"), never
            // as `value`. Previously this line only read `.value`, so
            // chosenIdx was ALWAYS null on the concept test review card —
            // meaning the student's picked option was never highlighted
            // as "Your choice". Combined with the "Wrong" badge at the
            // top, students thought the system had marked them wrong
            // even for correctly-picked answers. Read selectedOption
            // first, fall back to value so mock-test-shaped rows still
            // work if this component is ever reused.
            const chosenIdx = (() => {
              if (!r) return null;
              const raw = r.selectedOption ?? r.value;
              if (raw == null) return null;
              const n = Number(raw) - 1;
              return Number.isFinite(n) ? n : null;
            })();
            const interval = calculateIntervalDelta(report, questions, d, q);
            const hasExplanation = q?.explanation && q?.explanation !== "<p><strong>Write your Explanation Here...</strong></p>";
            const hasVideo = q?.explanationvideo;

            const sStyles = {
              correct: { bg: "var(--c-success-soft, #E0F2E8)", color: "var(--c-success)", label: `Correct · +${increment}` },
              wrong: { bg: "var(--c-danger-soft, #F8DADA)", color: "var(--c-danger)", label: `Wrong · −${decrement}` },
              skipped: { bg: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-tertiary)", label: "Skipped · 0" },
            };
            const sStyle = sStyles[status];

            return (
              <div key={q.id} style={{ background: "var(--c-surface)", borderTop: d === 0 ? "none" : "1px solid var(--c-border-faint)", padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-secondary)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {d + 1}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: sStyle.bg, color: sStyle.color }}>
                    {sStyle.label}
                  </div>
                  {interval > 0 && (
                    <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", fontFamily: "monospace" }}>
                      {interval}s
                    </div>
                  )}
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--c-text-tertiary)", fontFamily: "monospace" }}>
                    Q#{q.id}
                  </div>
                </div>

                {q.title && <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: "var(--c-text-primary)", margin: "0 0 8px", maxWidth: "70ch" }}>{q.title}</p>}
                <div className="qcontent" style={{ fontSize: 15, lineHeight: 1.6, color: "var(--c-text-primary)", margin: "0 0 18px", maxWidth: "70ch" }} dangerouslySetInnerHTML={{ __html: q.question }} />
                {q.questionimage && <img src={q.questionimage} style={{ maxHeight: 200, marginBottom: 16, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />}

                {/* Ship 2 fix (2026-07): SA (short-answer / input) questions
                    store options as an object `{answer: "..."}`, not an array.
                    Previously the MCQ options block simply didn't render for
                    SA and there was NO fallback — students saw a question with
                    no correct answer AND no record of what they typed. Silent
                    data loss. Now we render a small panel showing the correct
                    answer and, when the student attempted it, their input. */}
                {(!Array.isArray(q.options)) && q?.options?.answer !== undefined && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: 12,
                      background: status === "correct" ? "var(--c-success-soft, #E0F2E8)" : status === "wrong" ? "var(--c-danger-soft, #F8DADA)" : "var(--c-surface-muted, var(--c-bg))",
                      border: `1px solid ${status === "correct" ? "var(--c-success)" : status === "wrong" ? "var(--c-danger)" : "var(--c-border-faint)"}`,
                      fontSize: 14, color: "var(--c-text-primary)",
                    }}>
                      <span>
                        <span style={{ color: "var(--c-text-tertiary)", marginRight: 8, fontSize: 12 }}>Your answer:</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {r?.answer ?? r?.value ?? <span style={{ color: "var(--c-text-tertiary)", fontStyle: "italic", fontFamily: "inherit", fontWeight: 400 }}>Not attempted</span>}
                        </span>
                      </span>
                      {status === "correct" && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-success)" }}>Correct</span>}
                      {status === "wrong" && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-danger)" }}>Wrong</span>}
                    </div>
                    <div style={{
                      padding: "12px 16px", borderRadius: 12,
                      background: "var(--c-success-soft, #E0F2E8)",
                      border: "1px solid var(--c-success)",
                      fontSize: 14, color: "var(--c-text-primary)",
                    }}>
                      <span style={{ color: "var(--c-success)", marginRight: 8, fontSize: 12, fontWeight: 600 }}>Correct answer:</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        {q.options.answer}
                      </span>
                    </div>
                  </div>
                )}

                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {q.options.map((opt, i) => {
                      const isCorrect = i === correctIdx;
                      const isChosen = chosenIdx !== null && i === chosenIdx;
                      const isChosenWrong = isChosen && !isCorrect;
                      const letter = String.fromCharCode(65 + i);
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "12px 16px",
                          background: isCorrect ? "var(--c-success-soft, #E0F2E8)" : isChosenWrong ? "var(--c-danger-soft, #F8DADA)" : "var(--c-surface-muted, var(--c-bg))",
                          border: `1px solid ${isCorrect ? "var(--c-success)" : isChosenWrong ? "var(--c-danger)" : "var(--c-border-faint)"}`,
                          borderRadius: 12, fontSize: 14,
                          color: isCorrect || isChosenWrong ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                          textDecoration: isChosenWrong ? "line-through" : "none",
                          textDecorationColor: isChosenWrong ? "var(--c-danger)" : "transparent",
                        }}>
                          <span style={{
                            flexShrink: 0, width: 24, height: 24, borderRadius: 6,
                            background: isCorrect ? "var(--c-success)" : isChosenWrong ? "var(--c-danger)" : "var(--c-surface)",
                            color: isCorrect || isChosenWrong ? "#fff" : "var(--c-text-secondary)",
                            display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12,
                            border: isCorrect || isChosenWrong ? "1px solid transparent" : "1px solid var(--c-border-soft)",
                          }}>
                            {letter}
                          </span>
                          <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: opt?.title || "" }} />
                          {(isCorrect || isChosenWrong) && (
                            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: isCorrect ? "var(--c-success)" : "var(--c-danger)", textDecoration: "none", whiteSpace: "nowrap" }}>
                              {isCorrect && isChosen ? "Correct · Your choice" : isCorrect ? "Correct answer" : "Your choice"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(hasExplanation || hasVideo) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 14, borderTop: "1px solid var(--c-border-faint)", flexWrap: "wrap" }}>
                    {hasVideo && (
                      activeVideo === q.id ? (
                        <iframe className="aspect-video w-full max-w-[500px] rounded-xl" src={q.explanationvideo} style={{ background: "var(--c-surface-muted, var(--c-bg))" }} />
                      ) : (
                        <button onClick={() => setActiveVideo(q.id)} style={pillGhost}>
                          <span style={{ display: "inline-grid", placeItems: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--c-brand-primary)", color: "#fff" }}>
                            <Play size={12} fill="#fff" />
                          </span>
                          Watch video solution
                        </button>
                      )
                    )}
                    {hasExplanation && (
                      <button onClick={() => setActiveExplanation(d)} style={pillGhost}>
                        <BookOpen size={14} /> Read written solution
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default ResultPage;

// ── Sub-components ──
function Kpi({ label, value, unit, sub, success }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 18, padding: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: success ? "var(--c-success)" : "var(--c-text-primary)", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--c-text-tertiary)", marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 6 }}>{sub}</div>
    </div>
  );
}
function FilterPill({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      height: 32, padding: "0 12px", borderRadius: 999,
      background: active ? "var(--c-brand-primary)" : "var(--c-surface)",
      border: `1px solid ${active ? "transparent" : "var(--c-border-soft)"}`,
      color: active ? "#fff" : "var(--c-text-secondary)",
      fontFamily: "inherit", fontSize: 12, fontWeight: 500,
      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap",
    }}>
      {label}
      <span style={{
        background: active ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
        padding: "1px 6px", borderRadius: 8, fontSize: 11, fontVariantNumeric: "tabular-nums",
      }}>{count}</span>
    </button>
  );
}

// ── Shared inline style objects ──
const eyebrowStyle = {
  fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10,
};
const sectionTitle = {
  fontSize: 20, fontWeight: 600, letterSpacing: "-0.018em",
  margin: "0 0 16px", color: "var(--c-text-primary)",
};
const heroCard = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 24, padding: "40px 44px", marginBottom: 16,
  position: "relative", overflow: "hidden",
};
const pillGhost = {
  height: 36, padding: "0 14px", borderRadius: 999,
  background: "transparent", color: "var(--c-text-secondary)",
  border: "1px solid var(--c-border-soft)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "inherit", whiteSpace: "nowrap",
  transition: "all 0.18s ease",
};
const pillPrimary = {
  ...pillGhost, background: "var(--c-brand-primary)", color: "#fff", border: "1px solid transparent",
};

export async function getServerSideProps(context) {
  const { data, error } = await serversupabase
    .from("plays")
    .select("*,test_uuid(*)")
    .eq("uid", context.query.uid);
  if (!data || data.length === 0 || error) return { notFound: true };
  const result = data[0];
  let questions = [];
  if (result?.test_uuid?.id) {
    const { data: qData } = await serversupabase
      .from("questions").select("*").eq("parent", result.test_uuid.id);
    questions = qData || [];
  }
  let leaderboard = [];
  if (result?.test_uuid?.uuid) {
    // Ship 2 fix: SELECT was missing `uid` (the play's primary key),
    // which broke the "You" highlight — `row.uid === result.uid`
    // always evaluated `undefined === value` → false, so a user
    // never saw their row highlighted on the leaderboard.
    const { data: lbData } = await serversupabase
      .from("plays").select("uid,id,created_at,score,user,name,isPassed,test_uuid")
      .eq("test_uuid", result.test_uuid.uuid)
      .order("score", { ascending: false }).limit(20);
    leaderboard = lbData || [];
  }
  return { props: { result, questions, leaderboard } };
}
