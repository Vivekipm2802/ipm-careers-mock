// ============================================================
// GET /api/mentor/mine — student view: active mentors, their
// open future slots, and the student's own upcoming booking.
// Served server-side so slot/mentor tables stay closed to
// direct client reads (no student can scrape who booked what).
// ============================================================

import { getAuthUser } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const user = await getAuthUser(req);
  if (!user || !user.email) return res.status(401).json({ error: "Unauthorized" });
  const email = user.email.toLowerCase();

  try {
    const nowISO = new Date().toISOString();
    const { data: mentors } = await serversupabase
      .from("mentors").select("id,name,photo_url,bio").eq("active", true).order("id");
    const { data: slots } = await serversupabase
      .from("mentor_slots").select("id,mentor_id,start_at,duration_min,status")
      .eq("status", "open").gte("start_at", nowISO).order("start_at").limit(200);
    const { data: mineRaw } = await serversupabase
      .from("mentor_bookings")
      .select("id,status,created_at, mentor_slots!inner(id,start_at,duration_min,meet_link,mentor_id, mentors(name,photo_url))")
      .eq("student_email", email).eq("status", "booked")
      .gte("mentor_slots.start_at", new Date(Date.now() - 2 * 3600e3).toISOString())
      .order("created_at", { ascending: false }).limit(5);
    // strip meet links from slots (only revealed on own booking)
    return res.json({
      mentors: mentors || [],
      slots: (slots || []).map((s) => ({ id: s.id, mentor_id: s.mentor_id, start_at: s.start_at, duration_min: s.duration_min })),
      mine: mineRaw || [],
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "load failed" });
  }
}
