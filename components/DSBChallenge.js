// ============================================================
// DSB Challenge — Phase A (XP + missions + weekly arena)
// The DSB Challenge game layer, merged into the portal as the
// single engagement system. XP is DERIVED from existing activity
// tables (mock_plays / plays / daily_rc_submissions) via RPCs —
// no new writes, cheat-proof, and retroactive: students get their
// historical XP the moment this ships.
// Phase B ports the four skill trainers; Phase C adds badges +
// ranked Duels. Cards for those are shown as "coming soon".
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useNMNContext } from "./NMNContext";
import { Flame, Target, Swords, Skull, Zap, ArrowRight } from "lucide-react";
import SkipOrSolve from "./SkipOrSolve";
import SuddenDeath from "./SuddenDeath";
import GulpProtocol from "./GulpProtocol";
import Duels from "./Duels";

// Cumulative XP thresholds; index = level - 1
const LEVELS = [0, 300, 800, 1500, 2400, 3500, 5000, 7000, 9500, 12500];
const LEVEL_NAMES = [
  "Rookie", "Cadet", "Elite Cadet", "Veteran", "Marksman",
  "Sharpshooter", "Relentless", "Elite", "Legend", "AIR 1 Material",
];

export function levelFromXp(xp) {
  let lvl = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lvl = i + 1;
  const cur = LEVELS[lvl - 1];
  const next = LEVELS[lvl] ?? null;
  return {
    level: lvl,
    name: LEVEL_NAMES[lvl - 1] || "Legend",
    progress: next ? Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) : 100,
    toNext: next ? next - xp : 0,
  };
}

