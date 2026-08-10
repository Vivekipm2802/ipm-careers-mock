// ============================================================
// scripts/test-scoring.js — unit tests for lib/scoring.js
// Run: node scripts/test-scoring.js   (pure CJS, no build step)
// ============================================================

const path = require("path");
const {
  scoreEntries,
  scoreMockPlay,
  scoreConceptPlay,
  deriveVerdict,
  chosenIndex,
  normalizeAns,
  saEqual,
  resolveConfig,
} = require(path.join(__dirname, "..", "lib", "scoring.js"));

let passed = 0;
let failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    console.log(`  ok  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}\n      expected ${e}\n      got      ${a}`);
  }
}

// ── 1 · THE OWNER'S CASE ────────────────────────────────────────
// Sectional: 45 questions, 20 right · 11 wrong · 14 unattempted.
// The broken page displayed 91/180 ("without negatives 102") because
// mock_groups stored neg=+1 and the code did `score += neg`.
console.log("\n[1] Owner's sectional — 20 right · 11 wrong (mixed MCQ/SA)");
{
  // Variant A: 3 of the 11 wrongs are SA → SA wrongs cost 0
  const entries = [];
  for (let i = 0; i < 15; i++) entries.push({ type: "mcq", attempted: true, correct: true });
  for (let i = 0; i < 5; i++) entries.push({ type: "input", attempted: true, correct: true });
  for (let i = 0; i < 8; i++) entries.push({ type: "mcq", attempted: true, correct: false });
  for (let i = 0; i < 3; i++) entries.push({ type: "input", attempted: true, correct: false }); // SA wrongs
  for (let i = 0; i < 14; i++) entries.push({ type: "mcq", attempted: false, correct: null });

  const s = scoreEntries(entries, null); // defaults +4/−1
  eq(s.correct, 20, "correct = 20");
  eq(s.wrong, 11, "wrong = 11");
  eq(s.saWrong, 3, "SA wrongs = 3");
  eq(s.mcqWrong, 8, "MCQ wrongs = 8");
  eq(s.positive, 80, "positive = 20×4 = 80");
  eq(s.negative, 8, "negative = 8 MCQ wrongs × 1 (SA wrongs cost 0)");
  eq(s.score, 72, "score = 80 − 8 = 72");
  eq(s.withoutNegatives, 80, "withoutNegatives = score + mcqWrongs×1 = 72 + 8 = 80");
  eq(s.withoutNegatives, s.score + s.mcqWrong * 1, "identity: withoutNegatives = score + (mcq wrongs × 1)");
  eq(s.maxMarks, 180, "maxMarks = 45 × 4 = 180");
  eq(s.unattempted, 14, "unattempted = 14 (contribute 0)");
  if (s.score === 91) { failed += 1; console.log("FAIL  reproduced the +1-per-wrong bug (91)"); }
}
{
  // Variant B: all 11 wrongs are MCQ → canonical 69/180
  const entries = [];
  for (let i = 0; i < 20; i++) entries.push({ type: "mcq", attempted: true, correct: true });
  for (let i = 0; i < 11; i++) entries.push({ type: "mcq", attempted: true, correct: false });
  for (let i = 0; i < 14; i++) entries.push({ type: "mcq", attempted: false, correct: null });
  const s = scoreEntries(entries, null);
  eq(s.score, 69, "all-MCQ wrongs: score = 80 − 11 = 69 (NOT 91)");
  eq(s.withoutNegatives, 80, "all-MCQ wrongs: withoutNegatives = 80 (NOT 102)");
}

