// ============================================================
// AttendanceSync — admin attendance ledger fed by Zoom reports.
//
// Why: the team used to watch Zoom, note attendance into Excel,
// and message parents one by one. "Sync from Zoom" pulls every
// past meeting's participant report into class_sessions +
// attendance_records; this screen shows the batch grid, absent
// lists (copy-ready for WhatsApp), and fixes unmatched names.
//
// The browser NEVER reads the attendance tables directly (RLS on,
// no policies) — everything flows through the admin-guarded
// /api/attendance/sync | data | assign routes.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/utils/authHeaders";
import { toast } from "react-hot-toast";
import {
  CloudDownload,
  Copy,
  Square,
  Link2,
  UserRoundSearch,
  KeyRound,
} from "lucide-react";

const card = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 16,
  boxShadow: "var(--c-shadow-xs)",
  flexShrink: 0,
};

const kicker = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--c-brand-gold)",
  marginBottom: 8,
};

const goldBtn = (disabled) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--c-brand-gold)",
  color: "var(--c-surface)",
  fontWeight: 600,
  fontSize: 13.5,
  borderRadius: 999,
  padding: "11px 24px",
  border: "none",
  cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit",
  opacity: disabled ? 0.55 : 1,
  flexShrink: 0,
});

const ghostBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "transparent",
  color: "var(--c-text-secondary)",
  fontWeight: 600,
  fontSize: 12.5,
  borderRadius: 999,
  padding: "9px 18px",
  border: "1px solid var(--c-border-faint)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const chip = (active) => ({
  borderRadius: 999,
  padding: "8px 16px",
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  border: active ? "1.5px solid var(--c-brand-gold)" : "1px solid var(--c-border-faint)",
  background: active ? "var(--c-brand-gold-tint)" : "transparent",
  color: active ? "var(--c-brand-gold)" : "var(--c-text-secondary)",
  flexShrink: 0,
});

const inputStyle = {
  background: "transparent",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--c-text-primary)",
  outline: "none",
};

const ENV_VARS = [
  "ZOOM_ACCOUNT_ID_1",
  "ZOOM_CLIENT_ID_1",
  "ZOOM_CLIENT_SECRET_1",
  "ZOOM_ACCOUNT_ID_2",
  "ZOOM_CLIENT_ID_2",
  "ZOOM_CLIENT_SECRET_2",
];

// present >= 40% of the session, partial > 0, absent = 0.
// (Mirrors presenceStatus in lib/zoomAttendance.js — kept local so
// the client bundle doesn't pull the server helpers in.)
function cellStatus(minutes, sessionMinutes) {
  const m = Number(minutes) || 0;
  if (m <= 0) return "absent";
  const total = Number(sessionMinutes) || 0;
  if (!total || m >= 0.4 * total) return "present";
  return "partial";
}

const STATUS_GLYPH = {
  present: { char: "✓", color: "var(--c-success)" },
  partial: { char: "◐", color: "var(--c-brand-gold)" },
  absent: { char: "✕", color: "var(--c-danger)" },
};

function isoDay(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
}

