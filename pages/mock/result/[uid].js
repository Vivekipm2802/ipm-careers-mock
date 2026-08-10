// ============================================================
// Mock Result page — Phase 8 redesign
// Premium scoring summary: hero score, KPI row, section rings,
// test info strip, question-by-question review with section blocks.
// All existing data fetching and scoring logic preserved.
// ============================================================

import Loader from "@/components/Loader";
import ThemeToggle from "@/components/ThemeToggle";
import { useNMNContext } from "@/components/NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { Play, Printer, ArrowLeft, ArrowRight, BookOpen, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
// D4 result coaching layer
import MentorRead from "@/components/MentorRead";
import ReportIssue from "@/components/ReportIssue";
import LeaderboardBlock from "@/components/LeaderboardBlock";
import {
  agreeingMockCount,
  bestSectionImprovement,
  perSectionFromPlay,
  pickWeakestSection,
  wrongsInFinalWindow,
} from "@/lib/mentorRead";
// 2026-08 correctness audit: ONE canonical scoring rule for the whole
// portal — +4/−1 defaults, config overrides by magnitude, SA wrongs
// never negative, verdicts re-derived content-first from the raw
// stored answer (never trust historical isCorrect / score columns).
import {
  deriveVerdict,
  chosenIndex,
  resolveConfig,
  normType,
} from "@/lib/scoring";
import { getAuthHeaders } from "@/utils/authHeaders";
// 2026-08 owner feedback: subject titles arrive raw ("SA (Hash IPMAT
// Mock 3) 2026") — every section label on this page renders the SHORT
// name ("SA") via the shared helper.
import { shortSectionName } from "@/lib/labels";

// Ship 4: Supabase returns question ids as number OR string depending on the
// query path. Compare as strings everywhere (same helper as the runners).
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

