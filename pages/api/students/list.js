// ============================================================
// GET /api/students/list — admin Students directory.
// Returns every enrolled student (batch_admits) merged with their
// student_profiles row (the onboarding form) and their batches.
// student_profiles has RLS (own-row only), so admins read through
// this route with the service role.
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized – admin access required" });

  try {
    const { data: admits } = await serversupabase
      .from("batch_admits")
      .select("student_id,batch_id");
    const { data: batches } = await serversupabase
      .from("batches")
      .select("id,name")
      .eq("is_deleted", false);
    const batchName = {};
    for (const b of batches || []) batchName[b.id] = b.name;

    const byEmail = {};
    for (const a of admits || []) {
      const em = String(a?.student_id || "").toLowerCase().trim();
      if (!em) continue;
      byEmail[em] = byEmail[em] || { email: em, batches: [] };
      if (a.batch_id != null && batchName[a.batch_id] && !byEmail[em].batches.includes(batchName[a.batch_id])) {
        byEmail[em].batches.push(batchName[a.batch_id]);
      }
    }

    let profiles = [];
    try {
      const { data } = await serversupabase.from("student_profiles").select("*");
      profiles = data || [];
    } catch (e) { /* table may not exist yet */ }
    for (const p of profiles) {
      const em = String(p?.email || "").toLowerCase().trim();
      if (!em) continue;
      byEmail[em] = { ...(byEmail[em] || { email: em, batches: [] }), ...p, email: em };
    }

    const students = Object.values(byEmail).sort((a, b) =>
      String(a.full_name || a.email).localeCompare(String(b.full_name || b.email))
    );
    const complete = students.filter((s) => s.full_name).length;
    return res.status(200).json({ students, total: students.length, complete });
  } catch (e) {
    return res.status(500).json({ error: e.message || "students list failed" });
  }
}
