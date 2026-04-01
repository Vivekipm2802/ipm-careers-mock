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

    // Build ONE combined prompt for ALL sections and topics to minimize API calls
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

    const prompt = buildCombinedPrompt(allTopicRequests, difficulty, testType);

    // Call Gemini with retry logic for rate limits
    const geminiResponse = await callGeminiWithRetry(apiKey, prompt, 3);

    if (geminiResponse.error) {
      console.error("Gemini error:", geminiResponse.error);
      return res.status(500).json({
        error: "Failed to generate questions",
        details: geminiResponse.error,
      });
    }

    const parsed = parseGeminiResponse(geminiResponse.text);

    if (!parsed || parsed.length === 0) {
      console.error("No questions parsed from Gemini response");
      return res.status(500).json({
        error: "Could not parse generated questions from AI response",
      });
    }

    // Add tempId and metadata
    const allGeneratedQuestions = parsed.map((q, idx) => ({
      ...q,
      tempId: `gen_${Date.now()}_${idx}`,
    }));

    return res.status(200).json({
      success: true,
      questions: allGeneratedQuestions,
      totalGenerated: allGeneratedQuestions.length,
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

  const testTypeDesc = {
    concept: "a concept-focused practice test",
    sectional: "a sectional test for exam preparation",
    fullmock: "a full-length mock simulating real IPMAT exam style",
  };

  // Build per-topic breakdown
  let topicBreakdown = "";
  let totalMcq = 0;
  let totalSa = 0;

  for (const t of topicRequests) {
    topicBreakdown += `\n- Subject: "${t.subject}", Topic: "${t.topicName}", MCQ: ${t.mcqCount}, SA: ${t.saCount}`;
    totalMcq += t.mcqCount;
    totalSa += t.saCount;
  }

  return `You are an expert question paper setter for IPMAT (Integrated Program in Management Aptitude Test) and similar Indian management entrance exams.

Generate questions for ${testTypeDesc[testType] || testTypeDesc.concept}.
Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.medium}

Questions needed per topic:${topicBreakdown}

Total: ${totalMcq} MCQ + ${totalSa} Short Answer = ${totalMcq + totalSa} questions

RULES:
1. Each question must be unique, well-formed, and mathematically/factually correct
2. MCQ: exactly 4 options, exactly 1 correct answer
3. Short Answer (SA): answer must be a single number or short text (max 10 chars)
4. Include a brief explanation for each question
5. Use clean HTML for question text (<p>, <br>, <strong> tags)
6. For math: use text notation like x^2, sqrt(x), etc.
7. Each question MUST have "sectionTitle" matching the Subject and "topicName" matching the Topic exactly as given above

OUTPUT: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.

Each object must have these exact fields:
{
  "sectionTitle": "exact subject name from above",
  "topicName": "exact topic name from above",
  "type": "options" or "input",
  "question": "<p>Question HTML</p>",
  "options": [{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],
  "explanation": "Brief explanation"
}

For SA questions, use: "options": {"answer": "5"}

Return the JSON array now:`;
}

async function callGeminiWithRetry(apiKey, prompt, maxRetries) {
  // Try multiple model names in case one is deprecated or unavailable
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  for (const model of models) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt} for ${model}, waiting ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      try {
        console.log(`Trying model: ${model}, attempt ${attempt + 1}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 16384,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.status === 429) {
          lastError = `Rate limited (429) on ${model}`;
          console.log(lastError);
          continue; // Retry same model
        }

        if (response.status === 404) {
          console.log(`Model ${model} not found (404), trying next model...`);
          break; // Try next model
        }

        if (!response.ok) {
          const errorText = await response.text();
          lastError = `${model} returned ${response.status}: ${errorText}`;
          console.log(lastError);
          break; // Try next model for non-retryable errors
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
          lastError = `No candidates from ${model}`;
          break; // Try next model
        }

        const text = data.candidates[0].content?.parts?.[0]?.text;
        if (!text) {
          lastError = `Empty response from ${model}`;
          break; // Try next model
        }

        console.log(`Success with model: ${model}`);
        return { text };
      } catch (err) {
        lastError = `Fetch error on ${model}: ${err.message}`;
        if (attempt < maxRetries) continue;
      }
    }
  }

  return { error: "All models and retries failed. Please check your Gemini API key and billing." };
}

function parseGeminiResponse(text) {
  try {
    let questions = JSON.parse(text);
    if (!Array.isArray(questions)) questions = [questions];
    return validateQuestions(questions);
  } catch (e) {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        let questions = JSON.parse(jsonMatch[1].trim());
        if (!Array.isArray(questions)) questions = [questions];
        return validateQuestions(questions);
      } catch (e2) {}
    }

    // Try finding array brackets
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        let questions = JSON.parse(arrayMatch[0]);
        if (!Array.isArray(questions)) questions = [questions];
        return validateQuestions(questions);
      } catch (e3) {}
    }

    console.error("Could not parse Gemini response:", text.substring(0, 500));
    return null;
  }
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
