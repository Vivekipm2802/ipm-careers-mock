// ============================================================
// GET /api/conceptTest?uuid=<level uuid> — fast concept-test loader.
//
// Why this exists (2026-10-23): the test page used to fetch
// levels + embedded questions through the browser client, and the
// per-row RLS check on `questions` took ~9 SECONDS for a 25-question
// level (measured with a real student JWT) — on slower connections it
// timed out and students sat on "Loading..." forever.
//
// This route reads with the service role (no per-row RLS walk, ~300ms)
// and enforces the SAME access rules in one pass:
//   - caller must be a signed-in user (JWT);
//   - admins: always allowed;
//   - demo (zero enrollments): only levels flagged demo=true;
//   - enrolled: some enrolled course must carry an access_meta row
//     {type:'lvl', course_id, value:'all' | String(level.difficulty)}
//     — mirroring the levels SELECT policy (which ignores content_id).
//
// 200 { level, questions } | 401 | 403 | 404 | 5xx { error }
// ============================================================

import { getAuthUser, isAdminEmail } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const uuid = String(req.query.uuid || "").trim();
  if (!uuid) return res.status(400).json({ error: "uuid is required" });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Sign in required" });

  try {
    // Speed (2026-10-29): independent lookups in parallel (was 5–6
    // sequential round-trips incl. a second auth call via requireAdmin).
    const [lvRes, admin, enrRes, lvlGrants] = await Promise.all([
      serversupabase.from("levels").select("*").eq("uuid", uuid).limit(1),
      isAdminEmail(user.email).catch(() => false),
      // enrollments keys on `email` (not `user`). No is_expired filter —
      // the levels RLS policy this mirrors doesn't apply one either.
      serversupabase.from("enrollments").select("course").eq("email", user.email),
      serversupabase.from("access_meta").select("course_id,value").eq("type", "lvl"),
    ]);
    if (lvRes.error) throw new Error(lvRes.error.message);
    const level = lvRes.data && lvRes.data[0];
    if (!level) return res.status(404).json({ error: "Test not found" });

    // questions can load while we finish the entitlement check
    const qPromise = serversupabase
      .from("questions")
      .select("*")
      .eq("parent", level.id)
      .order("seq", { ascending: true })
      .then((r) => r); // .then() starts the request now (query builders are lazy)

    // ── entitlement (mirrors the levels RLS policy) ──
    let allowed = !!admin;
    if (!allowed) {
      if (enrRes.error) throw new Error(enrRes.error.message);
      const courses = (enrRes.data || []).map((e) => e.course);
      if (courses.length === 0) {
        allowed = level.demo === true; // demo account: only demo-flagged levels
      } else {
        if (lvlGrants.error) throw new Error(lvlGrants.error.message);
        const mine = new Set(courses);
        allowed = (lvlGrants.data || []).some(
          (g) => mine.has(g.course_id) && (g.value === "all" || g.value === String(level.difficulty)),
        );
      }
    }
    if (!allowed) return res.status(403).json({ error: "Not available on your plan" });

    const { data: questions, error: qErr } = await qPromise;
    if (qErr) throw new Error(qErr.message);

    return res.status(200).json({ level, questions: questions || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not load test" });
  }
}
