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
  Clock,
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
  fontFamily: "'Instrument Serif', serif",
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

  async function getCategories() {
    const { data } = await supabase
      .from("mock_categories")
      .select("id, title, seq")
      .order("seq", { ascending: true });
    if (data) setCategories(data);
  }

  async function getAllCategories() {
    const { data } = await supabase
      .from("mock_categories")
      .select("id, title, seq")
      .order("seq", { ascending: true });
    if (data) setAllCategories(data);
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
    const timeSpentSecs = results.reduce((sum, r) => {
      const t = visibleTests.find((x) => x.id === r.test_id);
      const dur = t?.config?.timeout || 0;
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
        overflow: "auto",
        fontFamily: FONT,
        padding: "24px 28px 36px",
        color: "var(--c-text-primary)",
        textAlign: "left",
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
                        color: "#fff",
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
        Sit a <span style={serifStyle}>full mock</span>.
      </h1>
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

      {/* ===== Hero grid: Countdown + Continue ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {/* Countdown card */}
        {countdown && nextMock ? (
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--c-brand-primary) 0%, #8c2620 100%)",
              color: "#fff",
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
                  "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)",
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
                color: "rgba(255,255,255,0.7)",
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
        ) : (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 16,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <div style={{ ...eyebrowStyle, fontSize: 10.5, marginBottom: 6 }}>
              All caught up
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "var(--c-text-primary)",
                letterSpacing: "-0.015em",
              }}
            >
              No mocks scheduled right now.
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--c-text-tertiary)",
                marginTop: 4,
              }}
            >
              Check back soon — new mocks open weekly during exam season.
            </div>
          </div>
        )}

        {/* Continue card */}
        {continueCard ? (
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
                color: "#fff",
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
        ) : (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <div style={{ ...eyebrowStyle, fontSize: 10.5, marginBottom: 6 }}>
              Continue
            </div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: "var(--c-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              No mocks attempted yet.
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--c-text-tertiary)",
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              Start with Mock 01 once it&apos;s available.
            </div>
          </div>
        )}
      </div>

      {/* ===== "Next 7 days" calendar strip ===== */}
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
                  ? "var(--c-brand-soft, rgba(199,57,47,0.08))"
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
                      ? "var(--c-brand-soft, rgba(199,57,47,0.08))"
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
            filteredCategoryTests.map((test, idx) => {
              const status = resolveMockStatus(test, results);
              const isLockedByEnrollment = isDemo
                ? idx > 0
                : test.config?.public_access !== true &&
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
                  status={status}
                  locked={isLockedByEnrollment && !isAdmin}
                  isAdmin={isAdmin}
                  isHidden={isHidden}
                  onDelete={() => deleteTest(test.id)}
                  onToggleVisibility={() => toggleVisibility(test.id, isHidden)}
                  openAttempts={() => setActiveResult(test.id)}
                />
              );
            })
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
          color: "rgba(255,255,255,0.7)",
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

  let pill = null;
  if (status.kind === "attempted") {
    pill = {
      label: status.attempts > 1 ? `${status.attempts} attempts` : "Attempted",
      bg: "var(--c-success-soft, #E4F2EA)",
      fg: "var(--c-success, #1A7F4E)",
    };
  } else if (status.kind === "live" || status.kind === "available") {
    pill = {
      label: "Available now",
      bg: "var(--c-brand-soft, rgba(199,57,47,0.08))",
      fg: "var(--c-brand-primary)",
    };
  } else if (status.kind === "upcoming") {
    pill = {
      label: `Opens ${format(status.opensAt, "d MMM")}`,
      bg: "var(--c-warning-soft, #FBEED2)",
      fg: "var(--c-warning, #B66C00)",
    };
  } else if (status.kind === "closed") {
    pill = {
      label: "Closed",
      bg: "var(--c-surface-sunken, var(--c-surface-muted))",
      fg: "var(--c-text-tertiary)",
    };
  }

  let action = null;
  if (locked) {
    action = (
      <button
        onClick={() => toast.success("Please contact us to unlock.")}
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
        <Lock size={14} /> Unlock
      </button>
    );
  } else if (status.kind === "attempted") {
    action = (
      <Link
        href={`/mock/result/${status.latestPlay.uid}`}
        target="_blank"
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 999,
          background: "transparent",
          border: "1px solid var(--c-success, #1A7F4E)",
          color: "var(--c-success, #1A7F4E)",
          fontSize: 12.5,
          fontWeight: 500,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          flexShrink: 0,
          textDecoration: "none",
        }}
      >
        <ChartBarIncreasing size={14} /> View result
      </Link>
    );
  } else if (status.kind === "live" || status.kind === "available") {
    action = (
      <Link
        href={`/mock/${test.uid}`}
        target="_blank"
        style={{
          height: 36,
          padding: "0 16px",
          borderRadius: 999,
          background: "var(--c-brand-primary)",
          color: "#fff",
          fontSize: 12.5,
          fontWeight: 500,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          flexShrink: 0,
          textDecoration: "none",
        }}
      >
        Start <ArrowRight size={14} />
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

  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: `1px solid ${
          isAdmin && isHidden
            ? "var(--c-warning, #B66C00)"
            : "var(--c-border-faint)"
        }`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 48,
          height: 48,
          background: "var(--c-surface-sunken, var(--c-surface-muted))",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--c-text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(index).padStart(2, "0")}
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
              fontSize: 14,
              fontWeight: 600,
              color: "var(--c-text-primary)",
              letterSpacing: "-0.005em",
            }}
          >
            {test.title}
          </div>
          {pill && (
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: 999,
                background: pill.bg,
                color: pill.fg,
              }}
            >
              {pill.label}
            </div>
          )}
          {isAdmin && isHidden && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--c-warning-soft, #FBEED2)",
                color: "var(--c-warning, #B66C00)",
              }}
            >
              HIDDEN
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            fontSize: 12.5,
            color: "var(--c-text-tertiary)",
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Clock size={12} /> {duration}
          </span>
          {sectionsCount && <span>{sectionsCount} sections</span>}
          {diff && <span>{diff}</span>}
          {scheduledDate && <span>{scheduledDate}</span>}
        </div>
      </div>

      {status.kind === "attempted" &&
        typeof status.latestPlay?.score === "number" && (
          <div
            style={{
              flexShrink: 0,
              textAlign: "right",
              padding: "0 14px 0 4px",
              borderRight: "1px solid var(--c-border-faint)",
              marginRight: 2,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--c-text-primary)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {status.latestPlay.score}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--c-text-tertiary)",
                marginTop: 4,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Score
            </div>
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
