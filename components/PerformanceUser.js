// ============================================================
// Your Performance — deep analytics page (owner-approved design).
//
// Not a score dump: what's improving, what's slipping, and what
// to do next. Everything is computed from the student's own play
// history — no AI, pure arithmetic:
//  · Open stat strip: recent accuracy (last 5 vs previous 5),
//    questions solved, strongest + weakest trusted chapter.
//  · Accuracy trend: SVG polyline of the last 10 concept tests
//    against the personal average.
//  · Section split: QA / VA / LR accuracy + 30-day delta, mapped
//    through get_concept_tree (chapter → category → group).
//  · Chapter map: every attempted chapter, weakest first, same
//    thresholds as Aaj Ka Plan (classify/accuracyOf reused), with
//    the plan's exact get_chapter_entry deep link.
//  · Mock history (score deltas + all-time rank) and revision
//    hygiene (redos / mastery / doubts / vault due).
//
// Pure logic exported for tests: accuracyOfReport, trendPoints,
// sectionOf, chapterRows.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useNMNContext } from "./NMNContext";
import { BUCKET_PATTERN, accuracyOf, classify, shortName } from "./AdaptivePlan";
import { vaultState, DAILY_CAP } from "./MistakeVault";

// ── pure helpers ──────────────────────────────────────────────

// report (jsonb array) → % accuracy over entries that carry a
// boolean isCorrect. null when nothing is scoreable.
export function accuracyOfReport(report) {
  if (!Array.isArray(report)) return null;
  const scored = report.filter((e) => e && typeof e.isCorrect === "boolean");
  if (!scored.length) return null;
  return Math.round((100 * scored.filter((e) => e.isCorrect).length) / scored.length);
}

// plays → last 10 scoreable tests, chronological: [{t, acc}].
export function trendPoints(plays) {
  return (Array.isArray(plays) ? plays : [])
    .map((p) => ({ t: p?.created_at, acc: accuracyOfReport(p?.report) }))
    .filter((p) => p.acc != null)
    .sort((a, b) => String(a.t || "").localeCompare(String(b.t || "")))
    .slice(-10);
}

function sectionOfGroupTitle(title) {
  const s = String(title || "");
  if (/quant|\bqa\b/i.test(s)) return "QA";
  if (/verbal|\bva\b/i.test(s)) return "VA";
  if (/logical|\blr\b/i.test(s)) return "LR";
  return null;
}

// chapter name → "QA" | "VA" | "LR" | null via the concept tree
// (categories.title match, categories.parent → groups.title).
export function sectionOf(chapterName, tree) {
  try {
    const cats = Array.isArray(tree?.categories) ? tree.categories : [];
    const groups = Array.isArray(tree?.groups) ? tree.groups : [];
    const key = String(chapterName || "").trim().toLowerCase();
    if (!key) return null;
    const cat = cats.find((c) => String(c?.title || "").trim().toLowerCase() === key);
    if (!cat) return null;
    const grp = groups.find((g) => g?.id === cat.parent);
    return sectionOfGroupTitle(grp?.title);
  } catch {
    return null;
  }
}

// get_my_chapter_stats rows → attempted real chapters, classified
// with the plan's exact thresholds, weakest first.
export function chapterRows(stats) {
  const rank = { attack: 0, maintain: 1, warming: 2, strength: 3, new: 4 };
  return (Array.isArray(stats) ? stats : [])
    .filter((c) => c && !BUCKET_PATTERN.test(String(c.chapter || "")) && Number(c.tests) > 0)
    .map((c) => ({ ...c, cls: classify(c), acc: accuracyOf(c) }))
    .sort((a, b) => (rank[a.cls] ?? 5) - (rank[b.cls] ?? 5) || (a.acc ?? 101) - (b.acc ?? 101));
}

