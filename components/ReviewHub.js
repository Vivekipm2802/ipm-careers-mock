// ============================================================
// History v2 — "Your test history." (Aug 2026, session-level).
//
// The question-level day-grouped log is gone. The list is now
// SESSIONS (sittings), newest first, grouped by month:
//  · Concept test  → one row per `plays` row (title from the
//    concept-tree level, right·wrong from report, duration from
//    the wall-clock `duration` column or max report timestamp).
//  · Mock/Sectional → one row per `mock_plays` row (split by
//    test config.generatorType === "sectional"). Score = the
//    submit-time `score` column when present; right·wrong come
//    from the existing correctness pass over mock_questions
//    (report entries carry no isCorrect). Total marks are NOT
//    computed here — that needs the sections/modules join the
//    result page does — so the score shows without "/total".
//  · PYQ practice  → attempts grouped per calendar day per exam
//    ("PYQ practice · IPMAT Indore" · n questions · right·wrong).
//
// Row click → concept/mock/sectional sessions push to their
// result pages (/test/result/{uid}, /mock/result/{uid} — both
// pages query .eq("uid", …)). PYQ sessions (and legacy rows
// without a uid) expand inline to that day's question rows,
// reusing the SAME detail panel as before (options + Samjhao +
// vault status + lucky-guess flag + A/D/S/Esc keyboard).
//
// Search matches session titles AND question snippets. A session
// whose QUESTION matches renders expanded with only the matching
// questions inside. LIMITATION (deliberate): question text is
// only searchable once its content has been fetched — content
// loads when a session is expanded, so concept/mock questions
// you've never opened here match by session title only. All
// sessions live in memory (the loads are unpaginated), so title
// search always covers everything.
//
// Samjhao reuses the vault's exact machinery: doubt_explanations
// cache first (keyed by the vault's id space), then /api/explain,
// respecting the shared doubt_requests daily pool (DAILY_DOUBTS).
// Mock questions get their own negative id space (MOCK_ID_OFFSET)
// so cache rows never collide with concept `questions` ids.
//
// Pure logic exported for tests: stripSnippet, treeLookups,
// conceptSessionsOf, mockSessionsOf, pyqSessionsOf,
// sessionDurationMin, durationLabel, dateShortOf, monthLabelOf,
// groupByMonth, filterSessions, sessionSearch, vaultKeyOf,
// prettyExam, titleCaseTopic.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import PageHeader from "./PageHeader";
import PillDropdown from "./ui/PillDropdown";
import {
  REASONS,
  PYQ_ID_OFFSET,
  DAILY_DOUBTS,
  BUCKET,
} from "./MistakeVault";

// Sectional accent — the approved preview's violet. No portal var
// exists for violet; same rgba approach as MistakeVault.
const VIOLET = "rgba(151,113,224,1)"; /* violet — approved-preview accent, no portal var */
const VIOLET_TINT = "rgba(151,113,224,0.14)"; /* violet tint — reads on light + dark */

// PYQ topic names arrive in mixed casing — same normalisation the
// PYQ library uses (kept local: importing PYQManager would drag
// NextUI + Quill into this bundle for one string helper).
export function titleCaseTopic(name) {
  const small = new Set(["and", "or", "of", "the", "in", "on", "a", "an", "to", "&"]);
  return String(name || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Mock/sectional questions live in `mock_questions` whose ids can
// collide with concept `questions` ids — park their Samjhao cache
// rows in a distinct negative id space (vault uses -(1e6+..) for
// PYQ; we use -(2e6+..) for mocks).
export const MOCK_ID_OFFSET = 2000000;

const SESSIONS_PAGE = 25;

// ── pure helpers ──────────────────────────────────────────────

// html → plain-text snippet. Image-only / empty → labelled fallback.
export function stripSnippet(title, question, id) {
  const raw = `${title || ""} ${String(question || "")}`
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+\.\s*/, "");
  return raw || `Image-based question · #${id}`;
}

// get_concept_tree → { levelByUuid } lookup for chapter/test labels.
export function treeLookups(tree) {
  const mById = {};
  const cById = {};
  (Array.isArray(tree?.m_categories) ? tree.m_categories : []).forEach((m) => m && (mById[m.id] = m));
  (Array.isArray(tree?.categories) ? tree.categories : []).forEach((c) => c && (cById[c.id] = c));
  const levelByUuid = {};
  (Array.isArray(tree?.levels) ? tree.levels : []).forEach((l) => {
    if (!l?.uuid) return;
    const m = mById[l.parent];
    const c = m ? cById[m.parent] : null;
    levelByUuid[l.uuid] = { title: l.title || null, chapter: c?.title || null };
  });
  return levelByUuid;
}

// Session length in minutes: wall-clock `duration` column (Ship 4)
// first, max report timestamp as fallback for older rows.
export function sessionDurationMin(row) {
  const d = Number(row?.duration);
  if (Number.isFinite(d) && d > 0) return Math.max(1, Math.round(d / 60));
  const rep = Array.isArray(row?.report) ? row.report : [];
  const maxT = rep.reduce((m, r) => (typeof r?.timestamp === "number" && r.timestamp > m ? r.timestamp : m), 0);
  return maxT > 0 ? Math.max(1, Math.round(maxT / 60)) : null;
}

// 24 → "24 min", 120 → "2h 0m".
export function durationLabel(min) {
  if (!Number.isFinite(min) || min <= 0) return null;
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${min} min`;
}

// "Sun 20 Jul" (adds the year when it isn't this year).
export function dateShortOf(iso, now = new Date()) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const base = `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

// "July" (adds the year when it isn't this year).
export function monthLabelOf(iso, now = new Date()) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Earlier";
  const m = d.toLocaleDateString("en-US", { month: "long" });
  return d.getFullYear() === now.getFullYear() ? m : `${m} ${d.getFullYear()}`;
}

// newest-first sessions → [{key, label, items}] grouped by month.
export function groupByMonth(list, now = new Date()) {
  const groups = [];
  let cur = null;
  (list || []).forEach((s) => {
    const d = new Date(s.at);
    const key = isNaN(d.getTime()) ? "unknown" : `${d.getFullYear()}-${d.getMonth()}`;
    if (!cur || cur.key !== key) {
      cur = { key, label: monthLabelOf(s.at, now), items: [] };
      groups.push(cur);
    }
    cur.items.push(s);
  });
  return groups;
}

// "ipmat_indore" → "IPMAT Indore" (fallback when pyq_exams has no name).
export function prettyExam(id) {
  return String(id || "ipmat_indore")
    .split(/[_\s]+/)
    .map((t, i) => (i === 0 ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1)))
    .join(" ");
}

