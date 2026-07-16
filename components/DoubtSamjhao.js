// ============================================================
// Doubt Samjhao — AI-first doubts page (Doubts tab).
//
// Two modes:
//  · "Mere galat questions": pick any question you've gotten
//    wrong (vault data — options + correct answer known, so the
//    explanation is precise and cache hits are instant).
//  · "Apna sawaal likho": free text from books/classes.
//
// Same shared cache (doubt_explanations) and daily pool
// (doubt_requests, DAILY_DOUBTS/day — cached answers are free)
// as the vault's Samjhao. Mentor escalation (DoubtsPad) below.
//
// Pure logic exported for tests: plainText, filterItems.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { DAILY_DOUBTS } from "./MistakeVault";

export function plainText(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pure: case-insensitive search across question text + chapter.
export function filterItems(items, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return items || [];
  return (items || []).filter(
    (it) => it.text.toLowerCase().includes(q) || String(it.chapter || "").toLowerCase().includes(q)
  );
}

const LIST_DEFAULT = 6;

export default function DoubtSamjhao({ userData }) {
  const [mode, setMode] = useState("mine"); // mine | write
  const [items, setItems] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);
  const [freeText, setFreeText] = useState("");
  const [state, setState] = useState(null); // null | {loading} | {text} | {error}
  const [doubtsToday, setDoubtsToday] = useState(0);

  useEffect(() => {
    if (!userData?.email) return;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    supabase
      .from("doubt_requests")
      .select("id", { count: "exact", head: true })
      .eq("user", userData.email)
      .gte("created_at", startOfToday.toISOString())
      .then(({ count }) => setDoubtsToday(count || 0));

    Promise.all([
      supabase.rpc("get_my_mistakes", { p_email: userData.email }),
      supabase.rpc("get_my_own_mistakes", { p_email: userData.email }),
    ]).then(([mine, own]) => {
      const a = (Array.isArray(mine.data) ? mine.data : [])
        .filter((it) => it.title || it.question)
        .map((it) => ({
          question_id: it.question_id,
          text: plainText(`${it.title || ""} ${it.question || ""}`) || `Question #${it.question_id}`,
          chapter: it.chapter || "Other",
          options: it.options,
        }));
      const b = (Array.isArray(own.data) ? own.data : []).map((m) => ({
        question_id: -m.id,
        text: plainText(m.question),
        chapter: m.chapter || "Added by you",
        options: null,
        answer: m.answer,
      }));
      setItems([...a, ...b]);
    });
  }, [userData?.email]);

  const ask = async () => {
    if (state?.loading || !userData?.email) return;
    const isMine = mode === "mine";
    if (isMine && !selected) return;
    const text = isMine ? selected.text : freeText.trim();
    if (!text) return;
    setState({ loading: true });

    // cached answer? (portal questions only) — free, instant
    if (isMine) {
      const { data: cached } = await supabase
        .from("doubt_explanations")
        .select("explanation")
        .eq("question_id", selected.question_id)
        .maybeSingle();
      if (cached?.explanation) {
        setState({ text: cached.explanation });
        return;
      }
    }

    if (doubtsToday >= DAILY_DOUBTS) {
      setState({ error: `Aaj ke ${DAILY_DOUBTS} Samjhao ho gaye — baaki kal. Ya neeche se mentor se poochho.` });
      return;
    }

    try {
      const body = { question: text };
      if (isMine && Array.isArray(selected.options)) {
        body.options = selected.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${plainText(o.title)}`).join(" | ");
        body.correct = selected.options.filter((o) => o.isCorrect).map((o) => plainText(o.title)).join(", ");
      }
      if (isMine && selected.answer) body.correct = selected.answer;
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.explanation) {
        setState({ error: "Samjhao abhi available nahi — thodi der mein try karo, ya mentor se poochho." });
        return;
      }
      setState({ text: j.explanation });
      setDoubtsToday((n) => n + 1);
      await supabase.from("doubt_requests").insert({ user: userData.email, question_id: isMine ? selected.question_id : null });
      if (isMine) {
        await supabase.from("doubt_explanations").insert({ question_id: selected.question_id, explanation: j.explanation });
      }
    } catch (e) {
      setState({ error: "Samjhao abhi available nahi — thodi der mein try karo, ya mentor se poochho." });
    }
  };

  const left = Math.max(0, DAILY_DOUBTS - doubtsToday);
  const shown = filterItems(items || [], query);
  const listed = showAll ? shown : shown.slice(0, LIST_DEFAULT);

  const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", flexShrink: 0 };
  const goldBtn = { background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 };
  const ghostBtn = { background: "transparent", color: "var(--c-text-primary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-faint)", borderRadius: 999, padding: "10px 22px", cursor: "pointer", fontFamily: "inherit" };
  const modeBtn = (on) => ({ background: on ? "var(--c-brand-gold-tint)" : "transparent", border: `1px solid ${on ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`, color: on ? "var(--c-brand-gold)" : "var(--c-text-secondary)", borderRadius: 999, padding: "8px 20px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mt-10" style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>Doubts</div>
        <h1 className="ds-display" style={{ fontSize: "clamp(26px, 3.8vw, 36px)", lineHeight: 1.1 }}>
          Pehle AI se <span className="ds-accent ds-grad-text">Samjho.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.6, maxWidth: 700 }}>
          Koi bhi sawaal — portal ka, book ka, class ka. Seconds mein step-by-step Hinglish explanation. Phir bhi na samjhe toh mentor hai hi.
        </p>
      </header>

      <div className="max-w-[860px] mt-6 p-6 md:p-7" style={card}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button type="button" style={modeBtn(mode === "mine")} onClick={() => { setMode("mine"); setState(null); }}>
            Mere galat questions
          </button>
          <button type="button" style={modeBtn(mode === "write")} onClick={() => { setMode("write"); setState(null); }}>
            Apna sawaal likho
          </button>
        </div>

        {mode === "mine" && (
          <>
            {items === null && <div style={{ fontSize: 13, color: "var(--c-text-tertiary)" }}>Tumhare questions load ho rahe hain…</div>}
            {items !== null && items.length === 0 && (
              <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.6 }}>
                Abhi koi galat question collect nahi hua. Koi test do — ya upar se &quot;Apna sawaal likho&quot; use karo.
              </div>
            )}
            {items !== null && items.length > 0 && (
              <div style={{ border: "1px solid var(--c-border-faint)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--c-border-faint)" }}>
                  <Search size={14} style={{ color: "var(--c-text-tertiary)", flexShrink: 0 }} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
                    placeholder="Chapter ya words se search karo…"
                    style={{ background: "none", border: "none", outline: "none", color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 13, width: "100%" }}
                  />
                </div>
                {listed.map((it) => {
                  const on = selected?.question_id === it.question_id;
                  return (
                    <div
                      key={it.question_id}
                      onClick={() => { setSelected(it); setState(null); }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--c-border-faint)", cursor: "pointer", background: on ? "var(--c-brand-gold-tint)" : "transparent" }}
                    >
                      {it.question_id < 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-brand-gold)", border: "1px solid rgba(255, 182, 39, 0.35)", borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>YOURS</span>
                      )}
                      <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: on ? "var(--c-text-primary)" : "var(--c-text-secondary)" }}>
                        {it.text}
                      </span>
                      <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 11, color: "var(--c-text-tertiary)" }}>{it.chapter}</span>
                    </div>
                  );
                })}
                {shown.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--c-text-tertiary)" }}>Kuch nahi mila — spelling check karo ya doosre words try karo.</div>
                )}
                {shown.length > LIST_DEFAULT && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} style={{ background: "none", border: "none", padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left" }}>
                    {showAll ? "Show less" : `Show all ${shown.length} →`}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {mode === "write" && (
          <textarea
            rows={4}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Apna doubt yahan likho ya paste karo — book se, class se, kahin se bhi."
            style={{ width: "100%", background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 12, color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 14, padding: "13px 15px", resize: "vertical" }}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={ask}
            disabled={state?.loading || (mode === "mine" ? !selected : !freeText.trim())}
            style={{ ...goldBtn, opacity: state?.loading || (mode === "mine" ? !selected : !freeText.trim()) ? 0.5 : 1 }}
          >
            <Sparkles size={15} /> Samjhao
          </button>
          <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
            {left} of {DAILY_DOUBTS} left today · portal questions ke cached answers free hain
          </span>
        </div>

        {state?.loading && <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", marginTop: 14 }}>Samjha rahe hain…</div>}
        {state?.error && <div style={{ fontSize: 13, color: "var(--c-danger)", marginTop: 14 }}>{state.error}</div>}
        {state?.text && (
          <div style={{ borderRadius: 12, padding: "16px 18px", background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.75, color: "var(--c-text-secondary)", whiteSpace: "pre-wrap", marginTop: 16 }}>
            <b style={{ color: "var(--c-brand-gold)" }}>Samjhao:</b> {state.text}
          </div>
        )}
        {state?.text && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <a href="https://t.me/ipmatdoubtspad" target="_blank" rel="noreferrer" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
              Abhi bhi confusion? Ask a mentor <ArrowRight size={14} />
            </a>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>DoubtsPad pe apna sawaal bhejo — video solution milega</span>
          </div>
        )}
      </div>

      {/* mentor escalation — always available */}
      <div className="max-w-[860px] mt-6 mb-12 p-6 md:p-7" style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 240 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Ya seedha mentor se poochho</div>
            <div style={{ fontSize: 13, color: "var(--c-text-secondary)", marginTop: 4, lineHeight: 1.6 }}>
              Fast video solutions for all your doubts on <b>DoubtsPad</b>.
            </div>
          </div>
          <a href="https://t.me/ipmatdoubtspad" target="_blank" rel="noreferrer" style={{ ...goldBtn, textDecoration: "none" }}>
            Open DoubtsPad <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
