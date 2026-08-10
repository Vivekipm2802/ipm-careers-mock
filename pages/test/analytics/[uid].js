// ============================================================
// Concept Test Analytics — Phase 9.1
// All widgets inlined (palette grid, time bars, score progression,
// distribution stack). Matches the v3 preview exactly. Dark mode safe.
// ============================================================

import React, { useEffect, useState, useMemo } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useNMNContext } from "@/components/NMNContext";
import Loader from "@/components/Loader";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import {
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader,
  Button, Chip, RadioGroup, Radio,
} from "@nextui-org/react";
import { Printer, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
// 2026-08 correctness audit: canonical scoring + verdict re-derivation
// (SA wrongs cost 0, content-first MCQ matching, numeric-aware SA compare).
import { scoreConceptPlay } from "@/lib/scoring";

const ConceptAnalytics = ({ result }) => {
  const [questions, setQuestions] = useState();
  const [ats, setAts] = useState({ atsRank: "—", totalRank: "—" });
  const [filter, setFilter] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [topper, setTopper] = useState(null);
  const [top10Avg, setTop10Avg] = useState(null);

  const { userDetails, isRouting } = useNMNContext();
  const router = useRouter();

  useEffect(() => {
    if (result?.test_uuid) {
      getQuestions(result.test_uuid);
      getATSRank(result?.uid);
      getHistory();
      getTopperData(result?.test_uuid?.uuid);
    }
  }, [result]);

  async function getQuestions(testUuid) {
    const { data } = await supabase.from("questions").select("*").eq("parent", testUuid.id);
    if (data) setQuestions(data);
  }
  async function getATSRank(uid) {
    try {
      const { data } = await supabase.rpc("get_row_rank", { uid_input: uid });
      if (data) setAts({ atsRank: data[0]?.your_rank || "—", totalRank: data[0]?.total_ats_rank || "—" });
    } catch (e) { /* silent */ }
  }
  async function getHistory() {
    if (!userDetails?.id) return;
    const { data } = await supabase
      .from("plays")
      .select("uid,created_at,score,test_uuid(title)")
      .eq("user", userDetails.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setHistory(data.reverse());
  }
  async function getTopperData(testUuid) {
    // 2026-08 correctness audit: the old direct plays query read the raw
    // stored score column (legacy percentages, no dedupe, RLS-limited) and
    // had no attempted/correct/time data → the topper row rendered "—".
    // /api/leaderboard re-scores canonically and returns the full field set.
    if (!testUuid) return;
    try {
      const { getAuthHeaders } = await import("@/utils/authHeaders");
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/leaderboard?type=concept&testId=${encodeURIComponent(testUuid)}`,
        { headers },
      );
      if (!res.ok) return;
      const data = await res.json();
      const t = data?.top?.[0];
      if (t) {
        setTopper({
          score: Math.max(0, t.scoreMarks),
          maxMarks: t.maxMarks,
          attempted: t.attempted,
          correct: t.correct,
          timeMin: t.timeMin,
          name: t.isYou ? "You" : t.name || "Top scorer",
          count: data.totalPlayers,
        });
      }
      if (data?.top10pctAvg) setTop10Avg(data.top10pctAvg);
    } catch (e) { /* silent */ }
  }

  const increment = result?.config?.increment ?? 4;
  const decrement = result?.config?.decrement ?? 1;

  const stats = useMemo(() => {
    if (!questions || !result) return null;
    // 2026-08 correctness audit: recompute from the raw stored answers via
    // lib/scoring — canonical +increment/−decrement, SA wrongs cost 0,
    // verdicts re-derived (stored isCorrect only as fallback). Historical
    // rows were marked under broken comparison rules.
    const s = scoreConceptPlay(questions, result.report || [], result?.config);
    const totalQ = questions.length;
    const skippedCount = Math.max(0, totalQ - s.correct - s.wrong);
    const accuracy = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
    return { correctCount: s.correct, wrongCount: s.wrong, skippedCount, attempted: s.attempted, totalQ,
             positiveScore: s.positive, negativeScore: s.negative, totalScore: s.score,
             maxScore: s.maxMarks, accuracy, verdictById: s.verdictById };
  }, [questions, result]);

  function getQStatus(q) {
    // 2026-08: re-derived verdict first; stored isCorrect as fallback.
    const v = stats?.verdictById?.[String(q.id)];
    if (v === true) return "correct";
    if (v === false) return "wrong";
    if (v === null) return "skipped";
    if (!result?.report) return "skipped";
    const r = result.report.find((rep) => String(rep.id) === String(q.id));
    if (!r) return "skipped";
    if (r.isCorrect === true) return "correct";
    if (r.isCorrect === false) return "wrong";
    return "skipped";
  }

  const questionTimes = useMemo(() => {
    if (!result?.report || !questions) return new Map();
    const sorted = [...result.report].filter((r) => typeof r.timestamp === "number").sort((a, b) => a.timestamp - b.timestamp);
    const map = new Map();
    let prev = 0;
    sorted.forEach((r) => {
      const t = r.timestamp - prev;
      // Ship 2 fix (2026-07): previously dropped anything ≥ 30 min
      // (`t < 1800`). Concept tests can legitimately have questions
      // taking longer. Keep everything ≥ 0 seconds; cap at 2 hours.
      // Ship 4: String key — report ids can be string while q.id is number;
      // Map.get is strict, so every lookup missed and all times showed 0.
      if (t >= 0 && t < 7200) map.set(String(r.id), t);
      prev = r.timestamp;
    });
    return map;
  }, [result, questions]);

  // ── Items as { q, idx } for inline widgets ──
  const items = useMemo(() => {
    if (!questions) return [];
    return questions.map((q, idx) => ({ q, idx }));
  }, [questions]);

  const wrongList = useMemo(() => items.filter(({ q }) => getQStatus(q) === "wrong")
                                       .map(({ q, idx }) => ({ q, idx, t: questionTimes.get(String(q.id)) || 0 })),
                            [items, result, questionTimes]);
  const slowestWrong = useMemo(() => [...wrongList].sort((a, b) => b.t - a.t).slice(0, 5), [wrongList]);
  const fastestWrong = useMemo(() => [...wrongList].sort((a, b) => a.t - b.t).slice(0, 5), [wrongList]);

  // Ship 4: prefer the wall-clock `duration` column (submit − start).
  // max(timestamp) misses time on the final question; fallback for old rows.
  const totalTimeMin = useMemo(() => {
    if (Number.isFinite(Number(result?.duration)) && result.duration > 0) {
      return Math.round(result.duration / 60);
    }
    if (!result?.report) return 0;
    const maxT = result.report.reduce((m, r) => (typeof r.timestamp === "number" && r.timestamp > m ? r.timestamp : m), 0);
    return Math.round(maxT / 60);
  }, [result]);

  function printPage() { window.print(); }

  if (!userDetails) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <p style={{ marginBottom: 16 }}>You cannot access this without logging in</p>
        <Button as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank" color="primary">Login</Button>
      </div>
    );
  }
  if (!questions || !result || !stats) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <Loader />
        <p style={{ marginTop: 12, color: "var(--c-text-tertiary)" }}>Loading your analytics…</p>
      </div>
    );
  }

  const testTitle = result?.test_uuid?.parent?.title || result?.test_uuid?.title || "Concept test";

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>

      {/* QUESTION MODAL */}
      <Modal isOpen={activeQuestion != undefined} onClose={() => setActiveQuestion(undefined)} size="2xl">
        <ModalContent>
          <ModalHeader>Question ID: {activeQuestion?.id}</ModalHeader>
          <ModalBody className="max-h-[70vh] overflow-auto">
            <div className="text-sm" dangerouslySetInnerHTML={{ __html: activeQuestion?.question }}></div>
            <Chip color="primary">Question Type: {activeQuestion?.type == "options" ? "MCQ" : "Answer"}</Chip>
            {activeQuestion?.type == "options" ? (
              <RadioGroup value={result?.report?.find((item) => item.id == activeQuestion?.id) && result?.report?.find((item) => item.id == activeQuestion?.id)?.selectedOption - 1}>
                {activeQuestion?.options?.map((option, index) => (
                  <Radio key={index} value={index} isDisabled color={option.isCorrect ? "success" : "danger"}>
                    {option.title}
                  </Radio>
                ))}
              </RadioGroup>
            ) : (
              <div style={{ padding: 12, borderRadius: 10, background: "var(--c-success-soft, #E0F2E8)" }}>
                <strong>Your answer:</strong> {result?.report?.find((item) => item.id == activeQuestion?.id)?.answer || "—"}
              </div>
            )}
            {activeQuestion?.explanation && (
              <>
                <Chip color="success">Solution</Chip>
                <div dangerouslySetInnerHTML={{ __html: activeQuestion?.explanation }}
                     style={{ padding: 12, borderRadius: 10, background: "var(--c-success-soft, #E0F2E8)", fontSize: 14, lineHeight: 1.6, color: "var(--c-text-primary)" }} />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" color="danger" onPress={() => setActiveQuestion(undefined)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px 80px" }}>

        {/* TOP BAR */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600, fontSize: 14 }}>
            <img src="/newlog.svg" style={{ height: 32, width: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <ThemeToggle />
            <button onClick={() => router.push("/")} style={pillGhost}>
              <ArrowLeft size={14} /> Back to dashboard
            </button>
            <button onClick={() => printPage()} style={pillGhost}>
              <Printer size={14} /> Print
            </button>
            <button onClick={() => router.push(`/test/result/${router.query.uid}`)} style={pillPrimary} disabled={isRouting}>
              View result <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* HEADER STRIP */}
        <div style={{ marginBottom: 28 }}>
          <div style={eyebrowStyle}>Detailed analysis</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)", margin: "0 0 22px" }}>
            {testTitle}
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, overflow: "hidden" }}>
            <Stat k="Score" v={Math.max(0, stats.totalScore)} u={`/ ${stats.maxScore}`} />
            <Stat k="Accuracy" v={stats.accuracy} u="%" />
            <Stat k="Rank" v={ats.atsRank || "—"} u={ats.totalRank ? `of ${ats.totalRank}` : ""} gold={ats.atsRank === 1} />
            <Stat k="Time taken" v={totalTimeMin || "—"} u={totalTimeMin ? "min" : ""} />
            <Stat k="Without negatives" v={Math.max(0, stats.positiveScore)} u="" success />
          </div>
        </div>

        {/* MULTI-TEST TREND */}
        {history && history.length >= 2 && (
          <Card title="Your score across last concept tests" meta={`${history.length} tests · latest on the right`}>
            <MockTrendChart history={history} />
          </Card>
        )}

        {/* COMPARE WITH TOPPER */}
        {(topper || top10Avg) && (
          <Card title="Your test vs. the topper" meta="Highest scorer on this exact concept test">
            <div style={{ border: "1px solid var(--c-border-faint)", borderRadius: 12, overflow: "hidden", fontSize: 13 }}>
              <CompareRow header />
              <CompareRow name="You" you score={Math.max(0, stats.totalScore)} attempted={`${stats.attempted} / ${stats.totalQ}`} correct={stats.correctCount} time={totalTimeMin ? `${totalTimeMin} min` : "—"} />
              {topper && (
                <CompareRow
                  name={topper.name ? `Topper · ${topper.name}` : "Topper"}
                  score={topper.score}
                  attempted={topper.attempted != null ? `${topper.attempted} / ${stats.totalQ}` : "—"}
                  correct={topper.correct ?? "—"}
                  time={topper.timeMin != null ? `${topper.timeMin} min` : "—"}
                />
              )}
              {top10Avg && (
                <CompareRow
                  muted
                  name={`Top 10% average${top10Avg.count ? ` (${top10Avg.count})` : ""}`}
                  score={top10Avg.scoreMarks ?? "—"}
                  attempted={top10Avg.attempted != null ? `${top10Avg.attempted} / ${stats.totalQ}` : "—"}
                  correct={top10Avg.correct ?? "—"}
                  time={top10Avg.timeMin != null ? `${top10Avg.timeMin} min` : "—"}
                />
              )}
            </div>
          </Card>
        )}

        {/* PERFORMANCE SUMMARY */}
        <Card title="Performance summary">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13.5, border: "1px solid var(--c-border-faint)", borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr>
                <th style={th}>Concept</th>
                <th style={{ ...th, textAlign: "right" }}>Q&apos;s</th>
                <th style={{ ...th, textAlign: "right" }}>Attempted</th>
                <th style={{ ...th, textAlign: "right" }}>Correct</th>
                <th style={{ ...th, textAlign: "right" }}>Wrong</th>
                <th style={{ ...th, textAlign: "right" }}>Skipped</th>
                <th style={{ ...th, textAlign: "right" }}>Score</th>
                <th style={{ ...th, textAlign: "right" }}>Negative</th>
                <th style={{ ...th, textAlign: "right" }}>Max</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...td, color: "var(--c-text-primary)", fontWeight: 500 }}>{testTitle}</td>
                <td style={tdNum}>{stats.totalQ}</td>
                <td style={tdNum}>{stats.attempted}</td>
                <td style={{ ...tdNum, color: "var(--c-success)" }}>{stats.correctCount}</td>
                <td style={{ ...tdNum, color: "var(--c-danger)" }}>{stats.wrongCount}</td>
                <td style={{ ...tdNum, color: "var(--c-text-tertiary)" }}>{stats.skippedCount}</td>
                <td style={tdNum}>{Math.max(0, stats.totalScore)}</td>
                <td style={{ ...tdNum, color: "var(--c-danger)" }}>{stats.negativeScore > 0 ? `−${stats.negativeScore}` : 0}</td>
                <td style={{ ...tdNum, color: "var(--c-text-tertiary)" }}>{stats.maxScore}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* QUESTION PALETTE */}
        <Card title="Question palette" meta="Click any cell to view the question + your answer">
          <PaletteGrid items={items} getStatus={getQStatus} onClick={(q) => setActiveQuestion(q)} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16, fontSize: 12, color: "var(--c-text-secondary)" }}>
            <LegendDot color="#22c55e" label="Correct" count={stats.correctCount} />
            <LegendDot color="#ef4444" label="Wrong" count={stats.wrongCount} />
            <LegendDot gray label="Skipped" count={stats.skippedCount} />
          </div>
        </Card>

        {/* TIME PER QUESTION */}
        <Card title="Time per question" meta="Wrong answers in red · long times in amber">
          <TimeBars items={items} getStatus={getQStatus} questionTimes={questionTimes} />
        </Card>

        {/* SCORE PROGRESSION */}
        <Card title="Cumulative score progression" meta="Where you gained marks · red dots are negative marks">
          <ScoreProgressionChart items={items} getStatus={getQStatus} pos={increment} neg={-decrement} />
        </Card>

        {/* ANSWER DISTRIBUTION (single concept) */}
        <Card title="Answer distribution">
          <DistRow name={testTitle} correct={stats.correctCount} wrong={stats.wrongCount} skipped={stats.skippedCount} />
        </Card>

        {/* SLOWEST / FASTEST WRONG */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-grid">
          <Card title="Slowest questions you got wrong" meta="Biggest time-leaks">
            <WrongList list={slowestWrong} onClick={(q) => setActiveQuestion(q)} emptyMsg="No wrong answers" hideSection />
          </Card>
          <Card title="Fastest questions you got wrong" meta="Likely careless mistakes">
            <WrongList list={fastestWrong} onClick={(q) => setActiveQuestion(q)} emptyMsg="No wrong answers" hideSection />
          </Card>
        </div>

      </div>

      <style jsx global>{`
        @media (max-width: 760px) {
          .two-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default ConceptAnalytics;

// ── Shared sub-components (same as mock) ──
function Card({ title, meta, children }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, padding: "22px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.012em", color: "var(--c-text-primary)", margin: 0 }}>{title}</h2>
        {meta && <div style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>{meta}</div>}
      </div>
      {children}
    </div>
  );
}
function Stat({ k, v, u, success, gold }) {
  return (
    <div style={{ padding: "18px 20px", borderRight: "1px solid var(--c-border-faint)" }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 8 }}>{k}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.018em", color: gold ? "var(--c-brand-gold)" : success ? "var(--c-success)" : "var(--c-text-primary)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {v}{u && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text-tertiary)", marginLeft: 3 }}>{u}</span>}
      </div>
    </div>
  );
}
function CompareRow({ header, name, you, muted, score, attempted, correct, time }) {
  const cellBase = { padding: "12px 16px", borderRight: "1px solid var(--c-border-faint)", borderBottom: "1px solid var(--c-border-faint)", fontVariantNumeric: "tabular-nums" };
  const hCell = { ...cellBase, background: "var(--c-surface-muted, var(--c-bg))", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-text-tertiary)" };
  if (header) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr" }}>
        <div style={hCell}>&nbsp;</div>
        <div style={hCell}>Score</div>
        <div style={hCell}>Attempted</div>
        <div style={hCell}>Correct</div>
        <div style={{ ...hCell, borderRight: "none" }}>Time</div>
      </div>
    );
  }
  const bg = you ? "var(--c-brand-primary-tint)" : "transparent";
  const color = muted ? "var(--c-text-tertiary)" : "var(--c-text-secondary)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr" }}>
      <div style={{ ...cellBase, background: bg, fontWeight: 600, color: "var(--c-text-primary)" }}>{name}</div>
      <div style={{ ...cellBase, background: bg, color }}>{score}</div>
      <div style={{ ...cellBase, background: bg, color }}>{attempted}</div>
      <div style={{ ...cellBase, background: bg, color }}>{correct}</div>
      <div style={{ ...cellBase, background: bg, color, borderRight: "none" }}>{time}</div>
    </div>
  );
}
function MockTrendChart({ history }) {
  if (!history || history.length === 0) return null;
  const scores = history.map((h) => h.score || 0);
  const maxS = Math.max(...scores, 100);
  const w = 1000, h = 160;
  const padding = 60;
  const innerW = w - padding * 2;
  const innerH = h - 40;
  const xStep = history.length > 1 ? innerW / (history.length - 1) : 0;
  const pts = scores.map((s, i) => ({ x: padding + i * xStep, y: 20 + innerH - (s / maxS) * innerH, score: s }));
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
  return (
    <div>
      <div style={{ height: 160, position: "relative" }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <linearGradient id="trendGradT" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-brand-primary)" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="var(--c-brand-primary)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1="40" x2={w} y2="40" stroke="var(--c-border-faint)"/>
          <line x1="0" y1="80" x2={w} y2="80" stroke="var(--c-border-faint)"/>
          <line x1="0" y1="120" x2={w} y2="120" stroke="var(--c-border-faint)"/>
          <path d={areaPath} fill="url(#trendGradT)"/>
          <path d={linePath} stroke="var(--c-brand-primary)" strokeWidth="2.5" fill="none"/>
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={i === pts.length - 1 ? 6 : 5} fill="var(--c-brand-primary)" stroke={i === pts.length - 1 ? "#fff" : "none"} strokeWidth={i === pts.length - 1 ? 2 : 0}/>
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fill={i === pts.length - 1 ? "var(--c-brand-primary)" : "var(--c-text-secondary)"} fontWeight={i === pts.length - 1 ? "600" : "500"}>{p.score}</text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
        {history.map((h, i) => (
          <span key={h.uid || i} style={i === history.length - 1 ? { color: "var(--c-brand-primary)", fontWeight: 600 } : {}}>
            {i === history.length - 1 ? "Latest" : `Test ${i + 1}`}
          </span>
        ))}
      </div>
    </div>
  );
}
function LegendDot({ color, gray, label, count }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: gray ? "var(--c-surface-sunken, var(--c-surface-muted))" : color, border: gray ? "1px solid var(--c-border-soft)" : "none" }} />
      {label} · <b style={{ color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums" }}>{count}</b>
    </span>
  );
}