// test_uuid → section, via levels → m_categories → categories → groups.
function uuidSectionMap(tree) {
  const out = {};
  try {
    const levels = Array.isArray(tree?.levels) ? tree.levels : [];
    const mById = {};
    (Array.isArray(tree?.m_categories) ? tree.m_categories : []).forEach((m) => m && (mById[m.id] = m));
    const cById = {};
    (Array.isArray(tree?.categories) ? tree.categories : []).forEach((c) => c && (cById[c.id] = c));
    const gById = {};
    (Array.isArray(tree?.groups) ? tree.groups : []).forEach((g) => g && (gById[g.id] = g));
    levels.forEach((l) => {
      if (!l?.uuid) return;
      const m = mById[l.parent];
      const c = m ? cById[m.parent] : null;
      const g = c ? gById[c.parent] : null;
      const s = sectionOfGroupTitle(g?.title);
      if (s) out[l.uuid] = s;
    });
  } catch {}
  return out;
}

// pooled accuracy over several plays' reports
function poolAccuracy(seqPlays) {
  let c = 0, t = 0;
  (seqPlays || []).forEach((p) => {
    (Array.isArray(p?.report) ? p.report : []).forEach((e) => {
      if (e && typeof e.isCorrect === "boolean") {
        t += 1;
        if (e.isCorrect) c += 1;
      }
    });
  });
  return t ? Math.round((100 * c) / t) : null;
}

const MONO = "'JetBrains Mono', monospace";
const SECTION_LABELS = { QA: "Quant", VA: "Verbal", LR: "Logical" };

