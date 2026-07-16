// ============================================================
// ConceptTestStudent — Phase 12 Ship B
// Student-facing Concept Tests page.
// Replaces the yellow-strip accordion with a topic card grid
// using Variant C rings (gradient + italic serif).
// Admin role still uses the existing Concept component.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useNMNContext } from "@/components/NMNContext";
import { useRouter } from "next/router";
import { ArrowLeft, ChevronRight, Trophy, X } from "lucide-react";
import { CircularProgress } from "@nextui-org/react";

export default function ConceptTestStudent({ group, onBack, role }) {
  const [categories, setCategories] = useState();
  const [gamecategories, setGameCategories] = useState();
  const [testCountByMCat, setTestCountByMCat] = useState({}); // mCatId -> levels count
  const [levelsByMCat, setLevelsByMCat] = useState({});       // mCatId -> [{ id, uuid }]
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(null); // selected m_category (difficulty sub-level)
  const [levelData, setLevelData] = useState(null);
  const [plays, setPlays] = useState({}); // test_uuid -> { uid, score, isPassed }
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { userDetails } = useNMNContext();
  const router = useRouter();
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!group) return;
    (async () => {
      setLoading(true);
      // Perf round 2: one RPC round trip for the whole collection
      // tree (categories + m_categories + levels), plays in parallel.
      const playsPromise = userDetails?.email
        ? supabase.from("plays")
            .select("uid, test_uuid, score, isPassed")
            .eq("user", userDetails.email)
        : Promise.resolve({ data: [] });

      const [treeRes, playsRes] = await Promise.all([
        supabase.rpc("get_concept_tree", { p_group: group }),
        playsPromise,
      ]);
      const tree = treeRes.data || {};
      const catData = Array.isArray(tree.categories) ? tree.categories : [];
      if (catData) setCategories(catData);
      if (!catData || catData.length === 0) {
        setLoading(false);
        return;
      }

      const gcData = Array.isArray(tree.m_categories) ? tree.m_categories : [];
      setGameCategories(gcData);

      if (playsRes.data) {
        const m = {};
        playsRes.data.forEach((p) => { m[p.test_uuid] = p; });
        setPlays(m);
      }

      const levelsData = Array.isArray(tree.levels) ? tree.levels : [];
      if (levelsData.length > 0) {
        const counts = {};
        const byMCat = {};
        levelsData.forEach(l => {
          counts[l.parent] = (counts[l.parent] || 0) + 1;
          if (!byMCat[l.parent]) byMCat[l.parent] = [];
          byMCat[l.parent].push({ id: l.id, uuid: l.uuid });
        });
        setTestCountByMCat(counts);
        setLevelsByMCat(byMCat);
      }
      setLoading(false);
    })();
  }, [group, userDetails]);

  // ── Per-topic progress (memoized) ──
  const topicProgressMap = useMemo(() => {
    const map = {};
    if (!categories || !gamecategories) return map;
    categories.forEach(cat => {
      const subs = gamecategories.filter(g => g.parent === cat.id);
      let testCount = 0;
      let attemptedCount = 0;
      let passedCount = 0;
      subs.forEach(m => {
        const levels = levelsByMCat[m.id] || [];
        testCount += levels.length;
        levels.forEach(l => {
          if (l.uuid && plays[l.uuid]) {
            attemptedCount++;
            if (plays[l.uuid].isPassed) passedCount++;
          }
        });
      });
      const pct = testCount > 0 ? Math.round((attemptedCount / testCount) * 100) : 0;
      let state = "untouched";
      if (attemptedCount > 0) {
        // "Mastered" = all tests attempted (regardless of pass/fail).
        // Pass rate is a separate quality signal we surface elsewhere.
        if (attemptedCount === testCount && testCount > 0) state = "mastered";
        else state = "in-progress";
      }
      map[cat.id] = { testCount, attemptedCount, passedCount, pct, state };
    });
    return map;
  }, [categories, gamecategories, levelsByMCat, plays]);

  // ── Counts for filter pills ──
  const statusCounts = useMemo(() => {
    const c = { all: 0, untouched: 0, "in-progress": 0, mastered: 0 };
    Object.values(topicProgressMap).forEach(p => {
      c.all++;
      c[p.state]++;
    });
    return c;
  }, [topicProgressMap]);

  // ── Filtered categories ──
  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    if (statusFilter === "all") return categories;
    return categories.filter(cat => topicProgressMap[cat.id]?.state === statusFilter);
  }, [categories, statusFilter, topicProgressMap]);

  // ── Per-category mastery calculation ──
  function categoryMastery(catId) {
    if (!gamecategories) return { pct: 0, levels: [], state: "untouched" };
    const subs = gamecategories.filter((g) => g.parent === catId);
    return { levels: subs };
  }

  // ── When user clicks a topic, open drawer + fetch the levels (tests) for it ──
  async function openLevel(mCat) {
    setActiveLevel(mCat);
    setLevelData(null);
    const { data, error } = await supabase
      .from("levels")
      .select("*,questions!questions_parent_fkey(id)")
      .eq("parent", mCat.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load levels:", error);
      setLevelData([]); // empty array → drawer shows "No tests" instead of infinite spinner
      return;
    }
    setLevelData(data || []);
  }
  function closeDrawer() { setActiveLevel(null); setLevelData(null); }

  if (loading || !categories) {
    return (
      <div style={{ width: "100%", padding: 60, display: "flex", justifyContent: "center" }}>
        <CircularProgress size="sm" />
      </div>
    );
  }

  // Compute stats
  const totalTopics = categories.length;

  return (
    <div style={{ width: "100%", padding: "12px 4px 60px", textAlign: "left" }}>
      {/* ── Top action bar with Back button ── */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        <button
          onClick={() => onBack && onBack()}
          style={{
            height: 36, padding: "0 14px", borderRadius: 999,
            background: "transparent",
            color: "var(--c-text-secondary)",
            border: "1px solid var(--c-border-soft)",
            fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <ArrowLeft size={14} /> Back to collections
        </button>
      </div>

      {/* ── Hero ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--c-text-tertiary)",
          marginBottom: 10,
        }}>
          Concept tests
        </div>
        <h1 style={{
          margin: "0 0 8px",
          fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em",
          color: "var(--c-text-primary)", lineHeight: 1.15,
        }}>
          Master each topic,{" "}
          <span className="ds-grad-text" style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400 }}>
            one concept
          </span>{" "}
          at a time.
        </h1>
        <p style={{
          margin: 0, fontSize: 14.5, lineHeight: 1.55,
          color: "var(--c-text-secondary)", maxWidth: "56ch",
        }}>
          Browse topics below. Each topic has Easy / Moderate / Difficult levels — start at your level and work your way up.
        </p>
      </div>

      {/* ── Status filter bar ── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        marginBottom: 22, alignItems: "center",
        paddingBottom: 16, borderBottom: "1px solid var(--c-border-faint)",
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--c-text-tertiary)",
          marginRight: 6,
        }}>Topics</span>
        <FilterPill label="All" count={statusCounts.all} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <FilterPill label="Untouched" count={statusCounts.untouched} active={statusFilter === "untouched"} onClick={() => setStatusFilter("untouched")} />
        <FilterPill label="In progress" count={statusCounts["in-progress"]} active={statusFilter === "in-progress"} onClick={() => setStatusFilter("in-progress")} />
        <FilterPill label="Mastered" count={statusCounts.mastered} active={statusFilter === "mastered"} onClick={() => setStatusFilter("mastered")} />
      </div>

      {/* ── Empty state ── */}
      {categories.length === 0 && (
        <div style={{
          width: "100%", padding: "40px 28px", borderRadius: 16,
          background: "var(--c-surface-muted, var(--c-bg))",
          border: "1px dashed var(--c-border-soft)",
          color: "var(--c-text-tertiary)", fontSize: 14,
          textAlign: "center",
        }}>
          No topics available in this collection yet. Check back later.
        </div>
      )}

      {/* ── SVG gradients (shared by all rings) ── */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="gradPurple" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6FA8E4" />
            <stop offset="100%" stopColor="#2A6FCB" />
          </linearGradient>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#43C982" />
            <stop offset="100%" stopColor="#1FA463" />
          </linearGradient>
          <linearGradient id="gradWarn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E3A038" />
            <stop offset="100%" stopColor="#B66C00" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Topic card grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 14,
      }}>
        {visibleCategories.map((cat) => {
          const subs = gamecategories ? gamecategories.filter((g) => g.parent === cat.id) : [];
          const progress = topicProgressMap[cat.id] || { testCount: 0, attemptedCount: 0, pct: 0, state: "untouched" };
          return (
            <TopicCard
              key={cat.id}
              cat={cat}
              subs={subs}
              testCount={progress.testCount}
              attemptedCount={progress.attemptedCount}
              progressPct={progress.pct}
              progressState={progress.state}
              onOpen={() => subs.length > 0 && openLevel(subs[0])}
            />
          );
        })}
        {/* Empty filtered state */}
        {visibleCategories.length === 0 && categories.length > 0 && (
          <div style={{
            gridColumn: "1 / -1",
            padding: "32px 28px", borderRadius: 16,
            background: "var(--c-surface-muted, var(--c-bg))",
            border: "1px dashed var(--c-border-soft)",
            color: "var(--c-text-tertiary)", fontSize: 14,
            textAlign: "center",
          }}>
            No topics in this category. Try a different filter.
          </div>
        )}
      </div>

      {/* ── Drawer for level detail ── */}
      <DrawerOverlay open={!!activeLevel} onClose={closeDrawer}>
        {activeLevel && (
          <LevelDrawer
            mCat={activeLevel}
            levels={levelData}
            plays={plays}
            isAdmin={isAdmin}
            onClose={closeDrawer}
            onStart={(testUuid) => router.push(`/test/${testUuid}`)}
            onViewResult={(playUid) => router.push(`/test/result/${playUid}`)}
            onPreview={(testUuid) => router.push(`/test/${testUuid}?preview=true`)}
            userDetails={userDetails}
          />
        )}
      </DrawerOverlay>
    </div>
  );
}

// ── Topic card ──
function TopicCard({ cat, subs, testCount, attemptedCount, progressPct, progressState, onOpen }) {
  const state = progressState || "untouched";
  const pct = progressPct || 0;
  const numColor =
    state === "mastered" ? "var(--c-success)" :
    state === "in-progress" ? "var(--c-brand-primary)" :
    "var(--c-text-tertiary)";
  const ringStroke =
    state === "mastered" ? "url(#gradGreen)" :
    "url(#gradPurple)";
  const cardBg = state === "mastered"
    ? "linear-gradient(135deg, var(--c-success-soft, #E0F2E8) 0%, var(--c-surface) 100%)"
    : "var(--c-surface)";
  const cardBorder =
    state === "mastered" ? "var(--c-success)" :
    state === "in-progress" ? "var(--c-brand-primary-soft)" :
    "var(--c-border-faint)";
  const hasContent = subs && subs.length > 0;
  const displayCount = testCount > 0 ? testCount : subs.length;

  return (
    <button
      onClick={onOpen}
      disabled={!hasContent}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 18,
        padding: "20px 22px 16px",
        display: "flex", flexDirection: "column",
        minHeight: 200,
        cursor: hasContent ? "pointer" : "default",
        opacity: hasContent ? 1 : 0.6,
        transition: "all 0.18s ease",
        fontFamily: "inherit",
        textAlign: "left",
        width: "100%",
      }}
      onMouseOver={(e) => {
        if (!hasContent) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 10px 30px -10px rgba(106, 77, 255, 0.18)";
        e.currentTarget.style.borderColor = "var(--c-brand-primary-soft)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = cardBorder;
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, width: "100%" }}>
        {/* Variant C ring */}
        <div style={{ width: 72, height: 72, position: "relative" }}>
          <svg viewBox="0 0 60 60" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="30" cy="30" r="25" fill="none" strokeWidth="6" stroke="var(--c-border-faint)" />
            {pct > 0 && (
              <circle
                cx="30" cy="30" r="25"
                fill="none" strokeWidth="6"
                stroke={ringStroke}
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 157} 157`}
                style={{ filter: state === "mastered" ? "drop-shadow(0 0 6px rgba(31, 164, 99, 0.35))" : "drop-shadow(0 0 6px rgba(106, 77, 255, 0.3))" }}
              />
            )}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <span style={{
              fontFamily: "var(--font-accent)",
              fontStyle: "italic", fontSize: 26, fontWeight: 400,
              color: numColor,
              lineHeight: 1, letterSpacing: "-0.01em",
            }}>
              {pct > 0
                ? <>{pct}<span style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "var(--c-text-tertiary)", marginLeft: 1, fontStyle: "normal" }}>%</span></>
                : "—"}
            </span>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "-0.005em",
          padding: "4px 10px",
          borderRadius: 999,
          background:
            state === "mastered" ? "var(--c-success-soft, #E0F2E8)" :
            state === "in-progress" ? "var(--c-brand-primary-tint)" :
            hasContent ? "var(--c-surface-muted)" : "var(--c-surface-muted)",
          color:
            state === "mastered" ? "var(--c-success)" :
            state === "in-progress" ? "var(--c-brand-primary)" :
            hasContent ? "var(--c-text-secondary)" : "var(--c-text-tertiary)",
          border: `1px solid ${
            state === "mastered" ? "var(--c-success)" :
            state === "in-progress" ? "var(--c-brand-primary-soft)" :
            "var(--c-border-faint)"
          }`,
          fontVariantNumeric: "tabular-nums",
        }}>
          {hasContent ? (displayCount === 1 ? "1 test" : `${displayCount} tests`) : "Soon"}
        </span>
      </div>

      <h3 style={{
        margin: "0 0 4px",
        fontSize: 16, fontWeight: 600, letterSpacing: "-0.012em",
        color: "var(--c-text-primary)", lineHeight: 1.25,
      }}>
        {cat.title}
      </h3>
      <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginBottom: 12 }}>
        {!hasContent ? "No tests available yet"
          : state === "mastered" ? "✓ All tests completed"
          : state === "in-progress" ? `${attemptedCount} of ${displayCount} attempted`
          : "Tap to browse tests"}
      </div>

      <div style={{
        marginTop: "auto",
        paddingTop: 12, borderTop: "1px solid var(--c-border-faint)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, width: "100%",
      }}>
        <span style={{ color: "var(--c-text-tertiary)" }}>
          {!hasContent ? "Coming soon"
            : state === "in-progress" ? `${displayCount - attemptedCount} ${displayCount - attemptedCount === 1 ? "test" : "tests"} left`
            : displayCount > 1 ? `${displayCount} tests inside`
            : "1 test inside"}
        </span>
        <span style={{ color: numColor, fontWeight: 600 }}>
          {hasContent ? (state === "mastered" ? "Review →" : state === "in-progress" ? "Continue →" : "Start →") : ""}
        </span>
      </div>
    </button>
  );
}

function DiffChip({ label, done, inProgress, onClick }) {
  const styles = {
    done: { background: "var(--c-success-soft, #E0F2E8)", color: "var(--c-success)", border: "var(--c-success)" },
    inProgress: { background: "var(--c-brand-primary-tint)", color: "var(--c-brand-primary)", border: "var(--c-brand-primary)" },
    default: { background: "var(--c-surface-muted, var(--c-bg))", color: "var(--c-text-tertiary)", border: "var(--c-border-faint)" },
  };
  const s = done ? styles.done : inProgress ? styles.inProgress : styles.default;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      style={{
        height: 26, padding: "0 10px", borderRadius: 7,
        fontSize: 11, fontWeight: 500,
        background: s.background, color: s.color,
        border: `1px solid ${s.border}`,
        cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 4,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function FilterPill({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      height: 32, padding: "0 13px", borderRadius: 999,
      background: active ? "var(--c-brand-primary)" : "var(--c-surface)",
      border: active ? "1px solid transparent" : "1px solid var(--c-border-soft)",
      color: active ? "#fff" : "var(--c-text-secondary)",
      fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap",
    }}>
      {label}
      <span style={{
        background: active ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
        padding: "1px 6px", borderRadius: 7,
        fontSize: 11, fontVariantNumeric: "tabular-nums",
      }}>{count}</span>
    </button>
  );
}

// ── Drawer overlay ──
function DrawerOverlay({ open, onClose, children }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s", zIndex: 200,
        }}
      />
      <aside style={{
        position: "fixed", top: 0, right: 0, height: "100vh",
        width: "min(440px, 100%)",
        background: "var(--c-bg)",
        borderLeft: "1px solid var(--c-border-faint)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        zIndex: 201,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {children}
      </aside>
    </>
  );
}

// ── Level drawer content ──
function LevelDrawer({ mCat, levels, plays, isAdmin, onClose, onStart, onViewResult, onPreview, userDetails }) {
  return (
    <>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--c-border-faint)", position: "relative" }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "var(--c-surface)", color: "var(--c-text-secondary)",
            border: "1px solid var(--c-border-soft)", borderRadius: "50%",
            width: 30, height: 30,
            display: "grid", placeItems: "center", cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 6 }}>
          Concept test · {mCat.title.replace(/\s*\(.*?\)\s*$/, "")}
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--c-text-primary)" }}>
          {mCat.title}
        </h2>
      </div>

      <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
        {!levels && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--c-text-tertiary)" }}>
            <CircularProgress size="sm" />
          </div>
        )}
        {levels && levels.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>
            No tests in this level yet.
          </div>
        )}
        {levels && levels.length > 0 && levels.map((level) => {
          // Time handling: treat <200 as minutes, >=200 as seconds
          const rawTime = Number(level.time) || 0;
          const minutes = rawTime > 0 ? (rawTime >= 200 ? Math.floor(rawTime / 60) : rawTime) : 0;
          // Difficulty band from title
          const t = (level.title || "").toLowerCase();
          const diffBand = /easy/.test(t) ? "easy" : (/moderate|medium/.test(t) ? "moderate" : (/diff|hard/.test(t) ? "difficult" : null));
          const stripColor = diffBand === "easy" ? "var(--c-success)" : diffBand === "difficult" ? "var(--c-danger)" : "var(--c-brand-primary)";
          // Phase 12 Ship E: detect completed state
          const play = plays && level.uuid ? plays[level.uuid] : null;
          const completed = !!play;
          const passed = play && play.isPassed === true;

          const handleClick = () => {
            if (completed && !isAdmin) {
              // Non-admin who has played → go to result
              if (play.uid) onViewResult(play.uid);
            } else {
              // Untouched OR admin → start (admins can always retake)
              onStart(level.uuid || level.id);
            }
          };

          return (
            <div
              key={level.id}
              onClick={handleClick}
              style={{
                background: "var(--c-surface)",
                border: `1px solid ${completed ? (passed ? "var(--c-success)" : "var(--c-warning)") : "var(--c-border-faint)"}`,
                borderRadius: 14, padding: "14px 16px",
                marginBottom: 12, cursor: "pointer",
                transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: 14,
              }}
              onMouseOver={(e) => { if (!completed) e.currentTarget.style.borderColor = "var(--c-brand-primary)"; }}
              onMouseOut={(e) => { if (!completed) e.currentTarget.style.borderColor = "var(--c-border-faint)"; }}
            >
              {diffBand && (
                <div style={{
                  flexShrink: 0, width: 6, height: 36, borderRadius: 3,
                  background: stripColor,
                }} />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em" }}>
                    {level.title}
                  </span>
                  {completed && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                      padding: "3px 8px", borderRadius: 999,
                      background: passed ? "var(--c-success-soft, #E0F2E8)" : "var(--c-warning-soft, #FBEED2)",
                      color: passed ? "var(--c-success)" : "var(--c-warning)",
                      textTransform: "uppercase",
                    }}>
                      {passed ? "✓ Passed" : "Attempted"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {level.questions && level.questions.length > 0 && (
                    <span><b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{level.questions.length}</b> questions</span>
                  )}
                  {minutes > 0 && (
                    <span>· <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{minutes}</b> min</span>
                  )}
                  {completed && typeof play.score === "number" && (
                    <span>· You scored <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{play.score}</b></span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {/* Phase 12 Ship E: admin gets a Preview button too */}
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPreview(level.uuid || level.id); }}
                    style={{
                      height: 26, padding: "0 10px", borderRadius: 999,
                      background: "var(--c-surface-muted, var(--c-bg))",
                      color: "var(--c-text-secondary)",
                      border: "1px solid var(--c-border-soft)",
                      fontSize: 11, fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                    title="Open in preview mode — no play will be recorded"
                  >
                    ⊙ Preview
                  </button>
                )}
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: completed && !isAdmin ? "var(--c-brand-primary)" : "var(--c-text-tertiary)",
                  display: "flex", alignItems: "center", gap: 2,
                }}>
                  {completed && !isAdmin ? "View result" : (isAdmin && completed ? "Re-attempt" : "Start")}
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--c-border-faint)" }}>
        <button
          onClick={onClose}
          style={{
            width: "100%", height: 42, borderRadius: 12,
            background: "var(--c-surface)",
            color: "var(--c-text-secondary)",
            border: "1px solid var(--c-border-soft)",
            fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}
