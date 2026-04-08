// Edge Runtime gives 30s timeout on Hobby plan (vs 10s for serverless)
export const config = {
  runtime: "edge",
};

// ââ Supabase REST helpers (Edge-safe, no Node SDK needed) ââââââââââââââââââââ

function supabaseHeaders() {
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/** Supabase fetch with a hard 3-second timeout so it never blocks Gemini. */
async function sbFetch(url, options = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(tid);
    return res;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

/**
 * Fetch questions from the bank for a given subject/topic/difficulty.
 * Returns at most `limit` questions, ordered least-recently-used first.
 */
async function fetchFromBank(subject, topic, difficulty, limit) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return [];

  const diffFilter =
    difficulty === "mixed"
      ? ""
      : `&difficulty=eq.${encodeURIComponent(difficulty)}`;

  const url =
    `${base}/rest/v1/question_bank` +
    `?subject=eq.${encodeURIComponent(subject)}` +
    `&topic=eq.${encodeURIComponent(topic)}` +
    diffFilter +
    `&order=used_count.asc,last_used_at.asc.nullsfirst` +
    `&limit=${limit}` +
    `&select=id,type,question,options,explanation`;

  try {
    const res = await sbFetch(url, { headers: supabaseHeaders() });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Count questions available in the bank for a subject/topic/difficulty.
 */
async function countInBank(subject, topic, difficulty) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return 0;

  const diffFilter =
    difficulty === "mixed"
      ? ""
      : `&difficulty=eq.${encodeURIComponent(difficulty)}`;

  // Use limit=1 + count=exact â fastest way to get a count
  const url =
    `${base}/rest/v1/question_bank` +
    `?subject=eq.${encodeURIComponent(subject)}` +
    `&topic=eq.${encodeURIComponent(topic)}` +
    diffFilter +
    `&select=id&limit=1`;

  try {
    const res = await sbFetch(url, {
      headers: { ...supabaseHeaders(), Prefer: "count=exact" },
    });
    if (!res.ok) return 0;
    // Content-Range: 0-0/42 â total = 42
    const cr = res.headers.get("content-range");
    if (cr) {
      const total = parseInt(cr.split("/")[1], 10);
      return isNaN(total) ? 0 : total;
    }
    // Fallback: count the returned rows
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Mark questions as used (increment used_count, set last_used_at).
 * Uses sbFetch (3s timeout) to avoid keeping Edge function alive too long.
 */
async function markAsUsed(ids) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !ids.length) return;

  const idList = ids.map((id) => `"${id}"`).join(",");
  const url = `${base}/rest/v1/question_bank?id=in.(${idList})`;

  // We need the current used_count to increment â simplest approach: use
  // a separate RPC. For now, just update last_used_at so we rotate questions.
  await sbFetch(url, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ last_used_at: new Date().toISOString() }),
  }).catch(() => {});
}

/**
 * Save newly Gemini-generated questions to the bank for future use.
 * Uses sbFetch (3s timeout) to avoid keeping Edge function alive too long.
 */
async function saveToBank(questions, difficulty) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !questions.length) return;

  const rows = questions.map((q) => ({
    subject: q.sectionTitle || "General",
    topic: q.topicName || "General",
    difficulty: difficulty || "medium",
    type: q.type,
    question: q.question,
    options: q.options,
    explanation: q.explanation || null,
  }));

  await sbFetch(`${base}/rest/v1/question_bank`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  }).catch(() => {});
}

