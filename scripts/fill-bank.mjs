/**
 * fill-bank.mjs
 *
 * Bulk-fills the question_bank table directly via Gemini + Supabase REST.
 * No Vercel timeouts — runs until all topics are filled.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/fill-bank.mjs
 */

const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY;
const TARGET_PER_TOPIC = parseInt(process.env.TARGET_PER_TOPIC) || 30;
const MCQ_PER_CALL     = 5;
const SA_PER_CALL      = 3;
const DIFFICULTY       = "medium";
const EXAM_TAGS        = ["IPMAT_Indore","IPMAT_Rohtak","JIPMAT","IIM_Kozhikode_BMS"];

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Set GEMINI_API_KEY, SUPABASE_URL and SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

// ── Topics ───────────────────────────────────────────────────────────────────

const PLAN = [
  { subject: "Quantitative Ability", topics: [
    "Percentages","Profit & Loss","Time Speed & Distance","Time & Work",
    "Simple & Compound Interest","Ratio & Proportion","Averages",
    "Mixture & Alligation","Algebra","Quadratic Equations","Indices",
    "Progression & Series","Number System","HCF & LCM","Remainder",
    "Permutation & Combination","Probability","Geometry","Mensuration",
  ]},
  { subject: "Verbal Ability", topics: [
    "Reading Comprehension","Para Jumbles","Para-Completion",
    "Sentence Correction","Fill in the Blanks","Synonyms & Antonyms",
    "Idioms & Phrases","Vocabulary","Grammar","Critical Reasoning",
  ]},
  { subject: "Logical Reasoning", topics: [
    "Puzzles","Arrangements","Coding & Decoding","Blood Relations",
    "Syllogisms","Logical Sequence","Directions","Clocks & Calendars",
    "Venn Diagrams","Statement & Conclusion","Data Sufficiency",
  ]},
  { subject: "Data Interpretation", topics: [
    "Tables","Bar Graphs","Pie Charts","Line Graphs","Caselets","Mixed DI Sets",
  ]},
];

// ── Supabase helpers ──────────────────────────────────────────────────────────

