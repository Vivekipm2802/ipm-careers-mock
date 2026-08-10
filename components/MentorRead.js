// ============================================================
// Mentor's read — D4 result coaching card (per approved preview
// preview-result-coaching.html): gold top hairline, uppercase
// "Mentor's read" cap, icon lines separated by faint rules.
//
// Purely presentational — NO hooks, so it is always safe inside
// pages that have crashed on hook order before. The pages compute
// `lines` (lib/mentorRead.js) and pass:
//   lines: [{ tone: 'gold'|'danger'|'success', icon: 'trend'|'alert'|'check'|'clock', node: <jsx> }]
// Renders nothing when there is nothing worth saying.
// ============================================================

import { AlertCircle, Check, Clock, TrendingUp } from "lucide-react";

const TONES = {
  gold: { bg: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)" },
  danger: { bg: "var(--c-danger-soft, #FBE3E3)", color: "var(--c-danger)" },
  success: { bg: "var(--c-success-soft, #D6F3E3)", color: "var(--c-success)" },
};

const ICONS = { trend: TrendingUp, alert: AlertCircle, check: Check, clock: Clock };

export default function MentorRead({ lines }) {
  const list = (Array.isArray(lines) ? lines : []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 18,
        padding: "20px 24px",
        marginBottom: 32,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* gold top hairline (preview's .mentor::after) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 24,
          right: 24,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--c-brand-gold), transparent)",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--c-brand-gold)",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Mentor&apos;s read
      </div>
      {list.map((line, i) => {
        const t = TONES[line.tone] || TONES.gold;
        const Icon = ICONS[line.icon] || TrendingUp;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "8px 0",
              borderTop: i === 0 ? "none" : "1px solid var(--c-border-faint)",
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                marginTop: 1,
                background: t.bg,
                color: t.color,
              }}
            >
              <Icon size={14} />
            </span>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--c-text-primary)" }}>
              {line.node}
            </div>
          </div>
        );
      })}
    </div>
  );
}
