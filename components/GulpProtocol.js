// ============================================================
// Gulp Protocol — DSB Challenge skill trainer (Phase B).
// RSVP speed-reading: a passage flashes in 3–5 word chunks at a
// chosen WPM. Live slider (100–600) and pause/resume during the
// read (parity with the original DSB build). Then 3 comprehension
// questions. Score = effective rate = average WPM × comprehension.
//
// Data: passages from the local library (gulpPassages.js), runs
// logged to trainer_runs (trainer: "gulp-protocol",
// score = effective WPM) → +30 XP.
// Pure logic (makeChunks, effectiveRate, verdictFor) exported
// for unit testing.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import PASSAGES from "./gulpPassages";

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
  if (comp >= 67)
    return `Good gulp, minor leaks. You kept most of the meaning at ${avgWpm} WPM. One more run at this speed and it locks in.`;
  return "Too fast for today. Speed without understanding is just scrolling — drop one tier, rebuild comprehension, then climb back.";
}

export default function GulpProtocol({ userData, onExit, onSimComplete }) {
  const [phase, setPhase] = useState("start"); // start | countdown | read | quiz | done
  const [wpm, setWpm] = useState(350);
  const [passage, setPassage] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [ci, setCi] = useState(0);
  const [count, setCount] = useState(3);
  const [paused, setPaused] = useState(false);
  const [qi, setQi] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);

  const timerRef = useRef(null);
  const wpmRef = useRef(350); // live value the flash loop reads
  const pausedRef = useRef(false);
  const ciRef = useRef(0);
  const statsRef = useRef({ sum: 0, ticks: 0 });
  const chunksRef = useRef([]);
  const lockRef = useRef(false);

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

  // Sim Room: skip the start screen and launch straight into the read
  // at the default target pace (the live slider still works mid-read).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (onSimComplete && !autoStartedRef.current) {
      autoStartedRef.current = true;
      begin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = () => {
    const p = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
    const c = makeChunks(p.text);
    setPassage(p);
    setChunks(c);
    chunksRef.current = c;
    setCi(0);
    ciRef.current = 0;
    statsRef.current = { sum: 0, ticks: 0 };
    setQi(0);
    setRight(0);
    setPicked(null);
    setReveal(false);
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

  const handleAnswer = (idx) => {
    if (reveal || lockRef.current || !passage) return;
    lockRef.current = true;
    const q = passage.questions[qi];
    const correct = idx === q.a;
    const newRight = right + (correct ? 1 : 0);
    setPicked(idx);
    setReveal(true);
    if (correct) setRight(newRight);
    timerRef.current = setTimeout(() => {
      setPicked(null);
      setReveal(false);
      lockRef.current = false;
      if (qi + 1 >= passage.questions.length) {
        finish(newRight);
      } else {
        setQi(qi + 1);
      }
    }, 800);
  };

  const finish = async (finalRight) => {
    setPhase("done");
    const eff = effectiveRate(avgWpm(), finalRight, passage.questions.length);
    if (eff > (personalBest ?? -1)) setPersonalBest(eff);
    if (userData?.email) {
      await supabase.from("trainer_runs").insert({
        user: userData.email,
        trainer: "gulp-protocol",
        score: eff,
        details: {
          passage_id: passage.id,
          avg_wpm: avgWpm(),
          comprehension: Math.round((100 * finalRight) / passage.questions.length),
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
  const comp = passage ? Math.round((100 * right) / passage.questions.length) : 0;
  const q = passage?.questions[qi];

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
            <>Then <b>3 comprehension questions</b> — because speed without understanding is just scrolling.</>,
            <>Your score = <b>effective rate</b>: average speed × comprehension. 350 at 100% beats 450 at 33%.</>,
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
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 12 }}>
            Comprehension check · {qi + 1} / {passage.questions.length}
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.6, color: "var(--c-text-primary)" }}>{q.q}</div>
          <div className="grid gap-2.5 mt-4">
            {q.o.map((t, d) => {
              let border = "var(--c-border-faint)";
              let bg = "var(--c-surface-muted, var(--c-bg))";
              if (reveal && d === q.a) {
                border = "var(--c-success)";
                bg = "var(--c-success-soft)";
              } else if (reveal && picked === d && d !== q.a) {
                border = "var(--c-danger)";
                bg = "var(--c-danger-soft)";
              }
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleAnswer(d)}
                  className="text-left"
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--c-text-primary)", cursor: reveal ? "default" : "pointer", fontFamily: "inherit", transition: "border-color 0.12s" }}
                >
                  <span style={{ fontWeight: 700, marginRight: 10, color: "var(--c-text-tertiary)" }}>{String.fromCharCode(65 + d)}.</span>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === "done" && (
        <div className="p-6 md:p-7 max-w-[760px]" style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 8 }}>
            Run complete
          </div>
          <h2 className="ds-display" style={{ fontSize: 25 }}>
            Effective rate: <span className="ds-grad-text">{effectiveRate(avgWpm(), right, passage.questions.length)}</span>{" "}
            <span style={{ fontSize: 15, color: "var(--c-text-secondary)" }}>WPM</span>
          </h2>
          <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {[
              ["Speed read at", `${avgWpm()}`, "var(--c-text-primary)"],
              ["Comprehension", `${comp}%`, "var(--c-brand-gold)"],
              ["Effective WPM", `${effectiveRate(avgWpm(), right, passage.questions.length)}`, "var(--c-success)"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-[12px] border p-4" style={{ background: "var(--c-surface-muted, var(--c-bg))", borderColor: "var(--c-border-faint)" }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>{l}</div>
                <div className="ds-display" style={{ fontSize: 25, marginTop: 6, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[12px] mt-5 p-4" style={{ background: "var(--c-brand-gold-tint)", border: "1px solid var(--c-border-faint)", fontSize: 13.5, lineHeight: 1.65, color: "var(--c-text-secondary)" }}>
            {verdictFor(comp, avgWpm())}
            <br />
            <br />
            XP earned this run: <b style={{ color: "var(--c-brand-gold)" }}>+{XP_PER_RUN} XP</b>
          </div>
          <div className="mt-6 flex gap-3">
            {onSimComplete ? (
              <button
                type="button"
                onClick={() => onSimComplete(`${avgWpm()} WPM · ${comp}%`)}
                className="inline-flex items-center gap-2"
                style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Continue simulation <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setPhase("start")} className="inline-flex items-center gap-2" style={{ background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", fontWeight: 600, fontSize: 13.5, borderRadius: 999, padding: "11px 26px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  New run <ArrowRight size={15} />
                </button>
                <button type="button" onClick={onExit} style={{ background: "transparent", color: "var(--c-text-secondary)", fontWeight: 600, fontSize: 13, border: "1px solid var(--c-border-soft, var(--c-border-faint))", borderRadius: 999, padding: "11px 24px", cursor: "pointer", fontFamily: "inherit" }}>
                  Back to DSB
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
