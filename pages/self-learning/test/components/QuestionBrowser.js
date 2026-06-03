// ============================================================
// QuestionBrowser — Phase 3 redesign
// Standard NTA exam color scheme: green=answered, red=not answered,
// purple=marked, gray=not visited. Current = ring around cell.
// All props + behaviours preserved (sideBarActive, gamestate, etc).
// ============================================================

import { useNMNContext } from "@/components/NMNContext";
import { Avatar } from "@nextui-org/react";
import { ChevronRight } from "lucide-react";

/**
 * Status helper — returns a string ("answered" | "notanswered" | "marked" |
 * "answeredmarked" | "notvisited") that drives both the cell colour and the
 * sidebar legend counts.
 */
export function getStatusKey(q, report, tempAnswers) {
  const r = report?.find((item) => item.id == q.id);

  // Answered AND marked for review
  if (r && r.status == "markedForReview") return "answeredmarked";
  // Marked for review (no answer)
  if (report?.filter((item) => item.status == "review")?.some((item) => item.id == q.id)) return "marked";
  // Answered (saved with an answer)
  if (r && r.status != "review") return "answered";
  // Temporary answer (typed but not saved)
  if (tempAnswers && tempAnswers[q.id]) return "answered";
  // Visited but not answered — we don't have explicit "visited" tracking, so default to not visited
  return "notvisited";
}

const STATUS_STYLES = {
  answered:      { bg: "#22c55e", color: "#fff",                  border: "#16a34a", label: "Answered" },
  notanswered:   { bg: "#ef4444", color: "#fff",                  border: "#dc2626", label: "Not answered" },
  marked:        { bg: "#a855f7", color: "#fff",                  border: "#9333ea", label: "Marked" },
  answeredmarked:{ bg: "#22c55e", color: "#fff",                  border: "#a855f7", label: "Answered & marked" }, // green fill, purple border
  notvisited:    { bg: "var(--c-surface-sunken, #F2F2F4)",
                   color: "var(--c-text-secondary)",
                   border: "var(--c-border-soft)",
                   label: "Not visited" },
};

// Re-exported for external use (kept compatible with old import sites)
export function getStatusIcon() { return null; } // legacy noop — old SVG icons no longer used

export default function QuestionBrowser({
  sideBarActive, setSidebarActive, gamestate,
  questions, report, tempAnswers, switchQuestion,
}) {
  const { userDetails } = useNMNContext();

  // Counts
  const answered = (questions || []).filter((q) => getStatusKey(q, report, tempAnswers) === "answered").length;
  const notAnswered = (questions || []).filter((q) => getStatusKey(q, report, tempAnswers) === "notanswered").length;
  const marked = (questions || []).filter((q) => {
    const k = getStatusKey(q, report, tempAnswers);
    return k === "marked" || k === "answeredmarked";
  }).length;
  const notVisited = (questions || []).filter((q) => getStatusKey(q, report, tempAnswers) === "notvisited").length;

  const fullName = userDetails?.user_metadata?.full_name || "Student";
  const initials = fullName.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  return (
    <div
      className={
        "flex h-full flex-col w-full max-w-0 transition-all z-[20] ease-in-out duration-300 translate-x-full fixed right-0 top-0 lg:relative lg:translate-x-0 " +
        (sideBarActive ? " !max-w-[400px] !translate-x-0" : "")
      }
      style={{
        background: "var(--c-surface)",
        borderLeft: "1px solid var(--c-border-faint)",
      }}
    >
      {/* Mobile pull handle */}
      <div
        className="w-auto h-auto bottom-8 lg:hidden flex absolute p-2"
        style={{
          background: "var(--c-brand-primary)",
          borderRadius: "0 12px 12px 0",
          cursor: "pointer",
        }}
        onClick={() => setSidebarActive(false)}
      >
        <ChevronRight size={18} color="#fff" />
      </div>

      <div className={"w-full flex-col hidden " + (sideBarActive ? " !flex " : "")}>

        {/* Profile pane when not yet started */}
        {gamestate == 0 ? (
          <div className="p-5">
            <div
              className="p-4 rounded-[14px] flex flex-row items-center"
              style={{
                background: "var(--c-surface-muted, var(--c-bg))",
                border: "1px solid var(--c-border-faint)",
                gap: 16,
              }}
            >
              <Avatar
                src={userDetails?.user_metadata?.profile_pic || ""}
                fallback={initials}
                className="w-16 h-16"
              />
              <div className="flex flex-col">
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
                  Signed in as
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 600,
                  color: "var(--c-text-primary)",
                  letterSpacing: "-0.015em", marginTop: 2,
                }}>
                  {fullName}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Question grid + legend when in-test */}
        {gamestate == 1 ? (
          <div className="p-5 flex flex-col" style={{ gap: 22 }}>

            {/* Legend / status counts */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 500, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--c-text-tertiary)",
                marginBottom: 12,
              }}>
                Status
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <LegendChip dot="#22c55e" label="Answered" count={answered} />
                <LegendChip dot="#ef4444" label="Not answered" count={notAnswered} />
                <LegendChip dot="#a855f7" label="Marked" count={marked} />
                <LegendChip dotBg="var(--c-surface-sunken, #F2F2F4)"
                            dotBorder="var(--c-border-soft)"
                            label="Not visited" count={notVisited} />
              </div>
            </div>

            {/* Question grid */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 500, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--c-text-tertiary)",
                marginBottom: 12,
              }}>
                Questions
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {questions && questions.map((q, idx) => {
                  const key = getStatusKey(q, report, tempAnswers);
                  const s = STATUS_STYLES[key] || STATUS_STYLES.notvisited;
                  return (
                    <button
                      key={q.id}
                      onClick={() => switchQuestion(q.id)}
                      style={{
                        aspectRatio: "1",
                        background: s.bg,
                        color: s.color,
                        border: `1px solid ${s.border}`,
                        borderRadius: 8,
                        fontSize: 13, fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                        cursor: "pointer",
                        display: "grid", placeItems: "center",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}

// ── Sub-component: small legend row with a dot + label + count ──
function LegendChip({ dot, dotBg, dotBorder, label, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--c-text-secondary)" }}>
      <span style={{
        width: 14, height: 14, borderRadius: 5,
        background: dotBg || dot,
        border: dotBorder ? `1px solid ${dotBorder}` : "none",
        flexShrink: 0,
      }} />
      <span style={{ flex: 1, lineHeight: 1.3 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--c-text-primary)", fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </div>
  );
}
