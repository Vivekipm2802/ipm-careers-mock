// ============================================================
// Classes — Phase 23 redesign
// ============================================================
// Same data + behaviour as the legacy Classes.js (batches → today's
// classes → recordings history), but rebuilt with the portal's
// current design language (Inter + Instrument Serif, CSS vars,
// dark mode, custom amber buttons, status pills, hover-lift cards).
//
// All Supabase queries, isAdmin / isDemo checks, mark_attendance RPC,
// and AnimatePresence view transitions preserved.
// ============================================================

import { CtoLocal, formatHHMMTo12Hour } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import { getAuthHeaders } from "@/utils/authHeaders";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNMNContext } from "./NMNContext";
import { isToday } from "date-fns";

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

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

export default function Classes() {
  const [batches, setBatches] = useState();
  const { isDemo } = useNMNContext();
  const [view, setView] = useState(0);
  const [currentBatch, setCurrentBatch] = useState();
  const [classes, setClasses] = useState();
  const [history, setHistory] = useState();
  const [attendance, setAttendance] = useState();
  const [pin, setPIN] = useState();
  const [isAdmin, setIsAdmin] = useState(false);

  // Phase 23 Ship B: Class Capsule state
  const [userEmail, setUserEmail] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [studyClass, setStudyClass] = useState(null); // history item currently open

  // Ship A: this student's effective start date for the open batch
  // (batch_admits.effective_start_date — null means no gating).
  const [effectiveStart, setEffectiveStart] = useState(null);

  // Fetch user email directly (NMNContext might not have it on /demo)
  useEffect(() => {
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
  }, []);

  // Re-fetch reviewedIds if userEmail arrives after history (race condition)
  useEffect(() => {
    if (userEmail && history?.length > 0 && reviewedIds.size === 0) {
      getReviewedIds(
        userEmail,
        history.map((h) => h.id),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, history]);

  // ──────────────────────────────────────────────────────────────
  // Data layer — unchanged from legacy Classes.js
  // ──────────────────────────────────────────────────────────────
  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        const res = await axios.post("/api/isAdmin", {}, { headers: await getAuthHeaders() });
        if (res.data?.success) setIsAdmin(true);
      } catch (e) {
        console.log(e);
      }
    }
  }

  async function getBatches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("User not authenticated");
      return null;
    }
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course")
      .eq("email", user.email)
      .eq("is_expired", false);
    if (enrollmentError) {
      toast.error("Unable to Load Enrollments");
      return null;
    }
    if (!enrollmentData || enrollmentData.length === 0) {
      setBatches([]);
      return null;
    }
    const courseIds = enrollmentData
      .map((enrollment) => enrollment.course)
      .filter(Boolean);
    if (courseIds.length === 0) {
      setBatches([]);
      return null;
    }
    const { data, error } = await supabase
      .from("batches")
      .select("*,course_id(*)")
      .in("course_id", courseIds)
      .eq("status", "live")
      .eq("is_deleted", false);
    if (error) {
      toast.error("Unable to Load Batches");
      return null;
    }
    if (data) setBatches(data);
  }

  async function getClasses(a) {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("batch_id", a);
    if (error) {
      toast.error("Unable to Load Batches");
      return null;
    }
    if (data) {
      setClasses(data);
      getAttendance(data);
    }
  }

  async function getAttendance(a) {
    const uids = Array.isArray(a) ? a?.map((item) => item.uuid) : "";
    const { data } = await supabase
      .from("classes_attendance")
      .select("*")
      .in("class_id", uids);
    if (data) setAttendance(data);
  }

  // Ship A: the student's own admit row for this batch → start-date gate.
  // Failure is silent: null start date = no filtering (backward compatible),
  // and the real gate for the video itself lives in /api/recordings/play.
  async function getEffectiveStart(a) {
    setEffectiveStart(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("batch_admits")
        .select("effective_start_date")
        .eq("batch_id", a)
        .ilike("student_id", user.email)
        .limit(1);
      if (data?.[0]?.effective_start_date) {
        setEffectiveStart(data[0].effective_start_date);
      }
    } catch (_e) {
      /* silent — no gating when the row can't be read */
    }
  }

  async function getHistory(a) {
    getEffectiveStart(a);
    // Preferred path: server-side list (service role + case-insensitive
    // membership). The direct classes_history read below stays as a
    // fallback, but it depends on an RLS chain (check_admin / teacher
    // role / enrollments) with case-sensitive email checks that silently
    // hides capsules from some students.
    try {
      const headers = await getAuthHeaders();
      const r = await fetch("/api/recordings/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ batchId: a }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j && Array.isArray(j.capsules)) {
          setHistory(j.capsules);
          if (j.effectiveStart) setEffectiveStart(j.effectiveStart);
          if (userEmail && j.capsules.length > 0) {
            getReviewedIds(
              userEmail,
              j.capsules.map((h) => h.id),
            );
          }
          return;
        }
      }
    } catch (_e) {
      /* fall through to the direct read */
    }
    const { data, error } = await supabase
      .from("classes_history")
      .select(
        "id, title, recording, recording_path, notes_url, faculty_name, duration_seconds, created_at, batch_id"
      )
      .eq("batch_id", a)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Unable to Load Classes");
      return null;
    }
    if (data) {
      setHistory(data);
      if (userEmail && data.length > 0) {
        getReviewedIds(
          userEmail,
          data.map((h) => h.id),
        );
      }
    }
  }

  // Phase 23 Ship B: load which classes in this batch the student has marked reviewed
  async function getReviewedIds(email, historyIds) {
    try {
      const { data } = await supabase
        .from("class_reviews")
        .select("class_history_id")
        .eq("user_email", email)
        .in("class_history_id", historyIds);
      if (data) {
        setReviewedIds(new Set(data.map((r) => r.class_history_id)));
      }
    } catch (_e) {
      /* silent */
    }
  }

  async function toggleReview(historyId) {
    if (!userEmail) return;
    const isReviewed = reviewedIds.has(historyId);
    // Optimistic UI update
    const next = new Set(reviewedIds);
    if (isReviewed) next.delete(historyId);
    else next.add(historyId);
    setReviewedIds(next);

    try {
      if (isReviewed) {
        await supabase
          .from("class_reviews")
          .delete()
          .eq("user_email", userEmail)
          .eq("class_history_id", historyId);
      } else {
        await supabase.from("class_reviews").upsert(
          {
            user_email: userEmail,
            class_history_id: historyId,
          },
          { onConflict: "user_email,class_history_id" },
        );
      }
    } catch (_e) {
      // Rollback on failure
      setReviewedIds(reviewedIds);
      toast.error("Couldn't update review status");
    }
  }

  useEffect(() => {
    checkAdmin();
    getBatches();
  }, []);

  async function verifyClassPIN(i, p, b) {
    const r = toast.loading("Verifying PIN");
    const { data, error } = await supabase.rpc("mark_attendance", {
      class_id_arg: i,
      pin_arg: p,
    });
    if (data?.success) {
      toast.success("Verified Successfully");
      toast.remove(r);
      getClasses(b);
    } else if (data || error) {
      toast.error("Invalid Code");
      toast.remove(r);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
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
        boxSizing: "border-box",
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={view + "view"}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.62, 0.13, 0.12, 0.94] }}
          exit={{ x: 50, opacity: 0 }}
        >
          {view === 0 && (
            <BatchesView
              batches={batches}
              isAdmin={isAdmin}
              isDemo={isDemo}
              onOpenClasses={(id) => {
                setCurrentBatch(id);
                setView(1);
                getClasses(id);
              }}
              onOpenHistory={(id) => {
                setCurrentBatch(id);
                setView(2);
                getClasses(id);
                getHistory(id);
              }}
            />
          )}
          {(view === 1 || view === 2) && !studyClass && (
            <InnerBatchView
              activeTab={view === 2 ? "history" : "today"}
              classes={classes}
              attendance={attendance}
              history={history}
              reviewedIds={reviewedIds}
              effectiveStart={effectiveStart}
              isDemo={isDemo}
              onOpenStudy={(item) => setStudyClass(item)}
              onSwitchTab={(tab) => {
                if (tab === "history") {
                  setView(2);
                  if (!history) getHistory(currentBatch);
                } else {
                  setView(1);
                }
              }}
              onBack={() => {
                setView(0);
                setClasses();
                setHistory();
                setAttendance();
              }}
            />
          )}
          {studyClass && (
            <StudyView
              item={studyClass}
              userEmail={userEmail}
              isReviewed={reviewedIds.has(studyClass.id)}
              onToggleReview={() => toggleReview(studyClass.id)}
              onBack={() => setStudyClass(null)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// BatchesView — top-level "Your batches"
// ============================================================
function BatchesView({ batches, isAdmin, isDemo, onOpenClasses, onOpenHistory }) {
  return (
    <>
      <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Live classes</div>
      <h1
        style={{
          margin: "0 0 6px",
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
        }}
      >
        Your <span style={serifStyle}>batches</span> &amp; sessions.
      </h1>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: 14.5,
          lineHeight: 1.55,
          color: "var(--c-text-secondary)",
          maxWidth: "58ch",
        }}
      >
        Pick a batch to see today's classes and recordings.
      </p>

      <SectionHeader
        title="Your batches"
        meta={
          batches?.length
            ? `${batches.length} active`
            : batches?.length === 0
              ? "No batches"
              : "Loading…"
        }
      />

      {batches && batches.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 14,
          }}
        >
          {batches.map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              isAdmin={isAdmin}
              isDemo={isDemo}
              onEnter={() => onOpenClasses(b.id)}
              onHistory={() =>
                isDemo
                  ? toast.error("Cannot access history in demo mode")
                  : onOpenHistory(b.id)
              }
            />
          ))}
        </div>
      ) : batches?.length === 0 ? (
        <EmptyState
          title="No batches assigned"
          body="You are not currently enrolled in any active batches. Please contact your administrator for enrollment."
        />
      ) : (
        <Spinner />
      )}
    </>
  );
}

