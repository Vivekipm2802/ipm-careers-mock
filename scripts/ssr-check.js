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

// Swappable service-client stub: section 11 replaces this with a
// fixture-backed client so /api/announce recipient resolution can be
// exercised without any real Supabase (createClient below reads it
// lazily on every call).
let dynamicSupabase = supabaseStub;
// Every sendMail lands here (the transporter is a stub — nodemailer
// is never loaded and NO real email can ever leave this script).
const sentMails = [];

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
  // 2026-09 DSB trainer overhaul: PortalTour is chrome — stub both
  // the component and the first-visit hook so DSBChallenge's own
  // useState order stays the whole stateQueue contract.
  "./PortalTour": {
    __esModule: true,
    default: () => null,
    useFirstVisitTour: () => [false, () => {}],
  },
  // DSBChallenge imports the context RELATIVELY ("./NMNContext") —
  // same stub shape as the "@/components/NMNContext" mock above.
  "./NMNContext": {
    __esModule: true,
    default: () => null,
    useNMNContext: () => ({
      userDetails: { email: "me@x.com", user_metadata: { full_name: "Stu Dent" } },
      isRouting: false,
      setCTXSlug: () => {},
      setSK: () => {},
    }),
  },
  // BadgeVault imports levelFromXp from the heavy DSB page — stub the
  // module, replicate the level thresholds computeBadges cares about.
  "./DSBChallenge": {
    __esModule: true,
    default: () => null,
    levelFromXp: (xp) => ({ level: xp >= 12500 ? 10 : xp >= 7000 ? 8 : xp >= 2400 ? 5 : 1, name: "L", progress: 0, toNext: 0 }),
  },
  // 2026-08 announcements upgrade: pages/api/announce.js is required
  // directly (template + personalization unit tests) — its server
  // deps are stubbed so nodemailer/supabase never load and NO email
  // can ever be sent from this script.
  "@/lib/apiAuth": {
    requireAdmin: async () => ({ email: "admin@x.com", user_metadata: { full_name: "Admin Person" } }),
  },
  "@/lib/emailTransporter": {
    getTransporter: () => ({ sendMail: async (m) => { sentMails.push(m); return {}; } }),
    getFromAddress: () => '"IPM Careers" <info@example.test>',
  },
  "@supabase/supabase-js": { createClient: () => dynamicSupabase },
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  if (
    request === "react" && parent && parent.filename &&
    /pages[\\/]|components[\\/](ConceptGroups|ConceptTestStudent|BadgeVault|MistakeVault|Announcements|DSBChallenge|DailyQuiz|GulpProtocol|SkipOrSolve)\.js/.test(parent.filename)
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

console.log("\n[5b] components/ConceptTestStudent.js — card-grid topics page (preview-topics-v6)");
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
  // plays, statusFilter, topicQuery, autoOpened.
  stateQueue = [cats5, mcats5, counts5, levelsByMCat5, false, null, null, plays5, null, "", false];
  const html = clean(ReactDOMServer.renderToString(
    React.createElement(ConceptTestStudent, { group: 1, role: "user", onBack: () => {} })
  ));
  stateQueue = null;
  const src5b = fs.readFileSync(path.join(root, "components", "ConceptTestStudent.js"), "utf8");
  check(html.includes("Back to collections") && html.includes("Master each topic"),
    "back button + page heading block kept");
  check(!src5b.includes("PanelRow") && !html.includes("Clear all"),
    "left filter panel is gone (no PanelRow, no Clear all)");
  check(html.includes("Search a topic") && html.includes("Status:") && html.includes(">All</b>"),
    "search pill + single 'Status: All' dropdown pill render");
  check(html.includes("Continue AP/GP") && html.includes("1 of 3 done") && html.includes("next: Moderate") && html.includes("you left it") && html.includes("Resume"),
    "continue banner: title + 'k of n done · next · you left it' + Resume");
  check(html.includes("Suggested for you") && html.includes("from your scores and your Vault"),
    "suggested group label with Vault-aware copy");
  check(html.includes("worth a revisit") && html.includes("Revise →") && html.includes("var(--c-danger-soft)"),
    "suggested card: reason meta + Revise CTA + danger-tint tile");
  check(html.includes("All topics · 4") && html.includes("3 tests · Easy → Difficult"),
    "'All topics · N' label + untouched meta with level range");
  check(html.includes("Not started yet") && html.includes("Start →") && html.includes("Continue →"),
    "card states: Not started yet / Start / Continue");
  check(html.includes("mastered · all passed") && html.includes("Review →"),
    "mastered card: green-state foot + muted Review CTA");
  check(html.includes(">NS<") && html.includes(">AP<") && html.includes(">FU<"),
    "tile abbrevs render (NS / AP / FU via sectionAbbrev logic)");
  check(html.includes("minmax(280px"), "card grid uses repeat(auto-fill, minmax(280px, 1fr))");
  check(html.includes("ds-stat-value") && html.includes("td-lift"),
    "SectionRow anatomy reused (serif count + lift hover)");
}
{
  // live search: query "AP" must keep AP/GP and drop Number System
  stateQueue = [cats5, mcats5, counts5, levelsByMCat5, false, null, null, plays5, null, "AP", false];
  const html = clean(ReactDOMServer.renderToString(
    React.createElement(ConceptTestStudent, { group: 1, role: "user", onBack: () => {} })
  ));
  stateQueue = null;
  const allIdx = html.indexOf("All topics");
  const tail = allIdx >= 0 ? html.slice(allIdx) : "";
  check(tail.includes("AP/GP") && !tail.includes("Alligations"), "search filters the All-topics rows live");
}

