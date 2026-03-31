// TEMPORARY — verify all questions in the new mock test
import { serversupabase } from "../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "verifyMock134") return res.status(403).json({ error: "bad token" });

  // Fetch all groups and questions for test 134
  const testId = 134;

  // Get subject groups
  const { data: sections } = await serversupabase
    .from("mock_groups")
    .select("*,subject(*)")
    .eq("test", testId)
    .eq("type", "subject")
    .order("seq");

  // Get module groups
  const { data: modules } = await serversupabase
    .from("mock_groups")
    .select("*,module(*)")
    .in("parent_sub", sections.map(s => s.id))
    .eq("type", "module");

  // Get all questions
  const moduleIds = modules.map(m => m.module?.id).filter(Boolean);
  const { data: questions } = await serversupabase
    .from("mock_questions")
    .select("id,parent,type,question,options,seq")
    .in("parent", moduleIds)
    .order("seq");

  // Organize by section
  const result = sections.map(sec => {
    const secModules = modules.filter(m => m.parent_sub === sec.id);
    const secModuleIds = secModules.map(m => m.module?.id);
    const secQuestions = questions.filter(q => secModuleIds.includes(q.parent));

    return {
      section: sec.subject?.title,
      sectionId: sec.id,
      pos: secModules[0]?.pos,
      neg: secModules[0]?.neg,
      questionCount: secQuestions.length,
      questions: secQuestions.map(q => {
        const plainText = q.question?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
        let answer;
        if (q.type === "input") {
          answer = q.options?.answer;
        } else {
          const correctIdx = q.options?.findIndex(o => o.isCorrect);
          answer = `Option ${correctIdx + 1}: ${q.options?.[correctIdx]?.title}`;
        }
        return {
          seq: q.seq,
          type: q.type,
          text: plainText?.substring(0, 120),
          answer,
        };
      })
    };
  });

  res.status(200).json({
    testId,
    totalQuestions: questions.length,
    sections: result,
  });
}
