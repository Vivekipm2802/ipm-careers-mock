// ============================================================
// POST /api/attendance/sync — pull Zoom participant reports into
// class_sessions + attendance_records (admin only).
//
// Body: { from, to, cursor } — from/to as YYYY-MM-DD (default:
// last 7 days). Idempotent: sessions upsert on zoom_uuid, records
// upsert on (session_id, zoom_name, zoom_email); re-syncing
// updates minutes, never duplicates. Processes at most
// MAX_MEETINGS_PER_CALL meetings per call (Vercel timeout) and
// returns { more: true, cursor } so the client loops.
//
// Matching, in order:
//   1. batch  — Zoom meeting id found inside classes.url (the join
//               link triggerQueue writes) → that class's batch_id.
//               Manual assignments are never overwritten.
//   2. student — exact zoom email ∈ batch_admits.student_id
//             → remembered zoom_name_map pair
//             → case-insensitive full-name match (only if exactly
//               one enrolled student has that name)
//             → else student_email null (manual assign in the UI).
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const {
  getConfiguredZoomAccounts,
  getZoomToken,
  listHostIds,
  listReportMeetings,
  fetchParticipants,
  normName,
  aggregateParticipants,
  matchStudent,
  extractMeetingIdFromUrl,
} = require("@/lib/zoomAttendance");

const MAX_MEETINGS_PER_CALL = 15;

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return { from: isoDay(from), to: isoDay(to) };
}