// ============================================================
// BatchCard
// ============================================================
function BatchCard({ batch, isAdmin, isDemo, onEnter, onHistory }) {
  const days = batch?.days || [];
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 16,
        padding: "20px 22px",
        transition: "transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
        cursor: "pointer",
      }}
      onClick={onEnter}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "var(--c-brand-primary)";
        e.currentTarget.style.boxShadow =
          "0 10px 24px -16px rgba(20,19,15,0.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--c-border-faint)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-0.012em",
              color: "var(--c-text-primary)",
            }}
          >
            {batch.title}
          </h3>
          {batch.description && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--c-text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {batch.description}
            </p>
          )}
        </div>
        {isDemo ? (
          <Pill kind="success">Demo</Pill>
        ) : (
          <Pill kind="brand">Active</Pill>
        )}
      </div>

      {/* Date meta (admin sees both dates; students see schedule chips) */}
      {(isAdmin || days.length > 0) && (
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12.5,
            color: "var(--c-text-tertiary)",
            paddingTop: 14,
            borderTop: "1px dashed var(--c-border-faint)",
            marginBottom: 12,
          }}
        >
          {isAdmin && batch.start_date && (
            <span>
              <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>
                Start
              </b>{" "}
              {CtoLocal(batch.start_date)?.date}{" "}
              {CtoLocal(batch.start_date)?.monthName}{" "}
              {CtoLocal(batch.start_date)?.year}
            </span>
          )}
          {isAdmin && batch.end_date && (
            <span>
              <b style={{ color: "var(--c-text-secondary)", fontWeight: 600 }}>
                End
              </b>{" "}
              {CtoLocal(batch.end_date)?.date}{" "}
              {CtoLocal(batch.end_date)?.monthName}{" "}
              {CtoLocal(batch.end_date)?.year}
            </span>
          )}
        </div>
      )}

      {days.length > 0 && <DayChips days={days} />}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <PrimaryButton
          onClick={(e) => {
            e.stopPropagation();
            onEnter();
          }}
        >
          Enter →
        </PrimaryButton>
        {!isDemo && (
          <GhostButton
            onClick={(e) => {
              e.stopPropagation();
              onHistory();
            }}
          >
            Recordings
          </GhostButton>
        )}
      </div>
    </div>
  );
}

