// ============================================================
// lib/scoring.js — the ONE canonical scoring rule (owner's spec)
//
//   Per question: +4 correct, −1 wrong, 0 unattempted.
//   EXCEPTION: SA / input-type questions have NO negative marking —
//   a wrong SA is 0, never −1.
//   Where a test's config provides explicit increment / decrement
//   values those override +4/−1, BUT the SA-no-negative exception
//   ALWAYS applies.
//
// Written as CommonJS on purpose: Next.js pages/API routes import it
// through webpack interop, and the node unit harness
// (scripts/test-scoring.js) can `require()` it directly with zero
// build step. No React, no supabase, no side effects.
//
// Root causes this module replaces (2026-08 correctness audit):
//   · pages/mock/result/[uid].js did `secScore += neg` with `neg`
//     stored as a POSITIVE magnitude (+1) in mock_groups — wrong
//     answers ADDED a mark each. The owner's sectional: 20 right,
//     11 wrong → 20×4 + 11×(+1) = 91 with "without negatives 102".
//     Canonical: 20×4 − 11 = 69 (or 72 when 3 wrongs were SA).
//   · pages/test/[slug].js docked −decrement for wrong SA answers.
//   · Both result pages trusted stored per-entry verdicts / the
//     stored score column computed under the old rules.
// ============================================================

var DEFAULT_INCREMENT = 4;
var DEFAULT_DECREMENT = 1;

// ── type helpers ────────────────────────────────────────────────
// The DB uses "options" (MCQ) and "input" (SA). The scoring entries
// use "mcq"/"input". Anything not recognisably SA scores as MCQ.
function normType(t) {
  var s = String(t == null ? "" : t).toLowerCase().trim();
  if (s === "input" || s === "sa" || s === "short-answer" || s === "shortanswer") {
    return "input";
  }
  return "mcq";
}

// ── config resolution ───────────────────────────────────────────
// increment: explicit positive number wins, else 4. (0 / null / NaN
//   → 4: a question can never be worth nothing when correct, and the
//   old `sec.pos || 0` produced 0-mark sections.)
// decrement: null/undefined/NaN → 1 (the canonical −1). An explicit
//   number is taken by MAGNITUDE — mock_groups stores `neg` as +1 in
//   live data (the sign bug above), some admin tools store −1; both
//   mean "one mark off". An explicit 0 is respected as a deliberate
//   no-negative-marking config (judgment call, documented).
function resolveConfig(config) {
  var incRaw = config == null ? null : (config.increment != null ? config.increment : config.pos);
  var decRaw = config == null ? null : (config.decrement != null ? config.decrement : config.neg);
  var inc = Number(incRaw);
  var dec = Number(decRaw);
  return {
    increment: Number.isFinite(inc) && inc > 0 ? inc : DEFAULT_INCREMENT,
    decrement: decRaw == null || !Number.isFinite(dec) ? DEFAULT_DECREMENT : Math.abs(dec),
  };
}

// ── SA answer normalisation ─────────────────────────────────────
// trim → lowercase → collapse ALL whitespace → strip thousands
// commas between digits → numeric collapse ("13" ≡ "13.0" ≡ " 13 "
// ≡ "1,3" never — commas only strip between digit,digit… "1,300" ≡
// "1300"). "THIRTEEN" stays "thirteen" and does NOT equal "13".
function normalizeAns(s) {
  if (s == null) return "";
  var t = String(s).trim().toLowerCase().replace(/\s+/g, "");
  t = t.replace(/(\d),(?=\d)/g, "$1");
  if (/^[-+]?\d*\.?\d+$/.test(t)) {
    var n = Number(t);
    if (Number.isFinite(n)) return String(n);
  }
  return t;
}

function saEqual(expected, given) {
  return normalizeAns(expected) === normalizeAns(given);
}

// ── option parsing ──────────────────────────────────────────────
// Supabase returns jsonb `options` as an array (MCQ) or an object
// {answer} (SA) — but a few legacy rows carry it as a JSON string.
function parseOptions(options) {
  if (typeof options === "string") {
    try {
      return JSON.parse(options);
    } catch (e) {
      return null;
    }
  }
  return options == null ? null : options;
}

function storedVerdict(entry) {
  return entry && typeof entry.isCorrect === "boolean" ? entry.isCorrect : null;
}

