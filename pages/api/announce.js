// ============================================================
// /api/announce — admin announcements email tool (2026-08).
//
// GET  ?audience=all|batch   → { total }  (recipient count, for
//                              the "Send to N students" confirm)
// POST { subject, heading, message, ctaLabel?, ctaUrl?,
//        audience: "all"|"batch", testEmail?,
//        template?: "plain"|"mock",
//        mock?: { name, metaLine, windowLine,
//                 stats: [{label,count,note}] (≤3),
//                 tips: [string] (≤4),
//                 afterTitle, afterText,
//                 afterLinkLabel, afterLinkUrl } }
//      → { sent, failed, total, failures: [first 5 emails] }
//
// · requireAdmin on both verbs — students can never reach this.
// · Template follows the OWNER-APPROVED design (preview-
//   announcement-email.html): cream page, purple/grey header row,
//   #FFFDF8 card, Georgia serif headline with gold italic name,
//   gold mock banner + stat strip + before-you-start + after-
//   submit box (mock mode only), branded footer.
// · PERSONALIZATION: heading/message may carry the literal token
//   {{name}} → the recipient's first name. No name on file → the
//   token (plus its leading comma/space) is removed cleanly.
// · Delivery is PER-RECIPIENT (personalization needs it): chunks
//   of 8 in parallel, small pause between chunks. Failures are
//   counted and the first 5 addresses returned for debugging.
// · testEmail present → one mail to that address only, rendered
//   with the ADMIN's own name so the preview looks real.
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
// Both audiences resolve to [{ email, name }] — name is the auth
// user's user_metadata.full_name (or null), needed for {{name}}.

async function getAuthUserMap(supabase) {
  // lowercased email → { email, name } (case-insensitive de-dupe)
  const map = new Map();
  for (let page = 1; page <= 40; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 500,
    });
    const users = data && data.users;
    if (error || !users || users.length === 0) break;
    for (const u of users) {
      if (!u.email) continue;
      const em = String(u.email).trim().toLowerCase();
      if (!em) continue;
      const name =
        (u.user_metadata && u.user_metadata.full_name
          ? String(u.user_metadata.full_name).trim()
          : "") || null;
      if (!map.has(em) || (name && !map.get(em).name)) {
        map.set(em, { email: em, name });
      }
    }
    if (users.length < 500) break;
  }
  return map;
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
  const userMap = await getAuthUserMap(supabase);
  if (audience === "batch") {
    const emails = await getBatchEmails(supabase);
    return emails.map((em) => ({
      email: em,
      name: (userMap.get(em) && userMap.get(em).name) || null,
    }));
  }
  return [...userMap.values()];
}

// ── Personalization ─────────────────────────────────────────────

export function firstNameOf(fullName) {
  const first = String(fullName || "").trim().split(/\s+/)[0] || "";
  return first || null;
}

// {{name}} → first name. No name → the token AND its preceding
// comma/space go away, so "A new mock is live, {{name}}." becomes
// "A new mock is live." (comma and no-comma cases both handled;
// the following period stays).
export function personalize(text, fullName) {
  const s = String(text || "");
  const first = firstNameOf(fullName);
  if (first) return s.replace(/\{\{name\}\}/g, first);
  return s.replace(/(?:,[ \t]*|[ \t]+)\{\{name\}\}/g, "").replace(/\{\{name\}\}/g, "");
}

// ── Branded HTML (owner-approved design) ────────────────────────

export function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CREAM = "#EFE8DA"; // page background
const CARD = "#FFFDF8"; // main card
const PURPLE = "#6B2D82"; // brand purple (header + footer)
const GOLD = "#B8730A"; // gold accent (italic name, numerals)
const GOLD_DEEP = "#8A5A0C"; // deep gold (caps labels, links)
const INK = "#1E1A13";
const BODY = "#57524A";
const MUTED = "#8B857B";
const SERIF = "Georgia,'Times New Roman',serif";

