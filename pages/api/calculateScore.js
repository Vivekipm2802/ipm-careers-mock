import { serversupabase } from "@/utils/supabaseClient";

// Optimized data fetching with parallel requests
async function fetchTestData(testId) {
  try {
    // Get sections with subjects
    const sectionsPromise = serversupabase
      .from('mock_groups')
      .select('*, subject(*)')
      .eq('test', testId)
      .order('seq', { ascending: true });

    // Get all mock groups for modules in a single query
    const modulesPromise = serversupabase
      .from('mock_groups')
      .select('*, module(*)');

    // Wait for both queries to complete
    const [sectionsData, modulesData] = await Promise.all([
      sectionsPromise,
      modulesPromise
    ]);

    if (sectionsData.error) throw sectionsData.error;
    if (modulesData.error) throw modulesData.error;

    const sections = sectionsData.data;
    
    // Filter modules based on sections
    const sectionIds = new Set(sections.map(section => section.id));
    const modules = modulesData.data.filter(item => sectionIds.has(item.parent_sub));

    // Get questions for filtered modules
    const moduleIds = modules.map(module => module.module.id);
    const { data: questions, error: questionsError } = await serversupabase
      .from('mock_questions')
      .select('*')
      .in('parent', moduleIds)
      .order('seq', { ascending: true });

    if (questionsError) throw questionsError;

    return { sections, modules, questions };
  } catch (error) {
    throw new Error(`Data fetching failed: ${error.message}`);
  }
}

// Optimized score calculation
function calculateFinalScore(result, sections, modules, questions) {
  if (!result?.report || !sections?.length || !modules?.length || !questions?.length) {
    return { score: 0, totalPositive: 0, totalNegative: 0 };
  }

  // Create lookup maps for faster access
  const questionMap = new Map(questions.map(q => [q.id, q]));
  const moduleMap = new Map(modules.map(m => [m.id, m]));
  const reportMap = new Map(result.report.map(r => [r.id, r]));

  return sections.reduce((totals, section) => {
    // Get all modules for this section
    const sectionModules = modules.filter(m => m.parent_sub === section.id);

    const sectionScore = sectionModules.reduce((sectionTotal, module) => {
      // Get all questions for this module
      const moduleQuestions = questions.filter(q => q.parent === module.module.id);

      // Calculate score for all questions in this module
      const moduleScore = moduleQuestions.reduce((questionTotal, question) => {
        const reportItem = reportMap.get(question.id);
        if (!reportItem) return questionTotal;

        const reportValue = reportItem.value - 1;
        const isCorrect = question.type === "options"
          ? question.options.findIndex(option => option.isCorrect) === reportValue
          : question.options.answer?.trim() === reportItem.value?.trim();

        if (isCorrect) {
          questionTotal.positive += section.pos;
        } else {
          questionTotal.negative -= section.neg;
        }

        return questionTotal;
      }, { positive: 0, negative: 0 });

      return {
        positive: sectionTotal.positive + moduleScore.positive,
        negative: sectionTotal.negative + moduleScore.negative
      };
    }, { positive: 0, negative: 0 });

    return {
      totalPositive: totals.totalPositive + sectionScore.positive,
      totalNegative: totals.totalNegative + sectionScore.negative
    };
  }, { totalPositive: 0, totalNegative: 0 });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { record } = req.body;
    console.log(record)
    if (!record?.test_id) {
      return res.status(400).json({ error: 'Invalid request body: missing test_id' });
    }

    // Fetch all required data in parallel
    const { sections, modules, questions } = await fetchTestData(record.test_id);

    // Calculate scores
    const scores = calculateFinalScore(record, sections, modules, questions);
    const totalScore = scores.totalPositive - scores.totalNegative;

    // Update score in mock_plays table
    const { error: updateError } = await serversupabase
      .from('mock_plays')
      .update({ score: totalScore })
      .eq('id', record.id);

    if (updateError) {
      throw new Error(`Failed to update score: ${updateError.message}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...scores,
        totalScore
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}