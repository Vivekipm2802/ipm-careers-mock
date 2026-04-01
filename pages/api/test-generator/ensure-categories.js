import { serversupabase } from "../../../utils/supabaseClient";

/**
 * DEPRECATED — This endpoint is no longer needed.
 * The test generator now loads categories directly based on test type:
 * - concept → test_groups (type="concept")
 * - sectional → hardcoded QA/VA/LR
 * - fullmock → mock_categories
 *
 * Kept for backward compatibility — just returns mock_categories.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data } = await serversupabase
      .from("mock_categories")
      .select("*")
      .order("seq");

    return res.status(200).json({ success: true, categories: data || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
