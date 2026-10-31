// ============================================================
// scripts/health-check.mjs — daily portal health check (2026-10-29).
//
// Owner's ask: catch problems BEFORE students report them. Every
// recent incident is covered by one of these checks:
//   • demo free mocks stuck on "Loading…"        → robot loads as demo
//   • submit saved without stats (dead `data` col) → robot submits + verifies row
//   • concept test 9s load / timeouts             → robot loads with a timer
//   • wrong section times on result pages         → timing sanity on real plays
//   • 6h submit hangs on real laptops             → real-device reports (client_events)
//   • broken/missing content in mocks             → nightly content audit
//
// A throwaway "robot student" is created for each run and fully deleted
// afterwards (user, enrollment, plays) — it never appears in lists,
// leaderboards or announcements.
//
// Run:  node scripts/health-check.mjs
// Writes health-reports/<YYYY-MM-DD>.md (git-ignored) and prints the
// same report. Exit code 1 when anything FAILs.
// ============================================================

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { computePlayTimes } = require(path.join(ROOT, "lib", "playTiming.js"));

// Keys: .env.local on the owner's Mac, or GitHub Actions secrets
// (.github/workflows/health-check.yml) when run on GitHub's servers.
const envFile = path.join(ROOT, ".env.local");
const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)`, "m"))?.[1] || process.env[k] || "").trim();
const SB = pick("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE = pick("SUPABASE_SERVICE_KEY");
const ANON = pick("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!SB || !SERVICE || !ANON) {
  console.error("Missing Supabase keys (.env.local or environment variables).");
  process.exit(2);
}
const SITE = process.env.HEALTH_SITE || "https://study.ipmcareer.com";
const DEMO_EMAIL = "slee23137@gmail.com";
// example.com is reserved for testing and can never receive mail, so the
// result-email DB trigger can never reach a real person.
const ROBOT_EMAIL = "healthcheck.robot@example.com";
const SH = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

const results = []; // { area, level: PASS|WARN|FAIL|INFO, msg }
const add = (area, level, msg) => results.push({ area, level, msg });

async function timed(fn) {
  const t0 = Date.now();
  try { const v = await fn(); return { v, ms: Date.now() - t0 }; }
  catch (e) { return { err: e, ms: Date.now() - t0 }; }
}
async function fetchT(url, opts = {}, ms = 30000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); } finally { clearTimeout(t); }
}
async function rest(p, opts = {}) {
  const r = await fetchT(`${SB}/rest/v1/${p}`, { ...opts, headers: { ...SH, "Content-Type": "application/json", ...(opts.headers || {}) } });
  const txt = await r.text();
  let body; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
}
async function getAll(p) { // paginate past the 1000-row cap
  let out = [], from = 0;
  for (;;) {
    const r = await fetchT(`${SB}/rest/v1/${p}`, { headers: { ...SH, Range: `${from}-${from + 999}` } });
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error(`${p}: ${JSON.stringify(rows).slice(0, 120)}`);
    out = out.concat(rows);
    if (rows.length < 1000) return out;
    from += 1000;
  }
}
async function jwtFor(email) {
  const r = await fetchT(`${SB}/auth/v1/admin/generate_link`, { method: "POST", headers: { ...SH, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", email }) });
  const j = await r.json();
  const v = await fetchT(`${SB}/auth/v1/verify`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: j.hashed_token }) });
  const s = await v.json();
  if (!s.access_token) throw new Error("login failed for " + email);
  return s.access_token;
}
const fmt = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(1) + "s" : ms + "ms");

// ── robot lifecycle ────────────────────────────────────────────
async function deleteRobot() {
  let users = { users: [] };
  for (let page = 1; page <= 20; page++) {
    const r = await fetchT(`${SB}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: SH }).then((x) => x.json()).catch(() => ({}));
    const u = r.users || [];
    users.users = users.users.concat(u);
    if (u.length < 1000) break;
  }
  await rest(`mock_plays?user=eq.${encodeURIComponent(ROBOT_EMAIL)}`, { method: "DELETE" });
  await rest(`plays?user=eq.${encodeURIComponent(ROBOT_EMAIL)}`, { method: "DELETE" });
  await rest(`enrollments?email=eq.${encodeURIComponent(ROBOT_EMAIL)}`, { method: "DELETE" });
  for (const u of users.users || []) {
    if (String(u.email).toLowerCase() === ROBOT_EMAIL) {
      await fetchT(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: SH });
    }
  }
}
async function createRobot() {
  await deleteRobot(); // leftovers from an interrupted run
  const r = await fetchT(`${SB}/auth/v1/admin/users`, { method: "POST", headers: { ...SH, "Content-Type": "application/json" }, body: JSON.stringify({ email: ROBOT_EMAIL, email_confirm: true, user_metadata: { full_name: "Health Check Robot" } }) });
  if (!r.ok) throw new Error("robot create failed " + r.status);
  for (const course of [1, 9]) {
    await rest("enrollments", { method: "POST", body: JSON.stringify({ email: ROBOT_EMAIL, course, is_expired: false, addedby: "health-check" }) });
  }
  return jwtFor(ROBOT_EMAIL);
}

