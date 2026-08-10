// ============================================================
// scripts/ssr-check.js — real server renders of BOTH result pages
// (loading state + full data state) using Next's bundled babel and
// react-dom/server, with externals mocked. Guards the two crash
// classes these pages have shipped before:
//   · hook-order ("Rendered more hooks than during the previous
//     render") — a hook after an early return explodes here too;
//   · scoring regressions — the rendered HTML must show the OWNER'S
//     CASE numbers under the canonical rule (72/180, not 91/180).
// Run: node scripts/ssr-check.js
// ============================================================

process.env.NODE_ENV = "production";

const fs = require("fs");
const path = require("path");
const Module = require("module");

const root = path.join(__dirname, "..");
const compiled = path.join(root, "node_modules", "next", "dist", "compiled", "babel");
const babel = require(path.join(compiled, "core.js"));
const presetReactRaw = require(path.join(compiled, "preset-react.js"));
const cjsPluginRaw = require(path.join(compiled, "plugin-transform-modules-commonjs.js"));
const presetReact = presetReactRaw.default || presetReactRaw;
const cjsPlugin = cjsPluginRaw.default || cjsPluginRaw;

const React = require(path.join(root, "node_modules", "react"));
const ReactDOMServer = require(path.join(root, "node_modules", "react-dom", "server.js"));

// ── stub factory: any-named component that renders its children ──
function componentProxy(tag) {
  return new Proxy(
    {},
    {
      get: (t, name) => {
        if (name === "__esModule") return true;
        if (name === "default") return (props) => React.createElement(tag || "div", null, props && props.children);
        return (props) => React.createElement(tag || "div", null, props && props.children);
      },
    }
  );
}
const passthrough = (props) => React.createElement("div", null, props && props.children);

// Thenable, endlessly-chainable supabase stub (effects never run in
// SSR, but the import must not explode).
function supaChain() {
  const o = {};
  const h = new Proxy(o, {
    get: (t, name) => {
      if (name === "then") return (resolve) => resolve({ data: [], error: null });
      return () => h;
    },
  });
  return h;
}
const supabaseStub = { from: () => supaChain(), auth: { getSession: async () => ({ data: { session: null } }) }, rpc: () => supaChain() };

// ── per-render react shim: feeds initial useState values by call
// order so the DATA branch of a page renders without effects ──
let stateQueue = null;
const reactShim = new Proxy(React, {
  get: (t, name) => {
    if (name === "useState") {
      return (init) => React.useState(stateQueue && stateQueue.length ? stateQueue.shift() : init);
    }
    return React[name];
  },
});

const mocks = {
  "@nextui-org/react": componentProxy(),
  "framer-motion": { __esModule: true, motion: componentProxy(), AnimatePresence: passthrough },
  "lucide-react": componentProxy("span"),
  "next/router": { __esModule: true, useRouter: () => ({ query: { uid: "t1" }, push: () => {}, asPath: "/x" }), default: {} },
  "next/link": { __esModule: true, default: passthrough },
  "react-hot-toast": { __esModule: true, toast: { success: () => {}, error: () => {}, loading: () => {}, remove: () => {} }, default: () => null },
  "@/components/Loader": { __esModule: true, default: () => React.createElement("div", null, "loader") },
  "@/components/ThemeToggle": { __esModule: true, default: () => null },
  "@/components/MentorRead": { __esModule: true, default: (props) => React.createElement("div", null, "mentor:" + ((props.lines || []).length)) },
  "@/components/ReportIssue": { __esModule: true, default: () => null },
  "@/components/NMNContext": {
    __esModule: true,
    useNMNContext: () => ({ userDetails: { email: "me@x.com", user_metadata: { full_name: "Stu Dent" } }, isRouting: false, setCTXSlug: () => {} }),
  },
  "@/utils/DateUtil": {
    __esModule: true,
    CtoLocal: () => ({ date: 9, monthName: "Aug", year: 2026, dayName: "Sun", time: "10:00", amPm: "am" }),
  },
  "@/utils/supabaseClient": { __esModule: true, supabase: supabaseStub, serversupabase: supabaseStub },
  "@/utils/authHeaders": { __esModule: true, getAuthHeaders: async () => ({}) },
  // 2026-08 concept-practice rebuild + vault cap
  "./ImageUploader": { __esModule: true, default: () => null },
  // BadgeVault imports levelFromXp from the heavy DSB page — stub the
  // module, replicate the level thresholds computeBadges cares about.
  "./DSBChallenge": {
    __esModule: true,
    default: () => null,
    levelFromXp: (xp) => ({ level: xp >= 12500 ? 10 : xp >= 7000 ? 8 : xp >= 2400 ? 5 : 1, name: "L", progress: 0, toNext: 0 }),
  },
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  if (
    request === "react" && parent && parent.filename &&
    /pages[\\/]|components[\\/](ConceptGroups|ConceptTestStudent|BadgeVault)\.js/.test(parent.filename)
  ) {
    return reactShim;
  }
  if (request.startsWith("@/")) {
    return origLoad.call(this, path.join(root, request.slice(2)), parent, isMain);
  }
  return origLoad.apply(this, arguments);
};

