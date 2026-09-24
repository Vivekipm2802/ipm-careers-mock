// ============================================================
// ConnectHub — student "Connect with us" (Sep 2026).
// Two tabs: book a 1-on-1 mentor session (admin-published slots,
// one booking a week, cancel until 3h before) and raise a ticket
// (goes straight to the team, status tracked here).
// Mentor data via /api/mentor/mine; tickets via RLS-guarded
// direct table access (own rows only).
// ============================================================

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarCheck, LifeBuoy, Video, X } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import { useLang } from "@/lib/lang";

const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)" };
const inp = { height: 42, padding: "0 12px", background: "var(--c-surface)", color: "var(--c-text-primary)", border: "1px solid var(--c-border-soft)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", width: "100%" };
const gold = (d) => ({ height: 40, padding: "0 18px", borderRadius: 999, border: "none", background: "var(--c-accent-grad, var(--c-brand-gold))", color: "#131316", fontSize: 13.5, fontWeight: 600, cursor: d ? "default" : "pointer", opacity: d ? 0.6 : 1, fontFamily: "inherit" });

function fmtSlot(iso, mins) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }) +
    " · " + mins + " min";
}

export default function ConnectHub() {
  const { t } = useLang();
  const [tab, setTab] = useState("mentor");
  const [data, setData] = useState(null); // {mentors, slots, mine}
  const [busy, setBusy] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [tk, setTk] = useState({ subject: "", message: "", saving: false });
  const [email, setEmail] = useState(null);

  const load = async () => {
    try {
      const r = await fetch("/api/mentor/mine", { headers: (await getAuthHeaders()) || {} });
      const j = await r.json();
      if (j && !j.error) setData(j);
    } catch (e) {}
  };
  const loadTickets = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const em = u?.user?.email?.toLowerCase();
      setEmail(em);
      if (!em) return;
      const { data: rows } = await supabase
        .from("support_tickets").select("*").ilike("student_email", em)
        .order("created_at", { ascending: false }).limit(20);
      setTickets(rows || []);
    } catch (e) { setTickets([]); }
  };
  useEffect(() => { load(); loadTickets(); }, []);

  const book = async (slotId) => {
    setBusy(slotId);
    try {
      const headers = { ...((await getAuthHeaders()) || {}), "Content-Type": "application/json" };
      const r = await fetch("/api/mentor/book", { method: "POST", headers, body: JSON.stringify({ slotId }) });
      const j = await r.json();
      if (j && j.ok) { toast.success(t("Session book ho gaya!", "Session booked!")); load(); }
      else toast.error((j && j.error) || "Could not book");
    } catch (e) { toast.error("Could not book"); }
    setBusy(null);
  };
  const cancel = async (bookingId) => {
    setBusy("c" + bookingId);
    try {
      const headers = { ...((await getAuthHeaders()) || {}), "Content-Type": "application/json" };
      const r = await fetch("/api/mentor/cancel", { method: "POST", headers, body: JSON.stringify({ bookingId }) });
      const j = await r.json();
      if (j && j.ok) { toast.success(t("Booking cancel ho gayi", "Booking cancelled")); load(); }
      else toast.error((j && j.error) || "Could not cancel");
    } catch (e) { toast.error("Could not cancel"); }
    setBusy(null);
  };
  const submitTicket = async () => {
    if (tk.saving) return;
    if (!tk.subject.trim() || !tk.message.trim()) { toast.error(t("Subject aur message dono chahiye", "Subject and message are both needed")); return; }
    setTk((p) => ({ ...p, saving: true }));
    try {
      const { error } = await supabase.from("support_tickets").insert({
        student_email: email, subject: tk.subject.trim(), message: tk.message.trim(), status: "open",
      });
      if (error) toast.error(error.message);
      else { toast.success(t("Ticket bhej diya. Team jaldi respond karegi.", "Ticket sent. The team will respond soon.")); setTk({ subject: "", message: "", saving: false }); loadTickets(); return; }
    } catch (e) { toast.error("Could not send"); }
    setTk((p) => ({ ...p, saving: false }));
  };

  const mentors = data?.mentors || [];
  const slotsByMentor = {};
  for (const s of data?.slots || []) (slotsByMentor[s.mentor_id] = slotsByMentor[s.mentor_id] || []).push(s);
  const myBookings = data?.mine || [];

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mt-10">
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
          {t("Hum yahan hain", "We're here")}
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08 }}>
          {t("Connect", "Connect")} <span className="ds-accent ds-grad-text">{t("with us.", "with us.")}</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", maxWidth: 680, lineHeight: 1.6 }}>
          {t("1-on-1 mentor session book karo, ya koi bhi problem ho toh ticket raise karo.",
             "Book a 1-on-1 session with a mentor, or raise a ticket for anything that needs fixing.")}
        </p>
      </header>

      <div className="mt-6 flex gap-2">
        {[["mentor", t("Mentor session", "Mentor session"), <CalendarCheck key="i" size={15} />],
          ["ticket", t("Raise a ticket", "Raise a ticket"), <LifeBuoy key="i" size={15} />]].map(([k, lab, ic]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 18px", borderRadius: 999,
            fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
            border: "1px solid " + (tab === k ? "var(--c-brand-gold)" : "var(--c-border-soft)"),
            background: tab === k ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
            color: "var(--c-text-primary)", fontWeight: tab === k ? 600 : 400,
          }}>{ic}{lab}</button>
        ))}
      </div>

      {tab === "mentor" && (
        <div className="mt-6 mb-16" style={{ maxWidth: 860 }}>
          {myBookings.length > 0 && myBookings.map((b) => (
            <div key={b.id} style={{ ...card, padding: "16px 20px", marginBottom: 14, borderColor: "var(--c-brand-gold)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
                {t("Aapki booking", "Your session")}
              </div>
              <div className="mt-1 flex items-center gap-3 flex-wrap" style={{ fontSize: 14.5 }}>
                <b>{b.mentor_slots?.mentors?.name}</b>
                <span style={{ color: "var(--c-text-secondary)" }}>{fmtSlot(b.mentor_slots?.start_at, b.mentor_slots?.duration_min)}</span>
                {b.mentor_slots?.meet_link ? (
                  <a href={b.mentor_slots.meet_link} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--c-brand-primary)", fontWeight: 600, fontSize: 13.5 }}>
                    <Video size={14} /> {t("Join karo", "Join session")}
                  </a>
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>{t("Link session time pe aayega", "Link appears near session time")}</span>
                )}
                <button type="button" onClick={() => cancel(b.id)} disabled={busy === "c" + b.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--c-danger)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                  <X size={13} /> {t("Cancel", "Cancel")}
                </button>
              </div>
            </div>
          ))}

          {mentors.length === 0 ? (
            <div style={{ ...card, padding: 24, fontSize: 14, color: "var(--c-text-tertiary)" }}>
              {t("Mentor slots jald aa rahe hain.", "Mentor slots are coming soon.")}
            </div>
          ) : mentors.map((m) => (
            <div key={m.id} style={{ ...card, padding: "18px 22px", marginBottom: 14 }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--c-border-soft)", background: m.photo_url ? `url('${m.photo_url}') center/cover` : "var(--c-surface-muted)" }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5 }}>{m.name}</div>
                  {m.bio ? <div style={{ fontSize: 12.5, color: "var(--c-text-secondary)" }}>{m.bio}</div> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(slotsByMentor[m.id] || []).length === 0 ? (
                  <span style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>{t("Abhi koi slot open nahi", "No open slots right now")}</span>
                ) : (slotsByMentor[m.id] || []).slice(0, 8).map((s) => (
                  <button key={s.id} type="button" onClick={() => book(s.id)} disabled={busy === s.id}
                    style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      border: "1px solid var(--c-border-soft)", background: "var(--c-surface)", color: "var(--c-text-primary)" }}>
                    {busy === s.id ? t("Booking…", "Booking…") : fmtSlot(s.start_at, s.duration_min)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
            {t("Ek hafte mein ek session book kar sakte ho. Cancel session se 3 ghante pehle tak.",
               "One session per week. Cancellation closes 3 hours before the session.")}
          </p>
        </div>
      )}

      {tab === "ticket" && (
        <div className="mt-6 mb-16" style={{ maxWidth: 640 }}>
          <div style={{ ...card, padding: "18px 22px" }}>
            <input style={inp} placeholder={t("Subject — short mein kya issue hai", "Subject, what's the issue in short")}
              value={tk.subject} onChange={(e) => setTk((p) => ({ ...p, subject: e.target.value }))} />
            <textarea style={{ ...inp, height: 110, padding: "10px 12px", marginTop: 10, resize: "vertical" }}
              placeholder={t("Detail mein batao — screenshot ho toh Doubts ya WhatsApp pe bhejo", "Describe it in detail")}
              value={tk.message} onChange={(e) => setTk((p) => ({ ...p, message: e.target.value }))} />
            <button type="button" onClick={submitTicket} disabled={tk.saving} style={{ ...gold(tk.saving), marginTop: 12 }}>
              {tk.saving ? t("Bhej rahe…", "Sending…") : t("Ticket bhejo", "Send ticket")}
            </button>
          </div>
          {(tickets || []).length > 0 && (
            <div className="mt-5">
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 8 }}>
                {t("Aapke tickets", "Your tickets")}
              </div>
              {tickets.map((tkt) => (
                <div key={tkt.id} style={{ ...card, padding: "12px 16px", marginBottom: 8 }}>
                  <div className="flex items-center justify-between gap-3">
                    <b style={{ fontSize: 13.5 }}>{tkt.subject}</b>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                      background: tkt.status === "resolved" ? "var(--c-success-soft, #e7f6e7)" : "var(--c-brand-gold-tint)",
                      color: tkt.status === "resolved" ? "var(--c-success)" : "var(--c-text-primary)" }}>
                      {tkt.status}
                    </span>
                  </div>
                  {tkt.admin_note ? (
                    <div style={{ fontSize: 12.5, color: "var(--c-text-secondary)", marginTop: 6 }}>
                      <b>{t("Team:", "Team:")}</b> {tkt.admin_note}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
