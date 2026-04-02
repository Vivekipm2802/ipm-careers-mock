/**
 * POST /api/question-bank/generate-bulk
 *
 * Generates questions with Gemini and saves directly to question_bank.
 * Called from the admin Question Bank page.
 *
 * Body:
 * {
 *   subject:    "Quantitative Ability",
 *   topic:      "Percentages",
 *   subtopic:   "Successive Discounts",   // optional
 *   difficulty: "medium",                  // easy | medium | hard | mixed
 *   mcqCount:   20,
 *   saCount:    10,
 *   examTags:   ["IPMAT_Indore","JIPMAT"] // optional, defaults to all
 * }
 *
 * Returns: { saved, failed, questions[] }
 */

export const config = { runtime: "edge" };

// ── Supabase REST helpers ──────────────────────────────────────

function sbKey() {
  return (
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ||
    ""
  );
}

function sbHeaders(extra = {}) {
  const key = sbKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function insertToBank(rows) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !rows.length) return { saved: 0, error: null };

  const res = await fetch(`${base}/rest/v1/question_bank`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    return { saved: 0, error: err };
  }

  const inserted = await res.json();
  return { saved: Array.isArray(inserted) ? inserted.length : rows.length, error: null };
}

// ── No-LaTeX prompt builder ────────────────────────────────────

function buildPrompt(subject, topic, subtopic, difficulty, mcq, sa, examTags) {
  const diffDesc = {
    easy:   "EASY — single concept, 1-2 steps, suitable for beginners",
    medium: "MEDIUM — IPMAT/JIPMAT level, multi-step, 2-3 concepts",
    hard:   "HARD — IIM entrance level, multi-concept, 3-4 steps",
    mixed:  "MIXED — 30% easy, 50% medium, 20% hard",
  };

  const topicLine = subtopic
    ? `Topic: "${topic}" → Subtopic: "${subtopic}"`
    : `Topic: "${topic}"`;

  const examLine = examTags?.length
    ? `Target exams: ${examTags.join(", ")}`
    : "Target exams: IPMAT Indore, IPMAT Rohtak, JIPMAT, IIM Kozhikode BMS";

  const total = mcq + sa;

  return `You are an expert question setter for Indian management entrance exams (IPMAT, JIPMAT, IIM BMS).

Subject: "${subject}"
${topicLine}
Difficulty: ${diffDesc[difficulty] || diffDesc.medium}
${examLine}
Generate: ${mcq} MCQ questions + ${sa} SA (short answer) questions = ${total} total

━━━ CRITICAL FORMATTING RULES ━━━
1. Return ONLY a valid JSON array. Zero text before or after. No markdown, no code fences.
2. NO LATEX EVER. Not \\frac{}, not \\sqrt{}, not $...$, not \\(...\\), not \\[...\\]. ZERO.
   Plain-text math rules:
   • Fractions  → write as "3/4" or "(a+b)/(c+d)"
   • Square root → write as "√n" or "sqrt(n)"
   • Powers      → write as "x²" or "x^2"
   • Subscripts  → write as "a1", "b2"
   • Summation   → write as "sum of" in words
   • Integrals   → write as "integral of" in words
   • Greek letters → π, α, β, θ  (use the Unicode symbol directly)
3. Wrap question text in <p> tags. Keep it clean HTML.
4. MCQ: exactly 4 options (A B C D), exactly 1 correct (isCorrect:true). 3 plausible wrong options.
5. SA answer MUST be a positive whole-number integer (e.g. 42, 100, 7). Never a decimal or fraction.
   Design the question so the arithmetic works out to a clean integer.
6. Explanation: max 3 sentences showing key steps in plain text (no LaTeX).
7. sectionTitle must be exactly "${subject}", topicName exactly "${topic}".
8. Questions must be genuinely exam-quality — NOT trivial textbook definitions.

MCQ format:
{"sectionTitle":"${subject}","topicName":"${topic}","type":"mcq","question":"<p>...</p>","options":[{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],"explanation":"..."}

SA format:
{"sectionTitle":"${subject}","topicName":"${topic}","type":"sa","question":"<p>...</p>","options":{"answer":"42"},"explanation":"..."}

[`;
}

// ── Gemini caller ──────────────────────────────────────────────

async function callGemini(apiKey, prompt, timeoutMs = 18000) {
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-pro-latest"];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.75, maxOutputTokens: 8192 },
          }),
        }
      );
      clearTimeout(tid);

      if (!res.ok) continue;

      const data = await res.json();
      let text = null;
      const parts = data.candidates?.[0]?.content?.parts || [];
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].text?.includes('"sectionTitle"')) { text = parts[i].text; break; }
      }
      if (!text) for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].text) { text = parts[i].text; break; }
      }

      if (text) return { text, model };
    } catch { /* try next model */ }
  }
  return { error: "All models failed" };
}

// ── Parser + validator ─────────────────────────────────────────

