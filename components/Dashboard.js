import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useNMNContext } from "./NMNContext";
import StudentAttendance from "./StudentAttendance";
import DemoComponent from "./DemoComponent";
import { toast } from "react-hot-toast";
import Loader from "./Loader";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { vaultState, DAILY_CAP } from "./MistakeVault";
import { buildPlan, shortName } from "./AdaptivePlan";
import { levelFromXp } from "./DSBChallenge";
import PortalTour, { useFirstVisitTour } from "./PortalTour";
import { parseISO, isAfter, format, startOfWeek } from "date-fns";

/**
 * Today — approved D2 dashboard (preview-today-dashboard.html).
 *
 * Layout: greeting row (serif hero + day meta pills) → 4 KPI cards
 * (streak w/ week dots, accuracy w/ delta, tests w/ spark, rank) →
 * main grid 1.55fr/1fr (plan card "Aaj ke liye socha hai" + right
 * column: classes / mock window) → 3 continue tiles.
 *
 * Plan priority (owner-corrected): resume unfinished test → vault
 * redos → chapter attack → daily quiz → PYQ filler. A live mock is
 * NEVER a numbered step — it renders only as the mock-window card.
 *
 * All data fetching preserved from the earlier D2 build. Grand-tour
 * anchors data-tour="stats" / "missions" preserved.
 */

// TODO owner-confirm: IPMAT 2027 exam date (used for the "IPMAT in
// N din" pill; the pill hides itself once the date is past).
const EXAM_DATE = "2027-05-01";

// ── Class-time helpers (same parsing rules as TodaysClasses.js) ──
function parseClassTime(timeStr, now) {
  if (!timeStr) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const str = String(timeStr).replace(/([+-]\d{2})(?!:)/, "$1:00");
  let [h, m, s] = str.split(":");
  h = parseInt(h) || 0;
  m = parseInt(m) || 0;
  s = parseInt(s) || 0;
  const d = new Date(today);
  d.setHours(h, m, s, 0);
  return d;
}

function classStatus(item, now) {
  const start = parseClassTime(item?.start_time, now);
  const end = parseClassTime(item?.end_time, now);
  if (!start || !end || isNaN(start) || isNaN(end))
    return { state: "invalid", minsToStart: null };
  if (now < start)
    return { state: "upcoming", minsToStart: Math.round((start - now) / 60000) };
  if (now > end) return { state: "expired", minsToStart: null };
  return { state: "ongoing", minsToStart: 0 };
}

function fmtClassTime(timeString) {
  try {
    const [hours, minutes] = String(timeString).split(":");
    const d = new Date();
    d.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0, 0, 0);
    const txt = d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const m = txt.match(/^([\d:.]+)\s*(am|pm)?\.?$/i);
    if (m) return { hm: m[1], ap: (m[2] || "").toLowerCase() };
    return { hm: txt, ap: "" };
  } catch {
    return { hm: String(timeString || ""), ap: "" };
  }
}