// ============================================================
// InnerBatchView — single view with tabs for Today / Recordings
// (replaces the two separate ClassesView + HistoryView)
// ============================================================
function InnerBatchView({
  activeTab,
  classes,
  attendance,
  history,
  reviewedIds,
  effectiveStart,
  isDemo,
  onOpenStudy,
  onSwitchTab,
  onBack,
}) {
  return (
    <>
      <SoftButton onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back to batches
      </SoftButton>

      {/* Tab strip */}
      <div
        style={{
          display: "inline-flex",
          background: "var(--c-bg-elev)",
          border: "1px solid var(--c-border-faint)",
          borderRadius: 999,
          padding: 3,
          marginBottom: 24,
        }}
      >
        <Tab
          label="Today's classes"
          active={activeTab === "today"}
          onClick={() => onSwitchTab("today")}
        />
        {!isDemo && (
          <Tab
            label="Recordings"
            active={activeTab === "history"}
            onClick={() => onSwitchTab("history")}
          />
        )}
      </div>

      {activeTab === "today" ? (
        <TodayPane
          classes={classes}
          attendance={attendance}
          isDemo={isDemo}
        />
      ) : (
        <HistoryPane
          history={history}
          reviewedIds={reviewedIds}
          effectiveStart={effectiveStart}
          onOpenStudy={onOpenStudy}
        />
      )}
    </>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 18px",
        borderRadius: 999,
        border: "none",
        background: active ? "var(--c-surface)" : "transparent",
        color: active
          ? "var(--c-text-primary)"
          : "var(--c-text-secondary)",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function TodayPane({ classes, attendance, isDemo }) {
  return (
    <>
      <div style={{ ...eyebrowStyle, marginBottom: 6 }}>Today</div>
      <h2
        style={{
          margin: "0 0 22px",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.018em",
        }}
      >
        Your <span style={serifStyle}>classes</span> today.
      </h2>

      {classes && classes.length > 0 ? (
        classes.map((c) => (
          <ClassRow
            key={c.uuid || c.id}
            classItem={c}
            attended={attendance?.some((a) => a.class_id === c.uuid)}
          />
        ))
      ) : classes?.length === 0 ? (
        <EmptyState
          title={
            isDemo
              ? "Demo class will appear here"
              : "No class scheduled for today"
          }
          body={
            isDemo
              ? "Once admin adds a live class to this batch, it'll show up here."
              : "Check back tomorrow or look at your schedule for the week."
          }
        />
      ) : (
        <Spinner />
      )}
    </>
  );
}

// ============================================================
// ClassRow — one row inside ClassesView
// ============================================================
function ClassRow({ classItem, attended }) {
  const startStr = classItem.start_time
    ? formatHHMMTo12Hour(classItem.start_time)
    : "";
  const endStr = classItem.end_time
    ? formatHHMMTo12Hour(classItem.end_time)
    : "";
  // Split "5:30 PM" into time + AM/PM
  const [startTime, startAmPm] = (startStr || "").split(" ");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 22px",
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 16,
        marginBottom: 12,
        flexWrap: "wrap",
      }}
    >
      {startStr && (
        <div
          style={{
            textAlign: "center",
            paddingRight: 16,
            borderRight: "1px solid var(--c-border-faint)",
            minWidth: 86,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-accent)",
              fontStyle: "italic",
              fontSize: 22,
              lineHeight: 1,
              color: "var(--c-text-primary)",
              marginBottom: 4,
            }}
          >
            {startTime}
          </div>
          {startAmPm && (
            <div
              style={{
                fontSize: 11,
                color: "var(--c-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {startAmPm}
            </div>
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 200 }}>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: 15.5,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: "var(--c-text-primary)",
          }}
        >
          {classItem.title ?? "Today's class"}
        </h4>
        {(startStr || endStr) && (
          <div style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>
            {startStr}
            {endStr ? ` – ${endStr}` : ""}
          </div>
        )}
        {isToday(classItem?.start_time) && (
          <span style={{ marginTop: 6, display: "inline-block" }}>
            <Pill kind="brand">Today</Pill>
          </span>
        )}
      </div>
      {attended ? (
        <Pill kind="success">
          <Check size={12} style={{ marginRight: 4 }} />
          Attended
        </Pill>
      ) : null}
      {classItem.url && (
        <a
          href={classItem.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <PrimaryButton as="span">Join →</PrimaryButton>
        </a>
      )}
    </div>
  );
}

// ============================================================
// HistoryPane — recordings list, now Class Capsules
// ============================================================
function HistoryPane({ history, reviewedIds, effectiveStart, onOpenStudy }) {
  // Ship A: hide capsules dated before the student's effective start
  // date (null = show everything). The server enforces the same rule
  // in /api/recordings/play — this is just the honest UI for it.
  const visible = Array.isArray(history)
    ? history.filter(
        (h) =>
          !effectiveStart ||
          !h?.created_at ||
          String(h.created_at).slice(0, 10) >= String(effectiveStart).slice(0, 10),
      )
    : history;
  const hiddenCount = Array.isArray(history)
    ? history.length - visible.length
    : 0;

  return (
    <>
      <div style={{ ...eyebrowStyle, marginBottom: 6 }}>Recordings</div>
      <h2
        style={{
          margin: "0 0 22px",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.018em",
        }}
      >
        Catch up on <span style={serifStyle}>past</span> sessions.
      </h2>

      {Array.isArray(history) ? (
        <>
          {visible.map((h) => (
            <CapsuleRow
              key={h.id || h.created_at}
              item={h}
              isReviewed={reviewedIds?.has(h.id)}
              onClick={() => onOpenStudy(h)}
            />
          ))}
          {visible.length === 0 && hiddenCount === 0 && (
            <EmptyState
              title="No recordings yet"
              body="When a live class ends, the recording will land here within a few hours."
            />
          )}
          {hiddenCount > 0 && <LockedHistoryRow date={effectiveStart} />}
        </>
      ) : (
        <Spinner />
      )}
    </>
  );
}

// Ship A: single collapsed row standing in for all pre-start-date classes.
function LockedHistoryRow({ date }) {
  let pretty = String(date || "");
  try {
    const d = new Date(String(date));
    if (!isNaN(d.getTime())) {
      pretty = d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  } catch (_e) {}
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "18px 22px",
        background: "transparent",
        border: "1px dashed var(--c-border-soft)",
        borderRadius: 14,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--c-bg-elev)",
          border: "1px solid var(--c-border-faint)",
          display: "grid",
          placeItems: "center",
          color: "var(--c-text-tertiary)",
          flexShrink: 0,
        }}
      >
        <Lock size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: "var(--c-text-secondary)",
          }}
        >
          Classes before {pretty}
        </h4>
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--c-text-tertiary)",
          }}
        >
          Your plan starts from your join date — earlier recordings aren&apos;t
          part of it. Think this is wrong? Ask your counsellor.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CapsuleRow — one row in the recordings list
