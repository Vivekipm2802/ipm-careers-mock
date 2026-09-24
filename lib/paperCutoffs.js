// ============================================================
// lib/paperCutoffs.js — official year-wise cutoffs for the real
// past-paper mocks ("reality check" card in mock analytics).
//
// Data source: afterboards.in cutoff explorer (which compiles the
// official IIM admission reports / RTI disclosures), cross-checked
// against ipmcareer.com's own RTI article (Indore 2025/2026) and
// owner-verified Sep 2026. See outputs/Cutoff-table-verification.html
// from the design sprint for the full audit trail.
//
// HONESTY RULES (enforced by the card, not just documented):
//  · A cutoff line renders ONLY when the mock's recomputed max
//    marks match that year's official paper scale (expected maxes
//    below). Partial reconstructions (e.g. Rohtak papers missing
//    figure questions) auto-hide rather than mislead.
//  · Indore = sectional gates (its real filter). Rohtak = overall
//    line. JIPMAT = "lowest admitted score", labelled as such.
//  · Category-wise: the card defaults to the student's own
//    admission category from student_profiles.category and falls
//    back to General with a switcher.
//  · Copy always says "that year's paper, for compass only".
//
// Written as CommonJS so both the page and the node check harness
// can require it directly.
// ============================================================

var CATS = ["General", "EWS", "NC-OBC", "SC", "ST", "PwD"];

// ── IPMAT Indore — sectional cutoffs [SA, MCQ, VA] per category ──
// Expected sectional maxes per year gate the render.
var INDORE = {
  2026: { max: { SA: 60, MCQ: 120, VA: 180 }, cut: { General: [28, 27, 111], EWS: [16, 17, 79], "NC-OBC": [16, 14, 70], SC: [12, 10, 58], ST: [8, 8, 49], PwD: [4, 3, 30] } },
  2025: { max: { SA: 60, MCQ: 120, VA: 180 }, cut: { General: [24, 28, 112], EWS: [16, 18, 87], "NC-OBC": [12, 15, 78], SC: [12, 10, 65], ST: [8, 6, 48], PwD: [8, 5, 47] } },
  2024: { max: { SA: 60, MCQ: 120, VA: 180 }, cut: { General: [24, 35, 113], EWS: [16, 26, 89], "NC-OBC": [12, 23, 78], SC: [12, 18, 60], ST: [8, 13, 40], PwD: [8, 13, 40] } },
  2023: { max: { SA: 60, MCQ: 120, VA: 180 }, cut: { General: [12, 39, 125], EWS: [4, 26, 98], "NC-OBC": [4, 23, 91], SC: [4, 15, 69], ST: [4, 5, 43], PwD: [4, 5, 43] } },
  2022: { max: { SA: 60, MCQ: 120, VA: 180 }, cut: { General: [20, 43, 112], EWS: [8, 29, 86], "NC-OBC": [8, 21, 70], SC: [4, 14, 50], ST: [4, 8, 34], PwD: [4, 8, 34] } },
  2021: { max: { SA: 40, MCQ: 80, VA: 120 }, cut: { General: [16, 21, 70], EWS: [8, 11, 51], "NC-OBC": [8, 9, 44], SC: [4, 4, 31], ST: [4, 1, 25], PwD: [4, 2, 25] } },
  2020: { max: { SA: 40, MCQ: 80, VA: 120 }, cut: { General: [20, 26, 68], EWS: [12, 13, 43], "NC-OBC": [12, 13, 43], SC: [8, 7, 28], ST: [4, 4, 20], PwD: [4, 1, 15] } },
  2019: { max: { SA: 80, MCQ: 160, VA: 160 }, cut: { General: [20, 31, 71], EWS: [8, 18, 40], "NC-OBC": [8, 18, 40], SC: [4, 10, 32], ST: [4, 6, 14], PwD: [4, 6, 14] } },
};