// ── 6 · BadgeVault (2026-08 hard cap: EXACTLY 7 tiles, no expansion) ──
console.log("\n[6] components/BadgeVault.js");
const BadgeVault = require(path.join(root, "components", "BadgeVault.js")).default;
const { compactShelf: shelf6, computeBadges: badges6 } = require(path.join(root, "components", "BadgeVault.js"));
const stats6 = { streak_days: 7, mock_count: 1, test_count: 30, sos_best: 65, sos_perfect: false, sd_best: 5, gulp_best: 100, duel_wins: 1, air1_slain: false };
{
  stateQueue = [stats6];
  const html = clean(ReactDOMServer.renderToString(React.createElement(BadgeVault, { userData: { email: "me@x.com" }, totalXp: 500 })));
  stateQueue = null;
  check(html.includes("Your vault"), "vault card renders");
  // each tile carries the distinctive tile padding exactly once
  const tiles = (html.match(/padding:13px 4px 9px/g) || []).length;
  check(tiles === 7, `exactly 7 tiles render (got ${tiles})`);
  check(!html.includes("View full vault") && !html.includes("Show less"),
    "no 'View full vault' / 'Show less' — the cap is hard");
  check(!html.includes("AIR 1 Material"), "far-off badges stay hidden (no expanded mode)");
  check(!html.includes("Skill Trainers") && !html.includes("✓ Unlocked"),
    "elongated sectioned list is gone (no section headers / list markers)");
}
{
  // pure-logic cap: the shelf is exactly 7 for a sparse profile too
  // (0 unlocked → 7 closest locked fill the shelf)
  const sparse = shelf6(badges6({}, 0));
  check(sparse.length === 7 && sparse.every((b) => !b.unlocked),
    "compactShelf fills to exactly 7 even with nothing unlocked");
}

// ── 7 · MistakeVault (due-count reconcile: hero vs chapter chips) ──
// Fixture built so the chapters' due sum (14) ≠ the old hero number
// (the capped 12): 9 due in Algebra + 5 due in Geometry, plus one
// upcoming and one mastered. The hero must say "12 of 14 due" (cap
// kept, copy honest) and the chips must sum to the same 14.
console.log("\n[7] components/MistakeVault.js");
const MistakeVault = require(path.join(root, "components", "MistakeVault.js")).default;
const mk7 = (id, chapter, extra) => ({
  question_id: id,
  title: "Q" + id,
  question: "<p>q</p>",
  options: [{ title: "A", isCorrect: true }, { title: "B" }],
  chapter,
  test_title: chapter + " Test",
  wrong_count: 1,
  last_wrong_at: "2026-07-01T00:00:00Z", // long past day-3 → due today
  streak: 0,
  last_redo_at: null,
  last_reason: null,
  ...extra,
});
const items7 = [];
for (let i = 1; i <= 9; i++) items7.push(mk7(i, "Algebra"));
for (let i = 10; i <= 14; i++) items7.push(mk7(i, "Geometry"));
// one Geometry item not yet due (missed moments ago → due in 3 days)
items7.push(mk7(15, "Geometry", { last_wrong_at: new Date().toISOString() }));
// one mastered Algebra item (streak 3) — in the vault, never "due"
items7.push(mk7(16, "Algebra", { streak: 3 }));
{
  // state order: items, redosToday, phase, queue, qi, picked, reveal,
  // flash, moves, openChapter, sourceFilter, lastCorrect, showHow,
  // ownItems, pyqItems, guessItems, showGuessBanner, showAdd, addQ,
  // addChapter, addAnswer, addSaving, explain, doubtsToday.
  stateQueue = [items7, 0, "home", [], 0, null, false, null, [], null, null, null, false, [], [], [], false, false, "", "", "", false, null, 0];
  const html = clean(ReactDOMServer.renderToString(React.createElement(MistakeVault, { userData: { email: "me@x.com" } })));
  stateQueue = null;
  check(html.includes("Starting with 12 of 14 due today"),
    "hero is honest about the cap: 'Starting with 12 of 14 due today'");
  check(html.includes("9 due today") && html.includes("5 due today"),
    "chapter chips show per-chapter due (9 + 5 = the hero's 14)");
  check(!html.includes("14 questions due") && !html.includes("12 questions due"),
    "old flat 'N questions due' copy is gone when a backlog exists");
  check(html.includes(">16<"), "stat line: 16 in the vault (all items incl. mastered)");
  check(html.includes(">2<"), "stat line: 2 chapters — same dataset as the chip rows");
}
{
  // no backlog: 3 due only → plain copy, no "Starting with"
  stateQueue = [items7.slice(0, 3), 0, "home", [], 0, null, false, null, [], null, null, null, false, [], [], [], false, false, "", "", "", false, null, 0];
  const html = clean(ReactDOMServer.renderToString(React.createElement(MistakeVault, { userData: { email: "me@x.com" } })));
  stateQueue = null;
  // SSR escapes the apostrophe ("you&#x27;re") — match around it
  check(html.includes("3 questions due") && /then you.{0,8}re clear/.test(html) && !html.includes("Starting with"),
    "under the cap the copy stays simple: '3 questions due … then you're clear'");
}

