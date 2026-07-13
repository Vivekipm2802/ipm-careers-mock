// ============================================================
// Duels — DSB Challenge (Phase C: Practice bots + Ranked ghosts).
//
// PRACTICE: best-of-5 vs bots (Rookie Rohan / Sectional Sana /
// AIR-1 Bot). Unchanged from Phase B.
//
// RANKED: everyone gets the SAME 5 questions per IST day
// (get_daily_duel_set RPC). Your run records per-round correctness
// + time into duel_runs. Opponents are GHOSTS — a real student's
// recorded run on today's set, replayed live (get_ghost_run RPC).
// No student run today yet → Arena Bot, clearly labelled.
// Rating is DERIVED weekly: 1200 + 25·(wins − losses) this week
// (get_duel_ladder / get_my_duel_rank RPCs). Resets Monday.
//
// Pure logic exported for unit tests: resolveRound, duelResult,
// verdictFor, ratingFor, ghostRoundFor, BOTS, ARENA_BOT.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Swords, Zap } from "lucide-react";

export const XP_PER_RUN = 30;
export const XP_WIN_BONUS = 20;
export const ROUNDS = 5;
export const ROUND_SECS = 15;
export const BASE_RATING = 1200;
export const RATING_STEP = 25;

export const BOTS = [
  { id: "rookie-rohan", name: "Rookie Rohan", av: "🤓", acc: 0.6, min: 6, max: 12, tag: "60% acc · slow" },
  { id: "sectional-sana", name: "Sectional Sana", av: "😼", acc: 0.75, min: 4, max: 9, tag: "75% acc · medium" },
  { id: "air1-bot", name: "AIR-1 Bot", av: "🤖", acc: 0.9, min: 2, max: 6, tag: "90% acc · fast" },
];

// Fallback ranked opponent when no student has taken today's set yet.
export const ARENA_BOT = { id: "arena-bot", name: "Arena Bot", av: "🛡️", acc: 0.75, min: 4, max: 9 };

// Pure: outcome of one round. you/bot: { correct, time }
export function resolveRound(you, bot) {
  if (you.correct && (!bot.correct || you.time <= bot.time)) return "W";
  if (bot.correct && (!you.correct || bot.time < you.time)) return "L";
  return "T";
}

export function duelResult(youPts, botPts) {
  if (youPts > botPts) return "win";
  if (botPts > youPts) return "loss";
  return "draw";
}

// Pure: weekly derived rating.
export function ratingFor(wins, losses) {
  return BASE_RATING + RATING_STEP * ((wins || 0) - (losses || 0));
}

// Pure: the ghost's move for a question. rounds: [{q, c, t}]
// Missing round (shouldn't happen on the shared set) = wrong at full time.
export function ghostRoundFor(rounds, questionId) {
  const r = (rounds || []).find((x) => String(x.q) === String(questionId));
  return r ? { correct: !!r.c, time: Number(r.t) || ROUND_SECS } : { correct: false, time: ROUND_SECS };
}

export function verdictFor(result, right, botName) {
  if (result === "win" && botName === "AIR-1 Bot")
    return "You beat the AIR-1 Bot. 90% accuracy and lightning speed, and you still took it down. Ranked mode will suit you.";
  if (result === "win")
    return `Victory. You converted more, faster. Ratings climb one duel at a time — queue the next opponent.`;
  if (result === "loss" && right >= 3)
    return "Lost on speed, not knowledge. You answered well but too slowly. Trust your first read — hesitation is what beat you.";
  if (result === "loss")
    return `Beaten on accuracy. ${botName} converted more. A Skip or Solve run before the rematch sharpens exactly this.`;
  return "Dead even. One sharper round decides it next time. Rematch.";
}