export default function MockResult({ result }) {
  const [sections, setSections] = useState();
  const [modules, setModules] = useState();
  const [questions, setQuestions] = useState();
  const [activeVideo, setActiveVideo] = useState();
  const [modal, setModal] = useState(undefined);
  const [activeFilter, setActiveFilter] = useState("all");
  // Phase 10 redesign: palette-local filter (All / Wrong / Skipped chips)
  const [paletteFilter, setPaletteFilter] = useState("all");
  // Now an object from /api/leaderboard: {top, you, top10pctAvg, ...}
  const [leaderboard, setLeaderboard] = useState(null);

  const router = useRouter();
  const { userDetails, isRouting, setCTXSlug } = useNMNContext();

  async function getSections(a) {
    const { data, error } = await supabase
      .from("mock_groups")
      .select("*,subject(*)")
      .eq("test", a)
      .order("seq", { ascending: true });
    if (data) {
      const subjectGroups = data.filter(
        (s) => s.type === "subject" || (s.subject != null && s.module == null),
      );
      setSections(subjectGroups);
      getModules(data);
    }
  }
  async function getModules(a) {
    const { data, error } = await supabase
      .from("mock_groups")
      .select("*,module(*)")
      .in("parent_sub", a.map((i) => i.id));
    if (data) {
      setModules(data);
      getQuestions(data);
    }
  }
  async function getQuestions(a) {
    const { data, error } = await supabase
      .from("mock_questions")
      .select("*")
      .in("parent", a.filter((i) => i.module).map((i) => i.module.id))
      .order("seq", { ascending: true });
    if (data) {
      setQuestions(data);
      getLeaderboard(result?.test_id?.id);
    }
  }
  async function getLeaderboard(testId) {
    // 2026-08 correctness audit: the old direct mock_plays query ran with
    // the ANON client — RLS on mock_plays is own-rows-only, so the board
    // showed ONLY the current student ("You · 0"; 0 because submits never
    // wrote the score column). The server endpoint uses the service role,
    // re-scores every play canonically and dedupes per student. Any
    // failure just hides the section.
    if (!testId) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/leaderboard?type=mock&testId=${encodeURIComponent(testId)}`,
        { headers },
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.top)) setLeaderboard(data);
    } catch (e) { /* silent */ }
  }
  useEffect(() => {
    if (result != undefined) getSections(result?.test_id.id);
  }, []);

  // ── Per-question scoring helper ──
  // 2026-08 correctness audit: verdicts come from lib/scoring's
  // deriveVerdict — content-first option matching (the stored chosen
  // text wins over the stored position when both exist), robust SA
  // normalisation (trim / case / whitespace / thousands-commas /
  // numeric equivalence "13" ≡ "13.0" ≡ " 13 ").
  function isQuestionCorrect(q, reportItem) {
    if (!reportItem) return null; // not attempted
    return deriveVerdict(q, reportItem);
  }

  function getQStatus(q) {
    if (!result) return "skipped";
    const answered = result.report?.find((r) => sameId(r.id, q.id));
    const isMarked = result.data
      ?.filter((m) => m.status == "review")
      ?.some((m) => sameId(m.id, q.id));
    if (!answered) return isMarked ? "marked" : "skipped";
    const correct = isQuestionCorrect(q, answered);
    if (correct === true) return "correct";
    if (correct === false) return "wrong";
    return "skipped";
  }

  // ── Aggregate stats (memoised) ──
  const stats = useMemo(() => {
    if (!sections || !modules || !questions || !result) return null;

    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let markedCount = 0;
    const perSection = [];

    sections.forEach((sec) => {
      const secModules = modules.filter((m) => m.parent_sub === sec.id);
      let secScore = 0;
      let secMax = 0;
      let secCorrect = 0;
      let secTotal = 0;
      let secNegs = 0;
      let secWrong = 0;
      let secMcq = 0;
      // 2026-08 correctness audit (THE 91/180 bug): the old code did
      // `pos = sec.pos || 0; neg = sec.neg || 0; secScore += neg` — and
      // live mock_groups rows store `neg` as a POSITIVE magnitude (+1),
      // so every wrong answer ADDED a mark: 20 right · 11 wrong showed
      // 20×4 + 11 = 91 with "without negatives 102". Canonical rule:
      // +pos (default 4) for correct, −|neg| (default 1) for wrong MCQ,
      // and SA/input wrongs cost 0 — always.
      const { increment: pos, decrement: negMag } = resolveConfig({
        increment: sec.pos,
        decrement: sec.neg,
      });
      secModules.forEach((mod) => {
        if (!mod.module) return;
        const qs = questions.filter((q) => q.parent === mod.module.id);
        qs.forEach((q) => {
          secTotal += 1;
          secMax += pos;
          if (normType(q.type) !== "input") secMcq += 1;
          const reportItem = result.report?.find((r) => sameId(r.id, q.id));
          const isCorrect = isQuestionCorrect(q, reportItem);
          // Ship 4: marked questions were counted under BOTH skipped and
          // marked (and answered+marked under correct/wrong AND marked), so
          // pill totals never summed to totalQ. Partition to match getQStatus:
          // correct / wrong / marked (unanswered+review) / skipped.
          const isMarked = result.data
            ?.filter((m) => m.status == "review")
            ?.some((m) => sameId(m.id, q.id));
          if (isCorrect === true) {
            secScore += pos;
            secCorrect += 1;
            correctCount += 1;
          } else if (isCorrect === false) {
            if (normType(q.type) !== "input") {
              // MCQ wrong → subtract the penalty magnitude
              secScore -= negMag;
              secNegs += negMag;
            }
            // SA wrong → 0, no negative ever
            secWrong += 1;
            wrongCount += 1;
          } else if (isMarked) {
            markedCount += 1;
          } else {
            skippedCount += 1;
          }
        });
      });
      totalScore += secScore;
      maxScore += secMax;
      perSection.push({
        sec,
        score: secScore,
        max: secMax,
        correct: secCorrect,
        total: secTotal,
        negs: secNegs,
        wrong: secWrong,
        // "skipped" here = unattempted (incl. marked-unanswered) — the
        // section-table column groups both under Skipped.
        skipped: secTotal - secCorrect - secWrong,
        mcqCount: secMcq,
        // Section shows red wrongs only when a wrong can actually cost
        // marks here: it has MCQ questions AND a nonzero penalty.
        hasNeg: secMcq > 0 && negMag > 0,
        pos,
        negMag,
        pct: secMax > 0 ? Math.round((Math.max(0, secScore) / secMax) * 100) : 0,
      });
    });

    // Ship 4: markedCount is now disjoint from skippedCount — include it
    const totalQ = correctCount + wrongCount + skippedCount + markedCount;
    const attempted = correctCount + wrongCount;
    // Ship 2 fix (2026-07): denominator was `totalQ` (total questions,
    // including skipped) while the label read "Out of N attempted".
    // Accuracy is by definition correct / attempted — skipped shouldn't
    // dilute it. Fixed both the calc and the label sub-line.
    const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;
    const totalNeg = perSection.reduce((s, p) => s + p.negs, 0);

    return {
      totalScore,
      maxScore,
      correctCount,
      wrongCount,
      skippedCount,
      markedCount,
      totalQ,
      attempted,
      accuracy,
      totalNeg,
      perSection,
    };
  }, [sections, modules, questions, result]);

  // Total time taken in minutes.
  // Ship 4: prefer the wall-clock `duration` column (runner records
  // submit − start). max(at) misses all time spent on the final question;
  // kept only as fallback for plays recorded before the column existed.
  const totalTimeMin = useMemo(() => {
    if (Number.isFinite(Number(result?.duration)) && result.duration > 0) {
      return Math.round(result.duration / 60);
    }
    if (!result?.report) return 0;
    const maxAt = result.report.reduce((m, r) => (typeof r.at === "number" && r.at > m ? r.at : m), 0);
    return Math.round(maxAt / 60);
  }, [result]);

  // ── Phase 10: per-question time from report `at` deltas ─────────
  // Same derivation the analytics page has always used: `at` is the
  // cumulative seconds-elapsed stamp at answer time; time-on-question
  // = delta to the previous answered stamp. Real stored data only —
  // plays without `at` stamps simply produce an empty map and every
  // time affordance (table column, card timer) hides itself.
  const questionTimes = useMemo(() => {
    if (!result?.report) return new Map();
    const sorted = [...result.report]
      .filter((r) => typeof r.at === "number")
      .sort((a, b) => a.at - b.at);
    const map = new Map();
    let prev = 0;
    sorted.forEach((r) => {
      const t = r.at - prev;
      if (t >= 0 && t < 7200) map.set(String(r.id), t);
      prev = r.at;
    });
    return map;
  }, [result]);

  // Per-section time = sum of that section's question deltas.
  const sectionTimes = useMemo(() => {
    const map = new Map();
    if (!sections || !modules || !questions || questionTimes.size === 0) return map;
    sections.forEach((sec) => {
      const secModules = modules.filter((m) => m.parent_sub === sec.id);
      let t = 0;
      secModules.forEach((mod) => {
        if (!mod.module) return;
        questions
          .filter((q) => q.parent === mod.module.id)
          .forEach((q) => {
            t += questionTimes.get(String(q.id)) || 0;
          });
      });
      map.set(sec.id, t);
    });
    return map;
  }, [sections, modules, questions, questionTimes]);
  // 2026-08 owner feedback: the Time column self-hides unless the play
  // has SENSIBLE per-section times — every section must have tracked
  // data (> 0s) and the total must reach at least a minute. A play
  // with missing / thin `at` stamps drops the whole column, header
  // and cells, rather than showing "—" / nonsense.
  const hasTimes = (() => {
    if (!stats || stats.perSection.length === 0 || sectionTimes.size === 0) return false;
    let totalTracked = 0;
    for (const p of stats.perSection) {
      const t = sectionTimes.get(p.sec.id);
      if (!(Number.isFinite(t) && t > 0)) return false;
      totalTracked += t;
    }
    return totalTracked >= 60;
  })();

  // Ship 4: dropped the deprecated mql.addListener block — it attached a new
  // listener on every click (leak) and only console.logged.
  function printPage() {
    window.print();
  }

  // ── D4: previous mocks for the mentor lines ────────────────────
  // Last 3 plays by this student BEFORE this one, with just enough
  // structure (sections → modules → minimal questions) to compute
  // per-section accuracy via perSectionFromPlay. Any failure just
  // hides the comparison lines — never the page. Hooks stay ABOVE
  // the early returns below (same hook-order rule as the concept
  // result page).
  const [prevPlays, setPrevPlays] = useState(null); // [{uid, created_at, perSection}]
  useEffect(() => {
    const email = result?.user || userDetails?.email;
    if (!email || !result?.created_at) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: plays } = await supabase
          .from("mock_plays")
          .select("uid,created_at,report,test_id")
          .eq("user", email)
          .lt("created_at", result.created_at)
          .neq("uid", result.uid)
          .order("created_at", { ascending: false })
          .limit(3);
        if (!Array.isArray(plays) || plays.length === 0) {
          if (!cancelled) setPrevPlays([]);
          return;
        }
        const testIds = [
          ...new Set(
            plays
              .map((p) => (p.test_id && typeof p.test_id === "object" ? p.test_id.id : p.test_id))
              .filter((x) => x != null)
          ),
        ];
        const { data: groups } = await supabase
          .from("mock_groups")
          .select("*,subject(*)")
          .in("test", testIds);
        const sectionRows = (groups || []).filter(
          (s) => s.type === "subject" || (s.subject != null && s.module == null)
        );
        const { data: mods } = sectionRows.length
          ? await supabase
              .from("mock_groups")
              .select("*,module(*)")
              .in("parent_sub", sectionRows.map((s) => s.id))
          : { data: [] };
        const modRows = (mods || []).filter((m) => m.module);
        const { data: qs } = modRows.length
          ? await supabase
              .from("mock_questions")
              .select("id,parent,type,options")
              .in("parent", modRows.map((m) => m.module.id))
          : { data: [] };
        const computed = plays.map((p) => {
          const tid = p.test_id && typeof p.test_id === "object" ? p.test_id.id : p.test_id;
          const g = sectionRows.filter((s) => s.test === tid);
          return {
            uid: p.uid,
            created_at: p.created_at,
            // Short section names so titles MATCH across mocks — the raw
            // titles embed each mock's own name ("SA (Hash IPMAT Mock 3)
            // 2026" vs "…Mock 4…") and would never compare equal.
            perSection: perSectionFromPlay(g, modRows, qs || [], p.report || []).map((s) => ({
              ...s,
              title: shortSectionName(s.title),
            })),
          };
        });
        if (!cancelled) setPrevPlays(computed);
      } catch (e) {
        if (!cancelled) setPrevPlays([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.uid, userDetails?.email]);

  // ── D4: Mentor's read lines ────────────────────────────────────
  // Works for full mocks AND sectionals (single-section plays adapt:
  // no cross-section talk, comparison runs against previous attempts
  // of the same section). NO Mistake Vault line on purpose — mock
  // wrongs don't feed the vault yet (no mock id-space in the vault
  // tables); revisit when they do.
  const mentorLines = useMemo(() => {
    if (!stats || !result) return [];
    const lines = [];
    const isSectional = stats.perSection.length === 1;

    // 1 · Counterfactual without negatives (+ late wrongs when the
    //     report carries timestamps and the test ran 20+ minutes).
    if (stats.wrongCount > 0 && stats.totalNeg > 0 && stats.maxScore > 0) {
      const cf = stats.totalScore + stats.totalNeg;
      const durationSec =
        Number.isFinite(Number(result?.duration)) && result.duration > 0
          ? Number(result.duration)
          : (result.report || []).reduce(
              (m, r) => (typeof r?.at === "number" && r.at > m ? r.at : m),
              0
            );
      const entries = (result.report || []).map((r) => {
        const q = (questions || []).find((qq) => sameId(qq.id, r.id));
        return {
          at: typeof r?.at === "number" ? r.at : null,
          isCorrect: q ? isQuestionCorrect(q, r) : null,
        };
      });
      const lateWrongs = wrongsInFinalWindow(entries, durationSec);
      lines.push({
        tone: "gold",
        icon: "trend",
        node: (
          <>
            Without negative marking: <b>{cf} / {stats.maxScore}</b>. {stats.wrongCount} wrong
            {stats.wrongCount === 1 ? "" : "s"} cost {stats.totalNeg} mark
            {stats.totalNeg === 1 ? "" : "s"}
            {lateWrongs > 0 ? <> — {lateWrongs} of them came in the last 10 minutes</> : null}.
          </>
        ),
      });
    }

    const cur = stats.perSection.map((s) => ({
      title: shortSectionName(s.sec?.subject?.title || "Section"),
      pct: s.pct,
      score: Math.max(0, s.score),
      max: s.max,
    }));
    const prev = Array.isArray(prevPlays) ? prevPlays : [];

    if (!isSectional) {
      // 2 · Weakest section this mock (+ consistency across previous mocks).
      const pick = pickWeakestSection(cur);
      if (pick) {
        const agree = agreeingMockCount(
          pick.weakest.title,
          prev.map((p) => {
            const w = pickWeakestSection(p.perSection, 1);
            return w ? w.weakest.title : null;
          })
        );
        lines.push({
          tone: "danger",
          icon: "alert",
          node: (
            <>
              <b>{pick.weakest.title} is the gap</b> — {pick.weakest.pct}% while {pick.best.title} held{" "}
              {pick.best.pct}%.{agree >= 1 ? <> Your last {agree + 1} mocks agree.</> : null}{" "}
              <a
                onClick={() => {
                  // mock result shares the NMN provider — set the portal
                  // slug, then client-navigate home to the sectional list.
                  setCTXSlug("sectional-tests");
                  router.push("/");
                }}
                style={{ color: "var(--c-brand-gold)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Practise it with sectionals →
              </a>
            </>
          ),
        });
      }

      // 3 · Best section improvement vs the previous mock.
      if (prev.length > 0) {
        const imp = bestSectionImprovement(cur, prev[0].perSection);
        if (imp) {
          lines.push({
            tone: "success",
            icon: "check",
            node: (
              <>
                <b>{imp.title}</b> improved — <b>+{imp.delta} marks</b> since your last mock. Whatever
                you&apos;re doing there, keep doing it.
              </>
            ),
          });
        }
      }
    } else {
      // Sectional play: compare this section against its previous attempts.
      const mine = cur[0];
      if (mine) {
        const prevSame = prev
          .map((p) => (p.perSection || []).find((s) => s.title === mine.title))
          .filter(Boolean);
        if (prevSame.length > 0) {
          const delta = mine.pct - prevSame[0].pct;
          if (delta > 0) {
            lines.push({
              tone: "success",
              icon: "check",
              node: (
                <>
                  <b>{mine.title}</b> is moving — {mine.pct}% today, up from {prevSame[0].pct}% last
                  attempt. It&apos;s working; keep the same routine.
                </>
              ),
            });
          } else if (delta < 0) {
            lines.push({
              tone: "danger",
              icon: "alert",
              node: (
                <>
                  <b>{mine.title}</b> slipped — {mine.pct}% today against {prevSame[0].pct}% last
                  attempt. Revise the weak chapters, then retake this section.
                </>
              ),
            });
          } else {
            lines.push({
              tone: "gold",
              icon: "clock",
              node: (
                <>
                  <b>{mine.title}</b> held steady at {mine.pct}% — same as your last attempt. To move
                  it, review every wrong below before the next try.
                </>
              ),
            });
          }
        }
      }
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, result, questions, prevPlays]);

  if (userDetails == undefined) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center" style={{ background: "var(--c-bg)", color: "var(--c-text-primary)" }}>
        <p style={{ marginBottom: 16 }}>You cannot access this without logging in</p>
        <Button as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank" color="primary">
          Login
        </Button>
      </div>
    );
  }
  if (questions == undefined || result == undefined || stats == null) {
    return (
      <div className="flex flex-col justify-center items-center text-center h-screen w-full" style={{ background: "var(--c-bg)", color: "var(--c-text-primary)" }}>
        <Loader />
        <p style={{ marginTop: 12, color: "var(--c-text-tertiary)" }}>Loading your result…</p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>
      {/* Solution Modal */}
      <Modal isOpen={modal != undefined} onClose={() => setModal(undefined)} size="2xl">
        <ModalContent>
          <ModalHeader>Solution</ModalHeader>
          <ModalBody>
            {modal?.explanationimage && (
              <img className="w-full h-full aspect-video max-w-lg" src={modal?.explanationimage} />
            )}
            <div dangerouslySetInnerHTML={{ __html: modal?.explanation }}></div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="flat" onPress={() => setModal(undefined)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px 80px" }}>

        {/* === TOP ACTION BAR === */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600, fontSize: 14 }}>
            <img src="/newlog.svg" style={{ height: 32, width: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <ThemeToggle />
            <button onClick={() => router.push("/")} style={pillGhost}>
              <ArrowLeft size={14} /> Back to dashboard
            </button>
            <button onClick={() => printPage()} style={pillGhost}>
              <Printer size={14} /> Print
            </button>
            <button
              onClick={() => router.push(`/mock/analytics/${router.query.uid}`)}
              style={pillPrimary}
              disabled={isRouting}
            >
              <BarChart3 size={14} /> View detailed analysis <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* === PAGE HEADER (Phase 10 — preview v3 kick + serif h1) === */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--c-brand-gold)", fontWeight: 600, marginBottom: 4 }}>
            {stats.perSection.length > 1 ? "Full mock" : "Sectional test"} · {result.test_id.title}
          </div>
          <h1 className="ds-display" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, margin: 0, color: "var(--c-text-primary)" }}>
            Your result, <em className="ds-grad-text" style={{ fontStyle: "italic", fontWeight: 500 }}>decoded.</em>
          </h1>
          <div style={{ fontSize: 13, color: "var(--c-text-tertiary)", margin: "4px 0 0" }}>
            One score, {stats.perSection.length === 1 ? "one section" : `${stats.perSection.length} sections`} — and the review below it. Submitted {CtoLocal(result.created_at).date} {CtoLocal(result.created_at).monthName} {CtoLocal(result.created_at).year}.
          </div>
        </div>

        {/* === HERO SCORE (Phase 10 — preview v3 hero) === */}
        <div style={heroCard}>
          <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)", opacity: 0.55, pointerEvents: "none" }} />
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.11em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600, marginBottom: 3 }}>Score</div>
            <div>
              <span className="ds-stat-value" style={{ fontSize: 46, lineHeight: 1 }}>{Math.max(0, stats.totalScore)}</span>{" "}
              <span style={{ fontSize: 14, color: "var(--c-text-tertiary)" }}>/ {stats.maxScore}</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 12.5, color: "var(--c-text-secondary)", lineHeight: 2 }}>
            Without negatives <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>{Math.max(0, stats.totalScore + stats.totalNeg)}</b>
            <br />
            {(() => {
              const myRank = leaderboard?.you?.rank ?? leaderboard?.top?.find((r) => r.isYou)?.rank;
              return myRank != null ? (
                <>
                  Rank <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>#{myRank}</b>
                  {Number.isFinite(Number(leaderboard?.totalPlayers)) ? ` of ${leaderboard.totalPlayers}` : ""} ·{" "}
                </>
              ) : null;
            })()}
            Accuracy <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>{stats.accuracy}%</b>
          </div>
        </div>

        {/* === TWO-COLUMN (2026-08 owner feedback): main content on the
            left, compact leaderboard rail on the right. flex-wrap stacks
            the rail below on narrow screens. Hero stays full-width above. === */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap", marginTop: 10 }}>
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>

        {/* === SECTION TABLE (Phase 10 — replaces KPI row + section rings) === */}
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--c-shadow-xs)", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...stTh, textAlign: "left" }}>Section</th>
                <th style={stTh}>Score</th>
                <th style={stTh}>Right</th>
                <th style={stTh}>Wrong</th>
                <th style={stTh}>Skipped</th>
                {hasTimes && <th style={stTh}>Time</th>}
              </tr>
            </thead>
            <tbody>
              {stats.perSection.map((p, d) => (
                <tr key={d}>
                  <td style={{ ...stTd, textAlign: "left", fontWeight: 600, color: "var(--c-text-primary)" }}>
                    {shortSectionName(p.sec.subject?.title || "Section")}
                    {!p.hasNeg && (
                      <span style={{ display: "block", fontSize: 10.5, color: "var(--c-text-tertiary)", fontWeight: 400, marginTop: 2 }}>
                        no negative marking
                      </span>
                    )}
                  </td>
                  <td style={stTd}>
                    <span className="ds-display" style={{ fontSize: 15, color: "var(--c-text-primary)" }}>
                      {Math.max(0, p.score)} <span style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>/ {p.max}</span>
                    </span>
                  </td>
                  {/* Quiet zeros (2026-08 owner feedback): a count of 0 is
                      grey — colour only non-zero rights (green) and non-zero
                      wrongs in sections where they actually cost marks. */}
                  <td style={{ ...stTd, color: p.correct > 0 ? "var(--c-success)" : "var(--c-text-tertiary)", fontWeight: 600 }}>{p.correct}</td>
                  <td style={{ ...stTd, color: p.hasNeg && p.wrong > 0 ? "var(--c-danger)" : "var(--c-text-tertiary)", fontWeight: 600 }}>{p.wrong}</td>
                  <td style={stTd}>{p.skipped}</td>
                  {hasTimes && <td style={stTd}>{fmtMin(sectionTimes.get(p.sec.id))}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...stTf, textAlign: "left" }}>Total</td>
                <td style={stTf}>
                  <span className="ds-display" style={{ fontSize: 16 }}>
                    {Math.max(0, stats.totalScore)} <span style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>/ {stats.maxScore}</span>
                  </span>
                </td>
                <td style={{ ...stTf, color: stats.correctCount > 0 ? "var(--c-success)" : "var(--c-text-tertiary)" }}>{stats.correctCount}</td>
                <td style={{ ...stTf, color: stats.totalNeg > 0 && stats.wrongCount > 0 ? "var(--c-danger)" : "var(--c-text-tertiary)" }}>{stats.wrongCount}</td>
                <td style={stTf}>{stats.skippedCount + stats.markedCount}</td>
                {hasTimes && <td style={stTf}>{fmtMin(totalTimeMin * 60)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* === QUESTION MAP — ONE card (2026-08 owner feedback): a single
            header row with one legend and ONE set of filter chips, then a
            slim per-section label above each wrapped row of cells. The one
            filter drives BOTH the map tint AND the review list below. === */}
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 16, boxShadow: "var(--c-shadow-xs)", padding: "16px 20px 18px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text-primary)" }}>Question map</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: "var(--c-text-tertiary)" }}>
              <LegendSq color="var(--c-success)" label="Right" />
              <LegendSq color="var(--c-danger)" label="Wrong" />
              <LegendSq muted label="Skipped" />
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["all", "wrong", "skipped"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    // The single chip row filters BOTH the map tint and the
                    // review list below — one mental model, one filter.
                    setPaletteFilter(f);
                    setActiveFilter(f);
                  }}
                  style={{
                    height: 26, padding: "0 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    background: paletteFilter === f ? "var(--c-brand-gold)" : "transparent",
                    color: paletteFilter === f ? "#fff" : "var(--c-text-secondary)",
                    border: paletteFilter === f ? "1px solid transparent" : "1px solid var(--c-border-soft)",
                  }}
                >
                  {f === "all" ? "All" : f === "wrong" ? "Wrong" : "Skipped"}
                </button>
              ))}
            </div>
          </div>
          {sections.map((sec) => {
            const secQs = [];
            (modules?.filter((m) => m.parent_sub === sec.id) || []).forEach((mod) => {
              if (!mod.module) return;
              (questions || [])
                .filter((q) => q.parent === mod.module.id)
                .sort((a, b) => a.seq - b.seq)
                .forEach((q) => secQs.push(q));
            });
            if (secQs.length === 0) return null;
            return (
              <div key={`pal-${sec.id}`} style={{ marginTop: 14 }}>
                {/* Short name ONLY — the old "SECTION TITLE · MOCK TITLE"
                    concatenation repeated the mock's name twice per row. */}
                <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, color: "var(--c-text-tertiary)", marginBottom: 8 }}>
                  {shortSectionName(sec.subject?.title || "Section")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {secQs.map((q, i) => {
                    const st = getQStatus(q);
                    const bucket = st === "correct" ? "correct" : st === "wrong" ? "wrong" : "skipped";
                    const dim = paletteFilter !== "all" && paletteFilter !== bucket;
                    const cell =
                      bucket === "correct"
                        ? { background: "var(--c-success-soft, #D6F3E3)", color: "var(--c-success)", border: "1px solid transparent" }
                        : bucket === "wrong"
                        ? { background: "var(--c-danger-soft, #FBE3E3)", color: "var(--c-danger)", border: "1px solid transparent" }
                        : { background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)" };
                    return (
                      <button
                        key={q.id}
                        onClick={() => document.getElementById(`qcard-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        title={`Q${i + 1} · ${st}`}
                        style={{ width: 28, height: 28, borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontVariantNumeric: "tabular-nums", opacity: dim ? 0.22 : 1, fontFamily: "inherit", ...cell }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* === QUESTION REVIEW — passive counts only; filtering lives in
            the map card's single chip row (2026-08 owner feedback). === */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "32px 0 16px", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Question-by-question review</h2>
          <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
            {stats.correctCount} correct · {stats.wrongCount} wrong · {stats.skippedCount + stats.markedCount} skipped
            {activeFilter !== "all" ? ` · showing ${activeFilter} only` : ""}
          </div>
        </div>

        {sections && sections.map((sec, d) => {
          const secModules = modules?.filter((m) => m.parent_sub === sec.id) || [];
          const secStats = stats.perSection.find((p) => p.sec.id === sec.id);

          // Collect all questions in this section across modules with global numbering
          let qIndex = 0;
          const cards = [];
          secModules.forEach((mod) => {
            if (!mod.module) return;
            const qs = (questions || []).filter((q) => q.parent === mod.module.id).sort((a, b) => a.seq - b.seq);
            qs.forEach((q) => {
              qIndex += 1;
              const status = getQStatus(q);
              if (activeFilter !== "all" && activeFilter !== status) return;
              // Phase 14 Ship A.2: guard findIndex — SA/input questions store options as an object {answer},
              // not an array, so optional chaining alone wasn't enough. Without this guard the result page
              // crashes with "n.findIndex is not a function" on any test with non-MCQ questions.
              const correctIdx = Array.isArray(q?.options)
                ? q.options.findIndex((o) => o?.isCorrect)
                : -1;
              const reportItem = result.report?.find((r) => sameId(r.id, q.id));
              // 2026-08 correctness audit: the highlighted "Your choice" now
              // comes from the same content-first matcher the verdict uses
              // (lib/scoring.chosenIndex) so badge and highlight can never
              // disagree.
              const chosenIdx = reportItem ? chosenIndex(q, reportItem) : null;
              const cardCfg = resolveConfig({ increment: sec.pos, decrement: sec.neg });
              cards.push(
                <QuestionCard
                  key={q.id}
                  q={q}
                  index={qIndex}
                  status={status}
                  pos={cardCfg.increment}
                  neg={normType(q.type) === "input" ? 0 : cardCfg.decrement}
                  correctIdx={correctIdx}
                  chosenIdx={chosenIdx}
                  inputValue={reportItem?.value}
                  qTime={questionTimes.get(String(q.id)) || 0}
                  activeVideo={activeVideo}
                  setActiveVideo={setActiveVideo}
                  setModal={setModal}
                  reporterEmail={result?.user || userDetails?.email}
                />
              );
            });
          });

          if (cards.length === 0) return null;

          return (
            <div key={sec.id} style={{ marginBottom: 28 }}>
              <div style={sectionStrip}>
                {shortSectionName(sec.subject?.title || "Section")}
                {secStats && (
                  <span style={sectionStripBadge}>
                    {Math.max(0, secStats.score)} / {secStats.max} · {secStats.pct}%
                  </span>
                )}
              </div>
              {cards}
            </div>
          );
        })}

        {/* === MENTOR'S READ — D4 coaching layer (logic unchanged).
            Phase 15 order per approved v3 preview: hero → table →
            leaderboard → map → review → mentor's read. === */}
        <MentorRead lines={mentorLines} />

        {/* === TEST INFO STRIP === */}
        <div className="result-meta-grid" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-faint)", borderRadius: 18, padding: "24px 28px", marginBottom: 32, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          <InfoCol k="Participant" v={result?.name || userDetails?.user_metadata?.full_name || "—"} />
          <InfoCol k="Test centre" v="IPM Careers Online Portal" />
          <InfoCol k="Test date" v={`${CtoLocal(result.created_at).dayName}, ${CtoLocal(result.created_at).date} ${CtoLocal(result.created_at).monthName}, ${CtoLocal(result.created_at).year}`} />
          <InfoCol k="Test name" v={result.test_id.title} />
        </div>

        </div>{/* /main column */}

        {/* === RAIL — compact leaderboard (sticky on wide screens, stacks
            below the main column on narrow ones via flex-wrap). === */}
        {leaderboard && Array.isArray(leaderboard.top) && leaderboard.top.length > 0 && (
          <aside style={{ flex: "0 1 320px", minWidth: 280, position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <LeaderboardBlock board={leaderboard} compact />
          </aside>
        )}
        </div>{/* /two-column */}

      </div>
    </div>
  );
}

// ── Sub-components ──
// Phase 10: minutes formatter for the section-table Time column
// (input in seconds → "38m" / "1h 50m" / "45s").
function fmtMin(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "—";
  const totalMin = Math.round(s / 60);
  if (totalMin === 0) return `${Math.round(s)}s`;
  if (totalMin < 60) return `${totalMin}m`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

// Per-question time — "45s" / "2m 10s".
function fmtQTime(seconds) {
  const s = Math.round(Number(seconds));
  if (!Number.isFinite(s) || s <= 0) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function LegendSq({ color, muted, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 9, height: 9, borderRadius: 3, display: "inline-block",
          background: muted ? "var(--c-surface-muted, var(--c-bg))" : color,
          border: muted ? "1px solid var(--c-border-soft)" : "none",
        }}
      />
      {label}
    </span>
  );
}

function InfoCol({ k, v }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 6 }}>{k}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c-text-primary)", letterSpacing: "-0.005em" }}>{v}</div>
    </div>
  );
}