// Transpile project files (JSX + ESM → CJS) on require.
const origJs = Module._extensions[".js"];
Module._extensions[".js"] = function (mod, filename) {
  if (filename.startsWith(root) && !filename.includes("node_modules")) {
    const src = fs.readFileSync(filename, "utf8");
    const needs = /(^|\n)\s*(import|export)\s|<[A-Za-z]/.test(src);
    if (needs) {
      const out = babel.transformSync(src, {
        filename,
        babelrc: false,
        configFile: false,
        presets: [[presetReact, { runtime: "automatic" }]],
        plugins: [cjsPlugin],
      });
      return mod._compile(out.code, filename);
    }
  }
  return origJs(mod, filename);
};

// ── fixtures: the OWNER'S CASE ──────────────────────────────────
// 2026-08 label polish: the subject title is the RAW admin string —
// the pages must render the short name ("SA"), never "(Hash …".
const sec = { id: 1, type: "subject", subject: { title: "SA (Hash IPMAT Mock 3) 2026" }, pos: 4, neg: 1 };
const mod = { id: 10, parent_sub: 1, module: { id: 100 } };
const mockQuestions = [];
const mockReport = [];
let qid = 1;
for (let i = 0; i < 20; i++) { // 20 MCQ right
  mockQuestions.push({ id: qid, parent: 100, seq: qid, type: "options", question: "<p>q</p>", options: [{ title: "A" + qid, isCorrect: true }, { title: "B" + qid }] });
  mockReport.push({ id: qid, value: "1", text: "A" + qid, at: qid * 20 });
  qid++;
}
for (let i = 0; i < 8; i++) { // 8 MCQ wrong
  mockQuestions.push({ id: qid, parent: 100, seq: qid, type: "options", question: "<p>q</p>", options: [{ title: "A" + qid, isCorrect: true }, { title: "B" + qid }] });
  mockReport.push({ id: qid, value: "2", text: "B" + qid, at: qid * 20 });
  qid++;
}
for (let i = 0; i < 3; i++) { // 3 SA wrong — MUST cost 0
  mockQuestions.push({ id: qid, parent: 100, seq: qid, type: "input", question: "<p>q</p>", options: { answer: "42" } });
  mockReport.push({ id: qid, value: "41", at: qid * 20 });
  qid++;
}
for (let i = 0; i < 14; i++) { // unattempted
  mockQuestions.push({ id: qid, parent: 100, seq: qid, type: "options", question: "<p>q</p>", options: [{ title: "A" + qid, isCorrect: true }, { title: "B" + qid }] });
  qid++;
}
const mockResultRow = {
  uid: "r1",
  created_at: "2026-08-09T10:00:00Z",
  user: "me@x.com",
  name: "Stu Dent",
  duration: 3600,
  report: mockReport,
  data: [],
  test_id: { id: 5, title: "QA Sectional 4" },
};

