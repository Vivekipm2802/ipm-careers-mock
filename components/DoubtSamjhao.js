// ============================================================
// Doubts v2 — a notebook, not a vending machine (Aug 2026,
// approved preview-doubts-v2).
//
// Structure:
//  · Hero ask card: one input + gold "Ask →", a chip that opens
//    the existing wrong-answer picker, and the quiet daily-pool
//    line. Enter asks too.
//  · Every ask runs the SAME Samjhao machinery as before
//    (doubt_explanations shared cache for portal questions →
//    doubt_requests daily pool → /api/explain), then the doubt is
//    SAVED to `user_doubts` (question, source, question_id,
//    answer) — the thread appears on top, expanded.
//  · "Your doubts · N" thread list from user_doubts, newest
//    first. Status chips: "Answered" (gold) and "Sent to mentor"
//    (violet outline) — the mentor-video status is a future
//    phase; only these two exist today. Clicking "Not clear? Ask
//    a mentor →" opens DoubtsPad AND flips status to
//    sent_to_mentor.
//  · If the user_doubts table isn't shipped yet the page
//    degrades: asking still works (answer shows, nothing saves),
//    the thread list hides, nothing crashes.
//
// Pure logic exported for tests: plainText, filterItems,
// agoLabel, threadSubOf.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { DAILY_DOUBTS } from "./MistakeVault";
import PortalTour, { useFirstVisitTour } from "./PortalTour";
import PageHeader from "./PageHeader";

// Mentor accent — the approved preview's violet. No portal var
// exists for violet; same rgba approach as MistakeVault.
const VIOLET = "rgba(151,113,224,1)"; /* violet — approved-preview accent, no portal var */
const VIOLET_BORDER = "rgba(151,113,224,0.45)"; /* violet border — same rgba family */