function sbHeaders(extra = {}) {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function countInBank(subject, topic) {
  const url = `${SUPABASE_URL}/rest/v1/question_bank`
    + `?subject=eq.${encodeURIComponent(subject)}`
    + `&topic=eq.${encodeURIComponent(topic)}`
    + `&difficulty=eq.${DIFFICULTY}`
    + `&is_active=eq.true&select=id`;
  const res = await fetch(url, { headers: { ...sbHeaders(), Prefer: "count=exact" } });
  const cr = res.headers.get("content-range");
  if (cr) { const n = parseInt(cr.split("/")[1]); return isNaN(n) ? 0 : n; }
  const rows = await res.json();
  return Array.isArray(rows) ? rows.length : 0;
}

async function insertRows(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/question_bank`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Supabase insert failed: " + err);
  }
  return rows.length;
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(prompt) {
  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-pro-latest"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 4096,
              ...(model.includes("2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            },
          }),
        }
      );
      if (!res.ok) { console.log(`  ${model} → ${res.status}`); continue; }
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      let text = null;
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].text?.includes('"sectionTitle"')) { text = parts[i].text; break; }
      }
      if (!text) for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].text) { text = parts[i].text; break; }
      }
      if (text) { console.log(`  ✓ ${model}`); return text; }
    } catch (e) {
      console.log(`  ${model} error: ${e.message}`);
    }
  }
  return null;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(subject, topic, mcq, sa) {
  return `You are an expert IPMAT/JIPMAT question setter.

Subject: "${subject}", Topic: "${topic}"
Difficulty: MEDIUM — IPMAT/JIPMAT level, multi-step, 2-3 concepts
Generate: ${mcq} MCQ + ${sa} SA = ${mcq+sa} total questions

━━━ CRITICAL RULES ━━━
1. Return ONLY a valid JSON array. No markdown, no code fences.
2. NO LATEX. Not \\frac{}, \\sqrt{}, $...$, nothing. Plain text only.
   Fractions → "3/4", Square root → "√n", Powers → "x^2", Greek → π θ α β
3. Questions in <p> tags.
4. MCQ: 4 options (A B C D), exactly 1 correct (isCorrect:true).
5. SA: answer must be a positive whole-number integer (e.g. 42).
6. sectionTitle = "${subject}", topicName = "${topic}" exactly.

MCQ: {"sectionTitle":"${subject}","topicName":"${topic}","type":"mcq","question":"<p>...</p>","options":[{"title":"A","text":"...","isCorrect":false},{"title":"B","text":"...","isCorrect":true},{"title":"C","text":"...","isCorrect":false},{"title":"D","text":"...","isCorrect":false}],"explanation":"..."}
SA:  {"sectionTitle":"${subject}","topicName":"${topic}","type":"sa","question":"<p>...</p>","options":{"answer":"42"},"explanation":"..."}

[`;
}

// ── Parser / validator ────────────────────────────────────────────────────────

function parseAndValidate(text, subject, topic) {
  if (!text) return [];
  let s = text.trim();
  if (!s.startsWith("[")) s = "[" + s;
  const lb = s.lastIndexOf("]");
  if (lb > 0) s = s.substring(0, lb + 1);

  const tryParse = (str) => {
    try {
      const arr = JSON.parse(str);
      if (!Array.isArray(arr)) return [];
      return arr.filter(q => {
        if (!q.type || !q.question) return false;
        if (q.type === "mcq" || q.type === "options") {
          if (!Array.isArray(q.options) || !q.options.some(o => o.isCorrect)) return false;
        }
        if (q.type === "sa" || q.type === "input") {
          if (!q.options?.answer) return false;
          const n = Number(String(q.options.answer).trim());
          if (isNaN(n) || !Number.isInteger(n)) return false;
        }
        // Block LaTeX
        const txt = q.question + JSON.stringify(q.options) + (q.explanation || "");
        if (/\\frac|\\sqrt|\\int|\\sum|\$[^$]|\\\[/.test(txt)) return false;
        return true;
      }).map(q => ({
        subject,
        topic,
        difficulty: DIFFICULTY,
        type: q.type === "options" ? "mcq" : q.type === "input" ? "sa" : q.type,
        exam_tags: EXAM_TAGS,
        question: q.question,
        options: (q.type === "sa" || q.type === "input")
          ? { answer: String(Math.round(Number(q.options.answer))) }
          : q.options,
        explanation: q.explanation || null,
        source: "gemini",
        model_used: "gemini-2.5-flash-lite",
        is_active: true,
        is_verified: false,
      }));
    } catch { return []; }
  };

  let result = tryParse(s);
  if (result.length > 0) return result;
  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    result = tryParse(m[0]);
    if (result.length > 0) return result;
    const j = m[0], last = Math.max(j.lastIndexOf("},"), j.lastIndexOf("}]"));
    if (last > 0) return tryParse(j.substring(0, last + 1) + "]");
  }
  return [];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function fillTopic(subject, topic) {
  const current = await countInBank(subject, topic);
  if (current >= TARGET_PER_TOPIC) {
    console.log(`  ✓ ${topic} already has ${current} — skipping`);
    return 0;
  }
  const needed = TARGET_PER_TOPIC - current;
  console.log(`  → ${topic}: need ${needed} more (have ${current})`);

  let saved = 0;
  const calls = Math.ceil(needed / (MCQ_PER_CALL + SA_PER_CALL));

  for (let i = 0; i < calls; i++) {
    const prompt = buildPrompt(subject, topic, MCQ_PER_CALL, SA_PER_CALL);
    const text = await callGemini(prompt);
    const questions = parseAndValidate(text, subject, topic);
    if (questions.length === 0) { console.log(`    batch ${i+1}: no valid questions`); continue; }
    try {
      await insertRows(questions);
      saved += questions.length;
      console.log(`    batch ${i+1}: +${questions.length} saved (total saved: ${saved})`);
    } catch (e) {
      console.log(`    batch ${i+1}: insert error — ${e.message}`);
    }
    // small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  return saved;
}

async function main() {
  console.log("🚀 Starting question bank fill...\n");
  let grandTotal = 0;
  for (const { subject, topics } of PLAN) {
    console.log(`\n📚 ${subject}`);
    for (const topic of topics) {
      const n = await fillTopic(subject, topic);
      grandTotal += n;
    }
  }
  console.log(`\n✅ Done! Total questions saved: ${grandTotal}`);
}

main().catch(e => { console.error(e); process.exit(1); });