// ============================================================
function CapsuleRow({ item, isReviewed, onClick }) {
  const dt = item.created_at ? CtoLocal(item.created_at) : null;
  const hasNotes = !!item.notes_url;
  const dur = item.duration_seconds
    ? formatDurationLong(item.duration_seconds)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "18px 22px",
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 14,
        marginBottom: 12,
        cursor: "pointer",
        transition:
          "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "var(--c-brand-primary)";
        e.currentTarget.style.boxShadow =
          "0 8px 22px -16px rgba(20,19,15,0.15)";
        const arrow = e.currentTarget.querySelector("[data-arrow]");
        if (arrow) {
          arrow.style.background = "var(--c-brand-primary)";
          arrow.style.color = "white";
          arrow.style.borderColor = "var(--c-brand-primary)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--c-border-faint)";
        e.currentTarget.style.boxShadow = "none";
        const arrow = e.currentTarget.querySelector("[data-arrow]");
        if (arrow) {
          arrow.style.background = "var(--c-bg-elev)";
          arrow.style.color = "var(--c-text-secondary)";
          arrow.style.borderColor = "var(--c-border-faint)";
        }
      }}
    >
      {dt && (
        <div
          style={{
            flex: "0 0 56px",
            textAlign: "center",
            background: "var(--c-bg-elev)",
            borderRadius: 10,
            padding: "8px 6px",
            border: "1px solid var(--c-border-faint)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-accent)",
              fontStyle: "italic",
              fontSize: 22,
              lineHeight: 1,
              color: "var(--c-text-primary)",
            }}
          >
            {dt.date}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "var(--c-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginTop: 3,
            }}
          >
            {dt.monthName?.substring(0, 3)}
          </div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: "var(--c-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title ?? "Recorded class"}
        </h4>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 11.5,
            color: "var(--c-text-tertiary)",
            flexWrap: "wrap",
          }}
        >
          {item.faculty_name && <span>{item.faculty_name}</span>}
          {hasNotes && <MiniBadge tone="success">● Notes</MiniBadge>}
          {!hasNotes && <MiniBadge tone="muted">No notes yet</MiniBadge>}
          {isReviewed && <MiniBadge tone="brand">● Reviewed</MiniBadge>}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "var(--c-text-tertiary)",
        }}
      >
        {dur && (
          <span
            style={{
              fontSize: 12.5,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {dur}
          </span>
        )}
        <span
          data-arrow
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--c-bg-elev)",
            border: "1px solid var(--c-border-faint)",
            display: "grid",
            placeItems: "center",
            color: "var(--c-text-secondary)",
            fontSize: 14,
            transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
          }}
        >
          →
        </span>
      </div>
    </div>
  );
}

