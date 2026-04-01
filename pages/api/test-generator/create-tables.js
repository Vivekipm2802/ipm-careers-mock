// TEMPORARY — Create tables via direct PostgreSQL connection through Supabase
import { serversupabase } from "../../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "createTables2026") return res.status(403).json({ error: "bad token" });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const results = [];

  // Create question_bank table
  try {
    // Try to select from the table first to see if it exists
    const { error: checkError } = await serversupabase.from("question_bank").select("id").limit(1);

    if (checkError && checkError.code === "42P01") {
      // Table doesn't exist — create it using a workaround
      // Use Supabase's postgrest to execute via a temporary function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

      const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS question_bank (
          id BIGSERIAL PRIMARY KEY,
          question_id BIGINT REFERENCES mock_questions(id) ON DELETE CASCADE,
          topic VARCHAR(200),
          subtopic VARCHAR(200),
          difficulty VARCHAR(50) DEFAULT 'medium',
          question_type VARCHAR(50) DEFAULT 'mcq',
          tags TEXT[],
          course INT,
          subject_area VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(question_id)
        )`,
        `CREATE TABLE IF NOT EXISTS question_usage_tracking (
          id BIGSERIAL PRIMARY KEY,
          question_id BIGINT REFERENCES mock_questions(id) ON DELETE CASCADE,
          test_id BIGINT REFERENCES mock_test(id) ON DELETE CASCADE,
          added_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(question_id, test_id)
        )`,
        `CREATE TABLE IF NOT EXISTS test_generators (
          id BIGSERIAL PRIMARY KEY,
          test_id BIGINT REFERENCES mock_test(id) ON DELETE CASCADE,
          generator_type VARCHAR(50),
          difficulty_level VARCHAR(50),
          total_questions INT,
          topic_distribution JSONB,
          time_limit_seconds INT,
          marking_scheme JSONB,
          generation_status VARCHAR(50) DEFAULT 'draft',
          source VARCHAR(50) DEFAULT 'database',
          created_by TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          published_at TIMESTAMPTZ,
          metadata JSONB
        )`
      ];

      // Use the Supabase SQL API (requires service key)
      for (const sql of sqlStatements) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ sql }),
          });

          if (!response.ok) {
            const text = await response.text();
            results.push({ sql: sql.substring(0, 60), status: 'rpc_failed', error: text.substring(0, 200) });
          } else {
            results.push({ sql: sql.substring(0, 60), status: 'ok' });
          }
        } catch (e) {
          results.push({ sql: sql.substring(0, 60), status: 'error', error: e.message });
        }
      }
    } else {
      results.push({ table: "question_bank", status: "already_exists" });
    }
  } catch (e) {
    results.push({ table: "question_bank", status: "check_error", error: e.message });
  }

  // Check other tables
  const { error: qutCheck } = await serversupabase.from("question_usage_tracking").select("id").limit(1);
  results.push({ table: "question_usage_tracking", exists: !qutCheck || qutCheck.code !== "42P01" });

  const { error: tgCheck } = await serversupabase.from("test_generators").select("id").limit(1);
  results.push({ table: "test_generators", exists: !tgCheck || tgCheck.code !== "42P01" });

  // Provide the SQL for manual execution if needed
  return res.status(200).json({
    results,
    manualSQL: `
-- If tables weren't created automatically, run this in Supabase SQL Editor:
-- Go to https://supabase.com/dashboard/project/msxeahieemrylklgruhl/sql/new

CREATE TABLE IF NOT EXISTS question_bank (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT REFERENCES mock_questions(id) ON DELETE CASCADE,
  topic VARCHAR(200),
  subtopic VARCHAR(200),
  difficulty VARCHAR(50) DEFAULT 'medium',
  question_type VARCHAR(50) DEFAULT 'mcq',
  tags TEXT[],
  course INT,
  subject_area VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id)
);

CREATE TABLE IF NOT EXISTS question_usage_tracking (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT REFERENCES mock_questions(id) ON DELETE CASCADE,
  test_id BIGINT REFERENCES mock_test(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, test_id)
);

CREATE TABLE IF NOT EXISTS test_generators (
  id BIGSERIAL PRIMARY KEY,
  test_id BIGINT REFERENCES mock_test(id) ON DELETE CASCADE,
  generator_type VARCHAR(50),
  difficulty_level VARCHAR(50),
  total_questions INT,
  topic_distribution JSONB,
  time_limit_seconds INT,
  marking_scheme JSONB,
  generation_status VARCHAR(50) DEFAULT 'draft',
  source VARCHAR(50) DEFAULT 'database',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  metadata JSONB
);
    `.trim(),
  });
}
