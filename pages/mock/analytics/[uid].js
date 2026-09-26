// ============================================================
// Mock Analytics page — 2026-09 "v5" redesign (design sprint 1).
// Approved look: Mock-analytics-v5-preview.html (editorial layout,
// no card soup). Owner rules baked in: ranks NEVER show a
// denominator, no percentiles anywhere, PYQs are only ever a drill
// option, cutoffs are category-wise and "for compass only".
//
// The page tells one story, top to bottom:
//   HERO      score · rank · batch avg · accuracy · attempts
//             + reality check (real paper mocks only, category-wise
//               official cutoffs from lib/paperCutoffs)
//   LEDGER    every mark accounted for: banked · negatives ·
//             left on wrongs · never opened + computed verdict
//   STAMINA   accuracy by quarter of the sitting (timestamps)
//   BEST SELF your own best sectional runs stitched into a target
//   SECTIONS  one editorial row per section
//   ACROSS    the Phase-15 longitudinal views, kept: score journey,
//             section sparklines, time split, quadrant, habits,
//             plus the takers histogram (aggregate from the API)
//   MOVES     next 3 moves, written from the report above
//
// ALL numbers are canonical recomputations via lib/scoring — the
// stored score column is never read. Cross-user data (topper line,
// batch average, ranks, histogram) comes from /api/mock-journey
// (service role, aggregate-only payload).
// ============================================================