/** email(lower) → full_name via Supabase Auth admin (paginated). */
async function buildNameDirectory() {
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
    /* names are an enhancement — email matching still works without them */
  }
  return emailToName;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: "Unauthorized – admin access required" });
  }

  const accounts = getConfiguredZoomAccounts();
  if (!accounts.length) {
    // Friendly degrade — the UI shows a setup card, not an error.
    return res.status(200).json({
      configured: false,
      message: "Zoom credentials not configured yet — add the ZOOM_* environment variables in Vercel.",
      sessions: 0,
      records: 0,
      unmatched: 0,
      more: false,
    });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const dflt = defaultRange();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(body.from || "")) ? body.from : dflt.from;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(body.to || "")) ? body.to : dflt.to;
  const offset = Math.max(0, parseInt(body.cursor && body.cursor.offset, 10) || 0);

  const notes = [];

  try {
    // ── 1) full meeting list across configured accounts (deterministic order) ──
    const meetings = [];
    const seenUuids = new Set();
    for (const account of accounts) {
      try {
        const token = await getZoomToken(account);
        const { ids, fellBack } = await listHostIds(token);
        if (fellBack) {
          notes.push(`Account ${account.no}: users:read not available — synced the account owner ('me') only.`);
        }
        for (const hostId of ids) {
          let rows = [];
          try {
            rows = await listReportMeetings(token, hostId, from, to);
          } catch (e) {
            notes.push(`Account ${account.no} host ${hostId}: ${e.message}`);
            continue;
          }
          for (const m of rows) {
            if (m && m.uuid && !seenUuids.has(m.uuid)) {
              seenUuids.add(m.uuid);
              meetings.push({
                token,
                account_no: account.no,
                uuid: m.uuid,
                meeting_id: m.id != null ? String(m.id) : "",
                topic: m.topic || "",
                start_time: m.start_time || null,
                duration_min: Number(m.duration) || 0,
              });
            }
          }
        }
      } catch (e) {
        notes.push(`Account ${account.no}: ${e.message}`);
      }
    }
    meetings.sort(
      (a, b) =>
        String(a.start_time || "").localeCompare(String(b.start_time || "")) ||
        String(a.uuid).localeCompare(String(b.uuid))
    );

    const slice = meetings.slice(offset, offset + MAX_MEETINGS_PER_CALL);
    if (!slice.length) {
      return res.status(200).json({
        configured: true, sessions: 0, records: 0, unmatched: 0,
        more: false, total: meetings.length, notes,
      });
    }

    // ── 2) batch heuristic: meeting id ↔ classes.url (the stored join link) ──
    const meetingIdToBatch = {};
    try {
      const { data: classRows } = await serversupabase
        .from("classes")
        .select("batch_id,url")
        .not("url", "is", null);
      for (const c of classRows || []) {
        const mid = extractMeetingIdFromUrl(c && c.url);
        if (mid && c.batch_id != null && meetingIdToBatch[mid] == null) {
          meetingIdToBatch[mid] = c.batch_id;
        }
      }
    } catch (e) {
      notes.push("Could not read classes for batch matching — sessions will need manual batch assignment.");
    }

    // ── 3) student matching context ──
    const { data: admits, error: admitsError } = await serversupabase
      .from("batch_admits")
      .select("batch_id,student_id");
    if (admitsError) throw new Error("batch_admits read failed: " + admitsError.message);

    const emailSet = new Set();
    const batchEmails = {}; // batch_id → Set(emails)
    for (const a of admits || []) {
      const em = String((a && a.student_id) || "").toLowerCase().trim();
      if (!em) continue;
      emailSet.add(em);
      if (a.batch_id != null) {
        if (!batchEmails[a.batch_id]) batchEmails[a.batch_id] = new Set();
        batchEmails[a.batch_id].add(em);
      }
    }

    const nameMapLookup = {};
    try {
      const { data: mapRows } = await serversupabase
        .from("zoom_name_map")
        .select("zoom_name,zoom_email,student_email");
      for (const r of mapRows || []) {
        if (!r || !r.student_email) continue;
        const key = normName(r.zoom_name) + "|" + String(r.zoom_email || "").toLowerCase().trim();
        nameMapLookup[key] = r.student_email;
      }
    } catch (e) {
      /* table may not exist yet — matching still works without memory */
    }

    // full_name → [emails], restricted to enrolled students (batch_admits)
    const emailToName = await buildNameDirectory();
    const namesToEmails = {};
    const batchNamesToEmails = {}; // batch_id → { name: [emails] }
    for (const em of emailSet) {
      const nm = normName(emailToName[em]);
      if (!nm) continue;
      (namesToEmails[nm] = namesToEmails[nm] || []).push(em);
    }
    for (const bid of Object.keys(batchEmails)) {
      const m = {};
      for (const em of batchEmails[bid]) {
        const nm = normName(emailToName[em]);
        if (!nm) continue;
        (m[nm] = m[nm] || []).push(em);
      }
      batchNamesToEmails[bid] = m;
    }

    // manual batch assignments must survive a re-sync
    const existingBatch = {};
    try {
      const { data: existing } = await serversupabase
        .from("class_sessions")
        .select("zoom_uuid,batch_id")
        .in("zoom_uuid", slice.map((m) => m.uuid));
      for (const s of existing || []) {
        if (s && s.zoom_uuid) existingBatch[s.zoom_uuid] = s.batch_id;
      }
    } catch (e) {
      /* first sync — table empty */
    }

    // ── 4) process the slice ──
    let sessionCount = 0;
    let recordCount = 0;
    let unmatchedCount = 0;

    for (const m of slice) {
      const heuristicBatch = meetingIdToBatch[m.meeting_id];
      const batch_id =
        existingBatch[m.uuid] != null ? existingBatch[m.uuid] : heuristicBatch != null ? heuristicBatch : null;

      const { data: sessRows, error: sessError } = await serversupabase
        .from("class_sessions")
        .upsert(
          {
            zoom_uuid: m.uuid,
            zoom_meeting_id: m.meeting_id,
            account_no: m.account_no,
            topic: m.topic,
            start_time: m.start_time,
            duration_min: m.duration_min,
            batch_id,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "zoom_uuid" }
        )
        .select("id")
        .limit(1);
      if (sessError) {
        notes.push(`Session "${m.topic}" save failed: ${sessError.message}`);
        continue;
      }
      const sessionId = sessRows && sessRows[0] && sessRows[0].id;
      if (sessionId == null) continue;
      sessionCount++;

      let raw = [];
      try {
        raw = await fetchParticipants(m.token, m.uuid);
      } catch (e) {
        notes.push(`Participants for "${m.topic}" failed: ${e.message}`);
        continue;
      }

      const people = aggregateParticipants(raw);
      if (!people.length) continue;

      const ctx = {
        emailSet: batch_id != null && batchEmails[batch_id] ? batchEmails[batch_id] : emailSet,
        nameMapLookup,
        namesToEmails:
          batch_id != null && batchNamesToEmails[batch_id] ? batchNamesToEmails[batch_id] : namesToEmails,
      };

      const rows = people.map((p) => {
        // batch-scoped first; a miss falls back to the full enrolled set
        // (covers students admitted after the session, wrong-batch joins).
        let student =
          matchStudent(p, ctx) ||
          (ctx.emailSet !== emailSet ? matchStudent(p, { emailSet, nameMapLookup, namesToEmails }) : null);
        if (!student) unmatchedCount++;
        return {
          session_id: sessionId,
          student_email: student,
          zoom_name: p.zoom_name || "",
          zoom_email: p.zoom_email || "",
          minutes: p.minutes,
        };
      });

      const { error: recError } = await serversupabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "session_id,zoom_name,zoom_email" });
      if (recError) {
        notes.push(`Records for "${m.topic}" save failed: ${recError.message}`);
        continue;
      }
      recordCount += rows.length;
    }

    return res.status(200).json({
      configured: true,
      sessions: sessionCount,
      records: recordCount,
      unmatched: unmatchedCount,
      more: offset + MAX_MEETINGS_PER_CALL < meetings.length,
      cursor: { offset: offset + MAX_MEETINGS_PER_CALL },
      total: meetings.length,
      notes,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Sync failed" });
  }
}
