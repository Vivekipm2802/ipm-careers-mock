import { serversupabase } from "../../utils/supabaseClient";

/**
 * One-time migration endpoint.
 * Cleans up wrongly created "Concept Tests", "Sectional Tests", "Full Length Mocks"
 * categories in mock_categories (they were accidentally created by a previous version).
 *
 * POST /api/migrate
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const results = [];

  try {
    // Remove wrongly created test-type categories from mock_categories
    const wrongNames = ["Concept Tests", "Sectional Tests", "Full Length Mocks"];
    for (const name of wrongNames) {
      const { data: found } = await serversupabase
        .from("mock_categories")
        .select("id")
        .eq("title", name);

      if (found && found.length > 0) {
        for (const cat of found) {
          // Check if any tests use this category before deleting
          const { data: testsUsing } = await serversupabase
            .from("mock_test")
            .select("id")
            .eq("category", cat.id)
            .limit(1);

          if (!testsUsing || testsUsing.length === 0) {
            await serversupabase
              .from("mock_categories")
              .delete()
              .eq("id", cat.id);
            results.push(`Deleted unused category: ${name} (id: ${cat.id})`);
          } else {
            results.push(`Kept category ${name} (id: ${cat.id}) — has ${testsUsing.length} test(s)`);
          }
        }
      } else {
        results.push(`Category not found: ${name} (already clean)`);
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ error: error.message, results });
  }
}