// IST date string (YYYY-MM-DD) — the ranked day boundary.
export function istDate(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function Duels({ userData, onExit }) {
  const [mode, setMode] = useState("practice"); // practice | ranked
  const [phase, setPhase] = useState("start"); // start | loading | battle | done | empty
  const [bot, setBot] = useState(BOTS[1]); // practice opponent
  const [ghost, setGhost] = useState(null); // ranked opponent { name, rounds, when, isBot }
  const [questions, setQuestions] = useState([]);
  const [round, setRound] = useState(0);
  const [youPts, setYouPts] = useState(0);
  const [botPts, setBotPts] = useState(0);
  const [dots, setDots] = useState([]);
  const [tfrac, setTfrac] = useState(1);
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [flash, setFlash] = useState(null);
  const [botLocked, setBotLocked] = useState(false);
  const [record, setRecord] = useState({});
  const [ladder, setLadder] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [lastStats, setLastStats] = useState(null);

  const t0Ref = useRef(0);
  const roundNumRef = useRef(0);
  const tickRef = useRef(null);
  const botTimerRef = useRef(null);
  const advanceRef = useRef(null);
  const lockRef = useRef(false);
  const roundRef = useRef({ you: null, bot: null, botDone: false });
  const statsRef = useRef({ times: [], right: 0, dots: [], youPts: 0, botPts: 0, rounds: [] });
  const modeRef = useRef("practice");
  const ghostRef = useRef(null);

  // practice W–L per bot
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

  // ranked ladder + my rank
  const refreshLadder = () => {
    supabase.rpc("get_duel_ladder").then(({ data, error }) => {
      if (!error && Array.isArray(data)) setLadder(data);
    });
    if (userData?.email) {
      supabase.rpc("get_my_duel_rank", { p_email: userData.email }).then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length) setMyRank(data[0]);
      });
    }
  };
  useEffect(() => {
    refreshLadder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.email]);

  useEffect(
    () => () => {
      clearInterval(tickRef.current);
      clearTimeout(botTimerRef.current);
      clearTimeout(advanceRef.current);
    },
    []
  );

  // ── begin: practice ──
  const beginPractice = async () => {
    modeRef.current = "practice";
    ghostRef.current = null;
    setGhost(null);
    setPhase("loading");
    const { data, error } = await supabase.rpc("get_trainer_questions", { p_count: 10 });
    const usable = (data || []).filter(
      (q) => Array.isArray(q.options) && q.options.length >= 2 && (q.title || q.question)
    );
    if (error || usable.length < ROUNDS) {
      setPhase("empty");
      return;
    }
    launch(usable.slice(0, ROUNDS));
  };

  // ── begin: ranked ──
  const beginRanked = async () => {
    modeRef.current = "ranked";
    setPhase("loading");
    const [setRes, ghostRes] = await Promise.all([
      supabase.rpc("get_daily_duel_set"),
      supabase.rpc("get_ghost_run", { p_email: userData?.email || "" }),
    ]);
    const usable = (setRes.data || []).filter(
      (q) => Array.isArray(q.options) && q.options.length >= 2 && (q.title || q.question)
    );
    if (setRes.error || usable.length < 3) {
      setPhase("empty");
      return;
    }
    const g = ghostRes.data?.[0];
    const opponent = g
      ? { name: g.name, rounds: g.rounds || [], when: g.taken_at, isBot: false }
      : { name: ARENA_BOT.name, rounds: null, when: null, isBot: true };
    ghostRef.current = opponent;
    setGhost(opponent);
    launch(usable.slice(0, ROUNDS));
  };

  const launch = (qs) => {
    setQuestions(qs);
    setRound(0);
    setYouPts(0);
    setBotPts(0);
    setDots([]);
    statsRef.current = { times: [], right: 0, dots: [], youPts: 0, botPts: 0, rounds: [] };
    setPhase("battle");
    startRound(0, qs);
  };

  const opponentMove = (q) => {
    // ranked ghost: recorded move; ranked no-ghost or practice: simulated bot
    const g = ghostRef.current;
    if (modeRef.current === "ranked" && g && !g.isBot) {
      return ghostRoundFor(g.rounds, q.id);
    }
    const b = modeRef.current === "ranked" ? ARENA_BOT : bot;
    return {
      correct: Math.random() < b.acc,
      time: b.min + Math.random() * (b.max - b.min),
    };
  };

  const startRound = (r, qs) => {
    const allQ = qs || questions;
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

    const move = opponentMove(allQ[r]);
    clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      roundRef.current.bot = move;
      roundRef.current.botDone = true;
      setBotLocked(true);
      if (roundRef.current.you) settle();
    }, Math.min(move.time, ROUND_SECS) * 1000);
  };

  const youLockIn = (correct, time) => {
    const q = questions[roundNumRef.current];
    roundRef.current.you = { correct, time };
    statsRef.current.times.push(time);
    statsRef.current.rounds.push({ q: q?.id, c: correct, t: Math.round(time * 10) / 10 });
    if (correct) statsRef.current.right += 1;
    if (roundRef.current.botDone) settle();
    else setFlash({ text: `Waiting for ${opponentName()}…`, tone: "var(--c-text-tertiary)" });
  };

  const opponentName = () =>
    modeRef.current === "ranked" ? ghostRef.current?.name || "opponent" : bot.name;

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
    const nm = opponentName();
    let msg, tone;
    if (outcome === "W") {
      msg = b.correct
        ? `Round yours! Both right — you were faster (${you.time.toFixed(1)}s vs ${b.time.toFixed(1)}s).`
        : `Round yours! ${nm} got it wrong.`;
      tone = "var(--c-success)";
    } else if (outcome === "L") {
      msg = you.correct
        ? `${nm} takes it — ${b.time.toFixed(1)}s vs your ${you.time.toFixed(1)}s.`
        : `${nm} takes the round — you missed it.`;
      tone = "var(--c-danger)";
    } else {
      msg = "Round tied — both wrong.";
      tone = "var(--c-text-tertiary)";
    }
    setFlash({ text: msg, tone });
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      const nr = roundNumRef.current + 1;
      if (nr >= Math.min(ROUNDS, questions.length)) finish();
      else startRound(nr);
    }, 1500);
  };

  const finish = async () => {
    const s = statsRef.current;
    const result = duelResult(s.youPts, s.botPts);
    const avg = s.times.length ? s.times.reduce((a, x) => a + x, 0) / s.times.length : 0;
    setLastStats({ result, right: s.right, avg, youPts: s.youPts, botPts: s.botPts });
    setPhase("done");
    if (!userData?.email) return;
    const ranked = modeRef.current === "ranked";
    const inserts = [
      supabase.from("trainer_runs").insert({
        user: userData.email,
        trainer: "duels",
        score: s.youPts,
        details: ranked
          ? { result, mode: "ranked", opponent: ghostRef.current?.name || "arena-bot", bot_points: s.botPts, accuracy: Math.round((100 * s.right) / ROUNDS), avg_time: Math.round(avg * 10) / 10 }
          : { result, bot: bot.id, bot_points: s.botPts, accuracy: Math.round((100 * s.right) / ROUNDS), avg_time: Math.round(avg * 10) / 10 },
      }),
    ];
    if (ranked) {
      // duel_date is filled by the DB default (IST date, server clock) —
      // never trust the student's device clock for the day boundary.
      inserts.push(
        supabase.from("duel_runs").insert({
          user: userData.email,
          rounds: s.rounds,
        })
      );
    }
    await Promise.all(inserts);
    if (ranked) refreshLadder();
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
  const isRanked = mode === "ranked";
  const myRating = myRank ? ratingFor(myRank.wins, myRank.losses) : BASE_RATING;
  const pill = (active) => ({
    background: active ? "var(--c-brand-gold-tint)" : "transparent",
    border: `1px solid ${active ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`,
    color: active ? "var(--c-brand-gold)" : "var(--c-text-secondary)",
    borderRadius: 999, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  });

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
          {isRanked
            ? "Same five questions for everyone today. Beat real IPM Careers students — their real answers, at their real speed."
            : "Five questions. Two fighters. Fastest correct answer takes the round."}
        </p>
      </header>

      {/* mode tabs (hidden mid-battle) */}
      {(phase === "start" || phase === "empty") && (
        <div className="flex gap-2 mb-4">
          <button type="button" style={pill(!isRanked)} onClick={() => { setMode("practice"); setPhase("start"); }}>
            Practice · bots
          </button>
          <button type="button" style={pill(isRanked)} onClick={() => { setMode("ranked"); setPhase("start"); }}>
            <Zap size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "-2px" }} />
            Ranked · real students
          </button>
        </div>
      )}

      {/* ── PRACTICE LOBBY ── */}
      {!isRanked && (phase === "start" || phase === "loading") && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <h2 className="ds-display" style={{ fontSize: 19 }}>Battle rules</h2>
          {[
            <><b>{ROUNDS} rounds</b>, one question each. You and your opponent answer the same question.</>,
            <>Correct + faster = <b style={{ color: "var(--c-success)" }}>round win</b>. Both correct? Speed decides. Both wrong? Round tied.</>,
            <><b>{ROUND_SECS} seconds</b> per round. The bot answers in its own time — you&apos;ll see when it locks in.</>,
            <>Practice is rating-free. When you&apos;re ready, switch to <b>Ranked</b> and face real students.</>,
          ].map((r, d) => (
            <div key={d} className="flex gap-3 mt-3.5" style={{ fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.55 }}>
              <span className="grid place-items-center shrink-0" style={{ width: 26, height: 26, borderRadius: 8, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", fontWeight: 700, fontSize: 12 }}>{d + 1}</span>
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
                <button key={b.id} type="button" onClick={() => setBot(b)}
                  style={{ background: bot.id === b.id ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted, var(--c-bg))", border: `1px solid ${bot.id === b.id ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`, borderRadius: 12, padding: "16px 10px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", color: "var(--c-text-primary)" }}>
                  <div style={{ fontSize: 28 }}>{b.av}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>{b.name}</div>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginTop: 3 }}>{b.tag}</div>
                  {rec && (
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: "var(--c-brand-gold)", fontFamily: "'JetBrains Mono', monospace" }}>{rec.w}W – {rec.l}L</div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button type="button" onClick={beginPractice} disabled={phase === "loading"} className="inline-flex items-center gap-2"
              style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit", opacity: phase === "loading" ? 0.7 : 1 }}>
              {phase === "loading" ? "Finding questions…" : "Enter the duel"} <ArrowRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_RUN} XP per duel · +{XP_WIN_BONUS} for a win</span>
          </div>
        </div>
      )}

      {/* ── RANKED LOBBY ── */}
      {isRanked && (phase === "start" || phase === "loading") && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <h2 className="ds-display" style={{ fontSize: 19 }}>Today&apos;s arena</h2>
            <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>duel set rotates at midnight · ladder resets Monday</span>
          </div>
          <div className="flex gap-3 mt-4 flex-wrap">
            {[
              ["Your duel rating", myRating.toLocaleString(), "var(--c-brand-gold)"],
              ["This week", myRank ? `${myRank.wins}W – ${myRank.losses}L` : "0W – 0L", "var(--c-text-primary)"],
              ["Ladder position", myRank?.rank ? `#${myRank.rank}` : "—", "var(--c-text-primary)"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-[12px] border px-4 py-3" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div className="ds-display" style={{ fontSize: 21, marginTop: 3, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", margin: "18px 0 8px" }}>
            This week&apos;s ladder
          </div>
          {ladder.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", padding: "10px 0" }}>
              The ladder fills as students duel this week — be the first.
            </div>
          )}
          {ladder.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[10px] px-4 py-2 mb-1" style={{ background: i < 3 ? "var(--c-brand-gold-tint)" : "transparent" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: i < 3 ? "var(--c-brand-gold)" : "var(--c-text-tertiary)", width: 30 }}>#{r.rank}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
              <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{ratingFor(r.wins, r.losses).toLocaleString()}</span>
            </div>
          ))}

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button type="button" onClick={beginRanked} disabled={phase === "loading"} className="inline-flex items-center gap-2"
              style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit", opacity: phase === "loading" ? 0.7 : 1 }}>
              {phase === "loading" ? "Scanning the arena…" : "Find opponent"} <ArrowRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_RUN} XP per duel · +{XP_WIN_BONUS} win · rating ±{RATING_STEP}</span>
          </div>
        </div>
      )}

      {/* ── EMPTY ── */}
      {phase === "empty" && (
        <div className="p-7 max-w-[760px]" style={cardStyle}>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>Couldn&apos;t load questions right now. Please try again in a moment.</p>
          <button type="button" onClick={() => setPhase("start")} className="mt-4" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 24px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Back</button>
        </div>
      )}

      {/* ── BATTLE ── */}
      {phase === "battle" && q && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          {modeRef.current === "ranked" && ghost && (
            <div className="inline-flex items-center gap-2 mb-4" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ghost.isBot ? "var(--c-text-tertiary)" : "var(--c-brand-gold)", background: ghost.isBot ? "var(--c-surface-muted, var(--c-bg))" : "var(--c-brand-gold-tint)", borderRadius: 999, padding: "5px 12px" }}>
              {ghost.isBot ? "🛡️ Arena Bot — no student runs yet today" : `⚡ ${ghost.name} · real student run · recorded today`}
            </div>
          )}
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
                <span>{modeRef.current === "ranked" ? `${ghost?.isBot ? "🛡️" : "🧑‍🎓"} ${opponentName()}` : `${bot.av} ${bot.name}`}</span>
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

          <div style={{ height: 4, borderRadius: 4, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${tfrac * 100}%`, background: tfrac <= 1 / 3 ? "var(--c-danger)" : "var(--c-brand-gold)", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
            Round {round + 1} / {Math.min(ROUNDS, questions.length)}{modeRef.current === "ranked" ? " · today's shared set" : ""}
          </div>

          {q.questionimage && (
            <img src={q.questionimage} alt="Question" style={{ maxWidth: "100%", maxHeight: "24vh", marginBottom: 14, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />
          )}
          {q.title && (
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: "var(--c-text-primary)" }}>{q.title}</div>
          )}
          {q.question && (
            <div className={"qcontent " + (q.title ? "mt-2" : "")} style={{ fontSize: 15, lineHeight: 1.6, color: "var(--c-text-primary)", maxHeight: "30vh", overflowY: "auto", overflowX: "auto", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: q.question }} />
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

          <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", fontStyle: "italic", minHeight: 16, marginTop: 12 }}>
            {botLocked && !flash?.text?.startsWith("Round") ? `${opponentName()} has locked in…` : ""}
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
            {lastStats.result === "win" ? `You beat ${modeRef.current === "ranked" ? opponentName() : bot.name} ` : lastStats.result === "loss" ? `${modeRef.current === "ranked" ? opponentName() : bot.name} wins ` : "Draw — "}
            <span className="ds-grad-text">{lastStats.youPts} – {lastStats.botPts}</span>
          </h2>
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {(modeRef.current === "ranked"
              ? [
                  ["Rating change", lastStats.result === "win" ? `+${RATING_STEP}` : lastStats.result === "loss" ? `−${RATING_STEP}` : "±0", lastStats.result === "win" ? "var(--c-success)" : lastStats.result === "loss" ? "var(--c-danger)" : "var(--c-text-tertiary)"],
                  ["Accuracy", `${Math.round((100 * lastStats.right) / ROUNDS)}%`, "var(--c-brand-gold)"],
                  ["Avg answer time", `${lastStats.avg.toFixed(1)}s`, "var(--c-text-primary)"],
                ]
              : [
                  ["Rounds won", lastStats.youPts, "var(--c-success)"],
                  ["Rounds lost", lastStats.botPts, "var(--c-danger)"],
                  ["Avg answer time", `${lastStats.avg.toFixed(1)}s`, "var(--c-text-primary)"],
                  ["Accuracy", `${Math.round((100 * lastStats.right) / ROUNDS)}%`, "var(--c-brand-gold)"],
                ]
            ).map(([l, v, c]) => (
              <div key={l} className="rounded-[12px] border p-4" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div className="ds-display" style={{ fontSize: 25, marginTop: 6, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
            {verdictFor(lastStats.result, lastStats.right, modeRef.current === "ranked" ? opponentName() : bot.name)}
            <br />
            <br />
            XP: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN}</b>
            {lastStats.result === "win" && <b style={{ color: "var(--c-success)" }}> +{XP_WIN_BONUS} win bonus</b>}
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={modeRef.current === "ranked" ? beginRanked : beginPractice} className="inline-flex items-center gap-2"
              style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {modeRef.current === "ranked" ? "Next opponent" : "Rematch"} <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => setPhase("start")}
              style={{ background: "transparent", color: "var(--c-text-secondary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-soft, var(--c-border-faint))", borderRadius: 999, padding: "11px 24px", cursor: "pointer", fontFamily: "inherit" }}>
              Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
