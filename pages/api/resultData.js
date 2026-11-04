// ============================================================
// GET /api/resultData?uid=<mock_plays.uid> — the paper behind a result.
//
// Why (2026-11-04): the result and analytics pages read mock_groups /
// mock_questions in the browser. For accounts with ZERO enrollments
// (free / demo students) that RLS check statement-times-out, so their
// result sat on "Loading your result…" forever even though the attempt
// was saved (saavijain2009, IIM B Mock 1). Same root cause as the mock
// page (fixed by /api/mockData). This route reads with the service role
// and only for the play's OWNER or an admin.
// ============================================================

import { getAuthUser, isAdminEmail } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";
import { getContent } from "@/lib/mockContent";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const uid = String(req.query.uid || "");
  if (!uid) return res.status(400).json({ error: "uid is required" });

  const playP = serversupabase.from("mock_plays").select("id, user, test_id").eq("uid", uid).limit(1);
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Sign in required" });

  try {
    const { data, error } = await playP;
    if (error) throw new Error(error.message);
    const play = data && data[0];
    if (!play) return res.status(404).json({ error: "Result not found" });
    const own = String(play.user || "").toLowerCase() === String(user.email || "").toLowerCase();
    const admin = own ? false : await isAdminEmail(user.email).catch(() => false);
    if (!own && !admin) return res.status(403).json({ error: "Not your result" });
    const content = await getContent(Number(play.test_id), !!admin);
    return res.status(200).json(content);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not load result" });
  }
}
