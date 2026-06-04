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

export default function ConceptTestStudent({ group, onBack }) {
  const [categories, setCategories] = useState();
  const [gamecategories, setGameCategories] = useState();
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(null); // selected m_category (difficulty sub-level)
  const [levelData, setLevelData] = useState(null);
  const [plays, setPlays] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { userDetails } = useNMNContext();
  const router = useRouter();

  useEffect(() => {
    if (!group) return;
    (async () => {
      setLoading(true);
      const [cRes, gcRes] = await Promise.all([
        supabase.from("categories").select("*").eq("parent", group),
        supabase.from("m_categories").select("*").order("created_at", { ascending: true }),
      ]);
      if (cRes.data) setCategories(cRes.data);
      if (gcRes.data) setGameCategories(gcRes.data);
      setLoading(false);
      // Fetch user's plays for all levels
      if (userDetails?.id) {
        const { data: playsData } = await supabase
          .from("plays").select("test_uuid, score, isPassed").eq("user", userDetails.id);
        if (playsData) {
          const m = {};
          playsData.forEach((p) => { m[p.test_uuid] = p; });
          setPlays(m);
        }
      }
    })();
  }, [group, userDetails]);

  // ── Per-category mastery calculation ──
  function categoryMastery(catId) {
    if (!gamecategories) return { pct: 0, levels: [], state: "untouched" };
    const subs = gamecategories.filter((g) => g.parent === catId);
    return { levels: subs };
  }

  // ── When user clicks a difficulty chip, open drawer + fetch levels ──
  async function openLevel(mCat) {
    setActiveLevel(mCat);
    setLevelData(null);
    setLeaderboard([]);
    const { data } = await supabase
      .from("levels")
      .select("*,questions!questions_parent_fkey(id)")
      .eq("parent", mCat.id)
      .order("created_at", { ascending: true });
    if (data) setLevelData(data);
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
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
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
        <FilterPill label="All" count={totalTopics} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <FilterPill label="Untouched" count={totalTopics} active={statusFilter === "untouched"} onClick={() => setStatusFilter("untouched")} />
        <FilterPill label="In progress" count={0} active={statusFilter === "in-progress"} onClick={() => setStatusFilter("in-progress")} />
        <FilterPill label="Mastered" count={0} active={statusFilter === "mastered"} onClick={() => setStatusFilter("mastered")} />
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
            <stop offset="0%" stopColor="#9F8BFF" />
            <stop offset="100%" stopColor="#6A4DFF" />
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
        {categories.map((cat) => {
          const subs = gamecategories ? gamecategories.filter((g) => g.parent === cat.id) : [];
          return (
            <TopicCard
              key={cat.id}
              cat={cat}
              subs={subs}
              onOpen={() => subs.length > 0 && openLevel(subs[0])}
            />
          );
        })}
      </div>

      {/* ── Drawer for level detail ── */}
      <DrawerOverlay open={!!activeLevel} onClose={closeDrawer}>
        {activeLevel && (
          <LevelDrawer
            mCat={activeLevel}
            levels={levelData}
            onClose={closeDrawer}
            onStart={(testUuid) => router.push(`/test/${testUuid}`)}
            userDetails={userDetails}
          />
        )}
      </DrawerOverlay>
    </div>
  );
}

// ── Topic card ──
function TopicCard({ cat, subs, onOpen }) {
  const state = "untouched"; // TODO: compute from plays
  const pct = 0;
  const numColor = "var(--c-brand-primary)";
  const cardBg = "var(--c-surface)";
  const cardBorder = "var(--c-border-faint)";
  const hasContent = subs && subs.length > 0;

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
                stroke="url(#gradPurple)"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 157} 157`}
                style={{ filter: "drop-shadow(0 0 6px rgba(106, 77, 255, 0.3))" }}
              />
            )}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <span style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic", fontSize: 26, fontWeight: 400,
              color: pct > 0 ? numColor : "var(--c-text-tertiary)",
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
          background: hasContent ? "var(--c-brand-primary-tint)" : "var(--c-surface-muted)",
          color: hasContent ? "var(--c-brand-primary)" : "var(--c-text-tertiary)",
          border: `1px solid ${hasContent ? "var(--c-brand-primary-soft)" : "var(--c-border-faint)"}`,
          fontVariantNumeric: "tabular-nums",
        }}>
          {hasContent ? (subs.length === 1 ? "1 level" : `${subs.length} levels`) : "Soon"}
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
        {hasContent ? "Tap to browse difficulty levels" : "No tests available yet"}
      </div>

      <div style={{
        marginTop: "auto",
        paddingTop: 12, borderTop: "1px solid var(--c-border-faint)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, width: "100%",
      }}>
        <span style={{ color: "var(--c-text-tertiary)" }}>
          {hasContent ? "Multiple levels inside" : "Coming soon"}
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
function LevelDrawer({ mCat, levels, onClose, onStart, userDetails }) {
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
          // Time can be stored either in seconds (>=60 typically) or minutes (<60).
          // Treat values < 200 as minutes; treat >=200 as seconds (convert).
          const rawTime = Number(level.time) || 0;
          const minutes = rawTime > 0 ? (rawTime >= 200 ? Math.floor(rawTime / 60) : rawTime) : 0;
          // Detect difficulty band from title for the colored side strip
          const t = (level.title || "").toLowerCase();
          const diffBand = /easy/.test(t) ? "easy" : (/moderate|medium/.test(t) ? "moderate" : (/diff|hard/.test(t) ? "difficult" : null));
          const stripColor = diffBand === "easy" ? "var(--c-success)" : diffBand === "difficult" ? "var(--c-danger)" : "var(--c-brand-primary)";
          return (
            <div
              key={level.id}
              onClick={() => onStart(level.uuid || level.id)}
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border-faint)",
                borderRadius: 14, padding: "14px 16px",
                marginBottom: 12, cursor: "pointer",
                transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: 14,
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--c-brand-primary)"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--c-border-faint)"}
            >
              {diffBand && (
                <div style={{
                  flexShrink: 0, width: 6, height: 36, borderRadius: 3,
                  background: stripColor,
                }} />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em" }}>
                  {level.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {level.questions && level.questions.length > 0 && (
                    <span><b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{level.questions.length}</b> questions</span>
                  )}
                  {minutes > 0 && (
                    <span>· <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>{minutes}</b> min</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--c-text-tertiary)", flexShrink: 0 }} />
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
