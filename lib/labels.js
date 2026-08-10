// ============================================================
// lib/labels.js — display-name helpers shared by client pages
// AND server/test code (CommonJS on purpose, like lib/scoring).
//
// mock_groups subject titles arrive raw from the admin panel:
// "SA (Hash IPMAT Mock 3) 2026", "VA (Hash IPMAT Mock 1) 2026"…
// The section is just "SA" / "VA" — everything else is the mock's
// own name repeated. shortSectionName derives the short display
// name; if stripping would leave nothing, the original title wins.
// ============================================================

// "SA (Hash IPMAT Mock 3) 2026" → "SA"
// "Quantitative Ability"        → "Quantitative Ability"
// "(Hash IPMAT Mock 3)"         → falls back to the original title
function shortSectionName(title) {
  var raw = title == null ? "" : String(title).trim();
  if (!raw) return raw;
  var s = raw;
  // Strip every parenthetical "(...)" group (repeat for nesting).
  var prev;
  do {
    prev = s;
    s = s.replace(/\s*\([^()]*\)\s*/g, " ");
  } while (s !== prev);
  // Strip trailing years / digit runs plus any separators around them
  // ("… 2026", "… · 3", "…-2026 2027").
  var tail = /[\s·•.|,:;\-–—_/]*\d+[\s·•.|,:;\-–—_/]*$/;
  while (tail.test(s)) s = s.replace(tail, "");
  // Trim leftover separators and collapse whitespace.
  s = s
    .replace(/^[\s·•.|,:;\-–—_/]+|[\s·•.|,:;\-–—_/]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return s || raw;
}

module.exports = { shortSectionName: shortSectionName };
