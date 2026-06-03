// ============================================================
// Concept Test Analytics page — Phase 9 redesign
// Practical analytics matching the mock analytics layout, adapted
// for single-section concept tests:
//   - 5-stat header strip
//   - Multi-test score trend (user's last 5 concept tests)
//   - Compare with topper
//   - Single-section table
//   - Question palette + Time chart + Score progression
//   - Slowest-wrong + Fastest-wrong tables
// All existing data fetching + scoring logic preserved.
// ============================================================

import React, { useEffect, useState, useMemo } from "react";
import { useNMNContext } from "@/components/NMNContext";
import QuestionGridConcept from "@/components/QuestionGridConcept";
import TimeAnalysisConcept from "@/components/TimeAnalysisConcept";
import ScoreFallConcept from "@/components/ScoreFallConcept";
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
    if (!testUuid) return;
    try {
      const { data } = await supabase
        .from("plays")
        .select("uid,score,name")
        .eq("test_uuid", testUuid)
        .order("score", { ascending: false })
        .limit(50);
      if (data && data.length > 0) {
        setTopper({ score: data[0].score, name: data[0].name || "Top scorer", count: data.length });
        const top10Count = Math.max(1, Math.ceil(data.length * 0.1));
        const top10 = data.slice(0, top10Count);
        const avg = top10.reduce((s, r) => s + (r.score || 0), 0) / top10.length;
        setTop10Avg(Math.round(avg));
      }
    } catch (e) { /* silent */ }
  }

  // ── Scoring ──
  const increment = result?.config?.increment ?? 4;
  const decrement = result?.config?.decrement ?? 1;

  const stats = useMemo(() => {
    if (!questions || !result) return null;
    const report = result.report || [];
    const correctCount = report.filter((r) => r.isCorrect === true).length;
    const wrongCount = report.filter((r) => r.isCorrect === false).length;
    const totalQ = questions.length;
    const skippedCount = Math.max(0, totalQ - correctCount - wrongCount);
    const attempted = correctCount + wrongCount;
    const positiveScore = correctCount * increment;
    const negativeScore = wrongCount * decrement;
    const totalScore = positiveScore - negativeScore;
    const maxScore = totalQ * increment;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    return { correctCount, wrongCount, skippedCount, attempted, totalQ,
             positiveScore, negativeScore, totalScore, maxScore, accuracy };
  }, [questions, result, increment, decrement]);

  // ── Time per question (from report.timestamp deltas) ──
  const questionTimes = useMemo(() => {
    if (!result?.report || !questions) return new Map();
    const sorted = [...result.report].filter((r) => typeof r.timestamp === "number").sort((a, b) => a.timestamp - b.timestamp);
    const map = new Map();
    let prev = 0;
    sorted.forEach((r) => {
      const t = r.timestamp - prev;
      if (t > 0 && t < 1800) map.set(r.id, t);
      prev = r.timestamp;
    });
    return map;
  }, [result, questions]);

  const wrongList = useMemo(() => {
    if (!questions || !result?.report) return [];
    return questions.map((q, idx) => {
      const r = result.report.find((rep) => rep.id === q.id);
      if (!r || r.isCorrect !== false) return null;
      return { q, idx, t: questionTimes.get(q.id) || 0 };
    }).filter(Boolean);
  }, [questions, result, questionTimes]);

  const slowestWrong = useMemo(() => [...wrongList].sort((a, b) => b.t - a.t).slice(0, 5), [wrongList]);
  const fastestWrong = useMemo(() => [...wrongList].sort((a, b) => a.t - b.t).slice(0, 5), [wrongList]);

  const totalTimeMin = useMemo(() => {
    if (!result?.report) return 0;
    const maxT = result.report.reduce((m, r) => (typeof r.timestamp === "number" && r.timestamp > m ? r.timestamp : m), 0);
    return Math.round(maxT / 60);
  }, [result]);

  function printPage() { window.print(); }

  if (!userDetails) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center" style={{ background: "var(--c-bg)", color: "var(--c-text-primary)" }}>
        <p style={{ marginBottom: 16 }}>You cannot access this without logging in</p>
        <Button as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank" color="primary">Login</Button>
      </div>
    );
  }
  if (!questions || !result || !stats) {
    return (
      <div className="flex flex-col justify-center items-center text-center h-screen w-full" style={{ background: "var(--c-bg)", color: "var(--c-text-primary)" }}>
        <Loader />
        <p style={{ marginTop: 12, color: "var(--c-text-tertiary)" }}>Loading your analytics…</p>
      </div>
    );
  }

  const testTitle = result?.test_uuid?.parent?.title || result?.test_uuid?.title || "Concept test";

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>

      {/* ===== QUESTION MODAL ===== */}
      <Modal isOpen={activeQuestion != undefined} onClose={() => setActiveQuestion(undefined)} size="2xl">
        <ModalContent>
          <ModalHeader>Question ID: {activeQuestion?.id}</ModalHeader>
          <ModalBody className="max-h-[70vh] overflow-auto">
            <div className="text-sm" dangerouslySetInnerHTML={{ __html: activeQuestion?.question }}></div>
            <Chip color="primary">Question Type: {activeQuestion?.type == "options" ? "MCQ" : "Answer"}</Chip>
            {activeQuestion?.type == "options" ? (
              <RadioGroup value={result?.report?.find((item) => item.id == activeQuestion?.id) && result?.report?.find((item) => item.id == activeQuestion?.id)?.selectedOption - 1}>
                {activeQuestion?.options?.map((option, index) => (
                  <Radio key={index} value={index} isDisabled
                    color={option.isCorrect ? "success" : "danger"}>
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
              {topper && <CompareRow name={topper.name ? `Topper · ${topper.name}` : "Topper"} score={topper.score} attempted="—" correct="—" time="—" />}
              {top10Avg && <CompareRow muted name="Top 10% average" score={top10Avg} attempted="—" correct="—" time="—" />}
            </div>
          </Card>
        )}

        {/* SECTION TABLE (single row for concept test) */}
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
          <QuestionGridConcept filter={filter} questions={questions} result={result} openQuestion={(e) => setActiveQuestion(e)} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16, fontSize: 12, color: "var(--c-text-secondary)" }}>
            <LegendDot color="#22c55e" label="Correct" count={stats.correctCount} />
            <LegendDot color="#ef4444" label="Wrong" count={stats.wrongCount} />
            <LegendDot gray label="Skipped" count={stats.skippedCount} />
          </div>
        </Card>

        {/* TIME PER QUESTION */}
        <Card title="Time per question" meta="Wrong answers in red">
          <TimeAnalysisConcept filter={filter} questions={questions} report={result?.report} />
        </Card>

        {/* SCORE PROGRESSION */}
        <Card title="Cumulative score progression" meta="Where you gained marks">
          <ScoreFallConcept testData={{ score: { value: Math.max(0, stats.totalScore) }, totalScore: { value: stats.maxScore }, negativeScore: { value: stats.negativeScore } }} filter={filter} questions={questions} report={result?.report} />
        </Card>

        {/* SLOWEST / FASTEST WRONG TABLES */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-grid">
          <Card title="Slowest questions you got wrong" meta="Biggest time-leaks">
            <WrongList list={slowestWrong} onClick={(q) => setActiveQuestion(q)} emptyMsg="No wrong answers — well done!" />
          </Card>
          <Card title="Fastest questions you got wrong" meta="Likely careless mistakes">
            <WrongList list={fastestWrong} onClick={(q) => setActiveQuestion(q)} emptyMsg="No wrong answers — well done!" />
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

// ── Sub-components (same as mock analytics) ──
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
  const pts = scores.map((s, i) => ({
    x: padding + i * xStep,
    y: 20 + innerH - (s / maxS) * innerH,
    score: s,
  }));
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
  return (
    <div>
      <div style={{ height: 160, position: "relative" }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <linearGradient id="trendGradTest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-brand-primary)" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="var(--c-brand-primary)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1="40" x2={w} y2="40" stroke="var(--c-border-faint)"/>
          <line x1="0" y1="80" x2={w} y2="80" stroke="var(--c-border-faint)"/>
          <line x1="0" y1="120" x2={w} y2="120" stroke="var(--c-border-faint)"/>
          <path d={areaPath} fill="url(#trendGradTest)"/>
          <path d={linePath} stroke="var(--c-brand-primary)" strokeWidth="2.5" fill="none"/>
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={i === pts.length - 1 ? 6 : 5} fill="var(--c-brand-primary)" stroke={i === pts.length - 1 ? "#fff" : "none"} strokeWidth={i === pts.length - 1 ? 2 : 0}/>
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fill={i === pts.length - 1 ? "var(--c-brand-primary)" : "var(--c-text-secondary)"} fontWeight={i === pts.length - 1 ? "600" : "500"}>
                {p.score}
              </text>
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
      <span style={{
        display: "inline-block", width: 10, height: 10, borderRadius: 3,
        background: gray ? "var(--c-surface-sunken, var(--c-surface-muted))" : color,
        border: gray ? "1px solid var(--c-border-soft)" : "none",
      }} />
      {label} · <b style={{ color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums" }}>{count}</b>
    </span>
  );
}
function WrongList({ list, onClick, emptyMsg }) {
  if (!list || list.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "var(--c-text-tertiary)" }}>
        {emptyMsg}
      </div>
    );
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
  if (data?.length === 0 || error) {
    return { notFound: true };
  }
  return { props: { result: data[0] } };
}
