// ============================================================
// POST /api/recordings/commit — after a successful storage
// upload, point the capsule at the uploaded object (admin only).
//
// Body: { classId, path }. Sets classes_history.recording_path
// (which takes precedence over any `recording` URL) and clears
// recording_passcode (a storage upload has no Zoom passcode).
// The path must belong to this capsule's folder — prevents an
// admin typo from pointing class A at class B's video.
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: "Unauthorized – admin access required" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const classId = body.classId;
  const path = String(body.path || "");
  if (classId == null || classId === "" || !path) {
    return res.status(400).json({ error: "classId and path are required" });
  }
  if (!path.startsWith(`class-${classId}/`)) {
    return res.status(400).json({ error: "path does not belong to this class" });
  }

  try {
    const { data, error } = await serversupabase
      .from("classes_history")
      .update({ recording_path: path, recording_passcode: null })
      .eq("id", classId)
      .select("id")
      .limit(1);
    if (error) throw new Error(error.message);
    if (!data || !data.length) {
      return res.status(404).json({ error: "Class capsule not found" });
    }
    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Commit failed" });
  }
}
