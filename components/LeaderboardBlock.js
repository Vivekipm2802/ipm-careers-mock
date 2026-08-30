// ============================================================
// LeaderboardBlock — shared "Top scorers" + "You vs the topper"
// renderer for the concept and mock result pages (2026-08
// correctness audit).
//
// Feeds ONLY from /api/leaderboard's payload:
//   { top: [{rank, name, scoreMarks, maxMarks, attempted, correct,
//            timeMin, isYou}], you, top10pctAvg, totalPlayers }
// Scores always render as MARKS ("56 / 60") — never the raw stored
// score column (legacy rows carried percentages / nulls).
// ============================================================

import { useState } from "react";
import { Trophy } from "lucide-react";

function marks(row) {
  if (row == null || !Number.isFinite(Number(row.scoreMarks))) return "—";
  const m = Math.max(0, Number(row.scoreMarks));
  return Number.isFinite(Number(row.maxMarks)) && Number(row.maxMarks) > 0
    ? `${m} / ${row.maxMarks}`
    : String(m);
}

function Row({ row, isExtra }) {
  const isYou = !!row.isYou;
  const isGold = row.rank === 1;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr 110px",
        padding: "10px 0",
        alignItems: "center",
        borderTop: isExtra
          ? "1px dashed var(--c-border-soft)"
          : row.rank === 1
          ? "none"
          : "1px solid var(--c-border-faint)",
        background: isYou ? "var(--c-brand-primary-tint)" : "transparent",
        margin: isYou ? "0 -10px" : "0",
        paddingLeft: isYou ? 10 : 0,
        paddingRight: isYou ? 10 : 0,
        borderRadius: isYou ? 10 : 0,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: isGold
            ? "linear-gradient(135deg, var(--c-brand-gold), var(--c-brand-gold-tint))"
            : "var(--c-surface-muted, var(--c-bg))",
          color: isGold ? "#fff" : "var(--c-text-secondary)",
          display: "grid",
          placeItems: "center",
          fontWeight: 600,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {row.rank}
      </div>
      <div style={{ fontSize: 14, color: "var(--c-text-primary)", fontWeight: isYou ? 600 : 500 }}>
        {isYou ? `You${row.name ? ` · ${row.name}` : ""}` : row.name || "Student"}
      </div>
      <div
        style={{
          textAlign: "right",
          fontSize: 14,
          color: "var(--c-text-primary)",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {marks(row)}
      </div>
    </div>
  );
}

const cmpTh = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--c-text-tertiary)",
  textAlign: "right",
  padding: "10px 14px",
  background: "var(--c-surface-muted, var(--c-bg))",
};
const cmpTd = {
  fontSize: 13.5,
  color: "var(--c-text-primary)",
  textAlign: "right",
  padding: "12px 14px",
  borderTop: "1px solid var(--c-border-faint)",
  fontVariantNumeric: "tabular-nums",
};

function fmt(v, suffix) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return suffix ? `${v}${suffix}` : String(v);
}

function CompareTable({ board }) {
  const you = board.you;
  const topper = board.top && board.top.length > 0 ? board.top[0] : null;
  const avg = board.top10pctAvg;
  if (!topper) return null;
  const rows = [
    you ? { label: "You", strong: true, r: you } : null,
    { label: topper.isYou ? "Topper (you!)" : `Topper · ${topper.name || "Student"}`, r: topper },
    avg
      ? {
          label: `Top 10% average (${avg.count})`,
          muted: true,
          r: { scoreMarks: avg.scoreMarks, maxMarks: topper.maxMarks, attempted: avg.attempted, correct: avg.correct, timeMin: avg.timeMin },
        }
      : null,
  ].filter(Boolean);

  return (
    <div style={{ border: "1px solid var(--c-border-faint)", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...cmpTh, textAlign: "left" }}>Your test vs. the topper</th>
            <th style={cmpTh}>Score</th>
            <th style={cmpTh}>Attempted</th>
            <th style={cmpTh}>Correct</th>
            <th style={cmpTh}>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ opacity: row.muted ? 0.75 : 1 }}>
              <td style={{ ...cmpTd, textAlign: "left", fontWeight: row.strong ? 600 : 500 }}>{row.label}</td>
              <td style={{ ...cmpTd, fontWeight: 600 }}>{marks(row.r)}</td>
              <td style={cmpTd}>{fmt(row.r.attempted)}</td>
              <td style={cmpTd}>{fmt(row.r.correct)}</td>
              <td style={cmpTd}>{fmt(row.r.timeMin, " min")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Compact variant (2026-08 owner feedback): side-rail card for the
// result pages — top 5 rows, own row always visible, "Show all N"
// in-place toggle, condensed you-vs-topper lines. The full variant
// below stays untouched for any page that still wants the wide table.

function num(v) {
  return v != null && Number.isFinite(Number(v)) ? String(Math.max(0, Number(v))) : "—";
}

function CompactRow({ row, isExtra }) {
  const isYou = !!row.isYou;
  const isGold = row.rank === 1;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr auto",
        gap: 8,
        alignItems: "center",
        padding: "7px 0",
        borderTop: isExtra
          ? "1px dashed var(--c-border-soft)"
          : row.rank === 1
          ? "none"
          : "1px solid var(--c-border-faint)",
        background: isYou ? "var(--c-brand-primary-tint)" : "transparent",
        margin: isYou ? "0 -8px" : 0,
        paddingLeft: isYou ? 8 : 0,
        paddingRight: isYou ? 8 : 0,
        borderRadius: isYou ? 8 : 0,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          background: isGold
            ? "linear-gradient(135deg, var(--c-brand-gold), var(--c-brand-gold-tint))"
            : "var(--c-surface-muted, var(--c-bg))",
          color: isGold ? "#fff" : "var(--c-text-secondary)",
          display: "grid",
          placeItems: "center",
          fontWeight: 600,
          fontSize: 10.5,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {row.rank}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--c-text-primary)",
          fontWeight: isYou ? 600 : 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {isYou ? `You${row.name ? ` · ${row.name}` : ""}` : row.name || "Student"}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--c-text-primary)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {num(row.scoreMarks)}
      </span>
    </div>
  );
}

