// ============================================================
// Announcements — admin email tool (2026-08).
//
// Compose a branded announcement (subject / heading / message /
// optional CTA), pick the audience (all students vs batch
// students), preview it to your own inbox, then send for real —
// with an explicit "This emails N students" confirm step fed by
// GET /api/announce count mode. Sending happens server-side in
// /api/announce (admin-guarded, per-recipient sends so {{name}}
// personalization works; nobody sees anyone else's address).
//
// Two modes:
//   · plain — subject / heading / message / optional CTA.
//   · mock  — the "New mock is live" quick-fill: extra editable
//     fields for the gold banner (name / meta / window line),
//     3 stat rows, before-you-start tips, after-submit box.
//
// Portal grammar: radius-16 card, 999 chips/buttons, gold kicker,
// CSS vars only. Hooks all live above any return.
// ============================================================

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getAuthHeaders } from "@/utils/authHeaders";
import { useNMNContext } from "@/components/NMNContext";
import PillDropdown from "./ui/PillDropdown";
import { Megaphone, Send, Sparkles } from "lucide-react";

const card = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 16,
  boxShadow: "var(--c-shadow-xs)",
  flexShrink: 0,
};

const kicker = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--c-brand-gold)",
  marginBottom: 8,
};

const labelStyle = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: "var(--c-text-secondary)",
  marginBottom: 6,
};

const hintStyle = {
  fontSize: 11,
  color: "var(--c-text-tertiary)",
  marginTop: 5,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "transparent",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--c-text-primary)",
  outline: "none",
};

const goldBtn = (disabled) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--c-brand-gold)",
  color: "var(--c-surface)",
  fontWeight: 600,
  fontSize: 13.5,
  borderRadius: 999,
  padding: "11px 24px",
  border: "none",
  cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit",
  opacity: disabled ? 0.55 : 1,
  flexShrink: 0,
});

const ghostBtn = (disabled) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "transparent",
  color: "var(--c-text-secondary)",
  fontWeight: 600,
  fontSize: 12.5,
  borderRadius: 999,
  padding: "10px 18px",
  border: "1px solid var(--c-border-faint)",
  cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit",
  opacity: disabled ? 0.55 : 1,
  flexShrink: 0,
});

const EMPTY_STATS = [
  { label: "", count: "", note: "" },
  { label: "", count: "", note: "" },
  { label: "", count: "", note: "" },
];

// Quick-fill: "New mock is live" — switches the form into MOCK MODE
// with everything prefilled for the current mock. All editable.
const MOCK_LIVE_TEMPLATE = {
  subject: "New mock live: IIM Bangalore UG Mock 1",
  heading: "A new mock is live, {{name}}.",
  message:
    "The window is open on your portal — and this one is free for everyone. Take it whenever you have two-and-a-quarter free hours; no rush.",
  ctaUrl: "https://study.ipmcareer.com",
  mockName: "IIM Bangalore UG Mock 1",
  mockMeta:
    "Real exam pattern · 135 minutes · attempt in one sitting. Your analysis unlocks the moment you submit.",
  mockWindow: "open now · free for every aspirant",
  stats: [
    { label: "QA & DI", count: "30", note: "65 min · +3 / −1" },
    { label: "Logical Reasoning", count: "15", note: "35 min · +3 / −1" },
    { label: "VARC", count: "15", note: "35 min · +3 / −1" },
  ],
  tips: [
    "Sections come in a fixed order — QA & DI, then LR, then VARC. Each has its own timer and you cannot come back, so close each section properly.",
    "Every wrong answer costs 1 mark — accuracy beats attempts. A calm 40 attempts often beats a rushed 55.",
    "Review your analysis the same day. That is where the marks come from, not the mock itself.",
  ].join("\n"),
  afterTitle: "After you submit",
  afterText:
    "Score, leaderboard, section-wise accuracy and full solutions — instantly. Your wrong answers land in the Mistake Vault on their own.",
  afterLinkLabel: "Open the portal →",
  afterLinkUrl: "https://study.ipmcareer.com",
};

