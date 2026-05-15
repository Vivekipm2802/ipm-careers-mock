import { supabase } from "@/utils/supabaseClient";
import { useEffect, useState } from "react";
import { useNMNContext } from "./NMNContext";
import StudentAttendance from "./StudentAttendance";
import DemoComponent from "./DemoComponent";
import ClassDashboard from "./TodaysClasses";
import { toast } from "react-hot-toast";
import Loader from "./Loader";
import axios from "axios";
import {
  ArrowRight,
  Target,
  Layers,
  Flame,
  BookOpen,
  FileText,
  PlayCircle,
} from "lucide-react";

/**
 * Redesigned student dashboard — Phase 1 of the portal redesign.
 *
 * Data fetching (classes, results, isAdmin) is preserved verbatim from the
 * previous version so backend behaviour is unchanged. Only the JSX has been
 * rebuilt to match the new design system: tokens from globals.css, the
 * Inter + Instrument Serif type pairing, and a calmer, scannable layout.
 */
export default function Dashboard({ userData }) {
  // ── Existing state — preserved ──
  const [isNull, setIsNull] = useState(true);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [results, setResults] = useState([]);

  // ── Existing data fetching — preserved ──
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

  const { setCTXSlug, sk, setSK, userCourses, isDemo } = useNMNContext();

  async function checkAdminStatus() {
    try {
      const response = await axios.post("/api/isAdmin", {
        email: userData?.email,
      });
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

  // ── Quick actions config (replaces "Quick Links" block) ──
  // Same destinations as the old Quick Links — only the visuals change.
  const quickActions = [
    {
      title: "Concept Tests",
      desc: "Master one topic at a time",
      slug: "play",
      keys: 2,
      Icon: Target,
      accent: "brand",
      demo: true,
    },
    {
      title: "Mock Tests",
      desc: "Full-length practice papers",
      slug: "mocks",
      keys: 2,
      Icon: Layers,
      accent: "brand",
      demo: true,
    },
    {
      title: "Daily Learning",
      desc: "Keep your streak alive",
      slug: "currentaffairs",
      keys: 3,
      Icon: Flame,
      accent: "gold",
      demo: true,
    },
    {
      title: "Sectional Tests",
      desc: "Target a single section",
      slug: "sectional-tests",
      keys: 7,
      Icon: BookOpen,
      accent: "brand",
      demo: true,
    },
    {
      title: "Previous Year Papers",
      desc: "Actual exam questions",
      slug: "exmscan",
      keys: 6,
      Icon: FileText,
      accent: "brand",
      demo: true,
    },
    {
      title: "Pre Recorded Videos",
      desc: "Study at your own pace",
      slug: "prv",
      keys: 5,
      Icon: PlayCircle,
      accent: "brand",
      demo: true,
    },
  ];

  const fullName = userData?.user_metadata?.full_name || "there";
  const firstName = fullName.split(" ")[0];

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
      style={{ color: "var(--c-text-primary)" }}
    >
      {/* ── Greeting ───────────────────────────────────────────── */}
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
          Here's everything waiting for you today.
        </p>
      </header>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Enrolled courses"
          value={userCourses?.length || 0}
          subtle={userCourses?.length ? "Active" : "Get started"}
        />
        <Stat
          label="Classes today"
          value={(classes || []).length}
          subtle="Scheduled"
        />
        <Stat
          label="Tests completed"
          value={results?.length || 0}
          subtle={results?.length ? "Keep going" : "Take your first"}
        />
        <Stat label="Study streak" value="—" subtle="Coming soon" />
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="mb-2 flex items-baseline justify-between">
        <h2
          className="ds-display"
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Quick actions
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {quickActions
          .filter((q) => (isDemo ? q.demo === true : true))
          .map((q, i) => (
            <QuickAction
              key={i}
              title={q.title}
              desc={q.desc}
              Icon={q.Icon}
              accent={q.accent}
              onClick={() => {
                setCTXSlug(q.slug);
                setSK(new Set(q.keys.toString()));
              }}
            />
          ))}
      </div>

      {/* ── Today's classes ───────────────────────────────────── */}
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
          }}
        >
          Today's classes
        </h3>
        <ClassDashboard classes={classes ?? []} />
      </div>

      {/* ── Admin only: Your courses + Attendance ─────────────── */}
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

function Stat({ label, value, subtle }) {
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
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--c-text-primary)",
          marginTop: 4,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {subtle && (
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            color: "var(--c-text-tertiary)",
          }}
        >
          {subtle}
        </div>
      )}
    </div>
  );
}

function QuickAction({ title, desc, Icon, accent, onClick }) {
  const iconBg =
    accent === "gold"
      ? "var(--c-brand-gold-tint)"
      : "var(--c-brand-primary-tint)";
  const iconFg =
    accent === "gold"
      ? "var(--c-brand-gold)"
      : "var(--c-brand-primary)";

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
          background: iconBg,
          color: iconFg,
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
