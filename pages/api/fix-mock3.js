// TEMPORARY — apply question fixes to Hash IPMAT Mock 3 (2026)
// v3: smarter matching that handles HTML entities and tags
import { serversupabase } from "../../utils/supabaseClient";

export default async function handler(req, res) {
  if (req.query.token !== "fix15mock3") return res.status(403).json({ error: "bad token" });

  // GET = diagnostic: return raw question data for given IDs
  if (req.method === "GET") {
    const ids = (req.query.ids || "").split(",").map(Number).filter(Boolean);
    if (!ids.length) return res.status(400).json({ error: "pass ?ids=7437,7447,..." });
    const { data, error } = await serversupabase
      .from("mock_questions")
      .select("id,question,options")
      .in("id", ids);
    // Strip base64 images from response to keep it small
    if (data) {
      data.forEach(d => {
        d.question = d.question.replace(/data:image\/[^"']*/g, '[BASE64_IMG]');
      });
    }
    return res.status(200).json({ data, error });
  }

  // PUT = smart fix with regex
  if (req.method === "PUT") {
    const results = [];

    // Generic regex fix function
    async function regexFix(id, regex, replacement, label) {
      const { data, error: fetchErr } = await serversupabase
        .from("mock_questions")
        .select("question")
        .eq("id", id)
        .single();
      if (fetchErr) { results.push({ id, label, status: "FETCH_ERROR", error: fetchErr.message }); return; }

      const original = data.question;
      const updated = original.replace(regex, replacement);

      if (original === updated) {
        // Show a snippet around where we expected to find it
        const plainText = original.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
        results.push({ id, label, status: "NO_CHANGE", snippet: plainText.substring(0, 200) });
        return;
      }

      const { error: upErr } = await serversupabase
        .from("mock_questions")
        .update({ question: updated })
        .eq("id", id);
      results.push({ id, label, status: upErr ? "UPDATE_ERROR" : "OK", error: upErr?.message });
    }

    // Fix options
    async function fixOpts(id, fixFn, label) {
      const { data, error: fetchErr } = await serversupabase
        .from("mock_questions")
        .select("options")
        .eq("id", id)
        .single();
      if (fetchErr) { results.push({ id, label, status: "FETCH_ERROR", error: fetchErr.message }); return; }
      const newOpts = fixFn(data.options);
      if (JSON.stringify(newOpts) === JSON.stringify(data.options)) {
        results.push({ id, label, status: "NO_CHANGE", currentOpts: data.options.map(o=>o.title) });
        return;
      }
      const { error: upErr } = await serversupabase
        .from("mock_questions")
        .update({ options: newOpts })
        .eq("id", id);
      results.push({ id, label, status: upErr ? "UPDATE_ERROR" : "OK", error: upErr?.message });
    }

    // ── SA Q4 (7437): IMAGE-BASED — "exceeding x" → "exceeding m" ──
    // Question is a base64 image. Try anyway in case there's alt text or hidden text.
    await regexFix(7437, /exceeding\s+x/gi, "exceeding m", "SA Q4: x→m (may be image)");

    // ── SA Q14 (7447): "she sells" → "he sells" ──
    // Text shows "Rohit...he sells" — check for "she" anywhere
    await regexFix(7447, /\bshe\b/gi, "he", "SA Q14: she→he");

    // ── MCQ Q12 (7460): Check/fix duplicate options ──
    await fixOpts(7460, (opts) => {
      // Check if any two options have the same title
      const titles = opts.map(o => o.title.trim());
      const hasDup = titles.length !== new Set(titles).size;
      if (!hasDup) return opts; // No duplicates, already fine
      return opts; // Return as-is if we don't know correct value
    }, "MCQ Q12: dup check");

    // ── MCQ Q21 (7469): typos in text ──
    // "and th subtract" → "and then subtract"
    // "results a found" → "results and found"
    // The text has &nbsp; and HTML tags — use flexible regex
    await regexFix(7469, /and\s+th\s+subtract/gi, "and then subtract", "MCQ Q21: th→then");
    await regexFix(7469, /results\s+a\s+found/gi, "results and found", "MCQ Q21: a→and");
    // Try also: "and th<" pattern (th might be followed by HTML tag)
    await regexFix(7469, /and(\s|&nbsp;)+th(\s|&nbsp;)+/gi, "and then ", "MCQ Q21: th→then v2");
    // Try "result a " pattern
    await regexFix(7469, /result\s+a\s+/gi, "result and ", "MCQ Q21: result a→result and");

    // ── MCQ Q26 (7474): IMAGE-BASED — "odd" → "even" ──
    await regexFix(7474, /successive\s+odd\s+natural/gi, "successive even natural", "MCQ Q26: odd→even (may be image)");

    // ── VA Q31 (7510): "different equation" → "differential equation" ──
    await regexFix(7510, /different\s+equation/gi, "differential equation", "VA Q31: different→differential");
    // Also try with &nbsp;
    await regexFix(7510, /different(&nbsp;|\s)+equation/gi, "differential equation", "VA Q31: v2");

    // ── VA Q42 (7521): "standards electroweak" → "standard electroweak" ──
    await regexFix(7521, /standards\s+electroweak/gi, "standard electroweak", "VA Q42: standards→standard");
    await regexFix(7521, /standards(&nbsp;|\s)+electroweak/gi, "standard electroweak", "VA Q42: v2");

    // ── VA Q43 (7522): "five pairs of words" → "four pairs of words" ──
    await regexFix(7522, /five\s+pairs\s+of\s+words/gi, "four pairs of words", "VA Q43: five→four");
    await regexFix(7522, /five(&nbsp;|\s)+pairs/gi, "four pairs", "VA Q43: v2");
    // Try "Five" specifically
    await regexFix(7522, /Five\s+pairs/g, "Four pairs", "VA Q43: Five→Four");

    // ── VA Q44 (7523): "five pairs of words" → "four pairs of words" ──
    await regexFix(7523, /five\s+pairs\s+of\s+words/gi, "four pairs of words", "VA Q44: five→four");
    await regexFix(7523, /five(&nbsp;|\s)+pairs/gi, "four pairs", "VA Q44: v2");
    await regexFix(7523, /Five\s+pairs/g, "Four pairs", "VA Q44: Five→Four");

    return res.status(200).json({ message: "v3 fix run complete", results });
  }

  return res.status(405).json({ error: "Use PUT for v3 fixes, GET for diagnostics" });
}
