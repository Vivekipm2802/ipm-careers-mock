// ============================================================
// PYQReadiness — "PYQ readiness, exam by exam" card on the
// Performance page (2026-09 design sprint 1, approved preview).
//
// For each of the student's TARGET exams (from their profile;
// falls back to all active exams): coverage of that exam's real
// past-paper bank, accuracy on it, best year, and the weakest
// topics — with deep links into the PYQ shelf. PYQs here are a
// practice-coverage lens (this section is ABOUT the PYQ bank);
// exam readiness itself lives in mocks and the analytics pages.
//
// All reads are client-side under existing RLS (the PYQ tables
// and pyq_attempts are already read by PYQManager the same way).
// Every card self-hides on missing data — this component must
// never block the Performance page.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useNMNContext } from "./NMNContext";

// Profile target_exams labels → pyq_exams ids.
const TARGET_TO_EXAM = {
  "IPMAT Indore": "ipmat_indore",
  "IPMAT Rohtak": "ipmat_rohtak",
  "JIPMAT": "jipmat",
  "IIM Kozhikode": "iimk_5yr",
  "IIM Bangalore UG": "iimb_ug",
};

// Topic id → section bucket (QA / VA / LR). Hand-mapped from the
// live pyq_topics table (Sep 2026) — new topics default to null
// and simply don't count toward the split.
const TOPIC_SECTION = (() => {
  const m = {};
  const qa = [12, 17, 18, 19, 20, 44, 45, 46, 47, 48, 49, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 82, 83, 84, 85, 86, 87];
  const va = [72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 106];
  const lr = [71, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105];
  qa.forEach((id) => { m[id] = "QA"; });
  va.forEach((id) => { m[id] = "VA"; });
  lr.forEach((id) => { m[id] = "LR"; });
  return m;
})();
const SECTION_LABELS = { QA: "Quant", VA: "Verbal", LR: "Logical" };

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export default function PYQReadiness() {
  const { setCTXSlug } = useNMNContext();
  const [data, setData] = useState(null); // null loading · false hidden

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const email = u?.user?.email;
        if (!email) { if (alive) setData(false); return; }

        // 1 · exams + the student's targets
        const [{ data: exams }, { data: prof }] = await Promise.all([
          supabase.from("pyq_exams").select("id,name,status,seq").order("seq"),
          supabase.from("student_profiles").select("target_exams").ilike("email", email).limit(1),
        ]);
        const active = (exams || []).filter((e) => e.status === "active");
        if (!active.length) { if (alive) setData(false); return; }
        const targets = (prof && prof[0] && Array.isArray(prof[0].target_exams) ? prof[0].target_exams : [])
          .map((t) => TARGET_TO_EXAM[t]).filter(Boolean);
        const targetSet = new Set(targets);
        const picked = targetSet.size ? active.filter((e) => targetSet.has(e.id)) : active;
        if (!picked.length) { if (alive) setData(false); return; }

        // 2 · the bank (id, exam, year — small fields, one query)
        const { data: qs } = await supabase
          .from("pyq_questions").select("id,exam,year").limit(4000);
        if (!qs || !qs.length) { if (alive) setData(false); return; }
        const qMeta = new Map(qs.map((q) => [String(q.id), q]));

        // 3 · the student's attempts, latest verdict per question
        const { data: atts } = await supabase
          .from("pyq_attempts").select("question_id,result,created_at")
          .eq("user", email).order("created_at", { ascending: true }).limit(20000);
        const verdict = new Map(); // qid → 'right' | 'wrong'
        (atts || []).forEach((a) => {
          if (a.result === "right" || a.result === "wrong") verdict.set(String(a.question_id), a.result);
        });

        // 4 · topics for the attempted questions (weak-topic chips +
        //     PYQ-only section split), chunked in()s
        const attemptedIds = [...verdict.keys()];
        const topicRows = [];
        for (const part of chunk(attemptedIds, 250)) {
          const { data: tr } = await supabase
            .from("pyq_question_topics").select("question_id,topic_id").in("question_id", part);
          if (tr) topicRows.push(...tr);
        }
        const { data: topicNames } = await supabase.from("pyq_topics").select("id,name");
        const tName = new Map((topicNames || []).map((t) => [t.id, t.name]));

        // ── aggregate per exam ──
        const perExam = picked.map((e) => {
          const bank = qs.filter((q) => q.exam === e.id);
          const att = bank.filter((q) => verdict.has(String(q.id)));
          const right = att.filter((q) => verdict.get(String(q.id)) === "right").length;
          const acc = att.length ? Math.round((right / att.length) * 100) : null;
          // best year (≥5 judged attempts)
          const byYear = {};
          att.forEach((q) => {
            const y = q.year;
            if (!byYear[y]) byYear[y] = { n: 0, r: 0 };
            byYear[y].n += 1;
            if (verdict.get(String(q.id)) === "right") byYear[y].r += 1;
          });
          let bestYear = null;
          Object.entries(byYear).forEach(([y, v]) => {
            if (v.n >= 5) {
              const a = Math.round((v.r / v.n) * 100);
              if (!bestYear || a > bestYear.acc) bestYear = { year: y, acc: a };
            }
          });
          // weak topics within this exam (≥3 judged, acc < 60)
          const examAttSet = new Set(att.map((q) => String(q.id)));
          const byTopic = {};
          topicRows.forEach((tr) => {
            const qid = String(tr.question_id);
            if (!examAttSet.has(qid)) return;
            if (!byTopic[tr.topic_id]) byTopic[tr.topic_id] = { n: 0, r: 0 };
            byTopic[tr.topic_id].n += 1;
            if (verdict.get(qid) === "right") byTopic[tr.topic_id].r += 1;
          });
          const weak = Object.entries(byTopic)
            .map(([tid, v]) => ({ name: tName.get(Number(tid)) || "", acc: Math.round((v.r / v.n) * 100), n: v.n }))
            .filter((t) => t.name && t.n >= 3 && t.acc < 60)
            .sort((a, b) => a.acc - b.acc).slice(0, 3);
          return { id: e.id, name: e.name, total: bank.length, attempted: att.length, acc, bestYear, weak };
        }).filter((e) => e.total > 0);

        // ── PYQ-only section split (across all attempted) ──
        const bySec = { QA: { n: 0, r: 0 }, VA: { n: 0, r: 0 }, LR: { n: 0, r: 0 } };
        const seenPerQ = new Map(); // count a question once, first mapped topic wins
        topicRows.forEach((tr) => {
          const qid = String(tr.question_id);
          if (seenPerQ.has(qid)) return;
          const sec = TOPIC_SECTION[tr.topic_id];
          if (!sec || !verdict.has(qid)) return;
          seenPerQ.set(qid, sec);
          bySec[sec].n += 1;
          if (verdict.get(qid) === "right") bySec[sec].r += 1;
        });
        const split = Object.entries(bySec)
          .filter(([, v]) => v.n >= 5)
          .map(([s, v]) => ({ s, label: SECTION_LABELS[s], acc: Math.round((v.r / v.n) * 100), n: v.n }));

        if (alive) setData({ perExam, split, anyAttempts: attemptedIds.length > 0, totalBank: qs.length, totalAttempted: attemptedIds.length });
      } catch (e) {
        if (alive) setData(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (data === false || (data && !data.perExam.length)) return null;

  const card = {
    background: "var(--c-surface)", border: "1px solid var(--c-border-faint)",
    borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "20px 22px", flexShrink: 0,
  };

  return (
    <div className="mt-4" style={card}>
      <div className="ds-display" style={{ fontSize: 17 }}>PYQ readiness, exam by exam</div>
      <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 2 }}>
        how much of each exam&apos;s real past-paper bank you have faced — coverage is practice, not prediction
      </div>

      {data === null ? (
        <div style={{ padding: "14px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Reading your PYQ history…</div>
      ) : (
        <>
          <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {data.perExam.map((e) => {
              const pct = e.total ? Math.round((e.attempted / e.total) * 100) : 0;
              const C = 2 * Math.PI * 26;
              return (
                <div key={e.id} style={{ background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 13, padding: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.name}</div>
                  <div style={{ display: "flex", gap: 13, alignItems: "center", marginTop: 10 }}>
                    <div style={{ position: "relative", width: 62, height: 62, flexShrink: 0 }}>
                      <svg width="62" height="62" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="31" cy="31" r="26" stroke="var(--c-border-faint)" strokeWidth="6" fill="none" />
                        <circle cx="31" cy="31" r="26" stroke="var(--c-brand-gold)" strokeWidth="6" fill="none"
                          strokeDasharray={`${(pct / 100) * C} ${C}`} strokeLinecap="round" />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>{pct}%</div>
                    </div>
                    <div style={{ fontSize: 11.5, lineHeight: 1.8, color: "var(--c-text-secondary)" }}>
                      Faced <b style={{ color: "var(--c-text-primary)" }}>{e.attempted} / {e.total}</b><br />
                      Accuracy <b style={{ color: "var(--c-text-primary)" }}>{e.acc != null ? `${e.acc}%` : "—"}</b><br />
                      Best year <b style={{ color: "var(--c-text-primary)" }}>{e.bestYear ? `${e.bestYear.year} · ${e.bestYear.acc}%` : "—"}</b>
                    </div>
                  </div>
                  {e.weak.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                      {e.weak.map((t) => (
                        <span key={t.name} style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", background: "var(--c-danger-soft, rgba(197,48,48,.12))", color: "var(--c-danger)" }}>
                          {t.name.trim()} · {t.acc}%
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setCTXSlug && setCTXSlug("pyqconcept")}
                    style={{ marginTop: 11, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "6px 13px", background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {e.attempted === 0 ? "Start this bank →" : "Open the PYQ shelf →"}
                  </button>
                </div>
              );
            })}
          </div>

          {data.split.length >= 2 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed var(--c-border-faint)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
                Accuracy on real exam questions, by section
              </div>
              <div style={{ display: "flex", gap: 22, marginTop: 8, flexWrap: "wrap" }}>
                {data.split.map((s) => (
                  <span key={s.s} style={{ fontSize: 13 }}>
                    {s.label} <b>{s.acc}%</b> <span style={{ fontSize: 10.5, color: "var(--c-text-tertiary)" }}>({s.n} qs)</span>
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 6 }}>
                The gap between this and your concept-test split above is itself the insight — real papers punish differently.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
