// ============================================================
// scripts/test-leaderboard.js — unit tests for lib/leaderboard.js
// (the pure builders behind /api/leaderboard — the API route is a
// thin fetch wrapper around these, tested here with fabricated
// supabase-shaped rows).
// Run: node scripts/test-leaderboard.js
// ============================================================

const path = require("path");
const {
  buildConceptLeaderboard,
  buildMockLeaderboard,
  timeMinOf,
  displayName,
} = require(path.join(__dirname, "..", "lib", "leaderboard.js"));

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

// A 15-question concept test (all MCQ, correct option = index 0).
const questions = [];
for (let i = 1; i <= 15; i++) {
  questions.push({ id: i, type: "options", options: [{ title: "A" + i, isCorrect: true }, { title: "B" + i }] });
}
// Build a report with `nRight` rights then `nWrong` wrongs.
function mkReport(nRight, nWrong) {
  const rep = [];
  let q = 1;
  for (let i = 0; i < nRight; i++) rep.push({ id: q++, selectedOption: "1", timestamp: (i + 1) * 30 });
  for (let i = 0; i < nWrong; i++) rep.push({ id: q++, selectedOption: "2", timestamp: (nRight + i + 1) * 30 });
  return rep;
}

console.log("\n[1] Concept leaderboard — dedupe, marks units, own rank");
{
  const plays = [
    // Aditi: two attempts — first weak (2 right), second strong (14 right) → best kept
    { uid: "a1", user: "aditi@x.com", name: "Aditi", report: mkReport(2, 5), duration: 600, created_at: "2026-08-01" },
    { uid: "a2", user: "ADITI@x.com", name: "Aditi", report: mkReport(14, 1), duration: 900, created_at: "2026-08-02" },
    // Bala: one attempt, 12 right 3 wrong. Legacy stored score column says 100 — must be ignored.
    { uid: "b1", user: "bala@x.com", name: "Bala", score: 100, report: mkReport(12, 3), duration: 1200, created_at: "2026-08-01" },
    // Chitra: 15/15
    { uid: "c1", user: "chitra@x.com", name: "Chitra", report: mkReport(15, 0), duration: 800, created_at: "2026-08-01" },
    // 10 more students so the requester lands OUTSIDE the top 10
    ...Array.from({ length: 10 }, (_, i) => ({
      uid: "s" + i,
      user: `s${i}@x.com`,
      name: "S" + i,
      report: mkReport(10, 0),
      duration: 1000 + i,
      created_at: "2026-08-03",
    })),
    // the requester: 1 right, 5 wrong → 4 − 5 = −1 marks, worst score
    { uid: "me1", user: "me@x.com", name: "Me", report: mkReport(1, 5), duration: 700, created_at: "2026-08-04" },
    // a row without a report (legacy) is skipped, never crashes
    { uid: "x1", user: "ghost@x.com", name: "Ghost", report: null, created_at: "2026-08-01" },
  ];

  const board = buildConceptLeaderboard(plays, questions, "me@x.com");

  eq(board.top.length, 10, "top capped at 10");
  eq(board.totalPlayers, 14, "14 unique students (Aditi deduped case-insensitively, ghost skipped)");
  // Chitra 60, Aditi 55, Bala 45, S0..S9 40, Me −1
  eq(board.top[0].name, "Chitra", "topper is Chitra");
  eq(board.top[0].scoreMarks, 60, "topper marks = 15×4 = 60");
  eq(board.top[0].maxMarks, 60, "maxMarks = 60 (marks units, not percent)");
  eq(board.top[1].name, "Aditi", "Aditi appears ONCE (deduped)");
  eq(board.top[1].scoreMarks, 14 * 4 - 1, "Aditi's BEST attempt kept (55, not 3)");
  eq(board.top.filter((r) => r.name === "Aditi").length, 1, "no duplicate rows per student");
  eq(board.top[2].scoreMarks, 45, "Bala re-scored to 45 — stored '100' ignored");
  eq(board.you.rank, 14, "requester's own rank returned when outside top 10");
  eq(board.you.scoreMarks, -1, "requester's canonical marks (negatives kept in data)");
  eq(board.you.isYou, true, "you-flag set");
  eq(board.top.some((r) => r.isYou), false, "requester not in top 10 list");
  eq(
    board.top10pctAvg.count,
    Math.max(1, Math.ceil(14 * 0.1)),
    "top-10% cohort size"
  );
  eq(board.top10pctAvg.scoreMarks, Math.round((60 + 55) / 2), "top-10% average over best attempts");
  // payload must not leak emails
  eq(Object.keys(board.top[0]).includes("user"), false, "no email fields in payload");
}

console.log("\n[2] Mock leaderboard — canonical scoring with neg=+1 data");
{
  const sec = { id: 1, type: "subject", subject: { title: "Sectional" }, pos: 4, neg: 1 };
  const mod = { id: 10, parent_sub: 1, module: { id: 100 } };
  const mockQs = [];
  for (let i = 1; i <= 45; i++) {
    mockQs.push({ id: i, parent: 100, type: i <= 40 ? "options" : "input", options: i <= 40 ? [{ title: "A" + i, isCorrect: true }, { title: "B" + i }] : { answer: "9" } });
  }
  // The owner's student: 20 right (17 MCQ + 3 SA), 11 wrong (8 MCQ + 3 SA... keep 8 MCQ wrong + 3 SA wrong)
  const rep = [];
  for (let i = 1; i <= 17; i++) rep.push({ id: i, value: "1", at: i * 20 });
  for (let i = 18; i <= 25; i++) rep.push({ id: i, value: "2", at: i * 20 }); // 8 MCQ wrong
  for (let i = 41; i <= 43; i++) rep.push({ id: i, value: "9", at: i * 20 }); // 3 SA right
  for (let i = 44; i <= 45; i++) rep.push({ id: i, value: "7", at: i * 20 }); // 2 SA wrong
  // + one more MCQ wrong to reach 11 wrongs total (9 MCQ wrong + 2 SA wrong = 11)
  rep.push({ id: 26, value: "2", at: 990 });

  const plays = [
    { uid: "m1", user: "owner-case@x.com", name: "Student", report: rep, duration: null, created_at: "2026-08-05" },
  ];
  const board = buildMockLeaderboard(plays, [sec], [mod], mockQs, "owner-case@x.com");
  // 20 right ×4 = 80; 9 MCQ wrongs × −1 = −9; 2 SA wrongs = 0 → 71
  eq(board.top[0].scoreMarks, 71, "mock play re-scored canonically (80 − 9, SA wrongs free)");
  eq(board.top[0].maxMarks, 180, "mock maxMarks 45×4 = 180");
  eq(board.top[0].correct, 20, "correct = 20");
  eq(board.top[0].attempted, 31, "attempted = 31");
  eq(board.top[0].timeMin, Math.round(990 / 60), "timeMin falls back to max(at) when duration missing");
  eq(board.you.rank, 1, "single player → rank 1");
}

console.log("\n[3] Helpers");
{
  eq(timeMinOf({ duration: 600, report: [] }, "at"), 10, "duration preferred");
  eq(timeMinOf({ duration: null, report: [{ at: 300 }] }, "at"), 5, "max(at) fallback");
  eq(displayName({ name: " Riya " }), "Riya", "name trimmed");
  eq(displayName({ user: "someone@x.com" }), "so…", "email fallback masked");
  eq(displayName({}), "Student", "empty fallback");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