function parseAndValidate(text) {
  if (!text) return [];

  let cleaned = text.trim();
  if (!cleaned.startsWith("[")) cleaned = "[" + cleaned;
  const lb = cleaned.lastIndexOf("]");
  if (lb > 0) cleaned = cleaned.substring(0, lb + 1);

  const tryParse = (s) => {
    try {
      const arr = JSON.parse(s);
      if (!Array.isArray(arr)) return [];
      return arr.filter((q) => {
        if (!q.type || !q.question) return false;
        if (q.type === "mcq" || q.type === "options") {
          if (!Array.isArray(q.options) || q.options.length < 2) return false;
          if (!q.options.some((o) => o.isCorrect === true)) return false;
        }
        if (q.type === "sa" || q.type === "input") {
          if (!q.options || q.options.answer === undefined) return false;
          const num = Number(String(q.options.answer).trim());
          if (isNaN(num) || !Number.isInteger(num)) return false;
        }
        // Reject LaTeX (hard block)
        const qText = q.question + JSON.stringify(q.options) + (q.explanation || "");
        if (/\\frac|\\sqrt|\\int|\\sum|\\left|\\right|\$[^$]|\\\[/.test(qText)) return false;
        return true;
      }).map((q) => {
        // Normalise type names
        const type = (q.type === "options") ? "mcq"
                   : (q.type === "input")   ? "sa"
                   : q.type;
        return {
          sectionTitle: q.sectionTitle || subject,
          topicName:    q.topicName    || topic,
          type,
          question:     q.question,
          options:      type === "sa"
            ? { answer: String(Math.round(Number(q.options.answer))) }
            : q.options,
          explanation:  q.explanation || "",
        };
      });
    } catch { return []; }
  };

  let result = tryParse(cleaned);
  if (result.length > 0) return result;

  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    result = tryParse(m[0]);
    if (result.length > 0) return result;
    // Truncation recovery
    const jsonStr = m[0];
    const lastGood = Math.max(jsonStr.lastIndexOf("},"), jsonStr.lastIndexOf("}]"));
    if (lastGood > 0) result = tryParse(jsonStr.substring(0, lastGood + 1) + "]");
  }
  return result;
}

// ── Main handler ───────────────────────────────────────────────

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  // Auth
  const cronHeader = req.headers.get("x-vercel-cron");
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!cronHeader && authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), { status: 500 });
  }

  let body = {};
  try { body = await req.json(); } catch {}

  const {
    subject    = "Quantitative Ability",
    topic      = "Percentages",
    subtopic   = null,
    difficulty = "medium",
    mcqCount   = 10,
    saCount    = 5,
    examTags   = ["IPMAT_Indore", "IPMAT_Rohtak", "JIPMAT", "IIM_Kozhikode_BMS"],
  } = body;

  const totalRequested = mcqCount + saCount;
  if (totalRequested <= 0 || totalRequested > 100) {
    return new Response(
      JSON.stringify({ error: "totalCount must be 1–100" }),
      { status: 400 }
    );
  }

  // Split into sub-batches of max 8 questions, run in parallel
  const MAX_PER_BATCH = 8;
  const DEADLINE = Date.now() + 20000; // 20s deadline

  const subBatches = [];
  let remMcq = Math.ceil(mcqCount * 1.25); // 25% buffer for filtering
  let remSa  = Math.ceil(saCount  * 1.25);

  while (remMcq + remSa > 0) {
    const used = Math.min(remMcq + remSa, MAX_PER_BATCH);
    const bMcq = Math.min(remMcq, used);
    const bSa  = Math.min(used - bMcq, remSa);
    subBatches.push({ mcq: bMcq, sa: bSa });
    remMcq -= bMcq;
    remSa  -= bSa;
  }

  // Run all batches in parallel
  const batchResults = await Promise.allSettled(
    subBatches.map(async ({ mcq, sa }) => {
      const timeoutMs = Math.max(5000, DEADLINE - Date.now());
      const prompt = buildPrompt(subject, topic, subtopic, difficulty, mcq, sa, examTags);
      const gemRes = await callGemini(apiKey, prompt, timeoutMs);
      if (gemRes.error) return { questions: [], error: gemRes.error };
      return { questions: parseAndValidate(gemRes.text), model: gemRes.model };
    })
  );

  // Collect all valid questions
  let allQuestions = [];
  const errors = [];
  for (const r of batchResults) {
    if (r.status === "fulfilled") {
      allQuestions.push(...r.value.questions);
      if (r.value.error) errors.push(r.value.error);
    } else {
      errors.push(r.reason?.message || "batch failed");
    }
  }

  if (allQuestions.length === 0) {
    return new Response(
      JSON.stringify({ error: "No questions generated", errors }),
      { status: 500 }
    );
  }

  // Build DB rows with all tags
  const rows = allQuestions.map((q) => ({
    subject,
    topic,
    subtopic:    subtopic || null,
    difficulty,
    type:        q.type,     // "mcq" or "sa"
    exam_tags:   examTags,
    question:    q.question,
    options:     q.options,
    explanation: q.explanation || null,
    source:      "gemini",
    model_used:  "gemini-2.5-flash",
    is_active:   true,
    is_verified: false,
  }));

  const { saved, error: dbError } = await insertToBank(rows);

  return new Response(
    JSON.stringify({
      success: true,
      subject,
      topic,
      difficulty,
      requested: totalRequested,
      generated: allQuestions.length,
      saved,
      dbError: dbError || null,
      errors: errors.length ? errors : undefined,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
