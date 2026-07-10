"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Textarea,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Tooltip,
  Select,
  SelectItem,
  RadioGroup,
  Radio,
  Checkbox,
} from "@nextui-org/react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  FileCode,
  ExternalLink,
  Info,
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import { supabase } from "@/utils/supabaseClient";
import dynamic from "next/dynamic";
import FileUploader from "./FileUploader";

const QuillWrapper = dynamic(() => import("@/components/QuillSSRWrapper"), {
  ssr: false,
});

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

// Supabase returns ids as string OR number depending on the query path.
// Always compare through this helper so filter/select logic never silently
// misses on a string-vs-number mismatch.
const sameId = (a, b) => String(a) === String(b);

const ACCENT_MAP = {
  amber: { c: "#D97706", soft: "rgba(217,119,6,0.08)" },
  teal: { c: "#0F766E", soft: "rgba(15,118,110,0.08)" },
  purple: { c: "#6D28D9", soft: "rgba(109,40,217,0.08)" },
  green: { c: "#15803D", soft: "rgba(21,128,61,0.08)" },
  blue: { c: "#1D4ED8", soft: "rgba(29,78,216,0.08)" },
  pink: { c: "#BE185D", soft: "rgba(190,24,93,0.08)" },
};

export default function PYQManager({
  isAdmin = false,
  viewBy,
  filterValue: initialFilterValue,
}) {
  // ──────────────────────────────────────────────────────────────
  // EXISTING STATE — admin question/topic CRUD (preserved)
  // ──────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    answer: "",
    answer_type: "answer_based",
    options: [],
    year: new Date().getFullYear(),
    difficulty: "medium",
    file_type: undefined,
    file_url: "",
    explanation: "",
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ name: "", description: "", icon_url: "" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState("");
  const [showExplanationSection, setShowExplanationSection] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // NEW STATE — Phase 24: exam shelf + library filters
  // ──────────────────────────────────────────────────────────────
  const [exams, setExams] = useState([]);
  const [examMeta, setExamMeta] = useState({}); // { examId: { count, minYear, maxYear, topics: Set } }
  const [selectedExam, setSelectedExam] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Library filters
  const [yearFilter, setYearFilter] = useState(null);
  const [topicFilter, setTopicFilter] = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null); // 'mcq' | 'answer_based'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [practiceMode, setPracticeMode] = useState(true);
  const [pickedOptionIdx, setPickedOptionIdx] = useState(null);
  const [revealed, setRevealed] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Initial load — exams + topics + exam meta
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchExams(), fetchTopics(), fetchExamMeta()]);
      setDataLoaded(true);
      setLoading(false);
    };
    init();
  }, []);

  // Refetch questions when filters change inside a library
  useEffect(() => {
    if (selectedExam && dataLoaded) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedExam?.id,
    yearFilter,
    topicFilter,
    difficultyFilter,
    typeFilter,
    dataLoaded,
  ]);

  // Debounced live search — refetch shortly after typing stops so the search
  // box feels responsive. Enter (onSearchSubmit) still triggers an instant
  // fetch. skip-first ref avoids a redundant fetch on initial mount / exam open
  // (the filter effect above already covers that path).
  const searchInit = useRef(true);
  useEffect(() => {
    if (searchInit.current) {
      searchInit.current = false;
      return;
    }
    if (!selectedExam || !dataLoaded) return;
    const t = setTimeout(() => {
      fetchQuestions();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Reset reader state when question changes
  useEffect(() => {
    setPickedOptionIdx(null);
    setRevealed(!practiceMode); // if browse mode, instantly reveal
    setShowExplanationSection(false);
  }, [selectedQuestion?.id, practiceMode]);

  // ──────────────────────────────────────────────────────────────
  // Data fetch
  // ──────────────────────────────────────────────────────────────
  async function fetchExams() {
    const { data } = await supabase
      .from("pyq_exams")
      .select("*")
      .order("seq", { ascending: true });
    setExams(data || []);
  }

  async function fetchExamMeta() {
    const { data } = await supabase
      .from("pyq_questions")
      .select("exam, year");
    const meta = {};
    (data || []).forEach((r) => {
      const k = r.exam || "ipmat_indore";
      if (!meta[k]) meta[k] = { count: 0, minYear: r.year, maxYear: r.year };
      meta[k].count++;
      meta[k].minYear = Math.min(meta[k].minYear, r.year);
      meta[k].maxYear = Math.max(meta[k].maxYear, r.year);
    });
    setExamMeta(meta);
  }

  async function fetchTopics() {
    const { data } = await supabase.from("pyq_topics").select("*").order("name");
    setTopics(data || []);
  }

  async function fetchYears() {
    if (!selectedExam) return;
    const { data } = await supabase
      .from("pyq_questions")
      .select("year")
      .eq("exam", selectedExam.id)
      .order("year", { ascending: false });
    if (data) {
      const uniq = [...new Set(data.map((r) => r.year))];
      setYears(uniq);
    }
  }

  async function fetchQuestions() {
    if (!selectedExam) return;
    setLoading(true);
    try {
      let query = supabase
        .from("pyq_questions")
        .select("*")
        .eq("exam", selectedExam.id);
      // Defensive type coercion — dropdowns sometimes give string,
      // the DB column is numeric/text. Coerce explicitly.
      if (yearFilter != null) {
        const n = typeof yearFilter === "string" ? parseInt(yearFilter, 10) : yearFilter;
        if (!Number.isNaN(n)) query = query.eq("year", n);
      }
      if (difficultyFilter) query = query.eq("difficulty", String(difficultyFilter));
      if (typeFilter) query = query.eq("answer_type", String(typeFilter));
      const { data: questionsData, error: questionsError } = await query.order("id");
      if (questionsError) throw questionsError;

      let filtered = questionsData || [];

      if (topicFilter != null) {
        const tid = typeof topicFilter === "string" ? parseInt(topicFilter, 10) : topicFilter;
        const { data: qt, error: qtErr } = await supabase
          .from("pyq_question_topics")
          .select("question_id")
          .eq("topic_id", tid);
        if (qtErr) throw qtErr;
        // question_id may be string or number depending on path — normalize
        // both sides or the Set membership silently drops every row.
        const qIds = new Set((qt || []).map((r) => String(r.question_id)));
        filtered = filtered.filter((q) => qIds.has(String(q.id)));
      }

      if (searchQuery && searchQuery.trim().length > 0) {
        const s = searchQuery.toLowerCase();
        filtered = filtered.filter((q) =>
          (q.question || "").toLowerCase().includes(s),
        );
      }

      // Hydrate with topics — single batched query keyed by question id.
      // (Was N+1: one round-trip per question.) Empty guard avoids a malformed
      // .in() call when nothing matched the filters.
      let withTopics = filtered.map((q) => ({ ...q, topics: [] }));
      if (filtered.length > 0) {
        const qIdList = filtered.map((q) => q.id);
        const { data: rels, error: relErr } = await supabase
          .from("pyq_question_topics")
          .select("question_id, topic_id")
          .in("question_id", qIdList);
        if (relErr) throw relErr;
        const topicById = new Map(topics.map((t) => [String(t.id), t]));
        const byQuestion = new Map();
        (rels || []).forEach((r) => {
          const key = String(r.question_id);
          if (!byQuestion.has(key)) byQuestion.set(key, []);
          const t = topicById.get(String(r.topic_id));
          if (t) byQuestion.get(key).push(t);
        });
        withTopics = filtered.map((q) => ({
          ...q,
          topics: byQuestion.get(String(q.id)) || [],
        }));
      }

      setQuestions(withTopics);
    } catch (e) {
      console.warn("[PYQManager] fetchQuestions:", e?.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch years whenever selected exam changes
  useEffect(() => {
    if (selectedExam) fetchYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam?.id]);

  // ──────────────────────────────────────────────────────────────
  // Admin CRUD handlers — PRESERVED VERBATIM
  // ──────────────────────────────────────────────────────────────
  const handleSaveNewQuestion = async () => {
    if (!newQuestion.question || !newQuestion.year) {
      alert("Please fill in all required fields");
      return;
    }
    if (newQuestion.answer_type === "mcq") {
      if (!newQuestion.options || newQuestion.options.length < 2) {
        alert("MCQ questions must have at least 2 options");
        return;
      }
      if (!newQuestion.options.some((o) => o.is_correct)) {
        alert("MCQ questions must have at least one correct answer");
        return;
      }
    } else if (newQuestion.answer_type === "answer_based" && !newQuestion.answer) {
      alert("Answer based questions must have an answer");
      return;
    }
    try {
      const toSave = {
        ...newQuestion,
        exam: selectedExam?.id || "ipmat_indore",
        options:
          newQuestion.answer_type === "mcq"
            ? JSON.stringify(newQuestion.options)
            : null,
      };
      const { data, error } = await supabase
        .from("pyq_questions")
        .insert([toSave])
        .select();
      if (error) throw error;
      const newId = data?.[0]?.id;
      if (newId && selectedTopics.length > 0) {
        const { error: linkErr } = await supabase.from("pyq_question_topics").insert(
          selectedTopics.map((tid) => ({ question_id: newId, topic_id: tid })),
        );
        if (linkErr) {
          console.error("Error saving topic tags:", linkErr);
          alert("Question saved, but topic tags failed to save. Re-open the question and re-apply topics.");
        }
      }
      setNewQuestion({
        question: "",
        answer: "",
        answer_type: "answer_based",
        options: [],
        year: new Date().getFullYear(),
        difficulty: "medium",
        file_type: undefined,
        file_url: "",
        explanation: "",
      });
      setSelectedTopics([]);
      setIsAddingQuestion(false);
      fetchQuestions();
      fetchExamMeta();
    } catch (e) {
      console.error("Error adding question:", e);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    try {
      if (editingQuestion.answer_type === "mcq") {
        if (!editingQuestion.options || editingQuestion.options.length < 2) {
          alert("MCQ questions must have at least 2 options");
          return;
        }
        if (!editingQuestion.options.some((o) => o.is_correct)) {
          alert("MCQ questions must have at least one correct answer");
          return;
        }
      } else if (
        editingQuestion.answer_type === "answer_based" &&
        !editingQuestion.answer
      ) {
        alert("Answer based questions must have an answer");
        return;
      }
      const { error: qErr } = await supabase
        .from("pyq_questions")
        .update({
          question: editingQuestion.question,
          answer: editingQuestion.answer,
          answer_type: editingQuestion.answer_type,
          options:
            editingQuestion.answer_type === "mcq"
              ? JSON.stringify(editingQuestion.options)
              : null,
          year: editingQuestion.year,
          difficulty: editingQuestion.difficulty,
          file_url: editingQuestion.file_url,
          file_type: editingQuestion.file_type,
          explanation: editingQuestion.explanation,
        })
        .eq("id", editingQuestion.id);
      if (qErr) throw qErr;
      const { error: delErr } = await supabase
        .from("pyq_question_topics")
        .delete()
        .eq("question_id", editingQuestion.id);
      if (delErr) throw delErr;
      if (selectedTopics.length > 0) {
        const { error: linkErr } = await supabase.from("pyq_question_topics").insert(
          selectedTopics.map((tid) => ({
            question_id: editingQuestion.id,
            topic_id: tid,
          })),
        );
        if (linkErr) {
          console.error("Error saving topic tags:", linkErr);
          alert("Question updated, but topic tags failed to save. Re-open the question and re-apply topics.");
        }
      }
      if (selectedQuestion && sameId(selectedQuestion.id, editingQuestion.id)) {
        setSelectedQuestion({
          ...editingQuestion,
          topics: topics.filter((t) => selectedTopics.includes(t.id)),
        });
      }
      setEditingQuestion(null);
      setSelectedTopics([]);
      fetchQuestions();
    } catch (e) {
      console.error("Error updating question:", e);
    }
  };

  const handleDeleteQuestion = async (id) => {
    try {
      await supabase.from("pyq_question_topics").delete().eq("question_id", id);
      const { error } = await supabase.from("pyq_questions").delete().eq("id", id);
      if (error) throw error;
      if (selectedQuestion?.id === id) setSelectedQuestion(null);
      setDeleteConfirmOpen(false);
      setQuestionToDelete(null);
      fetchQuestions();
      fetchExamMeta();
    } catch (e) {
      console.error("Error deleting question:", e);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.name) {
      alert("Please enter a topic name");
      return;
    }
    try {
      if (newTopic.id) {
        const { error } = await supabase
          .from("pyq_topics")
          .update({
            name: newTopic.name,
            description: newTopic.description,
            icon_url: newTopic.icon_url,
          })
          .eq("id", newTopic.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pyq_topics").insert([newTopic]);
        if (error) throw error;
      }
      setNewTopic({ name: "", description: "", icon_url: "" });
      setIsAddingTopic(false);
      fetchTopics();
    } catch (e) {
      console.error("Error saving topic:", e);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    // Count how many questions currently carry this tag so the admin knows
    // exactly what a delete strips — this is a cascading, irreversible action.
    let affected = 0;
    try {
      const { count } = await supabase
        .from("pyq_question_topics")
        .select("question_id", { count: "exact", head: true })
        .eq("topic_id", topicId);
      affected = count || 0;
    } catch {
      /* fall through — warn generically if the count lookup fails */
    }
    const msg =
      affected > 0
        ? `Delete this topic? It is tagged on ${affected} question${affected === 1 ? "" : "s"} — those tags will be removed. This cannot be undone.`
        : "Delete this topic? This cannot be undone.";
    if (!confirm(msg)) return;
    try {
      const { error: relErr } = await supabase.from("pyq_question_topics").delete().eq("topic_id", topicId);
      if (relErr) throw relErr;
      const { error: topErr } = await supabase.from("pyq_topics").delete().eq("id", topicId);
      if (topErr) throw topErr;
      fetchTopics();
      fetchQuestions();
    } catch (e) {
      console.error("Error deleting topic:", e);
      alert("Failed to delete topic.");
    }
  };

  const startEditingQuestion = (q) => {
    const eq = {
      ...q,
      answer_type: q.answer_type || "answer_based",
      options: q.options
        ? typeof q.options === "string"
          ? JSON.parse(q.options)
          : q.options
        : [],
      explanation: q.explanation || "",
    };
    setEditingQuestion(eq);
    setSelectedTopics(q.topics?.map((t) => t.id) || []);
  };

  const toggleTopicSelection = (id) =>
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const addMCQOption = (editing = false) => {
    const newOpt = { text: "", is_correct: false };
    if (editing && editingQuestion) {
      setEditingQuestion({
        ...editingQuestion,
        options: [...(editingQuestion.options || []), newOpt],
      });
    } else {
      setNewQuestion({
        ...newQuestion,
        options: [...(newQuestion.options || []), newOpt],
      });
    }
  };
  const removeMCQOption = (idx, editing = false) => {
    if (editing && editingQuestion) {
      const opts = Array.isArray(editingQuestion.options) ? editingQuestion.options : [];
      setEditingQuestion({
        ...editingQuestion,
        options: opts.filter((_, i) => i !== idx),
      });
    } else {
      const opts = Array.isArray(newQuestion.options) ? newQuestion.options : [];
      setNewQuestion({
        ...newQuestion,
        options: opts.filter((_, i) => i !== idx),
      });
    }
  };
  const updateMCQOption = (idx, field, val, editing = false) => {
    if (editing && editingQuestion) {
      const opts = Array.isArray(editingQuestion.options) ? [...editingQuestion.options] : [];
      opts[idx] = { ...opts[idx], [field]: val };
      setEditingQuestion({ ...editingQuestion, options: opts });
    } else {
      const opts = Array.isArray(newQuestion.options) ? [...newQuestion.options] : [];
      opts[idx] = { ...opts[idx], [field]: val };
      setNewQuestion({ ...newQuestion, options: opts });
    }
  };

  const confirmDeleteQuestion = (id) => {
    setQuestionToDelete(id);
    setDeleteConfirmOpen(true);
  };
  const handleDownload = (url, name) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const getFileIcon = (t) => {
    if (t === "pdf" || t === "docx") return <FileText className="h-5 w-5" />;
    if (t === "xls") return <FileSpreadsheet className="h-5 w-5" />;
    if (t === "html") return <FileCode className="h-5 w-5" />;
    if (t === "image") return <FileImage className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  // ──────────────────────────────────────────────────────────────
  // Loading
  // ──────────────────────────────────────────────────────────────
  if (!dataLoaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 48,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid var(--c-border-faint)",
            borderTopColor: "var(--c-brand-primary)",
            animation: "ipm-pyq-spin 0.8s linear infinite",
          }}
        />
        <style jsx global>{`
          @keyframes ipm-pyq-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Main render — Shelf OR Library
  // ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        fontFamily: FONT,
        color: "var(--c-text-primary)",
      }}
    >
      {!selectedExam ? (
        <Shelf
          exams={exams}
          meta={examMeta}
          onPick={(e) => setSelectedExam(e)}
        />
      ) : (
        <Library
          exam={selectedExam}
          questions={questions}
          topics={topics}
          years={years}
          loading={loading}
          isAdmin={isAdmin}
          selectedQuestion={selectedQuestion}
          setSelectedQuestion={setSelectedQuestion}
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
          topicFilter={topicFilter}
          setTopicFilter={setTopicFilter}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          practiceMode={practiceMode}
          setPracticeMode={setPracticeMode}
          pickedOptionIdx={pickedOptionIdx}
          setPickedOptionIdx={setPickedOptionIdx}
          revealed={revealed}
          setRevealed={setRevealed}
          showExplanationSection={showExplanationSection}
          setShowExplanationSection={setShowExplanationSection}
          onBackToShelf={() => {
            setSelectedExam(null);
            setSelectedQuestion(null);
            setYearFilter(null);
            setTopicFilter(null);
            setDifficultyFilter(null);
            setTypeFilter(null);
            setSearchQuery("");
          }}
          onSearchSubmit={() => fetchQuestions()}
          onAddQuestion={() => setIsAddingQuestion(true)}
          onAddTopic={() => {
            setNewTopic({ name: "", description: "", icon_url: "" });
            setIsAddingTopic(true);
          }}
          onEditQuestion={startEditingQuestion}
          onDeleteQuestion={confirmDeleteQuestion}
          onShowExplanation={(html) => {
            setCurrentExplanation(html || "");
            setExplanationModalOpen(true);
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* ADMIN MODALS — preserved verbatim from legacy        */}
      {/* ════════════════════════════════════════════════════ */}

      {/* Add Question Modal */}
      <Modal
        scrollBehavior="inside"
        isOpen={isAddingQuestion}
        onOpenChange={setIsAddingQuestion}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add New Question</ModalHeader>
              <ModalBody>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">File Type</label>
                    <Select
                      aria-label="Select File Type"
                      placeholder="Select File Type"
                      className="w-full flex-grow"
                      selectedKeys={
                        newQuestion.file_type ? new Set([newQuestion.file_type]) : new Set()
                      }
                      onSelectionChange={(keys) =>
                        setNewQuestion({ ...newQuestion, file_type: Array.from(keys)[0] || "" })
                      }
                    >
                      <SelectItem key="pdf" value="pdf">PDF</SelectItem>
                      <SelectItem key="docx" value="docx">DOCX</SelectItem>
                      <SelectItem key="xls" value="xls">XLS</SelectItem>
                      <SelectItem key="html" value="html">HTML</SelectItem>
                      <SelectItem key="image" value="image">Image</SelectItem>
                      <SelectItem key="text" value="text">Text</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Answer Type</label>
                    <RadioGroup
                      value={newQuestion.answer_type}
                      onValueChange={(value) =>
                        setNewQuestion({
                          ...newQuestion,
                          answer_type: value,
                          answer: value === "mcq" ? "" : newQuestion.answer,
                          options:
                            value === "mcq"
                              ? newQuestion.options.length > 0
                                ? newQuestion.options
                                : [{ text: "", is_correct: false }, { text: "", is_correct: false }]
                              : [],
                        })
                      }
                      orientation="horizontal"
                    >
                      <Radio value="answer_based">Answer Based</Radio>
                      <Radio value="mcq">MCQ</Radio>
                    </RadioGroup>
                  </div>
                  {newQuestion.answer_type === "answer_based" && newQuestion.file_type !== "html" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Answer</label>
                      <Textarea
                        placeholder="Enter the answer"
                        value={newQuestion.answer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                        minRows={3}
                      />
                    </div>
                  )}
                  {newQuestion.answer_type === "mcq" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">MCQ Options</label>
                      <div className="space-y-3">
                        {newQuestion.options.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg">
                            <Checkbox
                              isSelected={option.is_correct}
                              onValueChange={(c) => updateMCQOption(idx, "is_correct", c, false)}
                            />
                            <Input
                              placeholder={`Option ${idx + 1}`}
                              value={option.text}
                              onChange={(e) => updateMCQOption(idx, "text", e.target.value, false)}
                              className="flex-1"
                            />
                            {newQuestion.options.length > 2 && (
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => removeMCQOption(idx, false)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button size="sm" variant="bordered" onPress={() => addMCQOption(false)}
                                startContent={<Plus className="h-4 w-4" />}>
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}
                  {newQuestion.answer_type === "answer_based" && newQuestion.file_type === "html" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Rich Text Answer</label>
                      <QuillWrapper
                        value={newQuestion.answer}
                        onChange={(v) => setNewQuestion({ ...newQuestion, answer: v })}
                      />
                    </div>
                  )}
                  {newQuestion.file_type === "image" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Question Image</label>
                      <ImageUploader
                        value={newQuestion.file_url}
                        onUploadComplete={(url) => setNewQuestion({ ...newQuestion, file_url: url })}
                      />
                    </div>
                  )}
                  {["pdf", "docx", "xls"].includes(newQuestion.file_type) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">File Upload</label>
                      <FileUploader
                        data={{ file: newQuestion.file_url }}
                        onUploadComplete={(url) => setNewQuestion({ ...newQuestion, file_url: url })}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Question</label>
                    <Textarea
                      placeholder="Enter the question text"
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                      minRows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Year</label>
                      <Input
                        type="number"
                        value={newQuestion.year?.toString()}
                        onChange={(e) =>
                          setNewQuestion({ ...newQuestion, year: Number.parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Difficulty</label>
                      <Select
                        aria-label="Difficulty"
                        selectedKeys={new Set([newQuestion.difficulty])}
                        onSelectionChange={(keys) =>
                          setNewQuestion({ ...newQuestion, difficulty: Array.from(keys)[0] })
                        }
                      >
                        <SelectItem key="easy" value="easy">Easy</SelectItem>
                        <SelectItem key="medium" value="medium">Medium</SelectItem>
                        <SelectItem key="hard" value="hard">Hard</SelectItem>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Topics</label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                      {topics.map((topic) => (
                        <Chip
                          key={topic.id}
                          color={selectedTopics.includes(topic.id) ? "primary" : "default"}
                          variant={selectedTopics.includes(topic.id) ? "solid" : "bordered"}
                          className="cursor-pointer"
                          onClick={() => toggleTopicSelection(topic.id)}
                        >
                          {topic.name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="flat"
                    size="sm"
                    className="w-fit"
                    onPress={() => setIsAddingTopic(true)}
                    startContent={<Plus className="h-3 w-3" />}
                  >
                    Add Topic
                  </Button>
                  <div>
                    <label className="block text-sm font-medium mb-1">Explanation</label>
                    <QuillWrapper
                      value={newQuestion.explanation}
                      onChange={(v) => setNewQuestion({ ...newQuestion, explanation: v })}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button color="primary" onPress={handleSaveNewQuestion}>
                  <Check className="h-4 w-4 mr-1" /> Save Question
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Add Topic Modal */}
      <Modal isOpen={isAddingTopic} onOpenChange={setIsAddingTopic} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{newTopic?.id ? "Edit Topic" : "Add New Topic"}</ModalHeader>
              <ModalBody>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Topic Name</label>
                    <Input
                      placeholder="Enter topic name"
                      value={newTopic.name}
                      onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description (optional)</label>
                    <Textarea
                      placeholder="Enter topic description"
                      value={newTopic.description}
                      onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Topic Icon (optional)</label>
                    <ImageUploader
                      value={newTopic.icon_url}
                      onUploadComplete={(url) => setNewTopic({ ...newTopic, icon_url: url })}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button color="primary" onPress={handleAddTopic}>
                  <Check className="h-4 w-4 mr-1" /> Save Topic
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        scrollBehavior="inside"
        isOpen={!!editingQuestion}
        onOpenChange={(o) => !o && setEditingQuestion(null)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) =>
            editingQuestion && (
              <>
                <ModalHeader>Edit Question</ModalHeader>
                <ModalBody>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">File Type</label>
                      <Select
                        aria-label="File Type"
                        selectedKeys={
                          editingQuestion.file_type
                            ? new Set([editingQuestion.file_type])
                            : new Set()
                        }
                        onSelectionChange={(keys) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            file_type: Array.from(keys)[0] || "",
                            file_url: "",
                          })
                        }
                      >
                        <SelectItem key="text" value="text">Text</SelectItem>
                        <SelectItem key="html" value="html">HTML</SelectItem>
                        <SelectItem key="image" value="image">Image</SelectItem>
                        <SelectItem key="pdf" value="pdf">PDF</SelectItem>
                        <SelectItem key="docx" value="docx">DOCX</SelectItem>
                        <SelectItem key="xls" value="xls">XLS</SelectItem>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Question</label>
                      <Textarea
                        value={editingQuestion.question}
                        onChange={(e) =>
                          setEditingQuestion({ ...editingQuestion, question: e.target.value })
                        }
                        minRows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Answer Type</label>
                      <RadioGroup
                        value={editingQuestion.answer_type}
                        onValueChange={(v) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            answer_type: v,
                            answer: v === "mcq" ? "" : editingQuestion.answer,
                            options:
                              v === "mcq"
                                ? editingQuestion.options?.length > 0
                                  ? editingQuestion.options
                                  : [{ text: "", is_correct: false }, { text: "", is_correct: false }]
                                : [],
                          })
                        }
                        orientation="horizontal"
                      >
                        <Radio value="answer_based">Answer Based</Radio>
                        <Radio value="mcq">MCQ</Radio>
                      </RadioGroup>
                    </div>
                    {editingQuestion.answer_type === "answer_based" && editingQuestion.file_type === "text" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Answer</label>
                        <Textarea
                          value={editingQuestion.answer}
                          onChange={(e) =>
                            setEditingQuestion({ ...editingQuestion, answer: e.target.value })
                          }
                          minRows={3}
                        />
                      </div>
                    )}
                    {editingQuestion.answer_type === "answer_based" && editingQuestion.file_type === "html" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Rich Text Answer</label>
                        <QuillWrapper
                          value={editingQuestion.answer}
                          onChange={(v) => setEditingQuestion({ ...editingQuestion, answer: v })}
                        />
                      </div>
                    )}
                    {editingQuestion.answer_type === "mcq" && (
                      <div>
                        <label className="block text-sm font-medium mb-2">MCQ Options</label>
                        <div className="space-y-3">
                          {editingQuestion.options?.map((option, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg">
                              <Checkbox
                                isSelected={option.is_correct}
                                onValueChange={(c) => updateMCQOption(idx, "is_correct", c, true)}
                              />
                              <Input
                                placeholder={`Option ${idx + 1}`}
                                value={option.text}
                                onChange={(e) => updateMCQOption(idx, "text", e.target.value, true)}
                                className="flex-1"
                              />
                              {editingQuestion.options.length > 2 && (
                                <Button
                                  isIconOnly size="sm" color="danger" variant="light"
                                  onPress={() => removeMCQOption(idx, true)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button size="sm" variant="bordered" onPress={() => addMCQOption(true)}
                                  startContent={<Plus className="h-4 w-4" />}>
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                    {editingQuestion.file_type === "image" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Image</label>
                        <ImageUploader
                          value={editingQuestion.file_url}
                          onUploadComplete={(url) => setEditingQuestion({ ...editingQuestion, file_url: url })}
                        />
                      </div>
                    )}
                    {["pdf", "docx", "xls"].includes(editingQuestion.file_type) && (
                      <div>
                        <label className="block text-sm font-medium mb-1">File</label>
                        <FileUploader
                          data={{ file: editingQuestion.file_url }}
                          onUploadComplete={(url) => setEditingQuestion({ ...editingQuestion, file_url: url })}
                        />
                      </div>
                    )}
                    {editingQuestion.file_type !== "text" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">File URL (optional)</label>
                        <Input
                          placeholder="Enter file URL"
                          value={editingQuestion.file_url || ""}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, file_url: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Year</label>
                        <Input
                          type="number"
                          value={editingQuestion.year?.toString()}
                          onChange={(e) =>
                            setEditingQuestion({ ...editingQuestion, year: Number.parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                        <Select
                          aria-label="Difficulty"
                          selectedKeys={
                            editingQuestion.difficulty
                              ? new Set([editingQuestion.difficulty])
                              : new Set()
                          }
                          onSelectionChange={(keys) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              difficulty: Array.from(keys)[0] || "",
                            })
                          }
                        >
                          <SelectItem key="easy" value="easy">Easy</SelectItem>
                          <SelectItem key="medium" value="medium">Medium</SelectItem>
                          <SelectItem key="hard" value="hard">Hard</SelectItem>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Topics</label>
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                        {topics.map((topic) => (
                          <Chip
                            key={topic.id}
                            color={selectedTopics.includes(topic.id) ? "primary" : "default"}
                            variant={selectedTopics.includes(topic.id) ? "solid" : "bordered"}
                            className="cursor-pointer"
                            onClick={() => toggleTopicSelection(topic.id)}
                          >
                            {topic.name}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Explanation</label>
                      <QuillWrapper
                        value={editingQuestion.explanation || ""}
                        onChange={(v) => setEditingQuestion({ ...editingQuestion, explanation: v })}
                      />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button color="primary" onPress={handleUpdateQuestion}>
                    <Check className="h-4 w-4 mr-1" /> Update
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Deletion</ModalHeader>
              <ModalBody>
                <p>Are you sure? This cannot be undone.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancel</Button>
                <Button
                  color="danger"
                  onPress={() => questionToDelete && handleDeleteQuestion(questionToDelete)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Explanation modal (kept for backwards-compat) */}
      <Modal scrollBehavior="inside" isOpen={explanationModalOpen} onOpenChange={setExplanationModalOpen} size="3xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Info className="h-5 w-5" /> Explanation
              </ModalHeader>
              <ModalBody>
                {currentExplanation ? (
                  <div className="prose prose-sm max-w-none"
                       dangerouslySetInnerHTML={{ __html: currentExplanation }} />
                ) : (
                  <p className="text-center text-gray-500 py-8">No explanation available.</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Close</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SHELF — exam picker
// ════════════════════════════════════════════════════════════════
function Shelf({ exams, meta, onPick }) {
  const available = exams.filter((e) => e.status === "active");
  const comingSoon = exams.filter((e) => e.status !== "active");
  const totalQs = available.reduce((a, e) => a + (meta[e.id]?.count || 0), 0);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 28px 80px", textAlign: "left" }}>
      <div style={{ marginBottom: 8, textAlign: "left" }}>
        <div style={{ ...eyebrow, marginBottom: 18 }}>PYQ Papers · Practice bank</div>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(38px, 5.2vw, 54px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            textAlign: "left",
          }}
        >
          Every past paper, every <span className="ds-grad-text" style={serif}>exam</span>.
        </h1>
        <p style={{ margin: "18px 0 0", fontSize: 16.5, lineHeight: 1.55, color: "var(--c-text-secondary)", maxWidth: "62ch", textAlign: "left" }}>
          Browse questions by year, topic, or difficulty. Open an exam to drill into its bank.
          {comingSoon.length > 0 && (
            <span style={{ display: "block", marginTop: 4, fontSize: 14.5, color: "var(--c-text-tertiary)" }}>
              More exams are being added — typed up and tagged.
            </span>
          )}
        </p>
      </div>

      {available.length > 0 && (
        <>
          <SectionHead title="Available" right={`${available.length} exam · ${totalQs.toLocaleString()} questions`} />
          <div style={grid}>
            {available.map((e) => (
              <ExamCard key={e.id} exam={e} meta={meta[e.id]} onClick={() => onPick(e)} />
            ))}
          </div>
        </>
      )}

      {comingSoon.length > 0 && (
        <>
          <SectionHead title="Coming soon" right={`${comingSoon.length} exams · being added`} muted />
          <div style={grid}>
            {comingSoon.map((e) => (
              <ExamCard key={e.id} exam={e} meta={meta[e.id]} onClick={() => {}} soon />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHead({ title, right, muted }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        margin: "56px 0 24px",
        paddingBottom: 14,
        borderBottom: "1px solid var(--c-border-faint)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.005em", color: muted ? "var(--c-text-tertiary)" : "var(--c-text-primary)" }}>
        {title}
      </h2>
      {right && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: "var(--c-text-tertiary)" }}>
          {right}
        </span>
      )}
    </div>
  );
}

function ExamCard({ exam, meta, onClick, soon }) {
  const accent = ACCENT_MAP[exam.accent] || ACCENT_MAP.amber;
  const yrRange =
    meta && meta.minYear && meta.maxYear ? `${meta.minYear}—${meta.maxYear}` : "—";

  return (
    <div
      onClick={onClick}
      style={{
        background: soon ? "var(--c-bg-elev)" : "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: 14,
        padding: 22,
        cursor: soon ? "default" : "pointer",
        transition: "transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (soon) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "var(--c-border-soft)";
        e.currentTarget.style.boxShadow = "0 10px 24px -16px rgba(20,19,15,0.14)";
        const bar = e.currentTarget.querySelector("[data-accent]");
        if (bar) bar.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        if (soon) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--c-border-faint)";
        e.currentTarget.style.boxShadow = "none";
        const bar = e.currentTarget.querySelector("[data-accent]");
        if (bar) bar.style.opacity = "0";
      }}
    >
      <div data-accent style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: accent.c, opacity: 0, transition: "opacity 0.16s ease" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div>
          {exam.org && (
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: soon ? "var(--c-text-tertiary)" : accent.c, marginBottom: 4 }}>
              {exam.org}
            </div>
          )}
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.012em", color: soon ? "var(--c-text-secondary)" : "var(--c-text-primary)" }}>
            {exam.name}
          </h3>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 999,
            border: "1px solid",
            color: soon ? "var(--c-text-tertiary)" : accent.c,
            background: soon ? "var(--c-bg-elev)" : accent.soft,
            borderColor: soon ? "var(--c-border-faint)" : accent.c,
            whiteSpace: "nowrap",
          }}
        >
          {soon ? "Coming soon" : "Active"}
        </span>
      </div>

      {exam.tagline && (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--c-text-secondary)", lineHeight: 1.5 }}>
          {exam.tagline}
        </p>
      )}

      {!soon ? (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--c-text-tertiary)", marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span><b style={{ color: "var(--c-text-primary)" }}>{(meta?.count || 0).toLocaleString()}</b> questions</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor", opacity: 0.4 }} />
          <span><b style={{ color: "var(--c-text-primary)" }}>{yrRange}</b></span>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", marginBottom: 12, lineHeight: 1.5 }}>
          Past papers are being digitised. Expected sections shown below.
        </div>
      )}

      {exam.sections && exam.sections.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          {exam.sections.map((s) => (
            <span key={s} style={{ fontSize: 10.5, fontWeight: 500, color: "var(--c-text-tertiary)", background: "var(--c-bg-elev)", border: "1px solid var(--c-border-faint)", borderRadius: 4, padding: "2px 7px" }}>
              {s}
            </span>
          ))}
        </div>
      )}

      <div style={{ paddingTop: 12, borderTop: "1px dashed var(--c-border-faint)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {soon ? (
          <>
            <span style={{ fontSize: 11.5, color: "var(--c-text-tertiary)", fontStyle: "italic" }}>Not yet available</span>
            <button
              onClick={(e) => e.stopPropagation()}
              style={{ background: "transparent", border: "1px solid var(--c-border-soft)", color: "var(--c-text-secondary)", padding: "5px 11px", borderRadius: 6, fontFamily: "inherit", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}
            >
              Notify me
            </button>
          </>
        ) : (
          <>
            <span />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--c-text-primary)" }}>
              Open library →
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// LIBRARY — filter bar + list + reader
// ════════════════════════════════════════════════════════════════
function Library({
  exam,
  questions,
  topics,
  years,
  loading,
  isAdmin,
  selectedQuestion,
  setSelectedQuestion,
  yearFilter, setYearFilter,
  topicFilter, setTopicFilter,
  difficultyFilter, setDifficultyFilter,
  typeFilter, setTypeFilter,
  searchQuery, setSearchQuery,
  practiceMode, setPracticeMode,
  pickedOptionIdx, setPickedOptionIdx,
  revealed, setRevealed,
  showExplanationSection, setShowExplanationSection,
  onBackToShelf,
  onSearchSubmit,
  onAddQuestion,
  onAddTopic,
  onEditQuestion,
  onDeleteQuestion,
  onShowExplanation,
}) {
  const accent = ACCENT_MAP[exam.accent] || ACCENT_MAP.amber;

  // Auto-select first question if none selected and list non-empty
  useEffect(() => {
    if (!selectedQuestion && questions.length > 0) {
      setSelectedQuestion(questions[0]);
      return;
    }
    if (selectedQuestion) {
      // Re-bind to the freshly fetched row (hydrated topics + DB-normalized
      // fields) so the reader never shows a stale copy after an edit/refetch.
      const fresh = questions.find((q) => sameId(q.id, selectedQuestion.id));
      if (fresh && fresh !== selectedQuestion) setSelectedQuestion(fresh);
      else if (!fresh) setSelectedQuestion(questions[0] || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: FONT }}>
      {/* Top header */}
      <div style={{ borderBottom: "1px solid var(--c-border-faint)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--c-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            <button
              onClick={onBackToShelf}
              style={{ background: "transparent", border: "none", color: "var(--c-text-tertiary)", fontFamily: "inherit", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}
            >
              ← PYQ shelf
            </button>
            <span style={{ margin: "0 6px" }}>·</span>
            <span style={{ color: accent.c }}>{exam.org || "Practice bank"}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.014em" }}>
            {exam.name}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setPracticeMode(!practiceMode)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 12px", borderRadius: 8,
              border: practiceMode ? "none" : "1px solid var(--c-border-faint)",
              background: practiceMode ? "var(--c-text-primary)" : "transparent",
              color: practiceMode ? "var(--c-bg)" : "var(--c-text-secondary)",
              fontFamily: "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: practiceMode ? accent.c : "currentColor", opacity: practiceMode ? 1 : 0.4 }} />
            Practice mode
          </button>
          {isAdmin && (
            <>
              <button onClick={onAddTopic} style={adminBtn}>
                <Plus size={12} /> Topic
              </button>
              <button onClick={onAddQuestion} style={{ ...adminBtn, background: "var(--c-text-primary)", color: "var(--c-bg)", borderColor: "var(--c-text-primary)" }}>
                <Plus size={12} /> Question
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        years={years}
        topics={topics}
        yearFilter={yearFilter} setYearFilter={setYearFilter}
        topicFilter={topicFilter} setTopicFilter={setTopicFilter}
        difficultyFilter={difficultyFilter} setDifficultyFilter={setDifficultyFilter}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        onSearchSubmit={onSearchSubmit}
      />

      {/* Body — list + reader as card panels, side by side with gap */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, gap: 18, padding: "18px 28px 24px" }}>
        {/* Left: question list panel */}
        <div
          style={{
            flex: "0 0 340px",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--c-border-faint)",
              fontSize: 12,
              color: "var(--c-text-tertiary)",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <span>Showing <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>{questions.length}</b> question{questions.length === 1 ? "" : "s"}</span>
            <span style={{ fontSize: 11 }}>Oldest first</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--c-text-tertiary)" }}>Loading…</div>
            ) : questions.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--c-text-tertiary)" }}>
                No questions match these filters.
              </div>
            ) : (
              questions.map((q, i) => (
                <QuestionListItem
                  key={q.id}
                  q={q}
                  idx={i + 1}
                  active={selectedQuestion?.id === q.id}
                  onClick={() => setSelectedQuestion(q)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: reader panel */}
        <div
          style={{
            flex: 1,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {selectedQuestion ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "30px 36px 22px" }}>
              <QuestionReader
                q={selectedQuestion}
                accent={accent}
                practiceMode={practiceMode}
                pickedOptionIdx={pickedOptionIdx}
                setPickedOptionIdx={setPickedOptionIdx}
                revealed={revealed}
                setRevealed={setRevealed}
                isAdmin={isAdmin}
                showExplanationSection={showExplanationSection}
                setShowExplanationSection={setShowExplanationSection}
                onEdit={() => onEditQuestion(selectedQuestion)}
                onDelete={() => onDeleteQuestion(selectedQuestion.id)}
                total={questions.length}
                indexInList={questions.findIndex((q) => q.id === selectedQuestion.id) + 1}
                onPrev={() => {
                  const idx = questions.findIndex((q) => q.id === selectedQuestion.id);
                  if (idx > 0) setSelectedQuestion(questions[idx - 1]);
                }}
                onNext={() => {
                  const idx = questions.findIndex((q) => q.id === selectedQuestion.id);
                  if (idx < questions.length - 1) setSelectedQuestion(questions[idx + 1]);
                }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, padding: 60, textAlign: "center", color: "var(--c-text-tertiary)" }}>
              Pick a question on the left to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBar({
  years, topics,
  yearFilter, setYearFilter,
  topicFilter, setTopicFilter,
  difficultyFilter, setDifficultyFilter,
  typeFilter, setTypeFilter,
  searchQuery, setSearchQuery,
  onSearchSubmit,
}) {
  const anyActive =
    yearFilter != null || topicFilter != null ||
    difficultyFilter != null || typeFilter != null;

  const clearAll = () => {
    setYearFilter(null);
    setTopicFilter(null);
    setDifficultyFilter(null);
    setTypeFilter(null);
  };

  return (
    <div style={{ padding: "12px 28px 12px", borderBottom: "1px solid var(--c-border-faint)" }}>
      <div
        style={{
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
          padding: "8px 10px",
          border: "1px solid var(--c-border-faint)",
          borderRadius: 12,
          background: "var(--c-bg-elev)",
        }}
      >
        <FChip
          label="Year"
          value={yearFilter}
          options={years.map((y) => ({ id: y, label: String(y) }))}
          onSelect={(v) => setYearFilter(v)}
        />
        <FChip
          label="Topic"
          value={topicFilter}
          options={topics.map((t) => ({ id: t.id, label: t.name }))}
          onSelect={(v) => setTopicFilter(v)}
        />
        <FChip
          label="Difficulty"
          value={difficultyFilter}
          options={[
            { id: "easy", label: "Easy" },
            { id: "medium", label: "Medium" },
            { id: "hard", label: "Hard" },
          ]}
          onSelect={(v) => setDifficultyFilter(v)}
        />
        <FChip
          label="Type"
          value={typeFilter}
          options={[
            { id: "mcq", label: "MCQ" },
            { id: "answer_based", label: "Answer-based" },
          ]}
          onSelect={(v) => setTypeFilter(v)}
        />

        {anyActive && (
          <span
            onClick={clearAll}
            style={{
              fontSize: 12, color: "var(--c-text-tertiary)", cursor: "pointer", fontWeight: 500,
              padding: "0 10px", borderLeft: "1px dashed var(--c-border-soft)", marginLeft: 2,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--c-danger, #B91C1C)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--c-text-tertiary)"}
          >
            Clear filters
          </span>
        )}

        <div
          style={{
            marginLeft: "auto",
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--c-bg)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 8, padding: "7px 12px",
            fontSize: 13, color: "var(--c-text-tertiary)", minWidth: 260,
          }}
        >
          <span style={{ color: "var(--c-text-tertiary)" }}>⌕</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearchSubmit(); }}
            placeholder="Search questions…"
            style={{ background: "transparent", border: "none", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--c-text-primary)", flex: 1, minWidth: 0 }}
          />
          <kbd
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              background: "var(--c-bg-elev)", border: "1px solid var(--c-border-faint)",
              borderRadius: 4, padding: "1px 5px", color: "var(--c-text-tertiary)",
            }}
          >
            ↵
          </kbd>
        </div>
      </div>
    </div>
  );
}

function FChip({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value != null ? options.find((o) => o.id === value)?.label : null;
  const active = value != null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: active ? "var(--c-brand-glow, #efeaff)" : "transparent",
          border: active ? "1px solid var(--c-brand-primary, #6b4ed8)" : "1px solid transparent",
          color: active ? "var(--c-brand-primary, #6b4ed8)" : "var(--c-text-secondary)",
          padding: "7px 12px", borderRadius: 8,
          fontFamily: "inherit", fontSize: 13, fontWeight: 500,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          transition: "background 0.12s ease, border-color 0.12s ease",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--c-bg)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
      >
        <span>{label}</span>
        {active && selectedLabel && (
          <span
            title={selectedLabel}
            style={{
              background: "var(--c-brand-primary, #6b4ed8)", color: "#fff",
              fontSize: 11, fontWeight: 600,
              padding: "1px 7px", borderRadius: 999,
              fontFamily: "'JetBrains Mono', monospace",
              maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {String(selectedLabel).length > 10 ? String(selectedLabel).slice(0, 10) + "…" : selectedLabel}
          </span>
        )}
        <span style={{ fontSize: 10, color: active ? "var(--c-brand-primary, #6b4ed8)" : "var(--c-text-tertiary)", marginLeft: 2 }}>
          ▾
        </span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
          <div
            style={{
              position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 20,
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 10,
              padding: 6,
              minWidth: 180,
              boxShadow: "0 12px 28px -8px rgba(20,19,15,0.18)",
              maxHeight: 320, overflowY: "auto",
            }}
          >
            <div
              onClick={() => { onSelect(null); setOpen(false); }}
              style={{ padding: "8px 12px", borderRadius: 6, fontSize: 13, color: "var(--c-text-tertiary)", cursor: "pointer", fontStyle: value == null ? "normal" : "italic" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--c-bg-elev)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {value == null ? "✓ Any" : "Clear selection"}
            </div>
            {options.map((o) => (
              <div
                key={o.id}
                onClick={() => { onSelect(o.id); setOpen(false); }}
                style={{
                  padding: "8px 12px", borderRadius: 6, fontSize: 13,
                  color: value === o.id ? "var(--c-brand-primary, #6b4ed8)" : "var(--c-text-primary)",
                  background: value === o.id ? "var(--c-brand-glow, #efeaff)" : "transparent",
                  cursor: "pointer", fontWeight: value === o.id ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (value !== o.id) e.currentTarget.style.background = "var(--c-bg-elev)"; }}
                onMouseLeave={(e) => { if (value !== o.id) e.currentTarget.style.background = "transparent"; }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function QuestionListItem({ q, idx, active, onClick }) {
  const diff = q.difficulty?.toLowerCase();
  const diffColor =
    diff === "easy" ? "var(--c-success, #15803D)" :
    diff === "hard" ? "var(--c-danger, #B91C1C)" :
    "var(--c-warning, #B45309)";

  const topicLabel = q.topics && q.topics.length > 0 ? q.topics[0].name : null;
  const typeLabel = q.answer_type === "mcq" ? "MCQ" : null;

  // Many image-based questions have a "Comment your answer" placeholder as the
  // question text. When we detect that, drop the preview row entirely and let
  // the metadata line (difficulty · year · topic · type) carry the row alone.
  const qt = (q.question || "").trim();
  const isPlaceholder = /^comment your answer\.?$/i.test(qt) || !qt;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 22px",
        borderBottom: "1px solid var(--c-border-faint)",
        cursor: "pointer",
        display: "grid", gridTemplateColumns: "32px 1fr", gap: 12,
        alignItems: "start",
        position: "relative",
        background: active ? "var(--c-bg-elev)" : "transparent",
        transition: "background 0.1s ease",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--c-bg-elev)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {active && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "var(--c-brand-primary)" }} />}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: active ? "var(--c-brand-primary)" : "var(--c-text-tertiary)", fontWeight: active ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>
        {String(idx).padStart(3, "0")}
      </div>
      <div>
        {!isPlaceholder && (
          <div
            style={{
              fontSize: 13,
              color: "var(--c-text-primary)",
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {qt}
          </div>
        )}
        <div style={{ marginTop: isPlaceholder ? 0 : 6, fontSize: 11, color: "var(--c-text-tertiary)", display: "flex", gap: 8, alignItems: "center" }}>
          {diff && <span style={{ color: diffColor, fontWeight: 600, textTransform: "capitalize" }}>{diff}</span>}
          {q.year && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{q.year}</span>
            </>
          )}
          {topicLabel && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{topicLabel}</span>
            </>
          )}
          {typeLabel && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{typeLabel}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionReader({
  q, accent, practiceMode, pickedOptionIdx, setPickedOptionIdx,
  revealed, setRevealed,
  isAdmin, showExplanationSection, setShowExplanationSection,
  onEdit, onDelete,
  total, indexInList, onPrev, onNext,
}) {
  // Per-question bookmark, persisted in localStorage so it survives reloads.
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("pyq_bookmarks") || "[]";
      const arr = JSON.parse(raw);
      setBookmarked(Array.isArray(arr) && arr.includes(q.id));
    } catch { setBookmarked(false); }
  }, [q.id]);
  const toggleBookmark = () => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("pyq_bookmarks") || "[]";
      let arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
      const has = arr.includes(q.id);
      const next = has ? arr.filter((x) => x !== q.id) : [...arr, q.id];
      window.localStorage.setItem("pyq_bookmarks", JSON.stringify(next));
      setBookmarked(!has);
    } catch {}
  };

  // Keyboard shortcuts — Space reveals, J = prev, K = next.
  // Ignore when the user is typing in any input/textarea.
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setRevealed(true);
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPrev, onNext, setRevealed]);

  const options = useMemo(() => {
    if (q.answer_type !== "mcq" || !q.options) return null;
    try {
      return typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    } catch { return null; }
  }, [q]);

  const correctIdx = options?.findIndex((o) => o.is_correct);
  const diff = q.difficulty?.toLowerCase();
  const diffColor =
    diff === "easy" ? "var(--c-success, #15803D)" :
    diff === "hard" ? "var(--c-danger, #B91C1C)" :
    "var(--c-warning, #B45309)";

  // Difficulty chip styling — soft-tinted backgrounds keyed off level
  const diffChipStyle =
    diff === "easy"   ? { color: "var(--c-success, #15803D)", background: "rgba(21,128,61,0.08)",  borderColor: "rgba(21,128,61,0.28)"  } :
    diff === "hard"   ? { color: "var(--c-danger,  #B91C1C)", background: "rgba(185,28,28,0.08)",  borderColor: "rgba(185,28,28,0.28)"  } :
                        { color: "var(--c-warning, #B45309)", background: "rgba(180,83,9,0.08)",   borderColor: "rgba(180,83,9,0.28)"   };

  return (
    <div style={{ textAlign: "left", maxWidth: 820 }}>
      {/* Meta chip row — anchored to top, left-aligned */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {q.year != null && (
            <span style={{
              ...chipStyle,
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
              color: "var(--c-text-primary)",
            }}>
              {q.year}
            </span>
          )}
          {diff && (
            <span style={{
              ...chipStyle,
              ...diffChipStyle,
              textTransform: "capitalize",
              fontWeight: 600,
            }}>
              {diff}
            </span>
          )}
          {q.topics?.map((t) => (
            <span key={t.id} style={{
              ...chipStyle,
              color: "var(--c-brand-primary, #6b4ed8)",
              background: "var(--c-brand-glow, #efeaff)",
              borderColor: "rgba(107,78,216,0.28)",
            }}>
              {t.name}
            </span>
          ))}
          <span style={chipStyle}>
            QA · {q.answer_type === "mcq" ? "MCQ" : "SA"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--c-text-tertiary)" }}>
            Q <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>{String(indexInList).padStart(3, "0")}</b> · {total}
          </span>
          {isAdmin && (
            <>
              <button onClick={onEdit} style={icBtn} title="Edit"><Pencil size={13} /></button>
              <button onClick={onDelete} style={icBtn} title="Delete"><Trash2 size={13} /></button>
            </>
          )}
        </div>
      </div>

      {/* Question stem — anchored top-left, never centered.
          Many image-based questions store a placeholder like "Comment your
          answer" in the question text — the real question is the image.
          When we detect that, hide the placeholder so the image stands alone. */}
      {(() => {
        const qt = (q.question || "").trim();
        const isPlaceholder = /^comment your answer\.?$/i.test(qt);
        if (!qt || isPlaceholder) return null;
        return (
          <div
            style={{
              fontSize: 19,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              lineHeight: 1.55,
              color: "var(--c-text-primary)",
              marginBottom: 22,
              maxWidth: "68ch",
              textAlign: "left",
            }}
          >
            {qt}
          </div>
        );
      })()}

      {/* Image stem — render large, allow click-to-open in new tab */}
      {q.file_type === "image" && q.file_url && (
        <div style={{ marginBottom: 28 }}>
          <a
            href={q.file_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open full size"
            style={{ display: "block", lineHeight: 0 }}
          >
            <img
              src={q.file_url}
              alt="Question"
              style={{
                maxWidth: "100%",
                width: "auto",
                maxHeight: 520,
                borderRadius: 12,
                border: "1px solid var(--c-border-faint)",
                background: "#fff",
                padding: 14,
                display: "block",
                objectFit: "contain",
              }}
            />
          </a>
        </div>
      )}

      {/* Downloadable file stem (PDF/DOCX/XLS) */}
      {q.file_url && ["pdf", "docx", "xls"].includes(q.file_type) && (
        <div style={{ marginBottom: 28 }}>
          <a
            href={q.file_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              background: "var(--c-bg-elev)", border: "1px solid var(--c-border-soft)",
              color: "var(--c-text-primary)", textDecoration: "none",
              fontSize: 12.5, fontWeight: 600,
            }}
          >
            <Download size={13} /> Download {q.file_type?.toUpperCase()}
          </a>
        </div>
      )}

      {/* MCQ options */}
      {q.answer_type === "mcq" && options && (
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "56ch", marginBottom: 18, border: "1px solid var(--c-border-faint)", borderRadius: 10, overflow: "hidden" }}>
          {options.map((o, i) => {
            const isPicked = pickedOptionIdx === i;
            const showVerdict = revealed || !practiceMode;
            const isCorrect = i === correctIdx;
            const isWrong = isPicked && !isCorrect && showVerdict;
            const showCorrect = isCorrect && showVerdict;
            return (
              <div
                key={i}
                onClick={() => {
                  if (practiceMode) {
                    setPickedOptionIdx(i);
                    setRevealed(true);
                  } else {
                    setPickedOptionIdx(i);
                  }
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 18px",
                  borderBottom: "1px solid var(--c-border-faint)",
                  cursor: "pointer",
                  background: showCorrect ? "linear-gradient(to right, rgba(21,128,61,0.08), transparent 80%)" :
                              isWrong ? "linear-gradient(to right, rgba(185,28,28,0.08), transparent 80%)" : "transparent",
                  borderLeft: showCorrect ? "2px solid var(--c-success, #15803D)" :
                              isWrong ? "2px solid var(--c-danger, #B91C1C)" : "2px solid transparent",
                  paddingLeft: showCorrect || isWrong ? 16 : 18,
                  transition: "background 0.1s ease",
                }}
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, width: 20,
                  color: showCorrect ? "var(--c-success, #15803D)" :
                         isWrong ? "var(--c-danger, #B91C1C)" :
                         isPicked ? accent.c : "var(--c-text-tertiary)",
                }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <div style={{ fontSize: 16, color: "var(--c-text-primary)", lineHeight: 1.5, flex: 1, fontWeight: isPicked ? 500 : 400 }}>
                  {o.text}
                </div>
                {showCorrect && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-success, #15803D)" }}>
                    Correct
                  </span>
                )}
                {isWrong && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-danger, #B91C1C)" }}>
                    Wrong
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MCQ reveal-bar — gives users a way to see solution without picking */}
      {q.answer_type === "mcq" && options && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 14,
            marginBottom: 22,
            paddingTop: 12,
            borderTop: "1px dashed var(--c-border-faint)",
            flexWrap: "wrap",
          }}
        >
          {!revealed && (
            <button
              onClick={() => setRevealed(true)}
              style={{
                fontSize: 13, fontWeight: 600, color: "#fff",
                background: "var(--c-text-primary)", border: 0, borderRadius: 8,
                padding: "9px 16px", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Show answer &amp; solution
            </button>
          )}
          <span style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
            {revealed
              ? <>Press <kbd style={kbdStyle}>K</kbd> for next · <kbd style={kbdStyle}>J</kbd> for previous</>
              : <>or press <kbd style={kbdStyle}>Space</kbd> to reveal · <kbd style={kbdStyle}>J</kbd>/<kbd style={kbdStyle}>K</kbd> to navigate</>
            }
          </span>
        </div>
      )}

      {/* MCQ answer panel — always shows on reveal, even when explanation is empty.
          This guarantees students see a substantial "answer" surface, not just
          a green-highlighted option. */}
      {q.answer_type === "mcq" && options && revealed && correctIdx != null && correctIdx >= 0 && (
        <div
          className="pyq-rich-panel"
          style={{
            borderLeft: "2px solid var(--c-success, #15803D)",
            padding: "12px 0 12px 22px",
            maxWidth: 760,
            background: "linear-gradient(to right, rgba(21,128,61,0.04), transparent 60%)",
            marginLeft: -2,
            marginBottom: 22,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-success, #15803D)", marginBottom: 8 }}>
            Answer
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--c-text-primary)", marginBottom: 2 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
              background: "var(--c-success, #15803D)", color: "#fff",
              padding: "2px 8px", borderRadius: 5, marginRight: 10, verticalAlign: 2,
            }}>
              {String.fromCharCode(65 + correctIdx)}
            </span>
            {options[correctIdx]?.text}
          </div>
          {!q.explanation && (
            <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", marginTop: 8, fontStyle: "italic" }}>
              Worked solution not available for this question yet.
            </div>
          )}
        </div>
      )}

      {/* Answer-based: SA input + reveal */}
      {q.answer_type !== "mcq" && q.answer && (
        <div style={{ marginBottom: 22 }}>
          {!revealed && practiceMode && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px",
                border: "1px dashed var(--c-border-soft)",
                borderRadius: 10,
                background: "var(--c-bg-elev)",
                maxWidth: 520,
                marginBottom: 14,
              }}
            >
              <input
                placeholder="Type your answer…"
                onKeyDown={(e) => { if (e.key === "Enter") setRevealed(true); }}
                style={{
                  flex: 1, background: "transparent", border: 0, outline: 0,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 15,
                  color: "var(--c-text-primary)",
                }}
              />
              <span
                onClick={() => setRevealed(true)}
                style={{
                  fontSize: 12, fontWeight: 600,
                  color: "var(--c-brand-primary, #6b4ed8)",
                  background: "var(--c-brand-glow, #efeaff)",
                  padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Check ↵
              </span>
            </div>
          )}

          {revealed ? (
            <div
              className="pyq-rich-panel"
              style={{
                borderLeft: "2px solid var(--c-success, #15803D)",
                padding: "12px 0 4px 22px",
                maxWidth: 760,
                background: "linear-gradient(to right, rgba(21,128,61,0.04), transparent 60%)",
                marginLeft: -2,
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-success, #15803D)", marginBottom: 8 }}>
                Answer
              </div>
              <div
                className="pyq-rich-body"
                style={{ fontSize: 15, lineHeight: 1.65, color: "var(--c-text-primary)" }}
                dangerouslySetInnerHTML={{ __html: q.answer }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => setRevealed(true)}
                style={{
                  padding: "9px 16px", borderRadius: 8,
                  background: "var(--c-text-primary)", color: "var(--c-bg)",
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13, fontWeight: 600,
                }}
              >
                Show answer &amp; solution
              </button>
              <span style={{ fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
                or press <kbd style={kbdStyle}>Space</kbd> to reveal · <kbd style={kbdStyle}>J</kbd>/<kbd style={kbdStyle}>K</kbd> to navigate
              </span>
            </div>
          )}
        </div>
      )}

      {/* Explanation — can contain video iframes + images */}
      {q.explanation && (revealed || !practiceMode) && (
        <div
          className="pyq-rich-panel"
          style={{ borderLeft: "2px solid var(--c-purple, #6D28D9)", padding: "4px 0 4px 22px", marginBottom: 36, maxWidth: 760 }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-purple, #6D28D9)", marginBottom: 10 }}>
            Solution
          </div>
          <div
            className="pyq-rich-body"
            style={{ fontSize: 15, lineHeight: 1.7, color: "var(--c-text-primary)" }}
            dangerouslySetInnerHTML={{ __html: q.explanation }}
          />
        </div>
      )}

      {/* Global styling for embedded videos / images inside Answer + Solution panels */}
      <style jsx global>{`
        .pyq-rich-body iframe {
          width: 100%;
          aspect-ratio: 16 / 9;
          max-width: 720px;
          height: auto;
          border-radius: 10px;
          border: 1px solid var(--c-border-faint);
          background: #000;
          margin: 14px 0;
          display: block;
        }
        .pyq-rich-body video {
          width: 100%;
          max-width: 720px;
          border-radius: 10px;
          border: 1px solid var(--c-border-faint);
          background: #000;
          margin: 14px 0;
          display: block;
        }
        .pyq-rich-body img {
          max-width: 100%;
          height: auto;
          max-height: 520px;
          border-radius: 10px;
          border: 1px solid var(--c-border-faint);
          background: var(--c-bg-elev);
          margin: 14px 0;
          display: block;
          object-fit: contain;
        }
        .pyq-rich-body p { margin: 0 0 12px; }
        .pyq-rich-body ul, .pyq-rich-body ol { margin: 0 0 12px; padding-left: 22px; }
        .pyq-rich-body li { margin-bottom: 4px; }
        .pyq-rich-body strong { font-weight: 600; }
        .pyq-rich-body em { font-style: italic; }
        .pyq-rich-body code {
          background: var(--c-bg-elev);
          padding: 1px 6px;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
        .pyq-rich-body a {
          color: var(--c-brand-primary);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>

      {/* Footer dock — pager + small action buttons */}
      <div
        style={{
          marginTop: 40, paddingTop: 16,
          borderTop: "1px solid var(--c-border-faint)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 12, flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "var(--c-text-tertiary)" }}>
            Q <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>{String(indexInList).padStart(3, "0")}</b> / <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>{total}</b>
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={{ ...dockIcon, color: bookmarked ? "var(--c-warning, #B45309)" : "var(--c-text-secondary)" }}
              title={bookmarked ? "Remove bookmark" : "Bookmark this question"}
              onClick={toggleBookmark}
            >{bookmarked ? "★" : "☆"}</button>
            <button
              style={dockIcon}
              title="Copy link to this question"
              onClick={() => {
                try {
                  if (typeof window !== "undefined" && navigator?.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                  }
                } catch {}
              }}
            >⎘</button>
            <button
              style={dockIcon}
              title="Report issue with this question"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open(
                    "https://wa.me/919999999999?text=" + encodeURIComponent(`Issue with PYQ question id ${q.id}`),
                    "_blank",
                  );
                }
              }}
            >⚐</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onPrev} disabled={indexInList <= 1} style={navBtn}>← Previous</button>
          <button onClick={onNext} disabled={indexInList >= total} style={{ ...navBtn, background: "var(--c-text-primary)", color: "var(--c-bg)", border: "none" }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Style tokens
// ════════════════════════════════════════════════════════════════
const eyebrow = {
  fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--c-text-tertiary)",
};
const serif = {
  fontFamily: "var(--font-accent)", fontStyle: "italic",
  color: "var(--c-brand-primary)", fontWeight: 400,
};
const grid = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
  gap: 14, marginBottom: 40,
};
const adminBtn = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "5px 11px", borderRadius: 6,
  background: "transparent",
  border: "1px solid var(--c-border-soft)",
  color: "var(--c-text-secondary)",
  fontFamily: "inherit", fontSize: 11.5, fontWeight: 500,
  cursor: "pointer", whiteSpace: "nowrap",
};
const icBtn = {
  width: 30, height: 30,
  background: "transparent",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 6,
  color: "var(--c-text-tertiary)",
  cursor: "pointer", display: "grid", placeItems: "center",
};
const navBtn = {
  background: "transparent", color: "var(--c-text-secondary)",
  border: "1px solid var(--c-border-soft)",
  padding: "7px 16px", borderRadius: 6,
  fontSize: 12.5, fontWeight: 500,
  cursor: "pointer", fontFamily: "inherit",
};
const chipStyle = {
  display: "inline-flex", alignItems: "center", gap: 4,
  fontSize: 12, fontWeight: 500,
  padding: "4px 10px", borderRadius: 999,
  border: "1px solid var(--c-border-faint)",
  background: "var(--c-bg-elev)",
  color: "var(--c-text-secondary)",
  whiteSpace: "nowrap",
  fontFamily: "inherit",
};
const dockIcon = {
  width: 32, height: 32, borderRadius: 8,
  border: "1px solid var(--c-border-faint)",
  background: "var(--c-bg-elev)",
  cursor: "pointer",
  color: "var(--c-text-secondary)",
  fontSize: 14,
  display: "inline-grid", placeItems: "center",
  fontFamily: "inherit",
};
const kbdStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  background: "var(--c-bg-elev)",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 4,
  padding: "1px 6px",
  color: "var(--c-text-secondary)",
  margin: "0 1px",
};
