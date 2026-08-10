// ============================================================
// Badge Vault — DSB Challenge (Phase C, part 1).
// 19 achievement badges across four sections, computed entirely
// from existing activity via the get_my_badge_stats RPC + the
// student's total XP. Fully retroactive: past mocks, tests and
// trainer runs unlock badges the moment this ships.
//
// Pure logic (computeBadges, vaultSummary) exported for tests.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState } from "react";
import { levelFromXp } from "./DSBChallenge";

const TIER_ORDER = { legendary: 3, epic: 2, rare: 1, common: 0 };

// Pure: stats (from RPC) + totalXp → full badge list with states.
export function computeBadges(stats, totalXp) {
  const s = stats || {};
  const lvl = levelFromXp(totalXp || 0);
  const prog = (cur, max, label) => {
    const c = Math.max(0, Math.min(cur, max)); // clamp: no negative bars
    return { cur: c, max, label: label || `${c} / ${max}` };
  };
  const sosBest = Math.max(0, s.sos_best || 0);
  return [
    // ── Consistency ──
    { id: "first-steps", section: "Consistency", tier: "common", em: "🌱", name: "First Steps", desc: "Complete your first daily mission", unlocked: (s.streak_days || 0) >= 1, progress: prog(s.streak_days || 0, 1) },
    { id: "warming-up", section: "Consistency", tier: "common", em: "🔥", name: "Warming Up", desc: "3-day mission streak", unlocked: (s.streak_days || 0) >= 3, progress: prog(s.streak_days || 0, 3, `${Math.min(s.streak_days || 0, 3)} / 3 days`) },
    { id: "week-warrior", section: "Consistency", tier: "rare", em: "⚡", name: "Week Warrior", desc: "7-day mission streak", unlocked: (s.streak_days || 0) >= 7, progress: prog(s.streak_days || 0, 7, `${Math.min(s.streak_days || 0, 7)} / 7 days`) },
    { id: "iron-month", section: "Consistency", tier: "epic", em: "🗓️", name: "Iron Month", desc: "30-day mission streak", unlocked: (s.streak_days || 0) >= 30, progress: prog(s.streak_days || 0, 30, `${Math.min(s.streak_days || 0, 30)} / 30 days`) },
    // ── Mocks & Tests ──
    { id: "first-blood", section: "Mocks & Tests", tier: "common", em: "🎯", name: "First Blood", desc: "Attempt your first IPMAT mock", unlocked: (s.mock_count || 0) >= 1, progress: prog(s.mock_count || 0, 1) },
    { id: "mock-machine", section: "Mocks & Tests", tier: "rare", em: "🏭", name: "Mock Machine", desc: "10 full mocks attempted", unlocked: (s.mock_count || 0) >= 10, progress: prog(s.mock_count || 0, 10, `${Math.min(s.mock_count || 0, 10)} / 10 mocks`) },
    { id: "grinder", section: "Mocks & Tests", tier: "rare", em: "📚", name: "Grinder", desc: "25 concept or sectional tests", unlocked: (s.test_count || 0) >= 25, progress: prog(s.test_count || 0, 25, `${Math.min(s.test_count || 0, 25)} / 25 tests`) },
    { id: "century-club", section: "Mocks & Tests", tier: "epic", em: "🏛️", name: "Century Club", desc: "100 tests attempted", unlocked: (s.test_count || 0) >= 100, progress: prog(s.test_count || 0, 100, `${Math.min(s.test_count || 0, 100)} / 100 tests`) },
    // ── Skill Trainers ──
    { id: "decision-maker", section: "Skill Trainers", tier: "common", em: "🧠", name: "Decision Maker", desc: "Score 60+ in Skip or Solve", unlocked: sosBest >= 60, progress: prog(sosBest, 60, `best: ${sosBest}`) },
    { id: "trap-whisperer", section: "Skill Trainers", tier: "rare", em: "🎖️", name: "Trap Whisperer", desc: "Perfect Skip or Solve — no wrong answers, 80+ score", unlocked: !!s.sos_perfect, progress: prog(s.sos_perfect ? 1 : 0, 1, `best: ${sosBest}`) },
    { id: "survivor", section: "Skill Trainers", tier: "rare", em: "💀", name: "Survivor", desc: "Survive 10 in Sudden Death", unlocked: (s.sd_best || 0) >= 10, progress: prog(s.sd_best || 0, 10, `best: ${s.sd_best || 0} / 10`) },
    { id: "immortal", section: "Skill Trainers", tier: "epic", em: "☠️", name: "Immortal", desc: "Survive 20 in Sudden Death", unlocked: (s.sd_best || 0) >= 20, progress: prog(s.sd_best || 0, 20, `best: ${s.sd_best || 0} / 20`) },
    { id: "speed-reader", section: "Skill Trainers", tier: "rare", em: "👁️", name: "Speed Reader", desc: "350+ effective WPM in Gulp Protocol", unlocked: (s.gulp_best || 0) >= 350, progress: prog(s.gulp_best || 0, 350, `best: ${s.gulp_best || 0}`) },
    { id: "first-duel", section: "Skill Trainers", tier: "common", em: "⚔️", name: "First Duel", desc: "Win your first duel", unlocked: (s.duel_wins || 0) >= 1, progress: prog(s.duel_wins || 0, 1) },
    { id: "bot-slayer", section: "Skill Trainers", tier: "epic", em: "🤖", name: "Bot Slayer", desc: "Beat the AIR-1 Bot", unlocked: !!s.air1_slain, progress: prog(s.air1_slain ? 1 : 0, 1, s.air1_slain ? "slain" : "not yet") },
    { id: "gladiator", section: "Skill Trainers", tier: "rare", em: "🏟️", name: "Gladiator", desc: "10 duel wins", unlocked: (s.duel_wins || 0) >= 10, progress: prog(s.duel_wins || 0, 10, `${Math.min(s.duel_wins || 0, 10)} / 10 wins`) },
    // ── Levels ──
    { id: "marksman", section: "Levels", tier: "rare", em: "🌟", name: "Marksman", desc: "Reach Level 5", unlocked: lvl.level >= 5, progress: prog(totalXp || 0, 2400, `${(totalXp || 0).toLocaleString()} / 2,400 XP`) },
    { id: "elite", section: "Levels", tier: "epic", em: "💎", name: "Elite", desc: "Reach Level 8", unlocked: lvl.level >= 8, progress: prog(totalXp || 0, 7000, `${(totalXp || 0).toLocaleString()} / 7,000 XP`) },
    { id: "air-1-material", section: "Levels", tier: "legendary", em: "👑", name: "AIR 1 Material", desc: "Reach Level 10 — the vault's crown", unlocked: lvl.level >= 10, progress: prog(totalXp || 0, 12500, `${(totalXp || 0).toLocaleString()} / 12,500 XP`) },
  ];
}

