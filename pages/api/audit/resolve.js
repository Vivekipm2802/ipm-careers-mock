// ============================================================
// POST /api/audit/resolve — act on one flagged audit (admin only).
//
// Body: { auditId, action: 'accept_ai' | 'keep' | 'dismiss' }
//
//  accept_ai — bank MCQ only. Rewrites questions.options isCorrect
//              flags so the AI-chosen option becomes the correct
//              one. run.js stores ai_answer canonically as
//              "B — <option text>", so mapping is letter-first
//              with a title-equality fallback.
//              PYQ accept_ai is intentionally rejected: PYQ fixes
//              stay manual in the PYQ Manager (answer/explanation/
//              options all may need editing together).
//  keep      — human confirms the marked answer is right.
//  dismiss   — not worth acting on (duplicate, retired test, etc).
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";
import { mapAiToOption, letterOf } from "./run";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const user = await requireAdmin(req);
  if (!user) return res.status(401).json({ error: "Admin only" });

  const { auditId, action } = req.body || {};
  if (!auditId || !["accept_ai", "keep", "dismiss"].includes(action)) {
    return res.status(400).json({ error: "need auditId and action: accept_ai | keep | dismiss" });
  }

  try {
    const { data: audits, error: aErr } = await serversupabase
      .from("question_audits")
      .select("*")
      .eq("id", auditId)
      .limit(1);
    if (aErr || !audits || !audits.length) {
      return res.status(404).json({ error: "audit not found" });
    }
    const audit = audits[0];

    if (action === "keep" || action === "dismiss") {
      const resolution = action === "keep" ? "kept_marked" : "dismissed";
      const { error } = await serversupabase
        .from("question_audits")
        .update({ reviewed: true, resolution })
        .eq("id", auditId);
      if (error) return res.status(500).json({ error: "update failed" });
      return res.status(200).json({ ok: true, resolution });
    }

    // ── accept_ai ──
    if (audit.source !== "bank") {
      return res.status(400).json({
        error:
          "PYQ answers can't be auto-fixed — edit the question in the PYQ Manager, then mark this audit as kept or dismissed.",
      });
    }
    if (!audit.ai_answer) {
      return res.status(400).json({ error: "this audit has no AI answer to apply" });
    }

    const { data: qs, error: qErr } = await serversupabase
      .from("questions")
      .select("id,type,options")
      .eq("id", audit.question_id)
      .limit(1);
    if (qErr || !qs || !qs.length) {
      return res.status(404).json({ error: "question no longer exists" });
    }
    const question = qs[0];
    let options = question.options;
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = null;
      }
    }
    if (question.type !== "options" || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        error: "accept_ai only works for MCQ bank questions with a valid options array — fix this one manually.",
      });
    }

    const idx = mapAiToOption(audit.ai_answer, options);
    if (idx < 0) {
      return res.status(400).json({
        error: "the AI answer doesn't map to any option — fix this question manually, then dismiss.",
      });
    }

    const newOptions = options.map((o, i) => ({ ...o, isCorrect: i === idx }));
    const { error: uErr } = await serversupabase
      .from("questions")
      .update({ options: newOptions })
      .eq("id", audit.question_id);
    if (uErr) return res.status(500).json({ error: "question update failed" });

    const { error: rErr } = await serversupabase
      .from("question_audits")
      .update({ reviewed: true, resolution: "fixed" })
      .eq("id", auditId);
    if (rErr) return res.status(500).json({ error: "question fixed, but audit row update failed — refresh" });

    return res.status(200).json({ ok: true, resolution: "fixed", correctOption: letterOf(idx) });
  } catch (e) {
    console.error("audit resolve failed:", e?.message);
    return res.status(500).json({ error: "resolve failed" });
  }
}
