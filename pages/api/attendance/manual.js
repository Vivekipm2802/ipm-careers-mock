// ============================================================
// POST /api/attendance/manual — owner marks attendance by hand
// until the Zoom sync runs automatically.
//
// Body: { batchId, title, date: 'YYYY-MM-DD', durationMin, present: [emails] }
// Creates one class_sessions row (zoom_uuid "manual-<ts>" so it can
// never collide with a real Zoom UUID) and one attendance_records row
// per present student (minutes = durationMin, zoom_name "Manual entry").
// Absent students simply get no record — the admin grid and the parent
// absent-list already treat "no row" as absent, so manual and synced
// sessions read identically everywhere.
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
  const batchId = body.batchId;
  const title = String(body.title || "").trim() || "Class";
  const date = String(body.date || "").trim();
  const durationMin = Math.max(1, Math.min(600, Number(body.durationMin) || 60));
  const present = Array.isArray(body.present) ? body.present.filter(Boolean) : [];

  if (batchId == null || batchId === "") {
    return res.status(400).json({ error: "batchId is required" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  try {
    const startISO = date + "T00:00:00+05:30";
    const { data: session, error: sessErr } = await serversupabase
      .from("class_sessions")
      .insert({
        zoom_uuid: "manual-" + Date.now(),
        zoom_meeting_id: null,
        account_no: null,
        topic: title,
        start_time: startISO,
        duration_min: durationMin,
        batch_id: batchId,
        synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (sessErr) return res.status(500).json({ error: "session insert failed: " + sessErr.message });

    let inserted = 0;
    if (present.length) {
      const rows = present.map((email) => ({
        session_id: session.id,
        student_email: String(email).toLowerCase().trim(),
        zoom_name: "Manual entry",
        zoom_email: null,
        minutes: durationMin,
      }));
      const { error: recErr } = await serversupabase.from("attendance_records").insert(rows);
      if (recErr) return res.status(500).json({ error: "records insert failed: " + recErr.message });
      inserted = rows.length;
    }

    return res.status(200).json({ ok: true, sessionId: session.id, present: inserted });
  } catch (e) {
    return res.status(500).json({ error: e.message || "manual attendance failed" });
  }
}
