// ============================================================
// PackPlayer — Phase 21 Ship A (Layout A: sidebar + player)
// ============================================================
// Student-facing replacement for the legacy PreRecorded.js view.
// Same data model (vcategory/lvcategory + videos/lvideos), brand-new visual
// language matching the Self Learning landing page (Inter + Instrument Serif
// italic accents, amber + purple, dark mode).
//
// Layout:
//   ┌──────────────────────────────────────────────────────────────────┐
//   │  ← Back · Self Learning · Quant Quick Concepts          stats    │
//   ├──────────────┬───────────────────────────────────────────────────┤
//   │  Chapter A   │                                                   │
//   │   1. Lesson  │           VIDEO PLAYER                            │
//   │   2. Lesson  │                                                   │
//   │  Chapter B   │                                                   │
//   │  Chapter C   │   Now playing: Lesson title + description         │
//   └──────────────┴───────────────────────────────────────────────────┘
//
// Jump-to-chapter:
//   VideoGroups.TopicCard stashes a vcategory parent id in sessionStorage
//   under key "ipm-topic-intent". On first vcategory load we read it, open
//   that chapter, select its first lesson, then clear the flag.
//
// Admin features (add/edit/delete chapters, homework, tests) are NOT in
// this component — those stay in the legacy PreRecorded.js. Wire admin
// users to the old component and students to this one.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNMNContext } from "@/components/NMNContext";
import { toast } from "react-hot-toast";

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

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

