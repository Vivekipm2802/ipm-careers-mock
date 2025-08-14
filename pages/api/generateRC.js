import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ success: false, message: "OpenAI API key not configured" });
  }

  try {
    // 1. Generate a Reading Comprehension (RC) using OpenAI
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
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
          max_tokens: 800,
          temperature: 0.8,
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

    const { passage, questions } = rcObj;
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

    // Insert the generated RC into daily_rc_quiz
    const { data, error } = await serversupabase
      .from("daily_rc")
      .insert([{ content: passage, options: questions }])
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
      rc: data[0],
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
