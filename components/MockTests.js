// ============================================================
// Mock Tests — Phase 15 Ship A: Hybrid layout
// - By Category only (By Courses removed per Phase 15 design call)
// - Hero greeting + countdown hero + Continue card (2-col)
// - "Next 7 days" calendar strip with mock-open markers
// - 4 stat tiles: Attempted / Best / Avg / Time spent
// - Underline category tabs (replaces rectangular brand-red tabs)
// - Mock rows with status pill + meta + score + action
// - Admin controls preserved (hide/show, preview, delete)
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useNMNContext } from "./NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import {
  isAfter,
  isBefore,
  addDays,
  parseISO,
  format,
  endOfDay,
  startOfDay,
  differenceInSeconds,
  formatDistanceToNowStrict,
} from "date-fns";
import {
  ChartBarIncreasing,
  ChartSplineIcon,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Play,
  ArrowRight,
  Bell,
} from "lucide-react";

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

// ============================================================
// Helpers
// ============================================================

function formatMinutes(seconds) {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

// Small stroked icon wrapper — same drawn-SVG grammar as the D2 dashboard.
function Ic({ size = 16, children }) {
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

function difficultyLabel(d) {
  if (!d) return null;
  const s = String(d).trim().toLowerCase();
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function resolveMockStatus(test, plays) {
  const myPlays = plays?.filter((p) => p.test_id === test.id) || [];
  if (myPlays.length > 0) {
    return {
      kind: "attempted",
      latestPlay: myPlays[0],
      attempts: myPlays.length,
    };
  }
  if (!test.start_time) {
    return { kind: "available" };
  }
  const now = new Date();
  const startTime = parseISO(test.start_time);
  const availableFrom = addDays(startTime, -2);
  if (isBefore(now, availableFrom)) {
    return { kind: "upcoming", opensAt: availableFrom };
  }
  if (test.end_time && isAfter(now, endOfDay(parseISO(test.end_time)))) {
    return { kind: "closed" };
  }
  if (!test.end_time && isAfter(now, addDays(startTime, 1))) {
    return { kind: "closed" };
  }
  return { kind: "live" };
}

// ============================================================
// Style tokens
// ============================================================

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--c-text-tertiary)",
};
const serifStyle = {
  fontFamily: "var(--font-accent)",
  fontStyle: "italic",
  fontWeight: 400,
  color: "var(--c-brand-primary)",
};
const iconBtn = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "transparent",
  border: "1px solid var(--c-border-soft)",
  color: "var(--c-text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontFamily: "inherit",
};

// ============================================================
// MAIN
// ============================================================

