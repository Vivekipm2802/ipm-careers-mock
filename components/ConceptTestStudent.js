// ============================================================
// ConceptTestStudent — Concept practice, INNER topics page.
// 2026-08 approved preview 2 (preview-concept-pages.html),
// adapted to topics within a collection:
//   · left sticky filter panel (Status / Difficulty checkboxes,
//     collapsible, counts right-aligned, Clear all) — replaces
//     the horizontal chips row;
//   · "Continue" protagonist card (ring + "k of n tests done ·
//     next: {level}" + gold-gradient Resume straight into the
//     next unattempted test);
//   · "Suggested for you" group (weak topics: ≥2 tests under a
//     50% pass rate — scores reason only on this page);
//   · "All topics" compact rows (36px mini ring, one fact line,
//     Start / Continue / Review actions). Row click opens the
//     topic's test drawer exactly as the old card tap did.
// Admin role still uses the existing Concept component; the
// drawer keeps the admin Preview affordance.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useNMNContext } from "@/components/NMNContext";
import { useRouter } from "next/router";
import { ArrowLeft, ChevronDown, ChevronRight, X } from "lucide-react";
import { CircularProgress } from "@nextui-org/react";
import PageHeader from "@/components/PageHeader";

// ── Difficulty band from a sub-level (m_category) title ──
function diffBandOf(title) {
  const s = String(title || "").toLowerCase();
  if (/easy/.test(s)) return "easy";
  if (/moderate|medium/.test(s)) return "moderate";
  if (/hard|diff/.test(s)) return "hard";
  return null;
}
const DIFF_ORDER = ["easy", "moderate", "hard"];
const DIFF_LABEL = { easy: "Easy", moderate: "Moderate", hard: "Difficult" };

