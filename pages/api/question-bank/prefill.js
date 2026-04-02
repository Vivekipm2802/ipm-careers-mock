/**
 * /api/question-bank/prefill
 *
 * Pre-generates questions for the most-depleted topics and stores them in
 * the question_bank table.  Designed to run as a Vercel Cron Job daily.
 *
 * Cron hits this once a day.  We pick the subject for that day of the week,
 * find the 2 most-depleted topics, and generate 20 questions each.
 *
 *   Day 0 (Sun) → Quantitative Ability
 *   Day 1 (Mon) → Verbal Ability
 *   Day 2 (Tue) → Logical Reasoning
 *   Day 3 (Wed) → Data Interpretation
 *   Day 4 (Thu) → Quantitative Ability (second pass)
 *   Day 5 (Fri) → Verbal Ability (second pass)
 *   Day 6 (Sat) → Logical Reasoning (second pass)
 *
 * You can also call it manually:
 *   POST /api/question-bank/prefill
 *   { "subject": "Verbal Ability", "difficulty": "medium", "topicsPerRun": 3 }
 *   Header: Authorization: Bearer <CRON_SECRET>
 */

export const config = { runtime: "edge" };

// ── Topic lists (same as CustomTestGenerator presets) ────────────────────────

const QA_TOPICS = [
  "Percentages", "Time Speed & Distance", "Profit & Loss", "Ratio & Proportion",
  "Simple & Compound Interest", "Averages", "Time & Work", "Mixture & Alligation",
  "Algebra", "Quadratic Equations", "Indices", "Progression & Series",
  "Number System", "HCF & LCM", "Remainder", "Permutation & Combination",
  "Probability", "Geometry", "Mensuration", "Coordinate Geometry",
];

const VA_TOPICS = [
  "Reading Comprehension", "Para Jumbles", "Sentence Correction", "Fill in the Blanks",
  "Synonyms & Antonyms", "Idioms & Phrases", "Grammar", "Critical Reasoning",
  "Para-Completion", "Vocabulary", "Active & Passive Voice", "Analogies",
];

const LR_TOPICS = [
  "Puzzles", "Arrangements", "Coding & Decoding", "Blood Relations",
  "Syllogisms", "Logical Sequence", "Directions", "Clocks & Calendars",
  "Venn Diagrams", "Statement & Conclusion", "Data Sufficiency", "Input & Output",
];

const DI_TOPICS = [
  "Tables", "Bar Graphs", "Pie Charts", "Line Graphs",
  "Caselets", "Mixed DI Sets",
];

const SUBJECT_ROTATION = [
  { subject: "Quantitative Ability", topics: QA_TOPICS },
  { subject: "Verbal Ability",       topics: VA_TOPICS },
  { subject: "Logical Reasoning",    topics: LR_TOPICS },
  { subject: "Data Interpretation",  topics: DI_TOPICS },
  { subject: "Quantitative Ability", topics: QA_TOPICS },   // second pass
  { subject: "Verbal Ability",       topics: VA_TOPICS },
  { subject: "Logical Reasoning",    topics: LR_TOPICS },
];

const MIN_BANK_SIZE  = 100; // replenish when a topic has fewer than this
const GENERATE_COUNT = 40;  // questions to generate per depleted topic
const MAX_PER_CALL   = 8;   // max questions per single Gemini call (timeout safety)
const MAX_TOPICS_PER_RUN = 3; // max topics to fill per cron invocation

// ── Supabase REST helpers ─────────────────────────────────────────────────────

function supabaseHeaders() {
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function countInBank(base, subject, topic, difficulty) {
  const url =
    `${base}/rest/v1/question_bank` +
    `?subject=eq.${encodeURIComponent(subject)}` +
    `&topic=eq.${encodeURIComponent(topic)}` +
    `&difficulty=eq.${encodeURIComponent(difficulty)}` +
    `&select=id`;
  try {
    const res = await fetch(url, {
      headers: { ...supabaseHeaders(), Prefer: "count=exact" },
    });
    const countHeader = res.headers.get("content-range");
    if (countHeader) {
      const n = parseInt(countHeader.split("/")[1], 10);
      return isNaN(n) ? 0 : n;
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

async function saveToBank(base, questions, difficulty) {
  if (!questions.length) return 0;
  const rows = questions.map((q) => ({
    subject: q.sectionTitle || "General",
    topic:   q.topicName   || "General",
    difficulty,
    type:        q.type,
    question:    q.question,
    options:     q.options,
    explanation: q.explanation || null,
  }));
  const res = await fetch(`${base}/rest/v1/question_bank`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  return res.ok ? rows.length : 0;
}

// ── Gemini caller (same pattern as generate.js) ───────────────────────────────

async function callGemini(apiKey, prompt) {
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-pro-latest"];
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 22000);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
          }),
        }
      );
      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const data = await response.json();
      let text = null;
      if (data.candidates?.[0]) {
        const parts = data.candidates[0].content?.parts || [];
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].text && parts[i].text.includes('"sectionTitle"')) {
            text = parts[i].text; break;
          }
        }
        if (!text) {
          for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].text) { text = parts[i].text; break; }
          }
        }
      }
      if (text) return { text, model };
    } catch {
      // try next model
    }
  }
  return { error: "All models failed" };
}

