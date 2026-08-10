import React, { useState, useEffect, useRef } from "react";
import Flasher from "@/components/Flasher";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  Spacer,
} from "@nextui-org/react";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import HeaderMock from "./components/HeaderMock";
import { useTimer } from "react-timer-hook";
import { useNMNContext } from "@/components/NMNContext";
import { useMediaQuery } from "react-responsive";
import QuestionBrowser, { getStatusIcon } from "./components/QuestionBrowser";
import QuestionCard from "./components/QuestionCard";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Grip,
  Home,
  X,
  XCircle,
} from "lucide-react";
import Leaderboard from "./components/Leaderboard2";
import DraggableModal from "../mock/components/Modal";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "react-hot-toast";

// ────────────────────────────────────────────────────────────
// Helpers for the P0 fixes (Ship 1 — 2026-07)
// sameId:      Supabase can return question ids as number OR string
//              depending on column type / route. `===` misses matches
//              across types → duplicate report entries per question →
//              downstream reads pick the WRONG duplicate. Normalise.
// normalizeAns: SA (short-answer) equality was strict `===` with no
//              trim / lowercase / numeric collapse. Students typing
//              " 5 " or "5.0" or "PARIS" against a stored "5" / "Paris"
//              were being marked wrong for correct answers.
// ────────────────────────────────────────────────────────────
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
// 2026-08 correctness audit: normalizeAns now lives in lib/scoring (single
// source of truth, adds thousands-comma stripping) and the SUBMITTED score
// is recomputed there under the canonical rule — +4/−1 defaults, SA/input
// wrongs NEVER negative.
import { normalizeAns, scoreConceptPlay } from "@/lib/scoring";