// 2026-08 side-rail retheme fixture: 10-row board so the compact
// leaderboard's top-5 slice, own-row append and "Show top 10" toggle
// are all exercised in the aside of BOTH result pages.
const board10 = {
  top: Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1, name: "P" + (i + 1), scoreMarks: 60 - i, maxMarks: 180,
    attempted: 30, correct: 20, timeMin: 40, isYou: false,
  })),
  you: { rank: 14, name: "Me", scoreMarks: 4, maxMarks: 180, attempted: 6, correct: 1, timeMin: 12, isYou: true },
  totalPlayers: 18,
};

let failed = 0;
function check(cond, label) {
  if (cond) console.log(`  ok  ${label}`);
  else { failed += 1; console.log(`FAIL  ${label}`); }
}
// React SSR interleaves "<!-- -->" between adjacent text nodes —
// strip comments so plain-text substring checks work.
function clean(html) {
  return html.replace(/<!--.*?-->/g, "");
}

// ── 1 · Mock result page ────────────────────────────────────────
console.log("\n[1] pages/mock/result/[uid].js");
const MockResult = require(path.join(root, "pages", "mock", "result", "[uid].js")).default;
{
  // loading branch (no sections/questions yet)
  stateQueue = null;
  const html = clean(ReactDOMServer.renderToString(React.createElement(MockResult, { result: mockResultRow })));
  check(html.includes("Loading your result"), "loading state renders without crashing");
}
{
  // DATA branch: feed sections/modules/questions via the useState queue
  // (order: sections, modules, questions, activeVideo, modal,
  //  activeFilter, paletteFilter, leaderboard, prevPlays)
  stateQueue = [[sec], [mod], mockQuestions, undefined, undefined, "all", "all", board10, []];
  const html = clean(ReactDOMServer.renderToString(React.createElement(MockResult, { result: mockResultRow })));
  stateQueue = null;
  check(html.includes(">72<"), "hero shows canonical 72 (was 91 under the += neg bug)");
  check(html.includes("/ 180"), "hero max marks / 180 (45 × 4)");
  check(html.includes(">80<"), "Without negatives = 80 (72 + 8 MCQ wrongs; SA wrongs free — not 102)");
  check(!html.includes(">91<") && !html.includes(">102<"), "buggy 91/102 numbers are gone");
  // Phase 15 approved amendment: Wrong cells are COUNT-ONLY (red only
  // where negatives apply) — never "11 · −8" / "3 · costs 0".
  check(html.includes(">11<"), "section table Wrong cell shows the count");
  check(!/·\s*−\d/.test(html.replace(/Wrong · −\d/g, "")) && !html.includes("costs 0"),
    "Wrong cells are count-only (no '· −N' / '· costs 0')");
  check(html.includes("Wrong · −1"), "MCQ wrong badge shows −1");
  check(html.includes("Wrong · 0"), "SA wrong badge shows 0 (no negative)");
  // 2026-08 side-rail retheme assertions
  check((html.match(/Question map/g) || []).length === 1, "ONE question-map card (single header)");
  check((html.match(/>All</g) || []).length === 1, "ONE filter chip row on the whole page");
  check(html.includes("20 correct · 11 wrong · 14 skipped"), "review header shows passive counts");
  check(!html.includes("Marked"), "review header chips are gone (no Marked pill)");
  check(html.includes("Top scorers") && html.includes("P5") && !html.includes("P6"),
    "compact leaderboard renders top 5 (P5 in, P6 collapsed)");
  check(html.includes("You · Me") && html.includes("Show top 10"),
    "compact leaderboard: own row appended + Show top 10 toggle");
  check(html.includes("You vs topper"), "condensed you-vs-topper rows render in the rail");
  // 2026-08 label polish: short section names everywhere the section
  // is named — the raw "(Hash IPMAT Mock 3) 2026" never leaks, and the
  // map label no longer concatenates the module/mock title.
  check(html.includes(">SA<"), "section labels show the SHORT name ('SA')");
  check(!html.includes("(Hash"), "raw parenthetical title never renders");
  check(html.includes(">Time</th>"), "Time column shows when tracked time is healthy (620s)");
}
{
  // THIN-TIME fixture (2026-08 owner feedback): only the 20 correct
  // entries, `at` stamps 1s apart → ~20s tracked in total. The Time
  // column must drop itself entirely (header + cells). With 0 wrongs
  // the quiet-zeros rule also holds: no red anywhere on the page.
  const thinReport = mockReport.slice(0, 20).map((r, i) => ({ ...r, at: i + 1 }));
  const thinResultRow = { ...mockResultRow, duration: null, report: thinReport };
  stateQueue = [[sec], [mod], mockQuestions, undefined, undefined, "all", "all", null, []];
  const html = clean(ReactDOMServer.renderToString(React.createElement(MockResult, { result: thinResultRow })));
  stateQueue = null;
  check(!html.includes(">Time</th>"), "Time column self-hides on thin tracked time (<60s)");
  check(html.includes(">0<"), "zero Wrong count still renders");
  check(!html.includes("color:var(--c-danger)"), "quiet zeros: no red text when wrong count is 0");
}

