// ============================================================
// scripts/test-leaderboard-route.js — end-to-end test of
// pages/api/leaderboard.js with a MOCKED supabase client + auth.
// Run: node scripts/test-leaderboard-route.js
// ============================================================

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "service-key";

const path = require("path");
const Module = require("module");
const root = path.join(__dirname, "..");

// ── canned DB ───────────────────────────────────────────────────
const conceptQuestions = [];
for (let i = 1; i <= 5; i++) {
  conceptQuestions.push({ id: i, type: "options", options: [{ title: "A" + i, isCorrect: true }, { title: "B" + i }] });
}
const conceptPlays = [
  // same user twice → dedupe keeps best (5 right = 20 marks)
  { uid: "p1", user: "aditi@x.com", name: "Aditi", score: 100, report: [{ id: 1, selectedOption: "1", timestamp: 30 }], duration: 300, created_at: "2026-08-01" },
  { uid: "p2", user: "aditi@x.com", name: "Aditi", score: 100, report: [1, 2, 3, 4, 5].map((i) => ({ id: i, selectedOption: "1", timestamp: i * 30 })), duration: 500, created_at: "2026-08-02" },
  // requester: 1 right 1 wrong = 3 marks
  { uid: "p3", user: "me@x.com", name: "Me", score: 100, report: [{ id: 1, selectedOption: "1", timestamp: 30 }, { id: 2, selectedOption: "2", timestamp: 60 }], duration: 400, created_at: "2026-08-03" },
];

const mockGroups = [
  { id: 1, type: "subject", subject: { title: "QA" }, pos: 4, neg: 1, test: 5 },
];
const mockModuleRows = [{ id: 10, parent_sub: 1, module: { id: 100 }, type: "module" }];
const mockQs = [
  { id: 1, parent: 100, type: "options", options: [{ title: "A1", isCorrect: true }, { title: "B1" }] },
  { id: 2, parent: 100, type: "input", options: { answer: "9" } },
];
const mockPlays = [
  // 1 MCQ right + 1 SA wrong → 4 marks (SA wrong free), not 5 (old += neg bug)
  { uid: "m1", user: "me@x.com", name: "Me", report: [{ id: 1, value: "1", at: 30 }, { id: 2, value: "7", at: 60 }], duration: 120, created_at: "2026-08-04" },
];

function builder(table) {
  const ops = [];
  const b = {
    select: () => b,
    order: () => b,
    limit: () => b,
    eq: (col, val) => { ops.push(["eq", col, val]); return b; },
    in: (col, vals) => { ops.push(["in", col, vals]); return b; },
    then: (resolve) => {
      let data = [];
      if (table === "levels") data = [{ id: 77, uuid: "uuid-77" }];
      else if (table === "questions") data = conceptQuestions;
      else if (table === "plays") data = conceptPlays;
      else if (table === "mock_groups") {
        const isModuleQuery = ops.some((o) => o[0] === "in" && o[1] === "parent_sub");
        data = isModuleQuery ? mockModuleRows : mockGroups;
      } else if (table === "mock_questions") data = mockQs;
      else if (table === "mock_plays") data = mockPlays;
      return resolve({ data, error: null });
    },
  };
  return b;
}
const fakeSupabase = { from: (table) => builder(table) };

// auth mock — flips to null for the 401 case
let authedUser = { email: "me@x.com" };

const mocks = {
  "@supabase/supabase-js": { createClient: () => fakeSupabase },
  "@/lib/apiAuth": { getAuthUser: async () => authedUser },
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  if (request.startsWith("@/")) return origLoad.call(this, path.join(root, request.slice(2)), parent, isMain);
  return origLoad.apply(this, arguments);
};

// transpile the ESM route on require
const fs = require("fs");
const compiled = path.join(root, "node_modules", "next", "dist", "compiled", "babel");
const babel = require(path.join(compiled, "core.js"));
const cjsPluginRaw = require(path.join(compiled, "plugin-transform-modules-commonjs.js"));
const cjsPlugin = cjsPluginRaw.default || cjsPluginRaw;
const origJs = Module._extensions[".js"];
Module._extensions[".js"] = function (mod, filename) {
  if (filename.startsWith(root) && !filename.includes("node_modules") && /pages[\\/]api/.test(filename)) {
    const src = fs.readFileSync(filename, "utf8");
    const out = babel.transformSync(src, { filename, babelrc: false, configFile: false, plugins: [cjsPlugin] });
    return mod._compile(out.code, filename);
  }
  return origJs(mod, filename);
};

const handler = require(path.join(root, "pages", "api", "leaderboard.js")).default;

function mkRes() {
  const res = { code: null, body: null };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

let passed = 0;
let failed = 0;
function eq(a, e, label) {
  if (JSON.stringify(a) === JSON.stringify(e)) { passed += 1; console.log(`  ok  ${label}`); }
  else { failed += 1; console.log(`FAIL  ${label}\n      expected ${JSON.stringify(e)}\n      got      ${JSON.stringify(a)}`); }
}

(async () => {
  console.log("\n[1] concept board through the route");
  {
    const res = mkRes();
    await handler({ method: "GET", query: { type: "concept", testId: "uuid-77" } }, res);
    eq(res.code, 200, "200 OK");
    eq(res.body.top.length, 2, "2 deduped students (Aditi's 2 attempts collapsed)");
    eq(res.body.top[0].name, "Aditi", "topper = Aditi's best attempt");
    eq(res.body.top[0].scoreMarks, 20, "topper marks 20/20 — stored '100' ignored");
    eq(res.body.top[0].maxMarks, 20, "maxMarks 20");
    eq(res.body.you.scoreMarks, 3, "requester's canonical 3 marks (4 − 1)");
    eq(res.body.you.rank, 2, "requester rank 2");
    eq(res.body.you.isYou, true, "isYou flag");
  }

  console.log("\n[2] mock board through the route");
  {
    const res = mkRes();
    await handler({ method: "GET", query: { type: "mock", testId: "5" } }, res);
    eq(res.code, 200, "200 OK");
    eq(res.body.top[0].scoreMarks, 4, "1 MCQ right + 1 SA wrong = 4 (SA wrong free, neg=+1 data handled)");
    eq(res.body.top[0].maxMarks, 8, "maxMarks 2 × 4");
    eq(res.body.top[0].attempted, 2, "attempted 2");
  }

  console.log("\n[3] guards");
  {
    const res = mkRes();
    await handler({ method: "GET", query: { type: "nope", testId: "x" } }, res);
    eq(res.code, 400, "invalid type → 400");
  }
  {
    authedUser = null;
    const res = mkRes();
    await handler({ method: "GET", query: { type: "concept", testId: "uuid-77" } }, res);
    eq(res.code, 401, "unauthenticated → 401");
    authedUser = { email: "me@x.com" };
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
