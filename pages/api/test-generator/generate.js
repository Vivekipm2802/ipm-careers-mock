// Increase Vercel function timeout (Pro plan = 60s, Hobby = 10s)
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sections, difficulty, testType } = req.body;

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: "sections is required and must be a non-empty array" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    // Build topic requests from all sections
    const allTopicRequests = [];
    for (const section of sections) {
      for (const topic of section.topics || []) {
        const mcq = parseInt(topic.mcqCount) || 0;
        const sa = parseInt(topic.saCount) || 0;
        if (mcq + sa === 0) continue;
        allTopicRequests.push({
          subject: section.subjectTitle,
          topicName: topic.topicName,
          mcqCount: mcq,
          saCount: sa,
        });
      }
    }

    if (allTopicRequests.length === 0) {
      return res.status(400).json({ error: "No questions requested" });
    }

    const totalQs = allTopicRequests.reduce((a, t) => a + t.mcqCount + t.saCount, 0);
    console.log(`Total questions requested: ${totalQs}, topics: ${allTopicRequests.length}`);

    let allParsed = [];
    const debugInfo = [];

    // Always split into per-section batches and run in PARALLEL
    // This avoids response truncation AND timeout issues
    const subjectGroups = {};
    for (const t of allTopicRequests) {
      if (!subjectGroups[t.subject]) subjectGroups[t.subject] = [];
      subjectGroups[t.subject].push(t);
    }

    const batchEntries = Object.entries(subjectGroups);

    // Run all batches in parallel
    const batchResults = await Promise.allSettled(
      batchEntries.map(async ([subject, topics]) => {
        const batchQs = topics.reduce((a, t) => a + t.mcqCount + t.saCount, 0);
        console.log(`Generating batch: ${subject} (${batchQs} questions, ${topics.length} topics)`);

        const batchPrompt = buildCombinedPrompt(topics, difficulty, testType);
        const geminiResponse = await callGemini(apiKey, batchPrompt);

        if (geminiResponse.error) {
          console.error(`Batch error for ${subject}:`, geminiResponse.error);
          return { subject, error: geminiResponse.error, questions: [] };
        }

        const parsed = parseGeminiResponse(geminiResponse.text);
        const count = parsed ? parsed.length : 0;
        console.log(`Parsed ${count} questions for ${subject}`);
        return { subject, questions: parsed || [], responseLength: geminiResponse.text?.length };
      })
    );

    // Collect results
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        const { subject, questions, error, responseLength } = result.value;
        debugInfo.push({ subject, parsed: questions.length, error: error || null, responseLength });
        allParsed = [...allParsed, ...questions];
      } else {
        debugInfo.push({ error: result.reason?.message || "Promise rejected" });
      }
    }

    if (allParsed.length === 0) {
      console.error("No questions parsed. Debug:", JSON.stringify(debugInfo));
      return res.status(500).json({
        error: "Could not parse generated questions from AI response",
        debug: debugInfo,
      });
    }

    // Add tempId
    const allGeneratedQuestions = allParsed.map((q, idx) => ({
      ...q,
      tempId: `gen_${Date.now()}_${idx}`,
    }));

    return res.status(200).json({
      success: true,
      questions: allGeneratedQuestions,
      totalGenerated: allGeneratedQuestions.length,
      debug: debugInfo,
    });
  } catch (error) {
    console.error("Unexpected error in generate:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
}

function buildCombinedPrompt(topicRequests, difficulty, testType) {
  const difficultyDesc = {
    easy: "EASY — straightforward single-concept problems, direct formula application, 1-step solutions",
    medium: "MEDIUM — IPMAT/JIPMAT exam level, multi-step problems requiring 2-3 concepts, competitive exam standard",
    hard: "HARD — IIM-level tricky problems requiring creative thinking, multi-concept integration, 3-4 step solutions with non-obvious approaches",
    mixed: "MIXED — 25% easy (1-step), 50% medium (2-3 step IPMAT level), 25% hard (multi-concept tricky)",
  };

  let topicBreakdown = "";
  let totalMcq = 0;
  let totalSa = 0;

  const subjects = new Set();
  for (const t of topicRequests) {
    topicBreakdown += `\n- Subject: "${t.subject}", Topic: "${t.topicName}", MCQ: ${t.mcqCount}, SA: ${t.saCount}`;
    totalMcq += t.mcqCount;
    totalSa += t.saCount;
    subjects.add(t.subject.toLowerCase());
  }

  // Detect which subject areas are being generated
  const hasQA = [...subjects].some(s => s.includes("quantitative") || s.includes("qa") || s.includes("quant") || s.includes("mathematics"));
  const hasVA = [...subjects].some(s => s.includes("verbal") || s.includes("va") || s.includes("varc") || s.includes("english") || s.includes("language"));
  const hasLR = [...subjects].some(s => s.includes("logical") || s.includes("lr") || s.includes("reasoning") || s.includes("di") || s.includes("data interpretation"));

  // Build subject-specific style guides based on real IPMAT/JIPMAT/IIM K BMS papers (2023-2025)
  let styleGuide = "";

  if (hasQA) {
    styleGuide += `
=== QUANTITATIVE ABILITY — QUESTION STYLE GUIDE (Based on IPMAT Indore/Rohtak, JIPMAT, IIM K BMS 2023-2025 papers) ===

CRITICAL: These are NOT school-level textbook questions. Every question must feel like it belongs in an actual IPMAT paper. Study these patterns:

MCQ QUESTION PATTERNS:
• Multi-concept integration: Each question should combine 2-3 mathematical concepts. Example patterns from real papers:
  - A series convergence problem that requires knowledge of GP sum formula AND recognizing π²/6
  - A logarithm problem that requires log properties AND algebraic manipulation AND inequality reasoning
  - A probability problem where you must first count digit-constraint combinations THEN compute probability
  - A geometry problem combining coordinate geometry with trigonometric angle computation
  - A number theory problem requiring modular arithmetic AND divisibility rules together

• Question complexity should require 2-4 steps of reasoning, NOT simple plug-and-formula.

• For Algebra topics: Test polynomial roots with Vieta's formulas, functional equations f(f(x)), matrix equations, systems with parameters, quadratic discriminant analysis. Avoid simple "solve for x" — instead ask for sum/product of roots, number of integer solutions, range of parameter values.

• For Number Theory topics: Remainders of large exponents (like 17^256 mod 9), factors that are perfect squares, digit-sum constraints, divisibility of expressions like n⁵−n, GCD/LCM of algebraic expressions. Use numbers large enough that brute force fails.

• For Geometry topics: Combine circle theorems with coordinate geometry, triangle properties with trigonometry, area problems requiring auxiliary constructions. Include circumradius/inradius formulas, regular polygon properties, locus problems.

• For Arithmetic topics: Multi-step percentage/ratio word problems with 3+ constraints. CI problems with different compounding schemes or multiple investments. Profit/loss with successive discounts and tax. Mixture/alligation with replacement.

• For P&C/Probability: Conditional probability, derangements, circular permutations with restrictions, probability with geometric constraints, digit arrangement with divisibility conditions.

• For DI (Data Interpretation): Create a data table or chart description (e.g., monthly sales across 5 products, student enrollment by department and year), then ask 3-5 questions from that SAME dataset. Questions should require percentage change, ratio comparison, average computation, and ranking — not just reading values.

• For Statistics: Mean/median/mode problems with unknown values, effect of adding/removing data points, problems combining frequency tables with probability.

SA (SHORT ANSWER) QUESTION PATTERNS:
• Answer must ALWAYS be a precise integer or simple fraction/decimal (students type the answer, no options).
• Multi-step word problems with real-world scenarios: work-rate with partial completion, speed-distance with multiple segments, age problems with 4+ people, team selection with constraints.
• Set-based constraint puzzles: 4-5 related questions from ONE scenario (like a team expedition, tournament, or scheduling problem). Each question has a single numeric answer.
• Pattern: Present a rich scenario with multiple conditions, then ask for a specific numeric value.
• Avoid trivial computation — the challenge is in setting up equations from word problem constraints.

OPTION DESIGN FOR MCQ:
• All 4 options must be plausible. Include trap answers that result from common mistakes:
  - The answer you get if you forget a negative sign
  - The answer from a partial solution (stopping one step early)
  - The answer from misapplying a formula (e.g., using nPr instead of nCr)
  - Close numerical values (e.g., if answer is 24, options might be 18, 20, 24, 30)
• NEVER use obviously wrong options like 0 or negative numbers when the context doesn't allow them.
• Options should be in ascending or logical order.
`;
  }

  if (hasVA) {
    styleGuide += `
=== VERBAL ABILITY — QUESTION STYLE GUIDE (Based on IPMAT Indore 2023-2025, JIPMAT, IIM K BMS papers) ===

CRITICAL: VA questions in IPMAT are sophisticated — NOT simple school grammar. Follow these exact patterns:

READING COMPREHENSION:
• Generate passages of 200-350 words on topics like: social media policy debates, economic theory, philosophical concepts (e.g., Baudrillard's consumption theory), scientific discoveries, historical analysis, business strategy, technology ethics, environmental policy.
• Passage tone should be academic but accessible — like an editorial from The Hindu or an excerpt from a McKinsey report.
• For each passage, generate 4-6 questions testing: main idea/central argument, author's tone/stance, specific inference (what can be concluded from paragraph 2), vocabulary in context, logical implication, what would weaken/strengthen the argument.
• Question stems should use phrases like: "It can be inferred from the passage that...", "The author's primary purpose is to...", "Which of the following best describes...", "The passage suggests that...", "Which statement would the author most likely agree with?"
• Options should include sophisticated distractors: partially correct statements, statements true but not supported by passage, extreme versions of correct answers.

SENTENCE COMPLETION / FILL IN THE BLANKS:
• Use phrasal verbs and idiomatic expressions: "The committee decided to ___ the proposal" (shelve/table/defer — test nuanced word choice).
• Triple-blank sentences where all three words must fit contextually: "The ___ politician delivered a ___ speech that left the audience ___."
• Test collocations: words that naturally go together in English (e.g., "wreak havoc" not "create havoc").

SENTENCE CORRECTION:
• Present a sentence with an underlined portion and 4 options for the correct version.
• Test: subject-verb agreement with intervening clauses, tense consistency in complex sentences, parallel structure, dangling modifiers, causative verbs (make/let/have/get), correct preposition usage, pronoun-antecedent agreement.
• The original sentence should sound almost right — the error should be subtle.

PARA JUMBLES:
• Give 4-5 sentences labeled P, Q, R, S (or 1-5) that form a coherent paragraph when rearranged.
• Options give different orderings (e.g., QPRS, RQSP, PRQS, SQRP).
• Sentences should have clear discourse markers, pronoun references, and logical flow indicators that allow determining the correct order.

PARA COMPLETION:
• Give a paragraph with one sentence missing (indicated by ___).
• Four options offer different sentences to fill the gap.
• The correct answer maintains logical flow, tone, and argument progression.

VOCABULARY — INCORRECT WORD USAGE:
• Present 4 sentences, each using the SAME word. In exactly one sentence, the word is used incorrectly.
• Test commonly confused words: affect/effect, principal/principle, complement/compliment, discrete/discreet, elicit/illicit, farther/further, hoard/horde.
• The incorrect usage should be subtle — the word should almost make sense in context.

VOCABULARY — SYNONYMS/ANTONYMS:
• Test advanced vocabulary: words like "obsequious", "perspicacious", "ephemeral", "sanguine", "perfunctory", "recalcitrant".
• Options should include near-synonyms that don't quite match the context.

CONVERSATION ANALYSIS (for IPMAT Indore style):
• Present a short dialogue/transcript (5-8 exchanges) and ask analytical questions about it.
`;
  }

  if (hasLR) {
    styleGuide += `
=== LOGICAL REASONING & DATA INTERPRETATION — QUESTION STYLE GUIDE (Based on IPMAT Rohtak, JIPMAT 2023-2024 papers) ===

CODING-DECODING:
• Pattern-based letter/number coding where the student must identify the rule and apply it.
• Example pattern: If MOBILITY = 46293927, find code for EXAMINATION (positional cipher + operation).

SEATING ARRANGEMENT:
• 6-8 people in circular or linear arrangement with 4-6 conditional constraints.
• Generate 3-4 questions from the SAME arrangement scenario.
• Constraints like: "A sits opposite B", "C is not adjacent to D", "E sits 2 places to the left of F".

SYLLOGISM:
• 3-4 statements followed by 2-3 conclusions. Test "All/Some/No" logic with Venn diagram reasoning.
• Include cases where conclusion follows definitely vs. possibility.

SERIES COMPLETION:
• Number series with non-obvious patterns (differences of differences, alternating operations, prime-based).
• Letter/alphanumeric series requiring pattern recognition across multiple dimensions.

DATA INTERPRETATION SETS:
• Create a data table (e.g., production across 5 factories over 4 years, or expenditure breakdown by category).
• Ask 4-5 questions requiring: percentage calculation, ratio comparison, year-over-year growth, ranking, average vs individual comparison.
• Include at least one question requiring multi-step calculation (e.g., "By what percentage did the average exceed the median?").

ASSERTION-REASON (for JIPMAT style):
• Statement A (Assertion) and Statement R (Reason). Options: Both true and R explains A / Both true but R doesn't explain A / A true R false / A false R true / Both false.

ARGUMENT EVALUATION:
• Present a statement about a policy/decision, followed by 2-3 arguments for and against.
• Ask which arguments are strong/weak based on logical validity (not opinion).

BLOOD RELATIONS / DIRECTION SENSE:
• Multi-step relationship or direction problems requiring careful tracking.
• Use coded relationships (+ means brother, - means sister, etc.) for complexity.
`;
  }

  return `You are a senior question paper setter for IPMAT (IIM Indore & Rohtak), JIPMAT (NIT Trichy), and IIM Kozhikode BMS entrance exams. You have set papers for these exams for 10+ years.

Your task: Generate exactly ${totalMcq + totalSa} questions that are INDISTINGUISHABLE from real previous year questions of these exams.

Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.medium}

Questions needed:${topicBreakdown}

Total: ${totalMcq} MCQ + ${totalSa} SA = ${totalMcq + totalSa} questions
${styleGuide}
=== ABSOLUTE RULES ===
1. Return ONLY a valid JSON array — no markdown, no code fences, no explanation text before or after the array.
2. MCQ questions: exactly 4 options labeled A/B/C/D, exactly 1 correct answer (isCorrect: true), other 3 must be false.
3. SA questions: answer must be a precise integer or simple decimal that a student types in. No ambiguity.
4. Explanations: 2-3 sentences showing the solution approach (not just "the answer is X"). Include key formula or reasoning step.
5. Use simple HTML: wrap question text in <p> tags. Use <br> for line breaks. For math use plain text (e.g., x² not rendered LaTeX).
6. Each question MUST have "sectionTitle" and "topicName" matching EXACTLY the values given above.
7. Questions must be ORIGINAL — not copied from any published source. But they must MATCH the style, difficulty, and multi-step nature of real IPMAT/JIPMAT papers.
8. NO trivial questions. Every MCQ should require at least 2 steps of reasoning. Every SA should require setting up equations from word problem constraints.
9. For DI/set-based topics: Generate a data scenario (table/chart description embedded in the question text) and create 3-5 questions from that SAME dataset. Reference the dataset in each question.

JSON format for MCQ:
{"sectionTitle":"...","topicName":"...","type":"options","question":"<p>question text here</p>","options":[{"title":"A","text":"option text","isCorrect":false},{"title":"B","text":"option text","isCorrect":true},{"title":"C","text":"option text","isCorrect":false},{"title":"D","text":"option text","isCorrect":false}],"explanation":"Step 1: ... Step 2: ... Therefore the answer is B."}

JSON format for SA:
{"sectionTitle":"...","topicName":"...","type":"input","question":"<p>word problem text here</p>","options":{"answer":"42"},"explanation":"Step 1: ... Step 2: ... The answer is 42."}

[`;
}

async function callGemini(apiKey, prompt) {
  if (!apiKey) {
    return { error: "GEMINI_API_KEY is not configured in environment variables" };
  }

  // Try models in order — confirmed available from your AI Studio key (Apr 2026)
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
  ];

  console.log(`callGemini: key ends in ...${apiKey.slice(-6)}, prompt ${prompt.length} chars`);
  const errors = [];

  for (const model of models) {
    try {
      console.log(`Calling model: ${model}, prompt length: ${prompt.length} chars`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 65536,
            },
          }),
        }
      );

      if (response.status === 429) {
        const msg = `Rate limited on ${model}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      if (response.status === 404) {
        const errBody = await response.text();
        const msg = `Model ${model} not found — response: ${errBody.substring(0, 300)}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      if (response.status === 400) {
        const errBody = await response.text();
        const msg = `${model} 400 Bad Request — likely invalid API key: ${errBody.substring(0, 300)}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      if (response.status === 403) {
        const errBody = await response.text();
        const msg = `${model} 403 Forbidden — API not enabled or quota exceeded: ${errBody.substring(0, 300)}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        const msg = `${model} error ${response.status}: ${errorText.substring(0, 500)}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      const data = await response.json();

      // Handle both regular and "thinking" model response formats
      let text = null;
      if (data.candidates && data.candidates[0]) {
        const parts = data.candidates[0].content?.parts || [];
        // Some models return multiple parts (thinking + actual response)
        // Get the last text part that looks like JSON
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].text && (parts[i].text.includes('"sectionTitle"') || parts[i].text.includes('"type"'))) {
            text = parts[i].text;
            break;
          }
        }
        // Fallback: just get the last text part
        if (!text) {
          for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].text) {
              text = parts[i].text;
              break;
            }
          }
        }
      }

      if (!text) {
        console.log(`Empty response from ${model}, candidates:`, JSON.stringify(data.candidates?.[0]?.content).substring(0, 300));
        continue;
      }

      // Check for finish reason
      const finishReason = data.candidates[0].finishReason;
      if (finishReason && finishReason !== "STOP") {
        console.log(`Warning: ${model} finish reason: ${finishReason}`);
      }

      console.log(`Success with ${model}, response length: ${text.length}`);
      return { text };
    } catch (err) {
      console.log(`Fetch error on ${model}: ${err.message}`);
      continue;
    }
  }

  return { error: "All Gemini models failed: " + errors.join(" | ") };
}

function parseGeminiResponse(text) {
  if (!text) return null;
  console.log("Parsing response, length:", text.length, "start:", text.substring(0, 100));

  // Clean up the text
  let cleaned = text.trim();

  // If prompt ended with "[" and model continued, prepend it
  if (!cleaned.startsWith("[")) {
    // Check if it starts with { (model omitted the opening bracket)
    if (cleaned.startsWith("{") || cleaned.startsWith("\n{")) {
      cleaned = "[" + cleaned;
    }
  }

  // Remove trailing text after the JSON array
  const lastBracket = cleaned.lastIndexOf("]");
  if (lastBracket > 0) {
    cleaned = cleaned.substring(0, lastBracket + 1);
  }

  // Strategy 1: Direct parse
  try {
    const questions = JSON.parse(cleaned);
    if (Array.isArray(questions)) {
      const validated = validateQuestions(questions);
      if (validated.length > 0) {
        console.log(`Direct parse: ${validated.length} valid questions`);
        return validated;
      }
    }
  } catch (e) {
    console.log("Direct parse failed:", e.message?.substring(0, 100));
  }

  // Strategy 2: Extract from code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const questions = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(questions)) {
        const validated = validateQuestions(questions);
        if (validated.length > 0) {
          console.log(`Code block parse: ${validated.length} valid questions`);
          return validated;
        }
      }
    } catch (e2) {
      console.log("Code block parse failed:", e2.message?.substring(0, 100));
    }
  }

  // Strategy 3: Find the largest JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const questions = JSON.parse(arrayMatch[0]);
      if (Array.isArray(questions)) {
        const validated = validateQuestions(questions);
        if (validated.length > 0) {
          console.log(`Array match parse: ${validated.length} valid questions`);
          return validated;
        }
      }
    } catch (e3) {
      console.log("Array match failed:", e3.message?.substring(0, 100));

      // Strategy 4: Truncation recovery — find last complete object
      const jsonStr = arrayMatch[0];
      let lastGood = jsonStr.lastIndexOf("},");
      if (lastGood < 0) lastGood = jsonStr.lastIndexOf("}]");
      if (lastGood > 0) {
        const truncated = jsonStr.substring(0, lastGood + 1) + "]";
        try {
          const questions = JSON.parse(truncated);
          if (Array.isArray(questions)) {
            const validated = validateQuestions(questions);
            if (validated.length > 0) {
              console.log(`Truncation recovery: ${validated.length} valid questions`);
              return validated;
            }
          }
        } catch (e4) {
          console.log("Truncation recovery failed:", e4.message?.substring(0, 100));
        }
      }
    }
  }

  console.error("All parse strategies failed. Response end:", text.substring(Math.max(0, text.length - 300)));
  return null;
}

function validateQuestions(questions) {
  return questions
    .filter((q) => {
      if (!q.type || !q.question) return false;
      if (q.type === "options") {
        if (!Array.isArray(q.options) || q.options.length < 2) return false;
        if (!q.options.some((o) => o.isCorrect === true)) return false;
      }
      if (q.type === "input") {
        if (!q.options || typeof q.options.answer === "undefined") return false;
      }
      return true;
    })
    .map((q) => ({
      sectionTitle: q.sectionTitle || "General",
      topicName: q.topicName || "General",
      type: q.type,
      question: q.question,
      options: q.options,
      explanation: q.explanation || "",
    }));
}
