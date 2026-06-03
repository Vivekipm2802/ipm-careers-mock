// ============================================================
// QuestionCard — Phase 4 redesign for concept test runner
// Clean option cards with letter chips, soft purple selected state,
// internal action bar (Mark / Clear / Next / Finish). All props
// and behaviours preserved.
// ============================================================

import { ScrollShadow } from "@nextui-org/react";
import { Bookmark, Check, Eraser, ArrowRight, Flag } from "lucide-react";
import { useState, useEffect } from "react";

export default function QuestionCard({
  question,
  onSelect,
  index,
  onReview,
  isMarked,
  report,
  onFinish,
  onTempAnswer,
  onNext,
  onClearResponse,
}) {
  const [answeredData, setAnsweredData] = useState();
  const [inputValue, setInputValue] = useState("");

  const { id, title, type, questionimage, options, label } = question || {};
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!question) return;
    const existingReport = report?.find((item) => item.id === question.id);
    if (!existingReport) {
      setInputValue("");
      setAnsweredData(undefined);
    } else if (existingReport && type === "input" && existingReport.value) {
      setInputValue(existingReport.value || "");
    }
  }, [question?.id, report, type]);

  if (!question) {
    return (
      <div style={{ padding: 40, color: "var(--c-text-tertiary)" }}>Question unavailable</div>
    );
  }

  // Current selected option (1-indexed string)
  const selectedOption =
    report?.find((item) => item.id == question.id)?.selectedOption ||
    (answeredData?.selectedOption ? String(answeredData.selectedOption) : "");

  const hasAnswer = !!answeredData || !!report?.find((item) => item.id == question.id);

  return (
    <div
      className="font-sans w-full flex-1 flex flex-col text-left overflow-hidden"
      style={{ background: "var(--c-bg)" }}
    >
      <div className="w-full h-full flex flex-col items-start justify-start relative overflow-y-auto">
        <div className="w-full flex-1 flex flex-col items-start justify-start" style={{ padding: "40px 56px 32px" }}>

          {/* Question meta */}
          <div
            style={{
              fontSize: 12, fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--c-text-tertiary)",
              marginBottom: 12,
            }}
          >
            Question {index}
            {isDevelopment && (
              <span style={{ marginLeft: 12, color: "var(--c-text-tertiary)", opacity: 0.6 }}>
                · ID {id}
              </span>
            )}
          </div>

          {/* Question title */}
          <h2
            style={{
              fontSize: 22, fontWeight: 600,
              letterSpacing: "-0.018em", lineHeight: 1.35,
              color: "var(--c-text-primary)",
              marginBottom: 18,
              maxWidth: "70ch",
            }}
          >
            {title}
          </h2>

          {/* Question body (HTML) */}
          <div className="w-full" style={{ maxWidth: "70ch", marginBottom: 24 }}>
            <ScrollShadow
              className="qcontent"
              style={{
                fontSize: 16,
                lineHeight: 1.65,
                color: "var(--c-text-primary)",
                maxHeight: "40vh",
                overflowY: "auto",
              }}
              dangerouslySetInnerHTML={{ __html: question.question }}
            />
          </div>

          {questionimage && (
            <img
              src={questionimage}
              alt="Question"
              style={{
                maxHeight: "30vh",
                marginBottom: 24,
                borderRadius: 12,
                border: "1px solid var(--c-border-faint)",
              }}
            />
          )}

          {/* Options */}
          {type === "options" && (
            <div className="w-full" style={{ maxWidth: 640 }}>
              <div
                style={{
                  fontSize: 13, fontWeight: 500,
                  color: "var(--c-text-secondary)",
                  marginBottom: 14, letterSpacing: "-0.005em",
                }}
              >
                {label || "Choose one option"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {options.map((option, i) => {
                  const optionValue = String(i + 1);
                  const isSelected = selectedOption === optionValue;
                  const letter = String.fromCharCode(65 + i); // A, B, C, D

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const answerData = { selectedOption: optionValue, ...question };
                        setAnsweredData(answerData);
                        onSelect(answerData);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        padding: "16px 18px",
                        background: isSelected ? "var(--c-brand-primary-tint)" : "var(--c-surface)",
                        border: `1px solid ${isSelected ? "var(--c-brand-primary)" : "var(--c-border-soft)"}`,
                        borderRadius: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.18s ease",
                        width: "100%",
                        fontFamily: "inherit",
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = "var(--c-brand-primary-soft)";
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = "var(--c-border-soft)";
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: 28, height: 28,
                          borderRadius: 8,
                          background: isSelected ? "var(--c-brand-primary)" : "var(--c-surface-sunken, var(--c-surface-muted))",
                          color: isSelected ? "#fff" : "var(--c-text-secondary)",
                          display: "grid", placeItems: "center",
                          fontWeight: 600, fontSize: 13,
                          letterSpacing: "-0.005em",
                          transition: "all 0.18s ease",
                        }}
                      >
                        {letter}
                      </div>
                      <div style={{ flex: 1 }}>
                        {option.image ? (
                          <img
                            src={option.image}
                            alt={`Option ${letter}`}
                            style={{ height: 64, width: "auto", objectFit: "contain" }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: 15, lineHeight: 1.5,
                              color: "var(--c-text-primary)",
                            }}
                          >
                            {option.title}
                            {isDevelopment && option.isCorrect && (
                              <span style={{
                                display: "inline-block", width: 6, height: 6,
                                borderRadius: "50%", background: "#22c55e",
                                marginLeft: 8, verticalAlign: "middle",
                              }} />
                            )}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input question */}
          {type === "input" && (
            <div className="w-full" style={{ maxWidth: 480 }}>
              <div
                style={{
                  fontSize: 13, fontWeight: 500,
                  color: "var(--c-text-secondary)",
                  marginBottom: 8, letterSpacing: "-0.005em",
                }}
              >
                {label || "Enter your answer"}
              </div>
              <input
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  const answerData = { ...question, value: e.target.value };
                  setAnsweredData(answerData);
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    const answerData = { ...question, value: e.target.value };
                    onSelect(answerData);
                  }
                }}
                placeholder="Type your answer here"
                style={{
                  width: "100%",
                  height: 52,
                  padding: "0 18px",
                  fontSize: 17,
                  fontFamily: "inherit",
                  background: "var(--c-surface)",
                  color: "var(--c-text-primary)",
                  border: "1px solid var(--c-border-strong)",
                  borderRadius: 12,
                  outline: "none",
                  transition: "all 0.18s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--c-brand-primary)";
                  e.target.style.boxShadow = "0 0 0 4px var(--c-brand-primary-tint)";
                }}
                onBlurCapture={(e) => {
                  e.target.style.borderColor = "var(--c-border-strong)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {isDevelopment && (
                <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 8 }}>
                  Dev · expected: {options?.answer}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom action bar — sticky inside the card */}
        <div
          className="sticky w-full bottom-0"
          style={{
            background: "var(--c-surface)",
            borderTop: "1px solid var(--c-border-faint)",
            padding: "14px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => { if (!isMarked) onReview(question.id); }}
              style={{
                ...chipBtn,
                background: isMarked ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
                color: isMarked ? "var(--c-brand-gold)" : "var(--c-text-secondary)",
                borderColor: isMarked ? "var(--c-brand-gold)" : "var(--c-border-soft)",
              }}
            >
              {isMarked ? <Check size={14} /> : <Bookmark size={14} />}
              {isMarked ? "Marked for review" : "Mark for review"}
            </button>

            <button
              onClick={() => {
                if (onClearResponse) {
                  onClearResponse(question.id);
                  setAnsweredData(undefined);
                  setInputValue("");
                }
              }}
              disabled={!hasAnswer}
              style={{
                ...chipBtn,
                opacity: !hasAnswer ? 0.4 : 1,
                cursor: !hasAnswer ? "not-allowed" : "pointer",
              }}
            >
              <Eraser size={14} /> Clear response
            </button>

            <button
              onClick={() => {
                setAnsweredData(undefined);
                if (onNext) onNext();
              }}
              style={primaryBtn}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>

          <button
            onClick={() => { if (onFinish) onFinish(); }}
            style={{
              ...chipBtn,
              background: "var(--c-surface)",
              color: "var(--c-danger)",
              borderColor: "var(--c-danger)",
            }}
          >
            <Flag size={14} /> Finish test
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared inline button styles ──
const chipBtn = {
  height: 36, padding: "0 14px",
  background: "var(--c-surface)",
  color: "var(--c-text-secondary)",
  border: "1px solid var(--c-border-soft)",
  borderRadius: 999,
  fontSize: 13, fontWeight: 500, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "inherit",
  transition: "all 0.15s ease",
};
const primaryBtn = {
  ...chipBtn,
  background: "var(--c-brand-primary)",
  color: "#fff",
  borderColor: "transparent",
};
