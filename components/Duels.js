// ============================================================
// Duels — DSB Challenge skill trainer (Phase B, vs-bot mode).
// Best-of-5 MCQ battle: same question for you and the bot,
// 15 seconds per round. Correct + faster wins the round; both
// correct → speed decides; both wrong → tie.
//
// Bots: Rookie Rohan (60% acc, slow) · Sectional Sana (75%,
// medium) · AIR-1 Bot (90%, fast). Ranked 1v1 vs real students
// arrives in Phase C — this screen becomes the lobby.
//
// Data: questions via get_trainer_questions; duels logged to
// trainer_runs (trainer: "duels", score = rounds won, details:
// {result, bot, accuracy, avg_time}) → +30 XP, +20 win bonus
// (bonus applied in the XP SQL).
// Pure logic (resolveRound, duelResult, verdictFor) exported
// for unit testing.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Swords } from "lucide-react";

export const XP_PER_RUN = 30;
export const XP_WIN_BONUS = 20;
export const ROUNDS = 5;
export const ROUND_SECS = 15;

export const BOTS = [
  { id: "rookie-rohan", name: "Rookie Rohan", av: "🤓", acc: 0.6, min: 6, max: 12, tag: "60% acc · slow" },
  { id: "sectional-sana", name: "Sectional Sana", av: "😼", acc: 0.75, min: 4, max: 9, tag: "75% acc · medium" },
  { id: "air1-bot", name: "AIR-1 Bot", av: "🤖", acc: 0.9, min: 2, max: 6, tag: "90% acc · fast" },
];

// Pure: outcome of one round. you/bot: { correct: bool, time: seconds }
// Returns "W" (you win), "L" (bot wins), "T" (tie).
export function resolveRound(you, bot) {
  if (you.correct && (!bot.correct || you.time <= bot.time)) return "W";
  if (bot.correct && (!you.correct || bot.time < you.time)) return "L";
  return "T";
}

// Pure: final duel result from points.
export function duelResult(youPts, botPts) {
  if (youPts > botPts) return "win";
  if (botPts > youPts) return "loss";
  return "draw";
}

export function verdictFor(result, right, botName) {
  if (result === "win" && botName === "AIR-1 Bot")
    return "You beat the AIR-1 Bot. 90% accuracy and lightning speed, and you still took it down. Ranked mode will suit you.";
  if (result === "win")
    return "Victory. Solid speed-accuracy balance. Move up an opponent tier — comfort means learning has stopped.";
  if (result === "loss" && right >= 3)
    return "Lost on speed, not knowledge. You answered well but too slowly. Trust your first read — hesitation is what beat you.";
  if (result === "loss")
    return `Beaten on accuracy. ${botName} converted more. Drop a tier, rebuild the basics, then come back for the rematch.`;
  return "Dead even. One sharper round decides it next time. Rematch.";
}