const DOUBTS_TOUR_STEPS = [
  {
    target: "[data-tour='doubts-modes']",
    title: "Yahin poochho",
    desc: "Type karo, ya apne galat answers mein se uthao — AI seconds mein samjhata hai.",
  },
  {
    target: "[data-tour='doubts-list']",
    title: "Tumhari notebook",
    desc: "Har jawab yahan hamesha ke liye saved rehta hai — exam week mein yahi revision hai.",
  },
  {
    target: "[data-tour='doubts-mentor']",
    title: "Mentor hamesha hai",
    desc: "AI se na samjhe toh mentor ko bhejo — video reply, usually ek din mein.",
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

// Pure: "today" / "yesterday" / "Mon" (this week) / "3 Jul".
export function agoLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "earlier";
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  const base = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

// Pure: the thread sub-line — "Asked today · typed" /
// "Asked yesterday · from a wrong answer · Logarithms".
export function threadSubOf(t, chapterById, now = new Date()) {
  const src = t?.source === "typed" || t?.source == null ? "typed" : "from a wrong answer";
  const chapter =
    t?.question_id != null && chapterById ? chapterById[String(t.question_id)] || null : null;
  return `Asked ${agoLabel(t?.created_at, now)} · ${src}${chapter ? ` · ${chapter}` : ""}`;
}

const LIST_DEFAULT = 6;

// Small stroked icon wrapper — drawn SVG paths from the approved
// preview, same grammar as the Dashboard's Ic.
function Ic({ size = 17, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

export default function DoubtSamjhao({ userData }) {
  const [items, setItems] = useState(null); // wrong-answer picker pool
  const [query, setQuery] = useState("");
  const [showAllPick, setShowAllPick] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState(null); // picked wrong answer (null = typed)
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [askError, setAskError] = useState(null);
  const [fallback, setFallback] = useState(null); // {question, answer} when saving failed
  const [threads, setThreads] = useState(null); // user_doubts rows, newest first
  const [tableMissing, setTableMissing] = useState(false);
  const [openThread, setOpenThread] = useState(null);
  const [doubtsToday, setDoubtsToday] = useState(0);
  // mini-tour: auto on first visit, replay via "How it works?"
  const [tourRun, setTourRun] = useFirstVisitTour("tour_doubts_v1");

  useEffect(() => {
    if (!userData?.email) return;
    let gone = false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    supabase
      .from("doubt_requests")
      .select("id", { count: "exact", head: true })
      .eq("user", userData.email)
      .gte("created_at", startOfToday.toISOString())
      .then(({ count }) => { if (!gone) setDoubtsToday(count || 0); });

    // the wrong-answer picker pool (same sources as before)
    Promise.all([
      supabase.rpc("get_my_mistakes", { p_email: userData.email }),
      supabase.rpc("get_my_own_mistakes", { p_email: userData.email }),
    ]).then(([mine, own]) => {
      if (gone) return;
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

    // the notebook — table may not be shipped yet → degrade quietly
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_doubts")
          .select("id, created_at, question, source, question_id, answer, status")
          .eq("user", userData.email)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!gone) setThreads(Array.isArray(data) ? data : []);
      } catch {
        if (!gone) { setThreads([]); setTableMissing(true); }
      }
    })();

    return () => { gone = true; };
  }, [userData?.email]);

  // question_id → chapter (for the thread sub-line), from the pool
  const chapterById = useMemo(() => {
    const map = {};
    (items || []).forEach((it) => { map[String(it.question_id)] = it.chapter; });
    return map;
  }, [items]);

  const pick = (it) => {
    setSelected(it);
    setDraft(it.text);
    setPickerOpen(false);
    setAskError(null);
  };

  const onDraft = (v) => {
    setDraft(v);
    // editing a picked question's text turns it back into a typed doubt
    if (selected && v !== selected.text) setSelected(null);
    setAskError(null);
  };

  const ask = async () => {
    const text = draft.trim();
    if (!text || busy || !userData?.email) return;
    setBusy(true);
    setAskError(null);
    const picked = selected; // null → typed
    let answer = null;

    try {
      // 1) shared cache — portal questions only, instant and free
      if (picked) {
        try {
          const { data: cached } = await supabase
            .from("doubt_explanations")
            .select("explanation")
            .eq("question_id", picked.question_id)
            .maybeSingle();
          if (cached?.explanation) answer = cached.explanation;
        } catch {}
      }
      // 2) daily pool → API
      if (!answer) {
        if (doubtsToday >= DAILY_DOUBTS) {
          setAskError(`That's your ${DAILY_DOUBTS} for today — more tomorrow. Or send one to a mentor from any answer below.`);
          setBusy(false);
          return;
        }
        const body = { question: text };
        if (picked && Array.isArray(picked.options)) {
          body.options = picked.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${plainText(o.title)}`).join(" | ");
          body.correct = picked.options.filter((o) => o.isCorrect).map((o) => plainText(o.title)).join(", ");
        }
        if (picked && picked.answer) body.correct = picked.answer;
        const r = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await r.json();
        if (!r.ok || !j.explanation) {
          setAskError("Samjhao abhi available nahi — thodi der mein try karo.");
          setBusy(false);
          return;
        }
        answer = j.explanation;
        setDoubtsToday((n) => n + 1);
        await supabase.from("doubt_requests").insert({ user: userData.email, question_id: picked ? picked.question_id : null });
        if (picked) {
          await supabase.from("doubt_explanations").insert({ question_id: picked.question_id, explanation: answer });
        }
      }
    } catch {
      setAskError("Samjhao abhi available nahi — thodi der mein try karo.");
      setBusy(false);
      return;
    }

    // 3) save to the notebook (AWAITED — supabase builders only run
    // when awaited). Table missing → show the answer anyway, unsaved.
    try {
      const { data, error } = await supabase
        .from("user_doubts")
        .insert({
          user: userData.email,
          question: text,
          source: picked ? "question" : "typed",
          question_id: picked ? picked.question_id : null,
          answer,
          status: "answered",
        })
        .select()
        .single();
      if (error) throw error;
      setThreads((prev) => [data, ...(Array.isArray(prev) ? prev : [])]);
      setOpenThread(data.id);
      setFallback(null);
    } catch {
      setTableMissing(true);
      setFallback({ question: text, answer });
    }
    setDraft("");
    setSelected(null);
    setBusy(false);
  };

  // escalate: open DoubtsPad AND remember it on the thread
  const markMentor = (t) => {
    setThreads((prev) =>
      Array.isArray(prev) ? prev.map((x) => (x.id === t.id ? { ...x, status: "sent_to_mentor" } : x)) : prev
    );
    if (!tableMissing) {
      supabase.from("user_doubts").update({ status: "sent_to_mentor" }).eq("id", t.id).then(() => {}, () => {});
    }
  };

  const left = Math.max(0, DAILY_DOUBTS - doubtsToday);
  const shown = filterItems(items || [], query);
  const listed = showAllPick ? shown : shown.slice(0, LIST_DEFAULT);

  const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", flexShrink: 0 };
  const statusChip = (mentor) => ({
    display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
    fontSize: 9.5, letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600,
    borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap",
    background: mentor ? "transparent" : "var(--c-brand-gold-tint)",
    color: mentor ? VIOLET : "var(--c-brand-gold)",
    border: mentor ? `1px solid ${VIOLET_BORDER}` : "1px solid transparent",
  });

  // the gold-left-bordered answer box + its footer (shared by the
  // thread expansion and the unsaved fallback)
  const answerBox = (answerText, thread) => (
    <div style={{ background: "var(--c-surface-muted)", borderTop: "1px solid var(--c-border-faint)", padding: "16px 18px 16px 20px" }}>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderLeft: "2px solid var(--c-brand-gold)", borderRadius: "0 12px 12px 0", padding: "14px 16px", fontSize: 13, lineHeight: 1.65, color: "var(--c-text-secondary)", whiteSpace: "pre-wrap" }}>
        <span style={{ display: "block", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-brand-gold)", fontWeight: 600, marginBottom: 6 }}>
          Samjhao · AI
        </span>
        {answerText || "—"}
      </div>
      <div className="flex items-center gap-2.5 mt-3 flex-wrap" data-tour="doubts-mentor">
        <a
          href="https://t.me/ipmatdoubtspad"
          target="_blank"
          rel="noreferrer"
          onClick={() => thread && markMentor(thread)}
          style={{ fontSize: 11.5, fontWeight: 600, color: VIOLET, border: "1px solid var(--c-border-soft, var(--c-border-faint))", borderRadius: 999, padding: "7px 14px", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Not clear? Ask a mentor →
        </a>
        <span style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>a mentor replies with a video, usually within a day</span>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mt-6" style={{ flexShrink: 0 }}>
        <PageHeader
          kicker="Review"
          title="Your"
          accent="doubts."
          subtitle="Ask anything — the answer stays here, forever findable."
          right={
            <button
              type="button"
              onClick={() => setTourRun(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--c-text-tertiary)", textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}
            >
              How it works?
            </button>
          }
        />
      </header>

      {/* hero — the ask card */}
      <div className="max-w-[860px] mt-6" data-tour="doubts-modes" style={{ ...card, position: "relative", overflow: "hidden", padding: "18px 20px" }}>
        <span aria-hidden style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)", opacity: 0.55 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 14, padding: "12px 16px" }}>
          <span style={{ color: "var(--c-brand-gold)", flexShrink: 0 }}>
            <Ic>
              <path d="M12 3a7 7 0 0 1 4 12.7c-.7.5-1 1.2-1 2V19h-6v-1.3c0-.8-.3-1.5-1-2A7 7 0 0 1 12 3z" />
              <path d="M10 22h4" />
            </Ic>
          </span>
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
            placeholder="Type your doubt — any topic, any question…"
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "none", fontFamily: "inherit", fontSize: 13.5, color: "var(--c-text-primary)" }}
          />
          <button
            type="button"
            onClick={ask}
            disabled={busy || !draft.trim()}
            style={{ background: "var(--c-brand-gold)", color: "var(--c-text-on-brand)", borderRadius: 999, padding: "9px 18px", fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, opacity: busy || !draft.trim() ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {busy ? "Samjha rahe hain…" : <>Ask <ArrowRight size={13} /></>}
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 500, color: pickerOpen ? "var(--c-text-primary)" : "var(--c-text-secondary)", border: `1px solid ${pickerOpen ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`, borderRadius: 999, padding: "7px 13px", cursor: "pointer", background: "var(--c-surface)", fontFamily: "inherit" }}
          >
            <Ic size={13}><path d="M6 6l12 12M18 6L6 18" /></Ic>
            Pick from my wrong answers
          </button>
          {selected && (
            <span style={{ fontSize: 11, color: "var(--c-brand-gold)", fontWeight: 600 }}>
              from a wrong answer · {selected.chapter}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--c-text-tertiary)" }}>
            {left} of {DAILY_DOUBTS} left today · AI answers in seconds, saved forever
          </span>
        </div>
      </div>

      {askError && (
        <div className="max-w-[860px] mt-3" style={{ fontSize: 13, color: "var(--c-danger)", flexShrink: 0 }}>{askError}</div>
      )}

      {/* the wrong-answer picker — the existing flow, behind the chip */}
      {pickerOpen && (
        <div className="max-w-[860px] mt-4" style={{ ...card, padding: "6px 20px" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap" style={{ padding: "14px 0 10px", borderBottom: "1px solid var(--c-border-faint)" }}>
            <span className="ds-display" style={{ fontSize: 15.5 }}>Tumhare galat questions</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--c-surface-muted, var(--c-bg))", border: "1px solid var(--c-border-faint)", borderRadius: 999, padding: "7px 14px" }}>
              <Search size={13} style={{ color: "var(--c-text-tertiary)" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowAllPick(false); }}
                placeholder="Search chapter ya words…"
                style={{ background: "none", border: "none", outline: "none", color: "var(--c-text-primary)", fontFamily: "inherit", fontSize: 12.5, width: 180 }}
              />
            </span>
          </div>
          {items === null && <div style={{ padding: "14px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Tumhare questions load ho rahe hain…</div>}
          {items !== null && items.length === 0 && (
            <div style={{ padding: "14px 0", fontSize: 13, color: "var(--c-text-secondary)", lineHeight: 1.6 }}>
              Abhi koi galat question collect nahi hua. Koi test do — ya bas apna sawaal type karo.
            </div>
          )}
          {listed.map((it, i, arr) => (
            <div
              key={it.question_id}
              onClick={() => pick(it)}
              className="flex items-center gap-3.5"
              style={{ padding: "12px 0", borderBottom: i < arr.length - 1 || shown.length > LIST_DEFAULT ? "1px solid var(--c-border-faint)" : "none", cursor: "pointer" }}
            >
              <span style={{ width: 16, height: 16, borderRadius: 999, flexShrink: 0, border: `1.5px solid ${selected?.question_id === it.question_id ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`, background: selected?.question_id === it.question_id ? "radial-gradient(circle at center, var(--c-brand-gold) 0 45%, transparent 50%)" : "transparent" }} />
              {it.question_id < 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-brand-gold)", border: "1px solid rgba(255, 182, 39, 0.35)" /* gold tint border — vault's PYQ badge */, background: "var(--c-brand-gold-tint)", borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>YOURS</span>
              )}
              <span className="min-w-0 flex-1" style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--c-text-secondary)" }}>
                {it.text}
              </span>
              <span style={{ flexShrink: 0, fontSize: 11, color: "var(--c-text-tertiary)" }}>{it.chapter}</span>
            </div>
          ))}
          {items !== null && items.length > 0 && shown.length === 0 && (
            <div style={{ padding: "12px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Kuch nahi mila — doosre words try karo.</div>
          )}
          {shown.length > LIST_DEFAULT && (
            <button type="button" onClick={() => setShowAllPick((v) => !v)} style={{ background: "none", border: "none", padding: "12px 0", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}>
              {showAllPick ? "Show less" : `Show all ${shown.length} →`}
            </button>
          )}
        </div>
      )}

      {/* unsaved answer — shown only when the notebook table is missing */}
      {fallback && (
        <div className="max-w-[860px] mt-5" style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{fallback.question}</div>
            <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>Asked just now</div>
          </div>
          {answerBox(fallback.answer, null)}
        </div>
      )}

      {/* thread list — hidden entirely when the table isn't there */}
      {!tableMissing && threads !== null && threads.length > 0 && (
        <>
          <div className="max-w-[860px]" style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600, margin: "24px 0 10px" }}>
            Your doubts · {threads.length}
          </div>
          <div className="max-w-[860px]" data-tour="doubts-list" style={{ ...card, overflow: "hidden" }}>
            {threads.map((t, i) => {
              const isOpen = openThread === t.id;
              const mentor = t.status === "sent_to_mentor";
              return (
                <div key={t.id} style={{ borderTop: i > 0 ? "1px solid var(--c-border-faint)" : "none" }}>
                  <div
                    onClick={() => setOpenThread(isOpen ? null : t.id)}
                    className="td-step flex items-center gap-3"
                    style={{ padding: "14px 18px", cursor: "pointer" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.question}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>
                        {threadSubOf(t, chapterById)}
                      </div>
                    </div>
                    <span style={statusChip(mentor)}>
                      {mentor ? (
                        <>
                          <Ic size={10}><path d="M6 4l14 8-14 8z" /></Ic>
                          Sent to mentor
                        </>
                      ) : (
                        <>
                          <Ic size={10}><path d="M4 12.5l5 5L20 6.5" /></Ic>
                          Answered
                        </>
                      )}
                    </span>
                    <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--c-text-tertiary)", transition: "transform 0.18s", transform: isOpen ? "rotate(90deg)" : "none" }}>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </div>
                  {isOpen && answerBox(t.answer, t)}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* closing line — exact preview copy */}
      <div className="max-w-[860px] mb-12" style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", marginTop: 16, flexShrink: 0 }}>
        Every answer stays saved here. Exam week revision = scrolling your own doubts.
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
