// ============================================================
// Sectional Tests — Phase 14 Ship A: Strength dashboard redesign
// - Hero greeting + serif accent
// - Continue card from last play (last 14 days)
// - 3 per-section strength tiles (tests done / total + progress bar)
// - Brand-aligned underline tabs (replaces purple gradient)
// - Test cards with status pill + duration + difficulty + score badge
// - Admin controls preserved (hide/show, delete, preview)
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useNMNContext } from "./NMNContext";
import { AnimatePresence, motion } from "framer-motion";
import { CtoLocal } from "@/utils/DateUtil";
import {
  isAfter,
  isBefore,
  addDays,
  parseISO,
  format,
  endOfDay,
  formatDistanceToNowStrict,
} from "date-fns";
import {
  Lock,
  Trash2,
  ChartBarIncreasing,
  ChartSpline,
  Eye,
  EyeOff,
  Play,
  ArrowRight,
  Clock,
  Bell,
} from "lucide-react";

// NextUI Modal type-fix
const AnyModal = Modal as any;

const SECTIONS = [
  { key: "QA", title: "Quant", full: "Quantitative Aptitude" },
  { key: "VA", title: "Verbal", full: "Verbal Ability" },
  { key: "LR", title: "Logical", full: "Logical Reasoning" },
];

// ============================================================
// Helpers
// ============================================================

function formatMinutes(seconds?: number) {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function difficultyLabel(d?: string) {
  if (!d) return null;
  const s = String(d).trim().toLowerCase();
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Resolves the visible status for one test based on time windows + plays
type TestStatus =
  | { kind: "attempted"; latestPlay: any; attempts: number }
  | { kind: "live" }
  | { kind: "upcoming"; opensAt: Date }
  | { kind: "closed" }
  | { kind: "available" };

function resolveStatus(test: any, plays: any[]): TestStatus {
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
  if (isAfter(now, addDays(startTime, 1)) && !test.end_time) {
    return { kind: "closed" };
  }
  return { kind: "live" };
}

// ============================================================
// Style tokens
// ============================================================

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--c-text-tertiary)",
};
const serifStyle: React.CSSProperties = {
  fontFamily: "'Instrument Serif', serif",
  fontStyle: "italic",
  fontWeight: 400,
  color: "var(--c-brand-primary)",
};

// ============================================================
// MAIN
// ============================================================