function buildPrefillPrompt(subject, topic, difficulty, mcq, sa) {
  const diffDesc = {
    easy:   "EASY — straightforward, 1-2 steps",
    medium: "MEDIUM — IPMAT/JIPMAT level, 2-3 steps",
    hard:   "HARD — IIM-level, 3-4 steps",
    mixed:  "MIXED — variety of easy/medium/hard",
  };
  const total = mcq + sa;
  return `You are an expert IPMAT/JIPMAT question setter.

Generate exactly ${total} exam-quality questions.
Subject: "${subject}", Topic: "${topic}"
Difficulty: ${diffDesc[difficulty] || diffDesc.medium}
MCQ questions: ${mcq}, SA (numeric) questions: ${sa}

RULES:
1. Return ONLY a valid JSON array — no markdown, no fences, no text before/after.
2. MCQ: 4 options (A/B/C/D), exactly 1 correct (isCorrect:true). Plausible distractors.
3. SA: answer MUST be a whole number (positive integer). NEVER use decimals, fractions, or negatives. Design the question so the answer works out to a clean integer.
4. Explanation: 2 sentences max.
5. Wrap question text in <p> tags. Plain-text math (x² not LaTeX).
6. sectionTitle must be exactly "${subject}", topicName exactly "${topic}".

MCQ format: {"sectionTitle":"${subject}","topicName":"${topic}","type":"options","question":"<p>...</p>","options":[{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],"explanation":"..."}
SA  format: {"sectionTitle":"${subject}","topicName":"${topic}","type":"input","question":"<p>...</p>","options":{"answer":"42"},"explanation":"..."}

[`;
}

function parseAndValidate(text) {
  if (!text) return [];
  let cleaned = text.trim();
  if (!cleaned.startsWith("[")) cleaned = "[" + cleaned;
  const lastBracket = cleaned.lastIndexOf("]");
  if (lastBracket > 0) cleaned = cleaned.substring(0, lastBracket + 1);

  const tryParse = (s) => {
    try {
      const arr = JSON.parse(s);
      if (!Array.isArray(arr)) return [];
      return arr.filter((q) => {
        if (!q.type || !q.question) return false;
        if (q.type === "options") {
          if (!Array.isArray(q.options) || q.options.length < 2) return false;
          if (!q.options.some((o) => o.isCorrect === true)) return false;
        }
        if (q.type === "input") {
          if (!q.options || q.options.answer === undefined) return false;
          // Reject non-integer SA answers
          const num = Number(String(q.options.answer).trim());
          if (isNaN(num) || !Number.isInteger(num)) return false;
        }
        return true;
      }).map((q) => ({
        ...q,
        options: q.type === "input"
          ? { answer: String(Math.round(Number(q.options.answer))) }
          : q.options,
      }));
    } catch { return []; }
  };

  let result = tryParse(cleaned);
  if (result.length > 0) return result;

  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    result = tryParse(m[0]);
    if (result.length > 0) return result;
    // truncation recovery
    const jsonStr = m[0];
    const lastGood = Math.max(jsonStr.lastIndexOf("},"), jsonStr.lastIndexOf("}]"));
    if (lastGood > 0) {
      result = tryParse(jsonStr.substring(0, lastGood + 1) + "]");
    }
  }
  return result;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req) {
  // Auth: accept Vercel cron header OR Authorization: Bearer <CRON_SECRET>
  const cronHeader = req.headers.get("x-vercel-cron");
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronHeader && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey      = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!apiKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Determine subject + difficulty from body or day-of-week rotation
  let body = {};
  try { body = await req.json(); } catch {}

  const dayIndex = new Date().getDay(); // 0=Sun … 6=Sat
  const rotation  = SUBJECT_ROTATION[dayIndex % SUBJECT_ROTATION.length];
  const subject    = body.subject    || rotation.subject;
  const difficulty = body.difficulty || "medium";
  const topicsPerRun = Math.min(parseInt(body.topicsPerRun) || MAX_TOPICS_PER_RUN, 3);

  // Find the topic list for this subject
  const allTopics =
    SUBJECT_ROTATION.find((r) => r.subject === subject)?.topics || rotation.topics;

  // Check counts and collect depleted topics
  const counts = await Promise.all(
    allTopics.map(async (topic) => ({
      topic,
      count: await countInBank(supabaseUrl, subject, topic, difficulty),
    }))
  );
  counts.sort((a, b) => a.count - b.count); // most depleted first

  const depleted = counts
    .filter((c) => c.count < MIN_BANK_SIZE)
    .slice(0, topicsPerRun);

  if (depleted.length === 0) {
    return new Response(
      JSON.stringify({ subject, message: "All topics are well-stocked", counts }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Generate in parallel — sub-batch each topic into MAX_PER_CALL chunks
  const results = await Promise.allSettled(
    depleted.map(async ({ topic, count }) => {
      const toGenerate = Math.min(GENERATE_COUNT, MIN_BANK_SIZE - count);

      // Split into sub-batches of MAX_PER_CALL questions each
      const subBatches = [];
      let remaining = toGenerate;
      while (remaining > 0) {
        const batchSize = Math.min(remaining, MAX_PER_CALL);
        const mcq = Math.ceil(batchSize * 0.65); // 65% MCQ bias
        const sa  = batchSize - mcq;
        subBatches.push({ mcq, sa });
        remaining -= batchSize;
      }

      // Run all sub-batches for this topic in parallel
      const batchResults = await Promise.allSettled(
        subBatches.map(({ mcq, sa }) => {
          const prompt = buildPrefillPrompt(subject, topic, difficulty, mcq, sa);
          return callGemini(apiKey, prompt);
        })
      );

      const allQuestions = [];
      const models = [];
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value.text) {
          allQuestions.push(...parseAndValidate(r.value.text));
          if (r.value.model) models.push(r.value.model);
        }
      }

      if (allQuestions.length === 0) {
        return { topic, error: "All sub-batches failed", saved: 0 };
      }

      const saved = await saveToBank(supabaseUrl, allQuestions, difficulty);
      return { topic, parsed: allQuestions.length, saved, models: [...new Set(models)] };
    })
  );

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { error: r.reason?.message }
  );

  return new Response(
    JSON.stringify({ subject, difficulty, results: summary }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
