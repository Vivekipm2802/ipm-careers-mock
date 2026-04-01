import { serversupabase } from "../../../utils/supabaseClient";

const TYPE_CATEGORY_NAMES = {
  concept: "Concept Tests",
  sectional: "Sectional Tests",
  fullmock: "Full Length Mocks",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Fetch existing categories
    const { data: existing, error: fetchError } = await serversupabase
      .from("mock_categories")
      .select("*")
      .order("seq");

    if (fetchError) {
      console.error("Error fetching categories:", fetchError);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }

    let allCats = existing || [];
    const needed = Object.values(TYPE_CATEGORY_NAMES);

    for (const name of needed) {
      const exists = allCats.find((c) => c.title === name);
      if (!exists) {
        // Find the max seq to append at the end
        const maxSeq = allCats.reduce((max, c) => Math.max(max, c.seq || 0), 0);
        const { data: newCat, error: insertError } = await serversupabase
          .from("mock_categories")
          .insert([{ title: name, seq: maxSeq + 1 }])
          .select("*")
          .single();

        if (insertError) {
          console.error("Error creating category:", name, insertError);
          // Continue — don't fail the whole request
        } else if (newCat) {
          allCats = [...allCats, newCat];
        }
      }
    }

    return res.status(200).json({ success: true, categories: allCats });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