// ── 2 · Concept result page ─────────────────────────────────────
console.log("\n[2] pages/test/result/[uid].js");
const ConceptResult = require(path.join(root, "pages", "test", "result", "[uid].js")).default;
const conceptQuestions = [
  { id: 1, type: "options", question: "<p>q1</p>", options: [{ title: "A", isCorrect: true }, { title: "B" }] },
  { id: 2, type: "options", question: "<p>q2</p>", options: [{ title: "A", isCorrect: true }, { title: "B" }] },
  { id: 3, type: "input", question: "<p>q3</p>", options: { answer: "9" } },
  { id: 4, type: "input", question: "<p>q4</p>", options: { answer: "5" } },
  { id: 5, type: "options", question: "<p>q5</p>", options: [{ title: "A", isCorrect: true }, { title: "B" }] },
];
const conceptResultRow = {
  uid: "c1",
  user: "me@x.com",
  report: [
    { id: 1, type: "options", selectedOption: "1", answer: "A", isCorrect: true, timestamp: 30 },
    { id: 2, type: "options", selectedOption: "2", answer: "B", isCorrect: false, timestamp: 60 },
    { id: 3, type: "input", answer: "8", isCorrect: false, timestamp: 90 }, // SA wrong → 0, not −1
    // historical mis-mark: "5.0" was stored wrong under strict ===; re-derived correct
    { id: 4, type: "input", answer: "5.0", isCorrect: false, timestamp: 120 },
  ],
  duration: 600,
  test_uuid: { id: 77, uuid: "uuid-77", title: "Percentages Basics" },
};
{
  stateQueue = null;
  const html = clean(ReactDOMServer.renderToString(React.createElement(ConceptResult, { result: conceptResultRow, questions: null })));
  check(html.includes("Loading"), "loading state (questions streaming) renders without crashing");
}
{
  // DATA branch — state order: questions, activeExplanation, activeVideo,
  // activeFilter, luckyIds, luckyBusy, board.
  stateQueue = [conceptQuestions, undefined, undefined, "all", {}, null, board10];
  const html = clean(ReactDOMServer.renderToString(React.createElement(ConceptResult, { result: conceptResultRow, questions: conceptQuestions })));
  stateQueue = null;
  // canonical: correct = q1 + q4(re-derived) = 2 → +8; wrong MCQ = q2 → −1; SA wrong q3 → 0 ⇒ 7/20
  check(html.includes(">7<"), "hero shows canonical 7 (8 − 1; SA wrong free, '5.0' re-derived correct)");
  check(html.includes("/ 20"), "hero max marks / 20 (5 × 4)");
  check(html.includes("Without negatives") && html.includes(">8<"), "without-negatives 8 shown (test has negatives)");
  check(html.includes("Wrong · 0"), "SA wrong badge shows 0");
  check(html.includes("Wrong · −1"), "MCQ wrong badge shows −1");
  // 2026-08 approved preview 1: "You scored N" hero + 4 stat cards
  check(html.includes("You scored") && html.includes("Test result · Concept test"),
    "preview-1 hero: kick line + 'You scored' headline");
  check(html.includes("out of 20") && html.includes("50% accuracy") && html.includes("2 of 4 correct"),
    "hero meta line: out of / accuracy / right-of-attempted");
  check(html.includes("Total score") && html.includes("Accuracy") && html.includes("Time taken"),
    "stat card row renders (Total score / Accuracy / Time taken)");
  check(html.includes("+4 correct · −1 wrong"), "total-score sub reflects the test's config");
  check(html.includes("avg 150s / question"), "time card avg (600s / 4 attempted)");
  check(html.includes("+1 from negatives"), "without-negatives card sub");
  check((html.match(/Question map/g) || []).length === 1, "ONE question-map card, no per-section label");
  check((html.match(/>All</g) || []).length === 1, "ONE filter chip row on the whole page");
  check(html.includes("2 correct · 2 wrong · 1 skipped"), "review header shows passive counts");
  check(html.includes("Top scorers") && html.includes("Show top 10") && html.includes("You · Me"),
    "compact leaderboard rail: top 5 + own row + Show top toggle");
  check(html.includes("You vs topper"), "condensed you-vs-topper rows render in the rail");
  check(html.includes("mentor:"), "MentorRead renders inside the main column");
}

