// ============================================================
// ConceptTestStudent — Concept practice, INNER topics page.
// 2026-08 approved preview (preview-topics-v6.html): the topics
// page deliberately mirrors the collections page's SectionRow
// card grammar — same 16-radius card, 38px tinted initial tile,
// serif count, 4px coverage bar, quiet foot line:
//   · single column — no left filter panel, no in-card search;
//   · Continue banner (gold-tint play tile + "k of n done ·
//     next: {level} · you left it {ago}" + gold-gradient Resume
//     straight into the next unattempted test);
//   · search pill + ONE "Status: All" PillDropdown;
//   · "Suggested for you" card grid (weak topics — scores reason
//     only on this page; Vault data isn't fetched here);
//   · "All topics · N" card grid, tile tints rotating gold /
//     info / violet (mastered = success, suggested = danger).
// Card click opens the topic's test drawer exactly as before.
// Admin role still uses the existing Concept component; the
// drawer keeps the admin Preview affordance.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useNMNContext } from "@/components/NMNContext";
import { useRouter } from "next/router";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { CircularProgress } from "@nextui-org/react";
import PageHeader from "@/components/PageHeader";
import PillDropdown from "@/components/ui/PillDropdown";

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

// ── Human-readable "X ago" (same helper as the collections page) ──
function timeAgo(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? "hour" : "hours"} ago`;
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} ${Math.floor(diffDay / 7) === 1 ? "week" : "weeks"} ago`;
  return `${Math.floor(diffDay / 30)} ${Math.floor(diffDay / 30) === 1 ? "month" : "months"} ago`;
}

