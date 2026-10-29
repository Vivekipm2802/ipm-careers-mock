// ============================================================
// lib/playTiming.js — per-question / per-section / total time for a
// mock play (2026-10-29).
//
// Why: report entries carry `at` = seconds elapsed ON THE RUNNER'S
// TIMER at answer time. For LOCKED-section mocks (switch_section
// false) that timer RESTARTS at 0 for every section, so `at` is a
// per-section clock. The result + analytics pages used to sort ALL
// entries by `at` on one timeline, which interleaved the three
// sections and produced nonsense (owner saw VA 3m / total 50m on an
// IIM B mock that ran ~2h).
//
// Resolution order:
//   1. entries carry `ts` (global seconds since test start, recorded
//      by the runner from 2026-10-29) → one true timeline.
//   2. legacy, locked test → group by section, each section on its
//      own clock from 0.
//   3. legacy, switchable test → `at` IS global → one timeline.
//
// Input:  report        — play.report array
//         sectionOfQ    — Map(String(questionId) → sectionId)
//         locked        — true when the test runs sections in order
//         durationSec   — wall-clock duration column (may be null)
// Output: { qTimes: Map(qid → s), secTimes: Map(secId → s), totalSec }
// ============================================================

const MAX_Q = 7200; // ignore absurd single deltas (stale tab etc.)

function timeline(entries, key) {
  const sorted = entries.slice().sort((a, b) => a[key] - b[key]);
  const out = new Map();
  let prev = 0;
  for (const r of sorted) {
    const t = r[key] - prev;
    if (t >= 0 && t < MAX_Q) out.set(String(r.id), t);
    prev = r[key];
  }
  return out;
}

// `sections` (optional): ordered [{ id, time }] — lets a LOCKED legacy
// play be placed on a true test-wide timeline: a locked section only ends
// when its timer does, so section k starts at the sum of earlier limits.
// `globalAt` (Map qid → seconds since test start) feeds timeline insights
// (accuracy by quarter, late wrongs) that must not use raw per-section `at`.
function computePlayTimes({ report, sectionOfQ, sections, locked, durationSec }) {
  const qTimes = new Map();
  const secTimes = new Map();
  const globalAt = new Map();
  const rows = (Array.isArray(report) ? report : []).filter(
    (r) => r && r.id != null && (typeof r.ts === "number" || typeof r.at === "number"),
  );
  const secOf = (id) => (sectionOfQ ? sectionOfQ.get(String(id)) : undefined);
  const dur = Number.isFinite(Number(durationSec)) && Number(durationSec) > 0 ? Number(durationSec) : 0;

  const withTs = rows.filter((r) => typeof r.ts === "number");
  const allTs = withTs.length > 0 && withTs.length === rows.length;
  // LOCKED mocks: always use each section's own clock (`at` restarts at 0
  // when a section opens). A test-wide timeline would charge the idle wait
  // at the end of a finished section to the NEXT section's first question
  // (2026-10-29: IIM B Mock 7 showed QADI 74m vs a 60m limit).
  if (locked && sectionOfQ) {
    const groups = new Map();
    for (const r of rows) {
      if (typeof r.at !== "number") continue;
      const s = secOf(r.id);
      if (s == null) continue;
      if (!groups.has(s)) groups.set(s, []);
      groups.get(s).push(r);
    }
    groups.forEach((list) => timeline(list, "at").forEach((v, k) => qTimes.set(k, v)));
  } else if (allTs) {
    timeline(withTs, "ts").forEach((v, k) => qTimes.set(k, v));
  } else {
    timeline(rows.filter((r) => typeof r.at === "number"), "at").forEach((v, k) => qTimes.set(k, v));
  }

  qTimes.forEach((t, qid) => {
    const s = secOf(qid);
    if (s == null) return;
    secTimes.set(s, (secTimes.get(s) || 0) + t);
  });

  // test-wide position of every answer
  const lockedLegacy = !allTs && locked && sectionOfQ;
  const offsets = new Map();
  if (lockedLegacy && Array.isArray(sections)) {
    let acc = 0;
    for (const s of sections) {
      offsets.set(s.id, acc);
      acc += Number(s.time) > 0 ? Number(s.time) : 0;
    }
  }
  for (const r of rows) {
    if (typeof r.ts === "number" && !lockedLegacy) globalAt.set(String(r.id), r.ts);
    else if (typeof r.at === "number") {
      const off = lockedLegacy ? offsets.get(secOf(r.id)) : 0;
      if (lockedLegacy && off == null) continue;
      globalAt.set(String(r.id), (off || 0) + r.at);
    }
  }

  let tracked = 0;
  secTimes.forEach((t) => (tracked += t));
  if (!sectionOfQ) qTimes.forEach((t) => (tracked += t));
  let lastAt = 0;
  globalAt.forEach((v) => (lastAt = v > lastAt ? v : lastAt));
  // locked legacy: earlier sections ran to their full limit, so the last
  // answer's test-wide position is the honest elapsed time
  const totalSec = dur || (allTs ? Math.max(lastAt, tracked) : lockedLegacy && offsets.size ? Math.max(lastAt, tracked) : tracked);
  return { qTimes, secTimes, totalSec, globalAt };
}

module.exports = { computePlayTimes };
