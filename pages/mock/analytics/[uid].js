// ============================================================
// Mock Analytics page — Phase 9.1
// All widgets inlined to match the v3 preview exactly. No more
// external QuestionGrid / TimeAnalysis / ScoreFall / AnswerDistribution
// imports — those had hardcoded white backgrounds that broke dark mode.
// ============================================================

import Loader from "@/components/Loader";
import { useNMNContext } from "@/components/NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import {
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader,
  Button, Chip, RadioGroup, Radio,
} from "@nextui-org/react";
import { Printer, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export default function MockAnalytics({ result }) {
  const [sections, setSections] = useState();
  const [modules, setModules] = useState();
  const [questions, setQuestions] = useState();
  const [ats, setAts] = useState({ atsRank: "—", totalRank: "—" });
  const [filter, setFilter] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [topper, setTopper] = useState(null);
  const [top10Avg, setTop10Avg] = useState(null);

  const router = useRouter();
  const { userDetails, isRouting } = useNMNContext();

  async function getSections(a) {
    const { data } = await supabase
      .from("mock_groups").select("*,subject(*)").eq("test", a)
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
    const { data } = await supabase
      .from("mock_groups").select("*,module(*)").in("parent_sub", a.map((i) => i.id));
    if (data) {
      setModules(data);
      getQuestions(data);
    }
  }
  async function getQuestions(a) {
    const { data } = await supabase
      .from("mock_questions").select("*")
      .in("parent", a.filter((i) => i.module).map((i) => i.module.id))
      .order("seq", { ascending: true });
    if (data) {
      setQuestions(data);
      getATSRank(result?.uid);
      getMockHistory();
      getTopperData(result?.test_id?.id);
    }
  }
  async function getATSRank(a) {
    try {
      const { data } = await supabase.rpc("get_row_rank", { uid_input: a });
      if (data) setAts({ atsRank: data[0]?.your_rank || "—", totalRank: data[0]?.total_ats_rank || "—" });
    } catch (e) { /* silent */ }
  }
  async function getMockHistory() {
    if (!userDetails?.id) return;
    const { data } = await supabase
      .from("mock_plays")
      .select("uid,created_at,score,test_id(title)")
      .eq("user", userDetails.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setHistory(data.reverse());
  }
  async function getTopperData(testId) {
    if (!testId) return;
    try {
      const { data } = await supabase
        .from("mock_plays")
        .select("uid,score,name")
        .eq("test_id", testId)
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

  useEffect(() => {
    if (result != undefined) getSections(result?.test_id.id);
  }, []);

  // ── Helpers ──
  // Ship 2 fix (2026-07): the previous SA comparison was strict `===`
  // with whitespace stripped but not case-normalised or numeric-collapsed.
  // The MCQ path also computed `reportItem.value - 1` unconditionally,
  // yielding `NaN` when `value` was nil — which classified a mid-flight
  // skip as "wrong" instead of "skipped". Both fixed here.
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
    if (!reportItem) return null;
    if (q.type === "options") {
      if (reportItem.value == null) return null;
      const reportValue = Number(reportItem.value) - 1;
      if (!Number.isFinite(reportValue)) return null;
      if (!Array.isArray(q?.options)) return null;
      return q.options.findIndex((o) => o?.isCorrect) === reportValue;
    }
    if (q.type === "input") {
      return normalizeAns(q?.options?.answer) === normalizeAns(reportItem.value);
    }
    return null;
  }
  function getQStatus(q) {
    const answered = result.report?.find((r) => r.id == q.id);
    const isMarked = result.data?.filter((m) => m.status == "review")?.some((m) => m.id == q.id);
    if (!answered) return isMarked ? "marked" : "skipped";
    const c = isQuestionCorrect(q, answered);
    if (c === true) return "correct";
    if (c === false) return "wrong";
    return "skipped";
  }

  // ── Flat ordered list of questions across sections (with section ref) ──
  const flatQuestions = useMemo(() => {
    if (!sections || !modules || !questions) return [];
    const out = [];
    sections.forEach((sec) => {
      const secModules = modules.filter((m) => m.parent_sub === sec.id);
      secModules.forEach((mod) => {
        if (!mod.module) return;
        const qs = questions.filter((q) => q.parent === mod.module.id).sort((a, b) => a.seq - b.seq);
        qs.forEach((q) => out.push({ q, sec, module: mod }));
      });
    });
    return out;
  }, [sections, modules, questions]);

  // ── Aggregate stats per section ──
  const stats = useMemo(() => {
    if (!sections || !modules || !questions || !result) return null;
    let totalScore = 0, maxScore = 0;
    let correctCount = 0, wrongCount = 0, skippedCount = 0, markedCount = 0;
    const perSection = sections.map((sec) => {
      const secModules = modules.filter((m) => m.parent_sub === sec.id);
      let score = 0, max = 0, correct = 0, wrong = 0, skipped = 0, total = 0, negs = 0;
      const pos = sec.pos || 0, neg = sec.neg || 0;
      secModules.forEach((mod) => {
        if (!mod.module) return;
        const qs = questions.filter((q) => q.parent === mod.module.id);
        qs.forEach((q) => {
          total += 1; max += pos;
          const reportItem = result.report?.find((r) => r.id === q.id);
          const isCorrect = isQuestionCorrect(q, reportItem);
          if (isCorrect === true) { score += pos; correct += 1; correctCount += 1; }
          else if (isCorrect === false) { score += neg; negs += Math.abs(neg); wrong += 1; wrongCount += 1; }
          else { skipped += 1; skippedCount += 1; }
          if (result.data?.filter((m) => m.status == "review")?.some((m) => m.id == q.id)) markedCount += 1;
        });
      });
      totalScore += score; maxScore += max;
      const attempted = correct + wrong;
      return { sec, score, max, correct, wrong, skipped, total, negs, attempted };
    });
    const totalQ = correctCount + wrongCount + skippedCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const totalNeg = perSection.reduce((s, p) => s + p.negs, 0);
    const withoutNeg = totalScore + totalNeg;
    return { totalScore, maxScore, correctCount, wrongCount, skippedCount, markedCount,
             totalQ, accuracy, totalNeg, withoutNeg, perSection };
  }, [sections, modules, questions, result]);

  // ── Per-question time (from report.at deltas) ──
  const questionTimes = useMemo(() => {
    if (!result?.report) return new Map();
    const sorted = [...result.report].filter((r) => typeof r.at === "number").sort((a, b) => a.at - b.at);
    const map = new Map();
    let prev = 0;
    sorted.forEach((r) => {
      const t = r.at - prev;
      // Ship 2 fix (2026-07): previously dropped anything ≥ 30 min
      // (`t < 1800`) — a long section deliberately given 30–45 min
      // had its slow questions vanish from the "slowest wrong" table.
      // Keep everything ≥ 0 seconds; cap at 2 hours as a sanity ceiling.
      if (t >= 0 && t < 7200) map.set(r.id, t);
      prev = r.at;
    });
    return map;
  }, [result]);

  // ── Total time taken ──
  const totalTimeMin = useMemo(() => {
    if (!result?.report) return 0;
    const maxAt = result.report.reduce((m, r) => (typeof r.at === "number" && r.at > m ? r.at : m), 0);
    return Math.round(maxAt / 60);
  }, [result]);

  // ── Slowest / fastest wrong ──
  const wrongList = useMemo(() => {
    return flatQuestions
      .map(({ q, sec }, idx) => {
        if (getQStatus(q) !== "wrong") return null;
        return { q, idx, sec, t: questionTimes.get(q.id) || 0 };
      })
      .filter(Boolean);
  }, [flatQuestions, questionTimes, result]);
  const slowestWrong = useMemo(() => [...wrongList].sort((a, b) => b.t - a.t).slice(0, 5), [wrongList]);
  const fastestWrong = useMemo(() => [...wrongList].sort((a, b) => a.t - b.t).slice(0, 5), [wrongList]);

  // ── Filter flat questions by selected section ──
  const filteredFlat = useMemo(() => {
    if (filter === 0) return flatQuestions;
    const sec = sections?.[filter - 1];
    if (!sec) return flatQuestions;
    return flatQuestions.filter((f) => f.sec.id === sec.id);
  }, [filter, flatQuestions, sections]);

  function printPage() { window.print(); }

  if (userDetails == undefined) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <p style={{ marginBottom: 16 }}>You cannot access this without logging in</p>
        <Button as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank" color="primary">Login</Button>
      </div>
    );
  }
  if (questions == undefined || result == undefined || stats == null) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <Loader />
        <p style={{ marginTop: 12, color: "var(--c-text-tertiary)" }}>Loading your analytics…</p>
      </div>
    );
  }

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
              <RadioGroup value={result?.report?.find((item) => item.id == activeQuestion?.id) && result?.report?.find((item) => item.id == activeQuestion?.id)?.value - 1}>
                {activeQuestion?.options?.map((option, index) => (
                  <Radio key={index} value={index} isDisabled color={option.isCorrect ? "success" : "danger"}>
                    {option.title}
                  </Radio>
                ))}
              </RadioGroup>
            ) : (
              <div style={{ padding: 12, borderRadius: 10, background: "var(--c-success-soft, #E0F2E8)" }}>
                <strong>Correct answer:</strong> {activeQuestion?.options?.answer}<br />
                <strong>Your answer:</strong> {result?.report?.find((item) => item.id == activeQuestion?.id)?.value || "—"}
              </div>
            )}
            {activeQuestion?.explanation && activeQuestion?.explanation != "<p><strong>Write your Explanation Here...</strong></p>" && (
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
            <button onClick={() => router.push(`/mock/result/${router.query.uid}`)} style={pillPrimary} disabled={isRouting}>
              View result <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* HEADER STRIP */}
        <div style={{ marginBottom: 28 }}>
          <div style={eyebrowStyle}>Detailed analysis</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-text-primary)", margin: "0 0 22px" }}>
            {result?.test_id?.title || "Mock test"}
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, overflow: "hidden" }}>
            <Stat k="Score" v={Math.max(0, stats.totalScore)} u={`/ ${stats.maxScore}`} />
            <Stat k="Accuracy" v={stats.accuracy} u="%" />
            <Stat k="Rank" v={ats.atsRank || "—"} u={ats.totalRank ? `of ${ats.totalRank}` : ""} gold={ats.atsRank === 1} />
            <Stat k="Time taken" v={totalTimeMin || "—"} u={totalTimeMin ? "min" : ""} />
            <Stat k="Without negatives" v={Math.max(0, stats.withoutNeg)} u="" success />
          </div>
        </div>

        {/* SECTION FILTER TABS */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 18 }}>
          <Tab label="All sections" active={filter == 0} onClick={() => setFilter(0)} />
          {sections.map((s, i) => (
            <Tab key={s.id} label={s.subject?.title || `Section ${i + 1}`} active={filter == i + 1} onClick={() => setFilter(i + 1)} />
          ))}
        </div>

        {/* MULTI-MOCK TREND */}
        {history && history.length >= 2 && (
          <Card title="Your score across last mocks" meta={`${history.length} mocks · latest on the right`}>
            <MockTrendChart history={history} />
          </Card>
        )}

        {/* COMPARE WITH TOPPER */}
        {(topper || top10Avg) && (
          <Card title="Your test vs. the topper" meta="Highest scorer on this exact mock">
            <div style={{ border: "1px solid var(--c-border-faint)", borderRadius: 12, overflow: "hidden", fontSize: 13 }}>
              <CompareRow header />
              <CompareRow name="You" you score={Math.max(0, stats.totalScore)} attempted={`${stats.correctCount + stats.wrongCount} / ${stats.totalQ}`} correct={stats.correctCount} time={totalTimeMin ? `${totalTimeMin} min` : "—"} />
              {topper && <CompareRow name={topper.name ? `Topper · ${topper.name}` : "Topper"} score={topper.score} attempted="—" correct="—" time="—" />}
              {top10Avg && <CompareRow muted name="Top 10% average" score={top10Avg} attempted="—" correct="—" time="—" />}
            </div>
          </Card>
        )}

        {/* SECTION-WISE TABLE */}
        <Card title="Section-wise performance">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13.5, border: "1px solid var(--c-border-faint)", borderRadius: 12, overflow: "hidden" }}>
              <thead>
                <tr>
                  <th style={th}>Section</th>
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
                {stats.perSection.map((p, d) => (
                  <tr key={d}>
                    <td style={{ ...td, color: "var(--c-text-primary)", fontWeight: 500 }}>{p.sec.subject?.title || "Section"}</td>
                    <td style={tdNum}>{p.total}</td>
                    <td style={tdNum}>{p.attempted}</td>
                    <td style={{ ...tdNum, color: "var(--c-success)" }}>{p.correct}</td>
                    <td style={{ ...tdNum, color: "var(--c-danger)" }}>{p.wrong}</td>
                    <td style={{ ...tdNum, color: "var(--c-text-tertiary)" }}>{p.skipped}</td>
                    <td style={tdNum}>{Math.max(0, p.score)}</td>
                    <td style={{ ...tdNum, color: "var(--c-danger)" }}>{p.negs > 0 ? `−${p.negs}` : 0}</td>
                    <td style={{ ...tdNum, color: "var(--c-text-tertiary)" }}>{p.max}</td>
                  </tr>
                ))}
                <tr>
                  <td style={tdTotal}>Total</td>
                  <td style={tdTotalNum}>{stats.totalQ}</td>
                  <td style={tdTotalNum}>{stats.correctCount + stats.wrongCount}</td>
                  <td style={{ ...tdTotalNum, color: "var(--c-success)" }}>{stats.correctCount}</td>
                  <td style={{ ...tdTotalNum, color: "var(--c-danger)" }}>{stats.wrongCount}</td>
                  <td style={{ ...tdTotalNum, color: "var(--c-text-tertiary)" }}>{stats.skippedCount}</td>
                  <td style={tdTotalNum}>{Math.max(0, stats.totalScore)}</td>
                  <td style={{ ...tdTotalNum, color: "var(--c-danger)" }}>{stats.totalNeg > 0 ? `−${stats.totalNeg}` : 0}</td>
                  <td style={{ ...tdTotalNum, color: "var(--c-text-tertiary)" }}>{stats.maxScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* QUESTION PALETTE — INLINED */}
        <Card title="Question palette" meta="Click any cell to view the question + your answer">
          <PaletteGrid items={filteredFlat} getStatus={getQStatus} onClick={(q) => setActiveQuestion(q)} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16, fontSize: 12, color: "var(--c-text-secondary)" }}>
            <LegendDot color="#22c55e" label="Correct" count={stats.correctCount} />
            <LegendDot color="#ef4444" label="Wrong" count={stats.wrongCount} />
            <LegendDot color="#a855f7" label="Marked" count={stats.markedCount} />
            <LegendDot gray label="Skipped" count={stats.skippedCount} />
          </div>
        </Card>

        {/* TIME PER QUESTION — INLINED */}
        <Card title="Time per question" meta="Wrong answers in red · long times in amber">
          <TimeBars items={filteredFlat} getStatus={getQStatus} questionTimes={questionTimes} />
        </Card>

        {/* SCORE PROGRESSION — INLINED */}
        <Card title="Cumulative score progression" meta="Where you gained marks · red dots are negative marks">
          <ScoreProgressionChart items={filteredFlat} getStatus={getQStatus} sections={sections} />
        </Card>

        {/* ANSWER DISTRIBUTION — INLINED stacked bars */}
        <Card title="Answer distribution per section">
          {stats.perSection.map((p, d) => (
            <DistRow key={d} name={p.sec.subject?.title || "Section"} correct={p.correct} wrong={p.wrong} skipped={p.skipped} />
          ))}
          <DistRow total name="Total" correct={stats.correctCount} wrong={stats.wrongCount} skipped={stats.skippedCount} />
        </Card>

        {/* SLOWEST / FASTEST WRONG TABLES */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-grid">
          <Card title="Slowest questions you got wrong" meta="Biggest time-leaks">
            <WrongList list={slowestWrong} onClick={(q) => setActiveQuestion(q)} emptyMsg="No wrong answers" />
          </Card>
          <Card title="Fastest questions you got wrong" meta="Likely careless mistakes">
            <WrongList list={fastestWrong} onClick={(q) => setActiveQuestion(q)} emptyMsg="No wrong answers" />
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
}

