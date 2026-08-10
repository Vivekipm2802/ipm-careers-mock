// ============================================================
// Mock Analytics page — Phase 15 "mock journey" redesign.
// Approved look: preview-mock-analytics-v3.html, page 2.
//
// Six views, one story:
//   1 · Score across mocks (gold line + topper trail + batch avg)
//   2 · Rank & consistency strip
//   3 · Sections across mocks (sparklines)
//   4 · Where the time goes (only when per-question stamps exist)
//   5 · Speed × accuracy quadrant (latest mock)
//   6 · Habits the numbers show (mentor-read logic, condition-gated)
// (A "chapters behind your wrongs" view was planned but skipped:
// mock_questions carries no chapter/topic/tag column to group by.)
//
// ALL numbers are canonical recomputations via lib/scoring — the
// stored score column is never read. Cross-user data (topper line,
// batch average, ranks) comes from /api/mock-journey (service role,
// aggregate-only payload).
// ============================================================

import Loader from "@/components/Loader";
import ThemeToggle from "@/components/ThemeToggle";
import { useNMNContext } from "@/components/NMNContext";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { Button } from "@nextui-org/react";
import { Printer, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { scoreMockPlay, normType } from "@/lib/scoring";
import { splitWrongs, wrongsInFinalWindow, FAST_WRONG_SEC } from "@/lib/mentorRead";
import { getAuthHeaders } from "@/utils/authHeaders";
// 2026-08 owner feedback: subject titles arrive raw ("SA (Hash IPMAT
// Mock 3) 2026") — sparklines, time rows and strip cells render the
// SHORT name ("SA"), and cross-mock matching normalises both sides
// (raw titles embed each mock's own name, so they never match as-is).
import { shortSectionName } from "@/lib/labels";

// Ship 4: Supabase returns question ids as number OR string depending
// on the query path. Compare as strings everywhere.
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// Speed × accuracy thresholds. ONE consistent "quick" line for both
// right and wrong cells: under 90 seconds. (The mentor-read 30s rule
// stays where it belongs — the "impulse picks" habit line below uses
// FAST_WRONG_SEC = 30; mixing two definitions of quick inside one
// 2×2 grid would make the cells incomparable.) "Slow" = over 120s.
const QUICK_SEC = 90;
const SLOW_SEC = 120;

export default function MockAnalytics({ result }) {
  // ── hooks — ALL above the early returns (hook-order rule; this
  // page has crashed in production for exactly this before) ──
  const [sections, setSections] = useState();
  const [modules, setModules] = useState();
  const [questions, setQuestions] = useState();
  const [journey, setJourney] = useState(null); // null = loading, [] = none/failed

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
      setModules(data.filter((m) => m.module));
      getQuestions(data);
    }
  }
  async function getQuestions(a) {
    const { data } = await supabase
      .from("mock_questions").select("*")
      .in("parent", a.filter((i) => i.module).map((i) => i.module.id))
      .order("seq", { ascending: true });
    if (data) setQuestions(data);
  }

  useEffect(() => {
    if (result != undefined) getSections(result?.test_id.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-mock history — server-side canonical rescoring (RLS blocks
  // cross-user reads on the client). Any failure just hides the
  // cross-mock views, never the page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/mock-journey", { headers });
        if (!res.ok) { if (!cancelled) setJourney([]); return; }
        const data = await res.json();
        if (!cancelled) setJourney(Array.isArray(data?.mocks) ? data.mocks : []);
      } catch (e) {
        if (!cancelled) setJourney([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── current play, canonically rescored ──
  const scored = useMemo(() => {
    if (!sections || !modules || !questions || !result) return null;
    try {
      return scoreMockPlay(sections, modules, questions, result.report || []);
    } catch (e) {
      return null;
    }
  }, [sections, modules, questions, result]);

  // ── per-question time from report `at` deltas (real data only) ──
  const questionTimes = useMemo(() => {
    if (!result?.report) return new Map();
    const sorted = [...result.report].filter((r) => typeof r.at === "number").sort((a, b) => a.at - b.at);
    const map = new Map();
    let prev = 0;
    sorted.forEach((r) => {
      const t = r.at - prev;
      if (t >= 0 && t < 7200) map.set(String(r.id), t);
      prev = r.at;
    });
    return map;
  }, [result]);

  // Per-section minutes (sum of that section's question deltas).
  const sectionTimes = useMemo(() => {
    const map = new Map();
    if (!sections || !modules || !questions || questionTimes.size === 0) return map;
    sections.forEach((sec) => {
      let t = 0;
      modules.filter((m) => m.parent_sub === sec.id).forEach((mod) => {
        questions.filter((q) => q.parent === mod.module.id).forEach((q) => {
          t += questionTimes.get(String(q.id)) || 0;
        });
      });
      map.set(sec.id, t);
    });
    return map;
  }, [sections, modules, questions, questionTimes]);

  const durationSec = useMemo(() => {
    if (Number.isFinite(Number(result?.duration)) && result.duration > 0) return Number(result.duration);
    if (!result?.report) return 0;
    return result.report.reduce((m, r) => (typeof r.at === "number" && r.at > m ? r.at : m), 0);
  }, [result]);

  // ── journey slices ──
  const fullMocks = useMemo(
    () => (Array.isArray(journey) ? journey.filter((m) => m.sectionCount > 1) : []),
    [journey]
  );
  const currentEntry = useMemo(
    () => (Array.isArray(journey) ? journey.find((m) => sameId(m.testId, result?.test_id?.id)) : null),
    [journey, result]
  );
  const fullIdx = useMemo(
    () => fullMocks.findIndex((m) => sameId(m.testId, result?.test_id?.id)),
    [fullMocks, result]
  );
  const prevMock = fullIdx > 0 ? fullMocks[fullIdx - 1] : null;

  // ── view 5: speed × accuracy quadrant (latest mock's entries) ──
  const quad = useMemo(() => {
    if (!scored || questionTimes.size === 0) return null;
    let qr = 0, qw = 0, sr = 0, sw = 0, measured = 0;
    (result?.report || []).forEach((r) => {
      const v = scored.verdictById[String(r.id)];
      if (v !== true && v !== false) return;
      const t = questionTimes.get(String(r.id));
      if (!(t > 0)) return;
      measured += 1;
      if (t < QUICK_SEC) { v ? qr++ : qw++; }
      else if (t > SLOW_SEC) { v ? sr++ : sw++; }
    });
    if (measured === 0) return null;
    return { qr, qw, sr, sw, measured };
  }, [scored, questionTimes, result]);

  // ── view 6: habits — only lines whose conditions actually hold ──
  const habits = useMemo(() => {
    if (!scored) return [];
    const lines = [];
    const t = scored.total;
    const entries = (result?.report || []).map((r) => ({
      at: typeof r.at === "number" ? r.at : null,
      isCorrect: scored.verdictById[String(r.id)] ?? null,
    }));

    // 1 · Rushed wrongs (mentor-read impulse rule: wrong in < 30s).
    const swr = splitWrongs(entries, "at", FAST_WRONG_SEC);
    if (swr.fast >= 2) {
      lines.push({
        tone: "danger", icon: "clock",
        text: (<><b>Rushed answers cost you.</b> {swr.fast} of your {t.wrong} wrongs took under {FAST_WRONG_SEC} seconds — impulse picks, not concept gaps.</>),
      });
    }

    // 2 · SA free marks left on the table (no negative on SA — attempts
    //     there are pure upside).
    const saSkipped = (questions || []).filter(
      (q) => normType(q.type) === "input" && scored.verdictById[String(q.id)] == null
    ).length;
    if (saSkipped >= 3) {
      lines.push({
        tone: "gold", icon: "gift",
        text: (<><b>Free marks left behind.</b> You left {saSkipped} short-answer questions unattempted — they carry no negative. Attempting them is pure upside.</>),
      });
    }

    // 3 · End-of-test slippage (last 10 minutes, tests of 20+ min).
    const late = wrongsInFinalWindow(entries, durationSec);
    if (late >= 2 && t.wrong > 0) {
      lines.push({
        tone: "danger", icon: "zigzag",
        text: (<><b>The final stretch slips.</b> {late} of your {t.wrong} wrongs came in the last 10 minutes — pace the middle, protect the end.</>),
      });
    }

    // 4 · Accuracy trend across full mocks (canonical recomputation).
    if (fullMocks.length >= 2) {
      const accs = fullMocks.slice(-3).map((m) => m.accuracy);
      const rising = accs.every((a, i) => i === 0 || a > accs[i - 1]);
      const falling = accs.every((a, i) => i === 0 || a < accs[i - 1]);
      if (rising && accs[accs.length - 1] > accs[0]) {
        lines.push({
          tone: "success", icon: "trend",
          text: (<><b>Accuracy is rising.</b> {accs[0]}% → {accs[accs.length - 1]}% over your last {accs.length} mocks. Keep the pace steady and let attempts grow.</>),
        });
      } else if (falling && accs[0] > accs[accs.length - 1]) {
        lines.push({
          tone: "danger", icon: "trend",
          text: (<><b>Accuracy is slipping.</b> {accs[0]}% → {accs[accs.length - 1]}% over your last {accs.length} mocks. Slow down on the ones you attempt.</>),
        });
      }
    }
    return lines;
  }, [scored, result, questions, durationSec, fullMocks]);

  // ── view 3: section series across last ≤4 full mocks ──
  const sectionSeries = useMemo(() => {
    if (fullMocks.length < 2) return null;
    const window = fullMocks.slice(-4);
    const titles = [
      ...new Set(window[window.length - 1].perSection.map((s) => shortSectionName(s.title))),
    ];
    const rows = titles.map((title) => {
      const values = window.map((m) => {
        const s = (m.perSection || []).find((x) => shortSectionName(x.title) === title);
        return s ? s.score : null;
      });
      const seen = values.filter((v) => v != null);
      const avg = seen.length ? Math.round(seen.reduce((a, b) => a + b, 0) / seen.length) : null;
      const current = seen.length ? seen[seen.length - 1] : null;
      const max = Math.max(
        1,
        ...window.map((m) => {
          const s = (m.perSection || []).find((x) => shortSectionName(x.title) === title);
          return s ? s.max : 0;
        })
      );
      const belowAvgCount = avg != null ? seen.filter((v) => v < avg).length : 0;
      return { title, values, avg, current, max, belowAvgCount, mocks: seen.length };
    });
    // Weakest, consistently: below own average in the most mocks
    // (must be a strict majority to earn the footnote).
    let weakest = null;
    rows.forEach((r) => {
      if (r.mocks >= 2 && r.belowAvgCount * 2 > r.mocks && (!weakest || r.belowAvgCount > weakest.belowAvgCount)) {
        weakest = r;
      }
    });
    return { rows, weakest, count: window.length };
  }, [fullMocks]);

  // Suggested per-section minutes from the test's own timeout config.
  const suggestedSecPerSection = useMemo(() => {
    const timeout = Number(result?.test_id?.config?.timeout);
    if (!Number.isFinite(timeout) || timeout <= 0 || !sections || sections.length === 0) return null;
    return timeout / sections.length;
  }, [result, sections]);

  function printPage() { window.print(); }

  // ── early returns (all hooks are above this line) ──
  if (userDetails == undefined) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <p style={{ marginBottom: 16 }}>You cannot access this without logging in</p>
        <Button as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank" color="primary">Login</Button>
      </div>
    );
  }
  if (questions == undefined || result == undefined || scored == null) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <Loader />
        <p style={{ marginTop: 12, color: "var(--c-text-tertiary)" }}>Loading your analytics…</p>
      </div>
    );
  }

  const total = scored.total;
  const accuracy = total.attempted > 0 ? Math.round((total.correct / total.attempted) * 100) : 0;
  const bestSection = [...scored.perSection].sort((a, b) => b.pct - a.pct)[0] || null;
  // "Best section for N mocks running" — consecutive previous full
  // mocks agreeing with the current best.
  let bestRun = 1;
  if (bestSection && fullIdx > 0) {
    for (let i = fullIdx - 1; i >= 0; i--) {
      const b = [...(fullMocks[i].perSection || [])].sort((a, c) => (c.pct || 0) - (a.pct || 0))[0];
      if (b && shortSectionName(b.title) === shortSectionName(bestSection.title)) bestRun += 1;
      else break;
    }
  }
  // Time card self-hides on thin data — same guard as the result
  // page's Time column: every section needs tracked time (> 0s from
  // real `at` stamps) and the total must reach at least a minute.
  const showTimeCard = (() => {
    if (scored.perSection.length === 0 || sectionTimes.size === 0) return false;
    let totalTracked = 0;
    for (const p of scored.perSection) {
      const t = sectionTimes.get(p.sec.id);
      if (!(Number.isFinite(t) && t > 0)) return false;
      totalTracked += t;
    }
    return totalTracked >= 60;
  })();

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>
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
            <button onClick={() => router.push(`/mock/result/${router.query.uid}`)} style={pillPrimary} disabled={isRouting}>
              View result <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* HEADER */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--c-brand-gold)", fontWeight: 600, marginBottom: 4 }}>
            {scored.perSection.length > 1 ? "Full mocks" : "Sectional"} · Analytics
          </div>
          <h1 className="ds-display" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, margin: 0, color: "var(--c-text-primary)" }}>
            Your mock <em className="ds-grad-text" style={{ fontStyle: "italic", fontWeight: 500 }}>journey.</em>
          </h1>
          <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", margin: "4px 0 0" }}>
            What keeps happening across your mocks — and this one: {result?.test_id?.title}.
          </div>
        </div>

        {/* 1 · SCORE ACROSS MOCKS */}
        {journey === null ? null : fullMocks.length >= 2 ? (
          <JourneyCard mocks={fullMocks.slice(-6)} />
        ) : (
          <div style={{ ...card, padding: "22px 26px", marginBottom: 14 }}>
            <div style={capStyle}>1 · Score across mocks</div>
            <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)", marginTop: 6 }}>
              Your journey starts with your second mock — one point is not a line.
            </div>
          </div>
        )}

        {/* 2 · RANK & CONSISTENCY STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--c-border-faint)", borderRadius: 16, overflow: "hidden", margin: "14px 0", boxShadow: "var(--c-shadow-xs)" }}>
          <StripCell
            k="Rank"
            v={currentEntry?.rank != null ? <>#{currentEntry.rank} <small style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>of {currentEntry.totalPlayers}</small></> : "—"}
            note={
              currentEntry?.rank != null && prevMock?.rank != null
                ? currentEntry.rank < prevMock.rank
                  ? { text: `↑ from #${prevMock.rank} last mock`, tone: "up" }
                  : currentEntry.rank > prevMock.rank
                  ? { text: `↓ from #${prevMock.rank} last mock`, tone: "dn" }
                  : { text: "same as last mock" }
                : null
            }
          />
          <StripCell
            k="Accuracy"
            v={`${accuracy}%`}
            note={
              prevMock != null
                ? accuracy > prevMock.accuracy
                  ? { text: `↑ from ${prevMock.accuracy}% last mock`, tone: "up" }
                  : accuracy < prevMock.accuracy
                  ? { text: `↓ from ${prevMock.accuracy}% last mock`, tone: "dn" }
                  : { text: "level with last mock" }
                : null
            }
          />
          <StripCell
            k="Attempts"
            v={<>{total.attempted} <small style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>of {total.totalQuestions}</small></>}
            note={
              prevMock != null
                ? total.attempted > prevMock.attempted
                  ? { text: `↑ from ${prevMock.attempted} last mock`, tone: "up" }
                  : total.attempted < prevMock.attempted
                  ? { text: `↓ from ${prevMock.attempted} last mock`, tone: "dn" }
                  : { text: "flat — room to grow" }
                : null
            }
          />
          <StripCell
            k="Best section"
            v={<span style={{ fontSize: 17 }}>{bestSection ? shortSectionName(bestSection.title) : "—"}</span>}
            note={bestSection ? (bestRun >= 2 ? { text: `${bestRun} mocks running` } : { text: `${bestSection.pct}% this mock` }) : null}
          />
        </div>

        {/* 3 + 4 · SECTIONS ACROSS MOCKS · WHERE THE TIME GOES */}
        {(sectionSeries || showTimeCard) && (
          <div className="ana-rail" style={{ display: "grid", gridTemplateColumns: sectionSeries && showTimeCard ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 14 }}>
            {sectionSeries && (
              <div style={{ ...card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, padding: "14px 18px 2px" }}>2 · Sections across mocks</div>
                <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", padding: "0 18px 6px" }}>
                  section score, last {sectionSeries.count} mocks
                </div>
                {sectionSeries.rows.map((r) => (
                  <SparkRow key={r.title} row={r} danger={sectionSeries.weakest && sectionSeries.weakest.title === r.title} />
                ))}
                {sectionSeries.weakest && (
                  <div style={tnote}>
                    Weakest, consistently: <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{sectionSeries.weakest.title}</b> — below your own average in {sectionSeries.weakest.belowAvgCount} of {sectionSeries.weakest.mocks} mocks.
                  </div>
                )}
              </div>
            )}
            {showTimeCard && (
              <div style={{ ...card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, padding: "14px 18px 2px" }}>3 · Where the time goes</div>
                <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", padding: "0 18px 6px" }}>
                  {suggestedSecPerSection ? "your minutes vs the suggested split (|)" : "your minutes per section, this mock"}
                </div>
                <TimeRows
                  perSection={scored.perSection}
                  sectionTimes={sectionTimes}
                  suggestedSec={suggestedSecPerSection}
                />
              </div>
            )}
          </div>
        )}

        {/* 5 · SPEED × ACCURACY QUADRANT */}
        {quad && (
          <>
            <div style={seclabel}>4 · Speed × accuracy — {quad.measured} timed attempts, this mock</div>
            <div style={{ ...card, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--c-border-faint)" }}>
                <QuadCell dot="var(--c-success)" h="Quick & right" c={quad.qr} m={`under ${QUICK_SEC}s, correct — your scoring engine.`} />
                <QuadCell dot="var(--c-danger)" h="Quick & wrong" c={quad.qw} m={`under ${QUICK_SEC}s, wrong — likely impulse picks. This is where negatives live.`} />
                <QuadCell dot="var(--c-success)" h="Slow & right" c={quad.sr} m={`over ${SLOW_SEC}s, correct — solid but pricey. Worth speed drills.`} />
                <QuadCell dot="var(--c-danger)" h="Slow & wrong" c={quad.sw} m={`over ${SLOW_SEC}s and still wrong — real concept gaps. Review these first.`} />
              </div>
            </div>
          </>
        )}

        {/* 6 · HABITS */}
        {habits.length > 0 && (
          <>
            <div style={seclabel}>5 · Habits the numbers show</div>
            <div style={{ ...card, marginBottom: 14 }}>
              {habits.map((h2, i) => (
                <HabitRow key={i} habit={h2} first={i === 0} />
              ))}
            </div>
          </>
        )}

      </div>

      <style jsx global>{`
        @media (max-width: 760px) {
          .ana-rail { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ──

function JourneyCard({ mocks }) {
  const n = mocks.length;
  const last = mocks[n - 1];
  const first = mocks[0];
  const prev = mocks[n - 2];
  const delta = last.score - first.score;
  const title =
    delta > 0 ? `Climbing — ${n} mocks, +${delta} marks`
    : delta < 0 ? `${n} mocks — ${Math.abs(delta)} marks below your first`
    : `Holding — ${n} mocks, level with your first`;

  // Chart geometry (matches the approved preview: 800×150, labels
  // above points, mock names below).
  const W = 800, H = 150;
  const xs = mocks.map((_, i) => (n > 1 ? 60 + (i * (W - 120)) / (n - 1) : W / 2));
  const maxY = Math.max(
    1,
    ...mocks.map((m) => Math.max(m.score, m.topperScore ?? 0, m.batchAvg ?? 0))
  );
  const minY = Math.min(0, ...mocks.map((m) => m.score));
  const yOf = (v) => 22 + (1 - (v - minY) / (maxY - minY || 1)) * 106;
  const pathOf = (vals) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xs[i]},${yOf(v)}`).join(" ");

  const topperVals = mocks.map((m) => m.topperScore).filter((v) => v != null);
  const showTopper = topperVals.length === n;
  const batchVals = mocks.map((m) => m.batchAvg).filter((v) => v != null);
  const showBatch = batchVals.length === n;

  const gapNow = showTopper ? last.topperScore - last.score : null;
  const gapPrev = showTopper && prev ? prev.topperScore - prev.score : null;
  const batchDiff = showBatch ? last.score - last.batchAvg : null;

  return (
    <div style={{ ...card, padding: "22px 26px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)", opacity: 0.55, pointerEvents: "none" }} />
      <div style={capStyle}>1 · Score across mocks</div>
      <div className="ds-display" style={{ fontSize: 19, marginBottom: 16, fontWeight: 500 }}>{title}</div>
      <div style={{ position: "relative", height: 150 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
          <line x1="0" y1="128" x2={W} y2="128" stroke="var(--c-border-faint)" strokeWidth="1" />
          <line x1="0" y1="75" x2={W} y2="75" stroke="var(--c-border-faint)" strokeWidth="1" strokeDasharray="3 5" />
          <line x1="0" y1="22" x2={W} y2="22" stroke="var(--c-border-faint)" strokeWidth="1" strokeDasharray="3 5" />
          {showTopper && (
            <path d={pathOf(mocks.map((m) => m.topperScore))} stroke="var(--c-border-soft)" strokeWidth="1.6" fill="none" strokeDasharray="5 5" />
          )}
          {showBatch && (
            <path d={pathOf(mocks.map((m) => m.batchAvg))} stroke="var(--c-border-soft)" strokeWidth="1.6" fill="none" strokeDasharray="2 4" />
          )}
          <defs>
            <linearGradient id="jg1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#FFBE5C" />
              <stop offset="1" stopColor="#E08E15" />
            </linearGradient>
          </defs>
          <path d={pathOf(mocks.map((m) => m.score))} stroke="url(#jg1)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {mocks.map((m, i) => (
            <g key={m.testId}>
              <circle
                cx={xs[i]} cy={yOf(m.score)} r={i === n - 1 ? 6 : 4.5}
                fill="var(--c-brand-gold)"
                stroke={i === n - 1 ? "var(--c-surface)" : "none"}
                strokeWidth={i === n - 1 ? 2.5 : 0}
              />
              <text
                x={xs[i]} y={yOf(m.score) - 12} textAnchor="middle"
                fontSize={i === n - 1 ? 12 : 11} fontWeight="600"
                fill="var(--c-text-primary)" fontFamily="inherit"
              >
                {Math.max(0, m.score)}
              </text>
            </g>
          ))}
        </svg>
        {mocks.map((m, i) => (
          <span
            key={`lbl-${m.testId}`}
            style={{ position: "absolute", bottom: -4, left: `${(xs[i] / W) * 100}%`, transform: "translateX(-50%)", fontSize: 10, color: "var(--c-text-tertiary)", whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {m.title}
          </span>
        ))}
      </div>
      {(gapNow != null || batchDiff != null) && (
        <div style={{ display: "flex", gap: 20, marginTop: 20, fontSize: 12, color: "var(--c-text-secondary)", flexWrap: "wrap" }}>
          {gapNow != null && (
            <span>
              — — Topper&apos;s trail · gap now <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>{Math.max(0, gapNow)} marks</b>
              {gapPrev != null ? `, was ${Math.max(0, gapPrev)}` : ""}
            </span>
          )}
          {batchDiff != null && (
            <span>
              · · · Batch average · you are{" "}
              <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>
                {Math.abs(batchDiff)} mark{Math.abs(batchDiff) === 1 ? "" : "s"} {batchDiff >= 0 ? "above" : "below"}
              </b>{" "}
              it
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StripCell({ k, v, note }) {
  return (
    <div style={{ background: "var(--c-surface)", padding: "16px 20px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.11em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600 }}>{k}</div>
      <div className="ds-display" style={{ fontSize: 23, marginTop: 3, color: "var(--c-text-primary)" }}>{v}</div>
      {note && (
        <div style={{
          fontSize: 10.5, marginTop: 1,
          color: note.tone === "up" ? "var(--c-success)" : note.tone === "dn" ? "var(--c-danger)" : "var(--c-text-tertiary)",
          fontWeight: note.tone ? 600 : 400,
        }}>
          {note.text}
        </div>
      )}
    </div>
  );
}

function SparkRow({ row, danger }) {
  const stroke = danger ? "var(--c-danger)" : "var(--c-brand-gold)";
  const pts = row.values.map((v, i) => ({ v, i })).filter((p) => p.v != null);
  const n = row.values.length;
  const xOf = (i) => (n > 1 ? 10 + (i * 180) / (n - 1) : 100);
  const maxV = Math.max(1, ...pts.map((p) => p.v));
  const minV = Math.min(0, ...pts.map((p) => p.v));
  const yOf = (v) => 26 - ((v - minV) / (maxV - minV || 1)) * 20;
  const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${xOf(p.i)},${yOf(p.v)}`).join(" ");
  const lastPt = pts[pts.length - 1];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: "1px solid var(--c-border-faint)" }}>
      <span style={{ fontSize: 12, width: 96, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</span>
      <svg viewBox="0 0 200 30" preserveAspectRatio="none" style={{ flex: 1, height: 30, display: "block" }}>
        {pts.length > 1 && <path d={d} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />}
        {lastPt && <circle cx={xOf(lastPt.i)} cy={yOf(lastPt.v)} r="3" fill={stroke} />}
      </svg>
      <span style={{ fontSize: 11.5, width: 96, textAlign: "right", flexShrink: 0, color: "var(--c-text-tertiary)" }}>
        <b className="ds-display" style={{ fontSize: 14, color: "var(--c-text-primary)", fontWeight: 600 }}>{row.current != null ? Math.max(0, row.current) : "—"}</b>
        {row.avg != null ? <> · avg {Math.max(0, row.avg)}</> : null}
      </span>
    </div>
  );
}

function TimeRows({ perSection, sectionTimes, suggestedSec }) {
  const times = perSection.map((p) => sectionTimes.get(p.sec.id) || 0);
  const scale = Math.max(1, ...times, suggestedSec || 0);
  const fmtM = (s) => `${Math.round(s / 60)}m`;
  // Footnote: biggest shortfall vs the suggested split, if any.
  let short = null;
  if (suggestedSec) {
    perSection.forEach((p, i) => {
      const deficit = suggestedSec - times[i];
      if (times[i] > 0 && deficit > 120 && (!short || deficit > short.deficit)) {
        short = { title: shortSectionName(p.title), deficit };
      }
    });
  }
  return (
    <>
      {perSection.map((p, i) => (
        <div key={p.sec.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: "1px solid var(--c-border-faint)" }}>
          <span style={{ fontSize: 12, width: 92, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortSectionName(p.title)}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--c-surface-muted, var(--c-bg))", overflow: "visible", position: "relative" }}>
            <i style={{ display: "block", height: "100%", borderRadius: 999, background: "var(--c-info, #2563C4)", width: `${Math.min(100, (times[i] / scale) * 100)}%` }} />
            {suggestedSec && (
              <span style={{ position: "absolute", top: -3, bottom: -3, width: 2, background: "var(--c-text-tertiary)", borderRadius: 2, left: `${Math.min(100, (suggestedSec / scale) * 100)}%` }} />
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--c-text-tertiary)", width: 96, textAlign: "right", flexShrink: 0 }}>
            <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{fmtM(times[i])}</b>
            {suggestedSec ? <> · sugg. {fmtM(suggestedSec)}</> : null}
          </span>
        </div>
      ))}
      {short && (
        <div style={tnote}>
          <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{short.title}</b> gets {Math.round(short.deficit / 60)} minutes less than the suggested split.
        </div>
      )}
    </>
  );
}

function QuadCell({ dot, h, c, m }) {
  return (
    <div style={{ background: "var(--c-surface)", padding: "15px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}>
        <i style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: dot }} />
        {h}
      </div>
      <div className="ds-display" style={{ fontSize: 21 }}>{c}</div>
      <div style={{ fontSize: 10.5, color: "var(--c-text-tertiary)", lineHeight: 1.45, marginTop: 2 }}>{m}</div>
    </div>
  );
}

// Inline SVG habit icons (stroke currentColor — no emoji anywhere).
function HabitIcon({ name }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "clock") return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
  if (name === "gift") return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><path d="M12 3v13M6 10l6 6 6-6" /><path d="M4 21h16" /></svg>;
  if (name === "zigzag") return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
  return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><path d="M4 17l5-5 4 3 7-8" /></svg>;
}

function HabitRow({ habit, first }) {
  const tones = {
    danger: { bg: "var(--c-danger-soft, #FDE4D8)", color: "var(--c-danger)" },
    gold: { bg: "var(--c-brand-gold-tint, rgba(214,158,46,0.14))", color: "var(--c-brand-gold)" },
    success: { bg: "var(--c-success-soft, #D6F3E3)", color: "var(--c-success)" },
  };
  const t = tones[habit.tone] || tones.gold;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 20px", borderTop: first ? "none" : "1px solid var(--c-border-faint)" }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1, background: t.bg, color: t.color }}>
        <HabitIcon name={habit.icon} />
      </span>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--c-text-secondary)" }}>{habit.text}</div>
    </div>
  );
}

// ── shared styles ──
const card = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 16,
  boxShadow: "var(--c-shadow-xs)",
};
const capStyle = { fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--c-brand-gold)", fontWeight: 600, marginBottom: 4 };
const seclabel = { fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600, margin: "24px 2px 10px" };
const tnote = { padding: "11px 18px", borderTop: "1px solid var(--c-border-faint)", background: "var(--c-surface-muted, var(--c-bg))", fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: "auto" };
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