// ── checks ─────────────────────────────────────────────────────
async function checkSite() {
  const { v, ms, err } = await timed(() => fetchT(SITE + "/", {}, 20000));
  if (err || !v.ok) return add("Site", "FAIL", `Portal home page is not loading (${err ? err.message : v.status}).`);
  add("Site", ms > 5000 ? "WARN" : "PASS", `Portal home page loads (${fmt(ms)}).`);
}

async function pickMocks() {
  const tests = await getAll("mock_test_slim?select=id,uid,title,category,course,seq,config&order=category,seq");
  // only mocks a student can actually reach: in a visible category, not hidden
  const cats = await getAll("mock_categories?select=id,hidden,is_visible");
  const shown = new Set(cats.filter((c) => c.hidden !== true && c.is_visible !== false).map((c) => c.id));
  const visible = tests.filter((t) => shown.has(t.category) && !t.config?.hidden && (!t.config?.generatorType || t.config.generatorType === "fullmock"));
  return { tests, visible };
}

async function checkMockLoad(robot, demo, visible) {
  const live = visible.filter((t) => !t.config?.coming_soon);
  const paid = live.find((t) => t.category === 13 && t.config?.featured) || live.find((t) => t.category === 13) || live[0];
  // paid student
  const a = await timed(() => fetchT(`${SITE}/api/mockData?test=${paid.id}`, { headers: { Authorization: `Bearer ${robot}` } }));
  if (a.err) add("Mock loading", "FAIL", `Enrolled student could not open "${paid.title}" (${a.err.message}).`);
  else if (a.v.status === 404) add("Mock loading", "WARN", `Fast mock loader (/api/mockData) is not deployed yet.`);
  else if (!a.v.ok) add("Mock loading", "FAIL", `Enrolled student could not open "${paid.title}" (status ${a.v.status}).`);
  else {
    const j = await a.v.json();
    const n = (j.questions || []).length;
    add("Mock loading", n > 0 && a.ms < 6000 ? "PASS" : a.ms >= 6000 ? "WARN" : "FAIL",
      `Enrolled student opens "${paid.title}": ${n} questions in ${fmt(a.ms)}.`);
  }
  // demo visitor on every free mock
  const free = live.filter((t) => t.config?.public_access === true);
  let ok = 0; const bad = []; const slow = [];
  for (const t of free) {
    const r = await timed(() => fetchT(`${SITE}/api/mockData?test=${t.id}`, { headers: { Authorization: `Bearer ${demo}` } }));
    if (r.err || !r.v.ok) bad.push(`"${t.title}" (${r.err ? r.err.message : r.v.status})`);
    else { const j = await r.v.json(); if (!(j.questions || []).length) bad.push(`"${t.title}" (no questions)`); else { ok++; if (r.ms >= 6000) slow.push(`"${t.title}" ${fmt(r.ms)}`); } }
  }
  if (a.v && a.v.status === 404) return; // loader not live yet — demo check meaningless
  if (bad.length) add("Demo visitors", "FAIL", `Free mocks NOT opening for demo visitors: ${bad.join("; ")}.`);
  else add("Demo visitors", "PASS", `All ${ok} free mocks open for demo visitors.`);
  if (slow.length) add("Demo visitors", "WARN", `Free mocks opening slowly (over 6s): ${slow.join("; ")}.`);
  // paid mock must stay locked for demo
  const locked = live.find((t) => t.config?.public_access !== true && t.category === 13);
  if (locked) {
    const r = await timed(() => fetchT(`${SITE}/api/mockData?test=${locked.id}`, { headers: { Authorization: `Bearer ${demo}` } }));
    if (r.v && r.v.ok) add("Access control", "FAIL", `Demo visitor could open PAID mock "${locked.title}" — it should be locked.`);
    else add("Access control", "PASS", `Paid mocks stay locked for demo visitors.`);
  }
}