// Small stroked icon wrapper (paths copied from the approved preview).
function Ic({ size = 19, children }) {
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

export default function Dashboard({ userData }) {
  // ── State (preserved) ──
  const [isNull, setIsNull] = useState(true);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [results, setResults] = useState([]);
  const [nextMock, setNextMock] = useState(null);
  const [nowTick, setNowTick] = useState(() => new Date());
  const [plays, setPlays] = useState([]);
  const [conceptPlays, setConceptPlays] = useState([]);
  const [dailySubs, setDailySubs] = useState([]);
  const [weeklyRank, setWeeklyRank] = useState(null);
  const [today3, setToday3] = useState(null); // {quizDone, redosLeft, redosDone, attack:{name,acc,done}, attackCh}
  const [cardBits, setCardBits] = useState(null); // {resume, resumeUuid, pyqDone, pyqTotal}
  const [xpBits, setXpBits] = useState(null); // {total_xp} from get_my_xp — DSB tile
  const [admitStart, setAdmitStart] = useState(null); // batch_admits.effective_start_date — Day N pill
  const [ringOn, setRingOn] = useState(false); // animates the plan ring after mount

  const {
    setCTXSlug,
    sk,
    setSK,
    userCourses,
    isDemo,
    sidebarCollapsed,
    setSidebarCollapsed,
    studentHasBatch,
  } = useNMNContext();

  // ── Grand tour (first login + replay via profile menu) ──
  const [tourRun, setTourRun] = useFirstVisitTour("tour_grand_v1");

  // The tour spotlights sidebar items — make sure it's expanded.
  useEffect(() => {
    if (tourRun && sidebarCollapsed) setSidebarCollapsed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourRun]);

  // Replay: profile menu dispatches 'ipm-portal-tour' after routing here.
  useEffect(() => {
    const openTour = () => {
      setSidebarCollapsed(false);
      setTourRun(true);
    };
    window.addEventListener("ipm-portal-tour", openTour);
    return () => window.removeEventListener("ipm-portal-tour", openTour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Chapter deep link — same entry RPC AdaptivePlan uses ──
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const openChapter = async (ch) => {
    if (!ch?.chapter_id || openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    const { data } = await supabase.rpc("get_chapter_entry", {
      p_email: userData?.email || "",
      p_chapter: ch.chapter_id,
    });
    openingRef.current = false;
    setOpening(false);
    if (data?.length) router.push(`/test/${data[0].test_uuid}`);
  };

  // ── Data fetching (preserved) ──
  async function getClasses() {
    const enrolledCourseIds =
      userCourses?.map((enrollment) => enrollment.course?.id).filter(Boolean) ||
      [];

    let enrolledClasses = [];
    let demoClasses = [];

    if (enrolledCourseIds.length > 0) {
      const { data, error } = await supabase
        .from("classes")
        .select("*, batches!inner(course_id,demo)")
        .in("batches.course_id", enrolledCourseIds)
        .eq("batches.is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(10);
      if (error) {
        toast.error("Error Loading Classes");
        return;
      }
      enrolledClasses = data ?? [];
    }

    const { data: demoData, error: demoError } = await supabase
      .from("classes")
      .select("*, batches!inner(course_id,demo)")
      .eq("batches.demo", true)
      .eq("batches.is_deleted", false)
      .order("created_at", { ascending: true });
    if (demoError) {
      toast.error("Error Loading Demo Classes");
      return;
    }
    demoClasses = demoData ?? [];

    const merged = [...enrolledClasses, ...demoClasses].filter(Boolean);
    const deduped = Array.from(
      new Map(merged.map((c) => [c?.id, c])).values()
    );
    deduped.sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
    setClasses(deduped);
  }

  async function checkAdminStatus() {
    try {
      const response = await axios.post(
        "/api/isAdmin",
        {},
        { headers: await getAuthHeaders() },
      );
      if (response.data.success) setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  }

  async function getResults() {
    const { data, error } = await supabase
      .from("results")
      .select("*,test(course(title,id),id)")
      .match({ email: userData?.email, status: "finished" });
    if (error) {
      console.error("Error loading results:", error);
      toast.error("Error loading results");
      setIsNull(true);
      setLoading(false);
      return;
    }
    if (data && data?.length > 0) {
      setResults(data);
      setIsNull(false);
      setLoading(false);
    } else {
      setIsNull(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    getResults();
    if (userData?.email) checkAdminStatus();
  }, [userData?.email]);

  useEffect(() => {
    getClasses();
  }, []);

  // ── Next upcoming full mock (same source/filters as MockTests) ──
  useEffect(() => {
    async function getNextMock() {
      const { data } = await supabase
        .from("mock_test")
        .select("title, start_time, end_time, config")
        .order("start_time", { ascending: true });
      if (!data) return;
      const now = new Date();
      const candidates = data
        .filter(
          (t) =>
            t.start_time &&
            !t.config?.hidden &&
            (!t.config?.generatorType || t.config?.generatorType === "fullmock"),
        )
        .map((t) => ({
          ...t,
          startsAt: parseISO(t.start_time),
          endsAt: t.end_time ? parseISO(t.end_time) : null,
        }));
      // A mock that is open right now beats a future one.
      const live = candidates
        .filter((t) => !isAfter(t.startsAt, now) && t.endsAt && isAfter(t.endsAt, now))
        .sort((a, b) => a.endsAt - b.endsAt);
      if (live[0]) {
        setNextMock({ ...live[0], mode: "live" });
        return;
      }
      const upcoming = candidates
        .filter((t) => isAfter(t.startsAt, now))
        .sort((a, b) => a.startsAt - b.startsAt);
      setNextMock(upcoming[0] ? { ...upcoming[0], mode: "upcoming" } : null);
    }
    getNextMock();
    const tick = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  // ── Dashboard stats: mock attempts + weekly all-India rank ──
  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .from("mock_plays")
      .select("created_at, score")
      .eq("user", userData.email)
      .then(({ data }) => setPlays(data || []));
    supabase
      .from("plays")
      .select("created_at, report")
      .eq("user", userData.email)
      .then(({ data }) => setConceptPlays(data || []));
    // Daily Learn quiz submissions — RLS scopes rows to the signed-in student
    supabase
      .from("daily_rc_submissions")
      .select("created_at")
      .then(({ data }) => setDailySubs(data || []));
    supabase
      .rpc("get_weekly_ipmat_rank", { p_email: userData.email })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length) {
          setWeeklyRank({ ...data[0], scope: "week" });
          return;
        }
        // No mock this week — fall back to the student's all-time rank.
        supabase
          .rpc("get_alltime_ipmat_rank", { p_email: userData.email })
          .then(({ data: d2, error: e2 }) => {
            if (!e2 && Array.isArray(d2) && d2.length)
              setWeeklyRank({ ...d2[0], scope: "alltime" });
          });
      });
  }, [userData?.email]);

  // ── Aaj Ka Plan inputs: quiz done? · redos due? · weakest chapter ──
  // Same engines as My Plan and the Mistake Vault, so this page
  // never disagrees with either.
  useEffect(() => {
    if (!userData?.email) return;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const iso = startOfToday.toISOString();
    Promise.all([
      supabase.from("trainer_runs").select("id", { count: "exact", head: true }).eq("user", userData.email).eq("trainer", "daily-quiz").gte("created_at", iso),
      supabase.from("mistake_redos").select("id", { count: "exact", head: true }).eq("user", userData.email).gte("created_at", iso),
      supabase.rpc("get_my_mistakes", { p_email: userData.email }),
      supabase.rpc("get_my_own_mistakes", { p_email: userData.email }),
      supabase.rpc("get_my_chapter_stats", { p_email: userData.email }),
    ]).then(([quizRuns, redoRuns, mine, own, chapters]) => {
      const now = new Date();
      const all = [
        ...(Array.isArray(mine.data) ? mine.data : []),
        ...(Array.isArray(own.data) ? own.data : []).map((m) => ({ streak: m.streak, last_wrong_at: m.created_at, last_redo_at: m.last_redo_at })),
      ];
      const due = all.filter((it) => {
        const st = vaultState(it, now);
        return !st.mastered && st.dueNow;
      }).length;
      const budget = Math.max(0, DAILY_CAP - (redoRuns.count || 0));
      const plan = buildPlan(Array.isArray(chapters.data) ? chapters.data : []);
      const t2 = plan.task2;
      setToday3({
        quizDone: (quizRuns.count || 0) > 0,
        redosLeft: Math.min(due, budget),
        redosDone: (redoRuns.count || 0) > 0 && Math.min(due, budget) === 0,
        attack: t2 ? { name: t2.chapter, acc: t2.acc, done: Number(t2.tests_today || 0) > 0 } : null,
        attackCh: t2 || null,
      });
    });
  }, [userData?.email]);

  // ── Continue strip data: resume target + PYQ progress ──
  useEffect(() => {
    if (!userData?.email) return;
    Promise.all([
      supabase.from("plays").select("test_uuid, created_at").eq("user", userData.email).order("created_at", { ascending: false }).limit(1),
      supabase.from("pyq_attempts").select("question_id").eq("user", userData.email).limit(3000),
      supabase.from("pyq_questions").select("id", { count: "exact", head: true }),
    ]).then(async ([lastPlay, att, tot]) => {
      let resume = null;
      let resumeUuid = null;
      const uuid = lastPlay.data?.[0]?.test_uuid;
      if (uuid) {
        const { data: lv } = await supabase.from("levels").select("title").eq("uuid", uuid).maybeSingle();
        if (lv?.title) {
          resume = lv.title;
          resumeUuid = uuid;
        }
      }
      const pyqDone = new Set((att.data || []).map((r) => r.question_id)).size;
      setCardBits({ resume, resumeUuid, pyqDone, pyqTotal: tot.count || 0 });
    });
  }, [userData?.email]);

  // ── DSB tile: level + XP (same RPC the XP header chip uses) ──
  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .rpc("get_my_xp", { p_email: userData.email })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length) setXpBits(data[0]);
      });
  }, [userData?.email]);

  // ── Day N pill: earliest batch_admits.effective_start_date ──
  useEffect(() => {
    if (!userData?.email) return;
    supabase
      .from("batch_admits")
      .select("effective_start_date")
      .ilike("email", userData.email)
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) return;
        const dates = data
          .map((r) => r?.effective_start_date)
          .filter(Boolean)
          .sort();
        if (dates[0]) setAdmitStart(dates[0]);
      });
  }, [userData?.email]);

  // Kick the plan ring's dashoffset transition one frame after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setRingOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Computed stats: streak, weekly counts, accuracy trend ──
  const dashStats = useMemo(() => {
    const dayKey = (d) => {
      const t = new Date(d);
      return t.getFullYear() * 10000 + t.getMonth() * 100 + t.getDate();
    };
    const stamps = [
      ...(results || []).map((r) => r.created_at),
      ...(plays || []).map((pl) => pl.created_at),
      ...(conceptPlays || []).map((cp) => cp.created_at),
      ...(dailySubs || []).map((ds) => ds.created_at),
    ].filter(Boolean);
    const daySet = new Set(stamps.map(dayKey));

    // current streak — anchored on today, or yesterday if today has no activity yet
    let current = 0;
    const probe = new Date();
    if (!daySet.has(dayKey(probe))) probe.setDate(probe.getDate() - 1);
    while (daySet.has(dayKey(probe))) {
      current++;
      probe.setDate(probe.getDate() - 1);
    }

    // best streak ever
    const sortedDays = [...new Set(stamps.map((d) => {
      const t = new Date(d);
      return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    }))].sort((x, y) => x - y);
    let best = 0, run = 0, prev = null;
    for (const t of sortedDays) {
      run = prev != null && t - prev === 86400000 ? run + 1 : 1;
      if (run > best) best = run;
      prev = t;
    }

    // this week (Monday start)
    const wsDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const wsDay = new Date(wsDate.getFullYear(), wsDate.getMonth(), wsDate.getDate());
    const ws = wsDay.getTime();
    const weekMocks = (plays || []).filter(
      (pl) => pl.created_at && new Date(pl.created_at).getTime() >= ws,
    ).length;
    const weekTests =
      (results || []).filter(
        (r) => r.created_at && new Date(r.created_at).getTime() >= ws,
      ).length +
      (conceptPlays || []).filter(
        (cp) => cp.created_at && new Date(cp.created_at).getTime() >= ws,
      ).length;

    // week dots (M..S, Monday start) from the same activity daySet the
    // streak uses — a dot lights when that day had ANY activity.
    const todayKey = dayKey(new Date());
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(wsDay);
      d.setDate(wsDay.getDate() + i);
      const k = dayKey(d);
      weekDays.push({ label: "MTWTFSS"[i], on: daySet.has(k), today: k === todayKey });
    }
    // spark: tests taken per weekday this week
    const spark = [0, 0, 0, 0, 0, 0, 0];
    [...(results || []), ...(plays || []), ...(conceptPlays || [])].forEach((r) => {
      if (!r?.created_at) return;
      const t = new Date(r.created_at);
      const idx = Math.floor(
        (new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - ws) / 86400000,
      );
      if (idx >= 0 && idx <= 6) spark[idx]++;
    });
    const nowD = new Date();
    const todayIdx = Math.min(6, Math.max(0, Math.floor(
      (new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate()).getTime() - ws) / 86400000,
    )));

    // accuracy — last 5 completed tests with a report, trend vs previous 5
    const withReport = [...(results || []), ...(conceptPlays || [])]
      .filter((r) => Array.isArray(r.report) && r.report.length)
      .sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
    const acc = (rs) => {
      let c = 0, att = 0;
      rs.forEach((r) =>
        r.report.forEach((it) => {
          if (it?.isCorrect === true) { c++; att++; }
          else if (it?.isCorrect === false) { att++; }
        }),
      );
      return att > 0 ? Math.round((c / att) * 100) : null;
    };
    const accNow = acc(withReport.slice(0, 5));
    const accPrev = acc(withReport.slice(5, 10));
    return {
      streak: current,
      bestStreak: Math.max(best, current),
      weekMocks,
      weekTests,
      weekDays,
      spark,
      todayIdx,
      accNow,
      accDelta: accNow != null && accPrev != null ? accNow - accPrev : null,
      accCount: Math.min(withReport.length, 5),
    };
  }, [results, plays, conceptPlays, dailySubs]);

  // ── Derived display values ──
  const fullName = userData?.user_metadata?.full_name || "there";
  const firstName = fullName.split(" ")[0];
  const classCount = (classes || []).length;
  const testCount = results?.length || 0;

  // Fallback subtitle while plan inputs load.
  let subtitle;
  if (classCount > 0 && testCount > 0) {
    subtitle = `${classCount} ${
      classCount === 1 ? "class" : "classes"
    } today and ${testCount === 1 ? "a test" : `${testCount} tests`} so far. Let's keep going.`;
  } else if (classCount > 0) {
    subtitle = `${classCount} ${
      classCount === 1 ? "class" : "classes"
    } today. Let's make it count.`;
  } else if (testCount > 0) {
    subtitle = "No classes today — perfect time to revisit a mock.";
  } else {
    subtitle = "Ready when you are.";
  }

  // Day N: earliest of batch_admits.effective_start_date, first
  // enrollment created_at (already in context), first recorded
  // activity. Nothing reliable → hide the pill.
  const dayN = (() => {
    const cands = [];
    if (admitStart) {
      const t = new Date(admitStart).getTime();
      if (!isNaN(t)) cands.push(t);
    }
    (userCourses || []).forEach((e) => {
      if (e?.created_at) {
        const t = new Date(e.created_at).getTime();
        if (!isNaN(t)) cands.push(t);
      }
    });
    [...(results || []), ...(plays || []), ...(conceptPlays || []), ...(dailySubs || [])].forEach((r) => {
      if (r?.created_at) {
        const t = new Date(r.created_at).getTime();
        if (!isNaN(t)) cands.push(t);
      }
    });
    if (!cands.length) return null;
    const d = Math.floor((Date.now() - Math.min(...cands)) / 86400000) + 1;
    return d >= 1 ? d : null;
  })();
  const examDays = Math.ceil((new Date(EXAM_DATE).getTime() - Date.now()) / 86400000);

  // ── Plan steps — owner-corrected priority ──
  // resume unfinished → redos → chapter attack → daily quiz → PYQ.
  // Live mock is NOT a step (mock-window card only).
  const planSteps = (() => {
    if (!today3) return null; // inputs still loading
    const steps = [];
    if (cardBits?.resume) {
      steps.push({
        id: "resume",
        done: false,
        title: `${cardBits.resume} poora karo`,
        why: "adhura chhoda tha — wahin se aage badho",
        cta: "Continue",
        go: () => {
          if (cardBits.resumeUuid) router.push(`/test/${cardBits.resumeUuid}`);
          else {
            setCTXSlug("mocks");
            setSK(new Set(["2"]));
          }
        },
      });
    }
    if (today3.redosLeft > 0 || today3.redosDone) {
      steps.push({
        id: "redos",
        done: today3.redosLeft === 0,
        title:
          today3.redosLeft > 0
            ? `${today3.redosLeft} ${today3.redosLeft === 1 ? "redo" : "redos"} — ~${Math.max(1, Math.round(today3.redosLeft * 0.75))} min`
            : "Mistake redos",
        why: "roz thoda thoda, backlog khud saaf hota hai",
        cta: "Start",
        go: () => {
          setCTXSlug("mistakevault");
          setSK(new Set(["2"]));
        },
      });
    }
    if (today3.attack) {
      steps.push({
        id: "attack",
        done: today3.attack.done,
        title: `${shortName(today3.attack.name)} — ek chhota test?`,
        why:
          today3.attack.acc != null
            ? `${today3.attack.acc}% accuracy — thoda kamzor lag raha hai`
            : "naya chapter — plan yahin se mapping shuru karega",
        cta: "Dekho",
        busy: opening,
        go: () => openChapter(today3.attackCh),
      });
    }
    steps.push({
      id: "quiz",
      done: today3.quizDone,
      title: "Daily quiz",
      why: "same 10 questions poore India ke liye — streak fuel",
      cta: "Start",
      go: () => setCTXSlug("dsbchallenge"),
    });
    if (cardBits?.pyqTotal > 0 && cardBits.pyqDone > 0 && cardBits.pyqDone < cardBits.pyqTotal) {
      steps.push({
        id: "pyq",
        done: false,
        title: `PYQs — ${cardBits.pyqDone}/${cardBits.pyqTotal}`,
        why: "asli exam ke questions — agla wait kar raha hai",
        cta: "Continue",
        go: () => {
          setCTXSlug("pyqyear");
          setSK(new Set(["6"]));
        },
      });
    }
    return steps.slice(0, 4);
  })();
  const planDoneCount = planSteps ? planSteps.filter((s) => s.done).length : 0;
  const allPlanDone = !!planSteps && planSteps.length > 0 && planSteps.every((s) => s.done);
  const firstUndoneId = planSteps ? planSteps.find((s) => !s.done)?.id : null;
  const RING_C = 141.4; // 2πr, r=22.5
  const ringOffset =
    planSteps && planSteps.length > 0 && ringOn
      ? RING_C * (1 - planDoneCount / planSteps.length)
      : RING_C;
  const dateLine = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  // Greeting one-liner — suggestion tone, gold deep links.
  const statusLine = (() => {
    if (!today3) return subtitle;
    const linky = { color: "var(--c-brand-gold)", fontWeight: 600, cursor: "pointer" };
    const classBit =
      classCount > 0 ? `Aaj ${classCount} ${classCount === 1 ? "class hai" : "classes hain"}` : null;
    const allDoneGreet =
      today3.quizDone && today3.redosLeft === 0 && (!today3.attack || today3.attack.done);
    if (allDoneGreet && (today3.quizDone || today3.attack)) {
      return (
        <>
          <span style={{ color: "var(--c-success)", fontWeight: 600 }}>Aaj ka kaam done ✓</span>
          {classBit ? ` · ${classBit}` : ""} — kal fresh plan.
        </>
      );
    }
    return (
      <>
        {classBit ? `${classBit} · ` : ""}
        {today3.redosLeft > 0 ? (
          <>
            <span style={linky} onClick={() => setCTXSlug("mistakevault")}>
              {today3.redosLeft} {today3.redosLeft === 1 ? "redo" : "redos"} due
            </span>
            {" · "}
          </>
        ) : (
          ""
        )}
        {today3.attack && !today3.attack.done
          ? `${shortName(today3.attack.name)} thoda dhyaan maang raha hai`
          : "aaj ka plan ready hai"}
      </>
    );
  })();

  // Classes card: live indicator when a class is ongoing or <30 min out.
  const liveInfo = (() => {
    let ongoing = null;
    let soon = null;
    (classes || []).forEach((c) => {
      const st = classStatus(c, nowTick);
      if (st.state === "ongoing" && !ongoing) ongoing = c;
      if (st.state === "upcoming" && st.minsToStart != null && st.minsToStart <= 30 && !soon)
        soon = st.minsToStart;
    });
    if (ongoing) return "live now";
    if (soon != null) return `live in ${soon} min`;
    return null;
  })();

  const showClasses = studentHasBatch !== false; // null = loading → render as batch
  const hasRight = showClasses || !!nextMock;
  const dsbLvl = xpBits ? levelFromXp(xpBits.total_xp || 0) : null;

  const capStyle = {
    fontSize: 10.5,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    color: "var(--c-text-tertiary)",
    fontWeight: 600,
  };
  const pillStyle = {
    border: "1px solid var(--c-border-soft)",
    borderRadius: 999,
    padding: "3px 10px",
    color: "var(--c-text-secondary)",
    whiteSpace: "nowrap",
  };
  const cardStyle = {
    background: "var(--c-surface)",
    borderColor: "var(--c-border-faint)",
    boxShadow: "var(--c-shadow-xs)",
    flexShrink: 0,
  };

  // Grand tour steps — Hinglish copy approved in the interactive preview.
  const GRAND_STEPS = [
    {
      target: "[data-tour='stats']",
      title: "Tumhara scoreboard",
      desc: "Streak, tests, accuracy, all-India rank — ye numbers tumhare kaam se bharte hain. Abhi khali hain, ek hafte mein bolne lagenge.",
    },
    {
      target: "[data-tour='nav-myplan']",
      title: "Aaj Ka Plan — roz yahan se shuru",
      desc: "Portal khud batata hai aaj kya karna hai: kaunsa chapter, kitne redos, kaunsa mission. Sochna nahi padta.",
    },
    {
      target: "[data-tour='nav-tests']",
      title: "Tests — concept se full mock tak",
      desc: "Har topic ke Easy/Moderate/Difficult levels. Jo bhi galat hoga, portal yaad rakhega…",
    },
    {
      target: "[data-tour='nav-tests']",
      title: "…Mistake Vault mein",
      desc: "Har galat question yahan collect hota hai aur sahi time pe wapas aata hai — 3, 7, 21 din. Teen baar sahi = mastered forever.",
    },
    {
      target: "[data-tour='nav-dsb']",
      title: "DSB Challenge — XP aur arena",
      desc: "Daily missions, skill trainers, aur all-India leaderboard. Padhai ko game banao — har rep XP deta hai.",
    },
    {
      target: "[data-tour='missions']",
      title: "Ab khud karo — Daily Quiz",
      desc: "Tour khatam. Ye raha aaj ka pehla kaam: 10 questions, saare India ke students ke wahi 10.",
      doit: "last step: yahan click karke quiz START karna hai — padhna nahi, karna",
      nextLabel: "Start Daily Quiz →",
    },
  ];

  if (loading) {
    return (
      <div
        className="w-full h-screen flex flex-col justify-center items-center"
        style={{ background: "var(--c-bg)" }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <div
      className="td-ambient w-full flex flex-col overflow-y-auto pr-0 md:pr-4"
      style={{ color: "var(--c-text-primary)", textAlign: "left" }}
    >
      {/* ── Greeting row ─────────────────────────────────────── */}
      <header className="td-r1 mt-10 mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1
            className="ds-display"
            style={{
              fontSize: "clamp(27px, 3.8vw, 34px)",
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: "-0.005em",
              color: "var(--c-text-primary)",
            }}
          >
            Welcome back, <em className="ds-accent ds-grad-text">{firstName}.</em>
          </h1>
          <p style={{ fontSize: 13, color: "var(--c-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
            {statusLine}
          </p>
        </div>
        <div className="hidden sm:block text-right" style={{ flexShrink: 0 }}>
          <div className="ds-display" style={{ fontSize: 15, fontWeight: 500 }}>
            {dateLine}
          </div>
          {(dayN != null || examDays > 0) && (
            <div
              className="flex items-center justify-end gap-2"
              style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 6 }}
            >
              {dayN != null && (
                <span style={pillStyle}>
                  Day <b style={{ color: "var(--c-brand-gold)", fontWeight: 600 }}>{dayN}</b>
                </span>
              )}
              {examDays > 0 && (
                <span style={pillStyle} title="Exam date abhi official nahi hui — tentative estimate">
                  IPMAT in ~<b style={{ color: "var(--c-brand-gold)", fontWeight: 600 }}>{examDays}</b> din
                  <span style={{ color: "var(--c-text-tertiary)", marginLeft: 4 }}>· tentative</span>
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── KPI row ──────────────────────────────────────────── */}
      <div className="td-r2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-4" data-tour="stats">
        {/* Streak */}
        <Kpi
          tint="var(--c-brand-gold-tint)"
          color="var(--c-brand-gold)"
          icon={
            <Ic>
              <path d="M12 2c1 4-4 5-4 10a4 4 0 0 0 8 0c0-2-1-3-1-3s3 1 3 5a6 6 0 0 1-12 0C6 8 11 7 12 2z" />
            </Ic>
          }
          label="Streak"
        >
          <div className="ds-stat-value" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 1, width: "max-content" }}>
            {dashStats.streak > 0 ? dashStats.streak : "—"}
            {dashStats.streak > 0 && (
              <span style={{ fontSize: 13, WebkitTextFillColor: "var(--c-text-tertiary)" }}> din</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
            {dashStats.weekDays.map((d, i) => (
              <span
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 8.5, color: "var(--c-text-tertiary)" }}
              >
                <i
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: d.on ? "var(--c-brand-gold)" : "var(--c-border-soft)",
                    boxShadow: d.on ? "0 0 0 3px var(--c-brand-gold-tint)" : "none",
                  }}
                />
                {d.label}
              </span>
            ))}
          </div>
        </Kpi>

        {/* Accuracy */}
        <Kpi
          tint="var(--c-success-soft)"
          color="var(--c-success)"
          icon={
            <Ic>
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="4.5" />
              <circle cx="12" cy="12" r="0.5" fill="currentColor" />
            </Ic>
          }
          label="Accuracy"
        >
          <div className="ds-stat-value" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 1, width: "max-content" }}>
            {dashStats.accNow != null ? `${dashStats.accNow}%` : "—"}
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 2,
              color:
                dashStats.accNow == null
                  ? "var(--c-text-tertiary)"
                  : dashStats.accDelta != null && dashStats.accDelta < 0
                  ? "var(--c-danger)"
                  : "var(--c-success)",
            }}
          >
            {dashStats.accNow == null
              ? "pehla test unlock karega"
              : dashStats.accDelta != null
              ? `${dashStats.accDelta >= 0 ? "▲" : "▼"} ${Math.abs(dashStats.accDelta)}% · last 5 tests`
              : `last ${dashStats.accCount} ${dashStats.accCount === 1 ? "test" : "tests"}`}
          </div>
        </Kpi>

        {/* Tests this week */}
        <Kpi
          tint="rgba(151,113,224,0.14)" /* violet tint — no portal var; reads on light + dark */
          color="rgba(151,113,224,1)" /* violet — approved-preview accent, no portal var */
          icon={
            <Ic>
              <path d="M4 19V10M10 19V5M16 19v-8M22 19H2" />
            </Ic>
          }
          label="Tests this week"
        >
          <div className="ds-stat-value" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 1, width: "max-content" }}>
            {dashStats.weekMocks + dashStats.weekTests}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3.5, height: 26, marginTop: 7 }}>
            {dashStats.spark.map((c, i) => (
              <i
                key={i}
                style={{
                  width: 7,
                  borderRadius: "3px 3px 1px 1px",
                  height: Math.min(22, 6 + c * 5),
                  background:
                    i === dashStats.todayIdx
                      ? "var(--c-brand-gold)"
                      : c > 0
                      ? "rgba(151,113,224,0.85)" /* violet — see note above */
                      : "var(--c-border-soft)",
                }}
              />
            ))}
          </div>
        </Kpi>

        {/* IPMAT rank */}
        <Kpi
          tint="var(--c-info-soft)"
          color="var(--c-info)"
          icon={
            <Ic>
              <path d="M8 21l4-3 4 3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2z" />
            </Ic>
          }
          label="IPMAT rank"
        >
          <div className="ds-stat-value" style={{ fontSize: 24, lineHeight: 1.2, marginTop: 1, width: "max-content" }}>
            {weeklyRank?.rank ? `#${weeklyRank.rank}` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>
            {weeklyRank?.rank
              ? weeklyRank.scope === "week"
                ? `of ${weeklyRank.total} · this week's mocks`
                : `of ${weeklyRank.total} · all-time mocks`
              : "attempt a mock to unlock"}
          </div>
        </Kpi>
      </div>

      {/* ── Main grid: plan + right column ───────────────────── */}
      <div
        className={`td-r3 grid grid-cols-1 ${hasRight ? "lg:grid-cols-[1.55fr_1fr]" : ""} gap-4 items-start mb-4`}
      >
        {/* Plan card */}
        <div
          className="td-plan rounded-[16px] border"
          data-tour="missions"
          style={{ ...cardStyle, padding: "22px 24px 16px" }}
        >
          <div className="flex items-center gap-4" style={{ marginBottom: 10 }}>
            <div style={{ width: 54, height: 54, position: "relative", flexShrink: 0 }}>
              <svg width="54" height="54" viewBox="0 0 54 54" style={{ transform: "rotate(-90deg)", display: "block" }}>
                <circle cx="27" cy="27" r="22.5" fill="none" stroke="var(--c-border-soft)" strokeWidth="5.5" />
                <circle
                  className="td-ring-val"
                  cx="27"
                  cy="27"
                  r="22.5"
                  fill="none"
                  stroke="var(--c-brand-gold)"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div
                className="ds-display"
                style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13.5 }}
              >
                {planSteps ? `${planDoneCount}/${planSteps.length}` : "…"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: "-0.005em", color: "var(--c-text-primary)" }}>
                Aaj ke liye socha hai
              </div>
              <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 2 }}>
                suggestions hain, orders nahi — jo skip hoga, kal wapas mil jayega
              </div>
            </div>
          </div>

          {!planSteps && (
            <div style={{ padding: "18px 0", fontSize: 13, color: "var(--c-text-tertiary)" }}>
              Aaj ka plan ban raha hai…
            </div>
          )}

          {planSteps && !allPlanDone &&
            (() => {
              let n = 0;
              return planSteps.map((s) => {
                const num = s.done ? null : ++n;
                return (
                  <PlanStep
                    key={s.id}
                    num={num}
                    done={s.done}
                    title={s.title}
                    why={s.why}
                    busy={s.busy}
                    cta={s.cta}
                    primary={s.id === firstUndoneId}
                    onGo={s.go}
                  />
                );
              });
            })()}

          {planSteps && allPlanDone && (
            <div className="text-center" style={{ padding: "26px 0 22px" }}>
              <div style={{ fontSize: 30, lineHeight: 1 }}>🔥</div>
              <div className="ds-display" style={{ fontSize: 22, marginTop: 10, letterSpacing: "-0.01em" }}>
                Aaj ka kaam khatam.
              </div>
              <div style={{ fontSize: 13, marginTop: 5, color: "var(--c-text-secondary)" }}>
                Kal same time.
              </div>
            </div>
          )}

          <div
            className="flex justify-between items-center flex-wrap gap-2"
            style={{
              borderTop: "1px solid var(--c-border-faint)",
              marginTop: 12,
              padding: "14px 0 4px",
              fontSize: 12,
              color: "var(--c-text-tertiary)",
            }}
          >
            <span>Kal same time — streak zinda rakhna</span>
            <button
              type="button"
              onClick={() => setCTXSlug("studyplan")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--c-brand-gold)",
              }}
            >
              Pura hafta dekho{" "}
              <ArrowRight size={11} style={{ display: "inline", verticalAlign: "-1px" }} />
            </button>
          </div>
        </div>

        {/* Right column */}
        {hasRight && (
          <div className="flex flex-col gap-4 min-w-0">
            {/* Aaj ki classes — batch students only */}
            {showClasses &&
              (classCount > 0 ? (
                <div className="td-lift rounded-[16px] border" style={{ ...cardStyle, padding: "18px 20px 10px" }}>
                  <div className="flex justify-between items-center" style={{ ...capStyle, marginBottom: 6 }}>
                    <span>Aaj ki classes</span>
                    {liveInfo && (
                      <span
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          color: "var(--c-success)",
                          letterSpacing: "0.02em",
                          textTransform: "none",
                          fontWeight: 500,
                          fontSize: 11,
                        }}
                      >
                        <i
                          className="td-live-dot"
                          style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--c-success)" }}
                        />
                        {liveInfo}
                      </span>
                    )}
                  </div>
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {(classes || []).map((item, idx) => (
                      <ClassRow key={item?.id ?? idx} item={item} first={idx === 0} now={nowTick} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[16px] border" style={{ ...cardStyle, padding: "16px 20px" }}>
                  <div style={capStyle}>Aaj ki classes</div>
                  <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", marginTop: 8 }}>
                    Aaj koi class nahi — plan pe focus.
                  </div>
                </div>
              ))}

            {/* Mock window — live */}
            {nextMock?.mode === "live" && (
              <div
                className="td-lift rounded-[16px]"
                style={{
                  background: "var(--c-mock-banner)",
                  border: "1px solid var(--c-mock-banner-line)",
                  boxShadow: "var(--c-shadow-xs)",
                  padding: "18px 20px",
                  flexShrink: 0,
                }}
              >
                <div style={{ ...capStyle, color: "var(--c-brand-gold)", marginBottom: 8 }}>
                  Mock window khula hai
                </div>
                <div className="ds-display" style={{ fontSize: 18, color: "var(--c-mock-banner-text)" }}>
                  {nextMock.title}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--c-mock-banner-soft)",
                    marginTop: 4,
                    lineHeight: 1.55,
                    maxWidth: 250,
                  }}
                >
                  Do ghante jab free ho, tab de dena — jaldi nahi hai.
                </div>
                <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--c-mock-banner-soft)" }}>
                    {nextMock.endsAt ? `closes ${format(nextMock.endsAt, "EEE · h:mm a")}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCTXSlug("mocks");
                      setSK(new Set(["2"]));
                    }}
                    className="transition-all hover:-translate-y-0.5"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--c-mock-banner-btn-fg)",
                      background: "var(--c-mock-banner-btn-bg)",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      borderRadius: 999,
                      padding: "8px 16px",
                    }}
                  >
                    Attempt →
                  </button>
                </div>
              </div>
            )}

            {/* Upcoming mock — quiet card */}
            {nextMock?.mode === "upcoming" && (
              <div className="rounded-[16px] border" style={{ ...cardStyle, padding: "16px 20px" }}>
                <div style={capStyle}>Agla mock</div>
                <div className="ds-display" style={{ fontSize: 16, marginTop: 6 }}>
                  {nextMock.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 3 }}>
                  opens {format(nextMock.startsAt, "EEE d MMM, h:mm a")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Continue tiles ───────────────────────────────────── */}
      <div className="td-r4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6">
        {cardBits?.resume && (
          <Tile
            tint="var(--c-brand-gold-tint)"
            color="var(--c-brand-gold)"
            icon={
              <Ic size={16}>
                <path d="M6 4l14 8-14 8z" />
              </Ic>
            }
            title={`Resume — ${cardBits.resume}`}
            sub="wahin se continue karo"
            onClick={() => {
              if (cardBits.resumeUuid) router.push(`/test/${cardBits.resumeUuid}`);
              else {
                setCTXSlug("mocks");
                setSK(new Set(["2"]));
              }
            }}
          />
        )}
        {cardBits?.pyqTotal > 0 && (
          <Tile
            tint="var(--c-info-soft)"
            color="var(--c-info)"
            icon={
              <Ic size={16}>
                <path d="M6 2h9l5 5v15H6z" />
                <path d="M14 2v6h6" />
              </Ic>
            }
            title="PYQs"
            sub={`${cardBits.pyqDone} / ${cardBits.pyqTotal} attempted`}
            bar={{
              pct: Math.min(100, Math.round((cardBits.pyqDone / cardBits.pyqTotal) * 100)),
              color: "var(--c-info)",
            }}
            onClick={() => {
              setCTXSlug("pyqyear");
              setSK(new Set(["6"]));
            }}
          />
        )}
        <Tile
          tint="rgba(151,113,224,0.14)" /* violet tint — no portal var; reads on light + dark */
          color="rgba(151,113,224,1)" /* violet — approved-preview accent */
          icon={
            <Ic size={16}>
              <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
            </Ic>
          }
          title="DSB Challenge"
          sub={
            dsbLvl
              ? `Level ${dsbLvl.level} · ${(xpBits.total_xp || 0).toLocaleString()} XP`
              : "Daily challenge →"
          }
          bar={dsbLvl ? { pct: dsbLvl.progress, color: "rgba(151,113,224,1)" } : null}
          onClick={() => setCTXSlug("dsbchallenge")}
        />
      </div>

      {/* ── Admin-only: Your Courses + Attendance ─────────────── */}
      {isAdmin && (
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <div
            className="rounded-[14px] border p-5"
            style={{
              background: "var(--c-surface)",
              borderColor: "var(--c-border-faint)",
              boxShadow: "var(--c-shadow-xs)",
            }}
          >
            <h3
              className="ds-display mb-4"
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: "var(--c-text-primary)",
                textAlign: "left",
              }}
            >
              Your courses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {isDemo ? <DemoComponent /> : null}
              {userCourses &&
                userCourses.map((i, d) => (
                  <div
                    key={d}
                    className="rounded-[10px] border p-4 transition-all hover:-translate-y-0.5"
                    style={{
                      background: "var(--c-surface-muted)",
                      borderColor: "var(--c-border-faint)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--c-brand-primary)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {i?.course?.title}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div
            className="rounded-[14px] border overflow-hidden"
            style={{
              background: "var(--c-surface)",
              borderColor: "var(--c-border-faint)",
              boxShadow: "var(--c-shadow-xs)",
            }}
          >
            {isDemo ? <DemoComponent floating={true} /> : null}
            <StudentAttendance />
          </div>
        </div>
      )}

      {/* ── Grand tour overlay ─────────────────────────────────── */}
      <PortalTour
        steps={GRAND_STEPS}
        storageKey="tour_grand_v1"
        run={tourRun}
        onClose={() => setTourRun(false)}
        onFinish={() => setCTXSlug("dsbchallenge")}
        labelPrefix="Portal tour"
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────

// KPI card: icon tile + label + gradient stat (children).
function Kpi({ tint, color, icon, label, children }) {
  return (
    <div
      className="td-lift rounded-[16px] border"
      style={{
        background: "var(--c-surface)",
        borderColor: "var(--c-border-faint)",
        boxShadow: "var(--c-shadow-xs)",
        padding: "17px 18px 15px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          marginTop: 2,
          background: tint,
          color,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
            color: "var(--c-text-tertiary)",
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

// One suggestion in "Aaj ke liye socha hai". Done steps keep their
// place — struck through with a green check tile, no button.
function PlanStep({ num, done, title, why, busy, cta, primary, onGo }) {
  return (
    <div className="td-step flex items-center gap-3.5" style={{ padding: "13px 12px", margin: "0 -12px" }}>
      <div
        className="ds-display"
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 15,
          background: done ? "var(--c-success-soft)" : "var(--c-brand-gold-tint)",
          color: done ? "var(--c-success)" : "var(--c-brand-gold)",
        }}
      >
        {done ? "✓" : num}
      </div>
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: 14,
            fontWeight: done ? 400 : 500,
            letterSpacing: "-0.005em",
            color: done ? "var(--c-text-tertiary)" : "var(--c-text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {title}
        </div>
        {!done && (
          <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 1, lineHeight: 1.5 }}>
            {why}
          </div>
        )}
      </div>
      {!done && (
        <button
          type="button"
          onClick={onGo}
          aria-label={`Start: ${title}`}
          className="transition-all hover:-translate-y-0.5"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 999,
            padding: "8px 16px",
            whiteSpace: "nowrap",
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "inherit",
            ...(primary
              ? {
                  background: "var(--c-brand-gold)",
                  color: "var(--c-text-on-brand)",
                  border: "1px solid transparent",
                }
              : {
                  background: "transparent",
                  color: "var(--c-brand-gold)",
                  border: "1px solid var(--c-border-soft)",
                }),
          }}
        >
          {busy ? "…" : primary ? "Continue →" : cta}
        </button>
      )}
    </div>
  );
}

// One row in "Aaj ki classes" — serif time, title, Join/Later chip.
// Join is enabled only while the class is ongoing (existing behavior);
// first class carries the "recording baad mein yahin" reassurance.
function ClassRow({ item, first, now }) {
  const st = classStatus(item, now);
  const t = fmtClassTime(item?.start_time);
  const live = st.state === "ongoing";
  return (
    <div
      className="flex items-center gap-3"
      style={{ padding: "11px 0", borderTop: first ? "none" : "1px solid var(--c-border-faint)" }}
    >
      <div
        className="ds-display"
        style={{ fontSize: 15.5, width: 62, flexShrink: 0, lineHeight: 1.1, color: "var(--c-text-primary)" }}
      >
        {t.hm}
        {t.ap && (
          <span
            style={{
              display: "block",
              fontFamily: "inherit",
              fontSize: 9.5,
              color: "var(--c-text-tertiary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            {t.ap}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text-primary)" }}>
          {item?.title}
        </div>
        {first && (
          <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>
            recording baad mein yahin
          </div>
        )}
      </div>
      {live ? (
        <a
          href={item?.url || "#"}
          target="_blank"
          rel="noreferrer"
          className="transition-all hover:-translate-y-0.5"
          style={{
            marginLeft: "auto",
            fontSize: 11.5,
            fontWeight: 600,
            borderRadius: 999,
            padding: "6px 14px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            background: "var(--c-success-soft)",
            color: "var(--c-success)",
          }}
        >
          Join
        </a>
      ) : (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--c-text-secondary)",
            border: "1px solid var(--c-border-soft)",
            borderRadius: 999,
            padding: "6px 14px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {st.state === "expired" ? "Done" : "Later"}
        </span>
      )}
    </div>
  );
}

// Continue tile — icon, title, sub-line, optional micro progress bar.
function Tile({ tint, color, icon, title, sub, bar, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="td-tile td-lift text-left rounded-[16px] border flex items-center gap-3"
      style={{
        background: "var(--c-surface)",
        borderColor: "var(--c-border-faint)",
        boxShadow: "var(--c-shadow-xs)",
        padding: "16px 18px",
        cursor: "pointer",
        flexShrink: 0,
        fontFamily: "inherit",
        color: "var(--c-text-primary)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: tint,
          color,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>
          {title}
        </div>
        <div className="truncate" style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>
          {sub}
        </div>
        {bar && (
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "var(--c-border-soft)",
              marginTop: 8,
              overflow: "hidden",
              maxWidth: 132,
            }}
          >
            <i style={{ display: "block", height: "100%", borderRadius: 2, width: `${bar.pct}%`, background: bar.color }} />
          </div>
        )}
      </div>
      <span className="td-arrow" style={{ marginLeft: "auto", color: "var(--c-text-tertiary)", flexShrink: 0 }}>
        →
      </span>
    </button>
  );
}
