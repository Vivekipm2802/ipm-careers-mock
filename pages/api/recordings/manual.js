// ============================================================
// POST /api/recordings/manual — owner attaches a recording link
// (Google Drive / Zoom share / YouTube) to a batch by hand.
//
// Body: { batchId, title, date: 'YYYY-MM-DD', url,
//         passcode?, notesUrl?, facultyName? }
// Inserts one classes_history capsule; created_at is set to the
// class date so the student shelf sorts and start-date-gates it
// correctly. Playback uses the existing /api/recordings/play
// "link" branch, which already handles external URLs + passcode.
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
  const title = String(body.title || "").trim();
  const date = String(body.date || "").trim();
  const url = String(body.url || "").trim();

  if (batchId == null || batchId === "") return res.status(400).json({ error: "batchId is required" });
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: "url must be a full http(s) link" });

  try {
    const { data: row, error } = await serversupabase
      .from("classes_history")
      .insert({
        batch_id: batchId,
        title,
        recording: url,
        recording_passcode: String(body.passcode || "").trim() || null,
        notes_url: String(body.notesUrl || "").trim() || null,
        faculty_name: String(body.facultyName || "").trim() || null,
        created_at: date + "T12:00:00+05:30",
      })
      .select("id")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, id: row.id });
  } catch (e) {
    return res.status(500).json({ error: e.message || "manual recording failed" });
  }
}