async function checkConcept(robot) {
  const lv = await rest("levels?select=uuid,title,id&limit=40&order=id.desc");
  let target = null;
  for (const l of lv.body || []) {
    const q = await rest(`questions?select=id&parent=eq.${l.id}&limit=1`);
    if ((q.body || []).length) { target = l; break; }
  }
  if (!target) return add("Concept tests", "WARN", "Could not find a concept test with questions to try.");
  const r = await timed(() => fetchT(`${SITE}/api/conceptTest?uuid=${target.uuid}`, { headers: { Authorization: `Bearer ${robot}` } }));
  if (r.err || !r.v.ok) return add("Concept tests", "FAIL", `Concept test "${target.title}" did not open for an enrolled student (${r.err ? r.err.message : r.v.status}).`);
  const j = await r.v.json();
  add("Concept tests", r.ms < 6000 && (j.questions || []).length ? "PASS" : "WARN", `Concept test "${String(target.title).trim()}" opens: ${(j.questions || []).length} questions in ${fmt(r.ms)}.`);
  // concept submit (RLS insert as the student)
  const ins = await timed(() => fetchT(`${SB}/rest/v1/plays`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${robot}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ test_uuid: target.uuid, report: [], score: 0, duration: 60 }) }));
  if (ins.err || !ins.v.ok) add("Concept submit", "FAIL", `A student could not save a concept test result (${ins.err ? ins.err.message : ins.v.status}).`);
  else add("Concept submit", ins.ms < 6000 ? "PASS" : "WARN", `Concept test result saves (${fmt(ins.ms)}).`);
}

