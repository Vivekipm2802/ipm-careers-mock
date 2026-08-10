// ============================================================
// Mentor's read — pure computations behind the result-page
// coaching lines (D4: concept + mock result pages).
//
// No React, no imports, no side effects: every export here is a
// plain function so the node unit harness can require this file
// directly. All thresholds live here so both result pages agree.
// ============================================================

// A wrong answered in under this many seconds is a "quick answer" —
// carelessness territory, not a concept gap.
export const FAST_WRONG_SEC = 30;

// End-rush detection: the last quarter of attempts done in less than
// half of its fair time share = rushing the finish.
export const RUSH_LAST_FRAC = 0.25;
export const RUSH_FACTOR = 0.5;
export const RUSH_MIN_ATTEMPTS = 8;

// Weakest-section line only fires when best − weakest ≥ this many
// percentage points — near-equal sections have no "gap" worth calling.
export const WEAK_SECTION_MIN_GAP = 10;

// Improvement line only fires for a gain of at least this many marks.
export const IMPROVEMENT_MIN_MARKS = 3;

// "Last 10 minutes" window (seconds), and the minimum test length for
// that framing to make sense at all (20 min).
export const FINAL_WINDOW_SEC = 600;
export const FINAL_WINDOW_MIN_DURATION = 1200;

// ── time on question ────────────────────────────────────────────
// Entries carry a CUMULATIVE seconds-elapsed stamp (concept report:
// `timestamp`, mock report: `at`). Time-on-question = this entry's
// stamp minus the closest earlier attempt's stamp, chronological
// order — same logic as calculateIntervalDelta on the concept page.
export function timeOnEntry(entries, entry, tsKey) {
  if (!entry || typeof entry[tsKey] !== "number") return null;
  const earlier = (Array.isArray(entries) ? entries : []).filter(
    (r) => r && r !== entry && typeof r[tsKey] === "number" && r[tsKey] < entry[tsKey]
  );
  if (earlier.length === 0) return entry[tsKey] >= 0 ? entry[tsKey] : null;
  const prev = Math.max(...earlier.map((r) => r[tsKey]));
  const d = entry[tsKey] - prev;
  return d >= 0 ? d : null;
}

// ── fast vs slow wrongs ─────────────────────────────────────────
// Entries: [{ isCorrect: true|false|null, [tsKey]: number }].
// Wrongs without a measurable time land in `unmeasured` and never
// tip the fast/slow verdict.
export function splitWrongs(entries, tsKey, threshold) {
  const key = tsKey || "timestamp";
  const limit = typeof threshold === "number" ? threshold : FAST_WRONG_SEC;
  const list = Array.isArray(entries) ? entries : [];
  let fast = 0;
  let slow = 0;
  let unmeasured = 0;
  list.forEach((e) => {
    if (!e || e.isCorrect !== false) return;
    const t = timeOnEntry(list, e, key);
    if (t == null) unmeasured += 1;
    else if (t < limit) fast += 1;
    else slow += 1;
  });
  return { fast, slow, unmeasured, wrongs: fast + slow + unmeasured };
}

// ── counterfactual score ────────────────────────────────────────
// "Without negative marking" = the score with every deducted mark
// returned. Works from the SIGNED score, so a negative total climbs
// back up correctly.
export function counterfactualScore(score, wrongCount, decrement) {
  const s = Number(score) || 0;
  const w = Math.max(0, Number(wrongCount) || 0);
  const d = Math.max(0, Number(decrement) || 0);
  return s + w * d;
}

// ── end-rush detection ──────────────────────────────────────────
// timestamps: cumulative seconds of every ATTEMPT, any order.
// Rush = the last `lastFrac` of attempts squeezed into less than
// `factor` × their proportional share of the total time.
export function detectEndRush(timestamps, opts) {
  const o = opts || {};
  const lastFrac = o.lastFrac ?? RUSH_LAST_FRAC;
  const factor = o.factor ?? RUSH_FACTOR;
  const minAttempts = o.minAttempts ?? RUSH_MIN_ATTEMPTS;
  const ts = (Array.isArray(timestamps) ? timestamps : [])
    .filter((t) => typeof t === "number" && t >= 0)
    .sort((a, b) => a - b);
  const n = ts.length;
  if (n < minAttempts) return { measurable: false, rush: false };
  const total = ts[n - 1];
  if (!(total > 0)) return { measurable: false, rush: false };
  const k = Math.max(1, Math.round(n * lastFrac));
  const boundary = ts[n - k - 1]; // stamp of the attempt just before the final block
  const lastTime = total - boundary;
  const fairShare = (k / n) * total;
  return {
    measurable: true,
    rush: lastTime < fairShare * factor,
    lastCount: k,
    lastTimeSec: Math.round(lastTime),
  };
}

// ── weakest section (this mock) ─────────────────────────────────
// perSection: [{ title, pct, score, max }]. Returns null when there
// is no meaningful gap (or fewer than two sections).
export function pickWeakestSection(perSection, minGap) {
  const gapFloor = typeof minGap === "number" ? minGap : WEAK_SECTION_MIN_GAP;
  const list = (Array.isArray(perSection) ? perSection : []).filter(
    (s) => s && typeof s.pct === "number"
  );
  if (list.length < 2) return null;
  let weakest = list[0];
  let best = list[0];
  list.forEach((s) => {
    if (s.pct < weakest.pct) weakest = s;
    if (s.pct > best.pct) best = s;
  });
  const gap = best.pct - weakest.pct;
  if (gap < gapFloor) return null;
  return { weakest, best, gap };
}

