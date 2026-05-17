// ============================================================
// Footer — Phase 3 redesign for test runners
// Calm pill buttons grouped by intent. Same props/handlers.
// ============================================================

import { Button, Checkbox, Spacer } from "@nextui-org/react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useMediaQuery } from "react-responsive";
import { ArrowLeft, ArrowRight, Bookmark, Eraser } from "lucide-react";

export default function FooterMock({ state, isLoading, onNext, onInstruct, onPrev, onSubmit, onClear, onReview, onStart, index, config }) {
  const [checked, setChecked] = useState(false);
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });

  // Shared button styles using design tokens
  const btnBase = {
    height: isMobile ? 36 : 40,
    padding: isMobile ? "0 14px" : "0 18px",
    borderRadius: 999,
    fontSize: isMobile ? 13 : 13.5,
    fontWeight: 500,
    letterSpacing: "-0.005em",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.18s cubic-bezier(0.32, 0.72, 0, 1)",
    border: "1px solid transparent",
  };
  const ghostBtn = { ...btnBase, background: "transparent", color: "var(--c-text-secondary)", borderColor: "var(--c-border-soft)" };
  const secondaryBtn = { ...btnBase, background: "var(--c-surface-sunken, var(--c-surface-muted))", color: "var(--c-text-primary)", borderColor: "var(--c-border-soft)" };
  const primaryBtn = { ...btnBase, background: "var(--c-brand-primary)", color: "#fff" };
  const goldBtn = { ...btnBase, background: "var(--c-brand-gold)", color: "#1D1D1F", borderColor: "transparent" };
  const dangerBtn = { ...btnBase, background: "var(--c-surface)", color: "var(--c-danger)", borderColor: "var(--c-danger)" };

  return (
    <div
      className="p-3 w-full flex-grow-0 flex-shrink-0 fixed left-0 bottom-0 md:relative"
      style={{
        background: "var(--c-surface)",
        borderTop: "1px solid var(--c-border-faint)",
      }}
    >
      <div className="w-full flex flex-row items-center justify-between flex-wrap gap-2">

        {/* === STATE 0: Instructions phase === */}
        {state == 0 && (
          <div className="flex flex-col lg:flex-row items-center justify-center w-full">
            {index == 0 && (
              <button onClick={() => onInstruct(1)} style={goldBtn}>
                Next <ArrowRight size={14} />
              </button>
            )}
            {index == 1 && (
              <>
                <div className="flex flex-row items-center justify-start text-xs" style={{ color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
                  <Checkbox
                    size="md" color="success"
                    className="rounded-xl mx-2"
                    isSelected={checked}
                    onValueChange={(e) => setChecked(e)}
                  />
                  I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of /not wearing /not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to a disciplinary action, which may include ban from future Tests/Examinations.
                </div>
                <Spacer y={1} x={1} />
                <button onClick={() => onInstruct(0)} style={{ ...ghostBtn, marginRight: 8 }}>
                  <ArrowLeft size={14} /> Back
                </button>
                <Spacer y={2} x={1} />
                <button
                  onClick={() => { checked == true ? onStart() : toast.error("Please accept the terms before starting."); }}
                  style={primaryBtn}
                >
                  I'm ready to begin <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        )}

        {/* === STATE > 0: In-test === */}
        {state > 0 && (
          <>
            {/* Left group: navigation + secondary actions */}
            <div className="flex flex-row items-center" style={{ gap: 8 }}>
              {(config?.switch_questions && config?.switch_section) ?? false ? (
                <>
                  <button onClick={() => onPrev()} style={ghostBtn}>
                    <ArrowLeft size={14} /> Previous
                  </button>
                  <button onClick={() => onNext()} style={ghostBtn}>
                    Next <ArrowRight size={14} />
                  </button>
                </>
              ) : null}

              <button onClick={() => onReview()} style={goldBtn}>
                <Bookmark size={14} /> {isMobile ? "" : "Mark for review"}
              </button>
              <button onClick={() => onClear()} style={secondaryBtn}>
                <Eraser size={14} /> {isMobile ? "" : "Clear response"}
              </button>
            </div>

            {/* Right group: forward + submit */}
            <div className="flex flex-row items-center" style={{ gap: 8 }}>
              <button onClick={() => onSubmit()} style={dangerBtn} disabled={isLoading}>
                {isLoading ? "Submitting…" : "Submit test"}
              </button>

              {config?.switch_questions && config?.switch_section ? null : (
                <button onClick={() => onNext()} style={primaryBtn}>
                  Save & next <ArrowRight size={14} />
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
