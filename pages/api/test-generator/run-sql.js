// TEMPORARY — Run SQL to create tables using Supabase's pg_net or direct connection
import { serversupabase } from "../../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "runSQL2026") return res.status(403).json({ error: "bad token" });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

  const sql = `
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
  `;

  // Method 1: Try using Supabase's built-in pg_query endpoint
  try {
    const response = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({ method: "pg_query", success: true, data });
    }

    const errorText = await response.text();

    // Method 2: Try the SQL API endpoint
    const response2 = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=representation",
      },
    });

    // Method 3: Execute each statement individually via postgrest rpc
    // First, create a temporary function that executes SQL
    const createFnSQL = `
      CREATE OR REPLACE FUNCTION _temp_exec(sql text) RETURNS void AS $$
      BEGIN EXECUTE sql; END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const fnResponse = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: createFnSQL }),
    });

    if (fnResponse.ok) {
      // Now use the function to create tables
      const results = [];
      const statements = sql.split(";").filter((s) => s.trim());

      for (const stmt of statements) {
        const execResponse = await fetch(
          `${supabaseUrl}/rest/v1/rpc/_temp_exec`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ sql: stmt.trim() + ";" }),
          }
        );
        results.push({
          stmt: stmt.trim().substring(0, 60),
          ok: execResponse.ok,
          status: execResponse.status,
        });
      }

      // Cleanup: drop the temp function
      await fetch(`${supabaseUrl}/pg/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          query: "DROP FUNCTION IF EXISTS _temp_exec(text);",
        }),
      });

      return res.status(200).json({ method: "rpc_temp_fn", results });
    }

    // Method 4: Fallback — check if tables exist by trying to query them
    const checkResults = {};

    const { error: e1 } = await serversupabase.from("question_usage_tracking").select("id").limit(1);
    checkResults.question_usage_tracking = e1 ? (e1.code === "42P01" ? "missing" : e1.message) : "exists";

    const { error: e2 } = await serversupabase.from("test_generators").select("id").limit(1);
    checkResults.test_generators = e2 ? (e2.code === "42P01" ? "missing" : e2.message) : "exists";

    return res.status(200).json({
      method: "all_methods_failed",
      pgQueryError: errorText.substring(0, 300),
      tableStatus: checkResults,
      instruction: "Please log into Supabase dashboard and run the SQL manually at: https://supabase.com/dashboard/project/msxeahieemrylklgruhl/sql/new",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