// Heading: escape, then swap {{name}} (plus trailing punctuation)
// for the gold-italic span the approved design uses. No name → the
// token is removed cleanly, comma/space included.
function headingHtml(heading, fullName) {
  const esc = escapeHtml(heading);
  const first = firstNameOf(fullName);
  if (!first) {
    return esc.replace(/(?:,[ \t]*|[ \t]+)\{\{name\}\}/g, "").replace(/\{\{name\}\}/g, "");
  }
  return esc.replace(
    /\{\{name\}\}([.!?,;]*)/g,
    (_m, punct) =>
      `<span style="font-style:italic;color:${GOLD};">${escapeHtml(first)}${punct}</span>`
  );
}

// Gold mock-window banner (mock mode). Attempt pill → attemptUrl.
function mockBannerHtml(mk, attemptUrl) {
  if (!mk || !mk.name) return "";
  const meta = mk.metaLine
    ? `<p style="margin:10px 0 18px;font-size:13.5px;line-height:1.65;color:${BODY};">${escapeHtml(mk.metaLine)}</p>`
    : `<div style="height:14px;font-size:0;line-height:0;">&nbsp;</div>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBEFD3;border:1px solid #EAD9AE;border-radius:14px;">
    <tr>
      <td style="padding:22px 24px 20px;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD_DEEP};font-weight:bold;margin-bottom:8px;">Mock window is open</div>
        <div style="font-family:${SERIF};font-size:22px;color:${INK};">
          ${escapeHtml(mk.name)}
          <span style="display:inline-block;vertical-align:3px;margin-left:6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:1.5px;font-weight:bold;color:${GOLD_DEEP};border:1px solid #C9A96A;border-radius:6px;padding:2px 7px;">NEW</span>
        </div>
        ${meta}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:13px;color:${BODY};">${escapeHtml(mk.windowLine || "")}</td>
            <td align="right">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:999px;background:#A96A0B;background-image:linear-gradient(110deg,#C98A1B,#A96A0B);">
                    <a href="${escapeHtml(attemptUrl)}" target="_blank" style="display:inline-block;padding:11px 26px;font-size:13.5px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:Arial,Helvetica,sans-serif;">Attempt &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// 1–3-cell stat strip (mock mode).
function statStripHtml(stats) {
  if (!stats || !stats.length) return "";
  const w = Math.floor(100 / stats.length);
  const cells = stats
    .map((s, i) => {
      const border = i < stats.length - 1 ? "border-right:1px solid #EDE4D2;" : "";
      return `<td width="${w}%" style="padding:16px 18px 14px;${border}">
        <div style="font-size:9.5px;letter-spacing:1.8px;text-transform:uppercase;color:${MUTED};font-weight:bold;">${escapeHtml(s.label)}</div>
        <div style="font-family:${SERIF};font-size:26px;color:${INK};margin-top:6px;">${escapeHtml(s.count)}</div>
        <div style="font-size:11.5px;color:${MUTED};margin-top:2px;">${escapeHtml(s.note)}</div>
      </td>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 26px;border:1px solid #EDE4D2;border-radius:14px;">
    <tr>${cells}</tr>
  </table>`;
}

// "Before you start" numbered list — serif gold numerals (≤4 tips).
function tipsHtml(tips) {
  if (!tips || !tips.length) return "";
  const rows = tips
    .map((t, i) => {
      const pad = i < tips.length - 1 ? "padding:0 0 10px;" : "";
      return `<tr>
        <td width="26" valign="top" style="font-family:${SERIF};font-size:14px;color:${GOLD};${pad}">${i + 1}</td>
        <td style="font-size:13.5px;line-height:1.65;color:#3D342A;${pad}">${escapeHtml(t)}</td>
      </tr>`;
    })
    .join("");
  return `<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD_DEEP};font-weight:bold;margin:0 0 12px;">Before you start</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">${rows}</table>`;
}

// Muted "after you submit" box (mock mode).
function afterBoxHtml(mk) {
  if (!mk || (!mk.afterTitle && !mk.afterText)) return "";
  const link =
    mk.afterLinkUrl && mk.afterLinkLabel
      ? `<a href="${escapeHtml(mk.afterLinkUrl)}" target="_blank" style="font-size:13px;font-weight:bold;color:${GOLD_DEEP};text-decoration:underline;">${escapeHtml(mk.afterLinkLabel)}</a>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F3EA;border-radius:14px;">
    <tr>
      <td style="padding:20px 24px;">
        ${mk.afterTitle ? `<div style="font-family:${SERIF};font-size:16.5px;color:${INK};margin-bottom:6px;">${escapeHtml(mk.afterTitle)}</div>` : ""}
        ${mk.afterText ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:${BODY};">${escapeHtml(mk.afterText)}</p>` : ""}
        ${link}
      </td>
    </tr>
  </table>`;
}

// The one template shell for ALL announcement emails. Mock-specific
// blocks render only when their data is provided; in mock mode the
// banner carries the Attempt pill so the main CTA is omitted.
export function announceTemplate({
  heading,
  message,
  ctaLabel,
  ctaUrl,
  template,
  mock,
  recipientName,
}) {
  const isMock = template === "mock" && mock && mock.name;
  const resolvedMessage = personalize(String(message || ""), recipientName);

  const paragraphs = resolvedMessage
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 24px;font-size:14.5px;line-height:1.7;color:${BODY};">${escapeHtml(p)}</p>`
    )
    .join("");

  const attemptUrl = ctaUrl || "https://study.ipmcareer.com";

  // Main CTA pill (dark gold, like the banner's Attempt) — only in
  // plain mode; the mock banner already carries its own button.
  const cta =
    !isMock && ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto 8px;">
          <tr>
            <td align="center" style="border-radius:999px;background:#A96A0B;background-image:linear-gradient(110deg,#C98A1B,#A96A0B);">
              <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display:inline-block;padding:12px 30px;font-size:13.5px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(ctaLabel)}</a>
            </td>
          </tr>
        </table>`
      : "";

  const mockBlocks = isMock
    ? `${mockBannerHtml(mock, attemptUrl)}
       ${statStripHtml(mock.stats)}
       ${tipsHtml(mock.tips)}
       ${afterBoxHtml(mock)}`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(personalize(String(heading || ""), recipientName))}</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};">
  <!-- preheader: shows next to the subject in the inbox list -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(resolvedMessage.slice(0, 110))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};padding:34px 12px 44px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- header row -->
          <tr>
            <td style="padding:6px 6px 18px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:14px;letter-spacing:1.5px;font-weight:bold;color:${PURPLE};">IPM CAREERS</td>
                  <td align="right" style="font-size:10.5px;letter-spacing:2px;color:#9A8C77;font-weight:bold;">STUDY PORTAL</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- main card -->
          <tr>
            <td style="background:${CARD};border-radius:18px;padding:34px 34px 30px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 2px 8px rgba(30,26,19,0.06);">
              <h1 style="margin:0 0 12px;font-size:27px;line-height:1.3;font-weight:normal;color:${INK};font-family:${SERIF};">
                ${headingHtml(String(heading || ""), recipientName)}
              </h1>
              ${paragraphs}
              ${cta}
              ${mockBlocks}
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:26px 10px 0;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12.5px;letter-spacing:1.2px;font-weight:bold;color:${PURPLE};margin-bottom:8px;">IPM CAREERS</div>
              <div style="font-size:11.5px;line-height:1.7;color:${MUTED};">
                Run by IIM alumni &middot; <a href="https://study.ipmcareer.com" style="color:${GOLD_DEEP};text-decoration:none;font-weight:bold;">study.ipmcareer.com</a> &middot; Student helpline +91 96163 83524<br/>
                Vijay Nagar, Indore, Madhya Pradesh 452010, India
              </div>
              <div style="font-size:11px;line-height:1.7;color:#A79A86;margin-top:10px;">
                You received this email because you have an IPM Careers study account.<br/>
                &copy; 2026 IPM Careers. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Payload sanitizing ──────────────────────────────────────────

function cleanStr(v) {
  return v == null ? "" : String(v).trim();
}

function sanitizeMock(raw) {
  if (!raw || typeof raw !== "object") return null;
  const stats = Array.isArray(raw.stats)
    ? raw.stats
        .slice(0, 3)
        .map((s) => ({
          label: cleanStr(s && s.label),
          count: cleanStr(s && s.count),
          note: cleanStr(s && s.note),
        }))
        .filter((s) => s.label || s.count)
    : [];
  const tips = Array.isArray(raw.tips)
    ? raw.tips.map((t) => cleanStr(t)).filter(Boolean).slice(0, 4)
    : [];
  const afterLinkUrl = /^https?:\/\//i.test(cleanStr(raw.afterLinkUrl))
    ? cleanStr(raw.afterLinkUrl)
    : "";
  return {
    name: cleanStr(raw.name),
    metaLine: cleanStr(raw.metaLine),
    windowLine: cleanStr(raw.windowLine),
    stats,
    tips,
    afterTitle: cleanStr(raw.afterTitle),
    afterText: cleanStr(raw.afterText),
    afterLinkLabel: cleanStr(raw.afterLinkLabel),
    afterLinkUrl,
  };
}

// ── Handler ─────────────────────────────────────────────────────

const CHUNK = 8; // per-recipient sends, 8 in parallel
const CHUNK_PAUSE_MS = 150;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    template: rawTemplate,
    mock: rawMock,
  } = req.body || {};

  if (!subject || !String(subject).trim() || !message || !String(message).trim()) {
    return res.status(400).json({ error: "Subject and message are required" });
  }
  const audience = rawAudience === "batch" ? "batch" : "all";
  const template = rawTemplate === "mock" ? "mock" : "plain";
  const mock = template === "mock" ? sanitizeMock(rawMock) : null;
  const safeSubject = String(subject).trim();
  const safeHeading =
    heading && String(heading).trim() ? String(heading).trim() : safeSubject;
  const safeCtaUrl =
    ctaUrl && /^https?:\/\//i.test(String(ctaUrl).trim()) ? String(ctaUrl).trim() : null;
  const safeCtaLabel =
    safeCtaUrl && ctaLabel && String(ctaLabel).trim() ? String(ctaLabel).trim() : null;

  const buildHtml = (recipientName) =>
    announceTemplate({
      heading: safeHeading,
      message: String(message),
      ctaLabel: safeCtaLabel,
      ctaUrl: safeCtaUrl,
      template,
      mock,
      recipientName,
    });

  let transporter;
  try {
    transporter = getTransporter();
  } catch (err) {
    return res.status(500).json({ error: "Email is not configured on the server" });
  }
  const from = getFromAddress();

  // Preview-to-self: rendered with the ADMIN's own name so the
  // personalization looks exactly like a student's copy.
  if (testEmail && String(testEmail).trim()) {
    const adminName =
      (admin.user_metadata && admin.user_metadata.full_name) || null;
    try {
      await transporter.sendMail({
        from,
        to: String(testEmail).trim(),
        subject: safeSubject,
        html: buildHtml(adminName),
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
    return res.status(200).json({ sent: 0, failed: 0, total: 0, failures: [] });
  }

  // Per-recipient sends (personalized), modest parallelism so SMTP
  // isn't hammered. Partial failures are counted, not fatal.
  let sent = 0;
  let failed = 0;
  const failures = [];
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (r) => {
        try {
          await transporter.sendMail({
            from,
            to: r.email,
            subject: safeSubject,
            html: buildHtml(r.name),
          });
          sent += 1;
        } catch (err) {
          failed += 1;
          failures.push(r.email);
          console.error(
            "[announce] send failed:",
            r.email,
            err && err.message ? err.message : err
          );
        }
      })
    );
    if (i + CHUNK < recipients.length) await sleep(CHUNK_PAUSE_MS);
  }

  return res.status(200).json({
    sent,
    failed,
    total: recipients.length,
    failures: failures.slice(0, 5),
  });
}