// ── previous-mock consistency ───────────────────────────────────
// prevWeakestTitles: weakest-section title of each PREVIOUS mock,
// most recent first (null when that play had no clear weakest).
// Counts how many consecutive recent mocks share the current
// weakest — a stale agreement three mocks ago doesn't count.
export function agreeingMockCount(currentTitle, prevWeakestTitles) {
  if (!currentTitle) return 0;
  let n = 0;
  for (const t of Array.isArray(prevWeakestTitles) ? prevWeakestTitles : []) {
    if (t && t === currentTitle) n += 1;
    else break;
  }
  return n;
}

// ── best section improvement vs the previous mock ───────────────
// Sections match by title. Returns { title, delta } for the largest
// score gain of at least `minDelta` marks, else null.
export function bestSectionImprovement(current, previous, minDelta) {
  const floor = typeof minDelta === "number" ? minDelta : IMPROVEMENT_MIN_MARKS;
  const prev = Array.isArray(previous) ? previous : [];
  let best = null;
  (Array.isArray(current) ? current : []).forEach((c) => {
    if (!c || !c.title) return;
    const p = prev.find((x) => x && x.title === c.title);
    if (!p || typeof c.score !== "number" || typeof p.score !== "number") return;
    const delta = c.score - p.score;
    if (delta >= floor && (!best || delta > best.delta)) best = { title: c.title, delta };
  });
  return best;
}

// ── wrongs in the final window ──────────────────────────────────
// entries: [{ at: cumulative seconds, isCorrect }]. Only meaningful
// for tests long enough that "the last 10 minutes" is a real phase.
export function wrongsInFinalWindow(entries, durationSec, windowSec, minDuration) {
  const win = typeof windowSec === "number" ? windowSec : FINAL_WINDOW_SEC;
  const floor = typeof minDuration === "number" ? minDuration : FINAL_WINDOW_MIN_DURATION;
  const d = Number(durationSec);
  if (!Number.isFinite(d) || d < floor) return 0;
  return (Array.isArray(entries) ? entries : []).filter(
    (e) => e && e.isCorrect === false && typeof e.at === "number" && e.at > d - win
  ).length;
}

// ── mock correctness (mirror of the result page's logic) ────────
// Duplicated from pages/mock/result/[uid].js on purpose: that copy
// lives inside the component (can't be imported without rendering),
// and prev-mock section stats need it here.
export function normalizeAns(s) {
  if (s == null) return "";
  const trimmed = String(s).trim().toLowerCase().replace(/\s+/g, "");
  if (/^-?\d*\.?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isNaN(n) && Number.isFinite(n)) return String(n);
  }
  return trimmed;
}

export function mockEntryCorrect(q, reportItem) {
  if (!q || !reportItem) return null;
  let options = q.options;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch (e) {
      options = null;
    }
  }
  if (q.type === "options") {
    if (reportItem.value == null) return null;
    const idx = Number(reportItem.value) - 1;
    if (!Number.isFinite(idx)) return null;
    if (!Array.isArray(options)) return null;
    const correctIdx = options.findIndex((o) => o && o.isCorrect);
    return correctIdx === idx;
  }
  if (q.type === "input") {
    const stored = options && !Array.isArray(options) ? options.answer : null;
    if (stored == null) return null;
    return normalizeAns(stored) === normalizeAns(reportItem.value);
  }
  return null;
}

// ── per-section stats for a (previous) mock play ────────────────
// groups: this test's mock_groups SECTION rows (subject joined),
// moduleRows: mock_groups module rows (module joined),
// questionRows: minimal mock_questions (id, parent, type, options),
// report: that play's report array.
export function perSectionFromPlay(groups, moduleRows, questionRows, report) {
  const sections = (Array.isArray(groups) ? groups : []).filter(
    (s) => s && (s.type === "subject" || (s.subject != null && s.module == null))
  );
  return sections.map((sec) => {
    const mods = (Array.isArray(moduleRows) ? moduleRows : []).filter(
      (m) => m && m.parent_sub === sec.id && m.module
    );
    // 2026-08 correctness audit — canonical rule (mirrors lib/scoring):
    // pos defaults to +4 when unset/0; neg is taken by MAGNITUDE and
    // SUBTRACTED (live data stores +1 meaning "one mark off" — the old
    // `score += neg` ADDED a mark per wrong); explicit 0 = no negatives;
    // SA/input wrongs never cost anything.
    const posRaw = Number(sec.pos);
    const pos = Number.isFinite(posRaw) && posRaw > 0 ? posRaw : 4;
    const negRaw = Number(sec.neg);
    const negMag = sec.neg == null || !Number.isFinite(negRaw) ? 1 : Math.abs(negRaw);
    let correct = 0;
    let wrong = 0;
    let total = 0;
    let score = 0;
    let max = 0;
    mods.forEach((mod) => {
      (Array.isArray(questionRows) ? questionRows : [])
        .filter((q) => q && q.parent === mod.module.id)
        .forEach((q) => {
          total += 1;
          max += pos;
          const r = (Array.isArray(report) ? report : []).find(
            (it) => it && String(it.id) === String(q.id)
          );
          const c = mockEntryCorrect(q, r);
          if (c === true) {
            correct += 1;
            score += pos;
          } else if (c === false) {
            wrong += 1;
            if (q.type !== "input") score -= negMag;
          }
        });
    });
    return {
      title: (sec.subject && sec.subject.title) || "Section",
      correct,
      wrong,
      total,
      attempted: correct + wrong,
      score,
      max,
      pct: max > 0 ? Math.round((Math.max(0, score) / max) * 100) : 0,
    };
  });
}
