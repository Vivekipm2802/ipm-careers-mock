// ============================================================
// tag-mock-chapters.mjs — one-time AI chapter-tagging of the
// mock question bank (2026-09 design sprint 1).
//
// Unlocks the "chapters behind your wrongs" view on the mock
// analytics page: every mock_questions row gets a chapter from
// the portal's own concept tree (QA 27 · LR 14 · VA 13 chapters
// + Data Interpretation), stored as topic (title) + topic_id
// (concept category id, for future deep links into drills).
//
// TWO PHASES — nothing touches the DB until the owner has seen
// the review file:
//
//   Phase 1 · tag (safe, resumable):
//     GEMINI_API_KEY=xxx node scripts/tag-mock-chapters.mjs
//       → scripts/mock-tags-output.json   (all tags + confidence)
//       → Mock-chapter-tags-review.html   (repo root, for review)
//     Progress is checkpointed every batch; rerunning resumes.
//
//   Phase 2 · apply (after review; needs the SQL below run once):
//     node scripts/tag-mock-chapters.mjs --apply
//       alter table mock_questions
//         add column if not exists topic text,
//         add column if not exists topic_id int;
//
// Supabase creds are read from .env.local automatically — only
// the Gemini key is supplied on the command line (fill-bank.mjs
// pattern). Model ladder + batch style also match fill-bank.
// ============================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ── env ─────────────────────────────────────────────────────────
const envFile = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const SUPABASE_URL = (envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)/m) || [])[1]?.trim();
const SUPABASE_KEY = (envFile.match(/^SUPABASE_SERVICE_KEY=(.*)/m) || [])[1]?.trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const APPLY = process.argv.includes("--apply");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Could not read Supabase creds from .env.local");
  process.exit(1);
}
if (!APPLY && !GEMINI_API_KEY) {
  console.error("❌  Phase 1 needs the key: GEMINI_API_KEY=xxx node scripts/tag-mock-chapters.mjs");
  process.exit(1);
}

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };
const OUT_JSON = path.join(__dirname, "mock-tags-output.json");
const REVIEW_HTML = path.join(ROOT, "Mock-chapter-tags-review.html");

const stripHtml = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

// ── taxonomy from the live concept tree ─────────────────────────
async function loadTaxonomy() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_concept_tree`, {
    method: "POST", headers: H, body: JSON.stringify({ p_type: "concept" }),
  });
  const t = await r.json();
  const groups = Object.fromEntries((t.groups || []).map((g) => [g.id, g.title]));
  const skip = /PYQ|Topic Wise|Mixed Tests/i;
  const chapters = (t.categories || [])
    .map((c) => ({ id: c.id, title: String(c.title || "").replace(/[:\s]+$/, "").trim(), group: (groups[c.parent] || "").trim() }))
    .filter((c) => c.title && c.group && !skip.test(c.title) && !skip.test(c.group));
  // de-dupe titles within a group (the tree has e.g. Trigonometry twice)
  const seen = new Set();
  const clean = chapters.filter((c) => {
    const k = `${c.group}|${c.title.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return clean;
}

// ── Gemini ladder (fill-bank pattern) ───────────────────────────
async function askGemini(prompt) {
  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-pro-latest"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
              ...(model.includes("2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            },
          }),
        }
      );
      if (!res.ok) { console.log(`  ${model} → ${res.status}`); continue; }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      if (text) return text;
    } catch (e) {
      console.log(`  ${model} error: ${e.message}`);
    }
  }
  return null;
}

