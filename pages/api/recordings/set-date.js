// ============================================================
// POST /api/recordings/set-date — admin-only: correct a recording
// capsule's class date. created_at IS the class date everywhere
// (shelf order, the student start-date gate, the date on the row),
// so recordings that were added late — and therefore carry the
// add-date instead of the class date — can be fixed here.
//
// Body: { capsuleId, date: 'YYYY-MM-DD' }
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
  const date = String(body.date || "").trim();
  if (capsuleId == null || capsuleId === "") {
    return res.status(400).json({ error: "capsuleId is required" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  try {
    const { data, error } = await serversupabase
      .from("classes_history")
      .update({ created_at: date + "T12:00:00+05:30" })
      .eq("id", capsuleId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Recording not found" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not update date" });
  }
}
