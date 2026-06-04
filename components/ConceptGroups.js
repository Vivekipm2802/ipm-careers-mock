// ============================================================
// ConceptGroups — Phase 12 Ship D (Direction A)
// Entry page: Continue card + Stats KPIs + Section list with real progress
// from plays-table aggregation. Admin add/edit/delete preserved.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import {
  Button, CircularProgress, PopoverTrigger, Popover, PopoverContent,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Input, Select, SelectItem, Switch,
} from "@nextui-org/react";
import { ChevronRight, EditIcon, MoreVertical, Plus, Trash2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useNMNContext } from "@/components/NMNContext";
import ImageUploader from "./ImageUploader";

export default function ConceptGroups({ type, children, role, title }) {
  const [selectedGroup, setSelectedGroup] = useState();
  function clearSelection() { setSelectedGroup(); }

  return selectedGroup
    ? children({ group: selectedGroup, clearSelection })
    : <Selector title={title} role={role} type={type} onSelect={(e) => setSelectedGroup(e)} />;
}

// ── Detect section type from group title for color coding ──
function detectSectionType(group) {
  const t = (group?.title || "").toLowerCase();
  if (t.includes("quant") || t.includes("qa")) return "qa";
  if (t.includes("verbal") || t.includes("va")) return "va";
  if (t.includes("logic") || t.includes("lr")) return "lr";
  if (t.includes("data") || t.includes("di")) return "di";
  if (t.includes("pyq") || t.includes("previous") || t.includes("year")) return "py";
  return "default";
}

function sectionAbbrev(group) {
  const t = (group?.title || "??").trim();
  // Use first letters of words, up to 2 chars
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

const sectionGradients = {
  qa: "linear-gradient(135deg, #6A4DFF, #9F8BFF)",
  va: "linear-gradient(135deg, #C29E5F, #E0BC7A)",
  lr: "linear-gradient(135deg, #1FA463, #43C982)",
  di: "linear-gradient(135deg, #B66C00, #E3A038)",
  py: "linear-gradient(135deg, #1D1D1F, #424248)",
  default: "linear-gradient(135deg, var(--c-brand-primary), var(--c-brand-primary-soft))",
};
const sectionBarColors = {
  qa: "var(--c-brand-primary)",
  va: "var(--c-brand-gold)",
  lr: "var(--c-success)",
  di: "var(--c-warning)",
  py: "var(--c-text-secondary)",
  default: "var(--c-brand-primary)",
};

// ── Human-readable "X ago" ──
function timeAgo(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? "hour" : "hours"} ago`;
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} ${Math.floor(diffDay / 7) === 1 ? "week" : "weeks"} ago`;
  return `${Math.floor(diffDay / 30)} ${Math.floor(diffDay / 30) === 1 ? "month" : "months"} ago`;
}

