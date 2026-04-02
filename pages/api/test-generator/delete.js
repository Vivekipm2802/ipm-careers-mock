import { serversupabase } from "../../../utils/supabaseClient";

/**
 * DELETE /api/test-generator/delete
 * Body: { testId: number }
 * Deletes a mock_test and all its associated data (groups, modules, questions).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { testId } = req.body;
  if (!testId) {
    return res.status(400).json({ error: "testId is required" });
  }

  try {
    // 1. Get all mock_groups for this test
    const { data: groups } = await serversupabase
      .from("mock_groups")
      .select("id, module, type")
      .eq("test", testId);

    if (groups) {
      // 2. Get module IDs from module-type groups
      const moduleIds = groups
        .filter((g) => g.type === "module" && g.module)
        .map((g) => g.module);

      // 3. Delete questions for these modules
      if (moduleIds.length > 0) {
        await serversupabase
          .from("mock_questions")
          .delete()
          .in("parent", moduleIds);

        // 4. Delete the mock (module) records
        await serversupabase
          .from("mock")
          .delete()
          .in("id", moduleIds);
      }

      // 5. Delete all mock_groups for this test
      await serversupabase
        .from("mock_groups")
        .delete()
        .eq("test", testId);
    }

    // 6. Delete mock_plays for this test
    await serversupabase
      .from("mock_plays")
      .delete()
      .eq("test_id", testId);

    // 7. Delete the mock_test record itself
    const { error } = await serversupabase
      .from("mock_test")
      .delete()
      .eq("id", testId);

    if (error) {
      console.error("Error deleting test:", error);
      return res.status(500).json({ error: "Failed to delete test: " + error.message });
    }

    return res.status(200).json({ success: true, message: "Test deleted successfully" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
