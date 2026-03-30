// TEMPORARY — apply 15 question fixes to Hash IPMAT Mock 3 (2026)
// Delete this file after running once.

import { serversupabase } from "../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Simple auth token to prevent random hits
  if (req.query.token !== "fix15mock3") return res.status(403).json({ error: "bad token" });

  const results = [];

  // Helper: update question HTML text (find/replace in the `question` field)
  async function fixQuestion(id, searchStr, replaceStr, label) {
    const { data, error: fetchErr } = await serversupabase
      .from("mock_questions")
      .select("question")
      .eq("id", id)
      .single();
    if (fetchErr) { results.push({ id, label, status: "FETCH_ERROR", error: fetchErr.message }); return; }
    if (!data.question.includes(searchStr)) {
      results.push({ id, label, status: "NOT_FOUND", searchStr });
      return;
    }
    const updated = data.question.replace(searchStr, replaceStr);
    const { error: upErr } = await serversupabase
      .from("mock_questions")
      .update({ question: updated })
      .eq("id", id);
    results.push({ id, label, status: upErr ? "UPDATE_ERROR" : "OK", error: upErr?.message });
  }

  // Helper: fix options JSON
  async function fixOptions(id, fixFn, label) {
    const { data, error: fetchErr } = await serversupabase
      .from("mock_questions")
      .select("options")
      .eq("id", id)
      .single();
    if (fetchErr) { results.push({ id, label, status: "FETCH_ERROR", error: fetchErr.message }); return; }
    const newOptions = fixFn(data.options);
    const { error: upErr } = await serversupabase
      .from("mock_questions")
      .update({ options: newOptions })
      .eq("id", id);
    results.push({ id, label, status: upErr ? "UPDATE_ERROR" : "OK", error: upErr?.message });
  }

  // ── SA SECTION ──
  // SA Q4 (id:7437): "exceeding x" → "exceeding m"
  await fixQuestion(7437, "exceeding x", "exceeding m", "SA Q4: x→m");

  // SA Q6 (id:7439): "a2y" → "a2b"  (could be a²y or a2y in HTML)
  // Try both variants
  const { data: q7439 } = await serversupabase.from("mock_questions").select("question").eq("id", 7439).single();
  if (q7439) {
    let txt = q7439.question;
    // Replace all variants: a²y, a2y, a<sup>2</sup>y
    txt = txt.replace(/a²y/g, "a²b");
    txt = txt.replace(/a2y/g, "a2b");
    txt = txt.replace(/a<sup>2<\/sup>y/g, "a<sup>2</sup>b");
    const { error } = await serversupabase.from("mock_questions").update({ question: txt }).eq("id", 7439);
    results.push({ id: 7439, label: "SA Q6: a2y→a2b", status: error ? "UPDATE_ERROR" : "OK", error: error?.message });
  }

  // SA Q14 (id:7447): "she sells" → "he sells"  (case-insensitive first match)
  await fixQuestion(7447, "she sells", "he sells", "SA Q14: she→he");
  // Also try "She sells" variant
  await fixQuestion(7447, "She sells", "He sells", "SA Q14: She→He");

  // ── MCQ SECTION ──
  // MCQ Q10 (id:7458): "Shyam" → "Aradhya"
  const { data: q7458 } = await serversupabase.from("mock_questions").select("question").eq("id", 7458).single();
  if (q7458) {
    const txt = q7458.question.replace(/Shyam/g, "Aradhya");
    const { error } = await serversupabase.from("mock_questions").update({ question: txt }).eq("id", 7458);
    results.push({ id: 7458, label: "MCQ Q10: Shyam→Aradhya", status: error ? "UPDATE_ERROR" : "OK", error: error?.message });
  }

  // MCQ Q12 (id:7460): Duplicate options B and C both "24" — need to see current options to fix
  await fixOptions(7460, (opts) => {
    // Log current state and fix duplicate — B and C both show "24"
    // We need to know what C should actually be. Based on the audit, one of them is wrong.
    // For now, let's just flag it and return the options as-is if we can't determine the fix
    // Actually from the audit context, this is about duplicate options where B=24 and C=24
    // We need the correct value for one of them. Let's check and report.
    return opts; // Will handle separately after seeing the data
  }, "MCQ Q12: check duplicates");

  // MCQ Q13 (id:7461): "+6" → "-6" in the function expression
  const { data: q7461 } = await serversupabase.from("mock_questions").select("question").eq("id", 7461).single();
  if (q7461) {
    let txt = q7461.question;
    // Try common patterns: "+ 6", "+6", "  6" at end of polynomial
    txt = txt.replace(/\+\s*6(?!\d)/, "- 6");
    const { error } = await serversupabase.from("mock_questions").update({ question: txt }).eq("id", 7461);
    results.push({ id: 7461, label: "MCQ Q13: +6→-6", status: error ? "UPDATE_ERROR" : "OK", error: error?.message });
  }

  // MCQ Q21 (id:7469): "and th subtract" → "and then subtract"; "results a found" → "results and found"
  await fixQuestion(7469, "and th subtract", "and then subtract", "MCQ Q21: th→then");
  await fixQuestion(7469, "results a found", "results and found", "MCQ Q21: a→and");
  // Also try without space variations
  await fixQuestion(7469, "and th ", "and then ", "MCQ Q21: th→then v2");

  // MCQ Q22 (id:7470): "mixture Q" → "mixture N"
  const { data: q7470 } = await serversupabase.from("mock_questions").select("question").eq("id", 7470).single();
  if (q7470) {
    const txt = q7470.question.replace(/mixture Q/g, "mixture N");
    const { error } = await serversupabase.from("mock_questions").update({ question: txt }).eq("id", 7470);
    results.push({ id: 7470, label: "MCQ Q22: Q→N", status: error ? "UPDATE_ERROR" : "OK", error: error?.message });
  }

  // MCQ Q24 (id:7472): "a + b" → "m + n"
  const { data: q7472 } = await serversupabase.from("mock_questions").select("question").eq("id", 7472).single();
  if (q7472) {
    let txt = q7472.question;
    // Replace "a + b" with "m + n" — try common HTML patterns
    txt = txt.replace(/a\s*\+\s*b/g, "m + n");
    const { error } = await serversupabase.from("mock_questions").update({ question: txt }).eq("id", 7472);
    results.push({ id: 7472, label: "MCQ Q24: a+b→m+n", status: error ? "UPDATE_ERROR" : "OK", error: error?.message });
  }

  // MCQ Q26 (id:7474): "successive odd natural numbers" → "successive even natural numbers"
  await fixQuestion(7474, "successive odd natural numbers", "successive even natural numbers", "MCQ Q26: odd→even");

  // ── VA SECTION ──
  // VA Q31 (id:7510): "different equation" → "differential equation"
  await fixQuestion(7510, "different equation", "differential equation", "VA Q31: different→differential");

  // VA Q32 (id:7511): "sustained belie" → "sustained belief"
  await fixQuestion(7511, "sustained belie", "sustained belief", "VA Q32: belie→belief");

  // VA Q42 (id:7521): "standards electroweak" → "standard electroweak"
  await fixQuestion(7521, "standards electroweak", "standard electroweak", "VA Q42: standards→standard");

  // VA Q43 (id:7522): "five pairs of words" → "four pairs of words"
  await fixQuestion(7522, "five pairs of words", "four pairs of words", "VA Q43: five→four");

  // VA Q44 (id:7523): "five pairs of words" → "four pairs of words"
  await fixQuestion(7523, "five pairs of words", "four pairs of words", "VA Q44: five→four");

  // Also fetch MCQ Q12 options to see the duplicate issue
  const { data: q7460data } = await serversupabase.from("mock_questions").select("options").eq("id", 7460).single();

  res.status(200).json({
    message: "Fix run complete",
    results,
    mcqQ12Options: q7460data?.options, // So we can see what needs fixing
  });
}
