// ============================================================
// POST /api/recordings/fetch-zoom — pull Zoom cloud-recording
// share links into classes_history (admin only).
//
// Body: { from, to } as YYYY-MM-DD (default: last 7 days).
// For every configured Zoom S2S account → every host →
// GET /users/{hostId}/recordings. Each meeting that actually has
// recording_files is matched back to a batch through the same
// heuristic the attendance sync uses (meeting id inside
// classes.url), then to the batch's nearest classes_history
// capsule by date. The capsule gets recording = share_url and
// recording_passcode = the Zoom passcode.
//
// NEVER-OVERWRITE RULE: a capsule with a storage upload
// (recording_path) or a manually placed non-Zoom link (Drive,
// YouTube…) is left alone — only empty or Zoom-link capsules are
// written (lib/recordings.canAutoLink).
//
// Missing recording:read:admin scope surfaces as Zoom's own error
// body in `notes` (zoomGet already decodes it).
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const {
  getConfiguredZoomAccounts,
  getZoomToken,
  zoomGet,
  listHostIds,
  extractMeetingIdFromUrl,
} = require("@/lib/zoomAttendance");

const {
  pickCapsuleForMeeting,
  extractPasscode,
} = require("@/lib/recordings");

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

/** All cloud recordings for a host in [from, to], paginated. */
async function listHostRecordings(token, hostId, from, to, fetchImpl) {
  const out = [];
  let next = "";
  do {
    const j = await zoomGet(
      token,
      "/users/" +
        encodeURIComponent(hostId) +
        "/recordings?from=" +
        encodeURIComponent(from) +
        "&to=" +
        encodeURIComponent(to) +
        "&page_size=300" +
        (next ? "&next_page_token=" + encodeURIComponent(next) : ""),
      fetchImpl
    );
    const rows = j && Array.isArray(j.meetings) ? j.meetings : [];
    for (const m of rows) out.push(m);
    next = (j && j.next_page_token) || "";
  } while (next);
  return out;
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
    return res.status(200).json({
      configured: false,
      message: "Zoom credentials not configured yet — add the ZOOM_* environment variables in Vercel.",
      found: 0,
      linked: 0,
      skipped: 0,
    });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const dfltFrom = isoDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const dfltTo = isoDay(new Date());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(body.from || "")) ? body.from : dfltFrom;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(body.to || "")) ? body.to : dfltTo;

  const notes = [];

  try {
    // ── 1) collect meetings that actually have a recording ──
    const meetings = [];
    const seenUuids = new Set();
    for (const account of accounts) {
      try {
        const token = await getZoomToken(account);
        const { ids, fellBack } = await listHostIds(token);
        if (fellBack) {
          notes.push(`Account ${account.no}: users:read not available — fetched the account owner ('me') only.`);
        }
        for (const hostId of ids) {
          let rows = [];
          try {
            rows = await listHostRecordings(token, hostId, from, to);
          } catch (e) {
            notes.push(`Account ${account.no} host ${hostId}: ${e.message}`);
            continue;
          }
          for (const m of rows) {
            if (!m || !m.uuid || seenUuids.has(m.uuid)) continue;
            seenUuids.add(m.uuid);
            const files = Array.isArray(m.recording_files) ? m.recording_files : [];
            if (!files.length || !m.share_url) continue;
            meetings.push({
              meeting_id: m.id != null ? String(m.id) : "",
              topic: m.topic || "",
              start_time: m.start_time || null,
              share_url: m.share_url,
              passcode: extractPasscode(m),
            });
          }
        }
      } catch (e) {
        notes.push(`Account ${account.no}: ${e.message}`);
      }
    }

    if (!meetings.length) {
      return res.status(200).json({ configured: true, found: 0, linked: 0, skipped: 0, notes });
    }

    // ── 2) meeting id → batch (same heuristic as attendance sync) ──
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
      notes.push("Could not read classes for batch matching — no recordings can be linked.");
    }

    // ── 3) the batches' capsules (students watch these rows) ──
    const batchIds = Array.from(
      new Set(meetings.map((m) => meetingIdToBatch[m.meeting_id]).filter((b) => b != null))
    );
    const capsulesByBatch = {};
    if (batchIds.length) {
      const { data: capsules, error: capErr } = await serversupabase
        .from("classes_history")
        .select("id,batch_id,recording,recording_path,created_at")
        .in("batch_id", batchIds);
      if (capErr) throw new Error("classes_history read failed: " + capErr.message);
      for (const c of capsules || []) {
        if (!c || c.batch_id == null) continue;
        (capsulesByBatch[c.batch_id] = capsulesByBatch[c.batch_id] || []).push(c);
      }
    }

    // ── 4) link each recording to its capsule ──
    let linked = 0;
    let skipped = 0;
    const takenCapsules = new Set();
    for (const m of meetings) {
      const batchId = meetingIdToBatch[m.meeting_id];
      if (batchId == null) {
        skipped++;
        continue; // no class link carries this meeting id
      }
      const candidates = (capsulesByBatch[batchId] || []).filter((c) => !takenCapsules.has(c.id));
      const capsule = pickCapsuleForMeeting(m.start_time, candidates);
      if (!capsule) {
        skipped++;
        notes.push(`"${m.topic || m.meeting_id}": no linkable capsule in batch ${batchId} near ${String(m.start_time || "").slice(0, 10)} (manual links are never overwritten).`);
        continue;
      }
      const { error: upErr } = await serversupabase
        .from("classes_history")
        .update({ recording: m.share_url, recording_passcode: m.passcode })
        .eq("id", capsule.id);
      if (upErr) {
        skipped++;
        notes.push(`"${m.topic || m.meeting_id}": save failed — ${upErr.message}`);
        continue;
      }
      takenCapsules.add(capsule.id);
      linked++;
    }

    return res.status(200).json({
      configured: true,
      found: meetings.length,
      linked,
      skipped,
      notes: notes.slice(0, 12),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Fetch failed" });
  }
}
