// ============================================================
// lib/leaderboard.js — pure leaderboard builders.
//
// The /api/leaderboard route fetches rows with the service-role
// client (RLS on plays / mock_plays is own-rows-only, which is why
// the old client-side leaderboard queries showed ONLY the current
// user) and hands them here. Everything in this file is pure so
// scripts/test-leaderboard.js can require() it directly.
//
// Every play is RE-SCORED under the canonical rule (lib/scoring) —
// the stored `score` column is never trusted: legacy concept rows
// carry percentages ("100" for everyone) and legacy mock rows carry
// null or wrong-sign scores.
// ============================================================

var scoring = require("./scoring");

// Time taken in minutes: wall-clock duration column preferred,
// fallback to the max cumulative timestamp in the report.
function timeMinOf(play, tsKey) {
  var d = Number(play && play.duration);
  if (Number.isFinite(d) && d > 0) return Math.round(d / 60);
  var report = play && Array.isArray(play.report) ? play.report : [];
  var maxT = report.reduce(function (m, r) {
    return r && typeof r[tsKey] === "number" && r[tsKey] > m ? r[tsKey] : m;
  }, 0);
  return maxT > 0 ? Math.round(maxT / 60) : null;
}

function displayName(row) {
  if (row && row.name && String(row.name).trim()) return String(row.name).trim();
  if (row && row.user && String(row.user).indexOf("@") !== -1) {
    // No name on the account — make the email prefix readable:
    // "rishita.sharma08" → "Rishita Sharma"
    var p = String(row.user).split("@")[0]
      .replace(/[0-9]+/g, " ")
      .replace(/[._-]+/g, " ")
      .trim();
    if (!p) return "Student";
    return p
      .split(/\s+/)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
      .join(" ");
  }
  return "Student";
}

// plays:   [{uid, user, name, report, duration, created_at, ...}]
// scoreFn: (play) → canonical scoring result ({score, maxMarks,
//          attempted, correct, ...}) — concept or mock flavour.
// tsKey:   'timestamp' (concept) | 'at' (mock).
// requesterEmail: the logged-in user, for the "you" row + rank.
function buildLeaderboard(plays, scoreFn, tsKey, requesterEmail) {
  var byUser = new Map();

  (Array.isArray(plays) ? plays : []).forEach(function (p) {
    if (!p || !Array.isArray(p.report)) return;
    var s;
    try {
      s = scoreFn(p);
    } catch (e) {
      return; // a malformed play never takes the board down
    }
    if (!s) return;
    var row = {
      uid: p.uid != null ? p.uid : null,
      user: p.user || null,
      name: p.name || null,
      scoreMarks: s.score,
      maxMarks: s.maxMarks,
      attempted: s.attempted,
      correct: s.correct,
      timeMin: timeMinOf(p, tsKey),
      created_at: p.created_at || null,
    };
    // Dedupe: one row per student — keep the BEST attempt
    // (highest marks; ties broken by faster time).
    var key = row.user ? String(row.user).toLowerCase() : "anon-" + String(row.uid);
    var prev = byUser.get(key);
    var better =
      !prev ||
      row.scoreMarks > prev.scoreMarks ||
      (row.scoreMarks === prev.scoreMarks &&
        (row.timeMin == null ? Infinity : row.timeMin) < (prev.timeMin == null ? Infinity : prev.timeMin));
    if (better) byUser.set(key, row);
  });

  var rows = Array.from(byUser.values()).sort(function (a, b) {
    if (b.scoreMarks !== a.scoreMarks) return b.scoreMarks - a.scoreMarks;
    var ta = a.timeMin == null ? Infinity : a.timeMin;
    var tb = b.timeMin == null ? Infinity : b.timeMin;
    if (ta !== tb) return ta - tb;
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });
  rows.forEach(function (r, i) { r.rank = i + 1; });

  var email = requesterEmail ? String(requesterEmail).toLowerCase() : null;
  var youRow = email
    ? rows.find(function (r) { return r.user && String(r.user).toLowerCase() === email; }) || null
    : null;

  // Top-10% averages across DEDUPED best attempts.
  var nTop = rows.length > 0 ? Math.max(1, Math.ceil(rows.length * 0.1)) : 0;
  var slice = rows.slice(0, nTop);
  function avgOf(key) {
    var vals = slice.map(function (r) { return r[key]; }).filter(function (v) { return Number.isFinite(v); });
    if (vals.length === 0) return null;
    return Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
  }

  // Public shape — never leak emails.
  function pub(r) {
    return {
      rank: r.rank,
      name: displayName(r),
      scoreMarks: r.scoreMarks,
      maxMarks: r.maxMarks,
      attempted: r.attempted,
      correct: r.correct,
      timeMin: r.timeMin,
      isYou: youRow != null && r === youRow,
    };
  }

  return {
    top: rows.slice(0, 10).map(pub),
    you: youRow ? pub(youRow) : null,
    totalPlayers: rows.length,
    maxMarks: rows.length > 0 ? rows[0].maxMarks : null,
    top10pctAvg: nTop > 0
      ? {
          count: nTop,
          scoreMarks: avgOf("scoreMarks"),
          attempted: avgOf("attempted"),
          correct: avgOf("correct"),
          timeMin: avgOf("timeMin"),
        }
      : null,
  };
}

function buildConceptLeaderboard(plays, questions, requesterEmail) {
  return buildLeaderboard(
    plays,
    function (p) { return scoring.scoreConceptPlay(questions, p.report, p.config); },
    "timestamp",
    requesterEmail
  );
}

function buildMockLeaderboard(plays, groups, moduleRows, questionRows, requesterEmail) {
  return buildLeaderboard(
    plays,
    function (p) { return scoring.scoreMockPlay(groups, moduleRows, questionRows, p.report).total; },
    "at",
    requesterEmail
  );
}

module.exports = {
  timeMinOf: timeMinOf,
  displayName: displayName,
  buildLeaderboard: buildLeaderboard,
  buildConceptLeaderboard: buildConceptLeaderboard,
  buildMockLeaderboard: buildMockLeaderboard,
};
