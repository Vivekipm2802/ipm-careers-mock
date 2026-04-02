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

  return `You are an expert question setter for IPMAT (IIM Indore/Rohtak), JIPMAT, and IIM Kozhikode BMS exams.

Generate exactly ${totalMcq + totalSa} exam-quality questions. Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.medium}

Topics:${topicBreakdown}

RULES:
1. Return ONLY a valid JSON array — no markdown, no code fences, no text before/after.
2. MCQ: 4 options (A/B/C/D), exactly 1 correct (isCorrect:true). Make distractors plausible (common mistake answers).
3. SA: numeric answer only (integer or simple decimal). Student types it in.
4. Explanation: 2 sentences max showing key steps.
5. Wrap question in <p> tags. Math in plain text (x² not LaTeX).
6. sectionTitle and topicName must match exactly as given above.
7. Questions must be multi-step, IPMAT-level difficulty — NOT textbook basics.

MCQ format: {"sectionTitle":"...","topicName":"...","type":"options","question":"<p>...</p>","options":[{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],"explanation":"..."}

SA format: {"sectionTitle":"...","topicName":"...","type":"input","question":"<p>...</p>","options":{"answer":"42"},"explanation":"..."}

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
      // Abort after 8.5s so we return proper JSON before Vercel's 10s hard kill
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);

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
      if (err.name === "AbortError") {
        const msg = `${model} timed out after 8.5s`;
        console.log(msg);
        errors.push(msg);
      } else {
        console.log(`Fetch error on ${model}: ${err.message}`);
        errors.push(`${model} fetch error: ${err.message}`);
      }
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
