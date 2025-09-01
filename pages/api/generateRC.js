import { serversupabase } from "@/utils/supabaseClient";

/**
 * Maps an answer like "A"/"B"/"C"/"D" or "1"/"2"/"3"/"4" to zero-based index.
 * Falls back to trying to find the answer text inside options.
 */
function mapAnswerToIndex(answer, options) {
  if (answer == null) return null;
  const a = String(answer).trim();
  const letterMap = { A: 0, B: 1, C: 2, D: 3 };
  if (a.toUpperCase() in letterMap) return letterMap[a.toUpperCase()];
  const num = Number(a);
  if (!Number.isNaN(num)) {
    const idx = num - 1;
    if (idx >= 0 && idx < options.length) return idx;
  }
  // try match by text
  const found = options.findIndex((opt) => {
    if (typeof opt !== "string") return false;
    return opt.trim().toLowerCase() === a.trim().toLowerCase();
  });
  return found >= 0 ? found : null;
}

function buildSolutionHTML(questions) {
  try {
    const blocks = questions.map((q, i) => {
      const opts =
        Array.isArray(q.options) && q.options.length
          ? q.options
              .map((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                return `<li><strong>${letter}.</strong> ${opt}</li>`;
              })
              .join("")
          : "";
      const answerLetter =
        typeof q.answerIndex === "number"
          ? String.fromCharCode(65 + q.answerIndex)
          : q.answer || "";
      const expl = q.explanation || "";
      return `
        <div style="margin-bottom:12px;">
          <div><strong>Q${i + 1}.</strong> ${q.question || ""}</div>
          <ol type="A" style="margin: 6px 0 6px 20px;">${opts}</ol>
          <div><strong>Answer:</strong> ${answerLetter}</div>
          <div><strong>Explanation:</strong> ${expl}</div>
        </div>
      `;
    });
    return `<div>${blocks.join("")}</div>`;
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ success: false, message: "OpenAI API key not configured" });
  }

  try {
    // Generate a Reading Comprehension (RC) using OpenAI
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                'You are a helpful assistant that generates a Reading Comprehension (RC) quiz for students. Respond in JSON with the following structure: {"passage": "...", "questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}]}. The passage should be a minimum of 300 words (at least 300 words), and there should be 3-5 questions. Each question must have 4 options, one correct answer, and a brief explanation.',
            },
            {
              role: "user",
              content:
                'Generate a Reading Comprehension (RC) quiz with a passage of at least 300 words. Respond in JSON: {"passage": "...", "questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}]}',
            },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      return res.status(500).json({
        success: false,
        message: "OpenAI API error",
        error: errorText,
      });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    let rcObj;
    try {
      rcObj = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: "Failed to parse OpenAI response",
        raw: content,
      });
    }

    const { passage, questions } = rcObj || {};
    if (
      !passage ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(500).json({
        success: false,
        message: "OpenAI response missing passage or questions",
        raw: content,
      });
    }

    const normalizedQuestions = questions.map((q) => {
      const opts = Array.isArray(q.options) ? q.options : [];
      const answerIndex = mapAnswerToIndex(q.answer, opts);
      return {
        question: q.question || "",
        options: opts,
        answer: q.answer ?? null,
        explanation: q.explanation || "",
        answerIndex,
      };
    });

    const correctIndices = normalizedQuestions.map((q) =>
      typeof q.answerIndex === "number" ? q.answerIndex : null
    );

    const solutionHTML = buildSolutionHTML(normalizedQuestions);

    const { data: keyRows, error: keyErr } = await serversupabase
      .from("daily_rc_keys")
      .insert([
        {
          correct: JSON.stringify(correctIndices),
          solution: solutionHTML,
        },
      ])
      .select("uid")
      .limit(1);

    if (keyErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to create answer key",
        error: keyErr.message,
      });
    }

    const answerKeyUid = keyRows?.[0]?.uid;
    if (!answerKeyUid) {
      return res.status(500).json({
        success: false,
        message: "Answer key UID not returned",
      });
    }

    const { data, error } = await serversupabase
      .from("daily_rc")
      .insert([
        {
          content: passage,
          options: questions,
          answer_key: answerKeyUid,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting RC:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save RC to database",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Generated RC Successfully",
      rc: data?.[0],
    });
  } catch (error) {
    console.error("Error generating RC:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