export default function Duels({ userData, onExit }) {
  const [phase, setPhase] = useState("start"); // start | loading | battle | done | empty
  const [bot, setBot] = useState(BOTS[1]);
  const [questions, setQuestions] = useState([]);
  const [round, setRound] = useState(0);
  const [youPts, setYouPts] = useState(0);
  const [botPts, setBotPts] = useState(0);
  const [dots, setDots] = useState([]);
  const [tfrac, setTfrac] = useState(1); // fraction of round time left
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [flash, setFlash] = useState(null);
  const [botLocked, setBotLocked] = useState(false);
  const [record, setRecord] = useState({}); // { botId: {w, l} }
  const [lastStats, setLastStats] = useState(null);

  const t0Ref = useRef(0);
  // Round number lives in a ref as well: settle() can be invoked from the
  // bot's setTimeout, whose closure captured a stale `round` state value.
  const roundNumRef = useRef(0);
  const tickRef = useRef(null);
  const botTimerRef = useRef(null);
  const advanceRef = useRef(null);
  const lockRef = useRef(false);
  const roundRef = useRef({ you: null, bot: null, botDone: false });
  const statsRef = useRef({ times: [], right: 0, dots: [], youPts: 0, botPts: 0 });

  // W–L record per bot
  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .from("trainer_runs")
      .select("details")
      .eq("user", userData.email)
      .eq("trainer", "duels")
      .then(({ data }) => {
        const rec = {};
        (data || []).forEach((r) => {
          const b = r.details?.bot;
          if (!b) return;
          rec[b] = rec[b] || { w: 0, l: 0 };
          if (r.details?.result === "win") rec[b].w += 1;
          if (r.details?.result === "loss") rec[b].l += 1;
        });
        setRecord(rec);
      });
  }, [userData?.email, phase === "done"]);

  useEffect(
    () => () => {
      clearInterval(tickRef.current);
      clearTimeout(botTimerRef.current);
      clearTimeout(advanceRef.current);
    },
    []
  );

  const begin = async () => {
    setPhase("loading");
    const { data, error } = await supabase.rpc("get_trainer_questions", { p_count: 10 });
    const usable = (data || []).filter((q) => Array.isArray(q.options) && q.options.length >= 2);
    if (error || usable.length < ROUNDS) {
      setPhase("empty");
      return;
    }
    setQuestions(usable.slice(0, ROUNDS));
    setRound(0);
    setYouPts(0);
    setBotPts(0);
    setDots([]);
    statsRef.current = { times: [], right: 0, dots: [], youPts: 0, botPts: 0 };
    setPhase("battle");
    startRound(0);
  };

  const startRound = (r) => {
    roundNumRef.current = r;
    setRound(r);
    lockRef.current = false;
    roundRef.current = { you: null, bot: null, botDone: false };
    setPicked(null);
    setReveal(false);
    setFlash(null);
    setBotLocked(false);
    setTfrac(1);
    t0Ref.current = Date.now();

    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const left = Math.max(0, ROUND_SECS - (Date.now() - t0Ref.current) / 1000);
      setTfrac(left / ROUND_SECS);
      if (left <= 0) {
        clearInterval(tickRef.current);
        handleTimeout();
      }
    }, 100);

    // schedule the bot
    const botTime = bot.min + Math.random() * (bot.max - bot.min);
    const botCorrect = Math.random() < bot.acc;
    clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      roundRef.current.bot = { correct: botCorrect, time: botTime };
      roundRef.current.botDone = true;
      setBotLocked(true);
      if (roundRef.current.you) settle();
    }, botTime * 1000);
  };

  const youLockIn = (correct, time) => {
    roundRef.current.you = { correct, time };
    statsRef.current.times.push(time);
    if (correct) statsRef.current.right += 1;
    if (roundRef.current.botDone) settle();
    else setFlash({ text: `Waiting for ${bot.name}…`, tone: "var(--c-text-tertiary)" });
  };

  const handleAnswer = (idx) => {
    if (reveal || lockRef.current) return;
    lockRef.current = true;
    clearInterval(tickRef.current);
    const q = questions[roundNumRef.current];
    const correct = !!q?.options[idx]?.isCorrect;
    setPicked(idx);
    setReveal(true);
    youLockIn(correct, (Date.now() - t0Ref.current) / 1000);
  };

  const handleTimeout = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setReveal(true);
    setPicked(null);
    setFlash({ text: "⏱ Time out.", tone: "var(--c-danger)" });
    youLockIn(false, ROUND_SECS);
  };

  const settle = () => {
    clearTimeout(botTimerRef.current);
    const { you, bot: b } = roundRef.current;
    const outcome = resolveRound(you, b);
    const s = statsRef.current;
    s.dots.push(outcome);
    if (outcome === "W") s.youPts += 1;
    if (outcome === "L") s.botPts += 1;
    setDots([...s.dots]);
    setYouPts(s.youPts);
    setBotPts(s.botPts);
    let msg, tone;
    if (outcome === "W") {
      msg = b.correct ? "Round yours! Both right — you were faster." : `Round yours! ${bot.name} got it wrong.`;
      tone = "var(--c-success)";
    } else if (outcome === "L") {
      msg = you.correct ? `${bot.name} takes the round — faster than you.` : `${bot.name} takes the round — you missed it.`;
      tone = "var(--c-danger)";
    } else {
      msg = "Round tied — both wrong.";
      tone = "var(--c-text-tertiary)";
    }
    setFlash({ text: msg, tone });
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      const nr = roundNumRef.current + 1;
      if (nr >= ROUNDS) {
        finish();
      } else {
        startRound(nr);
      }
    }, 1500);
  };

  const finish = async () => {
    const s = statsRef.current;
    const result = duelResult(s.youPts, s.botPts);
    const avg = s.times.length ? s.times.reduce((a, x) => a + x, 0) / s.times.length : 0;
    setLastStats({ result, right: s.right, avg, youPts: s.youPts, botPts: s.botPts });
    setPhase("done");
    if (userData?.email) {
      await supabase.from("trainer_runs").insert({
        user: userData.email,
        trainer: "duels",
        score: s.youPts,
        details: {
          result,
          bot: bot.id,
          bot_points: s.botPts,
          accuracy: Math.round((100 * s.right) / ROUNDS),
          avg_time: Math.round(avg * 10) / 10,
        },
      });
    }
  };

  const cardStyle = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: 16,
    boxShadow: "var(--c-shadow-xs)",
  };
  const q = questions[round];
  const dotColor = (d, mine) => {
    const win = mine ? d === "W" : d === "L";
    const lose = mine ? d === "L" : d === "W";
    if (win) return "var(--c-success)";
    if (lose) return "var(--c-danger)";
    return "var(--c-text-tertiary)";
  };

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mb-6 mt-10">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 mb-4"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", padding: 0 }}
        >
          <ArrowLeft size={15} /> DSB Challenge
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
          Skill Trainer · 1v1 Battle Arena
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.1 }}>
          <span className="ds-accent ds-grad-text">Duels.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 14.5, color: "var(--c-text-secondary)" }}>
          Five questions. Two fighters. Fastest correct answer takes the round — beat the bots before ranked mode arrives.
        </p>
      </header>

      {/* ── START / LOBBY ── */}
      {(phase === "start" || phase === "loading") && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <h2 className="ds-display" style={{ fontSize: 19 }}>Battle rules</h2>
          {[
            <><b>{ROUNDS} rounds</b>, one question each. You and your opponent answer the same question.</>,
            <>Correct + faster = <b style={{ color: "var(--c-success)" }}>round win</b>. Both correct? Speed decides. Both wrong? Round tied.</>,
            <><b>{ROUND_SECS} seconds</b> per round. The bot answers in its own time — you&apos;ll see when it locks in.</>,
            <>Win the duel to log a <b>W</b> on your record. Ranked duels vs real students arrive in Phase C.</>,
          ].map((r, d) => (
            <div key={d} className="flex gap-3 mt-3.5" style={{ fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.55 }}>
              <span className="grid place-items-center shrink-0" style={{ width: 26, height: 26, borderRadius: 8, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", fontWeight: 700, fontSize: 12 }}>
                {d + 1}
              </span>
              <span>{r}</span>
            </div>
          ))}

          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginTop: 22, marginBottom: 10 }}>
            Choose your opponent
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {BOTS.map((b) => {
              const rec = record[b.id];
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBot(b)}
                  style={{
                    background: bot.id === b.id ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted, var(--c-bg))",
                    border: `1px solid ${bot.id === b.id ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`,
                    borderRadius: 12, padding: "16px 10px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", color: "var(--c-text-primary)", transition: "border-color 0.12s",
                  }}
                >
                  <div style={{ fontSize: 28 }}>{b.av}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>{b.name}</div>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginTop: 3 }}>{b.tag}</div>
                  {rec && (
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: "var(--c-brand-gold)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {rec.w}W – {rec.l}L
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={begin}
              disabled={phase === "loading"}
              className="inline-flex items-center gap-2"
              style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit", opacity: phase === "loading" ? 0.7 : 1 }}
            >
              {phase === "loading" ? "Finding questions…" : "Enter the duel"} <ArrowRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_RUN} XP per duel · +{XP_WIN_BONUS} for a win</span>
          </div>
        </div>
      )}

      {/* ── EMPTY ── */}
      {phase === "empty" && (
        <div className="p-7 max-w-[760px]" style={cardStyle}>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>Couldn&apos;t load questions right now. Please try again in a moment.</p>
          <button type="button" onClick={() => setPhase("start")} className="mt-4" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 24px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Back
          </button>
        </div>
      )}

      {/* ── BATTLE ── */}
      {phase === "battle" && q && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          {/* HUD */}
          <div className="grid items-center gap-3 mb-5" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
            <div>
              <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 700 }}>
                <span>YOU</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{youPts}</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginTop: 5 }}>
                <div style={{ height: "100%", width: `${(youPts / ROUNDS) * 100}%`, background: "var(--c-mock-banner-btn-bg)", borderRadius: 8, transition: "width 0.4s ease" }} />
              </div>
              <div className="flex gap-1.5 mt-2">
                {Array.from({ length: ROUNDS }).map((_, i) => (
                  <span key={i} style={{ width: 9, height: 9, borderRadius: 99, background: dots[i] ? dotColor(dots[i], true) : "var(--c-surface-sunken, var(--c-surface-muted))" }} />
                ))}
              </div>
            </div>
            <div className="ds-display" style={{ fontSize: 17, color: "var(--c-text-tertiary)" }}>VS</div>
            <div>
              <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 700 }}>
                <span>{bot.av} {bot.name}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{botPts}</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginTop: 5 }}>
                <div style={{ height: "100%", width: `${(botPts / ROUNDS) * 100}%`, background: "var(--c-text-tertiary)", borderRadius: 8, transition: "width 0.4s ease" }} />
              </div>
              <div className="flex gap-1.5 mt-2 justify-end">
                {Array.from({ length: ROUNDS }).map((_, i) => (
                  <span key={i} style={{ width: 9, height: 9, borderRadius: 99, background: dots[i] ? dotColor(dots[i], false) : "var(--c-surface-sunken, var(--c-surface-muted))" }} />
                ))}
              </div>
            </div>
          </div>

          {/* round timer */}
          <div style={{ height: 4, borderRadius: 4, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${tfrac * 100}%`, background: tfrac <= 1 / 3 ? "var(--c-danger)" : "var(--c-brand-gold)", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
            Round {round + 1} / {ROUNDS}
          </div>

          {q.questionimage && (
            <img src={q.questionimage} alt="Question" style={{ maxHeight: "24vh", marginBottom: 14, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
          )}
          <div style={{ fontSize: 16, lineHeight: 1.6, color: "var(--c-text-primary)" }} dangerouslySetInnerHTML={{ __html: q.title }} />

          <div className="grid gap-2.5 mt-4">
            {q.options.map((o, d) => {
              let border = "var(--c-border-faint)";
              let bg = "var(--c-surface-muted, var(--c-bg))";
              if (reveal && o.isCorrect) {
                border = "var(--c-success)";
                bg = "var(--c-success-soft)";
              } else if (reveal && picked === d && !o.isCorrect) {
                border = "var(--c-danger)";
                bg = "var(--c-danger-soft)";
              }
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleAnswer(d)}
                  className="text-left"
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--c-text-primary)", cursor: reveal ? "default" : "pointer", fontFamily: "inherit", transition: "border-color 0.12s" }}
                >
                  <span style={{ fontWeight: 700, marginRight: 10, color: "var(--c-text-tertiary)" }}>{String.fromCharCode(65 + d)}.</span>
                  <span dangerouslySetInnerHTML={{ __html: o.title }} />
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", fontStyle: "italic", minHeight: 16, marginTop: 12 }}>
            {botLocked && !flash?.text?.startsWith("Round") ? `${bot.av} ${bot.name} has locked in…` : ""}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, minHeight: 18, marginTop: 4, color: flash?.tone }}>{flash?.text}</div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === "done" && lastStats && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div className="inline-flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: lastStats.result === "win" ? "var(--c-brand-gold)" : lastStats.result === "loss" ? "var(--c-danger)" : "var(--c-text-tertiary)", marginBottom: 8 }}>
            <Swords size={14} /> {lastStats.result === "win" ? "Victory" : lastStats.result === "loss" ? "Defeat" : "Draw"}
          </div>
          <h2 className="ds-display" style={{ fontSize: 25 }}>
            {lastStats.result === "win" ? "You won " : lastStats.result === "loss" ? "You lost " : "Draw — "}
            <span className="ds-grad-text">{lastStats.youPts} – {lastStats.botPts}</span>
          </h2>
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {[
              ["Rounds won", lastStats.youPts, "var(--c-success)"],
              ["Rounds lost", lastStats.botPts, "var(--c-danger)"],
              ["Avg answer time", `${lastStats.avg.toFixed(1)}s`, "var(--c-text-primary)"],
              ["Accuracy", `${Math.round((100 * lastStats.right) / ROUNDS)}%`, "var(--c-brand-gold)"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-[12px] border p-4" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div className="ds-display" style={{ fontSize: 25, marginTop: 6, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
            {verdictFor(lastStats.result, lastStats.right, bot.name)}
            <br />
            <br />
            XP: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN}</b>
            {lastStats.result === "win" && <b style={{ color: "var(--c-success)" }}> +{XP_WIN_BONUS} win bonus</b>}
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={begin} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Rematch <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => setPhase("start")} style={{ background: "transparent", color: "var(--c-text-secondary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-soft, var(--c-border-faint))", borderRadius: 999, padding: "11px 24px", cursor: "pointer", fontFamily: "inherit" }}>
              Change opponent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
