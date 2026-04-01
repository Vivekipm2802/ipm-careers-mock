import { serversupabase } from "../../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category } = req.query;

    // Build the base query
    let testsQuery = serversupabase
      .from("mock_test")
      .select("id, title, description, category, course, config, created_at, seq")
      .order("created_at", { ascending: false });

    // Filter by category if provided
    if (category) {
      testsQuery = testsQuery.eq("category", parseInt(category));
    }

    const { data: tests, error: testsError } = await testsQuery;

    if (testsError) {
      console.error("Error fetching tests:", testsError);
      return res.status(500).json({ error: "Failed to fetch tests" });
    }

    // Try to join with test_generators to get metadata (gracefully handle if table doesn't exist)
    let generatorMetadata = {};

    try {
      const { data: generators, error: generatorsError } = await serversupabase
        .from("test_generators")
        .select("test_id, generator_type, difficulty_level, total_questions, time_limit_seconds, generation_status")
        .in(
          "test_id",
          (tests || []).map((t) => t.id)
        );

      if (!generatorsError && generators) {
        generators.forEach((gen) => {
          generatorMetadata[gen.test_id] = {
            generatorType: gen.generator_type,
            difficultyLevel: gen.difficulty_level,
            totalQuestions: gen.total_questions,
            timeLimitSeconds: gen.time_limit_seconds,
            generationStatus: gen.generation_status,
          };
        });
      }
    } catch (error) {
      // test_generators table might not exist, continue without it
      console.log("test_generators table not available");
    }

    // Enhance test data with generator metadata if available
    const enhancedTests = (tests || []).map((test) => ({
      ...test,
      ...(generatorMetadata[test.id] || {}),
    }));

    return res.status(200).json({
      tests: enhancedTests,
      total: enhancedTests.length,
    });
  } catch (error) {
    console.error("Unexpected error in list:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