// ── 3 · LeaderboardBlock with a full endpoint payload ───────────
console.log("\n[3] components/LeaderboardBlock.js");
const LeaderboardBlock = require(path.join(root, "components", "LeaderboardBlock.js")).default;
{
  const board = {
    top: [
      { rank: 1, name: "Chitra", scoreMarks: 60, maxMarks: 60, attempted: 15, correct: 15, timeMin: 13, isYou: false },
      { rank: 2, name: "Aditi", scoreMarks: 55, maxMarks: 60, attempted: 15, correct: 14, timeMin: 15, isYou: false },
    ],
    you: { rank: 14, name: "Me", scoreMarks: 4, maxMarks: 60, attempted: 6, correct: 1, timeMin: 12, isYou: true },
    totalPlayers: 14,
    maxMarks: 60,
    top10pctAvg: { count: 2, scoreMarks: 58, attempted: 15, correct: 15, timeMin: 14 },
  };
  const html = clean(ReactDOMServer.renderToString(React.createElement(LeaderboardBlock, { board })));
  check(html.includes("60 / 60"), "marks rendered as '60 / 60' (marks units)");
  check(html.includes("Your test vs. the topper"), "vs-topper table renders");
  check(html.includes("13 min") && html.includes("15") && !/>—</.test(html), "topper attempted/correct/time filled — no '—' cells");
  check(html.includes("You · Me"), "your own row (rank 14) appended below top 10");
}

