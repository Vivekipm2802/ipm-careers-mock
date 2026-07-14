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

export const LADDER_DAYS = [3, 7, 21];
export const SESSION_SIZE = 10;
export const MASTER_STREAK = 3;
export const XP_PER_SESSION = 30;
export const DAILY_CAP = 12;

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
  const lockRef = useRef(false);
  const movesRef = useRef([]);
  const pendingRef = useRef(null); // { question_id, correct } awaiting reason

  const load = () => {
    if (!userData?.email) return;
    supabase.rpc("get_my_mistakes", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setItems(data.filter((it) => Array.isArray(it.options) && it.options.length >= 2 && (it.title || it.question)));
      } else setItems([]);
    });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    supabase
      .from("mistake_redos")
      .select("id", { count: "exact", head: true })
      .eq("user", userData.email)
      .gte("created_at", startOfToday.toISOString())
      .then(({ count }) => setRedosToday(count || 0));
  };
  useEffect(load, [userData?.email]);

  const now = new Date();
  const withState = (items || []).map((it) => ({ ...it, st: vaultState(it, now) }));
  const active = withState.filter((it) => !it.st.mastered);
  const mastered = withState.filter((it) => it.st.mastered);
  const due = prioritize(active.filter((it) => it.st.dueNow));
  const upcoming = active.filter((it) => !it.st.dueNow).sort((a, b) => a.st.due - b.st.due);

  // daily ask: capped by what's already been redone today
  const budget = Math.max(0, DAILY_CAP - redosToday);
  const todaysAsk = due.slice(0, budget);

  // chapters for chips
  const chapterCounts = {};
  active.forEach((it) => {
    const c = displayChapter(it);
    chapterCounts[c] = (chapterCounts[c] || 0) + 1;
  });
  const chapters = Object.entries(chapterCounts).sort((a, b) => b[1] - a[1]);

  const listed = chapterFilter
    ? active.filter((it) => displayChapter(it) === chapterFilter)
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
        setItems((prev) =>
          (prev || []).map((it) =>
            it.question_id === pending.question_id
              ? {
                  ...it,
                  streak: pending.correct ? Number(it.streak || 0) + 1 : 0,
                  last_redo_at: new Date().toISOString(),
                  last_reason: reason || it.last_reason,
                }
              : it
          )
        );
      }
    }
    setPicked(null);
    setReveal(false);
    setFlash(null);
    setLastCorrect(null);
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
            <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4.2vw, 40px)", lineHeight: 1.1 }}>
              Mistake <span className="ds-accent ds-grad-text">Vault.</span>
            </h1>
            <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
              Every question you&apos;ve ever missed, collected automatically. Redo them on schedule — 3, 7, 21 days — and they leave the vault forever.
            </p>
          </header>

          <div className="flex items-center flex-wrap mt-7">
            {[
              ["Today's redo", String(todaysAsk.length), todaysAsk.length ? `~${minutesFor(todaysAsk.length)} min · ${due.length > todaysAsk.length ? `${due.length - todaysAsk.length} more queued for tomorrow` : "then you're clear"}` : redosToday >= DAILY_CAP ? "done for today — vault rests" : "nothing due — vault is calm", todaysAsk.length ? "var(--c-brand-gold)" : "var(--c-text-tertiary)"],
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
            <div className="mt-6 flex items-center gap-3 flex-wrap">
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
            <div className="flex gap-2 flex-wrap mt-7">
              <button type="button" style={chipBtn(!chapterFilter)} onClick={() => setChapterFilter(null)}>All</button>
              {chapters.slice(0, 8).map(([c, n]) => (
                <button key={c} type="button" style={chipBtn(chapterFilter === c)} onClick={() => setChapterFilter(chapterFilter === c ? null : c)}>
                  {c} · {n}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between items-baseline mt-6 mb-3">
            <div style={sectLabel}>{chapterFilter ? chapterFilter : todaysAsk.length ? "The schedule" : "The vault"}</div>
            <span style={sectMeta}>wrong redo → back to day 3 · three rights → mastered</span>
          </div>

          {chapterFilter && (() => {
            const chapterDue = listed.filter((it) => it.st.dueNow);
            return chapterDue.length > 0 ? (
              <button type="button" onClick={() => startSession(chapterDue)} className="self-start mb-3" style={{ ...goldBtn, fontSize: 13, padding: "10px 22px" }}>
                Redo {Math.min(chapterDue.length, SESSION_SIZE)} due from {chapterFilter} <ArrowRight size={14} />
              </button>
            ) : (
              <div className="mb-3" style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
                Nothing due in {chapterFilter} right now — the schedule will bring them back.
              </div>
            );
          })()}

          <div className="max-w-[860px] mb-12" style={card}>
            {items === null && <div style={{ padding: "16px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Opening the vault…</div>}
            {items !== null && listed.length === 0 && (
              <div style={{ padding: "16px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>
                {mastered.length > 0
                  ? "Vault cleared — every mistake mastered. Take tests to feed it new ones."
                  : "No mistakes collected yet. Take a concept test — anything you miss lands here automatically."}
              </div>
            )}
            {listed.slice(0, showAll ? listed.length : 8).map((it, i, arr) => (
              <div
                key={it.question_id}
                onClick={it.st.dueNow ? () => startSession([it]) : undefined}
                title={it.st.dueNow ? "Redo this one now" : "Locked until it's due — that's how the memory science works"}
                className="flex items-center gap-3.5 group"
                style={{ padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none", cursor: it.st.dueNow ? "pointer" : "default" }}
              >
                <Ladder stage={it.st.stage} />
                <span className="min-w-0 flex-1" style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {snippet(it)}
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
            ))}
            {listed.length > 8 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} style={{ background: "none", border: "none", padding: "13px 0", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}>
                {showAll ? "Show less" : `Show all ${listed.length} →`}
              </button>
            )}
          </div>
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
                {displayChapter(q)}
                {q.test_title && !BUCKET.test(String(q.chapter || "")) && q.test_title !== q.chapter ? ` · from ${q.test_title}` : ""} · missed {q.wrong_count > 1 ? `${q.wrong_count} times` : "once"}
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
              {q.options.map((o, d) => {
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
            <div style={{ fontSize: 12.5, fontWeight: 600, minHeight: 20, marginTop: 14, color: flash?.tone }}>{flash?.text}</div>

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
