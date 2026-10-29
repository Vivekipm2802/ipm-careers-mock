// ============================================================
// POST /api/clientEvent — real-device problem reports (2026-10-29).
//
// Why: problems like the 6h "Saving your result…" hang only happen on
// real student devices (laptop sleep, weak Wi-Fi) — no server log sees
// them, so we only heard about them from complaints. The player pages
// now report slow/failed submits and failed loads here; the daily
// health check (scripts/health-check.mjs) reads them.
//
// Body: { kind, page?, test_id?, detail? }   kind ∈ KINDS
// Always answers 204 quickly — reporting must never affect the student.
// Rows land in public.client_events (service-role only; RLS on, no
// policies). If the table doesn't exist yet the insert just fails
// silently.
// ============================================================

import { getAuthUser } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const KINDS = new Set([
  "mock_submit_slow",
  "mock_submit_failed",
  "mock_submit_recovered",
  "mock_draft_submitted",
  "mock_load_fallback",
  "mock_load_slow",
  "concept_load_failed",
  "concept_submit_failed",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const kind = String(body?.kind || "");
    if (!KINDS.has(kind)) return res.status(204).end();
    let email = null;
    try {
      const user = await getAuthUser(req);
      email = user?.email || null;
    } catch {}
    const detail = body?.detail && typeof body.detail === "object" ? body.detail : {};
    const detailStr = JSON.stringify(detail).slice(0, 2000);
    await serversupabase.from("client_events").insert({
      kind,
      page: String(body?.page || "").slice(0, 200) || null,
      test_id: Number.isFinite(Number(body?.test_id)) ? Number(body.test_id) : null,
      email: email || (typeof detail.email === "string" ? detail.email.slice(0, 200) : null),
      detail: JSON.parse(detailStr),
      ua: String(req.headers["user-agent"] || "").slice(0, 300),
    });
  } catch (e) {
    /* never surface reporting errors */
  }
  return res.status(204).end();
}
