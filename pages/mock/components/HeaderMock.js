// ============================================================
// Header — Phase 3 redesign for mock test runner
// Slim header bar + section/timer bar. All props preserved.
// ============================================================

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input } from "@nextui-org/react";
import _ from "lodash";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Calculator, LogOut } from "lucide-react";

export default function HeaderMock({ title, state, userData, openCalculator, remainingTime, calc }) {
  const [text, SetText] = useState("");
  const [textToEnter] = useState("Cancel");
  const router = useRouter();

  function convertSeconds(totalSeconds) {
    totalSeconds = _.toInteger(totalSeconds);
    const hours = _.floor(totalSeconds / 3600);
    const minutes = _.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${_.padStart(hours, 2, "0")}:${_.padStart(minutes, 2, "0")}:${_.padStart(seconds, 2, "0")}`;
  }

  // Tier the timer colour by how much time is left
  const totalSecs = _.toInteger(remainingTime);
  const timerTier = totalSecs < 300 ? "danger" : totalSecs < 600 ? "warn" : "ok";
  const timerStyle = {
    ok: { background: "var(--c-brand-primary-tint)", color: "var(--c-brand-primary)" },
    warn: { background: "var(--c-warning-soft)", color: "var(--c-warning)" },
    danger: { background: "var(--c-danger-soft)", color: "var(--c-danger)" },
  }[timerTier];

  const fullName = userData?.user_metadata?.full_name || "Student";
  const initials = fullName.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  return (
    <>
      {/* TOP BAR */}
      <div
        className="w-full flex flex-row items-center justify-between px-6 py-3"
        style={{
          background: "var(--c-surface)",
          borderBottom: "1px solid var(--c-border-faint)",
        }}
      >
        <img src="/newlog.svg" alt="IPM Careers" style={{ height: 36, width: "auto" }} />

        <div className="flex flex-row items-center" style={{ gap: 10 }}>
          {state == 1 && calc == true && (
            <button
              onClick={() => openCalculator()}
              aria-label="Calculator"
              title="Calculator"
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--c-surface)",
                color: "var(--c-text-secondary)",
                border: "1px solid var(--c-border-soft)",
                display: "grid", placeItems: "center", cursor: "pointer",
              }}
            >
              <Calculator size={18} />
            </button>
          )}

          {state == 1 ? (
            <Dropdown>
              <DropdownTrigger>
                <button
                  style={{
                    height: 36, padding: "0 14px",
                    background: "var(--c-surface)",
                    color: "var(--c-text-secondary)",
                    border: "1px solid var(--c-border-soft)",
                    borderRadius: 999,
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <LogOut size={14} /> Exit test
                </button>
              </DropdownTrigger>
              <DropdownMenu className="max-w-[260px]">
                <DropdownItem isReadOnly>
                  Are you sure?<br />Type <span className="text-danger font-bold">"{textToEnter}"</span> to confirm
                </DropdownItem>
                <DropdownItem isReadOnly>
                  <Input label="Confirm" placeholder="Type here" onChange={(e) => SetText(e.target.value)} size="sm" />
                </DropdownItem>
                <DropdownItem>
                  <Button
                    color="danger" size="sm"
                    onPress={() => { textToEnter == text ? router.back() : toast.error("Incorrect confirmation text"); }}
                  >
                    Confirm, cancel test
                  </Button>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          ) : (
            <button
              onClick={() => router.push("/")}
              style={{
                height: 36, padding: "0 14px",
                background: "var(--c-surface)",
                color: "var(--c-text-secondary)",
                border: "1px solid var(--c-border-soft)",
                borderRadius: 999,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <LogOut size={14} /> Back to dashboard
            </button>
          )}

          <div
            className="hidden md:grid"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--c-brand-primary-tint)",
              color: "var(--c-brand-primary)",
              placeItems: "center",
              fontWeight: 600, fontSize: 13,
            }}
            title={fullName}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* SECTION + TIMER BAR */}
      <div
        className="w-full flex flex-row items-center justify-between px-6 py-3"
        style={{
          background: "var(--c-surface-muted, var(--c-bg))",
          borderBottom: "1px solid var(--c-border-faint)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {title && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 500, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--c-text-tertiary)",
              }}>
                Current section
              </div>
              <div style={{
                fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em",
                color: "var(--c-text-primary)", marginTop: 2,
              }}>
                {title}
              </div>
            </>
          )}
        </div>

        {state == 1 && (
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 14, fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              ...timerStyle,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "currentColor",
              animation: "ipm-timer-blink 2s ease-in-out infinite",
            }} />
            {convertSeconds(remainingTime)} <span style={{ fontWeight: 500, opacity: 0.75 }}>left</span>
          </div>
        )}
      </div>

      {/* Inline keyframes — only needed by this component */}
      <style jsx global>{`
        @keyframes ipm-timer-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </>
  );
}
