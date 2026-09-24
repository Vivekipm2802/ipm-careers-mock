// ============================================================
// StudentsDirectory — admin view of every enrolled student with
// their onboarding-profile details (Sep 2026). Search + CSV export.
// Data via /api/students/list (service role behind requireAdmin).
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Download, Search } from "lucide-react";
import { getAuthHeaders } from "@/utils/authHeaders";

const card = {
  background: "var(--c-surface)", border: "1px solid var(--c-border-faint)",
  borderRadius: 16, boxShadow: "var(--c-shadow-xs)",
};
const th = {
  textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)",
  borderBottom: "1px solid var(--c-border-soft)", whiteSpace: "nowrap",
};
const td = { padding: "10px 12px", fontSize: 13.5, color: "var(--c-text-primary)", borderBottom: "1px solid var(--c-border-faint)", verticalAlign: "top" };

export default function StudentsDirectory() {
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ total: 0, complete: 0 });
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/students/list", { headers: (await getAuthHeaders()) || {} });
        const j = await r.json();
        if (j && Array.isArray(j.students)) { setRows(j.students); setMeta({ total: j.total, complete: j.complete }); }
        else toast.error((j && j.error) || "Could not load students");
      } catch (e) { toast.error("Could not load students"); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = rows || [];
    const s = q.toLowerCase().trim();
    if (!s) return list;
    return list.filter((r) =>
      [r.full_name, r.email, r.phone, r.parent_name, r.parent_phone, r.city, r.school, (r.batches || []).join(" ")]
        .join(" ").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const exportCsv = () => {
    const cols = ["full_name", "email", "phone", "parent_name", "parent_phone", "city", "current_class", "category", "school", "target_exams", "dob", "batches"];
    const esc = (v) => '"' + String(v == null ? "" : Array.isArray(v) ? v.join("; ") : v).replaceAll('"', '""') + '"';
    const csv = [cols.join(",")]
      .concat(filtered.map((r) => cols.map((c) => esc(r[c])).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "ipm-students.csv";
    a.click();
  };

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mt-10">
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>Operations</div>
        <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08 }}>
          Students, <span className="ds-accent ds-grad-text">one place.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", maxWidth: 720 }}>
          Every enrolled student with the details they filled in the onboarding form.
          {rows ? ` ${meta.complete} of ${meta.total} have completed their profile.` : ""}
        </p>
      </header>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--c-text-tertiary)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, city, batch…"
            style={{ height: 38, width: 300, padding: "0 12px 0 34px", background: "var(--c-surface)", color: "var(--c-text-primary)", border: "1px solid var(--c-border-soft)", borderRadius: 999, fontSize: 13.5, fontFamily: "inherit" }} />
        </div>
        <button type="button" onClick={exportCsv} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 16px", borderRadius: 999, border: "1px solid var(--c-border-soft)", background: "var(--c-surface)", color: "var(--c-text-primary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          <Download size={14} /> Export CSV ({filtered.length})
        </button>
      </div>

      <div className="mt-5 mb-16" style={{ ...card, overflowX: "auto" }}>
        {rows === null ? (
          <div style={{ padding: 30, fontSize: 14, color: "var(--c-text-tertiary)" }}>Loading…</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1000 }}>
            <thead><tr>
              <th style={th}>Student</th><th style={th}>Contacts</th><th style={th}>Parent</th>
              <th style={th}>City</th><th style={th}>Class</th><th style={th}>Category</th><th style={th}>School</th>
              <th style={th}>Targets</th><th style={th}>DOB</th><th style={th}>Batches</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--c-border-soft)", background: r.photo_url ? `url('${r.photo_url}') center/cover` : "var(--c-surface-muted)" }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.full_name || <span style={{ color: "var(--c-warning)", fontWeight: 500 }}>Profile pending</span>}</div>
                        <div style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>{r.phone || "—"}</td>
                  <td style={td}>{r.parent_name ? <>{r.parent_name}<div style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>{r.parent_phone}</div></> : "—"}</td>
                  <td style={td}>{r.city || "—"}</td>
                  <td style={td}>{r.current_class || "—"}</td>
                  <td style={td}>{r.category || "—"}</td>
                  <td style={td}>{r.school || "—"}</td>
                  <td style={td}>{Array.isArray(r.target_exams) && r.target_exams.length ? r.target_exams.join(", ") : "—"}</td>
                  <td style={td}>{r.dob || "—"}</td>
                  <td style={td}>{(r.batches || []).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