export default function MockTests({ enrolled = [], role = "user" }) {
  const ctx = useNMNContext();
  const isDemo = ctx?.isDemo;
  const userDetails = ctx?.userDetails;
  const isAdmin = role === "admin";

  const [tests, setTests] = useState();
  const [allTests, setAllTests] = useState();
  const [categories, setCategories] = useState();
  const [allCategories, setAllCategories] = useState();
  const [activeCategory, setActiveCategory] = useState(0);
  const [results, setResults] = useState([]); // current user's plays only
  const [activeResult, setActiveResult] = useState(undefined);
  const [now, setNow] = useState(new Date());

  // Tick "now" every 60s so countdown re-renders
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ============================================================
  // Data fetching
  // ============================================================

  async function getResults() {
    if (!userDetails?.email) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from("mock_plays")
      .select("id, uid, test_id, score, created_at")
      .eq("user", userDetails.email)
      .order("created_at", { ascending: false });
    setResults(data || []);
  }

  // Phase 20.4.1: mock_categories has TWO hidden-related boolean columns
  // (hidden + is_visible). The admin UI can flip either one. A category is
  // visible to students only when neither flag says it's hidden.
  function isCategoryVisible(c) {
    if (c.hidden === true) return false;
    if (c.is_visible === false) return false;
    return true;
  }

  async function getCategories() {
    const { data } = await supabase
      .from("mock_categories")
      .select("*")
      .order("seq", { ascending: true });
    if (data) {
      const visible = isAdmin ? data : data.filter(isCategoryVisible);
      setCategories(visible);
    }
  }

  async function getAllCategories() {
    const { data } = await supabase
      .from("mock_categories")
      .select("*")
      .order("seq", { ascending: true });
    if (data) {
      const visible = isAdmin ? data : data.filter(isCategoryVisible);
      setAllCategories(visible);
    }
  }

  async function getTests() {
    const { data } = await supabase
      .from("mock_test")
      .select(
        "id, title, description, category, course, seq, start_time, end_time, uid, config",
      )
      .order("seq", { ascending: true });
    if (data) {
      const filtered = data.filter(
        (t) =>
          !t.config?.generatorType || t.config?.generatorType === "fullmock",
      );
      setTests(filtered);
    }
  }

  async function getAllTests() {
    const { data } = await supabase
      .from("mock_test_view")
      .select(
        "id, title, description, category, course, seq, start_time, end_time, uid, config",
      )
      .order("seq", { ascending: true });
    if (data) {
      const filtered = data.filter(
        (t) =>
          !t.config?.generatorType || t.config?.generatorType === "fullmock",
      );
      setAllTests(filtered);
    }
  }

  async function toggleVisibility(testId, currentlyHidden) {
    const loadingToast = toast.loading(
      currentlyHidden ? "Showing test..." : "Hiding test...",
    );
    try {
      const res = await fetch("/api/test-generator/toggle-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ testId, hidden: !currentlyHidden }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          currentlyHidden
            ? "Test is now visible to students"
            : "Test hidden from students",
        );
        toast.dismiss(loadingToast);
        getTests();
        getAllTests();
      } else {
        toast.error(data.error || "Failed to update");
        toast.dismiss(loadingToast);
      }
    } catch (e) {
      toast.error("Error: " + e.message);
      toast.dismiss(loadingToast);
    }
  }

  async function deleteTest(testId) {
    if (
      !confirm(
        "Are you sure you want to delete this test? This cannot be undone.",
      )
    )
      return;
    const loadingToast = toast.loading("Deleting test...");
    try {
      const res = await fetch("/api/test-generator/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ testId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Test deleted");
        toast.dismiss(loadingToast);
        getTests();
      } else {
        toast.error(data.error || "Failed to delete test");
        toast.dismiss(loadingToast);
      }
    } catch (e) {
      toast.error("Failed to delete test");
      toast.dismiss(loadingToast);
    }
  }

  useEffect(() => {
    getTests();
    getAllTests();
    getCategories();
    getAllCategories();
  }, []);
  useEffect(() => {
    getResults();
  }, [userDetails?.email]);

  // ============================================================
  // Derived
  // ============================================================

  const allTestsCombined = useMemo(() => {
    const seen = new Set();
    const out = [];
    (tests || []).forEach((t) => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    });
    (allTests || []).forEach((t) => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    });
    return out;
  }, [tests, allTests]);

  const visibleTests = useMemo(
    () => allTestsCombined.filter((t) => isAdmin || !t.config?.hidden),
    [allTestsCombined, isAdmin],
  );

  // Continue card: last play in last 14 days that maps to a known test
  const continueCard = useMemo(() => {
    if (!results || !results.length) return null;
    const cutoff = addDays(now, -14);
    const recent = results.find((r) => {
      const at = r?.created_at ? parseISO(r.created_at) : null;
      return at && isAfter(at, cutoff);
    });
    if (!recent) return null;
    const test = visibleTests.find((t) => t.id === recent.test_id);
    if (!test) return null;
    return { test, play: recent };
  }, [results, visibleTests, now]);

  // Next upcoming mock (closest start_time in the future)
  const nextMock = useMemo(() => {
    const upcoming = visibleTests
      .filter((t) => t.start_time)
      .map((t) => ({ test: t, startsAt: parseISO(t.start_time) }))
      .filter((x) => isAfter(x.startsAt, now))
      .sort((a, b) => a.startsAt - b.startsAt);
    return upcoming[0] || null;
  }, [visibleTests, now]);

  // A mock that is open RIGHT NOW (start passed, end not reached)
  const liveMock = useMemo(() => {
    const open = visibleTests
      .filter((t) => t.start_time && t.end_time)
      .map((t) => ({ test: t, startsAt: parseISO(t.start_time), endsAt: parseISO(t.end_time) }))
      .filter((x) => !isAfter(x.startsAt, now) && isAfter(x.endsAt, now))
      .sort((a, b) => a.endsAt - b.endsAt);
    return open[0] || null;
  }, [visibleTests, now]);

  // Countdown breakdown
  const countdown = useMemo(() => {
    if (!nextMock) return null;
    const secs = differenceInSeconds(nextMock.startsAt, now);
    if (secs <= 0) return null;
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return { days, hours, minutes };
  }, [nextMock, now]);

  // "Next 7 days" calendar strip
  const week = useMemo(() => {
    const days = [];
    const today = startOfDay(now);
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      const marks = visibleTests.filter((t) => {
        if (!t.start_time) return false;
        const s = parseISO(t.start_time);
        const sd = startOfDay(s);
        return sd.getTime() === d.getTime();
      });
      days.push({
        date: d,
        dayOfWeek: format(d, "EEE"),
        dayNum: format(d, "d"),
        isToday: i === 0,
        marks,
      });
    }
    return days;
  }, [visibleTests, now]);

  // Stats
  const stats = useMemo(() => {
    const playedIds = new Set(results.map((r) => r.test_id));
    const attempted = visibleTests.filter((t) => playedIds.has(t.id)).length;
    const total = visibleTests.length;
    const scores = results
      .map((r) => (typeof r.score === "number" ? r.score : null))
      .filter((s) => s !== null);
    const best = scores.length ? Math.max(...scores) : null;
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    // Phase 15 Ship A.1: coerce timeout to Number — was hitting string concat
    // for tests where config.timeout was stored as a string ("7200" not 7200),
    // producing "07200720072007200..." that overflowed to scientific notation.
    const timeSpentSecs = results.reduce((sum, r) => {
      const t = visibleTests.find((x) => x.id === r.test_id);
      const dur = Number(t?.config?.timeout) || 0;
      return sum + dur;
    }, 0);
    return { attempted, total, best, avg, timeSpentSecs };
  }, [results, visibleTests]);

  const studentFirstName = useMemo(() => {
    const full = userDetails?.user_metadata?.full_name || "";
    return full.split(" ")[0] || "there";
  }, [userDetails]);

  const filteredCategoryTests = useMemo(() => {
    if (!categories || !categories[activeCategory]) return [];
    const catId = categories[activeCategory].id;
    return visibleTests
      .filter((t) => t.category === catId)
      .sort((a, b) => (a.seq || 0) - (b.seq || 0));
  }, [categories, activeCategory, visibleTests]);

  // ============================================================
  // RENDER
  // ============================================================

  if (tests === undefined) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          width: "100%",
          fontFamily: FONT,
          color: "var(--c-text-tertiary)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid var(--c-border-faint)",
            borderTopColor: "var(--c-brand-primary)",
            animation: "ipm-mock-spin 0.8s linear infinite",
          }}
        />
        <style jsx global>{`
          @keyframes ipm-mock-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        // Phase 15 Ship A.2: vertical scroll only — horizontal scroll was
        // exposing the global orange scrollbar styling and pushing the page wide.
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: FONT,
        padding: "24px 28px 36px",
        color: "var(--c-text-primary)",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      {/* ===== Attempts modal ===== */}
      <Modal
        isOpen={!!activeResult}
        onClose={() => setActiveResult(undefined)}
      >
        <ModalContent>
          <ModalHeader>Your attempts</ModalHeader>
          <ModalBody>
            {results
              .filter((item) => item.test_id === activeResult)
              .map((i) => (
                <div
                  key={i.uid || i.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--c-border-faint)",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--c-text-primary)",
                        fontWeight: 600,
                      }}
                    >
                      {CtoLocal(i?.created_at)?.time}{" "}
                      {CtoLocal(i?.created_at)?.amPm}
                    </div>
                    <div
                      style={{
                        color: "var(--c-text-tertiary)",
                        fontSize: 12,
                      }}
                    >
                      {CtoLocal(i?.created_at)?.date}{" "}
                      {CtoLocal(i?.created_at)?.monthName}{" "}
                      {CtoLocal(i?.created_at)?.year}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link
                      href={`/mock/result/${i?.uid}`}
                      target="_blank"
                      style={{
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 999,
                        background: "var(--c-brand-primary)",
                        color: "var(--c-text-on-brand)",
                        fontSize: 12,
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        textDecoration: "none",
                      }}
                    >
                      <ChartBarIncreasing size={14} /> Result
                    </Link>
                    <Link
                      href={`/mock/analytics/${i?.uid}`}
                      target="_blank"
                      style={{
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 999,
                        background: "transparent",
                        color: "var(--c-text-secondary)",
                        border: "1px solid var(--c-border-soft)",
                        fontSize: 12,
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        textDecoration: "none",
                      }}
                    >
                      <ChartSplineIcon size={14} /> Analytics
                    </Link>
                  </div>
                </div>
              ))}
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setActiveResult(undefined)}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 999,
                background: "transparent",
                color: "var(--c-text-secondary)",
                border: "1px solid var(--c-border-soft)",
                fontSize: 13,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ===== Hero greeting ===== */}
      <div style={{ ...eyebrowStyle, marginBottom: 8 }}>
        Welcome back, {studentFirstName}
      </div>
      <h1
        style={{
          margin: "0 0 6px",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.022em",
          lineHeight: 1.15,
          color: "var(--c-text-primary)",
        }}
      >
        Sit a <span className="ds-grad-text" style={serifStyle}>full mock</span>.
      </h1>
      {/* Phase 15 Ship A.4: lead paragraph restored to match the approved hybrid preview. */}
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--c-text-secondary)",
          maxWidth: "58ch",
        }}
      >
        Full-length IPMAT mocks under exam conditions. Build endurance, refine
        timing, and see how you stack up before the real thing.
      </p>

      {/* ===== Hero grid: Countdown (always) + Continue (when available).
           Phase 15 Ship A.4: countdown is always rendered so the hybrid layout
           stays consistent — empty state shows when there's no upcoming mock. ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: continueCard ? "1.3fr 1fr" : "1fr",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {/* Countdown card */}
        {countdown && nextMock && (
          <div
            style={{
              background:
                "var(--c-mock-banner)",
              color: "var(--c-mock-banner-text)",
              border: "1px solid var(--c-mock-banner-line)",
              borderRadius: 16,
              padding: "18px 20px",
              position: "relative",
              overflow: "hidden",
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
                  "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)" /* soft sheen on the gold banner — intentional, both themes */,
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--c-mock-banner-soft)",
                marginBottom: 6,
                position: "relative",
              }}
            >
              Next mock
            </div>
            <div
              style={{
                margin: "0 0 6px",
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                position: "relative",
              }}
            >
              {nextMock.test.title}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, position: "relative" }}>
              Opens {format(nextMock.startsAt, "EEE d MMM")}
              {nextMock.test.config?.timeout
                ? ` · ${formatMinutes(nextMock.test.config.timeout)}`
                : ""}
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 14,
                position: "relative",
              }}
            >
              <CountdownUnit value={countdown.days} label="days" />
              <CountdownUnit value={countdown.hours} label="hours" />
              <CountdownUnit value={countdown.minutes} label="min" />
            </div>
          </div>
        )}

        {/* Phase 15 Ship A.4: empty state when no upcoming mock — keeps the layout consistent */}
        {!(countdown && nextMock) && (
          <div
            style={{
              background:
                "var(--c-mock-banner)",
              color: "var(--c-mock-banner-text)",
              border: "1px solid var(--c-mock-banner-line)",
              borderRadius: 16,
              padding: "18px 20px",
              position: "relative",
              overflow: "hidden",
              opacity: 0.96,
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
                  "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)" /* soft sheen on the gold banner — intentional, both themes */,
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--c-mock-banner-soft)",
                marginBottom: 6,
                position: "relative",
              }}
            >
              {liveMock ? "Live now" : "Next mock"}
            </div>
            <div
              style={{
                margin: "0 0 6px",
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                position: "relative",
              }}
            >
              {liveMock ? liveMock.test.title + " is live" : "No upcoming mocks scheduled"}
            </div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
                position: "relative",
                lineHeight: 1.4,
              }}
            >
              {liveMock
                ? "Open now - closes " + format(liveMock.endsAt, "EEE d MMM, h:mm a") + ". Find it in the list below and attempt it."
                : "New mocks open weekly during exam season. Check back soon, or take an available one below."}
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 14,
                position: "relative",
                opacity: 0.55,
              }}
            >
              <CountdownUnit value={0} label="days" />
              <CountdownUnit value={0} label="hours" />
              <CountdownUnit value={0} label="min" />
            </div>
          </div>
        )}

        {/* Continue card */}
        {continueCard && (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ ...eyebrowStyle, fontSize: 10.5, marginBottom: 6 }}>
                Continue
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--c-text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {continueCard.test.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--c-text-tertiary)",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                Attempted{" "}
                {continueCard.play.created_at
                  ? formatDistanceToNowStrict(
                      parseISO(continueCard.play.created_at),
                    ) + " ago"
                  : ""}
                {typeof continueCard.play.score === "number" && (
                  <>
                    <br />
                    Scored {continueCard.play.score}
                  </>
                )}
              </div>
            </div>
            <Link
              href={`/mock/result/${continueCard.play.uid}`}
              target="_blank"
              style={{
                height: 34,
                padding: "0 14px",
                borderRadius: 999,
                background: "var(--c-brand-primary)",
                color: "var(--c-text-on-brand)",
                border: "none",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                alignSelf: "flex-start",
                marginTop: 14,
                textDecoration: "none",
              }}
            >
              View result <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* ===== "Next 7 days" calendar strip — always rendered (Phase 15 Ship A.4 restored from A.1). ===== */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--c-text-tertiary)",
          margin: "4px 0 10px",
        }}
      >
        Next 7 days
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          marginBottom: 22,
        }}
      >
        {week.map((d, i) => {
          const hasMock = d.marks.length > 0;
          return (
            <div
              key={i}
              style={{
                background: hasMock
                  ? "var(--c-brand-gold-tint)"
                  : "var(--c-surface)",
                border: `1px solid ${
                  hasMock ? "var(--c-brand-primary)" : "var(--c-border-faint)"
                }`,
                borderRadius: 10,
                padding: "10px 6px",
                textAlign: "center",
                boxShadow: d.isToday
                  ? "0 0 0 2px var(--c-bg), 0 0 0 4px var(--c-brand-primary)"
                  : "none",
                minHeight: 64,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--c-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {d.dayOfWeek}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: hasMock
                    ? "var(--c-brand-primary)"
                    : "var(--c-text-primary)",
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.dayNum}
              </div>
              {d.isToday && (
                <div
                  style={{
                    fontSize: 9.5,
                    color: "var(--c-brand-primary)",
                    marginTop: 3,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  Today
                </div>
              )}
              {!d.isToday && hasMock && (
                <div
                  style={{
                    fontSize: 9.5,
                    color: "var(--c-brand-primary)",
                    marginTop: 3,
                    fontWeight: 600,
                    lineHeight: 1.15,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.marks[0].title?.replace(/^IPMAT Full /, "")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== 4 stat tiles ===== */}
      <div
        className="mock-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <StatTile
          label="Attempted"
          value={stats.attempted}
          unit={`/${stats.total}`}
          foot={
            stats.total > 0
              ? `${Math.round((stats.attempted / stats.total) * 100)}% complete`
              : "—"
          }
        />
        <StatTile
          label="Best score"
          value={stats.best ?? "—"}
          unit=""
          foot={stats.best != null ? "across attempts" : "no attempts yet"}
        />
        <StatTile
          label="Avg score"
          value={stats.avg ?? "—"}
          unit=""
          foot={
            stats.avg != null
              ? `over ${results.length} attempt${results.length === 1 ? "" : "s"}`
              : "no attempts yet"
          }
        />
        <StatTile
          label="Time spent"
          value={
            stats.timeSpentSecs > 0
              ? Math.round((stats.timeSpentSecs / 3600) * 10) / 10
              : "—"
          }
          unit={stats.timeSpentSecs > 0 ? "h" : ""}
          foot={stats.timeSpentSecs > 0 ? "approx" : "no attempts yet"}
        />
      </div>

      {/* ===== Underline category tabs ===== */}
      <div
        className="scrollbar-hide"
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          borderBottom: "1px solid var(--c-border-faint)",
          overflowX: "auto",
        }}
      >
        {categories &&
          categories.map((c, idx) => {
            const isActive = idx === activeCategory;
            const count = visibleTests.filter(
              (t) => t.category === c.id,
            ).length;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(idx)}
                style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive
                    ? "var(--c-brand-primary)"
                    : "var(--c-text-tertiary)",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${
                    isActive ? "var(--c-brand-primary)" : "transparent"
                  }`,
                  marginBottom: -1,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {c.title}
                <span
                  style={{
                    background: isActive
                      ? "var(--c-brand-gold-tint)"
                      : "var(--c-surface-sunken, var(--c-surface-muted))",
                    color: isActive
                      ? "var(--c-brand-primary)"
                      : "var(--c-text-tertiary)",
                    borderRadius: 999,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 500,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        {isAdmin &&
          categories &&
          allCategories
            ?.filter((c) => !categories.some((x) => x.id === c.id))
            ?.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--c-text-tertiary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: 0.7,
                  flexShrink: 0,
                }}
              >
                <Lock size={12} />
                {c.title}
              </div>
            ))}
      </div>

      {/* ===== Mock rows ===== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 6, opacity: 0 }}
          transition={{ duration: 0.2, type: "tween" }}
        >
          {filteredCategoryTests.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--c-border-soft)",
                borderRadius: 14,
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--c-text-tertiary)",
                fontSize: 13,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--c-text-secondary)",
                  marginBottom: 4,
                }}
              >
                No mocks in this category yet
              </div>
              <div>New mocks will appear here soon.</div>
            </div>
          ) : (
            // Consistency sweep (preview section 2): one card container,
            // rows divided by faint borders — icon tile / meta / chip / action.
            <div
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border-faint)",
                borderRadius: 16,
                boxShadow: "var(--c-shadow-xs)",
                overflow: "hidden",
              }}
            >
              {filteredCategoryTests.map((test, idx) => {
                const status = resolveMockStatus(test, results);
                // Phase 20.2: respect config.public_access for demo users too.
                // Previous logic (`isDemo ? idx > 0`) only ever unlocked the first
                // test in the list and ignored the admin's "Public access" toggle,
                // so a mock marked free-for-demo still rendered locked.
                const isPublic = test.config?.public_access === true;
                const isLockedByEnrollment = isDemo
                  ? !isPublic
                  : !isPublic &&
                    !enrolled?.some(
                      (e) =>
                        e?.course?.id === test.course ||
                        test.config?.courses?.includes(e?.course?.id),
                    );
                const isHidden = !!test.config?.hidden;
                return (
                  <MockRow
                    key={test.id}
                    test={test}
                    index={idx + 1}
                    isLast={idx === filteredCategoryTests.length - 1}
                    status={status}
                    locked={isLockedByEnrollment && !isAdmin}
                    isAdmin={isAdmin}
                    isHidden={isHidden}
                    onDelete={() => deleteTest(test.id)}
                    onToggleVisibility={() => toggleVisibility(test.id, isHidden)}
                    openAttempts={() => setActiveResult(test.id)}
                  />
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// CountdownUnit subcomponent
// ============================================================

function CountdownUnit({ value, label }) {
  return (
    <div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--c-mock-banner-soft)",
          marginTop: 4,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ============================================================
// StatTile subcomponent
// ============================================================

function StatTile({ label, value, unit, foot }) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 14,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          color: "var(--c-text-tertiary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--c-text-primary)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 13,
              color: "var(--c-text-tertiary)",
              marginLeft: 2,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--c-text-tertiary)",
          marginTop: 6,
        }}
      >
        {foot}
      </div>
    </div>
  );
}

// ============================================================
// MockRow subcomponent
// ============================================================

function MockRow({
  test,
  index,
  isLast,
  status,
  locked,
  isAdmin,
  isHidden,
  onDelete,
  onToggleVisibility,
  openAttempts,
}) {
  const duration = formatMinutes(test.config?.timeout);
  const diff = difficultyLabel(test.config?.difficulty);
  const sectionsCount = test.config?.sections?.length;
  const scheduledDate = test.start_time
    ? format(parseISO(test.start_time), "d MMM")
    : null;

  // Icon tile — clock (window open, gold) / check (attempted, success)
  // / lock (upcoming, closed or enrollment-locked, muted).
  let tile;
  if (status.kind === "attempted") {
    tile = {
      bg: "var(--c-success-soft)",
      fg: "var(--c-success)",
      icon: (
        <Ic size={15}>
          <path d="M4 12.5l5 5L20 6.5" />
        </Ic>
      ),
    };
  } else if (!locked && (status.kind === "live" || status.kind === "available")) {
    tile = {
      bg: "var(--c-brand-gold-tint)",
      fg: "var(--c-brand-gold)",
      icon: (
        <Ic size={16}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </Ic>
      ),
    };
  } else {
    tile = {
      bg: "var(--c-surface-sunken, var(--c-surface-muted))",
      fg: "var(--c-text-tertiary)",
      icon: (
        <Ic size={15}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </Ic>
      ),
    };
  }

  let pill = null;
  if (status.kind === "live" || status.kind === "available") {
    pill = {
      label: status.kind === "live" ? "Window open" : "Available now",
      bg: "var(--c-success-soft)",
      fg: "var(--c-success)",
    };
  } else if (status.kind === "upcoming") {
    pill = {
      label: "Upcoming",
      bg: "var(--c-surface-sunken, var(--c-surface-muted))",
      fg: "var(--c-text-tertiary)",
    };
  } else if (status.kind === "closed") {
    pill = {
      label: "Closed",
      bg: "var(--c-surface-sunken, var(--c-surface-muted))",
      fg: "var(--c-text-tertiary)",
    };
  }
  // Attempted rows carry their story in the meta line (preview grammar);
  // no status chip needed.

  let action = null;
  if (locked) {
    action = (
      <button
        onClick={() => toast.success("Please contact us to unlock.")}
        style={{
          height: 34,
          padding: "0 16px",
          borderRadius: 999,
          background: "transparent",
          border: "1px solid var(--c-border-soft)",
          color: "var(--c-text-secondary)",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Lock size={13} /> Unlock
      </button>
    );
  } else if (status.kind === "attempted") {
    // Ghost review action — links to the latest result (unchanged route).
    action = (
      <Link
        href={`/mock/result/${status.latestPlay.uid}`}
        target="_blank"
        style={{
          height: 34,
          padding: "0 16px",
          borderRadius: 999,
          background: "transparent",
          border: "1px solid var(--c-border-soft)",
          color: "var(--c-brand-gold)",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          flexShrink: 0,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Review →
      </Link>
    );
  } else if (status.kind === "live" || status.kind === "available") {
    // Gold attempt action (unchanged route).
    action = (
      <Link
        href={`/mock/${test.uid}`}
        target="_blank"
        style={{
          height: 34,
          padding: "0 16px",
          borderRadius: 999,
          background: "var(--c-brand-gold)",
          color: "var(--c-text-on-brand)",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          flexShrink: 0,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Attempt →
      </Link>
    );
  } else if (status.kind === "upcoming") {
    action = (
      <button
        onClick={() => toast.success("We'll notify you when it opens.")}
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 999,
          background: "transparent",
          border: "1px solid var(--c-border-soft)",
          color: "var(--c-text-secondary)",
          fontSize: 12.5,
          fontWeight: 500,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Bell size={14} /> Notify me
      </button>
    );
  } else {
    action = (
      <span
        style={{
          fontSize: 12.5,
          color: "var(--c-text-tertiary)",
          flexShrink: 0,
        }}
      >
        Test time has passed
      </span>
    );
  }

  // Meta line — preview grammar: real data only (no total marks or rank
  // available on this table, so those preview fields are skipped).
  const metaParts = [];
  if (status.kind === "attempted") {
    if (status.latestPlay?.created_at) {
      metaParts.push(`Attempted ${format(parseISO(status.latestPlay.created_at), "d MMM")}`);
    } else {
      metaParts.push("Attempted");
    }
    if (typeof status.latestPlay?.score === "number") {
      metaParts.push(`scored ${status.latestPlay.score}`);
    }
    if (status.attempts > 1) metaParts.push(`${status.attempts} attempts`);
  } else {
    if (duration !== "—") metaParts.push(duration);
    if (sectionsCount) metaParts.push(`${sectionsCount} sections`);
    if (diff) metaParts.push(diff);
    if (status.kind === "live" && test.end_time) {
      metaParts.push(`closes ${format(parseISO(test.end_time), "EEE d MMM, h:mm a")}`);
    } else if (status.kind === "upcoming") {
      metaParts.push(`opens ${format(status.opensAt, "EEE d MMM, h:mm a")}`);
    } else if (scheduledDate) {
      metaParts.push(scheduledDate);
    }
  }

  return (
    <div
      className="mock-row"
      style={{
        padding: "13px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--c-border-faint)",
        display: "flex",
        alignItems: "center",
        gap: 13,
        opacity: status.kind === "upcoming" || status.kind === "closed" ? 0.7 : 1,
      }}
    >
      {/* Status icon tile */}
      <div
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          background: tile.bg,
          color: tile.fg,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
        }}
      >
        {tile.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: "var(--c-text-primary)",
              letterSpacing: "-0.005em",
            }}
          >
            {test.title}
          </div>
          {isAdmin && isHidden && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--c-warning-soft)",
                color: "var(--c-warning)",
              }}
            >
              HIDDEN
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--c-text-tertiary)",
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {metaParts.join(" · ")}
        </div>
      </div>

      {pill && (
        <div
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 999,
            background: pill.bg,
            color: pill.fg,
            whiteSpace: "nowrap",
          }}
        >
          {pill.label}
        </div>
      )}

      {isAdmin && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={onToggleVisibility}
            title={isHidden ? "Show to students" : "Hide from students"}
            style={iconBtn}
          >
            {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <Link
            href={`/mock/${test.uid}?preview=true`}
            target="_blank"
            title="Preview test"
            style={{ ...iconBtn, textDecoration: "none" }}
          >
            <Play size={14} />
          </Link>
          <button onClick={onDelete} title="Delete test" style={iconBtn}>
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {action}
    </div>
  );
}
