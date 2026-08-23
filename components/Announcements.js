// ============================================================
// Announcements — admin email tool (2026-08).
//
// Compose a branded announcement (subject / heading / message /
// optional CTA), pick the audience (all students vs batch
// students), preview it to your own inbox, then send for real —
// with an explicit "This emails N students" confirm step fed by
// GET /api/announce count mode. Sending happens server-side in
// /api/announce (admin-guarded, BCC batches — students never see
// each other's addresses).
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

// Quick-fill: "New mock is live" template. Generic enough to edit
// after filling — nothing here is locked.
const MOCK_LIVE_TEMPLATE = {
  subject: "New mock live: IIM Bangalore UG Mock 1",
  heading: "A fresh full mock is waiting",
  message:
    "IIM Bangalore UG Mock 1 is now live on your portal — 60 questions, 135 minutes, +3/−1 marking. Attempt it while the topic coverage is fresh.",
  ctaLabel: "Attempt now →",
  ctaUrl: "https://study.ipmcareer.com",
};

export default function Announcements() {
  const { userDetails } = useNMNContext() || {};

  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
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
    setSubject(MOCK_LIVE_TEMPLATE.subject);
    setHeading(MOCK_LIVE_TEMPLATE.heading);
    setMessage(MOCK_LIVE_TEMPLATE.message);
    setCtaLabel(MOCK_LIVE_TEMPLATE.ctaLabel);
    setCtaUrl(MOCK_LIVE_TEMPLATE.ctaUrl);
    setResult(null);
    setConfirmTotal(null);
  }

  function payload(extra) {
    return {
      subject: subject.trim(),
      heading: heading.trim(),
      message,
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
      audience,
      ...extra,
    };
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
        {/* Quick-fill templates */}
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
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Plain text — blank lines become paragraphs"
            rows={6}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

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