// plays rows → concept sessions (one per sitting).
export function conceptSessionsOf(plays, levelByUuid) {
  return (Array.isArray(plays) ? plays : []).map((p) => {
    const lv = (levelByUuid || {})[p.test_uuid] || {};
    const title = lv.title || "Concept test";
    // bucket collections ("Topic Wise" etc.) aren't chapters — label
    // those attempts by the test title instead (vault convention)
    const chapterRaw = lv.chapter || null;
    const chapter = chapterRaw && BUCKET.test(String(chapterRaw)) ? lv.title || chapterRaw : chapterRaw;
    const attempts = [];
    let right = 0;
    let wrong = 0;
    (Array.isArray(p.report) ? p.report : []).forEach((e) => {
      if (!e || e.id == null) return;
      const result = e.isCorrect === true ? "right" : e.isCorrect === false ? "wrong" : "skipped";
      if (result === "right") right += 1;
      if (result === "wrong") wrong += 1;
      attempts.push({
        key: `c-${p.uid || p.created_at}-${e.id}`,
        source: "concept",
        qid: e.id,
        result,
        at: p.created_at,
        chapter,
        testTitle: title,
        picked: e.selectedOption ?? e.value ?? null,
        typed: e.answer ?? e.value ?? null,
      });
    });
    return {
      key: `s-c-${p.uid || p.created_at}`,
      type: "concept",
      uid: p.uid || null,
      at: p.created_at,
      title,
      right,
      wrong,
      score: null,
      n: attempts.length,
      durationMin: sessionDurationMin(p),
      attempts,
    };
  });
}

// mock_plays rows → mock/sectional sessions. `meta` = {id: {type,
// correctIdx, answer}} from mock_questions; without it (or for ids
// no longer in the bank) an attempt's correctness is "unknown".
export function mockSessionsOf(mockPlays, meta) {
  const normalize = (s) => {
    if (s == null) return "";
    const t = String(s).trim().toLowerCase().replace(/\s+/g, "");
    if (/^-?\d*\.?\d+$/.test(t)) {
      const n = Number(t);
      if (!Number.isNaN(n) && Number.isFinite(n)) return String(n);
    }
    return t;
  };
  return (Array.isArray(mockPlays) ? mockPlays : []).map((p) => {
    const t = p.test_id && typeof p.test_id === "object" ? p.test_id : {};
    const type = t?.config?.generatorType === "sectional" ? "sectional" : "mock";
    const title = t?.title || (type === "sectional" ? "Sectional test" : "Mock test");
    const attempts = [];
    let right = 0;
    let wrong = 0;
    let unknown = 0;
    (Array.isArray(p.report) ? p.report : []).forEach((e) => {
      if (!e || e.id == null || e.value == null) return; // value null = never answered
      const m = meta ? meta[String(e.id)] : null;
      let result = "unknown";
      if (m) {
        if (m.type === "input") result = normalize(m.answer) === normalize(e.value) ? "right" : "wrong";
        else if (m.correctIdx != null) {
          const idx = Number(e.value) - 1;
          result = Number.isFinite(idx) ? (idx === m.correctIdx ? "right" : "wrong") : "unknown";
        }
      }
      if (result === "right") right += 1;
      else if (result === "wrong") wrong += 1;
      else unknown += 1;
      attempts.push({
        key: `m-${p.uid || p.id}-${e.id}`,
        source: type,
        qid: e.id,
        result,
        at: p.created_at,
        chapter: null,
        testTitle: title,
        picked: e.value ?? null,
        typed: e.value ?? null,
      });
    });
    const score = Number(p?.score);
    return {
      key: `s-m-${p.uid || p.id}`,
      type,
      uid: p.uid || null,
      at: p.created_at,
      title,
      right,
      wrong,
      unknown,
      // submit-time score recorded by the runner; total marks would
      // need the sections/modules join the result page does — the
      // row shows the score alone, right·wrong as the meta line.
      score: Number.isFinite(score) ? score : null,
      n: attempts.length,
      durationMin: sessionDurationMin(p),
      attempts,
    };
  });
}

// pyq_attempts rows (ascending) → one session per calendar day per
// exam. Within a day the latest verdict per question wins, and a
// 'seen' never downgrades a real right/wrong (the library's rule).
export function pyqSessionsOf(rows, topicByQid, examByQid, examNameById) {
  const groups = {};
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    if (r?.question_id == null || !r.result) return;
    const d = new Date(r.created_at);
    if (isNaN(d.getTime())) return;
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const exam = (examByQid && examByQid[String(r.question_id)]) || "ipmat_indore";
    const gk = `${day}|${exam}`;
    if (!groups[gk]) groups[gk] = { day, exam, qmap: {}, at: r.created_at };
    const g = groups[gk];
    if (String(r.created_at) > String(g.at)) g.at = r.created_at;
    const k = String(r.question_id);
    const prev = g.qmap[k];
    if (prev && r.result === "seen" && (prev.result === "right" || prev.result === "wrong")) {
      prev.at = r.created_at || prev.at;
      return;
    }
    g.qmap[k] = { result: r.result, at: r.created_at };
  });
  return Object.values(groups).map((g) => {
    const examName = (examNameById && examNameById[g.exam]) || prettyExam(g.exam);
    const attempts = Object.entries(g.qmap).map(([qid, v]) => ({
      key: `p-${g.day}-${qid}`,
      source: "pyq",
      qid: Number(qid),
      result: v.result === "seen" ? "skipped" : v.result,
      at: v.at,
      chapter: (topicByQid && topicByQid[qid]) || null,
      testTitle: examName,
      picked: null,
      typed: null,
    }));
    const right = attempts.filter((a) => a.result === "right").length;
    const wrong = attempts.filter((a) => a.result === "wrong").length;
    return {
      key: `s-p-${g.day}-${g.exam}`,
      type: "pyq",
      uid: null,
      at: g.at,
      title: `PYQ practice · ${examName}`,
      right,
      wrong,
      score: null,
      n: attempts.length,
      durationMin: null,
      attempts,
    };
  });
}

// AND-composed session filters: type (concept|mock|sectional|pyq)
// and a rolling day window.
export function filterSessions(sessions, f, now = new Date()) {
  const cutoff = f.when ? now.getTime() - f.when * 86400000 : null;
  return (sessions || []).filter((s) => {
    if (f.type && s.type !== f.type) return false;
    if (cutoff != null) {
      const t = new Date(s.at).getTime();
      if (isNaN(t) || t < cutoff) return false;
    }
    return true;
  });
}

