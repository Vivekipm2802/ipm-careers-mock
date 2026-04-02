import { serversupabase } from "../../../utils/supabaseClient";

/**
 * POST /api/test-generator/toggle-visibility
 * Body: { testId: number, hidden: boolean }
 * Sets config.hidden on a mock_test to show/hide it from students.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { testId, hidden } = req.body;
  if (!testId || typeof hidden !== "boolean") {
    return res.status(400).json({ error: "testId (number) and hidden (boolean) are required" });
  }

  try {
    // First get the current config
    const { data: test, error: fetchError } = await serversupabase
      .from("mock_test")
      .select("id, config")
      .eq("id", testId)
      .single();

    if (fetchError || !test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Merge hidden into existing config
    const updatedConfig = { ...(test.config || {}), hidden };

    const { error } = await serversupabase
      .from("mock_test")
      .update({ config: updatedConfig })
      .eq("id", testId);

    if (error) {
      console.error("Error updating visibility:", error);
      return res.status(500).json({ error: "Failed to update: " + error.message });
    }

    return res.status(200).json({ success: true, hidden });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
