// ============================================================
// Mistake Vault — spaced-repetition redo of wrong answers.
// Every question the student ever got wrong (derived from plays,
// fully retroactive) sits in the vault. The ladder: due 3 days
// after the miss → clean redo moves it to 7 days → then 21 →
// third clean redo = MASTERED, leaves the vault. Any wrong redo
// resets to day 3. Redo attempts write to mistake_redos; sessions
// log to trainer_runs (trainer 'mistake-redo', +30 XP).
//
// Lives under Tests in the sidebar (slug "mistakevault").
// Pure logic exported for tests: vaultState, LADDER_DAYS,
// SESSION_SIZE, dueLabel.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

export const LADDER_DAYS = [3, 7, 21];
export const SESSION_SIZE = 10;
export const MASTER_STREAK = 3;
export const XP_PER_SESSION = 30;

// Pure: item {streak, last_wrong_at, last_redo_at} → state.
export function vaultState(item, now = new Date()) {
  const streak = Number(item.streak || 0);
  if (streak >= MASTER_STREAK) return { stage: MASTER_STREAK, mastered: true, dueNow: false, due: null };
  // anchor: the most recent event (miss or redo — a failed redo also resets the clock)
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

export default function MistakeVault({ userData }) {
  const [items, setItems] = useState(null);
  const [phase, setPhase] = useState("home"); // home | session | result
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [flash, setFlash] = useState(null);
  const [moves, setMoves] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const advanceRef = useRef(null);
  const lockRef = useRef(false);
  const movesRef = useRef([]);

  const load = () => {
    if (!userData?.email) return;
    supabase.rpc("get_my_mistakes", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setItems(data.filter((it) => Array.isArray(it.options) && it.options.length >= 2 && (it.title || it.question)));
      } else setItems([]);
    });
  };
  useEffect(load, [userData?.email]);
  useEffect(() => () => clearTimeout(advanceRef.current), []);

  const now = new Date();
  const withState = (items || []).map((it) => ({ ...it, st: vaultState(it, now) }));
  const active = withState.filter((it) => !it.st.mastered);
  const mastered = withState.filter((it) => it.st.mastered);
  const due = active.filter((it) => it.st.dueNow).sort((a, b) => a.st.due - b.st.due);
  const upcoming = active.filter((it) => !it.st.dueNow).sort((a, b) => a.st.due - b.st.due);
  const listed = [...due, ...upcoming];
  const testsCount = new Set((items || []).map((it) => it.chapter)).size;

  const startSession = () => {
    const session = due.slice(0, SESSION_SIZE);
    if (!session.length) return;
    setQueue(session);
    setQi(0);
    setPicked(null);
    setReveal(false);
    setFlash(null);
    movesRef.current = [];
    setMoves([]);
    lockRef.current = false;
    setPhase("session");
  };

  const q = queue[qi];

  const handleAnswer = async (idx) => {
    if (reveal || lockRef.current || !q) return;
    lockRef.current = true;
    const correct = !!q.options[idx]?.isCorrect;
    setPicked(idx);
    setReveal(true);
    const newStreak = correct ? Number(q.streak || 0) + 1 : 0;
    const masteredNow = correct && newStreak >= MASTER_STREAK;
    movesRef.current.push({ q, correct, masteredNow, newStreak });
    setFlash(
      correct
        ? masteredNow
          ? { text: "Third clean redo — MASTERED. It leaves the vault forever.", tone: "var(--c-brand-gold)" }
          : { text: `Right — climbs the ladder. Next redo in ${LADDER_DAYS[newStreak]} days.`, tone: "var(--c-success)" }
        : { text: "Still bites. Back to day 3 — you'll see it again soon.", tone: "var(--c-danger)" }
    );
    if (userData?.email) {
      supabase.from("mistake_redos").insert({ user: userData.email, question_id: q.question_id, correct });
    }
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(async () => {
      setPicked(null);
      setReveal(false);
      setFlash(null);
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
        setPhase("result");
        load();
      } else {
        setQi(qi + 1);
      }
    }, 1500);
  };

  // ── styles (dashboard tokens, approved open layout) ──
  const grad = { fontFamily: "var(--font-display, 'Fraunces', serif)", fontWeight: 500, letterSpacing: "-0.02em", background: "var(--c-stat-grad)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" };
  const sectLabel = { fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" };
  const sectMeta = { fontSize: 11.5, color: "var(--c-text-tertiary)" };
  const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, padding: "8px 22px", boxShadow: "var(--c-shadow-xs)" };
  const goldBtn = { background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 };

  const Ladder = ({ stage }) => (
    <span className="flex gap-1 items-center shrink-0" style={{ width: 62 }}>
      {[0, 1, 2].map((i) => (
        <i key={i} style={{ width: 16, height: 5, borderRadius: 5, background: i < stage ? "var(--c-mock-banner-btn-bg)" : "var(--c-surface-sunken, var(--c-surface-muted))" }} />
      ))}
    </span>
  );

  const snippet = (it) => {
    const raw = it.title || String(it.question || "").replace(/<[^>]*>/g, " ");
    return raw.replace(/\s+/g, " ").trim();
  };

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
              ["Due today", String(due.length), due.length ? "redo them before they fade" : "nothing due — vault is calm", due.length ? "var(--c-brand-gold)" : "var(--c-text-tertiary)"],
              ["In the vault", String(active.length), `across ${testsCount} ${testsCount === 1 ? "chapter" : "chapters"}`, "var(--c-text-tertiary)"],
              ["Mastered forever", String(mastered.length), "this number only goes up", "var(--c-success)"],
            ].map(([l, v, cap, capColor], i, arr) => (
              <div key={l} style={{ padding: "4px 34px 4px 0", marginRight: 34, borderRight: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div style={{ ...grad, fontSize: 30, marginTop: 3, lineHeight: 1.1 }}>{v}</div>
                <div style={{ fontSize: 11, marginTop: 4, color: capColor, fontWeight: 500 }}>{cap}</div>
              </div>
            ))}
          </div>

          {due.length > 0 && (
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button type="button" onClick={startSession} style={goldBtn}>
                Redo session — {Math.min(due.length, SESSION_SIZE)} due {Math.min(due.length, SESSION_SIZE) === 1 ? "question" : "questions"} <ArrowRight size={15} />
              </button>
              <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_SESSION} XP per session</span>
            </div>
          )}

          <div className="flex justify-between items-baseline mt-9 mb-3">
            <div style={sectLabel}>{due.length ? "Due for redo" : "The vault"}</div>
            <span style={sectMeta}>wrong redo → back to day 3 · three rights → mastered</span>
          </div>
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
              <div key={it.question_id} className="flex items-center gap-3.5" style={{ padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none" }}>
                <Ladder stage={it.st.stage} />
                <span className="min-w-0 flex-1" style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {snippet(it)}
                </span>
                <span className="hidden md:block shrink-0" style={{ fontSize: 11, color: "var(--c-text-tertiary)", width: 150 }}>
                  {it.chapter || "—"}{it.st.stage > 0 ? ` · survived ${it.st.stage} ${it.st.stage === 1 ? "redo" : "redos"}` : ""}
                </span>
                <span className="shrink-0 text-right" style={{ fontSize: 11, fontWeight: 600, width: 90, color: it.st.dueNow ? "var(--c-brand-gold)" : "var(--c-text-tertiary)" }}>
                  {dueLabel(it.st, now)}
                </span>
              </div>
            ))}
            {listed.length > 8 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} style={{ background: "none", border: "none", padding: "13px 0", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}>
                {showAll ? "Show less" : `Show all ${listed.length} in the vault →`}
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
            <div className="flex justify-between" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
              <span>{q.chapter || "Mistake"} · missed {q.wrong_count > 1 ? `${q.wrong_count} times` : "once"}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{qi + 1} / {queue.length}</span>
            </div>
            {q.questionimage && (
              <img src={q.questionimage} alt="Question" style={{ maxWidth: "100%", maxHeight: "24vh", marginBottom: 14, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
            )}
            {q.title && <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{q.title}</div>}
            {q.question && (
              <div className={"qcontent " + (q.title ? "mt-2" : "")} style={{ fontSize: 15, lineHeight: 1.6, maxHeight: "30vh", overflowY: "auto", overflowX: "auto", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: q.question }} />
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
          <div className="mt-6 mb-12 flex items-center gap-3">
            <button type="button" onClick={() => setPhase("home")} style={goldBtn}>
              <RotateCcw size={15} /> Back to vault
            </button>
            <span style={{ fontSize: 12, color: "var(--c-brand-gold)", fontWeight: 600 }}>+{XP_PER_SESSION} XP banked</span>
          </div>
        </>
      )}
    </div>
  );
}
