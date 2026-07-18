// ============================================================
// POST /api/recordings/play — resolve how the caller may watch a
// class capsule. ANY logged-in user (not admin-only): the bearer
// token identifies the student, then we verify membership +
// start-date server-side, so the private bucket / passcode never
// leak to students outside the batch or before their join date.
//
// Body: { classId } — a classes_history row id.
// 200 { type:'signed', url }             — 3-hour signed storage URL
// 200 { type:'link', url, passcode }     — external link (Zoom/Drive/YT)
// 403                                    — not enrolled / before start date
// 404                                    — no recording on this capsule
// ============================================================

import { getAuthUser, isAdminEmail } from "@/lib/apiAuth";
import { serversupabase } from "@/utils/supabaseClient";

const { startDateGate } = require("@/lib/recordings");

const SIGNED_URL_TTL_SECONDS = 3 * 60 * 60; // 3 hours

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await getAuthUser(req);
  if (!user || !user.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const classId = body.classId;
  if (classId == null || classId === "") {
    return res.status(400).json({ error: "classId is required" });
  }

  try {
    const { data: capsule, error: capErr } = await serversupabase
      .from("classes_history")
      .select("id,batch_id,recording,recording_path,recording_passcode,created_at")
      .eq("id", classId)
      .limit(1)
      .maybeSingle();
    if (capErr) throw new Error(capErr.message);
    if (!capsule) {
      return res.status(404).json({ error: "Class capsule not found" });
    }

    const admin = await isAdminEmail(user.email);
    if (!admin) {
      // membership — student_id in batch_admits is the student's email
      const { data: admits, error: admitErr } = await serversupabase
        .from("batch_admits")
        .select("effective_start_date")
        .eq("batch_id", capsule.batch_id)
        .ilike("student_id", user.email)
        .limit(1);
      if (admitErr) throw new Error(admitErr.message);
      const admit = admits && admits[0];
      if (!admit) {
        return res.status(403).json({ error: "You are not enrolled in this batch" });
      }
      // start-date gate (null = no gating) — server-side twin of the UI filter
      if (!startDateGate(admit.effective_start_date, capsule.created_at)) {
        return res.status(403).json({
          error: "This class is from before your plan's start date",
        });
      }
    }

    if (String(capsule.recording_path || "").trim()) {
      const { data: signed, error: signErr } = await serversupabase.storage
        .from("recordings")
        .createSignedUrl(capsule.recording_path, SIGNED_URL_TTL_SECONDS);
      if (signErr || !signed || !signed.signedUrl) {
        throw new Error((signErr && signErr.message) || "Could not sign recording URL");
      }
      return res.status(200).json({ type: "signed", url: signed.signedUrl });
    }

    if (String(capsule.recording || "").trim()) {
      return res.status(200).json({
        type: "link",
        url: capsule.recording,
        passcode: capsule.recording_passcode || null,
      });
    }

    return res.status(404).json({ error: "No recording on this class yet" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Playback resolution failed" });
  }
}