function CompactVs({ board }) {
  const you = board.you || board.top.find((r) => r.isYou);
  const topper = board.top && board.top.length > 0 ? board.top[0] : null;
  if (!you || !topper || topper.isYou) return null;
  const hasTime =
    Number.isFinite(Number(you.timeMin)) && Number.isFinite(Number(topper.timeMin));
  const rows = [
    ["Score", num(you.scoreMarks), num(topper.scoreMarks)],
    ["Attempted", num(you.attempted), num(topper.attempted)],
    ["Correct", num(you.correct), num(topper.correct)],
    ...(hasTime ? [["Time", `${you.timeMin}m`, `${topper.timeMin}m`]] : []),
  ];
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--c-border-faint)" }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--c-text-tertiary)",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        You vs topper
      </div>
      {rows.map(([label, mine, theirs]) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: "4px 0",
            fontSize: 12.5,
          }}
        >
          <span style={{ color: "var(--c-text-tertiary)" }}>{label}</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--c-text-secondary)" }}>
            <b style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>{mine}</b>
            <span style={{ color: "var(--c-text-tertiary)", fontSize: 11 }}> vs </span>
            {theirs}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardBlock({ board, sectionTitleStyle, compact }) {
  // Hook stays ABOVE the early return (portal hook-order rule).
  const [showAll, setShowAll] = useState(false);
  if (!board || !Array.isArray(board.top) || board.top.length === 0) return null;
  const youInTop = board.top.some((r) => r.isYou);
  const showYouExtra = board.you && !youInTop;

  if (compact) {
    const visible = showAll ? board.top : board.top.slice(0, 5);
    const youInVisible = visible.some((r) => r.isYou);
    const youExtraRow = board.you && !youInVisible ? board.you : null;
    return (
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border-faint)",
          borderRadius: 16,
          boxShadow: "var(--c-shadow-xs)",
          padding: "16px 18px 18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Trophy size={14} style={{ color: "var(--c-brand-gold)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text-primary)" }}>
            Top scorers
          </span>
          {/* 2026-08 owner call: never show students the total player
              count — rank only. */}
        </div>
        {visible.map((row) => (
          <CompactRow key={row.rank} row={row} />
        ))}
        {youExtraRow && <CompactRow row={youExtraRow} isExtra />}
        {board.top.length > 5 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            style={{
              marginTop: 8,
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--c-brand-gold)",
            }}
          >
            {showAll ? "Show top 5" : `Show top ${board.top.length}`}
          </button>
        )}
        <CompactVs board={board} />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "32px 0 16px" }}>
        <Trophy size={18} style={{ color: "var(--c-brand-gold)" }} />
        <h2 style={{ ...(sectionTitleStyle || {}), margin: 0 }}>Top scorers</h2>
        {/* 2026-08 owner call: no total player count — rank only. */}
        <span style={{ fontSize: 12, color: "var(--c-text-tertiary)" }}>best attempt each</span>
      </div>
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border-faint)",
          borderRadius: 18,
          padding: "24px 28px",
          marginBottom: 32,
        }}
      >
        {board.top.map((row) => (
          <Row key={row.rank} row={row} />
        ))}
        {showYouExtra && <Row row={board.you} isExtra />}
        <CompareTable board={board} />
      </div>
    </>
  );
}