function fmtDate(iso) {
  try {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch (e) {
    return "—";
  }
}

export default function AttendanceSync() {
  const [config, setConfig] = useState(undefined); // {accounts, any}
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]); // sessions of the picked batch
  const [unassigned, setUnassigned] = useState([]); // sessions with no batch
  const [students, setStudents] = useState([]); // {email,name} of picked batch
  const [allStudents, setAllStudents] = useState([]); // for the unmatched picker
  const [records, setRecords] = useState([]); // all in-range attendance rows
  const [unmatched, setUnmatched] = useState([]); // rows with no student_email

  const [selBatch, setSelBatch] = useState(undefined);
  const [fromDate, setFromDate] = useState(() => isoDay(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState(() => isoDay(Date.now()));
  const [sync, setSync] = useState({ active: false, sessions: 0, records: 0, unmatched: 0, error: null, notes: [] });
  const [absentSessionId, setAbsentSessionId] = useState(undefined);
  const [assigning, setAssigning] = useState(undefined); // record/session id mid-post
  const [searches, setSearches] = useState({}); // recordId → picker search text
  const stopRef = useRef(false);

  const rows = Array.isArray(students) ? students : [];
  const cols = Array.isArray(sessions) ? sessions : [];
  const recs = Array.isArray(records) ? records : [];
  const orphanSessions = Array.isArray(unassigned) ? unassigned : [];
  const misses = Array.isArray(unmatched) ? unmatched : [];
  const batchList = Array.isArray(batches) ? batches : [];
  const pickerStudents = Array.isArray(allStudents) ? allStudents : [];
  const cfg = config && typeof config === "object" && !Array.isArray(config) ? config : null;
  const syncState = sync && typeof sync === "object" && !Array.isArray(sync) ? sync : {};

  // minutes per (session, student) cell
  const cellMap = {};
  for (const r of recs) {
    if (!r || !r.student_email) continue;
    const key = String(r.session_id) + "|" + String(r.student_email).toLowerCase();
    cellMap[key] = (cellMap[key] || 0) + (Number(r.minutes) || 0);
  }
  const minutesFor = (sessionId, email) =>
    cellMap[String(sessionId) + "|" + String(email || "").toLowerCase()] || 0;

  const loadData = async (batchId, from, to) => {
    try {
      const headers = (await getAuthHeaders()) || {};
      const qs = new URLSearchParams();
      if (batchId != null) qs.set("batch", String(batchId));
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const r = await fetch("/api/attendance/data?" + qs.toString(), { headers });
      if (!r || !r.json) return;
      const j = await r.json();
      if (!j || j.error) {
        if (j && j.error) toast.error(j.error);
        return;
      }
      setConfig(j.config && typeof j.config === "object" ? j.config : { accounts: [], any: false });
      setBatches(Array.isArray(j.batches) ? j.batches : []);
      setSessions(Array.isArray(j.sessions) ? j.sessions : []);
      setUnassigned(Array.isArray(j.unassigned) ? j.unassigned : []);
      setStudents(Array.isArray(j.students) ? j.students : []);
      setAllStudents(Array.isArray(j.allStudents) ? j.allStudents : []);
      setRecords(Array.isArray(j.records) ? j.records : []);
      setUnmatched(Array.isArray(j.unmatched) ? j.unmatched : []);
    } catch (e) {
      /* network hiccup — screen stays usable */
    }
  };

  useEffect(() => {
    loadData(undefined, fromDate, toDate);
    return () => {
      stopRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickBatch = (id) => {
    setSelBatch(id);
    setAbsentSessionId(undefined);
    loadData(id, fromDate, toDate);
  };

  // Loop /api/attendance/sync (15 meetings per call) until done.
  const runSync = async () => {
    if (syncState.active) return;
    stopRef.current = false;
    let done = { sessions: 0, records: 0, unmatched: 0 };
    let cursor = undefined;
    let notes = [];
    setSync({ active: true, sessions: 0, records: 0, unmatched: 0, error: null, notes: [] });
    try {
      for (let guard = 0; guard < 40 && !stopRef.current; guard++) {
        const headers = (await getAuthHeaders()) || {};
        const r = await fetch("/api/attendance/sync", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromDate, to: toDate, cursor }),
        });
        let j = null;
        try {
          j = await r.json();
        } catch (e) {
          j = null;
        }
        if (!r.ok || !j) {
          setSync((p) => ({ ...(p || {}), active: false, error: (j && j.error) || "Sync failed — try again." }));
          return;
        }
        if (j.configured === false) {
          setSync({ active: false, sessions: 0, records: 0, unmatched: 0, error: null, notes: [] });
          setConfig({ accounts: [], any: false });
          return;
        }
        done = {
          sessions: done.sessions + (Number(j.sessions) || 0),
          records: done.records + (Number(j.records) || 0),
          unmatched: done.unmatched + (Number(j.unmatched) || 0),
        };
        if (Array.isArray(j.notes) && j.notes.length) notes = notes.concat(j.notes).slice(0, 6);
        setSync({ active: true, ...done, error: null, notes });
        if (!j.more) break;
        cursor = j.cursor;
      }
      setSync({ active: false, ...done, error: null, notes });
      toast.success("Synced " + done.sessions + " sessions from Zoom");
    } catch (e) {
      setSync((p) => ({ ...(p || {}), active: false, error: "Network hiccup — hit Sync again, it resumes safely." }));
    }
    stopRef.current = false;
    loadData(selBatch, fromDate, toDate);
  };

  const assignRecord = async (rec, email) => {
    if (!rec || !email || assigning) return;
    setAssigning(rec.id);
    try {
      const headers = (await getAuthHeaders()) || {};
      const r = await fetch("/api/attendance/assign", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: rec.id, student_email: email }),
      });
      let j = null;
      try {
        j = await r.json();
      } catch (e) {
        j = null;
      }
      if (!r.ok) {
        toast.error((j && j.error) || "Could not assign");
      } else {
        toast.success("Matched — future syncs will remember this");
        loadData(selBatch, fromDate, toDate);
      }
    } catch (e) {
      try {
        toast.error("Could not assign — try again");
      } catch (e2) {}
    }
    setAssigning(undefined);
  };

  const assignSession = async (sessionId, batchId) => {
    if (sessionId == null || batchId == null || batchId === "" || assigning) return;
    setAssigning(sessionId);
    try {
      const headers = (await getAuthHeaders()) || {};
      const r = await fetch("/api/attendance/assign", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, batch_id: Number(batchId) }),
      });
      if (r && r.ok) {
        toast.success("Session assigned to batch");
        loadData(selBatch, fromDate, toDate);
      } else {
        toast.error("Could not assign session");
      }
    } catch (e) {
      try {
        toast.error("Could not assign session");
      } catch (e2) {}
    }
    setAssigning(undefined);
  };

  // ── absent list for the picked session ──
  const absentSession = cols.find((s) => s && s.id === absentSessionId) || null;
  const absentStudents = absentSession
    ? rows.filter((st) => st && cellStatus(minutesFor(absentSession.id, st.email), absentSession.duration_min) === "absent")
    : [];

  const copyAbsentList = async () => {
    if (!absentSession) return;
    const topic = absentSession.topic || "class";
    const when = fmtDate(absentSession.start_time);
    const lines = absentStudents.map(
      (st) =>
        (st.name || st.email || "Student") +
        " — Dear parent, " +
        (st.name ? st.name.split(" ")[0] : "your child") +
        " missed the \"" + topic + "\" live class on " + when +
        ". Please ensure they watch the recording and join the next session."
    );
    const text = "Absent — " + topic + " (" + when + ")\n\n" + lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied " + lines.length + " lines — paste into WhatsApp");
    } catch (e) {
      try {
        toast.error("Copy failed — select and copy manually");
      } catch (e2) {}
    }
  };

  // session attendance % for column headers
  const sessionPct = (s) => {
    if (!s || !rows.length) return null;
    let attended = 0;
    for (const st of rows) {
      if (st && cellStatus(minutesFor(s.id, st.email), s.duration_min) !== "absent") attended++;
    }
    return Math.round((attended / rows.length) * 100);
  };

  const rowPct = (st) => {
    if (!st || !cols.length) return null;
    let present = 0;
    for (const s of cols) {
      if (s && cellStatus(minutesFor(s.id, st.email), s.duration_min) === "present") present++;
    }
    return Math.round((present / cols.length) * 100);
  };

  const searchMap = searches && typeof searches === "object" && !Array.isArray(searches) ? searches : {};
  const configured = cfg ? !!cfg.any : null; // null = still loading

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {/* ── header ── */}
      <header className="mt-10" style={{ flexShrink: 0 }}>
        <div style={kicker}>Operations</div>
        <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08 }}>
          Attendance, <span className="ds-accent ds-grad-text">automatic.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.6, maxWidth: 720 }}>
          Every Zoom class report lands here on its own — who joined, for how long, who never showed. The Excel sheet
          and the one-by-one checking are retired.
        </p>
      </header>

      {/* ── setup card (no Zoom creds yet) ── */}
      {configured === false ? (
        <div className="mt-7 max-w-[1000px]" style={{ ...card, padding: "24px 26px" }}>
          <div className="flex items-center gap-3">
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <KeyRound size={19} />
            </span>
            <div style={{ fontSize: 15, fontWeight: 600 }}>One-time setup: connect Zoom</div>
          </div>
          <p className="mt-3" style={{ fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.65, maxWidth: 700 }}>
            Add the Zoom Server-to-Server app credentials as environment variables in Vercel (Project → Settings →
            Environment Variables), then redeploy. The second account&apos;s three variables are optional — skip them if
            you only use one Zoom account.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {ENV_VARS.map((v) => (
              <span key={v} style={{ borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 600, letterSpacing: "0.02em", background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)" }}>
                {v}
              </span>
            ))}
          </div>
          <p className="mt-4" style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", lineHeight: 1.6 }}>
            Nothing is broken — this screen simply waits until the keys exist. Once they do, hit Sync from Zoom below.
          </p>
        </div>
      ) : null}

      {/* ── controls ── */}
      <div className="mt-7 max-w-[1000px]" style={{ ...card, padding: "20px 24px" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <label style={{ fontSize: 12.5, color: "var(--c-text-secondary)", fontWeight: 600 }}>
            From{" "}
            <input type="date" value={fromDate || ""} onChange={(e) => setFromDate(e.target.value)} style={{ ...inputStyle, marginLeft: 6 }} />
          </label>
          <label style={{ fontSize: 12.5, color: "var(--c-text-secondary)", fontWeight: 600 }}>
            To{" "}
            <input type="date" value={toDate || ""} onChange={(e) => setToDate(e.target.value)} style={{ ...inputStyle, marginLeft: 6 }} />
          </label>
          <button type="button" onClick={runSync} disabled={!!syncState.active || configured === false} style={goldBtn(!!syncState.active || configured === false)}>
            <CloudDownload size={15} />
            {syncState.active ? "Syncing from Zoom…" : "Sync from Zoom"}
          </button>
          {syncState.active ? (
            <button type="button" onClick={() => { stopRef.current = true; }} style={ghostBtn}>
              <Square size={13} /> Stop
            </button>
          ) : null}
          <button type="button" onClick={() => loadData(selBatch, fromDate, toDate)} style={ghostBtn}>
            Refresh
          </button>
        </div>
        {syncState.active || syncState.sessions ? (
          <div className="mt-3" style={{ fontSize: 13, color: "var(--c-text-secondary)" }}>
            <b style={{ color: "var(--c-text-primary)" }}>{Number(syncState.sessions) || 0}</b> sessions ·{" "}
            <b style={{ color: "var(--c-text-primary)" }}>{Number(syncState.records) || 0}</b> attendance rows ·{" "}
            <b style={{ color: "var(--c-brand-gold)" }}>{Number(syncState.unmatched) || 0}</b> unmatched
            {syncState.active ? " — still pulling…" : " — done."}
          </div>
        ) : null}
        {syncState.error ? (
          <div className="mt-3" style={{ fontSize: 13, color: "var(--c-danger)" }}>{syncState.error}</div>
        ) : null}
        {Array.isArray(syncState.notes) && syncState.notes.length ? (
          <div className="mt-2" style={{ fontSize: 12, color: "var(--c-text-tertiary)", lineHeight: 1.6 }}>
            {syncState.notes.map((n, i) => (
              <div key={i}>{String(n)}</div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── batch picker ── */}
      <div className="mt-7 max-w-[1000px]" style={{ flexShrink: 0 }}>
        <div style={kicker}>Batches</div>
        {batchList.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--c-text-tertiary)" }}>No batches found — create one in Batch Creator first.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {batchList.map((b, i) =>
              b ? (
                <button key={b.id ?? i} type="button" onClick={() => pickBatch(b.id)} style={chip(selBatch === b.id)}>
                  {b.title || "Batch " + (b.id ?? "")}
                </button>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* ── attendance grid ── */}
      <div className="mt-7 max-w-[1100px]" style={{ ...card, padding: "20px 24px" }}>
        <div style={kicker}>Attendance grid</div>
        {selBatch == null ? (
          <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>Pick a batch above to see its grid.</div>
        ) : cols.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>
            No synced sessions for this batch in the selected dates. Run a sync, widen the dates, or assign orphan
            sessions to this batch below.
          </div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>No students admitted to this batch yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-tertiary)", fontWeight: 600 }}>
                    Student
                  </th>
                  {cols.map((s, i) => {
                    const pct = sessionPct(s);
                    return (
                      <th key={(s && s.id) ?? i} title={(s && s.topic) || ""} style={{ padding: "8px 10px", fontWeight: 600, color: "var(--c-text-secondary)", whiteSpace: "nowrap" }}>
                        <div>{fmtDate(s && s.start_time)}</div>
                        <div style={{ fontSize: 10.5, color: "var(--c-text-tertiary)", fontWeight: 500 }}>
                          {pct == null ? "—" : pct + "%"}
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ padding: "8px 0 8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-tertiary)", fontWeight: 600 }}>
                    Present
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((st, ri) => {
                  if (!st) return null;
                  const pct = rowPct(st);
                  return (
                    <tr key={st.email || ri} style={{ borderTop: "1px solid var(--c-border-faint)" }}>
                      <td style={{ padding: "9px 12px 9px 0", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{st.name || st.email || "—"}</div>
                        {st.name ? (
                          <div style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>{st.email}</div>
                        ) : null}
                      </td>
                      {cols.map((s, ci) => {
                        const mins = minutesFor(s && s.id, st.email);
                        const status = cellStatus(mins, s && s.duration_min);
                        const g = STATUS_GLYPH[status] || STATUS_GLYPH.absent;
                        return (
                          <td
                            key={(s && s.id) ?? ci}
                            title={mins + " min of " + (Number(s && s.duration_min) || 0) + " min"}
                            style={{ textAlign: "center", padding: "9px 10px", color: g.color, fontWeight: 700, fontSize: 14 }}
                          >
                            {g.char}
                          </td>
                        );
                      })}
                      <td className="ds-stat-value" style={{ padding: "9px 0 9px 10px", fontSize: 14, textAlign: "right" }}>
                        {pct == null ? "—" : pct + "%"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3" style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
              <span style={{ color: "var(--c-success)", fontWeight: 700 }}>{"✓"}</span> present (≥40% of the class) ·{" "}
              <span style={{ color: "var(--c-brand-gold)", fontWeight: 700 }}>{"◐"}</span> partial ·{" "}
              <span style={{ color: "var(--c-danger)", fontWeight: 700 }}>{"✕"}</span> absent — hover a cell for exact minutes.
            </div>
          </div>
        )}
      </div>

      {/* ── absent list ── */}
      <div className="mt-7 max-w-[1000px]" style={{ ...card, padding: "20px 24px" }}>
        <div style={kicker}>Absent list</div>
        {selBatch == null || cols.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>
            Pick a batch with synced sessions, then choose a class to get its absentee list.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {cols.map((s, i) =>
                s ? (
                  <button key={s.id ?? i} type="button" onClick={() => setAbsentSessionId(s.id)} style={chip(absentSessionId === s.id)}>
                    {fmtDate(s.start_time)} · {(s.topic || "Class").slice(0, 28)}
                  </button>
                ) : null
              )}
            </div>
            {absentSession ? (
              <div className="mt-4">
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {absentStudents.length === 0
                    ? "Full house — nobody missed this one."
                    : absentStudents.length + " absent from “" + (absentSession.topic || "Class") + "”"}
                </div>
                {absentStudents.length > 0 ? (
                  <>
                    <ul className="mt-2" style={{ fontSize: 13, color: "var(--c-text-secondary)", lineHeight: 1.9, paddingLeft: 4, listStyle: "none" }}>
                      {absentStudents.map((st, i) => (
                        <li key={st.email || i}>
                          <span style={{ color: "var(--c-danger)", fontWeight: 700, marginRight: 8 }}>{"✕"}</span>
                          <b style={{ color: "var(--c-text-primary)" }}>{st.name || st.email}</b>
                          {st.name ? <span style={{ color: "var(--c-text-tertiary)" }}> · {st.email}</span> : null}
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={copyAbsentList} style={{ ...goldBtn(false), marginTop: 10 }}>
                      <Copy size={14} /> Copy list for WhatsApp
                    </button>
                    <div className="mt-2" style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                      One parent-ready line per student — paste into WhatsApp until the API automation lands.
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="mt-3" style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>Pick a session above.</div>
            )}
          </>
        )}
      </div>

      {/* ── unmatched participants ── */}
      <div className="mt-7 max-w-[1000px]" style={{ ...card, padding: "20px 24px" }}>
        <div style={kicker}>Unmatched participants{misses.length ? " · " + misses.length : ""}</div>
        {misses.length === 0 ? (
          <div className="flex items-center gap-3">
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <UserRoundSearch size={19} />
            </span>
            <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)" }}>
              Everyone in the synced reports is matched to a student. Names that can&apos;t be matched automatically will
              queue up here.
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: "var(--c-text-secondary)", lineHeight: 1.6, maxWidth: 680 }}>
              Zoom names that didn&apos;t match any student (nicknames, parents&apos; phones, missing emails). Pick who each
              one really is — the match is remembered, so every future sync applies it automatically.
            </p>
            <div className="flex flex-col gap-3 mt-3">
              {misses.map((r, i) => {
                if (!r) return null;
                const q = String(searchMap[r.id] || "").toLowerCase();
                const options = q
                  ? pickerStudents.filter(
                      (st) =>
                        st &&
                        (String(st.name || "").toLowerCase().includes(q) ||
                          String(st.email || "").toLowerCase().includes(q))
                    )
                  : pickerStudents;
                return (
                  <div key={r.id ?? i} className="flex items-center gap-3 flex-wrap" style={{ borderTop: i ? "1px solid var(--c-border-faint)" : "none", paddingTop: i ? 12 : 0 }}>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.zoom_name || "(no name)"}</div>
                      <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                        {r.zoom_email || "no email from Zoom"} · {Number(r.minutes) || 0} min
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search student…"
                      value={searchMap[r.id] || ""}
                      onChange={(e) => setSearches({ ...searchMap, [r.id]: e.target.value })}
                      style={{ ...inputStyle, width: 150 }}
                    />
                    <select
                      value=""
                      disabled={assigning === r.id}
                      onChange={(e) => assignRecord(r, e.target.value)}
                      style={{ ...inputStyle, maxWidth: 240, cursor: "pointer", background: "var(--c-surface)" }}
                    >
                      <option value="">{assigning === r.id ? "Saving…" : "This is…"}</option>
                      {(Array.isArray(options) ? options : []).slice(0, 200).map((st, oi) =>
                        st && st.email ? (
                          <option key={st.email || oi} value={st.email}>
                            {(st.name ? st.name + " — " : "") + st.email}
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── orphan sessions (no batch) ── */}
      {orphanSessions.length > 0 ? (
        <div className="mt-7 max-w-[1000px]" style={{ ...card, padding: "20px 24px" }}>
          <div style={kicker}>Sessions without a batch · {orphanSessions.length}</div>
          <p style={{ fontSize: 12.5, color: "var(--c-text-secondary)", lineHeight: 1.6, maxWidth: 680 }}>
            These Zoom meetings didn&apos;t match any scheduled class link. Point each one at its batch and the grid picks
            it up instantly.
          </p>
          <div className="flex flex-col gap-3 mt-3">
            {orphanSessions.map((s, i) => {
              if (!s) return null;
              return (
                <div key={s.id ?? i} className="flex items-center gap-3 flex-wrap" style={{ borderTop: i ? "1px solid var(--c-border-faint)" : "none", paddingTop: i ? 12 : 0 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Link2 size={15} />
                  </span>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.topic || "Untitled meeting"}</div>
                    <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                      {fmtDate(s.start_time)} · {Number(s.duration_min) || 0} min · account {s.account_no ?? "—"}
                    </div>
                  </div>
                  <select
                    value=""
                    disabled={assigning === s.id}
                    onChange={(e) => assignSession(s.id, e.target.value)}
                    style={{ ...inputStyle, maxWidth: 240, cursor: "pointer", background: "var(--c-surface)" }}
                  >
                    <option value="">{assigning === s.id ? "Saving…" : "Assign to batch…"}</option>
                    {batchList.map((b, bi) =>
                      b && b.id != null ? (
                        <option key={b.id ?? bi} value={b.id}>
                          {b.title || "Batch " + b.id}
                        </option>
                      ) : null
                    )}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ height: 40, flexShrink: 0 }} />
    </div>
  );
}