// ── 8 · Featured-mock priority (lib/featuredMock.js) ────────────
// The Dashboard/MockTests live-banner pick is a pure helper so the
// rule is testable without SSR: featured live beats earlier-ending
// non-featured; several featured → soonest-ending featured; no
// featured → the old ends-soonest behaviour.
console.log("\n[8] lib/featuredMock.js — featured-wins selection");
{
  const { pickLiveMock } = require(path.join(root, "lib", "featuredMock.js"));
  const at = (h) => new Date(Date.UTC(2026, 7, 23, h));
  const plain1 = { title: "plain ends 1h", endsAt: at(1), config: {} };
  const plain9 = { title: "plain ends 9h", endsAt: at(9), config: {} };
  const feat5 = { title: "featured ends 5h", endsAt: at(5), config: { featured: true } };
  const feat3 = { title: "featured ends 3h", endsAt: at(3), config: { featured: true } };
  check(pickLiveMock([plain1, feat5]).title === "featured ends 5h",
    "featured live beats an earlier-ending non-featured mock");
  check(pickLiveMock([plain1, feat5, feat3]).title === "featured ends 3h",
    "multiple featured → soonest-ending featured wins");
  check(pickLiveMock([plain9, plain1]).title === "plain ends 1h",
    "no featured → old behaviour (soonest-ending live mock)");
  check(pickLiveMock([]) === null && pickLiveMock(null) === null,
    "empty / missing list → null");
  const mtShape = [
    { test: { config: {} }, endsAt: at(1), tag: "a" },
    { test: { config: { featured: true } }, endsAt: at(4), tag: "b" },
  ];
  check(pickLiveMock(mtShape, (x) => x.test.config).tag === "b",
    "config accessor form (MockTests {test} shape) works");
}

