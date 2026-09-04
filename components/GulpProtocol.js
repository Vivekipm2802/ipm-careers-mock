// ============================================================
// Gulp Protocol — DSB Challenge skill trainer (Phase B).
// RSVP speed-reading: a passage flashes in 3–5 word chunks at a
// chosen WPM. Live slider (100–600) and pause/resume during the
// read (parity with the original DSB build). Then 5 comprehension
// questions. Score = effective rate = average WPM × comprehension.
//
// 2026-09 overhaul (owner-approved):
//   · NO right/wrong while answering — neutral gold selected state,
//     full reveal in the end summary (same grammar as the quiz).
//   · "Re-read passage" collapsible panel above the questions —
//     collapsed by default; re-reading NEVER touches the WPM metric
//     (that is computed from the first timed read only, statsRef).
//   · 5 questions per passage (2 authored per passage, 2026-09).
//   · Banked today → read-only review of today's run (details.report).
//
// Data: passages from the local library (gulpPassages.js), runs
// logged to trainer_runs (trainer: "gulp-protocol",
// score = effective WPM) → +30 XP.
// Pure logic (makeChunks, effectiveRate, verdictFor) exported
// for unit testing.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Pause, Play } from "lucide-react";
import PASSAGES from "./gulpPassages";
import { supabase } from "@/utils/supabaseClient";
import { saveRunWithReport, loadTodayRun, todayKey } from "@/lib/trainerReport";

export const XP_PER_RUN = 30;
export const MIN_WPM = 100;
export const MAX_WPM = 600;
export const PRESETS = [
  { wpm: 250, label: "Warm-up" },
  { wpm: 350, label: "Target pace" },
  { wpm: 450, label: "Elite" },
];

// Pure: split text into 3–5 word chunks. rand: () => [0,1)
export function makeChunks(text, rand = Math.random) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const out = [];
  let i = 0;
  while (i < words.length) {
    const n = 3 + Math.floor(rand() * 3); // 3, 4 or 5
    out.push(words.slice(i, i + n).join(" "));
    i += n;
  }
  return out;
}

// Pure: effective reading rate = average WPM × comprehension fraction.
export function effectiveRate(avgWpm, right, total) {
  if (!total) return 0;
  return Math.round(avgWpm * (right / total));
}

export function verdictFor(comp, avgWpm) {
  if (comp === 100 && avgWpm >= 450)
    return `Elite gulping. Full comprehension at ${avgWpm} WPM — you'd finish an IPMAT VA passage with time to spare for the traps.`;
  if (comp === 100)
    return "Perfect comprehension. Your eyes are ready for the next speed tier — nudge the slider up next run.";
  if (comp >= 60)
    return `Good gulp, minor leaks. You kept most of the meaning at ${avgWpm} WPM. One more run at this speed and it locks in.`;
  return "Too fast for today. Speed without understanding is just scrolling — drop one tier, rebuild comprehension, then climb back.";
}

