// ============================================================
// Mistake Vault v2 — spaced-repetition redo of wrong answers.
//
// Ladder: due 3 days after a miss → clean redo → 7 days → 21 →
// third clean redo = MASTERED. Wrong redo resets to day 3.
//
// v2 additions (owner-approved structure):
//  · DAILY_CAP: the vault only ASKS for 12/day ("Today's redo —
//    12 · ~9 min"), prioritized: concept-gaps → oldest due.
//    Backlogs drain automatically. Chapter chips & row clicks
//    are student-initiated and bypass the cap.
//  · Why-tags: after each reveal, one-tap reason chips (silly /
//    concept / calculation / guessed) stored on the redo row.
//  · Insight line: dominant mistake pattern on the vault home.
//  · Chapter chips: redo all of one chapter on demand.
//  · Source test label in the session header.
//
// v2 home restructure (Aug 2026, approved preview-vault-v2):
//  · Hero card "Today's redo" (progress ring + one line + Start)
//    replaces the old stat block + CTA row.
//  · Slim stat line: in the vault · chapters · lucky guesses ·
//    mastered. "In the vault" counts ALL items incl. mastered so
//    it equals the sum of the chapter-row counts (preview math).
//  · The question list is now CHAPTER ROWS, weakest first —
//    expand a chapter to see its questions inside. See chapterAgg
//    for the mastered/improving mapping.
//
// Pure logic exported: vaultState, dueLabel, prioritize,
// minutesFor, insightFor, chapterAgg, returnsLabel, REASON_PHRASE,
// REASONS, DAILY_CAP, LADDER_DAYS.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import PortalTour, { useFirstVisitTour } from "./PortalTour";
import PageHeader from "./PageHeader";
import PillDropdown from "./ui/PillDropdown";

// Lucky-guess accent — the approved preview's violet. No portal var
// exists for violet; same rgba approach as Dashboard's D2 cards.
const VIOLET = "rgba(151,113,224,1)"; /* violet — approved-preview accent, no portal var */
const VIOLET_TINT = "rgba(151,113,224,0.14)"; /* violet tint — reads on light + dark */
const VIOLET_BORDER = "rgba(151,113,224,0.35)"; /* violet border — same rgba family */

// First-visit mini-tour steps. The redo-button step falls back to
// the list card when nothing is due (querySelector returns the
// first match in document order).
const VAULT_TOUR_STEPS = [
  {
    target: "[data-tour='vault-redo'], [data-tour='vault-list']",
    title: "Roz ka kaam",
    desc: "Bas is Start se shuru karo — vault khud prioritize karta hai.",
  },
  {
    target: "[data-tour='vault-stats']",
    title: "Ek line ka scoreboard",
    desc: "Vault mein kitne, kitne lucky guesses, kitne hamesha ke liye master.",
  },
  {
    target: "[data-tour='vault-chapters']",
    title: "Chapter kholo",
    desc: "Weakest chapter sabse upar. Row kholo — us chapter ke saare questions andar.",
  },
];

export const LADDER_DAYS = [3, 7, 21];
export const SESSION_SIZE = 10;
export const MASTER_STREAK = 3;
export const XP_PER_SESSION = 30;
export const DAILY_CAP = 12;
export const DAILY_DOUBTS = 10;

export const REASONS = [
  { id: "silly", label: "Silly mistake" },
  { id: "concept", label: "Concept gap" },
  { id: "calculation", label: "Calculation error" },
  { id: "guessed", label: "Guessed" },
];

// Pure: item {streak, last_wrong_at, last_redo_at} → state.
export function vaultState(item, now = new Date()) {
  const streak = Number(item.streak || 0);
  if (streak >= MASTER_STREAK) return { stage: MASTER_STREAK, mastered: true, dueNow: false, due: null };
  const lastWrong = item.last_wrong_at ? new Date(item.last_wrong_at) : null;
  const lastRedo = item.last_redo_at ? new Date(item.last_redo_at) : null;
  const anchor = !lastRedo || (lastWrong && lastWrong > lastRedo) ? lastWrong : lastRedo;
  const waitDays = LADDER_DAYS[streak] ?? LADDER_DAYS[0];
  const due = anchor ? new Date(anchor.getTime() + waitDays * 86400000) : now;
  return { stage: streak, mastered: false, dueNow: due <= now, due };
}

export function dueLabel(state, now = new Date()) {
  if (state.mastered) return "mastered";
  if (state.dueNow) return "due today";
  const days = Math.max(1, Math.ceil((state.due.getTime() - now.getTime()) / 86400000));
  return `due in ${days} ${days === 1 ? "day" : "days"}`;
}

// Pure: priority for the daily ask — tagged concept gaps first,
// then oldest due. items must carry .st (vaultState).
export function prioritize(dueItems) {
  return dueItems.slice().sort((a, b) => {
    const ac = a.last_reason === "concept" ? 0 : 1;
    const bc = b.last_reason === "concept" ? 0 : 1;
    return ac - bc || a.st.due - b.st.due;
  });
}

// Pure: rough session length. ~45 seconds a question.
export function minutesFor(n) {
  return Math.max(1, Math.ceil((n * 45) / 60));
}

// Pure: dominant mistake pattern across tagged items.
export function insightFor(items) {
  const tagged = (items || []).filter((it) => it.last_reason);
  if (tagged.length < 3) return null;
  const counts = {};
  tagged.forEach((it) => { counts[it.last_reason] = (counts[it.last_reason] || 0) + 1; });
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const pct = Math.round((100 * n) / tagged.length);
  if (pct < 40) return null;
  const msgs = {
    silly: `${pct}% of your tagged mistakes are silly mistakes — accuracy, not knowledge, is your gap. Slow down on the easy ones.`,
    concept: `${pct}% of your tagged mistakes are concept gaps — the plan will keep pushing those chapters. Revisit theory before redoing.`,
    calculation: `${pct}% of your tagged mistakes are calculation errors — practice rough-work discipline, not more theory.`,
    guessed: `${pct}% of your tagged mistakes were guesses — in IPMAT, a skip beats a guess. Train that instinct in Skip or Solve.`,
  };
  return msgs[top] || null;
}

// Bucket categories ("Topic Wise", "Mixed Tests"…) are collections,
// not chapters — label those mistakes by their source test instead.
export const BUCKET = /topic\s*wise|mixed\s*test|full\s*mock|pyq/i;
export function displayChapter(it) {
  return BUCKET.test(String(it.chapter || ""))
    ? (it.test_title || "Mixed practice")
    : (it.chapter || "Other");
}

// Pure: case-insensitive chapter key ("NUMBER SYSTEM" and
// "Number System" are the same chapter).
export function chapterKey(it) {
  return displayChapter(it).trim().toLowerCase();
}

