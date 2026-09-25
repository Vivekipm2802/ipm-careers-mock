// ============================================================
// PaperMockReport — "Real-paper mock report" on the Performance
// page (2026-09 design sprint 1, approved preview).
//
// Every past paper the student attempted as a timed mock, from
// /api/mock-journey (canonical rescoring, aggregate-only extras),
// with the category-wise official verdict from lib/paperCutoffs —
// the same gates the mock analytics page shows, summarised to one
// chip. Unattempted papers render as quiet grey rows so the gap
// itself nags. Self-hides entirely when the student has no paper
// attempts AND no profile (fresh accounts see nothing broken).
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import { PAPER_TESTS, realityCheck, CATS } from "@/lib/paperCutoffs";
import { PAPER_MOCKS } from "./PYQManager";
import { shortSectionName } from "@/lib/labels";

const EXAM_NAMES = { indore: "IPMAT Indore", jipmat: "JIPMAT", rohtak: "IPMAT Rohtak" };

export default function PaperMockReport() {
  const [mocks, setMocks] = useState(null); // journey rows
  const [cat, setCat] = useState("General");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/mock-journey", { headers });
        const data = res.ok ? await res.json() : null;
        if (alive) setMocks(Array.isArray(data?.mocks) ? data.mocks : []);
      } catch (e) {
        if (alive) setMocks([]);
      }
    })();
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const em = u?.user?.email;
        if (!em) return;
        const { data: rows } = await supabase
          .from("student_profiles").select("category").ilike("email", em).limit(1);
        if (alive && rows && rows.length && CATS.indexOf(rows[0].category) !== -1) setCat(rows[0].category);
      } catch (e) { /* General */ }
    })();
    return () => { alive = false; };
  }, []);

  const paperRows = useMemo(() => {
    if (!Array.isArray(mocks)) return null;
    const attempted = mocks.filter((m) => PAPER_TESTS[Number(m.testId)]);
    const attemptedIds = new Set(attempted.map((m) => Number(m.testId)));
    const rows = attempted.map((m) => {
      const meta = PAPER_TESTS[Number(m.testId)];
      let verdict = null;
      try {
        verdict = realityCheck(
          m.testId,
          (m.perSection || []).map((p) => ({ title: p.title, score: p.score, max: p.max })),
          m.score, m.maxMarks, cat
        );
      } catch (e) { /* no chip */ }
      let chip = null;
      if (verdict) {
        const all = verdict.rows.every((r) => r.cleared);
        if (verdict.kind === "indore") chip = { ok: all, text: all ? "all gates cleared" : `${verdict.rows.filter((r) => !r.cleared).length} gate${verdict.rows.filter((r) => !r.cleared).length > 1 ? "s" : ""} short` };
        else chip = { ok: all, text: all ? `cleared +${verdict.rows[0].got - verdict.rows[0].need}` : `${verdict.rows[0].got - verdict.rows[0].need} short` };
      }
      return { key: m.testId, title: m.title, date: m.created_at, score: m.score, max: m.maxMarks, uid: m.uid, perSection: m.perSection || [], chip, attempted: true, sort: `${meta.exam}-${meta.year}` };
    });
    // unattempted papers, grey rows (from the PYQ shelf's own map)
    const un = [];
    Object.entries(PAPER_MOCKS).forEach(([examId, list]) => {
      list.forEach((p) => {
        // find test id via PAPER_TESTS reverse title-less match: skip if attempted
        const tid = Object.entries(PAPER_TESTS).find(([, v]) => {
          const nameMap = { ipmat_indore: "indore", jipmat: "jipmat", ipmat_rohtak: "rohtak" };
          return nameMap[examId] === v.exam && v.year === p.y;
        });
        const idNum = tid ? Number(tid[0]) : null;
        if (idNum != null && attemptedIds.has(idNum)) return;
        const exam = tid ? PAPER_TESTS[idNum].exam : null;
        const title = exam ? `${EXAM_NAMES[exam]} ${p.y}` : null;
        if (title) un.push({ key: `un-${idNum}`, title, uid: p.uid, attempted: false, sort: `${exam}-${p.y}` });
      });
    });
    return { rows: rows.sort((a, b) => b.sort.localeCompare(a.sort)), un: un.sort((a, b) => b.sort.localeCompare(a.sort)) };
  }, [mocks, cat]);

  if (paperRows === null) return null;
  if (!paperRows.rows.length && !paperRows.un.length) return null;

  const card = {
    background: "var(--c-surface)", border: "1px solid var(--c-border-faint)",
    borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "20px 22px", flexShrink: 0,
  };
  const th = { fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)", textAlign: "left", padding: "6px 12px 8px 0" };
  const td = { padding: "10px 12px 10px 0", borderTop: "1px solid var(--c-border-faint)", verticalAlign: "middle", fontSize: 13 };

  return (
    <div className="mt-4" style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div className="ds-display" style={{ fontSize: 17 }}>Real-paper mock report</div>
          <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 2 }}>
            past papers attempted under the clock · verdicts vs that year&apos;s official cutoffs — compass only, they change every year
          </div>
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)}
          style={{ fontSize: 11, background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-faint)", borderRadius: 8, padding: "4px 7px", fontFamily: "inherit" }}>
          {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {paperRows.rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, minWidth: 520 }}>
            <thead>
              <tr><th style={th}>Paper</th><th style={th}>Score</th><th style={th}>Sections</th><th style={th}>vs that year</th><th style={th}></th></tr>
            </thead>
            <tbody>
              {paperRows.rows.map((r) => (
                <tr key={r.key}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.title}</td>
                  <td style={td}><b>{Math.max(0, r.score)}</b><span style={{ color: "var(--c-text-tertiary)" }}> /{r.max}</span></td>
                  <td style={{ ...td, fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
                    {r.perSection.map((p) => `${shortSectionName(p.title)} ${Math.max(0, p.score)}`).join(" · ")}
                  </td>
                  <td style={td}>
                    {r.chip ? (
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", borderRadius: 999, padding: "3px 10px", background: r.chip.ok ? "var(--c-success-soft, rgba(26,135,84,.12))" : "var(--c-danger-soft, rgba(197,48,48,.12))", color: r.chip.ok ? "var(--c-success)" : "var(--c-danger)", whiteSpace: "nowrap" }}>
                        {r.chip.text}
                      </span>
                    ) : <span style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <a href={`/mock/analytics/${r.uid}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", textDecoration: "none", whiteSpace: "nowrap" }}>
                      Full report →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paperRows.un.length > 0 && (
        <div style={{ marginTop: paperRows.rows.length ? 14 : 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
            Not attempted yet · {paperRows.un.length} paper{paperRows.un.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
            {paperRows.un.map((r) => (
              <a key={r.key} href={`/mock/${r.uid}`} target="_blank" rel="noreferrer"
                style={{ fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: "5px 12px", border: "1px dashed var(--c-border-soft)", color: "var(--c-text-tertiary)", textDecoration: "none" }}>
                {r.title} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