function MiniBadge({ tone, children }) {
  const palette = {
    success: {
      bg: "var(--c-success-soft, rgba(22,163,74,0.10))",
      fg: "var(--c-success, #16A34A)",
      bd: "var(--c-success, #16A34A)",
    },
    brand: {
      bg: "var(--c-brand-glow)",
      fg: "var(--c-brand-primary)",
      bd: "var(--c-brand-primary)",
    },
    muted: {
      bg: "var(--c-bg-elev)",
      fg: "var(--c-text-secondary)",
      bd: "var(--c-border-faint)",
    },
  };
  const p = palette[tone] || palette.muted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.bd}`,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ============================================================
// StudyView — split-pane: video left, notes right, Reviewed toggle on top
// ============================================================
function StudyView({ item, userEmail, isReviewed, onToggleReview, onBack }) {
  const dt = item.created_at ? CtoLocal(item.created_at) : null;

  // Ship A: ask the server how this capsule should be played.
  //   'signed' → private storage upload, short-lived signed URL, <video>
  //   'link'   → external URL (Zoom share / Drive / YT), embed as before
  //   'fallback' → API unavailable/denied — old behaviour (item.recording)
  const [playback, setPlayback] = useState({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setPlayback({ status: "loading" });
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await fetch("/api/recordings/play", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ classId: item.id }),
        });
        const j = await r.json().catch(() => null);
        if (!alive) return;
        if (r.ok && j && (j.type === "signed" || j.type === "link")) {
          setPlayback({ status: "ready", ...j });
        } else {
          setPlayback({ status: "fallback" });
        }
      } catch (_e) {
        if (alive) setPlayback({ status: "fallback" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [item.id]);

  const recordingSrc = item.recording ? buildEmbed(item.recording) : null;

  return (
    <div>
      <SoftButton onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back to recordings
      </SoftButton>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--c-text-tertiary)",
              marginBottom: 4,
            }}
          >
            Recording
            {dt && ` · ${dt.date} ${dt.monthName} ${dt.year}`}
            {item.faculty_name && ` · ${item.faculty_name}`}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.018em",
              lineHeight: 1.2,
            }}
          >
            {item.title ?? "Recorded class"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={onToggleReview}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${
                isReviewed
                  ? "var(--c-success, #16A34A)"
                  : "var(--c-border-soft)"
              }`,
              background: isReviewed
                ? "var(--c-success-soft, rgba(22,163,74,0.10))"
                : "var(--c-surface)",
              color: isReviewed
                ? "var(--c-success, #16A34A)"
                : "var(--c-text-secondary)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: isReviewed
                  ? "var(--c-success, #16A34A)"
                  : "transparent",
                color: "white",
                border: `1.5px solid ${
                  isReviewed
                    ? "var(--c-success, #16A34A)"
                    : "currentColor"
                }`,
                display: "grid",
                placeItems: "center",
                fontSize: 10,
              }}
            >
              {isReviewed ? "✓" : ""}
            </span>
            {isReviewed ? "Reviewed" : "Mark reviewed"}
          </button>
          {item.notes_url && (
            <a
              href={item.notes_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <GhostButton>↓ Download notes</GhostButton>
            </a>
          )}
        </div>
      </div>

      {/* Split-pane: video + notes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: item.notes_url ? "1.5fr 1fr" : "1fr",
          gap: 18,
          alignItems: "start",
        }}
        className="ipm-classes-split"
      >
        {/* Video stage */}
        <div>
          <div
            style={{
              position: "relative",
              background: "#000",
              borderRadius: 16,
              aspectRatio: "16 / 9",
              overflow: "hidden",
              border: "1px solid var(--c-border-faint)",
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {playback.status === "loading" ? (
              <span>Loading recording…</span>
            ) : playback.status === "ready" && playback.type === "signed" ? (
              <>
                <video
                  controls
                  playsInline
                  controlsList="nodownload"
                  src={playback.url}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <Watermark text={userEmail} />
              </>
            ) : playback.status === "ready" && playback.type === "link" ? (
              <iframe
                src={buildEmbed(playback.url)}
                title={item.title || "Class recording"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            ) : recordingSrc ? (
              <iframe
                src={recordingSrc}
                title={item.title || "Class recording"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            ) : (
              <span>No recording URL on this class</span>
            )}
          </div>
          {playback.status === "ready" &&
            playback.type === "link" &&
            playback.passcode && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12.5,
                  color: "var(--c-text-secondary)",
                }}
              >
                Passcode:{" "}
                <b
                  style={{
                    color: "var(--c-text-primary)",
                    fontVariantNumeric: "tabular-nums",
                    userSelect: "all",
                  }}
                >
                  {playback.passcode}
                </b>
              </div>
            )}
        </div>

        {/* Notes panel */}
        {item.notes_url && (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 16,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 220px)",
              minHeight: 420,
              position: "sticky",
              top: 16,
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid var(--c-border-faint)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--c-surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--c-text-primary)",
                }}
              >
                <span
                  style={{
                    background: "var(--c-brand-glow)",
                    color: "var(--c-brand-primary)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Notes
                </span>
                Class notes
              </div>
              <a
                href={item.notes_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--c-text-secondary)",
                  background: "var(--c-bg-elev)",
                  border: "1px solid var(--c-border-faint)",
                  padding: "4px 9px",
                  borderRadius: 6,
                }}
              >
                Open ↗
              </a>
            </div>
            <iframe
              src={buildPdfEmbed(item.notes_url)}
              title="Class notes"
              style={{
                flex: 1,
                width: "100%",
                border: 0,
                background: "var(--c-bg-elev)",
              }}
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 920px) {
          .ipm-classes-split {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Shared subcomponents
// ============================================================

function SectionHeader({ title, meta }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 14,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.018em",
          color: "var(--c-text-primary)",
        }}
      >
        {title}
      </h2>
      {meta && (
        <span style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
          {meta}
        </span>
      )}
    </div>
  );
}