// ── 2-letter initial for the tile (same logic as sectionAbbrev
//    on the collections page, applied to the topic title) ──
function topicAbbrev(title) {
  const t = String(title || "??").trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

// Tile tints — the portal palette the collections page uses, plus
// success (mastered) and danger (suggested). The gold/info/violet
// trio rotates deterministically by the topic's position in the
// collection so tints never shuffle between renders.
const TILE_TINTS = {
  gold: { bg: "var(--c-brand-gold-tint)", fg: "var(--c-brand-gold)" },
  info: { bg: "var(--c-info-soft)", fg: "var(--c-info)" },
  violet: {
    bg: "rgba(151,113,224,0.14)" /* violet tint — no portal var; reads on light + dark */,
    fg: "rgba(151,113,224,1)" /* violet — approved-preview accent, no portal var */,
  },
  success: { bg: "var(--c-success-soft)", fg: "var(--c-success)" },
  danger: { bg: "var(--c-danger-soft)", fg: "var(--c-danger)" },
};
const TINT_ROTATION = ["gold", "info", "violet"];

const STATUS_OPTIONS = [
  { value: null, label: "All" },
  { value: "suggested", label: "Suggested" },
  { value: "in-progress", label: "In progress" },
  { value: "untouched", label: "Not started" },
  { value: "completed", label: "Completed" },
  { value: "mastered", label: "Mastered" },
];

export default function ConceptTestStudent({ group, onBack, role, initialCat }) {
  const [categories, setCategories] = useState();
  const [gamecategories, setGameCategories] = useState();
  const [testCountByMCat, setTestCountByMCat] = useState({}); // mCatId -> levels count
  const [levelsByMCat, setLevelsByMCat] = useState({});       // mCatId -> [{ id, uuid }]
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(null); // selected m_category (difficulty sub-level)
  const [levelData, setLevelData] = useState(null);
  const [plays, setPlays] = useState({}); // test_uuid -> { uid, score, isPassed, created_at }
  const [statusFilter, setStatusFilter] = useState(null); // null = All (single-select pill)
  // Live search over both grids — hook stays ABOVE the loading
  // early return (hooks-order rule).
  const [topicQuery, setTopicQuery] = useState("");
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
        // 2026-08 owner fix: "Mastered" must be EARNED — all tests
        // attempted AND passed. All-attempted-but-not-passed is
        // "completed" (shows honestly as needing revision; a topic can
        // never read Mastered while sitting in Suggested).
        if (attemptedCount === testCount && testCount > 0) {
          state = passedCount === testCount ? "mastered" : "completed";
        } else state = "in-progress";
      }
      // Weak — suggested: meaningfully attempted, under a 50% pass rate
      // (same heuristic as the collections page "Weak areas" KPI).
      const weak = attemptedCount >= 2 && passedCount / attemptedCount < 0.5;
      map[cat.id] = { subs, testCount, attemptedCount, passedCount, pct, state, weak, nextTest, lastPlayAt, bands };
    });
    return map;
  }, [categories, gamecategories, levelsByMCat, plays]);

  // ── Status counts for the dropdown ──
  const counts = useMemo(() => {
    const c = { suggested: 0, "in-progress": 0, untouched: 0, completed: 0, mastered: 0 };
    Object.values(topicModel).forEach(p => {
      if (p.weak) c.suggested++;
      c[p.state]++;
    });
    return c;
  }, [topicModel]);

  // ── Status-filtered topics for the All-topics grid ──
  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    if (!statusFilter) return categories;
    return categories.filter(cat => {
      const p = topicModel[cat.id];
      if (!p) return false;
      if (statusFilter === "suggested") return p.weak;
      return p.state === statusFilter;
    });
  }, [categories, topicModel, statusFilter]);

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

  // live search over both grids (plain derivation — no hook, so the
  // early return above stays safe)
  const q = topicQuery.trim().toLowerCase();
  const matchesQuery = (cat) => !q || String(cat.title || "").toLowerCase().includes(q);
  const searchedSuggested = suggestedTopics.filter(matchesQuery);
  const searchedCategories = visibleCategories.filter(matchesQuery);

  // Stable tint index per topic — position in the FULL collection,
  // so filtering/search never reshuffles a card's colour.
  const tintKeyByCat = {};
  categories.forEach((cat, i) => { tintKeyByCat[cat.id] = TINT_ROTATION[i % TINT_ROTATION.length]; });

  // Meta line for an All-topics card: test count + level range.
  function metaLine(p) {
    if (p.testCount === 0) return "No tests available yet";
    const ordered = DIFF_ORDER.filter(b => p.bands.has(b));
    const range = ordered.length > 1
      ? ` · ${DIFF_LABEL[ordered[0]]} → ${DIFF_LABEL[ordered[ordered.length - 1]]}`
      : ordered.length === 1 ? ` · ${DIFF_LABEL[ordered[0]]}` : "";
    return `${p.testCount} ${p.testCount === 1 ? "test" : "tests"}${range}`;
  }

  // Foot: quiet status left + gold CTA right, by state.
  function footOf(p) {
    if (p.testCount === 0) return { label: "No tests yet", cta: "", muted: true };
    if (p.state === "mastered") return { label: "mastered · all passed", cta: "Review →", muted: true };
    if (p.state === "completed") {
      return {
        label: p.passedCount === 0
          ? `all ${p.testCount} tried · none passed`
          : `all ${p.testCount} tried · ${p.passedCount} passed`,
        cta: "Revise →", muted: false,
      };
    }
    if (p.state === "in-progress") {
      return { label: `${p.attemptedCount} of ${p.testCount} done`, cta: "Continue →", muted: false };
    }
    return { label: "Not started yet", cta: "Start →", muted: false };
  }

  // Suggested reason — scores only on this page (Vault isn't fetched
  // here; the collections page owns the cross-source signals).
  function suggestReason(p) {
    return p.attemptedCount === 2
      ? "under 50% both attempts — worth a revisit"
      : `under 50% across ${p.attemptedCount} attempts — worth a revisit`;
  }

  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  };

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
        <>
          {/* ── Continue banner — only when a topic is in progress ── */}
          {continueTopic && (
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 20px", marginBottom: 16,
              background: "var(--c-surface)",
              border: "1px solid var(--c-brand-gold-tint)",
              borderRadius: 16, boxShadow: "var(--c-shadow-xs)",
            }}>
              <span style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)",
                display: "grid", placeItems: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  style={{ display: "block" }}>
                  <path d="M6 4l14 8-14 8z" />
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em" }}>
                  Continue {continueTopic.cat.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", marginTop: 2 }}>
                  {continueTopic.p.attemptedCount} of {continueTopic.p.testCount} done
                  {continueTopic.p.nextTest?.band ? <> · next: {DIFF_LABEL[continueTopic.p.nextTest.band]}</> : null}
                  {continueTopic.p.lastPlayAt ? <> · you left it {timeAgo(continueTopic.p.lastPlayAt)}</> : null}
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
                  padding: "9px 20px", fontSize: 12.5, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Resume →
              </button>
            </div>
          )}

          {/* ── Search pill + Status dropdown ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10,
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 999, padding: "10px 16px",
              boxShadow: "var(--c-shadow-xs)",
            }}>
              <Search size={15} style={{ color: "var(--c-text-tertiary)", flexShrink: 0 }} />
              <input
                type="text"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                placeholder="Search a topic…"
                style={{
                  flex: 1, minWidth: 0,
                  background: "none", border: "none", outline: "none",
                  font: "inherit", fontSize: 13,
                  color: "var(--c-text-primary)",
                }}
              />
              {topicQuery && (
                <button
                  type="button"
                  onClick={() => setTopicQuery("")}
                  aria-label="Clear search"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--c-text-tertiary)", display: "grid", placeItems: "center" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <PillDropdown
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS.map((o) => ({
                ...o,
                count: o.value === null
                  ? categories.length
                  : o.value === "suggested" ? counts.suggested : counts[o.value],
              }))}
              onChange={(v) => setStatusFilter(v)}
            />
          </div>

          {/* ── Suggested for you ── */}
          {searchedSuggested.length > 0 && (
            <>
              <GroupLabel gold="Suggested for you" rest="· from your scores and your Vault" first />
              <div style={grid}>
                {searchedSuggested.map((cat) => {
                  const p = topicModel[cat.id];
                  const foot = footOf(p);
                  return (
                    <TopicCard
                      key={`sug-${cat.id}`}
                      abbrev={topicAbbrev(cat.title)}
                      tint={TILE_TINTS.danger}
                      count={p.testCount}
                      title={cat.title}
                      meta={suggestReason(p)}
                      pct={p.pct}
                      started={p.attemptedCount > 0}
                      mastered={false}
                      footLabel={foot.label}
                      cta="Revise →"
                      ctaMuted={false}
                      onOpen={() => openTopic(cat)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* ── All topics ── */}
          <GroupLabel rest={`All topics · ${searchedCategories.length}`} first={searchedSuggested.length === 0} />
          {searchedCategories.length === 0 ? (
            <div style={{
              padding: "32px 28px", borderRadius: 16,
              background: "var(--c-surface-muted, var(--c-bg))",
              border: "1px dashed var(--c-border-soft)",
              color: "var(--c-text-tertiary)", fontSize: 14,
              textAlign: "center",
            }}>
              {q
                ? <>No topic matches &quot;{topicQuery}&quot;.</>
                : "No topics match this filter. Try switching Status back to All."}
            </div>
          ) : (
            <div style={grid}>
              {searchedCategories.map((cat) => {
                const p = topicModel[cat.id] || { subs: [], testCount: 0, attemptedCount: 0, passedCount: 0, pct: 0, state: "untouched", weak: false, bands: new Set() };
                const hasContent = p.subs.length > 0;
                const mastered = p.state === "mastered";
                const tint = mastered ? TILE_TINTS.success : TILE_TINTS[tintKeyByCat[cat.id] || "gold"];
                const foot = footOf(p);
                return (
                  <TopicCard
                    key={cat.id}
                    abbrev={topicAbbrev(cat.title)}
                    tint={tint}
                    count={p.testCount}
                    title={cat.title}
                    meta={metaLine(p)}
                    pct={p.pct}
                    started={p.attemptedCount > 0}
                    mastered={mastered}
                    footLabel={foot.label}
                    cta={hasContent ? foot.cta : ""}
                    ctaMuted={foot.muted}
                    disabled={!hasContent}
                    onOpen={() => openTopic(cat)}
                  />
                );
              })}
            </div>
          )}
        </>
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

// ── Topic card — EXACT SectionRow anatomy from the collections
//    page: tinted 38px initial tile + serif count, title, meta,
//    4px coverage bar, quiet foot + gold CTA. ──
function TopicCard({ abbrev, tint, count, title, meta, pct, started, mastered, footLabel, cta, ctaMuted, disabled, onOpen }) {
  return (
    <div
      className="concept-row td-lift"
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onOpen}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(); } }}
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 16,
        boxShadow: "var(--c-shadow-xs)",
        padding: "16px 18px",
        display: "flex", flexDirection: "column",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {/* Icon tile + test count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: tint.bg, color: tint.fg,
          display: "grid", placeItems: "center",
          fontWeight: 600, fontSize: 13,
          letterSpacing: "-0.01em", flexShrink: 0,
        }}>
          {abbrev}
        </div>
        <span className="ds-stat-value" style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
          {count}
        </span>
      </div>

      {/* Title + meta */}
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--c-text-primary)", letterSpacing: "-0.005em" }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>
        {meta}
      </div>

      {/* Thin coverage bar — attempted / total (green when mastered) */}
      <div style={{
        height: 4, borderRadius: 2, marginTop: 10,
        background: "var(--c-surface-sunken, var(--c-surface-muted))",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${Math.max(started ? 2 : 0, pct || 0)}%`,
          background: mastered ? "var(--c-success)" : "var(--c-accent-grad)",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Foot: status + CTA */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 10, gap: 8,
      }}>
        <span style={{ fontSize: 11, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
          {footLabel}
        </span>
        <span style={{
          fontSize: 12, fontWeight: ctaMuted ? 500 : 600,
          color: ctaMuted ? "var(--c-text-tertiary)" : "var(--c-brand-gold)",
          whiteSpace: "nowrap", marginLeft: "auto",
        }}>
          {cta}
        </span>
      </div>
    </div>
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
