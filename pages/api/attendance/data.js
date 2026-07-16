// ============================================================
// GET /api/attendance/data — everything the AttendanceSync admin
// screen needs in one call (admin only).
//
// Query: ?batch=<batches.id>&from=YYYY-MM-DD&to=YYYY-MM-DD
// (from/to default to the last 7 days)
//
// Returns {
//   config:     { accounts: [{no, configured}], any },
//   batches:    [{id, title, status}],
//   sessions:   class_sessions in range for the picked batch,
//   unassigned: class_sessions in range with batch_id null,
//   students:   [{email, name}] for the picked batch (batch_admits),
//   allStudents:[{email, name}] every enrolled student (for the
//               unmatched-participant picker),
//   records:    attendance_records for all in-range sessions,
//   unmatched:  the subset with student_email null,
// }
//
// class_sessions / attendance_records have RLS on with no policies
// — the browser can only see them through this route.
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const { getConfiguredZoomAccounts } = require("@/lib/zoomAttendance");

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

async function nameDirectory() {
  const emailToName = {};
  try {
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await serversupabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      const users = (data && data.users) || [];
      for (const u of users) {
        if (u && u.email) {
          emailToName[u.email.toLowerCase()] =
            (u.user_metadata && u.user_metadata.full_name) || "";
        }
      }
      if (users.length < 1000) break;
    }
  } catch (e) {
    /* names optional */
  }
  return emailToName;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: "Unauthorized – admin access required" });
  }

  const configured = getConfiguredZoomAccounts();
  const config = {
    accounts: [1, 2].map((no) => ({ no, configured: configured.some((a) => a.no === no) })),
    any: configured.length > 0,
  };

  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from || ""))
    ? req.query.from
    : isoDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to || ""))
    ? req.query.to
    : isoDay(new Date());
  const batch = req.query.batch != null && req.query.batch !== "" ? Number(req.query.batch) : null;

  try {
    // batch picker
    const { data: batchRows } = await serversupabase
      .from("batches")
      .select("id,title,status")
      .eq("is_deleted", false)
      .order("id", { ascending: true });
    const batches = Array.isArray(batchRows) ? batchRows : [];

    // sessions in range (attendance tables may not exist until the SQL ships)
    let allSessions = [];
    try {
      const { data: sessRows, error: sessError } = await serversupabase
        .from("class_sessions")
        .select("id,zoom_uuid,zoom_meeting_id,account_no,topic,start_time,duration_min,batch_id")
        .gte("start_time", from + "T00:00:00Z")
        .lte("start_time", to + "T23:59:59Z")
        .order("start_time", { ascending: true });
      if (!sessError && Array.isArray(sessRows)) allSessions = sessRows;
    } catch (e) {
      /* table missing → empty grid, setup message covers it */
    }

    const sessions =
      batch != null ? allSessions.filter((s) => s && Number(s.batch_id) === batch) : [];
    const unassigned = allSessions.filter((s) => s && s.batch_id == null);

    // students of the picked batch + everyone (for the unmatched picker)
    const { data: admits } = await serversupabase
      .from("batch_admits")
      .select("batch_id,student_id");
    const emailToName = await nameDirectory();
    const toStudent = (em) => ({ email: em, name: emailToName[em] || "" });
    const byName = (a, b) =>
      String(a.name || a.email).localeCompare(String(b.name || b.email));

    const allEmails = new Set();
    const batchEmailList = new Set();
    for (const a of admits || []) {
      const em = String((a && a.student_id) || "").toLowerCase().trim();
      if (!em) continue;
      allEmails.add(em);
      if (batch != null && Number(a.batch_id) === batch) batchEmailList.add(em);
    }
    const students = Array.from(batchEmailList).map(toStudent).sort(byName);
    const allStudents = Array.from(allEmails).map(toStudent).sort(byName);

    // attendance records for every in-range session
    let records = [];
    const sessionIds = allSessions.map((s) => s.id);
    if (sessionIds.length) {
      try {
        const { data: recRows } = await serversupabase
          .from("attendance_records")
          .select("id,session_id,student_email,zoom_name,zoom_email,minutes")
          .in("session_id", sessionIds);
        if (Array.isArray(recRows)) records = recRows;
      } catch (e) {
        /* table missing */
      }
    }
    const unmatched = records.filter((r) => r && !r.student_email);

    return res.status(200).json({
      config,
      from,
      to,
      batches,
      sessions,
      unassigned,
      students,
      allStudents,
      records,
      unmatched,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Failed to load attendance data" });
  }
}
