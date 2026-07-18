// ============================================================
// POST /api/recordings/upload-url — mint a signed UPLOAD url for
// the private 'recordings' bucket (admin only).
//
// Body: { classId, fileName } where classId is a classes_history
// row id (the capsule students open). Returns { path, token,
// signedUrl }. The browser then PUTs the file straight to
// storage (uploadToSignedUrl / signed-url PUT — supabase-js
// 2.38.1 ships storage-js 2.5.4 which supports both), and calls
// /api/recordings/commit on success.
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const { sanitizeFileName } = require("@/lib/recordings");

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
  if (classId == null || classId === "") {
    return res.status(400).json({ error: "classId is required" });
  }

  try {
    // The capsule must exist — this also validates classId before it is
    // interpolated into the storage path.
    const { data: capsule, error: capErr } = await serversupabase
      .from("classes_history")
      .select("id")
      .eq("id", classId)
      .limit(1)
      .maybeSingle();
    if (capErr) throw new Error(capErr.message);
    if (!capsule) {
      return res.status(404).json({ error: "Class capsule not found" });
    }

    const path = `class-${capsule.id}/${Date.now()}-${sanitizeFileName(body.fileName)}`;
    const { data, error } = await serversupabase.storage
      .from("recordings")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);

    return res.status(200).json({
      path: (data && data.path) || path,
      token: data && data.token,
      signedUrl: data && data.signedUrl,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not create upload URL" });
  }
}
