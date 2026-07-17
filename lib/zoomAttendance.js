// ============================================================
// lib/zoomAttendance.js — shared helpers for the Zoom attendance
// sync (Phase 13). Server-to-Server OAuth, report pagination, and
// the pure matching/aggregation logic (kept dependency-free and
// CommonJS so the node test harness can require it directly).
//
// Credentials come from env vars (added by the owner in Vercel):
//   ZOOM_ACCOUNT_ID_1 / ZOOM_CLIENT_ID_1 / ZOOM_CLIENT_SECRET_1
//   ZOOM_ACCOUNT_ID_2 / ZOOM_CLIENT_ID_2 / ZOOM_CLIENT_SECRET_2  (optional)
// Everything degrades gracefully when they're missing.
// ============================================================

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API = "https://api.zoom.us/v2";

/** Which of the two Zoom S2S credential sets are fully configured. */
function getConfiguredZoomAccounts(env) {
  const e = env || process.env;
  const out = [];
  for (const n of [1, 2]) {
    const accountId = e["ZOOM_ACCOUNT_ID_" + n];
    const clientId = e["ZOOM_CLIENT_ID_" + n];
    const clientSecret = e["ZOOM_CLIENT_SECRET_" + n];
    if (accountId && clientId && clientSecret) {
      out.push({ no: n, accountId, clientId, clientSecret });
    }
  }
  return out;
}

/**
 * Zoom rule: meeting UUIDs that start with "/" or contain "//" must be
 * DOUBLE url-encoded when used in a path; everything else single-encoded.
 */
function encodeMeetingUuid(uuid) {
  const s = String(uuid == null ? "" : uuid);
  if (s.startsWith("/") || s.includes("//")) {
    return encodeURIComponent(encodeURIComponent(s));
  }
  return encodeURIComponent(s);
}

/** Account-credentials OAuth token. Cache per request only (caller holds it). */
async function getZoomToken(account, fetchImpl) {
  const f = fetchImpl || fetch;
  const basic = Buffer.from(account.clientId + ":" + account.clientSecret).toString("base64");
  const url =
    ZOOM_OAUTH_URL +
    "?grant_type=account_credentials&account_id=" +
    encodeURIComponent(account.accountId);
  const r = await f(url, { method: "POST", headers: { Authorization: "Basic " + basic } });
  if (!r || !r.ok) {
    throw new Error("Zoom token failed for account " + account.no + " (HTTP " + (r && r.status) + ")");
  }
  const j = await r.json();
  if (!j || !j.access_token) throw new Error("Zoom token response missing access_token (account " + account.no + ")");
  return j.access_token;
}

async function zoomGet(token, path, fetchImpl) {
  const f = fetchImpl || fetch;
  const r = await f(ZOOM_API + path, { headers: { Authorization: "Bearer " + token } });
  if (!r || !r.ok) {
    // Surface Zoom's own error body — "HTTP 400" alone can't tell a missing
    // scope (code 4711) from a Basic/unlicensed user (code 200) apart.
    let detail = "";
    try {
      const body = await r.json();
      if (body && (body.code || body.message)) {
        detail = " — Zoom says: [" + (body.code || "?") + "] " + (body.message || "");
      }
    } catch (_e) { /* body not JSON — ignore */ }
    const err = new Error("Zoom GET " + path.split("?")[0] + " failed (HTTP " + (r && r.status) + ")" + detail);
    err.status = r && r.status;
    throw err;
  }
  return r.json();
}

/**
 * Hosts to pull reports for. Tries GET /users (needs users:read scope);
 * if the S2S app isn't scoped for it, falls back to 'me' only.
 * Returns { ids, fellBack }.
 */
async function listHostIds(token, fetchImpl) {
  try {
    const j = await zoomGet(token, "/users?page_size=300&status=active", fetchImpl);
    const ids = (j && Array.isArray(j.users) ? j.users : [])
      .map((u) => u && u.id)
      .filter(Boolean);
    if (ids.length) return { ids, fellBack: false };
    return { ids: ["me"], fellBack: true };
  } catch (e) {
    return { ids: ["me"], fellBack: true };
  }
}

