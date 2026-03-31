// TEMPORARY — fix DI set questions (MCQ Q21-Q25) to include table in each question
import { serversupabase } from "../../utils/supabaseClient";

const DI_TABLE_HTML = `
<p><strong>Directions (Q36–Q40):</strong> Study the table below and answer the questions that follow.</p>
<p><strong>Sales of Five Companies (in ₹ Crores)</strong></p>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;text-align:center;">
<thead>
<tr><th>Company</th><th>2019</th><th>2020</th><th>2021</th><th>2022</th><th>2023</th></tr>
</thead>
<tbody>
<tr><td><strong>P</strong></td><td>120</td><td>135</td><td>150</td><td>170</td><td>190</td></tr>
<tr><td><strong>Q</strong></td><td>200</td><td>180</td><td>210</td><td>230</td><td>250</td></tr>
<tr><td><strong>R</strong></td><td>90</td><td>110</td><td>100</td><td>130</td><td>160</td></tr>
<tr><td><strong>S</strong></td><td>150</td><td>140</td><td>165</td><td>155</td><td>180</td></tr>
<tr><td><strong>T</strong></td><td>180</td><td>200</td><td>190</td><td>220</td><td>240</td></tr>
</tbody>
</table>
<br/>`;

const DI_QUESTIONS = {
  21: `${DI_TABLE_HTML}<p>What is the average sales of Company Q over the five years (in ₹ Crores)?</p>`,
  22: `${DI_TABLE_HTML}<p>For which company was the percentage increase in sales from 2019 to 2023 the highest?</p>`,
  23: `${DI_TABLE_HTML}<p>In which year was the total sales of all five companies the highest?</p>`,
  24: `${DI_TABLE_HTML}<p>The sales of Company S in 2023 are what percentage of the total sales of all companies in 2023 (approximately)?</p>`,
  25: `${DI_TABLE_HTML}<p>How many companies showed a consistent year-on-year increase in sales over the entire period?</p>`,
};

export default async function handler(req, res) {
  if (req.query.token !== "fixDI134") return res.status(403).json({ error: "bad token" });

  const testId = 134;

  // Get MCQ subject group (2nd section)
  const { data: sections } = await serversupabase
    .from("mock_groups")
    .select("*,subject(*)")
    .eq("test", testId)
    .eq("type", "subject")
    .order("seq");

  const mcqSection = sections[1]; // MCQ is 2nd section

  // Get module groups for MCQ section
  const { data: modules } = await serversupabase
    .from("mock_groups")
    .select("*,module(*)")
    .eq("parent_sub", mcqSection.id)
    .eq("type", "module");

  const moduleId = modules[0]?.module?.id;

  // Get DI questions (seq 21-25)
  const { data: questions } = await serversupabase
    .from("mock_questions")
    .select("id,parent,seq,question")
    .eq("parent", moduleId)
    .gte("seq", 21)
    .lte("seq", 25)
    .order("seq");

  if (req.method === "GET") {
    return res.status(200).json({
      moduleId,
      questions: questions.map(q => ({
        id: q.id,
        seq: q.seq,
        questionPreview: q.question.substring(0, 200) + "...",
      })),
      note: "Use PUT to update all 5 DI questions with proper table and clear question text",
    });
  }

  if (req.method === "PUT") {
    const results = [];
    for (const q of questions) {
      const newQuestion = DI_QUESTIONS[q.seq];
      if (!newQuestion) {
        results.push({ seq: q.seq, status: "skipped", reason: "no replacement defined" });
        continue;
      }
      const { error } = await serversupabase
        .from("mock_questions")
        .update({ question: newQuestion })
        .eq("id", q.id);

      results.push({
        seq: q.seq,
        id: q.id,
        status: error ? "error" : "updated",
        error: error?.message,
      });
    }
    return res.status(200).json({ success: true, results });
  }

  res.status(405).json({ error: "Use GET to diagnose, PUT to fix" });
}
