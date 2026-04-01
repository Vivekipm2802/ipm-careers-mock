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
      generatorType,
      difficulty,
      totalQuestions,
      timeLimit,
      sections,
      selectedQuestionIds,
      config,
    } = req.body;

    // Validate required fields
    if (!title || !category || !course || !sections || !selectedQuestionIds) {
      return res.status(400).json({
        error: "Missing required fields: title, category, course, sections, selectedQuestionIds",
      });
    }

    if (!Array.isArray(selectedQuestionIds) || selectedQuestionIds.length === 0) {
      return res.status(400).json({ error: "selectedQuestionIds must be a non-empty array" });
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: "sections must be a non-empty array" });
    }

    // Step 1: Create mock_test record
    const { data: newTest, error: testError } = await serversupabase
      .from("mock_test")
      .insert([
        {
          title,
          category,
          course,
          config: config || {},
          description: description || `Generated ${generatorType} test`,
        },
      ])
      .select("id")
      .single();

    if (testError || !newTest) {
      console.error("Error creating test:", testError);
      return res.status(500).json({ error: "Failed to create test" });
    }

    const testId = newTest.id;

    // Step 2: Create subject-level groups (mock_groups with type='subject')
    const subjectGroupsData = [];
    const subjectGroupMap = {}; // Map subjectId to group ID for later use

    for (const section of sections) {
      const { subjectId, subjectTitle, markingScheme } = section;

      const { data: subjectGroup, error: subjectGroupError } = await serversupabase
        .from("mock_groups")
        .insert([
          {
            test: testId,
            type: "subject",
            subject: subjectId,
            seq: sections.indexOf(section),
            pos: markingScheme?.pos || 4,
            neg: markingScheme?.neg || 1,
            time: section.time || 0,
          },
        ])
        .select("id")
        .single();

      if (subjectGroupError || !subjectGroup) {
        console.error("Error creating subject group:", subjectGroupError);
        return res.status(500).json({ error: "Failed to create subject group" });
      }

      subjectGroupMap[subjectId] = subjectGroup.id;
    }

    // Step 3: Create mock (module) records and module-level groups
    const moduleGroupMap = {}; // Map moduleId to group ID

    for (const section of sections) {
      const { subjectId, modules } = section;
      const parentSubGroupId = subjectGroupMap[subjectId];

      for (const moduleInfo of modules || []) {
        const { moduleId, title: moduleTitle, questionCount } = moduleInfo;

        // Create a new mock (module) record
        const { data: newModule, error: moduleError } = await serversupabase
          .from("mock")
          .insert([
            {
              title: moduleTitle,
              type: "module",
              subject: subjectId,
              course,
              description: `Module for generated test`,
            },
          ])
          .select("id")
          .single();

        if (moduleError || !newModule) {
          console.error("Error creating module:", moduleError);
          return res.status(500).json({ error: "Failed to create module" });
        }

        const newModuleId = newModule.id;

        // Create module-level group
        const { data: moduleGroup, error: moduleGroupError } = await serversupabase
          .from("mock_groups")
          .insert([
            {
              test: testId,
              type: "module",
              module: newModuleId,
              parent_sub: parentSubGroupId,
              seq: modules.indexOf(moduleInfo),
            },
          ])
          .select("id")
          .single();

        if (moduleGroupError || !moduleGroup) {
          console.error("Error creating module group:", moduleGroupError);
          return res.status(500).json({ error: "Failed to create module group" });
        }

        moduleGroupMap[moduleId] = newModuleId;
      }
    }

    // Step 4: Copy selected questions to new modules
    const { data: sourceQuestions, error: sourceError } = await serversupabase
      .from("mock_questions")
      .select("id, question, type, options, explanation, hint, video, seq")
      .in("id", selectedQuestionIds);

    if (sourceError || !sourceQuestions) {
      console.error("Error fetching source questions:", sourceError);
      return res.status(500).json({ error: "Failed to fetch source questions" });
    }

    // Determine which new module each question should go to
    // For simplicity, distribute questions to modules based on sections
    const questionsByModule = {};
    let questionIndex = 0;

    for (const section of sections) {
      for (const moduleInfo of section.modules || []) {
        questionsByModule[moduleInfo.moduleId] = [];
      }
    }

    // Distribute questions among modules
    for (const section of sections) {
      for (const moduleInfo of section.modules || []) {
        const questionsForModule = Math.ceil(
          (sourceQuestions.length / (totalQuestions || selectedQuestionIds.length)) *
            (moduleInfo.questionCount || 5)
        );

        for (let i = 0; i < questionsForModule && questionIndex < sourceQuestions.length; i++) {
          const sourceQ = sourceQuestions[questionIndex];
          const newModuleId = moduleGroupMap[moduleInfo.moduleId];

          const { data: newQuestion, error: questionError } = await serversupabase
            .from("mock_questions")
            .insert([
              {
                parent: newModuleId,
                question: sourceQ.question,
                type: sourceQ.type,
                options: sourceQ.options,
                explanation: sourceQ.explanation || null,
                hint: sourceQ.hint || null,
                video: sourceQ.video || null,
                seq: i + 1,
                isActive: true,
              },
            ])
            .select("id")
            .single();

          if (questionError) {
            console.error("Error copying question:", questionError);
            // Continue with next question instead of failing entirely
          } else if (newQuestion) {
            // Track question usage if tracking table exists
            try {
              await serversupabase.from("question_usage_tracking").insert([
                {
                  question_id: sourceQ.id,
                  test_id: testId,
                },
              ]);
            } catch (trackingError) {
              // Silently fail if tracking table doesn't exist
              console.log("Question usage tracking not available, continuing");
            }
          }

          questionIndex++;
        }
      }
    }

    // Step 5: Create test_generators record to store metadata (if table exists)
    try {
      await serversupabase.from("test_generators").insert([
        {
          test_id: testId,
          generator_type: generatorType || "custom",
          difficulty_level: difficulty || "mixed",
          total_questions: totalQuestions || selectedQuestionIds.length,
          time_limit_seconds: timeLimit || 0,
          marking_scheme: sections[0]?.markingScheme || { pos: 4, neg: 1 },
          generation_status: "draft",
          source: "custom_generator",
          metadata: {
            selectedQuestionIds,
            sectionCount: sections.length,
          },
        },
      ]);
    } catch (generatorError) {
      // Silently fail if test_generators table doesn't exist
      console.log("Test generators table not available, continuing");
    }

    return res.status(201).json({
      success: true,
      testId,
      totalQuestions: questionIndex,
      sectionsCreated: sections.length,
      message: "Test created successfully",
    });
  } catch (error) {
    console.error("Unexpected error in create:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
