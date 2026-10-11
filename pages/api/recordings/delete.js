// ============================================================
// POST /api/recordings/delete — admin-only: delete a recording
// capsule (classes_history row). If the capsule has a storage
// upload (recording_path) the file in the private 'recordings'
// bucket is removed too. External links (Zoom/Drive) are just
// links — nothing to remove there.
//
// Body: { capsuleId }
// 200 { ok: true } | 4xx/5xx { error }
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(403).json({ error: "Admins only" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const capsuleId = body.capsuleId;
  if (capsuleId == null || capsuleId === "") {
    return res.status(400).json({ error: "capsuleId is required" });
  }

  try {
    const { data: rows, error: readErr } = await serversupabase
      .from("classes_history")
      .select("id, recording_path")
      .eq("id", capsuleId)
      .limit(1);
    if (readErr) throw new Error(readErr.message);
    const row = rows && rows[0];
    if (!row) return res.status(404).json({ error: "Recording not found" });

    if (row.recording_path && String(row.recording_path).trim()) {
      // best-effort: a missing storage object must never block the delete
      try {
        await serversupabase.storage
          .from("recordings")
          .remove([String(row.recording_path).trim()]);
      } catch (_e) {
        /* ignore */
      }
    }

    const { error: delErr } = await serversupabase
      .from("classes_history")
      .delete()
      .eq("id", capsuleId);
    if (delErr) throw new Error(delErr.message);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not delete recording" });
  }
}
