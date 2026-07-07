// ============================================================
// Mock Result page — Phase 8 redesign
// Premium scoring summary: hero score, KPI row, section rings,
// test info strip, question-by-question review with section blocks.
// All existing data fetching and scoring logic preserved.
// ============================================================

import Loader from "@/components/Loader";
import { useNMNContext } from "@/components/NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { Play, Printer, ArrowLeft, ArrowRight, BookOpen, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

// Ship 4: Supabase returns question ids as number OR string depending on the
// query path. Compare as strings everywhere (same helper as the runners).
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

export default function MockResult({ result }) {
  const [sections, setSections] = useState();
  const [modules, setModules] = useState();
  const [questions, setQuestions] = useState();
  const [activeVideo, setActiveVideo] = useState();
  const [modal, setModal] = useState(undefined);
  const [activeFilter, setActiveFilter] = useState("all");
  const [leaderboard, setLeaderboard] = useState([]);

  const router = useRouter();
  const { userDetails, isRouting } = useNMNContext();

  async function getSections(a) {
    const { data, error } = await supabase
      .from("mock_groups")
      .select("*,subject(*)")
      .eq("test", a)
      .order("seq", { ascending: true });
    if (data) {
      const subjectGroups = data.filter(
        (s) => s.type === "subject" || (s.subject != null && s.module == null),
      );
      setSections(subjectGroups);
      getModules(data);
    }
  }
  async function getModules(a) {
    const { data, error } = await supabase
      .from("mock_groups")
      .select("*,module(*)")
      .in("parent_sub", a.map((i) => i.id));
    if (data) {
      setModules(data);
      getQuestions(data);
    }
  }
  async function getQuestions(a) {
    const { data, error } = await supabase
      .from("mock_questions")
      .select("*")
      .in("parent", a.filter((i) => i.module).map((i) => i.module.id))
      .order("seq", { ascending: true });
    if (data) {
      setQuestions(data);
      getLeaderboard(result?.test_id?.id);
    }
  }
  async function getLeaderboard(testId) {
    if (!testId) return;
    try {
      const { data } = await supabase
        .from("mock_plays")
        .select("uid,score,name")
        .eq("test_id", testId)
        .order("score", { ascending: false })
        .limit(10);
      if (data) setLeaderboard(data);
    } catch (e) { /* silent */ }
  }
  useEffect(() => {
    if (result != undefined) getSections(result?.test_id.id);
  }, []);

  // ── Per-question scoring helper ──
  // SA normalisation (Ship 1 — 2026-07): the prior version stripped
  // whitespace but was still strict + case-sensitive + never collapsed
  // numeric equivalents. Students typing "5", " 5", "5.0", or "PARIS"
  // against a stored "5" / "Paris" were marked wrong for correct answers.
  const normalizeAns = (s) => {
    if (s == null) return "";
    const trimmed = String(s).trim().toLowerCase().replace(/\s+/g, "");
    if (/^-?\d*\.?\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isNaN(n) && Number.isFinite(n)) return String(n);
    }
    return trimmed;
  };

  function isQuestionCorrect(q, reportItem) {
    if (!reportItem) return null; // not attempted
    if (q.type === "options") {
      // Guard `NaN - 1` when `value` is nil (skipped mid-flight, etc.)
      if (reportItem.value == null) return null;
      const reportValue = Number(reportItem.value) - 1;
      if (!Number.isFinite(reportValue)) return null;
      if (!Array.isArray(q?.options)) return null;
      const correctIdx = q.options.findIndex((o) => o?.isCorrect);
      return correctIdx === reportValue;
    }
    if (q.type === "input") {
      return normalizeAns(q?.options?.answer) === normalizeAns(reportItem.value);
    }
    return null;
  }

  function getQStatus(q) {
    if (!result) return "skipped";
    const answered = result.report?.find((r) => sameId(r.id, q.id));
    const isMarked = result.data
      ?.filter((m) => m.status == "review")
      ?.some((m) => sameId(m.id, q.id));
    if (!answered) return isMarked ? "marked" : "skipped";
    const correct = isQuestionCorrect(q, answered);
    if (correct === true) return "correct";
    if (correct === false) return "wrong";
    return "skipped";
  }

  // ── Aggregate stats (memoised) ──
  const stats = useMemo(() => {
    if (!sections || !modules || !questions || !result) return null;

    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let markedCount = 0;
    const perSection = [];

    sections.forEach((sec) => {
      const secModules = modules.filter((m) => m.parent_sub === sec.id);
      let secScore = 0;
      let secMax = 0;
      let secCorrect = 0;
      let secTotal = 0;
      let secNegs = 0;
      const pos = sec.pos || 0;
      const neg = sec.neg || 0;
      secModules.forEach((mod) => {
        if (!mod.module) return;
        const qs = questions.filter((q) => q.parent === mod.module.id);
        qs.forEach((q) => {
          secTotal += 1;
          secMax += pos;
          const reportItem = result.report?.find((r) => sameId(r.id, q.id));
          const isCorrect = isQuestionCorrect(q, reportItem);
          // Ship 4: marked questions were counted under BOTH skipped and
          // marked (and answered+marked under correct/wrong AND marked), so
          // pill totals never summed to totalQ. Partition to match getQStatus:
          // correct / wrong / marked (unanswered+review) / skipped.
          const isMarked = result.data
            ?.filter((m) => m.status == "review")
            ?.some((m) => sameId(m.id, q.id));
          if (isCorrect === true) {
            secScore += pos;
            secCorrect += 1;
            correctCount += 1;
          } else if (isCorrect === false) {
            secScore += neg;
            secNegs += Math.abs(neg);
            wrongCount += 1;
          } else if (isMarked) {
            markedCount += 1;
          } else {
            skippedCount += 1;
          }
        });
      });
      totalScore += secScore;
      maxScore += secMax;
      perSection.push({
        sec,
        score: secScore,
        max: secMax,
        correct: secCorrect,
        total: secTotal,
        negs: secNegs,
        pct: secMax > 0 ? Math.round((Math.max(0, secScore) / secMax) * 100) : 0,
      });
    });

    // Ship 4: markedCount is now disjoint from skippedCount — include it
    const totalQ = correctCount + wrongCount + skippedCount + markedCount;
    const attempted = correctCount + wrongCount;
    // Ship 2 fix (2026-07): denominator was `totalQ` (total questions,
    // including skipped) while the label read "Out of N attempted".
    // Accuracy is by definition correct / attempted — skipped shouldn't
    // dilute it. Fixed both the calc and the label sub-line.
    const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;
    const totalNeg = perSection.reduce((s, p) => s + p.negs, 0);

    return {
      totalScore,
      maxScore,
      correctCount,
      wrongCount,
      skippedCount,
      markedCount,
      totalQ,
      attempted,
      accuracy,
      totalNeg,
      perSection,
    };
  }, [sections, modules, questions, result]);

  // Total time taken in minutes.
  // Ship 4: prefer the wall-clock `duration` column (runner records
  // submit − start). max(at) misses all time spent on the final question;
  // kept only as fallback for plays recorded before the column existed.
  const totalTimeMin = useMemo(() => {
    if (Number.isFinite(Number(result?.duration)) && result.duration > 0) {
      return Math.round(result.duration / 60);
    }
    if (!result?.report) return 0;
    const maxAt = result.report.reduce((m, r) => (typeof r.at === "number" && r.at > m ? r.at : m), 0);
    return Math.round(maxAt / 60);
  }, [result]);

  // Ship 4: dropped the deprecated mql.addListener block — it attached a new
  // listener on every click (leak) and only console.logged.
  function printPage() {
    window.print();
  }

  if (userDetails == undefined) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center" style={{ background: "var(--c-bg)", color: "var(--c-text-primary)" }}>
        <p style={{ marginBottom: 16 }}>You cannot access this without logging in</p>
        <Button as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank" color="primary">
          Login
        </Button>
      </div>
    );
  }
  if (questions == undefined || result == undefined || stats == null) {
    return (
      <div className="flex flex-col justify-center items-center text-center h-screen w-full" style={{ background: "var(--c-bg)", color: "var(--c-text-primary)" }}>
        <Loader />
        <p style={{ marginTop: 12, color: "var(--c-text-tertiary)" }}>Loading your result…</p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>
      {/* Solution Modal */}
      <Modal isOpen={modal != undefined} onClose={() => setModal(undefined)} size="2xl">
        <ModalContent>
          <ModalHeader>Solution</ModalHeader>
          <ModalBody>
            {modal?.explanationimage && (
              <img className="w-full h-full aspect-video max-w-lg" src={modal?.explanationimage} />
            )}
            <div dangerouslySetInnerHTML={{ __html: modal?.explanation }}></div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="flat" onPress={() => setModal(undefined)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px 80px" }}>

        {/* === TOP ACTION BAR === */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600, fontSize: 14 }}>
            <img src="/newlog.svg" style={{ height: 32, width: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/")} style={pillGhost}>
              <ArrowLeft size={14} /> Back to dashboard
            </button>
            <button onClick={() => printPage()} style={pillGhost}>
              <Printer size={14} /> Print
            </button>
            <button
              onClick={() => router.push(`/mock/analytics/${router.query.uid}`)}
              style={pillPrimary}
              disabled={isRouting}
            >
              <BarChart3 size={14} /> View detailed analysis <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* === HERO SCORE === */}
        <div style={heroCard}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 280, height: 280, background: "radial-gradient(circle, var(--c-brand-primary-tint) 0%, transparent 70%)", opacity: 0.6, transform: "translate(20%, -30%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={eyebrowStyle}>Test result · {stats.perSection.length > 1 ? "Full mock" : "Sectional test"}</div>
            <h1 style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--c-text-primary)", lineHeight: 1, margin: 0, fontVariantNumeric: "tabular-nums" }}>
              You scored{" "}
              <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
                {Math.max(0, stats.totalScore)}
              </span>
            </h1>
            <div style={{ marginTop: 14, fontSize: 15, color: "var(--c-text-secondary)", display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
              <span>out of {stats.maxScore}</span>
              <span style={{ color: "var(--c-text-tertiary)" }}>·</span>
              <span>{stats.accuracy}% accuracy</span>
              <span style={{ color: "var(--c-text-tertiary)" }}>·</span>
              <span>Submitted {CtoLocal(result.created_at).date} {CtoLocal(result.created_at).monthName} {CtoLocal(result.created_at).year}</span>
            </div>
          </div>
        </div>
        <div style={{ height: 16 }} />

        {/* === KPI ROW === */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          <Kpi label="Total score" value={Math.max(0, stats.totalScore)} unit={`/ ${stats.maxScore}`} sub={`${stats.correctCount} right · ${stats.wrongCount} wrong`} />
          <Kpi label="Accuracy" value={stats.accuracy} unit="%" sub={`${stats.correctCount} correct of ${stats.attempted} attempted`} />
          <Kpi label="Time taken" value={totalTimeMin || "—"} unit={totalTimeMin ? "min" : ""} sub={totalTimeMin ? `Avg ${Math.round((totalTimeMin * 60) / stats.totalQ)}s / Q` : ""} />
          <Kpi label="Without negatives" value={Math.max(0, stats.totalScore + stats.totalNeg)} unit="" sub={stats.totalNeg > 0 ? `+${stats.totalNeg} from negatives` : "No negatives"} success />
        </div>

        {/* === PERFORMANCE (adaptive: single big ring for 1 section, grid for more) === */}
        <h2 style={sectionTitle}>{stats.perSection.length === 1 ? "Performance" : "Section breakdown"}</h2>
        {stats.perSection.length === 1 ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            {stats.perSection.map((s, d) => {
              const color = s.pct >= 90 ? "#1FA463" : s.pct >= 70 ? "var(--c-brand-primary)" : "#B66C00";
              const dashArray = (s.pct / 100) * 314;
              return (
                <div key={d} style={{ ...sectionCard, padding: 32, maxWidth: 360, width: "100%" }}>
                  <div style={{ width: 160, height: 160, position: "relative", marginBottom: 14 }}>
                    <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" stroke="var(--c-border-faint)" />
                      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" stroke={color} strokeLinecap="round" strokeDasharray={`${dashArray} 314`} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 32, fontWeight: 600, color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>
                      {s.pct}<span style={{ fontSize: 16, color: "var(--c-text-tertiary)", marginLeft: 1 }}>%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em", textAlign: "center" }}>
                    {s.sec.subject?.title || "Section"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                    {Math.max(0, s.score)} / {s.max} · {s.correct} of {s.total} correct
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, stats.perSection.length)}, 1fr)`, gap: 12, marginBottom: 32 }}>
            {stats.perSection.map((s, d) => {
              const color = s.pct >= 90 ? "#1FA463" : s.pct >= 70 ? "var(--c-brand-primary)" : "#B66C00";
              const dashArray = (s.pct / 100) * 314;
              return (
                <div key={d} style={sectionCard}>
                  <div style={{ width: 110, height: 110, position: "relative", marginBottom: 14 }}>
                    <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" stroke="var(--c-border-faint)" />
                      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" stroke={color} strokeLinecap="round" strokeDasharray={`${dashArray} 314`} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 600, color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>
                      {s.pct}<span style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginLeft: 1 }}>%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em", textAlign: "center" }}>
                    {s.sec.subject?.title || "Section"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                    {Math.max(0, s.score)} / {s.max}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* === TOP SCORERS — only when leaderboard data exists === */}
        {leaderboard && leaderboard.length > 0 && (
          <>
            <h2 style={sectionTitle}>🏆 Top scorers</h2>
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
                    }}>{idx + 1}</div>
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

        {/* === TEST INFO STRIP === */}
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 18, padding: "24px 28px", marginBottom: 32, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          <InfoCol k="Participant" v={result?.name || userDetails?.user_metadata?.full_name || "—"} />
          <InfoCol k="Test centre" v="IPM Careers Online Portal" />
          <InfoCol k="Test date" v={`${CtoLocal(result.created_at).dayName}, ${CtoLocal(result.created_at).date} ${CtoLocal(result.created_at).monthName}, ${CtoLocal(result.created_at).year}`} />
          <InfoCol k="Test name" v={result.test_id.title} />
        </div>

        {/* === QUESTION REVIEW === */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "32px 0 16px", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Question-by-question review</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <FilterPill label="All" count={stats.totalQ} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            <FilterPill label="Correct" count={stats.correctCount} active={activeFilter === "correct"} onClick={() => setActiveFilter("correct")} />
            <FilterPill label="Wrong" count={stats.wrongCount} active={activeFilter === "wrong"} onClick={() => setActiveFilter("wrong")} />
            <FilterPill label="Skipped" count={stats.skippedCount} active={activeFilter === "skipped"} onClick={() => setActiveFilter("skipped")} />
            <FilterPill label="Marked" count={stats.markedCount} active={activeFilter === "marked"} onClick={() => setActiveFilter("marked")} />
          </div>
        </div>

        {sections && sections.map((sec, d) => {
          const secModules = modules?.filter((m) => m.parent_sub === sec.id) || [];
          const secStats = stats.perSection.find((p) => p.sec.id === sec.id);

          // Collect all questions in this section across modules with global numbering
          let qIndex = 0;
          const cards = [];
          secModules.forEach((mod) => {
            if (!mod.module) return;
            const qs = (questions || []).filter((q) => q.parent === mod.module.id).sort((a, b) => a.seq - b.seq);
            qs.forEach((q) => {
              qIndex += 1;
              const status = getQStatus(q);
              if (activeFilter !== "all" && activeFilter !== status) return;
              // Phase 14 Ship A.2: guard findIndex — SA/input questions store options as an object {answer},
              // not an array, so optional chaining alone wasn't enough. Without this guard the result page
              // crashes with "n.findIndex is not a function" on any test with non-MCQ questions.
              const correctIdx = Array.isArray(q?.options)
                ? q.options.findIndex((o) => o?.isCorrect)
                : -1;
              const reportItem = result.report?.find((r) => sameId(r.id, q.id));
              // Ship 4: sameId lookup (strict === missed string/number ids →
              // "Your choice" never highlighted) + Number coercion for value.
              const chosenIdx =
                reportItem && Number.isFinite(Number(reportItem.value))
                  ? Number(reportItem.value) - 1
                  : null;
              cards.push(
                <QuestionCard
                  key={q.id}
                  q={q}
                  index={qIndex}
                  status={status}
                  pos={sec.pos || 0}
                  neg={sec.neg || 0}
                  correctIdx={correctIdx}
                  chosenIdx={chosenIdx}
                  inputValue={reportItem?.value}
                  activeVideo={activeVideo}
                  setActiveVideo={setActiveVideo}
                  setModal={setModal}
                />
              );
            });
          });

          if (cards.length === 0) return null;

          return (
            <div key={sec.id} style={{ marginBottom: 28 }}>
              <div style={sectionStrip}>
                {sec.subject?.title || "Section"}
                {secStats && (
                  <span style={sectionStripBadge}>
                    {Math.max(0, secStats.score)} / {secStats.max} · {secStats.pct}%
                  </span>
                )}
              </div>
              {cards}
            </div>
          );
        })}

      </div>
    </div>
  );
}

// ── Sub-components ──
function Kpi({ label, value, unit, sub, success }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 18, padding: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: success ? "var(--c-success)" : "var(--c-text-primary)", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--c-text-tertiary)", marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function InfoCol({ k, v }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 6 }}>{k}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c-text-primary)", letterSpacing: "-0.005em" }}>{v}</div>
    </div>
  );
}

function FilterPill({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 32, padding: "0 12px", borderRadius: 999,
        background: active ? "var(--c-brand-primary)" : "var(--c-surface)",
        border: `1px solid ${active ? "transparent" : "var(--c-border-soft)"}`,
        color: active ? "#fff" : "var(--c-text-secondary)",
        fontFamily: "inherit", fontSize: 12, fontWeight: 500,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{
        background: active ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
        padding: "1px 6px", borderRadius: 8,
        fontSize: 11, fontVariantNumeric: "tabular-nums",
      }}>
        {count}
      </span>
    </button>
  );
}

function QuestionCard({ q, index, status, pos, neg, correctIdx, chosenIdx, inputValue, activeVideo, setActiveVideo, setModal }) {
  const statusStyles = {
    correct: { bg: "var(--c-success-soft, #E0F2E8)", color: "var(--c-success)", label: `Correct · +${pos}` },
    wrong: { bg: "var(--c-danger-soft, #F8DADA)", color: "var(--c-danger)", label: `Wrong · ${neg >= 0 ? "+" : ""}${neg}` },
    skipped: { bg: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-tertiary)", label: "Skipped · 0" },
    marked: { bg: "var(--c-brand-primary-tint)", color: "var(--c-brand-primary)", label: "Marked · 0" },
  };
  const sStyle = statusStyles[status] || statusStyles.skipped;

  return (
    <div style={qCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-secondary)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
          {index}
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: sStyle.bg, color: sStyle.color }}>
          {sStyle.label}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--c-text-tertiary)", fontFamily: "monospace" }}>
          Q#{q.id}
        </div>
      </div>

      {q.title && <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: "var(--c-text-primary)", margin: "0 0 8px", maxWidth: "70ch" }}>{q.title}</p>}
      <div className="qcontent" style={{ fontSize: 15, lineHeight: 1.6, color: "var(--c-text-primary)", margin: "0 0 18px", maxWidth: "70ch" }} dangerouslySetInnerHTML={{ __html: q.question }} />
      {q.questionimage && <img src={q.questionimage} style={{ maxHeight: 200, marginBottom: 16, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />}

      {q.type === "options" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {q.options?.map((opt, i) => {
            const isCorrect = i === correctIdx;
            const isChosen = i === chosenIdx;
            const isChosenWrong = isChosen && !isCorrect;
            const letter = String.fromCharCode(65 + i);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 16px",
                background: isCorrect ? "var(--c-success-soft, #E0F2E8)" : isChosenWrong ? "var(--c-danger-soft, #F8DADA)" : "var(--c-surface-muted, var(--c-bg))",
                border: `1px solid ${isCorrect ? "var(--c-success)" : isChosenWrong ? "var(--c-danger)" : "var(--c-border-faint)"}`,
                borderRadius: 12,
                fontSize: 14,
                color: isCorrect || isChosenWrong ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                textDecoration: isChosenWrong ? "line-through" : "none",
                textDecorationColor: isChosenWrong ? "var(--c-danger)" : "transparent",
              }}>
                <span style={{
                  flexShrink: 0,
                  width: 24, height: 24, borderRadius: 6,
                  background: isCorrect ? "var(--c-success)" : isChosenWrong ? "var(--c-danger)" : "var(--c-surface)",
                  color: isCorrect || isChosenWrong ? "#fff" : "var(--c-text-secondary)",
                  display: "grid", placeItems: "center",
                  fontWeight: 600, fontSize: 12,
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

      {q.type === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: status === "correct" ? "var(--c-success-soft, #E0F2E8)" : status === "wrong" ? "var(--c-danger-soft, #F8DADA)" : "var(--c-surface-muted, var(--c-bg))",
            border: `1px solid ${status === "correct" ? "var(--c-success)" : status === "wrong" ? "var(--c-danger)" : "var(--c-border-faint)"}`,
            fontSize: 14,
            color: "var(--c-text-primary)",
          }}>
            <span style={{ color: "var(--c-text-tertiary)", marginRight: 8 }}>Your answer:</span>
            {inputValue ?? <span style={{ color: "var(--c-text-tertiary)" }}>—</span>}
          </div>
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--c-success-soft, #E0F2E8)", border: "1px solid var(--c-success)", fontSize: 14, color: "var(--c-text-primary)" }}>
            <span style={{ color: "var(--c-success)", fontWeight: 500, marginRight: 8 }}>Correct answer:</span>
            {q?.options?.answer}
          </div>
        </div>
      )}

      {/* Solution actions */}
      {((q.video && q.video.length > 2) ||
        (q.explanation && q.explanation !== "<p><strong>Write your Explanation Here...</strong></p>") ||
        q.explanationimage) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 14, borderTop: "1px solid var(--c-border-faint)", flexWrap: "wrap" }}>
          {q.video && q.video.length > 2 && (
            activeVideo === q.id ? (
              <iframe className="aspect-video w-full max-w-[500px] rounded-xl" src={q.video} style={{ background: "var(--c-surface-muted, var(--c-bg))" }} />
            ) : (
              <button onClick={() => setActiveVideo(q.id)} style={pillGhost}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--c-brand-primary)", color: "#fff" }}>
                  <Play size={12} fill="#fff" />
                </span>
                Watch video solution
              </button>
            )
          )}
          {((q.explanation && q.explanation !== "<p><strong>Write your Explanation Here...</strong></p>") || q.explanationimage) && (
            <button onClick={() => setModal(q)} style={pillGhost}>
              <BookOpen size={14} /> Read written solution
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared inline style objects ──
const eyebrowStyle = {
  fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--c-text-tertiary)",
  marginBottom: 10,
};
const sectionTitle = {
  fontSize: 20, fontWeight: 600, letterSpacing: "-0.018em",
  margin: "0 0 16px",
  color: "var(--c-text-primary)",
};
const heroCard = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 24,
  padding: "40px 44px",
  marginBottom: 16,
  position: "relative",
  overflow: "hidden",
};
const sectionCard = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 18,
  padding: 24,
  display: "flex", flexDirection: "column",
  alignItems: "center",
};
const sectionStrip = {
  background: "var(--c-surface-muted, var(--c-bg))",
  border: "1px solid var(--c-border-faint)",
  borderRadius: "14px 14px 0 0",
  padding: "14px 20px",
  fontSize: 13, fontWeight: 600,
  color: "var(--c-text-primary)",
  letterSpacing: "-0.005em",
  borderBottom: "none",
  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
};
const sectionStripBadge = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-soft)",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  color: "var(--c-text-tertiary)",
  fontWeight: 500,
  letterSpacing: 0,
  fontVariantNumeric: "tabular-nums",
};
const qCard = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderTop: "none",
  padding: 24,
};
const pillGhost = {
  height: 36, padding: "0 14px", borderRadius: 999,
  background: "transparent",
  color: "var(--c-text-secondary)",
  border: "1px solid var(--c-border-soft)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "inherit", whiteSpace: "nowrap",
  transition: "all 0.18s ease",
};
const pillPrimary = {
  ...pillGhost,
  background: "var(--c-brand-primary)",
  color: "#fff",
  border: "1px solid transparent",
};

export async function getServerSideProps(context) {
  const { data, error } = await serversupabase
    .from("mock_plays")
    .select("*,test_id(*)")
    .eq("uid", context.query.uid);
  if (data && data.length > 0) {
    // ok
  }
  if (data?.length === 0 || error) {
    return { notFound: true };
  }
  return { props: { result: data[0] } };
}