export default function DSBChallenge({ userData }) {
  const { setCTXSlug, setSK } = useNMNContext();
  const [xp, setXp] = useState(null); // { total_xp, weekly_xp }
  const [board, setBoard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [todayDaily, setTodayDaily] = useState(false);
  const [todayPlay, setTodayPlay] = useState(false);
  const [todayMock, setTodayMock] = useState(false);
  const [activeTrainer, setActiveTrainer] = useState(null); // "skip-or-solve" | null

  useEffect(() => {
    if (!userData?.email) return;
    supabase.rpc("get_my_xp", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length) setXp(data[0]);
    });
    supabase.rpc("get_weekly_xp_leaderboard").then(({ data, error }) => {
      if (!error && Array.isArray(data)) setBoard(data);
    });
    supabase.rpc("get_my_weekly_xp_rank", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length) setMyRank(data[0]);
    });

    // Today's missions — computed from the student's own activity (RLS-scoped)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const iso = startOfToday.toISOString();
    supabase
      .from("daily_rc_submissions")
      .select("created_at")
      .gte("created_at", iso)
      .limit(1)
      .then(({ data }) => setTodayDaily(!!(data && data.length)));
    supabase
      .from("plays")
      .select("created_at")
      .eq("user", userData.email)
      .gte("created_at", iso)
      .limit(1)
      .then(({ data }) => setTodayPlay(!!(data && data.length)));
    supabase
      .from("mock_plays")
      .select("created_at")
      .eq("user", userData.email)
      .gte("created_at", iso)
      .limit(1)
      .then(({ data }) => setTodayMock(!!(data && data.length)));
  }, [userData?.email]);

  const lvl = useMemo(() => levelFromXp(xp?.total_xp || 0), [xp]);
  const missionsDone = [todayDaily, todayPlay, todayMock].filter(Boolean).length;

  const goTo = (slug, key) => {
    setCTXSlug(slug);
    if (key) setSK(new Set([key]));
  };

  const missions = [
    {
      done: todayDaily,
      title: "Daily quiz",
      sub: "QA, VA or LR — keep the streak alive",
      xp: "+40 XP",
      onClick: () => goTo("currentaffairs", "3"),
    },
    {
      done: todayPlay,
      title: "One concept or sectional test",
      sub: "Fix one weak topic today",
      xp: "+50 XP",
      onClick: () => goTo("test", "2"),
    },
    {
      done: todayMock,
      title: "Attempt the open mock",
      sub: "Full length, exam conditions",
      xp: "+100 XP",
      onClick: () => goTo("mocks", "2"),
    },
  ];

  const trainers = [
    { Icon: Target, name: "Skip or Solve", tag: "Decision trainer", desc: "8 seconds a question: solve the scorers, skip the traps.", live: true, open: () => setActiveTrainer("skip-or-solve") },
    { Icon: Zap, name: "Gulp Protocol", tag: "Speed reading", desc: "Process 3–5 word chunks at 350+ WPM. Built for VA's reading load.", live: true, open: () => setActiveTrainer("gulp-protocol") },
    { Icon: Swords, name: "Duels", tag: "1v1 battle arena", desc: "Five-question MCQ battles vs bots. Ranked mode arrives with Phase C.", live: true, open: () => setActiveTrainer("duels") },
    { Icon: Skull, name: "Sudden Death", tag: "One wrong = out", desc: "No second chances. How long can you survive?", red: true, live: true, open: () => setActiveTrainer("sudden-death") },
  ];

  if (activeTrainer === "skip-or-solve") {
    return <SkipOrSolve userData={userData} onExit={() => setActiveTrainer(null)} />;
  }
  if (activeTrainer === "sudden-death") {
    return <SuddenDeath userData={userData} onExit={() => setActiveTrainer(null)} />;
  }
  if (activeTrainer === "gulp-protocol") {
    return <GulpProtocol userData={userData} onExit={() => setActiveTrainer(null)} />;
  }
  if (activeTrainer === "duels") {
    return <Duels userData={userData} onExit={() => setActiveTrainer(null)} />;
  }

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {/* ── Header ── */}
      <header className="mb-7 mt-10">
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
          DSB Challenge
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4.2vw, 40px)", lineHeight: 1.1, color: "var(--c-text-primary)" }}>
          Level up your <span className="ds-accent ds-grad-text">IPMAT game.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)" }}>
          Daily missions, skill trainers and the all-India arena — every rep earns XP.
        </p>
      </header>

      {/* ── Missions + Level ── */}
      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-4 mb-8">
        <div className="rounded-[16px] border p-6" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)", boxShadow: "var(--c-shadow-xs)" }}>
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="ds-display" style={{ fontSize: 20, color: "var(--c-text-primary)" }}>Today's missions</h2>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
              {missionsDone} / 3 done · resets 12:00 AM
            </span>
          </div>
          {missions.map((m) => (
            <div
              key={m.title}
              onClick={m.done ? undefined : m.onClick}
              className="flex items-center gap-3 rounded-[12px] border px-4 py-3 mb-2"
              style={{
                background: "var(--c-surface-muted, var(--c-bg))",
                borderColor: "var(--c-border-faint)",
                opacity: m.done ? 0.6 : 1,
                cursor: m.done ? "default" : "pointer",
              }}
            >
              <div className="grid place-items-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, background: m.done ? "var(--c-success-soft)" : "var(--c-brand-gold-tint)", color: m.done ? "var(--c-success)" : "var(--c-brand-gold)", fontSize: 15, fontWeight: 700 }}>
                {m.done ? "✓" : <Flame size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--c-text-primary)" }}>{m.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>{m.sub}</div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: m.done ? "var(--c-success)" : "var(--c-brand-gold)", whiteSpace: "nowrap" }}>
                {m.xp}
              </div>
            </div>
          ))}
          <div className="mt-3 inline-flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
            Tap a mission to jump straight to it <ArrowRight size={13} />
          </div>
        </div>

        <div className="rounded-[16px] border p-6 flex flex-col" style={{ background: "var(--c-surface)", borderColor: "var(--c-mock-banner-line)", boxShadow: "var(--c-shadow-xs)" }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>Your level</div>
          <div className="ds-grad-text ds-display" style={{ fontSize: 30, marginTop: 8, letterSpacing: "-0.02em" }}>
            Level {lvl.level} — {lvl.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--c-text-secondary)", marginTop: 4 }}>
            <b style={{ color: "var(--c-text-primary)" }}>{(xp?.total_xp || 0).toLocaleString()} XP</b>
            {lvl.toNext > 0 ? ` · ${lvl.toNext.toLocaleString()} to Level ${lvl.level + 1}` : " · max level"}
          </div>
          <div style={{ height: 8, borderRadius: 8, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginTop: 14 }}>
            <div style={{ height: "100%", width: `${lvl.progress}%`, background: "var(--c-mock-banner-btn-bg)" }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 8 }}>
            This week: <b style={{ color: "var(--c-brand-gold)" }}>{(xp?.weekly_xp || 0).toLocaleString()} XP</b>
          </div>
          <div style={{ marginTop: 16, borderTop: "1px dashed var(--c-border-soft)", paddingTop: 12, fontSize: 12, color: "var(--c-text-secondary)", lineHeight: 1.7 }}>
            XP comes from everything: <b style={{ color: "var(--c-brand-gold)" }}>mocks +100</b> ·{" "}
            <b style={{ color: "var(--c-brand-gold)" }}>tests +50</b> ·{" "}
            <b style={{ color: "var(--c-brand-gold)" }}>daily quizzes +10/answer</b> ·{" "}
            <b style={{ color: "var(--c-brand-gold)" }}>trainer runs +30</b>. Your entire history already counts.
          </div>
        </div>
      </div>

      {/* ── Skill trainers (Phase B) ── */}
      <div className="flex justify-between items-baseline mb-3">
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>Skill trainers</div>
        <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>unique to IPM Careers</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {trainers.map(({ Icon, name, tag, desc, red, live, open }) => (
          <div
            key={name}
            onClick={live ? open : undefined}
            className="rounded-[14px] border p-5 transition-all"
            style={{
              background: "var(--c-surface)",
              borderColor: live ? "var(--c-mock-banner-line)" : "var(--c-border-faint)",
              opacity: live ? 1 : 0.75,
              cursor: live ? "pointer" : "default",
              boxShadow: live ? "var(--c-shadow-xs)" : "none",
            }}
          >
            <div className="grid place-items-center mb-3" style={{ width: 38, height: 38, borderRadius: 12, background: red ? "var(--c-danger-soft)" : "var(--c-brand-gold-tint)", color: red ? "var(--c-danger)" : "var(--c-brand-gold)" }}>
              <Icon size={18} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text-primary)" }}>{name}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: red ? "var(--c-danger)" : "var(--c-brand-gold)", margin: "3px 0 7px" }}>{tag}</div>
            <p style={{ fontSize: 12, color: "var(--c-text-secondary)", lineHeight: 1.55 }}>{desc}</p>
            {live ? (
              <div className="inline-flex items-center gap-1.5" style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: "var(--c-brand-gold)" }}>
                Play now <ArrowRight size={13} />
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>Coming soon</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Weekly arena ── */}
      <div className="flex justify-between items-baseline mb-3">
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>This week's arena</div>
        <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>XP earned this week · resets Monday</span>
      </div>
      <div className="rounded-[16px] border p-6 mb-10" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)", boxShadow: "var(--c-shadow-xs)" }}>
        {board.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", textAlign: "center", padding: "18px 0" }}>
            The arena fills as students earn XP this week — be the first on the board.
          </div>
        )}
        {board.slice(0, 10).map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[10px] px-4 py-2.5 mb-1.5" style={{ background: i < 3 ? "var(--c-brand-gold-tint)" : "transparent" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: i < 3 ? "var(--c-brand-gold)" : "var(--c-text-tertiary)", width: 30 }}>#{r.rank ?? i + 1}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--c-text-primary)" }}>{r.name}</span>
            <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "var(--c-text-primary)" }}>{r.xp}</span>
          </div>
        ))}
        {myRank?.rank && (
          <div className="flex items-center gap-3 rounded-[10px] px-4 py-2.5 mt-2 border" style={{ background: "var(--c-brand-gold-tint)", borderColor: "var(--c-mock-banner-line)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", width: 30 }}>#{myRank.rank}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--c-brand-gold)" }}>You</span>
            <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "var(--c-text-primary)" }}>{myRank.xp}</span>
          </div>
        )}
      </div>
    </div>
  );
}
