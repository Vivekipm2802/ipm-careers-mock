import { serversupabase } from "../../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { moduleIds, difficulty, limit = 100, excludeTestIds } = req.query;

    // Validate moduleIds
    if (!moduleIds) {
      return res.status(400).json({ error: "moduleIds query parameter is required" });
    }

    const moduleIdArray = moduleIds.split(",").map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));

    if (moduleIdArray.length === 0) {
      return res.status(400).json({ error: "Invalid moduleIds format" });
    }

    // Build the base query
    let questionsQuery = serversupabase
      .from("mock_questions")
      .select("id, question, type, options, seq, isActive, explanation, hint, video, parent")
      .in("parent", moduleIdArray)
      .order("seq", { ascending: true })
      .limit(parseInt(limit));

    // Apply difficulty filter if provided
    if (difficulty) {
      // Note: Since difficulty is not stored in mock_questions table directly,
      // we would need to join with question_bank if it exists.
      // For now, we'll fetch all and let the client handle it,
      // or we can add a note that difficulty filtering requires question_bank to be populated.
    }

    const { data: questions, error: questionsError, count: totalCount } = await questionsQuery;

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }

    // Get module information for parent lookup
    const { data: modules, error: modulesError } = await serversupabase
      .from("mock")
      .select("id, title")
      .in("id", moduleIdArray);

    if (modulesError) {
      console.error("Error fetching module info:", modulesError);
      return res.status(500).json({ error: "Failed to fetch module information" });
    }

    const moduleMap = {};
    (modules || []).forEach((mod) => {
      moduleMap[mod.id] = mod.title;
    });

    // If excludeTestIds provided, filter out questions already used
    let filteredQuestions = questions || [];

    if (excludeTestIds && excludeTestIds !== "") {
      const testIdArray = excludeTestIds.split(",").map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));

      if (testIdArray.length > 0) {
        // Check if question_usage_tracking table exists and has data
        const { data: usedQuestions, error: usedError } = await serversupabase
          .from("question_usage_tracking")
          .select("question_id")
          .in("test_id", testIdArray);

        if (!usedError && usedQuestions) {
          const usedQuestionIds = new Set(usedQuestions.map((u) => u.question_id));
          filteredQuestions = filteredQuestions.filter((q) => !usedQuestionIds.has(q.id));
        }
      }
    }

    // Map parent IDs to module titles
    const questionsWithModules = filteredQuestions.map((q) => ({
      ...q,
      parentModule: moduleMap[q.parent] || "Unknown Module",
    }));

    return res.status(200).json({
      questions: questionsWithModules,
      total: questionsWithModules.length,
    });
  } catch (error) {
    console.error("Unexpected error in get-questions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