// Pure: group items into chapters, merged case-insensitively.
// Label = the casing used by the most mistakes. Sorted by count.
export function chapterGroups(items) {
  const map = {};
  (items || []).forEach((it) => {
    const label = displayChapter(it);
    const key = label.trim().toLowerCase();
    if (!map[key]) map[key] = { key, count: 0, variants: {} };
    map[key].count += 1;
    map[key].variants[label] = (map[key].variants[label] || 0) + 1;
  });
  return Object.values(map)
    .map((g) => ({
      key: g.key,
      count: g.count,
      label: Object.entries(g.variants).sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.count - a.count);
}

// v2 chapter-row list: how a reason reads on the chapter sub-line
// ("mostly concept gaps" — the approved preview's phrasing).
export const REASON_PHRASE = {
  silly: "careless slips",
  concept: "concept gaps",
  calculation: "calculation errors",
  guessed: "guesses",
};

// Pure: friendly return tag for a non-due item — "Returns Fri" when
// it's within the week, "Returns 3 Sep" otherwise (preview tags).
export function returnsLabel(st, now = new Date()) {
  if (st.mastered) return "Mastered";
  if (st.dueNow) return "Due today";
  const d = st.due instanceof Date ? st.due : new Date(st.due);
  if (isNaN(d.getTime())) return "Scheduled";
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days <= 6) return `Returns ${d.toLocaleDateString("en-US", { weekday: "short" })}`;
  return `Returns ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
}

// Pure: aggregate vault items (must carry .st = vaultState) into
// chapter rows for the "By chapter — weakest first" list.
// The mapping, documented:
//  · total     = every item filed under the chapter INCLUDING the
//    mastered ones — the green bar fraction is mastered/total, so
//    mastered items must stay in the denominator (preview math:
//    "23 in vault · 3 mastered" → 13% green).
//  · mastered  = st.mastered (streak >= MASTER_STREAK).
//  · improving = NOT mastered AND streak >= 1 — at least one clean
//    redo since the last wrong. The `streak` field every item
//    carries is exactly "consecutive clean redos" (a wrong redo
//    resets it to 0), so gold = proven once but not yet through
//    the 3-7-21 ladder.
//  · due       = active items with st.dueNow.
//  · dominant  = mode of last_reason among tagged items; null when
//    untagged items are the majority (tagged ≤ half) — then the
//    sub-line shows just "N in vault".
// Sort: weakest first = lowest mastered fraction, most due first
// as the tiebreak, then biggest chapter.
export function chapterAgg(itemsWithState) {
  const map = {};
  (itemsWithState || []).forEach((it) => {
    const label = displayChapter(it);
    const key = label.trim().toLowerCase();
    if (!map[key]) map[key] = { key, variants: {}, total: 0, mastered: 0, improving: 0, due: 0, reasons: {}, tagged: 0, items: [] };
    const g = map[key];
    g.total += 1;
    g.variants[label] = (g.variants[label] || 0) + 1;
    g.items.push(it);
    if (it.st?.mastered) g.mastered += 1;
    else {
      if (Number(it.streak || 0) >= 1) g.improving += 1;
      if (it.st?.dueNow) g.due += 1;
    }
    if (it.last_reason) {
      g.tagged += 1;
      g.reasons[it.last_reason] = (g.reasons[it.last_reason] || 0) + 1;
    }
  });
  return Object.values(map)
    .map((g) => ({
      key: g.key,
      label: Object.entries(g.variants).sort((a, b) => b[1] - a[1])[0][0],
      total: g.total,
      mastered: g.mastered,
      improving: g.improving,
      due: g.due,
      dominant: g.tagged * 2 > g.total ? Object.entries(g.reasons).sort((a, b) => b[1] - a[1])[0][0] : null,
      masteredFrac: g.total > 0 ? g.mastered / g.total : 0,
      improvingFrac: g.total > 0 ? g.improving / g.total : 0,
      items: g.items,
    }))
    .sort((a, b) => a.masteredFrac - b.masteredFrac || b.due - a.due || b.total - a.total);
}

// Pure: when several rows share the same opening (question sets with
// a common instruction preamble, e.g. Narration), show each row by
// its distinct tail instead so the list isn't 8 identical lines.
export function distinctSnippets(texts) {
  const prefixOf = (s) => s.slice(0, 60);
  const counts = {};
  (texts || []).forEach((t) => { counts[prefixOf(t)] = (counts[prefixOf(t)] || 0) + 1; });
  return (texts || []).map((t) =>
    counts[prefixOf(t)] > 1 && t.length > 70 ? "…" + t.slice(-90).trimStart() : t
  );
}

// ── PYQ wrongs — third vault source ─────────────────────────────
// Vault id space: -(PYQ_ID_OFFSET + pyq_questions.id). user_mistakes
// ids stay < 1e6, so this never collides with portal-test wrongs
// (positive questions.id) or student-added mistakes (-1 … -999999).
export const PYQ_ID_OFFSET = 1000000;

// PYQ MCQs store options as JSON [{text, is_correct}] (the same shape
// PYQManager's reader renders/checks). Map into the vault's
// [{title, isCorrect}] shape. Returns null when the format isn't
// confidently mappable → caller falls back to the self-graded flow.
export function mapPyqOptions(raw) {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr) || arr.length < 2) return null;
    if (!arr.some((o) => o && o.is_correct)) return null;
    if (!arr.every((o) => o && typeof o.text === "string")) return null;
    return arr.map((o) => ({ title: o.text, isCorrect: !!o.is_correct }));
  } catch {
    return null;
  }
}

// PYQ answers can be rich HTML — flatten to plain text for the
// self-grade "Correct answer:" line (rendered as text, not HTML).
export function pyqPlainText(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// One get_my_pyq_mistakes row → vault item shape.
export function mapPyqRow(m) {
  const opts = m.answer_type === "mcq" ? mapPyqOptions(m.options) : null;
  return {
    question_id: -(PYQ_ID_OFFSET + Number(m.id)),
    is_pyq: true,
    // no mappable options → reuse the existing self-graded UI path
    is_own: !opts,
    title: null,
    question: m.question,
    questionimage: null,
    options: opts,
    answer: pyqPlainText(m.answer) || null,
    chapter: m.topic || "PYQ",
    test_title: "IPMAT PYQ" + (m.year ? ` ${m.year}` : ""),
    wrong_count: 1,
    last_wrong_at: m.last_wrong_at,
    streak: m.streak,
    last_redo_at: m.last_redo_at,
    last_reason: m.last_reason,
  };
}

export default function MistakeVault({ userData }) {
  const [items, setItems] = useState(null);
  const [redosToday, setRedosToday] = useState(0);
  const [phase, setPhase] = useState("home"); // home | session | result
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [flash, setFlash] = useState(null);
  const [moves, setMoves] = useState([]);
  const [openChapter, setOpenChapter] = useState(null); // chapter key expanded in the list
  const [sourceFilter, setSourceFilter] = useState(null); // null|test|pyq|own
  const [lastCorrect, setLastCorrect] = useState(null);
  const [showHow, setShowHow] = useState(false);
  const [ownItems, setOwnItems] = useState(null);
  const [pyqItems, setPyqItems] = useState(null); // PYQ wrongs — null until fetched
  const [guessItems, setGuessItems] = useState(null); // lucky guesses — null until fetched
  const [showGuessBanner, setShowGuessBanner] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addQ, setAddQ] = useState("");
  const [addChapter, setAddChapter] = useState("");
  const [addAnswer, setAddAnswer] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [explain, setExplain] = useState(null); // null | {loading} | {text} | {error}
  const [doubtsToday, setDoubtsToday] = useState(0);
  const lockRef = useRef(false);
  const movesRef = useRef([]);
  const pendingRef = useRef(null); // { question_id, correct } awaiting reason
  // auto mini-tour on first visit only — the existing "How it works?"
  // explainer card stays untouched as the manual replay.
  const [tourRun, setTourRun] = useFirstVisitTour("tour_vault_v1");

  const load = () => {
    if (!userData?.email) return;
    supabase.rpc("get_my_mistakes", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setItems(data.filter((it) => Array.isArray(it.options) && it.options.length >= 2 && (it.title || it.question)));
      } else setItems([]);
    });
    // student-added mistakes (self-graded, negative ids in mistake_redos)
    supabase.rpc("get_my_own_mistakes", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setOwnItems(
          data.map((m) => ({
            question_id: -m.id,
            is_own: true,
            title: null,
            question: m.question,
            questionimage: null,
            options: null,
            answer: m.answer,
            chapter: m.chapter || "Other",
            test_title: "Added by you",
            wrong_count: 1,
            last_wrong_at: m.created_at,
            streak: m.streak,
            last_redo_at: m.last_redo_at,
            last_reason: m.last_reason,
          }))
        );
      } else setOwnItems([]);
    });
    // PYQ wrongs (latest pyq_attempts row = 'wrong') — third source,
    // ids live at -(1000000 + pyq id) in mistake_redos.
    supabase.rpc("get_my_pyq_mistakes", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) setPyqItems(data.map(mapPyqRow));
      else setPyqItems([]);
    });
    // Lucky guesses (user_lucky_guesses) — RIGHT answers the student
    // flagged as "guessed". They never come from get_my_mistakes, so
    // fetch their content directly: positive ids → questions (concept),
    // < -1e6 → pyq_questions (the vault's PYQ offset space). Ladder
    // state is read from the student's own mistake_redos rows — the
    // same table the redo session already writes to, keyed by
    // question_id, so redos Just Work for these items.
    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from("user_lucky_guesses")
          .select("question_id, created_at")
          .eq("user", userData.email);
        if (error) throw error;
        const ids = [...new Set((rows || []).map((r) => Number(r.question_id)).filter((n) => Number.isFinite(n)))];
        if (!ids.length) { setGuessItems([]); return; }
        const flaggedAt = {};
        (rows || []).forEach((r) => { flaggedAt[String(r.question_id)] = r.created_at; });
        const conceptIds = ids.filter((n) => n > 0);
        const pyqIds = ids.filter((n) => n < -PYQ_ID_OFFSET).map((n) => -n - PYQ_ID_OFFSET);
        const [qRes, pRes, rRes] = await Promise.all([
          conceptIds.length
            ? supabase.from("questions").select("id,title,question,questionimage,options").in("id", conceptIds)
            : Promise.resolve({ data: [] }),
          pyqIds.length
            ? supabase.from("pyq_questions").select("id,question,answer,answer_type,options,year").in("id", pyqIds)
            : Promise.resolve({ data: [] }),
          supabase
            .from("mistake_redos")
            .select("question_id, correct, reason, created_at")
            .eq("user", userData.email)
            .in("question_id", ids)
            .order("created_at", { ascending: true }),
        ]);
        // ladder from redo history: streak = consecutive corrects since
        // the last wrong (same math the vault RPCs do server-side)
        const ladder = {};
        (rRes.data || []).forEach((r) => {
          const k = String(r.question_id);
          if (!ladder[k]) ladder[k] = { streak: 0, last_redo_at: null, last_reason: null };
          ladder[k].streak = r.correct ? ladder[k].streak + 1 : 0;
          ladder[k].last_redo_at = r.created_at;
          if (r.reason) ladder[k].last_reason = r.reason;
        });
        const out = [];
        (qRes.data || []).forEach((qq) => {
          // MCQ needs mappable options; SA ({answer}) reuses the
          // self-graded redo path (is_own UI), like student-added rows
          const opts = Array.isArray(qq.options) && qq.options.length >= 2 && qq.options.some((o) => o?.isCorrect) ? qq.options : null;
          const k = String(qq.id);
          const l = ladder[k] || {};
          out.push({
            question_id: qq.id,
            is_guess: true,
            is_own: !opts,
            title: qq.title || null,
            question: qq.question,
            questionimage: qq.questionimage || null,
            options: opts,
            answer: !opts && qq.options?.answer !== undefined ? String(qq.options.answer) : null,
            chapter: null, // content-only fetch has no tree → files under "Other"
            test_title: "Lucky guess",
            wrong_count: 1,
            last_wrong_at: flaggedAt[k] || null, // flag date anchors the day-3 ladder
            streak: Number(l.streak || 0),
            last_redo_at: l.last_redo_at || null,
            last_reason: l.last_reason || null,
          });
        });
        (pRes.data || []).forEach((qq) => {
          const k = String(-(PYQ_ID_OFFSET + Number(qq.id)));
          const l = ladder[k] || {};
          out.push({
            ...mapPyqRow({
              ...qq,
              topic: null,
              last_wrong_at: flaggedAt[k] || null,
              streak: Number(l.streak || 0),
              last_redo_at: l.last_redo_at || null,
              last_reason: l.last_reason || null,
            }),
            is_guess: true,
          });
        });
        setGuessItems(out);
      } catch {
        setGuessItems([]); // table not shipped yet → vault works without it
      }
    })();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    supabase
      .from("mistake_redos")
      .select("id", { count: "exact", head: true })
      .eq("user", userData.email)
      .gte("created_at", startOfToday.toISOString())
      .then(({ count }) => setRedosToday(count || 0));
    supabase
      .from("doubt_requests")
      .select("id", { count: "exact", head: true })
      .eq("user", userData.email)
      .gte("created_at", startOfToday.toISOString())
      .then(({ count }) => setDoubtsToday(count || 0));
  };
  useEffect(load, [userData?.email]);

  // one-time violet intro banner for the lucky-guess feature —
  // read in an effect (not render) so SSR/CSR markup match.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem("vault_lucky_banner_v1")) setShowGuessBanner(true);
    } catch {}
  }, []);
  const dismissGuessBanner = () => {
    setShowGuessBanner(false);
    try { window.localStorage.setItem("vault_lucky_banner_v1", "1"); } catch {}
  };

  // explainer card is opt-in only — opens from the "How it works?"
  // link in the header, closes on "Got it". Never auto-shows.

  const now = new Date();
  const mistakes = [
    ...(Array.isArray(items) ? items : []),
    ...(Array.isArray(ownItems) ? ownItems : []),
    ...(Array.isArray(pyqItems) ? pyqItems : []),
  ];
  // Dedupe: a lucky guess shares its question_id space with real
  // vault mistakes (positive questions.id / PYQ offset). If the
  // student ALSO got it wrong for real, the vault-mistake copy wins
  // and the guess copy is dropped.
  const mistakeIds = new Set(mistakes.map((it) => it.question_id));
  const guessesMerged = (Array.isArray(guessItems) ? guessItems : []).filter(
    (it) => !mistakeIds.has(it.question_id)
  );
  const withState = [...mistakes, ...guessesMerged].map((it) => ({ ...it, st: vaultState(it, now) }));
  const active = withState.filter((it) => !it.st.mastered);
  const mastered = withState.filter((it) => it.st.mastered);
  const due = prioritize(active.filter((it) => it.st.dueNow));
  const upcoming = active.filter((it) => !it.st.dueNow).sort((a, b) => a.st.due - b.st.due);
  const luckyCount = active.filter((it) => it.is_guess).length;

  // daily ask: capped by what's already been redone today
  const budget = Math.max(0, DAILY_CAP - redosToday);
  const todaysAsk = due.slice(0, budget);

  // chapters for the add-form chips — merged case-insensitively
  const chapters = chapterGroups(active);

  // real vault sources: portal tests (incl. lucky guesses), PYQ,
  // student-added. is_pyq wins (PYQ self-grade rows also carry is_own).
  const sourceOf = (it) =>
    it.is_pyq ? "pyq" : it.is_guess ? "test" : it.is_own ? "own" : "test";

  // v2 chapter rows: aggregate over ALL items incl. mastered (see
  // chapterAgg header for the mapping), source-filtered for the list.
  const sourced = sourceFilter ? withState.filter((it) => sourceOf(it) === sourceFilter) : withState;
  const chapterRows = chapterAgg(sourced);
  const chapterRowsAll = chapterAgg(withState); // stat line ignores the filter

  const startSession = (pick) => {
    const session = (pick && pick.length ? pick : todaysAsk).slice(0, SESSION_SIZE);
    if (!session.length) return;
    setQueue(session);
    setQi(0);
    setPicked(null);
    setReveal(false);
    setFlash(null);
    setLastCorrect(null);
    movesRef.current = [];
    setMoves([]);
    setExplain(null);
    lockRef.current = false;
    pendingRef.current = null;
    setPhase("session");
  };

  const q = queue[qi];

  const handleAnswer = (idx) => {
    if (reveal || lockRef.current || !q) return;
    lockRef.current = true;
    const correct = !!q.options[idx]?.isCorrect;
    setPicked(idx);
    setReveal(true);
    setLastCorrect(correct);
    const newStreak = correct ? Number(q.streak || 0) + 1 : 0;
    const masteredNow = correct && newStreak >= MASTER_STREAK;
    movesRef.current.push({ q, correct, masteredNow, newStreak });
    pendingRef.current = { question_id: q.question_id, correct };
    setFlash(
      correct
        ? masteredNow
          ? { text: "Third clean redo — MASTERED. It leaves the vault forever.", tone: "var(--c-brand-gold)" }
          : { text: `Right — climbs the ladder. Next redo in ${LADDER_DAYS[newStreak]} days.`, tone: "var(--c-success)" }
        : { text: "Still bites. Back to day 3 — you'll see it again soon.", tone: "var(--c-danger)" }
    );
  };

  // self-graded verdict for student-added mistakes (no options)
  const handleSelfGrade = (correct) => {
    if (reveal || lockRef.current || !q) return;
    lockRef.current = true;
    setReveal(true);
    setLastCorrect(correct);
    const newStreak = correct ? Number(q.streak || 0) + 1 : 0;
    const masteredNow = correct && newStreak >= MASTER_STREAK;
    movesRef.current.push({ q, correct, masteredNow, newStreak });
    pendingRef.current = { question_id: q.question_id, correct };
    setFlash(
      correct
        ? masteredNow
          ? { text: "Third clean redo — MASTERED. It leaves the vault forever.", tone: "var(--c-brand-gold)" }
          : { text: `Right — climbs the ladder. Next redo in ${LADDER_DAYS[newStreak]} days.`, tone: "var(--c-success)" }
        : { text: "Still bites. Back to day 3 — you'll see it again soon.", tone: "var(--c-danger)" }
    );
  };

  // save a student-added mistake (AWAITED insert, optimistic prepend)
  const saveOwn = async () => {
    const qText = addQ.trim();
    if (!qText || addSaving || !userData?.email) return;
    setAddSaving(true);
    const { data, error } = await supabase
      .from("user_mistakes")
      .insert({ user: userData.email, question: qText, chapter: addChapter.trim() || null, answer: addAnswer.trim() || null })
      .select()
      .single();
    setAddSaving(false);
    if (!error && data) {
      setOwnItems((prev) => [
        { question_id: -data.id, is_own: true, title: null, question: data.question, questionimage: null, options: null, answer: data.answer, chapter: data.chapter || "Other", test_title: "Added by you", wrong_count: 1, last_wrong_at: data.created_at, streak: 0, last_redo_at: null, last_reason: null },
        ...(prev || []),
      ]);
      setAddQ("");
      setAddChapter("");
      setAddAnswer("");
      setShowAdd(false);
    }
  };

  // AI Doubts: cached-first Hinglish explanation for the current
  // question. Gemini is called at most once per question ever
  // (shared doubt_explanations cache); students get DAILY_DOUBTS/day.
  const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const askExplain = async () => {
    if (!q || explain?.loading || !userData?.email) return;
    setExplain({ loading: true });
    const { data: cached } = await supabase
      .from("doubt_explanations")
      .select("explanation")
      .eq("question_id", q.question_id)
      .maybeSingle();
    if (cached?.explanation) {
      setExplain({ text: cached.explanation });
      return;
    }
    if (doubtsToday >= DAILY_DOUBTS) {
      setExplain({ error: `Aaj ke ${DAILY_DOUBTS} Samjhao ho gaye — baaki kal. Ya Doubts tab se mentor se poochho.` });
      return;
    }
    try {
      const optsText = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}. ${stripHtml(o.title)}`).join(" | ");
      const correctText = (q.options || []).filter((o) => o.isCorrect).map((o) => stripHtml(o.title)).join(", ");
      const pickedText = !lastCorrect && picked != null && q.options?.[picked] ? stripHtml(q.options[picked].title) : null;
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${q.title || ""} ${stripHtml(q.question)}`.trim(),
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
      await supabase.from("doubt_requests").insert({ user: userData.email, question_id: q.question_id });
      await supabase.from("doubt_explanations").insert({ question_id: q.question_id, explanation: j.explanation });
    } catch (e) {
      setExplain({ error: "Samjhao abhi available nahi — thodi der mein try karo." });
    }
  };

  // reason chip (or skip) → persist redo (AWAITED — supabase builders
  // only execute when awaited), optimistically update local state,
  // then advance.
  const commitAndAdvance = async (reason) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending && userData?.email) {
      let { error } = await supabase.from("mistake_redos").insert({
        user: userData.email,
        question_id: pending.question_id,
        correct: pending.correct,
        reason: reason || null,
      });
      if (error && /reason/i.test(error.message || "")) {
        // graceful fallback if the v2 column isn't there yet
        ({ error } = await supabase.from("mistake_redos").insert({
          user: userData.email,
          question_id: pending.question_id,
          correct: pending.correct,
        }));
      }
      if (!error) {
        // optimistic: move the ladder locally so the vault updates
        // the moment the student returns — refetch reconciles later.
        const bump = (prev) =>
          !Array.isArray(prev)
            ? prev // keep null (not fetched) states untouched
            : prev.map((it) =>
                it.question_id === pending.question_id
                  ? {
                      ...it,
                      streak: pending.correct ? Number(it.streak || 0) + 1 : 0,
                      last_redo_at: new Date().toISOString(),
                      last_reason: reason || it.last_reason,
                    }
                  : it
              );
        setItems(bump);
        setOwnItems(bump);
        setPyqItems(bump);
        setGuessItems(bump); // lucky guesses climb the same ladder
      }
    }
    setPicked(null);
    setReveal(false);
    setFlash(null);
    setLastCorrect(null);
    setExplain(null);
    lockRef.current = false;
    if (qi + 1 >= queue.length) {
      const right = movesRef.current.filter((m) => m.correct).length;
      if (userData?.email) {
        await supabase.from("trainer_runs").insert({
          user: userData.email,
          trainer: "mistake-redo",
          score: right,
          details: { total: queue.length, mastered: movesRef.current.filter((m) => m.masteredNow).length },
        });
      }
      setMoves(movesRef.current);
      setRedosToday((n) => n + queue.length);
      setPhase("result");
      load();
    } else {
      setQi(qi + 1);
    }
  };

  // ── styles ──
  const grad = { fontFamily: "var(--font-display, 'Fraunces', serif)", fontWeight: 500, letterSpacing: "-0.02em", background: "var(--c-stat-grad)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" };
  const sectLabel = { fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" };
  const sectMeta = { fontSize: 11.5, color: "var(--c-text-tertiary)" };
  const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, padding: "8px 22px", boxShadow: "var(--c-shadow-xs)" };
  const goldBtn = { background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 };
  const chipBtn = (on) => ({
    background: on ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
    border: `1px solid ${on ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`,
    color: on ? "var(--c-brand-gold)" : "var(--c-text-secondary)",
    borderRadius: 999, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  });

  const Ladder = ({ stage }) => (
    <span className="flex gap-1 items-center shrink-0" style={{ width: 62 }}>
      {[0, 1, 2].map((i) => (
        <i key={i} style={{ width: 16, height: 5, borderRadius: 5, background: i < stage ? "var(--c-mock-banner-btn-bg)" : "var(--c-surface-sunken, var(--c-surface-muted))" }} />
      ))}
    </span>
  );

  const snippet = (it) => {
    const raw = `${it.title || ""} ${String(it.question || "")}`
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&[a-z]+;|&#\d+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\d+\.\s*/, "");
    return raw || `Question #${it.question_id}`;
  };
  const reasonLabel = (id) => REASONS.find((r) => r.id === id)?.label?.toLowerCase();
  const insight = insightFor(withState);

  return (
    <div className="w-full flex flex-col pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {/* ══ HOME ══ */}
      {phase === "home" && (
        <>
          <header className="mt-6">
            {/* D1 quiet chrome — one compact header, actions kept on the right */}
            <PageHeader
              kicker="Review"
              title="Mistake"
              accent="Vault."
              subtitle="Every missed question, collected automatically — redo on schedule and it leaves forever."
              right={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 18 }}>
                  <button
                    type="button"
                    onClick={() => setShowAdd((v) => !v)}
                    style={{ background: "transparent", border: "1px solid rgba(255, 182, 39, 0.4)", borderRadius: 999, padding: "8px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--c-brand-gold)" }}
                  >
                    + Add a mistake
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHow((v) => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--c-text-tertiary)", textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}
                  >
                    How it works?
                  </button>
                </span>
              }
            />
          </header>

          {/* first-visit explainer, reopenable via the header link.
              Inline styles ONLY (no utility classes) — must survive
              stale CSS caches and extension cosmetic filters. */}
          {showHow && (
            <div style={{ display: "block", flexShrink: 0, maxWidth: 860, marginTop: 20, position: "relative", overflow: "hidden", background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "22px 24px" }}>
              <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--c-stat-grad)" }} />
              <div style={{ display: "block", fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--c-text-primary)" }}>⚡ How the vault works</div>
              {[
                ["1", "Galti pakdi gayi.", "Every question you get wrong in any test lands here automatically. Nothing to add, nothing to maintain."],
                ["2", "Beat it 3 times.", "Redo it correctly after 3 days → again after 7 → again after 21. Three clean wins and it's mastered forever — it leaves the vault."],
                ["3", "No cheating the gap.", "A wrong redo resets the ladder to day 3. Locked questions unlock only when due — the waiting is what makes it stick."],
              ].map(([n, b, rest]) => (
                <div key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 22, height: 22, borderRadius: 999, background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", color: "var(--c-brand-gold)", fontSize: 12, fontWeight: 700, marginTop: 1 }}>{n}</span>
                  <p style={{ display: "block", margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--c-text-secondary)" }}>
                    <b style={{ color: "var(--c-text-primary)" }}>{b}</b> {rest}
                  </p>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "14px 0 4px", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {["Miss", "→", "3 days", "→", "7 days", "→", "21 days", "→", "Mastered ✓"].map((s, i) =>
                  s === "→" ? (
                    <span key={i} style={{ color: "var(--c-text-tertiary)" }}>→</span>
                  ) : (
                    <span key={i} style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, border: `1px solid ${i === 0 || i === 8 ? "rgba(255, 182, 39, 0.35)" : "var(--c-border-faint)"}`, background: i === 0 || i === 8 ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted, var(--c-bg))", fontWeight: 700, color: i === 0 || i === 8 ? "var(--c-brand-gold)" : "var(--c-text-secondary)" }}>{s}</span>
                  )
                )}
              </div>
              <button type="button" onClick={() => setShowHow(false)} style={{ ...goldBtn, fontSize: 13, padding: "9px 22px", marginTop: 16 }}>
                Got it — start my redos
              </button>
            </div>
          )}

          {/* add-your-own-mistake form */}
          {showAdd && (
            <div style={{ display: "block", flexShrink: 0, maxWidth: 860, marginTop: 20, background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "22px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 7 }}>
                The question that got you
              </div>
              <textarea
                rows={3}
                value={addQ}
                onChange={(e) => setAddQ(e.target.value)}
                placeholder="Type or paste it — from a book, a class, anywhere."
                style={{ width: "100%", background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 12, color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 14, padding: "12px 14px", resize: "vertical" }}
              />
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", margin: "14px 0 7px" }}>
                Chapter
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {chapters.slice(0, 5).map((g) => (
                  <button key={g.key} type="button" style={chipBtn(addChapter.trim().toLowerCase() === g.key)} onClick={() => setAddChapter(g.label)}>
                    {g.label}
                  </button>
                ))}
                <input
                  type="text"
                  value={addChapter}
                  onChange={(e) => setAddChapter(e.target.value)}
                  placeholder="or type one…"
                  style={{ background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 999, color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 12.5, padding: "8px 16px", width: 170 }}
                />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", margin: "14px 0 7px" }}>
                Correct answer — optional but smart
              </div>
              <input
                type="text"
                value={addAnswer}
                onChange={(e) => setAddAnswer(e.target.value)}
                placeholder="Future-you will thank you on redo day."
                style={{ width: "100%", background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 12, color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 14, padding: "11px 14px" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
                <button type="button" onClick={saveOwn} disabled={addSaving || !addQ.trim()} style={{ ...goldBtn, fontSize: 13.5, padding: "11px 26px", opacity: addSaving || !addQ.trim() ? 0.5 : 1 }}>
                  {addSaving ? "Saving…" : "Into the vault → first redo in 3 days"}
                </button>
                <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
                  Same 3 → 7 → 21 ladder · self-graded on redo day
                </span>
              </div>
            </div>
          )}

          {/* hero — "Today's redo" (ring + one line + gold Start) */}
          {(() => {
            const n = todaysAsk.length;
            const done = Math.min(redosToday, DAILY_CAP);
            const target = done + n;
            const frac = target > 0 ? done / target : 1;
            const CIRC = 144.5; // 2πr for r=23 — the preview's ring
            return (
              <div className="mt-7 max-w-[860px]" data-tour="vault-redo" style={{ display: "flex", alignItems: "center", gap: 18, position: "relative", overflow: "hidden", background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "20px 22px" }}>
                <span aria-hidden style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)", opacity: 0.55 }} />
                <div style={{ width: 56, height: 56, position: "relative", flexShrink: 0 }}>
                  <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)", display: "block" }}>
                    <circle cx="28" cy="28" r="23" fill="none" stroke="var(--c-surface-sunken, var(--c-surface-muted))" strokeWidth="5" />
                    <circle cx="28" cy="28" r="23" fill="none" stroke="var(--c-brand-gold)" strokeWidth="5" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                    <span className="ds-display" style={{ fontSize: 17 }}>{n}</span>
                  </div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>Today&apos;s redo</div>
                  <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 3 }}>
                    {/* 2026-08 reconcile fix: `due` is the ONE source of truth
                        for "due today" (vaultState per item) — the chapter
                        chips sum to due.length. The session stays capped at
                        DAILY_CAP, so when a backlog exists the copy says so
                        honestly instead of pretending only n are due. */}
                    {n > 0
                      ? due.length > n
                        ? `Starting with ${n} of ${due.length} due today · about ${minutesFor(n)} ${minutesFor(n) === 1 ? "minute" : "minutes"} · the backlog clears day by day`
                        : `${n} ${n === 1 ? "question" : "questions"} due · about ${minutesFor(n)} ${minutesFor(n) === 1 ? "minute" : "minutes"} · then you're clear`
                      : redosToday >= DAILY_CAP
                        ? due.length > 0
                          ? `Done for today — ${due.length} still due, back on the list tomorrow.`
                          : "Done for today — the vault rests."
                        : "Nothing due — the vault is calm."}
                  </div>
                </div>
                {n > 0 && (
                  <button type="button" onClick={() => startSession()} style={{ ...goldBtn, marginLeft: "auto", fontSize: 12.5, padding: "10px 22px", whiteSpace: "nowrap" }}>
                    Start <ArrowRight size={14} />
                  </button>
                )}
              </div>
            );
          })()}

          {/* slim stat line — in the vault · chapters · lucky · mastered */}
          <div className="mt-5 max-w-[860px] flex flex-wrap items-baseline" data-tour="vault-stats" style={{ gap: 22, borderBottom: "1px solid var(--c-border-faint)", padding: "0 2px 14px" }}>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
              <b style={{ ...grad, fontSize: 17, marginRight: 4 }}>{withState.length}</b> in the vault
            </span>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
              <b style={{ ...grad, fontSize: 17, marginRight: 4 }}>{chapterRowsAll.length}</b> {chapterRowsAll.length === 1 ? "chapter" : "chapters"}
            </span>
            {luckyCount > 0 && (
              <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
                <b className="ds-display" style={{ fontSize: 17, marginRight: 4, fontWeight: 500, color: VIOLET }}>{luckyCount}</b> lucky guesses
              </span>
            )}
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
              <b className="ds-display" style={{ fontSize: 17, marginRight: 4, fontWeight: 500, color: "var(--c-success)" }}>{mastered.length}</b> mastered — forever
            </span>
          </div>

          {insight && (
            <div className="max-w-[860px] mt-5 rounded-[12px] px-4 py-3" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13, lineHeight: 1.6, color: "var(--c-text-secondary)" }}>
              <b style={{ color: "var(--c-brand-gold)" }}>Your pattern:</b> {insight}
            </div>
          )}

          {/* one-time intro: lucky guesses now land here too */}
          {showGuessBanner && (
            <div
              className="max-w-[860px] mt-6"
              style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 16px", background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderLeft: `2px solid ${VIOLET}`, borderRadius: "0 12px 12px 0", boxShadow: "var(--c-shadow-xs)" }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: VIOLET_TINT, color: VIOLET, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                  <path d="M9 9a3 3 0 1 1 5.2 2c-.8.8-2.2 1.2-2.2 2.5" />
                  <circle cx="12" cy="17.5" r="0.6" fill="currentColor" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>New — lucky guesses now land here too</div>
                <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 1, lineHeight: 1.5 }}>
                  Marked an answer right but tagged it &quot;Guessed&quot;? The vault treats it like a mistake and schedules it for practice — a guess isn&apos;t knowledge until you&apos;ve proven it.
                </div>
              </div>
              <button
                type="button"
                onClick={dismissGuessBanner}
                aria-label="Dismiss"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", fontSize: 13, padding: 2, fontFamily: "inherit", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* chapter head — "By chapter — weakest first" + Source dropdown.
              zIndex: the dropdown menu must paint above the list card. */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 mt-7 mb-2.5 max-w-[860px]" data-tour="vault-chapters" style={{ position: "relative", zIndex: 70 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
              By chapter — weakest first
            </span>
            <PillDropdown
              label="Source"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[
                { value: null, label: "All" },
                { value: "test", label: "Tests" },
                { value: "pyq", label: "PYQ" },
                { value: "own", label: "Added by you" },
              ]}
            />
          </div>

          {/* chapter rows — expand to the chapter's questions inside */}
          <div className="max-w-[860px]" style={{ ...card, padding: 0, overflow: "hidden" }} data-tour="vault-list">
            {items === null && <div style={{ padding: "16px 22px", fontSize: 13, color: "var(--c-text-tertiary)" }}>Opening the vault…</div>}
            {items !== null && chapterRows.length === 0 && (
              <div style={{ padding: "16px 22px", fontSize: 13, color: "var(--c-text-tertiary)" }}>
                {sourceFilter
                  ? "Nothing from this source yet — switch it back to All."
                  : "No mistakes collected yet. Take a concept test — anything you miss lands here automatically."}
              </div>
            )}
            {chapterRows.map((g, gi) => {
              const isOpen = openChapter === g.key;
              // inner order: due first (oldest due), then upcoming by
              // return date, mastered at the bottom
              const rows = isOpen
                ? g.items.slice().sort((a, b) => {
                    const rank = (it) => (it.st.mastered ? 2 : it.st.dueNow ? 0 : 1);
                    const dueAt = (it) => (it.st.due instanceof Date ? it.st.due.getTime() : 0);
                    return rank(a) - rank(b) || dueAt(a) - dueAt(b);
                  })
                : null;
              const rowSnips = rows ? distinctSnippets(rows.map(snippet)) : null;
              const chapterDue = g.items.filter((it) => !it.st.mastered && it.st.dueNow);
              return (
                <div key={g.key}>
                  <div
                    onClick={() => setOpenChapter(isOpen ? null : g.key)}
                    className="td-step flex items-center gap-3.5"
                    style={{ padding: "14px 18px", cursor: "pointer", borderTop: gi > 0 ? "1px solid var(--c-border-faint)" : "none" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.label}</div>
                      <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>
                        {g.total} in vault{g.dominant ? ` · mostly ${REASON_PHRASE[g.dominant] || g.dominant}` : ""}
                      </div>
                    </div>
                    {g.due > 0 && (
                      <span className="shrink-0" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>
                        {g.due} due today
                      </span>
                    )}
                    <div className="shrink-0 hidden sm:block" style={{ marginLeft: "auto", textAlign: "right", width: 150 }}>
                      <div style={{ fontSize: 10, color: "var(--c-text-tertiary)", marginBottom: 5 }}>
                        <b style={{ color: "var(--c-success)", fontWeight: 600 }}>{g.mastered} mastered</b> · {g.improving} improving
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", display: "flex" }}>
                        <span style={{ width: `${Math.round(g.masteredFrac * 100)}%`, background: "var(--c-success)", height: "100%" }} />
                        <span style={{ width: `${Math.round(g.improvingFrac * 100)}%`, background: "var(--c-brand-gold)", height: "100%" }} />
                      </div>
                    </div>
                    <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--c-text-tertiary)", transition: "transform 0.18s", transform: isOpen ? "rotate(90deg)" : "none" }}>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </div>

                  {isOpen && (
                    <div style={{ background: "var(--c-surface-muted)", borderTop: "1px solid var(--c-border-faint)", padding: "6px 18px 10px 30px" }}>
                      {chapterDue.length > 0 && (
                        <button type="button" onClick={() => startSession(prioritize(chapterDue))} className="my-2" style={{ ...goldBtn, fontSize: 12, padding: "8px 18px" }}>
                          Redo {Math.min(chapterDue.length, SESSION_SIZE)} due from {g.label} <ArrowRight size={13} />
                        </button>
                      )}
                      {rows.map((it, i) => (
                        <div
                          key={it.question_id}
                          onClick={!it.st.mastered && it.st.dueNow ? () => startSession([it]) : undefined}
                          title={it.st.mastered ? "Mastered — beaten three times, spaced apart" : it.st.dueNow ? "Redo this one now" : "Locked until it's due — that's how the memory science works"}
                          className="flex items-center gap-3 group"
                          style={{ padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--c-border-faint)" : "none", cursor: !it.st.mastered && it.st.dueNow ? "pointer" : "default" }}
                        >
                          <Ladder stage={it.st.stage} />
                          {/* lucky guesses get the violet pill (per preview);
                              then is_pyq wins — PYQ self-grade items also
                              carry is_own, but must never read as "YOURS" */}
                          {it.is_guess ? (
                            <span className="shrink-0" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: VIOLET, border: `1px solid ${VIOLET_BORDER}`, background: VIOLET_TINT, borderRadius: 999, padding: "2px 9px" }}>
                              Lucky guess
                            </span>
                          ) : it.is_pyq ? (
                            <span className="shrink-0" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--c-brand-gold)", border: "1px solid rgba(255, 182, 39, 0.35)", background: "var(--c-brand-gold-tint)", borderRadius: 999, padding: "2px 9px" }}>
                              PYQ
                            </span>
                          ) : it.is_own ? (
                            <span className="shrink-0" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--c-brand-gold)", border: "1px solid rgba(255, 182, 39, 0.35)", background: "var(--c-brand-gold-tint)", borderRadius: 999, padding: "2px 9px" }}>
                              YOURS
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1" style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--c-text-secondary)" }}>
                            {rowSnips[i]}
                          </span>
                          <span className="hidden md:block shrink-0" style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>
                            {it.last_reason ? `last time: ${reasonLabel(it.last_reason)}` : !it.st.mastered && it.st.stage > 0 ? `survived ${it.st.stage}` : ""}
                          </span>
                          {it.st.mastered ? (
                            <span className="shrink-0" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-success)", background: "var(--c-success-soft)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                              Mastered
                            </span>
                          ) : it.st.dueNow ? (
                            <span className="shrink-0" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-brand-gold)", background: "var(--c-brand-gold-tint)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                              <span className="group-hover:hidden">Due today</span>
                              <span className="hidden group-hover:inline">Redo now →</span>
                            </span>
                          ) : (
                            <span className="shrink-0" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-text-tertiary)", background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                              {returnsLabel(it.st, now)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* footnote — exact preview copy */}
          <div className="max-w-[860px] mb-12" style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 14 }}>
            Green = mastered (answered right three times, spaced apart). Gold = improving. A chapter with everything green is a chapter that can&apos;t surprise you in the exam.
          </div>

          <PortalTour
            steps={VAULT_TOUR_STEPS}
            storageKey="tour_vault_v1"
            run={tourRun}
            onClose={() => setTourRun(false)}
            labelPrefix="Vault tour"
          />
        </>
      )}

      {/* ══ SESSION ══ */}
      {phase === "session" && q && (
        <>
          <header className="mt-10">
            <h1 className="ds-display" style={{ fontSize: "clamp(24px, 3.4vw, 32px)", lineHeight: 1.1 }}>
              Redo <span className="ds-accent ds-grad-text">session.</span>
            </h1>
            <p className="mt-2" style={{ fontSize: 14.5, color: "var(--c-text-secondary)" }}>You got these wrong once. Prove that&apos;s history.</p>
          </header>
          <div className="max-w-[760px] mt-5 p-6 md:p-7" style={{ ...card, padding: undefined }}>
            <div className="flex justify-between flex-wrap gap-1" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
              <span>
                {q.is_pyq ? (
                  <>IPMAT PYQ · {q.chapter || "PYQ"}</>
                ) : q.is_guess ? (
                  <>Lucky guess · prove it wasn&apos;t luck</>
                ) : (
                  <>
                    {q.is_own ? "Your own mistake · " : ""}
                    {displayChapter(q)}
                    {!q.is_own && q.test_title && !BUCKET.test(String(q.chapter || "")) && q.test_title !== q.chapter ? ` · from ${q.test_title}` : ""}
                    {q.is_own ? "" : ` · missed ${q.wrong_count > 1 ? `${q.wrong_count} times` : "once"}`}
                  </>
                )}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{qi + 1} / {queue.length}</span>
            </div>
            {q.questionimage && (
              <img src={q.questionimage} alt="Question" style={{ maxWidth: "100%", maxHeight: "24vh", marginBottom: 14, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
            )}
            {q.title && <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{q.title}</div>}
            {q.question && (
              <div className={"qcontent qforce " + (q.title ? "mt-2" : "")} style={{ fontSize: 15, lineHeight: 1.6, maxHeight: "30vh", overflowY: "auto", overflowX: "auto", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: q.question }} />
            )}
            <div className="grid gap-2.5 mt-4">
              {Array.isArray(q.options) && q.options.map((o, d) => {
                let border = "var(--c-border-faint)";
                let bg = "var(--c-surface-muted, var(--c-bg))";
                if (reveal && o.isCorrect) { border = "var(--c-success)"; bg = "var(--c-success-soft)"; }
                else if (reveal && picked === d && !o.isCorrect) { border = "var(--c-danger)"; bg = "var(--c-danger-soft)"; }
                return (
                  <button key={d} type="button" onClick={() => handleAnswer(d)} className="text-left"
                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--c-text-primary)", cursor: reveal ? "default" : "pointer", fontFamily: "inherit" }}>
                    <span style={{ fontWeight: 700, marginRight: 10, color: "var(--c-text-tertiary)" }}>{String.fromCharCode(65 + d)}.</span>
                    <span dangerouslySetInnerHTML={{ __html: o.title }} />
                  </button>
                );
              })}
            </div>
            {q.is_own && !reveal && (
              <>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button type="button" onClick={() => handleSelfGrade(true)} style={{ flex: 1, borderRadius: 12, padding: 13, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--c-success)", background: "var(--c-success-soft)", color: "var(--c-text-primary)" }}>
                    ✓ Got it right
                  </button>
                  <button type="button" onClick={() => handleSelfGrade(false)} style={{ flex: 1, borderRadius: 12, padding: 13, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--c-danger)", background: "var(--c-danger-soft)", color: "var(--c-text-primary)" }}>
                    ✗ Got it wrong
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 10 }}>
                  Solve it on paper like exam day — then be honest. The ladder only works if you are.
                </div>
              </>
            )}
            {q.is_own && reveal && q.answer && (
              <div style={{ marginTop: 14, borderRadius: 12, padding: "12px 16px", background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, color: "var(--c-text-secondary)" }}>
                Correct answer: <b style={{ color: "var(--c-brand-gold)" }}>{q.answer}</b>
              </div>
            )}
            <div style={{ fontSize: 12.5, fontWeight: 600, minHeight: 20, marginTop: 14, color: flash?.tone }}>{flash?.text}</div>

            {/* AI Doubts — Samjhao */}
            {reveal && !q.is_own && (
              <div style={{ marginTop: 12 }}>
                {!explain && (
                  <button type="button" onClick={askExplain} style={{ background: "var(--c-brand-gold-tint)", border: "1px solid rgba(255, 182, 39, 0.35)", color: "var(--c-brand-gold)", borderRadius: 999, padding: "8px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    ✨ Samjhao — explain this
                  </button>
                )}
                {explain?.loading && (
                  <div style={{ fontSize: 13, color: "var(--c-text-tertiary)" }}>Samjha rahe hain…</div>
                )}
                {explain?.error && (
                  <div style={{ fontSize: 13, color: "var(--c-danger)" }}>{explain.error}</div>
                )}
                {explain?.text && (
                  <div style={{ borderRadius: 12, padding: "14px 16px", background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.7, color: "var(--c-text-secondary)", whiteSpace: "pre-wrap" }}>
                    <b style={{ color: "var(--c-brand-gold)" }}>Samjhao:</b> {explain.text}
                  </div>
                )}
              </div>
            )}

            {/* why-tags after reveal */}
            {reveal && (
              <div className="mt-3 pt-4" style={{ borderTop: "1px dashed var(--c-border-soft, var(--c-border-faint))" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                  {lastCorrect ? "Why had this gone wrong before? (optional)" : "Why did this go wrong? (optional)"}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {REASONS.map((r) => (
                    <button key={r.id} type="button" style={chipBtn(false)} onClick={() => commitAndAdvance(r.id)}>
                      {r.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => commitAndAdvance(null)} style={{ background: "none", border: "none", fontSize: 12, fontWeight: 600, color: "var(--c-text-tertiary)", cursor: "pointer", fontFamily: "inherit", padding: "7px 10px" }}>
                    Skip — continue →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ RESULT ══ */}
      {phase === "result" && (
        <>
          <header className="mt-10">
            <h1 className="ds-display" style={{ fontSize: "clamp(24px, 3.4vw, 32px)", lineHeight: 1.1 }}>
              Vault <span className="ds-accent ds-grad-text">update.</span>
            </h1>
            <p className="mt-2" style={{ fontSize: 14.5, color: "var(--c-text-secondary)" }}>
              {moves.filter((m) => m.correct).length} of {moves.length} redeemed today. The vault remembers the rest — and so will you.
            </p>
          </header>
          <div className="flex justify-between items-baseline mt-7 mb-3">
            <div style={sectLabel}>What moved</div>
            <span style={sectMeta}>the ladder: day 3 → day 7 → day 21 → mastered</span>
          </div>
          <div className="max-w-[860px]" style={card}>
            {moves.map(({ q: mq, correct, masteredNow, newStreak }, i) => (
              <div key={i} className="flex items-center gap-3" style={{ padding: "12px 0", borderBottom: i < moves.length - 1 ? "1px solid var(--c-border-faint)" : "none", fontSize: 13 }}>
                <span style={{ color: correct ? "var(--c-success)" : "var(--c-danger)", fontWeight: 700 }}>{correct ? "✓" : "✗"}</span>
                <span className="min-w-0 flex-1" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{snippet(mq)}</span>
                <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", color: masteredNow ? "var(--c-brand-gold)" : correct ? "var(--c-success)" : "var(--c-danger)" }}>
                  {masteredNow ? "★ MASTERED — leaves the vault" : correct ? `↑ next redo in ${LADDER_DAYS[newStreak] ?? 21} days` : "↓ back to day 3"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 mb-12 flex items-center gap-3 flex-wrap">
            {todaysAsk.length > 0 && (
              <button type="button" onClick={() => startSession()} style={goldBtn}>
                Continue — {Math.min(todaysAsk.length, SESSION_SIZE)} left in today&apos;s {DAILY_CAP} <ArrowRight size={15} />
              </button>
            )}
            <button type="button" onClick={() => setPhase("home")} style={{ background: "transparent", color: "var(--c-text-secondary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-soft, var(--c-border-faint))", borderRadius: 999, padding: "11px 24px", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <RotateCcw size={15} /> Back to vault
            </button>
            <span style={{ fontSize: 12, color: "var(--c-brand-gold)", fontWeight: 600 }}>+{XP_PER_SESSION} XP banked</span>
          </div>
        </>
      )}
    </div>
  );
}
