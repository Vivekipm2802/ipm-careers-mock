// ============================================================
// Doubt Samjhao — AI-first doubts page (Doubts tab), built from
// the dashboard's own patterns: QuickAction mode cards, a
// rows-in-one-card list (Today's classes), the gold mock-banner
// for the ask step, and the DailyQuiz verdict box for answers.
//
// Two modes:
//  · "Mere galat questions": pick any question you've gotten
//    wrong (options + correct answer known → precise explanation,
//    shared-cache hits are instant and free).
//  · "Apna sawaal likho": free text from books/classes.
//
// Same cache (doubt_explanations) and daily pool (doubt_requests,
// DAILY_DOUBTS/day) as the vault's Samjhao. DoubtsPad escalation.
//
// Pure logic exported for tests: plainText, filterItems.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState } from "react";
import { ArrowRight, PenLine, Play, RotateCcw, Search, Sparkles } from "lucide-react";
import { DAILY_DOUBTS } from "./MistakeVault";
import PortalTour, { useFirstVisitTour } from "./PortalTour";

const DOUBTS_TOUR_STEPS = [
  {
    target: "[data-tour='doubts-modes']",
    title: "Do raaste",
    desc: "Apne galat questions se poochho, ya koi bhi sawaal type karo.",
  },
  {
    target: "[data-tour='doubts-list']",
    title: "Sawaal chuno",
    desc: "Portal ke questions ka answer AI ko already pata hai — explanation sharp milti hai.",
  },
  {
    target: "[data-tour='doubts-mentor']",
    title: "Mentor hamesha hai",
    desc: "AI se na samjhe toh DoubtsPad pe video solution.",
  },
];

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
  const [state, setState] = useState(null); // null | {loading} | {text, chapter} | {error}
  const [doubtsToday, setDoubtsToday] = useState(0);
  // mini-tour: auto on first visit, replay via "How it works?"
  const [tourRun, setTourRun] = useFirstVisitTour("tour_doubts_v1");

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
        .map((it) => {
          const text = plainText(`${it.title || ""} ${it.question || ""}`);
          return {
            question_id: it.question_id,
            text: text || `Image-based question · #${it.question_id}`,
            chapter: it.chapter || "Other",
            options: it.options,
          };
        });
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
    const chapter = isMine ? selected.chapter : "Tumhara sawaal";
    setState({ loading: true });

    if (isMine) {
      const { data: cached } = await supabase
        .from("doubt_explanations")
        .select("explanation")
        .eq("question_id", selected.question_id)
        .maybeSingle();
      if (cached?.explanation) {
        setState({ text: cached.explanation, chapter });
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
      setState({ text: j.explanation, chapter });
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
  const readyText = mode === "mine" ? selected?.text : freeText.trim();

  const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", flexShrink: 0 };
  const tile = { width: 38, height: 38, borderRadius: 12, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", display: "grid", placeItems: "center", flexShrink: 0 };
  const qaCard = (on) => ({
    display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left",
    background: "var(--c-surface)", border: `1px solid ${on ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`,
    borderRadius: 12, padding: 16, cursor: "pointer", boxShadow: "var(--c-shadow-xs)", fontFamily: "inherit", width: "100%",
  });
  const ghostBtn = { background: "transparent", color: "var(--c-text-primary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-faint)", borderRadius: 999, padding: "10px 22px", cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 };

  const QARow = ({ Icon, title, desc, on, onClick, href }) => {
    const inner = (
      <>
        <span style={tile}><Icon size={19} /></span>
        <span style={{ minWidth: 0, flex: 1, display: "block" }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--c-text-primary)" }}>{title}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--c-text-secondary)", marginTop: 2, lineHeight: 1.5 }}>{desc}</span>
        </span>
      </>
    );
    return href ? (
      <a href={href} target="_blank" rel="noreferrer" style={{ ...qaCard(false), textDecoration: "none" }}>{inner}</a>
    ) : (
      <button type="button" onClick={onClick} style={qaCard(on)}>{inner}</button>
    );
  };

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mt-10" style={{ flexShrink: 0 }}>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08 }}>
            Pehle AI se <span className="ds-accent ds-grad-text">Samjho.</span>
          </h1>
          <button
            type="button"
            onClick={() => setTourRun(true)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--c-text-tertiary)", textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}
          >
            How it works?
          </button>
        </div>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.6, maxWidth: 700 }}>
          Koi bhi sawaal — portal ka, book ka, class ka. Seconds mein step-by-step Hinglish explanation.
        </p>
      </header>

      {/* mode: QuickAction cards */}
      <div className="grid md:grid-cols-2 gap-4 mt-6 max-w-[1000px]" style={{ flexShrink: 0 }} data-tour="doubts-modes">
        <QARow
          Icon={RotateCcw}
          title="Mere galat questions"
          desc="Jo test mein galat hue — options aur sahi answer AI ko already pata hai"
          on={mode === "mine"}
          onClick={() => { setMode("mine"); setState(null); }}
        />
        <QARow
          Icon={PenLine}
          title="Apna sawaal likho"
          desc="Book, class, kahin se bhi — type ya paste karo"
          on={mode === "write"}
          onClick={() => { setMode("write"); setState(null); }}
        />
      </div>

      {/* the list / the textarea — one card, rows inside */}
      <div className="max-w-[1000px] mt-5" style={{ ...card, padding: "6px 22px" }} data-tour="doubts-list">
        <div className="flex items-center justify-between gap-3 flex-wrap" style={{ padding: "16px 0 12px", borderBottom: "1px solid var(--c-border-faint)" }}>
          <span className="ds-display" style={{ fontSize: 17 }}>
            {mode === "mine" ? "Tumhare galat questions" : "Tumhara sawaal"}
          </span>
          {mode === "mine" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 999, padding: "7px 14px" }}>
              <Search size={13} style={{ color: "var(--c-text-tertiary)" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
                placeholder="Search chapter ya words…"
                style={{ background: "none", border: "none", outline: "none", color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 12.5, width: 190 }}
              />
            </span>
          )}
        </div>

        {mode === "mine" && (
          <>
            {items === null && <div style={{ padding: "16px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Tumhare questions load ho rahe hain…</div>}
            {items !== null && items.length === 0 && (
              <div style={{ padding: "16px 0", fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.6 }}>
                Abhi koi galat question collect nahi hua. Koi test do — ya &quot;Apna sawaal likho&quot; use karo.
              </div>
            )}
            {listed.map((it, i, arr) => {
              const on = selected?.question_id === it.question_id;
              return (
                <div
                  key={it.question_id}
                  onClick={() => { setSelected(it); setState(null); }}
                  className="flex items-center gap-3.5"
                  style={{ padding: "14px 0", borderBottom: i < arr.length - 1 || shown.length > LIST_DEFAULT ? "1px solid var(--c-border-faint)" : "none", cursor: "pointer" }}
                >
                  <span style={{ width: 16, height: 16, borderRadius: 999, flexShrink: 0, border: `1.5px solid ${on ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`, background: on ? "radial-gradient(circle at center, var(--c-brand-gold) 0 45%, transparent 50%)" : "transparent" }} />
                  {it.question_id < 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-brand-gold)", border: "1px solid rgba(255, 182, 39, 0.35)", background: "var(--c-brand-gold-tint)", borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>YOURS</span>
                  )}
                  <span className="min-w-0 flex-1" style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: on ? "var(--c-text-primary)" : "var(--c-text-secondary)" }}>
                    {it.text}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, color: "var(--c-text-tertiary)" }}>{it.chapter}</span>
                </div>
              );
            })}
            {items !== null && items.length > 0 && shown.length === 0 && (
              <div style={{ padding: "14px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Kuch nahi mila — doosre words try karo.</div>
            )}
            {shown.length > LIST_DEFAULT && (
              <button type="button" onClick={() => setShowAll((v) => !v)} style={{ background: "none", border: "none", padding: "13px 0", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}>
                {showAll ? "Show less" : `Show all ${shown.length} →`}
              </button>
            )}
          </>
        )}

        {mode === "write" && (
          <div style={{ padding: "16px 0" }}>
            <textarea
              rows={4}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Apna doubt yahan likho ya paste karo — book se, class se, kahin se bhi."
              style={{ width: "100%", background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 12, color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 14, padding: "13px 15px", resize: "vertical" }}
            />
          </div>
        )}
      </div>

      {/* ask banner — the dashboard's mock-banner pattern */}
      {readyText ? (
        <div className="max-w-[1000px] mt-5 flex items-center gap-4 flex-wrap" style={{ borderRadius: 16, flexShrink: 0, background: "var(--c-mock-banner)", color: "var(--c-mock-banner-text)", border: "1px solid var(--c-mock-banner-line)", padding: "18px 24px" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.85 }}>
              <Sparkles size={13} /> Ready to samjho
            </div>
            <div className="ds-display" style={{ fontSize: 16.5, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {readyText}
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>
              {left} of {DAILY_DOUBTS} left today · cached answers free
            </div>
          </div>
          <button
            type="button"
            onClick={ask}
            disabled={!!state?.loading}
            style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, opacity: state?.loading ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {state?.loading ? "Samjha rahe hain…" : <>Samjhao <ArrowRight size={15} /></>}
          </button>
        </div>
      ) : (
        <div className="max-w-[1000px] mt-4" style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", flexShrink: 0 }}>
          {mode === "mine" ? "Upar se ek question chuno — phir Samjhao." : "Apna sawaal likho — phir Samjhao."} · {left} of {DAILY_DOUBTS} left today
        </div>
      )}

      {/* answer — DailyQuiz verdict pattern */}
      {state?.error && (
        <div className="max-w-[1000px] mt-4" style={{ fontSize: 13, color: "var(--c-danger)", flexShrink: 0 }}>{state.error}</div>
      )}
      {state?.text && (
        <div className="max-w-[1000px] mt-5 p-6" style={card}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-brand-gold)" }}>
            Samjhao · {state.chapter}
          </span>
          <div className="rounded-[12px] mt-3 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.8, color: "var(--c-text-secondary)", whiteSpace: "pre-wrap" }}>
            {state.text}
          </div>
          <div className="flex items-center gap-3.5 mt-4 flex-wrap">
            <a href="https://t.me/ipmatdoubtspad" target="_blank" rel="noreferrer" style={ghostBtn}>
              Abhi bhi confusion? Ask a mentor <ArrowRight size={14} />
            </a>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>DoubtsPad pe video solution milega</span>
          </div>
        </div>
      )}

      {/* mentor escalation — QuickAction card */}
      <div className="max-w-[1000px] mt-5 mb-12" style={{ flexShrink: 0 }} data-tour="doubts-mentor">
        <QARow
          Icon={Play}
          title="Ya seedha mentor se poochho"
          desc="Fast video solutions for all your doubts on DoubtsPad →"
          href="https://t.me/ipmatdoubtspad"
        />
      </div>

      <PortalTour
        steps={DOUBTS_TOUR_STEPS}
        storageKey="tour_doubts_v1"
        run={tourRun}
        onClose={() => setTourRun(false)}
        labelPrefix="Doubts tour"
      />
    </div>
  );
}
