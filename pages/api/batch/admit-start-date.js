// ============================================================
// POST /api/batch/admit-start-date — admin-only: set/clear a
// student's effective start date on a batch (recordings before
// this date stay hidden for that student).
//
// Why server-side: the old client-side UPDATE on batch_admits was
// silently swallowed by RLS — PostgREST returns success with zero
// rows updated, so the UI showed "saved" while the column stayed
// null for every student (Oct 2026 bug: late joiners saw all
// recordings). The service role bypasses RLS and we verify a row
// was actually touched.
//
// Body: { admitId, date }   (date 'YYYY-MM-DD' or '' / null to clear)
// 200 { ok: true, effective_start_date } | 4xx/5xx { error }
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
  const admitId = body.admitId;
  const date = body.date && String(body.date).trim() ? String(body.date).trim() : null;
  if (admitId == null || admitId === "") {
    return res.status(400).json({ error: "admitId is required" });
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  try {
    const { data, error } = await serversupabase
      .from("batch_admits")
      .update({ effective_start_date: date })
      .eq("id", admitId)
      .select("id, effective_start_date");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Student row not found" });
    }
    return res.status(200).json({ ok: true, effective_start_date: data[0].effective_start_date });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not save start date" });
  }
}
