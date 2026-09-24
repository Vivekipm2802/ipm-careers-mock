// ============================================================
// ProfileGate — one-time student onboarding form (Sep 2026).
//
// Hard gate: renders a full-screen overlay over the portal until
// the student completes their basic profile (name, contacts,
// parent contacts, city, class, school, target exams, DOB, photo).
// Mounted in DefaultLayout, so exam players (/mock/[slug],
// /test/[slug]) are naturally exempt — nobody is interrupted
// mid-attempt. Admins are exempt too.
//
// Data lives in student_profiles (RLS: each student reads/writes
// only their own row). On save we also sync full_name and
// profile_pic into auth user_metadata so the dashboard greeting
// and the navbar avatar pick the same values up.
// ============================================================

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";

const EXAMS = ["IPMAT Indore", "IPMAT Rohtak", "JIPMAT", "IIM Kozhikode", "IIM Bangalore UG", "Other"];
const CLASSES = ["Class 11", "Class 12", "Dropper"];
// Admission category exactly as on the exam form — drives the
// category-wise cutoff card in mock analytics.
const CATEGORIES = ["General", "EWS", "NC-OBC", "SC", "ST", "PwD"];

const inp = {
  width: "100%", height: 42, padding: "0 12px",
  background: "var(--c-surface)", color: "var(--c-text-primary)",
  border: "1px solid var(--c-border-soft)", borderRadius: 10,
  fontSize: 14, fontFamily: "inherit",
};
const label = { fontSize: 12, fontWeight: 600, color: "var(--c-text-secondary)", marginBottom: 4, display: "block" };