function QuestionCard({ q, index, status, pos, neg, correctIdx, chosenIdx, inputValue, qTime, activeVideo, setActiveVideo, setModal, reporterEmail }) {
  const isInput = normType(q.type) === "input";
  const isSkippedQuiet = status === "skipped" || status === "marked";
  const statusStyles = {
    correct: { bg: "var(--c-success-soft, #E0F2E8)", color: "var(--c-success)", label: `Correct · +${pos}` },
    // 2026-08: `neg` arrives as the APPLIED penalty magnitude (0 for SA —
    // no negative marking on input questions, ever).
    wrong: { bg: "var(--c-danger-soft, #F8DADA)", color: "var(--c-danger)", label: neg > 0 ? `Wrong · −${neg}` : "Wrong · 0" },
    // Phase 10: quiet outline treatment for unattempted questions —
    // no fills, no red, just a grey outline badge.
    skipped: { bg: "transparent", color: "var(--c-text-tertiary)", label: "Skipped · 0", outline: true },
    marked: { bg: "transparent", color: "var(--c-text-tertiary)", label: "Marked · 0", outline: true },
  };
  const sStyle = statusStyles[status] || statusStyles.skipped;

  // Phase 10 video hygiene: an admin-marked video slot that is empty /
  // "-" / a non-URL placeholder must never render a Watch button.
  const videoUrl = typeof q.video === "string" ? q.video.trim() : "";
  const hasVideo = videoUrl.length > 2 && videoUrl.startsWith("http");
  // A video slot the admin marked but never filled (empty / "-" /
  // non-URL placeholder). Never render an iframe for it — where the
  // old UI would have shown a broken dark player, show a quiet
  // "coming soon" strip instead (only when a written solution exists
  // to point to; with neither, show nothing at all).
  const videoComingSoon = videoUrl.length > 0 && !hasVideo;
  const hasExplanation =
    (q.explanation && q.explanation !== "<p><strong>Write your Explanation Here...</strong></p>") ||
    !!q.explanationimage;
  const correctOption = Array.isArray(q.options) && correctIdx >= 0 ? q.options[correctIdx] : null;

  return (
    <div id={`qcard-${q.id}`} style={qCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span className="ds-display" style={{ fontSize: 18, fontWeight: 600, color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums" }}>
          Q{index}
        </span>
        <div
          style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase",
            padding: "4px 10px", borderRadius: 999,
            background: sStyle.bg, color: sStyle.color,
            border: sStyle.outline ? "1px solid var(--c-border-soft)" : "1px solid transparent",
          }}
        >
          {sStyle.label}
        </div>
        <span style={{ fontSize: 11, color: "var(--c-text-tertiary)" }}>
          {isInput ? "Short answer · no negative" : "MCQ"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--c-text-tertiary)" }}>
          {qTime > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtQTime(qTime)} on this</span>}
          <span style={{ fontFamily: "monospace" }}>Q#{q.id}</span>
        </div>
      </div>

      {q.title && <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: "var(--c-text-primary)", margin: "0 0 8px", maxWidth: "70ch" }}>{q.title}</p>}
      <div className="qcontent" style={{ fontSize: 15, lineHeight: 1.6, color: "var(--c-text-primary)", margin: "0 0 18px", maxWidth: "70ch" }} dangerouslySetInnerHTML={{ __html: q.question }} />
      {q.questionimage && <img src={q.questionimage} style={{ maxHeight: 200, marginBottom: 16, borderRadius: 12, border: "1px solid var(--c-border-faint)" }} />}

      {/* Phase 10 skipped treatment: correct-answer box only + one quiet
          grey line. No option rows, no red, nothing loud. */}
      {isSkippedQuiet && q.type === "options" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--c-success-soft, #E0F2E8)", border: "1px solid var(--c-success)", fontSize: 14, color: "var(--c-text-primary)" }}>
            <span style={{ color: "var(--c-success)", fontWeight: 500, marginRight: 8 }}>Correct answer:</span>
            <span dangerouslySetInnerHTML={{ __html: correctOption?.title || "—" }} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
            Skipping was safe — but check if you could have solved it.
          </div>
        </div>
      )}
      {isSkippedQuiet && q.type === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--c-success-soft, #E0F2E8)", border: "1px solid var(--c-success)", fontSize: 14, color: "var(--c-text-primary)" }}>
            <span style={{ color: "var(--c-success)", fontWeight: 500, marginRight: 8 }}>Correct answer:</span>
            {q?.options?.answer}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
            No negative here — worth an attempt next time.
          </div>
        </div>
      )}

      {!isSkippedQuiet && q.type === "options" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {q.options?.map((opt, i) => {
            const isCorrect = i === correctIdx;
            const isChosen = i === chosenIdx;
            const isChosenWrong = isChosen && !isCorrect;
            const letter = String.fromCharCode(65 + i);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 16px",
                background: isCorrect ? "var(--c-success-soft, #E0F2E8)" : isChosenWrong ? "var(--c-danger-soft, #F8DADA)" : "var(--c-surface-muted, var(--c-bg))",
                border: `1px solid ${isCorrect ? "var(--c-success)" : isChosenWrong ? "var(--c-danger)" : "var(--c-border-faint)"}`,
                borderRadius: 12,
                fontSize: 14,
                color: isCorrect || isChosenWrong ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                textDecoration: isChosenWrong ? "line-through" : "none",
                textDecorationColor: isChosenWrong ? "var(--c-danger)" : "transparent",
              }}>
                <span style={{
                  flexShrink: 0,
                  width: 24, height: 24, borderRadius: 6,
                  background: isCorrect ? "var(--c-success)" : isChosenWrong ? "var(--c-danger)" : "var(--c-surface)",
                  color: isCorrect || isChosenWrong ? "#fff" : "var(--c-text-secondary)",
                  display: "grid", placeItems: "center",
                  fontWeight: 600, fontSize: 12,
                  border: isCorrect || isChosenWrong ? "1px solid transparent" : "1px solid var(--c-border-soft)",
                }}>
                  {letter}
                </span>
                <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: opt?.title || "" }} />
                {(isCorrect || isChosenWrong) && (
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: isCorrect ? "var(--c-success)" : "var(--c-danger)", textDecoration: "none", whiteSpace: "nowrap" }}>
                    {isCorrect && isChosen ? "Correct · Your choice" : isCorrect ? "Correct answer" : "Your choice"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isSkippedQuiet && q.type === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: status === "correct" ? "var(--c-success-soft, #E0F2E8)" : status === "wrong" ? "var(--c-danger-soft, #F8DADA)" : "var(--c-surface-muted, var(--c-bg))",
            border: `1px solid ${status === "correct" ? "var(--c-success)" : status === "wrong" ? "var(--c-danger)" : "var(--c-border-faint)"}`,
            fontSize: 14,
            color: "var(--c-text-primary)",
          }}>
            <span style={{ color: "var(--c-text-tertiary)", marginRight: 8 }}>Your answer:</span>
            {inputValue ?? <span style={{ color: "var(--c-text-tertiary)" }}>—</span>}
          </div>
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--c-success-soft, #E0F2E8)", border: "1px solid var(--c-success)", fontSize: 14, color: "var(--c-text-primary)" }}>
            <span style={{ color: "var(--c-success)", fontWeight: 500, marginRight: 8 }}>Correct answer:</span>
            {q?.options?.answer}
          </div>
        </div>
      )}

      {/* Solution actions. Phase 10: Watch button only renders for a real
          http(s) URL — empty / "-" / placeholder video slots never show it. */}
      {(hasVideo || hasExplanation) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 14, borderTop: "1px solid var(--c-border-faint)", flexWrap: "wrap" }}>
          {hasVideo && (
            activeVideo === q.id ? (
              <div style={{ position: "relative", width: "100%", maxWidth: 500 }}>
                <iframe className="aspect-video w-full rounded-xl" src={videoUrl} style={{ background: "var(--c-surface-muted, var(--c-bg))" }} />
                <button
                  onClick={() => setActiveVideo(null)}
                  aria-label="Close video"
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 14, lineHeight: "28px", display: "grid", placeItems: "center" }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => setActiveVideo(q.id)} style={pillGhost}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--c-brand-primary)", color: "#fff" }}>
                  <Play size={12} fill="#fff" />
                </span>
                Watch video solution
              </button>
            )
          )}
          {hasExplanation && (
            <button onClick={() => setModal(q)} style={pillGhost}>
              <BookOpen size={14} /> Read written solution
            </button>
          )}
        </div>
      )}
      {/* Phase 15: video slot marked but empty — the quiet strip that
          replaces what used to be a broken dark player. Written
          solution exists, so the promise is honest. */}
      {videoComingSoon && hasExplanation && (
        <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 12, border: "1px dashed var(--c-border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-grid", placeItems: "center", width: 30, height: 30, borderRadius: "50%", background: "var(--c-brand-gold-tint, rgba(214,158,46,0.14))", color: "var(--c-brand-gold)", flexShrink: 0 }}>
            <Play size={13} />
          </span>
          <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: "var(--c-text-secondary)" }}>Video solution coming soon.</span>{" "}
            <span style={{ color: "var(--c-text-tertiary)" }}>The written solution covers the full method.</span>
          </span>
        </div>
      )}

      {/* D4: Report an issue (source 'mock'). NO Verified chip on mock
          questions on purpose — the AI audit doesn't cover
          mock_questions yet, so there is nothing honest to certify. */}
      <ReportIssue source="mock" questionId={q.id} user={reporterEmail} />
    </div>
  );
}

