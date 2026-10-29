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

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const testId = Number(req.query.test);
  if (!Number.isFinite(testId)) return res.status(400).json({ error: "test is required" });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Sign in required" });

  try {
    // Speed (2026-10-29): was 9 sequential round-trips (~5s from Vercel).
    // Everything independent now runs in parallel → 3 rounds.
    const [tRes, admin, enrRes, amRes, sRes] = await Promise.all([
      serversupabase.from("mock_test").select("id, course, config").eq("id", testId).limit(1),
      isAdminEmail(user.email).catch(() => false),
      serversupabase.from("enrollments").select("course").eq("email", user.email), // keys on email
      serversupabase.from("access_meta").select("course_id").eq("type", "mt").eq("content_id", testId),
      serversupabase.from("mock_groups").select("*,subject(*)").eq("test", testId).order("seq", { ascending: true }),
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

    if (sRes.error) throw new Error(sRes.error.message);
    const sections = sRes.data || [];
    const sectionIds = sections.map((s) => s.id);
    let modules = [];
    if (sectionIds.length) {
      const { data, error } = await serversupabase
        .from("mock_groups")
        .select("*,module(*)")
        .in("parent_sub", sectionIds);
      if (error) throw new Error(error.message);
      modules = data || [];
    }
    const moduleIds = modules.filter((m) => m.module).map((m) => m.module.id);
    let questions = [];
    if (moduleIds.length) {
      const { data, error } = await serversupabase
        .from("mock_questions")
        .select("*")
        .in("parent", moduleIds)
        .order("seq", { ascending: true });
      if (error) throw new Error(error.message);
      questions = data || [];
    }
    return res.status(200).json({ sections: sections || [], modules, questions });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not load mock" });
  }
}
