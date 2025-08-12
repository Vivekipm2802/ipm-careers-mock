"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Textarea,
  Radio,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spacer,
  DatePicker,
  DateInput,
  Switch,
} from "@nextui-org/react";
import { supabase } from "@/utils/supabaseClient";
import { CtoLocal } from "@/utils/DateUtil";
import { Plus, Sparkle, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import dynamic from "next/dynamic";
import {
  parseAbsoluteToLocal,
  parseDate,
  parseZonedDateTime,
} from "@internationalized/date";
import { format, formatISO, isValid, parse, parseISO } from "date-fns";
const QuillWrapper = dynamic(() => import("@/components/QuillSSRWrapper"), {
  ssr: false,
});

export default function RCManager() {
  const [questions, setQuestions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [isGenerating, setGenerating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    title: "",
    content: "",
    type: "options",
    options: [],

    date: new Date().toISOString().split("T")[0],
    cop: "",
    explanation: "",
  });

  async function getQuestions() {
    const { data, error } = await supabase
      .from("daily_rc")
      .select("*,answer_key(*)")
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  }

  async function getQuestionById(id) {
    const { data, error } = await supabase
      .from("daily_rc")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  async function createQuestion(question) {
    // Extract answer_key and remove it from question
    const { answer_key, ...questionData } = question;

    if (!answer_key) throw new Error("answer_key is required");

    // Insert into daily_rc_keys first
    const { data: keyData, error: keyError } = await supabase
      .from("daily_rc_keys")
      .insert([
        {
          correct: answer_key.correct,
          solution: answer_key.solution,
        },
      ])
      .select("uid") // Get the UUID
      .single(); // Ensure we get only one row

    if (keyError) throw keyError;

    // Insert the question with the answer_key as the new UUID
    const { data, error } = await supabase
      .from("daily_rc")
      .insert([{ ...questionData, answer_key: keyData.uid }])
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async function updateQuestion(id, updates) {
    const { answer_key, ...questionData } = updates;

    if (!answer_key) throw new Error("answer_key is required");

    const { data: keyData, error: keyError } = await supabase
      .from("daily_rc_keys")
      .insert([
        {
          correct: answer_key.correct,
          solution: answer_key.solution,
        },
      ])
      .select("uid") // Get the UUID
      .single(); // Ensure we get only one row

    if (keyError) throw keyError;

    const { data, error } = await supabase
      .from("daily_rc")
      .update({ ...questionData, answer_key: keyData?.uid })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  }

  async function deleteQuestion(id) {
    const { error } = await supabase.from("daily_rc").delete().eq("id", id);

    if (error) throw error;
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      const fetchedQuestions = await getQuestions();
      setQuestions(fetchedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  }

  async function handleSaveQuestion() {
    try {
      if (modalMode === "create") {
        await createQuestion(currentQuestion);
      } else {
        await updateQuestion(currentQuestion.id, currentQuestion);
      }
      setIsModalOpen(false);
      setCurrentQuestion({
        title: "",
        content: "",
        type: "options",
        options: [],

        date: new Date().toISOString().split("T")[0],
        cop: "",
        explanation: "",
      });
      fetchQuestions();
    } catch (error) {
      console.error(
        `Error ${modalMode === "create" ? "creating" : "updating"} question:`,
        error
      );
    }
  }

  async function handleDeleteQuestion(id) {
    try {
      await deleteQuestion(id);
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  }

  async function generateRC() {
    const r = toast.loading("Generating RC....");
    setGenerating(true);
    try {
      const response = await fetch("/api/generateRC", {
        method: "POST",
      });
      const result = await response.json();

      toast.remove(r);
      if (result.success) {
        toast.success("Generated RC Successfully");
        fetchQuestions();
      } else {
        toast.error(result.message || "Error Generating RC");
      }
    } catch (error) {
      toast.remove(r);
      toast.error("Error Generating RC");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (modalMode == "create") {
      setCurrentQuestion();
    }
  }, [modalMode]);

  return (
    <div className="container w-full h-full text-left mx-auto px-4 py-8 overflow-y-auto">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold mb-4">Questions Admin</h1>

        <div className="flex flex-row items-center justify-end">
          <Button
            size="sm"
            startContent={
              <Sparkle size={16} fill="black" className="rotate-45 "></Sparkle>
            }
            color="secondary"
            onPress={() => {
              generateRC();
            }}
            isLoading={isGenerating}
            className="mb-4 text-black"
          >
            Generate RC
          </Button>
          <Spacer x={2}></Spacer>
          <Button
            size="sm"
            startContent={<Plus size={20}></Plus>}
            color="primary"
            onPress={() => {
              setModalMode("create");
              setIsModalOpen(true);
            }}
            className="mb-4"
          >
            Create New Question
          </Button>
        </div>
      </div>

      <Table aria-label="Questions table">
        <TableHeader>
          <TableColumn>DATE</TableColumn>
          <TableColumn>TITLE</TableColumn>
          <TableColumn>TYPE</TableColumn>

          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {questions &&
            questions.map((question) => (
              <TableRow key={question?.id}>
                <TableCell>
                  <div className="flex bg-green-50 rounded-xl p-2 flex-col items-center justify-center text-center">
                    <h2 className="text-xl font-bold text-green-500">
                      {CtoLocal(question?.date).date}
                    </h2>
                    <p className="text-green-700 text-xs">
                      {CtoLocal(question?.date).monthName}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{question?.title}</TableCell>
                <TableCell>{question?.type}</TableCell>

                <TableCell>
                  <div className="flex flex-row items-center justify-end">
                    <Button
                      size="sm"
                      color="primary"
                      onPress={() => {
                        setModalMode("edit");
                        setCurrentQuestion(question);
                        setIsModalOpen(true);
                      }}
                      className="mr-2"
                    >
                      Edit
                    </Button>
                    <Spacer x={2}></Spacer>
                    <Button
                      size="sm"
                      color="danger"
                      onPress={() => handleDeleteQuestion(question.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <QuestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        question={currentQuestion}
        setQuestion={setCurrentQuestion}
        onSave={handleSaveQuestion}
        mode={modalMode}
      />
    </div>
  );
}

function QuestionModal({
  isOpen,
  onClose,
  question,
  setQuestion,
  onSave,
  mode,
}) {
  return (
    <Modal scrollBehavior="inside" isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {mode === "create" ? "Create New Question" : "Edit Question"}
        </ModalHeader>
        <ModalBody>
          <Input
            label="Title"
            value={question?.title}
            onChange={(e) =>
              setQuestion({ ...question, title: e.target.value })
            }
            className="mb-2"
          />
          <label className="text-sm">Content</label>
          <QuillWrapper
            label="Content"
            value={question?.content ?? ""}
            onChange={(e) => setQuestion((prev) => ({ ...prev, content: e }))}
            className="mb-2"
          />

          {(question?.type === "options" || mode == "create") && (
            <div className="mb-2">
              <p className="text-sm font-medium mb-2">Options:</p>
              {question?.options?.map((option, index) => (
                <div key={index} className="flex items-center mb-2">
                  <Switch
                    size="sm"
                    color="success"
                    onValueChange={(value) => {
                      setQuestion((res) => ({
                        ...res,
                        answer_key: {
                          ...res.answer_key,
                          correct:
                            value == true ? index : res.answer_key.correct,
                        },
                      }));
                    }}
                    isSelected={index == question?.answer_key?.correct}
                    title="is Correct?"
                  ></Switch>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...question?.options];
                      newOptions[index] = e.target.value;
                      setQuestion({ ...question, options: newOptions });
                    }}
                    classNames={{ input: "text-xs" }}
                    className="ml-2 flex-grow"
                  />
                  <Button
                    size="sm"
                    color="danger"
                    onPress={() => {
                      const newOptions = question.options.filter(
                        (_, i) => i !== index
                      );
                      setQuestion({ ...question, options: newOptions });
                    }}
                    className="ml-2"
                    isIconOnly
                  >
                    <Trash2 size={16}></Trash2>
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                color="primary"
                onPress={() =>
                  setQuestion({
                    ...question,
                    options: [
                      ...(Array.isArray(question.options)
                        ? question.options
                        : []),
                      "",
                    ],
                  })
                }
                className="mt-2"
              >
                Add Option
              </Button>
            </div>
          )}

          {mode === "create" && (
            <Input
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                selectedDate.setHours(0, 0, 0, 0); // Set time to 00:00:00.000
                setQuestion((res) => ({
                  ...res,
                  date: selectedDate.toISOString(),
                })); // Save as UNIX timestamp in seconds
              }}
              type="date"
              label="Date"
              placeholder="Enter Date"
            />
          )}

          <label className="text-sm">Solution</label>
          <QuillWrapper
            label="Explanation"
            value={question?.answer_key?.solution ?? ""}
            onChange={(e) =>
              setQuestion((prev) => ({
                ...prev,
                answer_key: {
                  ...prev?.answer_key,
                  solution: e,
                },
              }))
            }
            className="mb-2"
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={onSave}>
            {mode === "create" ? "Create" : "Save"}
          </Button>
          <Button color="danger" onPress={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