// ── 2 · End-to-end through scoreMockPlay with the LIVE broken
//        config shape (pos=4, neg=+1 — positive magnitude) ────────
console.log("\n[2] scoreMockPlay with live data's neg=+1 sign bug");
{
  const sec = { id: 1, type: "subject", subject: { title: "QA" }, pos: 4, neg: 1 };
  const mod = { id: 10, parent_sub: 1, module: { id: 100 } };
  const questions = [];
  const report = [];
  let qid = 1;
  // 20 correct MCQs (correct option index 0, student picks "1")
  for (let i = 0; i < 20; i++) {
    questions.push({ id: qid, parent: 100, type: "options", options: [{ title: "A" + qid, isCorrect: true }, { title: "B" + qid }] });
    report.push({ id: qid, value: "1" });
    qid++;
  }
  // 8 wrong MCQs
  for (let i = 0; i < 8; i++) {
    questions.push({ id: qid, parent: 100, type: "options", options: [{ title: "A" + qid, isCorrect: true }, { title: "B" + qid }] });
    report.push({ id: qid, value: "2" });
    qid++;
  }
  // 3 wrong SAs
  for (let i = 0; i < 3; i++) {
    questions.push({ id: qid, parent: 100, type: "input", options: { answer: "42" } });
    report.push({ id: qid, value: "41" });
    qid++;
  }
  // 14 unattempted
  for (let i = 0; i < 14; i++) {
    questions.push({ id: qid, parent: 100, type: "options", options: [{ title: "A" + qid, isCorrect: true }, { title: "B" + qid }] });
    qid++;
  }
  const r = scoreMockPlay([sec], [mod], questions, report);
  eq(r.total.score, 72, "total 72/180 under canonical rule despite neg stored as +1");
  eq(r.total.maxMarks, 180, "maxMarks 180");
  eq(r.total.withoutNegatives, 80, "withoutNegatives 80");
  eq(r.perSection[0].pct, Math.round((72 / 180) * 100), "section pct from clamped score");
}

// ── 3 · Config overrides + SA exception always wins ─────────────
console.log("\n[3] Config overrides");
{
  const s = scoreEntries(
    [
      { type: "mcq", attempted: true, correct: true },
      { type: "mcq", attempted: true, correct: false },
      { type: "input", attempted: true, correct: false },
    ],
    { increment: 5, decrement: 2 }
  );
  eq(s.score, 3, "+5/−2 override: 5 − 2 + 0(SA) = 3");
  eq(s.maxMarks, 15, "maxMarks = 3 × 5");
}
{
  const s = scoreEntries(
    [{ type: "mcq", attempted: true, correct: false }],
    { increment: 4, decrement: -2 } // negative-signed config → magnitude 2
  );
  eq(s.score, -2, "decrement −2 treated as magnitude 2");
}
{
  eq(resolveConfig(null), { increment: 4, decrement: 1 }, "defaults 4/1 when config missing");
  eq(resolveConfig({ increment: 0, decrement: null }), { increment: 4, decrement: 1 }, "pos=0/neg=null → defaults");
  eq(resolveConfig({ increment: 4, decrement: 0 }), { increment: 4, decrement: 0 }, "explicit 0 decrement respected");
  eq(resolveConfig({ pos: 5, neg: 1 }), { increment: 5, decrement: 1 }, "pos/neg aliases accepted");
}

// ── 4 · Answer identity: content beats position ─────────────────
console.log("\n[4] MCQ identity — content-first matching");
{
  // The failure case: options were REORDERED after the attempt. The
  // student picked "Paris" which was position 2 at attempt time; today
  // "Paris" sits at position 0. Position-only matching marks them WRONG
  // (position 2 today is "Rome"); content matching keeps them RIGHT.
  const qToday = {
    id: 7,
    type: "options",
    options: [
      { title: "Paris", isCorrect: true },
      { title: "London" },
      { title: "Rome" },
      { title: "Madrid" },
    ],
  };
  const entry = { id: 7, value: "2", text: "Paris" }; // index says today's "London"→wrong, content says Paris→right
  eq(deriveVerdict(qToday, entry), true, "reordered options: content match wins (was wrongly marked wrong)");
  eq(chosenIndex(qToday, entry), 0, "chosen highlight follows content (index 0 = Paris)");

  const entryNoText = { id: 7, value: "2" };
  eq(deriveVerdict(qToday, entryNoText), false, "no stored text → positional fallback (index 1 = London, wrong)");
  eq(chosenIndex(qToday, entryNoText), 1, "positional fallback highlight");

  // concept-test shaped entry (selectedOption + answer)
  const entryConcept = { id: 7, selectedOption: "3", answer: "Paris" };
  eq(deriveVerdict(qToday, entryConcept), true, "concept entry: answer text wins over selectedOption");

  // duplicate titles → ambiguous content → positional fallback
  const qDup = { id: 8, type: "options", options: [{ title: "10" }, { title: "10", isCorrect: true }] };
  eq(deriveVerdict(qDup, { id: 8, value: "2", text: "10" }), true, "duplicate titles: falls back to index 2 → correct");
  // unattempted / underivable
  eq(deriveVerdict(qToday, { id: 7 }), null, "no answer data → null (unattempted)");
  eq(deriveVerdict(qToday, { id: 7, isCorrect: true }), true, "underivable → stored isCorrect fallback");
}

