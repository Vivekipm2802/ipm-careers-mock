// ============================================================
// ConceptGroups — Phase 12 Ship C
// Entry page: "Select a collection to begin". Information-rich
// section cards with topic count + progress bar + state CTA.
// Admin add/edit/delete preserved.
// ============================================================

import { supabase } from "@/utils/supabaseClient";
import {
  Button, CircularProgress, PopoverTrigger, Popover, PopoverContent,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Input, Select, SelectItem, Switch,
} from "@nextui-org/react";
import { ChevronRight, EditIcon, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import ImageUploader from "./ImageUploader";

export default function ConceptGroups({ type, children, role, title }) {
  const [selectedGroup, setSelectedGroup] = useState();
  function clearSelection() { setSelectedGroup(); }

  return selectedGroup
    ? children({ group: selectedGroup, clearSelection })
    : <Selector title={title} role={role} type={type} onSelect={(e) => setSelectedGroup(e)} />;
}

const Selector = ({ type, onSelect, role, title }) => {
  const [groups, setGroups] = useState();
  const [topicCounts, setTopicCounts] = useState({}); // { groupId: count }
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState();
  const [courses, setCourses] = useState();
  const [editGroupdata, setEditGroupData] = useState();

  async function getGroups() {
    const { data, error } = await supabase.from("test_groups").select("*").eq("type", type);
    if (data) {
      setGroups(data);
      setLoading(false);
      // Fetch topic counts per group
      if (data.length > 0) {
        const counts = {};
        await Promise.all(data.map(async (g) => {
          const { data: cats } = await supabase
            .from("categories")
            .select("id", { count: "exact" })
            .eq("parent", g.id);
          counts[g.id] = cats ? cats.length : 0;
        }));
        setTopicCounts(counts);
      }
    }
    if (error) { toast.error("Unable to Load Content"); setLoading(false); }
  }
  async function deleteGroupbyId(a) {
    const { data, error } = await supabase.from("test_groups").delete().eq("id", a).select();
    if (data) { toast.success("Deleted Successfully"); getGroups(); }
    if (error) toast.error("Unable to Delete");
  }
  async function addGroup(a) {
    if (a == undefined) { toast.error("Data Empty"); return; }
    if (a?.title == undefined || a?.description == undefined || a?.image == undefined) {
      toast.error("Please fill all the fields"); return;
    }
    const { data, error } = await supabase.from("test_groups").insert({ ...a, type: type }).select();
    if (data) getGroups();
    if (error) toast.error("Unable to Add");
  }
  async function getCourses() {
    const { data } = await supabase.from("courses").select("*");
    if (data) setCourses(data);
  }
  async function toggleDemo(a, b) {
    const { data, error } = await supabase.from("test_groups").update({ demo: a }).eq("id", b).select();
    if (data) { getGroups(); toast.success("Updated Successfully"); }
    if (error) toast.error("Unable to Update");
  }
  async function updateGroup(a) {
    const { data, error } = await supabase.from("test_groups").update(a).eq("id", a?.id).select();
    if (data) { getGroups(); toast.success("Successfully Updated"); }
    if (error) toast.error("Unable to Update");
  }

  useEffect(() => { getGroups(); }, [type]);

  // Compute total topics across all sections
  const totalTopics = useMemo(() =>
    Object.values(topicCounts).reduce((s, n) => s + n, 0),
    [topicCounts]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: 360 }}>
        <CircularProgress size="sm" />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "12px 4px 60px", textAlign: "left" }}>
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
          fontSize: 30, fontWeight: 600, letterSpacing: "-0.022em",
          color: "var(--c-text-primary)", lineHeight: 1.15,
        }}>
          Where do you want to{" "}
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
            practice
          </span>{" "}
          today?
        </h1>
        <p style={{
          margin: 0, fontSize: 14.5, lineHeight: 1.55,
          color: "var(--c-text-secondary)", maxWidth: "60ch",
        }}>
          {totalTopics > 0
            ? `${groups?.length || 0} collections · ${totalTopics} topics available. Pick a section and drill into any topic at Easy / Moderate / Difficult.`
            : `Pick a section to see all available concept tests grouped by topic.`}
        </p>
      </div>

      {/* ── Empty state ── */}
      {(groups == undefined || groups?.length == 0) && !loading && (
        <div style={{
          width: "100%", padding: "32px 28px", borderRadius: 16,
          background: "var(--c-surface-muted, var(--c-bg))",
          border: "1px dashed var(--c-border-soft)",
          color: "var(--c-text-tertiary)", fontSize: 14,
          textAlign: "center",
        }}>
          No content is available here. Please check back later.
        </div>
      )}

      {/* ── Card grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 16,
      }}>
        {groups && groups.map((i) => {
          const topicCount = topicCounts[i.id] || 0;
          // Placeholder progress — will wire when plays data is available
          const progressPct = 0; // 0 = untouched
          const progressState = progressPct === 0 ? "untouched" : progressPct >= 80 ? "mastered" : "in-progress";

          return (
            <CollectionCard
              key={i.id}
              group={i}
              topicCount={topicCount}
              progressPct={progressPct}
              progressState={progressState}
              role={role}
              onSelect={onSelect}
              onDelete={() => deleteGroupbyId(i.id)}
              onToggleDemo={(v) => toggleDemo(v, i.id)}
              onEdit={editGroupdata}
              setEditGroupData={setEditGroupData}
              editGroupdata={editGroupdata}
              courses={courses}
              getCourses={getCourses}
              updateGroup={updateGroup}
            />
          );
        })}

        {role == "admin" && (
          <Popover onOpenChange={(e) => e == true ? getCourses() : ""}>
            <PopoverTrigger>
              <div style={{
                minHeight: 360,
                background: "var(--c-surface)",
                border: "1px dashed var(--c-border-soft)",
                borderRadius: 18,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 24,
                color: "var(--c-text-tertiary)",
              }}>
                <Plus size={32} />
                <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>Add new collection</p>
              </div>
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
        )}
      </div>
    </div>
  );
};

function CollectionCard({ group: i, topicCount, progressPct, progressState, role, onSelect, onDelete, onToggleDemo, setEditGroupData, editGroupdata, courses, getCourses, updateGroup }) {
  const ctaLabel =
    progressState === "untouched" ? "Start practicing" :
    progressState === "mastered" ? "Review topics" :
    "Continue practice";
  const ctaIconColor = progressState === "mastered" ? "var(--c-success)" : "var(--c-brand-primary)";
  const progressBarColor =
    progressState === "untouched" ? "var(--c-border-soft)" :
    progressState === "mastered" ? "var(--c-success)" :
    "var(--c-brand-primary)";

  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.18s ease",
      }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--c-brand-primary-soft)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 30px -10px rgba(106, 77, 255, 0.15)"; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--c-border-faint)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
      onClick={() => onSelect(i.id)}
    >
      {/* Image header */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        background: "var(--c-surface-muted, var(--c-bg))",
      }}>
        {i.image ? (
          <img
            src={i.image}
            alt={i.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, var(--c-brand-primary-tint), var(--c-brand-gold-tint))",
            display: "grid", placeItems: "center",
            color: "var(--c-brand-primary)", fontWeight: 700, fontSize: 24,
            letterSpacing: "-0.015em",
          }}>
            {i.title?.slice(0, 12)}
          </div>
        )}

        {/* Topic count badge over image */}
        <div style={{
          position: "absolute", top: 12, left: 12,
          padding: "5px 11px", borderRadius: 999,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(8px)",
          color: "#fff", fontSize: 11, fontWeight: 600,
          letterSpacing: "-0.005em",
          fontVariantNumeric: "tabular-nums",
        }}>
          {topicCount > 0 ? `${topicCount} ${topicCount === 1 ? "topic" : "topics"}` : "Coming soon"}
        </div>

        {role == "admin" && (
          <Dropdown size="sm" placement="bottom-end">
            <DropdownTrigger>
              <button
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute", top: 12, right: 12,
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--c-surface)",
                  border: "1px solid var(--c-border-soft)",
                  display: "grid", placeItems: "center",
                  cursor: "pointer", color: "var(--c-text-secondary)",
                }}
              >
                <MoreVertical size={14} />
              </button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem startContent={<Trash2 size={14} />} color="danger" onPress={onDelete}>
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h2 style={{
          fontSize: 18, fontWeight: 600, letterSpacing: "-0.018em",
          color: "var(--c-text-primary)", margin: "0 0 4px", lineHeight: 1.25,
        }}>{i.title}</h2>
        <p style={{
          fontSize: 13, color: "var(--c-text-tertiary)",
          margin: "0 0 18px", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{i.description || "Concept tests grouped by topic"}</p>

        {/* Progress block */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 6,
            fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--c-text-tertiary)",
          }}>
            <span>Your progress</span>
            <span style={{
              color: progressState === "untouched" ? "var(--c-text-tertiary)" : progressBarColor,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.005em", textTransform: "none", fontWeight: 600,
            }}>
              {progressState === "untouched" ? "Not started" : `${progressPct}%`}
            </span>
          </div>
          <div style={{
            height: 8, borderRadius: 999,
            background: "var(--c-surface-muted, var(--c-bg))",
            border: "1px solid var(--c-border-faint)",
            overflow: "hidden",
            position: "relative",
          }}>
            <div style={{
              width: `${Math.max(2, progressPct)}%`,
              height: "100%",
              background: progressBarColor,
              borderRadius: 999,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: "auto",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(i.id); }}
            style={{
              flex: 1,
              height: 42, padding: "0 18px", borderRadius: 999,
              background: progressState === "mastered" ? "var(--c-success)" : "var(--c-brand-primary)",
              color: "#fff",
              border: "1px solid transparent",
              fontSize: 13.5, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {ctaLabel} <ChevronRight size={15} />
          </button>
          {role == "admin" && (
            <Switch isSelected={i.demo} onValueChange={(e) => { onToggleDemo(e); }} size="sm" />
          )}
        </div>

        {role == "admin" && (
          <Popover placement="bottom-start"
            onOpenChange={(e) => { e == true ? (setEditGroupData(i), getCourses()) : setEditGroupData(); }}>
            <PopoverTrigger>
              <Button size="sm" color="success" fullWidth className="mt-2" endContent={<EditIcon size={14} />}>
                Edit
              </Button>
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
              <Button size="sm" color="primary" className="mr-auto" onPress={() => updateGroup(editGroupdata)}>
                Save changes
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
