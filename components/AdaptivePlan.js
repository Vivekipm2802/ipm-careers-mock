// ============================================================
// Aaj Ka Plan — My Plan 2.0 (adaptive study plan).
// No AI: pure arithmetic on the student's own play history.
// get_my_chapter_stats computes per-chapter accuracy; this
// component classifies chapters (attack < 65% ≤ maintain < 85%
// ≤ strength; 0 tests = new), picks three daily tasks, and lays
// out the week. Task 1 is always the Sim Room missions.
// Design: approved "two cards + open sections" layout using the
// dashboard's exact tokens (ds-stat-value gradient numbers).
//
// Pure logic exported for tests: classify, accuracyOf, buildPlan,
// daysToExam, weekPlan, EXAM_DATE.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";
import { useNMNContext } from "./NMNContext";

// IPMAT exam date the countdown targets. Update once per season.
// EXAM_CONFIRMED: flip to true the day IIM Indore announces the
// official date (and correct EXAM_DATE if needed) — the "expected"
// tag on the countdown disappears automatically.
export const EXAM_DATE = "2027-05-02";
export const EXAM_CONFIRMED = false;
export const ATTACK_BELOW = 65;
export const STRENGTH_FROM = 85;
export const MIN_ATTEMPTS = 8; // answers needed before accuracy is trusted

export function accuracyOf(ch) {
  if (!ch || !ch.attempted) return null;
  return Math.round((100 * (ch.correct || 0)) / ch.attempted);
}

// "attack" | "maintain" | "strength" | "new" | "warming" (too little data)
export function classify(ch) {
  if (!ch.tests || Number(ch.tests) === 0) return "new";
  if ((ch.attempted || 0) < MIN_ATTEMPTS) return "warming";
  const acc = accuracyOf(ch);
  if (acc < ATTACK_BELOW) return "attack";
  if (acc >= STRENGTH_FROM) return "strength";
  return "maintain";
}