const Selector = ({ type, onSelect, role, title }) => {
  const [groups, setGroups] = useState();
  const [groupStats, setGroupStats] = useState({}); // { groupId: { topicCount, totalTests, masteredTests, progressPct, lastPracticedAt, questionCount } }
  const [overallStats, setOverallStats] = useState({ topicsStarted: 0, masteredTopics: 0, weakTopics: 0, streak: 0 });
  const [continueCard, setContinueCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState();
  const [courses, setCourses] = useState();
  const [editGroupdata, setEditGroupData] = useState();

  const { userDetails } = useNMNContext();
  const router = useRouter();

  async function loadEverything() {
    // 1. Get all groups
    const { data: groupsData } = await supabase
      .from("test_groups").select("*").eq("type", type);
    if (!groupsData) {
      setLoading(false);
      return;
    }
    setGroups(groupsData);
    const groupIds = groupsData.map(g => g.id);

    if (groupIds.length === 0) {
      setLoading(false);
      return;
    }

    // 2. Get all categories for these groups
    const { data: categoriesData } = await supabase
      .from("categories").select("*").in("parent", groupIds);
    const categories = categoriesData || [];

    // 3. Get all m_categories
    const categoryIds = categories.map(c => c.id);
    const mCategoriesData = categoryIds.length > 0
      ? (await supabase.from("m_categories").select("*").in("parent", categoryIds)).data
      : [];
    const mCategories = mCategoriesData || [];

    // 4. Get all levels with their question counts
    const mCatIds = mCategories.map(m => m.id);
    const levelsData = mCatIds.length > 0
      ? (await supabase.from("levels").select("*,questions!questions_parent_fkey(id)").in("parent", mCatIds)).data
      : [];
    const levels = levelsData || [];

    // 5. Get user's plays (plays.user is stored as email, not user ID)
    let plays = [];
    if (userDetails?.email) {
      const { data: playsData } = await supabase
        .from("plays").select("test_uuid, score, isPassed, created_at, user")
        .eq("user", userDetails.email)
        .order("created_at", { ascending: false });
      plays = playsData || [];
    }

    // Build lookup: levelUuid -> { level, mCat, cat, group }
    const levelByUuid = {};
    levels.forEach(l => {
      if (!l.uuid) return;
      const mCat = mCategories.find(m => m.id === l.parent);
      const cat = mCat ? categories.find(c => c.id === mCat.parent) : null;
      const grp = cat ? groupsData.find(g => g.id === cat.parent) : null;
      levelByUuid[l.uuid] = { level: l, mCat, cat, group: grp };
    });

    // Compute per-group stats (hybrid: coverage + pass rate)
    const stats = {};
    groupsData.forEach(g => {
      const groupCats = categories.filter(c => c.parent === g.id);
      const groupCatIds = groupCats.map(c => c.id);
      const groupMCats = mCategories.filter(m => groupCatIds.includes(m.parent));
      const groupMCatIds = groupMCats.map(m => m.id);
      const groupLevels = levels.filter(l => groupMCatIds.includes(l.parent));

      const topicCount = groupCats.length;
      const totalTests = groupLevels.length;
      const questionCount = groupLevels.reduce((s, l) => s + (l.questions?.length || 0), 0);
      const groupLevelUuids = groupLevels.map(l => l.uuid).filter(Boolean);
      const groupPlays = plays.filter(p => groupLevelUuids.includes(p.test_uuid));
      // Phase 12 Ship E: hybrid progress — coverage (distinct attempted / total) and pass rate
      const attemptedUuids = new Set(groupPlays.map(p => p.test_uuid));
      const attemptedTests = attemptedUuids.size;
      const passedPlays = groupPlays.filter(p => p.isPassed).length;
      const coverage = totalTests > 0 ? Math.round((attemptedTests / totalTests) * 100) : 0;
      const passRate = groupPlays.length > 0 ? Math.round((passedPlays / groupPlays.length) * 100) : 0;
      const lastPlay = groupPlays[0]; // sorted desc

      stats[g.id] = {
        topicCount,
        totalTests,
        questionCount,
        attemptedTests,
        totalAttempts: groupPlays.length,
        passedPlays,
        coverage,    // % of tests you've touched at least once
        passRate,    // % of your attempts that passed
        progressPct: coverage, // primary number shown in bar = coverage
        lastPracticedAt: lastPlay?.created_at || null,
      };
    });
    setGroupStats(stats);

    // Compute overall stats
    // Topics started: distinct categories with at least one play
    const startedCatIds = new Set();
    const passedCatIds = new Set();
    const playsPerCat = {}; // catId -> [plays]
    plays.forEach(p => {
      const info = levelByUuid[p.test_uuid];
      if (info?.cat) {
        startedCatIds.add(info.cat.id);
        if (p.isPassed) passedCatIds.add(info.cat.id);
        if (!playsPerCat[info.cat.id]) playsPerCat[info.cat.id] = [];
        playsPerCat[info.cat.id].push(p);
      }
    });
    // Weak: cats with ≥2 plays and pass rate < 50%
    let weakCount = 0;
    Object.entries(playsPerCat).forEach(([catId, catPlays]) => {
      if (catPlays.length >= 2) {
        const passed = catPlays.filter(p => p.isPassed).length;
        const rate = passed / catPlays.length;
        if (rate < 0.5) weakCount++;
      }
    });
    // Streak: count consecutive days with at least one play (going back from today)
    const dateSet = new Set(plays.map(p => new Date(p.created_at).toDateString()));
    let streak = 0;
    const day = new Date();
    while (dateSet.has(day.toDateString())) {
      streak++;
      day.setDate(day.getDate() - 1);
    }

    setOverallStats({
      topicsStarted: startedCatIds.size,
      masteredTopics: passedCatIds.size,
      weakTopics: weakCount,
      streak,
    });

    // Continue card from most recent play
    if (plays.length > 0) {
      const mostRecent = plays[0];
      const info = levelByUuid[mostRecent.test_uuid];
      if (info) {
        setContinueCard({
          levelTitle: info.level.title,
          levelUuid: info.level.uuid,
          categoryTitle: info.cat?.title,
          groupTitle: info.group?.title,
          groupId: info.group?.id,
          score: mostRecent.score,
          isPassed: mostRecent.isPassed,
          practicedAt: mostRecent.created_at,
        });
      }
    }

    setLoading(false);
  }

  async function deleteGroupbyId(a) {
    const { data, error } = await supabase.from("test_groups").delete().eq("id", a).select();
    if (data) { toast.success("Deleted Successfully"); loadEverything(); }
    if (error) toast.error("Unable to Delete");
  }
  async function addGroup(a) {
    if (a == undefined) { toast.error("Data Empty"); return; }
    if (a?.title == undefined || a?.description == undefined || a?.image == undefined) {
      toast.error("Please fill all the fields"); return;
    }
    const { data, error } = await supabase.from("test_groups").insert({ ...a, type: type }).select();
    if (data) loadEverything();
    if (error) toast.error("Unable to Add");
  }
  async function getCourses() {
    const { data } = await supabase.from("courses").select("*");
    if (data) setCourses(data);
  }
  async function toggleDemo(a, b) {
    const { data, error } = await supabase.from("test_groups").update({ demo: a }).eq("id", b).select();
    if (data) { loadEverything(); toast.success("Updated"); }
    if (error) toast.error("Unable to Update");
  }
  async function updateGroup(a) {
    const { data, error } = await supabase.from("test_groups").update(a).eq("id", a?.id).select();
    if (data) { loadEverything(); toast.success("Updated"); }
    if (error) toast.error("Unable to Update");
  }

  useEffect(() => { loadEverything(); }, [type, userDetails]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: 360 }}>
        <CircularProgress size="sm" />
      </div>
    );
  }

  const firstName = userDetails?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div style={{ width: "100%", padding: "12px 4px 60px", textAlign: "left" }}>

      {/* ── Hero ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--c-text-tertiary)",
          marginBottom: 10,
        }}>
          Concept tests
        </div>
        <h1 style={{
          margin: "0 0 8px",
          fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em",
          color: "var(--c-text-primary)", lineHeight: 1.15,
        }}>
          Welcome back,{" "}
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
            {firstName}
          </span>.
        </h1>
        <p style={{
          margin: 0, fontSize: 14.5, lineHeight: 1.55,
          color: "var(--c-text-secondary)", maxWidth: "60ch",
        }}>
          {continueCard
            ? "You've been practicing. Pick up where you left off or explore a new section."
            : "Pick a section below to start practicing. Each topic has Easy / Moderate / Difficult levels."}
        </p>
      </div>

      {/* ── Continue card ── */}
      {continueCard && (
        <div
          onClick={() => continueCard.levelUuid && router.push(`/test/${continueCard.levelUuid}`)}
          style={{
            marginBottom: 24,
            background: "linear-gradient(135deg, var(--c-brand-primary-tint) 0%, var(--c-surface) 70%)",
            border: "1px solid var(--c-brand-primary-soft)",
            borderRadius: 22,
            padding: "24px 28px",
            display: "flex", alignItems: "center", gap: 22,
            position: "relative", overflow: "hidden",
            cursor: "pointer", transition: "all 0.18s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px -12px rgba(106, 77, 255, 0.2)"; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <div style={{
            position: "absolute", right: -30, top: -30,
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, var(--c-brand-primary-tint) 0%, transparent 70%)",
            opacity: 0.7, pointerEvents: "none",
          }} />
          <div style={{
            flexShrink: 0, width: 56, height: 56, borderRadius: 16,
            background: "var(--c-brand-primary)", color: "#fff",
            display: "grid", placeItems: "center",
            position: "relative", zIndex: 1,
          }}>
            <RotateCcw size={22} />
          </div>
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            <div style={{
              fontSize: 11, fontWeight: 500, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--c-brand-primary)",
              marginBottom: 4,
            }}>
              Pick up where you left off
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--c-text-primary)", marginBottom: 2, letterSpacing: "-0.015em" }}>
              {continueCard.levelTitle}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--c-text-secondary)" }}>
              {continueCard.groupTitle && `${continueCard.groupTitle} · `}
              {timeAgo(continueCard.practicedAt)}
              {typeof continueCard.score === "number" && ` · You scored ${continueCard.score}`}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); continueCard.levelUuid && router.push(`/test/${continueCard.levelUuid}`); }}
            style={{
              flexShrink: 0, position: "relative", zIndex: 1,
              height: 42, padding: "0 20px", borderRadius: 999,
              background: "var(--c-brand-primary)", color: "#fff",
              border: "none", fontFamily: "inherit",
              fontSize: 13.5, fontWeight: 500, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            Continue <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 32,
      }}>
        <KpiCard
          label="Topics started"
          value={overallStats.topicsStarted}
          unit={`of ${Object.values(groupStats).reduce((s, g) => s + g.topicCount, 0)}`}
          sub={(() => {
            const total = Object.values(groupStats).reduce((s, g) => s + g.topicCount, 0);
            const pct = total > 0 ? Math.round((overallStats.topicsStarted / total) * 100) : 0;
            return `${pct}% of syllabus`;
          })()}
        />
        <KpiCard
          label="Mastered"
          value={overallStats.masteredTopics}
          unit="topics"
          sub="Passed at least once"
          color="var(--c-success)"
        />
        <KpiCard
          label="Weak areas"
          value={overallStats.weakTopics}
          unit="topics"
          sub="< 50% pass rate"
          color={overallStats.weakTopics > 0 ? "var(--c-warning)" : undefined}
        />
        <KpiCard
          label="Current streak"
          value={overallStats.streak}
          unit={overallStats.streak === 1 ? "day" : "days"}
          sub={overallStats.streak > 0 ? "Keep it going 🔥" : "Start today"}
          color={overallStats.streak > 0 ? "var(--c-brand-gold)" : undefined}
        />
      </div>

      {/* ── Empty groups state ── */}
      {(groups == undefined || groups?.length == 0) && (
        <div style={{
          width: "100%", padding: "32px 28px", borderRadius: 16,
          background: "var(--c-surface-muted, var(--c-bg))",
          border: "1px dashed var(--c-border-soft)",
          color: "var(--c-text-tertiary)", fontSize: 14,
          textAlign: "center",
        }}>
          No collections available yet. Please check back later.
        </div>
      )}

      {/* ── Section list ── */}
      {groups && groups.length > 0 && (
        <>
          <h2 style={{
            fontSize: 20, fontWeight: 600, letterSpacing: "-0.018em",
            margin: "32px 0 16px",
            color: "var(--c-text-primary)",
          }}>All collections</h2>

          <div style={{
            display: "flex", flexDirection: "column",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 18,
            overflow: "hidden",
          }}>
            {groups.map((g, idx) => {
              const stats = groupStats[g.id] || { topicCount: 0, questionCount: 0, progressPct: 0, lastPracticedAt: null };
              const sectionType = detectSectionType(g);
              const barColor = sectionBarColors[sectionType];
              return (
                <SectionRow
                  key={g.id}
                  group={g}
                  stats={stats}
                  sectionType={sectionType}
                  barColor={barColor}
                  isLast={idx === groups.length - 1}
                  role={role}
                  onSelect={() => onSelect(g.id)}
                  onDelete={() => deleteGroupbyId(g.id)}
                  onToggleDemo={(v) => toggleDemo(v, g.id)}
                  courses={courses}
                  getCourses={getCourses}
                  editGroupdata={editGroupdata}
                  setEditGroupData={setEditGroupData}
                  updateGroup={updateGroup}
                />
              );
            })}
          </div>

          {role == "admin" && (
            <div style={{ marginTop: 16 }}>
              <Popover onOpenChange={(e) => e == true ? getCourses() : ""}>
                <PopoverTrigger>
                  <Button startContent={<Plus size={14} />} variant="bordered" size="sm">
                    Add new collection
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px]">
                  <ImageUploader
                    data={{ image: groupData?.image }}
                    onUploadComplete={(e) => setGroupData((res) => ({ ...res, image: e }))}
                  />
                  <Input className="my-2" value={groupData?.title} size="sm" label="Title"
                    onChange={(e) => setGroupData((res) => ({ ...res, title: e.target.value }))} />
                  <Input className="my-2" value={groupData?.description} size="sm" label="Description"
                    onChange={(e) => setGroupData((res) => ({ ...res, description: e.target.value }))} />
                  <Select label="Course" onSelectionChange={(e) => setGroupData((res) => ({ ...res, course_id: e.anchorKey }))}>
                    {courses && courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </Select>
                  <Button size="sm" color="primary" className="mr-auto" onPress={() => addGroup(groupData)}>
                    Add Collection
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── KPI card ──
function KpiCard({ label, value, unit, sub, color }) {
  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border-faint)",
      borderRadius: 16,
      padding: "18px 20px",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--c-text-tertiary)",
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em",
        color: color || "var(--c-text-primary)", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
        {unit && <span style={{ fontSize: 13, color: "var(--c-text-tertiary)", marginLeft: 3, fontWeight: 500 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 5 }}>
        {sub}
      </div>
    </div>
  );
}

// ── Section row ──
function SectionRow({ group, stats, sectionType, barColor, isLast, role, onSelect, onDelete, onToggleDemo, courses, getCourses, editGroupdata, setEditGroupData, updateGroup }) {
  const isStarted = stats.progressPct > 0 || stats.lastPracticedAt;
  const ctaLabel = stats.progressPct === 0 ? "Start →" : "Continue →";

  return (
    <div
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr 220px 120px",
        alignItems: "center",
        padding: "18px 24px",
        borderBottom: isLast ? "none" : "1px solid var(--c-border-faint)",
        cursor: "pointer",
        transition: "background 0.15s",
        gap: 16,
      }}
      onMouseOver={(e) => e.currentTarget.style.background = "var(--c-surface-muted, var(--c-bg))"}
      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
    >
      {/* Section avatar */}
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: sectionGradients[sectionType],
        color: sectionType === "va" ? "#1D1D1F" : "#fff",
        display: "grid", placeItems: "center",
        fontWeight: 700, fontSize: 14,
        letterSpacing: "-0.01em",
      }}>
        {sectionAbbrev(group)}
      </div>

      {/* Title + meta */}
      <div>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.012em" }}>
          {group.title}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", marginTop: 2 }}>
          {stats.topicCount} {stats.topicCount === 1 ? "topic" : "topics"}
          {stats.questionCount > 0 && ` · ${stats.questionCount.toLocaleString()} questions`}
          {stats.lastPracticedAt && ` · Last practiced ${timeAgo(stats.lastPracticedAt)}`}
        </div>
      </div>

      {/* Progress bar — coverage as bar, pass rate as sub-text */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 12, color: "var(--c-text-secondary)", fontWeight: 500,
        }}>
          <span>Coverage</span>
          <span style={{
            color: isStarted ? "var(--c-text-primary)" : "var(--c-text-tertiary)",
            fontWeight: 600, fontVariantNumeric: "tabular-nums",
          }}>
            {isStarted ? `${stats.coverage}%` : "Not started"}
          </span>
        </div>
        <div style={{
          height: 6, borderRadius: 999,
          background: "var(--c-surface-sunken, var(--c-surface-muted))",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 999,
            width: `${Math.max(isStarted ? 2 : 0, stats.coverage)}%`,
            background: barColor,
            transition: "width 0.4s ease",
          }} />
        </div>
        {isStarted && (
          <div style={{
            fontSize: 11, color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>{stats.attemptedTests} / {stats.totalTests} tests</span>
            <span>{stats.passRate}% pass rate</span>
          </div>
        )}
      </div>

      {/* CTA + admin */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: barColor,
          whiteSpace: "nowrap",
        }}>
          {ctaLabel}
        </span>
        {role == "admin" && (
          <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <Popover placement="bottom-end"
              onOpenChange={(e) => { e == true ? (setEditGroupData(group), getCourses()) : setEditGroupData(); }}>
              <PopoverTrigger>
                <Button size="sm" isIconOnly variant="light"><EditIcon size={14} /></Button>
              </PopoverTrigger>
              <PopoverContent>
                <ImageUploader data={{ image: editGroupdata?.image }} onUploadComplete={(e) => setEditGroupData((res) => ({ ...res, image: e }))} />
                <Input className="my-2" value={editGroupdata?.title} size="sm" label="Title"
                  onChange={(e) => setEditGroupData((res) => ({ ...res, title: e.target.value }))} />
                <Input className="my-2" value={editGroupdata?.description} size="sm" label="Description"
                  onChange={(e) => setEditGroupData((res) => ({ ...res, description: e.target.value }))} />
                <Select label="Course" selectedKeys={[editGroupdata?.course_id?.toString()]}
                  onSelectionChange={(e) => setEditGroupData((res) => ({ ...res, course_id: e.anchorKey }))}>
                  {courses && courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </Select>
                <Button size="sm" color="primary" onPress={() => updateGroup(editGroupdata)}>Save</Button>
              </PopoverContent>
            </Popover>
            <Dropdown size="sm" placement="bottom-end">
              <DropdownTrigger>
                <Button size="sm" isIconOnly variant="light"><MoreVertical size={14} /></Button>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem startContent={<Trash2 size={14} />} color="danger" onPress={onDelete}>
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  );
}
