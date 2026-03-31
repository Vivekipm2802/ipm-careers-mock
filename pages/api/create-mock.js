// TEMPORARY — create IPMAT Indore Full-Length Mock Test
import { serversupabase } from "../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "createMock2026") return res.status(403).json({ error: "bad token" });

  // GET = diagnostic: show existing structure
  if (req.method === "GET") {
    const { data: cats } = await serversupabase.from("mock_categories").select("*").order("id");
    const { data: tests } = await serversupabase.from("mock_test").select("id,uid,title,category,course,config").order("id",{ascending:false}).limit(5);
    const { data: subjects } = await serversupabase.from("mock_subjects").select("*").order("id");

    // Get groups for the most recent test to understand structure
    let groups = null;
    if (tests && tests.length > 0) {
      const { data: g } = await serversupabase.from("mock_groups").select("*").eq("test", tests[0].id).order("seq");
      groups = g;

      // Get a few questions from first module to see structure
      if (g && g.length > 0) {
        const moduleGroup = g.find(x => x.type === "module");
        if (moduleGroup) {
          const { data: qs } = await serversupabase.from("mock_questions").select("id,parent,type,question,options,seq,correct").eq("parent", moduleGroup.module).order("seq").limit(3);
          return res.status(200).json({ cats, tests, subjects, groups, sampleQuestions: qs });
        }
      }
    }
    return res.status(200).json({ cats, tests, subjects, groups });
  }

  return res.status(405).json({ error: "GET only for now" });
}
