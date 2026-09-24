// ============================================================
// POST /api/mentor/book — student books an open mentor slot.
// Rules: slot must be open and in the future; ONE booking per
// student per ISO week (counted by slot start), enforced here
// server-side with the service role so the client can't bypass.
// Booking wins races via a conditional update on slot status.
// Body: { slotId }
// ============================================================

import { getAuthUser } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

function weekBounds(d) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(dt); start.setDate(dt.getDate() - day); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return [start.toISOString(), end.toISOString()];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await getAuthUser(req);
  if (!user || !user.email) return res.status(401).json({ error: "Unauthorized" });
  const email = user.email.toLowerCase();
  const slotId = req.body && req.body.slotId;
  if (slotId == null) return res.status(400).json({ error: "slotId required" });

  try {
    const { data: slot, error: slotErr } = await serversupabase
      .from("mentor_slots").select("id,mentor_id,start_at,duration_min,status").eq("id", slotId).single();
    if (slotErr || !slot) return res.status(404).json({ error: "Slot not found" });
    if (slot.status !== "open") return res.status(409).json({ error: "This slot has just been taken" });
    if (new Date(slot.start_at) < new Date()) return res.status(400).json({ error: "This slot is in the past" });

    // one booking per week (active bookings on slots in the same ISO week)
    const [ws, we] = weekBounds(slot.start_at);
    const { data: mine } = await serversupabase
      .from("mentor_bookings")
      .select("id, mentor_slots!inner(start_at)")
      .eq("student_email", email)
      .eq("status", "booked")
      .gte("mentor_slots.start_at", ws)
      .lt("mentor_slots.start_at", we);
    if (mine && mine.length) {
      return res.status(409).json({ error: "You already have a mentor session booked this week. One per week keeps slots fair for everyone." });
    }

    // claim the slot (conditional update = race-safe)
    const { data: claimed, error: upErr } = await serversupabase
      .from("mentor_slots").update({ status: "booked" })
      .eq("id", slotId).eq("status", "open").select("id");
    if (upErr || !claimed || !claimed.length) {
      return res.status(409).json({ error: "This slot has just been taken" });
    }
    const { data: booking, error: bookErr } = await serversupabase
      .from("mentor_bookings")
      .insert({ slot_id: slotId, student_email: email, status: "booked" })
      .select("id").single();
    if (bookErr) {
      await serversupabase.from("mentor_slots").update({ status: "open" }).eq("id", slotId);
      return res.status(500).json({ error: bookErr.message });
    }
    return res.status(200).json({ ok: true, bookingId: booking.id });
  } catch (e) {
    return res.status(500).json({ error: e.message || "booking failed" });
  }
}
