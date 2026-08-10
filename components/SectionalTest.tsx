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

// Small stroked icon wrapper — same drawn-SVG grammar as the D2 dashboard.
function Ic({ size = 16, children }: { size?: number; children: React.ReactNode }) {
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

// Resolves the visible status for one test based on time windows + plays
type TestStatus =
  | { kind: "attempted"; latestPlay: any; attempts: number; bestScore: number | null }
  | { kind: "live" }
  | { kind: "upcoming"; opensAt: Date }
  | { kind: "closed" }
  | { kind: "available" };

function resolveStatus(test: any, plays: any[]): TestStatus {
  const myPlays = plays?.filter((p) => p.test_id === test.id) || [];
  if (myPlays.length > 0) {
    // Best score across all attempts — surfaced in the meta line.
    const scores = myPlays
      .map((p) => (typeof p.score === "number" ? p.score : null))
      .filter((s): s is number => s !== null);
    return {
      kind: "attempted",
      latestPlay: myPlays[0],
      attempts: myPlays.length,
      bestScore: scores.length ? Math.max(...scores) : null,
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
  fontFamily: "var(--font-accent)",
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
        Train one <span className="ds-grad-text" style={serifStyle}>section</span> at a time.
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
              background: "var(--c-brand-gold-tint)",
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
              color: "var(--c-text-on-brand)",
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
          if (pct >= 75) barColor = "var(--c-success)";
          else if (pct >= 50) barColor = "var(--c-warning)";
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
            // Consistency sweep (preview section 2): one card container per
            // section tab, rows divided by faint borders.
            <div
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border-faint)",
                borderRadius: 16,
                boxShadow: "var(--c-shadow-xs)",
                overflow: "hidden",
              }}
            >
              {filteredTests.map((test: any, idx: number) => {
                const status = resolveStatus(test, results);
                // Phase 20.2: respect config.public_access for demo users too.
                // Previous logic (`isDemo ? idx > 0`) only ever unlocked the first
                // test and ignored the admin's "Public access" toggle, so a test
                // marked free-for-demo still rendered locked.
                const isPublic = test.config?.public_access === true;
                const isLockedByEnrollment = isDemo
                  ? !isPublic
                  : !isPublic &&
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
                    isLast={idx === filteredTests.length - 1}
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
};

// ============================================================
// TestRow
// ============================================================

function TestRow({
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
}: {
  test: any;
  index: number;
  isLast: boolean;
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

  // Icon tile — clock (open, gold) / check (attempted, success) /
  // lock (upcoming, closed or enrollment-locked, muted).
  let tile: { bg: string; fg: string; icon: React.ReactNode };
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

  // Status pill — attempted rows carry their story in the meta line instead.
  let pill: { label: string; bg: string; fg: string } | null = null;
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

  // Primary action
  let action: React.ReactNode = null;
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
    // Phase 14 Ship A.2: sectional tests are single-shot — link to latest result, not reattempt
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

  // Meta line — preview grammar, real data only. Best score surfaces here
  // when the student has attempted the test.
  const metaParts: string[] = [];
  if (status.kind === "attempted") {
    if (status.latestPlay?.created_at) {
      metaParts.push(`Attempted ${format(parseISO(status.latestPlay.created_at), "d MMM")}`);
    } else {
      metaParts.push("Attempted");
    }
    if (status.bestScore !== null) metaParts.push(`best ${status.bestScore}`);
    if (status.attempts > 1) metaParts.push(`${status.attempts} attempts`);
  } else {
    if (duration !== "—") metaParts.push(duration);
    if (diff) metaParts.push(diff);
    if (status.kind === "upcoming") {
      metaParts.push(`opens ${format(status.opensAt, "EEE d MMM")}`);
    } else if (status.kind === "live" && test.end_time) {
      metaParts.push(`closes ${format(parseISO(test.end_time), "EEE d MMM, h:mm a")}`);
    } else if (test.description) {
      metaParts.push(test.description);
    }
  }

  return (
    <div
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