// ── answer identity: which option did the student actually pick? ─
// Content-first, position-fallback. The stored answer TEXT is the
// ground truth of what the student saw and clicked; the stored
// 1-based index breaks the moment options are reordered/shuffled
// between attempt and review. Only a UNIQUE content match is used —
// duplicate titles fall back to the index.
// entry fields tolerated: {selectedOption|value: "1"-based index,
// answer|text: chosen option's title}.
function chosenIndex(question, entry) {
  if (!question || !entry) return null;
  var options = parseOptions(question.options);
  if (!Array.isArray(options) || options.length === 0) return null;

  var answerText = entry.answer != null ? entry.answer : entry.text;
  if (answerText != null && String(answerText).trim() !== "") {
    var norm = normalizeAns(answerText);
    var hits = [];
    for (var i = 0; i < options.length; i++) {
      if (options[i] && normalizeAns(options[i].title) === norm) hits.push(i);
    }
    if (hits.length === 1) return hits[0];
  }

  var raw = entry.selectedOption != null ? entry.selectedOption : entry.value;
  if (raw != null && raw !== "") {
    var idx = Number(raw) - 1;
    if (Number.isFinite(idx) && idx >= 0 && idx < options.length) return idx;
  }
  return null;
}

// ── verdict derivation from the RAW stored answer ───────────────
// Both result pages re-derive correctness from what the student
// actually submitted (report entries carry selectedOption/value +
// answer text) and prefer that over any attempt-time isCorrect —
// historical rows were marked under broken comparison rules.
// Returns true / false / null (null = unattempted / underivable).
function deriveVerdict(question, entry) {
  if (!question || !entry) return null;
  var options = parseOptions(question.options);
  var type = normType(question.type);

  if (type === "input") {
    var given = entry.value != null && entry.value !== "" ? entry.value : (entry.answer != null && entry.answer !== "" ? entry.answer : null);
    if (given == null) return storedVerdict(entry);
    var expected = options && !Array.isArray(options) ? options.answer : (question.answer != null ? question.answer : null);
    if (expected == null) return storedVerdict(entry);
    return saEqual(expected, given);
  }

  // MCQ
  if (!Array.isArray(options) || options.length === 0) return storedVerdict(entry);
  var correctIdx = -1;
  for (var i = 0; i < options.length; i++) {
    if (options[i] && options[i].isCorrect) {
      correctIdx = i;
      break;
    }
  }

  var pick = chosenIndex(question, entry);
  if (pick != null) return pick === correctIdx;

  // Attempted with an index that no longer fits the options array
  // (admin deleted an option, etc.) and no matching text → count as
  // wrong rather than silently skipping a real attempt.
  var raw = entry.selectedOption != null ? entry.selectedOption : entry.value;
  if (raw != null && raw !== "") {
    var idx = Number(raw) - 1;
    if (Number.isFinite(idx)) return false;
  }
  return storedVerdict(entry);
}

// ── core scorer ─────────────────────────────────────────────────
// entries: [{type: 'mcq'|'input', attempted: bool, correct: true|false|null}]
// config:  {increment, decrement} overrides (or {pos, neg}).
// Unattempted / underivable entries contribute 0 and count toward
// maxMarks only.
function scoreEntries(entries, config) {
  var cfg = resolveConfig(config);
  var correct = 0;
  var wrong = 0;
  var mcqWrong = 0;
  var saWrong = 0;
  var attempted = 0;
  var total = 0;

  (Array.isArray(entries) ? entries : []).forEach(function (e) {
    if (!e) return;
    total += 1;
    var isAttempted = e.attempted !== undefined ? !!e.attempted : (e.correct === true || e.correct === false);
    if (!isAttempted || (e.correct !== true && e.correct !== false)) return;
    attempted += 1;
    if (e.correct === true) {
      correct += 1;
    } else {
      wrong += 1;
      if (normType(e.type) === "input") saWrong += 1;
      else mcqWrong += 1;
    }
  });

  var positive = correct * cfg.increment;
  var negative = mcqWrong * cfg.decrement; // SA wrongs NEVER contribute
  var score = positive - negative;

  return {
    score: score,
    positive: positive,
    negative: negative,
    withoutNegatives: positive, // = score + (mcq wrongs × decrement)
    correct: correct,
    wrong: wrong,
    mcqWrong: mcqWrong,
    saWrong: saWrong,
    attempted: attempted,
    unattempted: total - attempted,
    totalQuestions: total,
    maxMarks: total * cfg.increment,
    increment: cfg.increment,
    decrement: cfg.decrement,
  };
}