export default function GulpProtocol({ userData, onExit, onSimComplete, banked }) {
  // ── ALL hooks above any conditional render (shipped crash class) ──
  const [phase, setPhase] = useState(banked ? "review-loading" : "start"); // start | countdown | read | quiz | done | review-loading | review
  const [wpm, setWpm] = useState(350);
  const [passage, setPassage] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [ci, setCi] = useState(0);
  const [count, setCount] = useState(3);
  const [paused, setPaused] = useState(false);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [records, setRecords] = useState([]); // picked option index per question
  const [showPassage, setShowPassage] = useState(false); // re-read panel, collapsed by default
  const [reviewInfo, setReviewInfo] = useState(null); // { eff, avg, comp, thin }
  const [personalBest, setPersonalBest] = useState(null);

  const timerRef = useRef(null);
  const wpmRef = useRef(350); // live value the flash loop reads
  const pausedRef = useRef(false);
  const ciRef = useRef(0);
  const statsRef = useRef({ sum: 0, ticks: 0 }); // FIRST timed read only — re-reading never lands here
  const chunksRef = useRef([]);
  const lockRef = useRef(false);
  const recordsRef = useRef([]);

  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .from("trainer_runs")
      .select("score")
      .eq("user", userData.email)
      .eq("trainer", "gulp-protocol")
      .order("score", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.length) setPersonalBest(data[0].score);
      });
  }, [userData?.email]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Banked today → load the read-only review of today's run.
  useEffect(() => {
    if (!banked || !userData?.email) return;
    let alive = true;
    loadTodayRun(userData.email, "gulp-protocol").then((run) => {
      if (!alive) return;
      const rep = run?.report;
      const p = rep?.passage_id ? PASSAGES.find((x) => x.id === rep.passage_id) : null;
      if (p && Array.isArray(rep.items)) {
        setPassage(p);
        setRecords(rep.items.map((it) => it.picked));
        setReviewInfo({
          eff: run.score ?? rep.score ?? 0,
          avg: rep.avg_wpm ?? run?.details?.avg_wpm ?? 0,
          comp: rep.comprehension ?? run?.details?.comprehension ?? 0,
          thin: false,
        });
      } else {
        setReviewInfo({
          eff: run?.score ?? 0,
          avg: run?.details?.avg_wpm ?? 0,
          comp: run?.details?.comprehension ?? 0,
          thin: true,
        });
      }
      setPhase("review");
    });
    return () => {
      alive = false;
    };
  }, [banked, userData?.email]);

  // Sim Room: skip the start screen and launch straight into the read
  // at the default target pace (the live slider still works mid-read).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (onSimComplete && !banked && !autoStartedRef.current) {
      autoStartedRef.current = true;
      begin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = () => {
    if (banked) return; // no re-attempts once today's run is banked
    const p = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
    const c = makeChunks(p.text);
    setPassage(p);
    setChunks(c);
    chunksRef.current = c;
    setCi(0);
    ciRef.current = 0;
    statsRef.current = { sum: 0, ticks: 0 };
    setQi(0);
    setPicked(null);
    setRecords([]);
    recordsRef.current = [];
    setShowPassage(false);
    setPaused(false);
    pausedRef.current = false;
    wpmRef.current = wpm;
    setCount(3);
    setPhase("countdown");
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        timerRef.current = setTimeout(tick, 700);
      } else {
        setPhase("read");
        showNext();
      }
    };
    timerRef.current = setTimeout(tick, 700);
  };

  const showNext = () => {
    if (pausedRef.current) return;
    const i = ciRef.current;
    const all = chunksRef.current;
    if (i >= all.length) {
      setPhase("quiz");
      return;
    }
    setCi(i);
    const words = all[i].split(" ").length;
    statsRef.current.sum += wpmRef.current;
    statsRef.current.ticks += 1;
    ciRef.current = i + 1;
    timerRef.current = setTimeout(showNext, (words * 60000) / wpmRef.current);
  };

  const togglePause = () => {
    const now = !pausedRef.current;
    pausedRef.current = now;
    setPaused(now);
    if (now) {
      clearTimeout(timerRef.current);
    } else {
      showNext();
    }
  };

  const onSlide = (v) => {
    setWpm(v);
    wpmRef.current = v;
  };

  const avgWpm = () =>
    statsRef.current.ticks ? Math.round(statsRef.current.sum / statsRef.current.ticks) : wpm;

  const rightFrom = (recs) =>
    passage ? recs.reduce((n, r, i) => n + (r === passage.questions[i]?.a ? 1 : 0), 0) : 0;

  const handleAnswer = (idx) => {
    if (lockRef.current || !passage || phase !== "quiz") return;
    lockRef.current = true;
    recordsRef.current = [...recordsRef.current, idx];
    setRecords(recordsRef.current);
    setPicked(idx); // neutral gold-tint only — the reveal happens in the summary
    timerRef.current = setTimeout(() => {
      setPicked(null);
      lockRef.current = false;
      if (qi + 1 >= passage.questions.length) {
        finish(recordsRef.current);
      } else {
        setQi(qi + 1);
      }
    }, 500);
  };

  const finish = async (finalRecords) => {
    setPhase("done");
    const finalRight = rightFrom(finalRecords);
    const comp100 = Math.round((100 * finalRight) / passage.questions.length);
    const eff = effectiveRate(avgWpm(), finalRight, passage.questions.length);
    if (eff > (personalBest ?? -1)) setPersonalBest(eff);
    if (userData?.email) {
      await saveRunWithReport({
        email: userData.email,
        trainer: "gulp-protocol",
        score: eff,
        details: {
          passage_id: passage.id,
          avg_wpm: avgWpm(),
          comprehension: comp100,
        },
        report: {
          v: 1,
          date: todayKey(),
          passage_id: passage.id,
          avg_wpm: avgWpm(),
          comprehension: comp100,
          score: eff,
          items: passage.questions.map((qq, i) => ({ i, picked: finalRecords[i] ?? null })),
        },
      });
    }
  };

  const cardStyle = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: 16,
    boxShadow: "var(--c-shadow-xs)",
  };
  const isReview = phase === "review";
  const right = rightFrom(records);
  const comp = passage ? Math.round((100 * right) / passage.questions.length) : 0;
  const statAvg = isReview ? reviewInfo?.avg ?? 0 : avgWpm();
  const statComp = isReview ? reviewInfo?.comp ?? 0 : comp;
  const statEff = isReview ? reviewInfo?.eff ?? 0 : passage ? effectiveRate(avgWpm(), right, passage.questions.length) : 0;
  const q = passage?.questions[qi];

  // Per-question review card (end summary + banked review).
  const renderReviewCard = (qq, i) => {
    const pickedIdx = records[i];
    return (
      <div key={i} className="rounded-[14px] border p-5 mt-3" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 8 }}>
          Question {i + 1}
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.5 }}>{qq.q}</div>
        <div className="grid gap-2 mt-3">
          {qq.o.map((t, d) => {
            const isCorrect = d === qq.a;
            const isPicked = pickedIdx === d;
            let border = "var(--c-border-faint)";
            let bg = "var(--c-surface-muted, var(--c-bg))";
            if (isCorrect) {
              border = "var(--c-success)";
              bg = "var(--c-success-soft)";
            } else if (isPicked) {
              border = "var(--c-danger)";
              bg = "var(--c-danger-soft)";
            }
            return (
              <div key={d} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "10px 14px", fontSize: 13.5, display: "flex", gap: 10, alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, color: "var(--c-text-tertiary)", flexShrink: 0 }}>{String.fromCharCode(65 + d)}.</span>
                <span style={{ minWidth: 0 }}>{t}</span>
                <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: isCorrect ? "var(--c-success)" : "var(--c-danger)" }}>
                  {isCorrect && isPicked ? "Your answer ✓" : isCorrect ? "Correct answer" : isPicked ? "Your answer" : ""}
                </span>
              </div>
            );
          })}
        </div>
        {qq.e && (
          <div className="rounded-[10px] mt-3 p-3" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 4 }}>Explanation</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--c-text-secondary)" }}>{qq.e}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      <header className="mb-6 mt-10">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 mb-4"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", padding: 0 }}
        >
          <ArrowLeft size={15} /> DSB Challenge
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
          Skill Trainer · Speed Reading
        </div>
        <h1 className="ds-display" style={{ fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.1 }}>
          Gulp <span className="ds-accent ds-grad-text">Protocol.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 14.5, color: "var(--c-text-secondary)" }}>
          Train your eyes to swallow 3–5 words at a gulp — built for VA&apos;s reading load.
          {personalBest != null && (
            <span style={{ color: "var(--c-brand-gold)", fontWeight: 600 }}> · Best effective rate: {personalBest} WPM</span>
          )}
        </p>
      </header>

      {/* ── START ── */}
      {phase === "start" && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <h2 className="ds-display" style={{ fontSize: 19 }}>How it works</h2>
          {[
            <>A passage flashes in <b>3–5 word chunks</b> — no going back, no subvocalising. Your eyes learn to gulp, not sip.</>,
            <>You pick the starting speed, and a <b>live slider (100–600 WPM)</b> lets you adjust mid-read. Pause any time.</>,
            <>Then <b>5 comprehension questions</b>. Answers are revealed at the end — you can re-read the passage while answering, but your WPM comes from the first read only.</>,
            <>Your score = <b>effective rate</b>: average speed × comprehension. 350 at 100% beats 450 at 40%.</>,
          ].map((r, d) => (
            <div key={d} className="flex gap-3 mt-3.5" style={{ fontSize: 13.5, color: "var(--c-text-secondary)", lineHeight: 1.55 }}>
              <span className="grid place-items-center shrink-0" style={{ width: 26, height: 26, borderRadius: 8, background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", fontWeight: 700, fontSize: 12 }}>
                {d + 1}
              </span>
              <span>{r}</span>
            </div>
          ))}

          <div className="grid gap-2.5 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
            {PRESETS.map((p) => (
              <button
                key={p.wpm}
                type="button"
                onClick={() => onSlide(p.wpm)}
                style={{
                  background: wpm === p.wpm ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted, var(--c-bg))",
                  border: `1px solid ${wpm === p.wpm ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`,
                  borderRadius: 12, padding: "14px 10px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", color: "var(--c-text-primary)", transition: "border-color 0.12s",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{p.wpm}</div>
                <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginTop: 4 }}>{p.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={begin}
              className="inline-flex items-center gap-2"
              style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 14, borderRadius: 999, padding: "12px 28px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Start the gulp <ArrowRight size={15} />
            </button>
            <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>+{XP_PER_RUN} XP per run</span>
          </div>
        </div>
      )}

      {/* ── REVIEW LOADING ── */}
      {phase === "review-loading" && (
        <div className="p-7 max-w-[760px]" style={cardStyle}>
          <p style={{ fontSize: 14, color: "var(--c-text-secondary)" }}>Loading today&apos;s review…</p>
        </div>
      )}

      {/* ── COUNTDOWN + READ ── */}
      {(phase === "countdown" || phase === "read") && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div className="grid place-items-center" style={{ minHeight: 210 }}>
            {phase === "countdown" ? (
              <div className="ds-display" style={{ fontSize: 62, color: "var(--c-brand-gold)" }}>{count}</div>
            ) : (
              <div className="ds-display" style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 600, textAlign: "center", lineHeight: 1.35 }}>
                {chunks[ci] || "…"}
              </div>
            )}
          </div>
          <div style={{ height: 5, borderRadius: 5, background: "var(--c-surface-sunken, var(--c-surface-muted))", overflow: "hidden", marginTop: 18 }}>
            <div style={{ height: "100%", width: `${chunks.length ? Math.round((100 * ci) / chunks.length) : 0}%`, background: "var(--c-mock-banner-btn-bg)", borderRadius: 5, transition: "width 0.2s linear" }} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", textAlign: "center", marginTop: 12 }}>
            {phase === "countdown" ? "Get ready…" : paused ? "Paused" : `${wpm} WPM · no going back`}
          </div>
          {phase === "read" && (
            <div className="flex items-center gap-4 mt-5">
              <button
                type="button"
                onClick={togglePause}
                className="grid place-items-center shrink-0"
                style={{ width: 42, height: 42, borderRadius: 999, border: "1px solid var(--c-border-soft, var(--c-border-faint))", background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-primary)", cursor: "pointer" }}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <input
                type="range"
                min={MIN_WPM}
                max={MAX_WPM}
                step={10}
                value={wpm}
                onChange={(e) => onSlide(parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: "#F9A01B", cursor: "pointer" }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--c-brand-gold)", width: 78, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                {wpm} WPM
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── QUIZ ── */}
      {phase === "quiz" && q && (
        <div className="max-w-[760px]">
          {/* Re-read panel — collapsed by default; opening it has ZERO
              effect on the WPM metric (first timed read only). */}
          <div className="rounded-[14px] border mb-3" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)", boxShadow: "var(--c-shadow-xs)" }}>
            <button
              type="button"
              onClick={() => setShowPassage((s) => !s)}
              className="w-full flex items-center justify-between"
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "13px 18px", color: "var(--c-text-primary)" }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Re-read passage
                <span style={{ fontWeight: 400, color: "var(--c-text-tertiary)", marginLeft: 8, fontSize: 12 }}>
                  won&apos;t affect your WPM
                </span>
              </span>
              <ChevronDown size={16} style={{ transform: showPassage ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--c-text-tertiary)" }} />
            </button>
            {showPassage && (
              <div style={{ padding: "0 18px 16px", maxHeight: 240, overflowY: "auto", fontSize: 14, lineHeight: 1.7, color: "var(--c-text-secondary)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 6 }}>
                  {passage.title}
                </div>
                {passage.text}
              </div>
            )}
          </div>

          <div className="p-6 md:p-7" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 12 }}>
              Comprehension check · {qi + 1} / {passage.questions.length} · answers at the end
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.6, color: "var(--c-text-primary)" }}>{q.q}</div>
            <div className="grid gap-2.5 mt-4">
              {q.o.map((t, d) => {
                const isSel = picked === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleAnswer(d)}
                    className="text-left"
                    style={{
                      background: isSel ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted, var(--c-bg))",
                      border: `1px solid ${isSel ? "var(--c-brand-gold)" : "var(--c-border-faint)"}`,
                      borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--c-text-primary)",
                      cursor: picked != null ? "default" : "pointer", fontFamily: "inherit", transition: "border-color 0.12s",
                    }}
                  >
                    <span style={{ fontWeight: 700, marginRight: 10, color: "var(--c-text-tertiary)" }}>{String.fromCharCode(65 + d)}.</span>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS / REVIEW ── */}
      {(phase === "done" || phase === "review") && (
        <div className="max-w-[760px]">
          <div className="p-6 md:p-7" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
              {isReview ? "Today's run · review" : "Run complete"}
            </div>
            <h2 className="ds-display" style={{ fontSize: 25 }}>
              Effective rate: <span className="ds-grad-text">{statEff}</span>{" "}
              <span style={{ fontSize: 15, color: "var(--c-text-secondary)" }}>WPM</span>
            </h2>
            <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
              {[
                ["Speed read at", `${statAvg}`, "var(--c-text-primary)"],
                ["Comprehension", `${statComp}%`, "var(--c-brand-gold)"],
                ["Effective WPM", `${statEff}`, "var(--c-success)"],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-[12px] border p-4" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                  <div className="ds-display" style={{ fontSize: 25, marginTop: 6, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
              {isReview ? (
                <>Banked earlier today — this is a read-only walkthrough of your run. A fresh passage waits tomorrow.</>
              ) : (
                <>
                  {verdictFor(comp, avgWpm())}
                  <br />
                  <br />
                  XP earned this run: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>
                </>
              )}
            </div>
          </div>

          {isReview && reviewInfo?.thin ? (
            <div className="p-5 mt-3 rounded-[14px] border" style={{ background: "var(--c-surface)", borderColor: "var(--c-border-faint)", fontSize: 13.5, color: "var(--c-text-secondary)" }}>
              Question-by-question detail isn&apos;t available for this run on this device — the banked numbers above still count.
            </div>
          ) : (
            passage && passage.questions.map(renderReviewCard)
          )}

          <div className="mt-6 mb-8 flex gap-3">
            {onSimComplete && phase === "done" ? (
              <button
                type="button"
                onClick={() => onSimComplete(`${avgWpm()} WPM · ${comp}%`)}
                className="inline-flex items-center gap-2"
                style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Continue simulation <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" onClick={onExit} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Back to DSB <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
