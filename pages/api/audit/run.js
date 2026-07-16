// ============================================================
// POST /api/audit/run — AI question-bank audit (admin only).
//
// Why this exists: a past typist introduced wrong answers into
// the question bank. Gemini solves each question independently,
// compares with the marked answer, sanity-checks the text, and
// files a verdict in question_audits for admin review.
//
// Body: { source: 'bank' | 'pyq', batchSize?: number (<= 6) }
// Response: { processed, remaining_estimate, flagged }
// The client loops this endpoint until remaining_estimate is 0.
//
// Cursor design: audits are written sequentially by question id.
// Each run picks up at max(question_id) already audited for that
// source, so the loop is resumable and never re-audits. After an
// admin FIXES a question, we intentionally do NOT re-audit it —
// fixes flow through the review queue (resolve.js), not re-runs.
// To force a full fresh pass, truncate question_audits for that
// source in SQL.
//
// Per-question Gemini failures never fail the batch: the row is
// recorded as verdict 'unclear' with note 'ai_error: …' and the
// cursor still advances.
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

// ── Gemini auto-model-discovery (same pattern as /api/explain) ──
// Google rotates model availability per account generation, so we
// ask the API which models THIS key can use and pick a flash-family
// text model. Cached per warm lambda; env GEMINI_MODEL overrides.
let cachedModels = null;
async function candidateModels(key) {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  if (cachedModels) return cachedModels;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`);
    const j = await r.json();
    const names = (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => String(m.name).replace("models/", ""))
      .filter((n) => !/embed|image|video|audio|tts|live|thinking|exp|preview/i.test(n));
    const flash = names.filter((n) => /flash/i.test(n)).sort().reverse();
    const rest = names.filter((n) => !/flash/i.test(n)).sort().reverse();
    const picked = [...flash, ...rest].slice(0, 4);
    if (picked.length) cachedModels = picked;
    return picked.length ? picked : ["gemini-2.0-flash"];
  } catch (e) {
    return ["gemini-2.0-flash"];
  }
}

async function callGemini(key, prompt) {
  const models = await candidateModels(key);
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
          }),
        }
      );
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      if (r.ok && text) return { text, model };
      // never pass upstream error text through — it can contain the key
      console.error("audit gemini error on", model, ":", j?.error?.status, j?.error?.message?.slice(0, 80));
    } catch (e) {
      console.error("audit gemini unreachable on", model);
    }
  }
  throw new Error("all gemini models failed");
}

// ── Pure helpers (exported for unit tests) ──────────────────────

export function stripHtml(s) {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export const letterOf = (i) => String.fromCharCode(65 + i);

// Extract + validate the first {...} block from a model reply.
// Returns null if nothing parseable — caller records 'unclear'.
export function parseAuditJson(text) {
  if (!text || typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let j;
  try {
    j = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return null;
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const VERDICTS = ["ok", "mismatch", "broken", "unclear"];
  const matches = typeof j.matches_marked === "boolean" ? j.matches_marked : null;
  let verdict = VERDICTS.includes(j.verdict) ? j.verdict : null;
  if (!verdict) verdict = matches === true ? "ok" : matches === false ? "mismatch" : "unclear";
  // internal consistency: can't be "ok" while claiming the answers differ
  if (verdict === "ok" && matches === false) verdict = "mismatch";
  return {
    my_answer: j.my_answer == null ? "" : String(j.my_answer).slice(0, 500),
    matches_marked: matches,
    issues: Array.isArray(j.issues) ? j.issues.filter(Boolean).map((s) => String(s).slice(0, 200)).slice(0, 6) : [],
    verdict,
  };
}

// Map the AI's answer string back to an option index.
// Accepts "B — 14 days", "(b) 14", "B", or the bare option text.
// Returns -1 when no confident mapping exists.
export function mapAiToOption(aiAnswer, options) {
  if (!aiAnswer || !Array.isArray(options) || options.length === 0) return -1;
  const raw = String(aiAnswer).trim();
  const m = raw.match(/^\(?([A-Za-z])\)?\s*(?:[—–\-.:)]|$)/);
  if (m) {
    const idx = m[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < options.length) return idx;
  }
  const norm = (s) => stripHtml(s).toLowerCase().replace(/\s+/g, " ").trim();
  const body = norm(raw.replace(/^\(?[A-Za-z]\)?\s*[—–\-.:)]\s*/, ""));
  const target = body || norm(raw);
  if (!target) return -1;
  return options.findIndex((o) => norm(o && (o.title ?? o.text)) === target);
}

// Coerce a jsonb/JSON-string options column into a usable value.
export function parseOptionsColumn(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  return raw;
}

// Normalise a bank/pyq row into one shape the prompt builder eats.
// mode: 'mcq' (verify against marked option) | 'answer' (verify
// against stored answer) | 'text_only' (no stored answer found —
// sanity-check the text only, no answer verification).
export function normalizeQuestion(source, row) {
  const out = {
    id: row.id,
    text: stripHtml(row.question || row.title || ""),
    hasImage: !!row.questionimage,
    options: null,
    markedIdx: -1,
    markedAnswer: null,
    mode: "text_only",
    structuralIssue: null,
  };
  const rawOpts = parseOptionsColumn(row.options);
  const isMcq = source === "bank" ? row.type === "options" : row.answer_type === "mcq";

  if (isMcq) {
    out.mode = "mcq";
    const arr = Array.isArray(rawOpts) ? rawOpts : null;
    if (!arr || arr.length < 2) {
      out.structuralIssue = "options missing or fewer than 2";
      return out;
    }
    // bank uses {title,isCorrect}; pyq uses {text,is_correct}
    out.options = arr.map((o) => ({
      title: stripHtml(o && (o.title ?? o.text)),
      isCorrect: !!(o && (o.isCorrect ?? o.is_correct)),
    }));
    const correct = out.options.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i >= 0);
    if (correct.length !== 1) {
      out.structuralIssue = correct.length === 0 ? "no option marked correct" : "multiple options marked correct";
      return out;
    }
    out.markedIdx = correct[0];
    out.markedAnswer = `${letterOf(correct[0])} — ${out.options[correct[0]].title}`;
  } else {
    // input (bank) / answer_based (pyq). Bank input questions keep
    // their answer INSIDE the options jsonb as { answer: "..." }
    // (see pages/test/[slug].js: normalizeAns(options?.answer)).
    const stored =
      source === "pyq"
        ? row.answer
        : rawOpts && !Array.isArray(rawOpts) && typeof rawOpts === "object"
        ? rawOpts.answer
        : null;
    if (stored != null && String(stored).trim() !== "") {
      out.mode = "answer";
      out.markedAnswer = stripHtml(stored);
    } else {
      out.mode = "text_only"; // no verifiable answer — sanity-check only
    }
  }
  return out;
}

export function buildPrompt(q, ctx) {
  const lines = [
    "You are auditing the question bank of an IPMAT (IIM admissions) coaching portal.",
    "A past data-entry operator introduced WRONG marked answers, so do NOT trust the marked answer — solve the question yourself from scratch first.",
    "",
  ];
  if (ctx && ctx.chapter) lines.push(`CHAPTER: ${ctx.chapter}`);
  if (ctx && ctx.test) lines.push(`TEST: ${ctx.test}`);
  if (q.year) lines.push(`YEAR: ${q.year}`);
  lines.push("QUESTION:", q.text || "(empty)", "");
  if (q.hasImage) {
    lines.push("NOTE: this question has an attached image you CANNOT see. If the image is essential to solving it, your verdict must be \"unclear\".", "");
  }
  if (q.mode === "mcq" && Array.isArray(q.options)) {
    lines.push("OPTIONS:");
    q.options.forEach((o, i) => lines.push(`${letterOf(i)}. ${o.title || "(empty option)"}`));
    lines.push("", `MARKED CORRECT ANSWER: ${q.markedAnswer || "(none marked)"}`, "");
  } else if (q.mode === "answer") {
    lines.push(`STORED CORRECT ANSWER: ${q.markedAnswer}`, "");
  } else {
    lines.push("There is NO stored answer to compare against. Solve it anyway and report content problems; set matches_marked to null.", "");
  }
  lines.push(
    "Do all three:",
    "1. Solve the question independently.",
    "2. Compare your answer with the marked/stored answer (if one exists).",
    "3. Sanity-check the content: garbled or truncated text, missing/duplicate options, options that do not fit the question, ambiguous or unanswerable questions.",
    "",
    "Reply with STRICT JSON only — no markdown fences, no text outside the JSON object:",
    '{"my_answer":"...","matches_marked":true,"issues":["..."],"verdict":"ok"}',
    "",
    "Rules:",
    q.mode === "mcq"
      ? '- my_answer MUST be the option letter, then " — ", then the option text exactly. Example: "B — 14 days 6 hours".'
      : "- my_answer is your final answer as a short string.",
    '- verdict "ok": your answer matches the marked one AND the content is fine.',
    '- verdict "mismatch": you are confident the marked answer is wrong.',
    '- verdict "broken": the text/options are garbled, incomplete, duplicated or unanswerable.',
    '- verdict "unclear": you cannot solve it with confidence.',
    '- issues: short strings describing content problems, [] if none.'
  );
  return lines.join("\n");
}

// ── chapter context: questions.parent → levels → m_categories → categories ──
async function chapterContext(parentIds) {
  const out = {};
  try {
    const ids = [...new Set((parentIds || []).filter((x) => x != null))];
    if (!ids.length) return out;
    const { data: levels } = await serversupabase.from("levels").select("id,title,parent").in("id", ids);
    const mIds = [...new Set((levels || []).map((l) => l.parent).filter((x) => x != null))];
    const { data: mcats } = mIds.length
      ? await serversupabase.from("m_categories").select("id,parent").in("id", mIds)
      : { data: [] };
    const cIds = [...new Set((mcats || []).map((m) => m.parent).filter((x) => x != null))];
    const { data: cats } = cIds.length
      ? await serversupabase.from("categories").select("id,title").in("id", cIds)
      : { data: [] };
    const mById = {};
    (mcats || []).forEach((m) => (mById[m.id] = m));
    const cById = {};
    (cats || []).forEach((c) => (cById[c.id] = c));
    (levels || []).forEach((l) => {
      const m = mById[l.parent];
      const c = m ? cById[m.parent] : null;
      out[l.id] = { test: l.title || null, chapter: (c && c.title) || null };
    });
  } catch (e) {
    // context is optional — audit proceeds without it
  }
  return out;
}

// ── handler ──────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const user = await requireAdmin(req);
  if (!user) return res.status(401).json({ error: "Admin only" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const { source } = req.body || {};
  if (source !== "bank" && source !== "pyq") {
    return res.status(400).json({ error: "source must be 'bank' or 'pyq'" });
  }
  let batchSize = Number(req.body?.batchSize) || 5;
  batchSize = Math.max(1, Math.min(6, Math.floor(batchSize)));

  try {
    // 1) sequential cursor — highest question id already audited for this source
    const { data: last, error: curErr } = await serversupabase
      .from("question_audits")
      .select("question_id")
      .eq("source", source)
      .order("question_id", { ascending: false })
      .limit(1);
    if (curErr) return res.status(500).json({ error: "cursor query failed — is the question_audits table created?" });
    const cursor = last && last[0] ? Number(last[0].question_id) : 0;

    // 2) next batch of unaudited questions
    const table = source === "bank" ? "questions" : "pyq_questions";
    const cols =
      source === "bank"
        ? "id,title,question,options,type,questionimage,parent"
        : "id,question,answer_type,options,answer,year";
    const { data: rowsRaw, error: qErr } = await serversupabase
      .from(table)
      .select(cols)
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(batchSize);
    if (qErr) return res.status(500).json({ error: "question fetch failed" });
    const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
    if (!rows.length) {
      return res.status(200).json({ processed: 0, remaining_estimate: 0, flagged: 0 });
    }

    const ctxById = source === "bank" ? await chapterContext(rows.map((r) => r.parent)) : {};

    // 3) audit each question — sequential on purpose (rate-limit kindness)
    let flagged = 0;
    for (const row of rows) {
      const q = normalizeQuestion(source, row);
      if (source === "pyq") q.year = row.year;
      const ctx = source === "bank" ? ctxById[row.parent] : null;

      let audit = {
        source,
        question_id: row.id,
        verdict: "unclear",
        ai_answer: null,
        marked_answer: q.markedAnswer,
        note: null,
        model: null,
        reviewed: false,
      };

      if (q.structuralIssue) {
        // options column itself is damaged — no point burning tokens
        audit.verdict = "broken";
        audit.note = `structure: ${q.structuralIssue}`;
      } else if (!q.text) {
        audit.verdict = "broken";
        audit.note = "structure: empty question text";
      } else {
        try {
          const { text, model } = await callGemini(key, buildPrompt(q, ctx));
          audit.model = model;
          const parsed = parseAuditJson(text);
          if (!parsed) {
            audit.verdict = "unclear";
            audit.note = "ai_error: unparseable AI response";
          } else {
            audit.verdict = parsed.verdict;
            audit.ai_answer = parsed.my_answer || null;
            const noteBits = [...parsed.issues];
            if (q.mode === "mcq" && Array.isArray(q.options)) {
              // canonicalise ai_answer to "LETTER — text" so resolve.js
              // can map it back onto the options array reliably
              const idx = mapAiToOption(parsed.my_answer, q.options);
              if (idx >= 0) {
                audit.ai_answer = `${letterOf(idx)} — ${q.options[idx].title}`;
                // trust the mapping over the model's own comparison
                if (idx === q.markedIdx && audit.verdict === "mismatch") audit.verdict = "ok";
                if (idx !== q.markedIdx && audit.verdict === "ok") {
                  audit.verdict = "mismatch";
                  noteBits.push("AI answer differs from marked option");
                }
              } else if (audit.verdict === "mismatch") {
                // claims mismatch but its answer maps to no option — human eyes needed
                audit.verdict = "unclear";
                noteBits.push("AI answer did not match any option");
              }
            }
            if (q.mode === "text_only") noteBits.unshift("no_stored_answer:text_check_only");
            audit.note = noteBits.length ? noteBits.join(" · ").slice(0, 900) : null;
          }
        } catch (e) {
          audit.verdict = "unclear";
          audit.note = "ai_error: gemini unreachable or all models failed";
        }
      }

      if (audit.verdict !== "ok") flagged++;
      const { error: upErr } = await serversupabase
        .from("question_audits")
        .upsert(audit, { onConflict: "source,question_id" });
      if (upErr) console.error("audit upsert failed for", source, row.id, upErr.message);
    }

    // 4) how many are left past this batch
    const lastId = rows[rows.length - 1].id;
    const { count } = await serversupabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .gt("id", lastId);

    return res.status(200).json({
      processed: rows.length,
      remaining_estimate: count ?? 0,
      flagged,
    });
  } catch (e) {
    console.error("audit run failed:", e?.message);
    return res.status(500).json({ error: "audit run failed" });
  }
}
