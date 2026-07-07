import { Button, ScrollShadow } from "@nextui-org/react";
import Link from "next/link";

/**
 * Today's Classes — Phase 1.5 redesign
 *
 * Replaces the old white-card-with-pink-heading look with a clean list of
 * class rows that use design tokens. Sits cleanly inside the Dashboard's
 * "Today's classes" wrapper card in both light and dark mode.
 *
 * All time-parsing and status logic is preserved exactly as the original.
 */
const ClassDashboard = ({ classes }) => {
  const getClassStatus = (startTime, endTime) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      timeStr = timeStr.replace(/([+-]\d{2})(?!:)/, "$1:00");
      let [h, m, s] = timeStr.split(":");
      h = parseInt(h) || 0;
      m = parseInt(m) || 0;
      s = parseInt(s) || 0;
      const d = new Date(today);
      d.setHours(h, m, s, 0);
      return d;
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (!start || !end || isNaN(start) || isNaN(end)) return "invalid";
    if (now < start) return "upcoming";
    if (now > end) return "expired";
    return "ongoing";
  };

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  // Status pill — soft tinted background, semantic text
  const statusStyles = {
    expired: {
      background: "var(--c-surface-sunken)",
      color: "var(--c-text-tertiary)",
      label: "Completed",
    },
    ongoing: {
      background: "var(--c-success-soft)",
      color: "var(--c-success)",
      label: "Live now",
    },
    upcoming: {
      background: "var(--c-warning-soft)",
      color: "var(--c-warning)",
      label: "Upcoming",
    },
    invalid: {
      background: "var(--c-surface-sunken)",
      color: "var(--c-text-tertiary)",
      label: "Scheduled",
    },
  };

  return (
    <div className="w-full">
      <ScrollShadow className="max-h-[360px]">
        {classes.length === 0 ? (
          <p
            className="text-center py-4"
            style={{
              color: "var(--c-text-tertiary)",
              fontSize: 14,
            }}
          >
            No classes scheduled for today.
          </p>
        ) : (
          <div>
            {classes.map((item, idx) => {
              const status = getClassStatus(item.start_time, item.end_time);
              const s = statusStyles[status] || statusStyles.invalid;
              return (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                  style={{
                    padding: "14px 0",
                    borderTop:
                      idx === 0
                        ? "none"
                        : "1px solid var(--c-border-faint)",
                  }}
                >
                  {/* Time */}
                  <div
                    style={{
                      minWidth: 76,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--c-text-primary)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {formatTime(item.start_time)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--c-text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      to {formatTime(item.end_time)}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0 text-left">
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--c-text-primary)",
                        letterSpacing: "-0.005em",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--c-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      Live class
                    </div>
                  </div>

                  {/* Status pill */}
                  <div
                    className="inline-flex items-center"
                    style={{
                      background: s.background,
                      color: s.color,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {s.label}
                  </div>

                  {/* Action */}
                  <div className="flex flex-row items-center justify-end">
                    <Button
                      as={Link}
                      href={`${item.url}`}
                      color="primary"
                      variant={status === "ongoing" ? "solid" : "flat"}
                      target="_blank"
                      size="sm"
                      isDisabled={status !== "ongoing"}
                      style={{
                        borderRadius: 999,
                        fontWeight: 500,
                      }}
                    >
                      Join class
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollShadow>
    </div>
  );
};

export default ClassDashboard;
