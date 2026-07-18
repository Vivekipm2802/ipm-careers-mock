// ============================================================
// lib/recordings.js — pure helpers for Ship A (recordings +
// start dates). Kept dependency-free and CommonJS, mirroring
// lib/zoomAttendance.js, so the node test harness can require
// it directly without a bundler.
//
// Data model recon (matters!): students watch recordings from
// CLASSES_HISTORY rows (Classes.js HistoryPane), while `classes`
// holds the recurring schedule template + the Zoom join url that
// carries the meeting id. So auto-linking goes:
//   zoom meeting id → classes.url → batch_id → nearest
//   classes_history capsule by date.
// ============================================================

/** Is this URL a Zoom link (join or share)? Zoom links are safe to
 *  overwrite with a fresher Zoom share url; anything else (Drive,
 *  YouTube, storage…) was placed manually and is never touched. */
function isZoomLink(url) {
  return /(^|\.)zoom\.us\//i.test(String(url == null ? "" : url).replace(/^https?:\/\//i, ""));
}

/**
 * The never-overwrite rule for /api/recordings/fetch-zoom:
 * a capsule may receive an auto-fetched Zoom share link only when
 *  - it has NO storage upload (recording_path always wins), and
 *  - its `recording` is empty OR is itself a Zoom link.
 */
function canAutoLink(capsule) {
  if (!capsule) return false;
  if (String(capsule.recording_path || "").trim()) return false;
  const r = String(capsule.recording || "").trim();
  return !r || isZoomLink(r);
}

/**
 * Match a Zoom cloud recording (by its meeting start time) to one of
 * the batch's classes_history capsules. Capsules are dated by
 * created_at (the row lands "within a few hours" of the class), so we
 * accept capsules created from 6h before the meeting up to 36h after,
 * and pick the closest one that is allowed to receive an auto link.
 * Returns the capsule or null.
 */
function pickCapsuleForMeeting(meetingStartIso, capsules, opts) {
  const o = opts || {};
  const maxBeforeMs = (o.maxBeforeHours != null ? o.maxBeforeHours : 6) * 3600 * 1000;
  const maxAfterMs = (o.maxAfterHours != null ? o.maxAfterHours : 36) * 3600 * 1000;
  const t = Date.parse(meetingStartIso);
  if (isNaN(t)) return null;
  let best = null;
  let bestAbs = Infinity;
  for (const c of Array.isArray(capsules) ? capsules : []) {
    if (!canAutoLink(c)) continue;
    const ct = Date.parse(c && c.created_at);
    if (isNaN(ct)) continue;
    const delta = ct - t;
    if (delta < -maxBeforeMs || delta > maxAfterMs) continue;
    const abs = Math.abs(delta);
    if (abs < bestAbs) {
      best = c;
      bestAbs = abs;
    }
  }
  return best;
}

/** Zoom puts the share passcode in `recording_play_passcode` on newer
 *  payloads and `password` on older ones — store whichever exists. */
function extractPasscode(meeting) {
  const m = meeting || {};
  const p = m.recording_play_passcode || m.password || "";
  return String(p).trim() || null;
}

/** Storage-safe file name: strip any path components, collapse anything
 *  outside [A-Za-z0-9._-], no leading dots/dashes, bounded length. */
function sanitizeFileName(name) {
  const base = String(name == null ? "" : name).split(/[\\/]/).pop() || "";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[.\-]+/, "")
    .slice(0, 80);
  return cleaned || "video";
}

/**
 * Server-side start-date gate. true = allowed to watch.
 * effectiveStartDate: 'YYYY-MM-DD' or null (null = no gating).
 * classDateIso: the capsule's created_at.
 * A capsule dated before the student's effective start is blocked.
 */
function startDateGate(effectiveStartDate, classDateIso) {
  const start = String(effectiveStartDate || "").slice(0, 10);
  if (!start) return true;
  const d = String(classDateIso || "").slice(0, 10);
  if (!d) return true; // undated capsule — never lock the student out
  return d >= start;
}

/** Which badge the admin sees for a capsule's recording source. */
function recordingSource(capsule) {
  const c = capsule || {};
  if (String(c.recording_path || "").trim()) return "STORAGE";
  const r = String(c.recording || "").trim();
  if (!r) return "NONE";
  return isZoomLink(r) ? "ZOOM AUTO" : "LINK";
}

module.exports = {
  isZoomLink,
  canAutoLink,
  pickCapsuleForMeeting,
  extractPasscode,
  sanitizeFileName,
  startDateGate,
  recordingSource,
};
