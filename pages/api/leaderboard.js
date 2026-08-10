// ============================================================
// /api/leaderboard — server-side leaderboard for concept + mock
// result/analytics pages.
//
// WHY THIS EXISTS (2026-08 correctness audit):
//   · mock result page queried mock_plays with the ANON client —
//     RLS is own-rows-only, so students saw a leaderboard with only
//     themselves ("You · 0"; 0 because mock submits never wrote the
//     score column at all).
//   · concept pages read the stored plays.score column raw — legacy
//     rows carry percentages (everyone "100") in a list where the
//     student's own score is shown in marks, and nothing deduped
//     multiple attempts by the same student (#9 AND #10).
//
// This route uses the service role, RE-SCORES every play under the
// canonical rule (lib/scoring), dedupes to each student's best
// attempt, and returns top 10 + the requester's own row/rank +
// top-10% averages. Auth: any logged-in user (aggregate data only,
// no emails in the payload).
//
// GET /api/leaderboard?type=concept&testId=<levels.uuid>
// GET /api/leaderboard?type=mock&testId=<mock_test.id>
// ============================================================

const { getAuthUser } = require("@/lib/apiAuth");
const { createClient } = require("@supabase/supabase-js");
const {
  buildConceptLeaderboard,
  buildMockLeaderboard,
} = require("@/lib/leaderboard");

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

const MAX_PLAYS = 500;

// Attach real student names (auth user_metadata.full_name) to plays
// whose stored `name` is empty — otherwise the board shows truncated
// email prefixes ("sa…"), which reads broken. Service-role only.
async function attachNames(supabase, plays) {
  const need = new Set();
  for (const p of plays || []) {
    if ((!p.name || !String(p.name).trim()) && p.user) {
      need.add(String(p.user).toLowerCase());
    }
  }
  if (!need.size) return;
  const found = {};
  try {
    for (let page = 1; page <= 10 && need.size; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 500 });
      const users = data && data.users;
      if (error || !users || users.length === 0) break;
      for (const u of users) {
        const em = (u.email || "").toLowerCase();
        if (need.has(em)) {
          const fn = u.user_metadata && u.user_metadata.full_name;
          if (fn && String(fn).trim()) found[em] = String(fn).trim();
          need.delete(em);
        }
      }
      if (users.length < 500) break;
    }
  } catch (e) {
    // name lookup is best-effort — board still renders with fallbacks
  }
  for (const p of plays || []) {
    const em = p.user ? String(p.user).toLowerCase() : "";
    if ((!p.name || !String(p.name).trim()) && found[em]) p.name = found[em];
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const params = req.method === "GET" ? req.query : { ...req.query, ...(req.body || {}) };
  const type = params.type;
  const testId = params.testId;
  if (!testId || (type !== "concept" && type !== "mock")) {
    return res.status(400).json({ error: "Missing or invalid type/testId" });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    if (type === "concept") {
      // testId = levels.uuid (what plays.test_uuid stores)
      const { data: levels, error: lvlErr } = await supabase
        .from("levels")
        .select("id,uuid")
        .eq("uuid", testId)
        .limit(1);
      if (lvlErr || !levels || levels.length === 0) {
        return res.status(404).json({ error: "Test not found" });
      }
      const [{ data: questions }, { data: plays }] = await Promise.all([
        supabase
          .from("questions")
          .select("id,type,options")
          .eq("parent", levels[0].id),
        supabase
          .from("plays")
          .select("*")
          .eq("test_uuid", testId)
          .order("created_at", { ascending: true })
          .limit(MAX_PLAYS),
      ]);
      await attachNames(supabase, plays);
      const board = buildConceptLeaderboard(plays || [], questions || [], user.email);
      return res.status(200).json({ type, testId, ...board });
    }

    // type === "mock" — testId = mock_test.id
    const { data: groups, error: gErr } = await supabase
      .from("mock_groups")
      .select("*,subject(*)")
      .eq("test", testId)
      .order("seq", { ascending: true });
    if (gErr || !groups || groups.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }
    const sectionRows = groups.filter(
      (s) => s.type === "subject" || (s.subject != null && s.module == null)
    );
    const { data: moduleRowsRaw } = await supabase
      .from("mock_groups")
      .select("*,module(*)")
      .in("parent_sub", groups.map((g) => g.id));
    const moduleRows = (moduleRowsRaw || []).filter((m) => m.module);
    const [{ data: questions }, { data: plays }] = await Promise.all([
      moduleRows.length
        ? supabase
            .from("mock_questions")
            .select("id,parent,type,options")
            .in("parent", moduleRows.map((m) => m.module.id))
        : Promise.resolve({ data: [] }),
      supabase
        .from("mock_plays")
        .select("*")
        .eq("test_id", testId)
        .order("created_at", { ascending: true })
        .limit(MAX_PLAYS),
    ]);
    await attachNames(supabase, plays);
    const board = buildMockLeaderboard(
      plays || [],
      sectionRows,
      moduleRows,
      questions || [],
      user.email
    );
    return res.status(200).json({ type, testId, ...board });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