// ── 5 · SA normalisation table ──────────────────────────────────
console.log("\n[5] SA normalisation");
{
  eq(saEqual("13", "13"), true, '"13" = "13"');
  eq(saEqual("13", "13.0"), true, '"13" = "13.0" (numeric equivalence)');
  eq(saEqual("13", " 13 "), true, '"13" = " 13 " (trim)');
  eq(saEqual("13", "13.00"), true, '"13" = "13.00"');
  eq(saEqual("13.5", "13.50"), true, '"13.5" = "13.50"');
  eq(saEqual("13", "THIRTEEN"), false, '"13" ≠ "THIRTEEN" (no word-number matching)');
  eq(saEqual("1300", "1,300"), true, '"1300" = "1,300" (thousands comma)');
  eq(saEqual("-2", "−2".replace("−", "-")), true, '"-2" = "-2"');
  eq(saEqual("Paris", "  paris "), true, "case + space insensitive text");
  eq(saEqual("0.5", ".5"), true, '".5" = "0.5"');
  eq(saEqual("5", "50"), false, '"5" ≠ "50"');
  eq(normalizeAns(null), "", "null → empty");
  // via deriveVerdict on an input question
  const q = { id: 1, type: "input", options: { answer: "13" } };
  eq(deriveVerdict(q, { id: 1, value: "13.0" }), true, "input verdict: 13.0 vs 13 → correct");
  eq(deriveVerdict(q, { id: 1, value: " 13 " }), true, "input verdict: ' 13 ' → correct");
  eq(deriveVerdict(q, { id: 1, value: "14" }), false, "input verdict: 14 → wrong");
  eq(deriveVerdict(q, { id: 1, value: "" }), null, "input verdict: empty → unattempted");
}

// ── 6 · Concept play + duplicate report entries ─────────────────
console.log("\n[6] scoreConceptPlay + duplicate-entry handling");
{
  const questions = [
    { id: 1, type: "options", options: [{ title: "A", isCorrect: true }, { title: "B" }] },
    { id: "2", type: "input", options: { answer: "5" } },
    { id: 3, type: "options", options: [{ title: "A", isCorrect: true }, { title: "B" }] },
  ];
  // duplicate entries for q1 (historical lodash-matcher bug): last one wins
  const report = [
    { id: "1", selectedOption: "2", answer: "B", isCorrect: false },
    { id: 1, selectedOption: "1", answer: "A", isCorrect: true }, // freshest
    { id: 2, type: "input", answer: "5.0", isCorrect: false }, // historically mis-marked wrong; re-derived correct
  ];
  const s = scoreConceptPlay(questions, report, null);
  eq(s.verdictById["1"], true, "duplicate entries: LAST entry wins");
  eq(s.verdictById["2"], true, "historical wrong SA verdict overturned by re-derivation ('5.0' = '5')");
  eq(s.verdictById["3"], null, "unanswered stays null");
  eq(s.score, 8, "score = 2×4 = 8");
  eq(s.maxMarks, 12, "maxMarks 12");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
