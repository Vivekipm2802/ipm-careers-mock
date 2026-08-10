// ============================================================
// /api/mock-journey — the requesting student's mock history,
// canonically re-scored, plus per-mock topper / batch aggregates.
//
// WHY SERVER-SIDE: RLS on mock_plays is own-rows-only, so the
// topper line and the batch average are invisible to the anon
// client. Same pattern as /api/leaderboard: getAuthUser + service
// client + aggregate-only payload (no emails ever leave).
//
// Every play is RE-SCORED with lib/scoring.scoreMockPlay — the
// stored score column is never read (legacy rows are null/wrong).
//
// GET /api/mock-journey
// → { mocks: [{ testId, title, uid, created_at, score, maxMarks,
//      attempted, correct, wrong, totalQuestions, accuracy,
//      sectionCount, saSkipped, rank, totalPlayers, topperScore,
//      batchAvg, perSection: [{title, score, max, correct, wrong,
//      attempted, total, pct}] }] }   (chronological by the
//      student's first attempt of each mock; best attempt per mock)
// ============================================================

const { getAuthUser } = require("@/lib/apiAuth");
const { createClient } = require("@supabase/supabase-js");
const scoring = require("@/lib/scoring");

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

const MAX_MY_PLAYS = 200;
const MAX_ALL_PLAYS = 2000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const supabase = getServiceClient();
  if (!supabase) return res.status(500).json({ error: "Server configuration error" });

  try {
    const email = String(user.email || "").toLowerCase();

    // 1 · the student's own plays, oldest first (chronology anchor)
    const { data: myPlays, error: mpErr } = await supabase
      .from("mock_plays")
      .select("uid,user,test_id,report,duration,created_at")
      .ilike("user", email)
      .order("created_at", { ascending: true })
      .limit(MAX_MY_PLAYS);
    if (mpErr) return res.status(500).json({ error: mpErr.message });
    const mine = (myPlays || []).filter((p) => p && Array.isArray(p.report));
    if (mine.length === 0) return res.status(200).json({ mocks: [] });

    const testIds = [
      ...new Set(
        mine
          .map((p) => (p.test_id && typeof p.test_id === "object" ? p.test_id.id : p.test_id))
          .filter((x) => x != null)
      ),
    ];

    // 2 · shared structure for those tests
    const [{ data: groupsRaw }, { data: tests }] = await Promise.all([
      supabase.from("mock_groups").select("*,subject(*)").in("test", testIds),
      supabase.from("mock_test").select("id,title,config").in("id", testIds),
    ]);
    const groups = groupsRaw || [];
    const { data: modsRaw } = groups.length
      ? await supabase
          .from("mock_groups")
          .select("*,module(*)")
          .in("parent_sub", groups.map((g) => g.id))
      : { data: [] };
    const moduleRows = (modsRaw || []).filter((m) => m && m.module);
    const { data: questionsRaw } = moduleRows.length
      ? await supabase
          .from("mock_questions")
          .select("id,parent,type,options")
          .in("parent", moduleRows.map((m) => m.module.id))
      : { data: [] };
    const questions = questionsRaw || [];

    // 3 · every play on those tests (for topper / batch aggregates)
    const { data: allPlaysRaw } = await supabase
      .from("mock_plays")
      .select("uid,user,test_id,report,created_at")
      .in("test_id", testIds)
      .order("created_at", { ascending: true })
      .limit(MAX_ALL_PLAYS);
    const allPlays = (allPlaysRaw || []).filter((p) => p && Array.isArray(p.report));

    const tidOf = (p) => (p.test_id && typeof p.test_id === "object" ? p.test_id.id : p.test_id);

    const mocks = [];
    for (const testId of testIds) {
      const secRows = groups.filter(
        (s) =>
          s.test === testId &&
          (s.type === "subject" || (s.subject != null && s.module == null))
      );
      if (secRows.length === 0) continue;
      const testModules = moduleRows.filter((m) => secRows.some((s) => s.id === m.parent_sub));
      const testQuestions = questions.filter((q) =>
        testModules.some((m) => q.parent === m.module.id)
      );

      // Score & dedupe: best attempt per student on this test.
      const best = new Map(); // userKey → {score result, play}
      for (const p of allPlays.filter((p) => tidOf(p) === testId)) {
        let s;
        try {
          s = scoring.scoreMockPlay(secRows, testModules, testQuestions, p.report);
        } catch (e) {
          continue;
        }
        const key = p.user ? String(p.user).toLowerCase() : `anon-${p.uid}`;
        const prev = best.get(key);
        if (!prev || s.total.score > prev.s.total.score) best.set(key, { s, p });
      }
      if (best.size === 0) continue;

      const rows = [...best.values()].sort((a, b) => b.s.total.score - a.s.total.score);
      const myRow = best.get(email);
      if (!myRow) continue;
      const rank = rows.indexOf(myRow) + 1;
      const scoresArr = rows.map((r) => r.s.total.score);
      const topperScore = scoresArr[0];
      const batchAvg = Math.round(
        scoresArr.reduce((a, b) => a + b, 0) / scoresArr.length
      );

      // SA questions the student left blank — "free marks" habit input.
      const saSkipped = testQuestions.filter(
        (q) =>
          scoring.normType(q.type) === "input" &&
          myRow.s.verdictById[String(q.id)] == null
      ).length;

      const t = myRow.s.total;
      const firstAttempt = mine.find((p) => tidOf(p) === testId);
      const testMeta = (tests || []).find((x) => x.id === testId);
      mocks.push({
        testId,
        title: (testMeta && testMeta.title) || "Mock",
        timeoutSec:
          testMeta && testMeta.config && Number(testMeta.config.timeout) > 0
            ? Number(testMeta.config.timeout)
            : null,
        uid: myRow.p.uid,
        created_at: firstAttempt ? firstAttempt.created_at : myRow.p.created_at,
        score: t.score,
        maxMarks: t.maxMarks,
        attempted: t.attempted,
        correct: t.correct,
        wrong: t.wrong,
        totalQuestions: t.totalQuestions,
        accuracy: t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0,
        sectionCount: myRow.s.perSection.length,
        saSkipped,
        rank,
        totalPlayers: rows.length,
        topperScore,
        batchAvg,
        perSection: myRow.s.perSection.map((ps) => ({
          title: ps.title,
          score: ps.score,
          max: ps.max,
          correct: ps.correct,
          wrong: ps.wrong,
          attempted: ps.attempted,
          total: ps.total,
          pct: ps.pct,
        })),
      });
    }

    // Chronological by the student's first attempt of each mock.
    mocks.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return res.status(200).json({ mocks });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
