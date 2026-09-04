// ============================================================
// scripts/check-parse.js — babel-parse every file touched by the
// 2026-08 correctness audit (uses Next's bundled @babel/parser, so
// no extra install). Also statically verifies the hook-order rule
// on both result pages: no React hook call may appear AFTER the
// first early `return` in the component body.
// Run: node scripts/check-parse.js
// ============================================================

const fs = require("fs");
const path = require("path");
const parser = require(path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "compiled",
  "babel",
  "parser.js"
));

const root = path.join(__dirname, "..");
const files = [
  "lib/scoring.js",
  "lib/leaderboard.js",
  "lib/labels.js",
  "lib/mentorRead.js",
  "components/LeaderboardBlock.js",
  "pages/api/leaderboard.js",
  "pages/api/mock-journey.js",
  "pages/api/submitMock.js",
  "pages/mock/[slug].js",
  "pages/mock/result/[uid].js",
  "pages/mock/analytics/[uid].js",
  "pages/test/[slug].js",
  "pages/test/result/[uid].js",
  "pages/test/analytics/[uid].js",
  "scripts/test-scoring.js",
  "scripts/test-leaderboard.js",
  // 2026-08 concept-practice rebuild + badge vault cap
  "components/ConceptGroups.js",
  "components/ConceptTestStudent.js",
  "components/BadgeVault.js",
  "components/DSBChallenge.js",
  "pages/index.js",
  // 2026-08 four-fix pass: sidebar flow, topics search/grid,
  // vault 7-tile cap, due-count reconcile
  "components/Navbar.js",
  "components/MistakeVault.js",
  // 2026-08 featured-mock priority + admin announcements
  "lib/featuredMock.js",
  "components/Dashboard.js",
  "components/MockTests.js",
  "components/Announcements.js",
  "components/NMNContext.js",
  "pages/api/announce.js",
  // 2026-09 DSB trainer overhaul: end-of-run reveal, review mode,
  // Skip-or-Solve decision flow, curated banks, report persistence
  "components/DailyQuiz.js",
  "components/GulpProtocol.js",
  "components/SkipOrSolve.js",
  "components/gulpPassages.js",
  "components/sosBank.js",
  "lib/trainerReport.js",
];

let failed = 0;
for (const rel of files) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  try {
    parser.parse(src, {
      sourceType: "module",
      plugins: ["jsx"],
      allowReturnOutsideFunction: true,
    });
    console.log(`  ok  ${rel}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${rel}: ${e.message}`);
  }
}

// ── Hook-order smoke check on the two result pages ──────────────
// Heuristic on the main component body: find the first top-level-ish
// early `return (` guard, then flag any use{State,Effect,Memo,...}(
// call textually after it inside the same component (before the JSX
// main return). We approximate by checking that the LAST hook call
// index is before the FIRST `if (` guard that returns.
function hookOrderCheck(rel, componentMarker) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const start = src.indexOf(componentMarker);
  if (start === -1) {
    failed += 1;
    console.log(`FAIL  ${rel}: component marker not found`);
    return;
  }
  const body = src.slice(start);
  const guardRe = /All hooks above this line|if \(userDetails == undefined\)|if \(!result \|\| !questions\)|if \(!board \|\| !Array\.isArray\(board\.top\)/;
  const guardMatch = body.match(guardRe);
  if (!guardMatch) {
    console.log(`  ??  ${rel}: no early-return guard marker found (skipped)`);
    return;
  }
  const guardIdx = guardMatch.index;
  const hookRe = /\buse(State|Effect|Memo|Ref|Callback|Router|Context|NMNContext)\s*\(/g;
  let m;
  let lastHook = -1;
  while ((m = hookRe.exec(body)) !== null) {
    // ignore hook calls inside nested sub-components declared after the page
    if (m.index < body.indexOf("\nfunction ") || body.indexOf("\nfunction ") === -1) {
      lastHook = m.index;
    }
  }
  if (lastHook > guardIdx) {
    failed += 1;
    console.log(`FAIL  ${rel}: a hook call appears AFTER the early-return guard`);
  } else {
    console.log(`  ok  ${rel}: all hooks precede the early-return guard`);
  }
}

hookOrderCheck("pages/test/result/[uid].js", "const ResultPage = (");
hookOrderCheck("pages/mock/result/[uid].js", "export default function MockResult(");
hookOrderCheck("pages/mock/analytics/[uid].js", "export default function MockAnalytics(");
// 2026-08 side-rail retheme: the compact leaderboard added a useState
// (Show all N toggle) — it must stay above the component's early return.
hookOrderCheck("components/LeaderboardBlock.js", "export default function LeaderboardBlock(");
// 2026-08 concept-practice rebuild: both concept pages carry the
// "All hooks above this line" guard marker before their early returns.
hookOrderCheck("components/ConceptGroups.js", "const Selector = (");
hookOrderCheck("components/ConceptTestStudent.js", "export default function ConceptTestStudent(");
// 2026-09 DSB trainer overhaul: DSBChallenge has real early returns
// (sim / summary / active trainer) — every hook must sit above the
// "All hooks above this line" marker.
hookOrderCheck("components/DSBChallenge.js", "export default function DSBChallenge(");

console.log(failed === 0 ? "\nAll files parse clean." : `\n${failed} failure(s).`);
process.exit(failed > 0 ? 1 : 0);
