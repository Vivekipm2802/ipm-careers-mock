// ============================================================
// seed-demo-account.mjs — reset + seed the demo portal account
// (2026-09 demo-that-sells project).
//
// The demo experience is the real portal signed in as the demo
// account (lib/demo.js). A demo only sells when it looks LIVED-IN:
// this script wipes whatever visitors piled onto the account and
// rebuilds a curated, realistic history so every section shows its
// best face — a completed IIM B mock (full analytics v5 report),
// concept tests across chapters (chapter map, vault mistakes,
// trends), DSB streak + XP, Weekly DI banked, PYQ practice
// (readiness card), and a couple of doubts.
//
// Run anytime (reads Supabase creds from .env.local):
//   node scripts/seed-demo-account.mjs
// Safe to re-run — it always wipes-then-seeds to the same state.
// ============================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const URL_ = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)/m)[1].trim();
const KEY = envFile.match(/^SUPABASE_SERVICE_KEY=(.*)/m)[1].trim();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const DEMO = "slee23137@gmail.com";
const MOCK_TEST_ID = 219; // IIM Bangalore UG Mock 1 (the free one)
const daysAgo = (d, h = 10) => new Date(Date.now() - d * 864e5 - (24 - h) * 36e5).toISOString();

const get = async (u) => (await fetch(`${URL_}/rest/v1/${u}`, { headers: H })).json();
const post = async (u, body) => {
  const r = await fetch(`${URL_}/rest/v1/${u}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`insert ${u}: ${await r.text()}`);
};
const del = async (u) => fetch(`${URL_}/rest/v1/${u}`, { method: "DELETE", headers: H });

// deterministic "random" so every reset gives the identical demo
let seedState = 42;
const rnd = () => (seedState = (seedState * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

async function wipe() {
  for (const [table, col] of [
    ["mock_plays", "user"], ["plays", "user"], ["trainer_runs", "user"],
    ["pyq_attempts", "user"], ["doubt_requests", "user"],
    ["mentor_bookings", "student_email"], ["support_tickets", "student_email"],
    ["mistake_redos", "user"],
  ]) {
    await del(`${table}?${col}=eq.${encodeURIComponent(DEMO)}`);
  }
  console.log("wiped demo rows");
}

async function seedProfile() {
  await del(`student_profiles?email=eq.${encodeURIComponent(DEMO)}`);
  await post("student_profiles", {
    email: DEMO, full_name: "Sam Lee", phone: "9876500000",
    parent_name: "R. Lee", parent_phone: "9876500001", city: "Delhi",
    current_class: "Class 12", school: "Demo Public School, CBSE",
    target_exams: ["IPMAT Indore", "IIM Bangalore UG"], dob: "2009-04-14",
    category: "General",
    // photo_url is NOT NULL — a neutral initials avatar
    photo_url: "https://ui-avatars.com/api/?name=Sam+Lee&background=B8730A&color=fff&size=256",
    updated_at: new Date().toISOString(),
  });
  console.log("profile seeded");
}

async function seedMockPlay() {
  const secs = await get(`mock_groups?select=id,seq&test=eq.${MOCK_TEST_ID}&module=is.null&order=seq`);
  const links = await get(`mock_groups?select=module,parent_sub&parent_sub=in.(${secs.map(s => s.id).join(",")})&module=not.is.null`);
  const modOrder = secs.map(s => links.find(l => l.parent_sub === s.id)?.module).filter(Boolean);
  let qs = [];
  for (const m of modOrder) {
    const rows = await get(`mock_questions?select=id,options,type,seq&parent=eq.${m}&order=seq`);
    qs = qs.concat(rows);
  }
  let at = 0;
  const report = [];
  qs.forEach((q, i) => {
    const attempt = rnd() < 0.85; // ~51 of 60 attempted
    at += Math.round(40 + rnd() * 110);
    if (!attempt) return;
    const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options);
    const correctIdx = opts.findIndex(o => o.isCorrect);
    const right = rnd() < 0.72;
    let pick = correctIdx;
    if (!right) { pick = (correctIdx + 1 + Math.floor(rnd() * (opts.length - 1))) % opts.length; }
    report.push({ id: q.id, at, selectedOption: String(pick + 1) });
  });
  await post("mock_plays", {
    uid: crypto.randomUUID(), user: DEMO, test_id: MOCK_TEST_ID,
    report, score: 0, duration: at + 60, created_at: daysAgo(3, 18),
  });
  console.log(`mock play seeded: ${report.length}/60 attempted`);
}

async function seedConceptPlays() {
  // three well-formed concept tests with enough questions
  const levels = await get(`levels?select=id,uuid,title&order=id&limit=400`);
  // spread the picks across the syllabus (QA + VA + LR), not four
  // grammar tests in a row — the chapter map should look varied
  const wanted = [/number system/i, /percentage|profit/i, /reasoning|series|arrangement/i, /narration|comprehension|para/i, /interest|average|equation/i, /logarithm|geometry/i];
  const pool = [];
  for (const pat of wanted) {
    const hit = levels.find(l => pat.test(l.title || '') && !pool.includes(l));
    if (hit) pool.push(hit);
  }
  levels.forEach(l => { if (pool.length < 8 && !pool.includes(l)) pool.push(l); });
  const picked = [];
  for (const lv of pool) {
    if (picked.length >= 5) break;
    const qs = await get(`questions?select=id,options,type&parent=eq.${lv.id}&limit=40`);
    const mcq = qs.filter(q => q.type === "options" && Array.isArray(q.options) && q.options.length === 4 && q.options.some(o => o.isCorrect));
    if (mcq.length >= 10) picked.push({ lv, qs: mcq.slice(0, Math.min(mcq.length, 20)) });
  }
  let day = 9;
  for (const { lv, qs } of picked) {
    let t = 0;
    const report = [];
    let correct = 0, wrong = 0;
    qs.forEach(q => {
      if (rnd() < 0.12) return; // few skips
      t += Math.round(35 + rnd() * 100);
      const correctIdx = q.options.findIndex(o => o.isCorrect);
      const right = rnd() < 0.7;
      const pick = right ? correctIdx : (correctIdx + 1) % 4;
      if (right) correct++; else wrong++;
      report.push({
        id: q.id, type: "options", answer: q.options[pick].title,
        status: "answered", isCorrect: right, timestamp: t, selectedOption: String(pick + 1),
      });
    });
    await post("plays", {
      uid: crypto.randomUUID(), user: DEMO, test_uuid: lv.uuid,
      report, score: correct * 4 - wrong, duration: t + 30, created_at: daysAgo(day, 17),
    });
    console.log(`concept play seeded: ${lv.title} (${correct}✓/${wrong}✗)`);
    day -= 2;
  }
}

async function seedTrainers() {
  const runs = [];
  // past days only — TODAY stays unseeded so demo visitors can actually
  // attempt the daily trainers (owner: "review does not give a chance
  // to attempt"); same reason weekly-di is not seeded.
  for (let d = 5; d >= 1; d--) {
    runs.push({ user: DEMO, trainer: "daily-quiz", score: 6 + Math.floor(rnd() * 4), details: { seeded: true }, created_at: daysAgo(d, 8) });
    if (d !== 2) runs.push({ user: DEMO, trainer: "gulp-protocol", score: 260 + Math.floor(rnd() * 90), details: { seeded: true }, created_at: daysAgo(d, 9) });
    if (d % 2 === 0) runs.push({ user: DEMO, trainer: "skip-or-solve", score: 55 + Math.floor(rnd() * 25), details: { seeded: true }, created_at: daysAgo(d, 19) });
  }
  await post("trainer_runs", runs);
  console.log(`trainer runs seeded: ${runs.length}`);
}

async function seedPyq() {
  const qs = await get(`pyq_questions?select=id&exam=eq.ipmat_indore&order=id&limit=60`);
  const rows = [];
  qs.slice(0, 48).forEach((q, i) => {
    const r = rnd();
    const result = r < 0.68 ? "right" : r < 0.9 ? "wrong" : "seen";
    rows.push({ user: DEMO, question_id: q.id, result, created_at: daysAgo(8 - Math.floor(i / 8), 16) });
  });
  await post("pyq_attempts", rows);
  console.log(`pyq attempts seeded: ${rows.length}`);
}

async function seedDoubts() {
  const qs = await get(`questions?select=id&limit=2`);
  if (qs.length) {
    await post("doubt_requests", qs.map((q, i) => ({ user: DEMO, question_id: q.id, created_at: daysAgo(5 - i * 2, 15) })));
    console.log("doubts seeded: 2");
  }
}

(async () => {
  await wipe();
  await seedProfile();
  await seedMockPlay();
  await seedConceptPlays();
  await seedTrainers();
  await seedPyq();
  await seedDoubts();
  console.log("\nDemo account reset to showcase state.");
})().catch(e => { console.error(e); process.exit(1); });
