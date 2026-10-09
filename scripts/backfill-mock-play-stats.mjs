// ============================================================
// backfill-mock-play-stats.mjs — one-time (re-runnable) backfill of
// the scalar stat columns on mock_plays (2026-10 leaderboard-at-scale).
//
// For every play missing score/attempted/correct/max_marks, re-score
// its report with the canonical scorer (lib/scoring) and store the
// scalars. After this, /api/leaderboard ranks from the scalar columns
// and never fetches report JSON again.
//
// Run:  node scripts/backfill-mock-play-stats.mjs
// Safe to re-run — it only touches rows with missing stats.
// ============================================================

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { scoreMockPlay } = require(path.join(ROOT, "lib", "scoring.js"));

const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const URL_ = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)/m)[1].trim();
const KEY = env.match(/^SUPABASE_SERVICE_KEY=(.*)/m)[1].trim();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const get = async (u) => (await fetch(`${URL_}/rest/v1/${u}`, { headers: H })).json();
const patch = async (u, b) => {
  const r = await fetch(`${URL_}/rest/v1/${u}`, { method: "PATCH", headers: H, body: JSON.stringify(b) });
  if (!r.ok) throw new Error(`${u}: ${await r.text()}`);
};

async function scoringBundle(testId) {
  const groups = await get(`mock_groups?select=*,subject(*)&test=eq.${testId}`);
  const sectionRows = (groups || []).filter((s) => s.type === "subject" || (s.subject != null && s.module == null));
  const links = (groups || []).length
    ? await get(`mock_groups?select=*,module(*)&parent_sub=in.(${groups.map((g) => g.id).join(",")})`)
    : [];
  const moduleRows = (links || []).filter((m) => m.module);
  const questions = moduleRows.length
    ? await get(`mock_questions?select=id,parent,type,options&parent=in.(${moduleRows.map((m) => m.module.id).join(",")})`)
    : [];
  return { sectionRows, moduleRows, questions: questions || [] };
}

(async () => {
  // all rows still missing any scalar stat
  const pending = await get(
    "mock_plays?select=id,test_id&or=(score.is.null,attempted.is.null,correct.is.null,max_marks.is.null)&order=test_id"
  );
  console.log(`rows needing backfill: ${pending.length}`);
  const byTest = new Map();
  pending.forEach((p) => {
    if (!byTest.has(p.test_id)) byTest.set(p.test_id, []);
    byTest.get(p.test_id).push(p.id);
  });

  let done = 0, failed = 0;
  for (const [testId, ids] of byTest) {
    let bundle;
    try {
      bundle = await scoringBundle(testId);
    } catch (e) {
      console.log(`test ${testId}: bundle failed (${e.message}) — skipped ${ids.length} rows`);
      failed += ids.length;
      continue;
    }
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const rows = await get(`mock_plays?select=id,report&id=in.(${chunk.join(",")})`);
      const updates = [];
      for (const row of rows) {
        try {
          const scored = scoreMockPlay(bundle.sectionRows, bundle.moduleRows, bundle.questions, row.report || []);
          const t = scored && scored.total;
          if (!t || !Number.isFinite(t.score)) { failed++; continue; }
          updates.push({
            id: row.id,
            score: t.score,
            attempted: Number.isFinite(t.attempted) ? t.attempted : null,
            correct: Number.isFinite(t.correct) ? t.correct : null,
            max_marks: Number.isFinite(t.maxMarks) ? t.maxMarks : null,
          });
        } catch (e) { failed++; }
      }
      if (updates.length) {
        // one batched upsert per chunk: conflict on id → UPDATE of just
        // these columns. AFTER INSERT triggers (emails) do NOT fire on
        // the conflict-update path.
        const r = await fetch(`${URL_}/rest/v1/mock_plays?on_conflict=id`, {
          method: "POST",
          headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(updates),
        });
        if (!r.ok) { failed += updates.length; console.log("batch failed:", (await r.text()).slice(0, 150)); }
        else done += updates.length;
      }
    }
    console.log(`test ${testId}: done (${ids.length} rows)`);
  }
  console.log(`\nbackfill complete: ${done} updated, ${failed} skipped/failed`);
})().catch((e) => { console.error(e); process.exit(1); });