export default function ConceptTestStudent({ group, onBack, role, initialCat }) {
  const [categories, setCategories] = useState();
  const [gamecategories, setGameCategories] = useState();
  const [testCountByMCat, setTestCountByMCat] = useState({}); // mCatId -> levels count
  const [levelsByMCat, setLevelsByMCat] = useState({});       // mCatId -> [{ id, uuid }]
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(null); // selected m_category (difficulty sub-level)
  const [levelData, setLevelData] = useState(null);
  const [plays, setPlays] = useState({}); // test_uuid -> { uid, score, isPassed, created_at }
  const [statusSel, setStatusSel] = useState(new Set()); // multi-select; empty = all
  const [diffSel, setDiffSel] = useState(new Set());     // multi-select; empty = all
  const [collapsed, setCollapsed] = useState({});        // panel section -> bool
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
            .select("uid, test_uuid, score, isPassed, created_at")
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
        playsRes.data.forEach((p) => {
          // keep the newest play per test
          const prev = m[p.test_uuid];
          if (!prev || String(p.created_at || "") > String(prev.created_at || "")) m[p.test_uuid] = p;
        });
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

  // ── Per-topic model (memoized): progress + bands + next test ──
  const topicModel = useMemo(() => {
    const map = {};
    if (!categories || !gamecategories) return map;
    categories.forEach(cat => {
      // Sub-levels in difficulty order (unknown bands keep tree order, last).
      const subs = gamecategories
        .filter(g => g.parent === cat.id)
        .slice()
        .sort((a, b) => {
          const ai = DIFF_ORDER.indexOf(diffBandOf(a.title));
          const bi = DIFF_ORDER.indexOf(diffBandOf(b.title));
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
      let testCount = 0;
      let attemptedCount = 0;
      let passedCount = 0;
      let nextTest = null;      // { uuid, band } — first unattempted, easiest first
      let lastPlayAt = null;
      const bands = new Set();
      subs.forEach(m => {
        const band = diffBandOf(m.title);
        const levels = levelsByMCat[m.id] || [];
        if (levels.length > 0 && band) bands.add(band);
        testCount += levels.length;
        levels.forEach(l => {
          const play = l.uuid ? plays[l.uuid] : null;
          if (play) {
            attemptedCount++;
            if (play.isPassed) passedCount++;
            if (play.created_at && (!lastPlayAt || String(play.created_at) > String(lastPlayAt))) {
              lastPlayAt = play.created_at;
            }
          } else if (!nextTest && l.uuid) {
            nextTest = { uuid: l.uuid, band };
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
      // Weak — suggested: meaningfully attempted, under a 50% pass rate
      // (same heuristic as the collections page "Weak areas" KPI).
      const weak = attemptedCount >= 2 && passedCount / attemptedCount < 0.5;
      map[cat.id] = { subs, testCount, attemptedCount, passedCount, pct, state, weak, nextTest, lastPlayAt, bands };
    });
    return map;
  }, [categories, gamecategories, levelsByMCat, plays]);

  // ── Panel counts ──
  const counts = useMemo(() => {
    const c = { suggested: 0, "in-progress": 0, untouched: 0, mastered: 0, easy: 0, moderate: 0, hard: 0 };
    Object.values(topicModel).forEach(p => {
      if (p.weak) c.suggested++;
      c[p.state]++;
      p.bands.forEach(b => { c[b]++; });
    });
    return c;
  }, [topicModel]);

  // Difficulty section only appears when the tests carry those levels.
  const hasDifficulty = useMemo(
    () => Object.values(topicModel).some(p => p.bands.size > 0),
    [topicModel]
  );

  // ── Filtered topics (empty selection = everything) ──
  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(cat => {
      const p = topicModel[cat.id];
      if (!p) return statusSel.size === 0 && diffSel.size === 0;
      const statusOk =
        statusSel.size === 0 ||
        statusSel.has(p.state) ||
        (statusSel.has("suggested") && p.weak);
      const diffOk =
        diffSel.size === 0 ||
        Array.from(p.bands).some(b => diffSel.has(b));
      return statusOk && diffOk;
    });
  }, [categories, topicModel, statusSel, diffSel]);

  // ── Protagonist: most recently practised in-progress topic ──
  const continueTopic = useMemo(() => {
    if (!categories) return null;
    let best = null;
    categories.forEach(cat => {
      const p = topicModel[cat.id];
      if (!p || p.state !== "in-progress") return;
      if (!best || String(p.lastPlayAt || "") > String(best.p.lastPlayAt || "")) best = { cat, p };
    });
    return best;
  }, [categories, topicModel]);

  const suggestedTopics = useMemo(() => {
    if (!categories) return [];
    return categories.filter(cat => topicModel[cat.id]?.weak);
  }, [categories, topicModel]);

  // ── Open a topic's test drawer (same target the old card tap had) ──
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
  function openTopic(cat) {
    const subs = topicModel[cat.id]?.subs || [];
    if (subs.length > 0) openLevel(subs[0]);
  }

  // Deep link from the entry page (unused by the current collections
  // page — must no-op safely when initialCat is undefined).
  // Hook stays ABOVE the loading early return (hooks-order rule).
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || !initialCat || loading || !gamecategories) return;
    setAutoOpened(true);
    const subs = gamecategories.filter((g) => g.parent === initialCat);
    if (subs.length > 0) openLevel(subs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCat, loading, gamecategories, autoOpened]);

  // All hooks above this line — safe to bail out now.
  if (loading || !categories) {
    return (
      <div style={{ width: "100%", padding: 60, display: "flex", justifyContent: "center" }}>
        <CircularProgress size="sm" />
      </div>
    );
  }

  const anyFilter = statusSel.size > 0 || diffSel.size > 0;
  function toggleIn(set, setter, key) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  }

  // Fact line for an All-topics row.
  function factLine(p) {
    if (p.testCount === 0) return "No tests available yet";
    if (p.state === "mastered") {
      return `${p.testCount} ${p.testCount === 1 ? "test" : "tests"} · all attempted` +
        (p.passedCount < p.attemptedCount ? ` · ${p.passedCount} passed` : "");
    }
    if (p.state === "in-progress") {
      return `${p.attemptedCount} of ${p.testCount} attempted` +
        (p.passedCount > 0 ? ` · ${p.passedCount} passed` : "");
    }
    const ordered = DIFF_ORDER.filter(b => p.bands.has(b));
    const range = ordered.length > 1
      ? ` · ${DIFF_LABEL[ordered[0]]} → ${DIFF_LABEL[ordered[ordered.length - 1]]}`
      : ordered.length === 1 ? ` · ${DIFF_LABEL[ordered[0]]}` : "";
    return `${p.testCount} ${p.testCount === 1 ? "test" : "tests"}${range}`;
  }

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

      {/* ── Header — D1 quiet chrome ── */}
      <PageHeader
        kicker="Concept tests"
        title="Master each topic, one concept at a"
        accent="time."
        subtitle="Easy / Moderate / Difficult per topic — start at your level, work up."
      />

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

      {categories.length > 0 && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* ── Left sticky filter panel ── */}
          <div style={{
            width: 218, flexShrink: 0,
            position: "sticky", top: 20,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 16, boxShadow: "var(--c-shadow-xs)",
            padding: "16px 0 6px",
          }}>
            <PanelSection
              title="Status"
              collapsed={!!collapsed.status}
              onToggle={() => setCollapsed(c => ({ ...c, status: !c.status }))}
            >
              <PanelRow label="Suggested for you" count={counts.suggested}
                on={statusSel.has("suggested")} onClick={() => toggleIn(statusSel, setStatusSel, "suggested")} />
              <PanelRow label="In progress" count={counts["in-progress"]}
                on={statusSel.has("in-progress")} onClick={() => toggleIn(statusSel, setStatusSel, "in-progress")} />
              <PanelRow label="Untouched" count={counts.untouched}
                on={statusSel.has("untouched")} onClick={() => toggleIn(statusSel, setStatusSel, "untouched")} />
              <PanelRow label="Mastered" count={counts.mastered}
                on={statusSel.has("mastered")} onClick={() => toggleIn(statusSel, setStatusSel, "mastered")} />
            </PanelSection>

            {hasDifficulty && (
              <>
                <div style={{ height: 1, background: "var(--c-border-faint)", margin: "10px 18px" }} />
                <PanelSection
                  title="Difficulty"
                  collapsed={!!collapsed.difficulty}
                  onToggle={() => setCollapsed(c => ({ ...c, difficulty: !c.difficulty }))}
                >
                  <PanelRow label="Easy" count={counts.easy}
                    on={diffSel.has("easy")} onClick={() => toggleIn(diffSel, setDiffSel, "easy")} />
                  <PanelRow label="Moderate" count={counts.moderate}
                    on={diffSel.has("moderate")} onClick={() => toggleIn(diffSel, setDiffSel, "moderate")} />
                  <PanelRow label="Difficult" count={counts.hard}
                    on={diffSel.has("hard")} onClick={() => toggleIn(diffSel, setDiffSel, "hard")} />
                </PanelSection>
              </>
            )}

            <div style={{ height: 1, background: "var(--c-border-faint)", margin: "10px 18px" }} />
            <button
              onClick={() => { setStatusSel(new Set()); setDiffSel(new Set()); }}
              style={{
                background: "none", border: "none",
                font: "inherit", fontSize: 11, fontWeight: 600,
                color: anyFilter ? "var(--c-brand-gold)" : "var(--c-text-tertiary)",
                padding: "4px 18px 12px", cursor: anyFilter ? "pointer" : "default",
                display: "block", textAlign: "left",
              }}
            >
              Clear all
            </button>
          </div>

          {/* ── Main column ── */}
          <div style={{ flex: 1, minWidth: 280 }}>

            {/* Continue protagonist card */}
            {continueTopic && (
              <div style={{
                display: "flex", alignItems: "center", gap: 18,
                padding: "18px 22px", marginBottom: 18,
                background: "var(--c-surface)",
                border: "1px solid var(--c-border-faint)",
                borderRadius: 16, boxShadow: "var(--c-shadow-xs)",
                position: "relative", overflow: "hidden",
              }}>
                <div aria-hidden style={{
                  position: "absolute", top: 0, left: 24, right: 24, height: 1,
                  background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)",
                  opacity: 0.55,
                }} />
                <Ring size={52} stroke={5} pct={continueTopic.p.pct} color="var(--c-brand-gold)" fontSize={13} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em" }}>
                    Continue {continueTopic.cat.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 2 }}>
                    {continueTopic.p.attemptedCount} of {continueTopic.p.testCount} tests done
                    {continueTopic.p.nextTest?.band ? <> · next: {DIFF_LABEL[continueTopic.p.nextTest.band]}</> : null}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = continueTopic.p.nextTest;
                    if (next?.uuid) router.push(`/test/${next.uuid}`);
                    else openTopic(continueTopic.cat);
                  }}
                  style={{
                    marginLeft: "auto", flexShrink: 0,
                    background: "var(--c-accent-grad)",
                    color: "var(--c-text-on-brand)",
                    border: "none", borderRadius: 999,
                    padding: "10px 22px", fontSize: 12.5, fontWeight: 600,
                    fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  Resume →
                </button>
              </div>
            )}

            {/* Suggested for you */}
            {suggestedTopics.length > 0 && (
              <>
                <GroupLabel gold="Suggested for you" rest="· from your recent test scores" first={!continueTopic} />
                <div style={{
                  background: "var(--c-surface)",
                  border: "1px solid var(--c-border-faint)",
                  borderRadius: 16, boxShadow: "var(--c-shadow-xs)",
                  overflow: "hidden",
                }}>
                  {suggestedTopics.map((cat, i) => {
                    const p = topicModel[cat.id];
                    return (
                      <TopicRow
                        key={cat.id}
                        first={i === 0}
                        ring={<Ring size={36} stroke={4} pct={p.pct} color="var(--c-brand-gold)" fontSize={9} mini />}
                        title={cat.title}
                        sub="scored under 50% twice — worth a revisit"
                        chip={<Chip gold>Suggested</Chip>}
                        action="Revise →"
                        actionMuted={false}
                        onOpen={() => openTopic(cat)}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* All topics */}
            <GroupLabel rest="All topics" first={!continueTopic && suggestedTopics.length === 0} />
            {visibleCategories.length === 0 ? (
              <div style={{
                padding: "32px 28px", borderRadius: 16,
                background: "var(--c-surface-muted, var(--c-bg))",
                border: "1px dashed var(--c-border-soft)",
                color: "var(--c-text-tertiary)", fontSize: 14,
                textAlign: "center",
              }}>
                No topics match these filters. Try clearing one.
              </div>
            ) : (
              <div style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border-faint)",
                borderRadius: 16, boxShadow: "var(--c-shadow-xs)",
                overflow: "hidden",
              }}>
                {visibleCategories.map((cat, i) => {
                  const p = topicModel[cat.id] || { subs: [], testCount: 0, attemptedCount: 0, passedCount: 0, pct: 0, state: "untouched", weak: false, bands: new Set() };
                  const hasContent = p.subs.length > 0;
                  const ring = p.state === "mastered"
                    ? <Ring size={36} stroke={4} pct={100} color="var(--c-success)" fontSize={10} mini check />
                    : p.state === "in-progress"
                      ? <Ring size={36} stroke={4} pct={p.pct} color="var(--c-brand-gold)" fontSize={9} mini />
                      : <Ring size={36} stroke={4} pct={0} color="var(--c-brand-gold)" fontSize={9} mini dot />;
                  const action = !hasContent ? ""
                    : p.state === "mastered" ? "Review →"
                    : p.state === "in-progress" ? "Continue →"
                    : "Start →";
                  return (
                    <TopicRow
                      key={cat.id}
                      first={i === 0}
                      ring={ring}
                      title={cat.title}
                      sub={factLine(p)}
                      chip={p.state === "mastered" ? <Chip green>Mastered</Chip> : null}
                      action={action}
                      actionMuted={p.state === "mastered"}
                      disabled={!hasContent}
                      onOpen={() => openTopic(cat)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

// ── Progress ring (52px hero / 36px mini). Mastered = green ✓,
//    partial = gold %, untouched = quiet neutral dot (never "—"). ──
function Ring({ size, stroke, pct, color, fontSize, mini, check, dot }) {
  const r = (size - stroke * 2 - 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="var(--c-border-faint)" />
        {pct > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" strokeWidth={stroke}
            stroke={color} strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        {dot ? (
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c-text-tertiary)", display: "block" }} />
        ) : check ? (
          <span style={{ fontSize: fontSize + 1, color: "var(--c-success)", fontWeight: 600, lineHeight: 1 }}>✓</span>
        ) : pct >= 100 ? (
          // "100%" crammed inside a 36px ring reads badly (owner feedback) —
          // a full ring already says complete, so show a small tick in the
          // ring's own colour instead of the number.
          <span style={{ fontSize: fontSize + 1, color, fontWeight: 600, lineHeight: 1 }}>✓</span>
        ) : (
          <span style={{
            fontFamily: "var(--font-accent)", fontStyle: "italic",
            fontSize, color: mini ? "var(--c-text-secondary)" : color,
            lineHeight: 1,
          }}>
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Compact topic row ──
function TopicRow({ first, ring, title, sub, chip, action, actionMuted, disabled, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onOpen}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(); } }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.background = "var(--c-surface-muted, var(--c-bg))"; }}
      onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "13px 18px",
        borderTop: first ? "none" : "1px solid var(--c-border-faint)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {ring}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em" }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 2 }}>
          {sub}
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {chip}
        <span style={{
          fontSize: 12, fontWeight: actionMuted ? 500 : 600,
          color: actionMuted ? "var(--c-text-tertiary)" : "var(--c-brand-gold)",
          whiteSpace: "nowrap",
        }}>
          {action}
        </span>
      </div>
    </div>
  );
}

function Chip({ gold, green, children }) {
  return (
    <span style={{
      fontSize: 9.5, letterSpacing: "0.07em", textTransform: "uppercase",
      fontWeight: 600, borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap",
      background: green ? "var(--c-success-soft)" : gold ? "var(--c-brand-gold-tint)" : "var(--c-surface-muted)",
      color: green ? "var(--c-success)" : gold ? "var(--c-brand-gold)" : "var(--c-text-secondary)",
    }}>
      {children}
    </span>
  );
}

function GroupLabel({ gold, rest, first }) {
  return (
    <div style={{
      fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase",
      color: "var(--c-text-tertiary)", fontWeight: 600,
      margin: `${first ? 2 : 20}px 2px 10px`,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {gold && <span style={{ color: "var(--c-brand-gold)" }}>{gold}</span>}
      <span>{rest}</span>
    </div>
  );
}

// ── Filter panel building blocks ──
function PanelSection({ title, collapsed, onToggle, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none",
          font: "inherit", fontSize: 10, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--c-text-tertiary)",
          fontWeight: 600, padding: "0 18px 8px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", textAlign: "left",
        }}
      >
        {title}
        <ChevronDown size={12} style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {!collapsed && children}
    </div>
  );
}

function PanelRow({ label, count, on, onClick }) {
  return (
    <div
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "7px 18px", fontSize: 12.5,
        color: on ? "var(--c-text-primary)" : "var(--c-text-secondary)",
        fontWeight: on ? 500 : 400, cursor: "pointer",
      }}
    >
      <span style={{
        width: 15, height: 15, borderRadius: 5, flexShrink: 0,
        border: `1.5px solid ${on ? "var(--c-brand-gold)" : "var(--c-border-soft)"}`,
        background: on ? "var(--c-brand-gold)" : "transparent",
        display: "grid", placeItems: "center",
      }}>
        {on && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke="var(--c-text-on-brand)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        )}
      </span>
      {label}
      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
        {count}
      </span>
    </div>
  );
}

// ── Drawer overlay ──
function DrawerOverlay({ open, onClose, children }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)" /* scrim — intentional fixed black overlay, both themes */,
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
                      background: passed ? "var(--c-success-soft)" : "var(--c-warning-soft)",
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