async function checkMockSubmit(robot, visible) {
  const live = visible.filter((t) => !t.config?.coming_soon);
  const t = live.find((x) => x.config?.send_email === false && x.category != null) || live.find((x) => x.category === 13);
  if (!t) return;
  const g = await rest(`mock_groups?select=id&test=eq.${t.id}`);
  const l = await rest(`mock_groups?select=module&parent_sub=in.(${(g.body || []).map((x) => x.id).join(",")})&module=not.is.null`);
  const qs = await rest(`mock_questions?select=id,options&type=eq.options&parent=in.(${(l.body || []).map((x) => x.module).join(",")})&limit=2`);
  const report = (qs.body || []).filter((q) => Array.isArray(q.options)).map((q, i) => {
    const opt = (q.options || [])[i === 0 ? (q.options || []).findIndex((o) => o.isCorrect) : 0] || {};
    return { id: q.id, value: opt.title, text: opt.title, at: 30 * (i + 1), ts: 30 * (i + 1) };
  });
  const r = await timed(() => fetchT(`${SITE}/api/submitMock`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${robot}` }, body: JSON.stringify({ test_id: t.id, report, data: [], duration: 600 }) }));
  if (r.err || !r.v.ok) return add("Mock submit", "FAIL", `A student could NOT submit a mock (${r.err ? r.err.message : r.v.status}). Students would be stuck on "Saving your result".`);
  const j = await r.v.json();
  const uid = j?.data?.uid;
  const row = (await rest(`mock_plays?select=score,attempted,correct,max_marks,duration,name&uid=eq.${uid}`)).body?.[0] || {};
  const missing = ["score", "attempted", "max_marks", "duration"].filter((k) => row[k] == null);
  if (missing.length) add("Mock submit", "FAIL", `Mock submits, but these are NOT being saved: ${missing.join(", ")} — results/leaderboards will be wrong.`);
  else add("Mock submit", r.ms < 6000 ? "PASS" : "WARN", `Mock submits and saves score + stats + time (${fmt(r.ms)}).`);
  // 2026-10-31: the "expired login at submit" case (2h mock > 1h token).
  // Submit with a dead access token + a valid refresh token: the server must
  // renew the login and save the attempt, not answer 401.
  try {
    const gl = await (await fetchT(`${SB}/auth/v1/admin/generate_link`, { method: "POST", headers: { ...SH, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", email: ROBOT_EMAIL }) })).json();
    const sess = await (await fetchT(`${SB}/auth/v1/verify`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: gl.hashed_token }) })).json();
    const exp = await timed(() => fetchT(`${SITE}/api/submitMock`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer expired.login.token" }, body: JSON.stringify({ test_id: t.id, report: report.slice(0, 1), data: [], duration: 7300, refresh_token: sess.refresh_token }) }));
    const ej = exp.v && exp.v.ok ? await exp.v.json() : null;
    if (ej?.data?.uid && ej?.session?.access_token) add("Expired-login submit", "PASS", `A student whose login expired during a long mock can still submit (${fmt(exp.ms)}).`);
    else add("Expired-login submit", "FAIL", `A student whose login expired during a long mock could NOT submit (${exp.err ? exp.err.message : exp.v.status}) — this is the daily "slow submit" cause.`);
  } catch (e) {
    add("Expired-login submit", "WARN", `Could not run the expired-login submit test (${e.message}).`);
  }
  const res = await timed(() => fetchT(`${SITE}/mock/result/${uid}`));
  add("Result page", res.v && res.v.ok ? "PASS" : "FAIL", res.v && res.v.ok ? `Result page opens (${fmt(res.ms)}).` : `Result page did not open (${res.err ? res.err.message : res.v.status}).`);
  const lb = await timed(() => fetchT(`${SITE}/api/leaderboard?type=mock&testId=${t.id}`, { headers: { Authorization: `Bearer ${robot}` } }));
  add("Leaderboard", lb.v && lb.v.ok && lb.ms < 8000 ? "PASS" : "WARN", lb.v && lb.v.ok ? `Leaderboard loads (${fmt(lb.ms)}).` : `Leaderboard problem (${lb.err ? lb.err.message : lb.v.status}).`);
}

async function checkRecentData(tests) {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const plays = await getAll(`mock_plays?select=id,test_id,user,score,attempted,max_marks,duration,report,created_at&created_at=gte.${since}`);
  const real = plays.filter((p) => p.user !== ROBOT_EMAIL);
  const noStats = real.filter((p) => p.attempted == null || p.max_marks == null);
  // 2026-10-31: attempts ARE saved in this case (answers + score) — only the
  // leaderboard columns are missing. Heal them automatically, then re-check.
  let healed = 0;
  if (noStats.length) {
    try {
      const { execFileSync } = await import("child_process");
      execFileSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), "backfill-mock-play-stats.mjs")], { stdio: "ignore", timeout: 180000 });
      const ids = noStats.map((p) => p.id).join(",");
      const after = await getAll(`mock_plays?select=id&id=in.(${ids})&attempted=not.is.null&max_marks=not.is.null`);
      healed = after.length;
    } catch (e) { /* reported below */ }
  }
  const stillMissing = noStats.length - healed;
  add("Saved attempts (24h)", stillMissing ? "FAIL" : healed ? "WARN" : "PASS",
    stillMissing
      ? `${stillMissing} of ${real.length} mock attempts in the last 24h are missing their stats and could not be fixed automatically (answers ARE saved).`
      : healed
        ? `${real.length} mock attempts in the last 24h, all saved. ${healed} came in by the backup route without leaderboard stats — fixed automatically.`
        : `${real.length} mock attempts in the last 24h, all saved with full stats.`);

  // duplicate submissions (same student + mock + identical answers) — Oct 29 incident
  const sig = (rep) => JSON.stringify((rep || []).map((r) => [String(r?.id), String(r?.value ?? r?.text ?? "")]).sort());
  const seenSig = new Map(); const dupes = [];
  for (const p of real) {
    const k = `${p.user}|${p.test_id}|${sig(p.report)}`;
    if ((p.report || []).length && seenSig.has(k)) dupes.push(`${p.user} (mock ${p.test_id})`); else seenSig.set(k, p.id);
  }
  add("Duplicate submits", dupes.length ? "WARN" : "PASS", dupes.length ? `Same answers saved twice in the last 24h: ${[...new Set(dupes)].join(", ")}.` : "No duplicate submissions in the last 24h.");

  // timing sanity on recent plays
  const byTest = new Map(tests.map((t) => [t.id, t]));
  const odd = [];
  for (const p of real.slice(0, 40)) {
    const t = byTest.get(p.test_id);
    if (!t) continue;
    const g = (await rest(`mock_groups?select=id,seq,time&test=eq.${p.test_id}&order=seq`)).body || [];
    const l = g.length ? (await rest(`mock_groups?select=parent_sub,module&parent_sub=in.(${g.map((x) => x.id).join(",")})&module=not.is.null`)).body || [] : [];
    const secOf = new Map();
    for (const x of l) {
      const q = (await rest(`mock_questions?select=id&parent=eq.${x.module}`)).body || [];
      q.forEach((qq) => secOf.set(String(qq.id), x.parent_sub));
    }
    const pt = computePlayTimes({ report: p.report, sectionOfQ: secOf, sections: g, locked: t.config?.switch_section === false, durationSec: p.duration, timeoutSec: Number(t.config?.timeout) || null });
    const timeout = Number(t.config?.timeout) || 0;
    for (const s of g) {
      const st = pt.secTimes.get(s.id) || 0;
      if (t.config?.switch_section === false && Number(s.time) > 0 && st > Number(s.time) * 1.1 + 120) odd.push(`${t.title.trim()}: a section shows ${Math.round(st / 60)}m (limit ${Math.round(s.time / 60)}m)`);
    }
    if (timeout && pt.totalSec > timeout * 1.15 + 300) odd.push(`${t.title.trim()}: total ${Math.round(pt.totalSec / 60)}m (limit ${Math.round(timeout / 60)}m)`);
  }
  add("Result timings", odd.length ? "WARN" : "PASS", odd.length ? `Impossible times on result pages: ${[...new Set(odd)].slice(0, 5).join("; ")}.` : `Section/total times on recent results look realistic.`);
}

async function checkDeviceReports() {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const r = await rest(`client_events?select=kind,email,test_id,detail,created_at&created_at=gte.${since}&order=created_at.desc&limit=500`);
  if (r.status === 404 || (r.body && r.body.code === "PGRST205")) return add("Student devices", "WARN", "Real-device problem reporting is not switched on yet (the client_events table needs creating — one SQL paste).");
  const rows = Array.isArray(r.body) ? r.body : [];
  const by = {};
  rows.forEach((x) => { (by[x.kind] ||= []).push(x); });
  const failed = by.mock_submit_failed || [];
  // "Not available on your plan" = a free account hitting a paid test: a lock, not a fault
  const cFail = [...(by.concept_submit_failed || []), ...(by.concept_load_failed || [])].filter(
    (x) => !/not available on your plan/i.test(String(x.detail?.error || "")),
  );
  const slow = by.mock_submit_slow || [];
  const recovered = by.mock_submit_recovered || [];
  if (failed.length) add("Student devices", "FAIL", `${failed.length} mock submit(s) failed on students' devices in the last 24h (answers kept on device, auto-retrying): ${[...new Set(failed.map((x) => x.email || "unknown"))].join(", ")}.`);
  if (cFail.length) add("Student devices", "FAIL", `${cFail.length} concept test load/submit failure(s) on students' devices: ${[...new Set(cFail.map((x) => x.email || "unknown"))].join(", ")}.`);
  // Every slow submit is checked against the database: was the attempt saved?
  if (slow.length) {
    let lost = [];
    for (const e of slow) {
      if (!e.email || !e.test_id) continue;
      const from = new Date(new Date(e.created_at).getTime() - 5 * 60e3).toISOString();
      const p = await rest(`mock_plays?select=id&user=eq.${encodeURIComponent(e.email)}&test_id=eq.${e.test_id}&created_at=gte.${from}&limit=1`);
      if (!(Array.isArray(p.body) && p.body.length)) lost.push(e.email);
    }
    if (lost.length) add("Student devices", "FAIL", `${lost.length} slow submit(s) with NO saved attempt yet: ${[...new Set(lost)].join(", ")} (answers are kept on their device and auto-retry).`);
    else add("Student devices", slow.length > 3 ? "WARN" : "PASS", `${slow.length} mock submit(s) took over 8s — every one of them IS saved.`);
  }
  if (!failed.length && !cFail.length) add("Student devices", "PASS", `No submit/load failures reported from students' devices in the last 24h${recovered.length ? ` (${recovered.length} recovered automatically)` : ""}.`);
  if (by.mock_load_fallback?.length) add("Student devices", "WARN", `Fast mock loader failed ${by.mock_load_fallback.length} time(s) and fell back to the slow path.`);
}

async function checkContent(visible) {
  const live = visible.filter((t) => !t.config?.coming_soon);
  const groups = await getAll(`mock_groups?select=id,test,subject,pos,neg,time&test=in.(${live.map((t) => t.id).join(",")})`);
  const links = await getAll(`mock_groups?select=parent_sub,module&parent_sub=in.(${groups.map((g) => g.id).join(",")})&module=not.is.null`);
  const am = await getAll("access_meta?select=course_id,content_id&type=eq.mt");
  const testOfSec = new Map(groups.map((g) => [g.id, g.test]));
  const testOfMod = new Map(links.map((l) => [l.module, testOfSec.get(l.parent_sub)]));
  const mods = [...testOfMod.keys()];
  let qs = [];
  // small batches + one retry: 60 modules of full question HTML hit the
  // database statement timeout (57014) on 2026-10-30
  for (let i = 0; i < mods.length; i += 8) {
    const path = `mock_questions?select=id,seq,parent,type,question,options,explanation&parent=in.(${mods.slice(i, i + 8).join(",")})`;
    let rows;
    try { rows = await getAll(path); } catch (e) { await new Promise((r) => setTimeout(r, 3000)); rows = await getAll(path); }
    qs = qs.concat(rows);
  }
  const perTest = new Map(); // tid → { problem → [question numbers] }
  const bump = (tid, k, seq) => {
    const m = perTest.get(tid) || {};
    (m[k] ||= []).push(seq ?? "?");
    perTest.set(tid, m);
  };
  const imgs = new Map();
  // real markup only — "0<a+b<15" is maths, not HTML
  const OPT_HTML = /&(lt|gt|amp|nbsp|quot|#\d+);|<\/?(sup|sub|b|i|u|br|p|span|strong|em|div)\b[^>]*>/i;
  for (const q of qs) {
    const tid = testOfMod.get(q.parent);
    const html = String(q.question || "");
    const hasMedia = /<(img|table|svg)\b/i.test(html);
    const stem = html.replace(/<[^>]+>/g, "").trim();
    if (stem.length < 5 && !hasMedia) bump(tid, "blank question", q.seq);
    if (q.type !== "input") {
      const o = Array.isArray(q.options) ? q.options : [];
      // JIPMAT-style papers legitimately carry a 5th "No error" / "None of these"
      const fifthOk = o.length === 5 && /^(no error|none of (these|the above))\.?$/i.test(String(o[4]?.title || "").trim());
      if (o.length !== 4 && !fifthOk) bump(tid, "not 4 options", q.seq);
      const nc = o.filter((x) => x.isCorrect).length;
      if (nc === 0) bump(tid, "NO correct answer marked", q.seq);
      else if (nc > 1) bump(tid, "more than 1 correct answer", q.seq);
      if (o.some((x) => OPT_HTML.test(String(x.title || "")))) bump(tid, "code showing in options", q.seq);
    }
    if (/ANSWER KEY|DETAILED SOLUTIONS/i.test(html + String(q.explanation || ""))) bump(tid, "answer-key text leaked", q.seq);
    for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) if (!m[1].startsWith("data:")) imgs.set(m[1], tid);
  }
  const qCount = new Map();
  qs.forEach((q) => { const tid = testOfMod.get(q.parent); qCount.set(tid, (qCount.get(tid) || 0) + 1); });
  for (const t of live) {
    if (!qCount.get(t.id)) bump(t.id, "has NO questions", "-");
    const amCourses = am.filter((a) => a.content_id === t.id).map((a) => a.course_id);
    if (!amCourses.length && t.config?.public_access !== true) bump(t.id, "no course access set", "-");
    // a course granted access but NOT unlocked in the list (list reads test.course + config.courses)
    const listUnlock = new Set([t.course, ...(t.config?.courses || [])]);
    const lockedOut = amCourses.filter((c) => !listUnlock.has(c));
    if (lockedOut.length) bump(t.id, `shown locked to course(s) ${lockedOut.join("/")} that have access`, "-");
  }
  // images
  const broken = [];
  const list = [...imgs.keys()];
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(list.slice(i, i + 8).map(async (u) => {
      try { const r = await fetchT(u, { method: "GET" }, 15000); if (!r.ok || !String(r.headers.get("content-type")).startsWith("image/")) broken.push(u); }
      catch { broken.push(u); }
    }));
  }
  broken.forEach((u) => bump(imgs.get(u), "broken image", "img"));
  const title = new Map(live.map((t) => [t.id, t.title.trim()]));
  const qno = (arr) => arr.every((x) => x === "-" || x === "img") ? "" : ` (Q ${arr.filter((x) => x !== "-").slice(0, 8).join(", ")}${arr.length > 8 ? "…" : ""})`;
  const sev = (k) => /NO correct|more than 1|blank|NO questions|broken image|leaked|not 4/.test(k) ? 0 : 1;
  const lines = [...perTest.entries()].map(([tid, m]) => ({ tid, items: Object.entries(m) }))
    .sort((a, b) => Math.min(...a.items.map(([k]) => sev(k))) - Math.min(...b.items.map(([k]) => sev(k))))
    .map(({ tid, items }) => `  - **${title.get(tid) || tid}**: ${items.sort((x, y) => sev(x[0]) - sev(y[0])).map(([k, v]) => `${k}${qno(v)}`).join("; ")}`);
  if (lines.length) add("Mock content", "FAIL", `${lines.length} live mock(s) have content problems:\n${lines.join("\n")}`);
  else add("Mock content", "PASS", `${live.length} live mocks · ${qs.length} questions · ${list.length} images — no content problems found.`);
}

// ── run ────────────────────────────────────────────────────────
const started = Date.now();
let robot = null;
try {
  await checkSite();
  robot = await createRobot();
  const demo = await jwtFor(DEMO_EMAIL);
  const { tests, visible } = await pickMocks();
  await checkMockLoad(robot, demo, visible);
  await checkConcept(robot);
  await checkMockSubmit(robot, visible);
  await checkRecentData(tests);
  await checkDeviceReports();
  await checkContent(visible);
} catch (e) {
  add("Health check", "FAIL", `The check itself crashed: ${e.message}`);
} finally {
  try { await deleteRobot(); } catch (e) { add("Health check", "WARN", "Robot clean-up failed: " + e.message); }
}

const fails = results.filter((r) => r.level === "FAIL");
const warns = results.filter((r) => r.level === "WARN");
const icon = { PASS: "✅", WARN: "⚠️", FAIL: "❌", INFO: "ℹ️" };
const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const head = fails.length ? `❌ ${fails.length} problem(s) need fixing` : warns.length ? `⚠️ All working — ${warns.length} thing(s) to watch` : "✅ All clear";
const md = [
  `# Portal health check — ${day}`,
  ``,
  `**${head}** (checked in ${Math.round((Date.now() - started) / 1000)}s)`,
  ``,
  ...["FAIL", "WARN", "PASS", "INFO"].flatMap((lv) => results.filter((r) => r.level === lv).map((r) => `- ${icon[lv]} **${r.area}** — ${r.msg}`)),
  ``,
].join("\n");
fs.mkdirSync(path.join(ROOT, "health-reports"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "health-reports", `${day}.md`), md);
// on GitHub, also show the report on the run's summary page
if (process.env.GITHUB_STEP_SUMMARY) {
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); } catch {}
}
console.log(md);
process.exit(fails.length ? 1 : 0);
