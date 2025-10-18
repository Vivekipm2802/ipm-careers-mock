"use client";

import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  Tab,
  Image,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Spacer,
  Switch,
  Tooltip,
} from "@nextui-org/react";
import { useNMNContext } from "./NMNContext";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { pdfjs } from "react-pdf";
import ImageUploader from "./ImageUploader";
import { supabase } from "@/utils/supabaseClient";
import { CtoLocal } from "@/utils/DateUtil";
import {
  Brain,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  File,
  MoreVertical,
  Plus,
  Text,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import Loader from "./Loader";
import FileUploader from "./FileUploader";

// Dynamically import QuillWrapper to avoid SSR issues
const QuillWrapper = dynamic(() => import("./QuillSSRWrapper"), { ssr: false });

export default function DailyLearn({ role }) {
  const [mediaTypes, setMediaTypes] = useState();
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState();
  const [addNew, setAddNew] = useState();
  const [selectedMedia, setSelectedMedia] = useState();
  const { ctxSlug, userDetails } = useNMNContext();
  const [activeMedia, setActiveMedia] = useState();
  const [mediaCollection, setMediaCollection] = useState();
  const [editItemData, setEditItemData] = useState();
  const [submissions, setSubmissions] = useState();
  const [selectedOption, setSelectedOption] = useState();
  const [allQuizQuestions, setAllQuizQuestions] = useState([]);
  const [currentViewQuestionIndex, setCurrentViewQuestionIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState([]);

  // New state for adding new items
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    type: "",
    image: null,
    url: "",
    options: [{ text: "" }],
    correct: 0,
  });

  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

  async function getMedia(identifier) {
    const { data, error } = await supabase
      .from("ca")
      .select("*")
      .eq("type", identifier)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Unable to Load Selected Items");
      return;
    }

    if (data) {
      const parentItems = data.filter(item => item.parent_id === null);
      setMediaCollection(parentItems);
      return;
    }
  }

  async function getQuizQuestions(quizId) {
    const { data, error } = await supabase
      .from("ca")
      .select("*")
      .or(`id.eq.${quizId},parent_id.eq.${quizId}`)
      .order("question_order", { ascending: true });
    
    if (error) {
      toast.error("Unable to load quiz questions");
      return [];
    }
    
    return data || [];
  }

  async function deleteItem(a) {
    const { data, error } = await supabase
      .from("ca")
      .delete()
      .eq("id", a)
      .select();
    if (error) {
      toast.error("Unable to Delete");
      return;
    }
    if (data) {
      toast.success("Deleted Successfully");
      getMedia(activeMedia);
      return;
    }
  }

  useEffect(() => {
    if (activeMedia != undefined) {
      setSelectedMedia(null);
      getMedia(activeMedia);
    }
  }, [activeMedia]);

  async function getSubmissions(id) {
    const { data, error } = await supabase
      .from("ca_plays")
      .select("*")
      .eq("ca_id", id);
    if (error) {
      toast.error("Error loading submissions");
      return;
    }
    if (data) {
      setSubmissions(data);

      return;
    }
  }

  useEffect(() => {
    async function loadQuizData() {
      if (selectedMedia != undefined) {
        const questions = await getQuizQuestions(selectedMedia.id);
        setAllQuizQuestions(questions);
        setCurrentViewQuestionIndex(0);
        
        if (questions.length > 0) {
          getSubmissions(questions[0].id);
        }
      }
      setSelectedOption(null);
    }
    
    loadQuizData();
  }, [selectedMedia?.id]);

  async function submitAnswer(option, id) {
    const { data, error } = await supabase
      .from("ca_plays")
      .insert({
        ca_id: id,
        selected: option,
      })
      .select();
    if (error) {
      toast.error("Unable to Submit");
      return;
    }
    if (data) {
      getSubmissions(selectedMedia?.id);
      toast.success("Submitted Answer");
      return;
    }
  }

  async function fetchTypes() {
    const { data, error } = await supabase
      .from("ca_categories")
      .select("*")
      .order("title", { ascending: true });
    if (error) {
      toast.error("Unable to Load Categories");
      setLoading(false);
      return;
    }
    if (data) {
      setMediaTypes(data);
      setLoading(false);
      return;
    }
  }

  useEffect(() => {
    fetchTypes();
  }, []);

  const mtypes = [
    {
      title: "Quiz",
      type: "quiz",
      icon: <Brain size={16}></Brain>,
    },
    {
      title: "Media",
      type: "media",
      icon: <File size={16}></File>,
    },
    {
      title: "Knowledge",
      type: "knowledge",
      icon: <Text size={16}></Text>,
    },
  ];

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <Loader></Loader>
      </div>
    );
  }

  async function addNewCategory(categoryData) {
    const { data, error } = await supabase
      .from("ca_categories")
      .insert(categoryData)
      .select();
    if (data) {
      toast.success("Added New Category");
      fetchTypes();
      return;
    }
    if (error) {
      toast.error("Unable to Create");
      return;
    }
  }

  async function updateCategory(categoryData) {
    const { data, error } = await supabase
      .from("ca_categories")
      .update(categoryData)
      .eq("id", categoryData?.id)
      .select();
    if (data) {
      toast.success("Updated Category");
      fetchTypes();
      return;
    }
    if (error) {
      toast.error("Unable to Update");
      return;
    }
  }

  async function deleteCategory(id) {
    const { data, error } = await supabase
      .from("ca_categories")
      .delete()
      .eq("id", id)
      .select();
    if (data) {
      toast.success("Deleted Category");
      fetchTypes();
      return;
    }
    if (error) {
      toast.error("Unable to Delete");
      return;
    }
  }

  async function updateItem(updateData) {
    const { data, error } = await supabase
      .from("ca")
      .update(updateData)
      .eq("id", updateData?.id)
      .select();
    if (error) {
      toast.error("Unable to Update");
      return;
    }
    if (data) {
      getMedia(activeMedia);
      toast.success("Updated Successfully");
      return;
    }
  }

  // Function to add current question to the quiz questions array
  function addQuestionToQuiz() {
    const currentType = mediaTypes.find(
      (item) => item.identifier === activeMedia
    )?.type;

    if (currentType !== "quiz") return;

    // Validate current question
    if (!newItem.title || newItem.options.some((opt) => !opt.text)) {
      toast.error("Please fill in all question fields");
      return;
    }

    // Keep the title after first question
    const titleToKeep = quizQuestions.length === 0 ? newItem.title : quizQuestions[0].title;

    // Deep copy the current question to avoid reference issues
    const questionToAdd = {
      ...newItem,
      options: newItem.options.map(opt => ({ ...opt })),
    };

    // Add current question to the array
    setQuizQuestions([...quizQuestions, questionToAdd]);
    
    // Create a completely fresh state object with new array reference
    const freshState = {
      title: titleToKeep,
      description: "",
      type: "",
      image: null,
      url: "",
      options: [{ text: "" }],
      correct: 0,
      solution: "",
    };
    
    // Reset form for next question
    setNewItem(freshState);
    
    toast.success(`Question ${quizQuestions.length + 1} added`);
  }

  // Function to save all quiz questions to database
  async function saveQuizWithQuestions() {
    if (quizQuestions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    try {
      // Insert first question as the quiz container (parent)
      const firstQuestion = {
        title: quizQuestions[0].title,
        description: quizQuestions[0].description || "",
        type: activeMedia,
        correct: quizQuestions[0].correct,
        options: quizQuestions[0].options,
        solution: quizQuestions[0].solution || null,
        url: quizQuestions[0].url || null,
        image: quizQuestions[0].image || null,
        parent_id: null,
        question_order: 1,
        created_at: new Date().toISOString(),
      };

      const { data: parentData, error: parentError } = await supabase
        .from("ca")
        .insert(firstQuestion)
        .select();

      if (parentError) {
        toast.error("Unable to create quiz");
        return;
      }

      const parentId = parentData[0].id;

      // Insert remaining questions as children
      if (quizQuestions.length > 1) {
        const childQuestions = quizQuestions.slice(1).map((question, index) => ({
          title: question.title,
          description: question.description || "",
          type: activeMedia,
          correct: question.correct,
          options: question.options,
          solution: question.solution || null,
          url: question.url || null,
          image: question.image || null,
          parent_id: parentId,
          question_order: index + 2,
          created_at: new Date().toISOString(),
        }));

        const { error: childError } = await supabase
          .from("ca")
          .insert(childQuestions);

        if (childError) {
          toast.error("Error adding some questions");
          return;
        }
      }

      toast.success(`Quiz created with ${quizQuestions.length} question(s)`);
      getMedia(activeMedia);
      
      // Reset state
      setQuizQuestions([]);
      setNewItem({
        title: "",
        description: "",
        type: "",
        image: null,
        url: "",
        options: [{ text: "" }],
        correct: 0,
        solution: "",
      });
    } catch (error) {
      toast.error("Error creating quiz");
      console.error(error);
    }
  }

  // Function to add a new item to the database (for non-quiz items or single questions)
  async function addNewItem() {
    // Get the current media type
    const currentType = mediaTypes.find(
      (item) => item.identifier === activeMedia
    )?.type;

    // Create the item data
    const itemData = {
      title: newItem.title,
      description: currentType === "knowledge" ? newItem.description : "",
      type: activeMedia,
      correct: newItem?.correct,
      created_at: new Date().toISOString(),
      parent_id: null,
      question_order: 1,
      ...(currentType === "quiz" && {
        options: newItem.options,
        solution: newItem.solution || null
      }),
      url: newItem.url,
      image: newItem.image,
    };

    const { data, error } = await supabase.from("ca").insert(itemData).select();
    if (data) {
      toast.success("Added New Item");
      getMedia(activeMedia);
      setNewItem({
        title: "",
        description: "",
        type: "",
        image: null,
        url: "",
        options: [{ text: "" }],
        correct: 0,
        solution: "",
      });
      return;
    }
    if (error) {
      toast.error("Unable to Create Item");
      return;
    }
  }

  // Function to add a new option for quiz type
  function addOption() {
    setNewItem((prev) => ({
      ...prev,
      options: [...prev.options, { text: "" }],
    }));
  }

  // Function to update an option
  function updateOption(index, field, value) {
    setNewItem((prev) => {
      const updatedOptions = [...prev.options];
      updatedOptions[index] = { ...updatedOptions[index], [field]: value };
      return { ...prev, options: updatedOptions };
    });
  }

  // Function to remove an option
  function removeOption(index) {
    setNewItem((prev) => {
      const updatedOptions = prev.options.filter((_, i) => i !== index);
      return { ...prev, options: updatedOptions };
    });
  }

  // Function to handle image upload
  function handleImageUpload(url, u = false) {
    if (u) {
      setEditItemData((res) => ({ ...res, image: url }));
      return;
    }
    setNewItem((prev) => ({ ...prev, image: url }));
  }

  // Navigation functions for viewing quiz questions
  function goToNextQuestion() {
    if (currentViewQuestionIndex < allQuizQuestions.length - 1) {
      const nextIndex = currentViewQuestionIndex + 1;
      setCurrentViewQuestionIndex(nextIndex);
      getSubmissions(allQuizQuestions[nextIndex].id);
      setSelectedOption(null);
    }
  }

  function goToPreviousQuestion() {
    if (currentViewQuestionIndex > 0) {
      const prevIndex = currentViewQuestionIndex - 1;
      setCurrentViewQuestionIndex(prevIndex);
      getSubmissions(allQuizQuestions[prevIndex].id);
      setSelectedOption(null);
    }
  }

  // Function to remove a question from the quiz being created
  function removeQuestionFromQuiz(index) {
    const updatedQuestions = quizQuestions.filter((_, i) => i !== index);
    setQuizQuestions(updatedQuestions);
    toast.success("Question removed");
  }

  const mediaVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.22, ease: [0.33, 1, 0.68, 1] }, // Custom cubic bezier for a smooth feel
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.18, ease: [0.33, 1, 0.68, 1] },
    },
  };

  const collectionVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.22, ease: [0.33, 1, 0.68, 1] },
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.18, ease: [0.33, 1, 0.68, 1] },
    },
  };

  // Determine the current media type
  const currentMediaType = mediaTypes?.find(
    (item) => item.identifier === activeMedia
  )?.type;

  const handleDownload = (media) => {
    const link = document.createElement("a");
    link.href = media?.url;
    link.setAttribute("target", "_blank");
    link.setAttribute("download", ""); // Suggests a download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get the current question ID (for multi-question quizzes or single items)
  const currentQuestionId = allQuizQuestions.length > 0
    ? allQuizQuestions[currentViewQuestionIndex]?.id
    : selectedMedia?.id;
    
  const currentMediaOptionExist = submissions?.some(
    (item) =>
      item.user_id == userDetails?.email && item.ca_id == currentQuestionId
  );
  const currentMediaOption = submissions?.find(
    (item) =>
      item.user_id == userDetails?.email && item.ca_id == currentQuestionId
  );
  return (
    <div className=" w-full h-full  overflow-hidden">
      <div className="w-full h-full flex flex-col justify-start align-middle items-center ">
        <div className="flex flex-col overflow-hidden items-start align-middle w-full justify-start">
          <h2 className="font-semibold text-xl text-primary mb-2">
            Select Type
          </h2>
          <div className="flex flex-row items-center justify-start">
            <Tabs
              items={mediaTypes}
              onSelectionChange={(e) => {
                setActiveMedia(e);
              }}
            >
              {mediaTypes &&
                mediaTypes.map((item) => (
                  <Tab
                    key={item.identifier}
                    title={
                      <div className="flex flex-row items-center justify-center">
                        {item.title}{" "}
                        {role == "admin" && (
                          <Popover
                            onOpenChange={(e) => {
                              e == true ? setEditData(item) : "";
                            }}
                          >
                            <PopoverTrigger>
                              <Edit2
                                size={24}
                                className="bg-primary ml-2 text-white rounded-lg p-1"
                              ></Edit2>
                            </PopoverTrigger>
                            <PopoverContent className="p-4">
                              <Input
                                value={editData?.title}
                                label="Title"
                                placeholder="Enter Title"
                                size="sm"
                                onChange={(e) => {
                                  setEditData((res) => ({
                                    ...res,
                                    title: e.target.value,
                                  }));
                                }}
                              ></Input>
                              <Spacer y={2}></Spacer>
                              <Select
                                startContent={
                                  mtypes?.find(
                                    (item) => item.type == editData?.type
                                  )?.icon
                                }
                                selectedKeys={[editData?.type]}
                                placeholder="Select Type"
                                label="Type"
                                size="sm"
                                onSelectionChange={(e) => {
                                  setEditData((res) => ({
                                    ...res,
                                    type: e.anchorKey,
                                  }));
                                }}
                              >
                                {mtypes.map((item, index) => {
                                  return (
                                    <SelectItem
                                      title={item.title}
                                      startContent={item.icon}
                                      value={item.type}
                                      key={item.type}
                                    ></SelectItem>
                                  );
                                })}
                              </Select>
                              <Spacer y={2}></Spacer>
                              <div className="flex flex-row items-center justify-between w-full">
                                <Button
                                  color="primary"
                                  onPress={() => {
                                    updateCategory(editData);
                                  }}
                                  size="sm"
                                  className="mr-auto"
                                >
                                  Update
                                </Button>
                                <Popover>
                                  <PopoverTrigger>
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      className=" bg-transparent"
                                    >
                                      <MoreVertical size={16}></MoreVertical>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <Button
                                      onPress={() => {
                                        deleteCategory(editData?.id);
                                      }}
                                      color="danger"
                                      size="sm"
                                    >
                                      Delete <Trash2 size={16}></Trash2>
                                    </Button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    }
                  ></Tab>
                ))}
            </Tabs>
            <Spacer x={2}></Spacer>

            {role == "admin" && (
              <Popover>
                <PopoverTrigger>
                  <Button size="sm" color="primary" isIconOnly>
                    <Plus size={16}></Plus>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-4">
                  <Input
                    value={addNew?.title}
                    label="Title"
                    placeholder="Enter Title"
                    size="sm"
                    onChange={(e) => {
                      setAddNew((res) => ({ ...res, title: e.target.value }));
                    }}
                  ></Input>
                  <Spacer y={2}></Spacer>
                  <Select
                    items={mtypes}
                    selectedKeys={[addNew?.type]}
                    placeholder="Select Type"
                    label="Type"
                    size="sm"
                    onSelectionChange={(e) => {
                      setAddNew((res) => ({ ...res, type: e.anchorKey }));
                    }}
                  >
                    {mtypes.map((item, index) => {
                      return (
                        <SelectItem
                          startContent={item.icon}
                          title={item.title}
                          value={item.type}
                          key={item.type}
                        ></SelectItem>
                      );
                    })}
                  </Select>
                  <Spacer y={2}></Spacer>
                  <Button
                    color="primary"
                    onPress={() => {
                      addNewCategory(addNew);
                    }}
                    size="sm"
                    className="mr-auto"
                  >
                    Add New Category
                  </Button>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="w-full flex-0 bg-gray-50  relative rounded-xl mt-2 p-0 overflow-auto ">
            {selectedMedia ? (
              <div className="flex flex-row items-center justify-start text-left px-4 py-2">
                <Button
                  startContent={<ChevronLeft></ChevronLeft>}
                  size="sm"
                  color="primary"
                  className=""
                  onClick={() => setSelectedMedia(null)}
                >
                  Back to All{" "}
                  {
                    mediaTypes.find((item) => item.identifier == activeMedia)
                      ?.title
                  }
                </Button>
              </div>
            ) : (
              <h2 className="text-left sticky top-0 bg-gray-50 z-10 mb-2 text-lg px-4 py-2 font-bold text-primary">
                Select{" "}
                {
                  mediaTypes.find((item) => item.identifier == activeMedia)
                    ?.title
                }
              </h2>
            )}

            {mediaCollection?.length == 0 && (
              <div className="flex flex-col w-full h-full justify-center items-center"></div>
            )}
            <AnimatePresence mode="wait">
              {selectedMedia ? (
                <motion.div
                  key="selectedMedia"
                  variants={mediaVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="media-container px-4 py-4 flex flex-col md:flex-row items-start justify-between"
                >
                  <div className="flex w-full md:w-auto flex-col flex-1">
                    {/* Question navigation for multi-question quizzes */}
                    {currentMediaType === "quiz" && allQuizQuestions.length > 1 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                        <Button
                          size="sm"
                          isIconOnly
                          variant="flat"
                          onClick={goToPreviousQuestion}
                          isDisabled={currentViewQuestionIndex === 0}
                        >
                          <ChevronLeft size={16} />
                        </Button>
                        <span className="text-sm font-medium text-blue-800">
                          Question {currentViewQuestionIndex + 1} of {allQuizQuestions.length}
                        </span>
                        <Button
                          size="sm"
                          isIconOnly
                          variant="flat"
                          onClick={goToNextQuestion}
                          isDisabled={currentViewQuestionIndex === allQuizQuestions.length - 1}
                        >
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    )}
                    
                    {((allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.image ??
                      (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.url) && (
                      <Image
                        src={(allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.image ??
                             (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.url}
                        className="max-w-md"
                        alt="Selected Media"
                      />
                    )}
                    <Spacer y={4}></Spacer>
                    <h2 className="text-left text-md font-semibold">
                      {(allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.title}
                    </h2>
                    <div
                      className="text-left text-sm"
                      dangerouslySetInnerHTML={{
                        __html: (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.description,
                      }}
                    ></div>
                  </div>
                  <Spacer x={2}></Spacer>
                  {currentMediaType == "quiz" &&
                    (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.options?.length > 0 && (
                      <div className="flex bg-white w-full md:w-auto rounded-xl shadow-md p-4 flex-col flex-1">
                        {currentMediaOptionExist && (
                          <>
                            {currentMediaOption?.selected ==
                              (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.correct && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 p-4 rounded-xl shadow-md text-white bg-green-500 flex items-center gap-2"
                              >
                                <CheckCircle size={24} />
                                <span>Great job! You got it right 🎉</span>
                              </motion.div>
                            )}

                            {currentMediaOption?.selected !=
                              (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.correct && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 p-4 rounded-xl shadow-md text-white bg-red-500 flex items-center gap-2"
                              >
                                <XCircle size={24} />
                                <span>
                                  Oops! That's incorrect. Try again 💡
                                </span>
                              </motion.div>
                            )}
                          </>
                        )}

                        {currentMediaOptionExist ? (
                          <h2 className="text-left w-full">
                            You have selected :{" "}
                            {
                              (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.options[
                                currentMediaOption.selected
                              ]?.text
                            }
                          </h2>
                        ) : (
                          <h2 className="text-lg font-bold text-primary text-left">
                            Select Correct Option :{" "}
                          </h2>
                        )}
                        <Spacer y={4}></Spacer>
                        <RadioGroup
                          isDisabled={currentMediaOptionExist}
                          value={
                            currentMediaOptionExist
                              ? currentMediaOption?.selected
                              : selectedOption
                          }
                          onValueChange={(e) => {
                            setSelectedOption(e);
                          }}
                        >
                          {(allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.options &&
                            currentMediaType == "quiz" &&
                            (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.options?.length > 0 &&
                            (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.options?.map((option, index) => {
                              return (
                                <Radio value={index} key={index}>
                                  {option.text}
                                </Radio>
                              );
                            })}
                        </RadioGroup>
                        <Spacer y={4}></Spacer>
                        {currentMediaOptionExist ? (
                            <div className="text-left flex flex-row items-center justify-start bg-green-50 p-2 text-green-700">
                              <Check
                                size={16}
                                className="text-green-700 mr-2"
                              ></Check>
                              Already Answered
                            </div>
                        ) : (
                          <Button
                            size="sm"
                            endContent={<ChevronRight size={16}></ChevronRight>}
                            onPress={() => {
                              const currentQuestion = allQuizQuestions[currentViewQuestionIndex] || selectedMedia;
                              submitAnswer(selectedOption, currentQuestion?.id);
                            }}
                            color="primary"
                            className="w-auto mr-auto"
                          >
                            Submit Answer
                          </Button>
                        )}
                        {currentMediaOptionExist && (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.solution && (
                          <div
                            className="my-2 p-4 bg-green-50 rounded-xl border-1 border-green-600 text-left text-green-800"
                            dangerouslySetInnerHTML={{
                              __html: (allQuizQuestions[currentViewQuestionIndex] || selectedMedia)?.solution,
                            }}
                          ></div>
                        )}
                      </div>
                    )}
                </motion.div>
              ) : (
                <motion.div
                  key="mediaCollection"
                  variants={collectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="media-grid px-4"
                >
                  {role == "admin" && (
                    <Popover className="max-h-[60vh] overflow-auto">
                      <PopoverTrigger>
                        <div className="bg-gray-100 text-center border-1 border-dashed p-4 mb-2 rounded-xl shadow-md flex flex-row items-center justify-center">
                          <Plus></Plus>
                          <Spacer x={4}></Spacer>
                          Add New{" "}
                          {
                            mediaTypes.find(
                              (item) => item.identifier == activeMedia
                            )?.title
                          }
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="p-4 w-96 ">
                        <h3 className="text-lg font-semibold mb-4">
                          Add New{" "}
                          {
                            mediaTypes.find(
                              (item) => item.identifier == activeMedia
                            )?.title
                          }
                        </h3>

                        <Input
                          label={currentMediaType === "quiz" && quizQuestions.length > 0 ? "Quiz Title (Locked)" : "Title"}
                          placeholder="Enter title"
                          value={newItem.title}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className="mb-4"
                          isDisabled={currentMediaType === "quiz" && quizQuestions.length > 0}
                        />

                        <div className="knowledge-content">
                          <p className="text-sm font-medium mb-2">Content</p>
                          <QuillWrapper
                            value={newItem.description}
                            onChange={(content) =>
                              setNewItem((prev) => ({ ...prev, description: content }))
                            }
                          />
                        </div>

                        {/* Different fields based on media type */}
                        {currentMediaType === "quiz" && (
                          <div className="quiz-options mt-2 w-full">
                            <p className="text-sm font-medium mb-2">
                              Quiz Options
                            </p>
                            {newItem.options.map((option, index) => (
                              <div
                                key={index}
                                className="flex items-center mb-2"
                              >
                                <Switch
                                  size="sm"
                                  color="success"
                                  isSelected={newItem.correct == index}
                                  onValueChange={(e) => {
                                    e == true
                                      ? setNewItem((res) => ({
                                          ...res,
                                          correct: index,
                                        }))
                                      : "";
                                  }}
                                ></Switch>
                                <Input
                                  placeholder={`Option ${index + 1}`}
                                  value={option.text}
                                  onChange={(e) =>
                                    updateOption(index, "text", e.target.value)
                                  }
                                  className="flex-1 mr-2"
                                  size="sm"
                                />

                                {newItem.options.length > 1 && (
                                  <Button
                                    isIconOnly
                                    color="danger"
                                    variant="light"
                                    size="sm"
                                    onClick={() => removeOption(index)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="flat"
                              color="primary"
                              size="sm"
                              startContent={<Plus size={16} />}
                              onClick={addOption}
                              className="mt-2"
                            >
                              Add Option
                            </Button>
                          </div>
                        )}

                        {currentMediaType === "media" && (
                          <div className="media-upload w-full">
                            <FileUploader
                              label="File URL (Optional)"
                              placeholder="Enter URL"
                              data={{ file: newItem.url }}
                              onUploadComplete={(e) =>
                                setNewItem((prev) => ({ ...prev, url: e }))
                              }
                            />
                          </div>
                        )}

                        <Spacer x={2} y={2}></Spacer>
                        {currentMediaType == "quiz" && (
                          <Input
                            label="Solution"
                            placeholder="Enter Solution"
                            value={newItem?.solution}
                            onChange={(e) => {
                              setNewItem((res) => ({
                                ...res,
                                solution: e.target.value,
                              }));
                            }}
                          ></Input>
                        )}

                        <Spacer y={4} />
                        
                        {/* Show added questions count for quiz */}
                        {currentMediaType === "quiz" && quizQuestions.length > 0 && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-medium text-blue-800">
                              {quizQuestions.length} question(s) added to quiz
                            </p>
                            <div className="mt-2 space-y-1">
                              {quizQuestions.map((q, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-blue-700">
                                  <span className="truncate flex-1">Q{idx + 1}: {q.title}</span>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    onClick={() => removeQuestionFromQuiz(idx)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Buttons for quiz */}
                        {currentMediaType === "quiz" ? (
                          <div className="flex flex-col gap-2">
                            <Button
                              color="primary"
                              variant="flat"
                              onClick={addQuestionToQuiz}
                              className="w-full"
                              startContent={<Plus size={16} />}
                            >
                              Add Question to Quiz
                            </Button>
                            
                            {quizQuestions.length > 0 && (
                              <Button
                                color="success"
                                onClick={saveQuizWithQuestions}
                                className="w-full"
                                startContent={<Check size={16} />}
                              >
                                Save Quiz ({quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''})
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            color="primary"
                            onClick={addNewItem}
                            className="w-full"
                            disabled={!newItem.title}
                          >
                            Add{" "}
                            {
                              mediaTypes.find(
                                (item) => item.identifier == activeMedia
                              )?.title
                            }
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  )}
                  {mediaCollection &&
                    mediaCollection?.map((media, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          role == "admin" ? "" : setSelectedMedia(media);
                        }}
                        className="bg-white [&_>svg]:w-6 [&_>svg]:h-6 p-4 mb-2 rounded-xl shadow-md flex flex-row items-center justify-start"
                      >
                        {
                          mtypes.find(
                            (item) =>
                              item?.type ==
                              mediaTypes.find(
                                (media) => media?.identifier == activeMedia
                              )?.type
                          )?.icon
                        }
                        <Spacer x={2}></Spacer>
                        <div className="text-left">
                          <h2 className="text-left text-sm text-gray-700">
                            {media?.title}
                          </h2>
                          {role == "admin" && (
                            <p className="text-xs text-gray-600 text-left">
                              {CtoLocal(media?.created_at)?.date}{" "}
                              {CtoLocal(media?.created_at)?.monthName}{" "}
                              {CtoLocal(media?.created_at)?.year}
                            </p>
                          )}
                        </div>
                        <div className="flex-1 flex flex-row items-center justify-end">
                          {media?.url && currentMediaType == "media" && (
                            <Button
                              variant="flat"
                              size="sm"
                              startContent={<Download size={16} />}
                              color="primary"
                              onPress={() => {
                                handleDownload(media);
                              }}
                            >
                              Download Media
                            </Button>
                          )}
                          <Spacer x={2}></Spacer>
                          {role == "admin" && (
                            <Popover
                              onOpenChange={(e) => {
                                e == true ? setEditItemData(media) : "";
                              }}
                            >
                              <PopoverTrigger>
                                <Button
                                  size="sm"
                                  startContent={<Edit2 size={16}></Edit2>}
                                  color="warning"
                                  style={{pointerEvents: "none",  opacity: 0.5}}
                                >
                                  Edit
                                </Button>
                              </PopoverTrigger>

                              <PopoverContent className="max-h-[60vh] overflow-auto flex flex-col justify-start items-start p-6 max-w-xl">
                                <h3 className="text-lg font-semibold mb-4">
                                  Update{" "}
                                  {
                                    mediaTypes?.find(
                                      (item) => item.identifier == activeMedia
                                    )?.title
                                  }
                                </h3>

                                <p className="text-sm text-left w-full font-medium mb-2">
                                  Upload Media
                                </p>
                                <ImageUploader
                                  data={{ image: editItemData?.image }}
                                  onUploadComplete={(e) => {
                                    handleImageUpload(e, true);
                                  }}
                                />
                                <Spacer y={2} />
                                <Input
                                  label="Title"
                                  placeholder="Enter title"
                                  value={editItemData?.title}
                                  onChange={(e) =>
                                    setEditItemData({
                                      ...editItemData,
                                      title: e.target.value,
                                    })
                                  }
                                  className="mb-4"
                                />

                                <div className="knowledge-content">
                                  <p className="text-sm font-medium mb-2">
                                    Content
                                  </p>
                                  <QuillWrapper
                                    value={editItemData?.description}
                                    onChange={(content) =>
                                      setEditItemData({
                                        ...editItemData,
                                        description: content,
                                      })
                                    }
                                  />
                                </div>

                                {/* Different fields based on media type */}
                                {currentMediaType === "quiz" && (
                                  <div className="quiz-options mt-2 w-full">
                                    <p className="text-sm font-medium mb-2">
                                      Quiz Options
                                    </p>
                                    {editItemData?.options?.map(
                                      (option, index) => (
                                        <div
                                          key={index}
                                          className="flex items-center mb-2"
                                        >
                                          <Switch
                                            size="sm"
                                            color="success"
                                            isSelected={
                                              editItemData?.correct == index
                                            }
                                            onValueChange={(e) => {
                                              e == true
                                                ? setEditItemData((res) => ({
                                                    ...res,
                                                    correct: index,
                                                  }))
                                                : "";
                                            }}
                                          ></Switch>
                                          <Input
                                            placeholder={`Option ${index + 1}`}
                                            value={option?.text}
                                            onChange={(e) => {
                                              const updatedOptions = [
                                                ...editItemData?.options,
                                              ];
                                              updatedOptions[index] = {
                                                ...updatedOptions[index],
                                                text: e.target.value,
                                              };
                                              setEditItemData({
                                                ...editItemData,
                                                options: updatedOptions,
                                              });
                                            }}
                                            className="flex-1 mr-2"
                                            size="sm"
                                          />

                                          {editItemData.options.length > 1 && (
                                            <Button
                                              isIconOnly
                                              color="danger"
                                              variant="light"
                                              size="sm"
                                              onClick={() => {
                                                const updatedOptions =
                                                  editItemData?.options.filter(
                                                    (_, i) => i !== index
                                                  );
                                                setEditItemData({
                                                  ...editItemData,
                                                  options: updatedOptions,
                                                });
                                              }}
                                            >
                                              <Trash2 size={16} />
                                            </Button>
                                          )}
                                        </div>
                                      )
                                    )}
                                    <Button
                                      variant="flat"
                                      color="primary"
                                      size="sm"
                                      startContent={<Plus size={16} />}
                                      onPress={() => {
                                        setEditItemData({
                                          ...editItemData,
                                          options: [
                                            ...(editItemData?.options || []),
                                            { text: "" },
                                          ],
                                        });
                                      }}
                                      className="mt-2"
                                    >
                                      Add Option
                                    </Button>
                                  </div>
                                )}

                                {currentMediaType === "media" && (
                                  <div className="media-upload w-full">
                                    <FileUploader
                                      label="File URL (Optional)"
                                      placeholder="Enter URL"
                                      data={{ file: editItemData?.url }}
                                      onUploadComplete={(e) =>
                                        setEditItemData((res) => ({
                                          ...res,
                                          url: e,
                                        }))
                                      }
                                    />
                                  </div>
                                )}
                                <Spacer x={2} y={2}></Spacer>

                                {currentMediaType == "quiz" && (
                                  <Input
                                    label="Solution"
                                    placeholder="Enter Solution"
                                    value={editItemData?.solution}
                                    onChange={(e) => {
                                      setEditItemData((res) => ({
                                        ...res,
                                        solution: e.target.value,
                                      }));
                                    }}
                                  ></Input>
                                )}

                                <Spacer y={4} />
                                <Button
                                  color="primary"
                                  onClick={() => {
                                    updateItem(editItemData);
                                  }}
                                  className="w-full flex-shrink-0"
                                  disabled={
                                    !editItemData?.title ||
                                    (currentMediaType === "quiz" &&
                                      editItemData?.options?.some(
                                        (opt) => !opt?.text
                                      ))
                                  }
                                >
                                  Update{" "}
                                  {
                                    mediaTypes.find(
                                      (item) => item.identifier == activeMedia
                                    )?.title
                                  }
                                </Button>
                              </PopoverContent>
                            </Popover>
                          )}
                          {role == "admin" && <Spacer x={2}></Spacer>}
                          <Tooltip content="View Content">
                            <Button
                              onPress={() => {
                                setSelectedMedia(media);
                              }}
                              isIconOnly
                              size="sm"
                              color="success"
                              variant="flat"
                            >
                              {" "}
                              <ChevronRight></ChevronRight>
                            </Button>
                          </Tooltip>
                          {role == "admin" && <Spacer x={2}></Spacer>}
                          {role == "admin" && (
                            <Popover>
                              <PopoverTrigger>
                                <Button isIconOnly size="sm" color="danger">
                                  <Trash2 size={16}></Trash2>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Button
                                  onPress={() => {
                                    deleteItem(media?.id);
                                  }}
                                  color="danger"
                                  size="sm"
                                >
                                  Confirm Delete
                                </Button>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
