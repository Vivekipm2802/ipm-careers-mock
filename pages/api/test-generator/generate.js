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
    easy: "easy level, suitable for beginners",
    medium: "medium difficulty for IPMAT/CAT level competitive exams",
    hard: "hard difficulty with tricky multi-concept problems",
    mixed: "a mix of easy (30%), medium (40%), and hard (30%)",
  };

  let topicBreakdown = "";
  let totalMcq = 0;
  let totalSa = 0;

  for (const t of topicRequests) {
    topicBreakdown += `\n- Subject: "${t.subject}", Topic: "${t.topicName}", MCQ: ${t.mcqCount}, SA: ${t.saCount}`;
    totalMcq += t.mcqCount;
    totalSa += t.saCount;
  }

  return `You are an expert question paper setter for IPMAT and similar Indian management entrance exams.

Generate exactly ${totalMcq + totalSa} questions. Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.medium}

Questions needed:${topicBreakdown}

Total: ${totalMcq} MCQ + ${totalSa} SA = ${totalMcq + totalSa} questions

IMPORTANT RULES:
1. Return ONLY a JSON array — no markdown, no code fences, no explanation text before or after
2. MCQ: exactly 4 options, exactly 1 correct (isCorrect: true)
3. SA: answer must be a number or short text
4. Keep explanations brief (1-2 sentences)
5. Use simple HTML for questions (<p> tags)
6. Each question MUST include "sectionTitle" and "topicName" matching EXACTLY as given above

JSON format for MCQ:
{"sectionTitle":"...","topicName":"...","type":"options","question":"<p>...</p>","options":[{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],"explanation":"..."}

JSON format for SA:
{"sectionTitle":"...","topicName":"...","type":"input","question":"<p>...</p>","options":{"answer":"42"},"explanation":"..."}

[`;
}

async function callGemini(apiKey, prompt) {
  // Try models in order of preference
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];

  for (const model of models) {
    try {
      console.log(`Calling model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 32768,
            },
          }),
        }
      );

      if (response.status === 429) {
        console.log(`Rate limited on ${model}, trying next...`);
        continue;
      }

      if (response.status === 404) {
        console.log(`Model ${model} not found, trying next...`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`${model} error ${response.status}: ${errorText.substring(0, 200)}`);
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

  return { error: "All Gemini models failed" };
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