export function daysToExam(examDate = EXAM_DATE, now = new Date()) {
  const ms = new Date(examDate + "T00:00:00+05:30").getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// daySeed rotates the "new chapter" pick so it changes daily but is
// stable within a day.
export function buildPlan(chapters, daySeed = 0) {
  const withClass = (chapters || []).map((c) => ({ ...c, cls: classify(c), acc: accuracyOf(c) }));
  const attack = withClass
    .filter((c) => c.cls === "attack" || c.cls === "warming")
    .sort((a, b) => (a.acc ?? 101) - (b.acc ?? 101) || Number(b.tests) - Number(a.tests));
  const fresh = withClass
    .filter((c) => c.cls === "new")
    .sort((a, b) => String(a.chapter).localeCompare(String(b.chapter)));
  const maintain = withClass
    .filter((c) => c.cls === "maintain")
    .sort((a, b) => (a.acc ?? 101) - (b.acc ?? 101));

  const freshPick = fresh.length ? fresh[daySeed % fresh.length] : null;
  const task2 = attack[0] || maintain[0] || freshPick || null;
  let task3 = freshPick && freshPick !== task2 ? freshPick : attack.find((c) => c !== task2) || maintain.find((c) => c !== task2) || null;
  if (task3 === task2) task3 = null;

  // queue for the week strip (unique, excluding Sat/Sun specials)
  const queue = [];
  const push = (c) => c && !queue.includes(c) && queue.push(c);
  push(task2);
  push(task3);
  attack.forEach(push);
  fresh.forEach(push);
  maintain.forEach(push);

  return { task2, task3, queue, withClass };
}

// Mon..Sun labels for the week strip. dayIdx: 0=Mon.
export function weekPlan(queue, todayIdx) {
  const labels = [];
  let qi = 0;
  for (let d = 0; d < 7; d++) {
    if (d === 6) labels.push("Full mock");
    else if (d === 5) labels.push("Mistake redo");
    else {
      const names = [];
      if (queue[qi]) names.push(shortName(queue[qi].chapter));
      if (d === todayIdx && queue[qi + 1]) names.push(shortName(queue[qi + 1].chapter));
      labels.push(names.join(" · ") || "Revision");
      qi += d === todayIdx ? 2 : 1;
    }
  }
  return labels;
}

export function shortName(t) {
  // Keep bracket qualifiers — "Topic Wise (VA)" and "(QA)" are
  // different chapters and must stay distinguishable.
  return String(t || "")
    .replace(/\s*\(([^)]+)\)\s*/g, " $1 ")
    .replace("Topic Wise", "Topic-wise")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AdaptivePlan({ userData }) {
  const router = useRouter();
  const { setCTXSlug } = useNMNContext();
  const [chapters, setChapters] = useState(null);
  const [missionsDone, setMissionsDone] = useState(false);
  const [opening, setOpening] = useState(null);
  const [showAllMap, setShowAllMap] = useState(false);
  const openingRef = useRef(false);

  useEffect(() => {
    if (!userData?.email) return;
    supabase.rpc("get_my_chapter_stats", { p_email: userData.email }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) setChapters(data);
      else setChapters([]);
    });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    supabase
      .from("trainer_runs")
      .select("trainer")
      .eq("user", userData.email)
      .gte("created_at", startOfToday.toISOString())
      .then(({ data }) => {
        const done = new Set((data || []).map((r) => r.trainer));
        setMissionsDone(done.has("daily-quiz") && done.has("gulp-protocol") && done.has("skip-or-solve"));
      });
  }, [userData?.email]);

  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const plan = buildPlan(chapters || [], dayOfYear);
  const days = daysToExam();
  const weekNum = Math.max(1, Math.ceil((46 * 7 - days) / 7) + 1);
  const todayIdx = (now.getDay() + 6) % 7; // 0 = Monday
  const week = weekPlan(plan.queue, todayIdx);
  const doneToday = (c) => Number(c?.tests_today || 0) > 0;
  const tasksDone = [missionsDone, doneToday(plan.task2), doneToday(plan.task3)].filter(Boolean).length;

  const openChapter = async (ch) => {
    if (!ch || openingRef.current) return;
    openingRef.current = true;
    setOpening(ch.chapter_id);
    const { data } = await supabase.rpc("get_chapter_entry", {
      p_email: userData?.email || "",
      p_chapter: ch.chapter_id,
    });
    openingRef.current = false;
    setOpening(null);
    if (data?.length) router.push(`/test/${data[0].test_uuid}`);
  };

  // ── shared styles (dashboard tokens) ──
  const grad = {
    fontFamily: "var(--font-display, 'Fraunces', serif)",
    fontWeight: 500,
    letterSpacing: "-0.02em",
    background: "var(--c-stat-grad)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
  const sectLabel = { fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)" };
  const sectMeta = { fontSize: 11.5, color: "var(--c-text-tertiary)" };
  const card = { background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, padding: "8px 22px", boxShadow: "var(--c-shadow-xs)" };
  const chip = (done) => ({
    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
    display: "grid", placeItems: "center", fontWeight: 600, fontSize: 15,
    background: done ? "var(--c-success-soft)" : "var(--c-brand-gold-tint)",
    color: done ? "var(--c-success)" : "var(--c-brand-gold)",
  });

  const taskRow = (num, done, title, why, onClick, cta) => (
    <div
      key={num}
      onClick={done ? undefined : onClick}
      className="flex items-center gap-3.5 group"
      style={{ padding: "17px 0", borderBottom: num < 3 ? "1px solid var(--c-border-faint)" : "none", cursor: done ? "default" : "pointer" }}
    >
      <div style={chip(done)}>{done ? "✓" : num}</div>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.005em", color: done ? "var(--c-text-tertiary)" : "var(--c-text-primary)" }}>{title}</div>
        <div style={{ fontSize: 12, marginTop: 3, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>{why}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: done ? "var(--c-success)" : "var(--c-brand-gold)", whiteSpace: "nowrap", opacity: done ? 1 : undefined }}>
        {done ? "done ✓" : cta}
      </div>
    </div>
  );

  const clsCaption = (c) => {
    const isTarget = c === plan.task2 || c === plan.task3;
    if (c.cls === "new") return { text: `never attempted${isTarget ? " · today's target" : ""}`, color: isTarget ? "var(--c-brand-gold)" : "var(--c-text-tertiary)" };
    const t = `${c.tests} ${Number(c.tests) === 1 ? "test" : "tests"}`;
    if (isTarget) return { text: `${t} · today's target`, color: "var(--c-brand-gold)" };
    if (c.cls === "warming") return { text: `${t} · early days`, color: "var(--c-text-tertiary)" };
    if (c.cls === "attack") return { text: `${t} · next up`, color: "var(--c-brand-gold)" };
    if (c.cls === "strength") return { text: `${t} · strength`, color: "var(--c-success)" };
    return { text: `${t} · maintain`, color: "var(--c-text-tertiary)" };
  };

  // The map shows ONLY chapters the student has actually worked on,
  // weakest first. Untouched chapters live in the Tests section —
  // repeating them here would be noise, not a plan. (The one new
  // chapter worth starting today already appears as task 3.)
  const sortedForMap = (plan.withClass || [])
    .filter((c) => Number(c.tests) > 0)
    .sort((a, b) => {
      const rank = { attack: 0, warming: 1, maintain: 2, strength: 3 };
      return rank[a.cls] - rank[b.cls] || (a.acc ?? 101) - (b.acc ?? 101);
    });

  const dateLine = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4" style={{ color: "var(--c-text-primary)", textAlign: "left" }}>
      {/* header */}
      <header className="mb-1 mt-10">
        <h1 className="ds-display" style={{ fontSize: "clamp(28px, 4.2vw, 40px)", lineHeight: 1.1 }}>
          Aaj ka <span className="ds-accent ds-grad-text">plan.</span>
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
          Built from your test history every morning — your weakest chapters get the spotlight, automatically.
        </p>
      </header>

      {/* open stat strip */}
      <div className="flex items-center flex-wrap mt-7 mb-1">
        {[
          [
            "Days to IPMAT",
            String(days),
            EXAM_CONFIRMED
              ? `IPMAT ${EXAM_DATE.slice(0, 4)} · week ${weekNum} of 46`
              : `IPMAT ${EXAM_DATE.slice(0, 4)} · week ${weekNum} of 46`,
            30,
          ],
          ["This week's focus", plan.task2 ? shortName(plan.task2.subject || "").replace(/Topic-wise\s*/i, "") || "Revision" : "—", plan.task2 ? `${shortName(plan.task2.chapter)}${plan.task3 ? " · " + shortName(plan.task3.chapter) : ""}` : "take a test to unlock", 21],
          ["Sunday", "Full mock", "fixed every week — exam rhythm", 21],
        ].map(([l, v, cap, size], i, arr) => (
          <div key={l} style={{ padding: "4px 34px 4px 0", marginRight: 34, borderRight: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none" }}>
            <div className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-tertiary)" }}>
              {l}
              {i === 0 && !EXAM_CONFIRMED && (
                <span
                  title="IIM Indore hasn't announced the official IPMAT 2027 date yet — this counts to the expected window and will adjust when it's out."
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--c-brand-gold)", background: "var(--c-brand-gold-tint)", borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", cursor: "help" }}
                >
                  expected
                </span>
              )}
            </div>
            <div style={{ ...grad, fontSize: size, marginTop: 3, lineHeight: 1.15, paddingTop: size < 30 ? 5 : 0 }}>{v}</div>
            <div style={{ fontSize: 11, marginTop: 4, color: i === 1 ? "var(--c-brand-gold)" : "var(--c-text-tertiary)", fontWeight: 500 }}>
              {i === 0 && !EXAM_CONFIRMED ? `IPMAT ${EXAM_DATE.slice(0, 4)} · date not announced yet` : cap}
            </div>
          </div>
        ))}
      </div>

      {/* today's three */}
      <div className="flex justify-between items-baseline mt-8 mb-3">
        <div style={sectLabel}>Today&apos;s three</div>
        <span style={sectMeta}>{dateLine} · {tasksDone} of 3 done</span>
      </div>
      <div className="max-w-[860px]" style={card}>
        {taskRow(1, missionsDone, "Daily missions — Sim Room", "Quiz, Gulp and Skip or Solve — the daily base.", () => setCTXSlug("dsbchallenge"), "Open →")}
        {taskRow(
          2,
          doneToday(plan.task2),
          plan.task2 ? `Concept test — ${shortName(plan.task2.chapter)}` : "Take your first concept test",
          plan.task2
            ? plan.task2.cls === "new"
              ? "Fresh territory — the plan starts mapping you from here."
              : `Your weakest chapter: ${plan.task2.acc}% over ${plan.task2.tests} ${Number(plan.task2.tests) === 1 ? "test" : "tests"}. Fixing this moves your score most.`
            : "Once you have history, this slot targets your weakest chapter.",
          () => (plan.task2 ? openChapter(plan.task2) : setCTXSlug("play")),
          opening === plan.task2?.chapter_id ? "Opening…" : "Start →"
        )}
        {taskRow(
          3,
          doneToday(plan.task3),
          plan.task3 ? (plan.task3.cls === "new" ? `First look — ${shortName(plan.task3.chapter)}` : `Concept test — ${shortName(plan.task3.chapter)}`) : "Explore a new chapter",
          plan.task3
            ? plan.task3.cls === "new"
              ? "Never attempted — unexplored chapters hide easy marks."
              : `${plan.task3.acc}% over ${plan.task3.tests} ${Number(plan.task3.tests) === 1 ? "test" : "tests"} — next on the list.`
            : "Pick any chapter you haven't met yet.",
          () => (plan.task3 ? openChapter(plan.task3) : setCTXSlug("play")),
          opening === plan.task3?.chapter_id ? "Opening…" : "Start →"
        )}
      </div>

      {/* chapter map */}
      <div className="flex justify-between items-baseline mt-9 mb-3">
        <div style={sectLabel}>Your chapter map</div>
        <span style={sectMeta}>your attempted chapters, weakest first</span>
      </div>
      <div className="max-w-[860px]" style={card}>
        {chapters === null && (
          <div style={{ padding: "16px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>Reading your test history…</div>
        )}
        {chapters !== null && sortedForMap.length === 0 && (
          <div style={{ padding: "16px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>
            Take a concept test and your weak-spot map appears here — weakest chapters first.
          </div>
        )}
        {sortedForMap.slice(0, showAllMap ? sortedForMap.length : 6).map((c, i, arr) => {
          const cap = clsCaption(c);
          return (
            <div key={c.chapter_id} className="flex items-baseline gap-3.5" style={{ padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--c-border-faint)" : "none" }}>
              {c.acc != null ? (
                <span style={{ ...grad, width: 74, fontSize: 22, lineHeight: 1 }}>{c.acc}%</span>
              ) : (
                <span style={{ width: 74, fontSize: 14, color: "var(--c-text-tertiary)", fontStyle: "italic", fontFamily: "var(--font-display, 'Fraunces', serif)" }}>new</span>
              )}
              <span style={{ fontSize: 13.5, fontWeight: c.cls === "attack" || c === plan.task2 || c === plan.task3 ? 600 : 500, color: c.cls === "strength" || c.cls === "maintain" ? "var(--c-text-secondary)" : "var(--c-text-primary)" }}>
                {shortName(c.chapter)}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", color: cap.color }}>{cap.text}</span>
            </div>
          );
        })}
        {sortedForMap.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllMap((v) => !v)}
            style={{ background: "none", border: "none", padding: "13px 0", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit" }}
          >
            {showAllMap ? "Show less" : `Show all ${sortedForMap.length} attempted chapters →`}
          </button>
        )}
      </div>

      {/* week ahead */}
      <div className="flex justify-between items-baseline mt-9 mb-1">
        <div style={sectLabel}>The week ahead</div>
        <span style={sectMeta}>reshuffles as your scores change · Sunday never moves</span>
      </div>
      <div className="max-w-[860px] relative mt-6 mb-2">
        <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 1, background: "var(--c-border-soft)" }} />
        <div className="grid relative" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dw, d) => {
            const isToday = d === todayIdx;
            const isPast = d < todayIdx;
            const isMock = d === 6;
            return (
              <div key={dw} className="text-center">
                <div
                  style={{
                    width: isToday ? 12 : 8, height: isToday ? 12 : 8, borderRadius: 99,
                    background: isToday ? "var(--c-brand-gold)" : isPast ? "var(--c-text-tertiary)" : "var(--c-surface)",
                    border: `1.5px solid ${isToday ? "var(--c-brand-gold)" : isPast ? "var(--c-text-tertiary)" : "var(--c-border-soft)"}`,
                    boxShadow: isToday ? "0 0 12px rgba(255,182,39,.45)" : "none",
                    margin: `${isToday ? 0 : 2}px auto 12px`,
                  }}
                />
                <div style={{ fontSize: 10, fontWeight: isToday ? 600 : 500, letterSpacing: "0.1em", textTransform: "uppercase", color: isToday ? "var(--c-brand-gold)" : "var(--c-text-tertiary)" }}>{dw}</div>
                <div
                  className={isMock ? "ds-accent ds-grad-text" : ""}
                  style={{ fontSize: 12.5, fontWeight: isToday ? 600 : 500, marginTop: 5, lineHeight: 1.35, color: isMock ? undefined : isToday ? "var(--c-text-primary)" : "var(--c-text-secondary)", opacity: isPast ? 0.5 : 1, padding: "0 4px" }}
                >
                  {isPast ? "done ✓" : week[d]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="max-w-[860px] mb-12" style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 18, lineHeight: 1.7 }}>
        Clear {plan.task2 ? shortName(plan.task2.chapter) : "today's target"} and tomorrow quietly switches to your next weakest chapter.
        <ArrowRight size={11} style={{ display: "inline", verticalAlign: "-1px", marginLeft: 4 }} />
      </div>
    </div>
  );
}
