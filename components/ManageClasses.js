import {
  Button,
  Chip,
  DatePicker,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Spacer,
} from "@nextui-org/react";
import { isToday } from "date-fns";
import {
  parseAbsoluteToLocal,
  parseZonedDateTime,
} from "@internationalized/date";
import { Plus, Edit, Trash2, Calendar, Link, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import { recordingSource } from "@/lib/recordings";

export default function ManageClasses({
  batches,
  currentBatch,
  setView,
  setClasses,
  setCurrentBatch,
  classes,
  getClassPIN,
  classPIN,
  setClassPIN,
  classControls,
  editClassData,
  setEditClassData,
  updateClass,
  deleteClass,
  addClass,
  classData,
  setClassData,
}) {
  return (
    <div className="p-4 w-full">
      <div className="flex">
        <div className="flex flex-row justify-between w-full items-center">
          <div className="flex gap-4">
            <Button
              size="sm"
              onPress={() => {
                setView(0);
                setClasses();
                setCurrentBatch();
              }}
              startContent={
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z"
                    fill="#333"
                  />
                </svg>
              }
              className="bg-transparent pl-0"
            >
              Back to Batches
            </Button>
            <h2 className="font-bold text-2xl">
              Manage Classes for{" "}
              {batches.find((item) => item.id == currentBatch)?.title}
            </h2>
          </div>

          <Popover>
            <PopoverTrigger>
              <Button size="md" color="primary" className="z-1">
                <Plus className="inline-block w-5 h-5" />
                Add Class Manually
              </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-[400px] py-4 items-end">
              {classControls?.map((l) => {
                if (l.type === "text")
                  return (
                    <Input
                      size="sm"
                      className="mb-2"
                      label={l.label}
                      placeholder={l.placeholder}
                      onChange={(e) =>
                        setClassData((res) => ({
                          ...res,
                          [l.key]: e.target.value,
                        }))
                      }
                    />
                  );
                if (l.type === "datetime")
                  return (
                    <Input
                      type="time"
                      size="sm"
                      className="mb-2"
                      label={l.label}
                      placeholder={l.placeholder}
                      onChange={(e) =>
                        setClassData((res) => ({
                          ...res,
                          [l.key]: e.target.value,
                        }))
                      }
                    />
                  );
                if (l.type === "select")
                  return (
                    <Select
                      size="sm"
                      className="mb-2"
                      label={l.label}
                      placeholder={l.placeholder}
                      onChange={(e) =>
                        setClassData((res) => ({
                          ...res,
                          [l.key]: e.target.value,
                        }))
                      }
                    >
                      {l.items?.map((p) => (
                        <SelectItem
                          key={
                            p.id ??
                            p.value ??
                            p.email ??
                            p?.title?.toLocaleLowerCase()
                          }
                        >
                          {p.title}
                        </SelectItem>
                      ))}
                    </Select>
                  );
              })}
              <div className="mb-3 w-full">
                <p className="font-semibold text-sm mb-1 text-[#333]">
                  Days of Week
                </p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={classData?.daysOfWeek?.includes(day) ?? false}
                        onChange={(e) => {
                          setClassData((prev) => {
                            const currentDays = prev.daysOfWeek || [];
                            return {
                              ...prev,
                              daysOfWeek: e.target.checked
                                ? [...currentDays, day]
                                : currentDays.filter((d) => d !== day),
                            };
                          });
                        }}
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                color="primary"
                onPress={() => addClass(classData)}
              >
                Add Class
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full justify-start items-start rounded-xl mt-4">
        {classes &&
          classes.map((i) => (
            <>
              <div className="w-full rounded-lg bg-white shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div className="flex flex-col gap-3 flex-1 mb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 leading-snug">
                      {i.title ?? "Today's Class"}
                    </h3>
                    {i.status && (
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          i.status === "Ongoing"
                            ? "success"
                            : i.status === "Upcoming"
                            ? "warning"
                            : i.status === "Completed"
                            ? "default"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {i.status}
                      </Chip>
                    )}
                  </div>
                  {i?.daysOfWeek && i.daysOfWeek.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {i.daysOfWeek.map((day, idx) => (
                        <Chip
                          key={idx}
                          size="sm"
                          color="default"
                          variant="flat"
                        >
                          {day}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {isToday(i?.start_time) && (
                    <Chip color="success" size="sm" className="mt-2">
                      Today
                    </Chip>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                    {/* Left column - Time */}
                    {(i.start_time || i.end_time) && (
                      <div className="flex flex-col gap-2">
                        {i?.start_time && (
                          <div className="flex items-center gap-2.5">
                            <Calendar
                              size={16}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <div className="flex items-baseline gap-2 text-sm">
                              <span className="text-gray-500 font-medium">
                                Start:
                              </span>
                              <span className="text-gray-900">
                                {(() => {
                                  try {
                                    const [hours, minutes] =
                                      i.start_time.split(":");
                                    const date = new Date();
                                    date.setHours(parseInt(hours, 10));
                                    date.setMinutes(parseInt(minutes, 10));
                                    return date.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    });
                                  } catch {
                                    return i.start_time;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                        {i?.end_time && (
                          <div className="flex items-center gap-2.5">
                            <Calendar
                              size={16}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <div className="flex items-baseline gap-2 text-sm">
                              <span className="text-gray-500 font-medium">
                                End:
                              </span>
                              <span className="text-gray-900">
                                {(() => {
                                  try {
                                    const [hours, minutes] =
                                      i.end_time.split(":");
                                    const date = new Date();
                                    date.setHours(parseInt(hours, 10));
                                    date.setMinutes(parseInt(minutes, 10));
                                    return date.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    });
                                  } catch {
                                    return i.end_time;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right column - Course & Location */}
                    <div className="flex flex-col gap-2 text-sm">
                      {/* Course */}
                      {i?.url && (
                        <div className="flex items-center gap-2.5 justify-end">
                          <Link
                            size={18}
                            className="text-gray-400 mt-0.5 flex-shrink-0"
                          />
                          <span className="text-gray-700 text-left">{i.url}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end mt-2">
                  {/* <Popover
                    onOpenChange={(e) =>
                      e ? setEditClassData(i) : setEditClassData()
                    }
                  >
                    <PopoverTrigger>
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        startContent={<Edit size={16} />}
                        className="ml-2 flex items-center gap-1"
                      >
                        Edit Class
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      {classControls?.map((l) => {
                        if (l.type === "text")
                          return (
                            <Input
                              size="sm"
                              value={
                                (editClassData && editClassData[l.key]) ?? ""
                              }
                              className="mb-2"
                              label={l.label}
                              placeholder={l.placeholder}
                              onChange={(e) =>
                                setEditClassData((res) => ({
                                  ...res,
                                  [l.key]: e.target.value,
                                }))
                              }
                            />
                          );
                        if (l.type === "datetime")
                          return (
                            <DatePicker
                              hideTimeZone
                              value={parseAbsoluteToLocal(
                                (editClassData && editClassData[l.key]) ??
                                  "2024-08-03T10:34:23.123Z"
                              )}
                              granularity="minute"
                              className="mb-2"
                              size="sm"
                              label={l.label}
                              placeholder={l.placeholder}
                              onChange={(e) =>
                                setEditClassData((res) => ({
                                  ...res,
                                  [l.key]:
                                    typeof e.toAbsoluteString === "function"
                                      ? e.toAbsoluteString()
                                      : e.toString(),
                                }))
                              }
                            />
                          );
                        if (l.type === "select")
                          return (
                            <Select
                              size="sm"
                              selectedKeys={[
                                (
                                  editClassData && editClassData[l.key]
                                )?.toString() ?? "",
                              ]}
                              className="mb-2"
                              label={l.label}
                              placeholder={l.placeholder}
                              onChange={(e) =>
                                setEditClassData((res) => ({
                                  ...res,
                                  [l.key]: e.target.value,
                                }))
                              }
                            >
                              {l.items?.map((p) => (
                                <SelectItem
                                  key={
                                    p.id ??
                                    p.value ??
                                    p.title?.toLocaleLowerCase()
                                  }
                                >
                                  {p.title ?? p?.display_name ?? p?.userEmail}
                                </SelectItem>
                              ))}
                            </Select>
                          );
                      })}
                      <Input
                        size="sm"
                        value={editClassData?.recording ?? ""}
                        className="mb-2"
                        label="Recording URL"
                        placeholder="Enter Recording Url"
                        onChange={(e) =>
                          setEditClassData((res) => ({
                            ...res,
                            recording: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => updateClass(editClassData)}
                      >
                        Update Class
                      </Button>
                    </PopoverContent>
                  </Popover>

                  <Spacer x={2} /> */}
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        startContent={<Trash2 size={16} />}
                        className="flex items-center gap-1"
                      >
                        Delete Class
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-[300px] text-xs p-4">
                      Are you sure you want to delete {i.title}?
                      <Spacer y={4} />
                      <div className="flex flex-row items-center justify-center">
                        <Button color="danger" variant="bordered" size="sm">
                          Cancel
                        </Button>
                        <Spacer x={2} />
                        <Button
                          onPress={() => deleteClass(i.id, i.batch_id)}
                          color="danger"
                          size="sm"
                        >
                          Confirm
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          ))}
      </div>

      {(!classes || classes.length === 0) && (
        <div className="border-1 my-16 border-gray-100 bg-gray-100 rounded-xl text-gray-500 w-full px-2 py-8">
          No Classes scheduled for today
        </div>
      )}

      <RecordingsPanel currentBatch={currentBatch} />
    </div>
  );
}

// ============================================================
// Ship A — RecordingsPanel: the recordings students actually see
// live on classes_history (one capsule per past class), not on the
// schedule rows above. Each capsule shows its source (STORAGE ✓ /
// ZOOM AUTO / LINK / NONE) and takes a direct video upload into the
// private 'recordings' bucket (signed upload URL → progress → commit).
// ============================================================
function RecordingsPanel({ currentBatch }) {
  const [capsules, setCapsules] = useState();
  const [uploads, setUploads] = useState({}); // capsuleId → { pct, error }
  const fileInputRef = useRef(null);
  const pendingCapsuleRef = useRef(null);

  async function loadCapsules() {
    if (currentBatch == null) return;
    const { data, error } = await supabase
      .from("classes_history")
      .select("id, title, recording, recording_path, recording_passcode, created_at")
      .eq("batch_id", currentBatch)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Unable to load recordings");
      return;
    }
    setCapsules(data || []);
  }

  useEffect(() => {
    setCapsules(undefined);
    loadCapsules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBatch]);

  function setUpload(id, patch) {
    setUploads((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }

  // PUT straight to the signed upload URL so we get real progress events;
  // uploadToSignedUrl (supabase-js 2.38 / storage-js 2.5.4) is the
  // no-progress fallback if the XHR is blocked for any reason.
  function putWithProgress(signedUrl, file, onPct) {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("x-upsert", "false");
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            onPct(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("Upload failed (HTTP " + xhr.status + ")"));
        xhr.onerror = () => reject(new Error("Upload failed — network error"));
        xhr.send(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function uploadFor(capsule, file) {
    if (!capsule || !file) return;
    setUpload(capsule.id, { pct: 0, error: null });
    try {
      const headers = await getAuthHeaders();
      const r = await fetch("/api/recordings/upload-url", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ classId: capsule.id, fileName: file.name }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.path || !j?.token) {
        throw new Error(j?.error || "Could not start upload");
      }

      try {
        await putWithProgress(j.signedUrl, file, (pct) =>
          setUpload(capsule.id, { pct })
        );
      } catch (_xhrErr) {
        // no-progress fallback via supabase-js
        setUpload(capsule.id, { pct: null });
        const { error: upErr } = await supabase.storage
          .from("recordings")
          .uploadToSignedUrl(j.path, j.token, file);
        if (upErr) throw new Error(upErr.message || "Upload failed");
      }

      const c = await fetch("/api/recordings/commit", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ classId: capsule.id, path: j.path }),
      });
      const cj = await c.json().catch(() => null);
      if (!c.ok) throw new Error(cj?.error || "Could not save recording");

      setUploads((prev) => {
        const next = { ...prev };
        delete next[capsule.id];
        return next;
      });
      toast.success("Recording uploaded");
      loadCapsules();
    } catch (e) {
      setUpload(capsule.id, { pct: undefined, error: e.message || "Upload failed" });
      toast.error(e.message || "Upload failed");
    }
  }

  function pickFile(capsule) {
    pendingCapsuleRef.current = capsule;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  const sourceChip = (capsule) => {
    const src = recordingSource(capsule);
    if (src === "STORAGE")
      return (
        <Chip size="sm" color="success" variant="flat">
          STORAGE ✓
        </Chip>
      );
    if (src === "ZOOM AUTO")
      return (
        <Chip size="sm" color="warning" variant="flat">
          ZOOM AUTO
        </Chip>
      );
    if (src === "LINK")
      return (
        <Chip size="sm" color="primary" variant="flat">
          LINK
        </Chip>
      );
    return (
      <Chip size="sm" color="default" variant="flat">
        NONE
      </Chip>
    );
  };

  return (
    <div className="w-full mt-10 mb-8">
      <h3 className="font-semibold text-lg text-gray-900 mb-1">Recordings</h3>
      <p className="text-sm text-gray-500 mb-4">
        These are the class capsules students see under Recordings. Upload a
        video to serve it from private storage (takes precedence over any
        link), or let &quot;Fetch recording links&quot; fill in Zoom share URLs.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          const capsule = pendingCapsuleRef.current;
          pendingCapsuleRef.current = null;
          if (file && capsule) uploadFor(capsule, file);
        }}
      />

      {!capsules ? (
        <div className="text-sm text-gray-500 py-4">Loading recordings…</div>
      ) : capsules.length === 0 ? (
        <div className="border-1 border-gray-100 bg-gray-100 rounded-xl text-gray-500 w-full px-4 py-6 text-sm">
          No class capsules for this batch yet — they land here after each
          live class.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {capsules.map((cap) => {
            const up = uploads[cap.id];
            const dateStr = cap.created_at
              ? new Date(cap.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—";
            return (
              <div
                key={cap.id}
                className="w-full rounded-lg bg-white border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium text-sm text-gray-900">
                    {cap.title || "Recorded class"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {dateStr}
                    {cap.recording_path
                      ? " · " + cap.recording_path
                      : cap.recording
                      ? " · " +
                        (cap.recording.length > 60
                          ? cap.recording.slice(0, 60) + "…"
                          : cap.recording)
                      : ""}
                  </div>
                </div>
                {sourceChip(cap)}
                {up && up.error ? (
                  <span className="text-xs text-danger">{up.error}</span>
                ) : null}
                {up && up.error == null ? (
                  <span className="text-xs text-gray-600 tabular-nums">
                    {up.pct == null ? "Uploading…" : "Uploading " + up.pct + "%"}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    startContent={<Upload size={14} />}
                    onPress={() => pickFile(cap)}
                  >
                    {recordingSource(cap) === "STORAGE"
                      ? "Replace video"
                      : "Upload video"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