// Ranchi & Shillong admit through IPMAT Indore — extra doors shown
// on Indore papers of matching years.
var RANCHI_OVERALL = {
  2026: { General: 180, EWS: 131, "NC-OBC": 126, SC: 90, ST: 56, PwD: null },
  2025: { General: 177, EWS: 138, "NC-OBC": 120, SC: 95, ST: 49, PwD: 62 },
  2024: { General: 186, EWS: 155, "NC-OBC": 130, SC: 98, ST: 60, PwD: 23 },
  2023: { General: 187, EWS: 153, "NC-OBC": 131, SC: 90, ST: 43, PwD: 34 },
};
var SHILLONG = {
  2026: { General: [16, 30, 45], EWS: [12, 24, 36], "NC-OBC": null, SC: [12, 18, 27], ST: [8, 12, 18], PwD: [4, 6, 9] },
  2025: { General: [12, 24, 36], EWS: [12, 24, 36], "NC-OBC": null, SC: [8, 18, 27], ST: [4, 12, 18], PwD: [4, 12, 18] },
};

// ── IPMAT Rohtak — overall cutoff /480 per category ──────────────
var ROHTAK = {
  2026: { General: 363, EWS: 330, "NC-OBC": 307, SC: 246, ST: 168, PwD: null },
  2025: { General: 381, EWS: 331, "NC-OBC": 297, SC: 230, ST: 138, PwD: null },
  2024: { General: 301, EWS: 264, "NC-OBC": 225, SC: 167, ST: 118, PwD: null },
  2023: { General: 409, EWS: 376, "NC-OBC": 349, SC: 274, ST: 201, PwD: 238 },
  2022: { General: 306, EWS: 261, "NC-OBC": 219, SC: 154, ST: 66, PwD: 185 },
  2021: { General: 256, EWS: 205, "NC-OBC": 195, SC: 157, ST: 141, PwD: 205 },
};
var ROHTAK_MAX = 480;

// ── JIPMAT — lowest ADMITTED score /400 (Gender-Neutral line) ────
// These are admission closing scores, not exam cutoffs — the card
// labels them "lowest admitted score".
var JIPMAT_ADMIT = {
  bodhgaya: {
    2026: { General: 310, EWS: 274, "NC-OBC": 257, SC: 172, ST: 190, PwD: 190 },
    2025: { General: 290, EWS: 245, "NC-OBC": 226, SC: 148, ST: 190, PwD: null },
    2024: { General: 292, EWS: 271, "NC-OBC": 237, SC: 192, ST: 135, PwD: 164 },
    2023: { General: 313, EWS: 289, "NC-OBC": 255, SC: 203, ST: 148, PwD: 159 },
    2022: { General: 335, EWS: 315, "NC-OBC": 287, SC: 222, ST: 148, PwD: 224 },
  },
  jammu: {
    2025: { General: 304, EWS: 247, "NC-OBC": 235, SC: 191, ST: 136, PwD: 152 },
  },
};
var JIPMAT_MAX = 400;

// ── paper-mock test id → exam + year ─────────────────────────────
var PAPER_TESTS = {
  225: { exam: "indore", year: 2026 },
  77: { exam: "indore", year: 2025 },
  79: { exam: "indore", year: 2024 },
  78: { exam: "indore", year: 2023 },
  82: { exam: "indore", year: 2022 },
  83: { exam: "indore", year: 2021 },
  84: { exam: "indore", year: 2020 },
  85: { exam: "indore", year: 2019 },
  226: { exam: "jipmat", year: 2021 },
  227: { exam: "jipmat", year: 2022 },
  228: { exam: "jipmat", year: 2023 },
  229: { exam: "jipmat", year: 2024 },
  230: { exam: "jipmat", year: 2025 },
  233: { exam: "rohtak", year: 2019 },
  234: { exam: "rohtak", year: 2020 },
  235: { exam: "rohtak", year: 2021 },
  236: { exam: "rohtak", year: 2022 },
  237: { exam: "rohtak", year: 2023 },
  // Kozhikode (231/232) and Bangalore (224): no published cutoffs.
};

// Map a section title to its Indore bucket (SA / MCQ / VA).
function indoreBucket(title) {
  var t = String(title || "").toUpperCase();
  if (t.indexOf("SA") !== -1 || t.indexOf("SHORT") !== -1) return "SA";
  if (t.indexOf("VA") !== -1 || t.indexOf("VERBAL") !== -1) return "VA";
  if (t.indexOf("MCQ") !== -1 || t.indexOf("QUANT") !== -1 || t.indexOf("QA") !== -1) return "MCQ";
  return null;
}

