// ============================================================
// POST /api/mentor/cancel — student cancels their own booking,
// allowed until 3 hours before the slot. Frees the slot.
// Body: { bookingId }
// ============================================================

import { getAuthUser } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const CUTOFF_MS = 3 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await getAuthUser(req);
  if (!user || !user.email) return res.status(401).json({ error: "Unauthorized" });
  const email = user.email.toLowerCase();
  const bookingId = req.body && req.body.bookingId;
  if (bookingId == null) return res.status(400).json({ error: "bookingId required" });

  try {
    const { data: b, error } = await serversupabase
      .from("mentor_bookings")
      .select("id,slot_id,student_email,status, mentor_slots!inner(start_at)")
      .eq("id", bookingId).single();
    if (error || !b) return res.status(404).json({ error: "Booking not found" });
    if (String(b.student_email).toLowerCase() !== email) return res.status(403).json({ error: "Not your booking" });
    if (b.status !== "booked") return res.status(400).json({ error: "Already cancelled" });
    const startAt = new Date(b.mentor_slots.start_at);
    if (startAt.getTime() - Date.now() < CUTOFF_MS) {
      return res.status(400).json({ error: "Cancellations close 3 hours before the session. Please attend or message the team." });
    }
    await serversupabase.from("mentor_bookings").update({ status: "cancelled" }).eq("id", bookingId);
    await serversupabase.from("mentor_slots").update({ status: "open" }).eq("id", b.slot_id);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "cancel failed" });
  }
}