const Game = () => {
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const [sideBarActive, setSidebarActive] = useState(!isMobile);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isHintAvailable, setIsHintAvailable] = useState(true);
  const [isHintVisible, setisHintVisible] = useState(false);
  const [config, setConfig] = useState({
    increment: 4,
    decrement: 1,
  });
  const [gamestate, setGameState] = useState(0);
  const [questions, setQuestions] = useState();
  const [parentData, setParentData] = useState();
  const [leaderboard, setLeaderBoard] = useState();
  const [report, setReport] = useState([]);
  const [tempAnswers, setTempAnswers] = useState({}); // For immediate icon feedback
  const [activeExplanation, setActiveExplanation] = useState();
  const [drawerActive, setDrawerActive] = useState(false);
  const [calculatorActive, setCalculatorActive] = useState(false);
  const [submitted, setSubmitted] = useState();
  const [existingPlay, setExistingPlay] = useState(null); // Phase 12 Ship E
  const [submitting, setSubmitting] = useState(false);    // Phase 12 Ship E.4: overlay during submit
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const { userDetails } = useNMNContext();
  const [confirmModal, setConfirmModal] = useState(false);
  // Ship 7 (P0): submit failure surface — previously a failed submit silently
  // cleared the overlay and dumped the student back with no message.
  const [submitError, setSubmitError] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const router = useRouter();

  // Ship 7 (P0): the submit insert had NO timeout. On a flaky mobile connection
  // the fetch can hang indefinitely; because the "Submitting" overlay is gated
  // on that await, the student sits on a spinner forever with no error and no
  // way out. Desktop on stable wifi always completed in <1s, so it never showed.
  const SUBMIT_TIMEOUT_MS = 15000;
  const LOOKUP_TIMEOUT_MS = 8000;
  const withTimeout = (thenable, ms, label) =>
    Promise.race([
      Promise.resolve(thenable),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out`)), ms),
      ),
    ]);

  async function submitScore(a) {
    // Phase 12 Ship E: skip the save in preview mode (admin reviewing the test)
    if (router.query.preview === "true") {
      setSubmitting(false);
      router.push("/");
      return;
    }

    setSubmitError(null);
    setLastReport(a);

    // 2026-08 correctness audit: never trust the incrementally-tracked
    // score state — recompute the stored score from the report under the
    // canonical rule (lib/scoring). SA wrongs cost 0; verdicts re-derived
    // from the raw stored answers.
    let canonicalScore = score;
    try {
      const scored = scoreConceptPlay(questions || [], a || [], config);
      if (scored && Number.isFinite(scored.score)) canonicalScore = scored.score;
    } catch (e) { /* keep incremental fallback */ }

    // Ship 4: record true wall-clock duration (seconds)
    const row = {
      test_uuid: parentData?.uuid,
      report: a,
      score: canonicalScore,
      duration: startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : null,
    };

    // Ship 7: keep a local copy BEFORE touching the network. If the connection
    // dies mid-submit, the answers survive a reload instead of evaporating.
    const draftKey = `ipm_concept_draft_${parentData?.uuid || router.query.slug}`;
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ row, at: Date.now() }),
      );
    } catch {}

    // Ship 7: a timed-out insert may still have LANDED server-side. Never blind
    // -retry an insert or we double-submit a single-attempt test — look first.
    const findExistingPlay = async () => {
      try {
        const { data: found } = await withTimeout(
          serversupabase
            .from("plays")
            .select("uid")
            .eq("test_uuid", parentData?.uuid || router.query.slug)
            .eq("user", userDetails?.email)
            .order("created_at", { ascending: false })
            .limit(1),
          LOOKUP_TIMEOUT_MS,
          "Lookup",
        );
        return found && found.length > 0 ? found[0] : null;
      } catch {
        return null;
      }
    };

    const finish = (uid, playRow) => {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {}
      if (uid) {
        router.push(`/test/result/${uid}`);
        return;
      }
      // Fallback: uid missing for some reason — show the inline result view
      setSubmitted(playRow);
      getLeaderboard(parentData?.uuid);
      setSubmitting(false);
    };

    let data = null;
    let error = null;
    try {
      ({ data, error } = await withTimeout(
        supabase.from("plays").insert(row).select(),
        SUBMIT_TIMEOUT_MS,
        "Submit",
      ));
      if (error) {
        // If the duration column doesn't exist yet, never block a student's
        // submission — retry without it.
        const { duration, ...withoutDuration } = row;
        ({ data, error } = await withTimeout(
          supabase.from("plays").insert(withoutDuration).select(),
          SUBMIT_TIMEOUT_MS,
          "Submit",
        ));
      }
    } catch (e) {
      // Timed out / network dropped. The insert may still have landed — check
      // before showing an error, so we don't tell a student their saved test
      // failed (and don't let them submit it twice).
      console.error("[concept submit]", e?.message || e);
      const existing = await findExistingPlay();
      if (existing?.uid) {
        finish(existing.uid, existing);
        return;
      }
      setSubmitError(
        "We couldn't reach the server. Your answers are saved on this device — check your connection and tap Retry.",
      );
      setSubmitting(false);
      return;
    }

    if (data && data.length != 0) {
      // Phase 12 Ship E.4: redirect IMMEDIATELY to the unified result page
      finish(data[0]?.uid, data[0]);
      return;
    }

    // Insert returned no row: either RLS filtered the SELECT (the row may still
    // exist) or it genuinely failed. Check before telling the student anything.
    const existing = await findExistingPlay();
    if (existing?.uid) {
      finish(existing.uid, existing);
      return;
    }
    console.error("[concept submit] insert failed:", error?.message || error);
    setSubmitError(
      error?.message ||
        "Your test could not be saved. Your answers are safe on this device — tap Retry.",
    );
    setSubmitting(false);
  }

  const retrySubmit = () => {
    setSubmitError(null);
    setSubmitting(true);
    submitScore(lastReport ?? report);
  };

  async function checkMultiple(uid) {
    // Phase 12 Ship E: admin override — preview=true bypasses the single-shot check
    if (router.query.preview === "true") {
      setAllowed(true);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Phase 12 Ship E: also fetch the existing play uid so we can offer "View result"
    const { data, error } = await serversupabase
      .from("plays")
      .select("uid,created_at,isPassed")
      .eq("test_uuid", router.query.slug)
      .eq("user", uid)
      .order("created_at", { ascending: false })
      .limit(1);

    setLoading(false);
    if (data && data?.length > 0) {
      setExistingPlay(data[0]);
      setAllowed(false);
      return;
    } else {
      setAllowed(true);
    }
  }
  const timeDuration = parentData?.time * 60;

  const { seconds, minutes, hours, totalSeconds, restart, isRunning } =
    useTimer({
      expiryTimestamp: new Date(),
      onExpire: () => handleComplete(),
      autoStart: false,
    });

  // Ship 4: wall-clock test start, so total time = submit − start instead of
  // max(timestamp) (which missed all time spent on the final question).
  const startedAtRef = useRef(null);

  useEffect(() => {
    if (gamestate === 1) {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      const time = new Date();
      time.setSeconds(time.getSeconds() + timeDuration);
      restart(time);
    }
  }, [gamestate, restart, timeDuration]);

  const handleComplete = () => {
    // Phase 12 Ship E.4: show clean overlay instead of flashing the old inline view
    setSubmitting(true);
    submitScore(report);
  };

  async function getQuestions() {
    const { data, error } = await supabase
      .from("levels")
      .select("*,questions!questions_parent_fkey(*)")
      .eq("uuid", router.query.slug)
      .order("seq", { foreignTable: "questions", ascending: true });
    if (data) {
      setQuestions(data[0]?.questions);

      const parent = { ...data[0] };
      delete parent["questions"];
      setParentData(parent);
      if (data.length == 0) {
        router.push("/404");
      }
    } else {
    }
  }
  async function getLeaderboard(a) {
    // 2026-08 correctness audit: raw plays.score is never shown (legacy
    // rows carry percentages) — /api/leaderboard re-scores canonically
    // and dedupes per student. Only used by the rare inline fallback view.
    try {
      const { getAuthHeaders } = await import("@/utils/authHeaders");
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/leaderboard?type=concept&testId=${encodeURIComponent(a)}`,
        { headers },
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.top) && data.top.length > 0) {
        setLeaderBoard(
          data.top.map((r) => ({ id: r.rank, name: r.name, score: r.scoreMarks })),
        );
      }
    } catch (e) { /* silent */ }
  }

  useEffect(() => {
    if (router.query.slug != undefined && userDetails != undefined) {
      getQuestions();
      checkMultiple(userDetails?.email);
    }
  }, [router, userDetails]);

  // Merges a partial update into an existing report entry (or appends a
  // new one). Used for STATUS-only updates like "mark for review" that
  // should preserve the existing answer / selectedOption / isCorrect.
  // Full-answer submissions do NOT go through this — they use setReport
  // directly so the entry is replaced atomically with the new state.
  const addToReport = (newObject) => {
    setReport((prevReport) => {
      const existingIndex = prevReport.findIndex((item) =>
        sameId(item.id, newObject.id)
      );

      if (existingIndex !== -1) {
        const updatedReport = [...prevReport];
        updatedReport[existingIndex] = {
          ...updatedReport[existingIndex],
          ...newObject,
        };
        return updatedReport;
      } else {
        return [...prevReport, newObject];
      }
    });
  };

  const handleTempAnswer = (answerData) => {
    // Update temporary answers for immediate icon feedback
    setTempAnswers((prev) => ({
      ...prev,
      [answerData.id]: answerData,
    }));
  };

  const handleClearResponse = (questionId) => {
    // Remove from report AND reverse the score contribution atomically.
    // Previously the entry was removed but the score kept the old
    // ±increment/decrement, so the total score diverged silently from
    // what the report actually contained.
    setReport((prevReport) => {
      const existing = prevReport.find((item) => sameId(item.id, questionId));
      if (existing && existing.isCorrect !== undefined && existing.isCorrect !== null) {
        // 2026-08: undo exactly what was applied — wrong SA/input entries
        // were never docked (canonical rule), so there's nothing to return.
        const qType =
          existing.type ??
          questions?.find((q) => sameId(q.id, questionId))?.type;
        setScore((s) =>
          existing.isCorrect
            ? s - config.increment // undo the +increment given for correct
            : qType === "input"
              ? s // wrong SA never cost anything — nothing to undo
              : s + config.decrement // undo the -decrement docked for wrong MCQ
        );
      }
      return prevReport.filter((item) => !sameId(item.id, questionId));
    });

    setTempAnswers((prev) => {
      const newTemp = { ...prev };
      delete newTemp[questionId];
      return newTemp;
    });
  };

  const saveTempAnswers = () => {
    if (!tempAnswers || Object.keys(tempAnswers).length === 0) return;

    const drafts = Object.values(tempAnswers);
    // Route every draft through handleSubmit so we get the same atomic
    // report + score semantics, bounds-checks, and SA normalisation.
    // Previously this loop ran its own copy of the storage logic, read
    // `report` from a stale closure across iterations, and got the
    // "status" flag wrong when multiple drafts landed together.
    drafts.forEach((answerData) => handleSubmit(answerData));
    setTempAnswers({});
  };

  const handleSubmit = (answerData) => {
    // Clear temp answer when actually submitting
    setTempAnswers((prev) => {
      const newTemp = { ...prev };
      delete newTemp[answerData.id];
      return newTemp;
    });
    const { selectedOption, options, id, type, value } = answerData;
    let isCorrect = false;
    let answer = "";

    if (type === "options") {
      // Bounds-check `selectedOption` so we never read past the end of the
      // options array. If the UI ever emits a stale/out-of-range index,
      // fall back to "wrong" rather than storing `undefined` (which is
      // what produced the "option E on a 4-option question" symptom).
      const idx = Number(selectedOption) - 1;
      const currentOption =
        Array.isArray(options) && idx >= 0 && idx < options.length
          ? options[idx]
          : null;
      isCorrect = !!currentOption?.isCorrect;
      answer = currentOption?.title ?? "";
    } else if (type === "input") {
      // SA: trim, lowercase, whitespace-strip, and collapse numerics
      // ("5" === "5.0" === " 5 "). Prior version used strict `===` on
      // raw strings — the top cause of "I picked the right answer but
      // was marked wrong" complaints.
      isCorrect = normalizeAns(value) === normalizeAns(options?.answer);
      answer = value ?? "";
    }

    // Atomic report + score update.
    // Reading `report` from the outer closure was unsafe when two option
    // clicks landed in quick succession — both handlers saw the same
    // stale `existingReport` and both applied their own undo/apply
    // deltas, double-counting the score. All prior state now flows
    // through `setReport`'s functional updater so score deltas are
    // computed against the freshest committed report.
    setReport((prev) => {
      const existingIndex = prev.findIndex((item) => sameId(item.id, id));
      const existing = existingIndex !== -1 ? prev[existingIndex] : null;

      // Compute score delta based on the CURRENT committed report state.
      // 2026-08 canonical rule: wrong SA/input answers are NEVER docked —
      // their delta is 0 (previously they cost −decrement like MCQs).
      const deltaFor = (entryType, corr) =>
        corr ? config.increment : entryType === "input" ? 0 : -config.decrement;
      setScore((s) => {
        let newScore = s;
        if (existing && existing.isCorrect !== undefined && existing.isCorrect !== null) {
          // Undo the delta previously applied for this question
          newScore -= deltaFor(existing.type ?? type, existing.isCorrect);
        }
        // Apply the new delta
        newScore += deltaFor(type, isCorrect);
        return newScore;
      });

      const status =
        existing &&
        (existing.status === "review" || existing.status === "markedForReview")
          ? "markedForReview"
          : "answered";

      // REPLACE the entire entry, don't spread-merge. Spread-merge was
      // leaking stale fields (an old selectedOption sitting under a new
      // answer, etc.) when a question was first marked-for-review and
      // then re-answered.
      // 2026-08: entry also records the question `type` so result pages,
      // the leaderboard endpoint and score undo logic can apply the
      // SA-no-negative rule without a question lookup.
      const newEntry = {
        id: id,
        type: type,
        status: status,
        selectedOption: selectedOption,
        timestamp: timeDuration - totalSeconds,
        isCorrect: isCorrect,
        answer: answer,
      };

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        return updated;
      }
      return [...prev, newEntry];
    });
  };

  const incrementLevel = () => {
    setLevel((res) => {
      // Only increment if not at last question
      if (res < questions.length - 1) {
        return res + 1;
      }

      return res;
    });
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (gamestate == 1) {
        event.preventDefault();
        event.returnValue =
          "Your Test is in Progress , Are you sure want to unload?"; // Display a custom message here if needed
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [gamestate]);

  /* Submit if Complete */

  useEffect(() => {
    if (level == questions?.length) {
      if (questions?.length > report?.length) {
        setConfirmModal(true);
        setLevel(questions?.length - 1);
      }
    }
  }, [level]);
  const calculateIntervalDelta = (report, questions, d, i) => {
    if (d === 0) {
      // For the first question, just return its timestamp
      return report?.find((item) => item.id === i.id)?.timestamp;
    } else if (d === 1) {
      // For the second question, return the interval (no delta yet)
      const currentTimestamp = report?.find(
        (item) => item.id === i.id
      )?.timestamp;
      const previousTimestamp = report?.find(
        (item) => item.id === questions[d - 1]?.id
      )?.timestamp;
      return currentTimestamp - previousTimestamp;
    } else {
      // For subsequent questions, calculate the delta between intervals
      const currentInterval =
        report?.find((item) => item.id === i.id)?.timestamp -
        report.find((item) => item.id === questions[d - 1]?.id)?.timestamp;
      const previousInterval =
        report?.find((item) => item.id === questions[d - 1]?.id)?.timestamp -
        report.find((item) => item.id === questions[d - 2]?.id)?.timestamp;
      return currentInterval - previousInterval;
    }
  };

  if (userDetails == undefined || questions == undefined || loading) {
    return (
      <div className="flex flex-col justify-center align-middle items-center text-center sf h-[100vh] w-full">
        Loading...
      </div>
    );
  }

  // Phase 12 Ship E.4: clean overlay while submitting (replaces the flash of old inline view)
  // Ship 7 (P0): submit failed — never silently drop the student back into the
  // test. Their answers are held in state + localStorage; give them a Retry.
  if (submitError) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--c-bg)", color: "var(--c-text-primary)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: 24,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--c-text-tertiary)",
          marginBottom: 10,
        }}>
          Not submitted
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em",
          color: "var(--c-text-primary)", margin: "0 0 10px",
        }}>
          Your answers are{" "}
          <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
            safe
          </span>
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--c-text-secondary)", margin: "0 0 22px", maxWidth: "44ch", lineHeight: 1.55 }}>
          {submitError}
        </p>
        <button
          onClick={retrySubmit}
          style={{
            padding: "11px 22px", borderRadius: 8, border: "none",
            background: "var(--c-brand-primary)", color: "#fff",
            fontFamily: "inherit", fontSize: 14, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry submission
        </button>
        <p style={{ fontSize: 12, color: "var(--c-text-tertiary)", margin: "16px 0 0", maxWidth: "42ch", lineHeight: 1.5 }}>
          Don&apos;t close this tab — your answers are stored on this device until the submission goes through.
        </p>
      </div>
    );
  }

  if (submitting) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--c-bg)", color: "var(--c-text-primary)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: 24,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div style={{
          width: 60, height: 60, marginBottom: 24,
          borderRadius: "50%",
          border: "3px solid var(--c-border-faint)",
          borderTopColor: "var(--c-brand-primary)",
          animation: "ipm-spin 0.8s linear infinite",
        }} />
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--c-text-tertiary)",
          marginBottom: 10,
        }}>
          Submitting
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em",
          color: "var(--c-text-primary)", margin: "0 0 8px",
        }}>
          Saving your{" "}
          <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
            result
          </span>…
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--c-text-secondary)", margin: 0, maxWidth: "40ch", lineHeight: 1.5 }}>
          Just a moment while we record your answers. You&apos;ll be redirected to your result page.
        </p>
        <style jsx global>{`
          @keyframes ipm-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (allowed == false && !loading) {
    return (
      <div
        className="w-full h-screen flex flex-col items-center justify-center"
        style={{ background: "var(--c-bg)", color: "var(--c-text-primary)", textAlign: "center", padding: 24 }}
      >
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--c-text-tertiary)",
          marginBottom: 10,
        }}>
          Already attempted
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 600, letterSpacing: "-0.022em",
          color: "var(--c-text-primary)", margin: "0 0 10px", lineHeight: 1.2,
        }}>
          You&apos;ve already taken this{" "}
          <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
            test
          </span>.
        </h1>
        <p style={{
          fontSize: 14.5, color: "var(--c-text-secondary)",
          margin: "0 0 28px", maxWidth: "44ch", lineHeight: 1.55,
        }}>
          Concept tests are single-shot — your earlier attempt is saved. You can review your result and analytics below.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {existingPlay?.uid && (
            <button
              onClick={() => router.push(`/test/result/${existingPlay.uid}`)}
              style={{
                height: 42, padding: "0 22px", borderRadius: 999,
                background: "var(--c-brand-primary)", color: "#fff",
                border: "none", fontSize: 13.5, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              View result →
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            style={{
              height: 42, padding: "0 22px", borderRadius: 999,
              background: "transparent",
              color: "var(--c-text-secondary)",
              border: "1px solid var(--c-border-soft)",
              fontSize: 13.5, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full sf h-screen max-h-screen justify-center align-middle items-center overflow-hidden flex flex-col" style={{ background: "var(--c-bg)" }}>
      {/* Phase 12 Ship E.5: redesigned submit confirmation modal */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--c-surface)",
              borderRadius: 20,
              maxWidth: 460, width: "100%",
              padding: "28px 28px 24px",
              border: "1px solid var(--c-border-faint)",
              boxShadow: "0 24px 64px -12px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{
              fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--c-text-tertiary)",
              marginBottom: 10,
            }}>
              Ready to submit?
            </div>
            <h2 style={{
              margin: "0 0 8px",
              fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
              color: "var(--c-text-primary)", lineHeight: 1.2,
            }}>
              Submit your{" "}
              <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
                test
              </span>?
            </h2>
            <p style={{
              margin: "0 0 22px",
              fontSize: 14, lineHeight: 1.55,
              color: "var(--c-text-secondary)",
            }}>
              You&apos;ve answered{" "}
              <b style={{ color: "var(--c-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {report?.length ?? 0}
              </b>
              {" "}of{" "}
              <b style={{ color: "var(--c-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {questions?.length}
              </b>
              {" "}questions. Once submitted, you can&apos;t change your answers — concept tests are single-attempt.
            </p>
            <div style={{
              padding: "12px 14px",
              background: "var(--c-warning-soft, #FBEED2)",
              border: "1px solid var(--c-warning, #B66C00)",
              borderRadius: 12,
              fontSize: 12.5, color: "var(--c-warning, #B66C00)",
              marginBottom: 22, lineHeight: 1.5,
            }}>
              ⓘ Make sure you&apos;re happy with your answers — you can&apos;t retake this test once submitted.
            </div>
            <div style={{
              display: "flex", gap: 10, justifyContent: "flex-end",
              flexWrap: "wrap",
            }}>
              <button
                onClick={() => setConfirmModal(false)}
                style={{
                  height: 42, padding: "0 20px", borderRadius: 999,
                  background: "transparent",
                  color: "var(--c-text-secondary)",
                  border: "1px solid var(--c-border-soft)",
                  fontSize: 13.5, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmModal(false); handleComplete(); }}
                style={{
                  height: 42, padding: "0 22px", borderRadius: 999,
                  background: "var(--c-brand-primary)",
                  color: "#fff",
                  border: "1px solid transparent",
                  fontSize: 13.5, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                Yes, submit →
              </button>
            </div>
          </div>
        </div>
      )}

      <HeaderMock
        key={config?.title}
        isHintAvailable={isHintAvailable}
        isHintVisible={isHintVisible}
        setIsHintAvailable={setIsHintAvailable}
        onSetVisible={(e) => {
          setisHintVisible(e);
        }}
        level={level}
        questions={questions}
        calc={parentData?.calculator_allowed ?? false}
        remainingTime={totalSeconds}
        openCalculator={() => {
          setCalculatorActive(true);
        }}
        state={gamestate}
        userData={userDetails}
        title={parentData?.title}
        timeOut={config?.config?.timeout || 1800}
      ></HeaderMock>
      <DraggableModal
        handleModal={() => setCalculatorActive(false)}
        closeable={false}
        open={calculatorActive}
      >
        {parentData?.is_scientific ? (
          <iframe
            src="https://ipmkanpur.tcyonline.com/onlinefiles/scientific_calculator/GATECalculator.htm#nogo"
            className="w-full h-full p-1 overflow-hidden"
          ></iframe>
        ) : (
          <iframe
            src="https://chamoda.com/react-calculator/"
            className="w-full mx-auto h-full rounded-2xl shadow-lg p-1 overflow-hidden"
          ></iframe>
        )}
      </DraggableModal>
      <div style={{ background: "var(--c-bg)" }} className="overflow-hidden w-full h-full lg:p-0 flex flex-row items-start justify-start">
        {gamestate == 0 ? (
          <>
            <div className="w-full h-full overflow-y-auto flex flex-col justify-start items-stretch">
              <div style={{ background: "var(--c-bg)", padding: "32px 40px 24px", flex: 1 }}>
                <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "left" }}>

                  {/* Eyebrow */}
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                    Before you begin
                  </div>

                  {/* Page title with serif accent */}
                  <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 600, letterSpacing: "-0.022em", color: "var(--c-text-primary)", lineHeight: 1.15 }}>
                    Hi{" "}
                    <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
                      {userDetails?.user_metadata?.full_name?.split(" ")[0] || "there"}
                    </span>
                    , let&apos;s begin.
                  </h1>
                  <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--c-text-secondary)", margin: "0 0 28px", maxWidth: "56ch" }}>
                    A quick look at what this test covers before you dive in. You can mark questions for review, switch between them, and revisit anything you skipped.
                  </p>

                  {/* Description card */}
                  {parentData?.description && (
                    <div style={{
                      background: "var(--c-surface)",
                      border: "1px solid var(--c-border-faint)",
                      borderRadius: 16,
                      padding: "20px 24px",
                      marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                        Test description
                      </div>
                      <div
                        className="qcontent"
                        style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--c-text-primary)" }}
                        dangerouslySetInnerHTML={{ __html: parentData.description }}
                      />
                    </div>
                  )}

                  {/* Objective card */}
                  {parentData?.objective && (
                    <div style={{
                      background: "var(--c-surface)",
                      border: "1px solid var(--c-border-faint)",
                      borderRadius: 16,
                      padding: "20px 24px",
                      marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                        Test objective
                      </div>
                      <ScrollShadow
                        className="qcontent"
                        style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--c-text-primary)", maxHeight: "30vh" }}
                        dangerouslySetInnerHTML={{ __html: parentData.objective }}
                      />
                    </div>
                  )}

                </div>
              </div>

              {/* Sticky action bar */}
              <div
                className="sticky bottom-0 w-full"
                style={{
                  background: "var(--c-surface)",
                  borderTop: "1px solid var(--c-border-faint)",
                  padding: "14px 28px",
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
                }}
              >
                <button
                  onClick={() => { router.push("/"); }}
                  style={{
                    height: 40, padding: "0 18px", borderRadius: 999,
                    background: "transparent",
                    color: "var(--c-text-secondary)",
                    border: "1px solid var(--c-border-soft)",
                    fontSize: 13.5, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Go back
                </button>
                <button
                  onClick={() => { setGameState(1); }}
                  style={{
                    height: 40, padding: "0 18px", borderRadius: 999,
                    background: "var(--c-brand-primary)",
                    color: "#fff",
                    border: "1px solid transparent",
                    fontSize: 13.5, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  I&apos;m ready to begin →
                </button>
              </div>
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate == 1 ? (
          <>
            <div className="w-full flex flex-col justify-center align-middle items-stretch h-full relative">
              {isFlashing ? <Flasher></Flasher> : ""}
              <Button
                size="sm"
                color="primary"
                onPress={() => {
                  setSidebarActive(true);
                }}
                className="absolute flex sm:hidden right-0 z-[2] rounded-r-none top-2"
              >
                Open <Grip></Grip>
              </Button>

              <QuestionCard
                report={report}
                isPlaying={!(showModal || isHintVisible)}
                key={level}
                onReview={(e) => {
                  const existingReport = report.find((item) => sameId(item.id, e));
                  const hasTempAnswer = tempAnswers && tempAnswers[e];

                  if (
                    (existingReport && existingReport.status === "answered") ||
                    hasTempAnswer
                  ) {
                    // If already answered (either saved or temporary), mark as both answered and reviewed
                    addToReport({ id: e, status: "markedForReview" });
                  } else {
                    // If not answered yet, just mark for review
                    addToReport({ id: e, status: "review" });
                  }
                }}
                question={questions[level]}
                onSelect={(e) => {
                  handleSubmit(e);
                }}
                onTempAnswer={handleTempAnswer}
                onClearResponse={handleClearResponse}
                onNext={incrementLevel}
                isMarked={report?.some(
                  (item) =>
                    sameId(item?.id, questions[level]?.id) && item?.status === "review"
                )}
                onFinish={() => {
                  const hasTempAnswers =
                    tempAnswers &&
                    Object.keys(tempAnswers).length > 0;
                  if (hasTempAnswers) {
                    saveTempAnswers();
                  }
                  if (
                    (!report || report.length === 0) &&
                    !hasTempAnswers
                  ) {
                    toast.error(
                      "Please attempt at least 1 question to submit the test"
                    );
                  } else {
                    setConfirmModal(true);
                  }
                }}
              />
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate == 2 ? (
          <>
            <>
              {/* Backdrop */}
              {activeExplanation != undefined && (
                <motion.div
                  className="fixed  bg-black bg-opacity-50 z-40 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={"Modal2"}
                  // Explicitly set undefined
                />
              )}

              {/* Modal */}
              {activeExplanation != undefined && (
                <motion.div
                  key={"Modal"}
                  className="fixed inset-0 z-50 w-full flex justify-center items-start overflow-y-auto pointer-events-auto"
                  initial={{ opacity: 0, y: "10%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "10%" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-white p-4 w-full h-full md:h-auto rounded-lg overflow-hidden shadow-lg">
                    <XCircle
                      stroke="white"
                      fill="red"
                      className=" right-4 top-4 absolute pointer-events-auto z-[9999] cursor-pointer"
                      size={48}
                      onClick={() => {
                        setActiveExplanation(undefined);
                      }}
                    ></XCircle>
                    {/* Modal Header */}
                    <div className="flex flex-col gap-1 justify-start items-start p-4  text-black ">
                      <h2 className="text-2xl font-bold">Explanation</h2>
                    </div>

                    {/* Modal Body */}
                    <div className="p-4 overflow-y-auto">
                      {/* Explanation Video */}
                      {questions[activeExplanation]?.explanationvideo && (
                        <iframe
                          className="rounded-lg overflow-hidden max-w-6xl mx-auto bg-gray-200 w-full aspect-video"
                          width="100%"
                          height="100%"
                          src={questions[activeExplanation]?.explanationvideo}
                          frameBorder="0"
                          allowFullScreen
                        ></iframe>
                      )}
                      <div className="h-24"></div>
                      {/* Question Text */}
                      <div
                        className="text-sm font-bold [&_*]:!text-sm [&_*]:font-normal mt-4"
                        dangerouslySetInnerHTML={{
                          __html: questions[activeExplanation].question,
                        }}
                      ></div>

                      {/* Question Image */}
                      {questions[activeExplanation]?.questionimage && (
                        <img
                          src={questions[activeExplanation].questionimage}
                          className="mt-4"
                          alt="Question"
                        />
                      )}

                      {/* Explanation Text */}
                      <div
                        className="mt-4"
                        dangerouslySetInnerHTML={{
                          __html: questions[activeExplanation].explanation,
                        }}
                      ></div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-gray-100">
                      <div className="w-full">
                        <h2 className="font-bold text-md text-green-500">
                          Correct Answer:{" "}
                          {
                            questions[activeExplanation].options.find(
                              (item) => item.isCorrect
                            )?.title
                          }
                        </h2>
                        <h2 className="font-bold text-md text-blue-500">
                          {/* BUG FIX (2026-07): report is stored chronologically
                              (order student answered), not in questions[] display
                              order. Indexing report[activeExplanation] pulled a
                              DIFFERENT question's answer text (e.g. "A^2 – B^2"
                              appearing on a Binomial question). Match by id. */}
                          Your Answer: {(() => {
                            const activeQ = questions[activeExplanation];
                            const r = activeQ ? report.find((item) => item.id === activeQ.id) : null;
                            return r?.answer ?? "—";
                          })()}
                        </h2>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>

            <div className="w-full text-center h-full flex flex-col justify-between items-center">
              <div className="w-full h-full  flex flex-row overflow-y-auto items-start justify-start">
                <div
                  className={
                    "w-full fixed sm:relative transition-all z-[9] sm:!transform-none sm:z-0 left-0 top-0 max-w-[400px] flex-1 overflow-y-auto overflow-x-hidden border-r-1 h-full flex flex-col justify-start items-start " +
                    (drawerActive ? "translate-x-0" : "-translate-x-full")
                  }
                >
                  <div className="flex flex-col w-full p-0 text-center bg-slate-50 overflow-hidden relative">
                    <Button
                      size="sm"
                      isIconOnly
                      color="secondary"
                      onPress={() => {
                        setDrawerActive(false);
                      }}
                      className="absolute flex sm:hidden right top-1/2 -translate-y-1/2 z-50 rounded-r-none right-0"
                    >
                      <ChevronLeft></ChevronLeft>
                    </Button>

                    <div className="flex flex-row flex-wrap text-black justify-between align-middle items-center p-2 bg-white text-xs">
                      <h2 className="flex-1 font-medium text-sm">Name</h2>
                      <h2 className="flex-1 font-medium text-sm">Status</h2>
                      <h2 className="flex-1 font-medium text-sm">Intervals</h2>
                      <h2 className="flex-1 font-medium text-sm">
                        Explanation
                      </h2>
                    </div>
                    <div className="overflow-y-auto">
                      {questions &&
                        questions.map((i, d) => {
                          return (
                            <div className="flex flex-row hover:bg-slate-100 flex-wrap relative justify-between align-middle items-center p-2 text-xs">
                              <div className="w-[90%] absolute h-[1px] bg-gray-200 bottom-0 left-1/2 -translate-x-1/2"></div>
                              <h2 className="flex-1 gradtext font-bold">
                                Q {d + 1}{" "}
                              </h2>
                              <h2 className="flex-1 flex flex-row justify-center align-middle items-center">
                                <div className="w-6 z-10 h-6 flex flex-col items-center justify-center relative">
                                  {getStatusIcon(i, report, true)}
                                  {report.find((item) => sameId(item.id, i.id))
                                    ?.isCorrect ? (
                                    <Check
                                      className="z-10"
                                      color="white"
                                      size={16}
                                    ></Check>
                                  ) : (
                                    <X color="white" size={16}></X>
                                  )}
                                </div>
                              </h2>
                              <h2 className="flex-1 gradtext font-bold">
                                {calculateIntervalDelta(
                                  report,
                                  questions,
                                  d,
                                  i
                                )}
                                s
                              </h2>
                              <h2 className="flex-1">
                                <Button
                                  color="primary"
                                  size="sm"
                                  onPress={() => {
                                    setActiveExplanation(d);
                                  }}
                                  variant="light"
                                  isIconOnly
                                >
                                  <ChevronRight></ChevronRight>
                                </Button>
                              </h2>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <div className="flex bg-white flex-row justify-center items-center align-middle w-full shadow-sm p-2 rounded-lg">
                    <p className="flex-1 text-center text-green-500 font-bold">
                      Correct :{" "}
                      {report.filter((item) => item.isCorrect == true)?.length}
                    </p>
                    <p className="flex-1 text-center text-red-500 font-bold">
                      Incorrect :{" "}
                      {report.filter((item) => item.isCorrect == false)?.length}
                    </p>
                  </div>
                </div>
                <div className="flex-1 h-full flex flex-col items-start justify-start overflow-hidden">
                  <div className="flex w-full flex-col bg-gray-50 p-4">
                    <Button
                      onPress={() => {
                        setDrawerActive(true);
                      }}
                      className="mb-2 mr-auto flex sm:hidden"
                      color="primary"
                      size="sm"
                    >
                      Open Explanations<ChevronRight></ChevronRight>
                    </Button>
                    {report &&
                    report.filter((item) => item.isCorrect == true).length >
                      questions.length / 2 ? (
                      <p className="text-green-500">Your Test is Submitted</p>
                    ) : (
                      <></>
                    )}
                    <h2 className="my-3 flex flex-col align-middle justify-center items-center">
                      You scored{" "}
                      <span className=" text-5xl font-bold w-auto text-green-500">
                        {score}
                      </span>
                    </h2>

                    {
                      <p className="font-bold text-green-600 text-2xl text-center">
                        You have successfully completed the test
                      </p>
                    }
                    {submitted && (
                      <Button
                        as={Link}
                        href={`/test/analytics/${submitted?.uid}`}
                        size="lg"
                        className=" from-primary-500 to-primary-700 bg-gradient-to-r mx-auto text-white"
                      >
                        View Analysis
                      </Button>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 flex flex-col items-start justify-start flex-1 h-full overflow-y-auto p-0">
                    <Leaderboard scores={leaderboard ?? []}></Leaderboard>
                  </div>
                </div>
              </div>
              <div className="flex flex-row items-center justify-center w-full p-2 sticky bottom-0 bg-white border-t-1">
                <Button
                  className="my-2 from-secondary to-yellow-300 bg-gradient-to-b shadow-md shadow-yellow-200 border-1 border-white"
                  color="default"
                  onPress={() => {
                    router.push("/");
                  }}
                  startContent={<Home></Home>}
                >
                  Go back to Dashboard
                </Button>
              </div>
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate < 2 && (
          <QuestionBrowser
            switchQuestion={(e) => {
              setLevel(questions?.findIndex((item) => sameId(item.id, e)));
            }}
            gamestate={gamestate}
            questions={questions}
            report={report}
            tempAnswers={tempAnswers}
            sideBarActive={sideBarActive}
            setSidebarActive={(e) => {
              setSidebarActive(e);
            }}
          ></QuestionBrowser>
        )}
      </div>
    </div>
  );
};

export default Game;
