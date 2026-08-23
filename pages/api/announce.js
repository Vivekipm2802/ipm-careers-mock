// ============================================================
// /api/announce — admin announcements email tool (2026-08).
//
// GET  ?audience=all|batch   → { total }  (recipient count, for
//                              the "Send to N students" confirm)
// POST { subject, heading, message, ctaLabel?, ctaUrl?,
//        audience: "all"|"batch", testEmail? }
//      → { sent, failed, total }
//
// · requireAdmin on both verbs — students can never reach this.
// · testEmail present → the mail goes ONLY to that address
//   (preview-to-self) and we return early.
// · audience "all"  → every auth user email
//   (supabase.auth.admin.listUsers, paginated — same pattern as
//   attachNames in /api/leaderboard).
// · audience "batch" → emails present in the enrollments table
//   (case-insensitive de-dupe).
// · Delivery: BCC batches of 40 per message, To = our own from
//   address, so students never see each other's emails and we
//   don't hammer SMTP with per-recipient sends.
// ============================================================

const { requireAdmin } = require("@/lib/apiAuth");
const { getTransporter, getFromAddress } = require("@/lib/emailTransporter");
const { createClient } = require("@supabase/supabase-js");

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ── Recipients ──────────────────────────────────────────────────

async function getAllUserEmails(supabase) {
  const emails = new Set();
  for (let page = 1; page <= 40; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 500,
    });
    const users = data && data.users;
    if (error || !users || users.length === 0) break;
    for (const u of users) {
      if (u.email) emails.add(String(u.email).trim().toLowerCase());
    }
    if (users.length < 500) break;
  }
  return [...emails];
}

async function getBatchEmails(supabase) {
  const emails = new Set();
  const PAGE = 1000;
  for (let from = 0; from < 40000; from += PAGE) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("email")
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data) {
      const em = row && row.email ? String(row.email).trim().toLowerCase() : "";
      if (em) emails.add(em);
    }
    if (data.length < PAGE) break;
  }
  return [...emails];
}

async function getRecipients(supabase, audience) {
  if (audience === "batch") return getBatchEmails(supabase);
  return getAllUserEmails(supabase);
}

// ── Branded HTML ────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const GOLD = "#B8730A"; // portal --c-brand-gold (light theme)
const INK = "#1F1810";

function announceTemplate({ heading, message, ctaLabel, ctaUrl }) {
  const paragraphs = String(message || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3D342A;">${escapeHtml(p)}</p>`
    )
    .join("");

  const cta =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 6px;">
          <tr>
            <td align="center" style="border-radius:999px;background:${GOLD};">
              <a href="${escapeHtml(ctaUrl)}" target="_blank"
                 style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F1E8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F6F1E8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 18px;">
              <img src="https://www.ipmcareer.com/wp-content/uploads/2022/02/logo-final-1-2048x488.png" alt="IPM Careers" width="128" style="display:block;border:0;width:128px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="background:#FFFFFF;border:1px solid #EAE1D2;border-radius:16px;padding:30px 32px;font-family:Arial,Helvetica,sans-serif;">
              <div style="height:3px;width:44px;background:${GOLD};border-radius:999px;margin:0 0 20px;"></div>
              <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;font-weight:bold;color:${INK};font-family:Georgia,'Times New Roman',serif;">
                ${escapeHtml(heading)}
              </h1>
              ${paragraphs}
              ${cta}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A8C77;">
              IPM Careers &middot; <a href="https://study.ipmcareer.com" target="_blank" style="color:#9A8C77;text-decoration:underline;">study.ipmcareer.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Handler ─────────────────────────────────────────────────────

const BCC_BATCH = 40;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  const supabase = getServiceClient();
  if (!supabase) return res.status(500).json({ error: "Server not configured" });

  // ── Count mode ────────────────────────────────────────────────
  if (req.method === "GET") {
    const audience = req.query.audience === "batch" ? "batch" : "all";
    try {
      const recipients = await getRecipients(supabase, audience);
      return res.status(200).json({ audience, total: recipients.length });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Count failed" });
    }
  }

  // ── Send mode ─────────────────────────────────────────────────
  const {
    subject,
    heading,
    message,
    ctaLabel,
    ctaUrl,
    audience: rawAudience,
    testEmail,
  } = req.body || {};

  if (!subject || !String(subject).trim() || !message || !String(message).trim()) {
    return res.status(400).json({ error: "Subject and message are required" });
  }
  const audience = rawAudience === "batch" ? "batch" : "all";
  const safeHeading =
    heading && String(heading).trim() ? String(heading).trim() : String(subject).trim();
  const safeCtaUrl =
    ctaUrl && /^https?:\/\//i.test(String(ctaUrl).trim()) ? String(ctaUrl).trim() : null;
  const safeCtaLabel =
    safeCtaUrl && ctaLabel && String(ctaLabel).trim() ? String(ctaLabel).trim() : null;

  const html = announceTemplate({
    heading: safeHeading,
    message: String(message),
    ctaLabel: safeCtaLabel,
    ctaUrl: safeCtaUrl,
  });

  let transporter;
  try {
    transporter = getTransporter();
  } catch (err) {
    return res.status(500).json({ error: "Email is not configured on the server" });
  }
  const from = getFromAddress();

  // Preview-to-self: send only to the given address and stop.
  if (testEmail && String(testEmail).trim()) {
    try {
      await transporter.sendMail({
        from,
        to: String(testEmail).trim(),
        subject: String(subject).trim(),
        html,
      });
      return res.status(200).json({ sent: 1, failed: 0, total: 1, test: true });
    } catch (err) {
      // Surface the real SMTP error — "failed" alone is undebuggable.
      console.error("[announce] test send failed:", err);
      return res.status(500).json({
        sent: 0, failed: 1, total: 1, test: true,
        error: "Test send failed: " + (err && err.message ? err.message : "unknown error"),
      });
    }
  }

  let recipients;
  try {
    recipients = await getRecipients(supabase, audience);
  } catch (err) {
    return res.status(500).json({ error: "Could not build the recipient list" });
  }
  if (!recipients.length) {
    return res.status(200).json({ sent: 0, failed: 0, total: 0 });
  }

  // To = our own from address; students ride in BCC so nobody sees
  // anyone else's email. Partial failures are counted, not fatal.
  const bareFrom = (process.env.EMAIL_FROM_ADDR || "info@ipmcareer.in").trim();
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BCC_BATCH) {
    const bcc = recipients.slice(i, i + BCC_BATCH);
    try {
      await transporter.sendMail({
        from,
        to: bareFrom,
        bcc,
        subject: String(subject).trim(),
        html,
      });
      sent += bcc.length;
    } catch (err) {
      failed += bcc.length;
    }
  }

  return res.status(200).json({ sent, failed, total: recipients.length });
}
