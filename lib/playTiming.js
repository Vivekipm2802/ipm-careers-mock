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
function computePlayTimes({ report, sectionOfQ, sections, locked, durationSec, timeoutSec }) {
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

  // 2026-11-01 (owner: "his sectional times are shown so less"): on a
  // LOCKED mock a student cannot leave a section early, so the time spent
  // in a section is its full limit, not just the time until the last
  // answer (Shardul, IIM B Mock 2: VA showed 10m of a 30-minute section).
  // With the wall-clock duration we walk the sections in order and fill
  // each up to its limit; without it, every section before the last one
  // answered gets its full limit and the last answered one its last answer.
  const lockedSecs = locked && sectionOfQ && Array.isArray(sections) && sections.length > 0 &&
    sections.every((s) => Number(s.time) > 0);
  if (lockedSecs) {
    const answeredSecs = new Set();
    rows.forEach((r) => { const s = secOf(r.id); if (s != null) answeredSecs.add(s); });
    const limitCap = Number(timeoutSec) > 0 ? Number(timeoutSec) : Infinity;
    if (dur > 0) {
      let remainingT = Math.min(dur, limitCap);
      sections.forEach((s) => {
        const t = Math.max(0, Math.min(Number(s.time), remainingT));
        secTimes.set(s.id, t);
        remainingT -= t;
      });
    } else {
      let lastIdx = -1;
      sections.forEach((s, i) => { if (answeredSecs.has(s.id)) lastIdx = i; });
      sections.forEach((s, i) => {
        if (i < lastIdx) secTimes.set(s.id, Number(s.time));
        else if (i === lastIdx) {
          let mx = 0;
          rows.forEach((r) => { if (secOf(r.id) === s.id && typeof r.at === "number") mx = Math.max(mx, r.at); });
          secTimes.set(s.id, Math.min(Number(s.time), Math.max(mx, secTimes.get(s.id) || 0)));
        } else secTimes.set(s.id, 0);
      });
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
  // A test can't run longer than its own timer: wall-clock above that is a
  // sleeping laptop / tab left open (2026-10-30: a mock showed 1502 min).
  const limit = Number(timeoutSec);
  const cappedTotal = Number.isFinite(limit) && limit > 0 && totalSec > limit ? limit : totalSec;
  return { qTimes, secTimes, totalSec: cappedTotal, globalAt };
}

module.exports = { computePlayTimes };
