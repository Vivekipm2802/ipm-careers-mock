// ============================================================
// VideoGroups — Phase 19 Ship D: real "Explore by topic" strip
// Builds on Ship C.2 (chip filter inside All packs). Ship D adds a
// horizontal scroll strip of REAL topics — pulled from vcategory /
// lvcategory where type='parent'. These are the purple section headers
// students see inside a pack (Profit and Loss, Percentage, Ratio and
// Proportion, etc.) — surfaced on the landing page so a student who knows
// what they want to study can jump straight to it.
//
// Schema used:
// - vcategory  (pre-recorded) — id, title, group_id, parent, type, seq
// - lvcategory (live recordings) — same columns
// - videos / lvideos — id, category (=vcategory.id), seq
// `type='parent'` rows are chapters; `type='sub'` rows are lessons; videos
// hang off the sub rows.
//
// Click a topic card → opens its pack. Jump-to-topic deep-link will land
// in Ship D.1 once the pack player accepts a topic hint.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Input,
  Select,
  SelectItem,
  Switch,
} from "@nextui-org/react";
import {
  EditIcon,
  Plus,
  Trash2,
  PlayCircle,
  ArrowRight,
  Eye,
  Star,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import ImageUploader from "./ImageUploader";
import { useNMNContext } from "./NMNContext";

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

export default function VideoGroups({ type, children, role, title }) {
  const [selectedGroup, setSelectedGroup] = useState();

  function clearSelection() {
    setSelectedGroup();
  }

  return selectedGroup ? (
    children({ group: selectedGroup, clearSelection })
  ) : (
    <Selector
      title={title}
      role={role}
      type={type}
      onSelect={(e) => {
        setSelectedGroup(e);
      }}
    />
  );
}

// ============================================================
// Style tokens — match ConceptGroups visual language
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

// Phase 19 Ship C: Topic categorization for video packs
const TOPICS = [
  {
    key: "quant",
    label: "Quant",
    full: "Quantitative Ability",
    gradient: "linear-gradient(135deg, #78350F 0%, #B45309 60%, #E7A33E 100%)",
    accent: "#E7A33E",
    icon: "𝒙²",
  },
  {
    key: "verbal",
    label: "Verbal",
    full: "Verbal Ability",
    gradient: "linear-gradient(135deg, #14532D 0%, #16A34A 60%, #4ADE80 100%)",
    accent: "#4ADE80",
    icon: "Aa",
  },
  {
    key: "logical",
    label: "Logical",
    full: "Logical Reasoning",
    gradient: "linear-gradient(135deg, #7C2D12 0%, #EA580C 60%, #FB923C 100%)",
    accent: "#FB923C",
    icon: "◇",
  },
  {
    key: "pi",
    label: "PI Prep",
    full: "Personal Interview",
    gradient: "linear-gradient(135deg, #7F1D1D 0%, #DC2626 60%, #F87171 100%)",
    accent: "#F87171",
    icon: "✦",
  },
];

// ============================================================
// Selector — main view
// ============================================================

const Selector = ({ type, onSelect, role, title }) => {
  const ctx = useNMNContext();
  const userDetails = ctx?.userDetails;
  const isAdmin = role === "admin";

  const [groups, setGroups] = useState();
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState();
  const [courses, setCourses] = useState();
  const [editGroupdata, setEditGroupData] = useState();
  const [batches, setBatches] = useState();
  // Phase 19 Ship C: filter by topic
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Phase 19 Ship D: real topics fetched from vcategory / lvcategory
  // (top-level type='parent' rows — the "Profit and Loss / Percentage /
  //  Ratio and Proportion" purple section headers from inside packs)
  const [realTopics, setRealTopics] = useState([]);
  const [realVideoCounts, setRealVideoCounts] = useState({}); // {topicId: count}

  // Phase 22 Ship E.3: watch tracking — drives Continue Watching card +
  // WATCHED / TIME / STREAK stat tiles. Source: video_plays table.
  const [userEmail, setUserEmail] = useState(ctx?.userDetails?.email || null);
  useEffect(() => {
    if (userEmail) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (alive && data?.user?.email) setUserEmail(data.user.email);
      } catch (_e) {}
    })();
    return () => {
      alive = false;
    };
  }, [userEmail]);

  const [continueLast, setContinueLast] = useState(null);
  // {videoId, videoTitle, packId, packTitle, parentChapterId, watchedSeconds}
  const [watchStats, setWatchStats] = useState({
    watched: 0,
    timeThisWeek: 0,
    streak: 0,
  });

  // ----------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------

  async function getGroups() {
    const { data, error } = await supabase
      .from("video_groups")
      .select("*")
      .eq("type", type);
    if (data) {
      setGroups(data);
      setLoading(false);
    }
    if (error) {
      toast.error("Unable to Load Content");
      setLoading(false);
    }
  }

  // Phase 19 Ship D: pull real topics (vcategory / lvcategory) for visible packs
  async function getRealTopics(packIds) {
    if (!packIds?.length) {
      setRealTopics([]);
      setRealVideoCounts({});
      return;
    }
    const categoryTable = type === "lvideo" ? "lvcategory" : "vcategory";
    const videoTable = type === "lvideo" ? "lvideos" : "videos";

    try {
      // 1. Fetch top-level topics across visible packs
      const { data: parents, error: pErr } = await supabase
        .from(categoryTable)
        .select("id, title, group_id, seq")
        .in("group_id", packIds)
        .eq("type", "parent")
        .order("seq", { ascending: true });

      if (pErr || !parents?.length) {
        setRealTopics([]);
        setRealVideoCounts({});
        return;
      }

      // 2. Fetch subtopics under each parent (we need them to count videos)
      const { data: subs } = await supabase
        .from(categoryTable)
        .select("id, parent")
        .in("parent", parents.map((p) => p.id));

      const subIds = (subs || []).map((s) => s.id);
      let vids = [];
      if (subIds.length) {
        const { data: vidsData } = await supabase
          .from(videoTable)
          .select("id, category")
          .in("category", subIds);
        vids = vidsData || [];
      }

      // 3. Aggregate video count per parent topic
      const subToParent = {};
      (subs || []).forEach((s) => {
        subToParent[s.id] = s.parent;
      });
      const countByParent = {};
      vids.forEach((v) => {
        const p = subToParent[v.category];
        if (p) countByParent[p] = (countByParent[p] || 0) + 1;
      });

      setRealTopics(parents);
      setRealVideoCounts(countByParent);
    } catch (e) {
      // Silently degrade — the section just won't render
      console.warn("[VideoGroups] getRealTopics failed:", e?.message);
      setRealTopics([]);
      setRealVideoCounts({});
    }
  }

  async function getBatches() {
    const { data, error } = await supabase
      .from("batches")
      .select("id,title");
    if (error) return;
    if (data) setBatches(data);
  }

  async function deleteGroupbyId(a) {
    const { data, error } = await supabase
      .from("video_groups")
      .delete()
      .eq("id", a)
      .select();
    if (data) {
      toast.success("Deleted Successfully");
      getGroups();
    }
    if (error) toast.error("Unable to Delete");
  }

  async function addGroup(a) {
    if (a == undefined) {
      toast.error("Data Empty");
      return;
    }
    if (!a?.title || !a?.description || !a?.image) {
      toast.error("Please fill all the fields");
      return;
    }
    const insertData = {
      title: a.title,
      description: a.description,
      image: a.image,
      type: type,
    };
    if (a.course_id) insertData.course_id = a.course_id;
    if (a.batch_id) insertData.batch_id = a.batch_id;
    if (a.topic) insertData.topic = a.topic; // Phase 19 Ship C

    const { data, error } = await supabase
      .from("video_groups")
      .insert(insertData)
      .select();
    if (data) {
      toast.success("Pack added");
      setGroupData(undefined);
      getGroups();
    }
    if (error) {
      toast.error("Unable to Add: " + (error?.message || ""));
    }
  }

  async function getCourses() {
    const { data, error } = await supabase.from("courses").select("*");
    if (data) setCourses(data);
    if (error) toast.error("Unable to Load Content");
  }

  async function toggleDemo(a, b) {
    const { data, error } = await supabase
      .from("video_groups")
      .update({ demo: a })
      .eq("id", b)
      .select();
    if (data) {
      getGroups();
      toast.success("Updated Successfully");
    }
    if (error) toast.error("Unable to Update");
  }

  async function updateGroup(a) {
    if (!a?.id) return;
    const updateData = {};
    if (a.title !== undefined) updateData.title = a.title;
    if (a.description !== undefined) updateData.description = a.description;
    if (a.image !== undefined) updateData.image = a.image;
    if (a.course_id !== undefined) updateData.course_id = a.course_id;
    if (a.batch_id !== undefined) updateData.batch_id = a.batch_id;
    if (a.topic !== undefined) updateData.topic = a.topic; // Phase 19 Ship C

    const { data, error } = await supabase
      .from("video_groups")
      .update(updateData)
      .eq("id", a.id)
      .select();
    if (data) {
      getGroups();
      toast.success("Successfully Updated");
    }
    if (error) {
      toast.error("Unable to Update: " + (error?.message || ""));
    }
  }

  useEffect(() => {
    getGroups();
    if (type == "lvideo") getBatches();
  }, [type]);

  // Phase 19 Ship D: fetch real topics once groups are known
  useEffect(() => {
    if (!groups) return;
    const visiblePackIds = groups
      .filter((g) => !g.hidden || isAdmin)
      .map((g) => g.id);
    getRealTopics(visiblePackIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, isAdmin]);

  // Phase 22 Ship E.3: load Continue Watching + stats from video_plays.
  useEffect(() => {
    if (!userEmail) return;
    const categoryTable = type === "lvideo" ? "lvcategory" : "vcategory";
    let alive = true;

    (async () => {
      try {
        // ── Continue Watching: last play row + walk video → sub → chapter → pack
        const { data: lastPlay } = await supabase
          .from("video_plays")
          .select("video_id, position_seconds, updated_at")
          .eq("user_email", userEmail)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (alive && lastPlay) {
          // Lookup chain: video → sub-cat → parent chapter → pack
          const { data: vid } = await supabase
            .from(type === "lvideo" ? "lvideos" : "videos")
            .select("id, title, category, duration_seconds")
            .eq("id", lastPlay.video_id)
            .maybeSingle();
          if (alive && vid) {
            const { data: sub } = await supabase
              .from(categoryTable)
              .select("id, parent")
              .eq("id", vid.category)
              .maybeSingle();
            if (alive && sub) {
              const { data: chap } = await supabase
                .from(categoryTable)
                .select("id, group_id")
                .eq("id", sub.parent)
                .maybeSingle();
              if (alive && chap) {
                const { data: pk } = await supabase
                  .from("video_groups")
                  .select("id, title")
                  .eq("id", chap.group_id)
                  .maybeSingle();
                if (alive) {
                  setContinueLast({
                    videoId: lastPlay.video_id,
                    videoTitle: vid.title || "Lesson",
                    packId: pk?.id,
                    packTitle: pk?.title || "Pack",
                    parentChapterId: sub.parent,
                    watchedSeconds: lastPlay.position_seconds,
                    durationSeconds: vid.duration_seconds || null,
                  });
                }
              }
            }
          }
        }

        // ── Stats
        // 1. WATCHED count: distinct video plays
        const { count: watchedCount } = await supabase
          .from("video_plays")
          .select("video_id", { count: "exact", head: true })
          .eq("user_email", userEmail);

        // 2. TIME this week: sum of position_seconds in last 7 days
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: weekly } = await supabase
          .from("video_plays")
          .select("position_seconds")
          .eq("user_email", userEmail)
          .gte("updated_at", sevenDaysAgo);
        const timeThisWeek = (weekly || []).reduce(
          (a, r) => a + (Number(r.position_seconds) || 0),
          0,
        );

        // 3. STREAK: consecutive days with activity ending today (IST)
        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: monthly } = await supabase
          .from("video_plays")
          .select("updated_at")
          .eq("user_email", userEmail)
          .gte("updated_at", thirtyDaysAgo);

        const streak = computeStreak(monthly || []);

        if (alive) {
          setWatchStats({
            watched: watchedCount || 0,
            timeThisWeek,
            streak,
          });
        }
      } catch (e) {
        console.warn("[VideoGroups] watch-stats load failed:", e?.message);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userEmail, type]);

  // ----------------------------------------------------------
  // Derived
  // ----------------------------------------------------------
  const visibleGroups = useMemo(
    () => (groups || []).filter((g) => !g.hidden || isAdmin),
    [groups, isAdmin],
  );

  const featuredPack = useMemo(() => {
    return visibleGroups[0] || null;
  }, [visibleGroups]);

  // Phase 19 Ship C: per-topic pack counts (used by topic tiles)
  const topicCounts = useMemo(() => {
    const counts = {};
    TOPICS.forEach((t) => (counts[t.key] = 0));
    visibleGroups.forEach((g) => {
      if (g.topic && counts[g.topic] !== undefined) counts[g.topic]++;
    });
    return counts;
  }, [visibleGroups]);

  // Phase 19 Ship C.1: "All packs" grid now includes EVERY visible pack
  // (the featured one at top is a spotlight, not a removal — students were
  // confused when the featured pack went missing from the list below).
  const remainingPacks = useMemo(() => {
    if (!selectedTopic) return visibleGroups;
    return visibleGroups.filter((g) => g.topic === selectedTopic);
  }, [visibleGroups, selectedTopic]);

  const stats = useMemo(() => {
    const total = visibleGroups.length;
    const demoCount = visibleGroups.filter((g) => g.demo).length;
    return { total, demoCount };
  }, [visibleGroups]);

  const studentFirstName = useMemo(() => {
    const full = userDetails?.user_metadata?.full_name || "";
    return full.split(" ")[0] || "there";
  }, [userDetails]);

  const heroCopy = useMemo(() => {
    if (type === "lvideo") {
      return {
        eyebrow: "Live Recordings",
        accent: "sessions",
        lead:
          "Catch up on a missed live class — or rewatch a session to lock in the concepts before you sit a mock.",
      };
    }
    return {
      eyebrow: "Self Learning",
      accent: "learn",
      lead:
        "Short, focused video packs to build understanding before you sit a mock. Pick a pack to dive into the topic.",
    };
  }, [type]);

  // ----------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------
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
            animation: "ipm-videos-spin 0.8s linear infinite",
          }}
        />
        <style jsx global>{`
          @keyframes ipm-videos-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: FONT,
        padding: "24px 28px 36px",
        color: "var(--c-text-primary)",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      {/* ===== Hero greeting ===== */}
      <div style={{ ...eyebrowStyle, marginBottom: 8 }}>
        {heroCopy.eyebrow}
      </div>
      <h1
        style={{
          margin: "0 0 6px",
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
          color: "var(--c-text-primary)",
        }}
      >
        Watch and <span className="ds-grad-text" style={serifStyle}>{heroCopy.accent}</span>.
      </h1>
      <p
        style={{
          margin: "0 0 28px",
          fontSize: 15,
          lineHeight: 1.5,
          color: "var(--c-text-secondary)",
          maxWidth: "62ch",
        }}
      >
        {heroCopy.lead}
      </p>

      {/* ===== Hero row: Featured pack + 3 stat tiles stacked ===== */}
      {featuredPack && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 18,
            marginBottom: 36,
          }}
        >
          {/* Phase 22 Ship E.3: Continue Watching takes priority over Featured
              when the student has a recent play. Falls back to Featured pack
              when no plays exist yet (e.g. first-time visitor). */}
          {continueLast ? (
            <ContinueWatchingCard
              videoTitle={continueLast.videoTitle}
              packTitle={continueLast.packTitle}
              watchedSeconds={continueLast.watchedSeconds}
              durationSeconds={continueLast.durationSeconds}
              onResume={() => {
                // Hand the chapter id to PackPlayer via sessionStorage so it
                // can pre-select the right chapter on mount.
                try {
                  if (typeof window !== "undefined" && continueLast.parentChapterId) {
                    window.sessionStorage.setItem(
                      "ipm-topic-intent",
                      String(continueLast.parentChapterId),
                    );
                  }
                } catch (_e) {}
                if (continueLast.packId) onSelect(continueLast.packId);
              }}
            />
          ) : (
            <FeaturedPackCard
              pack={featuredPack}
              onAccess={() => onSelect(featuredPack.id)}
              label={
                type === "lvideo" ? "Latest live session" : "Featured pack"
              }
            />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <StatTile
              label="Watched"
              value={watchStats.watched}
              unit={watchStats.watched === 1 ? "video" : "videos"}
              sub={
                watchStats.watched > 0
                  ? "Keep going — pick up where you left off"
                  : "Nothing yet — your first lesson is one click away"
              }
              icon={<PlayCircle size={18} />}
            />
            <StatTile
              label="Time this week"
              value={formatHours(watchStats.timeThisWeek)}
              unit=""
              sub={
                watchStats.timeThisWeek > 0
                  ? "Across the last 7 days"
                  : "No watch time yet this week"
              }
              icon={<Eye size={18} />}
            />
            <StatTile
              label="Streak"
              value={watchStats.streak}
              unit={watchStats.streak === 1 ? "day" : "days"}
              sub={
                watchStats.streak > 0
                  ? "Don't break the chain"
                  : "Watch one lesson today to start a streak"
              }
              icon={<Star size={18} />}
            />
          </div>
        </div>
      )}

      {/* ===== Phase 19 Ship D: Explore by topic — REAL topics ===== */}
      {/* Sources from vcategory.type='parent' across visible packs.
         These are the purple section headers students see inside a pack —
         Profit and Loss, Percentage, Ratio and Proportion, etc. Click a
         card → opens its pack. (Jump-to-topic deep-link will land in Ship D.1
         once the pack player is wired to accept a topic hint.) */}
      {realTopics.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ ...eyebrowStyle, marginBottom: 6 }}>
                Explore by topic
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.018em",
                  color: "var(--c-text-primary)",
                }}
              >
                Jump straight to a <span style={serifStyle}>chapter</span>
              </h2>
            </div>
            <span style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
              {realTopics.length}{" "}
              {realTopics.length === 1 ? "topic" : "topics"} across{" "}
              {new Set(realTopics.map((t) => t.group_id)).size}{" "}
              {new Set(realTopics.map((t) => t.group_id)).size === 1
                ? "pack"
                : "packs"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 8,
              scrollbarWidth: "thin",
              marginRight: -28,
              paddingRight: 28,
            }}
          >
            {realTopics.map((t) => {
              const pack = visibleGroups.find((g) => g.id === t.group_id);
              const packTopicMeta = TOPICS.find(
                (x) => x.key === pack?.topic,
              );
              return (
                <TopicCard
                  key={t.id}
                  title={t.title}
                  packTitle={pack?.title || "—"}
                  videoCount={realVideoCounts[t.id] || 0}
                  accent={
                    packTopicMeta?.accent || "var(--c-brand-primary)"
                  }
                  onClick={() => {
                    // Phase 19 Ship D.1: stash the chapter intent so the pack
                    // player (PreRecorded.js) can auto-select the right sub-
                    // category on mount. Cleared after one use.
                    try {
                      if (typeof window !== "undefined") {
                        window.sessionStorage.setItem(
                          "ipm-topic-intent",
                          String(t.id),
                        );
                      }
                    } catch (_e) {
                      /* sessionStorage unavailable — fall back to default open */
                    }
                    onSelect(t.group_id);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Phase 19 Ship C.2: All packs heading + chip filter row ===== */}
      {/* (Replaced the gradient "Explore by topic" tiles — students saw the
         section-level categorisation as redundant with the All packs grid.
         A slim chip filter inside the All packs card is the same affordance
         with one-tenth the visual weight. Real topic exploration — surfacing
         video sections like "Profit and Loss" / "Percentage" — needs the
         videos schema and ships separately in Ship D.) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.018em",
            margin: 0,
            color: "var(--c-text-primary)",
          }}
        >
          All <span style={{ color: "var(--c-text-tertiary)" }}>packs</span>
        </h2>
        <span
          style={{
            fontSize: 12.5,
            color: "var(--c-text-tertiary)",
          }}
        >
          {remainingPacks.length}{" "}
          {remainingPacks.length === 1 ? "pack" : "packs"}
          {selectedTopic ? " in this section" : " available"}
        </span>
      </div>

      {/* Chip filter row — matches self-learning-refined.html preview */}
      {visibleGroups.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            background: "var(--c-bg-elev)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 14,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--c-text-tertiary)",
              marginRight: 4,
            }}
          >
            Filter
          </div>
          <FilterChip
            label="All"
            count={visibleGroups.length}
            active={!selectedTopic}
            onClick={() => setSelectedTopic(null)}
          />
          {TOPICS.map((t) => (
            <FilterChip
              key={t.key}
              label={t.label}
              count={topicCounts[t.key] || 0}
              active={selectedTopic === t.key}
              onClick={() =>
                setSelectedTopic(selectedTopic === t.key ? null : t.key)
              }
            />
          ))}
        </div>
      )}

      {visibleGroups.length === 0 ? (
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
            No packs yet
          </div>
          <div>New video packs will appear here soon.</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {remainingPacks.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              isAdmin={isAdmin}
              onAccess={() => onSelect(pack.id)}
              onDelete={() => deleteGroupbyId(pack.id)}
              onToggleDemo={(v) => toggleDemo(v, pack.id)}
              courses={courses}
              getCourses={getCourses}
              editGroupdata={editGroupdata}
              setEditGroupData={setEditGroupData}
              updateGroup={updateGroup}
              batches={batches}
              type={type}
            />
          ))}
        </div>
      )}

      {/* Admin: Add new pack */}
      {isAdmin && (
        <div style={{ marginTop: 18 }}>
          <Popover onOpenChange={(e) => (e == true ? getCourses() : "")}>
            <PopoverTrigger>
              <Button
                startContent={<Plus size={14} />}
                variant="bordered"
                size="sm"
              >
                Add new pack
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px]">
              <ImageUploader
                data={{ image: groupData?.image }}
                onUploadComplete={(e) =>
                  setGroupData((res) => ({ ...res, image: e }))
                }
              />
              <Input
                className="my-2"
                value={groupData?.title}
                size="sm"
                label="Title"
                placeholder="Enter Title"
                onChange={(e) =>
                  setGroupData((res) => ({ ...res, title: e.target.value }))
                }
              />
              <Input
                className="my-2"
                value={groupData?.description}
                size="sm"
                label="Description"
                placeholder="Enter Description"
                onChange={(e) =>
                  setGroupData((res) => ({
                    ...res,
                    description: e.target.value,
                  }))
                }
              />
              <Select
                label="Course"
                placeholder="Select Course"
                onSelectionChange={(e) =>
                  setGroupData((res) => ({ ...res, course_id: e.anchorKey }))
                }
              >
                {courses &&
                  courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
              </Select>
              {/* Phase 19 Ship C: Topic dropdown */}
              <Select
                className="my-2"
                size="sm"
                label="Topic"
                placeholder="Select topic (optional)"
                selectedKeys={groupData?.topic ? [groupData.topic] : []}
                onSelectionChange={(e) =>
                  setGroupData((res) => ({ ...res, topic: e.anchorKey }))
                }
              >
                {TOPICS.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.full}
                  </SelectItem>
                ))}
              </Select>
              {type == "lvideo" && (
                <Select
                  label="Batch ID"
                  selectedKeys={[groupData?.batch_id?.toString()]}
                  placeholder="Select Batch"
                  onSelectionChange={(e) =>
                    setGroupData((res) => ({ ...res, batch_id: e.anchorKey }))
                  }
                >
                  {batches &&
                    batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                </Select>
              )}
              <Button
                size="sm"
                color="primary"
                className="mr-auto mt-2 flex-shrink-0"
                onPress={() => addGroup(groupData)}
              >
                Add Pack
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

// ============================================================
// ContinueWatchingCard — Phase 22 Ship E.3
// Hero card shown when the student has a recent video_plays row.
// Replaces the FeaturedPackCard when there's something to resume.
// ============================================================

function ContinueWatchingCard({
  videoTitle,
  packTitle,
  watchedSeconds,
  durationSeconds,
  onResume,
}) {
  // Real % if duration is known. Falls back to a flat 100% bar (subtle white
  // strip) when admin hasn't set a duration on this video yet.
  const hasDuration =
    Number.isFinite(durationSeconds) && durationSeconds > 0;
  const progressPct = hasDuration
    ? Math.max(
        0,
        Math.min(100, (watchedSeconds / durationSeconds) * 100),
      )
    : null;
  const remainingSeconds = hasDuration
    ? Math.max(0, durationSeconds - watchedSeconds)
    : null;

  return (
    <div
      onClick={onResume}
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        aspectRatio: "16 / 9",
        background:
          "linear-gradient(135deg, #3A2C14 0%, #8A5A0C 55%, #DDA032 100%)",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: "0 14px 28px -18px rgba(124, 58, 237, 0.45)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Dark overlay at bottom for text readability — matches preview */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          color: "#fff",
        }}
      >
        {/* CONTINUE WATCHING pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(8px)",
            padding: "5px 12px",
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 12,
            width: "fit-content",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.25)",
              animation: "ipm-cw-pulse 1.8s ease-in-out infinite",
            }}
          />
          Continue watching
        </div>

        {/* Title */}
        <h2
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {videoTitle}
        </h2>

        {/* Meta */}
        <div
          style={{
            fontSize: 13,
            opacity: 0.85,
            marginBottom: 14,
          }}
        >
          {packTitle}
          {hasDuration ? (
            <> · {formatWatched(remainingSeconds)} left</>
          ) : (
            watchedSeconds > 0 && (
              <> · {formatWatched(watchedSeconds)} watched</>
            )
          )}
        </div>

        {/* Controls row — progress bar + Resume button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 4,
              background: "rgba(255,255,255,0.25)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#fff",
                width: hasDuration ? `${progressPct}%` : "100%",
                borderRadius: 999,
                opacity: hasDuration ? 1 : 0.4,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          {hasDuration && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {Math.round(progressPct)}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResume();
            }}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 999,
              background: "#fff",
              color: "#2D1B69",
              border: "none",
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <PlayCircle size={16} fill="currentColor" />
            Resume
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ipm-cw-pulse {
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// FeaturedPackCard — cinematic hero card with thumbnail bg
// ============================================================

function FeaturedPackCard({ pack, onAccess, label }) {
  return (
    <div
      onClick={onAccess}
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        aspectRatio: "16 / 9",
        background: pack.image
          ? `url(${pack.image}) center/cover`
          : "linear-gradient(135deg, #3A2C14 0%, #8A5A0C 55%, #DDA032 100%)",
        boxShadow: "0 4px 24px -8px rgba(0,0,0,0.18)",
      }}
    >
      {/* Gradient overlay for text legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)",
        }}
      />
      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255, 255, 255, 0.18)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "5px 12px",
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 12,
            width: "fit-content",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.25)",
            }}
          />
          {label}
        </div>
        <div
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {pack.title}
        </div>
        {pack.description && (
          <div
            style={{
              fontSize: 13,
              opacity: 0.88,
              marginBottom: 16,
              lineHeight: 1.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {pack.description}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccess();
            }}
            style={{
              height: 40,
              padding: "0 20px",
              borderRadius: 999,
              background: "#fff",
              color: "#1A1A1A",
              border: "none",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <PlayCircle size={16} fill="currentColor" />
            Access pack
          </button>
          {/* Phase 21 Ship A.3: dropped the "Demo" pill — it added noise
              without value (for demo students every pack is demo). */}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// StatTile — KpiCard-style with icon
// ============================================================

function StatTile({ label, value, unit, sub, icon }) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flex: 1,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "var(--c-brand-soft, rgba(199, 57, 47, 0.08))",
          color: "var(--c-brand-primary)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--c-text-tertiary)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--c-text-primary)",
            letterSpacing: "-0.018em",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
          }}
        >
          {value}
          {unit && (
            <span
              style={{
                fontSize: 12,
                color: "var(--c-text-tertiary)",
                fontWeight: 500,
                marginLeft: 4,
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
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FilterChip — Phase 19 Ship C.2: slim pill chip for All packs filter row
// (Replaced the gradient TopicTile from Ship C — same filter behaviour,
//  matches self-learning-refined.html preview, no visual redundancy with
//  the All packs grid below it.)
// ============================================================

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 14px",
        borderRadius: 999,
        border: active
          ? "1px solid var(--c-brand-primary)"
          : "1px solid var(--c-border-faint)",
        background: active ? "var(--c-brand-primary)" : "var(--c-surface)",
        color: active ? "white" : "var(--c-text-primary)",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        cursor: "pointer",
        transition:
          "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--c-border-soft)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--c-border-faint)";
        }
      }}
    >
      <span>{label}</span>
      <span
        style={{
          display: "inline-grid",
          placeItems: "center",
          minWidth: 22,
          height: 20,
          padding: "0 6px",
          borderRadius: 999,
          background: active
            ? "rgba(255,255,255,0.22)"
            : "var(--c-bg-elev)",
          color: active ? "white" : "var(--c-text-tertiary)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0,
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================
// TopicCard — Phase 19 Ship D: real-topic card for "Explore by topic" strip
// (One card per top-level vcategory row — e.g. "Profit and Loss" — with
//  the parent pack name + a video count. Coloured top bar uses the pack's
//  section accent from the TOPICS table.)
// ============================================================

function TopicCard({ title, packTitle, videoCount, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "0 0 240px",
        minHeight: 124,
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 14,
        padding: "14px 16px 14px",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        fontFamily: "inherit",
        color: "var(--c-text-primary)",
        transition:
          "transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.boxShadow =
          "0 10px 22px -14px rgba(20,19,15,0.22)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--c-border-faint)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Accent bar at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
        }}
      />
      <div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--c-text-tertiary)",
            marginBottom: 8,
            marginTop: 4,
          }}
        >
          Chapter
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: "var(--c-text-primary)",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 11.5,
          color: "var(--c-text-tertiary)",
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 140,
          }}
          title={packTitle}
        >
          in {packTitle}
        </span>
        <span style={{ fontWeight: 600, color: "var(--c-text-secondary)" }}>
          {videoCount} {videoCount === 1 ? "video" : "videos"}
        </span>
      </div>
    </button>
  );
}

// ============================================================
// PackCard — rich card for the All packs grid
// ============================================================

function PackCard({
  pack,
  isAdmin,
  onAccess,
  onDelete,
  onToggleDemo,
  courses,
  getCourses,
  editGroupdata,
  setEditGroupData,
  updateGroup,
  batches,
  type,
}) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transition:
          "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onAccess}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.borderColor = "var(--c-brand-primary)";
        e.currentTarget.style.boxShadow =
          "0 12px 28px -12px rgba(20, 19, 15, 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--c-border-faint)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          position: "relative",
          overflow: "hidden",
          background: "var(--c-surface-sunken, var(--c-surface-muted))",
        }}
      >
        {pack.image ? (
          <img
            src={pack.image}
            alt={pack.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "var(--c-text-tertiary)",
            }}
          >
            <PlayCircle size={32} />
          </div>
        )}
        {/* Phase 21 Ship A.3: only render the gradient overlay + play affordance
            when there's an actual thumbnail image — without one, the dark
            gradient on grey looks weird and the little play circle looks like
            a stray dot. With an image, both come back for hover readability. */}
        {pack.image && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              padding: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.94)",
                color: "#1A1A1A",
                display: "grid",
                placeItems: "center",
                backdropFilter: "blur(8px)",
              }}
            >
              <PlayCircle size={18} fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--c-text-primary)",
            letterSpacing: "-0.01em",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {pack.title}
        </h3>
        {pack.description && (
          <p
            style={{
              margin: "4px 0 12px",
              fontSize: 12.5,
              color: "var(--c-text-tertiary)",
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
          >
            {pack.description}
          </p>
        )}

        {/* Bottom row: access CTA + admin controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: "auto",
            paddingTop: 10,
            borderTop: "1px solid var(--c-border-faint)",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccess();
            }}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--c-brand-primary)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
            }}
          >
            Access pack <ArrowRight size={14} />
          </button>

          {isAdmin && (
            <div
              style={{ display: "flex", gap: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Popover
                placement="bottom-end"
                onOpenChange={(e) =>
                  e == true
                    ? (setEditGroupData(pack), getCourses())
                    : setEditGroupData()
                }
              >
                <PopoverTrigger>
                  <button
                    title="Edit pack"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: "transparent",
                      border: "1px solid var(--c-border-soft)",
                      color: "var(--c-text-secondary)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <EditIcon size={13} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-h-[70vh] overflow-y-auto w-[400px]">
                  <ImageUploader
                    data={{ image: editGroupdata?.image }}
                    onUploadComplete={(e) =>
                      setEditGroupData((res) => ({ ...res, image: e }))
                    }
                  />
                  <Input
                    className="my-2"
                    value={editGroupdata?.title}
                    size="sm"
                    label="Title"
                    placeholder="Enter Title"
                    onChange={(e) =>
                      setEditGroupData((res) => ({
                        ...res,
                        title: e.target.value,
                      }))
                    }
                  />
                  <Input
                    className="my-2"
                    value={editGroupdata?.description}
                    size="sm"
                    label="Description"
                    placeholder="Enter Description"
                    onChange={(e) =>
                      setEditGroupData((res) => ({
                        ...res,
                        description: e.target.value,
                      }))
                    }
                  />
                  <Select
                    label="Course"
                    selectedKeys={[editGroupdata?.course_id?.toString()]}
                    placeholder="Select Course"
                    onSelectionChange={(e) =>
                      setEditGroupData((res) => ({
                        ...res,
                        course_id: e.anchorKey,
                      }))
                    }
                  >
                    {courses &&
                      courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                  </Select>
                  {/* Phase 19 Ship C: Topic dropdown */}
                  <Select
                    className="my-2"
                    size="sm"
                    label="Topic"
                    placeholder="Select topic (optional)"
                    selectedKeys={editGroupdata?.topic ? [editGroupdata.topic] : []}
                    onSelectionChange={(e) =>
                      setEditGroupData((res) => ({
                        ...res,
                        topic: e.anchorKey,
                      }))
                    }
                  >
                    {TOPICS.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.full}
                      </SelectItem>
                    ))}
                  </Select>
                  {type == "lvideo" && (
                    <Select
                      label="Batch ID"
                      selectedKeys={[editGroupdata?.batch_id?.toString()]}
                      placeholder="Select Batch"
                      onSelectionChange={(e) =>
                        setEditGroupData((res) => ({
                          ...res,
                          batch_id: e.anchorKey,
                        }))
                      }
                    >
                      {batches &&
                        batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.title}
                          </SelectItem>
                        ))}
                    </Select>
                  )}
                  <Button
                    size="sm"
                    color="primary"
                    className="mr-auto mt-2 flex-shrink-0"
                    onPress={() => updateGroup(editGroupdata)}
                  >
                    Update Pack
                  </Button>
                </PopoverContent>
              </Popover>
              <button
                onClick={onDelete}
                title="Delete pack"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "transparent",
                  border: "1px solid var(--c-border-soft)",
                  color: "var(--c-danger, #C7392F)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Trash2 size={13} />
              </button>
              <Switch
                size="sm"
                isSelected={!!pack.demo}
                onValueChange={(e) => onToggleDemo(e)}
                className="ml-1 text-xs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Phase 22 Ship E.3 helpers
// ============================================================

// Streak = consecutive days (ending today, IST) with at least one play.
function computeStreak(plays) {
  if (!plays || !plays.length) return 0;
  const days = new Set();
  plays.forEach((p) => {
    if (!p?.updated_at) return;
    // Bucket into Asia/Kolkata calendar day so an 11:45pm IST play counts today
    const d = new Date(p.updated_at);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const local = new Date(d.getTime() + istOffsetMs);
    days.add(local.toISOString().slice(0, 10));
  });
  let streak = 0;
  const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const cursor = new Date(today);
  // Walk backwards from today until we miss a day
  // Allow today to be optional (don't break streak if not yet watched today)
  const todayKey = today.toISOString().slice(0, 10);
  if (!days.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function formatHours(seconds) {
  if (!seconds || seconds <= 0) return "0h";
  const hours = seconds / 3600;
  if (hours < 0.1) return `${Math.round(seconds / 60)}m`;
  if (hours < 1) return `${(Math.round(hours * 10) / 10).toFixed(1)}h`;
  return `${(Math.round(hours * 10) / 10).toFixed(1)}h`;
}

function formatWatched(seconds) {
  if (!seconds || seconds <= 0) return "0s";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
}
