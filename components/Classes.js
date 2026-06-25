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
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
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
  fontFamily: "'Instrument Serif', serif",
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

  // ──────────────────────────────────────────────────────────────
  // Data layer — unchanged from legacy Classes.js
  // ──────────────────────────────────────────────────────────────
  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        const res = await axios.post("/api/isAdmin", { email: user.email });
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

  async function getHistory(a) {
    const { data, error } = await supabase
      .from("classes_history")
      .select("*")
      .eq("batch_id", a)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Unable to Load Classes");
      return null;
    }
    if (data) setHistory(data);
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
                getHistory(id);
              }}
            />
          )}
          {view === 1 && (
            <ClassesView
              classes={classes}
              attendance={attendance}
              isDemo={isDemo}
              onBack={() => {
                setView(0);
                setClasses();
                setHistory();
              }}
            />
          )}
          {view === 2 && (
            <HistoryView
              history={history}
              onBack={() => {
                setView(0);
                setClasses();
                setHistory();
              }}
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
// ClassesView — view 1, today's classes for a batch
// ============================================================
function ClassesView({ classes, attendance, isDemo, onBack }) {
  return (
    <>
      <SoftButton onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back to batches
      </SoftButton>
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
              fontFamily: "'Instrument Serif', serif",
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
// HistoryView — view 2, recordings list
// ============================================================
function HistoryView({ history, onBack }) {
  return (
    <>
      <SoftButton onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back to batches
      </SoftButton>
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

      {history && history.length > 0 ? (
        history.map((h) => (
          <HistoryRow key={h.id || h.created_at} item={h} />
        ))
      ) : history?.length === 0 ? (
        <EmptyState
          title="No recordings yet"
          body="When a live class ends, the recording will land here within a few hours."
        />
      ) : (
        <Spinner />
      )}
    </>
  );
}

function HistoryRow({ item }) {
  const dt = item.created_at ? CtoLocal(item.created_at) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "16px 22px",
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
        {dt && (
          <div
            style={{
              flex: "0 0 60px",
              textAlign: "center",
              background: "var(--c-bg-elev)",
              borderRadius: 10,
              padding: "8px 6px",
              border: "1px solid var(--c-border-faint)",
            }}
          >
            <div
              style={{
                fontFamily: "'Instrument Serif', serif",
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
        <h4
          style={{
            margin: 0,
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: "var(--c-text-primary)",
          }}
        >
          {item.title ?? "Recorded class"}
        </h4>
      </div>
      {item.recording && (
        <Link
          href={item.recording}
          target="_blank"
          style={{ textDecoration: "none" }}
        >
          <GhostButton>View recording →</GhostButton>
        </Link>
      )}
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