// ── Sub-components ──
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
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, height: 34, padding: "0 14px", borderRadius: 999,
      background: active ? "var(--c-brand-primary)" : "var(--c-surface)",
      color: active ? "#fff" : "var(--c-text-secondary)",
      border: active ? "1px solid transparent" : "1px solid var(--c-border-soft)",
      fontFamily: "inherit", fontSize: 13, fontWeight: 500,
      cursor: "pointer", whiteSpace: "nowrap",
    }}>{label}</button>
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
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-brand-primary)" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="var(--c-brand-primary)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1="40" x2={w} y2="40" stroke="var(--c-border-faint)"/>
          <line x1="0" y1="80" x2={w} y2="80" stroke="var(--c-border-faint)"/>
          <line x1="0" y1="120" x2={w} y2="120" stroke="var(--c-border-faint)"/>
          <path d={areaPath} fill="url(#trendGrad)"/>
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
            {i === history.length - 1 ? "Latest" : `Mock ${i + 1}`}
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

// ── INLINED WIDGETS ──

function PaletteGrid({ items, getStatus, onClick }) {
  if (!items || items.length === 0) {
    return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>No questions in this filter</div>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6 }}>
      {items.map(({ q }, idx) => {
        const status = getStatus(q);
        const styles = {
          correct: { bg: "#22c55e", color: "#fff", border: "none" },
          wrong: { bg: "#ef4444", color: "#fff", border: "none" },
          marked: { bg: "#a855f7", color: "#fff", border: "none" },
          skipped: { bg: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)" },
        };
        const s = styles[status] || styles.skipped;
        return (
          <button
            key={q.id}
            onClick={() => onClick(q)}
            style={{
              aspectRatio: "1", borderRadius: 6,
              background: s.bg, color: s.color,
              border: s.border,
              font: "600 11px/1 inherit",
              cursor: "pointer", fontVariantNumeric: "tabular-nums",
            }}
            title={`Q ${idx + 1} · ${status}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}

function TimeBars({ items, getStatus, questionTimes }) {
  if (!items || items.length === 0) {
    return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>No questions in this filter</div>;
  }
  const times = items.map(({ q }) => questionTimes.get(q.id) || 0);
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
          return (
            <div key={q.id} title={`Q ${i + 1}: ${t}s`} style={{ flex: 1, minWidth: 4, background: bg, opacity: 0.85, borderRadius: "4px 4px 0 0", height: `${h}%` }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
        <span>Q 1</span>
        {items.length > 10 && <span>Q {Math.ceil(items.length / 4)}</span>}
        {items.length > 20 && <span>Q {Math.ceil(items.length / 2)}</span>}
        {items.length > 30 && <span>Q {Math.ceil((3 * items.length) / 4)}</span>}
        <span>Q {items.length}</span>
      </div>
    </>
  );
}

function ScoreProgressionChart({ items, getStatus, sections }) {
  if (!items || items.length === 0) {
    return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>No data</div>;
  }
  // Build cumulative score, marking negative-mark events
  let running = 0;
  const points = items.map(({ q, sec }, i) => {
    const status = getStatus(q);
    const pos = sec.pos || 0;
    const neg = sec.neg || 0;
    let delta = 0;
    if (status === "correct") { delta = pos; running += pos; }
    else if (status === "wrong") { delta = neg; running += neg; }
    return { i, score: running, delta, status };
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
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-brand-primary)" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="var(--c-brand-primary)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1={padding + innerH * 0.25} x2={w} y2={padding + innerH * 0.25} stroke="var(--c-border-faint)" strokeDasharray="2 4"/>
          <line x1="0" y1={yMid} x2={w} y2={yMid} stroke="var(--c-border-soft)"/>
          <line x1="0" y1={padding + innerH * 0.75} x2={w} y2={padding + innerH * 0.75} stroke="var(--c-border-faint)" strokeDasharray="2 4"/>
          <path d={areaPath} fill="url(#scoreGrad)"/>
          <path d={linePath} stroke="var(--c-brand-primary)" strokeWidth="2.5" fill="none"/>
          {pts.filter((p) => p.delta < 0).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--c-danger)"/>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
        <span>Q 1</span>
        <span>Final score: <b style={{ color: "var(--c-text-primary)" }}>{Math.max(0, finalScore)}</b></span>
      </div>
    </>
  );
}

function DistRow({ name, correct, wrong, skipped, total }) {
  const sum = correct + wrong + skipped;
  if (sum === 0) return null;
  const pc = (correct / sum) * 100;
  const pw = (wrong / sum) * 100;
  const ps = (skipped / sum) * 100;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.3fr 3fr", gap: 14,
      alignItems: "center", padding: "12px 0",
      borderTop: total ? "1px solid var(--c-border-soft)" : "1px solid var(--c-border-faint)",
      marginTop: total ? 6 : 0,
    }}>
      <div style={{ fontWeight: total ? 600 : 500, color: "var(--c-text-primary)", fontSize: 13.5 }}>{name}</div>
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
      width: `${pct}%`,
      height: "100%",
      background: muted ? "var(--c-surface-muted)" : color,
      color: muted ? "var(--c-text-tertiary)" : "#fff",
      display: "grid", placeItems: "center",
      fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap", overflow: "hidden",
    }}>
      {pct > 8 ? label : ""}
    </div>
  );
}

function WrongList({ list, onClick, emptyMsg }) {
  if (!list || list.length === 0) {
    return <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "var(--c-text-tertiary)" }}>{emptyMsg}</div>;
  }
  return (
    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
      <thead>
        <tr>
          <th style={qlistTh}>Q#</th>
          <th style={qlistTh}>Section</th>
          <th style={qlistTh}>Time</th>
          <th style={{ ...qlistTh, textAlign: "right" }}>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {list.map((item) => (
          <tr key={item.q.id} onClick={() => onClick(item.q)} style={{ cursor: "pointer" }}>
            <td style={{ ...qlistTd, color: "var(--c-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Q {item.idx + 1}</td>
            <td style={qlistTd}>{item.sec?.subject?.title || "—"}</td>
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
const tdTotal = { ...td, background: "var(--c-surface-muted, var(--c-bg))", fontWeight: 600, color: "var(--c-text-primary)", borderTop: "1px solid var(--c-border-soft)" };
const tdTotalNum = { ...tdTotal, textAlign: "right" };
const qlistTh = { background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-tertiary)", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "left", padding: "10px 14px", borderTop: "1px solid var(--c-border-faint)", borderBottom: "1px solid var(--c-border-faint)" };
const qlistTd = { padding: "12px 14px", borderBottom: "1px solid var(--c-border-faint)", color: "var(--c-text-secondary)" };
const pillGhost = { height: 36, padding: "0 14px", borderRadius: 999, background: "transparent", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.18s ease" };
const pillPrimary = { ...pillGhost, background: "var(--c-brand-primary)", color: "#fff", border: "1px solid transparent" };

export async function getServerSideProps(context) {
  const { data, error } = await serversupabase
    .from("mock_plays")
    .select("*,test_id(*)")
    .eq("uid", context.query.uid);
  if (data?.length === 0 || error) return { notFound: true };
  return { props: { result: data[0] } };
}
