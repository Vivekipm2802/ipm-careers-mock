import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ success: false, message: "OpenAI API key not configured" });
  }

  try {
    // 1. Generate a random English word and its meaning using OpenAI
    // 2. Check if the word already exists in the database. If it does, retry.
    const MAX_ATTEMPTS = 10;
    let wordObj = null;
    let word = null;
    let meaning = null;
    let foundUnique = false;
    let lastContent = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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
                  'You are a helpful assistant that generates a random English word and its meaning. Respond in JSON: {"word": "...", "meaning": "..."}',
              },
              {
                role: "user",
                content:
                  'Generate a random English word and its meaning. Respond in JSON: {"word": "...", "meaning": "..."}',
              },
            ],
            max_tokens: 100,
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
      lastContent = content;

      try {
        wordObj = JSON.parse(content);
      } catch (e) {
        continue; // Try again if parsing fails
      }

      word = wordObj.word;
      meaning = wordObj.meaning;

      if (!word || !meaning) {
        continue; // Try again if missing data
      }

      // Check if the word already exists in the database
      const { data: existing, error: checkError } = await serversupabase
        .from("word_of_the_day")
        .select("id")
        .eq("word", word)
        .limit(1);

      if (checkError) {
        // If there's a DB error, abort
        return res.status(500).json({
          success: false,
          message: "Database error while checking for existing word",
          error: checkError.message,
        });
      }

      if (!existing || existing.length === 0) {
        foundUnique = true;
        break;
      }
      // else: word exists, try again
    }

    if (!foundUnique) {
      return res.status(500).json({
        success: false,
        message: `Failed to generate a unique word after ${MAX_ATTEMPTS} attempts.`,
        lastTried: lastContent,
      });
    }

    // 3. Insert into Supabase
    // Find the latest date in the table, and set the new word's date to the next day
    const { data: latest, error: latestError } = await serversupabase
      .from("word_of_the_day")
      .select("date")
      .order("date", { ascending: false })
      .limit(1);

    let nextDate;
    if (latestError) {
      // fallback: today
      nextDate = new Date();
    } else if (latest && latest.length > 0) {
      const lastDate = new Date(latest[0].date);
      lastDate.setDate(lastDate.getDate() + 1);
      nextDate = lastDate;
    } else {
      nextDate = new Date();
    }
    const dateStr = nextDate.toISOString().split("T")[0];

    const { data: insertData, error: insertError } = await serversupabase
      .from("word_of_the_day")
      .insert([{ word, meaning, date: dateStr }])
      .select();

    if (insertError) {
      return res.status(500).json({
        success: false,
        message: "Failed to insert word into database",
        error: insertError.message,
      });
    }

    return res.status(200).json({ success: true, word: insertData[0] });
  } catch (error) {
    console.error("Error generating word:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
