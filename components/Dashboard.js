import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import { useEffect, useMemo, useState } from "react";
import { useNMNContext } from "./NMNContext";
import StudentAttendance from "./StudentAttendance";
import DemoComponent from "./DemoComponent";
import ClassDashboard from "./TodaysClasses";
import { toast } from "react-hot-toast";
import Loader from "./Loader";
import axios from "axios";
import { ArrowRight, Target, Flame, BookOpen } from "lucide-react";
import { parseISO, isAfter, format, differenceInSeconds, startOfWeek } from "date-fns";

/**
 * Student dashboard — Phase 1.8
 *
 * Matched to the design-system-preview section 08:
 *  - Greeting with serif italic name accent
 *  - Contextual subtitle (driven by class count)
 *  - Four stat cards with delta indicators (placeholders for backend wiring)
 *  - Three focused quick-action cards (Continue mock / Today's quiz / Previous year)
 *  - Today's classes row list
 *
 * Data fetching (classes, results, isAdmin) is preserved exactly as before so
 * backend behaviour is unchanged. Stats that need new backend wiring are
 * shown with em-dash + "Coming soon" instead of fake numbers.
 */
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
  const [weeklyRank, setWeeklyRank] = useState(null);

  const { setCTXSlug, sk, setSK, userCourses, isDemo } = useNMNContext();

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
    supabase
      .rpc("get_weekly_ipmat_rank", { p_email: userData.email })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length) setWeeklyRank(data[0]);
      });
  }, [userData?.email]);

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
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
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
      accNow,
      accDelta: accNow != null && accPrev != null ? accNow - accPrev : null,
      accCount: Math.min(withReport.length, 5),
    };
  }, [results, plays, conceptPlays]);

  // ── Derived display values ──
  const fullName = userData?.user_metadata?.full_name || "there";
  const firstName = fullName.split(" ")[0];
  const classCount = (classes || []).length;
  const testCount = results?.length || 0;

  // Contextual subtitle based on what's actually waiting for the student.
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
      className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4"
      style={{ color: "var(--c-text-primary)", textAlign: "left" }}
    >
      {/* ── Greeting ─────────────────────────────────────────── */}
      <header className="mb-8 mt-10">
        <h1
          className="ds-display"
          style={{
            fontSize: "clamp(28px, 4.2vw, 40px)",
            lineHeight: 1.1,
            color: "var(--c-text-primary)",
          }}
        >
          Welcome back,{" "}
          <span className="ds-accent ds-grad-text">
            {firstName}.
          </span>
        </h1>
        <p
          className="mt-2"
          style={{
            fontSize: 15,
            color: "var(--c-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      </header>

      {/* ── Stats (4 cards) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Study streak"
          value={dashStats.streak > 0 ? `${dashStats.streak} ${dashStats.streak === 1 ? "day" : "days"}` : "—"}
          delta={
            dashStats.streak > 0
              ? `Best: ${dashStats.bestStreak} · any activity counts`
              : "Do anything today to start"
          }
          deltaTone={dashStats.streak > 0 ? "gold" : "muted"}
        />
        <Stat
          label="Tests this week"
          value={dashStats.weekMocks + dashStats.weekTests}
          delta={
            dashStats.weekMocks + dashStats.weekTests > 0
              ? `${dashStats.weekMocks} ${dashStats.weekMocks === 1 ? "mock" : "mocks"} · ${dashStats.weekTests} practice`
              : "Take your first"
          }
          deltaTone={dashStats.weekMocks + dashStats.weekTests > 0 ? "success" : "muted"}
        />
        <Stat
          label="Avg. accuracy"
          value={dashStats.accNow != null ? `${dashStats.accNow}%` : "—"}
          delta={
            dashStats.accNow == null
              ? "Complete a test to unlock"
              : dashStats.accDelta != null
              ? `Last 5 tests · ${dashStats.accDelta >= 0 ? "▲" : "▼"} ${Math.abs(dashStats.accDelta)}%`
              : `Last ${dashStats.accCount} ${dashStats.accCount === 1 ? "test" : "tests"}`
          }
          deltaTone={
            dashStats.accNow == null
              ? "muted"
              : dashStats.accDelta != null && dashStats.accDelta < 0
              ? "danger"
              : "success"
          }
        />
        <Stat
          label="IPMAT rank"
          value={weeklyRank?.rank ? `#${weeklyRank.rank}` : "—"}
          delta={
            weeklyRank?.rank
              ? `of ${weeklyRank.total} · avg mock score, this week`
              : "Attempt a mock this week"
          }
          deltaTone={weeklyRank?.rank ? "gold" : "muted"}
        />
      </div>

      {/* ── Quick actions (3 focused cards) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <QuickAction
          title="Continue practice"
          desc="Pick up a mock test where you left off"
          Icon={Target}
          accent="gold"
          onClick={() => {
            setCTXSlug("mocks");
            setSK(new Set(["2"]));
          }}
        />
        <QuickAction
          title="Today's quiz"
          desc="Keep your streak alive with daily current affairs"
          Icon={Flame}
          accent="gold"
          onClick={() => {
            setCTXSlug("currentaffairs");
            setSK(new Set(["3"]));
          }}
        />
        <QuickAction
          title="Previous year papers"
          desc="Actual exam questions, year by year"
          Icon={BookOpen}
          accent="gold"
          onClick={() => {
            setCTXSlug("pyqyear");
            setSK(new Set(["6"]));
          }}
        />
      </div>

      {/* ── Next mock banner (only when a mock is scheduled) ── */}
      {nextMock &&
        (() => {
          if (nextMock.mode === "live") {
            const stillOpen = nextMock.endsAt && isAfter(nextMock.endsAt, nowTick);
            if (!stillOpen) return null;
            return (
              <div
                className="rounded-[16px] mb-6 shrink-0 relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
                style={{
                  background: "var(--c-mock-banner)",
                  color: "var(--c-mock-banner-text)",
                  border: "1px solid var(--c-mock-banner-line)",
                  padding: "20px 24px",
                }}
              >
                <div>
                  <div
                    className="flex items-center gap-2"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      opacity: 0.85,
                    }}
                  >
                    <span
                      className="animate-pulse"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--c-success)",
                        display: "inline-block",
                      }}
                    />
                    Live now
                  </div>
                  <div
                    className="ds-display"
                    style={{ fontSize: 20, marginTop: 5, letterSpacing: "-0.01em" }}
                  >
                    {nextMock.title}
                  </div>
                  <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 3 }}>
                    Open now · closes {format(nextMock.endsAt, "EEE d MMM, h:mm a")}
                    {nextMock.config?.duration ? ` · ${nextMock.config.duration} min` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCTXSlug("mocks");
                    setSK(new Set(["2"]));
                  }}
                  style={{
                    background: "var(--c-mock-banner-btn-bg)",
                    color: "var(--c-mock-banner-btn-fg)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    padding: "11px 24px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Attempt now →
                </button>
              </div>
            );
          }
          const secs = differenceInSeconds(nextMock.startsAt, nowTick);
          if (secs <= 0) return null;
          const days = Math.floor(secs / 86400);
          const hours = Math.floor((secs % 86400) / 3600);
          const minutes = Math.floor((secs % 3600) / 60);
          const two = (n) => String(n).padStart(2, "0");
          return (
            <div
              className="rounded-[16px] mb-6 shrink-0 relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
              style={{
                background: "var(--c-mock-banner)",
                color: "var(--c-mock-banner-text)",
                border: "1px solid var(--c-mock-banner-line)",
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -40,
                  top: -40,
                  width: 180,
                  height: 180,
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    opacity: 0.8,
                  }}
                >
                  Next mock
                </div>
                <div
                  className="ds-display"
                  style={{ fontSize: 20, marginTop: 5, letterSpacing: "-0.01em" }}
                >
                  {nextMock.title}
                </div>
                <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 3 }}>
                  Opens {format(nextMock.startsAt, "EEE d MMM, h:mm a")}
                  {nextMock.config?.duration ? ` · ${nextMock.config.duration} min` : ""}
                </div>
              </div>
              <div className="flex items-center gap-5" style={{ position: "relative" }}>
                <div className="flex gap-4">
                  {[
                    [two(days), "days"],
                    [two(hours), "hours"],
                    [two(minutes), "min"],
                  ].map(([v, l]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div
                        className="ds-display"
                        style={{ fontSize: 24, lineHeight: 1 }}
                      >
                        {v}
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          opacity: 0.75,
                          marginTop: 4,
                        }}
                      >
                        {l}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCTXSlug("mocks");
                    setSK(new Set(["2"]));
                  }}
                  style={{
                    background: "var(--c-mock-banner-btn-bg)",
                    color: "var(--c-mock-banner-btn-fg)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  View mocks →
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── Today's classes ──────────────────────────────────── */}
      <div
        className="rounded-[14px] border p-5 mb-6"
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
          Today's classes
        </h3>
        <ClassDashboard classes={classes ?? []} />
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
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────

function Stat({ label, value, suffix, delta, deltaTone = "muted" }) {
  const deltaColor =
    deltaTone === "success"
      ? "var(--c-success)"
      : deltaTone === "danger"
      ? "var(--c-danger)"
      : deltaTone === "gold"
      ? "var(--c-brand-gold)"
      : "var(--c-text-tertiary)";

  return (
    <div
      className="rounded-[12px] border p-4 transition-all"
      style={{
        background: "var(--c-surface)",
        borderColor: "var(--c-border-faint)",
        boxShadow: "var(--c-shadow-xs)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--c-text-tertiary)",
        }}
      >
        {label}
      </div>
      <div
        className="ds-stat-value"
        style={{
          fontSize: 28,
          marginTop: 4,
          lineHeight: 1.1,
        }}
      >
        {value}
        {suffix ? (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              marginLeft: 6,
              color: "var(--c-brand-gold)",
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {delta && (
        <div
          style={{
            fontSize: 11,
            marginTop: 6,
            color: deltaColor,
            fontWeight: 500,
          }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function QuickAction({ title, desc, Icon, accent, onClick }) {
  const palette = {
    brand: {
      bg: "var(--c-brand-primary-tint)",
      fg: "var(--c-brand-primary)",
    },
    gold: {
      bg: "var(--c-brand-gold-tint)",
      fg: "var(--c-brand-gold)",
    },
    info: {
      bg: "var(--c-info-soft)",
      fg: "var(--c-info)",
    },
  };
  const p = palette[accent] || palette.brand;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-[12px] border p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--c-surface)",
        borderColor: "var(--c-border-faint)",
        boxShadow: "var(--c-shadow-xs)",
        cursor: "pointer",
      }}
    >
      <div
        className="grid place-items-center shrink-0"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: p.bg,
          color: p.fg,
        }}
      >
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--c-text-primary)",
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            marginTop: 2,
            color: "var(--c-text-secondary)",
            lineHeight: 1.45,
          }}
        >
          {desc}{" "}
          <ArrowRight
            size={11}
            style={{ display: "inline", verticalAlign: "-1px" }}
          />
        </div>
      </div>
    </button>
  );
}