const SectionalTest = ({
  enrolled = [],
  role = "user",
}: {
  enrolled?: any[];
  role?: string;
}) => {
  const ctx = useNMNContext() as any;
  const isDemo = ctx?.isDemo;
  const userDetails = ctx?.userDetails;
  const isAdmin = role === "admin";

  const [tests, setTests] = useState<any[]>([]);
  const [allTests, setAllTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [results, setResults] = useState<any[]>([]); // user's own plays
  const [activeResult, setActiveResult] = useState<number | undefined>(undefined);

  // ============================================================
  // Data fetching
  // ============================================================

  async function loadTests() {
    const { data } = await supabase
      .from("mock_test")
      .select(
        "id, title, description, category, course, seq, start_time, end_time, uid, config",
      )
      .order("seq", { ascending: true });
    if (data) {
      const sectional = data.filter(
        (t: any) => t.config?.generatorType === "sectional",
      );
      setTests(sectional);
    }
    const { data: allData } = await supabase
      .from("mock_test_view")
      .select(
        "id, title, description, category, course, seq, start_time, end_time, uid, config",
      )
      .order("seq", { ascending: true });
    if (allData) {
      const sectionalAll = allData.filter(
        (t: any) => t.config?.generatorType === "sectional",
      );
      setAllTests(sectionalAll);
    }
    setLoading(false);
  }

  // Phase 14: load ONLY the current user's plays (was: all plays in bulk loops — slow + privacy-leaky)
  async function loadResults() {
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

  async function deleteTest(testId: number) {
    if (!confirm("Are you sure you want to delete this test? This cannot be undone.")) return;
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
        loadTests();
      } else {
        toast.error(data.error || "Failed to delete test");
        toast.dismiss(loadingToast);
      }
    } catch (e) {
      toast.error("Failed to delete test");
      toast.dismiss(loadingToast);
    }
  }

  async function toggleVisibility(testId: number, currentlyHidden: boolean) {
    const loadingToast = toast.loading(
      currentlyHidden ? "Showing test..." : "Hiding test...",
    );
    try {
      const test =
        tests.find((t: any) => t.id === testId) ||
        allTests.find((t: any) => t.id === testId);
      const newConfig = { ...(test?.config || {}), hidden: !currentlyHidden };
      const { error } = await supabase
        .from("mock_test")
        .update({ config: newConfig })
        .eq("id", testId);
      if (error) {
        toast.error("Failed to update test visibility");
      } else {
        toast.success(
          currentlyHidden ? "Test is now visible" : "Test is now hidden",
        );
        loadTests();
      }
    } catch (e) {
      toast.error("Failed to update test visibility");
    }
    toast.dismiss(loadingToast);
  }

  useEffect(() => {
    loadTests();
  }, []);
  useEffect(() => {
    loadResults();
  }, [userDetails?.email]);

  // ============================================================
  // Derived data
  // ============================================================

  // Combine tests + allTests, dedup by id, grouped by section
  const allBySection = useMemo(() => {
    const map: Record<string, any[]> = { QA: [], VA: [], LR: [] };
    const seen = new Set<number>();
    const collect = (arr: any[]) => {
      arr.forEach((t) => {
        const k = t.config?.targetSection;
        if (!k || !map[k]) return;
        if (seen.has(t.id)) return;
        seen.add(t.id);
        map[k].push(t);
      });
    };
    collect(tests);
    collect(allTests);
    return map;
  }, [tests, allTests]);

  // Per-section attempted vs total
  const perSectionStats = useMemo(() => {
    const stats: Record<string, { attempted: number; total: number }> = {
      QA: { attempted: 0, total: 0 },
      VA: { attempted: 0, total: 0 },
      LR: { attempted: 0, total: 0 },
    };
    const playedIds = new Set(results.map((r) => r.test_id));
    SECTIONS.forEach((s) => {
      const sectionTests = allBySection[s.key] || [];
      const visible = sectionTests.filter(
        (t: any) => isAdmin || !t.config?.hidden,
      );
      stats[s.key].total = visible.length;
      stats[s.key].attempted = visible.filter((t: any) =>
        playedIds.has(t.id),
      ).length;
    });
    return stats;
  }, [allBySection, results, isAdmin]);

  // Continue card: last play in past 14 days, if test still exists
  const continueCard = useMemo(() => {
    if (!results.length) return null;
    const cutoff = addDays(new Date(), -14);
    const recent = results.find((r) => {
      const at = r?.created_at ? parseISO(r.created_at) : null;
      return at && isAfter(at, cutoff);
    });
    if (!recent) return null;
    const combined = [...tests, ...allTests];
    const seen = new Set<number>();
    const dedup: any[] = [];
    combined.forEach((t) => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        dedup.push(t);
      }
    });
    const test = dedup.find((t: any) => t.id === recent.test_id);
    if (!test) return null;
    return { test, play: recent };
  }, [results, tests, allTests]);

  const studentFirstName = useMemo(() => {
    const full = userDetails?.user_metadata?.full_name || "";
    return full.split(" ")[0] || "there";
  }, [userDetails]);

  const currentSection = SECTIONS[activeSection];
  const filteredTests = (allBySection[currentSection.key] || []).filter(
    (t: any) => isAdmin || !t.config?.hidden,
  );

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          width: "100%",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid var(--c-border-faint)",
            borderTopColor: "var(--c-brand-primary)",
            animation: "ipm-sectional-spin 0.8s linear infinite",
          }}
        />
        <style jsx global>{`
          @keyframes ipm-sectional-spin { to { transform: rotate(360deg); } }
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
        textAlign: "left", // Phase 14 Ship A.2: parent container in pages/index.js applies text-align: center, override here
      }}
    >
      {/* ===== Attempts modal (kept for legacy "View attempts" flow) ===== */}
      <AnyModal
        isOpen={!!activeResult}
        onClose={() => setActiveResult(undefined)}
      >
        <ModalContent>
          <ModalHeader>Your attempts</ModalHeader>
          <ModalBody>
            {results
              .filter((item: any) => item.test_id === activeResult)
              .map((i: any) => (
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
                      <ChartSpline size={14} /> Analytics
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
      </AnyModal>

      {/* ===== Hero greeting ===== */}
      <div style={{ ...eyebrow, marginBottom: 8 }}>
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
        Train one <span style={serifStyle}>section</span> at a time.
      </h1>
      <p
        style={{
          margin: "0 0 22px",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--c-text-secondary)",
          maxWidth: "58ch",
        }}
      >
        Short focused tests for each IPMAT section. Build accuracy where you
        need it most before you sit the full mock.
      </p>

      {/* ===== Continue card ===== */}
      {continueCard && (
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--c-brand-soft, rgba(199, 57, 47, 0.08))",
              display: "grid",
              placeItems: "center",
              color: "var(--c-brand-primary)",
              flexShrink: 0,
            }}
          >
            <Play size={20} fill="currentColor" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...eyebrow, fontSize: 10.5, marginBottom: 4 }}>
              Continue
            </div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: "var(--c-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {continueCard.test.title}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--c-text-tertiary)",
                marginTop: 2,
              }}
            >
              Attempted{" "}
              {continueCard.play.created_at
                ? formatDistanceToNowStrict(parseISO(continueCard.play.created_at)) + " ago"
                : ""}
              {typeof continueCard.play.score === "number" &&
                ` · score ${continueCard.play.score}`}
            </div>
          </div>
          <Link
            href={`/mock/result/${continueCard.play.uid}`}
            target="_blank"
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 999,
              background: "var(--c-brand-primary)",
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            View result <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ===== Strength tiles ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 22,
        }}
      >
        {SECTIONS.map((s) => {
          const stat = perSectionStats[s.key];
          const pct =
            stat.total > 0 ? Math.round((stat.attempted / stat.total) * 100) : 0;
          let barColor = "var(--c-brand-primary)";
          if (pct >= 75) barColor = "var(--c-success, #1A7F4E)";
          else if (pct >= 50) barColor = "var(--c-warning, #B66C00)";
          return (
            <div
              key={s.key}
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border-faint)",
                borderRadius: 14,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "var(--c-text-tertiary)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.title}
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
                  {stat.attempted}
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--c-text-tertiary)",
                      marginLeft: 2,
                    }}
                  >
                    /{stat.total}
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 4,
                  background: "var(--c-surface-sunken, var(--c-surface-muted))",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: barColor,
                    borderRadius: 999,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--c-text-tertiary)",
                  marginTop: 6,
                }}
              >
                {stat.total === 0
                  ? "No tests yet"
                  : stat.attempted === 0
                  ? "Not started"
                  : `${pct}% complete`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Underline tabs ===== */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          borderBottom: "1px solid var(--c-border-faint)",
        }}
      >
        {SECTIONS.map((s, idx) => {
          const isActive = idx === activeSection;
          const stat = perSectionStats[s.key];
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(idx)}
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
              }}
            >
              {s.title}
              <span
                style={{
                  background: isActive
                    ? "var(--c-brand-soft, rgba(199, 57, 47, 0.08))"
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
                {stat.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== Test cards ===== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 6, opacity: 0 }}
          transition={{ duration: 0.2, type: "tween" }}
        >
          {filteredTests.length === 0 ? (
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
                No tests in {currentSection.full} yet
              </div>
              <div>New tests will appear here soon.</div>
            </div>
          ) : (
            filteredTests.map((test: any, idx: number) => {
              const status = resolveStatus(test, results);
              const isLockedByEnrollment = isDemo
                ? idx > 0
                : test.config?.public_access !== true &&
                  !enrolled?.some(
                    (enrollment: any) =>
                      enrollment?.course?.id === test.course ||
                      test.config?.courses?.includes(enrollment?.course?.id),
                  );
              const isHidden = !!test.config?.hidden;
              return (
                <TestRow
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
};

// ============================================================
// TestRow
// ============================================================

function TestRow({
  test,
  index,
  status,
  locked,
  isAdmin,
  isHidden,
  onDelete,
  onToggleVisibility,
  openAttempts,
}: {
  test: any;
  index: number;
  status: TestStatus;
  locked: boolean;
  isAdmin: boolean;
  isHidden: boolean;
  onDelete: () => void;
  onToggleVisibility: () => void;
  openAttempts: () => void;
}) {
  const duration = formatMinutes(test.config?.timeout);
  const diff = difficultyLabel(test.config?.difficulty);

  // Status pill
  let pill: { label: string; bg: string; fg: string } | null = null;
  if (status.kind === "attempted") {
    pill = {
      label: status.attempts > 1 ? `${status.attempts} attempts` : "Attempted",
      bg: "var(--c-success-soft, #E4F2EA)",
      fg: "var(--c-success, #1A7F4E)",
    };
  } else if (status.kind === "live" || status.kind === "available") {
    pill = {
      label: "Available now",
      bg: "var(--c-brand-soft, rgba(199, 57, 47, 0.08))",
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

  // Primary action
  let action: React.ReactNode = null;
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
    // Phase 14 Ship A.2: sectional tests are single-shot — link to latest result, not reattempt
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
        <ChartBarIncreasing size={14} /> View Result
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
      {/* Index pill */}
      <div
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          background: "var(--c-surface-sunken, var(--c-surface-muted))",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--c-text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(index).padStart(2, "0")}
      </div>

      {/* Info */}
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Clock size={12} /> {duration}
          </span>
          {diff && <span>{diff}</span>}
          {test.description && (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 280,
              }}
            >
              {test.description}
            </span>
          )}
        </div>
      </div>

      {/* Score if attempted */}
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

      {/* Admin controls */}
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

      {/* Primary action */}
      {action}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
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

export default SectionalTest;
