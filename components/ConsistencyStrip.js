// ============================================================
// ConsistencyStrip — "Consistency engine" card on the Performance
// page (2026-09 design sprint 1). Surfaces the DSB layer where
// students (and later, parent report cards) actually look:
// missions banked this week, Weekly DI status, active days, and
// lifetime XP. All numbers come from trainer_runs (own-row RLS)
// and the existing get_my_xp RPC — nothing new server-side.
// Self-hides for students who have never run a trainer.
// ============================================================

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

function startOfWeekISO() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function ConsistencyStrip() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const email = u?.user?.email;
        if (!email) { if (alive) setData(false); return; }
        const [{ data: runs }, xpRes] = await Promise.all([
          supabase.from("trainer_runs").select("trainer,created_at").eq("user", email).gte("created_at", startOfWeekISO()).limit(500),
          supabase.rpc("get_my_xp", { p_email: email }),
        ]);
        const weekRuns = runs || [];
        if (!weekRuns.length && !(Array.isArray(xpRes?.data) && xpRes.data.length && xpRes.data[0].total_xp > 0)) {
          if (alive) setData(false);
          return;
        }
        const daily = weekRuns.filter((r) => ["daily-quiz", "gulp-protocol", "skip-or-solve"].includes(r.trainer));
        // one mission credit per trainer per day
        const missionKeys = new Set(daily.map((r) => `${r.trainer}-${String(r.created_at).slice(0, 10)}`));
        const days = new Set(weekRuns.map((r) => String(r.created_at).slice(0, 10)));
        const weeklyDi = weekRuns.some((r) => r.trainer === "weekly-di");
        const totalXp = Array.isArray(xpRes?.data) && xpRes.data.length ? xpRes.data[0].total_xp || 0 : 0;
        if (alive) setData({ missions: Math.min(21, missionKeys.size), days: days.size, weeklyDi, totalXp });
      } catch (e) {
        if (alive) setData(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (data === false || data === null) return null;

  const cell = (k, v, cap) => (
    <div style={{ padding: "4px 28px 4px 0", marginRight: 28, marginBottom: 8, borderRight: "1px solid var(--c-border-faint)" }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{k}</div>
      <div className="ds-stat-value" style={{ fontSize: 24, marginTop: 3, lineHeight: 1.15 }}>{v}</div>
      <div style={{ fontSize: 11, marginTop: 3, color: "var(--c-text-tertiary)" }}>{cap}</div>
    </div>
  );

  return (
    <div className="mt-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "20px 22px", flexShrink: 0 }}>
      <div className="ds-display" style={{ fontSize: 17 }}>Consistency engine</div>
      <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 2 }}>
        the daily-rep layer — marks follow the students who show up
      </div>
      <div className="flex items-stretch flex-wrap" style={{ marginTop: 12 }}>
        {cell("Missions this week", `${data.missions} / 21`, "3 daily trainers × 7 days")}
        {cell("Weekly DI", data.weeklyDi ? "banked ✓" : "not yet", data.weeklyDi ? "fresh set Monday" : "one set, resets Monday")}
        {cell("Active days this week", `${data.days} / 7`, "any trainer counts")}
        {cell("Total XP", data.totalXp, "all-time, cheat-proof")}
      </div>
    </div>
  );
}