export default function ProfileGate() {
  const [state, setState] = useState("checking"); // checking | hidden | open
  const [email, setEmail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({
    full_name: "", phone: "", parent_name: "", parent_phone: "",
    city: "", current_class: "", school: "", target_exams: [], dob: "", photo_url: "",
    category: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const em = data?.user?.email;
        if (!em) { setState("hidden"); return; }
        setEmail(em.toLowerCase());
        // admins skip the gate
        try {
          const r = await axios.post("/api/isAdmin", {}, { headers: await getAuthHeaders() });
          if (r?.data?.success) { setState("hidden"); return; }
        } catch (e) { /* not admin */ }
        const { data: rows, error } = await supabase
          .from("student_profiles").select("email").ilike("email", em).limit(1);
        if (error) { setState("hidden"); return; } // table missing → never block the portal
        if (rows && rows.length) { setState("hidden"); return; }
        const meta = data?.user?.user_metadata || {};
        setF((p) => ({ ...p, full_name: meta.full_name || "", photo_url: meta.profile_pic || "" }));
        setState("open");
      } catch (e) { setState("hidden"); }
    })();
  }, []);

  if (state !== "open") return null;

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const toggleExam = (x) => setF((p) => ({
    ...p, target_exams: p.target_exams.includes(x) ? p.target_exams.filter((e) => e !== x) : [...p.target_exams, x],
  }));

  async function uploadPhoto(file) {
    if (!file) return;
    if (file.size > 1548576) { toast.error("Photo must be under 1.5 MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_PRESET);
      const r = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_KEY}/image/upload/`, fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setF((p) => ({ ...p, photo_url: r.data.secure_url || r.data.url }));
    } catch (e) { toast.error("Upload failed, try a smaller image"); }
    setUploading(false);
  }

  const phoneOk = (v) => /^[0-9+\-() ]{10,15}$/.test(String(v).trim());
  async function save() {
    if (saving) return;
    const missing = [];
    if (!f.full_name.trim()) missing.push("name");
    if (!phoneOk(f.phone)) missing.push("your WhatsApp number");
    if (!f.parent_name.trim()) missing.push("parent name");
    if (!phoneOk(f.parent_phone)) missing.push("parent WhatsApp number");
    if (!f.city.trim()) missing.push("city");
    if (!f.current_class) missing.push("class");
    if (!f.school.trim()) missing.push("school");
    if (!f.target_exams.length) missing.push("target exam");
    if (!f.category) missing.push("admission category");
    if (!f.dob) missing.push("date of birth");
    if (!f.photo_url) missing.push("photograph");
    if (missing.length) { toast.error("Please fill: " + missing.join(", ")); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("student_profiles").upsert({
        email, full_name: f.full_name.trim(), phone: f.phone.trim(),
        parent_name: f.parent_name.trim(), parent_phone: f.parent_phone.trim(),
        city: f.city.trim(), current_class: f.current_class, school: f.school.trim(),
        target_exams: f.target_exams, dob: f.dob, photo_url: f.photo_url,
        category: f.category,
        updated_at: new Date().toISOString(),
      });
      if (error) { toast.error("Could not save: " + error.message); setSaving(false); return; }
      try {
        await supabase.auth.updateUser({ data: { full_name: f.full_name.trim(), profile_pic: f.photo_url } });
      } catch (e) { /* avatar sync is best-effort */ }
      toast.success("Profile saved. Welcome aboard!");
      setState("hidden");
    } catch (e) { toast.error("Could not save, try again"); }
    setSaving(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90, background: "var(--c-bg)",
      overflowY: "auto", padding: "30px 16px",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
          One minute, one time
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.1, color: "var(--c-text-primary)" }}>
          Complete your <span className="ds-accent ds-grad-text">profile.</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--c-text-secondary)", margin: "8px 0 22px", lineHeight: 1.6 }}>
          We use this to address you properly, keep your parents in the loop, and personalise your prep. Takes under a minute.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={label}>Full name</span>
            <input style={inp} value={f.full_name} onChange={set("full_name")} placeholder="As per school records" />
          </div>
          <div>
            <span style={label}>Your WhatsApp number</span>
            <input style={inp} value={f.phone} onChange={set("phone")} placeholder="98XXXXXXXX" />
          </div>
          <div>
            <span style={label}>Date of birth</span>
            <input style={inp} type="date" min="1995-01-01" max="2015-12-31" value={f.dob} onChange={set("dob")} />
          </div>
          <div>
            <span style={label}>Parent / guardian name</span>
            <input style={inp} value={f.parent_name} onChange={set("parent_name")} />
          </div>
          <div>
            <span style={label}>Parent WhatsApp number</span>
            <input style={inp} value={f.parent_phone} onChange={set("parent_phone")} placeholder="98XXXXXXXX" />
          </div>
          <div>
            <span style={label}>City</span>
            <input style={inp} value={f.city} onChange={set("city")} />
          </div>
          <div>
            <span style={label}>Current class</span>
            <select style={inp} value={f.current_class} onChange={set("current_class")}>
              <option value="">Select…</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Admission category (as on your exam form)</span>
            <select style={inp} value={f.category} onChange={set("category")}>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={label}>School</span>
            <input style={inp} value={f.school} onChange={set("school")} placeholder="School name, board" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={label}>Target exams (pick all that apply)</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EXAMS.map((x) => (
                <button key={x} type="button" onClick={() => toggleExam(x)} style={{
                  padding: "7px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  border: "1px solid " + (f.target_exams.includes(x) ? "var(--c-brand-gold)" : "var(--c-border-soft)"),
                  background: f.target_exams.includes(x) ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
                  color: f.target_exams.includes(x) ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                  fontWeight: f.target_exams.includes(x) ? 600 : 400,
                }}>{x}</button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={label}>Your photograph (under 1.5 MB)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                border: "1px solid var(--c-border-soft)",
                background: f.photo_url ? `url('${f.photo_url}') center/cover` : "var(--c-surface-muted)",
                display: "grid", placeItems: "center", fontSize: 11, color: "var(--c-text-tertiary)",
              }}>{f.photo_url ? "" : "Photo"}</div>
              <label style={{
                padding: "9px 16px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                border: "1px solid var(--c-border-soft)", background: "var(--c-surface)", color: "var(--c-text-primary)",
              }}>
                {uploading ? "Uploading…" : f.photo_url ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => uploadPhoto(e.target.files && e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>

        <button type="button" onClick={save} disabled={saving || uploading} style={{
          marginTop: 24, width: "100%", height: 48, borderRadius: 999, border: "none",
          background: "var(--c-accent-grad, var(--c-brand-gold))", color: "#131316",
          fontSize: 15, fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: "inherit",
          opacity: saving || uploading ? 0.7 : 1,
        }}>
          {saving ? "Saving…" : "Save & continue to the portal"}
        </button>
        <p style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 10, textAlign: "center" }}>
          Visible only to you and the IPM Careers team. You can edit it later from your profile.
        </p>
      </div>
    </div>
  );
}