// ── main: build the reality-check payload for one scored play ────
// perSection: [{title, score, max}], totalScore, maxMarks from the
// canonical rescore; category: profile category or null.
// Returns null (no card) or:
// { year, category, kind, rows: [{label, need, got, cleared, note}],
//   doors: [...same for Ranchi/Shillong], categories: CATS }
function realityCheck(testId, perSection, totalScore, maxMarks, category) {
  var meta = PAPER_TESTS[Number(testId)];
  if (!meta) return null;
  var cat = CATS.indexOf(category) !== -1 ? category : "General";

  if (meta.exam === "indore") {
    var yr = INDORE[meta.year];
    if (!yr) return null;
    // scale gate: every bucket present with the official max
    var byBucket = {};
    (perSection || []).forEach(function (p) {
      var b = indoreBucket(p.title);
      if (b) byBucket[b] = p;
    });
    var ok = ["SA", "MCQ", "VA"].every(function (b) {
      return byBucket[b] && byBucket[b].max === yr.max[b];
    });
    if (!ok) return null;
    var cuts = yr.cut[cat] || yr.cut.General;
    var rows = ["SA", "MCQ", "VA"].map(function (b, i) {
      var got = byBucket[b].score;
      return { label: b, need: cuts[i], got: got, cleared: got >= cuts[i] };
    });
    var out = { year: meta.year, category: cat, kind: "indore", rows: rows, doors: [], categories: CATS };
    // extra doors
    var ranchi = RANCHI_OVERALL[meta.year];
    if (ranchi && ranchi[cat] != null) {
      out.doors.push({ label: "IIM Ranchi (overall)", need: ranchi[cat], got: totalScore, cleared: totalScore >= ranchi[cat] });
    }
    var shl = SHILLONG[meta.year];
    if (shl && shl[cat]) {
      var scuts = shl[cat];
      var shOk = ["SA", "MCQ", "VA"].every(function (b, i) { return byBucket[b].score >= scuts[i]; });
      out.doors.push({ label: "IIM Shillong (sectional)", need: null, got: null, cleared: shOk });
    }
    return out;
  }

  if (meta.exam === "rohtak") {
    var r = ROHTAK[meta.year];
    if (!r || r[cat] == null || maxMarks !== ROHTAK_MAX) return null;
    return {
      year: meta.year, category: cat, kind: "rohtak", categories: CATS,
      rows: [{ label: "Overall", need: r[cat], got: totalScore, cleared: totalScore >= r[cat] }],
      doors: [],
    };
  }

  if (meta.exam === "jipmat") {
    if (maxMarks !== JIPMAT_MAX) return null;
    var bg = JIPMAT_ADMIT.bodhgaya[meta.year];
    var jm = JIPMAT_ADMIT.jammu[meta.year];
    var rows2 = [];
    if (bg && bg[cat] != null) rows2.push({ label: "IIM Bodh Gaya · lowest admit", need: bg[cat], got: totalScore, cleared: totalScore >= bg[cat] });
    if (jm && jm[cat] != null) rows2.push({ label: "IIM Jammu · lowest admit", need: jm[cat], got: totalScore, cleared: totalScore >= jm[cat] });
    if (!rows2.length) return null;
    return { year: meta.year, category: cat, kind: "jipmat", rows: rows2, doors: [], categories: CATS };
  }
  return null;
}

module.exports = {
  CATS: CATS,
  INDORE: INDORE,
  ROHTAK: ROHTAK,
  ROHTAK_MAX: ROHTAK_MAX,
  JIPMAT_ADMIT: JIPMAT_ADMIT,
  JIPMAT_MAX: JIPMAT_MAX,
  RANCHI_OVERALL: RANCHI_OVERALL,
  SHILLONG: SHILLONG,
  PAPER_TESTS: PAPER_TESTS,
  indoreBucket: indoreBucket,
  realityCheck: realityCheck,
};