import Loader from "@/components/Loader";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useNMNContext } from "@/components/NMNContext";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { Button } from "@nextui-org/react";
import { Printer, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { scoreMockPlay, normType } from "@/lib/scoring";
import { splitWrongs, wrongsInFinalWindow, FAST_WRONG_SEC } from "@/lib/mentorRead";
import { getAuthHeaders } from "@/utils/authHeaders";
import { shortSectionName } from "@/lib/labels";
import { realityCheck, CATS } from "@/lib/paperCutoffs";

// Ship 4: Supabase returns question ids as number OR string depending
// on the query path. Compare as strings everywhere.
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// Speed × accuracy thresholds (one consistent "quick" line — see
// Phase 15 notes; the 30s impulse rule lives in the habit line).
const QUICK_SEC = 90;
const SLOW_SEC = 120;

export default function MockAnalytics({ result }) {
  // ── hooks — ALL above the early returns (hook-order rule; this
  // page has crashed in production for exactly this before).
  // NOTE for scripts/ssr-check.js: the first four useState calls
  // keep their Phase-15 order (sections, modules, questions,
  // journey) so the existing fixtures keep working; new state is
  // appended AFTER them.
  const [sections, setSections] = useState();
  const [modules, setModules] = useState();
  const [questions, setQuestions] = useState();
  const [journey, setJourney] = useState(null); // null = loading, [] = none/failed
  const [profileCat, setProfileCat] = useState(null); // student_profiles.category
  const [catOverride, setCatOverride] = useState(null); // reality-check switcher
  // 2026-09 admin view: when an ADMIN opens a student's link, the page
  // fetches the STUDENT's journey (?as=) so mentors see the real rank,
  // batch position, histogram and across-mocks — with an admin note.
  // Non-admin viewers of someone else's play stay gated.
  const [adminView, setAdminView] = useState(false);
  // Owner-or-admin lock (2026-09): a non-admin opening another
  // student's link gets a polite block screen, not the report.
  const [blocked, setBlocked] = useState(false);

  const router = useRouter();
  const { userDetails, isRouting } = useNMNContext();

  async function getSections(a) {
    const { data } = await supabase
      .from("mock_groups").select("*,subject(*)").eq("test", a)
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
    const { data } = await supabase
      .from("mock_groups").select("*,module(*)").in("parent_sub", a.map((i) => i.id));
    if (data) {
      setModules(data.filter((m) => m.module));
      getQuestions(data);
    }
  }
  async function getQuestions(a) {
    const { data } = await supabase
      .from("mock_questions").select("*")
      .in("parent", a.filter((i) => i.module).map((i) => i.module.id))
      .order("seq", { ascending: true });
    if (data) setQuestions(data);
  }

  useEffect(() => {
    if (result != undefined) getSections(result?.test_id.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-mock history — server-side canonical rescoring. For a play
  // that isn't the viewer's own, admins get the student's journey via
  // ?as= (server-verified); everyone else gets an empty journey.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const playOwner = String(result?.user || "").toLowerCase();
        let ownEmail = "";
        try {
          const { data: u } = await supabase.auth.getUser();
          ownEmail = String(u?.user?.email || "").toLowerCase();
        } catch (e) { /* fall through to own journey */ }
        let url = "/api/mock-journey";
        if (playOwner && ownEmail && playOwner !== ownEmail) {
          // someone else's play — journey only if the server says admin
          const res2 = await fetch(`/api/mock-journey?as=${encodeURIComponent(playOwner)}`, { headers });
          if (res2.ok) {
            const data2 = await res2.json();
            if (!cancelled) {
              setAdminView(true);
              setJourney(Array.isArray(data2?.mocks) ? data2.mocks : []);
            }
          } else if (!cancelled) {
            // Not an admin — this report is not theirs to see.
            setJourney([]);
            setBlocked(true);
          }
          return;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) { if (!cancelled) setJourney([]); return; }
        const data = await res.json();
        if (!cancelled) setJourney(Array.isArray(data?.mocks) ? data.mocks : []);
      } catch (e) {
        if (!cancelled) setJourney([]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.user]);

  // Admission category (own-row RLS read) → default for the
  // reality-check card. Missing profile/category → General.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const em = data?.user?.email;
        if (!em) return;
        const { data: rows } = await supabase
          .from("student_profiles").select("category").ilike("email", em).limit(1);
        if (!cancelled && rows && rows.length && rows[0].category) setProfileCat(rows[0].category);
      } catch (e) { /* fall back to General */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── current play, canonically rescored ──
  const scored = useMemo(() => {
    if (!sections || !modules || !questions || !result) return null;
    try {
      return scoreMockPlay(sections, modules, questions, result.report || []);
    } catch (e) {
      return null;
    }
  }, [sections, modules, questions, result]);

  // ── per-question time from report `at` deltas (real data only) ──
  const questionTimes = useMemo(() => {
    if (!result?.report) return new Map();
    const sorted = [...result.report].filter((r) => typeof r.at === "number").sort((a, b) => a.at - b.at);
    const map = new Map();
    let prev = 0;
    sorted.forEach((r) => {
      const t = r.at - prev;
      if (t >= 0 && t < 7200) map.set(String(r.id), t);
      prev = r.at;
    });
    return map;
  }, [result]);

  const sectionTimes = useMemo(() => {
    const map = new Map();
    if (!sections || !modules || !questions || questionTimes.size === 0) return map;
    sections.forEach((sec) => {
      let t = 0;
      modules.filter((m) => m.parent_sub === sec.id).forEach((mod) => {
        questions.filter((q) => q.parent === mod.module.id).forEach((q) => {
          t += questionTimes.get(String(q.id)) || 0;
        });
      });
      map.set(sec.id, t);
    });
    return map;
  }, [sections, modules, questions, questionTimes]);

  const durationSec = useMemo(() => {
    if (Number.isFinite(Number(result?.duration)) && result.duration > 0) return Number(result.duration);
    if (!result?.report) return 0;
    return result.report.reduce((m, r) => (typeof r.at === "number" && r.at > m ? r.at : m), 0);
  }, [result]);

  // ── viewer identity gate (2026-09) ──
  // /api/mock-journey is always the LOGGED-IN user's history. When an
  // admin/mentor opens a student's analytics link, mixing the viewer's
  // journey (rank, batch avg, across-mocks, histogram, best self) into
  // the student's report is flat wrong — the owner hit exactly this.
  // Cross-mock views therefore render only for the play's own student.
  const viewingOthers =
    userDetails?.email != null &&
    result?.user != null &&
    String(userDetails.email).toLowerCase() !== String(result.user).toLowerCase();
  // Admins get the student's own journey (fetched with ?as=) — full view.
  const gated = viewingOthers && !adminView;
  const effJourney = gated ? [] : journey;

  // ── journey slices ──
  const fullMocks = useMemo(
    () => (Array.isArray(effJourney) ? effJourney.filter((m) => m.sectionCount > 1) : []),
    [effJourney]
  );
  const currentEntry = useMemo(
    () => (Array.isArray(effJourney) ? effJourney.find((m) => sameId(m.testId, result?.test_id?.id)) : null),
    [effJourney, result]
  );
  const fullIdx = useMemo(
    () => fullMocks.findIndex((m) => sameId(m.testId, result?.test_id?.id)),
    [fullMocks, result]
  );
  const prevMock = fullIdx > 0 ? fullMocks[fullIdx - 1] : null;

  // ── LEDGER: every mark accounted for ──
  const ledger = useMemo(() => {
    if (!scored) return null;
    const t = scored.total;
    if (!(t.maxMarks > 0)) return null;
    let wrongLeft = 0, unopened = 0;
    scored.perSection.forEach((p) => {
      wrongLeft += p.wrong * (p.increment || 4);
      unopened += (p.total - p.attempted) * (p.increment || 4);
    });
    const banked = Math.max(0, t.score);
    const saSkipped = (questions || []).filter(
      (q) => normType(q.type) === "input" && scored.verdictById[String(q.id)] == null
    ).length;
    const saSkippedMarks = saSkipped * 4;
    // The computed verdict: which bucket bound this mock?
    let verdict = null;
    const nearCeiling = t.maxMarks > 0 && banked / t.maxMarks >= 0.88;
    if (nearCeiling) {
      verdict = (<><b>Very little left on the table.</b> {banked} of {t.maxMarks} banked — refinement now beats repair.</>);
    } else if (unopened >= t.negative && unopened >= wrongLeft && unopened >= 12) {
      verdict = (
        <>
          <b>Selection was the ceiling, not knowledge.</b> The {t.unattempted} unopened questions held +{unopened}
          {saSkipped >= 2 ? <> — and {saSkipped} of them were no-negative SA questions, pure upside skipped</> : null}.
        </>
      );
    } else if (t.negative >= wrongLeft / 2 && t.negative >= 8) {
      verdict = (<><b>Negatives did the damage.</b> −{t.negative} eaten by {t.mcqWrong} wrong MCQs — without them you&apos;d sit at {t.withoutNegatives}.</>);
    } else if (wrongLeft >= 12) {
      verdict = (<><b>Accuracy was the bottleneck.</b> The {t.wrong} wrongs were worth {wrongLeft} — half of them right moves you {Math.round(wrongLeft / 2 + t.negative / 2)} up.</>);
    }
    return { banked, neg: t.negative, wrongLeft, unopened, max: t.maxMarks, saSkipped, saSkippedMarks, verdict };
  }, [scored, questions]);

  // ── STAMINA: accuracy by quarter of the sitting ──
  const stamina = useMemo(() => {
    if (!scored || !result?.report || durationSec < 2400) return null;
    const qs = [[], [], [], []]; // verdicts per quarter
    result.report.forEach((r) => {
      const v = scored.verdictById[String(r.id)];
      if (typeof r.at !== "number" || (v !== true && v !== false)) return;
      const qi = Math.min(3, Math.floor((r.at / durationSec) * 4));
      qs[qi].push(v);
    });
    const quarters = qs.map((arr, i) => {
      const right = arr.filter(Boolean).length;
      return { i, n: arr.length, right, acc: arr.length ? Math.round((right / arr.length) * 100) : null };
    });
    if (quarters.filter((q) => q.n >= 3).length < 3) return null;
    const label = ["Q1", "Q2", "Q3", "Q4"];
    const mins = Math.round(durationSec / 60 / 4);
    const withAcc = quarters.filter((q) => q.acc != null);
    const firstAcc = withAcc[0]?.acc ?? null;
    const last = quarters[3];
    let read = null;
    if (last.acc != null && firstAcc != null && firstAcc - last.acc >= 15) {
      const lateWrong = last.n - last.right;
      read = (
        <>
          <b>A fourth-quarter problem, not an accuracy problem.</b> {lateWrong} of your {scored.total.wrong} wrongs
          came in the final quarter of the sitting. One full-length sitting a week trains exactly this.
        </>
      );
    } else if (last.acc != null && firstAcc != null && last.acc >= firstAcc - 5) {
      read = (<><b>Stamina held.</b> Your final-quarter accuracy stayed within touching distance of your opening — endurance is not your leak.</>);
    }
    return { quarters, label, mins, read };
  }, [scored, result, durationSec]);

  // ── BEST SELF: your proven sectional bests, stitched ──
  const bestSelf = useMemo(() => {
    if (!scored || scored.perSection.length < 2 || fullMocks.length < 2) return null;
    const titles = scored.perSection.map((p) => shortSectionName(p.title));
    const cols = titles.map((title, i) => {
      let best = null;
      fullMocks.forEach((m, mi) => {
        const s = (m.perSection || []).find((x) => shortSectionName(x.title) === title);
        if (s && (best == null || s.score > best.score)) best = { score: s.score, mock: m.title, isCurrent: sameId(m.testId, result?.test_id?.id) };
      });
      const today = scored.perSection[i].score;
      if (best == null || today > best.score) best = { score: today, mock: "today", isCurrent: true };
      return { title, best: best.score, from: best.isCurrent ? null : best.mock, today, newBest: best.isCurrent && today >= best.score };
    });
    if (cols.some((c) => c.best == null)) return null;
    const stitched = cols.reduce((a, c) => a + Math.max(0, c.best), 0);
    const todayTotal = Math.max(0, scored.total.score);
    if (stitched <= todayTotal) return null; // today IS the best self — the new-best flags tell that story
    return { cols, stitched, gap: stitched - todayTotal };
  }, [scored, fullMocks, result]);

  // ── REALITY CHECK: official category-wise cutoffs (paper mocks) ──
  const activeCat = catOverride || (CATS.indexOf(profileCat) !== -1 ? profileCat : "General");
  const reality = useMemo(() => {
    if (!scored || !result?.test_id?.id) return null;
    try {
      return realityCheck(
        result.test_id.id,
        scored.perSection.map((p) => ({ title: p.title, score: p.score, max: p.max })),
        scored.total.score,
        scored.total.maxMarks,
        activeCat
      );
    } catch (e) {
      return null;
    }
  }, [scored, result, activeCat]);

  // ── quadrant + habits + section series (Phase 15, kept) ──
  const quad = useMemo(() => {
    if (!scored || questionTimes.size === 0) return null;
    let qr = 0, qw = 0, sr = 0, sw = 0, measured = 0;
    (result?.report || []).forEach((r) => {
      const v = scored.verdictById[String(r.id)];
      if (v !== true && v !== false) return;
      const t = questionTimes.get(String(r.id));
      if (!(t > 0)) return;
      measured += 1;
      if (t < QUICK_SEC) { v ? qr++ : qw++; }
      else if (t > SLOW_SEC) { v ? sr++ : sw++; }
    });
    if (measured === 0) return null;
    return { qr, qw, sr, sw, measured };
  }, [scored, questionTimes, result]);

  const habits = useMemo(() => {
    if (!scored) return [];
    const lines = [];
    const t = scored.total;
    const entries = (result?.report || []).map((r) => ({
      at: typeof r.at === "number" ? r.at : null,
      isCorrect: scored.verdictById[String(r.id)] ?? null,
    }));
    const swr = splitWrongs(entries, "at", FAST_WRONG_SEC);
    if (swr.fast >= 2) {
      lines.push({
        tone: "danger", icon: "clock",
        text: (<><b>Rushed answers cost you.</b> {swr.fast} of your {t.wrong} wrongs took under {FAST_WRONG_SEC} seconds, impulse picks, not concept gaps.</>),
      });
    }
    const saSkipped = (questions || []).filter(
      (q) => normType(q.type) === "input" && scored.verdictById[String(q.id)] == null
    ).length;
    if (saSkipped >= 3) {
      lines.push({
        tone: "gold", icon: "gift",
        text: (<><b>Free marks left behind.</b> You left {saSkipped} short-answer questions unattempted, they carry no negative. Attempting them is pure upside.</>),
      });
    }
    const late = wrongsInFinalWindow(entries, durationSec);
    if (late >= 2 && t.wrong > 0) {
      lines.push({
        tone: "danger", icon: "zigzag",
        text: (<><b>The final stretch slips.</b> {late} of your {t.wrong} wrongs came in the last 10 minutes, pace the middle, protect the end.</>),
      });
    }
    if (fullMocks.length >= 2) {
      const accs = fullMocks.slice(-3).map((m) => m.accuracy);
      const rising = accs.every((a, i) => i === 0 || a > accs[i - 1]);
      const falling = accs.every((a, i) => i === 0 || a < accs[i - 1]);
      if (rising && accs[accs.length - 1] > accs[0]) {
        lines.push({
          tone: "success", icon: "trend",
          text: (<><b>Accuracy is rising.</b> {accs[0]}% → {accs[accs.length - 1]}% over your last {accs.length} mocks. Keep the pace steady and let attempts grow.</>),
        });
      } else if (falling && accs[0] > accs[accs.length - 1]) {
        lines.push({
          tone: "danger", icon: "trend",
          text: (<><b>Accuracy is slipping.</b> {accs[0]}% → {accs[accs.length - 1]}% over your last {accs.length} mocks. Slow down on the ones you attempt.</>),
        });
      }
    }
    return lines;
  }, [scored, result, questions, durationSec, fullMocks]);

  const sectionSeries = useMemo(() => {
    if (fullMocks.length < 2) return null;
    const window = fullMocks.slice(-4);
    const titles = [
      ...new Set(window[window.length - 1].perSection.map((s) => shortSectionName(s.title))),
    ];
    const rows = titles.map((title) => {
      const values = window.map((m) => {
        const s = (m.perSection || []).find((x) => shortSectionName(x.title) === title);
        return s ? s.score : null;
      });
      const seen = values.filter((v) => v != null);
      const avg = seen.length ? Math.round(seen.reduce((a, b) => a + b, 0) / seen.length) : null;
      const current = seen.length ? seen[seen.length - 1] : null;
      const max = Math.max(
        1,
        ...window.map((m) => {
          const s = (m.perSection || []).find((x) => shortSectionName(x.title) === title);
          return s ? s.max : 0;
        })
      );
      const belowAvgCount = avg != null ? seen.filter((v) => v < avg).length : 0;
      return { title, values, avg, current, max, belowAvgCount, mocks: seen.length };
    });
    let weakest = null;
    rows.forEach((r) => {
      if (r.mocks >= 2 && r.belowAvgCount * 2 > r.mocks && (!weakest || r.belowAvgCount > weakest.belowAvgCount)) {
        weakest = r;
      }
    });
    return { rows, weakest, count: window.length };
  }, [fullMocks]);

  const suggestedSecPerSection = useMemo(() => {
    const timeout = Number(result?.test_id?.config?.timeout);
    if (!Number.isFinite(timeout) || timeout <= 0 || !sections || sections.length === 0) return null;
    return timeout / sections.length;
  }, [result, sections]);

  // ── CHAPTERS BEHIND YOUR WRONGS — lights up once the one-time
  // chapter-tagging run (scripts/tag-mock-chapters.mjs) has been
  // applied; until then q.topic is undefined and this stays null.
  const chapterDamage = useMemo(() => {
    if (!scored || !questions) return null;
    const tagged = questions.filter((q) => q.topic);
    if (tagged.length < questions.length * 0.6) return null; // bank not tagged yet
    const map = new Map(); // topic → { wrong, wrongMarks, att, unopened, unopenedMarks }
    const incOf = new Map();
    scored.perSection.forEach((p) => {
      // per-section increments for mark math
      (modules || []).filter((m) => m.parent_sub === p.sec.id).forEach((mod) => {
        (questions || []).filter((q) => q.parent === mod.module.id).forEach((q) => incOf.set(String(q.id), p.increment || 4));
      });
    });
    tagged.forEach((q) => {
      const v = scored.verdictById[String(q.id)];
      const inc = incOf.get(String(q.id)) || 4;
      const row = map.get(q.topic) || { wrong: 0, wrongMarks: 0, att: 0, unopened: 0, unopenedMarks: 0 };
      if (v === true || v === false) {
        row.att += 1;
        if (v === false) {
          row.wrong += 1;
          row.wrongMarks += inc + (normType(q.type) === "input" ? 0 : 1);
        }
      } else {
        row.unopened += 1;
        row.unopenedMarks += inc;
      }
      map.set(q.topic, row);
    });
    const rows = [...map.entries()]
      .map(([topic, r]) => ({ topic, ...r, cost: r.wrongMarks + (r.unopened >= 2 ? r.unopenedMarks : 0) }))
      .filter((r) => r.wrong >= 2 || (r.unopened >= 2 && r.unopenedMarks >= 8))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
    return rows.length ? rows : null;
  }, [scored, questions, modules]);

  // ── NEXT 3 MOVES: written from the report above ──
  const moves = useMemo(() => {
    if (!scored || !ledger) return [];
    const out = [];
    if (scored.total.unattempted >= 3 && ledger.unopened >= 12) {
      out.push({
        n: "Claim the pile",
        t: `Review the ${scored.total.unattempted} questions you never opened`,
        d: `They held +${ledger.unopened}${ledger.saSkipped >= 2 ? ` — ${ledger.saSkipped} were no-negative SA` : ""}. See what was actually easy before the next mock.`,
        href: `/mock/result/${router.query.uid}`,
      });
    }
    if (stamina && stamina.read && stamina.quarters[3].acc != null && (stamina.quarters[0].acc ?? 0) - stamina.quarters[3].acc >= 15) {
      out.push({
        n: "Train the fourth quarter",
        t: "One full-length sitting this week",
        d: `Your final-quarter accuracy fell to ${stamina.quarters[3].acc}%. Endurance is trainable — sectionals can't train it.`,
        href: "/mocks",
      });
    }
    if (quad && quad.qw >= 2) {
      out.push({
        n: "Redo the impulse picks",
        t: `${quad.qw} quick-and-wrong answers, cold, in your Vault`,
        d: "Under 90 seconds and wrong — decision errors, not concept gaps. Redo them without the clock.",
        href: "/vault",
      });
    }
    if (sectionSeries && sectionSeries.weakest) {
      out.push({
        n: "Lift the lagging section",
        t: `${sectionSeries.weakest.title} — a sectional this week`,
        d: `Below your own average in ${sectionSeries.weakest.belowAvgCount} of ${sectionSeries.weakest.mocks} mocks. One focused sectional beats three general ones.`,
        href: "/sectionals",
      });
    }
    if (out.length < 3 && ledger.neg >= 8) {
      out.push({
        n: "Halve the negatives",
        t: `−${ledger.neg} eaten this mock`,
        d: "Rule for next mock: no answer without eliminating two options first.",
        href: `/mock/result/${router.query.uid}`,
      });
    }
    return out.slice(0, 3);
  }, [scored, ledger, stamina, quad, sectionSeries, router.query.uid]);

  function printPage() { window.print(); }

  // ── early returns (all hooks are above this line) ──
  if (userDetails == undefined) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <p style={{ marginBottom: 16 }}>You cannot access this without logging in</p>
        <Button as={Link} href={`/login?redirectTo=${router.asPath}`} target="_blank" color="primary">Login</Button>
      </div>
    );
  }
  if (blocked) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 24 }}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>This report belongs to another student.</p>
        <p style={{ fontSize: 13, color: "var(--c-text-tertiary)", marginBottom: 18, maxWidth: "44ch", lineHeight: 1.6 }}>
          Mock reports are private to the student who took the mock (and the IPM Careers team).
        </p>
        <Button color="primary" onClick={() => router.push("/")}>Back to dashboard</Button>
      </div>
    );
  }
  if (questions == undefined || result == undefined || scored == null) {
    return (
      <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <Loader />
        <p style={{ marginTop: 12, color: "var(--c-text-tertiary)" }}>Loading your analytics…</p>
      </div>
    );
  }

  const total = scored.total;
  const accuracy = total.attempted > 0 ? Math.round((total.correct / total.attempted) * 100) : 0;
  const bestSection = [...scored.perSection].sort((a, b) => b.pct - a.pct)[0] || null;
  let bestRun = 1;
  if (bestSection && fullIdx > 0) {
    for (let i = fullIdx - 1; i >= 0; i--) {
      const b = [...(fullMocks[i].perSection || [])].sort((a, c) => (c.pct || 0) - (a.pct || 0))[0];
      if (b && shortSectionName(b.title) === shortSectionName(bestSection.title)) bestRun += 1;
      else break;
    }
  }
  const showTimeCard = (() => {
    if (scored.perSection.length === 0 || sectionTimes.size === 0) return false;
    let totalTracked = 0;
    for (const p of scored.perSection) {
      const t = sectionTimes.get(p.sec.id);
      if (!(Number.isFinite(t) && t > 0)) return false;
      totalTracked += t;
    }
    return totalTracked >= 60;
  })();

  const dist = currentEntry && Array.isArray(currentEntry.dist) && currentEntry.dist.some((n) => n > 0) ? currentEntry : null;

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", minHeight: "100vh", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: "-0.01em" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px 80px" }}>

        {/* TOP BAR */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600, fontSize: 14 }}>
            <img src="/newlog.svg" style={{ height: 32, width: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <ThemeToggle inline />
            <LanguageToggle inline />
            <button onClick={() => router.push("/")} style={pillGhost}>
              <ArrowLeft size={14} /> Back to dashboard
            </button>
            <button onClick={() => printPage()} style={pillGhost}>
              <Printer size={14} /> Print
            </button>
            <button onClick={() => router.push(`/mock/result/${router.query.uid}`)} style={pillPrimary} disabled={isRouting}>
              View result <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* ── HERO ── */}
        <div className="ana-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 28, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--c-brand-gold)", fontWeight: 600, marginBottom: 4 }}>
              {scored.perSection.length > 1 ? "Full mock" : "Sectional"} · report
            </div>
            <h1 className="ds-display" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.15, margin: 0 }}>
              {result?.test_id?.title} <em className="ds-grad-text" style={{ fontStyle: "italic", fontWeight: 500 }}>· decoded</em>
            </h1>
            <div className="ds-display" style={{ fontSize: 52, lineHeight: 1.1, marginTop: 14 }}>
              <span className="ds-grad-text">{Math.max(0, total.score)}</span>
              <span style={{ fontSize: 21, color: "var(--c-text-tertiary)" }}> /{total.maxMarks}</span>
            </div>
            <div style={{ display: "flex", gap: 26, marginTop: 16, flexWrap: "wrap" }}>
              <HeroStat
                k="Rank"
                v={currentEntry?.rank != null ? <>#{currentEntry.rank}</> : "—"}
                note={
                  currentEntry?.rank != null && prevMock?.rank != null
                    ? currentEntry.rank < prevMock.rank
                      ? { text: `↑ from #${prevMock.rank} last mock`, tone: "up" }
                      : currentEntry.rank > prevMock.rank
                      ? { text: `↓ from #${prevMock.rank} last mock`, tone: "dn" }
                      : { text: "same as last mock" }
                    : null
                }
              />
              <HeroStat k="Batch avg" v={currentEntry?.batchAvg != null ? currentEntry.batchAvg : "—"} note={currentEntry?.batchAvg != null ? { text: total.score >= currentEntry.batchAvg ? `you're ${total.score - currentEntry.batchAvg} above` : `you're ${currentEntry.batchAvg - total.score} below`, tone: total.score >= currentEntry.batchAvg ? "up" : "dn" } : null} />
              <HeroStat
                k="Accuracy"
                v={`${accuracy}%`}
                note={
                  prevMock != null
                    ? accuracy > prevMock.accuracy
                      ? { text: `↑ from ${prevMock.accuracy}% last mock`, tone: "up" }
                      : accuracy < prevMock.accuracy
                      ? { text: `↓ from ${prevMock.accuracy}% last mock`, tone: "dn" }
                      : { text: "level with last mock" }
                    : null
                }
              />
              <HeroStat
                k="Attempts"
                v={<>{total.attempted} <small style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>of {total.totalQuestions}</small></>}
                note={
                  prevMock != null
                    ? total.attempted > prevMock.attempted
                      ? { text: `↑ from ${prevMock.attempted} last mock`, tone: "up" }
                      : total.attempted < prevMock.attempted
                      ? { text: `↓ from ${prevMock.attempted} last mock`, tone: "dn" }
                      : { text: "flat, room to grow" }
                    : null
                }
              />
              <HeroStat k="Best section" v={<span style={{ fontSize: 17 }}>{bestSection ? shortSectionName(bestSection.title) : "—"}</span>} note={bestSection ? (bestRun >= 2 ? { text: `${bestRun} mocks running` } : { text: `${bestSection.pct}% this mock` }) : null} />
            </div>
          </div>

          {/* Reality check — real paper mocks only, category-wise */}
          {reality && (
            <div style={{ minWidth: 280, maxWidth: 360, flex: "0 1 340px", border: "1px solid var(--c-border-faint)", borderRadius: 14, padding: "16px 18px", background: "var(--c-surface)", boxShadow: "var(--c-shadow-xs)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--c-brand-gold)", fontWeight: 600 }}>
                  {reality.year} reality check
                </div>
                <select
                  value={activeCat}
                  onChange={(e) => setCatOverride(e.target.value)}
                  style={{ fontSize: 11, background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-faint)", borderRadius: 8, padding: "3px 6px", fontFamily: "inherit" }}
                >
                  {reality.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginTop: 10 }}>
                {reality.rows.map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderTop: "1px solid var(--c-border-faint)", fontSize: 13 }}>
                    <span style={{ color: "var(--c-text-secondary)" }}>
                      {reality.kind === "indore" ? `${r.label} gate` : r.label}
                      <span style={{ color: "var(--c-text-tertiary)", fontSize: 11.5 }}> · {r.need}</span>
                    </span>
                    <b style={{ color: r.cleared ? "var(--c-success)" : "var(--c-danger)", fontWeight: 700 }}>
                      {r.cleared ? `cleared +${r.got - r.need}` : `${r.got - r.need}`}
                    </b>
                  </div>
                ))}
                {reality.kind === "indore" && (
                  <div style={{ padding: "7px 0 0", borderTop: "1px solid var(--c-border-faint)", fontSize: 12.5, color: reality.rows.every((r) => r.cleared) ? "var(--c-success)" : "var(--c-danger)", fontWeight: 600 }}>
                    {reality.rows.every((r) => r.cleared)
                      ? "All three gates cleared — this score got an ATS that year"
                      : "One failed gate = no ATS that year, whatever the total"}
                  </div>
                )}
                {reality.doors.map((d) => (
                  <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderTop: "1px dashed var(--c-border-faint)", fontSize: 12.5 }}>
                    <span style={{ color: "var(--c-text-secondary)" }}>{d.label}{d.need != null ? <span style={{ color: "var(--c-text-tertiary)", fontSize: 11.5 }}> · {d.need}</span> : null}</span>
                    <b style={{ color: d.cleared ? "var(--c-success)" : "var(--c-danger)", fontWeight: 700 }}>{d.cleared ? "cleared" : "not yet"}</b>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--c-text-tertiary)", marginTop: 9, lineHeight: 1.5 }}>
                That year&apos;s official {reality.kind === "jipmat" ? "admission floor" : "cutoffs"} · for compass only — they change every year.
              </div>
            </div>
          )}
        </div>

        {/* ── LEDGER ── */}
        {ledger && (
          <div style={{ marginTop: 30 }}>
            <div style={seclabel}>The marks ledger · every mark accounted for</div>
            <div style={{ display: "flex", height: 34, borderRadius: 10, overflow: "hidden", border: "1px solid var(--c-border-faint)" }}>
              <LedgerSeg w={(ledger.banked / ledger.max) * 100} bg="var(--c-stat-grad)" fg="#241a05" label={`${ledger.banked} banked`} />
              <LedgerSeg w={(ledger.neg / ledger.max) * 100} bg="var(--c-danger)" fg="#fff" label={ledger.neg > 0 ? `−${ledger.neg}` : ""} />
              <LedgerSeg w={(ledger.wrongLeft / ledger.max) * 100} bg="var(--c-danger-soft, rgba(197,48,48,.25))" fg="var(--c-danger)" label={ledger.wrongLeft >= ledger.max * 0.06 ? `${ledger.wrongLeft} on wrongs` : ""} />
              <LedgerSeg w={(ledger.unopened / ledger.max) * 100} bg="var(--c-surface-muted, var(--c-bg))" fg="var(--c-text-tertiary)" label={ledger.unopened >= ledger.max * 0.08 ? `${ledger.unopened} unopened` : ""} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--c-text-tertiary)", marginTop: 6, flexWrap: "wrap", gap: 6 }}>
              <span>banked · eaten by negatives · left on wrongs · never opened</span>
              <span>{ledger.max} marks total</span>
            </div>
            {ledger.verdict && (
              <div style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 12, maxWidth: 720, color: "var(--c-text-secondary)" }}>{ledger.verdict}</div>
            )}
          </div>
        )}

        {/* ── STAMINA + BEST SELF ── */}
        {(stamina || bestSelf) && (
          <div className="ana-rail" style={{ display: "grid", gridTemplateColumns: stamina && bestSelf ? "1fr 1fr" : "1fr", gap: 40, marginTop: 34, paddingTop: 26, borderTop: "1px solid var(--c-border-faint)" }}>
            {stamina && (
              <div>
                <div style={seclabel}>Stamina · accuracy by quarter of the sitting</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 86, maxWidth: 400, marginTop: 24 }}>
                  {stamina.quarters.map((q, i) => (
                    <div key={i} style={{ flex: 1, position: "relative", height: `${Math.max(8, q.acc ?? 0)}%`, borderRadius: "6px 6px 0 0", background: q.acc == null ? "var(--c-surface-muted, var(--c-bg))" : q.acc >= 75 ? "var(--c-success-soft, rgba(26,135,84,.25))" : q.acc >= 60 ? "var(--c-brand-gold-tint)" : "var(--c-danger-soft, rgba(197,48,48,.2))" }}>
                      <span style={{ position: "absolute", top: -20, left: 0, right: 0, textAlign: "center", fontSize: 12, fontWeight: 700, color: q.acc == null ? "var(--c-text-tertiary)" : q.acc >= 75 ? "var(--c-success)" : q.acc >= 60 ? "var(--c-brand-gold)" : "var(--c-danger)" }}>
                        {q.acc == null ? "—" : q.acc}
                      </span>
                      <span style={{ position: "absolute", bottom: -20, left: 0, right: 0, textAlign: "center", fontSize: 9.5, color: "var(--c-text-tertiary)" }}>
                        {stamina.label[i]} · {q.n}q
                      </span>
                    </div>
                  ))}
                </div>
                {stamina.read && (
                  <div style={{ fontSize: 13, color: "var(--c-text-secondary)", lineHeight: 1.65, marginTop: 34 }}>{stamina.read}</div>
                )}
              </div>
            )}
            {bestSelf && (
              <div>
                <div style={seclabel}>Your best self · proven sectional bests</div>
                <div style={{ display: "flex", flexWrap: "wrap", marginTop: 14 }}>
                  {bestSelf.cols.map((c) => (
                    <div key={c.title} style={{ paddingRight: 22, marginRight: 22, marginBottom: 10, borderRight: "1px solid var(--c-border-faint)" }}>
                      <div style={{ fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", fontWeight: 700, color: "var(--c-text-tertiary)" }}>{c.title}</div>
                      <div className="ds-display" style={{ fontSize: 24, marginTop: 2 }}>{Math.max(0, c.best)}</div>
                      <div style={{ fontSize: 10.5, color: c.newBest ? "var(--c-success)" : "var(--c-text-tertiary)", fontWeight: c.newBest ? 700 : 400 }}>
                        {c.newBest ? "new best ✓" : `today ${Math.max(0, c.today)}${c.from ? ` · ${c.from}` : ""}`}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", fontWeight: 700, color: "var(--c-brand-gold)" }}>Stitched</div>
                    <div className="ds-display ds-grad-text" style={{ fontSize: 27, marginTop: 2 }}>{bestSelf.stitched}</div>
                    <div style={{ fontSize: 10.5, color: "var(--c-text-tertiary)" }}>every section at your proven best</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--c-text-secondary)", lineHeight: 1.65, marginTop: 8 }}>
                  You&apos;re <b>{bestSelf.gap} marks</b> from your own best self — and every mark of that gap is a performance you&apos;ve already delivered once.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SECTIONS ── */}
        <div style={{ marginTop: 34, paddingTop: 26, borderTop: "1px solid var(--c-border-faint)" }}>
          <div style={seclabel}>Sections</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr>
                  {["Section", "Score", "Split", "✓ · ✗ · unopened", "Accuracy", "Time"].map((h) => (
                    <th key={h} style={{ fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600, textAlign: "left", padding: "6px 14px 8px 0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scored.perSection.map((p) => {
                  const secAcc = p.attempted > 0 ? Math.round((p.correct / p.attempted) * 100) : 0;
                  const tSec = sectionTimes.get(p.sec.id) || 0;
                  const totalT = [...sectionTimes.values()].reduce((a, b) => a + b, 0);
                  return (
                    <tr key={p.sec.id}>
                      <td style={tdCell}><b>{shortSectionName(p.title)}</b></td>
                      <td style={tdCell}><b>{Math.max(0, p.score)}</b> <span style={{ color: "var(--c-text-tertiary)" }}>/{p.max}</span></td>
                      <td style={tdCell}>
                        <span style={{ display: "inline-flex", height: 6, width: 96, borderRadius: 999, overflow: "hidden", background: "var(--c-surface-muted, var(--c-bg))", verticalAlign: "middle" }}>
                          <span style={{ width: `${(p.correct / Math.max(1, p.total)) * 100}%`, background: "var(--c-success)" }} />
                          <span style={{ width: `${(p.wrong / Math.max(1, p.total)) * 100}%`, background: "var(--c-danger)" }} />
                        </span>
                      </td>
                      <td style={tdCell}>{p.correct} · <span style={{ color: p.wrong ? "var(--c-danger)" : "inherit" }}>{p.wrong}</span> · {p.total - p.attempted}</td>
                      <td style={tdCell}>{secAcc}%</td>
                      <td style={tdCell}>{totalT > 0 && tSec > 0 ? `${Math.round((tSec / totalT) * 100)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CHAPTERS BEHIND YOUR WRONGS (needs tagged bank) ── */}
        {chapterDamage && (
          <div style={{ marginTop: 34, paddingTop: 26, borderTop: "1px solid var(--c-border-faint)" }}>
            <div style={seclabel}>Chapters that cost you</div>
            {chapterDamage.map((r, i) => (
              <div key={r.topic} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "11px 0", borderTop: i === 0 ? "none" : "1px solid var(--c-border-faint)", flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 200, fontSize: 13.5 }}>
                  <b>{r.topic}</b>
                  <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginLeft: 8 }}>
                    {r.wrong > 0 ? `${r.wrong} wrong of ${r.att}` : ""}
                    {r.wrong > 0 && r.unopened >= 2 ? " · " : ""}
                    {r.unopened >= 2 ? `${r.unopened} never opened` : ""}
                  </span>
                </span>
                <b style={{ color: "var(--c-danger)", fontSize: 13.5, whiteSpace: "nowrap" }}>
                  {r.wrongMarks > 0 ? `−${r.wrongMarks}` : ""}
                  {r.wrongMarks > 0 && r.unopened >= 2 ? " · " : ""}
                  {r.unopened >= 2 ? `${r.unopenedMarks} unclaimed` : ""}
                </b>
                <button onClick={() => router.push("/review")} style={{ ...pillGhost, height: 30, fontSize: 11.5, color: "var(--c-brand-gold)", borderColor: "var(--c-brand-gold)" }}>
                  drill →
                </button>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 8 }}>
              Wrongs and avoided questions traced to their chapter — avoidance is a signal too.
            </div>
          </div>
        )}

        {/* ── ACROSS YOUR MOCKS (play owner, or admin via ?as=) ── */}
        {viewingOthers && adminView && (
          <div style={{ marginTop: 30, fontSize: 12, color: "var(--c-brand-gold)", fontWeight: 600, borderTop: "1px solid var(--c-border-faint)", paddingTop: 14 }}>
            Admin view — rank, batch position and the sections below are {result?.user}&apos;s own journey.
          </div>
        )}
        {gated && (
          <div style={{ marginTop: 30, fontSize: 12, color: "var(--c-text-tertiary)", borderTop: "1px solid var(--c-border-faint)", paddingTop: 14 }}>
            Viewing another student&apos;s attempt — rank, batch comparison and cross-mock views are shown only to the student who took it.
          </div>
        )}
        {!gated && (
        <div style={{ marginTop: 34, paddingTop: 26, borderTop: "1px solid var(--c-border-faint)" }}>
          <div style={seclabel}>Across your mocks</div>
          {effJourney === null ? null : fullMocks.length >= 2 ? (
            <JourneyCard mocks={fullMocks.slice(-6)} />
          ) : (
            <div style={{ ...card, padding: "22px 26px", marginBottom: 14 }}>
              <div style={capStyle}>Score across mocks</div>
              <div style={{ fontSize: 13.5, color: "var(--c-text-secondary)", marginTop: 6 }}>
                Your journey starts with your second mock, one point is not a line.
              </div>
            </div>
          )}

          {(sectionSeries || showTimeCard) && (
            <div className="ana-rail" style={{ display: "grid", gridTemplateColumns: sectionSeries && showTimeCard ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 14 }}>
              {sectionSeries && (
                <div style={{ ...card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, padding: "14px 18px 2px" }}>Sections across mocks</div>
                  <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", padding: "0 18px 6px" }}>
                    section score, last {sectionSeries.count} mocks
                  </div>
                  {sectionSeries.rows.map((r) => (
                    <SparkRow key={r.title} row={r} danger={sectionSeries.weakest && sectionSeries.weakest.title === r.title} />
                  ))}
                  {sectionSeries.weakest && (
                    <div style={tnote}>
                      Weakest, consistently: <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{sectionSeries.weakest.title}</b>, below your own average in {sectionSeries.weakest.belowAvgCount} of {sectionSeries.weakest.mocks} mocks.
                    </div>
                  )}
                </div>
              )}
              {showTimeCard && (
                <div style={{ ...card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, padding: "14px 18px 2px" }}>Where the time goes</div>
                  <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", padding: "0 18px 6px" }}>
                    {suggestedSecPerSection ? "your minutes vs the suggested split (|)" : "your minutes per section, this mock"}
                  </div>
                  <TimeRows
                    perSection={scored.perSection}
                    sectionTimes={sectionTimes}
                    suggestedSec={suggestedSecPerSection}
                  />
                </div>
              )}
            </div>
          )}

          <div className="ana-rail" style={{ display: "grid", gridTemplateColumns: quad && dist ? "1fr 1fr" : "1fr", gap: 14 }}>
            {quad && (
              <div style={{ ...card, overflow: "hidden" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, padding: "14px 18px 2px" }}>Speed × accuracy</div>
                <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", padding: "0 18px 10px" }}>{quad.measured} timed attempts, this mock</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--c-border-faint)" }}>
                  <QuadCell dot="var(--c-success)" h="Quick & right" c={quad.qr} m={`under ${QUICK_SEC}s, correct, your scoring engine.`} />
                  <QuadCell dot="var(--c-danger)" h="Quick & wrong" c={quad.qw} m={`under ${QUICK_SEC}s, wrong, likely impulse picks. This is where negatives live.`} />
                  <QuadCell dot="var(--c-success)" h="Slow & right" c={quad.sr} m={`over ${SLOW_SEC}s, correct, solid but pricey. Worth speed drills.`} />
                  <QuadCell dot="var(--c-danger)" h="Slow & wrong" c={quad.sw} m={`over ${SLOW_SEC}s and still wrong, real concept gaps. Review these first.`} />
                </div>
              </div>
            )}
            {dist && (
              <div style={{ ...card, overflow: "hidden", padding: "14px 18px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Where you landed</div>
                <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>score spread of this mock&apos;s takers · your band in gold</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 84, marginTop: 16 }}>
                  {dist.dist.map((n, i) => {
                    const peak = Math.max(1, ...dist.dist);
                    return (
                      <div key={i} style={{ flex: 1, height: `${Math.max(4, (n / peak) * 100)}%`, borderRadius: "4px 4px 0 0", background: i === dist.myBucket ? "var(--c-stat-grad)" : "var(--c-surface-muted, var(--c-bg))", position: "relative" }}>
                        {i === dist.myBucket && (
                          <span style={{ position: "absolute", top: -17, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 800, color: "var(--c-brand-gold)", letterSpacing: "0.06em", textTransform: "uppercase" }}>you</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--c-text-tertiary)", marginTop: 5 }}>
                  <span>0</span><span>{Math.round(total.maxMarks / 2)}</span><span>{total.maxMarks}</span>
                </div>
              </div>
            )}
          </div>

          {habits.length > 0 && (
            <div style={{ ...card, marginTop: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, padding: "14px 18px 4px" }}>Habits the numbers show</div>
              {habits.map((h2, i) => (
                <HabitRow key={i} habit={h2} first={false} />
              ))}
            </div>
          )}
        </div>
        )}

        {/* ── NEXT 3 MOVES ── */}
        {moves.length > 0 && (
          <div style={{ marginTop: 34, paddingTop: 26, borderTop: "1px solid var(--c-border-faint)" }}>
            <div style={seclabel}>Your next {moves.length === 1 ? "move" : `${moves.length} moves`}</div>
            {moves.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "baseline", padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--c-border-faint)", flexWrap: "wrap" }}>
                <span className="ds-display" style={{ fontSize: 15, color: "var(--c-brand-gold)", fontWeight: 700, width: 18, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 220, fontSize: 14 }}>
                  <b>{m.t}</b>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--c-text-tertiary)", marginTop: 3, lineHeight: 1.55 }}>{m.d}</span>
                </span>
                <button onClick={() => router.push(m.href)} style={{ ...pillGhost, height: 32, fontSize: 12, color: "var(--c-brand-gold)", borderColor: "var(--c-brand-gold)" }}>
                  {m.n} <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      <style jsx global>{`
        @media (max-width: 760px) {
          .ana-rail { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ──

function HeroStat({ k, v, note }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.11em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600 }}>{k}</div>
      <div className="ds-display" style={{ fontSize: 21, marginTop: 3, color: "var(--c-text-primary)" }}>{v}</div>
      {note && (
        <div style={{
          fontSize: 10.5, marginTop: 1,
          color: note.tone === "up" ? "var(--c-success)" : note.tone === "dn" ? "var(--c-danger)" : "var(--c-text-tertiary)",
          fontWeight: note.tone ? 600 : 400,
        }}>
          {note.text}
        </div>
      )}
    </div>
  );
}

function LedgerSeg({ w, bg, fg, label }) {
  if (!(w > 0)) return null;
  return (
    <div style={{ width: `${Math.max(0.5, Math.min(100, w))}%`, background: bg, display: "grid", placeItems: "center", overflow: "hidden" }}>
      {label ? <span style={{ fontSize: 10.5, fontWeight: 700, color: fg, whiteSpace: "nowrap", padding: "0 4px" }}>{label}</span> : null}
    </div>
  );
}

function JourneyCard({ mocks }) {
  const n = mocks.length;
  const last = mocks[n - 1];
  const first = mocks[0];
  const prev = mocks[n - 2];
  const delta = last.score - first.score;
  const title =
    delta > 0 ? `Climbing: ${n} mocks, +${delta} marks`
    : delta < 0 ? `${n} mocks, ${Math.abs(delta)} marks below your first`
    : `Holding steady: ${n} mocks, level with your first`;

  const W = 800, H = 150;
  const xs = mocks.map((_, i) => (n > 1 ? 60 + (i * (W - 120)) / (n - 1) : W / 2));
  const maxY = Math.max(
    1,
    ...mocks.map((m) => Math.max(m.score, m.topperScore ?? 0, m.batchAvg ?? 0))
  );
  const minY = Math.min(0, ...mocks.map((m) => m.score));
  const yOf = (v) => 22 + (1 - (v - minY) / (maxY - minY || 1)) * 106;
  const pathOf = (vals) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xs[i]},${yOf(v)}`).join(" ");

  const topperVals = mocks.map((m) => m.topperScore).filter((v) => v != null);
  const showTopper = topperVals.length === n;
  const batchVals = mocks.map((m) => m.batchAvg).filter((v) => v != null);
  const showBatch = batchVals.length === n;

  const gapNow = showTopper ? last.topperScore - last.score : null;
  const gapPrev = showTopper && prev ? prev.topperScore - prev.score : null;
  const batchDiff = showBatch ? last.score - last.batchAvg : null;

  return (
    <div style={{ ...card, padding: "22px 26px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)", opacity: 0.55, pointerEvents: "none" }} />
      <div style={capStyle}>Score across mocks</div>
      <div className="ds-display" style={{ fontSize: 19, marginBottom: 16, fontWeight: 500 }}>{title}</div>
      <div style={{ position: "relative", height: 150 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
          <line x1="0" y1="128" x2={W} y2="128" stroke="var(--c-border-faint)" strokeWidth="1" />
          <line x1="0" y1="75" x2={W} y2="75" stroke="var(--c-border-faint)" strokeWidth="1" strokeDasharray="3 5" />
          <line x1="0" y1="22" x2={W} y2="22" stroke="var(--c-border-faint)" strokeWidth="1" strokeDasharray="3 5" />
          {showTopper && (
            <path d={pathOf(mocks.map((m) => m.topperScore))} stroke="var(--c-border-soft)" strokeWidth="1.6" fill="none" strokeDasharray="5 5" />
          )}
          {showBatch && (
            <path d={pathOf(mocks.map((m) => m.batchAvg))} stroke="var(--c-border-soft)" strokeWidth="1.6" fill="none" strokeDasharray="2 4" />
          )}
          <defs>
            <linearGradient id="jg1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#FFBE5C" />
              <stop offset="1" stopColor="#E08E15" />
            </linearGradient>
          </defs>
          <path d={pathOf(mocks.map((m) => m.score))} stroke="url(#jg1)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {mocks.map((m, i) => (
            <g key={m.testId}>
              <circle
                cx={xs[i]} cy={yOf(m.score)} r={i === n - 1 ? 6 : 4.5}
                fill="var(--c-brand-gold)"
                stroke={i === n - 1 ? "var(--c-surface)" : "none"}
                strokeWidth={i === n - 1 ? 2.5 : 0}
              />
              <text
                x={xs[i]} y={yOf(m.score) - 12} textAnchor="middle"
                fontSize={i === n - 1 ? 12 : 11} fontWeight="600"
                fill="var(--c-text-primary)" fontFamily="inherit"
              >
                {Math.max(0, m.score)}
              </text>
            </g>
          ))}
        </svg>
        {mocks.map((m, i) => (
          <span
            key={`lbl-${m.testId}`}
            style={{ position: "absolute", bottom: -4, left: `${(xs[i] / W) * 100}%`, transform: "translateX(-50%)", fontSize: 10, color: "var(--c-text-tertiary)", whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {m.title}
          </span>
        ))}
      </div>
      {(gapNow != null || batchDiff != null) && (
        <div style={{ display: "flex", gap: 20, marginTop: 20, fontSize: 12, color: "var(--c-text-secondary)", flexWrap: "wrap" }}>
          {gapNow != null && (
            <span>
              — — Topper&apos;s trail · gap now <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>{Math.max(0, gapNow)} marks</b>
              {gapPrev != null ? `, was ${Math.max(0, gapPrev)}` : ""}
            </span>
          )}
          {batchDiff != null && (
            <span>
              · · · Batch average · you are{" "}
              <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>
                {Math.abs(batchDiff)} mark{Math.abs(batchDiff) === 1 ? "" : "s"} {batchDiff >= 0 ? "above" : "below"}
              </b>{" "}
              it
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SparkRow({ row, danger }) {
  const stroke = danger ? "var(--c-danger)" : "var(--c-brand-gold)";
  const pts = row.values.map((v, i) => ({ v, i })).filter((p) => p.v != null);
  const n = row.values.length;
  const xOf = (i) => (n > 1 ? 10 + (i * 180) / (n - 1) : 100);
  const maxV = Math.max(1, ...pts.map((p) => p.v));
  const minV = Math.min(0, ...pts.map((p) => p.v));
  const yOf = (v) => 26 - ((v - minV) / (maxV - minV || 1)) * 20;
  const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${xOf(p.i)},${yOf(p.v)}`).join(" ");
  const lastPt = pts[pts.length - 1];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: "1px solid var(--c-border-faint)" }}>
      <span style={{ fontSize: 12, width: 96, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</span>
      <svg viewBox="0 0 200 30" preserveAspectRatio="none" style={{ flex: 1, height: 30, display: "block" }}>
        {pts.length > 1 && <path d={d} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />}
        {lastPt && <circle cx={xOf(lastPt.i)} cy={yOf(lastPt.v)} r="3" fill={stroke} />}
      </svg>
      <span style={{ fontSize: 11.5, width: 96, textAlign: "right", flexShrink: 0, color: "var(--c-text-tertiary)" }}>
        <b className="ds-display" style={{ fontSize: 14, color: "var(--c-text-primary)", fontWeight: 600 }}>{row.current != null ? Math.max(0, row.current) : "—"}</b>
        {row.avg != null ? <> · avg {Math.max(0, row.avg)}</> : null}
      </span>
    </div>
  );
}

function TimeRows({ perSection, sectionTimes, suggestedSec }) {
  const times = perSection.map((p) => sectionTimes.get(p.sec.id) || 0);
  const scale = Math.max(1, ...times, suggestedSec || 0);
  const fmtM = (s) => `${Math.round(s / 60)}m`;
  let short = null;
  if (suggestedSec) {
    perSection.forEach((p, i) => {
      const deficit = suggestedSec - times[i];
      if (times[i] > 0 && deficit > 120 && (!short || deficit > short.deficit)) {
        short = { title: shortSectionName(p.title), deficit };
      }
    });
  }
  return (
    <>
      {perSection.map((p, i) => (
        <div key={p.sec.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: "1px solid var(--c-border-faint)" }}>
          <span style={{ fontSize: 12, width: 92, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortSectionName(p.title)}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--c-surface-muted, var(--c-bg))", overflow: "visible", position: "relative" }}>
            <i style={{ display: "block", height: "100%", borderRadius: 999, background: "var(--c-info, #2563C4)", width: `${Math.min(100, (times[i] / scale) * 100)}%` }} />
            {suggestedSec && (
              <span style={{ position: "absolute", top: -3, bottom: -3, width: 2, background: "var(--c-text-tertiary)", borderRadius: 2, left: `${Math.min(100, (suggestedSec / scale) * 100)}%` }} />
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--c-text-tertiary)", width: 96, textAlign: "right", flexShrink: 0 }}>
            <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{fmtM(times[i])}</b>
            {suggestedSec ? <> · sugg. {fmtM(suggestedSec)}</> : null}
          </span>
        </div>
      ))}
      {short && (
        <div style={tnote}>
          <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{short.title}</b> gets {Math.round(short.deficit / 60)} minutes less than the suggested split.
        </div>
      )}
    </>
  );
}

function QuadCell({ dot, h, c, m }) {
  return (
    <div style={{ background: "var(--c-surface)", padding: "15px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}>
        <i style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: dot }} />
        {h}
      </div>
      <div className="ds-display" style={{ fontSize: 21 }}>{c}</div>
      <div style={{ fontSize: 10.5, color: "var(--c-text-tertiary)", lineHeight: 1.45, marginTop: 2 }}>{m}</div>
    </div>
  );
}

// Inline SVG habit icons (stroke currentColor — no emoji anywhere).
function HabitIcon({ name }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "clock") return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
  if (name === "gift") return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><path d="M12 3v13M6 10l6 6 6-6" /><path d="M4 21h16" /></svg>;
  if (name === "zigzag") return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
  return <svg width="14" height="14" viewBox="0 0 24 24" {...p}><path d="M4 17l5-5 4 3 7-8" /></svg>;
}

function HabitRow({ habit }) {
  const tones = {
    danger: { bg: "var(--c-danger-soft, #FDE4D8)", color: "var(--c-danger)" },
    gold: { bg: "var(--c-brand-gold-tint, rgba(214,158,46,0.14))", color: "var(--c-brand-gold)" },
    success: { bg: "var(--c-success-soft, #D6F3E3)", color: "var(--c-success)" },
  };
  const t = tones[habit.tone] || tones.gold;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 20px", borderTop: "1px solid var(--c-border-faint)" }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1, background: t.bg, color: t.color }}>
        <HabitIcon name={habit.icon} />
      </span>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--c-text-secondary)" }}>{habit.text}</div>
    </div>
  );
}

// ── shared styles ──
const card = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 16,
  boxShadow: "var(--c-shadow-xs)",
};
const capStyle = { fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--c-brand-gold)", fontWeight: 600, marginBottom: 4 };
const seclabel = { fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--c-text-tertiary)", fontWeight: 600, margin: "0 2px 10px" };
const tnote = { padding: "11px 18px", borderTop: "1px solid var(--c-border-faint)", background: "var(--c-surface-muted, var(--c-bg))", fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: "auto" };
const tdCell = { padding: "10px 14px 10px 0", borderTop: "1px solid var(--c-border-faint)", verticalAlign: "middle" };
const pillGhost = { height: 36, padding: "0 14px", borderRadius: 999, background: "transparent", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.18s ease" };
const pillPrimary = { ...pillGhost, background: "var(--c-brand-primary)", color: "#fff", border: "1px solid transparent" };

export async function getServerSideProps(context) {
  const { data, error } = await serversupabase
    .from("mock_plays")
    .select("*,test_id(*)")
    .eq("uid", context.query.uid);
  if (data?.length === 0 || error) return { notFound: true };
  return { props: { result: data[0] } };
}
