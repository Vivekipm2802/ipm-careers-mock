import { serversupabase } from "../../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { course } = req.query;

    // Build the base query to get all modules (topics)
    let modulesQuery = serversupabase
      .from("mock")
      .select("id, title, subject, course")
      .eq("type", "module")
      .order("id", { ascending: true });

    // Filter by course if provided
    if (course) {
      modulesQuery = modulesQuery.eq("course", parseInt(course));
    }

    const { data: modules, error: modulesError } = await modulesQuery;

    if (modulesError) {
      console.error("Error fetching modules:", modulesError);
      return res.status(500).json({ error: "Failed to fetch modules" });
    }

    // Get all subjects
    const { data: subjects, error: subjectsError } = await serversupabase
      .from("mock_subjects")
      .select("id, title")
      .order("id", { ascending: true });

    if (subjectsError) {
      console.error("Error fetching subjects:", subjectsError);
      return res.status(500).json({ error: "Failed to fetch subjects" });
    }

    // Create a map of subject IDs to subject info
    const subjectMap = {};
    (subjects || []).forEach((sub) => {
      subjectMap[sub.id] = sub;
    });

    // For each module, count its questions
    const topicsWithCounts = [];

    for (const mod of modules || []) {
      const { count, error: countError } = await serversupabase
        .from("mock_questions")
        .select("id", { count: "exact" })
        .eq("parent", mod.id);

      if (countError) {
        console.error(`Error counting questions for module ${mod.id}:`, countError);
        continue;
      }

      const subjectInfo = subjectMap[mod.subject] || { title: "Unknown Subject" };

      topicsWithCounts.push({
        moduleId: mod.id,
        title: mod.title,
        subjectId: mod.subject,
        subjectTitle: subjectInfo.title,
        questionCount: count || 0,
      });
    }

    // Calculate total questions per subject
    const subjectTotals = {};
    topicsWithCounts.forEach((topic) => {
      if (!subjectTotals[topic.subjectId]) {
        subjectTotals[topic.subjectId] = {
          id: topic.subjectId,
          title: topic.subjectTitle,
          totalQuestions: 0,
        };
      }
      subjectTotals[topic.subjectId].totalQuestions += topic.questionCount;
    });

    const subjectsList = Object.values(subjectTotals);

    return res.status(200).json({
      topics: topicsWithCounts,
      subjects: subjectsList,
    });
  } catch (error) {
    console.error("Unexpected error in get-topics:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
