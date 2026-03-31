// TEMPORARY — fix VA Q32 answer (QSPR → QPSR)
import { serversupabase } from "../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "fixVA32x") return res.status(403).json({ error: "bad token" });

  const testId = 134;

  // Get VA subject group
  const { data: sections } = await serversupabase
    .from("mock_groups")
    .select("*,subject(*)")
    .eq("test", testId)
    .eq("type", "subject")
    .order("seq");

  const vaSection = sections[2]; // VA is 3rd section

  // Get module groups for VA section
  const { data: modules } = await serversupabase
    .from("mock_groups")
    .select("*,module(*)")
    .eq("parent_sub", vaSection.id)
    .eq("type", "module");

  const moduleId = modules[0]?.module?.id;

  // Find Q32 by parent module and seq
  const { data: questions } = await serversupabase
    .from("mock_questions")
    .select("id,parent,seq,options")
    .eq("parent", moduleId)
    .eq("seq", 32);

  if (!questions || questions.length === 0) {
    return res.status(404).json({ error: "Q32 not found" });
  }

  const q = questions[0];
  const oldOptions = q.options;

  // Diagnostic: show current state
  if (req.method === "GET") {
    return res.status(200).json({
      questionId: q.id,
      seq: q.seq,
      currentOptions: oldOptions.map((o, i) => ({
        index: i,
        title: o.title,
        isCorrect: o.isCorrect,
      })),
      note: "Need to change correct answer from index 0 (QSPR) to index 2 (QPSR). Use PUT to fix.",
    });
  }

  if (req.method === "PUT") {
    // Fix: move isCorrect from index 0 to index 2
    const newOptions = oldOptions.map((o, i) => ({
      ...o,
      isCorrect: i === 2, // Option 3 (index 2) = QPSR
    }));

    const { error } = await serversupabase
      .from("mock_questions")
      .update({ options: newOptions })
      .eq("id", q.id);

    if (error) return res.status(500).json({ error });

    return res.status(200).json({
      success: true,
      questionId: q.id,
      before: oldOptions.map((o, i) => ({ title: o.title, isCorrect: o.isCorrect })),
      after: newOptions.map((o, i) => ({ title: o.title, isCorrect: o.isCorrect })),
    });
  }

  res.status(405).json({ error: "Use GET to diagnose, PUT to fix" });
}
