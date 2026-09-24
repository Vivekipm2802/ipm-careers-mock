// ============================================================
// POST /api/mentor/admin — owner manages mentors, slots, and
// views bookings + tickets. RLS keeps these tables closed to
// clients; everything admin flows through here (service role).
//
// Body: { action, ...payload }
//   mentors_list | mentor_save {mentor} | mentor_delete {id}
//   slots_list {from?} | slot_create {mentor_id,start_at,duration_min,meet_link}
//   slot_delete {id} (only if not booked) | slot_toggle {id,off}
//   bookings_list {from?}
//   tickets_list | ticket_update {id,status,admin_note}
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized – admin access required" });
  const b = req.body && typeof req.body === "object" ? req.body : {};

  try {
    switch (b.action) {
      case "mentors_list": {
        const { data } = await serversupabase.from("mentors").select("*").order("id");
        return res.json({ mentors: data || [] });
      }
      case "mentor_save": {
        const m = b.mentor || {};
        const row = {
          name: String(m.name || "").trim(),
          photo_url: String(m.photo_url || "").trim() || null,
          bio: String(m.bio || "").trim() || null,
          active: m.active !== false,
        };
        if (!row.name) return res.status(400).json({ error: "mentor name required" });
        const q = m.id != null
          ? serversupabase.from("mentors").update(row).eq("id", m.id).select("*")
          : serversupabase.from("mentors").insert(row).select("*");
        const { data, error } = await q;
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ mentor: data && data[0] });
      }
      case "mentor_delete": {
        const { error } = await serversupabase.from("mentors").update({ active: false }).eq("id", b.id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ok: true });
      }
      case "slots_list": {
        const from = b.from || new Date(Date.now() - 24 * 3600e3).toISOString();
        const { data } = await serversupabase
          .from("mentor_slots").select("*, mentors(name)")
          .gte("start_at", from).order("start_at");
        return res.json({ slots: data || [] });
      }
      case "slot_create": {
        const row = {
          mentor_id: b.mentor_id,
          start_at: b.start_at,
          duration_min: Math.max(10, Math.min(120, Number(b.duration_min) || 30)),
          meet_link: String(b.meet_link || "").trim() || null,
          status: "open",
        };
        if (row.mentor_id == null || !row.start_at) return res.status(400).json({ error: "mentor and time required" });
        const { data, error } = await serversupabase.from("mentor_slots").insert(row).select("*");
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ slot: data && data[0] });
      }
      case "slot_delete": {
        const { data: slot } = await serversupabase.from("mentor_slots").select("status").eq("id", b.id).single();
        if (slot && slot.status === "booked") return res.status(400).json({ error: "Slot is booked — ask the student to cancel first" });
        const { error } = await serversupabase.from("mentor_slots").delete().eq("id", b.id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ok: true });
      }
      case "slot_toggle": {
        const { error } = await serversupabase.from("mentor_slots")
          .update({ status: b.off ? "off" : "open" }).eq("id", b.id).neq("status", "booked");
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ok: true });
      }
      case "bookings_list": {
        const from = b.from || new Date(Date.now() - 7 * 24 * 3600e3).toISOString();
        const { data } = await serversupabase
          .from("mentor_bookings")
          .select("*, mentor_slots!inner(start_at,duration_min,meet_link,mentor_id, mentors(name))")
          .gte("mentor_slots.start_at", from)
          .order("created_at", { ascending: false });
        // enrich with student names
        const emails = [...new Set((data || []).map((x) => x.student_email))];
        let names = {};
        if (emails.length) {
          const { data: profs } = await serversupabase
            .from("student_profiles").select("email,full_name,phone").in("email", emails);
          for (const p of profs || []) names[p.email] = p;
        }
        return res.json({ bookings: (data || []).map((x) => ({ ...x, profile: names[x.student_email] || null })) });
      }
      case "tickets_list": {
        const { data } = await serversupabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(300);
        return res.json({ tickets: data || [] });
      }
      case "ticket_update": {
        const patch = {};
        if (b.status) patch.status = b.status;
        if (b.admin_note != null) patch.admin_note = String(b.admin_note);
        patch.updated_at = new Date().toISOString();
        const { error } = await serversupabase.from("support_tickets").update(patch).eq("id", b.id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ok: true });
      }
      default:
        return res.status(400).json({ error: "unknown action" });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || "admin action failed" });
  }
}
