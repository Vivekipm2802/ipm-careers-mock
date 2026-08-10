// ============================================================
// PageHeader — D1 quiet chrome (July 2026).
//
// ONE compact header for every student page except the Dashboard
// (which keeps its big serif welcome — the single hero moment).
// Total vertical footprint stays under ~90px.
//
//   kicker   — 11px uppercase gold eyebrow (optional)
//   title    — 26px ds-display line
//   accent   — optional LAST word, rendered "ds-accent ds-grad-text"
//   subtitle — one quiet 13px line (optional)
//   right    — optional node (buttons/links) aligned to the right
//
// CSS variables only — no hex colors in here.
// ============================================================

export default function PageHeader({ kicker, title, accent, subtitle, right }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 22,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {kicker && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--c-brand-gold)",
              marginBottom: 4,
            }}
          >
            {kicker}
          </div>
        )}
        <h1
          className="ds-display"
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "var(--c-text-primary)",
          }}
        >
          {title}
          {accent ? (
            <>
              {" "}
              <span className="ds-accent ds-grad-text">{accent}</span>
            </>
          ) : null}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--c-text-tertiary)",
              maxWidth: 560,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}
