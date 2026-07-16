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
// Pure logic exported: vaultState, dueLabel, prioritize,
// minutesFor, insightFor, REASONS, DAILY_CAP, LADDER_DAYS.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import PortalTour, { useFirstVisitTour } from "./PortalTour";

// First-visit mini-tour steps. The redo-button step falls back to
// the list card when nothing is due (querySelector returns the
// first match in document order).
const VAULT_TOUR_STEPS = [
  {
    target: "[data-tour='vault-stats']",
    title: "Teen numbers",
    desc: "Aaj kitne redo due, vault mein kitne, kitne hamesha ke liye master ho gaye.",
  },
  {
    target: "[data-tour='vault-redo'], [data-tour='vault-list']",
    title: "Roz ka kaam",
    desc: "Bas is button se shuru karo — vault khud prioritize karta hai.",
  },
  {
    target: "[data-tour='vault-chapters']",
    title: "Chapter pakdo",
    desc: "Kisi ek chapter ke saare due ek saath bhi kar sakte ho.",
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
  const [showAll, setShowAll] = useState(false);
  const [chapterFilter, setChapterFilter] = useState(null);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [showHow, setShowHow] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const [ownItems, setOwnItems] = useState(null);
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

  // explainer card is opt-in only — opens from the "How it works?"
  // link in the header, closes on "Got it". Never auto-shows.

  const now = new Date();
  const withState = [...(items || []), ...(ownItems || [])].map((it) => ({ ...it, st: vaultState(it, now) }));
  const active = withState.filter((it) => !it.st.mastered);
  const mastered = withState.filter((it) => it.st.mastered);
  const due = prioritize(active.filter((it) => it.st.dueNow));
  const upcoming = active.filter((it) => !it.st.dueNow).sort((a, b) => a.st.due - b.st.due);

  // daily ask: capped by what's already been redone today
  const budget = Math.max(0, DAILY_CAP - redosToday);
  const todaysAsk = due.slice(0, budget);

  // chapters for chips — merged case-insensitively
  const chapters = chapterGroups(active);
  const chapterLabel = chapterFilter
    ? chapters.find((g) => g.key === chapterFilter)?.label || chapterFilter
    : null;

  const listed = chapterFilter
    ? active.filter((it) => chapterKey(it) === chapterFilter)
    : [...due, ...upcoming];

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
          (prev || []).map((it) =>
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
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {/* ══ HOME ══ */}
      {phase === "home" && (
        <>
          <header className="mt-10">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4.2vw, 40px)", lineHeight: 1.1 }}>
                Mistake <span className="ds-accent ds-grad-text">Vault.</span>
              </h1>
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
            </div>
            <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
              Every question you&apos;ve ever missed, collected automatically. Redo them on schedule — 3, 7, 21 days — and they leave the vault forever.
            </p>
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

          <div className="flex items-center flex-wrap mt-7" data-tour="vault-stats">
            {[
              ["Today's redo", String(todaysAsk.length), todaysAsk.length ? `your daily dose · ~${minutesFor(todaysAsk.length)} min · ${due.length > todaysAsk.length ? "backlog clears itself" : "then you're clear"}` : redosToday >= DAILY_CAP ? "done for today — vault rests" : "nothing due — vault is calm", todaysAsk.length ? "var(--c-brand-gold)" : "var(--c-text-tertiary)"],
              ["In the vault", String(active.length), `across ${chapters.length} ${chapters.length === 1 ? "chapter" : "chapters"}`, "var(--c-text-tertiary)"],
              ["Mastered forever", String(mastered.length), "this number only goes up", "var(--c-success)"],
            ].map(([l, v, cap, capColor], i, arr) => (
              <div key={l} style={{ padding: "4px 34px 4px 0", marginRight: 34, borderRight: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div style={{ ...grad, fontSize: 30, marginTop: 3, lineHeight: 1.1 }}>{v}</div>
                <div style={{ fontSize: 11, marginTop: 4, color: capColor, fontWeight: 500 }}>{cap}</div>
              </div>
            ))}
          </div>

          {insight && (
            <div className="max-w-[860px] mt-5 rounded-[12px] px-4 py-3" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13, lineHeight: 1.6, color: "var(--c-text-secondary)" }}>
              <b style={{ color: "var(--c-brand-gold)" }}>Your pattern:</b> {insight}
            </div>
          )}

          {todaysAsk.length > 0 && (
            <div className="mt-6 flex items-center gap-3 flex-wrap" data-tour="vault-redo">
              <button type="button" onClick={() => startSession()} style={goldBtn}>
                Start today&apos;s redo — {Math.min(todaysAsk.length, SESSION_SIZE)} {Math.min(todaysAsk.length, SESSION_SIZE) === 1 ? "question" : "questions"} <ArrowRight size={15} />
              </button>
              <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
                +{XP_PER_SESSION} XP · the vault asks for at most {DAILY_CAP} a day
              </span>
            </div>
          )}

          {/* chapter chips */}
          {chapters.length > 1 && (
            <div className="flex gap-2 flex-wrap mt-7" data-tour="vault-chapters">
              <button type="button" style={chipBtn(!chapterFilter)} onClick={() => setChapterFilter(null)}>All</button>
              {(showAllChips ? chapters : chapters.slice(0, 6)).map((g) => (
                <button key={g.key} type="button" style={chipBtn(chapterFilter === g.key)} onClick={() => setChapterFilter(chapterFilter === g.key ? null : g.key)}>
                  {g.label} · {g.count}
                </button>
              ))}
              {chapters.length > 6 && (
                <button type="button" style={{ ...chipBtn(false), color: "var(--c-brand-gold)" }} onClick={() => setShowAllChips((v) => !v)}>
                  {showAllChips ? "show less" : `+${chapters.length - 6} more`}
                </button>
              )}
            </div>
          )}

          <div className="flex justify-between items-baseline mt-6 mb-3">
            <div style={sectLabel}>{chapterFilter ? chapterLabel : "Your mistakes — auto-collected from your tests"}</div>
            <span style={sectMeta}>wrong redo → back to day 3 · three rights → mastered</span>
          </div>

          {chapterFilter && (() => {
            const chapterDue = listed.filter((it) => it.st.dueNow);
            return chapterDue.length > 0 ? (
              <button type="button" onClick={() => startSession(chapterDue)} className="self-start mb-3" style={{ ...goldBtn, fontSize: 13, padding: "10px 22px" }}>
                Redo {Math.min(chapterDue.length, SESSION_SIZE)} due from {chapterLabel} <ArrowRight size={14} />
              </button>
            ) : (
              <div className="mb-3" style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
                Nothing due in {chapterLabel} right now — the schedule will bring them back.
              </div>
            );
          })()}

          <div className="max-w-[860px] mb-12" style={card} data-tour="vault-list">
            {items === null && <div style={{ padding: "16px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Opening the vault…</div>}
            {items !== null && listed.length === 0 && (
              <div style={{ padding: "16px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>
                {mastered.length > 0
                  ? "Vault cleared — every mistake mastered. Take tests to feed it new ones."
                  : "No mistakes collected yet. Take a concept test — anything you miss lands here automatically."}
              </div>
            )}
            {(() => { const rowSnips = distinctSnippets(listed.map(snippet)); return listed.slice(0, showAll ? listed.length : 8).map((it, i, arr) => (
              <div
                key={it.question_id}
                onClick={it.st.dueNow ? () => startSession([it]) : undefined}
                title={it.st.dueNow ? "Redo this one now" : "Locked until it's due — that's how the memory science works"}
                className="flex items-center gap-3.5 group"
                style={{ padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none", cursor: it.st.dueNow ? "pointer" : "default" }}
              >
                <Ladder stage={it.st.stage} />
                {it.is_own && (
                  <span className="shrink-0" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--c-brand-gold)", border: "1px solid rgba(255, 182, 39, 0.35)", background: "var(--c-brand-gold-tint)", borderRadius: 999, padding: "2px 9px" }}>
                    YOURS
                  </span>
                )}
                <span className="min-w-0 flex-1" style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {rowSnips[i]}
                </span>
                <span className="hidden md:block shrink-0" style={{ fontSize: 11, color: "var(--c-text-tertiary)", width: 170 }}>
                  {displayChapter(it)}
                  {it.last_reason ? ` · last time: ${reasonLabel(it.last_reason)}` : it.st.stage > 0 ? ` · survived ${it.st.stage}` : ""}
                </span>
                <span className="shrink-0 text-right" style={{ fontSize: 11, fontWeight: 600, width: 90, color: it.st.dueNow ? "var(--c-brand-gold)" : "var(--c-text-tertiary)" }}>
                  <span className={it.st.dueNow ? "group-hover:hidden" : ""}>{dueLabel(it.st, now)}</span>
                  {it.st.dueNow && <span className="hidden group-hover:inline">redo now →</span>}
                </span>
              </div>
            )); })()}
            {listed.length > 8 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} style={{ background: "none", border: "none", padding: "13px 0", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}>
                {showAll ? "Show less" : `Show all ${listed.length} →`}
              </button>
            )}
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
                {q.is_own ? "Your own mistake · " : ""}
                {displayChapter(q)}
                {!q.is_own && q.test_title && !BUCKET.test(String(q.chapter || "")) && q.test_title !== q.chapter ? ` · from ${q.test_title}` : ""}
                {q.is_own ? "" : ` · missed ${q.wrong_count > 1 ? `${q.wrong_count} times` : "once"}`}
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