// ── 4 · Mock analytics page (Phase 15 journey redesign) ─────────
console.log("\n[4] pages/mock/analytics/[uid].js");
const MockAnalytics = require(path.join(root, "pages", "mock", "analytics", "[uid].js")).default;
// Cross-mock journey fixture (what /api/mock-journey returns): three
// full mocks, current test (id 5) last, scores climbing.
const journeyFixture = [
  { testId: 3, title: "Hash 18", uid: "j1", created_at: "2026-07-01", score: 46, maxMarks: 180, attempted: 24, correct: 14, wrong: 10, totalQuestions: 45, accuracy: 58, sectionCount: 2, saSkipped: 5, rank: 17, totalPlayers: 18, topperScore: 120, batchAvg: 60,
    perSection: [ { title: "Quantitative Ability", score: 30, max: 120, correct: 9, wrong: 6, attempted: 15, total: 30, pct: 25 }, { title: "Verbal", score: 16, max: 60, correct: 5, wrong: 4, attempted: 9, total: 15, pct: 27 } ] },
  { testId: 4, title: "Hash 19", uid: "j2", created_at: "2026-07-15", score: 58, maxMarks: 180, attempted: 28, correct: 16, wrong: 12, totalQuestions: 45, accuracy: 57, sectionCount: 2, saSkipped: 4, rank: 16, totalPlayers: 18, topperScore: 126, batchAvg: 64,
    perSection: [ { title: "Quantitative Ability", score: 40, max: 120, correct: 11, wrong: 4, attempted: 15, total: 30, pct: 33 }, { title: "Verbal", score: 18, max: 60, correct: 5, wrong: 2, attempted: 7, total: 15, pct: 30 } ] },
  { testId: 5, title: "Hash 20", uid: "r1", created_at: "2026-08-09", score: 72, maxMarks: 180, attempted: 31, correct: 20, wrong: 11, totalQuestions: 45, accuracy: 65, sectionCount: 2, saSkipped: 3, rank: 14, totalPlayers: 18, topperScore: 120, batchAvg: 66,
    perSection: [ { title: "Quantitative Ability", score: 52, max: 120, correct: 14, wrong: 6, attempted: 20, total: 30, pct: 43 }, { title: "Verbal", score: 20, max: 60, correct: 6, wrong: 5, attempted: 11, total: 15, pct: 33 } ] },
];
{
  // loading branch
  stateQueue = null;
  const html = clean(ReactDOMServer.renderToString(React.createElement(MockAnalytics, { result: mockResultRow })));
  check(html.includes("Loading your analytics"), "loading state renders without crashing");
}
{
  // DATA branch (state order: sections, modules, questions, journey)
  stateQueue = [[sec], [mod], mockQuestions, journeyFixture];
  const html = clean(ReactDOMServer.renderToString(React.createElement(MockAnalytics, { result: mockResultRow })));
  stateQueue = null;
  check(html.includes("Score across mocks"), "journey card renders");
  check(html.includes("Climbing — 3 mocks, +26 marks"), "journey title from canonical scores (46 → 72)");
  check(html.includes("gap now") && html.includes("48 marks"), "topper gap footer (120 − 72 = 48)");
  check(html.includes("#14"), "rank strip shows current rank");
  check(html.includes("from #16 last mock"), "rank delta vs previous mock");
  check(html.includes("65%"), "accuracy is recomputed (20 of 31 attempted = 65%)");
  check(html.includes("Sections across mocks"), "section sparklines render");
  check(html.includes("Where the time goes"), "time card renders (report has at stamps)");
  check(html.includes("Quick") && html.includes("Slow"), "speed × accuracy quadrant renders");
  check(html.includes("Rushed answers cost you"), "rushed-wrongs habit fires (all wrongs under 30s)");
  check(!html.includes("Free marks left behind"), "SA habit stays silent (fixture attempted all SA)");
}
{
  // fewer than 2 full mocks → quiet empty state
  stateQueue = [[sec], [mod], mockQuestions, [journeyFixture[2]]];
  const html = clean(ReactDOMServer.renderToString(React.createElement(MockAnalytics, { result: mockResultRow })));
  stateQueue = null;
  check(html.includes("one point is not a line"), "single-mock empty state renders");
}