export default function Announcements() {
  const { userDetails } = useNMNContext() || {};

  // ── all hooks above any return ──────────────────────────────
  const [mode, setMode] = useState("plain"); // "plain" | "mock"
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [mockName, setMockName] = useState("");
  const [mockMeta, setMockMeta] = useState("");
  const [mockWindow, setMockWindow] = useState("");
  const [stats, setStats] = useState(EMPTY_STATS);
  const [tips, setTips] = useState("");
  const [afterTitle, setAfterTitle] = useState("");
  const [afterText, setAfterText] = useState("");
  const [afterLinkLabel, setAfterLinkLabel] = useState("");
  const [afterLinkUrl, setAfterLinkUrl] = useState("");
  const [audience, setAudience] = useState("all");

  const [sendingTest, setSendingTest] = useState(false);
  const [counting, setCounting] = useState(false);
  const [confirmTotal, setConfirmTotal] = useState(null); // number → confirm step visible
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { sent, failed, total }

  const adminEmail = userDetails?.email || "";
  const ready = Boolean(subject.trim() && message.trim());

  const audienceLabel =
    audience === "batch" ? "batch students" : "students";

  function applyTemplate() {
    setMode("mock");
    setSubject(MOCK_LIVE_TEMPLATE.subject);
    setHeading(MOCK_LIVE_TEMPLATE.heading);
    setMessage(MOCK_LIVE_TEMPLATE.message);
    setCtaLabel("");
    setCtaUrl(MOCK_LIVE_TEMPLATE.ctaUrl);
    setMockName(MOCK_LIVE_TEMPLATE.mockName);
    setMockMeta(MOCK_LIVE_TEMPLATE.mockMeta);
    setMockWindow(MOCK_LIVE_TEMPLATE.mockWindow);
    setStats(MOCK_LIVE_TEMPLATE.stats.map((s) => ({ ...s })));
    setTips(MOCK_LIVE_TEMPLATE.tips);
    setAfterTitle(MOCK_LIVE_TEMPLATE.afterTitle);
    setAfterText(MOCK_LIVE_TEMPLATE.afterText);
    setAfterLinkLabel(MOCK_LIVE_TEMPLATE.afterLinkLabel);
    setAfterLinkUrl(MOCK_LIVE_TEMPLATE.afterLinkUrl);
    setResult(null);
    setConfirmTotal(null);
  }

  function backToPlain() {
    setMode("plain");
    setResult(null);
    setConfirmTotal(null);
  }

  function setStatField(i, field, value) {
    setStats((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  }

  function payload(extra) {
    const base = {
      subject: subject.trim(),
      heading: heading.trim(),
      message,
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
      audience,
      template: mode,
      ...extra,
    };
    if (mode === "mock") {
      base.mock = {
        name: mockName.trim(),
        metaLine: mockMeta.trim(),
        windowLine: mockWindow.trim(),
        stats: stats
          .filter((s) => s.label.trim() || s.count.trim())
          .slice(0, 3)
          .map((s) => ({
            label: s.label.trim(),
            count: s.count.trim(),
            note: s.note.trim(),
          })),
        tips: tips
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 4),
        afterTitle: afterTitle.trim(),
        afterText: afterText.trim(),
        afterLinkLabel: afterLinkLabel.trim(),
        afterLinkUrl: afterLinkUrl.trim(),
      };
    }
    return base;
  }

  async function sendTestToMe() {
    if (!ready || sendingTest) return;
    if (!adminEmail) {
      toast.error("Could not read your email — reload and try again");
      return;
    }
    setSendingTest(true);
    setResult(null);
    try {
      await axios.post("/api/announce", payload({ testEmail: adminEmail }), {
        headers: await getAuthHeaders(),
      });
      toast.success(`Test sent to ${adminEmail}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Test send failed");
    }
    setSendingTest(false);
  }

  async function startConfirm() {
    if (!ready || counting || sending) return;
    setCounting(true);
    setResult(null);
    try {
      const { data } = await axios.get(`/api/announce?audience=${audience}`, {
        headers: await getAuthHeaders(),
      });
      setConfirmTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not count recipients");
    }
    setCounting(false);
  }

  async function sendForReal() {
    if (sending) return;
    setSending(true);
    try {
      const { data } = await axios.post("/api/announce", payload(), {
        headers: await getAuthHeaders(),
      });
      setResult(data);
      setConfirmTotal(null);
      if (data?.failed) {
        toast.error(`Sent ${data.sent}, ${data.failed} failed`);
      } else {
        toast.success(`Announcement sent to ${data?.sent ?? 0} students`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Send failed");
    }
    setSending(false);
  }

  return (
    <div style={{ width: "100%", maxWidth: 720, padding: "8px 4px 40px" }}>
      <div style={kicker}>
        <Megaphone
          size={13}
          style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }}
        />
        Admin · Announcements
      </div>
      <h1
        className="ds-display"
        style={{
          margin: "0 0 6px",
          fontSize: 26,
          color: "var(--c-text-primary)",
        }}
      >
        Email the students
      </h1>
      <p
        style={{
          margin: "0 0 18px",
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--c-text-secondary)",
          maxWidth: "56ch",
        }}
      >
        Write it once, preview it in your own inbox, then send. Students are
        emailed privately — nobody sees anyone else&apos;s address.
      </p>

      <div style={{ ...card, padding: "22px 24px" }}>
        {/* Quick-fill templates / mode row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
            Quick fill:
          </span>
          <button
            type="button"
            onClick={applyTemplate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--c-brand-gold)",
              background: "var(--c-brand-gold-tint)",
              border: "1px solid var(--c-brand-gold)",
              borderRadius: 999,
              padding: "6px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Sparkles size={12} />
            New mock is live
          </button>
          {mode === "mock" && (
            <button
              type="button"
              onClick={backToPlain}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--c-text-secondary)",
                background: "transparent",
                border: "none",
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "6px 4px",
              }}
            >
              ← Plain announcement
            </button>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What lands in the inbox line"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Heading</label>
          <input
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="Big line inside the email (subject is used if empty)"
            style={inputStyle}
          />
          <div style={hintStyle}>
            {"{{name}}"} becomes the student&apos;s first name.
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Plain text — blank lines become paragraphs"
            rows={mode === "mock" ? 4 : 6}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {mode === "plain" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Button label (optional)</label>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Attempt now →"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Button link (optional)</label>
              <input
                type="text"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://study.ipmcareer.com"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {mode === "mock" && (
          <div
            style={{
              marginBottom: 16,
              padding: "16px 16px 4px",
              borderRadius: 12,
              border: "1px solid var(--c-border-faint)",
              background: "var(--c-brand-gold-tint)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--c-brand-gold)",
                marginBottom: 12,
              }}
            >
              Mock banner
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Mock name</label>
              <input
                type="text"
                value={mockName}
                onChange={(e) => setMockName(e.target.value)}
                placeholder="IIM Bangalore UG Mock 1"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Meta line</label>
              <input
                type="text"
                value={mockMeta}
                onChange={(e) => setMockMeta(e.target.value)}
                placeholder="Real exam pattern · 135 minutes · one sitting"
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Window line</label>
                <input
                  type="text"
                  value={mockWindow}
                  onChange={(e) => setMockWindow(e.target.value)}
                  placeholder="open now · free for every aspirant"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Attempt button link</label>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://study.ipmcareer.com"
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>
              Sections (label · questions · note)
            </label>
            {stats.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 64px 1.3fr",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => setStatField(i, "label", e.target.value)}
                  placeholder="Section"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={row.count}
                  onChange={(e) => setStatField(i, "count", e.target.value)}
                  placeholder="Qs"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={row.note}
                  onChange={(e) => setStatField(i, "note", e.target.value)}
                  placeholder="65 min · +3 / −1"
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ margin: "12px 0" }}>
              <label style={labelStyle}>Before you start (one tip per line, max 4)</label>
              <textarea
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                placeholder="One tip per line"
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={labelStyle}>After-submit title</label>
                <input
                  type="text"
                  value={afterTitle}
                  onChange={(e) => setAfterTitle(e.target.value)}
                  placeholder="After you submit"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>After-submit link label</label>
                <input
                  type="text"
                  value={afterLinkLabel}
                  onChange={(e) => setAfterLinkLabel(e.target.value)}
                  placeholder="Open the portal →"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>After-submit text</label>
              <textarea
                value={afterText}
                onChange={(e) => setAfterText(e.target.value)}
                placeholder="What unlocks the moment they submit"
                rows={2}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>After-submit link URL</label>
              <input
                type="text"
                value={afterLinkUrl}
                onChange={(e) => setAfterLinkUrl(e.target.value)}
                placeholder="https://study.ipmcareer.com"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingTop: 16,
            borderTop: "1px solid var(--c-border-faint)",
            flexWrap: "wrap",
          }}
        >
          <PillDropdown
            label="Audience"
            value={audience}
            options={[
              { value: "all", label: "All students" },
              { value: "batch", label: "Batch students" },
            ]}
            onChange={(v) => {
              setAudience(v);
              setConfirmTotal(null);
            }}
          />
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={sendTestToMe}
            disabled={!ready || sendingTest}
            style={ghostBtn(!ready || sendingTest)}
          >
            {sendingTest ? "Sending…" : "Send test to me"}
          </button>
          <button
            type="button"
            onClick={startConfirm}
            disabled={!ready || counting || sending}
            style={goldBtn(!ready || counting || sending)}
          >
            <Send size={14} />
            {counting ? "Counting…" : "Send to students"}
          </button>
        </div>

        {/* Confirm step */}
        {confirmTotal !== null && (
          <div
            style={{
              marginTop: 16,
              padding: "14px 16px",
              borderRadius: 12,
              background: "var(--c-brand-gold-tint)",
              border: "1px solid var(--c-brand-gold)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "var(--c-text-primary)",
                fontWeight: 500,
                flex: 1,
                minWidth: 200,
              }}
            >
              This emails <b>{confirmTotal}</b> {audienceLabel}. Send?
            </span>
            <button
              type="button"
              onClick={() => setConfirmTotal(null)}
              disabled={sending}
              style={ghostBtn(sending)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={sendForReal}
              disabled={sending || confirmTotal === 0}
              style={goldBtn(sending || confirmTotal === 0)}
            >
              {sending
                ? "Sending…"
                : `Yes, send to ${confirmTotal} ${audienceLabel}`}
            </button>
          </div>
        )}

        {/* Result state */}
        {result && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              background: result.failed
                ? "var(--c-danger-soft)"
                : "var(--c-success-soft)",
              color: result.failed ? "var(--c-danger)" : "var(--c-success)",
            }}
          >
            {result.failed
              ? `Sent ${result.sent} of ${result.total} — ${result.failed} failed. Try again for the rest in a few minutes.`
              : `Done — sent to ${result.sent} of ${result.total} ${audienceLabel}.`}
          </div>
        )}
      </div>
    </div>
  );
}