// Search one session: every word must appear in the title, OR in a
// question's snippet+chapter — but ONLY for content that is already
// fetched (contentOf returns null otherwise). See header comment.
export function sessionSearch(s, needle, contentOf) {
  const n = String(needle || "").trim().toLowerCase();
  if (!n) return { hit: true, viaTitle: false, matched: [] };
  const words = n.split(/\s+/);
  const title = String(s.title || "").toLowerCase();
  const viaTitle = words.every((w) => title.includes(w));
  const matched = (s.attempts || []).filter((a) => {
    const q = contentOf(a);
    if (!q || q.missing) return false;
    const hay = `${stripSnippet(q.title, q.question, a.qid)} ${a.chapter || ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  return { hit: viaTitle || matched.length > 0, viaTitle, matched };
}

// attempt → its id in the vault's id space (null = vault can't
// hold this source: mocks/sectionals have no vault id space).
export function vaultKeyOf(a) {
  if (!a) return null;
  if (a.source === "concept") return String(a.qid);
  if (a.source === "pyq") return String(-(PYQ_ID_OFFSET + Number(a.qid)));
  return null;
}

const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// Small stroked icon wrapper — same pattern as the Dashboard KPI icons.
function Ic({ size = 16, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

// Icon tile per session type — drawn SVGs straight from the
// approved preview: clock gold = mock, target success = concept,
// file blue = PYQ, bars violet = sectional.
function TypeTile({ type }) {
  const style = {
    width: 38,
    height: 38,
    borderRadius: 11,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    background:
      type === "mock"
        ? "var(--c-brand-gold-tint)"
        : type === "concept"
          ? "var(--c-success-soft)"
          : type === "pyq"
            ? "var(--c-info-soft)"
            : VIOLET_TINT,
    color:
      type === "mock"
        ? "var(--c-brand-gold)"
        : type === "concept"
          ? "var(--c-success)"
          : type === "pyq"
            ? "var(--c-info)"
            : VIOLET,
  };
  return (
    <span style={style}>
      {type === "mock" && (
        <Ic>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </Ic>
      )}
      {type === "concept" && (
        <Ic size={15}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </Ic>
      )}
      {type === "pyq" && (
        <Ic size={15}>
          <path d="M6 2h9l5 5v15H6z" />
          <path d="M14 2v6h6" />
        </Ic>
      )}
      {type === "sectional" && (
        <Ic size={15}>
          <path d="M4 19V10M10 19V5M16 19v-8M22 19H2" />
        </Ic>
      )}
    </span>
  );
}

// ── component ─────────────────────────────────────────────────

// goPractice / goVault: optional callbacks from the shell
// (index.js passes () => setSlug("play")) — keeps this
// component provider-free.
export default function ReviewHub({ userData, goPractice, goVault }) {
  const router = useRouter();
  const [plays, setPlays] = useState(null);
  const [mockPlays, setMockPlays] = useState(null);
  const [pyqRows, setPyqRows] = useState(null);
  const [tree, setTree] = useState(null);
  const [mockMeta, setMockMeta] = useState(null); // {id: {type, correctIdx, answer}}
  const [pyqTopics, setPyqTopics] = useState(null); // {qid: topic label}
  const [pyqExamByQid, setPyqExamByQid] = useState(null); // {qid: exam id}
  const [pyqExamNames, setPyqExamNames] = useState(null); // {exam id: name}
  const [vaultMap, setVaultMap] = useState({}); // {vaultKey: {streak, last_reason}}
  const [warnings, setWarnings] = useState([]);
  const [doubtsToday, setDoubtsToday] = useState(0);

  const [fType, setFType] = useState(null); // null|concept|mock|sectional|pyq
  const [fWhen, setFWhen] = useState(null); // null|30|90
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [openSession, setOpenSession] = useState(null); // session key expanded inline
  const [openKey, setOpenKey] = useState(null); // attempt key with the detail panel open
  const [showSolution, setShowSolution] = useState(true);
  const [explain, setExplain] = useState(null); // null | {loading}|{text}|{error}

  // lucky-guess flags: {vaultKey: true} from user_lucky_guesses
  const [guessKeys, setGuessKeys] = useState({});
  const [guessBusy, setGuessBusy] = useState(false);

  // fetched question content, cached forever: key "c:12" / "m:12" / "p:12"
  const contentRef = useRef(new Map());
  const fetchingRef = useRef(new Set());
  const [contentTick, setContentTick] = useState(0);

  const warn = (msg) =>
    setWarnings((w) => (w.includes(msg) ? w : [...w, msg]));

  // ── load everything (each source independently error-tolerant) ──
  useEffect(() => {
    const email = userData?.email;
    if (!email) return;
    let gone = false;

    (async () => {
      // concept plays + tree (duration is Ship 4 — fall back without it)
      try {
        const [pRes0, tRes] = await Promise.all([
          supabase.from("plays").select("uid, created_at, report, test_uuid, duration").eq("user", email),
          supabase.rpc("get_concept_tree", { p_type: "concept" }),
        ]);
        let pRes = pRes0;
        if (pRes.error) {
          pRes = await supabase.from("plays").select("uid, created_at, report, test_uuid").eq("user", email);
        }
        if (gone) return;
        if (pRes.error) throw pRes.error;
        setPlays(Array.isArray(pRes.data) ? pRes.data : []);
        setTree(tRes?.data && typeof tRes.data === "object" ? tRes.data : {});
      } catch {
        if (!gone) { setPlays([]); setTree({}); warn("concept tests"); }
      }

      // mocks + sectionals (join for title/config; plain fallback)
      try {
        let res = await supabase
          .from("mock_plays")
          .select("id, uid, created_at, report, score, duration, test_id(id,title,config)")
          .eq("user", email);
        if (res.error) {
          res = await supabase
            .from("mock_plays")
            .select("id, uid, created_at, report, test_id")
            .eq("user", email);
        }
        if (gone) return;
        if (res.error) throw res.error;
        const rows = Array.isArray(res.data) ? res.data : [];
        setMockPlays(rows);
        // one light pass over every attempted mock question id gives
        // correctness for the right·wrong counts (report rows carry
        // no isCorrect) — same pass the result page does.
        const ids = [...new Set(rows.flatMap((p) => (Array.isArray(p?.report) ? p.report : []).filter((e) => e && e.id != null && e.value != null).map((e) => e.id)))];
        const meta = {};
        for (let i = 0; i < ids.length; i += 200) {
          const { data, error } = await supabase
            .from("mock_questions")
            .select("id,type,options")
            .in("id", ids.slice(i, i + 200));
          if (error) throw error;
          (data || []).forEach((q) => {
            meta[String(q.id)] = {
              type: q.type,
              correctIdx: Array.isArray(q.options) ? q.options.findIndex((o) => o?.isCorrect) : null,
              answer: q?.options?.answer,
            };
          });
        }
        if (!gone) setMockMeta(meta);
      } catch {
        if (!gone) { setMockPlays((v) => v ?? []); setMockMeta((v) => v ?? {}); warn("mocks/sectionals"); }
      }

      // PYQ attempts + topic labels + exam per question (for the
      // per-day-per-exam session grouping)
      try {
        const { data, error } = await supabase
          .from("pyq_attempts")
          .select("question_id, result, created_at")
          .eq("user", email)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (gone) return;
        const rows = Array.isArray(data) ? data : [];
        setPyqRows(rows);
        try {
          const qids = [...new Set(rows.map((r) => r.question_id).filter((x) => x != null))];
          const rel = [];
          const examRows = [];
          for (let i = 0; i < qids.length; i += 200) {
            const slice = qids.slice(i, i + 200);
            const [{ data: chunk }, { data: eChunk }] = await Promise.all([
              supabase.from("pyq_question_topics").select("question_id, topic_id").in("question_id", slice),
              supabase.from("pyq_questions").select("id, exam").in("id", slice),
            ]);
            if (Array.isArray(chunk)) rel.push(...chunk);
            if (Array.isArray(eChunk)) examRows.push(...eChunk);
          }
          const [{ data: topics }, { data: exams }] = await Promise.all([
            supabase.from("pyq_topics").select("id,name"),
            supabase.from("pyq_exams").select("id,name"),
          ]);
          const tById = {};
          (topics || []).forEach((t) => (tById[String(t.id)] = t.name));
          const map = {};
          rel.forEach((r) => {
            const k = String(r.question_id);
            if (!map[k] && tById[String(r.topic_id)]) map[k] = titleCaseTopic(tById[String(r.topic_id)]);
          });
          const eMap = {};
          examRows.forEach((r) => { eMap[String(r.id)] = r.exam || "ipmat_indore"; });
          const eNames = {};
          (exams || []).forEach((e) => { if (e?.id) eNames[e.id] = e.name || prettyExam(e.id); });
          if (!gone) {
            setPyqTopics(map);
            setPyqExamByQid(eMap);
            setPyqExamNames(eNames);
          }
        } catch {
          if (!gone) { setPyqTopics({}); setPyqExamByQid({}); setPyqExamNames({}); }
        }
      } catch {
        if (!gone) { setPyqRows([]); setPyqTopics({}); setPyqExamByQid({}); setPyqExamNames({}); warn("PYQ attempts"); }
      }

      // vault membership + reasons (three id spaces, one map)
      try {
        const [a, b, c] = await Promise.all([
          supabase.rpc("get_my_mistakes", { p_email: email }),
          supabase.rpc("get_my_own_mistakes", { p_email: email }),
          supabase.rpc("get_my_pyq_mistakes", { p_email: email }),
        ]);
        if (gone) return;
        const map = {};
        (Array.isArray(a?.data) ? a.data : []).forEach((it) => {
          map[String(it.question_id)] = { streak: Number(it.streak || 0), last_reason: it.last_reason || null, item: it };
        });
        (Array.isArray(b?.data) ? b.data : []).forEach((it) => {
          map[String(-it.id)] = { streak: Number(it.streak || 0), last_reason: it.last_reason || null, item: it };
        });
        (Array.isArray(c?.data) ? c.data : []).forEach((it) => {
          map[String(-(PYQ_ID_OFFSET + Number(it.id)))] = { streak: Number(it.streak || 0), last_reason: it.last_reason || null, item: it };
        });
        setVaultMap(map);
      } catch {
        if (!gone) warn("vault status");
      }

      // lucky-guess flags (table may not be shipped yet — quiet fail)
      try {
        const { data, error } = await supabase
          .from("user_lucky_guesses")
          .select("question_id")
          .eq("user", email);
        if (error) throw error;
        if (!gone) {
          const g = {};
          (data || []).forEach((r) => { g[String(r.question_id)] = true; });
          setGuessKeys(g);
        }
      } catch {}

      // Samjhao daily pool
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("doubt_requests")
          .select("id", { count: "exact", head: true })
          .eq("user", email)
          .gte("created_at", startOfToday.toISOString());
        if (!gone) setDoubtsToday(count || 0);
      } catch {}
    })();

    return () => { gone = true; };
  }, [userData?.email]);

  // ── assemble sessions ──
  const levelByUuid = useMemo(() => treeLookups(tree), [tree]);
  const sessions = useMemo(() => {
    const all = [
      ...conceptSessionsOf(plays, levelByUuid),
      ...mockSessionsOf(mockPlays, mockMeta),
      ...pyqSessionsOf(pyqRows, pyqTopics, pyqExamByQid, pyqExamNames),
    ];
    return all.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }, [plays, levelByUuid, mockPlays, mockMeta, pyqRows, pyqTopics, pyqExamByQid, pyqExamNames]);

  const loading = plays === null && mockPlays === null && pyqRows === null;
  const hasAny = sessions.length > 0;

  const contentOf = (a) => {
    const src = a.source === "pyq" ? "p" : a.source === "concept" ? "c" : "m";
    return contentRef.current.get(`${src}:${a.qid}`) || null;
  };

  const filtered = useMemo(
    () => filterSessions(sessions, { type: fType, when: fWhen }),
    [sessions, fType, fWhen]
  );

  const searching = search.trim().length > 0;
  // {sessionKey: {viaTitle, matched}} for hits only — recomputed as
  // content arrives (contentTick).
  const searchMap = useMemo(() => {
    if (!searching) return null;
    const map = {};
    filtered.forEach((s) => {
      const r = sessionSearch(s, search, contentOf);
      if (r.hit) map[s.key] = r;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, search, searching, contentTick]);

  const visibleSessions = useMemo(() => {
    const base = searching ? filtered.filter((s) => searchMap && searchMap[s.key]) : filtered;
    return base.slice(0, page * SESSIONS_PAGE);
  }, [filtered, searching, searchMap, page]);
  const totalMatches = searching ? (searchMap ? Object.keys(searchMap).length : 0) : filtered.length;
  const monthGroups = useMemo(() => groupByMonth(visibleSessions), [visibleSessions]);

  // rows shown inside a session: full list when manually expanded,
  // only the matching questions when a search matched its questions.
  const rowsOf = (s) => {
    if (openSession === s.key) {
      if (searching && searchMap?.[s.key]?.matched?.length) return searchMap[s.key].matched;
      return s.attempts;
    }
    if (searching && searchMap?.[s.key] && searchMap[s.key].matched.length > 0) return searchMap[s.key].matched;
    return null;
  };

  // ── content fetch for the expanded session (batched, cached) ──
  const fetchContentFor = (attempts) => {
    const need = { c: [], m: [], p: [] };
    (attempts || []).forEach((a) => {
      const src = a.source === "pyq" ? "p" : a.source === "concept" ? "c" : "m";
      const ck = `${src}:${a.qid}`;
      if (!contentRef.current.has(ck) && !fetchingRef.current.has(ck)) {
        fetchingRef.current.add(ck);
        need[src].push(a.qid);
      }
    });
    const jobs = [];
    const batchFetch = (table, ids, src, cols) => {
      for (let i = 0; i < ids.length; i += 100) {
        const slice = ids.slice(i, i + 100);
        jobs.push(
          supabase
            .from(table)
            .select(cols)
            .in("id", slice)
            .then(({ data, error }) => {
              if (error) { slice.forEach((id) => fetchingRef.current.delete(`${src}:${id}`)); return; }
              (data || []).forEach((q) => contentRef.current.set(`${src}:${q.id}`, q));
              // ids the DB no longer has → tombstone so we stop retrying
              slice.forEach((id) => {
                if (!contentRef.current.has(`${src}:${id}`)) contentRef.current.set(`${src}:${id}`, { id, missing: true });
              });
            })
            .catch(() => slice.forEach((id) => fetchingRef.current.delete(`${src}:${id}`)))
        );
      }
    };
    if (need.c.length) batchFetch("questions", need.c, "c", "id,title,question,questionimage,options,explanation");
    if (need.m.length) batchFetch("mock_questions", need.m, "m", "id,question,questionimage,type,options,explanation");
    if (need.p.length) batchFetch("pyq_questions", need.p, "p", "id,question,answer,answer_type,options,year,explanation");
    if (jobs.length) Promise.all(jobs).then(() => setContentTick((t) => t + 1));
  };

  useEffect(() => {
    if (!openSession) return;
    const s = sessions.find((x) => x.key === openSession);
    if (s) fetchContentFor(s.attempts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSession, sessions.length]);

  // the flat list of question rows currently on screen (for A/D nav)
  const displayedAttempts = useMemo(() => {
    const out = [];
    visibleSessions.forEach((s) => {
      const rows = rowsOf(s);
      if (rows) out.push(...rows);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSessions, openSession, searchMap, contentTick]);

  const openIdx = openKey ? displayedAttempts.findIndex((a) => a.key === openKey) : -1;

  const openRow = (key) => {
    setOpenKey(key);
    setExplain(null);
    setShowSolution(true);
  };
  const step = (dir) => {
    if (openIdx < 0) return;
    const next = openIdx + dir;
    if (next < 0 || next >= displayedAttempts.length) return;
    openRow(displayedAttempts[next].key);
  };

  // ── keyboard: A/← prev · D/→ next · S solution · Esc close ──
  useEffect(() => {
    if (!openKey) return;
    const onKey = (e) => {
      const t = e.target;
      const tag = (t?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { setOpenKey(null); setExplain(null); }
      else if (k === "a" || k === "arrowleft") { e.preventDefault(); step(-1); }
      else if (k === "d" || k === "arrowright") { e.preventDefault(); step(1); }
      else if (k === "s") { e.preventDefault(); setShowSolution((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey, openIdx, displayedAttempts.length]);

  // ── Samjhao (vault's exact machinery: cache → pool → API) ──
  const cacheIdOf = (a) => {
    if (a.source === "pyq") return -(PYQ_ID_OFFSET + Number(a.qid));
    if (a.source === "concept") return Number(a.qid);
    return -(MOCK_ID_OFFSET + Number(a.qid));
  };
  const askExplain = async (a) => {
    if (!a || explain?.loading || !userData?.email) return;
    setExplain({ loading: true });
    const q = contentOf(a);
    const cacheId = cacheIdOf(a);
    try {
      const { data: cached } = await supabase
        .from("doubt_explanations")
        .select("explanation")
        .eq("question_id", cacheId)
        .maybeSingle();
      if (cached?.explanation) { setExplain({ text: cached.explanation }); return; }
    } catch {}
    if (doubtsToday >= DAILY_DOUBTS) {
      setExplain({ error: `Aaj ke ${DAILY_DOUBTS} Samjhao ho gaye — baaki kal. Ya Doubts tab se mentor se poochho.` });
      return;
    }
    try {
      const opts = Array.isArray(q?.options) ? q.options : null;
      let optsText = "";
      let correctText = "";
      if (a.source === "pyq") {
        // PYQ options: [{text, is_correct}]; answer_based → answer field
        if (opts) {
          optsText = opts.map((o, i) => `${String.fromCharCode(65 + i)}. ${stripHtml(o.text)}`).join(" | ");
          correctText = opts.filter((o) => o?.is_correct).map((o) => stripHtml(o.text)).join(", ");
        }
        if (!correctText) correctText = stripHtml(q?.answer);
      } else if (opts) {
        optsText = opts.map((o, i) => `${String.fromCharCode(65 + i)}. ${stripHtml(o.title)}`).join(" | ");
        correctText = opts.filter((o) => o?.isCorrect).map((o) => stripHtml(o.title)).join(", ");
      } else if (q?.options?.answer !== undefined) {
        correctText = stripHtml(q.options.answer);
      }
      let pickedText = null;
      if (a.result === "wrong") {
        if (opts && a.picked != null && a.source !== "pyq") {
          const idx = Number(a.picked) - 1;
          if (Number.isFinite(idx) && opts[idx]) pickedText = stripHtml(opts[idx].title);
        }
        if (!pickedText && a.typed != null) pickedText = String(a.typed);
      }
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${q?.title || ""} ${stripHtml(q?.question)}`.trim(),
          options: optsText,
          correct: correctText,
          picked: pickedText,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.explanation) {
        setExplain({ error: "Samjhao abhi available nahi — thodi der mein try karo." });
        return;
      }
      setExplain({ text: j.explanation });
      setDoubtsToday((n) => n + 1);
      await supabase.from("doubt_requests").insert({ user: userData.email, question_id: cacheId });
      await supabase.from("doubt_explanations").insert({ question_id: cacheId, explanation: j.explanation });
    } catch {
      setExplain({ error: "Samjhao abhi available nahi — thodi der mein try karo." });
    }
  };

  // ── "I guessed this" → user_lucky_guesses (Part B tie-in) ──
  const sendGuess = async (a) => {
    const vk = vaultKeyOf(a);
    if (vk == null || guessBusy || !userData?.email) return;
    setGuessBusy(true);
    try {
      const { error } = await supabase
        .from("user_lucky_guesses")
        .insert({ user: userData.email, question_id: Number(vk), source: a.source === "pyq" ? "pyq" : "test" });
      // unique violation = already flagged → treat as success
      if (!error || /duplicate|unique/i.test(error.message || "")) {
        setGuessKeys((g) => ({ ...g, [vk]: true }));
      }
    } catch {}
    setGuessBusy(false);
  };

  // ── styles (portal vars only) ──
  const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", flexShrink: 0 };
  const goldTag = { fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-brand-gold)", background: "var(--c-brand-gold-tint)", border: "1px solid rgba(255, 182, 39, 0.35)" /* vault's PYQ-badge tint */, borderRadius: 999, padding: "4px 12px", flexShrink: 0, whiteSpace: "nowrap" };

  // attempt dot — green right / red wrong / neutral skipped-unknown
  const dotOf = (r) => (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        flexShrink: 0,
        background:
          r === "right" ? "var(--c-success)" : r === "wrong" ? "var(--c-danger)" : "var(--c-border-soft, var(--c-border-faint))",
      }}
    />
  );

  const reasonLabel = (id) => REASONS.find((r) => r.id === id)?.label || id;

  const clearAll = () => { setFType(null); setFWhen(null); setSearch(""); setPage(1); setOpenSession(null); setOpenKey(null); };

  // ── detail panel (unchanged machinery) ──
  const renderDetail = (a) => {
    const q = contentOf(a);
    const vk = vaultKeyOf(a);
    const v = vk != null ? vaultMap[vk] : null;
    const flagged = vk != null && guessKeys[vk];
    const isPyq = a.source === "pyq";
    const opts = Array.isArray(q?.options) ? q.options : null;
    const pickedIdx = !isPyq && a.picked != null ? Number(a.picked) - 1 : null;
    const isInput = !isPyq && q && !Array.isArray(q.options) && q?.options?.answer !== undefined;
    const pyqOpts = isPyq && opts ? opts : null; // [{text, is_correct}]

    return (
      <div style={{ margin: "2px 0 16px", padding: "16px 18px 18px", borderRadius: 12, background: "var(--c-surface-muted)", border: "1px solid var(--c-border-faint)" }}>
        {!q && <div style={{ fontSize: 13, color: "var(--c-text-tertiary)" }}>Question load ho raha hai…</div>}
        {q?.missing && <div style={{ fontSize: 13, color: "var(--c-text-tertiary)" }}>Yeh question ab bank mein nahi hai — sirf attempt ka record bacha hai.</div>}
        {q && !q.missing && (
          <>
            {q.questionimage && (
              <img src={q.questionimage} alt="Question" style={{ maxWidth: "100%", maxHeight: "26vh", marginBottom: 12, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
            )}
            {q.title && <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}>{q.title}</div>}
            {q.question && (
              <div
                className="qcontent qforce"
                style={{ fontSize: 14.5, lineHeight: 1.65, wordBreak: "break-word", overflowX: "auto" }}
                dangerouslySetInnerHTML={{ __html: q.question }}
              />
            )}

            {/* MCQ options — student's pick + correct */}
            {(pyqOpts || (opts && !isPyq)) && (
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {(pyqOpts || opts).map((o, i) => {
                  const correct = isPyq ? !!o?.is_correct : !!o?.isCorrect;
                  const chosen = !isPyq && pickedIdx != null && i === pickedIdx;
                  const showCorrect = showSolution && correct;
                  const chosenWrong = chosen && !correct;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", borderRadius: 12, fontSize: 13.5,
                        background: showCorrect ? "var(--c-success-soft)" : chosenWrong ? "var(--c-danger-soft)" : "var(--c-surface)",
                        border: `1px solid ${showCorrect ? "var(--c-success)" : chosenWrong ? "var(--c-danger)" : "var(--c-border-faint)"}`,
                        color: "var(--c-text-primary)",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "var(--c-text-tertiary)" }}>{String.fromCharCode(65 + i)}.</span>
                      <span style={{ flex: 1, minWidth: 0 }} dangerouslySetInnerHTML={{ __html: isPyq ? o?.text || "" : o?.title || "" }} />
                      {(showCorrect || chosen) && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", color: showCorrect ? "var(--c-success)" : "var(--c-danger)" }}>
                          {showCorrect && chosen ? "Correct · tumhara pick" : showCorrect ? "Correct" : "Tumhara pick"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* input/answer-based — student answer vs correct */}
            {(isInput || (isPyq && !pyqOpts)) && (
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {a.typed != null && (
                  <div style={{ padding: "10px 14px", borderRadius: 12, fontSize: 13.5, background: a.result === "right" ? "var(--c-success-soft)" : a.result === "wrong" ? "var(--c-danger-soft)" : "var(--c-surface)", border: `1px solid ${a.result === "right" ? "var(--c-success)" : a.result === "wrong" ? "var(--c-danger)" : "var(--c-border-faint)"}` }}>
                    <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginRight: 8 }}>Tumhara answer:</span>
                    <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{String(a.typed)}</b>
                  </div>
                )}
                {showSolution && (
                  <div style={{ padding: "10px 14px", borderRadius: 12, fontSize: 13.5, background: "var(--c-success-soft)", border: "1px solid var(--c-success)" }}>
                    <span style={{ fontSize: 11.5, color: "var(--c-success)", fontWeight: 600, marginRight: 8 }}>Correct answer:</span>
                    <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {isPyq ? stripHtml(q.answer) || "—" : String(q?.options?.answer ?? "—")}
                    </b>
                  </div>
                )}
              </div>
            )}

            {/* written explanation, behind the S toggle */}
            {showSolution && q.explanation && stripHtml(q.explanation) && !/write your explanation here/i.test(stripHtml(q.explanation)) && (
              <div className="qcontent" style={{ marginTop: 14, borderRadius: 12, padding: "12px 16px", background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }} dangerouslySetInnerHTML={{ __html: q.explanation }} />
            )}
          </>
        )}

        {/* actions row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          {!explain && q && !q.missing && (
            <button
              type="button"
              onClick={() => askExplain(a)}
              className="transition-all hover:-translate-y-0.5"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--c-brand-gold)", border: "1px solid transparent", color: "var(--c-text-on-brand)", borderRadius: 999, padding: "8px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              ✨ Samjhao →
              <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85 }}>
                {Math.max(0, DAILY_DOUBTS - doubtsToday)} aaj bache
              </span>
            </button>
          )}
          {/* vault status — wrong-answer collection is automatic; a
              RIGHT concept/PYQ answer can be self-flagged as a guess.
              Mock/sectional rows have no vault id space → no button. */}
          {v ? (
            <span style={goldTag}>
              {v.streak >= 3 ? "★ Vault — mastered" : "In vault — redo schedule pe hai"}
              {v.last_reason ? ` · ${reasonLabel(v.last_reason).toLowerCase()}` : ""}
            </span>
          ) : flagged ? (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--c-success)" }}>
              In the Vault — it&apos;ll come back for practice.
            </span>
          ) : a.result === "right" && vk != null ? (
            <button
              type="button"
              onClick={() => sendGuess(a)}
              disabled={guessBusy}
              style={{ background: "transparent", border: "1px solid var(--c-border-soft, var(--c-border-faint))", color: "var(--c-text-secondary)", borderRadius: 999, padding: "7px 16px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: guessBusy ? 0.6 : 1 }}
            >
              {guessBusy ? "Sending…" : "I guessed this — send to Vault"}
            </button>
          ) : a.result === "wrong" && vk != null ? (
            <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>Vault ise khud collect kar leta hai</span>
          ) : null}
        </div>
        {explain?.loading && <div style={{ marginTop: 10, fontSize: 13, color: "var(--c-text-tertiary)" }}>Samjha rahe hain…</div>}
        {explain?.error && <div style={{ marginTop: 10, fontSize: 13, color: "var(--c-danger)" }}>{explain.error}</div>}
        {explain?.text && (
          <div style={{ marginTop: 12, borderRadius: 12, padding: "14px 16px", background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.7, color: "var(--c-text-secondary)", whiteSpace: "pre-wrap" }}>
            <b style={{ color: "var(--c-brand-gold)" }}>Samjhao:</b> {explain.text}
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 10.5, fontWeight: 600, color: "var(--c-text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          A / ← pichla · D / → agla · S solution · Esc band
        </div>
      </div>
    );
  };

  // ── session row ──
  const sessionKindLabel = (s) =>
    s.type === "mock" ? "Full mock" : s.type === "sectional" ? "Sectional" : s.type === "concept" ? "Concept test" : null;

  const openResult = (s) => {
    if (s.type === "concept" && s.uid) { router.push(`/test/result/${s.uid}`); return; }
    if ((s.type === "mock" || s.type === "sectional") && s.uid) { router.push(`/mock/result/${s.uid}`); return; }
    // PYQ (and legacy rows without a uid) expand inline
    setOpenSession((k) => (k === s.key ? null : s.key));
    setOpenKey(null);
    setExplain(null);
  };

  const renderSession = (s, idx) => {
    const rows = rowsOf(s);
    const inlineExpandable = s.type === "pyq" || !s.uid;
    const isOpen = openSession === s.key;
    const kind = sessionKindLabel(s);
    const subBits = [dateShortOf(s.at)];
    const dur = durationLabel(s.durationMin);
    subBits.push(dur || `${s.n} ${s.n === 1 ? "question" : "questions"}`);
    return (
      <div key={s.key} style={{ borderTop: idx > 0 ? "1px solid var(--c-border-faint)" : "none" }}>
        <div
          onClick={() => openResult(s)}
          className="td-step td-tile flex items-center gap-3.5 group"
          style={{ padding: "14px 18px", cursor: "pointer" }}
        >
          <TypeTile type={s.type} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.title}
              {kind ? <span style={{ color: "var(--c-text-tertiary)", fontWeight: 500 }}> · {kind}</span> : null}
            </div>
            <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>{subBits.join(" · ")}</div>
          </div>
          <div className="shrink-0" style={{ textAlign: "right", marginLeft: "auto" }}>
            {s.score != null ? (
              <>
                <div className="ds-display" style={{ fontSize: 16, lineHeight: 1.2 }}>{s.score}</div>
                <div style={{ fontSize: 10, color: "var(--c-text-tertiary)" }}>
                  {s.right + s.wrong > 0 ? `${s.right} right · ${s.wrong} wrong` : "score"}
                </div>
              </>
            ) : (
              <>
                <div className="ds-display" style={{ fontSize: 16, lineHeight: 1.2 }}>
                  <span style={{ color: "var(--c-success)" }}>{s.right}</span>
                  <span style={{ color: "var(--c-text-tertiary)" }}> · </span>
                  <span style={{ color: "var(--c-danger)" }}>{s.wrong}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--c-text-tertiary)" }}>right · wrong</div>
              </>
            )}
          </div>
          <span
            className="td-arrow shrink-0"
            style={{
              color: "var(--c-text-tertiary)",
              fontSize: 13,
              transition: "transform 0.18s",
              transform: inlineExpandable && isOpen ? "rotate(90deg)" : "none",
            }}
          >
            {inlineExpandable ? "›" : "→"}
          </span>
        </div>

        {/* inline question rows: manual PYQ expand, or search matches */}
        {rows && rows.length > 0 && (
          <div style={{ background: "var(--c-surface-muted)", borderTop: "1px solid var(--c-border-faint)", padding: "2px 18px 6px 18px" }}>
            {searching && !isOpen && (
              <div style={{ padding: "8px 4px 0", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
                Matching questions
              </div>
            )}
            {rows.map((a) => {
              const q = contentOf(a);
              const isOpenA = a.key === openKey;
              const snippet = q && !q.missing
                ? stripSnippet(q.title, q.question, a.qid)
                : q?.missing
                  ? `Question #${a.qid} (no longer in the bank)`
                  : "…";
              return (
                <div key={a.key} style={{ borderBottom: "1px solid var(--c-border-faint)" }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); isOpenA ? (setOpenKey(null), setExplain(null)) : openRow(a.key); }}
                    className="td-step flex items-center gap-3 group"
                    style={{ padding: "10px 4px", cursor: "pointer" }}
                  >
                    {dotOf(a.result)}
                    <span className="min-w-0 flex-1" style={{ fontSize: 13, fontWeight: isOpenA ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: q ? "var(--c-text-primary)" : "var(--c-text-tertiary)" }}>
                      {snippet}
                    </span>
                    {a.chapter && (
                      <span className="hidden sm:block shrink-0" style={{ fontSize: 11, color: "var(--c-text-tertiary)", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.chapter}
                      </span>
                    )}
                    <span className="td-arrow hidden sm:block" style={{ color: "var(--c-text-tertiary)", flexShrink: 0, fontSize: 13 }}>→</span>
                  </div>
                  {isOpenA && <div style={{ padding: "0 4px" }}>{renderDetail(a)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const footnote = (
    <div style={{ padding: "12px 18px", background: "var(--c-surface-muted)", borderTop: "1px solid var(--c-border-faint)", fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
      Looking for your mistakes? They live in the{" "}
      {goVault ? (
        <button type="button" onClick={goVault} style={{ background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer" }}>
          Mistake Vault
        </button>
      ) : (
        <b style={{ color: "var(--c-brand-gold)" }}>Mistake Vault</b>
      )}{" "}
      — this page is the record of your sittings.
    </div>
  );

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" data-tick={contentTick} style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="td-r1 mt-6">
        <PageHeader
          kicker="Review"
          title="Your test"
          accent="history."
          subtitle="Every sitting, newest first — open any to see its full review."
        />
      </header>

      {warnings.length > 0 && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "var(--c-text-tertiary)", flexShrink: 0 }}>
          Some data hasn&apos;t loaded yet ({warnings.join(", ")}) — everything else is shown.
        </div>
      )}

      {/* search + dropdown pills, one row */}
      {hasAny && (
        // position/zIndex: the dropdown menus must paint ABOVE the list
        // cards that follow in DOM order — without this the open menu
        // hides behind the card (owner-reported bug).
        <div className="td-r2 max-w-[980px]" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0, marginBottom: 6, position: "relative", zIndex: 70 }}>
          <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 10, background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 999, padding: "9px 16px", boxShadow: "var(--c-shadow-xs)" }}>
            <Search size={15} style={{ color: "var(--c-text-tertiary)", flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search a test or a question…"
              style={{ border: "none", outline: "none", background: "none", fontFamily: "inherit", fontSize: 13, color: "var(--c-text-primary)", width: "100%" }}
            />
            {search && (
              <button type="button" onClick={() => { setSearch(""); setPage(1); }} aria-label="Clear search" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", fontSize: 13, padding: 0, fontFamily: "inherit", flexShrink: 0 }}>
                ✕
              </button>
            )}
          </div>
          <PillDropdown
            label="Type"
            value={fType}
            onChange={(v) => { setFType(v); setPage(1); }}
            options={[
              { value: null, label: "All" },
              { value: "concept", label: "Concept tests" },
              { value: "mock", label: "Mocks" },
              { value: "sectional", label: "Sectionals" },
              { value: "pyq", label: "Past papers" },
            ]}
          />
          <PillDropdown
            label="Time"
            value={fWhen}
            onChange={(v) => { setFWhen(v); setPage(1); }}
            options={[
              { value: 30, label: "30 days" },
              { value: 90, label: "90 days" },
              { value: null, label: "All" },
            ]}
          />
        </div>
      )}

      {/* loading / empty states */}
      {loading && (
        <div className="max-w-[980px] mt-3" style={{ ...card, padding: "18px 22px", fontSize: 13, color: "var(--c-text-tertiary)" }}>
          Loading your sittings…
        </div>
      )}

      {!loading && !hasAny && (
        <div className="max-w-[980px] mt-3 text-center" style={{ ...card, padding: "44px 20px 46px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", margin: "0 auto 14px", background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)" }}>
            <Ic size={21}>
              <path d="M12 2l9 5-9 5-9-5 9-5z" />
              <path d="M3 12l9 5 9-5" />
              <path d="M3 17l9 5 9-5" />
            </Ic>
          </div>
          <div className="ds-display" style={{ fontSize: 18, color: "var(--c-text-primary)" }}>Take your first test — every sitting collects here.</div>
          <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", marginTop: 6, marginBottom: 18 }}>
            Every sitting — concept, mock, past paper — lands in this list on its own.
          </div>
          {goPractice && (
            <button type="button" onClick={goPractice} className="transition-all hover:-translate-y-0.5" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--c-brand-gold)", color: "var(--c-text-on-brand)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 24px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Open practice <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}

      {!loading && hasAny && visibleSessions.length === 0 && (
        <div className="max-w-[980px] mt-3 text-center" style={{ ...card, padding: "44px 20px 46px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", margin: "0 auto 14px", background: "var(--c-surface-muted)", border: "1px solid var(--c-border-faint)", color: "var(--c-text-tertiary)" }}>
            <Ic size={21}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </Ic>
          </div>
          <div className="ds-display" style={{ fontSize: 18, color: "var(--c-text-primary)" }}>Nothing matches.</div>
          <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", marginTop: 6, marginBottom: 18 }}>
            Try a different word — or clear the search and filters.
          </div>
          <button type="button" onClick={clearAll} className="transition-all hover:-translate-y-0.5" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--c-brand-gold)", color: "var(--c-text-on-brand)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 24px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Clear everything
          </button>
        </div>
      )}

      {/* month-grouped session cards */}
      <div className="td-r4 max-w-[980px]">
        {monthGroups.map((g, gi) => (
          <div key={g.key}>
            <div style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600, margin: "18px 2px 10px" }}>
              {g.label}
            </div>
            <div style={{ ...card, overflow: "hidden" }}>
              {g.items.map((s, i) => renderSession(s, i))}
              {gi === 0 && footnote}
            </div>
          </div>
        ))}
      </div>

      {!loading && totalMatches > visibleSessions.length && (
        <div className="max-w-[980px] text-center" style={{ padding: "16px 0 0" }}>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="transition-all hover:-translate-y-0.5"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid var(--c-border-soft)", borderRadius: 999, padding: "9px 22px", fontSize: 12.5, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}
          >
            Show more — {Math.min(SESSIONS_PAGE, totalMatches - visibleSessions.length)} older ({visibleSessions.length} / {totalMatches})
          </button>
        </div>
      )}

      {!loading && hasAny && (
        <div className="max-w-[980px] mb-12" style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", marginTop: 16 }}>
          Searching a question? Type it — matching sittings expand to show the matching questions inside, with the same detail view (options, Samjhao) on tap.
        </div>
      )}
    </div>
  );
}
