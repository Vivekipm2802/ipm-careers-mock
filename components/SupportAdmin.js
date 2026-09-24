// ============================================================
// SupportAdmin — owner console for the Connect hub (Sep 2026).
// Tabs: Mentors (profiles), Slots (publish bookable times with
// meet links), Bookings (who booked what, with student contacts),
// Tickets (triage + reply note + resolve).
// All through /api/mentor/admin (service role, RLS-closed tables).
// ============================================================

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getAuthHeaders } from "@/utils/authHeaders";

const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)" };
const inp = { height: 40, padding: "0 12px", background: "var(--c-surface)", color: "var(--c-text-primary)", border: "1px solid var(--c-border-soft)", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit" };
const gold = (d) => ({ height: 38, padding: "0 16px", borderRadius: 999, border: "none", background: "var(--c-accent-grad, var(--c-brand-gold))", color: "#131316", fontSize: 13, fontWeight: 600, cursor: d ? "default" : "pointer", opacity: d ? 0.6 : 1, fontFamily: "inherit" });
const ghost = { height: 38, padding: "0 14px", borderRadius: 999, border: "1px solid var(--c-border-soft)", background: "var(--c-surface)", color: "var(--c-text-primary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" };

export default function SupportAdmin() {
  const [tab, setTab] = useState("slots");
  const [mentors, setMentors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [mForm, setMForm] = useState({ id: null, name: "", bio: "", photo_url: "" });
  const [sForm, setSForm] = useState({ mentor_id: "", date: "", time: "", duration_min: 30, meet_link: "" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const call = async (action, payload = {}) => {
    const headers = { ...((await getAuthHeaders()) || {}), "Content-Type": "application/json" };
    const r = await fetch("/api/mentor/admin", { method: "POST", headers, body: JSON.stringify({ action, ...payload }) });
    return r.json();
  };
  const refresh = async () => {
    const [m, s, b, t] = await Promise.all([call("mentors_list"), call("slots_list"), call("bookings_list"), call("tickets_list")]);
    if (m.mentors) setMentors(m.mentors);
    if (s.slots) setSlots(s.slots);
    if (b.bookings) setBookings(b.bookings);
    if (t.tickets) setTickets(t.tickets);
  };
  useEffect(() => { refresh(); }, []);

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_PRESET);
      const r = await axios.post(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_KEY}/image/upload/`, fd);
      setMForm((p) => ({ ...p, photo_url: r.data.secure_url || r.data.url }));
    } catch (e) { toast.error("Upload failed"); }
    setUploading(false);
  };
  const saveMentor = async () => {
    if (!mForm.name.trim()) { toast.error("Name required"); return; }
    setBusy(true);
    const j = await call("mentor_save", { mentor: mForm });
    setBusy(false);
    if (j.mentor) { toast.success("Saved"); setMForm({ id: null, name: "", bio: "", photo_url: "" }); refresh(); }
    else toast.error(j.error || "Failed");
  };
  const createSlot = async () => {
    if (!sForm.mentor_id || !sForm.date || !sForm.time) { toast.error("Mentor, date and time required"); return; }
    setBusy(true);
    const start_at = sForm.date + "T" + sForm.time + ":00+05:30";
    const j = await call("slot_create", { mentor_id: sForm.mentor_id, start_at, duration_min: sForm.duration_min, meet_link: sForm.meet_link });
    setBusy(false);
    if (j.slot) { toast.success("Slot published"); refresh(); }
    else toast.error(j.error || "Failed");
  };

  const fmtDT = (iso) => new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mt-10">
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>Operations</div>
        <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08 }}>
          Support & <span className="ds-accent ds-grad-text">mentorship.</span>
        </h1>
      </header>

      <div className="mt-6 flex gap-2 flex-wrap">
        {["slots", "mentors", "bookings", "tickets"].map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{
            ...ghost, textTransform: "capitalize",
            border: "1px solid " + (tab === k ? "var(--c-brand-gold)" : "var(--c-border-soft)"),
            background: tab === k ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
            fontWeight: tab === k ? 600 : 400,
          }}>{k}{k === "tickets" && tickets.filter((t) => t.status === "open").length ? ` (${tickets.filter((t) => t.status === "open").length})` : ""}</button>
        ))}
      </div>

      {tab === "mentors" && (
        <div className="mt-6 mb-16" style={{ maxWidth: 760 }}>
          <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
            <div className="flex gap-3 flex-wrap items-center">
              <input style={{ ...inp, width: 200 }} placeholder="Name" value={mForm.name} onChange={(e) => setMForm((p) => ({ ...p, name: e.target.value }))} />
              <input style={{ ...inp, width: 320 }} placeholder="One-line bio (e.g. QA mentor · IIM Indore)" value={mForm.bio || ""} onChange={(e) => setMForm((p) => ({ ...p, bio: e.target.value }))} />
              <label style={{ ...ghost, display: "inline-flex", alignItems: "center" }}>
                {uploading ? "Uploading…" : mForm.photo_url ? "Change photo" : "Photo"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => uploadPhoto(e.target.files && e.target.files[0])} />
              </label>
              <button type="button" onClick={saveMentor} disabled={busy || uploading} style={gold(busy || uploading)}>
                {mForm.id != null ? "Update mentor" : "Add mentor"}
              </button>
              {mForm.id != null && <button type="button" style={ghost} onClick={() => setMForm({ id: null, name: "", bio: "", photo_url: "" })}>New</button>}
            </div>
          </div>
          {mentors.map((m) => (
            <div key={m.id} className="flex items-center gap-3" style={{ ...card, padding: "12px 18px", marginBottom: 8, opacity: m.active ? 1 : 0.5 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: m.photo_url ? `url('${m.photo_url}') center/cover` : "var(--c-surface-muted)", border: "1px solid var(--c-border-soft)" }} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>{m.name}</b>{!m.active && <span style={{ fontSize: 11, marginLeft: 8, color: "var(--c-text-tertiary)" }}>inactive</span>}
                <div style={{ fontSize: 12, color: "var(--c-text-secondary)" }}>{m.bio}</div>
              </div>
              <button type="button" style={ghost} onClick={() => setMForm({ id: m.id, name: m.name, bio: m.bio || "", photo_url: m.photo_url || "" })}>Edit</button>
              {m.active && <button type="button" style={{ ...ghost, color: "var(--c-danger)" }} onClick={async () => { await call("mentor_delete", { id: m.id }); refresh(); }}>Retire</button>}
            </div>
          ))}
        </div>
      )}

      {tab === "slots" && (
        <div className="mt-6 mb-16" style={{ maxWidth: 860 }}>
          <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
            <div className="flex gap-3 flex-wrap items-center">
              <select style={{ ...inp, width: 180 }} value={sForm.mentor_id} onChange={(e) => setSForm((p) => ({ ...p, mentor_id: e.target.value }))}>
                <option value="">Mentor…</option>
                {mentors.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="date" style={inp} value={sForm.date} onChange={(e) => setSForm((p) => ({ ...p, date: e.target.value }))} />
              <input type="time" style={inp} value={sForm.time} onChange={(e) => setSForm((p) => ({ ...p, time: e.target.value }))} />
              <input type="number" min={10} max={120} style={{ ...inp, width: 80 }} title="Minutes" value={sForm.duration_min} onChange={(e) => setSForm((p) => ({ ...p, duration_min: Number(e.target.value) || 30 }))} />
              <input style={{ ...inp, width: 280 }} placeholder="Zoom / Meet link (shown to booker only)" value={sForm.meet_link} onChange={(e) => setSForm((p) => ({ ...p, meet_link: e.target.value }))} />
              <button type="button" onClick={createSlot} disabled={busy} style={gold(busy)}>Publish slot</button>
            </div>
          </div>
          {slots.map((s) => (
            <div key={s.id} className="flex items-center gap-3 flex-wrap" style={{ ...card, padding: "10px 16px", marginBottom: 8 }}>
              <b style={{ fontSize: 13.5, width: 140 }}>{s.mentors?.name}</b>
              <span style={{ fontSize: 13 }}>{fmtDT(s.start_at)} · {s.duration_min} min</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                background: s.status === "booked" ? "var(--c-brand-gold-tint)" : s.status === "open" ? "var(--c-success-soft, #e7f6e7)" : "var(--c-surface-muted)",
                color: s.status === "booked" ? "var(--c-text-primary)" : s.status === "open" ? "var(--c-success)" : "var(--c-text-tertiary)" }}>{s.status}</span>
              <span style={{ flex: 1 }} />
              {s.status !== "booked" && (
                <>
                  <button type="button" style={ghost} onClick={async () => { await call("slot_toggle", { id: s.id, off: s.status === "open" }); refresh(); }}>
                    {s.status === "open" ? "Hide" : "Reopen"}
                  </button>
                  <button type="button" style={{ ...ghost, color: "var(--c-danger)" }} onClick={async () => { const j = await call("slot_delete", { id: s.id }); if (j.error) toast.error(j.error); refresh(); }}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "bookings" && (
        <div className="mt-6 mb-16" style={{ maxWidth: 860 }}>
          {bookings.length === 0 ? <div style={{ ...card, padding: 22, fontSize: 13.5, color: "var(--c-text-tertiary)" }}>No bookings yet.</div> :
            bookings.map((b) => (
              <div key={b.id} style={{ ...card, padding: "12px 18px", marginBottom: 8, opacity: b.status === "cancelled" ? 0.55 : 1 }}>
                <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 13.5 }}>
                  <b>{b.profile?.full_name || b.student_email}</b>
                  {b.profile?.phone && <span style={{ color: "var(--c-text-secondary)" }}>{b.profile.phone}</span>}
                  <span>→ {b.mentor_slots?.mentors?.name}</span>
                  <span style={{ color: "var(--c-text-secondary)" }}>{fmtDT(b.mentor_slots?.start_at)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{b.status}</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === "tickets" && (
        <div className="mt-6 mb-16" style={{ maxWidth: 860 }}>
          {tickets.length === 0 ? <div style={{ ...card, padding: 22, fontSize: 13.5, color: "var(--c-text-tertiary)" }}>No tickets.</div> :
            tickets.map((tkt) => (
              <div key={tkt.id} style={{ ...card, padding: "14px 18px", marginBottom: 10 }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <b style={{ fontSize: 14 }}>{tkt.subject}</b>
                  <span style={{ fontSize: 12, color: "var(--c-text-secondary)" }}>{tkt.student_email}</span>
                  <span style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>{new Date(tkt.created_at).toLocaleDateString("en-IN")}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                    background: tkt.status === "resolved" ? "var(--c-success-soft, #e7f6e7)" : "var(--c-brand-gold-tint)",
                    color: tkt.status === "resolved" ? "var(--c-success)" : "var(--c-text-primary)" }}>{tkt.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--c-text-secondary)", marginTop: 6, whiteSpace: "pre-line" }}>{tkt.message}</div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <input style={{ ...inp, flex: 1, minWidth: 240 }} placeholder="Reply note (student sees this)"
                    defaultValue={tkt.admin_note || ""} onBlur={async (e) => { if (e.target.value !== (tkt.admin_note || "")) { await call("ticket_update", { id: tkt.id, admin_note: e.target.value }); toast.success("Note saved"); } }} />
                  {tkt.status !== "resolved" ? (
                    <button type="button" style={gold(false)} onClick={async () => { await call("ticket_update", { id: tkt.id, status: "resolved" }); refresh(); }}>Resolve</button>
                  ) : (
                    <button type="button" style={ghost} onClick={async () => { await call("ticket_update", { id: tkt.id, status: "open" }); refresh(); }}>Reopen</button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
