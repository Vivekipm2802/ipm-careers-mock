import { serversupabase } from "../../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      title,
      description,
      category,
      course,
      courses,
      generatorType,
      difficulty,
      timeLimit,
      sections,
      generatedQuestions,
      config,
    } = req.body;

    // Validate required fields
    const primaryCourse = course || (courses && courses[0]) || null;
    // For concept/sectional tests, category can be null (routing is in config)
    if (!title || !primaryCourse || !sections) {
      return res.status(400).json({
        error: "Missing required fields: title, course, sections",
      });
    }
    // For fullmock, category (mock_categories ID) is required
    if (generatorType === "fullmock" && !category) {
      return res.status(400).json({
        error: "Full-length mock tests require a category",
      });
    }

    if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
      return res.status(400).json({ error: "generatedQuestions must be a non-empty array" });
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: "sections must be a non-empty array" });
    }

    // Merge courses and section details into config for multi-course support
    const testConfig = {
      ...(config || {}),
      courses: courses || [primaryCourse],
      generatorType,
      difficulty,
      sectionDetails: sections.map((s) => ({
        subjectTitle: s.subjectTitle,
        time: s.time || 0,
        markingScheme: s.markingScheme || {},
      })),
    };

    // Step 1: Create mock_test record
    // For concept/sectional tests, we need a valid category since the column may have constraints.
    // We'll find or create a placeholder category for non-fullmock tests.
    let effectiveCategory = category;
    if (!effectiveCategory && (generatorType === "concept" || generatorType === "sectional")) {
      // Find or create an "__internal__" category to satisfy the NOT NULL constraint
      const { data: existing } = await serversupabase
        .from("mock_categories")
        .select("id")
        .eq("title", "__internal__")
        .single();

      if (existing) {
        effectiveCategory = existing.id;
      } else {
        const { data: maxSeq } = await serversupabase
          .from("mock_categories")
          .select("seq")
          .order("seq", { ascending: false })
          .limit(1)
          .single();

        const { data: newCat } = await serversupabase
          .from("mock_categories")
          .insert([{ title: "__internal__", seq: (maxSeq?.seq || 100) + 1 }])
          .select("id")
          .single();

        if (newCat) {
          effectiveCategory = newCat.id;
        }
      }
    }

    const insertData = {
      title,
      course: primaryCourse,
      config: testConfig,
      description: description || "",
    };
    if (effectiveCategory) {
      insertData.category = effectiveCategory;
    }

    const { data: newTest, error: testError } = await serversupabase
      .from("mock_test")
      .insert([insertData])
      .select("id")
      .single();

    if (testError || !newTest) {
      console.error("Error creating test:", testError);
      return res.status(500).json({
        error: "Failed to create test: " + (testError?.message || "unknown error"),
      });
    }

    const testId = newTest.id;
    let totalQuestionsInserted = 0;

    // Step 2: For each section, create the full hierarchy
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx];
      const { subjectTitle, topics, markingScheme } = section;

      // Find or create subject
      let subjectId = null;
      const { data: existingSubject } = await serversupabase
        .from("mock_subjects")
        .select("id")
        .ilike("title", subjectTitle)
        .single();

      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        // Create new subject
        const { data: newSubject, error: subjectError } = await serversupabase
          .from("mock_subjects")
          .insert([{ title: subjectTitle }])
          .select("id")
          .single();

        if (subjectError || !newSubject) {
          console.error("Error creating subject:", subjectError);
          return res.status(500).json({ error: "Failed to create subject: " + subjectTitle });
        }
        subjectId = newSubject.id;
      }

      // Create subject-level group (using MCQ marking as primary)
      const { data: subjectGroup, error: subjectGroupError } = await serversupabase
        .from("mock_groups")
        .insert([
          {
            test: testId,
            type: "subject",
            subject: subjectId,
            seq: sIdx,
            pos: markingScheme?.mcqPos || markingScheme?.pos || 4,
            neg: markingScheme?.mcqNeg || markingScheme?.neg || 1,
            time: section.time || 0,
          },
        ])
        .select("id")
        .single();

      if (subjectGroupError || !subjectGroup) {
        console.error("Error creating subject group:", subjectGroupError);
        return res.status(500).json({ error: "Failed to create subject group" });
      }

      // Step 3: For each topic in the section, create module + questions
      for (let tIdx = 0; tIdx < (topics || []).length; tIdx++) {
        const topic = topics[tIdx];
        const { topicName } = topic;

        // Create mock (module) record
        const { data: newMod, error: modError } = await serversupabase
          .from("mock")
          .insert([
            {
              title: topicName,
              type: "module",
              subject: subjectId,
              course: primaryCourse,
              description: `AI-generated module for ${topicName}`,
            },
          ])
          .select("id")
          .single();

        if (modError || !newMod) {
          console.error("Error creating module:", modError);
          return res.status(500).json({ error: "Failed to create module: " + topicName });
        }

        // Create module-level group
        const { data: modGroup, error: modGroupError } = await serversupabase
          .from("mock_groups")
          .insert([
            {
              test: testId,
              type: "module",
              module: newMod.id,
              parent_sub: subjectGroup.id,
              seq: tIdx,
            },
          ])
          .select("id")
          .single();

        if (modGroupError || !modGroup) {
          console.error("Error creating module group:", modGroupError);
          return res.status(500).json({ error: "Failed to create module group" });
        }

        // Get questions for this section+topic
        const topicQuestions = generatedQuestions.filter(
          (q) => q.sectionTitle === subjectTitle && q.topicName === topicName
        );

        // Insert questions
        for (let qIdx = 0; qIdx < topicQuestions.length; qIdx++) {
          const q = topicQuestions[qIdx];

          const { error: qError } = await serversupabase
            .from("mock_questions")
            .insert([
              {
                parent: newMod.id,
                question: q.question,
                type: q.type,
                options: q.options,
                explanation: q.explanation || null,
                seq: qIdx + 1,
                isActive: true,
              },
            ]);

          if (qError) {
            console.error("Error inserting question:", qError);
            // Continue with next question
          } else {
            totalQuestionsInserted++;
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      testId,
      totalQuestions: totalQuestionsInserted,
      sectionsCreated: sections.length,
      message: "Test created successfully with AI-generated questions",
    });
  } catch (error) {
    console.error("Unexpected error in create:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