function Pill({ kind, children }) {
  const palette = {
    success: {
      bg: "var(--c-success-soft, rgba(22,163,74,0.10))",
      fg: "var(--c-success, #16A34A)",
      bd: "var(--c-success, #16A34A)",
    },
    danger: {
      bg: "var(--c-danger-soft, rgba(220,38,38,0.10))",
      fg: "var(--c-danger, #DC2626)",
      bd: "var(--c-danger, #DC2626)",
    },
    brand: {
      bg: "var(--c-brand-glow, rgba(217,119,6,0.16))",
      fg: "var(--c-brand-primary)",
      bd: "var(--c-brand-primary)",
    },
    muted: {
      bg: "var(--c-bg-elev)",
      fg: "var(--c-text-secondary)",
      bd: "var(--c-border-faint)",
    },
  };
  const p = palette[kind] || palette.muted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 999,
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function DayChips({ days }) {
  const dayMap = [
    { short: "S", index: 0, title: "Sunday" },
    { short: "M", index: 1, title: "Monday" },
    { short: "T", index: 2, title: "Tuesday" },
    { short: "W", index: 3, title: "Wednesday" },
    { short: "T", index: 4, title: "Thursday" },
    { short: "F", index: 5, title: "Friday" },
    { short: "S", index: 6, title: "Saturday" },
  ];
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {dayMap.map((d) => {
        const on = days.includes(d.index);
        return (
          <span
            key={d.title}
            title={d.title}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: on
                ? "var(--c-brand-glow)"
                : "var(--c-bg-elev)",
              color: on
                ? "var(--c-brand-primary)"
                : "var(--c-text-tertiary)",
              fontSize: 10.5,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
            }}
          >
            {d.short}
          </span>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, onClick, as }) {
  const Tag = as || "button";
  return (
    <Tag
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        background: "var(--c-brand-primary)",
        color: "white",
        transition: "transform 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      {children}
    </Tag>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid var(--c-border-soft)",
        background: "transparent",
        color: "var(--c-text-primary)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "transform 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = "var(--c-brand-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--c-border-soft)";
      }}
    >
      {children}
    </button>
  );
}

