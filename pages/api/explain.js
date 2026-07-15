// ============================================================
// /api/explain — server-side Gemini proxy for AI Doubts.
// The API key lives only in Vercel env (GEMINI_API_KEY), never
// in the browser. Client sends the question context; we return
// a short Hinglish explanation.
// ============================================================

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const { question, options, correct, picked } = req.body || {};
  if (!question || typeof question !== "string" || question.length > 6000) {
    return res.status(400).json({ error: "bad question" });
  }

  const prompt = [
    "You are a friendly IPMAT coach at IPM Careers explaining to a Class 11/12 student.",
    "Explain in simple Hinglish (Hindi-English mix, Roman script) why the correct answer is what it is.",
    "Structure: 1) one-line seedha jawab, 2) step-by-step solution in 3-6 short lines, 3) one 'yaad rakhne wali baat' (the trap or shortcut).",
    "Keep it under 180 words. No markdown headings, no LaTeX — plain text, simple language.",
    "",
    `QUESTION (may contain HTML, ignore tags): ${question}`,
    options ? `OPTIONS: ${options}` : "",
    correct ? `CORRECT ANSWER: ${correct}` : "",
    picked ? `STUDENT PICKED (wrong): ${picked}` : "",
  ].join("\n");

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
        }),
      }
    );
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!r.ok || !text) {
      // never pass upstream error text through — it can contain the key
      console.error("gemini error:", j?.error?.status, j?.error?.message?.slice(0, 80));
      return res.status(502).json({ error: "no explanation generated" });
    }
    return res.status(200).json({ explanation: text.trim() });
  } catch (e) {
    return res.status(502).json({ error: "gemini unreachable" });
  }
}
