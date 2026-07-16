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

  // ──────────────────────────────────────────────────────────────
  // NEW STATE — attempt persistence (pyq_attempts)
  // { [question_id: string]: 'right' | 'wrong' | 'seen' }
  // ──────────────────────────────────────────────────────────────
  const [attempts, setAttempts] = useState({});
  const [userEmail, setUserEmail] = useState(null);

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

  // Load the signed-in student's attempt history. This component receives no
  // user props, so we resolve the email via supabase.auth (same client the
  // rest of the file uses). Latest row per question_id wins — we order
  // ascending and let later rows overwrite earlier ones in the map.
  useEffect(() => {
    let cancelled = false;
    const loadAttempts = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const email = authData?.user?.email;
        if (!email || cancelled) return;
        setUserEmail(email);
        const { data } = await supabase
          .from("pyq_attempts")
          .select("question_id, result, created_at")
          .eq("user", email)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        const map = {};
        (data || []).forEach((r) => {
          if (r.question_id != null && r.result) map[String(r.question_id)] = r.result;
        });
        setAttempts(map);
      } catch {
        /* attempt history is a progressive enhancement — never break the UI */
      }
    };
    loadAttempts();
    return () => { cancelled = true; };
  }, []);

  // Persist one attempt. Optimistic local update first; 'seen' never
  // overwrites a prior right/wrong (locally or in the DB — we skip the insert
  // entirely so a stale 'seen' can't become the latest row).
  const recordAttempt = async (questionId, result) => {
    const key = String(questionId);
    const prior = attempts[key];
    if (result === "seen" && (prior === "right" || prior === "wrong")) return;
    setAttempts((m) => {
      const cur = m[key];
      if (result === "seen" && (cur === "right" || cur === "wrong")) return m;
      return { ...m, [key]: result };
    });
    try {
      if (!userEmail) return;
      await supabase
        .from("pyq_attempts")
        .insert({ user: userEmail, question_id: questionId, result });
    } catch {
      /* swallow — persistence failures must never break practice flow */
    }
  };

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
      .select("id, exam, year");
    const meta = {};
    (data || []).forEach((r) => {
      const k = r.exam || "ipmat_indore";
      if (!meta[k]) meta[k] = { count: 0, minYear: r.year, maxYear: r.year, ids: [] };
      meta[k].count++;
      meta[k].ids.push(String(r.id));
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
          attempts={attempts}
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
          attempts={attempts}
          recordAttempt={recordAttempt}
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
// SHELF — exam picker (student library)
// ════════════════════════════════════════════════════════════════
// Topic names arrive in mixed casing ("SURDS AND INDICES", "Time & Work") —
// normalise to Title Case for chips so the row reads calm and consistent.
export function titleCaseTopic(name) {
  const small = new Set(["and", "or", "of", "the", "in", "on", "a", "an", "to", "&"]);
  return String(name || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function Shelf({ exams, meta, attempts, onPick }) {
  const available = exams.filter((e) => e.status === "active");
  const comingSoon = exams.filter((e) => e.status !== "active");
  const totalQs = available.reduce((a, e) => a + (meta[e.id]?.count || 0), 0);

  let minYear = null;
  let maxYear = null;
  available.forEach((e) => {
    const m = meta[e.id];
    if (!m || m.minYear == null) return;
    minYear = minYear == null ? m.minYear : Math.min(minYear, m.minYear);
    maxYear = maxYear == null ? m.maxYear : Math.max(maxYear, m.maxYear);
  });

  const attemptedKeys = Object.keys(attempts || {});
  const rightCount = attemptedKeys.filter((k) => attempts[k] === "right").length;
  const revisitCount = attemptedKeys.length - rightCount;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 28px 80px", display: "flex", flexDirection: "column", textAlign: "left", width: "100%" }}>
      {/* Hero */}
      <div style={{ marginBottom: 34, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 16 }}>
          PYQ Papers
        </div>
        <h1 className="ds-display" style={{ margin: 0, fontSize: "clamp(34px, 4.6vw, 50px)", lineHeight: 1.08, color: "var(--c-text-primary)" }}>
          Every past paper, every <span className="ds-accent ds-grad-text">exam.</span>
        </h1>
        <p style={{ margin: "14px 0 0", fontSize: 15.5, lineHeight: 1.6, color: "var(--c-text-secondary)", maxWidth: "60ch" }}>
          Real questions from previous years — filter by year and topic, and track what you have cleared.
        </p>
      </div>

      {/* Open stat strip — no boxes, hairline separators */}
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: 34, flexShrink: 0, flexWrap: "wrap", rowGap: 18 }}>
        <ShelfStat
          label="Exams"
          value={available.length}
          caption={comingSoon.length > 0 ? `${comingSoon.length} more coming soon` : "on the shelf"}
        />
        <ShelfStat
          label="Questions"
          value={totalQs.toLocaleString()}
          caption={minYear != null ? `${minYear}–${maxYear} papers` : "across all years"}
        />
        <ShelfStat
          label="You've attempted"
          value={attemptedKeys.length.toLocaleString()}
          caption={`${rightCount} right · ${revisitCount} to revisit`}
          last
        />
      </div>

      {/* One card — one row per exam */}
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border-faint)",
          borderRadius: 16,
          boxShadow: "var(--c-shadow-xs)",
          padding: "6px 24px",
          flexShrink: 0,
        }}
      >
        {available.map((e, i) => (
          <ExamRow
            key={e.id}
            exam={e}
            meta={meta[e.id]}
            attempts={attempts}
            onClick={() => onPick(e)}
            last={i === available.length - 1 && comingSoon.length === 0}
          />
        ))}
        {comingSoon.map((e, i) => (
          <ExamRow
            key={e.id}
            exam={e}
            meta={meta[e.id]}
            attempts={attempts}
            soon
            last={i === comingSoon.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ShelfStat({ label, value, caption, last }) {
  return (
    <div
      style={{
        padding: "2px 32px 2px 0",
        marginRight: last ? 0 : 32,
        borderRight: last ? "none" : "1px solid var(--c-border-faint)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 6 }}>
        {label}
      </div>
      <div className="ds-grad-text ds-accent" style={{ fontSize: 34, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 6 }}>{caption}</div>
    </div>
  );
}

function ExamRow({ exam, meta, attempts, onClick, soon, last }) {
  const total = meta?.count || 0;
  const ids = meta?.ids || [];
  let attempted = 0;
  ids.forEach((id) => {
    if (attempts && attempts[id]) attempted++;
  });
  const pct = total > 0 ? Math.min(100, Math.round((attempted / total) * 100)) : 0;
  const yrRange = meta && meta.minYear != null ? `${meta.minYear}–${meta.maxYear}` : null;
  const metaBits = [
    `${total.toLocaleString()} question${total === 1 ? "" : "s"}`,
    yrRange,
    exam.sections && exam.sections.length > 0 ? exam.sections.join(" · ") : null,
  ].filter(Boolean);

  return (
    <div
      onClick={soon ? undefined : onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "18px 0",
        borderBottom: last ? "none" : "1px solid var(--c-border-faint)",
        cursor: soon ? "default" : "pointer",
        opacity: soon ? 0.62 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="ds-display" style={{ fontSize: 17, color: "var(--c-text-primary)", marginBottom: 4 }}>
          {exam.name}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--c-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {soon && total === 0 ? "Papers are being digitised" : metaBits.join(" · ")}
        </div>
      </div>
      {soon ? (
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-text-tertiary)", whiteSpace: "nowrap", flexShrink: 0 }}>
          Coming soon
        </span>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--c-success)", whiteSpace: "nowrap" }}>
            {attempted} / {total} attempted
          </span>
          <div style={{ width: 120, height: 4, borderRadius: 999, background: "var(--c-surface-muted)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "var(--c-stat-grad)" }} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--c-brand-gold)", whiteSpace: "nowrap" }}>
            Open →
          </span>
        </div>
      )}
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
  attempts,
  recordAttempt,
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
  // Status filter (client-side, driven by the attempts map):
  // null = all · 'unattempted' = no right/wrong yet · 'wrong' = latest is wrong
  const [statusFilter, setStatusFilter] = useState(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Snapshot attempts for filtering so the visible list doesn't reshuffle the
  // instant a student answers (e.g. a question vanishing from "Got wrong"
  // mid-review). The snapshot refreshes when the filter or question set changes.
  const [attemptsSnap, setAttemptsSnap] = useState(attempts);
  useEffect(() => {
    setAttemptsSnap(attempts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, questions]);

  const visible = useMemo(() => {
    if (!statusFilter) return questions;
    return questions.filter((q) => {
      const r = attemptsSnap[String(q.id)];
      if (statusFilter === "unattempted") return r !== "right" && r !== "wrong";
      if (statusFilter === "wrong") return r === "wrong";
      if (statusFilter === "starred") {
        try {
          const marks = JSON.parse(window.localStorage.getItem("pyq_bookmarks") || "[]").map(String);
          return marks.includes(String(q.id));
        } catch (e) { return false; }
      }
      return true;
    });
  }, [questions, statusFilter, attemptsSnap]);

  // Auto-select first visible question if none selected / stale selection
  useEffect(() => {
    if (!selectedQuestion && visible.length > 0) {
      setSelectedQuestion(visible[0]);
      return;
    }
    if (selectedQuestion) {
      // Re-bind to the freshly fetched row (hydrated topics + DB-normalized
      // fields) so the reader never shows a stale copy after an edit/refetch.
      const fresh = visible.find((q) => sameId(q.id, selectedQuestion.id));
      if (fresh && fresh !== selectedQuestion) setSelectedQuestion(fresh);
      else if (!fresh) setSelectedQuestion(visible[0] || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const topicLabel =
    topicFilter != null
      ? topics.find((t) => sameId(t.id, topicFilter))?.name || "Topic"
      : "All";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: FONT }}>
      {/* Top header */}
      <div style={{ padding: "18px 28px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <button
            onClick={onBackToShelf}
            style={{
              background: "transparent", border: "none", padding: 0, cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--c-text-tertiary)", marginBottom: 6, display: "block",
            }}
          >
            ← PYQ Shelf{exam.org ? " · " : ""}
            {exam.org && <span style={{ color: "var(--c-brand-gold)" }}>{exam.org}</span>}
          </button>
          <h1 className="ds-display" style={{ margin: 0, fontSize: 30, lineHeight: 1.1, color: "var(--c-text-primary)" }}>
            {exam.name}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={() => setPracticeMode(!practiceMode)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "7px 16px", borderRadius: 999,
              fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: practiceMode ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
              border: practiceMode ? "1px solid var(--c-brand-gold)" : "1px solid var(--c-border-faint)",
              color: practiceMode ? "var(--c-brand-gold)" : "var(--c-text-secondary)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", opacity: practiceMode ? 1 : 0.4 }} />
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

      {/* Filters — labelled chip rows + search pill */}
      <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--c-border-faint)", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", width: 50, flexShrink: 0 }}>Year</span>
          <PChip label="All years" active={yearFilter == null} onClick={() => setYearFilter(null)} />
          {years.map((y) => (
            <PChip key={y} label={String(y)} active={yearFilter != null && sameId(yearFilter, y)} onClick={() => setYearFilter(y)} />
          ))}
          <div
            style={{
              marginLeft: "auto",
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--c-surface-muted)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: 999, padding: "7px 16px",
              fontSize: 13, color: "var(--c-text-tertiary)", minWidth: 240,
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
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", width: 50, flexShrink: 0, marginTop: 9 }}>Topic</span>
          <div
            style={
              showAllTopics
                ? { flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 8 }
                : { flex: 1, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }
            }
          >
            <PChip label="All topics" active={topicFilter == null} onClick={() => setTopicFilter(null)} />
            {(showAllTopics ? topics : topics.slice(0, 5)).map((t) => (
              <PChip key={t.id} label={titleCaseTopic(t.name)} active={topicFilter != null && sameId(topicFilter, t.id)} onClick={() => setTopicFilter(t.id)} />
            ))}
            {topics.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllTopics((v) => !v)}
                style={{ background: "none", border: "none", padding: "7px 6px", fontSize: 12, fontWeight: 600, color: "var(--c-brand-gold)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              >
                {showAllTopics ? "show less" : `+${topics.length - 5} more`}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)", width: 50, flexShrink: 0 }}>Status</span>
          <PChip label="All" active={statusFilter == null} onClick={() => setStatusFilter(null)} />
          <PChip label="Unattempted" active={statusFilter === "unattempted"} onClick={() => setStatusFilter("unattempted")} />
          <PChip label="Got wrong" active={statusFilter === "wrong"} onClick={() => setStatusFilter("wrong")} />
          <PChip label="★ Starred" active={statusFilter === "starred"} onClick={() => setStatusFilter("starred")} />
        </div>
      </div>

      {/* Body — number palette + question card */}
      <div className="pyq-split" style={{ flex: 1, display: "flex", minHeight: 0, gap: 18, padding: "18px 28px 24px" }}>
        {/* Left: number palette card */}
        <div
          className="pyq-list-panel"
          style={{
            flex: "0.62 1 0",
            minWidth: 230,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 16,
            boxShadow: "var(--c-shadow-xs)",
            padding: "22px 24px",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <Palette
            questions={visible}
            attempts={attempts}
            currentId={selectedQuestion?.id}
            onJump={(q) => setSelectedQuestion(q)}
            headerLabel={topicLabel}
            loading={loading}
          />
        </div>

        {/* Right: question card */}
        <div
          className="pyq-reader-panel"
          style={{
            flex: "1.6 1 0",
            minWidth: 0,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border-faint)",
            borderRadius: 16,
            boxShadow: "var(--c-shadow-xs)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {selectedQuestion ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "26px 30px 22px" }}>
              <QuestionReader
                q={selectedQuestion}
                practiceMode={practiceMode}
                pickedOptionIdx={pickedOptionIdx}
                setPickedOptionIdx={setPickedOptionIdx}
                revealed={revealed}
                setRevealed={setRevealed}
                isAdmin={isAdmin}
                attempts={attempts}
                recordAttempt={recordAttempt}
                showExplanationSection={showExplanationSection}
                setShowExplanationSection={setShowExplanationSection}
                onEdit={() => onEditQuestion(selectedQuestion)}
                onDelete={() => onDeleteQuestion(selectedQuestion.id)}
                total={visible.length}
                indexInList={visible.findIndex((q) => sameId(q.id, selectedQuestion.id)) + 1}
                onPrev={() => {
                  const idx = visible.findIndex((q) => sameId(q.id, selectedQuestion.id));
                  if (idx > 0) setSelectedQuestion(visible[idx - 1]);
                }}
                onNext={() => {
                  const idx = visible.findIndex((q) => sameId(q.id, selectedQuestion.id));
                  if (idx < visible.length - 1) setSelectedQuestion(visible[idx + 1]);
                }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, padding: 60, textAlign: "center", color: "var(--c-text-tertiary)" }}>
              {loading ? "Loading…" : "Pick a question from the palette to start."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Filter chip — portal chip pattern
function PChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "7px 16px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        background: active ? "var(--c-brand-gold-tint)" : "var(--c-surface)",
        border: active ? "1px solid var(--c-brand-gold)" : "1px solid var(--c-border-faint)",
        color: active ? "var(--c-brand-gold)" : "var(--c-text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

// Exam-style number palette — one tile per question, colored by attempt state
function Palette({ questions, attempts, currentId, onJump, headerLabel, loading }) {
  const CAP = 48;
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setShowAll(false); }, [questions.length]);

  let rightN = 0;
  let wrongN = 0;
  questions.forEach((q) => {
    const r = attempts[String(q.id)];
    if (r === "right") rightN++;
    else if (r === "wrong") wrongN++;
  });
  const leftN = questions.length - rightN - wrongN;
  const list = showAll ? questions : questions.slice(0, CAP);

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 10 }}>
        {headerLabel} · {questions.length} question{questions.length === 1 ? "" : "s"}
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <PaletteLegend color="var(--c-success)" label={`${rightN} right`} />
        <PaletteLegend color="var(--c-danger)" label={`${wrongN} wrong`} />
        <PaletteLegend color="var(--c-text-tertiary)" label={`${leftN} left`} />
      </div>
      {loading ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>Loading…</div>
      ) : questions.length === 0 ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--c-text-tertiary)", fontSize: 13 }}>
          No questions match these filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 7 }}>
          {list.map((q, i) => {
            const r = attempts[String(q.id)];
            const isCurrent = currentId != null && sameId(q.id, currentId);
            let tile = {
              background: "var(--c-surface-muted)",
              color: "var(--c-text-secondary)",
              border: "1px solid transparent",
            };
            if (r === "right") {
              tile = { background: "rgba(74,222,128,.12)", color: "var(--c-success)", border: "1px solid transparent" };
            } else if (r === "wrong") {
              tile = { background: "rgba(248,113,113,.12)", color: "var(--c-danger)", border: "1px solid transparent" };
            } else if (r === "seen") {
              tile = { background: "var(--c-surface-muted)", color: "var(--c-text-tertiary)", border: "1px solid var(--c-border-faint)" };
            }
            if (isCurrent) {
              tile = { background: "var(--c-brand-gold-tint)", color: "var(--c-brand-gold)", border: "1.5px solid var(--c-brand-gold)" };
            }
            return (
              <button
                key={q.id}
                onClick={() => onJump(q)}
                title={`Question ${i + 1}`}
                style={{
                  height: 34,
                  borderRadius: 9,
                  fontSize: 11.5,
                  fontWeight: 600,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 0,
                  ...tile,
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}
      {!loading && questions.length > CAP && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            marginTop: 14, background: "transparent", border: "none", padding: 0,
            cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
            color: "var(--c-brand-gold)",
          }}
        >
          {showAll ? "Show fewer ↑" : `Show all ${questions.length} →`}
        </button>
      )}
    </div>
  );
}

function PaletteLegend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--c-text-tertiary)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function QuestionReader({
  q, practiceMode, pickedOptionIdx, setPickedOptionIdx,
  revealed, setRevealed,
  isAdmin, attempts, recordAttempt,
  showExplanationSection, setShowExplanationSection,
  onEdit, onDelete,
  total, indexInList, onPrev, onNext,
}) {
  // Typed answer + verdict for answer-based questions (per question)
  const [typedAnswer, setTypedAnswer] = useState("");
  const [verdict, setVerdict] = useState(null); // 'right' | 'wrong' | null
  useEffect(() => {
    setTypedAnswer("");
    setVerdict(null);
  }, [q.id]);

  // Reveal WITHOUT a check — records 'seen' (recordAttempt itself refuses to
  // downgrade a prior right/wrong). Used by the Show-answer buttons and Space.
  const revealOnly = () => {
    if (!revealed && practiceMode) recordAttempt(q.id, "seen");
    setRevealed(true);
  };
  const revealRef = useRef(revealOnly);
  revealRef.current = revealOnly;

  // Lenient correctness check for typed answers: strip HTML from the stored
  // answer, normalize whitespace/case, and fall back to numeric equality.
  const normalizeAns = (s) =>
    String(s ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const checkTyped = () => {
    const guess = typedAnswer.trim();
    if (!guess) {
      revealOnly();
      return;
    }
    const target = normalizeAns(q.answer);
    const g = normalizeAns(guess);
    let correct = target.length > 0 && g === target;
    if (!correct) {
      const gn = parseFloat(g.replace(/,/g, ""));
      const tn = parseFloat(target.replace(/,/g, ""));
      if (Number.isFinite(gn) && Number.isFinite(tn)) correct = gn === tn;
    }
    setVerdict(correct ? "right" : "wrong");
    setRevealed(true);
    recordAttempt(q.id, correct ? "right" : "wrong");
  };
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
        revealRef.current();
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

  const metaTopic = q.topics && q.topics.length > 0 ? q.topics[0].name : null;

  return (
    <div style={{ textAlign: "left", maxWidth: 820 }}>
      {/* Meta line — "Q n of total · year · topic · type", Q part gold */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
          <span style={{ color: "var(--c-brand-gold)" }}>Q {indexInList} of {total}</span>
          {q.year != null && <> · {q.year}</>}
          {metaTopic && <> · {metaTopic}</>}
          {" · "}
          {q.answer_type === "mcq" ? "MCQ" : "Short answer"}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={onEdit} style={icBtn} title="Edit"><Pencil size={13} /></button>
            <button onClick={onDelete} style={icBtn} title="Delete"><Trash2 size={13} /></button>
          </div>
        )}
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
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              lineHeight: 1.65,
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
                background: "var(--c-surface)",
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
                  if (practiceMode && !revealed) {
                    // First pick this session = the "check" — persist verdict.
                    recordAttempt(q.id, i === correctIdx ? "right" : "wrong");
                  }
                  setPickedOptionIdx(i);
                  if (practiceMode) setRevealed(true);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 18px",
                  borderBottom: "1px solid var(--c-border-faint)",
                  cursor: "pointer",
                  background: showCorrect ? "rgba(74,222,128,.12)" :
                              isWrong ? "rgba(248,113,113,.12)" : "transparent",
                  borderLeft: showCorrect ? "2px solid var(--c-success)" :
                              isWrong ? "2px solid var(--c-danger)" : "2px solid transparent",
                  paddingLeft: showCorrect || isWrong ? 16 : 18,
                  transition: "background 0.1s ease",
                }}
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, width: 20,
                  color: showCorrect ? "var(--c-success)" :
                         isWrong ? "var(--c-danger)" :
                         isPicked ? "var(--c-brand-gold)" : "var(--c-text-tertiary)",
                }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <div style={{ fontSize: 16, color: "var(--c-text-primary)", lineHeight: 1.65, flex: 1, fontWeight: isPicked ? 500 : 400 }}>
                  {o.text}
                </div>
                {showCorrect && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-success)" }}>
                    Correct
                  </span>
                )}
                {isWrong && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-danger)" }}>
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
            <button onClick={revealOnly} style={ghostBtn}>
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
            borderLeft: "2px solid var(--c-success)",
            padding: "12px 0 12px 22px",
            maxWidth: 760,
            marginLeft: -2,
            marginBottom: 22,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-success)", marginBottom: 8 }}>
            Answer
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--c-text-primary)", marginBottom: 2 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
              background: "rgba(74,222,128,.12)", color: "var(--c-success)",
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

      {/* Answer-based: typed answer + Check, then reveal */}
      {q.answer_type !== "mcq" && q.answer && (
        <div style={{ marginBottom: 22 }}>
          {!revealed && practiceMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 540, marginBottom: 14 }}>
              <input
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Type your answer…"
                onKeyDown={(e) => { if (e.key === "Enter") checkTyped(); }}
                style={{
                  flex: 1, minWidth: 0,
                  background: "var(--c-surface-muted)",
                  border: "1px solid var(--c-border-faint)",
                  borderRadius: 999,
                  padding: "11px 18px",
                  outline: "none",
                  fontFamily: "inherit", fontSize: 14,
                  color: "var(--c-text-primary)",
                }}
              />
              <button onClick={checkTyped} style={goldBtn}>Check</button>
            </div>
          )}

          {revealed ? (
            <>
              {verdict && (
                <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: verdict === "right" ? "var(--c-success)" : "var(--c-danger)" }}>
                  {verdict === "right" ? "Correct — well done" : "Not quite — compare with the answer below"}
                </div>
              )}
              <div
                className="pyq-rich-panel"
                style={{
                  borderLeft: "2px solid var(--c-success)",
                  padding: "12px 0 4px 22px",
                  maxWidth: 760,
                  marginLeft: -2,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-success)", marginBottom: 8 }}>
                  Answer
                </div>
                <div
                  className="pyq-rich-body"
                  style={{ fontSize: 15, lineHeight: 1.65, color: "var(--c-text-primary)" }}
                  dangerouslySetInnerHTML={{ __html: q.answer }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button onClick={revealOnly} style={ghostBtn}>
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
          style={{ borderLeft: "2px solid rgba(255,182,39,0.5)", padding: "4px 0 4px 22px", marginBottom: 36, maxWidth: 760 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-brand-gold)", marginBottom: 10 }}>
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
              style={{ ...dockIcon, color: bookmarked ? "var(--c-brand-gold)" : "var(--c-text-secondary)" }}
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
                    "https://wa.me/918299470392?text=" + encodeURIComponent(`Issue with PYQ question id ${q.id}`),
                    "_blank",
                  );
                }
              }}
            >⚐</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onPrev} disabled={indexInList <= 1} style={navBtn}>← Previous</button>
          <button onClick={onNext} disabled={indexInList >= total} style={{ ...navBtn, background: "var(--c-mock-banner-btn-bg)", color: "var(--c-mock-banner-btn-fg)", border: "none", fontWeight: 600 }}>
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
const goldBtn = {
  background: "var(--c-mock-banner-btn-bg)",
  color: "var(--c-mock-banner-btn-fg)",
  fontWeight: 600,
  borderRadius: 999,
  padding: "11px 26px",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  whiteSpace: "nowrap",
};
const ghostBtn = {
  background: "transparent",
  border: "1px solid var(--c-border-faint)",
  borderRadius: 999,
  padding: "10px 22px",
  color: "var(--c-text-secondary)",
  fontWeight: 600,
  fontSize: 12.5,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
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
  padding: "8px 18px", borderRadius: 999,
  fontSize: 12.5, fontWeight: 500,
  cursor: "pointer", fontFamily: "inherit",
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