function SoftButton({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 500,
        border: "1px solid var(--c-border-soft)",
        background: "var(--c-bg-elev)",
        color: "var(--c-text-secondary)",
        cursor: "pointer",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }) {
  return (
    <div
      style={{
        border: "1px dashed var(--c-border-soft)",
        borderRadius: 16,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--c-text-secondary)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--c-text-tertiary)",
          maxWidth: "42ch",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid var(--c-border-faint)",
          borderTopColor: "var(--c-brand-primary)",
          animation: "ipm-classes-spin 0.8s linear infinite",
        }}
      />
      <style jsx global>{`
        @keyframes ipm-classes-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Phase 23 Ship B helpers
// ============================================================

// Ship A: faint identity watermark over storage-served videos.
// Hops to a random corner every ~40s so it can't be cropped out once.
function Watermark({ text }) {
  const corners = [
    { top: 14, left: 16 },
    { top: 14, right: 16 },
    { bottom: 20, left: 16 },
    { bottom: 20, right: 16 },
  ];
  const [corner, setCorner] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCorner(Math.floor(Math.random() * corners.length));
    }, 40000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!text) return null;
  return (
    <div
      style={{
        position: "absolute",
        ...corners[corner % corners.length],
        opacity: 0.18,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.02em",
        color: "white",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 2,
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}
    >
      {text}
    </div>
  );
}

function formatDurationLong(seconds) {
  if (!seconds || seconds <= 0) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Convert a raw recording URL into an embeddable iframe src.
// Supports YouTube (watch, short, embed), Vimeo, generic URLs.
function buildEmbed(url) {
  if (!url) return "";
  const yt =
    url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i) ||
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/i);
  if (yt) {
    return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  }
  const vm = url.match(/vimeo\.com\/(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url; // assume it's already embeddable
}

// Embed a PDF in an iframe. Direct PDF URLs work natively in most browsers.
// For storage URLs that block iframe embedding, students can use the "Open ↗"
// link to view in a new tab.
function buildPdfEmbed(url) {
  if (!url) return "";
  // If it's a Google Drive share link, swap to preview mode
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  return url;
}