export default function PerformanceUser() {
  const router = useRouter();
  const { userDetails, setCTXSlug } = useNMNContext();

  const [plays, setPlays] = useState(null); // concept plays w/ report
  const [chapterStats, setChapterStats] = useState(null); // get_my_chapter_stats rows
  const [tree, setTree] = useState(); // get_concept_tree jsonb (object, not list)
  const [mocks, setMocks] = useState(null); // mock_plays rows
  const [mistakes, setMistakes] = useState(null); // get_my_mistakes items
  const [redos7, setRedos7] = useState(0);
  const [doubts, setDoubts] = useState(0);
  const [rank, setRank] = useState(); // {rank, total}
  const [showAllMap, setShowAllMap] = useState(false);
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);

  useEffect(() => {
    const email = userDetails?.email;
    if (!email) return;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // mock_plays: try the FK join for the mock's title; if the join
    // shape is off, fall back to a plain select — page never blanks.
    const fetchMocks = async () => {
      let res = await supabase
        .from("mock_plays")
        .select("*, test_id(title)")
        .eq("user", email)
        .order("created_at", { ascending: true });
      if (res?.error) {
        res = await supabase
          .from("mock_plays")
          .select("*")
          .eq("user", email)
          .order("created_at", { ascending: true });
      }
      return res;
    };

    (async () => {
      try {
        const [playsRes, statsRes, treeRes, mocksRes, mistakesRes, redosRes, doubtsRes, rankRes] =
          await Promise.all([
            supabase.from("plays").select("created_at, report, test_uuid").eq("user", email),
            supabase.rpc("get_my_chapter_stats", { p_email: email }),
            supabase.rpc("get_concept_tree", { p_type: "concept" }),
            fetchMocks(),
            supabase.rpc("get_my_mistakes", { p_email: email }),
            supabase
              .from("mistake_redos")
              .select("id", { count: "exact", head: true })
              .eq("user", email)
              .gte("created_at", sevenDaysAgo),
            supabase
              .from("doubt_requests")
              .select("id", { count: "exact", head: true })
              .eq("user", email),
            supabase.rpc("get_alltime_ipmat_rank", { p_email: email }),
          ]);
        setPlays(Array.isArray(playsRes?.data) ? playsRes.data : []);
        setChapterStats(Array.isArray(statsRes?.data) ? statsRes.data : []);
        setTree(treeRes?.data && typeof treeRes.data === "object" ? treeRes.data : undefined);
        setMocks(Array.isArray(mocksRes?.data) ? mocksRes.data : []);
        setMistakes(Array.isArray(mistakesRes?.data) ? mistakesRes.data : []);
        setRedos7(Number(redosRes?.count) || 0);
        setDoubts(Number(doubtsRes?.count) || 0);
        if (Array.isArray(rankRes?.data) && rankRes.data.length) setRank(rankRes.data[0]);
      } catch {
        // one failed query must never blank the page
        setPlays((v) => v ?? []);
        setChapterStats((v) => v ?? []);
        setMocks((v) => v ?? []);
        setMistakes((v) => v ?? []);
      }
    })();
  }, [userDetails?.email]);

  // same deep link as Aaj Ka Plan's openChapter — one mechanism everywhere
  const openChapter = async (ch) => {
    if (!ch?.chapter_id || openingRef.current) return;
    openingRef.current = true;
    setOpening(ch.chapter_id);
    try {
      const { data } = await supabase.rpc("get_chapter_entry", {
        p_email: userDetails?.email || "",
        p_chapter: ch.chapter_id,
      });
      if (data?.length) router.push(`/test/${data[0].test_uuid}`);
    } catch {}
    openingRef.current = false;
    setOpening(false);
  };

  // ── derived numbers ──
  const seq = trendPoints(plays); // last 10 chronological
  const allScored = (Array.isArray(plays) ? plays : [])
    .map((p) => ({ ...p, _acc: accuracyOfReport(p?.report) }))
    .filter((p) => p._acc != null)
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
  const acc5 = poolAccuracy(allScored.slice(-5));
  const accPrev5 = allScored.length >= 10 ? poolAccuracy(allScored.slice(-10, -5)) : null;
  const acc5Diff = acc5 != null && accPrev5 != null ? acc5 - accPrev5 : null;

  const totalQ = (Array.isArray(plays) ? plays : []).reduce(
    (s, p) => s + (Array.isArray(p?.report) ? p.report.length : 0),
    0
  );

  const rows = chapterRows(chapterStats);
  const trusted = rows.filter((c) => Number(c.attempted || 0) >= 8 && c.acc != null);
  const best = trusted.length ? trusted.reduce((a, b) => (b.acc > a.acc ? b : a)) : null;
  const worst = trusted.length >= 2 ? trusted.reduce((a, b) => (b.acc < a.acc ? b : a)) : null;

  // section split: lifetime accuracy from chapter stats…
  const secAgg = { QA: { a: 0, c: 0 }, VA: { a: 0, c: 0 }, LR: { a: 0, c: 0 } };
  (Array.isArray(chapterStats) ? chapterStats : []).forEach((row) => {
    const s = sectionOf(row?.chapter, tree);
    if (!s) return;
    secAgg[s].a += Number(row.attempted || 0);
    secAgg[s].c += Number(row.correct || 0);
  });
  // …and 30-day delta from plays mapped through the tree's levels
  const um = uuidSectionMap(tree);
  const cutoff = Date.now() - 30 * 86400000;
  const win = { QA: { rc: 0, rt: 0, pc: 0, pt: 0 }, VA: { rc: 0, rt: 0, pc: 0, pt: 0 }, LR: { rc: 0, rt: 0, pc: 0, pt: 0 } };
  (Array.isArray(plays) ? plays : []).forEach((p) => {
    const s = um[p?.test_uuid];
    if (!s || !Array.isArray(p?.report)) return;
    const ts = new Date(p.created_at).getTime();
    if (isNaN(ts)) return;
    const recent = ts >= cutoff;
    p.report.forEach((e) => {
      if (!e || typeof e.isCorrect !== "boolean") return;
      if (recent) {
        win[s].rt += 1;
        if (e.isCorrect) win[s].rc += 1;
      } else {
        win[s].pt += 1;
        if (e.isCorrect) win[s].pc += 1;
      }
    });
  });
  const sections = ["QA", "VA", "LR"].map((s) => {
    const acc = secAgg[s].a ? Math.round((100 * secAgg[s].c) / secAgg[s].a) : null;
    const w = win[s];
    const delta =
      w.rt >= 5 && w.pt >= 5
        ? Math.round((100 * w.rc) / w.rt) - Math.round((100 * w.pc) / w.pt)
        : null;
    return { id: s, acc, delta };
  });
  const weakestSection = sections
    .filter((s) => s.acc != null && secAgg[s.id].a >= 8)
    .sort((a, b) => a.acc - b.acc)[0];

  // mocks: chronological deltas, newest shown first
  const mockSeq = (Array.isArray(mocks) ? mocks : [])
    .slice()
    .sort((a, b) => String(a?.created_at || "").localeCompare(String(b?.created_at || "")));
  const mockRows = mockSeq
    .map((m, i) => ({
      m,
      delta: i > 0 && m?.score != null && mockSeq[i - 1]?.score != null ? Number(m.score) - Number(mockSeq[i - 1].score) : null,
    }))
    .reverse()
    .slice(0, 8);

  // revision hygiene
  const mistakeList = Array.isArray(mistakes) ? mistakes : [];
  const mastered = mistakeList.filter((it) => Number(it?.streak || 0) >= 3).length;
  const dueNow = mistakeList.filter((it) => {
    try {
      const st = vaultState(it);
      return !st.mastered && st.dueNow;
    } catch {
      return false;
    }
  }).length;
  const vaultAsk = Math.min(dueNow, DAILY_CAP);

  // trend chart geometry
  const avg = seq.length ? Math.round(seq.reduce((s, p) => s + p.acc, 0) / seq.length) : null;
  const W = 560, H = 170, padL = 10, padR = 52, padT = 16, padB = 14;
  const px = (i) => (seq.length < 2 ? W / 2 : padL + (i * (W - padL - padR)) / (seq.length - 1));
  const py = (a) => padT + ((100 - a) / 100) * (H - padT - padB);
  const linePts = seq.map((p, i) => `${px(i)},${py(p.acc)}`).join(" ");
  const latest = seq.length ? seq[seq.length - 1].acc : null;
  const firstHalf = seq.slice(0, Math.floor(seq.length / 2));
  const secondHalf = seq.slice(Math.floor(seq.length / 2));
  const meanOf = (arr) => (arr.length ? arr.reduce((s, p) => s + p.acc, 0) / arr.length : 0);
  const trendUp = meanOf(secondHalf) >= meanOf(firstHalf);

  const fmtDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };
  const mockTitle = (m) => {
    const joined = m?.test_id;
    const t = (joined && typeof joined === "object" ? joined.title : null) || m?.title;
    return t ? String(t) : `Mock · ${fmtDate(m?.created_at) || "—"}`;
  };

  // ── shared styles ──
  const card = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: 16,
    boxShadow: "var(--c-shadow-xs)",
    padding: "20px 22px",
    flexShrink: 0, // page is a flex column — never let cards get squeezed
  };
  const cardTitle = { fontSize: 17 };
  const cardSub = { fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 2 };
  const emptyTxt = { padding: "14px 0", fontSize: 13, color: "var(--c-text-tertiary)" };
  const th = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--c-text-tertiary)",
    textAlign: "left",
    padding: "6px 12px 8px 0",
  };
  const td = { padding: "10px 12px 10px 0", borderTop: "1px solid var(--c-border-faint)", verticalAlign: "middle" };
  const pillFor = (cls) => {
    const base = { display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" };
    if (cls === "attack") return { ...base, color: "var(--c-brand-gold)", background: "var(--c-brand-gold-tint)", border: "1px solid rgba(255,182,39,.35)" };
    if (cls === "strength") return { ...base, color: "var(--c-success)", background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.12)" };
    return { ...base, color: "var(--c-text-tertiary)", background: "var(--c-surface-muted)", border: "1px solid var(--c-border-faint)" };
  };
  const pillLabel = { attack: "Attack", strength: "Strength", warming: "Warming", maintain: "Maintain" };
  const actionLink = { fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", whiteSpace: "nowrap" };
  const barTrack = { background: "var(--c-surface-muted)", borderRadius: 999, height: 7, overflow: "visible", flexShrink: 0 };
  const barFill = (pct) => ({ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", borderRadius: 999, background: "var(--c-stat-grad)" });

  const visibleRows = showAllMap ? rows : rows.slice(0, 8);

  // hygiene rows: [label, valueText, widthPct]
  const hygiene = [
    ["Redos done, 7 days", `${redos7} / 60`, Math.round((100 * redos7) / 60)],
    ["Mistakes mastered", mistakeList.length ? `${mastered} / ${mistakeList.length}` : "0 / 0", mistakeList.length ? Math.round((100 * mastered) / mistakeList.length) : 0],
    ["Doubts cleared", String(doubts), Math.min(100, doubts * 5)],
  ];

  // stat strip cells
  const cells = [
    {
      label: "Accuracy · last 5 tests",
      value: acc5 != null ? `${acc5}%` : "—",
      cap:
        acc5 == null
          ? "take tests to unlock"
          : acc5Diff != null
            ? `${acc5Diff >= 0 ? "▲" : "▼"} ${Math.abs(acc5Diff)}% vs previous 5`
            : "your recent hit rate",
      capColor: acc5Diff == null ? "var(--c-text-tertiary)" : acc5Diff >= 0 ? "var(--c-success)" : "var(--c-danger)",
    },
    {
      label: "Questions solved",
      value: totalQ ? String(totalQ) : "—",
      cap: totalQ ? `across ${allScored.length} tests · ${mockSeq.length} mocks` : "take tests to unlock",
      capColor: "var(--c-text-tertiary)",
    },
    {
      label: "Strongest right now",
      value: best ? shortName(best.chapter) : "—",
      cap: best ? `${best.acc}% · keep touching weekly` : "take tests to unlock",
      capColor: best ? "var(--c-success)" : "var(--c-text-tertiary)",
    },
    {
      label: "Bleeding marks in",
      value: worst ? shortName(worst.chapter) : "—",
      cap: worst ? `${worst.acc}% · ${worst.tests} ${Number(worst.tests) === 1 ? "test" : "tests"} · fix this first` : "take tests to unlock",
      capColor: worst ? "var(--c-danger)" : "var(--c-text-tertiary)",
    },
  ];

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {/* 1 · header */}
      <header className="mt-10">
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
          Your Performance
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(26px, 3.8vw, 38px)", lineHeight: 1.1 }}>
          Your numbers, <span className="ds-accent ds-grad-text">decoded.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
          Not just scores — what&apos;s improving, what&apos;s slipping, and exactly what to do next.
        </p>
      </header>

      {/* 2 · open stat strip */}
      <div className="flex items-stretch flex-wrap mt-7 mb-1" style={{ flexShrink: 0 }}>
        {cells.map((c, i, arr) => (
          <div key={c.label} style={{ padding: "4px 30px 4px 0", marginRight: 30, marginBottom: 8, borderRight: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none", maxWidth: 300 }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-tertiary)" }}>{c.label}</div>
            <div className="ds-accent ds-grad-text" style={{ fontSize: 27, marginTop: 3, lineHeight: 1.15 }}>{c.value}</div>
            <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: c.capColor }}>{c.cap}</div>
          </div>
        ))}
      </div>

      {/* 3 · trend + section split */}
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 mt-4" style={{ flexShrink: 0 }}>
        {/* 3a · accuracy trend */}
        <div style={card}>
          <div className="ds-display" style={cardTitle}>Accuracy trend</div>
          <div style={cardSub}>your last {Math.max(seq.length, 1)} concept tests, oldest to latest</div>
          {seq.length < 3 ? (
            <div style={emptyTxt}>
              {plays === null ? "Reading your test history…" : "Three scored tests and your trend line appears here — the single most honest graph on this page."}
            </div>
          ) : (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 10 }} xmlns="http://www.w3.org/2000/svg">
                {avg != null && (
                  <line x1={padL} y1={py(avg)} x2={W - padR} y2={py(avg)} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="5 5" />
                )}
                <polyline points={linePts} fill="none" stroke="var(--c-brand-gold)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {seq.map((p, i) => (
                  <circle key={i} cx={px(i)} cy={py(p.acc)} r={i === seq.length - 1 ? 4.5 : 2.5} fill={i === seq.length - 1 ? "var(--c-brand-gold)" : "var(--c-surface)"} stroke="var(--c-brand-gold)" strokeWidth="1.5" />
                ))}
                <text x={px(seq.length - 1) + 9} y={py(latest) + 4} fontSize="13" fontWeight="600" fontFamily={MONO} fill={latest >= avg ? "var(--c-success)" : "var(--c-danger)"}>
                  {latest}%
                </text>
              </svg>
              <div className="flex justify-between" style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 4 }}>
                <span>{seq.length} tests ago</span>
                <span>latest</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 12, fontWeight: 500, color: trendUp ? "var(--c-success)" : "var(--c-danger)" }}>
                {trendUp ? "Trend upar hai — jo chal raha hai, mat chhedo." : "Trend gir raha hai — plan ke attack chapters pe focus karo."}
              </div>
            </>
          )}
        </div>

        {/* 3b · section split */}
        <div style={card}>
          <div className="ds-display" style={cardTitle}>Section split</div>
          <div style={cardSub}>lifetime accuracy · Δ vs previous month</div>
          <div className="mt-4">
            {sections.map((s) => (
              <div key={s.id} className="flex items-center gap-3" style={{ padding: "9px 0" }}>
                <span style={{ width: 60, fontSize: 12.5, fontWeight: 600 }}>
                  {s.id}
                  <span style={{ fontWeight: 400, color: "var(--c-text-tertiary)" }}> · {SECTION_LABELS[s.id]}</span>
                </span>
                <div className="flex-1" style={barTrack}>
                  {s.acc != null && <div style={barFill(s.acc)} />}
                </div>
                <span style={{ width: 42, textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: MONO }}>
                  {s.acc != null ? `${s.acc}%` : "—"}
                </span>
                <span style={{ width: 44, textAlign: "right", fontSize: 11, fontWeight: 600, fontFamily: MONO, color: s.delta == null ? "var(--c-text-tertiary)" : s.delta >= 0 ? "var(--c-success)" : "var(--c-danger)" }}>
                  {s.delta == null ? "·" : `${s.delta >= 0 ? "▲" : "▼"} ${Math.abs(s.delta)}`}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, marginTop: 14, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
            {weakestSection
              ? `${SECTION_LABELS[weakestSection.id]} (${weakestSection.id}) is your weakest split at ${weakestSection.acc}% — the cheapest marks you can still buy live there.`
              : "A few concept tests in each section and this split tells you where the cheapest marks are."}
          </div>
        </div>
      </div>

      {/* 4 · chapter map */}
      <div className="mt-4" style={card}>
        <div className="ds-display" style={cardTitle}>Chapter map — all {rows.length} attempted</div>
        <div style={cardSub}>weakest first · same thresholds as your plan</div>
        {chapterStats === null ? (
          <div style={emptyTxt}>Reading your test history…</div>
        ) : rows.length === 0 ? (
          <div style={emptyTxt}>Take a concept test and every chapter you touch shows up here, weakest first.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full mt-3" style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Chapter</th>
                  <th style={th}>Tests</th>
                  <th style={th}>Accuracy</th>
                  <th style={th}></th>
                  <th style={th}>Status</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((c) => (
                  <tr key={c.chapter_id ?? c.chapter}>
                    <td style={{ ...td, fontWeight: c.cls === "attack" ? 600 : 500 }}>{shortName(c.chapter)}</td>
                    <td style={{ ...td, fontFamily: MONO, fontSize: 12, color: "var(--c-text-secondary)" }}>{c.tests}</td>
                    <td style={{ ...td, fontFamily: MONO, fontWeight: 600 }}>{c.acc != null ? `${c.acc}%` : "—"}</td>
                    <td style={{ ...td, width: 100 }}>
                      <div style={{ ...barTrack, width: 90 }}>{c.acc != null && <div style={barFill(c.acc)} />}</div>
                    </td>
                    <td style={td}>
                      <span style={pillFor(c.cls)}>{pillLabel[c.cls] || "Maintain"}</span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span style={actionLink} onClick={() => openChapter(c)}>
                        {opening === c.chapter_id ? "opening…" : c.cls === "strength" ? "quick revision →" : "practice this →"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllMap((v) => !v)}
            style={{ background: "none", border: "none", padding: "12px 0 2px", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}
          >
            {showAllMap ? "Show less" : `Show all ${rows.length} →`}
          </button>
        )}
        <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 10 }}>
          Never-attempted chapters live in Concept Tests — unknown ≠ weak.
        </div>
      </div>

      {/* 5 · mocks + hygiene */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4 mb-12" style={{ flexShrink: 0 }}>
        {/* 5a · mock history */}
        <div style={card}>
          <div className="ds-display" style={cardTitle}>Mock history</div>
          <div style={cardSub}>full-length mocks · newest first</div>
          {mocks === null ? (
            <div style={emptyTxt}>Reading your mocks…</div>
          ) : mockRows.length === 0 ? (
            <div style={emptyTxt}>No mocks yet — Sunday ka full mock is where exam temperament gets built.</div>
          ) : (
            <table className="w-full mt-3" style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Mock</th>
                  <th style={th}>Score</th>
                  <th style={th}>Δ</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {mockRows.map(({ m, delta }, i) => (
                  <tr key={m?.uid ?? m?.id ?? i}>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{mockTitle(m)}</div>
                      {fmtDate(m?.created_at) && (
                        <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>{fmtDate(m.created_at)}</div>
                      )}
                    </td>
                    <td style={{ ...td, fontFamily: MONO, fontWeight: 600 }}>{m?.score ?? "—"}</td>
                    <td style={{ ...td, fontFamily: MONO, fontSize: 12, fontWeight: 600, color: delta == null ? "var(--c-text-tertiary)" : delta >= 0 ? "var(--c-success)" : "var(--c-danger)" }}>
                      {delta == null ? "·" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}`}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {m?.uid && (
                        <span style={actionLink} onClick={() => router.push(`/mock/result/${m.uid}`)}>
                          review →
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rank?.rank && (
            <div style={{ fontSize: 12, marginTop: 12, fontWeight: 500, color: "var(--c-text-secondary)" }}>
              All-time avg-mock rank: <span style={{ fontFamily: MONO, fontWeight: 600, color: "var(--c-brand-gold)" }}>#{rank.rank}</span> of {rank.total}
            </div>
          )}
        </div>

        {/* 5b · revision hygiene */}
        <div style={card}>
          <div className="ds-display" style={cardTitle}>Revision hygiene</div>
          <div style={cardSub}>marks already paid for — collect them via redo</div>
          <div className="mt-4">
            {hygiene.map(([label, value, pct]) => (
              <div key={label} style={{ padding: "9px 0" }}>
                <div className="flex justify-between items-baseline" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: MONO, color: "var(--c-text-secondary)" }}>{value}</span>
                </div>
                <div style={barTrack}>
                  <div style={barFill(pct)} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, marginTop: 14, fontWeight: 500, color: vaultAsk > 0 ? "var(--c-text-secondary)" : "var(--c-text-tertiary)" }}>
            Vault due aaj: <span style={{ fontFamily: MONO, fontWeight: 600 }}>{vaultAsk}</span>
            {vaultAsk > 0 && (
              <>
                {" — "}
                <span style={actionLink} onClick={() => setCTXSlug && setCTXSlug("mistakevault")}>
                  clear now →
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