// ── 5 · Concept practice pages (2026-08 correction) ─────────────
// OUTER page (ConceptGroups) must be the ORIGINAL collections
// design — the preview-2 rebuild was applied to the wrong page and
// has been reverted. INNER page (ConceptTestStudent) now carries
// the approved preview-2 layout, adapted to topics.
console.log("\n[5a] components/ConceptGroups.js — restored collections page");
{
  const src5 = fs.readFileSync(path.join(root, "components", "ConceptGroups.js"), "utf8");
  check(!src5.includes("buildChapterModel"), "no buildChapterModel — preview-2 rewrite is gone");
  check(src5.includes("Phase 12 Ship D"), "old collections header comment is back");
  check(src5.includes("Topics started") && src5.includes("Weak areas"),
    "old collections markup markers (KPI labels) present");
  check(src5.includes("children({ group: selectedGroup, clearSelection })"),
    "old render-prop contract: children({ group, clearSelection }) — no initialCat");
}
const ConceptGroups = require(path.join(root, "components", "ConceptGroups.js")).default;
{
  // loading branch renders without crashing
  stateQueue = null;
  const html = clean(ReactDOMServer.renderToString(
    React.createElement(ConceptGroups, { type: "concept", role: "user", title: "x" }, () => React.createElement("div"))
  ));
  check(html.length > 0, "collections page loading state renders without crashing");
}

console.log("\n[5b] components/ConceptTestStudent.js — preview-2 topics page");
const ConceptTestStudent = require(path.join(root, "components", "ConceptTestStudent.js")).default;
const cats5 = [
  { id: 11, parent: 1, title: "Number System" },
  { id: 12, parent: 1, title: "AP/GP" },
  { id: 13, parent: 1, title: "Functions" },
  { id: 14, parent: 1, title: "Alligations & Mixtures" },
];
const mcats5 = [
  { id: 111, parent: 11, title: "Easy (Number System)" },
  { id: 112, parent: 11, title: "Hard (Number System)" },
  { id: 121, parent: 12, title: "Easy (AP/GP)" },
  { id: 122, parent: 12, title: "Moderate (AP/GP)" },
  { id: 123, parent: 12, title: "Hard (AP/GP)" },
  { id: 131, parent: 13, title: "Easy (Functions)" },
  { id: 132, parent: 13, title: "Hard (Functions)" },
  { id: 141, parent: 14, title: "Easy (Mixtures)" },
  { id: 142, parent: 14, title: "Moderate (Mixtures)" },
  { id: 143, parent: 14, title: "Hard (Mixtures)" },
];
const levelsByMCat5 = {
  111: [{ id: 1, uuid: "u-ns-e1" }, { id: 2, uuid: "u-ns-e2" }],
  112: [{ id: 3, uuid: "u-ns-h" }],
  121: [{ id: 4, uuid: "u-ap-e" }],
  122: [{ id: 5, uuid: "u-ap-m" }],
  123: [{ id: 6, uuid: "u-ap-h" }],
  131: [{ id: 7, uuid: "u-fn-e" }],
  132: [{ id: 8, uuid: "u-fn-h" }],
  141: [{ id: 9, uuid: "u-mx-e" }],
  142: [{ id: 10, uuid: "u-mx-m" }],
  143: [{ id: 11, uuid: "u-mx-h" }],
};
const counts5 = Object.fromEntries(Object.entries(levelsByMCat5).map(([k, v]) => [k, v.length]));
// NS: 2 of 3 attempted, both failed → in progress + weak (suggested).
// AP/GP: 1 of 3 done (latest play) → Continue card, next = Moderate.
// Functions: all attempted → mastered. Mixtures: untouched.
const plays5 = {
  "u-ns-e1": { uid: "p1", score: 6, isPassed: false, created_at: "2026-08-06T10:00:00Z" },
  "u-ns-e2": { uid: "p2", score: 8, isPassed: false, created_at: "2026-08-08T10:00:00Z" },
  "u-ap-e": { uid: "p3", score: 32, isPassed: true, created_at: "2026-08-10T10:00:00Z" },
  "u-fn-e": { uid: "p4", score: 30, isPassed: true, created_at: "2026-08-01T10:00:00Z" },
  "u-fn-h": { uid: "p5", score: 28, isPassed: true, created_at: "2026-07-30T10:00:00Z" },
};
{
  // loading branch
  stateQueue = null;
  const html = clean(ReactDOMServer.renderToString(
    React.createElement(ConceptTestStudent, { group: 1, role: "user", onBack: () => {} })
  ));
  check(html.length > 0, "topics page loading state renders without crashing");
}
{
  // DATA branch — state order: categories, gamecategories,
  // testCountByMCat, levelsByMCat, loading, activeLevel, levelData,
  // plays, statusSel, diffSel, collapsed, autoOpened.
  stateQueue = [cats5, mcats5, counts5, levelsByMCat5, false, null, null, plays5, new Set(), new Set(), {}, false];
  const html = clean(ReactDOMServer.renderToString(
    React.createElement(ConceptTestStudent, { group: 1, role: "user", onBack: () => {} })
  ));
  stateQueue = null;
  check(html.includes("Back to collections") && html.includes("Master each topic"),
    "back button + page heading block kept");
  check(html.includes("Status") && html.includes("Suggested for you") && html.includes("Untouched") && html.includes("Mastered") && html.includes("Clear all"),
    "left filter panel renders (Status checkboxes + Clear all)");
  check(html.includes("Difficulty") && html.includes("Moderate") && html.includes("Difficult"),
    "difficulty filter section present (tests carry levels)");
  check(html.includes("Continue AP/GP") && html.includes("1 of 3 tests done") && html.includes("next: Moderate") && html.includes("Resume"),
    "continue protagonist card: title + sub-line + Resume");
  check(html.includes("scored under 50% twice — worth a revisit") && html.includes("Revise →"),
    "suggested group: reason line + Revise action");
  check(html.includes("All topics") && html.includes("3 tests · Easy → Difficult"),
    "'All topics' rows with untouched fact line");
  check(html.includes("Mastered") && html.includes("Review →") && html.includes("Start →") && html.includes("Continue →"),
    "row actions: Review / Start / Continue + Mastered chip");
  check(!html.includes("tests inside") && !html.includes("Tap to browse"),
    "old card grammar gone (no 'tests inside' / 'Tap to browse')");
  check(!html.includes(">—<"), "no empty '—' rings (untouched shows a quiet dot)");
}

