"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
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
} from "@nextui-org/react"
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
} from "lucide-react"
import ImageUploader from "./ImageUploader"
import { supabase } from "@/utils/supabaseClient"
import dynamic from "next/dynamic"
import FileUploader from "./FileUploader"


const QuillWrapper = dynamic(() => import("@/components/QuillSSRWrapper"), { ssr: false })
export default function PYQManager({ isAdmin = false, viewBy, filterValue: initialFilterValue }) {
  // State
  const [questions, setQuestions] = useState([])
  const [topics, setTopics] = useState([])
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    answer: "",
    year: new Date().getFullYear(),
    difficulty: "medium",
    file_type: undefined,
    file_url: "",
  })
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [newTopic, setNewTopic] = useState({ name: "", description: "" })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState(null)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [filterValue, setFilterValue] = useState(initialFilterValue)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await Promise.all([fetchTopics(), fetchYears()])
      setDataLoaded(true)
      setLoading(false)
    }

    loadInitialData()
  }, [])

  // Update filter value when initialFilterValue changes
  useEffect(() => {
    setFilterValue(initialFilterValue)
  }, [initialFilterValue])

  // Fetch questions when filter value changes or data is loaded
  useEffect(() => {
    if (dataLoaded && filterValue) {
      fetchQuestions()
    }
  }, [viewBy, filterValue, dataLoaded])

  // Fetch all available topics
  const fetchTopics = async () => {
    const { data, error } = await supabase.from("pyq_topics").select("*").order("name")
    if (!error) setTopics(data || [])
    return data || []
  }

  // Fetch all available years
  const fetchYears = async () => {
    const { data, error } = await supabase.from("pyq_questions").select("year").order("year", { ascending: false })
    if (!error) {
      const uniqueYears = [...new Set(data?.map((item) => item.year))]
      setYears(uniqueYears)
    }
    return data || []
  }

  // Fetch questions based on view mode (year or topic)
  const fetchQuestions = async () => {
    setLoading(true)

    try {
      // Get all questions or filter by year
      let query = supabase.from("pyq_questions").select("*")
      if (viewBy === "year" && filterValue) {
        query = query.eq("year", filterValue)
      }
      const { data: questionsData, error: questionsError } = await query.order("id")

      if (questionsError) throw questionsError

      let filteredQuestions = questionsData || []

      // Filter by topic if needed
      if (viewBy === "topic" && filterValue) {
        const { data: questionTopics, error: topicsError } = await supabase
          .from("pyq_question_topics")
          .select("question_id")
          .eq("topic_id", filterValue)

        if (topicsError) throw topicsError

        const questionIds = questionTopics?.map((qt) => qt.question_id) || []
        filteredQuestions = questionsData?.filter((q) => questionIds.includes(q.id)) || []
      }

      // Add topics to each question
      const questionsWithTopics = await Promise.all(
        filteredQuestions.map(async (question) => {
          const { data: topicRelations, error: relError } = await supabase
            .from("pyq_question_topics")
            .select("topic_id")
            .eq("question_id", question.id)

          if (relError) return { ...question, topics: [] }

          const topicIds = topicRelations?.map((rel) => rel.topic_id) || []
          const questionTopics = topics.filter((topic) => topicIds.includes(topic.id))

          return { ...question, topics: questionTopics }
        }),
      )

      setQuestions(questionsWithTopics)
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle filter change
  const handleFilterChange = (value) => {
    setFilterValue(value)
    setSelectedQuestion(null)
  }

  // Save a new question
  const handleSaveNewQuestion = async () => {
    if (!newQuestion.question || !newQuestion.answer || !newQuestion.year) {
      alert("Please fill in all required fields")
      return
    }

    try {
      // Insert the new question
      const { data: questionData, error: questionError } = await supabase
        .from("pyq_questions")
        .insert([newQuestion])
        .select()

      if (questionError) throw questionError

      const newQuestionId = questionData?.[0]?.id

      // Add topic relationships
      if (newQuestionId && selectedTopics.length > 0) {
        const topicRelations = selectedTopics.map((topicId) => ({
          question_id: newQuestionId,
          topic_id: topicId,
        }))

        const { error: topicError } = await supabase.from("pyq_question_topics").insert(topicRelations)
        if (topicError) throw topicError
      }

      // Reset form and refresh questions
      setNewQuestion({
        question: "",
        answer: "",
        year: new Date().getFullYear(),
        difficulty: "medium",
        file_type: undefined,
        file_url: "",
      })
      setSelectedTopics([])
      setIsAddingQuestion(false)
      fetchQuestions()
    } catch (error) {
      console.error("Error adding question:", error)
    }
  }

  // Update an existing question
  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return

    try {
      // Update the question
      const { error: questionError } = await supabase
        .from("pyq_questions")
        .update({
          question: editingQuestion.question,
          answer: editingQuestion.answer,
          year: editingQuestion.year,
          difficulty: editingQuestion.difficulty,
          file_url: editingQuestion.file_url,
          file_type: editingQuestion.file_type,
        })
        .eq("id", editingQuestion.id)

      if (questionError) throw questionError

      // Delete existing topic relationships
      const { error: deleteError } = await supabase
        .from("pyq_question_topics")
        .delete()
        .eq("question_id", editingQuestion.id)

      if (deleteError) throw deleteError

      // Add new topic relationships
      if (selectedTopics.length > 0) {
        const topicRelations = selectedTopics.map((topicId) => ({
          question_id: editingQuestion.id,
          topic_id: topicId,
        }))

        const { error: topicError } = await supabase.from("pyq_question_topics").insert(topicRelations)
        if (topicError) throw topicError
      }

      // Update the selected question if it's the one being edited
      if (selectedQuestion && selectedQuestion.id === editingQuestion.id) {
        const updatedQuestion = {
          ...editingQuestion,
          topics: topics.filter((topic) => selectedTopics.includes(topic.id)),
        }
        setSelectedQuestion(updatedQuestion)
      }

      // Reset form and refresh questions
      setEditingQuestion(null)
      setSelectedTopics([])
      fetchQuestions()
    } catch (error) {
      console.error("Error updating question:", error)
    }
  }

  // Delete a question
  const handleDeleteQuestion = async (id) => {
    try {
      // Delete topic relationships first
      await supabase.from("pyq_question_topics").delete().eq("question_id", id)

      // Delete the question
      const { error: questionError } = await supabase.from("pyq_questions").delete().eq("id", id)
      if (questionError) throw questionError

      // If the deleted question is the selected one, clear the selection
      if (selectedQuestion && selectedQuestion.id === id) {
        setSelectedQuestion(null)
      }

      setDeleteConfirmOpen(false)
      setQuestionToDelete(null)
      fetchQuestions()
    } catch (error) {
      console.error("Error deleting question:", error)
    }
  }

  // Add a new topic
  const handleAddTopic = async () => {
    if (!newTopic.name) {
      alert("Please enter a topic name")
      return
    }

    try {
      const { error } = await supabase.from("pyq_topics").insert([newTopic])
      if (error) throw error

      setNewTopic({ name: "", description: "" })
      setIsAddingTopic(false)
      await fetchTopics()
    } catch (error) {
      console.error("Error adding topic:", error)
    }
  }

  // Helper functions
  const startEditingQuestion = (question) => {
    setEditingQuestion(question)
    setSelectedTopics(question.topics?.map((t) => t.id) || [])
  }

  const toggleTopicSelection = (topicId) => {
    setSelectedTopics((prev) => (prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]))
  }

  const confirmDeleteQuestion = (id) => {
    setQuestionToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-5 w-5" />
      case "docx":
        return <FileText className="h-5 w-5" />
      case "xls":
        return <FileSpreadsheet className="h-5 w-5" />
      case "html":
        return <FileCode className="h-5 w-5" />
      case "image":
        return <FileImage className="h-5 w-5" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  // Render the filter selector
const renderFilterSelector = () => {
    if (viewBy === "year") {
      return (
        <div className="flex items-center gap-2 w-full">
        
        <Select
  aria-label="Select Year"
  placeholder="Select Year"
  className="w-full flex-grow"
  items={years}
  selectedKeys={[filterValue?.toString()]}
  onSelectionChange={(keys) => {
    const selectedYear = keys.anchorKey; // Convert Set to array and get first value
    handleFilterChange(Number(years[selectedYear]));
  }}
>
  {years.map((year,index) => (
    <SelectItem key={index} value={year}>
      {year}
    </SelectItem>
  ))}
</Select>
          <Spacer x={4}></Spacer>
          <Calendar className="h-4 w-4 flex-shrink-0" />
        </div>
      );
    } else if (viewBy === "topic") {
      return (
        <div className="flex items-center gap-2 flex-1">
       
          <Select
            aria-label="Select Topic"
            placeholder="Select Topic"
            className="w-full flex-grow"
            selectedKeys={filterValue ? [filterValue.toString()] : []}
            onChange={(e) => handleFilterChange(Number(e.target.value))}
          >
            {topics.map((topic) => (
              <SelectItem key={topic.id.toString()} value={topic.id.toString()}>
                {topic.name}
              </SelectItem>
            ))}
          </Select>  
          <Spacer x={4}></Spacer>
           <Tag className="h-4 w-4 flex-shrink-0" />
           <Spacer x={4}></Spacer>
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
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        {selectedQuestion ? (
          <Button
            variant="light"
            startContent={<ArrowLeft className="h-4 w-4" />}
            onPress={() => setSelectedQuestion(null)}
          >
            Back to List
          </Button>
        ) : (
          <div className="flex w-full items-center gap-4">{renderFilterSelector()}</div>
        )}

        {isAdmin && !selectedQuestion && (
          <Button color="primary" onPress={() => setIsAddingQuestion(true)} startContent={<Plus className="h-4 flex-shrink-0 w-4" />}>
            Add Question
          </Button>
        )}
      </div>

      {/* Content - scrollable area */}
      <div className="flex-grow overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : !filterValue ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Filter className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              Please select a {viewBy === "year" ? "year" : "topic"} to view questions
            </p>
          </div>
        ) : questions.length === 0 ? (
          <Card shadow="none">
            <CardBody className="flex flex-col items-center justify-center h-64">
              <p className="text-gray-500 mb-4">No questions found for this {viewBy}.</p>
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
                
                <Chip variant="flat" color="default">Year: {selectedQuestion.year}</Chip>
                <Chip variant="flat" color="default" className="capitalize">{selectedQuestion.difficulty}</Chip>
                {selectedQuestion.topics?.map((topic) => (
                  <Chip key={topic.id} color="secondary" variant="flat">{topic.name}</Chip>
                ))}
               {/*  {selectedQuestion.file_type && (
                  <Chip variant="flat" color="primary" startContent={getFileIcon(selectedQuestion.file_type)}>
                    {selectedQuestion.file_type.toUpperCase()}
                  </Chip>
                )} */}
              </div>
             
              {/* Question Title */}
              <h3 className="mt-2 text-xl text-left font-bold">{selectedQuestion.question}</h3>
        
             
            </div>
        
            {/* Action Buttons */}
            <div className="flex gap-2">
              {selectedQuestion.file_url && (
                <Tooltip content={`Download ${selectedQuestion.file_type?.toUpperCase() || "file"}`}>
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
                  <Button isIconOnly variant="light" onPress={() => startEditingQuestion(selectedQuestion)}>
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
        
            {/* Answer is Always Displayed Using dangerouslySetInnerHTML */}
            <div dangerouslySetInnerHTML={{ __html: selectedQuestion.answer }} />
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
            <h2 className="text-md text-left font-medium text-primary">Showing results for : <span className="capitalize">{viewBy == 'year' ? viewBy : ''}</span> {viewBy == 'year' ? filterValue : topics[filterValue]?.name}</h2>
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
                      <h3 className="font-medium line-clamp-2">{question.question}</h3>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Chip size="sm" variant="flat" color="secondary">
                          {question.year}
                        </Chip>
                        <Chip size="sm" variant="flat" color="primary" className="capitalize">
                          {question.difficulty}
                        </Chip>
                        {question.file_type && (
                          <Chip size="sm" variant="flat" color="primary" startContent={getFileIcon(question.file_type)}>
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
                            startEditingQuestion(question)
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
                            confirmDeleteQuestion(question.id)
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
      <Modal scrollBehavior="inside" isOpen={isAddingQuestion} onOpenChange={setIsAddingQuestion} size="2xl">
  <ModalContent>
    {(onClose) => (
      <>
        <ModalHeader>Add New Question</ModalHeader>
        <ModalBody>
          <div className="grid gap-4">
            {/* File Type Selector Moved to Top */}
            <div>
              <label className="block text-sm font-medium mb-1">File Type</label>
              <Select
                aria-label="Select File Type"
                placeholder="Select File Type"
                className="w-full flex-grow"
                selectedKeys={newQuestion.file_type ? new Set([newQuestion.file_type]) : new Set()}
                onSelectionChange={(keys) => {
                  const selectedFileType = Array.from(keys)[0] || "";
                  setNewQuestion({ ...newQuestion, file_type: selectedFileType });
                }}
              >
                <SelectItem key="pdf" value="pdf">PDF</SelectItem>
                <SelectItem key="docx" value="docx">DOCX</SelectItem>
                <SelectItem key="xls" value="xls">XLS</SelectItem>
                <SelectItem key="html" value="html">HTML</SelectItem>
                <SelectItem key="image" value="image">Image</SelectItem>
                <SelectItem key="text" value="text">Text</SelectItem>
              </Select>
            </div>

            {/* Conditional Inputs Based on File Type */}
            {newQuestion.file_type != "html" && (
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
            {newQuestion.file_type === "html" && (
              <div>
                <label className="block text-sm font-medium mb-1">Question/Answer in Rich Text Editor</label>
                <QuillWrapper
                  value={newQuestion.answer}
                  onChange={(value) => setNewQuestion({ ...newQuestion, answer: value })}
                />
              </div>
            )}
            {newQuestion.file_type === "image" && (
              <div>
                <label className="block text-sm font-medium mb-1">Question/Answer Image</label>
                <ImageUploader
                  value={newQuestion.file_url}
                  onUploadComplete={(url) => setNewQuestion({ ...newQuestion, file_url: url })}
                />
              </div>
            )}
            {["pdf", "docx", "xls"].includes(newQuestion.file_type) && (
              <div>
                <label className="block text-sm font-medium mb-1">File Uploader</label>
                <FileUploader
                  data={{file:newQuestion.file_url}}
                  onUploadComplete={(url) => setNewQuestion({ ...newQuestion, file_url: url })}
                />
              </div>
            )}

            {/* Question Input */}
            <div>
              <label className="block text-sm font-medium mb-1">Question</label>
              <Textarea
                placeholder="Enter the question text"
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                minRows={3}
              />
            </div>

            {/* Year & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <Input
                  type="number"
                  placeholder="Year"
                  value={newQuestion.year?.toString()}
                  onChange={(e) => setNewQuestion({ ...newQuestion, year: Number.parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Difficulty</label>
                <Select
                  aria-label="Select Difficulty"
                  className="w-full flex-grow"
                  selectedKeys={new Set([newQuestion.difficulty])}
                  onSelectionChange={(keys) => {
                    const selectedDifficulty = Array.from(keys)[0];
                    setNewQuestion({ ...newQuestion, difficulty: selectedDifficulty });
                  }}
                >
                  <SelectItem key="easy" value="easy">Easy</SelectItem>
                  <SelectItem key="medium" value="medium">Medium</SelectItem>
                  <SelectItem key="hard" value="hard">Hard</SelectItem>
                </Select>
              </div>
            </div>

            {/* Topics Selection */}
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
              startContent={<Plus className="h-3 flex-shrink-0 w-3" />}
            >
              Add Topic
            </Button>
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
              <ModalHeader>Add New Topic</ModalHeader>
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
                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                    <Textarea
                      placeholder="Enter topic description"
                      value={newTopic.description}
                      onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
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
      <Modal scrollBehavior="inside" isOpen={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)} size="2xl">
  <ModalContent>
    {(onClose) =>
      editingQuestion && (
        <>
          <ModalHeader>Edit Question</ModalHeader>
          <ModalBody>
            <div className="grid gap-4">
              {/* File Type Selector at the Top */}
              <div>
                <label className="block text-sm font-medium mb-1">File Type</label>
                <Select
                  aria-label="Select File Type"
                  placeholder="Select File Type"
                  className="w-full flex-grow"
                  selectedKeys={editingQuestion.file_type ? new Set([editingQuestion.file_type]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selectedFileType = Array.from(keys)[0] || "";
                    setEditingQuestion({ ...editingQuestion, file_type: selectedFileType, file_url: "" });
                  }}
                >
                  <SelectItem key="text" value="text">Text</SelectItem>
                  <SelectItem key="html" value="html">HTML</SelectItem>
                  <SelectItem key="image" value="image">Image</SelectItem>
                  <SelectItem key="pdf" value="pdf">PDF</SelectItem>
                  <SelectItem key="docx" value="docx">DOCX</SelectItem>
                  <SelectItem key="xls" value="xls">XLS</SelectItem>
                </Select>
              </div>

              {/* Question Input */}
              <div>
                <label className="block text-sm font-medium mb-1">Question</label>
                <Textarea
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  minRows={3}
                />
              </div>

              {/* Conditional Answer/Input based on File Type */}
              {editingQuestion.file_type === "text" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Answer</label>
                  <Textarea
                    value={editingQuestion.answer}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                    minRows={3}
                  />
                </div>
              )}

              {editingQuestion.file_type === "html" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Rich Text Answer</label>
                  <QuillWrapper
                    value={editingQuestion.answer}
                    onChange={(value) => setEditingQuestion({ ...editingQuestion, answer: value })}
                  />
                </div>
              )}

              {editingQuestion.file_type === "image" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Upload Image</label>
                  <ImageUploader
                    value={editingQuestion.file_url}
                    onUploadComplete={(url) => setEditingQuestion({ ...editingQuestion, file_url: url })}
                  />
                </div>
              )}

              {["pdf", "docx", "xls"].includes(editingQuestion.file_type) && (
                <div>
                  <label className="block text-sm font-medium mb-1">Upload File</label>
                  <FileUploader
                    data={{file:editingQuestion.file_url}}
                    onUploadComplete={(url) => setEditingQuestion({ ...editingQuestion, file_url: url })}
                  />
                </div>
              )}

              {/* Hide file URL input when file type is "text" */}
              {editingQuestion.file_type !== "text" && (
                <div>
                  <label className="block text-sm font-medium mb-1">File URL (Optional)</label>
                  <Input
                    placeholder="Enter file URL"
                    value={editingQuestion.file_url || ""}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, file_url: e.target.value })}
                  />
                </div>
              )}

              {/* Year & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <Input
                    type="number"
                    value={editingQuestion.year.toString()}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, year: Number.parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <Select
                    aria-label="Select Difficulty"
                    className="w-full flex-grow"
                    selectedKeys={editingQuestion.difficulty ? new Set([editingQuestion.difficulty]) : new Set()}
                    onSelectionChange={(keys) => {
                      const selectedDifficulty = Array.from(keys)[0] || "";
                      setEditingQuestion({ ...editingQuestion, difficulty: selectedDifficulty });
                    }}
                  >
                    <SelectItem key="easy" value="easy">Easy</SelectItem>
                    <SelectItem key="medium" value="medium">Medium</SelectItem>
                    <SelectItem key="hard" value="hard">Hard</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Topics Selection */}
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
      <Modal isOpen={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Deletion</ModalHeader>
              <ModalBody>
                <p>Are you sure you want to delete this question? This action cannot be undone.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button color="danger" onPress={() => questionToDelete && handleDeleteQuestion(questionToDelete)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

