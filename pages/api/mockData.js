// ============================================================
// GET /api/mockData?test=<mock_test id> — fast full-mock loader.
//
// Why (2026-10-29): for accounts with ZERO enrollments (every demo
// visitor) the mock_groups RLS policy hits Postgres' statement timeout
// (57014, ~8s) — the free demo mocks sat on "Loading..." forever.
// Enrolled students were fine (~0.2s). This route reads with the
// service role and applies the same access rule the mock list shows:
//   admin                     → allowed
//   config.coming_soon        → 403 (placeholder, no paper yet)
//   config.public_access      → any signed-in user (demo free mock)
//   otherwise                 → user enrolled in test.course, a course
//                               in config.courses, or an access_meta
//                               {type:'mt', content_id: test} course.
// Response mirrors the three client queries it replaces:
//   { sections: mock_groups+subject, modules: mock_groups+module,
//     questions: mock_questions ordered by seq }
// ============================================================

import { getAuthUser, isAdminEmail } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";
import { getContent } from "@/lib/mockContent";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const testId = Number(req.query.test);
  if (!Number.isFinite(testId)) return res.status(400).json({ error: "test is required" });

  // start the paper + the test row while the login is being checked
  const contentP = getContent(testId, false);
  contentP.catch(() => {});
  const testP = serversupabase.from("mock_test").select("id, course, config").eq("id", testId).limit(1);

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Sign in required" });

  try {
    const [tRes, admin, enrRes, amRes] = await Promise.all([
      testP,
      isAdminEmail(user.email).catch(() => false),
      serversupabase.from("enrollments").select("course").eq("email", user.email), // keys on email
      serversupabase.from("access_meta").select("course_id").eq("type", "mt").eq("content_id", testId),
    ]);
    if (tRes.error) throw new Error(tRes.error.message);
    const test = tRes.data && tRes.data[0];
    if (!test) return res.status(404).json({ error: "Mock not found" });
    const cfg = test.config || {};

    let allowed = !!admin;
    if (!allowed) {
      if (cfg.coming_soon) return res.status(403).json({ error: "coming_soon" });
      if (cfg.public_access === true) {
        allowed = true;
      } else {
        if (enrRes.error) throw new Error(enrRes.error.message);
        const mine = new Set((enrRes.data || []).map((e) => e.course));
        const grant = new Set([
          test.course,
          ...(Array.isArray(cfg.courses) ? cfg.courses : []),
          ...((amRes.data || []).map((a) => a.course_id)),
        ]);
        allowed = [...mine].some((c) => grant.has(c));
      }
    }
    if (!allowed) return res.status(403).json({ error: "Not included in your plan" });

    // admins always get the live paper (so their edits show immediately)
    const content = admin ? await getContent(testId, true) : await contentP;
    return res.status(200).json(content);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not load mock" });
  }
}