// Pure: header summary — unlocked count, rarest unlocked, next closest locked.
export function vaultSummary(badges) {
  const unlocked = badges.filter((b) => b.unlocked);
  const rarest = unlocked.slice().sort((a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier])[0] || null;
  const locked = badges.filter((b) => !b.unlocked);
  const next = locked
    .slice()
    .sort((a, b) => b.progress.cur / b.progress.max - a.progress.cur / a.progress.max)[0] || null;
  return { total: badges.length, unlockedCount: unlocked.length, rarest, next };
}

// Pure: the compact shelf — every unlocked badge + the N closest locked ones.
export function compactShelf(badges, lockedCount = 4) {
  const unlocked = badges.filter((b) => b.unlocked);
  const closest = badges
    .filter((b) => !b.unlocked)
    .sort((a, b) => b.progress.cur / b.progress.max - a.progress.cur / a.progress.max)
    .slice(0, lockedCount);
  return [...unlocked, ...closest];
}

export default function BadgeVault({ userData, totalXp, onExpandChange }) {
  const [stats, setStats] = useState(null);
  const [showAll, setShowAllRaw] = useState(false);
  const setShowAll = (v) => {
    setShowAllRaw(v);
    if (onExpandChange) onExpandChange(typeof v === "function" ? v(showAll) : v);
  };

  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .rpc("get_my_badge_stats", { p_email: userData.email })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length) setStats(data[0]);
      });
  }, [userData?.email]);

  const badges = computeBadges(stats, totalXp);
  const summary = vaultSummary(badges);

  // ── One card, one grid (2026-08 cap): the compact shelf of small
  // tiles; "View full vault" wraps MORE tiles into the same grid —
  // the old elongated sectioned list is gone for good. ──
  const shelf = showAll ? badges : compactShelf(badges);
  return (
    <div className="rounded-[16px] border p-6" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)", boxShadow: "var(--c-shadow-xs)", flexShrink: 0 }}>
      <div className="ds-display" style={{ fontSize: 19 }}>Your vault</div>
      <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 3 }}>
        {summary.unlockedCount} of {summary.total} unlocked
        {summary.next && ` · next closest: ${summary.next.name}`}
      </div>
      <div className="grid grid-cols-4 gap-2.5 mt-4">
        {shelf.map((b) => (
          <div
            key={b.id}
            title={`${b.name} — ${b.desc}${b.unlocked ? "" : ` (${b.progress.label})`}`}
            style={{
              border: `1px solid ${b.unlocked ? "rgba(255, 182, 39, 0.45)" : "var(--c-border-faint)"}`,
              background: b.unlocked ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted, var(--c-bg))",
              borderRadius: 12,
              padding: "13px 4px 9px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, filter: b.unlocked ? "none" : "grayscale(1)", opacity: b.unlocked ? 1 : 0.4 }}>{b.em}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 6, color: b.unlocked ? "var(--c-brand-gold)" : "var(--c-text-tertiary)", lineHeight: 1.35 }}>
              {b.name}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowAll(!showAll)}
        className="mt-4"
        style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}
      >
        {showAll ? "Show less" : `View full vault (${summary.total} badges) →`}
      </button>
    </div>
  );
}
