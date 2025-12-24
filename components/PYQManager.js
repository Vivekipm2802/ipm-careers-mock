"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
  Spacer,
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
  ArrowLeft,
  Calendar,
  Tag,
  Filter,
  HelpCircle,
  Info,
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import { supabase } from "@/utils/supabaseClient";
import dynamic from "next/dynamic";
import FileUploader from "./FileUploader";

const QuillWrapper = dynamic(() => import("@/components/QuillSSRWrapper"), {
  ssr: false,
});
export default function PYQManager({
  isAdmin = false,
  viewBy,
  filterValue: initialFilterValue,
}) {
  // State
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    answer: "",
    answer_type: "answer_based", // "answer_based" or "mcq"
    options: [], // For MCQ: [{text: "", is_correct: false}]
    year: new Date().getFullYear(),
    difficulty: "medium",
    file_type: undefined,
    file_url: "",
    explanation: "",
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({
    name: "",
    description: "",
    icon_url: "",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [filterValue, setFilterValue] = useState(initialFilterValue);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState("");
  const [showExplanationSection, setShowExplanationSection] = useState(false);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchTopics(), fetchYears()]);
      setDataLoaded(true);
      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Update filter value when initialFilterValue changes
  useEffect(() => {
    setFilterValue(initialFilterValue);
  }, [initialFilterValue]);

  // Fetch questions when filter value changes or data is loaded
  useEffect(() => {
    if (dataLoaded && filterValue) {
      fetchQuestions();
    }
  }, [viewBy, filterValue, dataLoaded]);

  // Fetch all available topics
  const fetchTopics = async () => {
    const { data, error } = await supabase
      .from("pyq_topics")
      .select("*")
      .order("name");
    if (!error) setTopics(data || []);
    return data || [];
  };

  // Fetch all available years
  const fetchYears = async () => {
    const { data, error } = await supabase
      .from("pyq_questions")
      .select("year")
      .order("year", { ascending: false });
    if (!error) {
      const uniqueYears = [...new Set(data?.map((item) => item.year))];
      setYears(uniqueYears);
    }
    return data || [];
  };

  // Fetch questions based on view mode (year or topic)
  const fetchQuestions = async () => {
    setLoading(true);

    try {
      // Get all questions or filter by year
      let query = supabase.from("pyq_questions").select("*");
      if (viewBy === "year" && filterValue) {
        query = query.eq("year", filterValue);
      }
      const { data: questionsData, error: questionsError } = await query.order(
        "id"
      );

      if (questionsError) throw questionsError;

      let filteredQuestions = questionsData || [];

      // Filter by topic if needed
      if (viewBy === "topic" && filterValue) {
        const { data: questionTopics, error: topicsError } = await supabase
          .from("pyq_question_topics")
          .select("question_id")
          .eq("topic_id", filterValue);

        if (topicsError) throw topicsError;

        const questionIds = questionTopics?.map((qt) => qt.question_id) || [];
        filteredQuestions =
          questionsData?.filter((q) => questionIds.includes(q.id)) || [];
      }

      // Add topics to each question
      const questionsWithTopics = await Promise.all(
        filteredQuestions.map(async (question) => {
          const { data: topicRelations, error: relError } = await supabase
            .from("pyq_question_topics")
            .select("topic_id")
            .eq("question_id", question.id);

          if (relError) return { ...question, topics: [] };

          const topicIds = topicRelations?.map((rel) => rel.topic_id) || [];
          const questionTopics = topics.filter((topic) =>
            topicIds.includes(topic.id)
          );

          return { ...question, topics: questionTopics };
        })
      );

      setQuestions(questionsWithTopics);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (value) => {
    setFilterValue(value);
    setSelectedQuestion(null);
  };

  // Save a new question
  const handleSaveNewQuestion = async () => {
    if (!newQuestion.question || !newQuestion.year) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate MCQ questions
    if (newQuestion.answer_type === "mcq") {
      if (!newQuestion.options || newQuestion.options.length < 2) {
        alert("MCQ questions must have at least 2 options");
        return;
      }
      const hasCorrectAnswer = newQuestion.options.some(
        (option) => option.is_correct
      );
      if (!hasCorrectAnswer) {
        alert("MCQ questions must have at least one correct answer");
        return;
      }
    } else if (
      newQuestion.answer_type === "answer_based" &&
      !newQuestion.answer
    ) {
      alert("Answer based questions must have an answer");
      return;
    }

    try {
      // Prepare question data for database
      const questionToSave = {
        ...newQuestion,
        options:
          newQuestion.answer_type === "mcq"
            ? JSON.stringify(newQuestion.options)
            : null,
      };

      // Insert the new question
      const { data: questionData, error: questionError } = await supabase
        .from("pyq_questions")
        .insert([questionToSave])
        .select();

      if (questionError) throw questionError;

      const newQuestionId = questionData?.[0]?.id;

      // Add topic relationships
      if (newQuestionId && selectedTopics.length > 0) {
        const topicRelations = selectedTopics.map((topicId) => ({
          question_id: newQuestionId,
          topic_id: topicId,
        }));

        const { error: topicError } = await supabase
          .from("pyq_question_topics")
          .insert(topicRelations);
        if (topicError) throw topicError;
      }

      // Reset form and refresh questions
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
    } catch (error) {
      console.error("Error adding question:", error);
    }
  };

  // Update an existing question
  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    try {
      // Validate MCQ questions
      if (editingQuestion.answer_type === "mcq") {
        if (!editingQuestion.options || editingQuestion.options.length < 2) {
          alert("MCQ questions must have at least 2 options");
          return;
        }
        const hasCorrectAnswer = editingQuestion.options.some(
          (option) => option.is_correct
        );
        if (!hasCorrectAnswer) {
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

      // Update the question
      const { error: questionError } = await supabase
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

      if (questionError) throw questionError;

      // Delete existing topic relationships
      const { error: deleteError } = await supabase
        .from("pyq_question_topics")
        .delete()
        .eq("question_id", editingQuestion.id);

      if (deleteError) throw deleteError;

      // Add new topic relationships
      if (selectedTopics.length > 0) {
        const topicRelations = selectedTopics.map((topicId) => ({
          question_id: editingQuestion.id,
          topic_id: topicId,
        }));

        const { error: topicError } = await supabase
          .from("pyq_question_topics")
          .insert(topicRelations);
        if (topicError) throw topicError;
      }

      // Update the selected question if it's the one being edited
      if (selectedQuestion && selectedQuestion.id === editingQuestion.id) {
        const updatedQuestion = {
          ...editingQuestion,
          topics: topics.filter((topic) => selectedTopics.includes(topic.id)),
        };
        setSelectedQuestion(updatedQuestion);
      }

      // Reset form and refresh questions
      setEditingQuestion(null);
      setSelectedTopics([]);
      fetchQuestions();
    } catch (error) {
      console.error("Error updating question:", error);
    }
  };

  // Delete a question
  const handleDeleteQuestion = async (id) => {
    try {
      // Delete topic relationships first
      await supabase.from("pyq_question_topics").delete().eq("question_id", id);

      // Delete the question
      const { error: questionError } = await supabase
        .from("pyq_questions")
        .delete()
        .eq("id", id);
      if (questionError) throw questionError;

      // If the deleted question is the selected one, clear the selection
      if (selectedQuestion && selectedQuestion.id === id) {
        setSelectedQuestion(null);
      }

      setDeleteConfirmOpen(false);
      setQuestionToDelete(null);
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  // Add or update a topic
  const handleAddTopic = async () => {
    if (!newTopic.name) {
      alert("Please enter a topic name");
      return;
    }

    try {
      if (newTopic.id) {
        // Update existing topic
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
        // Insert new topic
        const { error } = await supabase.from("pyq_topics").insert([newTopic]);
        if (error) throw error;
      }

      setNewTopic({
        name: "",
        description: "",
        icon_url: "",
      });
      setIsAddingTopic(false);
      await fetchTopics();
    } catch (error) {
      console.error("Error saving topic:", error);
    }
  };

  // Delete a topic
  const handleDeleteTopic = async (topicId) => {
    if (
      !confirm(
        "Are you sure you want to delete this topic? This action cannot be undone."
      )
    )
      return;

    try {
      // Delete related question-topic associations first
      await supabase
        .from("pyq_question_topics")
        .delete()
        .eq("topic_id", topicId);

      // Delete the topic itself
      const { error } = await supabase
        .from("pyq_topics")
        .delete()
        .eq("id", topicId);
      if (error) throw error;

      // Refresh topics
      await fetchTopics();
    } catch (error) {
      console.error("Error deleting topic:", error);
      alert("Failed to delete topic.");
    }
  };

  // Helper functions
  const startEditingQuestion = (question) => {
    const editQuestion = {
      ...question,
      answer_type: question.answer_type || "answer_based",
      options: question.options ? JSON.parse(question.options) : [],
      explanation: question.explanation || "",
    };
    setEditingQuestion(editQuestion);
    setSelectedTopics(question.topics?.map((t) => t.id) || []);
  };

  const toggleTopicSelection = (topicId) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  // MCQ Options Management Functions
  const addMCQOption = (isEditing = false) => {
    const newOption = { text: "", is_correct: false };
    if (isEditing && editingQuestion) {
      setEditingQuestion({
        ...editingQuestion,
        options: [...(editingQuestion.options || []), newOption],
      });
    } else {
      setNewQuestion({
        ...newQuestion,
        options: [...(newQuestion.options || []), newOption],
      });
    }
  };

  const removeMCQOption = (index, isEditing = false) => {
    if (isEditing && editingQuestion) {
      const updatedOptions = editingQuestion.options.filter(
        (_, i) => i !== index
      );
      setEditingQuestion({
        ...editingQuestion,
        options: updatedOptions,
      });
    } else {
      const updatedOptions = newQuestion.options.filter((_, i) => i !== index);
      setNewQuestion({
        ...newQuestion,
        options: updatedOptions,
      });
    }
  };

  const updateMCQOption = (index, field, value, isEditing = false) => {
    if (isEditing && editingQuestion) {
      const updatedOptions = [...editingQuestion.options];
      updatedOptions[index] = { ...updatedOptions[index], [field]: value };
      setEditingQuestion({
        ...editingQuestion,
        options: updatedOptions,
      });
    } else {
      const updatedOptions = [...newQuestion.options];
      updatedOptions[index] = { ...updatedOptions[index], [field]: value };
      setNewQuestion({
        ...newQuestion,
        options: updatedOptions,
      });
    }
  };

  const confirmDeleteQuestion = (id) => {
    setQuestionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const showExplanation = (explanation) => {
    setCurrentExplanation(explanation || "");
    setExplanationModalOpen(true);
  };

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-5 w-5" />;
      case "docx":
        return <FileText className="h-5 w-5" />;
      case "xls":
        return <FileSpreadsheet className="h-5 w-5" />;
      case "html":
        return <FileCode className="h-5 w-5" />;
      case "image":
        return <FileImage className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  // Render the filter selector with improved UI/UX
  const renderFilterSelector = () => {
    if (viewBy === "year") {
      return (
        <div className="w-full">
          <div className="flex items-center justify-between mb-10 mt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-700">
                  Choose a Year to View Questions
                </h3>
                <p className="text-sm text-gray-500">
                  Select any year below to see all available questions from that
                  year
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                color="primary"
                onPress={() => setIsAddingQuestion(true)}
                startContent={<Plus className="h-4 flex-shrink-0 w-4" />}
              >
                Add Question
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {years.map((year) => (
              <Card
                key={year}
                isPressable
                isHoverable
                className={`cursor-pointer transition-all duration-200 ${
                  filterValue === year
                    ? "bg-primary-50 border-2 border-primary shadow-lg scale-105"
                    : "bg-white border border-gray-200 hover:border-primary-300 hover:shadow-md hover:scale-102"
                }`}
                onPress={() => handleFilterChange(year)}
              >
                <CardBody className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        filterValue === year
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span
                      className={`font-semibold text-sm ${
                        filterValue === year ? "text-primary" : "text-gray-700"
                      }`}
                    >
                      {year}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      );
    } else if (viewBy === "topic") {
      return (
        <div className="w-full">
          <div className="flex items-center justify-between mb-10 mt-4">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-secondary" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-700">
                  Choose a Topic to View Questions
                </h3>
                <p className="text-sm text-gray-500">
                  Select any topic below to see all related questions
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <Button
                  color="secondary"
                  onPress={() => {
                    setNewTopic({ name: "", description: "", icon_url: "" });
                    setIsAddingTopic(true);
                  }}
                  startContent={<Plus className="h-4 flex-shrink-0 w-4" />}
                >
                  Add Topic
                </Button>
                <Button
                  color="primary"
                  onPress={() => setIsAddingQuestion(true)}
                  startContent={<Plus className="h-4 flex-shrink-0 w-4" />}
                >
                  Add Question
                </Button>
              </div>
            )}
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pe-2">
              {topics.map((topic) => (
                <Card
                  key={topic.id}
                  isPressable
                  isHoverable
                  className={`cursor-pointer transition-all duration-200 shadow-sm ${
                    filterValue === topic.id
                      ? "bg-secondary-50 border-2 border-secondary scale-105"
                      : "bg-white border border-gray-200 hover:border-secondary-300 hover:scale-102"
                  }`}
                  onPress={() => handleFilterChange(topic.id)}
                >
                  <CardBody className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          filterValue === topic.id
                            ? "bg-secondary text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {topic.icon_url ? (
                          <img
                            src={topic.icon_url}
                            alt={topic.name}
                            className="object-contain"
                          />
                        ) : (
                          <Tag className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`font-semibold text-sm mb-1 truncate ${
                            filterValue === topic.id
                              ? "text-secondary"
                              : "text-gray-800"
                          }`}
                        >
                          {topic.name}
                        </h4>
                        {topic.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {topic.description}
                          </p>
                        )}
                      </div>
                      {filterValue === topic.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                    <div className="flex justify-end pt-2">
                      <Tooltip content="Edit Topic" placement="left">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => {
                            setNewTopic(topic);
                            setIsAddingTopic(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 text-default-500" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete Topic" placement="left">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => handleDeleteTopic(topic.id)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </Tooltip>
                    </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="">
        {selectedQuestion && (
          <div className="flex justify-start items-center p-4">
            <Button
              variant="light"
              startContent={<ArrowLeft className="h-4 w-4" />}
              onPress={() => setSelectedQuestion(null)}
            >
              Back to List
            </Button>
          </div>
        )}

        {/* Filter Selector with Header and Button in same row */}
        {!selectedQuestion && !filterValue && (
          <div className="px-4 pb-6">{renderFilterSelector()}</div>
        )}
      </div>

      {/* Content - scrollable area */}
      <div className="flex-grow overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : !filterValue ? (
          <></>
        ) : questions.length === 0 ? (
          <Card shadow="none">
            <CardBody className="flex flex-col items-center justify-center">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <ArrowLeft
                    className="cursor-pointer hover:text-secondary"
                    onClick={() => {
                      setFilterValue(null);
                      setSelectedQuestion(null);
                    }}
                  />
                  <h2 className="text-md text-left font-medium">
                    Showing results for :{" "}
                    <span className="capitalize">
                      {viewBy === "topic"
                        ? topics.find((t) => t.id === filterValue)?.name || ""
                        : filterValue}
                    </span>
                  </h2>
                </div>
              </div>
              <p className="text-gray-500 mb-4 text-center">
                No questions found for this {viewBy}.
              </p>
              {isAdmin && (
                <Button
                  color="primary"
                  onPress={() => setIsAddingQuestion(true)}
                  startContent={<Plus className="h-4 flex-shrink-0 w-4" />}
                >
                  Add Your First Question
                </Button>
              )}
            </CardBody>
          </Card>
        ) : selectedQuestion ? (
          // Question Detail View
          <Card className="w-full" shadow="none">
            <CardHeader className="flex justify-between items-start">
              <div className="w-full">
                {/* Metadata Chips */}
                <div className=" flex flex-wrap gap-2">
                  <Chip variant="flat" color="default">
                    Year: {selectedQuestion.year}
                  </Chip>
                  <Chip variant="flat" color="default" className="capitalize">
                    {selectedQuestion.difficulty}
                  </Chip>
                  <Chip variant="flat" color="primary">
                    {selectedQuestion.answer_type === "mcq"
                      ? "MCQ"
                      : "Answer Based"}
                  </Chip>
                  {selectedQuestion.topics?.map((topic) => (
                    <Chip key={topic.id} color="secondary" variant="flat">
                      {topic.name}
                    </Chip>
                  ))}
                  {/*  {selectedQuestion.file_type && (
                  <Chip variant="flat" color="primary" startContent={getFileIcon(selectedQuestion.file_type)}>
                    {selectedQuestion.file_type.toUpperCase()}
                  </Chip>
                )} */}
                </div>

                {/* Question Title */}
                <h3 className="mt-2 text-xl text-left font-bold">
                  {selectedQuestion.question}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {selectedQuestion.file_url && (
                  <Tooltip
                    content={`Download ${
                      selectedQuestion.file_type?.toUpperCase() || "file"
                    }`}
                  >
                    <Button
                      isIconOnly
                      variant="light"
                      color="primary"
                      onPress={() =>
                        handleDownload(
                          selectedQuestion.file_url,
                          `question-${selectedQuestion.id}.${selectedQuestion.file_type}`
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}
                {isAdmin && (
                  <>
                    <Button
                      isIconOnly
                      variant="light"
                      onPress={() => startEditingQuestion(selectedQuestion)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      color="danger"
                      onPress={() => confirmDeleteQuestion(selectedQuestion.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>

            <CardBody>
              {/* Show Image First if file_type is "image" */}
              {selectedQuestion.file_type === "image" && (
                <div className="flex flex-col items-center mb-4">
                  <img
                    src={selectedQuestion.file_url || "/placeholder.svg"}
                    alt={`Question ${selectedQuestion.id}`}
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              )}

              {/* Display Answer Based on Answer Type */}
              {selectedQuestion.answer_type === "mcq" &&
              selectedQuestion.options ? (
                <div className="flex gap-6">
                  {/* MCQ Options */}
                  <div className="flex-1">
                    <div className="space-y-3">
                      {JSON.parse(selectedQuestion.options).map(
                        (option, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-transparent"></div>
                            </div>
                            <span className="font-medium text-sm min-w-[20px]">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="flex-1 text-gray-700">
                              {option.text}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Correct Answer Button */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <Tooltip
                      content={
                        <div className="p-2">
                          <div className="font-semibold mb-1">
                            Correct Answer:
                          </div>
                          {JSON.parse(selectedQuestion.options)
                            .filter((option) => option.is_correct)
                            .map((option, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span className="font-medium">
                                  {String.fromCharCode(
                                    65 +
                                      JSON.parse(
                                        selectedQuestion.options
                                      ).findIndex((opt) => opt.is_correct)
                                  )}
                                  .
                                </span>
                                <span>{option.text}</span>
                              </div>
                            ))}
                        </div>
                      }
                      placement="left"
                      showArrow
                    >
                      <Button
                        variant="solid"
                        color="success"
                        size="sm"
                        className="font-medium"
                      >
                        Correct Answer
                      </Button>
                    </Tooltip>
                    {selectedQuestion.explanation && (
                      <Button
                        variant="solid"
                        color="primary"
                        size="sm"
                        className="font-medium"
                        onPress={() =>
                          setShowExplanationSection(!showExplanationSection)
                        }
                      >
                        {showExplanationSection ? "Hide" : "View"} Explanation
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* Answer Based Question - Display using dangerouslySetInnerHTML */
                <div className="flex gap-6">
                  <div className="flex-1">
                    {/* <h4 className="text-lg font-semibold mb-3">Answer:</h4>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedQuestion.answer,
                      }}
                    /> */}
                  </div>
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <Tooltip
                      content={
                        <div className="p-2">
                          <div className="font-semibold mb-1">
                            Correct Answer:
                          </div>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: selectedQuestion.answer,
                            }}
                          />
                        </div>
                      }
                      placement="left"
                      showArrow
                    >
                      <Button
                        variant="solid"
                        color="success"
                        size="sm"
                        className="font-medium"
                      >
                        Correct Answer
                      </Button>
                    </Tooltip>
                    {selectedQuestion.explanation && (
                      <Button
                        variant="solid"
                        color="primary"
                        size="sm"
                        className="font-medium"
                        onPress={() =>
                          setShowExplanationSection(!showExplanationSection)
                        }
                      >
                        {showExplanationSection ? "Hide" : "View"} Explanation
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Explanation Section */}
              {selectedQuestion.explanation && showExplanationSection && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold text-primary">
                      Explanation
                    </h4>
                  </div>
                  <div
                    className="prose prose-sm max-w-none explanation-content"
                    dangerouslySetInnerHTML={{
                      __html: selectedQuestion.explanation,
                    }}
                  />
                </div>
              )}
            </CardBody>

            {/* File Actions (Download/View) */}
            {selectedQuestion.file_url && (
              <CardFooter className="flex justify-end">
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={<Download className="h-4 w-4" />}
                  onPress={() =>
                    handleDownload(
                      selectedQuestion.file_url,
                      `question-${selectedQuestion.id}.${selectedQuestion.file_type}`
                    )
                  }
                >
                  Download {selectedQuestion.file_type?.toUpperCase() || "File"}
                </Button>
                {selectedQuestion.file_type !== "image" && (
                  <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    className="ml-2"
                    startContent={<ExternalLink className="h-4 w-4" />}
                    as="a"
                    href={selectedQuestion.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View in Browser
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        ) : (
          // Question List View
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <ArrowLeft
                className="cursor-pointer text-primary hover:text-secondary"
                onClick={() => {
                  setFilterValue(null);
                  setSelectedQuestion(null);
                }}
              />
              <h2 className="text-md text-left font-medium text-primary">
                Showing results for :{" "}
                <span className="capitalize">
                  {viewBy === "topic"
                    ? topics.find((t) => t.id === filterValue)?.name || ""
                    : filterValue}
                </span>
              </h2>
            </div>
            {questions.map((question) => (
              <Card
                key={question.id}
                className="w-full border-1 cursor-pointer hover:bg-gray-50 transition-colors"
                isPressable
                shadow="none"
                onPress={() => setSelectedQuestion(question)}
              >
                <CardBody className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium line-clamp-2">
                        {question.question}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Chip size="sm" variant="flat" color="secondary">
                          {question.year}
                        </Chip>
                        <Chip
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="capitalize"
                        >
                          {question.difficulty}
                        </Chip>
                        {question.file_type && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={getFileIcon(question.file_type)}
                          >
                            {question.file_type.toUpperCase()}
                          </Chip>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={(e) => {
                            /* e.stopPropagation() */
                            startEditingQuestion(question);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={(e) => {
                            /* e.stopPropagation() */
                            confirmDeleteQuestion(question.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                  {/* File Type Selector Moved to Top */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      File Type
                    </label>
                    <Select
                      aria-label="Select File Type"
                      placeholder="Select File Type"
                      className="w-full flex-grow"
                      selectedKeys={
                        newQuestion.file_type
                          ? new Set([newQuestion.file_type])
                          : new Set()
                      }
                      onSelectionChange={(keys) => {
                        const selectedFileType = Array.from(keys)[0] || "";
                        setNewQuestion({
                          ...newQuestion,
                          file_type: selectedFileType,
                        });
                      }}
                    >
                      <SelectItem key="pdf" value="pdf">
                        PDF
                      </SelectItem>
                      <SelectItem key="docx" value="docx">
                        DOCX
                      </SelectItem>
                      <SelectItem key="xls" value="xls">
                        XLS
                      </SelectItem>
                      <SelectItem key="html" value="html">
                        HTML
                      </SelectItem>
                      <SelectItem key="image" value="image">
                        Image
                      </SelectItem>
                      <SelectItem key="text" value="text">
                        Text
                      </SelectItem>
                    </Select>
                  </div>

                  {/* Answer Type Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Answer Type
                    </label>
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
                                : [
                                    { text: "", is_correct: false },
                                    { text: "", is_correct: false },
                                  ]
                              : [],
                        })
                      }
                      orientation="horizontal"
                    >
                      <Radio value="answer_based">Answer Based Question</Radio>
                      <Radio value="mcq">Multiple Choice Question (MCQ)</Radio>
                    </RadioGroup>
                  </div>

                  {/* Conditional Answer/Options Based on Answer Type */}
                  {newQuestion.answer_type === "answer_based" &&
                    newQuestion.file_type !== "html" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Answer
                        </label>
                        <Textarea
                          placeholder="Enter the answer"
                          value={newQuestion.answer}
                          onChange={(e) =>
                            setNewQuestion({
                              ...newQuestion,
                              answer: e.target.value,
                            })
                          }
                          minRows={3}
                        />
                      </div>
                    )}

                  {newQuestion.answer_type === "mcq" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        MCQ Options
                      </label>
                      <div className="space-y-3">
                        {newQuestion.options.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-3 border rounded-lg"
                          >
                            <Checkbox
                              isSelected={option.is_correct}
                              onValueChange={(checked) =>
                                updateMCQOption(
                                  index,
                                  "is_correct",
                                  checked,
                                  false
                                )
                              }
                            />
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option.text}
                              onChange={(e) =>
                                updateMCQOption(
                                  index,
                                  "text",
                                  e.target.value,
                                  false
                                )
                              }
                              className="flex-1"
                            />
                            {newQuestion.options.length > 2 && (
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => removeMCQOption(index, false)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="bordered"
                          onPress={() => addMCQOption(false)}
                          startContent={<Plus className="h-4 w-4" />}
                        >
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}
                  {newQuestion.answer_type === "answer_based" &&
                    newQuestion.file_type === "html" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Answer in Rich Text Editor
                        </label>
                        <QuillWrapper
                          value={newQuestion.answer}
                          onChange={(value) =>
                            setNewQuestion({ ...newQuestion, answer: value })
                          }
                        />
                      </div>
                    )}
                  {newQuestion.file_type === "image" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Question/Answer Image
                      </label>
                      <ImageUploader
                        value={newQuestion.file_url}
                        onUploadComplete={(url) =>
                          setNewQuestion({ ...newQuestion, file_url: url })
                        }
                      />
                    </div>
                  )}
                  {["pdf", "docx", "xls"].includes(newQuestion.file_type) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        File Uploader
                      </label>
                      <FileUploader
                        data={{ file: newQuestion.file_url }}
                        onUploadComplete={(url) =>
                          setNewQuestion({ ...newQuestion, file_url: url })
                        }
                      />
                    </div>
                  )}

                  {/* Question Input */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Question
                    </label>
                    <Textarea
                      placeholder="Enter the question text"
                      value={newQuestion.question}
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          question: e.target.value,
                        })
                      }
                      minRows={3}
                    />
                  </div>

                  {/* Year & Difficulty */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Year
                      </label>
                      <Input
                        type="number"
                        placeholder="Year"
                        value={newQuestion.year?.toString()}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            year: Number.parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Difficulty
                      </label>
                      <Select
                        aria-label="Select Difficulty"
                        className="w-full flex-grow"
                        selectedKeys={new Set([newQuestion.difficulty])}
                        onSelectionChange={(keys) => {
                          const selectedDifficulty = Array.from(keys)[0];
                          setNewQuestion({
                            ...newQuestion,
                            difficulty: selectedDifficulty,
                          });
                        }}
                      >
                        <SelectItem key="easy" value="easy">
                          Easy
                        </SelectItem>
                        <SelectItem key="medium" value="medium">
                          Medium
                        </SelectItem>
                        <SelectItem key="hard" value="hard">
                          Hard
                        </SelectItem>
                      </Select>
                    </div>
                  </div>

                  {/* Topics Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Topics
                    </label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                      {topics.map((topic) => (
                        <Chip
                          key={topic.id}
                          color={
                            selectedTopics.includes(topic.id)
                              ? "primary"
                              : "default"
                          }
                          variant={
                            selectedTopics.includes(topic.id)
                              ? "solid"
                              : "bordered"
                          }
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
                    startContent={<Plus className="h-3 flex-shrink-0 w-3" />}
                  >
                    Add Topic
                  </Button>

                  {/* Explanation Section */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Explanation (Optional)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Provide a detailed explanation that supports text, images,
                      and videos
                    </p>
                    <QuillWrapper
                      value={newQuestion.explanation}
                      onChange={(value) =>
                        setNewQuestion({ ...newQuestion, explanation: value })
                      }
                      placeholder="Enter explanation with rich text, images, and videos..."
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
              <ModalHeader>
                {newTopic && newTopic.id ? "Edit Topic" : "Add New Topic"}
              </ModalHeader>
              <ModalBody>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Topic Name
                    </label>
                    <Input
                      placeholder="Enter topic name"
                      value={newTopic.name}
                      onChange={(e) =>
                        setNewTopic({ ...newTopic, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description (Optional)
                    </label>
                    <Textarea
                      placeholder="Enter topic description"
                      value={newTopic.description}
                      onChange={(e) =>
                        setNewTopic({
                          ...newTopic,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Topic Icon (Optional)
                    </label>
                    <ImageUploader
                      value={newTopic.icon_url}
                      onUploadComplete={(url) =>
                        setNewTopic({ ...newTopic, icon_url: url })
                      }
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
        onOpenChange={(open) => !open && setEditingQuestion(null)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) =>
            editingQuestion && (
              <>
                <ModalHeader>Edit Question</ModalHeader>
                <ModalBody>
                  <div className="grid gap-4">
                    {/* File Type Selector at the Top */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        File Type
                      </label>
                      <Select
                        aria-label="Select File Type"
                        placeholder="Select File Type"
                        className="w-full flex-grow"
                        selectedKeys={
                          editingQuestion.file_type
                            ? new Set([editingQuestion.file_type])
                            : new Set()
                        }
                        onSelectionChange={(keys) => {
                          const selectedFileType = Array.from(keys)[0] || "";
                          setEditingQuestion({
                            ...editingQuestion,
                            file_type: selectedFileType,
                            file_url: "",
                          });
                        }}
                      >
                        <SelectItem key="text" value="text">
                          Text
                        </SelectItem>
                        <SelectItem key="html" value="html">
                          HTML
                        </SelectItem>
                        <SelectItem key="image" value="image">
                          Image
                        </SelectItem>
                        <SelectItem key="pdf" value="pdf">
                          PDF
                        </SelectItem>
                        <SelectItem key="docx" value="docx">
                          DOCX
                        </SelectItem>
                        <SelectItem key="xls" value="xls">
                          XLS
                        </SelectItem>
                      </Select>
                    </div>

                    {/* Question Input */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Question
                      </label>
                      <Textarea
                        value={editingQuestion.question}
                        onChange={(e) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            question: e.target.value,
                          })
                        }
                        minRows={3}
                      />
                    </div>

                    {/* Answer Type Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Answer Type
                      </label>
                      <RadioGroup
                        value={editingQuestion.answer_type}
                        onValueChange={(value) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            answer_type: value,
                            answer:
                              value === "mcq" ? "" : editingQuestion.answer,
                            options:
                              value === "mcq"
                                ? editingQuestion.options.length > 0
                                  ? editingQuestion.options
                                  : [
                                      { text: "", is_correct: false },
                                      { text: "", is_correct: false },
                                    ]
                                : [],
                          })
                        }
                        orientation="horizontal"
                      >
                        <Radio value="answer_based">
                          Answer Based Question
                        </Radio>
                        <Radio value="mcq">
                          Multiple Choice Question (MCQ)
                        </Radio>
                      </RadioGroup>
                    </div>

                    {/* Conditional Answer/Options Based on Answer Type */}
                    {editingQuestion.answer_type === "answer_based" &&
                      editingQuestion.file_type === "text" && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Answer
                          </label>
                          <Textarea
                            value={editingQuestion.answer}
                            onChange={(e) =>
                              setEditingQuestion({
                                ...editingQuestion,
                                answer: e.target.value,
                              })
                            }
                            minRows={3}
                          />
                        </div>
                      )}

                    {editingQuestion.answer_type === "answer_based" &&
                      editingQuestion.file_type === "html" && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Rich Text Answer
                          </label>
                          <QuillWrapper
                            value={editingQuestion.answer}
                            onChange={(value) =>
                              setEditingQuestion({
                                ...editingQuestion,
                                answer: value,
                              })
                            }
                          />
                        </div>
                      )}

                    {editingQuestion.answer_type === "mcq" && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          MCQ Options
                        </label>
                        <div className="space-y-3">
                          {editingQuestion.options.map((option, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-3 border rounded-lg"
                            >
                              <Checkbox
                                isSelected={option.is_correct}
                                onValueChange={(checked) =>
                                  updateMCQOption(
                                    index,
                                    "is_correct",
                                    checked,
                                    true
                                  )
                                }
                              />
                              <Input
                                placeholder={`Option ${index + 1}`}
                                value={option.text}
                                onChange={(e) =>
                                  updateMCQOption(
                                    index,
                                    "text",
                                    e.target.value,
                                    true
                                  )
                                }
                                className="flex-1"
                              />
                              {editingQuestion.options.length > 2 && (
                                <Button
                                  isIconOnly
                                  size="sm"
                                  color="danger"
                                  variant="light"
                                  onPress={() => removeMCQOption(index, true)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="bordered"
                            onPress={() => addMCQOption(true)}
                            startContent={<Plus className="h-4 w-4" />}
                          >
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}

                    {editingQuestion.file_type === "image" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Upload Image
                        </label>
                        <ImageUploader
                          value={editingQuestion.file_url}
                          onUploadComplete={(url) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              file_url: url,
                            })
                          }
                        />
                      </div>
                    )}

                    {["pdf", "docx", "xls"].includes(
                      editingQuestion.file_type
                    ) && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Upload File
                        </label>
                        <FileUploader
                          data={{ file: editingQuestion.file_url }}
                          onUploadComplete={(url) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              file_url: url,
                            })
                          }
                        />
                      </div>
                    )}

                    {/* Hide file URL input when file type is "text" */}
                    {editingQuestion.file_type !== "text" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          File URL (Optional)
                        </label>
                        <Input
                          placeholder="Enter file URL"
                          value={editingQuestion.file_url || ""}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              file_url: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    {/* Year & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Year
                        </label>
                        <Input
                          type="number"
                          value={editingQuestion.year.toString()}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              year: Number.parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Difficulty
                        </label>
                        <Select
                          aria-label="Select Difficulty"
                          className="w-full flex-grow"
                          selectedKeys={
                            editingQuestion.difficulty
                              ? new Set([editingQuestion.difficulty])
                              : new Set()
                          }
                          onSelectionChange={(keys) => {
                            const selectedDifficulty =
                              Array.from(keys)[0] || "";
                            setEditingQuestion({
                              ...editingQuestion,
                              difficulty: selectedDifficulty,
                            });
                          }}
                        >
                          <SelectItem key="easy" value="easy">
                            Easy
                          </SelectItem>
                          <SelectItem key="medium" value="medium">
                            Medium
                          </SelectItem>
                          <SelectItem key="hard" value="hard">
                            Hard
                          </SelectItem>
                        </Select>
                      </div>
                    </div>

                    {/* Topics Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Topics
                      </label>
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                        {topics.map((topic) => (
                          <Chip
                            key={topic.id}
                            color={
                              selectedTopics.includes(topic.id)
                                ? "primary"
                                : "default"
                            }
                            variant={
                              selectedTopics.includes(topic.id)
                                ? "solid"
                                : "bordered"
                            }
                            className="cursor-pointer"
                            onClick={() => toggleTopicSelection(topic.id)}
                          >
                            {topic.name}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {/* Explanation Section */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Explanation (Optional)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Provide a detailed explanation that supports text,
                        images, and videos
                      </p>
                      <QuillWrapper
                        value={editingQuestion.explanation || ""}
                        onChange={(value) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            explanation: value,
                          })
                        }
                        placeholder="Enter explanation with rich text, images, and videos..."
                      />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button color="primary" onPress={handleUpdateQuestion}>
                    <Check className="h-4 w-4 mr-1" /> Update Question
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Deletion</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete this question? This action
                  cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={() =>
                    questionToDelete && handleDeleteQuestion(questionToDelete)
                  }
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Explanation Modal */}
      <Modal
        scrollBehavior="inside"
        isOpen={explanationModalOpen}
        onOpenChange={setExplanationModalOpen}
        size="3xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Question Explanation
              </ModalHeader>
              <ModalBody>
                {currentExplanation ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: currentExplanation,
                    }}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No explanation available for this question.
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