// ── Shared inline style objects ──
const eyebrowStyle = {
  fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--c-text-tertiary)",
  marginBottom: 10,
};
const sectionTitle = {
  fontSize: 20, fontWeight: 600, letterSpacing: "-0.018em",
  margin: "0 0 16px",
  color: "var(--c-text-primary)",
};
const heroCard = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 16,
  boxShadow: "var(--c-shadow-xs)",
  padding: "22px 26px",
  marginBottom: 14,
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  gap: 26,
  flexWrap: "wrap",
};
// Phase 10 section table cells (preview v3 .stable)
const stTh = {
  fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase",
  color: "var(--c-text-tertiary)", fontWeight: 600,
  padding: "14px 20px 11px", borderBottom: "1px solid var(--c-border-faint)",
  textAlign: "right",
};
const stTd = {
  padding: "15px 20px", borderBottom: "1px solid var(--c-border-faint)",
  textAlign: "right", color: "var(--c-text-tertiary)",
  fontVariantNumeric: "tabular-nums",
};
const stTf = {
  padding: "15px 20px", background: "var(--c-surface-muted, var(--c-bg))",
  fontWeight: 600, color: "var(--c-text-primary)", textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};
const sectionCard = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 18,
  padding: 24,
  display: "flex", flexDirection: "column",
  alignItems: "center",
};
const sectionStrip = {
  background: "var(--c-surface-muted, var(--c-bg))",
  border: "1px solid var(--c-border-faint)",
  borderRadius: "14px 14px 0 0",
  padding: "14px 20px",
  fontSize: 13, fontWeight: 600,
  color: "var(--c-text-primary)",
  letterSpacing: "-0.005em",
  borderBottom: "none",
  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
};
const sectionStripBadge = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-soft)",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  color: "var(--c-text-tertiary)",
  fontWeight: 500,
  letterSpacing: 0,
  fontVariantNumeric: "tabular-nums",
};
const qCard = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderTop: "none",
  padding: 24,
};
const pillGhost = {
  height: 36, padding: "0 14px", borderRadius: 999,
  background: "transparent",
  color: "var(--c-text-secondary)",
  border: "1px solid var(--c-border-soft)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "inherit", whiteSpace: "nowrap",
  transition: "all 0.18s ease",
};
const pillPrimary = {
  ...pillGhost,
  background: "var(--c-brand-primary)",
  color: "#fff",
  border: "1px solid transparent",
};

export async function getServerSideProps(context) {
  const { data, error } = await serversupabase
    .from("mock_plays")
    .select("*,test_id(*)")
    .eq("uid", context.query.uid);
  if (data && data.length > 0) {
    // ok
  }
  if (data?.length === 0 || error) {
    return { notFound: true };
  }
  return { props: { result: data[0] } };
}
