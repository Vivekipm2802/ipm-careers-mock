// ============================================================
// scripts/video-health.mjs — find videos that don't play and move them
// to the END of every list (owner directive Oct 31 2026).
//
//   node scripts/video-health.mjs          scan + re-order (default)
//   node scripts/video-health.mjs --scan   scan only, change nothing
//
// A video is BROKEN when its link is missing, Bunny's embed answers with
// its "404" page (library/video deleted), or YouTube refuses to embed it
// (oEmbed 401/403/404). Broken items get seq + 10000 so they sort last:
//   • broken video        → last inside its lesson
//   • lesson all broken   → last inside its chapter
//   • chapter all broken  → last inside its pack (and the topic strip)
// When a video is fixed (re-uploaded / link replaced) the next run takes
// the 10000 back off, so its original position returns. Re-runnable.
// Writes health-reports/video-health-<date>.json; prints a JSON summary
// on the last line (health-check.mjs reads it).
// ============================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OFFSET = 10000;
const SCAN_ONLY = process.argv.includes("--scan");

function keys() {
  let env = "";
  try { env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8"); } catch {}
  const pick = (k) => (process.env[k] || (env.match(new RegExp(`^${k}=(.*)`, "m")) || [])[1] || "").trim();
  return { url: pick("NEXT_PUBLIC_SUPABASE_URL"), key: pick("SUPABASE_SERVICE_KEY") };
}
const { url: SB, key: KEY } = keys();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const get = async (p) => (await fetch(`${SB}/rest/v1/${p}`, { headers: H })).json();
const patch = (table, id, body) =>
  fetch(`${SB}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function checkVideo(raw) {
  const u = String(raw || "").trim();
  if (!/^https?:\/\//.test(u)) return "no link";
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    if (/mediadelivery\.net|bunny/i.test(u)) {
      const r = await fetch(u, { signal: ctl.signal, headers: { Referer: "https://study.ipmcareer.com/" } });
      const b = await r.text();
      return r.status >= 400 || /<title>\s*404\s*<\/title>/i.test(b) ? "Bunny 404" : "ok";
    }
    const m = u.match(/youtube\.com\/embed\/([\w-]{6,})|youtu\.be\/([\w-]{6,})|[?&]v=([\w-]{6,})/);
    if (m) {
      const id = m[1] || m[2] || m[3];
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, { signal: ctl.signal });
      if (r.status === 200) return "ok";
      return r.status === 404 ? "YouTube removed" : "YouTube blocks embedding";
    }
    return "not a video link";
  } catch (e) {
    return "unreachable"; // network hiccup — never treated as broken
  } finally {
    clearTimeout(t);
  }
}

const base = (s) => {
  const n = Number(s) || 0;
  return n >= OFFSET ? n - OFFSET : n;
};

(async () => {
  const videos = await get("videos?select=id,title,category,url,seq&limit=10000");
  const cats = await get("vcategory?select=id,title,parent,type,group_id,seq&limit=10000");
  const status = new Map();
  let i = 0;
  await Promise.all(
    Array.from({ length: 10 }, async () => {
      while (i < videos.length) {
        const v = videos[i++];
        status.set(v.id, await checkVideo(v.url));
      }
    }),
  );
  const isBroken = (v) => {
    const s = status.get(v.id);
    return s !== "ok" && s !== "unreachable";
  };

  // lesson / chapter verdicts
  const vidsBySub = new Map();
  videos.forEach((v) => {
    if (!vidsBySub.has(v.category)) vidsBySub.set(v.category, []);
    vidsBySub.get(v.category).push(v);
  });
  const subsByParent = new Map();
  cats.filter((c) => c.parent).forEach((c) => {
    if (!subsByParent.has(c.parent)) subsByParent.set(c.parent, []);
    subsByParent.get(c.parent).push(c);
  });
  const subDead = (c) => {
    const vs = vidsBySub.get(c.id) || [];
    return vs.length > 0 && vs.every(isBroken);
  };
  const chapterDead = (c) => {
    const subs = subsByParent.get(c.id) || [];
    const vs = subs.flatMap((s) => vidsBySub.get(s.id) || []).concat(vidsBySub.get(c.id) || []);
    return vs.length > 0 && vs.every(isBroken);
  };

  let moved = 0, restored = 0;
  const want = (row, dead) => (dead ? base(row.seq) + OFFSET : base(row.seq));
  const apply = async (table, row, dead) => {
    if (!dead && (row.seq == null || Number(row.seq) < OFFSET)) return; // healthy & untouched
    const target = want(row, dead);
    if ((Number(row.seq) || 0) === target) return;
    if (dead) moved++; else restored++;
    if (!SCAN_ONLY) await patch(table, row.id, { seq: target });
  };
  for (const v of videos) await apply("videos", v, isBroken(v));
  for (const c of cats) {
    if (c.type === "parent") await apply("vcategory", c, chapterDead(c));
    else if (c.parent) await apply("vcategory", c, subDead(c));
  }

  // report
  const catById = new Map(cats.map((c) => [c.id, c]));
  const chapterOf = (v) => {
    const s = catById.get(v.category);
    const p = s && s.parent ? catById.get(s.parent) : s;
    return p ? String(p.title || "").trim() : "(no chapter)";
  };
  const broken = videos.filter(isBroken).map((v) => ({ id: v.id, title: v.title, chapter: chapterOf(v), problem: status.get(v.id), url: v.url }));
  const byChapter = {};
  broken.forEach((b) => (byChapter[b.chapter] = (byChapter[b.chapter] || 0) + 1));
  const deadChapters = cats.filter((c) => c.type === "parent" && chapterDead(c)).map((c) => String(c.title || "").trim());
  const date = new Date().toISOString().slice(0, 10);
  try {
    fs.mkdirSync(path.join(ROOT, "health-reports"), { recursive: true });
    fs.writeFileSync(path.join(ROOT, "health-reports", `video-health-${date}.json`), JSON.stringify({ broken, byChapter, deadChapters }, null, 1));
  } catch {}
  const summary = {
    total: videos.length,
    broken: broken.length,
    unreachable: [...status.values()].filter((s) => s === "unreachable").length,
    deadChapters,
    byChapter,
    moved: SCAN_ONLY ? 0 : moved,
    restored: SCAN_ONLY ? 0 : restored,
  };
  console.log(`videos: ${summary.total}, broken: ${summary.broken}, moved to end: ${summary.moved}, restored: ${summary.restored}`);
  console.log(JSON.stringify(summary));
})();