// ââ Main handler âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { sections, difficulty, testType } = body;

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return new Response(
        JSON.stringify({ error: "sections is required and must be a non-empty array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build full topic request list
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
      return new Response(
        JSON.stringify({ error: "No questions requested" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const totalQs = allTopicRequests.reduce((a, t) => a + t.mcqCount + t.saCount, 0);
    console.log(`Total questions requested: ${totalQs}`);

    // ââ STEP 1: Try to serve from question bank (all topics checked in parallel) â
    const bankQuestions = [];
    const geminiTopicRequests = [];
    const usedBankIds = [];
    const diff = difficulty || "medium";

    // Check all topic counts in parallel â max 3s per call, never blocks Gemini
    const counts = await Promise.all(
      allTopicRequests.map((t) => countInBank(t.subject, t.topicName, diff))
    );

    // Fetch bank rows for topics that have enough, also in parallel
    const fetchResults = await Promise.all(
      allTopicRequests.map((t, i) => {
        const needed = t.mcqCount + t.saCount;
        if (counts[i] >= needed) {
          return fetchFromBank(t.subject, t.topicName, diff, needed);
        }
        return Promise.resolve(null); // null = needs Gemini
      })
    );

    for (let i = 0; i < allTopicRequests.length; i++) {
      const t = allTopicRequests[i];
      const needed = t.mcqCount + t.saCount;
      const rows = fetchResults[i];

      if (rows && rows.length >= needed) {
        for (const row of rows) {
          bankQuestions.push({
            sectionTitle: t.subject,
            topicName: t.topicName,
            type: row.type,
            question: row.question,
            options: row.options,
            explanation: row.explanation || "",
            _bankId: row.id,
          });
          usedBankIds.push(row.id);
        }
        console.log(`Bank hit: ${t.subject}/${t.topicName} (${rows.length}q)`);
      } else {
        console.log(`Bank miss: ${t.subject}/${t.topicName} (have ${counts[i]}, need ${needed})`);
        geminiTopicRequests.push(t);
      }
    }

    // FIX: await markAsUsed so it completes within the Edge function's lifetime.
    // Uses sbFetch internally (3s timeout) so it won't hang.
    if (usedBankIds.length > 0) await markAsUsed(usedBankIds);

    // ââ STEP 2: Generate remaining topics with Gemini âââââââââââââââââââââââââ
    let geminiQuestions = [];
    const debugInfo = [];

    // Track exactly how many questions were requested from Gemini so we can
    // trim after validation (SA buffer may produce extras).
    const totalRequestedFromGemini = geminiTopicRequests.reduce(
      (a, t) => a + t.mcqCount + t.saCount, 0
    );

    if (geminiTopicRequests.length > 0) {
      // FIX: Reduced from 19000 â 17000 to leave ~3s budget for awaited saveToBank.
      // Bank checks used up to 3s, so Gemini gets 17s, saveToBank gets remaining ~3s.
      // Total: 3 (bank) + 17 (Gemini) + 3 (saveToBank) = 23s â safely under 25s limit.
      const GEMINI_DEADLINE = Date.now() + 17000;

      // Split into sub-batches of MAX 8 questions each, run all in parallel.
      // SA questions get a 25% buffer to cover integer-validation rejections.
      const MAX_QS_PER_CALL = 8;
      const SA_BUFFER = 1.25;
      const subBatches = [];

      for (const t of geminiTopicRequests) {
        // Inflate SA count so we still have enough after integer filtering
        const saBuffered = Math.ceil(t.saCount * SA_BUFFER);
        let remaining = { ...t, saCount: saBuffered };

        while (remaining.mcqCount + remaining.saCount > 0) {
          const used = Math.min(remaining.mcqCount + remaining.saCount, MAX_QS_PER_CALL);
          const mcq = Math.min(remaining.mcqCount, used);
          const sa = Math.min(used - mcq, remaining.saCount);
          subBatches.push({
            subject: t.subject,
            topics: [{ ...remaining, mcqCount: mcq, saCount: sa }],
            label: `${t.subject}/${t.topicName} (${mcq}MCQ+${sa}SA)`,
          });
          remaining = {
            ...remaining,
            mcqCount: remaining.mcqCount - mcq,
            saCount: remaining.saCount - sa,
          };
        }
      }

      console.log(`Running ${subBatches.length} parallel Gemini sub-batches (max ${MAX_QS_PER_CALL} Qs each)`);

      const batchResults = await Promise.allSettled(
        subBatches.map(async ({ subject, topics, label }) => {
          console.log(`Batch: ${label}`);
          const batchPrompt = buildPrompt(topics, difficulty);
          // Each call gets however much deadline is left, minimum 5s
          const batchTimeout = Math.max(5000, GEMINI_DEADLINE - Date.now());
          const geminiResponse = await callGemini(apiKey, batchPrompt, batchTimeout);

          if (geminiResponse.error) {
            return { subject, error: geminiResponse.error, questions: [] };
          }

          const parsed = parseGeminiResponse(geminiResponse.text);
          return {
            subject,
            questions: parsed || [],
            responseLength: geminiResponse.text?.length,
          };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          const { subject, questions, error, responseLength } = result.value;
          debugInfo.push({ subject, parsed: questions.length, error: error || null, responseLength });
          geminiQuestions = [...geminiQuestions, ...questions];
        } else {
          debugInfo.push({ error: result.reason?.message || "Promise rejected" });
        }
      }

      // FIX: await saveToBank so it completes within the Edge function's lifetime.
      // Uses sbFetch internally (3s timeout) so it won't hang.
      // Saves ALL valid questions (including buffer extras) to the bank before trimming.
      if (geminiQuestions.length > 0) {
        await saveToBank(geminiQuestions, difficulty || "medium");
      }

      // Trim back to exactly what the user requested â buffer extras go to bank only
      if (geminiQuestions.length > totalRequestedFromGemini) {
        console.log(`Trimming ${geminiQuestions.length} â ${totalRequestedFromGemini} (buffer extras saved to bank)`);
        geminiQuestions = geminiQuestions.slice(0, totalRequestedFromGemini);
      }
    }

    // ââ STEP 3: Merge bank + Gemini questions âââââââââââââââââââââââââââââââââ
    const allParsed = [...bankQuestions, ...geminiQuestions];

    if (allParsed.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Could not generate questions â Gemini failed and bank is empty for these topics",
          debug: debugInfo,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const allGeneratedQuestions = allParsed.map((q, idx) => {
      const { _bankId, ...clean } = q;
      return { ...clean, tempId: `gen_${Date.now()}_${idx}` };
    });

    const bankCount = bankQuestions.length;
    const geminiCount = geminiQuestions.length;

    return new Response(
      JSON.stringify({
        success: true,
        questions: allGeneratedQuestions,
        totalGenerated: allGeneratedQuestions.length,
        source: bankCount > 0 && geminiCount === 0
          ? "bank"
          : bankCount > 0
          ? "mixed"
          : "gemini",
        bankHits: bankCount,
        geminiGenerated: geminiCount,
        debug: debugInfo,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ââ Prompt builder ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function buildPrompt(topicRequests, difficulty) {
  const difficultyDesc = {
    easy: "EASY â straightforward single-concept, 1-2 step problems",
    medium: "MEDIUM â IPMAT/JIPMAT level, multi-step, 2-3 concepts",
    hard: "HARD â IIM-level, multi-concept integration, 3-4 steps",
    mixed: "MIXED â 25% easy, 50% medium, 25% hard",
  };

  let topicBreakdown = "";
  let totalMcq = 0;
  let totalSa = 0;

  for (const t of topicRequests) {
    topicBreakdown += `\n- Subject: "${t.subject}", Topic: "${t.topicName}", MCQ: ${t.mcqCount}, SA: ${t.saCount}`;
    totalMcq += t.mcqCount;
    totalSa += t.saCount;
  }

  return `You are an expert question setter for IPMAT (IIM Indore/Rohtak), JIPMAT, and IIM Kozhikode BMS exams.

Generate exactly ${totalMcq + totalSa} exam-quality questions. Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.medium}

Topics:${topicBreakdown}

âââ CRITICAL FORMATTING RULES âââ
1. Return ONLY a valid JSON array. Zero text before or after. No markdown, no code fences.
2. NO LATEX EVER. Not \\frac{}, not \\sqrt{}, not $...$, not \\(...\\), not \\[...\\]. ZERO.
 Plain-text math rules:
 â¢ Fractions â write as "3/4" or "(a+b)/(c+d)"
 â¢ Square root â write as "ân" or "sqrt(n)"
 â¢ Powers â write as "xÂ²" or "x^2"
 â¢ Subscripts â write as "a1", "b2"
 â¢ Summation â write as "sum of" in words
 â¢ Greek letters â Ï, Î±, Î², Î¸ (use the Unicode symbol directly)
3. Wrap question text in <p> tags. Keep it clean HTML.
4. MCQ: exactly 4 options (A B C D), exactly 1 correct (isCorrect:true). 3 plausible wrong options.
5. SA answer MUST be a positive whole-number integer (e.g. 42, 100, 7). Never a decimal or fraction.
 Design the question so the arithmetic works out to a clean integer.
6. Explanation: max 3 sentences showing key steps in plain text (no LaTeX).
7. sectionTitle and topicName must match exactly as given above.
8. Questions must be genuinely exam-quality â NOT trivial textbook definitions.

MCQ format: {"sectionTitle":"...","topicName":"...","type":"options","question":"<p>...</p>","options":[{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],"explanation":"..."}

SA format: {"sectionTitle":"...","topicName":"...","type":"input","question":"<p>...</p>","options":{"answer":"42"},"explanation":"..."}

[`;
}

// ââ Gemini caller âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function callGemini(apiKey, prompt, timeoutMs = 15000) {
  if (!apiKey) {
    return { error: "GEMINI_API_KEY not configured" };
  }

  // Only models confirmed available for new users (Apr 2026)
  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

  const errors = [];

  for (const model of models) {
    try {
      console.log(`Trying model: ${model} (timeout: ${timeoutMs}ms)`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.text();
        const msg = `${model} ${response.status}: ${errBody.substring(0, 200)}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      const data = await response.json();

      let text = null;
      if (data.candidates && data.candidates[0]) {
        const parts = data.candidates[0].content?.parts || [];
        // Get the last text part that looks like JSON (handles thinking models)
        for (let i = parts.length - 1; i >= 0; i--) {
          if (
            parts[i].text &&
            (parts[i].text.includes('"sectionTitle"') || parts[i].text.includes('"type"'))
          ) {
            text = parts[i].text;
            break;
          }
        }
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
        errors.push(`${model} returned empty response`);
        continue;
      }

      console.log(`Success with ${model}, length: ${text.length}`);
      return { text };
    } catch (err) {
      const msg =
        err.name === "AbortError"
          ? `${model} timed out after ${timeoutMs}ms`
          : `${model} error: ${err.message}`;
      console.log(msg);
      errors.push(msg);
    }
  }

  return { error: "All Gemini models failed: " + errors.join(" | ") };
}

// ââ Response parser âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function parseGeminiResponse(text) {
  if (!text) return null;

  let cleaned = text.trim();

  if (!cleaned.startsWith("[")) {
    if (cleaned.startsWith("{") || cleaned.startsWith("\n{")) {
      cleaned = "[" + cleaned;
    }
  }

  const lastBracket = cleaned.lastIndexOf("]");
  if (lastBracket > 0) {
    cleaned = cleaned.substring(0, lastBracket + 1);
  }

  // Strategy 1: Direct parse
  try {
    const questions = JSON.parse(cleaned);
    if (Array.isArray(questions)) {
      const validated = validateQuestions(questions);
      if (validated.length > 0) return validated;
    }
  } catch (e) {}

  // Strategy 2: Extract from code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\[\s\S]*?)\```/);
  if (codeBlockMatch) {
    try {
      const questions = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(questions)) {
        const validated = validateQuestions(questions);
        if (validated.length > 0) return validated;
      }
    } catch (e) {}
  }

  // Strategy 3: Find the largest JSON array
  const arrayMatch = text.match(/\[\[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const questions = JSON.parse(arrayMatch[0]);
      if (Array.isArray(questions)) {
        const validated = validateQuestions(questions);
        if (validated.length > 0) return validated;
      }
    } catch (e) {
      // Strategy 4: Truncation recovery
      const jsonStr = arrayMatch[0];
      let lastGood = jsonStr.lastIndexOf("},");
      if (lastGood < 0) lastGood = jsonStr.lastIndexOf("}]");
      if (lastGood > 0) {
        try {
          const questions = JSON.parse(jsonStr.substring(0, lastGood + 1) + "]");
          if (Array.isArray(questions)) {
            const validated = validateQuestions(questions);
            if (validated.length > 0) return validated;
          }
        } catch (e2) {}
      }
    }
  }

  return null;
}

function validateQuestions(questions) {
  return questions
    .filter((q) => {
      if (!q.type || !q.question) return false;
      if (q.type === "options") {
        if (!Array.isArray(q.options) || q.options.length < 2) return false;
        if (!q.options.some((o) => o.isCorrect === true || o.isCorrect === "true")) return false;
      }
      if (q.type === "input") {
        if (!q.options || typeof q.options.answer === "undefined") return false;
        // Answer must be a whole number â reject decimals/fractions
        const ans = String(q.options.answer).trim();
        const num = Number(ans);
        if (isNaN(num) || !Number.isInteger(num)) return false;
      }
      return true;
    })
    .map((q) => ({
      sectionTitle: q.sectionTitle || "General",
      topicName: q.topicName || "General",
      type: q.type,
      question: q.question,
      // Ensure SA answer is stored as a clean integer string
      options: q.type === "input"
        ? { answer: String(Math.round(Number(q.options.answer))) }
        : q.options,
      explanation: q.explanation || "",
    }));
}
