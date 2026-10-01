// ============================================================
// set-demo-concept-levels.mjs — control WHICH concept tests are
// open in the demo portal (2026-09 demo-that-sells).
//
// RLS on `levels`/`questions` shows a non-enrolled (demo) account
// only rows flagged demo=true, and the portal now treats exactly
// those rows as attemptable (everything else renders locked with
// an upgrade prompt — ConceptTestStudent.js). So this script IS
// the demo curriculum:
//   open topics (owner spec): Number System, Percentage,
//   Simple & Compound Interest, Narration, Blood Relations —
//   first test (easiest sub-level, oldest test) of each.
//
// It clears stray demo flags in the QA/VA/LR/DI concept groups,
// then sets demo=true on the five chosen tests. The PYQ concept
// group (id 7) is left untouched.
//
// Run anytime:  node scripts/set-demo-concept-levels.mjs
// ============================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const URL_ = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)/m)[1].trim();
const KEY = env.match(/^SUPABASE_SERVICE_KEY=(.*)/m)[1].trim();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const get = async (u) => (await fetch(`${URL_}/rest/v1/${u}`, { headers: H })).json();
const patch = async (u, body) => {
  const r = await fetch(`${URL_}/rest/v1/${u}`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${u}: ${await r.text()}`);
};

const CONCEPT_GROUPS = [4, 1, 5, 6]; // QA, VA, LR, DI — never the PYQ group (7)
const OPEN_TOPICS = [/number system/i, /percentage/i, /simple and compound/i, /narration/i, /blood relation/i];
const bandOf = (t) => {
  const s = (t || "").toLowerCase();
  if (/easy/.test(s)) return 0;
  if (/moderate|medium/.test(s)) return 1;
  if (/diff|hard/.test(s)) return 2;
  return 3;
};

(async () => {
  const cats = await get(`categories?select=id,title,parent&parent=in.(${CONCEPT_GROUPS.join(",")})`);
  const mcats = await get(`m_categories?select=id,title,parent&parent=in.(${cats.map((c) => c.id).join(",")})`);
  const levels = await get(`levels?select=id,title,parent,demo,created_at&parent=in.(${mcats.map((m) => m.id).join(",")})`);

  const chosen = [];
  for (const re of OPEN_TOPICS) {
    const cat = cats.find((c) => re.test(c.title || ""));
    if (!cat) { console.warn(`no category matches ${re}`); continue; }
    const subs = mcats.filter((m) => m.parent === cat.id).sort((a, b) => bandOf(a.title) - bandOf(b.title));
    let pick = null;
    for (const sub of subs) {
      const lv = levels
        .filter((l) => l.parent === sub.id)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
      if (lv) { pick = { cat: cat.title, sub: sub.title, ...lv }; break; }
    }
    if (pick) chosen.push(pick);
    else console.warn(`no tests found under ${cat.title}`);
  }

  const chosenIds = chosen.map((c) => c.id);
  const toClear = levels.filter((l) => l.demo === true && !chosenIds.includes(l.id)).map((l) => l.id);
  if (toClear.length) await patch(`levels?id=in.(${toClear.join(",")})`, { demo: false });
  if (chosenIds.length) await patch(`levels?id=in.(${chosenIds.join(",")})`, { demo: true });

  console.log(`cleared ${toClear.length} stray demo flags`);
  chosen.forEach((c) => console.log(`OPEN  ${c.cat}  →  ${c.title} (level ${c.id})`));
})().catch((e) => { console.error(e); process.exit(1); });