// ── 9 · Announcements admin tool renders ────────────────────────
console.log("\n[9] components/Announcements.js");
const Announcements = require(path.join(root, "components", "Announcements.js")).default;
{
  stateQueue = null;
  const html = clean(ReactDOMServer.renderToString(React.createElement(Announcements)));
  check(html.includes("Email the students"), "page heading renders");
  check(html.includes(">Subject</label>") && html.includes("What lands in the inbox line"),
    "subject input (label + placeholder) renders");
  check(html.includes("blank lines become paragraphs"), "message textarea renders");
  check(html.includes("Audience:") && html.includes("All students"),
    "audience PillDropdown renders with the All-students default");
  check(html.includes("Send test to me"), "send-test-to-me button renders");
  check(html.includes("Send to students"), "send-to-students button renders");
  check(html.includes("New mock is live"), "quick-fill template chip renders");
  check(!html.includes("This emails"), "confirm step hidden until a count is fetched");
  check(html.includes("becomes the student"), "{{name}} personalization note near the heading field");
  check(!html.includes("Mock banner"), "mock-mode fields hidden in plain mode");
}
{
  // MOCK MODE: state after the "New mock is live" quick-fill ran.
  // State order: mode, subject, heading, message, ctaLabel, ctaUrl,
  // mockName, mockMeta, mockWindow, stats, tips, afterTitle,
  // afterText, afterLinkLabel, afterLinkUrl, audience, sendingTest,
  // counting, confirmTotal, sending, result.
  stateQueue = [
    "mock",
    "New mock live: IIM Bangalore UG Mock 1",
    "A new mock is live, {{name}}.",
    "The window is open on your portal — and this one is free for everyone.",
    "",
    "https://study.ipmcareer.com",
    "IIM Bangalore UG Mock 1",
    "Real exam pattern · 135 minutes · attempt in one sitting. Your analysis unlocks the moment you submit.",
    "open now · free for every aspirant",
    [
      { label: "QA & DI", count: "30", note: "65 min · +3 / −1" },
      { label: "Logical Reasoning", count: "15", note: "35 min · +3 / −1" },
      { label: "VARC", count: "15", note: "35 min · +3 / −1" },
    ],
    "Tip one about section order\nTip two — accuracy beats attempts\nTip three review same day",
    "After you submit",
    "Score, leaderboard, section-wise accuracy and full solutions — instantly.",
    "Open the portal →",
    "https://study.ipmcareer.com",
    "all",
    false,
    false,
    null,
    false,
    null,
  ];
  const html = clean(ReactDOMServer.renderToString(React.createElement(Announcements)));
  stateQueue = null;
  check(html.includes("Plain announcement"), "mock mode shows the back-to-plain link");
  check(html.includes('value="IIM Bangalore UG Mock 1"'), "mock-name field prefilled");
  check(html.includes("Real exam pattern"), "meta-line field prefilled");
  check(html.includes("free for every aspirant"), "window-line field prefilled");
  check(html.includes("Logical Reasoning") && html.includes("VARC"),
    "three stat rows render (label/count/note triplets)");
  check(html.includes("accuracy beats attempts"), "tips textarea prefilled (one per line)");
  check(html.includes('value="After you submit"') && html.includes("Score, leaderboard"),
    "after-submit title + text fields prefilled");
  check(html.includes('value="Open the portal →"'), "after-submit link label prefilled");
  check(!html.includes("Button label (optional)"), "plain CTA-label input hidden in mock mode");
}
{
  // SPECIFIC-BATCHES MODE (2026-08 batch targeting). State order now
  // ends …, audience, sendingTest, counting, confirmTotal, sending,
  // result, batchList, selectedBatchIds (new hooks appended LAST so
  // the older fixtures above keep their queue alignment).
  const emptyStats = [
    { label: "", count: "", note: "" },
    { label: "", count: "", note: "" },
    { label: "", count: "", note: "" },
  ];
  const batchFixture = [
    { id: 53, title: "Lt- 2 Batch", active: true },
    { id: 54, title: "Pioneers Batch", active: true },
    { id: 20, title: "LT-1 & 2", active: false },
  ];
  const batchesQueue = (selected) => [
    "plain", "Subject line", "", "Body message", "", "",
    "", "", "", emptyStats.map((s) => ({ ...s })), "", "", "", "", "",
    "batches", false, false, null, false, null,
    batchFixture, selected,
  ];
  const goldFillCount = (html) =>
    (html.match(/background:var\(--c-brand-gold\)[;"]/g) || []).length;
  const sendBtnDisabled = (html) => {
    const idx = html.indexOf("Send to students");
    const open = html.lastIndexOf("<button", idx);
    return html.slice(open, idx).includes("disabled");
  };

  // 0 selected — checklist renders, send gated shut
  stateQueue = batchesQueue([]);
  const html0 = clean(ReactDOMServer.renderToString(React.createElement(Announcements)));
  stateQueue = null;
  check(html0.includes(">Specific batches<"), "audience pill shows 'Specific batches'");
  check(html0.includes("Pick batches"), "checklist panel revealed in specific-batches mode");
  check(html0.includes("Lt- 2 Batch") && html0.includes("Pioneers Batch") && html0.includes("LT-1 &amp; 2"),
    "all fixture batch rows render (active + inactive)");
  check((html0.match(/>ACTIVE</g) || []).length === 2,
    "ACTIVE chip on exactly the two active batches");
  check(html0.includes("0 selected"), "quiet 'n selected' line shows 0");
  check(sendBtnDisabled(html0), "Send button DISABLED at 0 batches selected (subject/message filled)");
  check(goldFillCount(html0) === 1, "no gold-filled checkbox yet (only the send pill is gold)");

  // 2 selected — send unlocked, boxes filled gold
  stateQueue = batchesQueue([53, 54]);
  const html2 = clean(ReactDOMServer.renderToString(React.createElement(Announcements)));
  stateQueue = null;
  check(html2.includes("2 selected"), "quiet line updates to '2 selected'");
  check(!sendBtnDisabled(html2), "Send button ENABLED once ≥1 batch is picked");
  check(goldFillCount(html2) === 3, "two 15px checkboxes carry the gold fill when on (+ send pill)");
  check(html2.includes("width:15px") && html2.includes("border-radius:5px"),
    "checkbox anatomy: 15px square, rounded-5 (concept filter panel grammar)");

  // plain mode never leaks the checklist
  stateQueue = null;
  const htmlPlain = clean(ReactDOMServer.renderToString(React.createElement(Announcements)));
  check(!htmlPlain.includes("Pick batches"), "checklist hidden for the All-students default");
}

// ── 10 · /api/announce — approved template + personalization ────
// The template function is exported for testing; its server deps
// are mocked above, so requiring the route touches no SMTP/DB.
console.log("\n[10] pages/api/announce.js — approved email design + {{name}}");
const ann = require(path.join(root, "pages", "api", "announce.js"));
{
  const { personalize } = ann;
  check(personalize("A new mock is live, {{name}}.", "Rishita Gupta") === "A new mock is live, Rishita.",
    "'…, {{name}}.' + 'Rishita Gupta' → '…, Rishita.' (first name only)");
  check(personalize("A new mock is live, {{name}}.", null) === "A new mock is live.",
    "no name: comma + token removed, period stays");
  check(personalize("Welcome {{name}} to the portal", null) === "Welcome to the portal",
    "no name, no comma: space + token removed cleanly");
  check(personalize("Hi {{name}}, your analysis is ready.", "Aman Verma") === "Hi Aman, your analysis is ready.",
    "message body token replacement");
}
{
  // PLAIN template — approved shell markers.
  const html = ann.announceTemplate({
    heading: "A new mock is live, {{name}}.",
    message: "First para.\n\nSecond para.",
    ctaLabel: "Open the portal →",
    ctaUrl: "https://study.ipmcareer.com",
    template: "plain",
    mock: null,
    recipientName: "Rishita Gupta",
  });
  check(html.includes("#6B2D82") && html.includes("STUDY PORTAL"),
    "header row: purple IPM CAREERS + grey caps STUDY PORTAL");
  check(html.includes("#FFFDF8") && html.includes("#EFE8DA"),
    "cream page bg + #FFFDF8 card");
  check(html.includes('>Rishita.</span>') && html.includes("font-style:italic;color:#B8730A"),
    "headline: gold italic personalized first name (period inside the span)");
  check(html.includes("First para.") && html.includes("Second para."),
    "message paragraphs render");
  check(html.includes("Open the portal →") && html.includes("#C98A1B"),
    "plain mode: dark-gold CTA pill renders");
  check(!html.includes("#FBEFD3"), "no gold mock banner without mock data");
  // 2026-08 owner edit: address removed, helpline changed.
  check(html.includes("+91 82994 70392") && !html.includes("Vijay Nagar"),
    "footer: helpline updated, address removed");
  check(html.includes("study account") && html.includes("&copy; 2026"),
    "footer: account line + copyright");
}
{
  // MOCK template — full data.
  const html = ann.announceTemplate({
    heading: "A new mock is live, {{name}}.",
    message: "The window is open.",
    ctaLabel: null,
    ctaUrl: null,
    template: "mock",
    mock: {
      name: "IIM Bangalore UG Mock 1",
      metaLine: "Real exam pattern · 135 minutes · attempt in one sitting.",
      windowLine: "open now · free for every aspirant",
      stats: [
        { label: "QA & DI", count: "30", note: "65 min · +3 / −1" },
        { label: "Logical Reasoning", count: "15", note: "35 min · +3 / −1" },
        { label: "VARC", count: "15", note: "35 min · +3 / −1" },
      ],
      tips: ["Tip one", "Tip two", "Tip three"],
      afterTitle: "After you submit",
      afterText: "Score, leaderboard, accuracy and solutions — instantly.",
      afterLinkLabel: "Open the portal →",
      afterLinkUrl: "https://study.ipmcareer.com",
    },
    recipientName: null,
  });
  check(html.includes("A new mock is live.") && !html.includes("{{name}}"),
    "no-name heading collapses to 'A new mock is live.'");
  check(html.includes("#FBEFD3") && html.includes("#EAD9AE"),
    "gold banner (#FBEFD3/#EAD9AE) renders when mock data present");
  check(html.includes("Mock window is open") && html.includes(">NEW</span>"),
    "banner: caps label + serif mock name + NEW outline chip");
  check(html.includes('href="https://study.ipmcareer.com"') && html.includes("Attempt &rarr;"),
    "Attempt pill defaults to https://study.ipmcareer.com");
  check(html.includes("QA &amp; DI") && html.includes(">30</div>") && html.includes("Logical Reasoning") && html.includes("VARC"),
    "3-cell stat strip (label / big serif count / note)");
  check(html.includes("Before you start") &&
    (html.match(/font-size:14px;color:#B8730A/g) || []).length === 3,
    "before-you-start: gold caps label + 3 serif gold numerals");
  check(html.includes("#F7F3EA") && html.includes("After you submit") &&
    html.includes("text-decoration:underline") && html.includes("Open the portal →"),
    "after-submit muted box + underlined gold link");
}
{
  // MOCK template — minimal data: optional blocks hidden, main CTA
  // omitted even when ctaLabel/ctaUrl are provided (banner has it).
  const html = ann.announceTemplate({
    heading: "H",
    message: "M",
    ctaLabel: "SHOULD_NOT_RENDER",
    ctaUrl: "https://study.ipmcareer.com",
    template: "mock",
    mock: { name: "X", metaLine: "", windowLine: "", stats: [], tips: [], afterTitle: "", afterText: "", afterLinkLabel: "", afterLinkUrl: "" },
    recipientName: null,
  });
  check(!html.includes("SHOULD_NOT_RENDER"), "mock mode: main CTA button omitted");
  check(html.includes("#FBEFD3") && html.includes("Attempt &rarr;"), "banner still renders with just a name");
  // NOTE: #EDE4D2 now always appears in the mobile <style> block
  // (stacked-stat media query), so assert on the actual stat cells.
  check(!html.includes("Before you start") && !html.includes("After you submit") && !html.includes('class="im-stat'),
    "stat strip / tips / after-box stay hidden without their data");
}

// ── 12 · DSB trainer overhaul (2026-09) ─────────────────────────
// End-of-run reveal, review mode, Gulp re-read panel, Skip-or-Solve
// decision flow, no-re-attempts affordances.
console.log("\n[12] DSB trainers — 2026-09 overhaul");
{
  // 12a · DailyQuiz — no mid-run verdicts, neutral gold selection.
  const DailyQuiz = require(path.join(root, "components", "DailyQuiz.js")).default;
  const qz = [
    { id: 1, title: "Q one", question: "<p>What is 2 + 2?</p>", options: [{ title: "3" }, { title: "4", isCorrect: true }], explanation: "<p>Because 2 + 2 = 4.</p>" },
    { id: 2, title: "Q two", question: "<p>Pick A.</p>", options: [{ title: "A-right", isCorrect: true }, { title: "B-wrong" }], explanation: "<p><strong>Write your Explanation Here...</strong></p>" },
    { id: 3, title: "Q three", question: "<p>Pick A again.</p>", options: [{ title: "AA", isCorrect: true }, { title: "BB" }] },
  ];
  // state order: phase, questions, qi, right, picked, records, reviewInfo
  stateQueue = ["play", qz, 0, 0, null, [], null];
  let html = clean(ReactDOMServer.renderToString(React.createElement(DailyQuiz, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes("answers at the end"), "quiz play: 'answers at the end' meta (no live right-count)");
  check(!html.includes("var(--c-success") && !html.includes("var(--c-danger"),
    "quiz play: NO success/danger styling anywhere mid-run");

  // picked option shows ONLY the neutral gold-tint selected state
  stateQueue = ["play", qz, 0, 0, 1, [1], null];
  html = clean(ReactDOMServer.renderToString(React.createElement(DailyQuiz, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes("var(--c-brand-gold-tint)") && !html.includes("var(--c-success") && !html.includes("var(--c-danger"),
    "quiz play: selected option is gold-tint only — still no verdict colors");

  // 12b · DailyQuiz end summary — answers + explanations
  stateQueue = ["done", qz, 2, 2, null, [1, 1, 0], null];
  html = clean(ReactDOMServer.renderToString(React.createElement(DailyQuiz, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes("Quiz complete") && /Today.{0,8}s score:/.test(html),
    "quiz summary: score headline renders");
  check(html.includes("Your answer") && html.includes("Correct answer"),
    "quiz summary: student's answer + correct answer marked per question");
  check(html.includes("Because 2 + 2 = 4."), "quiz summary: real explanation renders");
  check(!html.includes("Write your Explanation"), "quiz summary: placeholder explanations filtered out");
  check(html.includes("var(--c-success)") && html.includes("var(--c-danger)"),
    "quiz summary: verdict colors appear ONLY at the end");

  // 12c · DailyQuiz banked → opens in review, never play
  stateQueue = null;
  html = clean(ReactDOMServer.renderToString(React.createElement(DailyQuiz, { userData: { email: "me@x.com" }, onExit: () => {}, banked: true })));
  check(/Today.{0,8}s run · review/.test(html) && !html.includes("answers at the end"),
    "quiz banked: initial render is the read-only review, not a fresh run");
}
{
  // 12d · GulpProtocol — 5-question bank + collapsed re-read panel
  const GulpProtocol = require(path.join(root, "components", "GulpProtocol.js")).default;
  const PASSAGES = require(path.join(root, "components", "gulpPassages.js")).default;
  check(PASSAGES.length >= 6 && PASSAGES.every((p) => p.questions.length === 5),
    "gulp bank: every passage carries exactly 5 questions");
  check(PASSAGES.every((p) => p.questions.every((q) => q.o.length === 4 && q.a >= 0 && q.a < 4)),
    "gulp bank: every question has 4 options and a valid answer index");
  check(PASSAGES.every((p) => p.questions.slice(3).every((q) => typeof q.e === "string" && q.e.length > 10)),
    "gulp bank: the authored questions (4th & 5th) all carry explanations");

  const gp = PASSAGES[0];
  const marker = "professionalise Indian business"; // unique passage text
  // state order: phase, wpm, passage, chunks, ci, count, paused, qi,
  // picked, records, showPassage, reviewInfo, personalBest
  stateQueue = ["quiz", 350, gp, [], 0, 3, false, 0, null, [], false, null, null];
  let html = clean(ReactDOMServer.renderToString(React.createElement(GulpProtocol, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes("Re-read passage"), "gulp quiz: re-read panel toggle renders above the questions");
  check(!html.includes(marker), "gulp quiz: panel starts COLLAPSED (passage text absent)");
  check(!html.includes("var(--c-success") && !html.includes("var(--c-danger"),
    "gulp quiz: no verdict styling mid-run");

  stateQueue = ["quiz", 350, gp, [], 0, 3, false, 0, null, [], true, null, null];
  html = clean(ReactDOMServer.renderToString(React.createElement(GulpProtocol, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes(marker), "gulp quiz: expanded panel shows the passage text");

  // 12e · Gulp end summary — answers + explanations, one wrong pick
  stateQueue = ["done", 350, gp, [], 0, 3, false, 4, null, [0, 1, 2, 0, 0], false, null, null];
  html = clean(ReactDOMServer.renderToString(React.createElement(GulpProtocol, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes("Run complete") && html.includes("Effective rate"),
    "gulp summary: effective-rate headline + stat cards render");
  check(html.includes("Your answer") && html.includes("Correct answer"),
    "gulp summary: per-question answers marked");
  check(html.includes("seventeen-year-olds could handle a management curriculum"),
    "gulp summary: authored explanation renders");
}
{
  // 12f · SkipOrSolve — two decision buttons, no option list
  const SkipOrSolve = require(path.join(root, "components", "SkipOrSolve.js")).default;
  const SOS_BANK = require(path.join(root, "components", "sosBank.js")).default;
  const scorers = SOS_BANK.filter((x) => x.kind === "scorer");
  const traps = SOS_BANK.filter((x) => x.kind === "trap");
  check(scorers.length + traps.length === SOS_BANK.length && scorers.length >= 10 && traps.length >= 10,
    `sos bank: every item classified (${scorers.length} scorers / ${traps.length} traps)`);
  check(SOS_BANK.every((x) => typeof x.why === "string" && x.why.length > 15),
    "sos bank: every item carries a why rationale");
  check(new Set(SOS_BANK.map((x) => x.id)).size === SOS_BANK.length, "sos bank: ids unique");

  const deck3 = SOS_BANK.slice(0, 3);
  const run0 = { i: 0, score: 0, streak: 0, best: 0, good: 0, bad: 0, timeouts: 0 };
  // state order: phase, deck, run, tleft, verdict, records, reviewInfo, personalBest
  stateQueue = ["play", deck3, run0, 8, null, [], null, null];
  let html = clean(ReactDOMServer.renderToString(React.createElement(SkipOrSolve, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check((html.match(/Skip it/g) || []).length === 1 && (html.match(/Solve it/g) || []).length === 1,
    "sos play: EXACTLY two decision buttons (Skip it / Solve it)");
  check(!html.includes(">A.<") && !html.includes(">B.<"),
    "sos play: no answer-option list renders");
  check(html.includes("would you attempt this in the exam"), "sos play: stem-only framing line");

  // verdict card after a good call
  const run1 = { i: 1, score: 1, streak: 1, best: 1, good: 1, bad: 0, timeouts: 0 };
  stateQueue = ["play", deck3, run1, 8, { v: "good", item: deck3[0], call: "solve" }, [{ id: deck3[0].id, call: "solve", v: "good" }], null, null];
  html = clean(ReactDOMServer.renderToString(React.createElement(SkipOrSolve, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes("Good call · +1") && html.includes("Tap to continue"),
    "sos verdict card: 'Good call · +1' + tap-to-continue");
  check(html.includes(deck3[0].why.slice(0, 30)), "sos verdict card: the item's why line renders");

  // 12g · SoS end summary — your call vs right call + why
  const recs3 = [
    { id: deck3[0].id, call: "solve", v: deck3[0].kind === "scorer" ? "good" : "bad" },
    { id: deck3[1].id, call: "skip", v: deck3[1].kind === "trap" ? "good" : "bad" },
    { id: deck3[2].id, call: null, v: "timeout" },
  ];
  const runEnd = { i: 3, score: 1, streak: 0, best: 1, good: 1, bad: 1, timeouts: 1 };
  stateQueue = ["done", deck3, runEnd, 8, null, recs3, null, null];
  html = clean(ReactDOMServer.renderToString(React.createElement(SkipOrSolve, { userData: { email: "me@x.com" }, onExit: () => {} })));
  stateQueue = null;
  check(html.includes("Decision score"), "sos summary: score headline");
  check(html.includes("Your call") && html.includes("Right call"),
    "sos summary: per-round your-call vs right-call rows");
  check(html.includes("Best streak"), "sos summary: streak stat card");
  check(html.includes("No call (timed out)"), "sos summary: timeout round labelled");
}
{
  // 12h · DSBChallenge — banked affordances
  const DSBChallenge = require(path.join(root, "components", "DSBChallenge.js")).default;
  // state order: xp, board, myRank, todayQuiz, todayGulp, todaySos,
  // activeTrainer, sim, simSummary (+ BadgeVault child consumes next)
  stateQueue = [null, [], null, true, true, true, null, null, null];
  let html = clean(ReactDOMServer.renderToString(React.createElement(DSBChallenge, { userData: { email: "me@x.com" } })));
  stateQueue = null;
  check(/Review today.{0,8}s runs/.test(html), "dsb all-banked: main card button reads 'Review today's runs'");
  check(!/>Start\s*</.test(html), "dsb all-banked: the bare Start affordance is gone");
  check((html.match(/Review →/g) || []).length >= 3, "dsb all-banked: every banked mission row shows Review");
  check(/Review today.{0,8}s run\s*</.test(html), "dsb all-banked: trainer cards read 'Review today's run'");

  stateQueue = [null, [], null, false, false, false, null, null, null];
  html = clean(ReactDOMServer.renderToString(React.createElement(DSBChallenge, { userData: { email: "me@x.com" } })));
  stateQueue = null;
  check(/>Start\s*</.test(html) || html.includes("Start <"), "dsb fresh day: Start button back");
  check(!/Review today.{0,8}s runs/.test(html), "dsb fresh day: no review affordance");
  check(html.includes("Play now"), "dsb fresh day: trainer cards say Play now");
}

// ── 11 · /api/announce handler — batches audience (async) ───────
// Fixture-backed service client (dynamicSupabase swap) + recorded
// transporter: validates the batchIds gate and that recipients
// resolve from batch_admits rows for 2 batches with case-insensitive
// de-dupe. nodemailer stays stubbed — nothing can actually send.
(async () => {
  console.log("\n[11] pages/api/announce.js — batches audience (handler)");
  // Fake env so getServiceClient() constructs the stub client. These
  // are test literals, NOT real credentials.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.invalid";
  process.env.SUPABASE_SERVICE_KEY = "test-service-key";

  function fixtureSupabase(tables, users) {
    return {
      auth: {
        admin: {
          listUsers: async ({ page }) => ({
            data: { users: page === 1 ? users : [] },
            error: null,
          }),
        },
      },
      from(name) {
        let rows = (tables[name] || []).slice();
        const q = {
          select: () => q,
          order: () => q,
          eq: (col, val) => { rows = rows.filter((r) => r[col] === val); return q; },
          in: (col, vals) => { rows = rows.filter((r) => vals.includes(r[col])); return q; },
          range: (a, b) => { rows = rows.slice(a, b + 1); return q; },
          then: (resolve) => resolve({ data: rows, error: null }),
        };
        return q;
      },
    };
  }
  const users11 = [
    { email: "A@x.com", user_metadata: { full_name: "Aman Verma" } },
    { email: "b@x.com", user_metadata: { full_name: "Bela Rao" } },
    { email: "d@x.com", user_metadata: { full_name: "Dev" } },
  ];
  const tables11 = {
    batches: [
      { id: 53, title: "Lt- 2 Batch", status: "live", is_deleted: false },
      { id: 54, title: "Pioneers Batch", status: "live", is_deleted: false },
      { id: 20, title: "LT-1 & 2", status: "expired", is_deleted: false },
      { id: 1, title: "FAB 40 Batch", status: "expired", is_deleted: true },
    ],
    // batch 53 ∩ 54 share one student with a case-different email —
    // the distinct-recipient rule must collapse A@X.com / a@x.com.
    batch_admits: [
      { batch_id: 53, student_id: "A@X.com" },
      { batch_id: 53, student_id: "b@x.com" },
      { batch_id: 54, student_id: "a@x.com" },
      { batch_id: 54, student_id: "c@x.com" },
      { batch_id: 20, student_id: "z@x.com" },
    ],
  };
  dynamicSupabase = fixtureSupabase(tables11, users11);
  const handler = ann.default;
  const mkRes = () => {
    const r = { statusCode: 0, body: null };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
  };

  {
    // list=batches → sorted active-first then title, deleted hidden
    const res = mkRes();
    await handler({ method: "GET", query: { list: "batches" } }, res);
    const bl = (res.body && res.body.batches) || [];
    check(res.statusCode === 200 && bl.length === 3, "?list=batches → 200 with the 3 non-deleted batches");
    check(bl[0].title === "Lt- 2 Batch" && bl[1].title === "Pioneers Batch" && bl[2].title === "LT-1 & 2",
      "list sorted active-first, then title (expired batch last)");
    check(bl[0].active === true && bl[2].active === false,
      "each row carries {id,title,active}");
  }
  {
    // count mode for 2 batches → distinct emails (4 rows, 3 students)
    const res = mkRes();
    await handler({ method: "GET", query: { audience: "batches", batchIds: "53,54" } }, res);
    check(res.statusCode === 200 && res.body && res.body.total === 3,
      "count for batches 53+54 = 3 (case-insensitive de-dupe across batches)");
  }
  {
    // count mode with no ids → 400
    const res = mkRes();
    await handler({ method: "GET", query: { audience: "batches", batchIds: "" } }, res);
    check(res.statusCode === 400, "GET count without batchIds → 400");
  }
  {
    // POST with EMPTY batchIds → 400, nothing sent
    sentMails.length = 0;
    const res = mkRes();
    await handler(
      { method: "POST", query: {}, body: { subject: "S", message: "M", audience: "batches", batchIds: [] } },
      res
    );
    check(res.statusCode === 400, "POST audience=batches with empty batchIds → 400");
    check(sentMails.length === 0, "…and no mail left the (stubbed) transporter");
  }
  {
    // POST with non-int ids → 400
    const res = mkRes();
    await handler(
      { method: "POST", query: {}, body: { subject: "S", message: "M", audience: "batches", batchIds: ["53; DROP"] } },
      res
    );
    check(res.statusCode === 400, "POST with non-integer batchIds → 400");
  }
  {
    // POST real send to batches 53+54 → 3 personalized mails
    sentMails.length = 0;
    const res = mkRes();
    await handler(
      {
        method: "POST",
        query: {},
        body: { subject: "S", message: "Hi {{name}}, hello.", audience: "batches", batchIds: [53, 54] },
      },
      res
    );
    check(res.statusCode === 200 && res.body && res.body.sent === 3 && res.body.total === 3,
      "POST batches send → {sent:3, total:3}");
    const tos = sentMails.map((m) => m.to).sort();
    check(tos.join(",") === "a@x.com,b@x.com,c@x.com",
      "recipients are the distinct lowercased batch_admits emails of BOTH batches");
    const toAman = sentMails.find((m) => m.to === "a@x.com");
    check(Boolean(toAman) && toAman.html.includes("Hi Aman, hello."),
      "names resolve from the auth user map ({{name}} → Aman)");
    const toC = sentMails.find((m) => m.to === "c@x.com");
    check(Boolean(toC) && !toC.html.includes("{{name}}") && toC.html.includes("Hi, hello."),
      "no-name recipient gets the token stripped cleanly");
  }
  {
    // legacy audiences untouched: audience=batch still counts
    // enrollments rows (fixture: none) without erroring
    const res = mkRes();
    dynamicSupabase = fixtureSupabase({ ...tables11, enrollments: [{ email: "e@x.com" }] }, users11);
    await handler({ method: "GET", query: { audience: "batch" } }, res);
    check(res.statusCode === 200 && res.body && res.body.total === 1,
      "legacy audience=batch count still reads enrollments (unchanged)");
  }
  dynamicSupabase = supabaseStub;

  console.log(failed === 0 ? "\nSSR checks green." : `\n${failed} failure(s).`);
  process.exit(failed > 0 ? 1 : 0);
})();