function PaletteGrid({ items, getStatus, onClick }) {
  if (!items || items.length === 0) {
    return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>No questions</div>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6 }}>
      {items.map(({ q, idx }) => {
        const status = getStatus(q);
        const styles = {
          correct: { bg: "#22c55e", color: "#fff", border: "none" },
          wrong: { bg: "#ef4444", color: "#fff", border: "none" },
          skipped: { bg: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)" },
        };
        const s = styles[status] || styles.skipped;
        return (
          <button key={q.id} onClick={() => onClick(q)} title={`Q ${idx + 1} · ${status}`} style={{
            aspectRatio: "1", borderRadius: 6,
            background: s.bg, color: s.color, border: s.border,
            font: "600 11px/1 inherit", cursor: "pointer", fontVariantNumeric: "tabular-nums",
          }}>{idx + 1}</button>
        );
      })}
    </div>
  );
}
function TimeBars({ items, getStatus, questionTimes }) {
  if (!items || items.length === 0) {
    return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>No data</div>;
  }
  // Ship 4: questionTimes is keyed by String(id)
  const times = items.map(({ q }) => questionTimes.get(String(q.id)) || 0);
  const maxT = Math.max(...times, 1);
  return (
    <>
      <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 4, paddingTop: 16, borderBottom: "1px solid var(--c-border-faint)", marginBottom: 10 }}>
        {items.map(({ q }, i) => {
          const status = getStatus(q);
          const t = times[i];
          let bg = "var(--c-brand-primary)";
          if (status === "wrong") bg = "var(--c-danger)";
          else if (t > 180) bg = "var(--c-warning)";
          const h = t > 0 ? (t / maxT) * 100 : 2;
          return <div key={q.id} title={`Q ${i + 1}: ${t}s`} style={{ flex: 1, minWidth: 4, background: bg, opacity: 0.85, borderRadius: "4px 4px 0 0", height: `${h}%` }} />;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
        <span>Q 1</span>
        {items.length > 10 && <span>Q {Math.ceil(items.length / 2)}</span>}
        <span>Q {items.length}</span>
      </div>
    </>
  );
}
function ScoreProgressionChart({ items, getStatus, pos, neg }) {
  if (!items || items.length === 0) return null;
  let running = 0;
  const points = items.map(({ q }, i) => {
    const status = getStatus(q);
    let delta = 0;
    if (status === "correct") { delta = pos; running += pos; }
    // 2026-08 canonical rule: SA/input wrongs never cost marks.
    else if (status === "wrong") { const d = q?.type === "input" ? 0 : neg; delta = d; running += d; }
    return { i, score: running, delta };
  });
  const finalScore = running;
  const maxAbs = Math.max(...points.map((p) => Math.abs(p.score)), 1);
  const w = 600, h = 200;
  const padding = 20;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;
  const xStep = points.length > 1 ? innerW / (points.length - 1) : 0;
  const yMid = padding + innerH / 2;
  const pts = points.map((p, i) => ({
    x: padding + i * xStep,
    y: yMid - (p.score / maxAbs) * (innerH / 2),
    ...p,
  }));
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${yMid} L ${pts[0].x} ${yMid} Z`;
  return (
    <>
      <div style={{ height: 200, position: "relative" }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <linearGradient id="scoreGradT" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-brand-primary)" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="var(--c-brand-primary)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1={padding + innerH * 0.25} x2={w} y2={padding + innerH * 0.25} stroke="var(--c-border-faint)" strokeDasharray="2 4"/>
          <line x1="0" y1={yMid} x2={w} y2={yMid} stroke="var(--c-border-soft)"/>
          <line x1="0" y1={padding + innerH * 0.75} x2={w} y2={padding + innerH * 0.75} stroke="var(--c-border-faint)" strokeDasharray="2 4"/>
          <path d={areaPath} fill="url(#scoreGradT)"/>
          <path d={linePath} stroke="var(--c-brand-primary)" strokeWidth="2.5" fill="none"/>
          {pts.filter((p) => p.delta < 0).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--c-danger)"/>)}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
        <span>Q 1</span>
        {/* Ship 4: show the true final score — clamping to 0 contradicted a
            line that visibly dips below the midline */}
        <span>Final score: <b style={{ color: "var(--c-text-primary)" }}>{finalScore}</b></span>
      </div>
    </>
  );
}
function DistRow({ name, correct, wrong, skipped }) {
  const sum = correct + wrong + skipped;
  if (sum === 0) return null;
  const pc = (correct / sum) * 100;
  const pw = (wrong / sum) * 100;
  const ps = (skipped / sum) * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 3fr", gap: 14, alignItems: "center", padding: "12px 0" }}>
      <div style={{ fontWeight: 500, color: "var(--c-text-primary)", fontSize: 13.5 }}>{name}</div>
      <div style={{ height: 26, borderRadius: 6, overflow: "hidden", display: "flex", background: "var(--c-surface-sunken, var(--c-surface-muted))", border: "1px solid var(--c-border-faint)" }}>
        {correct > 0 && <Seg color="#22c55e" pct={pc} label={`${correct} correct`} />}
        {wrong > 0 && <Seg color="#ef4444" pct={pw} label={`${wrong} wrong`} />}
        {skipped > 0 && <Seg muted pct={ps} label={`${skipped} skipped`} />}
      </div>
    </div>
  );
}
function Seg({ color, muted, pct, label }) {
  return (
    <div style={{
      width: `${pct}%`, height: "100%",
      background: muted ? "var(--c-surface-muted)" : color,
      color: muted ? "var(--c-text-tertiary)" : "#fff",
      display: "grid", placeItems: "center",
      fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap", overflow: "hidden",
    }}>{pct > 8 ? label : ""}</div>
  );
}
function WrongList({ list, onClick, emptyMsg, hideSection }) {
  if (!list || list.length === 0) {
    return <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "var(--c-text-tertiary)" }}>{emptyMsg}</div>;
  }
  return (
    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
      <thead>
        <tr>
          <th style={qlistTh}>Q#</th>
          <th style={qlistTh}>Time</th>
          <th style={{ ...qlistTh, textAlign: "right" }}>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {list.map((item) => (
          <tr key={item.q.id} onClick={() => onClick(item.q)} style={{ cursor: "pointer" }}>
            <td style={{ ...qlistTd, color: "var(--c-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Q {item.idx + 1}</td>
            <td style={{ ...qlistTd, fontVariantNumeric: "tabular-nums" }}>{formatTime(item.t)}</td>
            <td style={{ ...qlistTd, textAlign: "right" }}>
              <span style={{ color: "var(--c-brand-primary)", fontWeight: 500, fontSize: 12 }}>
                View <ExternalLink size={11} style={{ display: "inline", marginLeft: 2, verticalAlign: "middle" }} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function formatTime(seconds) {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const eyebrowStyle = { fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 8 };
const th = { background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-tertiary)", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "left", padding: "12px 14px" };
const td = { padding: 14, borderTop: "1px solid var(--c-border-faint)", color: "var(--c-text-secondary)", fontVariantNumeric: "tabular-nums" };
const tdNum = { ...td, textAlign: "right" };
const qlistTh = { background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-tertiary)", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "left", padding: "10px 14px", borderTop: "1px solid var(--c-border-faint)", borderBottom: "1px solid var(--c-border-faint)" };
const qlistTd = { padding: "12px 14px", borderBottom: "1px solid var(--c-border-faint)", color: "var(--c-text-secondary)" };
const pillGhost = { height: 36, padding: "0 14px", borderRadius: 999, background: "transparent", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.18s ease" };
const pillPrimary = { ...pillGhost, background: "var(--c-brand-primary)", color: "#fff", border: "1px solid transparent" };

export async function getServerSideProps(context) {
  const { data, error } = await serversupabase.from("plays").select("*,test_uuid(*)").eq("uid", context.query.uid);
  if (data?.length === 0 || error) return { notFound: true };
  return { props: { result: data[0] } };
}
