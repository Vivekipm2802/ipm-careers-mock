// ============================================================
// POST /api/recordings/list — the student Recordings shelf,
// served server-side so the capsule list no longer depends on
// the classes_history RLS chain (check_admin / role / enrollments
// + case-sensitive email matching), which silently hid capsules
// from students whose stored email casing differed anywhere.
//
// ANY logged-in user. Body: { batchId }.
// Membership = batch_admits (case-insensitive email), admins pass.
// Start-date filtering stays in the UI (courtesy) and in play.js
// (the hard gate) — here we return the capsules the student may
// list, already filtered by their effective_start_date.
// 200 { capsules: [...], effectiveStart: 'YYYY-MM-DD'|null, hiddenBefore: n }
// ============================================================

import { getAuthUser, isAdminEmail } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const { startDateGate } = require("@/lib/recordings");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await getAuthUser(req);
  if (!user || !user.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const batchId = body.batchId;
  if (batchId == null || batchId === "") {
    return res.status(400).json({ error: "batchId is required" });
  }

  try {
    const admin = await isAdminEmail(user.email);
    let effectiveStart = null;
    if (!admin) {
      const { data: admits, error: admitErr } = await serversupabase
        .from("batch_admits")
        .select("effective_start_date")
        .eq("batch_id", batchId)
        .ilike("student_id", user.email)
        .limit(1);
      if (admitErr) throw new Error(admitErr.message);
      const admit = admits && admits[0];
      if (!admit) {
        return res.status(403).json({ error: "You are not enrolled in this batch" });
      }
      effectiveStart = admit.effective_start_date || null;
    }

    const { data: rows, error: histErr } = await serversupabase
      .from("classes_history")
      .select(
        "id, title, recording, recording_path, notes_url, faculty_name, duration_seconds, created_at, batch_id"
      )
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });
    if (histErr) throw new Error(histErr.message);

    const all = Array.isArray(rows) ? rows : [];
    const visible = effectiveStart
      ? all.filter((c) => startDateGate(effectiveStart, c.created_at))
      : all;

    return res.status(200).json({
      capsules: visible,
      effectiveStart,
      hiddenBefore: all.length - visible.length,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not load recordings" });
  }
}