// ── report lookup ───────────────────────────────────────────────
// ids arrive as number OR string depending on the query path, and a
// historical bug produced duplicate report entries per question —
// take the LAST (freshest) matching entry.
function findEntry(report, id) {
  if (!Array.isArray(report) || id == null) return null;
  var found = null;
  for (var i = 0; i < report.length; i++) {
    var r = report[i];
    if (r && r.id != null && String(r.id) === String(id)) found = r;
  }
  return found;
}

// ── concept-test play (plays row) ───────────────────────────────
// questions: [{id, type, options}], report: the play's report array,
// config: increment/decrement overrides (plays.config or defaults).
function scoreConceptPlay(questions, report, config) {
  var verdictById = {};
  var entries = (Array.isArray(questions) ? questions : []).map(function (q) {
    var r = findEntry(report, q.id);
    var v = r ? deriveVerdict(q, r) : null;
    verdictById[String(q.id)] = v;
    return {
      id: q.id,
      type: normType(q.type),
      attempted: v === true || v === false,
      correct: v,
    };
  });
  var s = scoreEntries(entries, config);
  s.verdictById = verdictById;
  return s;
}

// ── mock / sectional play (mock_plays row) ──────────────────────
// groups:      mock_groups rows for the test (subject joined),
// moduleRows:  mock_groups module rows (module joined),
// questionRows: mock_questions (id, parent, type, options),
// report:      the play's report array.
// Per-section config comes from sec.pos / sec.neg via resolveConfig.
function scoreMockPlay(groups, moduleRows, questionRows, report) {
  var sections = (Array.isArray(groups) ? groups : []).filter(function (s) {
    return s && (s.type === "subject" || (s.subject != null && s.module == null));
  });
  var verdictById = {};
  var total = {
    score: 0, positive: 0, negative: 0, withoutNegatives: 0,
    correct: 0, wrong: 0, mcqWrong: 0, saWrong: 0,
    attempted: 0, unattempted: 0, totalQuestions: 0, maxMarks: 0,
  };

  var perSection = sections.map(function (sec) {
    var mods = (Array.isArray(moduleRows) ? moduleRows : []).filter(function (m) {
      return m && m.parent_sub === sec.id && m.module;
    });
    var entries = [];
    mods.forEach(function (mod) {
      (Array.isArray(questionRows) ? questionRows : [])
        .filter(function (q) { return q && q.parent === mod.module.id; })
        .forEach(function (q) {
          var r = findEntry(report, q.id);
          var v = r ? deriveVerdict(q, r) : null;
          verdictById[String(q.id)] = v;
          entries.push({
            id: q.id,
            type: normType(q.type),
            attempted: v === true || v === false,
            correct: v,
          });
        });
    });
    var s = scoreEntries(entries, { increment: sec.pos, decrement: sec.neg });
    total.score += s.score;
    total.positive += s.positive;
    total.negative += s.negative;
    total.withoutNegatives += s.withoutNegatives;
    total.correct += s.correct;
    total.wrong += s.wrong;
    total.mcqWrong += s.mcqWrong;
    total.saWrong += s.saWrong;
    total.attempted += s.attempted;
    total.unattempted += s.unattempted;
    total.totalQuestions += s.totalQuestions;
    total.maxMarks += s.maxMarks;
    return {
      sec: sec,
      title: (sec.subject && sec.subject.title) || sec.title || "Section",
      score: s.score,
      max: s.maxMarks,
      positive: s.positive,
      negative: s.negative,
      correct: s.correct,
      wrong: s.wrong,
      mcqWrong: s.mcqWrong,
      saWrong: s.saWrong,
      attempted: s.attempted,
      total: s.totalQuestions,
      increment: s.increment,
      decrement: s.decrement,
      pct: s.maxMarks > 0 ? Math.round((Math.max(0, s.score) / s.maxMarks) * 100) : 0,
    };
  });

  return { total: total, perSection: perSection, verdictById: verdictById };
}

module.exports = {
  DEFAULT_INCREMENT: DEFAULT_INCREMENT,
  DEFAULT_DECREMENT: DEFAULT_DECREMENT,
  normType: normType,
  resolveConfig: resolveConfig,
  normalizeAns: normalizeAns,
  saEqual: saEqual,
  parseOptions: parseOptions,
  chosenIndex: chosenIndex,
  deriveVerdict: deriveVerdict,
  scoreEntries: scoreEntries,
  findEntry: findEntry,
  scoreConceptPlay: scoreConceptPlay,
  scoreMockPlay: scoreMockPlay,
};