// ── phase 1 · tag ───────────────────────────────────────────────
async function tag() {
  const taxonomy = await loadTaxonomy();
  console.log(`Taxonomy: ${taxonomy.length} chapters`);
  const menu = taxonomy.map((c, i) => `${i + 1}. [${c.group}] ${c.title}`).join("\n");

  // all questions (paged)
  let questions = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mock_questions?select=id,question,type&order=id&limit=1000&offset=${from}`, { headers: H });
    const rows = await r.json();
    if (!Array.isArray(rows)) { console.error("questions fetch failed", rows); process.exit(1); }
    questions = questions.concat(rows);
    if (rows.length < 1000) break;
  }
  console.log(`Questions: ${questions.length}`);

  const done = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, "utf8")) : {};
  const todo = questions.filter((q) => !done[String(q.id)]);
  console.log(`Already tagged: ${Object.keys(done).length} · to do: ${todo.length}`);

  const BATCH = 25;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const list = batch
      .map((q) => `#${q.id} [${q.type === "input" ? "SA" : "MCQ"}] ${stripHtml(q.question).slice(0, 420)}`)
      .join("\n---\n");
    const prompt =
      `You are tagging exam questions from Indian IPM/BBA entrance mocks (IPMAT/JIPMAT level) with EXACTLY ONE chapter from this fixed menu:\n\n${menu}\n\n` +
      `Rules:\n- Pick the single best-fitting chapter NUMBER from the menu for each question.\n` +
      `- Reading passages / vocab / grammar → the matching Verbal chapter. Table/graph/caselet data questions → Data Interpretation. Puzzle/arrangement/series → the matching Logical Reasoning chapter.\n` +
      `- confidence: "high" if obvious, "medium" if plausible but arguable, "low" if genuinely unclear or the question is damaged/empty.\n\n` +
      `Questions:\n${list}\n\n` +
      `Reply with ONLY a JSON array: [{"id": <number after #>, "n": <menu number>, "confidence": "high|medium|low"}] — one entry per question, same order.`;
    const text = await askGemini(prompt);
    if (!text) { console.log("  batch failed, will retry on rerun"); continue; }
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/, ""));
    } catch (e) {
      console.log("  unparsable reply, skipping batch");
      continue;
    }
    (Array.isArray(parsed) ? parsed : []).forEach((row) => {
      const c = taxonomy[Number(row.n) - 1];
      if (!c || !row.id) return;
      done[String(row.id)] = { topic: c.title, topic_id: c.id, group: c.group, confidence: row.confidence || "low" };
    });
    fs.writeFileSync(OUT_JSON, JSON.stringify(done));
    process.stdout.write(`\r  tagged ${Math.min(i + BATCH, todo.length)} / ${todo.length}   `);
    await new Promise((r) => setTimeout(r, 350)); // gentle rate
  }
  console.log("");

  // ── review file ──
  const qText = new Map(questions.map((q) => [String(q.id), stripHtml(q.question).slice(0, 220)]));
  const entries = Object.entries(done);
  const byConf = { high: 0, medium: 0, low: 0 };
  const byChapter = {};
  entries.forEach(([, v]) => {
    byConf[v.confidence] = (byConf[v.confidence] || 0) + 1;
    const k = `[${v.group}] ${v.topic}`;
    byChapter[k] = (byChapter[k] || 0) + 1;
  });
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rowsHtml = (conf) =>
    entries
      .filter(([, v]) => v.confidence === conf)
      .map(([id, v]) => `<tr><td>#${id}</td><td>${esc(v.group)} · <b>${esc(v.topic)}</b></td><td>${esc(qText.get(id) || "")}…</td></tr>`)
      .join("");
  const sampleHigh = entries.filter(([, v]) => v.confidence === "high").filter((_, i) => i % Math.ceil(byConf.high / 40 || 1) === 0).slice(0, 40)
    .map(([id, v]) => `<tr><td>#${id}</td><td>${esc(v.group)} · <b>${esc(v.topic)}</b></td><td>${esc(qText.get(id) || "")}…</td></tr>`).join("");
  const chapterRows = Object.entries(byChapter).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join("");
  fs.writeFileSync(
    REVIEW_HTML,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mock chapter tags — review</title>
<style>body{font-family:-apple-system,sans-serif;max-width:960px;margin:0 auto;padding:30px 18px;color:#1a1a1a;background:#faf9f7}
h1{font-size:22px}h2{font-size:17px;margin-top:30px}table{border-collapse:collapse;font-size:12.5px;width:100%;background:#fff;margin-top:10px}
td,th{border:1px solid #ddd;padding:6px 10px;text-align:left;vertical-align:top}
.lead{background:#fff;border-left:4px solid #c9a227;padding:12px 14px;border-radius:8px;font-size:13.5px;line-height:1.65;color:#555}</style></head><body>
<h1>🏷 Mock bank chapter tags — review before apply</h1>
<p class="lead">${entries.length} of ${questions.length} questions tagged · confidence: <b>${byConf.high} high</b>, <b>${byConf.medium} medium</b>, <b>${byConf.low} low</b>.
Review the medium/low tables below (and the high-confidence sample). Fix any tag by editing scripts/mock-tags-output.json, then run <b>node scripts/tag-mock-chapters.mjs --apply</b> to write the tags to the database. Until then nothing changes for students.</p>
<h2>Questions per chapter</h2><table><tr><th>Chapter</th><th>Questions</th></tr>${chapterRows}</table>
<h2>Low confidence — please check (${byConf.low})</h2><table><tr><th>Id</th><th>Tag</th><th>Question</th></tr>${rowsHtml("low") || "<tr><td colspan=3>none</td></tr>"}</table>
<h2>Medium confidence (${byConf.medium})</h2><table><tr><th>Id</th><th>Tag</th><th>Question</th></tr>${rowsHtml("medium") || "<tr><td colspan=3>none</td></tr>"}</table>
<h2>High-confidence sample (40 of ${byConf.high})</h2><table><tr><th>Id</th><th>Tag</th><th>Question</th></tr>${sampleHigh}</table>
</body></html>`
  );
  console.log(`\nDone. Tagged ${entries.length}/${questions.length} (high ${byConf.high} · med ${byConf.medium} · low ${byConf.low})`);
  console.log(`Review file → Mock-chapter-tags-review.html (repo root)`);
  console.log(`Apply after review → node scripts/tag-mock-chapters.mjs --apply`);
}

// ── phase 2 · apply ─────────────────────────────────────────────
async function apply() {
  if (!fs.existsSync(OUT_JSON)) { console.error("❌  Run phase 1 first."); process.exit(1); }
  const done = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
  const ids = Object.keys(done);
  console.log(`Applying ${ids.length} tags…`);
  let ok = 0, err = 0;
  for (const id of ids) {
    const v = done[id];
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mock_questions?id=eq.${id}`, {
      method: "PATCH", headers: H, body: JSON.stringify({ topic: v.topic, topic_id: v.topic_id }),
    });
    if (r.ok) ok++; else { err++; if (err <= 3) console.log(`  #${id} → ${r.status} ${await r.text()}`); }
    if (ok % 200 === 0) process.stdout.write(`\r  written ${ok}/${ids.length}  `);
  }
  console.log(`\nDone: ${ok} written, ${err} errors.`);
  if (err > 0) console.log("If errors mention a missing column, run the ALTER TABLE from the header comment first.");
}

(APPLY ? apply() : tag()).catch((e) => { console.error(e); process.exit(1); });
