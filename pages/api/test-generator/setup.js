// TEMPORARY — Create database tables for test generator
import { serversupabase } from "../../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "setupTG2026") return res.status(403).json({ error: "bad token" });

  if (req.method === "GET") {
    return res.status(200).json({
      note: "Use POST to create question_bank, question_usage_tracking, and test_generators tables",
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const results = [];

  // 1. question_bank — tags questions with topic, difficulty, subtopic
  const { error: e1 } = await serversupabase.rpc("exec_sql", {
    sql: `
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
      CREATE INDEX IF NOT EXISTS idx_qb_topic ON question_bank(topic);
      CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank(difficulty);
      CREATE INDEX IF NOT EXISTS idx_qb_course ON question_bank(course);
    `,
  });
  results.push({ table: "question_bank", error: e1?.message || null });

  // 2. question_usage_tracking — prevents duplicate questions across tests
  const { error: e2 } = await serversupabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS question_usage_tracking (
        id BIGSERIAL PRIMARY KEY,
        question_id BIGINT REFERENCES mock_questions(id) ON DELETE CASCADE,
        test_id BIGINT REFERENCES mock_test(id) ON DELETE CASCADE,
        added_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(question_id, test_id)
      );
      CREATE INDEX IF NOT EXISTS idx_qut_question ON question_usage_tracking(question_id);
      CREATE INDEX IF NOT EXISTS idx_qut_test ON question_usage_tracking(test_id);
    `,
  });
  results.push({ table: "question_usage_tracking", error: e2?.message || null });

  // 3. test_generators — stores generation config for each auto-created test
  const { error: e3 } = await serversupabase.rpc("exec_sql", {
    sql: `
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
    `,
  });
  results.push({ table: "test_generators", error: e3?.message || null });

  // Check if rpc approach failed (no exec_sql function), try direct SQL via REST
  const anyRpcError = results.some((r) => r.error);

  if (anyRpcError) {
    // Fallback: create tables directly using raw queries through supabase
    // Try creating each table individually
    const tables = [];

    // Try question_bank
    const { error: qb1 } = await serversupabase.from("question_bank").select("id").limit(1);
    if (qb1?.code === "42P01") {
      // Table doesn't exist — we'll need to create via SQL editor or migration
      tables.push("question_bank: needs creation");
    } else {
      tables.push("question_bank: already exists or accessible");
    }

    const { error: qut1 } = await serversupabase.from("question_usage_tracking").select("id").limit(1);
    if (qut1?.code === "42P01") {
      tables.push("question_usage_tracking: needs creation");
    } else {
      tables.push("question_usage_tracking: already exists or accessible");
    }

    const { error: tg1 } = await serversupabase.from("test_generators").select("id").limit(1);
    if (tg1?.code === "42P01") {
      tables.push("test_generators: needs creation");
    } else {
      tables.push("test_generators: already exists or accessible");
    }

    return res.status(200).json({
      note: "RPC exec_sql not available. Table status checked. If tables need creation, run the SQL in Supabase dashboard.",
      rpcResults: results,
      tableStatus: tables,
      sqlToRun: `
-- Run this in Supabase SQL Editor:

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
CREATE INDEX IF NOT EXISTS idx_qb_topic ON question_bank(topic);
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_qb_course ON question_bank(course);

CREATE TABLE IF NOT EXISTS question_usage_tracking (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT REFERENCES mock_questions(id) ON DELETE CASCADE,
  test_id BIGINT REFERENCES mock_test(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, test_id)
);
CREATE INDEX IF NOT EXISTS idx_qut_question ON question_usage_tracking(question_id);
CREATE INDEX IF NOT EXISTS idx_qut_test ON question_usage_tracking(test_id);

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
      `,
    });
  }

  res.status(200).json({ success: true, results });
}
