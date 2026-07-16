// ============================================================
// GET /api/audit/status — audit counts + review queue (admin only).
//
// question_audits has RLS on with NO policies (service-role only),
// so the browser can never read it directly — the QuestionAudit
// dashboard gets everything through this route.
//
// Returns:
// {
//   totals: { bankTotal, pyqTotal, bankAudited, pyqAudited,
//             flagged, fixed, keptMarked, dismissed },
//   queue:  [ up to 50 unreviewed non-ok audits, newest-flagged
//             first by id, with question content joined in ]
// }
// ============================================================

import { requireAdmin } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

async function countOf(builder) {
  try {
    const { count, error } = await builder;
    if (error) return 0;
    return count ?? 0;
  } catch (e) {
    return 0;
  }
}

// chapter/test context: questions.parent → levels → m_categories → categories
async function bankContext(parentIds) {
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
    // optional context
  }
  return out;
}

function parseOpts(raw) {
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

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const user = await requireAdmin(req);
  if (!user) return res.status(401).json({ error: "Admin only" });

  try {
    const [bankTotal, pyqTotal, bankAudited, pyqAudited, flagged, fixed, keptMarked, dismissed] =
      await Promise.all([
        countOf(serversupabase.from("questions").select("id", { count: "exact", head: true })),
        countOf(serversupabase.from("pyq_questions").select("id", { count: "exact", head: true })),
        countOf(serversupabase.from("question_audits").select("id", { count: "exact", head: true }).eq("source", "bank")),
        countOf(serversupabase.from("question_audits").select("id", { count: "exact", head: true }).eq("source", "pyq")),
        countOf(serversupabase.from("question_audits").select("id", { count: "exact", head: true }).neq("verdict", "ok").eq("reviewed", false)),
        countOf(serversupabase.from("question_audits").select("id", { count: "exact", head: true }).eq("resolution", "fixed")),
        countOf(serversupabase.from("question_audits").select("id", { count: "exact", head: true }).eq("resolution", "kept_marked")),
        countOf(serversupabase.from("question_audits").select("id", { count: "exact", head: true }).eq("resolution", "dismissed")),
      ]);

    // review queue: latest 50 unreviewed flagged audits
    const { data: auditsRaw } = await serversupabase
      .from("question_audits")
      .select("id,source,question_id,verdict,ai_answer,marked_answer,note,model,created_at")
      .neq("verdict", "ok")
      .eq("reviewed", false)
      .order("id", { ascending: false })
      .limit(50);
    const audits = Array.isArray(auditsRaw) ? auditsRaw : [];

    // join question content server-side
    const bankIds = audits.filter((a) => a.source === "bank").map((a) => a.question_id);
    const pyqIds = audits.filter((a) => a.source === "pyq").map((a) => a.question_id);

    const [bankQ, pyqQ] = await Promise.all([
      bankIds.length
        ? serversupabase.from("questions").select("id,title,question,options,type,questionimage,parent").in("id", bankIds)
        : Promise.resolve({ data: [] }),
      pyqIds.length
        ? serversupabase.from("pyq_questions").select("id,question,answer_type,options,answer,year").in("id", pyqIds)
        : Promise.resolve({ data: [] }),
    ]);

    const bankById = {};
    (bankQ.data || []).forEach((q) => (bankById[q.id] = q));
    const pyqById = {};
    (pyqQ.data || []).forEach((q) => (pyqById[q.id] = q));
    const ctx = await bankContext((bankQ.data || []).map((q) => q.parent));

    const queue = audits
      .map((a) => {
        const src = a.source === "bank" ? bankById[a.question_id] : pyqById[a.question_id];
        if (!src) return null; // question deleted since audit — skip
        let options = null;
        const rawOpts = parseOpts(src.options);
        if (Array.isArray(rawOpts)) {
          options = rawOpts.map((o) => ({
            title: String((o && (o.title ?? o.text)) ?? ""),
            isCorrect: !!(o && (o.isCorrect ?? o.is_correct)),
          }));
        }
        const level = a.source === "bank" ? ctx[src.parent] : null;
        return {
          ...a,
          question: {
            html: String(src.question || src.title || ""),
            image: a.source === "bank" ? src.questionimage || null : null,
            type: a.source === "bank" ? src.type : src.answer_type,
            options,
            answer: a.source === "pyq" ? src.answer ?? null : null,
            chapter: level ? level.chapter : null,
            test: level ? level.test : a.source === "pyq" && src.year ? `PYQ ${src.year}` : null,
          },
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      totals: { bankTotal, pyqTotal, bankAudited, pyqAudited, flagged, fixed, keptMarked, dismissed },
      queue,
    });
  } catch (e) {
    console.error("audit status failed:", e?.message);
    return res.status(500).json({ error: "status failed" });
  }
}
