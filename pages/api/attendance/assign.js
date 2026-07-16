// ============================================================
// POST /api/attendance/assign — manual fixes from the admin UI.
//
// Two shapes:
//   { recordId, student_email }  — match an unmatched participant
//     to a student. Also upserts zoom_name_map so every future
//     sync remembers the pairing, and back-fills any OTHER
//     unmatched records with the same zoom name/email.
//   { sessionId, batch_id }      — assign a session the heuristic
//     couldn't place to a batch.
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

  try {
    // ── shape 2: session → batch ──
    if (body.sessionId != null && body.batch_id != null) {
      const { error } = await serversupabase
        .from("class_sessions")
        .update({ batch_id: body.batch_id })
        .eq("id", body.sessionId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, assigned: "session" });
    }

    // ── shape 1: unmatched participant → student ──
    if (body.recordId != null && body.student_email) {
      const student_email = String(body.student_email).toLowerCase().trim();

      const { data: recRows, error: recError } = await serversupabase
        .from("attendance_records")
        .select("id,zoom_name,zoom_email")
        .eq("id", body.recordId)
        .limit(1);
      if (recError) return res.status(500).json({ error: recError.message });
      const rec = recRows && recRows[0];
      if (!rec) return res.status(404).json({ error: "Record not found" });

      const { error: updError } = await serversupabase
        .from("attendance_records")
        .update({ student_email })
        .eq("id", rec.id);
      if (updError) return res.status(500).json({ error: updError.message });

      // remember the pairing for every future sync
      const { error: mapError } = await serversupabase
        .from("zoom_name_map")
        .upsert(
          {
            zoom_name: rec.zoom_name || "",
            zoom_email: rec.zoom_email || "",
            student_email,
          },
          { onConflict: "zoom_name,zoom_email" }
        );
      if (mapError) {
        // non-fatal: the record itself is fixed
        return res.status(200).json({ ok: true, assigned: "record", remembered: false });
      }

      // back-fill other unmatched rows for the same person
      let backfilled = 0;
      try {
        const { data: others } = await serversupabase
          .from("attendance_records")
          .update({ student_email })
          .is("student_email", null)
          .eq("zoom_name", rec.zoom_name || "")
          .eq("zoom_email", rec.zoom_email || "")
          .select("id");
        backfilled = Array.isArray(others) ? others.length : 0;
      } catch (e) {
        /* optional */
      }

      return res.status(200).json({ ok: true, assigned: "record", remembered: true, backfilled });
    }

    return res.status(400).json({
      error: "Send { recordId, student_email } or { sessionId, batch_id }",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Assign failed" });
  }
}