// ── 6 · BadgeVault (grid-only cap — no elongated list) ──────────
console.log("\n[6] components/BadgeVault.js");
const BadgeVault = require(path.join(root, "components", "BadgeVault.js")).default;
const stats6 = { streak_days: 7, mock_count: 1, test_count: 30, sos_best: 65, sos_perfect: false, sd_best: 5, gulp_best: 100, duel_wins: 1, air1_slain: false };
{
  stateQueue = [stats6, false];
  const html = clean(ReactDOMServer.renderToString(React.createElement(BadgeVault, { userData: { email: "me@x.com" }, totalXp: 500 })));
  stateQueue = null;
  check(html.includes("Your vault") && html.includes("View full vault"), "compact vault card + expand toggle render");
  check(!html.includes("AIR 1 Material"), "compact shelf stays capped (far-off badges hidden)");
}
{
  stateQueue = [stats6, true];
  const html = clean(ReactDOMServer.renderToString(React.createElement(BadgeVault, { userData: { email: "me@x.com" }, totalXp: 500 })));
  stateQueue = null;
  check(html.includes("AIR 1 Material") && html.includes("Iron Month") && html.includes("Show less"),
    "expanded vault = ALL badges as more tiles in the same grid");
  check(!html.includes("Skill Trainers") && !html.includes("✓ Unlocked"),
    "elongated sectioned list is gone (no section headers / list markers)");
}

console.log(failed === 0 ? "\nSSR checks green." : `\n${failed} failure(s).`);
process.exit(failed > 0 ? 1 : 0);
