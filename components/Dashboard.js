import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import { useEffect, useState } from "react";
import { useNMNContext } from "./NMNContext";
import StudentAttendance from "./StudentAttendance";
import DemoComponent from "./DemoComponent";
import ClassDashboard from "./TodaysClasses";
import { toast } from "react-hot-toast";
import Loader from "./Loader";
import axios from "axios";
import { ArrowRight, Target, Flame, BookOpen } from "lucide-react";

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
      <header className="mb-8 mt-2">
        <h1
          className="ds-display"
          style={{
            fontSize: "clamp(28px, 4.2vw, 40px)",
            lineHeight: 1.1,
            color: "var(--c-text-primary)",
          }}
        >
          Welcome back,{" "}
          <span
            className="ds-accent"
            style={{ color: "var(--c-brand-primary)" }}
          >
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
          value="—"
          suffix=""
          delta="Coming soon"
          deltaTone="muted"
        />
        <Stat
          label="Tests this week"
          value={testCount}
          delta={testCount > 0 ? "Keep going" : "Take your first"}
          deltaTone={testCount > 0 ? "success" : "muted"}
        />
        <Stat
          label="Avg. accuracy"
          value="—"
          delta="Coming soon"
          deltaTone="muted"
        />
        <Stat
          label="IPMAT rank"
          value="—"
          delta="Coming soon"
          deltaTone="muted"
        />
      </div>

      {/* ── Quick actions (3 focused cards) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <QuickAction
          title="Continue practice"
          desc="Pick up a mock test where you left off"
          Icon={Target}
          accent="brand"
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
          accent="info"
          onClick={() => {
            setCTXSlug("pyqyear");
            setSK(new Set(["6"]));
          }}
        />
      </div>

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
          borderRadius: 10,
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
