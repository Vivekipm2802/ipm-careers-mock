// Edge Runtime gives 30s timeout on Hobby plan (vs 10s for serverless)
export const config = {
  runtime: "edge",
};

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
      return new Response(JSON.stringify({ error: "sections is required and must be a non-empty array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "No questions requested" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const totalQs = allTopicRequests.reduce((a, t) => a + t.mcqCount + t.saCount, 0);
    console.log(`Total questions requested: ${totalQs}`);

    let allParsed = [];
    const debugInfo = [];

    // Split into per-subject batches and run in parallel
    const subjectGroups = {};
    for (const t of allTopicRequests) {
      if (!subjectGroups[t.subject]) subjectGroups[t.subject] = [];
      subjectGroups[t.subject].push(t);
    }

    const batchEntries = Object.entries(subjectGroups);

    const batchResults = await Promise.allSettled(
      batchEntries.map(async ([subject, topics]) => {
        const batchQs = topics.reduce((a, t) => a + t.mcqCount + t.saCount, 0);
        console.log(`Batch: ${subject} (${batchQs} Qs)`);

        const batchPrompt = buildPrompt(topics, difficulty);
        const geminiResponse = await callGemini(apiKey, batchPrompt);

        if (geminiResponse.error) {
          return { subject, error: geminiResponse.error, questions: [] };
        }

        const parsed = parseGeminiResponse(geminiResponse.text);
        return { subject, questions: parsed || [], responseLength: geminiResponse.text?.length };
      })
    );

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
      return new Response(JSON.stringify({
        error: "Could not parse generated questions from AI response",
        debug: debugInfo,
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allGeneratedQuestions = allParsed.map((q, idx) => ({
      ...q,
      tempId: `gen_${Date.now()}_${idx}`,
    }));

    return new Response(JSON.stringify({
      success: true,
      questions: allGeneratedQuestions,
      totalGenerated: allGeneratedQuestions.length,
      debug: debugInfo,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function buildPrompt(topicRequests, difficulty) {
  const difficultyDesc = {
    easy: "EASY — straightforward single-concept, 1-2 step problems",
    medium: "MEDIUM — IPMAT/JIPMAT level, multi-step, 2-3 concepts",
    hard: "HARD — IIM-level, multi-concept integration, 3-4 steps",
    mixed: "MIXED — 25% easy, 50% medium, 25% hard",
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

RULES:
1. Return ONLY a valid JSON array — no markdown, no code fences, no text before/after.
2. MCQ: 4 options (A/B/C/D), exactly 1 correct (isCorrect:true). Make distractors plausible.
3. SA: numeric answer only (integer or simple decimal). Student types it in.
4. Explanation: 2 sentences max showing key steps.
5. Wrap question in <p> tags. Math in plain text (x² not LaTeX).
6. sectionTitle and topicName must match exactly as given above.
7. Questions must be multi-step, IPMAT-level — NOT textbook basics.

MCQ format: {"sectionTitle":"...","topicName":"...","type":"options","question":"<p>...</p>","options":[{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],"explanation":"..."}

SA format: {"sectionTitle":"...","topicName":"...","type":"input","question":"<p>...</p>","options":{"answer":"42"},"explanation":"..."}

[`;
}

async function callGemini(apiKey, prompt) {
  if (!apiKey) {
    return { error: "GEMINI_API_KEY not configured" };
  }

  // Only models confirmed available for new users (Apr 2026)
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-pro-latest"];

  const errors = [];

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      // 25s timeout — safe within Edge Runtime's 30s limit
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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
          if (parts[i].text && (parts[i].text.includes('"sectionTitle"') || parts[i].text.includes('"type"'))) {
            text = parts[i].text;
            break;
          }
        }
        if (!text) {
          for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].text) { text = parts[i].text; break; }
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
      const msg = err.name === "AbortError"
        ? `${model} timed out after 25s`
        : `${model} error: ${err.message}`;
      console.log(msg);
      errors.push(msg);
    }
  }

  return { error: "All Gemini models failed: " + errors.join(" | ") };
}

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
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
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
  const arrayMatch = text.match(/\[[\s\S]*\]/);
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
