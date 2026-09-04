// ============================================================
// lib/trainerReport.js — persistence for DSB trainer run REVIEW.
// 2026-09 no-re-attempts overhaul: once a mission is banked for the
// day, the trainer reopens in read-only review of TODAY'S run. The
// run detail ({questions seen, answers/calls, verdicts}) is stored
// INSIDE trainer_runs.details (jsonb) under a `report` key — no
// schema change needed. Feature-detect on write: if the insert with
// the report fails (row too large / column policy), we retry the
// plain insert so XP banking NEVER breaks, and mirror the report to
// localStorage so review still works on this device (the same
// graceful-degrade pattern as user_doubts).
// ============================================================

import { supabase } from "@/utils/supabaseClient";

export function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function lsKey(email, trainer) {
  return `dsb_report_${email || "anon"}_${trainer}_${todayKey()}`;
}

export function saveLocalReport(email, trainer, report) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(lsKey(email, trainer), JSON.stringify(report));
    }
  } catch {
    /* storage full / private mode — review just won't be available locally */
  }
}

export function loadLocalReport(email, trainer) {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(lsKey(email, trainer));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Insert the run WITH the review report embedded in details.report.
// Falls back to a plain insert (no report) if the first write errors,
// so the mission still banks and XP still counts.
export async function saveRunWithReport({ email, trainer, score, details, report }) {
  if (!email) return;
  saveLocalReport(email, trainer, report); // belt and braces for review
  const withReport = { ...details, report };
  const { error } = await supabase.from("trainer_runs").insert({
    user: email,
    trainer,
    score,
    details: withReport,
  });
  if (error) {
    await supabase.from("trainer_runs").insert({
      user: email,
      trainer,
      score,
      details, // plain — never lose the banked run over the report blob
    });
  }
}

// Read TODAY'S run for this trainer. Prefers the DB report
// (details.report), falls back to the localStorage mirror.
export async function loadTodayRun(email, trainer) {
  if (!email) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("trainer_runs")
    .select("id, created_at, score, details")
    .eq("user", email)
    .eq("trainer", trainer)
    .gte("created_at", startOfToday.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.length) {
    const local = loadLocalReport(email, trainer);
    return local ? { score: local.score ?? null, details: null, report: local } : null;
  }
  const row = data[0];
  const report = row.details?.report || loadLocalReport(email, trainer) || null;
  return { score: row.score, details: row.details, report };
}
