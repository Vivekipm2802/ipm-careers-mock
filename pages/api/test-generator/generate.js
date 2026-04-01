import { serversupabase } from "../../../utils/supabaseClient";

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

    const allGeneratedQuestions = [];

    for (const section of sections) {
      const { subjectTitle, topics } = section;

      for (const topic of topics || []) {
        const { topicName, mcqCount, saCount } = topic;
        const totalQ = (mcqCount || 0) + (saCount || 0);
        if (totalQ === 0) continue;

        const prompt = buildPrompt({
          subject: subjectTitle,
          topic: topicName,
          mcqCount: mcqCount || 0,
          saCount: saCount || 0,
          difficulty: difficulty || "medium",
          testType: testType || "concept",
        });

        const geminiResponse = await callGemini(apiKey, prompt);

        if (geminiResponse.error) {
          console.error(`Gemini error for ${topicName}:`, geminiResponse.error);
          return res.status(500).json({
            error: `Failed to generate questions for topic: ${topicName}`,
            details: geminiResponse.error,
          });
        }

        const parsed = parseGeminiResponse(geminiResponse.text);

        if (!parsed || parsed.length === 0) {
          console.error(`No questions parsed for ${topicName}`);
          return res.status(500).json({
            error: `Could not parse generated questions for topic: ${topicName}`,
          });
        }

        allGeneratedQuestions.push(
          ...parsed.map((q, idx) => ({
            ...q,
            sectionTitle: subjectTitle,
            topicName: topicName,
            tempId: `gen_${Date.now()}_${allGeneratedQuestions.length + idx}`,
          }))
        );
      }
    }

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

function buildPrompt({ subject, topic, mcqCount, saCount, difficulty, testType }) {
  const difficultyDesc = {
    easy: "easy level, suitable for beginners. Questions should test basic understanding and direct application of concepts.",
    medium: "medium difficulty, suitable for intermediate students preparing for competitive exams like IPMAT. Questions should require application of concepts with moderate complexity.",
    hard: "hard difficulty, suitable for advanced students. Questions should be tricky, involve multiple concepts, and require deep problem-solving skills.",
    mixed: "a mix of easy (30%), medium (40%), and hard (30%) difficulty levels.",
  };

  const testTypeDesc = {
    concept: "a concept-focused test that deeply tests understanding of this specific topic",
    sectional: "a sectional test covering this topic as part of a broader exam section",
    fullmock: "a full-length mock test question set that simulates real IPMAT exam difficulty and style",
  };

  let prompt = `You are an expert question paper setter for IPMAT (Integrated Program in Management Aptitude Test) and similar management entrance exams in India.

Generate questions for:
- Subject: ${subject}
- Topic: ${topic}
- Difficulty: ${difficultyDesc[difficulty] || difficultyDesc.medium}
- Context: This is ${testTypeDesc[testType] || testTypeDesc.concept}

IMPORTANT RULES:
1. Each question must be unique, well-formed, and error-free
2. For MCQ questions, provide exactly 4 options with exactly 1 correct answer
3. For Short Answer (SA) questions, the answer must be a single number or short text (max 10 characters)
4. Include a brief explanation for each question
5. Questions should be at the level of IPMAT, CAT, or similar Indian management entrance exams
6. Use clean HTML formatting for questions (use <p>, <br>, <strong>, <em> tags where needed)
7. For math expressions, use simple text notation (e.g., x^2 for x squared, sqrt(x) for square root)

`;

  if (mcqCount > 0) {
    prompt += `
Generate ${mcqCount} MCQ questions. For each MCQ, output in this EXACT JSON format:
{
  "type": "options",
  "question": "<p>Question text here in HTML</p>",
  "options": [
    {"title": "A", "text": "First option text", "isCorrect": false},
    {"title": "B", "text": "Second option text", "isCorrect": true},
    {"title": "C", "text": "Third option text", "isCorrect": false},
    {"title": "D", "text": "Fourth option text", "isCorrect": false}
  ],
  "explanation": "Brief explanation of the correct answer"
}
`;
  }

  if (saCount > 0) {
    prompt += `
Generate ${saCount} Short Answer questions. For each SA question, output in this EXACT JSON format:
{
  "type": "input",
  "question": "<p>Question text here in HTML</p>",
  "options": {"answer": "correct_answer"},
  "explanation": "Brief explanation of the correct answer"
}
`;
  }

  prompt += `
OUTPUT FORMAT: Return ONLY a valid JSON array containing all ${mcqCount + saCount} question objects. No markdown code blocks, no extra text before or after. Just the JSON array starting with [ and ending with ].

Example output:
[
  {"type": "options", "question": "<p>What is 15% of 200?</p>", "options": [{"title": "A", "text": "25", "isCorrect": false}, {"title": "B", "text": "30", "isCorrect": true}, {"title": "C", "text": "35", "isCorrect": false}, {"title": "D", "text": "40", "isCorrect": false}], "explanation": "15% of 200 = (15/100) × 200 = 30"},
  {"type": "input", "question": "<p>If 3x + 7 = 22, find the value of x.</p>", "options": {"answer": "5"}, "explanation": "3x = 22 - 7 = 15, so x = 5"}
]`;

  return prompt;
}

async function callGemini(apiKey, prompt) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Gemini API returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      return { error: "No response candidates from Gemini" };
    }

    const text = data.candidates[0].content?.parts?.[0]?.text;
    if (!text) {
      return { error: "Empty text in Gemini response" };
    }

    return { text };
  } catch (err) {
    return { error: `Fetch error: ${err.message}` };
  }
}

function parseGeminiResponse(text) {
  try {
    // Try direct JSON parse first
    let questions = JSON.parse(text);
    if (!Array.isArray(questions)) {
      questions = [questions];
    }
    return validateQuestions(questions);
  } catch (e) {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        let questions = JSON.parse(jsonMatch[1].trim());
        if (!Array.isArray(questions)) questions = [questions];
        return validateQuestions(questions);
      } catch (e2) {
        console.error("Failed to parse extracted JSON:", e2);
      }
    }

    // Try finding array brackets
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        let questions = JSON.parse(arrayMatch[0]);
        if (!Array.isArray(questions)) questions = [questions];
        return validateQuestions(questions);
      } catch (e3) {
        console.error("Failed to parse array JSON:", e3);
      }
    }

    console.error("Could not parse Gemini response at all:", text.substring(0, 500));
    return null;
  }
}

function validateQuestions(questions) {
  return questions
    .filter((q) => {
      if (!q.type || !q.question) return false;
      if (q.type === "options") {
        if (!Array.isArray(q.options) || q.options.length < 2) return false;
        const hasCorrect = q.options.some((o) => o.isCorrect === true);
        if (!hasCorrect) return false;
      }
      if (q.type === "input") {
        if (!q.options || typeof q.options.answer === "undefined") return false;
      }
      return true;
    })
    .map((q) => ({
      type: q.type,
      question: q.question,
      options: q.options,
      explanation: q.explanation || "",
    }));
}