/** All past meetings for a host in [from, to] (YYYY-MM-DD), paginated. */
async function listReportMeetings(token, hostId, from, to, fetchImpl) {
  const out = [];
  let next = "";
  do {
    const j = await zoomGet(
      token,
      "/report/users/" +
        encodeURIComponent(hostId) +
        "/meetings?from=" +
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

/** Raw participant rows for a meeting UUID (one row per join/leave), paginated. */
async function fetchParticipants(token, meetingUuid, fetchImpl) {
  const out = [];
  const encoded = encodeMeetingUuid(meetingUuid);
  let next = "";
  do {
    const j = await zoomGet(
      token,
      "/report/meetings/" +
        encoded +
        "/participants?page_size=300" +
        (next ? "&next_page_token=" + encodeURIComponent(next) : ""),
      fetchImpl
    );
    const rows = j && Array.isArray(j.participants) ? j.participants : [];
    for (const p of rows) out.push(p);
    next = (j && j.next_page_token) || "";
  } while (next);
  return out;
}

/** Lowercase, collapse whitespace — the canonical form for name matching. */
function normName(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Aggregate raw participant rows into one row per person. A participant
 * who drops and rejoins produces multiple rows — keyed by email when
 * Zoom reports one, else by normalised display name, durations summed.
 * Returns [{ zoom_name, zoom_email, minutes }] (zoom_email '' when unknown).
 */
function aggregateParticipants(rows) {
  const byKey = new Map();
  const list = Array.isArray(rows) ? rows : [];
  for (const r of list) {
    if (!r) continue;
    const email = String(r.user_email || "").toLowerCase().trim();
    const name = String(r.name || "").trim();
    const key = email ? "e:" + email : "n:" + normName(name);
    if (key === "n:") continue; // no email, no name — nothing to record
    const prev = byKey.get(key) || { zoom_name: name, zoom_email: email, seconds: 0 };
    prev.seconds += Number(r.duration) || 0;
    if (!prev.zoom_name && name) prev.zoom_name = name;
    byKey.set(key, prev);
  }
  return Array.from(byKey.values()).map((p) => ({
    zoom_name: p.zoom_name || "",
    zoom_email: p.zoom_email || "",
    minutes: Math.round(p.seconds / 60),
  }));
}

/**
 * Match one aggregated participant to a portal student email.
 * Order: exact zoom email → remembered zoom_name_map (exact
 * name+email pair, then name-only) → case-insensitive full-name
 * match, but ONLY when exactly one candidate. Returns email or null.
 *
 * ctx = {
 *   emailSet:      Set of enrolled student emails (lowercase),
 *   nameMapLookup: { "<normName>|<email>": student_email, "<normName>|": ... },
 *   namesToEmails: { "<normName>": [emails...] },
 * }
 */
function matchStudent(participant, ctx) {
  const p = participant || {};
  const c = ctx || {};
  const email = String(p.zoom_email || "").toLowerCase().trim();
  const emailSet = c.emailSet instanceof Set ? c.emailSet : new Set();
  if (email && emailSet.has(email)) return email;

  const nm = normName(p.zoom_name);
  const lookup = c.nameMapLookup || {};
  const mappedPair = lookup[nm + "|" + email];
  if (mappedPair) return String(mappedPair).toLowerCase();
  const mappedName = lookup[nm + "|"];
  if (mappedName) return String(mappedName).toLowerCase();

  if (nm) {
    const candidates = (c.namesToEmails || {})[nm];
    if (Array.isArray(candidates)) {
      const unique = Array.from(new Set(candidates.map((x) => String(x || "").toLowerCase()).filter(Boolean)));
      if (unique.length === 1) return unique[0];
    }
  }
  return null;
}

/**
 * present  — attended >= 40% of the session's minutes
 * partial  — attended > 0 but < 40%
 * absent   — 0 minutes
 * Unknown session length: any attendance counts as present.
 */
function presenceStatus(minutes, sessionMinutes) {
  const m = Number(minutes) || 0;
  if (m <= 0) return "absent";
  const total = Number(sessionMinutes) || 0;
  if (!total || m >= 0.4 * total) return "present";
  return "partial";
}

/**
 * The portal stores the Zoom join link on classes.url (written by
 * /api/triggerQueue). Pull the numeric meeting id out of it so a
 * report meeting can be matched back to its batch.
 */
function extractMeetingIdFromUrl(url) {
  const m = String(url == null ? "" : url).match(/\/j\/(\d{8,12})/);
  return m ? m[1] : null;
}

module.exports = {
  getConfiguredZoomAccounts,
  encodeMeetingUuid,
  getZoomToken,
  zoomGet,
  listHostIds,
  listReportMeetings,
  fetchParticipants,
  normName,
  aggregateParticipants,
  matchStudent,
  presenceStatus,
  extractMeetingIdFromUrl,
};