export default function PackPlayer({
  group, // pack id (from VideoGroups children render prop)
  categoryName = "vcategory", // "vcategory" for pre-recorded, "lvcategory" for live
  listName = "videos", // "videos" or "lvideos"
  demoListName, // override listName when user is in demo mode
  onBack,
  packTitle: packTitleProp, // optional override; otherwise fetched from video_groups
  packDescription: packDescriptionProp,
}) {
  const ctx = useNMNContext();
  const isDemo = ctx?.isDemo;

  const [loading, setLoading] = useState(true);
  const [pack, setPack] = useState(null); // {title, description} fetched from video_groups
  const [chapters, setChapters] = useState([]); // top-level vcategory rows
  const [subs, setSubs] = useState([]); // child vcategory rows
  const [videos, setVideos] = useState([]); // actual video items
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);

  const intentHandledRef = useRef(false);

  // Resolve pack title — prefer prop, then fetched row, then "Pack"
  const packTitle = packTitleProp || pack?.title || "Pack";
  const packDescription = packDescriptionProp || pack?.description || "";

  // ────────────────────────────────────────────────────────────
  // Data load
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // 0. Pack details (so we can show the title without depending on a prop)
        const { data: packRow } = await supabase
          .from("video_groups")
          .select("id, title, description, image, type, topic")
          .eq("id", group)
          .maybeSingle();
        if (alive && packRow) setPack(packRow);

        // 1. Top-level chapters
        const { data: parents, error: pErr } = await supabase
          .from(categoryName)
          .select("id, title, description, group_id, parent, type, seq")
          .eq("group_id", group)
          .eq("type", "parent")
          .order("seq", { ascending: true });
        if (pErr) throw pErr;
        if (!alive) return;
        const parentRows = parents || [];

        // 2. Sub-categories under those chapters
        let subRows = [];
        if (parentRows.length) {
          const { data: subData } = await supabase
            .from(categoryName)
            .select("id, title, parent, seq")
            .in(
              "parent",
              parentRows.map((p) => p.id),
            )
            .order("seq", { ascending: true });
          subRows = subData || [];
        }

        // 3. Videos under those subs
        let vidRows = [];
        if (subRows.length) {
          const table = isDemo && demoListName ? demoListName : listName;
          const { data: vidData } = await supabase
            .from(table)
            .select("*")
            .in(
              "category",
              subRows.map((s) => s.id),
            )
            .order("seq", { ascending: true });
          vidRows = vidData || [];
        }

        if (!alive) return;
        setChapters(parentRows);
        setSubs(subRows);
        setVideos(vidRows);
        setLoading(false);
      } catch (e) {
        console.warn("[PackPlayer] load failed:", e?.message);
        if (alive) {
          toast.error("Unable to load pack content");
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [group, categoryName, listName, demoListName, isDemo]);

  // ────────────────────────────────────────────────────────────
  // Default open chapter — first one. But if a sessionStorage
  // "ipm-topic-intent" is present (set by VideoGroups.TopicCard),
  // open that chapter instead AND select its first lesson.
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chapters.length || intentHandledRef.current) return;

    let intent = null;
    try {
      if (typeof window !== "undefined") {
        intent = window.sessionStorage.getItem("ipm-topic-intent");
      }
    } catch (_e) {
      /* ignore */
    }

    let targetChapter = chapters[0];
    if (intent) {
      const intentId = parseInt(intent, 10);
      const match = chapters.find((c) => c.id === intentId);
      if (match) targetChapter = match;
      try {
        window.sessionStorage.removeItem("ipm-topic-intent");
      } catch (_e) {}
    }

    setActiveChapterId(targetChapter.id);
    intentHandledRef.current = true;

    // Pre-select first lesson of the target chapter (if any videos exist)
    const firstSubOfTarget = subs.find((s) => s.parent === targetChapter.id);
    if (firstSubOfTarget) {
      const firstVid = videos.find((v) => v.category === firstSubOfTarget.id);
      if (firstVid) setCurrentVideo(firstVid);
    }
  }, [chapters, subs, videos]);

  // ────────────────────────────────────────────────────────────
  // Stats
  // ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSeconds = videos.reduce(
      (a, v) => a + (Number(v.duration) || 0),
      0,
    );
    return {
      chapterCount: chapters.length,
      videoCount: videos.length,
      duration: formatLongDuration(totalSeconds),
    };
  }, [chapters, videos]);

  // Helper: videos under a chapter
  function videosForChapter(chapterId) {
    const subIds = subs
      .filter((s) => s.parent === chapterId)
      .map((s) => s.id);
    return videos.filter((v) => subIds.includes(v.category));
  }

  function chapterMeta(chapterId) {
    const vids = videosForChapter(chapterId);
    const secs = vids.reduce((a, v) => a + (Number(v.duration) || 0), 0);
    return {
      count: vids.length,
      duration: formatShortDuration(secs),
    };
  }

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          padding: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          color: "var(--c-text-secondary)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid var(--c-border-faint)",
            borderTopColor: "var(--c-brand-primary)",
            animation: "ipm-pp-spin 0.8s linear infinite",
          }}
        />
        <style jsx global>{`
          @keyframes ipm-pp-spin {
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
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: FONT,
        color: "var(--c-text-primary)",
        boxSizing: "border-box",
      }}
    >
      {/* ===== Top header ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px 14px",
          borderBottom: "1px solid var(--c-border-faint)",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "1px solid var(--c-border-soft)",
                color: "var(--c-text-secondary)",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Back
            </button>
          )}
          <div
            style={{
              fontSize: 12.5,
              color: "var(--c-text-tertiary)",
            }}
          >
            Self Learning ·{" "}
            <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>
              {packTitle}
            </b>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 12.5,
            color: "var(--c-text-tertiary)",
          }}
        >
          <span>
            <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>
              {stats.chapterCount}
            </b>{" "}
            chapters
          </span>
          <span>
            <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>
              {stats.videoCount}
            </b>{" "}
            videos
          </span>
          {stats.duration && (
            <span>
              <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>
                {stats.duration}
              </b>{" "}
              total
            </span>
          )}
        </div>
      </div>

      {/* ===== Body ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 22,
          padding: 28,
          alignItems: "start",
        }}
        className="ipm-pp-body"
      >
        {/* ── Chapter rail ── */}
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 16,
            padding: "12px 0",
            maxHeight: "calc(100vh - 180px)",
            overflowY: "auto",
            position: "sticky",
            top: 14,
          }}
        >
          {chapters.length === 0 ? (
            <div
              style={{
                padding: "24px 18px",
                fontSize: 13,
                color: "var(--c-text-tertiary)",
                textAlign: "center",
              }}
            >
              No chapters yet — admin hasn't added any content.
            </div>
          ) : (
            chapters.map((ch) => (
              <ChapterAccordion
                key={ch.id}
                chapter={ch}
                meta={chapterMeta(ch.id)}
                active={activeChapterId === ch.id}
                subs={subs.filter((s) => s.parent === ch.id)}
                videos={videos}
                currentVideoId={currentVideo?.id}
                onToggle={() =>
                  setActiveChapterId(
                    activeChapterId === ch.id ? null : ch.id,
                  )
                }
                onPickVideo={(v) => setCurrentVideo(v)}
              />
            ))
          )}
        </div>

        {/* ── Video stage ── */}
        <div>
          <div
            style={{
              background: currentVideo ? "#000" : "var(--c-bg-elev)",
              borderRadius: 16,
              aspectRatio: "16 / 9",
              overflow: "hidden",
              border: "1px solid var(--c-border-faint)",
              display: "grid",
              placeItems: "center",
              color: currentVideo
                ? "rgba(255,255,255,0.5)"
                : "var(--c-text-tertiary)",
              fontSize: 13,
            }}
          >
            {currentVideo ? (
              renderVideoEmbed(currentVideo)
            ) : (
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    margin: "0 auto 12px",
                    borderRadius: "50%",
                    background: "var(--c-surface)",
                    border: "1px solid var(--c-border-faint)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                    color: "var(--c-text-tertiary)",
                  }}
                >
                  ▶
                </div>
                Pick a lesson on the left to start
              </div>
            )}
          </div>

          {/* Now playing meta */}
          <div style={{ marginTop: 20 }}>
            <div style={{ ...eyebrowStyle, marginBottom: 6 }}>
              {currentVideo ? "Now playing" : "Up next"}
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.018em",
                color: "var(--c-text-primary)",
              }}
            >
              {currentVideo?.title || (
                <span style={{ color: "var(--c-text-tertiary)" }}>
                  Choose a lesson to begin —{" "}
                  <span style={serifStyle}>any chapter</span>
                </span>
              )}
            </h3>
            {currentVideo?.description && (
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  color: "var(--c-text-secondary)",
                  lineHeight: 1.55,
                  maxWidth: "70ch",
                }}
              >
                {currentVideo.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 920px) {
          .ipm-pp-body {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// ChapterAccordion — one chapter row in the left rail
// ============================================================
function ChapterAccordion({
  chapter,
  meta,
  active,
  subs,
  videos,
  currentVideoId,
  onToggle,
  onPickVideo,
}) {
  // Flatten subs+videos into a single ordered lesson list for display.
  // Use the video's own title (the column on the videos table) — falling back
  // to the sub-category title only when a video has no title set.
  const lessons = useMemo(() => {
    const out = [];
    subs.forEach((s) => {
      const vids = videos.filter((v) => v.category === s.id);
      if (vids.length === 0) {
        out.push({ kind: "empty", id: `sub-${s.id}`, label: s.title });
      } else {
        vids.forEach((v) =>
          out.push({
            kind: "video",
            id: v.id,
            label: v.title || s.title,
            duration: v.duration,
            video: v,
          }),
        );
      }
    });
    return out;
  }, [subs, videos]);

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 16px",
          background: active ? "var(--c-brand-glow)" : "transparent",
          border: "none",
          borderLeft: `3px solid ${active ? "var(--c-brand-primary)" : "transparent"}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontFamily: "inherit",
          color: "var(--c-text-primary)",
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!active)
            e.currentTarget.style.background = "var(--c-bg-elev)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: "-0.012em",
              color: "var(--c-text-primary)",
              marginBottom: 2,
            }}
          >
            {chapter.title}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--c-text-tertiary)",
              display: "flex",
              gap: 8,
            }}
          >
            <span>
              {meta.count} {meta.count === 1 ? "video" : "videos"}
            </span>
            {meta.duration && (
              <>
                <span>·</span>
                <span>{meta.duration}</span>
              </>
            )}
          </div>
        </div>
        <span
          style={{
            color: "var(--c-text-tertiary)",
            fontSize: 14,
            transition: "transform 0.2s ease",
            transform: active ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ›
        </span>
      </button>

      {active && lessons.length > 0 && (
        <div style={{ padding: "4px 0 6px" }}>
          {lessons.map((l, idx) => {
            const isCurrent =
              l.kind === "video" && l.id === currentVideoId;
            return (
              <button
                key={l.id}
                onClick={() =>
                  l.kind === "video" ? onPickVideo(l.video) : null
                }
                disabled={l.kind !== "video"}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: isCurrent ? "var(--c-bg-elev)" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isCurrent ? "var(--c-brand-primary)" : "transparent"}`,
                  padding: "9px 16px 9px 28px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  color: isCurrent
                    ? "var(--c-brand-primary)"
                    : "var(--c-text-secondary)",
                  fontSize: 13,
                  cursor: l.kind === "video" ? "pointer" : "default",
                  fontWeight: isCurrent ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent && l.kind === "video") {
                    e.currentTarget.style.background = "var(--c-bg-elev)";
                    e.currentTarget.style.color = "var(--c-text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent && l.kind === "video") {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--c-text-secondary)";
                  }
                }}
              >
                <span
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: "italic",
                    fontSize: 14,
                    width: 18,
                    color: isCurrent
                      ? "var(--c-brand-primary)"
                      : "var(--c-text-tertiary)",
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.duration && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--c-text-tertiary)",
                    }}
                  >
                    {formatShortDuration(Number(l.duration))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

// Render either an iframe or a video tag based on URL shape.
// IMPORTANT: YouTube IDs are case-sensitive (`dQw4w9WgXcQ` ≠ `dqw4w9wgxcq`)
// so we use case-insensitive regex flags BUT preserve the original case in
// the captured ID — never lowercase the URL before extracting it.
function renderVideoEmbed(video) {
  const url = video.url || "";
  if (!url) {
    return <span>No video URL on this lesson</span>;
  }

  // type column hint ("youtube" | "vimeo" | "mp4" | "embed" | ...)
  const typeHint = (video.type || "").toLowerCase();

  // YouTube — match watch, short, embed, and shorts patterns
  const ytMatch =
    url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i) ||
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/i) ||
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i);
  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`}
        title={video.title || "Lesson"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    );
  }
  // If type hints "youtube" and url is a bare ID (no protocol), treat as ID.
  if (typeHint === "youtube" && /^[A-Za-z0-9_-]{8,}$/.test(url)) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${url}?rel=0&modestbranding=1`}
        title={video.title || "Lesson"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    );
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
        title={video.title || "Lesson"}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    );
  }

  // Plain video file
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return (
      <video
        controls
        style={{ width: "100%", height: "100%", background: "#000" }}
        src={url}
      />
    );
  }

  // Fallback — assume iframe (Wistia, custom CDN, etc.)
  return (
    <iframe
      src={url}
      title={video.title || "Lesson"}
      allowFullScreen
      style={{ width: "100%", height: "100%", border: 0 }}
    />
  );
}

function formatShortDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (m < 60) return `${m}:${ss.toString().padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function formatLongDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
