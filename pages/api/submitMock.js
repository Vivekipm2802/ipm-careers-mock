const { getAuthUser } = require('@/lib/apiAuth');
const { createClient } = require('@supabase/supabase-js');
const { scoreMockPlay } = require('@/lib/scoring');

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Ship 5: NEXT_PUBLIC_ fallback removed (client-bundle leak risk).
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// 2026-10 thundering-herd fix: when a mock's timer ends, 30-40 students
// submit in the same few seconds and each request used to re-fetch the
// test's sections + all 90 questions just to compute the score. That
// data is identical for every one of them and changes only when the
// admin edits the test — cache it per test for 10 minutes so a submit
// is essentially auth + one INSERT.
const _scoringCache = new Map(); // test_id -> {at, promise}
const SCORING_TTL_MS = 10 * 60 * 1000;

async function getScoringBundle(supabase, test_id) {
  const key = String(test_id);
  const hit = _scoringCache.get(key);
  if (hit && Date.now() - hit.at < SCORING_TTL_MS) return hit.promise;
  const promise = (async () => {
    const { data: groups } = await supabase
      .from('mock_groups')
      .select('*,subject(*)')
      .eq('test', test_id);
    const sectionRows = (groups || []).filter(
      (s) => s.type === 'subject' || (s.subject != null && s.module == null),
    );
    const { data: moduleRowsRaw } = (groups || []).length
      ? await supabase
          .from('mock_groups')
          .select('*,module(*)')
          .in('parent_sub', groups.map((g) => g.id))
      : { data: [] };
    const moduleRows = (moduleRowsRaw || []).filter((m) => m.module);
    const { data: questions } = moduleRows.length
      ? await supabase
          .from('mock_questions')
          .select('id,parent,type,options')
          .in('parent', moduleRows.map((m) => m.module.id))
      : { data: [] };
    return { sectionRows, moduleRows, questions: questions || [] };
  })();
  _scoringCache.set(key, { at: Date.now(), promise });
  return promise;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2026-10-31 ROOT-CAUSE FIX for slow/failed submits: the login token lasts
  // 1 hour, mocks last 2h+. When the student's browser couldn't refresh it
  // (laptop slept, tab in background, slow link to the US auth server) the
  // submit arrived with an EXPIRED token → 401 → retries → slow fallback
  // insert without stats (Oct 30: 68s, play saved without stats). Now the
  // runner also sends the refresh token, and the SERVER (fast, reliable link)
  // renews the login and hands the new session back to the browser.
  let user = await getAuthUser(req);
  let renewedSession = null;
  if (!user && typeof req.body?.refresh_token === 'string' && req.body.refresh_token.length > 10) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 10000);
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: req.body.refresh_token }),
          signal: ctl.signal,
        },
      );
      clearTimeout(timer);
      if (r.ok) {
        const s = await r.json();
        if (s?.user?.email && s.access_token) {
          user = s.user;
          renewedSession = { access_token: s.access_token, refresh_token: s.refresh_token };
        }
      }
    } catch (e) {
      /* fall through to 401 */
    }
  }
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Ship 4: accept optional wall-clock duration (seconds) from the runner
  const { test_id, report, data: miscData, duration } = req.body;

  if (!test_id) {
    return res.status(400).json({ error: 'Missing test_id' });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 2026-08 correctness audit: compute the CANONICAL score at submit
    // time (lib/scoring: +4/−1 defaults, section pos/neg overrides by
    // magnitude, SA wrongs never negative) and store it. Previously the
    // score column was never written for mocks (→ leaderboards showed
    // "You · 0"). Scoring failure never blocks a student's submission.
    let canonicalScore = null;
    // 2026-10 leaderboard-at-scale: persist the scalar stats too so the
    // leaderboard can rank WITHOUT ever refetching/re-scoring reports.
    let statAttempted = null, statCorrect = null, statMaxMarks = null;
    try {
      const { sectionRows, moduleRows, questions } = await getScoringBundle(supabase, test_id);
      const scored = scoreMockPlay(sectionRows, moduleRows, questions, report || []);
      if (scored && Number.isFinite(scored.total.score)) {
        canonicalScore = scored.total.score;
        statAttempted = Number.isFinite(scored.total.attempted) ? scored.total.attempted : null;
        statCorrect = Number.isFinite(scored.total.correct) ? scored.total.correct : null;
        statMaxMarks = Number.isFinite(scored.total.maxMarks) ? scored.total.maxMarks : null;
      }
    } catch (e) {
      canonicalScore = null;
    }

    // 2026-10-29 duplicate guard: the same student re-sending the SAME
    // answers for the same mock (timer auto-submit after a successful
    // submit, retries, stale tabs) returns the existing play instead of
    // saving a second copy. Compared on question id + chosen answer only.
    try {
      const sig = (rep) =>
        JSON.stringify(
          (Array.isArray(rep) ? rep : [])
            .map((r) => [String(r?.id), String(r?.value ?? r?.text ?? "")])
            .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)),
        );
      const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('mock_plays')
        .select('*')
        .eq('test_id', test_id)
        .eq('user', user.email)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5);
      const mine = sig(report);
      const same = (recent || []).find((p) => sig(p.report) === mine);
      if (same && (report || []).length > 0) {
        return res.status(200).json({ data: same, duplicate: true, session: renewedSession });
      }
    } catch (e) {
      /* dedupe is best-effort — never block a submission */
    }

    // Try full insert with all columns
    let result = await supabase
      .from('mock_plays')
      .insert({
        test_id: test_id,
        status: 'completed',
        report: report || [],
        // 2026-10-29: `data: miscData` REMOVED — mock_plays has no `data`
        // column, so this full insert failed on EVERY submission and the
        // fallback below silently dropped duration + name + the scalar
        // stats (leaderboard columns). Only 4 of 447 Oct plays had them.
        user: user.email,
        name: user.user_metadata?.full_name || user.email,
        duration: Number.isFinite(Number(duration)) ? Math.round(Number(duration)) : null,
        score: canonicalScore,
        attempted: statAttempted,
        correct: statCorrect,
        max_marks: statMaxMarks,
      })
      .select();

    // If full insert fails (likely missing columns), retry with minimum columns
    if (result.error) {
      result = await supabase
        .from('mock_plays')
        .insert({
          test_id: test_id,
          status: 'completed',
          report: report || [],
          user: user.email,
          score: canonicalScore,
        })
        .select();
    }

    // If still failing (e.g. a score the column type can't hold), save the
    // attempt WITHOUT the score — but NEVER without the student (2026-10-31:
    // the old last resort dropped `user`, leaving an orphan play nobody could
    // see). Missing stats are healed by scripts/backfill-mock-play-stats.mjs.
    if (result.error) {
      result = await supabase
        .from('mock_plays')
        .insert({
          test_id: test_id,
          status: 'completed',
          report: report || [],
          user: user.email,
        })
        .select();
    }

    if (result.error) {
      return res.status(500).json({ error: result.error.message, details: result.error });
    }

    if (result.data && result.data.length > 0) {
      return res.status(200).json({ data: result.data[0], session: renewedSession });
    }

    return res.status(500).json({ error: 'Insert returned no data' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
