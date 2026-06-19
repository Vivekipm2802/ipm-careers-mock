// ============================================================
// VideoGroups — Phase 19 Ship B: refined library design
// Matches self-learning-refined.html:
// - Hero greeting "Watch and *learn*." with italic-serif accent
// - Hero row: Featured pack card (cinematic, 1.5fr) + 3 KpiCard stat tiles stacked (1fr)
// - "All packs" 3-column rich card grid with real thumbnail images from video_groups.image
// - Each card: thumbnail + duration/badge + title + description + meta + Access button
// - Admin controls preserved (Add/Edit/Delete/Hide via popovers)
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
  fontFamily: "'Instrument Serif', serif",
  fontStyle: "italic",
  fontWeight: 400,
  color: "var(--c-brand-primary)",
};

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

  const remainingPacks = useMemo(() => {
    return visibleGroups.slice(1);
  }, [visibleGroups]);

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
        Watch and <span style={serifStyle}>{heroCopy.accent}</span>.
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
          <FeaturedPackCard
            pack={featuredPack}
            onAccess={() => onSelect(featuredPack.id)}
            label={type === "lvideo" ? "Latest live session" : "Featured pack"}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <StatTile
              label={type === "lvideo" ? "Live sessions" : "Video packs"}
              value={stats.total}
              unit="available"
              sub={`Curated for your prep`}
              icon={<PlayCircle size={18} />}
            />
            <StatTile
              label="Demo available"
              value={stats.demoCount}
              unit="packs"
              sub="Free preview access"
              icon={<Eye size={18} />}
            />
            <StatTile
              label="Featured"
              value={1}
              unit="this week"
              sub="Highlighted by faculty"
              icon={<Star size={18} />}
            />
          </div>
        </div>
      )}

      {/* ===== All packs heading + grid ===== */}
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
          {visibleGroups.length} {visibleGroups.length === 1 ? "pack" : "packs"} available
        </span>
      </div>

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
          : "linear-gradient(135deg, #2D1B69 0%, #7C3AED 50%, #C084FC 100%)",
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
          {pack.demo && (
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 11px",
                borderRadius: 999,
                background: "rgba(34, 197, 94, 0.9)",
                color: "#fff",
              }}
            >
              Demo
            </div>
          )}
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
        {/* Subtle play overlay on hover */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: 10,
          }}
        >
          {pack.demo && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "4px 9px",
                borderRadius: 999,
                background: "rgba(34, 197, 94, 0.9)",
                color: "#fff",
                backdropFilter: "blur(8px)",
              }}
            >
              Demo
            </div>
          )}
          <div style={{ flex: 1 }} />
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
