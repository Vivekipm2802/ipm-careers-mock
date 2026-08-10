// ============================================================
// Concept Test Result page — Phase 8 redesign
// Premium scoring summary matching the mock result layout:
// hero, KPIs, question review, leaderboard. All data fetching
// and scoring logic preserved from the original file.
// ============================================================

import React, { useState, useMemo, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { motion } from "framer-motion";
import {
  Play,
  Printer,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BarChart3,
  Check,
  XCircle,
  Home,
} from "lucide-react";
// D4 result coaching layer
import MentorRead from "@/components/MentorRead";
import ReportIssue from "@/components/ReportIssue";
import LeaderboardBlock from "@/components/LeaderboardBlock";
import {
  splitWrongs,
  counterfactualScore,
  detectEndRush,
  FAST_WRONG_SEC,
} from "@/lib/mentorRead";
// 2026-08 correctness audit: canonical scoring + verdict re-derivation.
// The stored per-entry isCorrect and the stored score column are NOT
// trusted — historical rows were computed under broken comparison rules
// (strict === on SA strings, −1 on wrong SA). Verdicts are re-derived
// from the raw stored answer (content-first for MCQs) and the whole
// page recomputes from them.
import { scoreConceptPlay, chosenIndex, normType } from "@/lib/scoring";
import { getAuthHeaders } from "@/utils/authHeaders";

const ResultPage = ({ result, questions: ssrQuestions }) => {
  // Perf round 3: questions are no longer shipped in the SSR payload
  // (~480kB of page data) — the shell paints instantly and the review
  // data streams in client-side.
  const [questions, setQuestions] = useState(ssrQuestions ?? null);
  useEffect(() => {
    if (!questions && result?.test_uuid?.id) {
      supabase
        .from("questions")
        .select("*")
        .eq("parent", result.test_uuid.id)
        .then(({ data }) => setQuestions(data || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeExplanation, setActiveExplanation] = useState(undefined);
  const [activeVideo, setActiveVideo] = useState();
  const [activeFilter, setActiveFilter] = useState("all");
  const router = useRouter();

  // Lucky guesses — "Guessed this one?" flags on CORRECT questions.
  // {questions.id: true}; rows live in user_lucky_guesses ("user" =
  // this play's owner, enforced by RLS = auth.email()). NOTE: hooks
  // must stay ABOVE the early return below (hooks-order crash).
  const [luckyIds, setLuckyIds] = useState({});
  const [luckyBusy, setLuckyBusy] = useState(null); // question id in flight
  useEffect(() => {
    const email = result?.user;
    if (!email) return;
    supabase
      .from("user_lucky_guesses")
      .select("question_id")
      .eq("user", email)
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) return; // table not shipped yet → feature stays quiet
        const m = {};
        data.forEach((r) => { m[String(r.question_id)] = true; });
        setLuckyIds(m);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.user]);

  const toggleLucky = async (qid) => {
    const email = result?.user;
    if (luckyBusy != null || !email) return;
    setLuckyBusy(qid);
    const k = String(qid);
    if (luckyIds[k]) {
      // undo — delete the row (AWAITED: supabase builders only run when awaited)
      const { error } = await supabase
        .from("user_lucky_guesses")
        .delete()
        .eq("user", email)
        .eq("question_id", qid);
      if (!error) setLuckyIds((m) => { const n = { ...m }; delete n[k]; return n; });
    } else {
      const { error } = await supabase
        .from("user_lucky_guesses")
        .insert({ user: email, question_id: qid, source: "test" });
      // unique violation = already flagged elsewhere → treat as success
      if (!error || /duplicate|unique/i.test(error.message || "")) {
        setLuckyIds((m) => ({ ...m, [k]: true }));
      }
    }
    setLuckyBusy(null);
  };

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
    const currentEntry = report.find((item) => String(item.id) === String(i.id));
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

  // NOTE: the "Loading…" early return lives BELOW every hook (see after
  // timeTakenMin). Returning before useMemo while questions stream in
  // client-side changed the hook count between renders and crashed the
  // whole review page ("Rendered more hooks than during the previous
  // render") the moment the questions arrived.
  const report = result?.report || [];
  const increment = result?.config?.increment ?? 4;
  const decrement = result?.config?.decrement ?? 1;

  // 2026-08 correctness audit: recompute EVERYTHING from the report's raw
  // answers via lib/scoring (canonical rule, SA wrongs cost 0, content-
  // first MCQ matching, numeric-aware SA comparison). Stored isCorrect is
  // only a fallback for entries whose raw answer can't be re-derived.
  const recompute = useMemo(() => {
    if (!Array.isArray(questions) || questions.length === 0) return null;
    try {
      return scoreConceptPlay(questions, report, result?.config);
    } catch (e) {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, result]);

  // Re-derived verdict for a question id (falls back to stored isCorrect
  // while questions stream in).
  const verdictOf = (qid) => {
    if (recompute && recompute.verdictById) {
      const v = recompute.verdictById[String(qid)];
      return v === true || v === false ? v : null;
    }
    const r = report.find((item) => String(item.id) === String(qid));
    return r && typeof r.isCorrect === "boolean" ? r.isCorrect : null;
  };

  // Report entries with the re-derived verdict swapped in (used by the
  // mentor timing analysis so it agrees with the page).
  const derivedReport = useMemo(() => {
    if (!recompute || !recompute.verdictById) return report;
    return report.map((r) => {
      const v = recompute.verdictById[String(r.id)];
      return v === true || v === false ? { ...r, isCorrect: v } : r;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recompute, result]);

  const score = recompute
    ? recompute.score
    : report.reduce(
        (s, item) =>
          item.isCorrect === true
            ? s + increment
            : item.isCorrect === false && item.type !== "input"
              ? s - decrement
              : s,
        0,
      );

  const correctCount = recompute
    ? recompute.correct
    : report.filter((item) => item.isCorrect === true).length;
  const wrongCount = recompute
    ? recompute.wrong
    : report.filter((item) => item.isCorrect === false).length;
  const mcqWrongCount = recompute
    ? recompute.mcqWrong
    : report.filter((item) => item.isCorrect === false && item.type !== "input").length;
  const totalQ = (questions || []).length;
  const skippedCount = Math.max(0, totalQ - correctCount - wrongCount);
  const attempted = correctCount + wrongCount;
  const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;
  const maxScore = recompute ? recompute.maxMarks : totalQ * increment;
  const positiveScore = recompute ? recompute.positive : correctCount * increment;
  // Marks actually lost to negatives — SA wrongs contribute 0, always.
  const negativeScore = recompute ? recompute.negative : mcqWrongCount * decrement;
  // Ship 4: prefer the wall-clock `duration` column (submit − start).
  // max(timestamp) misses time on the final question; fallback for old rows.
  // 2026-08 owner feedback: same self-hide guard as the mock table's
  // Time column — under a minute of tracked time is missing/nonsense
  // data, so return 0 and let the stat-line Time cell drop itself.
  const timeTakenMin = useMemo(() => {
    let sec = 0;
    if (Number.isFinite(Number(result?.duration)) && result.duration > 0) {
      sec = Number(result.duration);
    } else if (report && report.length > 0) {
      sec = report.reduce((m, r) => (typeof r.timestamp === "number" && r.timestamp > m ? r.timestamp : m), 0);
    }
    if (sec < 60) return 0;
    return Math.round(sec / 60);
  }, [report, result]);

  // ── Mentor's read (D4 coaching layer) ──────────────────────────
  // Computed HERE, above the bail-out below: this page has crashed
  // on hook order before ("Rendered more hooks than during the
  // previous render") — every hook stays above the early return.
  // Each line renders only when its data is meaningful; pure math
  // lives in lib/mentorRead.js so the node harness can test it.
  const mentorLines = useMemo(() => {
    if (!result || !Array.isArray(report)) return [];
    const lines = [];
    const split = splitWrongs(derivedReport, "timestamp");

    // 1 · Counterfactual — only when negatives actually bit.
    // 2026-08: only MCQ wrongs ever cost marks (SA wrongs are 0), so the
    // counterfactual returns exactly `negativeScore` marks.
    if (mcqWrongCount > 0 && decrement > 0 && maxScore > 0) {
      const cf = counterfactualScore(score, mcqWrongCount, decrement);
      lines.push({
        tone: "gold",
        icon: "trend",
        node: (
          <>
            Without negative marking this would be <b>{cf} / {maxScore}</b>.
            {split.fast > 0 ? (
              <>
                {" "}{split.fast} of your wrongs took under {FAST_WRONG_SEC} seconds — slow down on
                those.
              </>
            ) : null}
          </>
        ),
      });
    }

    // 2 · Pattern — fast vs slow wrongs, by majority. Skipped when
    // there are no wrongs with a measurable time.
    if (split.fast + split.slow > 0) {
      lines.push(
        split.fast > split.slow
          ? {
              tone: "danger",
              icon: "alert",
              node: (
                <>
                  Most mistakes were quick answers — <b>carelessness, not concept</b>. Read the full
                  question before you commit.
                </>
              ),
            }
          : {
              tone: "danger",
              icon: "alert",
              node: (
                <>
                  Your wrongs took time — <b>revise the concept, then redo</b>. Slow mistakes mean the
                  method isn&apos;t settled yet.
                </>
              ),
            }
      );
    }

    // 3 · Pace — average seconds per question + end-rush check.
    const durationSec =
      Number.isFinite(Number(result?.duration)) && result.duration > 0
        ? Number(result.duration)
        : report.reduce((m, r) => (typeof r?.timestamp === "number" && r.timestamp > m ? r.timestamp : m), 0);
    const avgSec = attempted > 0 && durationSec > 0 ? Math.round(durationSec / attempted) : 0;
    if (avgSec > 0) {
      const rush = detectEndRush(report.filter((r) => typeof r?.timestamp === "number").map((r) => r.timestamp));
      if (rush.measurable && rush.rush) {
        lines.push({
          tone: "gold",
          icon: "clock",
          node: (
            <>
              About <b>{avgSec} seconds</b> a question, but the finish was a sprint — the last{" "}
              {rush.lastCount} answers in about {Math.max(1, Math.round(rush.lastTimeSec / 60))} min.
              Rushed marks are the first to go; leave more room at the end.
            </>
          ),
        });
      } else {
        lines.push({
          tone: "success",
          icon: "check",
          node: (
            <>
              Pace was right — <b>{avgSec} seconds</b> a question
              {rush.measurable ? ", no rushing at the end" : ""}. Keep this rhythm in the next test.
            </>
          ),
        });
      }
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, derivedReport, score, wrongCount, mcqWrongCount, decrement, maxScore, attempted]);

  // ── Leaderboard — /api/leaderboard (service role, canonical scoring,
  // deduped best attempt per student). The old SSR query returned raw
  // stored scores: legacy rows carried percentages ("100" for everyone,
  // units mixed with the marks shown for your own score) and the same
  // student could appear twice (#9 AND #10 — no dedupe). Endpoint
  // failure just hides the section. Hook stays ABOVE the early return.
  const [board, setBoard] = useState(null);
  useEffect(() => {
    const testUuid = result?.test_uuid?.uuid;
    if (!testUuid) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `/api/leaderboard?type=concept&testId=${encodeURIComponent(testUuid)}`,
          { headers },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data && Array.isArray(data.top)) setBoard(data);
      } catch (e) { /* silent — section hides */ }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.uid]);

  // All hooks above this line — safe to bail out now.
  if (!result || !questions) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        Loading…
      </div>
    );
  }

  const testTitle = result?.test_uuid?.parent?.title || result?.test_uuid?.title || "Concept test";

  function printPage() { window.print(); }

  function getStatusLocal(q) {
    // 2026-08: verdicts are RE-DERIVED from the raw stored answer
    // (lib/scoring) — the stored isCorrect is only a fallback.
    const v = verdictOf(q.id);
    if (v === true) return "correct";
    if (v === false) return "wrong";
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
              {typeof questions[activeExplanation]?.explanationvideo === "string" &&
                questions[activeExplanation].explanationvideo.trim().startsWith("http") && (
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
                  const r = activeQ ? report.find((item) => String(item.id) === String(activeQ.id)) : null;
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
            <ThemeToggle />
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

        {/* === CONCEPT RESULT HERO (2026-08 approved preview 1 — the
            restored "You scored N" top part: kick line, big Fraunces
            italic gradient number, one meta line). Replaces the old
            mock-style page header + hero card on this page only. === */}
        <div style={heroCard}>
          <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)", opacity: 0.55, pointerEvents: "none" }} />
          <div style={{ fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600, marginBottom: 10 }}>
            Test result · Concept test · {testTitle}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, margin: 0, color: "var(--c-text-primary)" }}>
            You scored{" "}
            <span className="ds-stat-value" style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 500, fontSize: 44 }}>
              {Math.max(0, score)}
            </span>
          </h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, fontSize: 13.5, color: "var(--c-text-secondary)", flexWrap: "wrap" }}>
            out of {maxScore}
            <i style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--c-text-tertiary)", display: "inline-block" }} />
            {accuracy}% accuracy
            <i style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--c-text-tertiary)", display: "inline-block" }} />
            {correctCount} of {attempted} correct
          </div>
        </div>

        {/* === STAT CARD ROW (preview 1) — replaces the slim stat line.
            Time card self-hides on thin tracked time (existing guard);
            Without-negatives drops when the test has no negatives. === */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <StatCard
            label="Total score"
            value={Math.max(0, score)}
            suffix={`/ ${maxScore}`}
            sub={decrement > 0 ? `+${increment} correct · −${decrement} wrong` : `+${increment} correct · no negative marking`}
          />
          <StatCard label="Accuracy" value={accuracy} suffix="%" sub={`of ${attempted} attempted`} />
          {timeTakenMin > 0 && (() => {
            // avg seconds per question from the same wall-clock source
            // as timeTakenMin (duration column, else max report stamp).
            const sec = Number.isFinite(Number(result?.duration)) && result.duration > 0
              ? Number(result.duration)
              : report.reduce((m, r) => (typeof r.timestamp === "number" && r.timestamp > m ? r.timestamp : m), 0);
            const avg = attempted > 0 && sec > 0 ? Math.round(sec / attempted) : 0;
            return (
              <StatCard
                label="Time taken"
                value={timeTakenMin}
                suffix="min"
                sub={avg > 0 ? `avg ${avg}s / question` : "this attempt"}
              />
            );
          })()}
          {decrement > 0 && (
            <StatCard
              label="Without negatives"
              value={Math.max(0, score + negativeScore)}
              good={negativeScore > 0}
              sub={negativeScore > 0 ? `+${negativeScore} from negatives` : "no marks lost"}
            />
          )}
        </div>

        {/* === TWO-COLUMN (2026-08 owner feedback): main content left,
            compact leaderboard rail right; wraps below on narrow screens. === */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap", marginTop: 10 }}>
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>

        {/* === QUESTION MAP — ONE card, single legend, single chip row.
            Single-section test, so no per-section label line. The one
            filter drives BOTH the map tint AND the review list below. === */}
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "16px 20px 18px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text-primary)" }}>Question map</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: "var(--c-text-tertiary)" }}>
              <LegendSq color="var(--c-success)" label="Right" />
              <LegendSq color="var(--c-danger)" label="Wrong" />
              <LegendSq muted label="Skipped" />
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["all", "wrong", "skipped"].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    height: 26, padding: "0 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    background: activeFilter === f ? "var(--c-brand-gold)" : "transparent",
                    color: activeFilter === f ? "#fff" : "var(--c-text-secondary)",
                    border: activeFilter === f ? "1px solid transparent" : "1px solid var(--c-border-soft)",
                  }}
                >
                  {f === "all" ? "All" : f === "wrong" ? "Wrong" : "Skipped"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {questions.map((q, i) => {
              const st = getStatusLocal(q);
              const dim = activeFilter !== "all" && activeFilter !== st;
              const cell =
                st === "correct"
                  ? { background: "var(--c-success-soft, #D6F3E3)", color: "var(--c-success)", border: "1px solid transparent" }
                  : st === "wrong"
                  ? { background: "var(--c-danger-soft, #FBE3E3)", color: "var(--c-danger)", border: "1px solid transparent" }
                  : { background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)" };
              return (
                <button
                  key={q.id}
                  onClick={() => document.getElementById(`qcard-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  title={`Q${i + 1} · ${st}`}
                  style={{ width: 28, height: 28, borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontVariantNumeric: "tabular-nums", opacity: dim ? 0.22 : 1, fontFamily: "inherit", ...cell }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* === QUESTION REVIEW — passive counts only; filtering lives in
            the map card's single chip row (2026-08 owner feedback). === */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 16px", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Question-by-question review</h2>
          <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
            {correctCount} correct · {wrongCount} wrong · {skippedCount} skipped
            {activeFilter !== "all" ? ` · showing ${activeFilter} only` : ""}
          </div>
        </div>

        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--c-border-faint)" }}>
          {questions.map((q, d) => {
            const status = getStatusLocal(q);
            if (activeFilter !== "all" && activeFilter !== status) return null;
            const r = report.find((item) => String(item.id) === String(q.id));
            const correctIdx = Array.isArray(q.options) ? q.options.findIndex((o) => o?.isCorrect) : -1;
            // 2026-08: "Your choice" highlight comes from the SAME
            // content-first matcher the verdict uses (lib/scoring
            // .chosenIndex — stored answer text wins over the stored
            // position), so badge and highlight can never disagree.
            const chosenIdx = r ? chosenIndex(q, r) : null;
            const interval = calculateIntervalDelta(report, questions, d, q);
            const hasExplanation = q?.explanation && q?.explanation !== "<p><strong>Write your Explanation Here...</strong></p>";
            // Video hygiene (parity with the mock page): an admin-marked
            // video slot that is empty / "-" / a non-URL placeholder must
            // never render a Watch button or an iframe. When a written
            // solution exists, show the quiet "coming soon" strip instead.
            const videoUrl = typeof q?.explanationvideo === "string" ? q.explanationvideo.trim() : "";
            const hasVideo = videoUrl.length > 2 && videoUrl.startsWith("http");
            const videoComingSoon = videoUrl.length > 0 && !hasVideo;

            // 2026-08: SA/input wrongs cost 0 — the badge says so.
            const wrongLabel = normType(q.type) === "input" ? "Wrong · 0" : `Wrong · −${decrement}`;
            const sStyles = {
              correct: { bg: "var(--c-success-soft, #E0F2E8)", color: "var(--c-success)", label: `Correct · +${increment}` },
              wrong: { bg: "var(--c-danger-soft, #F8DADA)", color: "var(--c-danger)", label: wrongLabel },
              skipped: { bg: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-tertiary)", label: "Skipped · 0" },
            };
            const sStyle = sStyles[status];

            return (
              <div key={q.id} id={`qcard-${q.id}`} style={{ background: "var(--c-surface)", borderTop: d === 0 ? "none" : "1px solid var(--c-border-faint)", padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-secondary)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {d + 1}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: sStyle.bg, color: sStyle.color }}>
                    {sStyle.label}
                  </div>
                  {/* D4: Verified chip — the AI audit passed this question
                      (verdict 'ok') or an admin confirmed it (accept/keep).
                      `verified` rides in on the existing select("*"). */}
                  {q.verified === true && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, color: "var(--c-success)", background: "var(--c-success-soft, #D6F3E3)", borderRadius: 999, padding: "4px 10px" }}>
                      <Check size={10} /> Verified
                    </span>
                  )}
                  {/* honest flag: a RIGHT answer that was really a guess →
                      the Mistake Vault schedules it for practice. Violet is
                      the approved-preview accent — no portal var exists, so
                      the same rgba approach as Dashboard's D2 cards. */}
                  {status === "correct" && (
                    <button
                      onClick={() => toggleLucky(q.id)}
                      disabled={luckyBusy === q.id}
                      title={luckyIds[String(q.id)] ? "Undo — remove it from the vault" : "Be honest — the vault will make sure you actually know it"}
                      style={
                        luckyIds[String(q.id)]
                          ? {
                              fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 999,
                              background: "rgba(151,113,224,0.14)" /* violet tint — no portal var */,
                              color: "rgba(151,113,224,1)" /* violet — approved-preview accent */,
                              border: "1px solid rgba(151,113,224,0.35)",
                              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                              opacity: luckyBusy === q.id ? 0.6 : 1,
                            }
                          : {
                              fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 999,
                              background: "transparent", color: "var(--c-text-tertiary)",
                              border: "1px solid var(--c-border-soft)",
                              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                              opacity: luckyBusy === q.id ? 0.6 : 1,
                            }
                      }
                    >
                      {luckyIds[String(q.id)] ? "Lucky guess — vault mein practice hoga" : "Guessed this one?"}
                    </button>
                  )}
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
                        <div style={{ position: "relative", width: "100%", maxWidth: 500 }}>
                          <iframe className="aspect-video w-full rounded-xl" src={videoUrl} style={{ background: "var(--c-surface-muted, var(--c-bg))" }} />
                          <button
                            onClick={() => setActiveVideo(null)}
                            aria-label="Close video"
                            style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 14, lineHeight: "28px", display: "grid", placeItems: "center" }}
                          >
                            ✕
                          </button>
                        </div>
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
                {/* Video slot marked but empty — quiet strip instead of a
                    broken dark player. Only when a written solution exists,
                    so the promise is honest. */}
                {videoComingSoon && hasExplanation && (
                  <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 12, border: "1px dashed var(--c-border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ display: "inline-grid", placeItems: "center", width: 30, height: 30, borderRadius: "50%", background: "var(--c-brand-gold-tint, rgba(214,158,46,0.14))", color: "var(--c-brand-gold)", flexShrink: 0 }}>
                      <Play size={13} />
                    </span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: "var(--c-text-secondary)" }}>Video solution coming soon.</span>{" "}
                      <span style={{ color: "var(--c-text-tertiary)" }}>The written solution covers the full method.</span>
                    </span>
                  </div>
                )}

                {/* D4: Report an issue — self-contained link → popover →
                    question_reports insert (source 'bank'). Hooks live
                    inside the child component, never in this map. */}
                <ReportIssue source="bank" questionId={q.id} user={result?.user} />
              </div>
            );
          })}
        </div>

        {/* === MENTOR'S READ — D4 coaching layer, closes the main column
            (same order as the mock page: review → mentor's read). === */}
        <div style={{ marginTop: 28 }}>
          <MentorRead lines={mentorLines} />
        </div>

        </div>{/* /main column */}

        {/* === RAIL — compact leaderboard (sticky on wide screens, stacks
            below the main column on narrow ones via flex-wrap). === */}
        {board && Array.isArray(board.top) && board.top.length > 0 && (
          <aside style={{ flex: "0 1 320px", minWidth: 280, position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <LeaderboardBlock board={board} compact />
          </aside>
        )}
        </div>{/* /two-column */}

      </div>
    </div>
  );
};

export default ResultPage;

// ── Sub-components ──
// Preview-1 stat card: uppercase key, Fraunces value with a small
// unit, quiet meta line. `good` = success colour (without-negatives
// when it beats the score).
function StatCard({ label, value, suffix, sub, good }) {
  return (
    <div style={{ flex: "1 1 160px", minWidth: 150, background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "16px 20px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-accent)", fontSize: 24, marginTop: 4, color: good ? "var(--c-success)" : "var(--c-text-primary)", fontVariantNumeric: "tabular-nums" }}>
        {value}
        {suffix && <small style={{ fontSize: 12, color: "var(--c-text-tertiary)", fontFamily: "var(--font-body, inherit)", marginLeft: 4 }}>{suffix}</small>}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--c-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function LegendSq({ color, muted, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 9, height: 9, borderRadius: 3, display: "inline-block",
          background: muted ? "var(--c-surface-muted, var(--c-bg))" : color,
          border: muted ? "1px solid var(--c-border-soft)" : "none",
        }}
      />
      {label}
    </span>
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
  borderRadius: 16,
  boxShadow: "var(--c-shadow-xs)",
  padding: "30px 32px 26px",
  marginBottom: 14,
  position: "relative",
  overflow: "hidden",
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
  // Perf round 3: questions intentionally NOT fetched server-side —
  // the client loads them after first paint (see ResultPage).
  // 2026-08 correctness audit: the SSR leaderboard query is GONE — it
  // returned the raw stored `score` column (legacy rows carry
  // percentages, "100" for everyone) with no per-student dedupe. The
  // page now consumes /api/leaderboard, which re-scores every play
  // under the canonical rule.
  const questions = null;
  return { props: { result, questions } };
}
