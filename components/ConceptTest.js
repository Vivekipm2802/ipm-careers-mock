import { supabase } from "@/utils/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useNMNContext } from "./NMNContext";
import {
  Button,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Skeleton,
  Slider,
  Spacer,
  Spinner,
  Switch,
  Tooltip,
} from "@nextui-org/react";
import ImageUploader from "./ImageUploader";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import {
  AlertOctagon,
  ArrowRight,
  BookAIcon,
  ChartBarIncreasing,
  ChartSplineIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  GripVertical,
  Info,
  LockIcon,
  PencilIcon,
  RefreshCw,
  Space,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import DraggableItem from "./DraggableItem";
import Link from "next/link";
import Leaderboard from "./Leaderboard";
import { CtoLocal } from "@/utils/DateUtil";
import Loader from "./Loader";

export default function Concept({ role, group, onBack }) {
  const [categoryData, setCategoryData] = useState();
  const [categories, setCategories] = useState();
  const [gamecategories, setGameCategories] = useState();
  const [activeLevel, setActiveLevel] = useState(0);
  const [activeLevelData, setActiveLevelData] = useState(0);
  const [levelData, setLevelData] = useState();
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [categoryTitle, setCategoryTitle] = useState();
  const [editable, setEditable] = useState();
  const [selectedLevel, setSelectedLevel] = useState();
  const [loading, setLoading] = useState(false);
  const [newLevelData, setNewLevelData] = useState();
  const [plays, setPlays] = useState();
  const [parentMain, setParentMain] = useState();
  const [questionToggle, setQuestionToggle] = useState(false);
  const [questions, setQuestions] = useState();
  const [editMode, setEditMode] = useState(false);
  const [addNewQuestion, setAddNewQuestion] = useState();
  const [editlatex, setEditLatext] = useState(false);
  const [editQuestionData, setEditQuestionData] = useState();
  const [reorderModal, setReorderModal] = useState(false);
  const [drawerActive, setDrawerActive] = useState(true);
  const [levelLoading, setLevelLoading] = useState(false);
  const [video, setVideo] = useState();
  const [leaderboardData, setLeaderBoardData] = useState();
  const [activeResult, setActiveResult] = useState(undefined);
  const [view, setView] = useState(0);
  const [latex, setLatex] = useState("\\frac{1}{\\sqrt{2}}\\cdot 2");
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const router = useRouter();
  const EditableMathField = dynamic(() => import("react-mathquill"), {
    ssr: false,
  });
  const StaticMathField = dynamic(() => import("react-mathquill"), {
    ssr: false,
  });
  const QuillWarapper = useMemo(() => {
    return dynamic(() => import("@/components/QuillSSRWrapper"), {
      ssr: false,
    });
  }, []);
  const CustomEditor = useMemo(() => {
    return dynamic(() => import("@/components/CustomEditor"), {
      ssr: false,
    });
  }, []);

  const { userDetails, setSideBar, setSideBarContent } = useNMNContext();
  async function getLeaderBoard(a) {
    const startOfWeek = new Date();
    const currentDay = startOfWeek.getDay();
    const distance = currentDay === 0 ? 6 : currentDay - 1;
    startOfWeek.setDate(startOfWeek.getDate() - distance);
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("plays")
      .select("*")
      .eq("test_uuid", a)
      .gte("created_at", startOfWeek.toISOString())
      .order("score", { ascending: false })
      .limit(10);

    if (!error && data) {
      setLeaderBoardData(data);
    } else if (error) {
      console.error("Leaderboard fetch error:", error);
    }
  }
  async function updateCategoryTitle(a, b) {
    const { error } = await supabase
      .from("categories")
      .update({
        title: b,
      })
      .eq("id", a);
    if (!error) {
      getCategories();
    } else {
    }
  }

  async function insertData(table, dataToInsert, hand, hand2) {
    const { data, error } = await supabase
      .from(table)
      .insert(dataToInsert)
      .select();
    if (data != undefined) {
      hand(data);
    } else {
      hand2({ errortext: "Unable to Fetch", errormsg: error });
    }
  }
  async function updateData(table, dataToInsert, value, hand, hand2) {
    const { data, error } = await supabase
      .from(table)
      .update(dataToInsert)
      .eq("id", value)
      .select();
    if (data != undefined) {
      hand(data);
    } else {
      hand2({ errortext: "Unable to Fetch", errormsg: error });
    }
  }
  async function deleteParentCategory(a) {
    const { error } = await supabase.from("categories").delete().eq("id", a);
    if (!error) {
      getCategories();
    } else {
    }
  }

  const updateOrAddOption = (index, value, key) => {
    setAddNewQuestion((prevState) => {
      const updatedOptions = [...prevState.options];
      // Check if the key exists in the sub-array, if not, add it
      if (!updatedOptions[index].hasOwnProperty(key)) {
        updatedOptions[index][key] = value;
      } else {
        // If the key exists, update its value
        updatedOptions[index][key] = value;
      }
      return {
        ...prevState,
        options: updatedOptions,
      };
    });
  };
  const updateOrAddOption2 = (index, value, key) => {
    setEditQuestionData((prevState) => {
      const updatedOptions = [...prevState.options];
      // Check if the key exists in the sub-array, if not, add it
      if (!updatedOptions[index].hasOwnProperty(key)) {
        updatedOptions[index][key] = value;
      } else {
        // If the key exists, update its value
        updatedOptions[index][key] = value;
      }
      return {
        ...prevState,
        options: updatedOptions,
      };
    });
  };

  async function getData(table, select, key, value, handler, handler2) {
    const { data, error } = await supabase
      .from(table)
      .select(select || "*")
      .eq(key, value)
      .order("created_at", { ascending: true });
    if (data != undefined) {
      handler(data);
    } else {
      handler2({ errortext: "Unable to Fetch", errormsg: error });
    }
  }

  // Fetch all submissions for a specific concept test level (by uuid) and show in side panel
  async function fetchLevelSubmissions(levelUuid) {
    setSubmissionsLoading(true);
    const { data, error } = await supabase
      .from("plays")
      .select("*")
      .eq("test_uuid", levelUuid)
      .order("created_at", { ascending: false });

    setSubmissionsLoading(false);

    const content = (
      <div className="flex p-4 flex-col items-start justify-start">
        <h2 className="mb-4 text-lg font-semibold">
          Total Submissions : {data?.length || 0}
        </h2>
        <div className="flex flex-col overflow-auto w-full max-h-[80vh] pr-4">
          {data && data?.length > 0 ? (
            data?.map((i, d) => {
              return (
                <div
                  className="flex border-1 p-2 rounded-lg mb-2 w-full text-sm flex-row items-center justify-between"
                  key={i.uid || i.id}
                >
                  <div className="mr-2 bg-primary-200 rounded-xl p-2 text-primary-800">
                    {CtoLocal(i.created_at)?.time}{" "}
                    {CtoLocal(i.created_at)?.amPm}
                  </div>
                  <div className="mr-2 bg-gray-200 rounded-xl p-2 text-gray-600">
                    {CtoLocal(i.created_at)?.date}{" "}
                    {CtoLocal(i.created_at)?.monthName}{" "}
                    {CtoLocal(i.created_at)?.year}
                  </div>
                  <div className="flex flex-col items-start justify-start">
                    <h2>{i?.name || i?.user_name || "Unknown"}</h2>
                    <p className="text-xs text-gray-500">{i?.user}</p>
                  </div>
                  <div className="flex-1 flex flex-row items-center justify-end">
                    <p className="h-8 w-auto p-4 bg-lime-200 border-lime-500 rounded-lg flex flex-col items-center justify-center font-bold text-center text-lime-800">
                      Score : {i?.score ?? 0}
                    </p>
                    <Spacer x={2}></Spacer>
                    <Button
                      as={Link}
                      href={`/test/result/${i?.uid}`}
                      target="_blank"
                      size="sm"
                      color="success"
                    >
                      Result
                    </Button>
                    <Spacer x={2}></Spacer>
                    <Button
                      as={Link}
                      href={`/test/analytics/${i?.uid}`}
                      target="_blank"
                      size="sm"
                      className="bg-gradient-purple text-white"
                    >
                      Analytics
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-8">
              No submissions found for this test.
            </div>
          )}
        </div>
      </div>
    );

    setSideBar(true);
    setSideBarContent(content);
  }

  async function getPlays(a) {
    const { data, error } = await supabase
      .from("plays")
      .select("*,test_uuid(*)")
      .in(
        "test_uuid",
        a.map((i) => {
          return i.uuid;
        })
      )
      .match({ user: userDetails?.email });
    if (data) {
      console.log(data);
      setPlays(data);
    } else {
    }
  }
  async function addNewGameCategory(a) {
    if (a == undefined) {
      alert("Empty Category Data");
      return null;
    }

    setLoading(true);
    const { error } = await supabase.from("m_categories").insert({
      title: a.title,
      color: a.color,
      seq: a.seq,
      slug: textToSlug(a.title),
      parent: a.parent,
      icon: a.icon,
    });

    if (!error) {
      getGameCategories();
      setLoading(false);
    } else {
      setLoading(false);
    }
  }
  const convertToYouTubeEmbed = (url) => {
    // Regular expressions to match YouTube URLs
    const regexps = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    ];

    for (let regex of regexps) {
      const match = url.match(regex);
      if (match) {
        // If it's already an embed link, return it as is
        if (url.includes("youtube.com/embed")) {
          return url;
        }
        // Otherwise, construct the embed link
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }

    // If no match is found, return the original input
    return url;
  };
  async function addNewLevel(a, b) {
    const requiredFields = [
      "title",
      "difficulty",
      "time",
      "image",
      "description",
      "objective",
    ];

    for (const field of requiredFields) {
      if (a[field] === undefined || a[field] === null || a[field] === "") {
        toast.error("Missing " + field);
        return null;
      }
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("levels")
      .insert({
        title: a.title,

        difficulty: a.difficulty,

        time: a.time,
        image: a.image,
        description: a.description,
        objective: a.objective,

        parent: b,
        video: a.video,
      })
      .select();
    if (error) {
      if (error.code == 23505) {
        toast.error("Duplicate Name Level Already exists - please Change");
      }
      setLoading(false);
    }
    if (data) {
      setLoading(false);
      getLevels(b);
    }
  }

  async function DeleteLevelQuestionbyId(a, b) {
    const { error } = await supabase.from("questions").delete().eq("id", a);
    if (!error) {
      getData(
        "questions",
        "title,id",
        "parent",
        b,
        (e) => {
          setQuestions(e);
        },
        ({ errortext }) => {
          console.log(errortext);
        }
      );
    } else {
    }
  }

  async function addNewCategory(a) {
    if (a == undefined) {
      alert("Empty Category Text");
      return null;
    }
    setLoading(true);
    const { error } = await supabase.from("categories").insert({
      title: a,
      slug: textToSlug(a),
      parent: group,
    });

    if (!error) {
      getCategories();
      setLoading(false);
    } else {
      setLoading(false);
    }
  }
  function textToSlug(text) {
    return text
      .toString() // Convert to string
      .toLowerCase() // Convert to lowercase
      .trim() // Trim whitespace from the beginning and end
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^\w-]+/g, "") // Remove non-word characters (except hyphens)
      .replace(/--+/g, "-") // Replace multiple hyphens with a single hyphen
      .replace(/^-+|-+$/g, ""); // Remove hyphens from the beginning and end
  }

  async function deleteCategoryById(a) {
    const { error } = await supabase.from("m_categories").delete().eq("id", a);
    if (!error) {
      getCategories();
      getGameCategories();
    } else {
    }
  }
  async function updateGameCategory(a, b) {
    if (a == undefined) {
      return null;
    }
    const { error } = await supabase
      .from("m_categories")
      .update({
        title: a.gct,
        icon: a.gci,
      })
      .eq("id", b);
    if (!error) {
      getGameCategories();
    } else {
    }
  }

  async function updateLevel(a, b, c) {
    if (a == undefined) {
      return null;
    }
    const { error } = await supabase
      .from("levels")
      .update({
        title: a?.lt,
        count: a?.lc,
        time: a?.ltime,
        image: a?.li,
        objective: a?.lobj,
        description: a?.ldesc,
        difficulty: a?.ld,
        type: a?.ly,
        video: a?.lv,
        calculator_allowed: a?.calculator_allowed,
        is_scientific: a?.is_scientific,
        demo: a?.demo,
      })
      .eq("id", b);
    if (!error) {
      toast.success("Updated Successfully");
      getLevels(c);
    } else {
    }
  }

  async function DeleteLevelbyId(a, b) {
    const { error } = await supabase.from("levels").delete().eq("id", a);
    if (!error) {
      getLevels(b);
    } else {
    }
  }
  function convertSecondsToMinutes(a) {
    const seconds = a * 60;
    if (seconds < 60) {
      return seconds + " second" + (seconds !== 1 ? "s" : "");
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      if (remainingSeconds === 0) {
        return minutes + " minute" + (minutes !== 1 ? "s" : "");
      } else {
        return (
          minutes +
          " minute" +
          (minutes !== 1 ? "s" : "") +
          " and " +
          remainingSeconds +
          " second" +
          (remainingSeconds !== 1 ? "s" : "")
        );
      }
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      let result = hours + " hour" + (hours !== 1 ? "s" : "");

      if (remainingMinutes > 0) {
        result +=
          " and " +
          remainingMinutes +
          " minute" +
          (remainingMinutes !== 1 ? "s" : "");
      }

      if (remainingSeconds > 0) {
        if (remainingMinutes > 0) {
          result += " and ";
        } else if (hours > 0) {
          result += " and ";
        }
        result +=
          remainingSeconds + " second" + (remainingSeconds !== 1 ? "s" : "");
      }

      return result;
    }
  }
  const handleSetIsCorrect = (index) => {
    const updatedOptions = addNewQuestion.options.map((option, i) => ({
      ...option,
      isCorrect: i === index,
    }));

    setAddNewQuestion({
      options: updatedOptions,
    });
  };

  const difficulty = [
    { title: "Easy", value: 1 },
    { title: "Moderate", value: 2 },
    { title: "Intermediate", value: 3 },
    { title: "Challenging", value: 4 },
    { title: "Hard", value: 5 },
  ];

  function getLevelName(arg1, arg2) {
    const matchingElement = arg1.find((item) => item.id === arg2);

    if (matchingElement) {
      return matchingElement.title;
    } else {
      return null; // Return null if no matching element is found.
    }
  }
  async function getLevels(a) {
    setLevelLoading(true);
    const { data, error } = await supabase
      .from("levels")
      .select("*,questions!questions_parent_fkey(id)")
      .eq("parent", a)
      .order("created_at", { ascending: true });

    if (data) {
      setLevelData(data);
      getPlays(data);
      setLevelLoading(false);
    } else {
      setLevelData();
      setLevelLoading(false);
    }
  }

  async function getGameCategories() {
    const { data, error } = await supabase
      .from("m_categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) {
      setGameCategories(data);
    }
  }

  function getTextFromKey(data, keyToMatch, arrayToSearch, propertyToRetrieve) {
    const matchedObject = arrayToSearch?.find(
      (item) => item[keyToMatch] === data
    );

    if (matchedObject) {
      return matchedObject[propertyToRetrieve];
    }

    return null; // Return null if no matching object is found
  }

  async function getEnrollments(a, b) {
    const query = supabase.from("enrollments").select("*,course(*)");

    if (b == true) {
    } else {
      query.eq("email", a);
    }
    const { data, error } = await query;
    if (data && data.length > 0) {
      setCoursesLoading(false);
    } else {
      setCoursesLoading(false);
    }
  }

  async function getCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("parent", group);

    if (data) {
      setCategories(data);
    }
  }

  useEffect(() => {
    if (userDetails != undefined) {
      getCategories();
      getEnrollments(userDetails?.email, role == "admin");
      getGameCategories();
    }
  }, [userDetails]);

  async function getOrderQuestions(a, handler, handler2) {
    const { data, error } = await supabase
      .from("questions")
      .select("title,id,seq,question")
      .eq("parent", a)
      .order("seq", { ascending: true });
    if (data) {
      setQuestions(data);
      handler();
    }
    if (error) {
      handler2();
      toast.error("Error Fetching");
    }
  }
  async function updateOrder(a, b, handler) {
    const { data, error } = await supabase.from(b).upsert(a).select();
    if (data) {
      if (typeof handler === "function") {
        // Check if handler is a function
        handler(data);
      }
    }
    if (error) {
      toast.error("Unable to Update Order");
    }
  }

  if (coursesLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen">
        <Loader></Loader>
      </div>
    );
  }
  return (
    <div className="h-full relative flex flex-col overflow-hidden">
      <Modal
        isOpen={activeResult}
        onClose={() => {
          setActiveResult(undefined);
        }}
      >
        <ModalContent>
          <ModalHeader>Your Attempts</ModalHeader>
          <ModalBody>
            {plays &&
              plays
                .filter((item) => item.test_uuid?.id == activeResult)
                ?.map((i, d) => {
                  return (
                    <div className="flex flex-row items-center justify-between">
                      <div className="flex-1">
                        <h2 className="text-xs">
                          <strong className="text-primary">
                            {CtoLocal(i?.created_at)?.time}{" "}
                            {CtoLocal(i?.created_at)?.amPm}
                          </strong>
                          <br />
                          {CtoLocal(i?.created_at)?.date}{" "}
                          {CtoLocal(i?.created_at)?.monthName}{" "}
                          {CtoLocal(i?.created_at)?.year}
                        </h2>
                      </div>
                      <div className="flex flex-row items-center justify-end">
                        <Button
                          endContent={
                            <ChartBarIncreasing size={16}></ChartBarIncreasing>
                          }
                          as={Link}
                          target="_blank"
                          href={`/test/result/${i?.uid}`}
                          size="sm"
                          color="success"
                          className="mr-2"
                        >
                          View Result
                        </Button>
                        <Button
                          endContent={
                            <ChartSplineIcon size={16}></ChartSplineIcon>
                          }
                          as={Link}
                          target="_blank"
                          href={`/test/analytics/${i?.uid}`}
                          size="sm"
                          style={{
                            background:
                              "linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)",
                            color: "#fff",
                          }}
                        >
                          View Analysis
                        </Button>
                      </div>
                    </div>
                  );
                })}
          </ModalBody>
          <ModalFooter>
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={() => {
                setActiveResult(undefined);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        placement="center"
        isOpen={video != undefined}
        onClose={() => {
          setVideo();
        }}
      >
        <ModalContent className=" overflow-hidden w-full max-w-[600px]">
          <ModalHeader>{activeLevel?.title}</ModalHeader>
          <ModalBody className="p-4">
            <iframe
              className="w-full aspect-video rounded-xl"
              src={video}
            ></iframe>
          </ModalBody>
        </ModalContent>
      </Modal>
      <Modal
        onOpenChange={(e) => {
          e == true ? "" : setQuestions();
        }}
        isDismissable={false}
        isOpen={reorderModal}
        onClose={(e) => {
          setReorderModal(false);
        }}
      >
        <ModalContent className="font-sans">
          <ModalHeader>Re Arrange Questions (Drag n Drop)</ModalHeader>
          <ModalBody>
            <Reorder.Group
              axis="y"
              values={questions ?? []}
              onReorder={(e) => {
                setQuestions(e),
                  updateOrder(
                    e.map((item, index) => ({ id: item.id, seq: index })),
                    "questions",
                    (item) => {
                      getOrderQuestions(
                        item[0]?.parent,
                        () => {},
                        () => {}
                      );
                    }
                  );
              }}
              className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2"
            >
              {questions &&
                questions.map((i, d) => {
                  return (
                    <DraggableItem
                      key={i.id}
                      value={i}
                      gripItem={(c) => (
                        <GripVertical
                          onPointerDown={(e) => c.start(e)}
                          color="#aaa"
                          className=" cursor-grab reorder-handle"
                        ></GripVertical>
                      )}
                      className="w-full flex flex-row items-center justify-start text-sm p-4 rounded-xl shadow-sm bg-white border-1 mb-2"
                    >
                      <div className="flex ml-2 text-xs flex-row items-center justify-start">
                        {i.title}
                      </div>
                      <Tooltip
                        content={
                          <div
                            dangerouslySetInnerHTML={{ __html: i?.question }}
                            className="text-xs [&_span]:!text-xs max-h-[70px] overflow-y-auto"
                          ></div>
                        }
                      >
                        <Info className="ml-auto"></Info>
                      </Tooltip>
                    </DraggableItem>
                  );
                })}
            </Reorder.Group>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              onPress={() => {
                setReorderModal(false);
              }}
            >
              Close{" "}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        scrollBehavior={"outside"}
        isDismissable={false}
        size="3xl"
        className="flex mdl flex-col gap-1 text-center items-center"
        onClose={() => {
          setQuestionToggle(false), setQuestions();
        }}
        placement="bottom-center"
        isOpen={questionToggle}
      >
        <ModalContent className="sf">
          {(onClose) => (
            <>
              <ModalBody className="w-full mt-5">
                {editMode == true ? (
                  <>
                    {editQuestionData != undefined ? (
                      <div>
                        <Button
                          className="mr-auto"
                          color="primary"
                          onPress={() => {
                            setEditMode(false), setEditQuestionData();
                          }}
                        >
                          Back to Questions
                        </Button>
                      </div>
                    ) : (
                      ""
                    )}
                  </>
                ) : (
                  <>
                    {questions == undefined || questions?.length == 0 ? (
                      <div className="p-2 border-1 border-gray-300 rounded-xl w-auto">
                        No Question Found, Add
                      </div>
                    ) : (
                      <div className="text-left font-bold">
                        All Questions in this Level
                      </div>
                    )}

                    {questions != undefined &&
                      questions.map((i, d) => {
                        return (
                          <div className="w-full text-left flex flex-row align-middle justify-start items-center">
                            <h2 className="font-bold">
                              {d + 1}){i.title}
                            </h2>{" "}
                            <p
                              onClick={() => {
                                setEditMode(true),
                                  getData("questions", "*", "id", i.id, (e) => {
                                    setEditQuestionData(e[0]);
                                  });
                              }}
                              className="rounded-full bg-blue-300 font-medium text-xs mx-1 ml-3 cursor-pointer px-2 py-0.5"
                            >
                              Edit Question
                            </p>{" "}
                            <p
                              onClick={() => {
                                DeleteLevelQuestionbyId(i.id, parentMain);
                              }}
                              className="bg-red-500 cursor-pointer w-auto rounded-xl text-white text-xs px-3 p-1 inline-block mx-2"
                            >
                              Delete
                            </p>
                          </div>
                        );
                      })}
                  </>
                )}
              </ModalBody>
              <ModalFooter className="text-left justify-start flex flex-col w-full">
                {editMode == true && editQuestionData != undefined ? (
                  <div key={editQuestionData.id}>
                    <Input
                      label="Question Title"
                      placeholder="Enter Title"
                      value={editQuestionData?.title || ""}
                      onChange={(e) => {
                        setEditQuestionData((res) => ({
                          ...res,
                          title: e.target.value,
                        }));
                      }}
                    ></Input>
                    <h2>Question Content</h2>
                    <CustomEditor
                      label="Question Title"
                      placeholder="Enter Question Title"
                      data={editQuestionData?.question}
                      value={editQuestionData?.question || ""}
                      onChange={(e) => {
                        setEditQuestionData((res) => ({ ...res, question: e }));
                      }}
                    ></CustomEditor>

                    <h2>Question Image (if any)</h2>
                    <ImageUploader
                      data={{ image: editQuestionData?.questionimage }}
                      size="small"
                      onUploadComplete={(e) => {
                        setEditQuestionData((res) => ({
                          ...res,
                          questionimage: e,
                        }));
                      }}
                    ></ImageUploader>
                    <Input
                      label="Video(optional)"
                      placeholder="Enter YT Embed or Video URL"
                      value={editQuestionData?.video || ""}
                      onChange={(e) => {
                        setEditQuestionData((res) => ({
                          ...res,
                          video: e.target.value,
                        }));
                      }}
                    ></Input>
                    <Popover>
                      <PopoverTrigger>
                        <Button
                          isDisabled={
                            editQuestionData?.video != undefined &&
                            editQuestionData?.video?.length > 2
                              ? false
                              : true
                          }
                          className="w-auto mr-auto"
                          color="primary"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9.5 9.38455V14.6162C9.5 15.1858 10.1099 15.5475 10.6097 15.2743L15.3959 12.6582C15.9163 12.3737 15.9162 11.6263 15.3958 11.3419L10.6097 8.72641C10.1099 8.45328 9.5 8.81499 9.5 9.38455ZM5.25 3C3.45507 3 2 4.45507 2 6.25V17.75C2 19.5449 3.45507 21 5.25 21H18.75C20.5449 21 22 19.5449 22 17.75V6.25C22 4.45507 20.5449 3 18.75 3H5.25ZM3.5 6.25C3.5 5.2835 4.2835 4.5 5.25 4.5H18.75C19.7165 4.5 20.5 5.2835 20.5 6.25V17.75C20.5 18.7165 19.7165 19.5 18.75 19.5H5.25C4.2835 19.5 3.5 18.7165 3.5 17.75V6.25Z"
                              fill="currentColor"
                            />
                          </svg>
                          Preview Video
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        {editQuestionData?.video != undefined ? (
                          <iframe
                            width="560"
                            height="315"
                            src={editQuestionData?.video}
                            frameborder="0"
                            allowfullscreen
                          ></iframe>
                        ) : (
                          ""
                        )}
                      </PopoverContent>
                    </Popover>

                    {editQuestionData?.type == "options" ? (
                      <>
                        <h2>Options/Correct Answer</h2>
                        {editQuestionData != undefined &&
                          editQuestionData?.options?.map((i, d) => {
                            return (
                              <div className="flex flex-col my-5 border-1 border-gray-300 p-5 rounded-xl">
                                <h2 className="font-bold text-xl">
                                  Option Number {d + 1}
                                </h2>
                                <div className="flex flex-row flex-wrap">
                                  <Switch
                                    isSelected={
                                      editQuestionData?.options[d]?.isCorrect
                                    }
                                    onValueChange={(e) => {
                                      updateOrAddOption2(d, e, "isCorrect");
                                    }}
                                  ></Switch>
                                  <div className="max-w-[200px] w-full border-1 border-gray-200 rounded-xl max-h-[90px] my-5 h-full flex overflow-hidden">
                                    <ImageUploader
                                      data={{ image: i?.image }}
                                      size="small"
                                      onUploadComplete={(e) => {
                                        updateOrAddOption2(d, e, "image");
                                      }}
                                    ></ImageUploader>
                                  </div>
                                  <Input
                                    label={`Option ${d + 1}`}
                                    placeholder={`Enter Option ${d + 1} Text`}
                                    value={i?.title}
                                    onChange={(e) => {
                                      updateOrAddOption2(
                                        d,
                                        e.target.value,
                                        "title"
                                      );
                                    }}
                                  ></Input>
                                </div>
                                <h2>Popup Image (Win/Lose Image)</h2>
                                <ImageUploader
                                  size="small"
                                  data={{ image: i?.popupimage }}
                                  onUploadComplete={(e) => {
                                    updateOrAddOption2(d, e, "popupimage");
                                  }}
                                ></ImageUploader>
                                <h2>Popup Text</h2>
                                <CustomEditor
                                  data={
                                    editQuestionData?.options[d]?.text ||
                                    "<strong>Write your Win/Lose Here...</strong>"
                                  }
                                  value={
                                    editQuestionData?.options[d]?.text || ""
                                  }
                                  onChange={(e) => {
                                    updateOrAddOption2(d, e, "text");
                                  }}
                                ></CustomEditor>
                              </div>
                            );
                          })}
                      </>
                    ) : (
                      <>
                        <h2>Correct Answer Text</h2>
                        <Input
                          label="Answer"
                          placeholder="Enter Correct Answer Text"
                          value={editQuestionData?.options?.answer || ""}
                          onChange={(e) => {
                            setEditQuestionData((res) => ({
                              ...res,
                              options: {
                                ...res.options,
                                answer: e.target.value,
                              },
                            }));
                          }}
                        ></Input>
                        <h2>Enter Winning Text</h2>
                        <CustomEditor
                          data={
                            editQuestionData?.options?.losetext ||
                            "<p>Your Win Text Here</p>"
                          }
                          value={editQuestionData?.options?.wintext || ""}
                          onChange={(e) => {
                            setEditQuestionData((res) => ({
                              ...res,
                              options: { ...res.options, wintext: e },
                            }));
                          }}
                        ></CustomEditor>

                        <h2>Enter Lose Text</h2>
                        <CustomEditor
                          data={
                            editQuestionData?.options?.losetext ||
                            "<p>Your Lose Text Here</p>"
                          }
                          value={editQuestionData?.options?.losetext || ""}
                          onChange={(e) => {
                            setEditQuestionData((res) => ({
                              ...res,
                              options: { ...res.options, losetext: e },
                            }));
                          }}
                        ></CustomEditor>
                      </>
                    )}

                    <Divider className="my-5"></Divider>
                    <h2>Explanation</h2>
                    <CustomEditor
                      data={
                        editQuestionData?.explanation ||
                        "<strong>Write your Explanation Here...</strong>"
                      }
                      value={editQuestionData?.explanation || ""}
                      onChange={(e) => {
                        setEditQuestionData((res) => ({
                          ...res,
                          explanation: e,
                        }));
                      }}
                    ></CustomEditor>
                    <h2>Explanation Image</h2>
                    <ImageUploader
                      size="small"
                      data={{ image: editQuestionData?.explanationimage }}
                      onUploadComplete={(e) => {
                        setEditQuestionData((res) => ({
                          ...res,
                          explanationimage: e,
                        }));
                      }}
                    ></ImageUploader>
                    <h2>Explanation Video</h2>

                    <Input
                      label="Explanation Video"
                      placeholder="Enter Video URL"
                      value={editQuestionData?.explanationvideo || ""}
                      onChange={(e) => {
                        setEditQuestionData((res) => ({
                          ...res,
                          explanationvideo: e.target.value,
                        }));
                      }}
                    ></Input>
                    <h2>Explanation Maths</h2>
                    <div className="h-auto">
                      {" "}
                      {editlatex == true ? (
                        <EditableMathField
                          mathquillDidMount={(mathField) => {
                            editlatex == true ? mathField.focus() : "";
                          }}
                          latex={editQuestionData?.equation}
                          onChange={(mathField) => {
                            setEditQuestionData((res) => ({
                              ...res,
                              equation: mathField.latex(),
                            }));
                          }}
                        ></EditableMathField>
                      ) : (
                        <div className="w-full pointer-events-none opacity-50">
                          <StaticMathField
                            className="w-full"
                            latex={editQuestionData?.equation}
                          ></StaticMathField>
                        </div>
                      )}
                      <Button
                        color="primary"
                        onClick={() => {
                          setEditLatext(!editlatex);
                        }}
                      >
                        {editlatex ? "Save Edit" : "Edit Now"}
                      </Button>
                    </div>
                    <h2>Hint</h2>
                    <CustomEditor
                      data={
                        editQuestionData?.hint ||
                        "<strong>Write your Hint Here...</strong>"
                      }
                      value={editQuestionData?.hint || ""}
                      onChange={(e) => {
                        setEditQuestionData((res) => ({ ...res, hint: e }));
                      }}
                    ></CustomEditor>
                    <Button
                      onClick={() => {
                        updateData(
                          "questions",
                          {
                            question: editQuestionData?.question,
                            title: editQuestionData?.title,

                            video: editQuestionData?.video || "",
                            explanation: editQuestionData?.explanation || "",

                            explanationvideo:
                              editQuestionData?.explanationvideo || "",
                            answerimage: editQuestionData?.answerimage || "",
                            questionimage:
                              editQuestionData?.questionimage || "",
                            options: editQuestionData?.options,
                            parent: parentMain,
                            test_id: parentMain,
                            hint: editQuestionData?.hint || "",
                            explanation: editQuestionData?.explanation || "",
                            explanationimage:
                              editQuestionData?.explanationimage || "",
                            equation: editQuestionData?.equation || "",
                          },
                          editQuestionData?.id,
                          () => {
                            setEditMode(false),
                              getData(
                                "questions",
                                "title,id",
                                "parent",
                                parentMain,
                                (e) => {
                                  setQuestions(e), setQuestionToggle(false);
                                },
                                ({ errortext }) => {
                                  console.log(errortext);
                                }
                              );
                          },
                          () => {}
                        );
                      }}
                      className="text-left w-auto mr-auto mt-2"
                      color="primary"
                    >
                      Update Question
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      label="Question Title"
                      placeholder="Enter Title"
                      value={addNewQuestion?.title || ""}
                      onChange={(e) => {
                        setAddNewQuestion((res) => ({
                          ...res,
                          title: e.target.value,
                        }));
                      }}
                    ></Input>
                    <h2>Question Content</h2>
                    <CustomEditor
                      label="Question Title"
                      placeholder="Enter Question Title"
                      data={addNewQuestion?.question || "<p>Enter Question</p>"}
                      value={addNewQuestion?.question || ""}
                      onChange={(e) => {
                        setAddNewQuestion((res) => ({ ...res, question: e }));
                      }}
                    ></CustomEditor>

                    <h2>Question Image (if any)</h2>
                    <ImageUploader
                      size="small"
                      onUploadComplete={(e) => {
                        setAddNewQuestion((res) => ({
                          ...res,
                          questionimage: e,
                        }));
                      }}
                    ></ImageUploader>
                    <Input
                      label="Video(optional)"
                      placeholder="Enter YT Embed or Video URL"
                      value={addNewQuestion?.video || ""}
                      onChange={(e) => {
                        setAddNewQuestion((res) => ({
                          ...res,
                          video: e.target.value,
                        }));
                      }}
                    ></Input>
                    <Popover>
                      <PopoverTrigger>
                        <Button
                          isDisabled={
                            addNewQuestion?.video != undefined &&
                            addNewQuestion?.video?.length > 2
                              ? false
                              : true
                          }
                          className="w-auto mr-auto"
                          color="primary"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9.5 9.38455V14.6162C9.5 15.1858 10.1099 15.5475 10.6097 15.2743L15.3959 12.6582C15.9163 12.3737 15.9162 11.6263 15.3958 11.3419L10.6097 8.72641C10.1099 8.45328 9.5 8.81499 9.5 9.38455ZM5.25 3C3.45507 3 2 4.45507 2 6.25V17.75C2 19.5449 3.45507 21 5.25 21H18.75C20.5449 21 22 19.5449 22 17.75V6.25C22 4.45507 20.5449 3 18.75 3H5.25ZM3.5 6.25C3.5 5.2835 4.2835 4.5 5.25 4.5H18.75C19.7165 4.5 20.5 5.2835 20.5 6.25V17.75C20.5 18.7165 19.7165 19.5 18.75 19.5H5.25C4.2835 19.5 3.5 18.7165 3.5 17.75V6.25Z"
                              fill="currentColor"
                            />
                          </svg>
                          Preview Video
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        {addNewQuestion?.video != undefined ? (
                          <iframe
                            width="560"
                            height="315"
                            src={addNewQuestion?.video}
                            frameborder="0"
                            allowfullscreen
                          ></iframe>
                        ) : (
                          ""
                        )}
                      </PopoverContent>
                    </Popover>

                    <h2>Type of Question (Options/Input)</h2>
                    <Switch
                      onValueChange={(e) => {
                        setAddNewQuestion((res) => ({
                          ...res,
                          type: e,
                          options:
                            e == false
                              ? [
                                  { isCorrect: false },
                                  { isCorrect: false },
                                  { isCorrect: false },
                                  { isCorrect: false },
                                ]
                              : setAddNewQuestion({}),
                        }));
                      }}
                    ></Switch>

                    {addNewQuestion?.type == false ? (
                      <>
                        <h2>Options/Correct Answer</h2>
                        {Array(4)
                          .fill()
                          .map((i, d) => {
                            return (
                              <div className="flex flex-col my-5 border-1 border-gray-300 p-5 rounded-xl">
                                <h2 className="font-bold text-xl">
                                  Option Number {d + 1}
                                </h2>
                                <div className="flex flex-row flex-wrap">
                                  <Switch
                                    isSelected={
                                      addNewQuestion?.options[d]?.isCorrect
                                    }
                                    onValueChange={(e) => {
                                      updateOrAddOption(d, e, "isCorrect");
                                    }}
                                  ></Switch>
                                  <div className="max-w-[200px] w-full border-1 border-gray-200 rounded-xl max-h-[90px] my-5 h-full flex overflow-hidden">
                                    <ImageUploader
                                      size="small"
                                      onUploadComplete={(e) => {
                                        updateOrAddOption(d, e, "image");
                                      }}
                                    ></ImageUploader>
                                  </div>
                                  <Input
                                    label={`Option ${d + 1}`}
                                    placeholder={`Enter Option ${d + 1} Text`}
                                    onChange={(e) => {
                                      updateOrAddOption(
                                        d,
                                        e.target.value,
                                        "title"
                                      );
                                    }}
                                  ></Input>
                                </div>
                                <h2>Popup Image (Win/Lose Image)</h2>
                                <ImageUploader
                                  size="small"
                                  onUploadComplete={(e) => {
                                    updateOrAddOption(d, e, "popupimage");
                                  }}
                                ></ImageUploader>
                                <h2>Popup Text</h2>
                                <CustomEditor
                                  data={
                                    addNewQuestion?.options[d]?.text ||
                                    "<strong>Write your Win/Lose Here...</strong>"
                                  }
                                  value={addNewQuestion?.options[d]?.text || ""}
                                  onChange={(e) => {
                                    updateOrAddOption(d, e, "text");
                                  }}
                                ></CustomEditor>
                              </div>
                            );
                          })}
                      </>
                    ) : (
                      <>
                        <h2>Correct Answer Text</h2>
                        <Input
                          label="Answer"
                          placeholder="Enter Correct Answer Text"
                          value={addNewQuestion?.options?.answer || ""}
                          onChange={(e) => {
                            setAddNewQuestion((res) => ({
                              ...res,
                              options: {
                                ...res.options,
                                answer: e.target.value,
                              },
                            }));
                          }}
                        ></Input>
                        <h2>Enter Winning Text</h2>
                        <CustomEditor
                          data={
                            addNewQuestion?.options?.losetext ||
                            "<p>Your Win Text Here</p>"
                          }
                          value={addNewQuestion?.options?.wintext || ""}
                          onChange={(e) => {
                            setAddNewQuestion((res) => ({
                              ...res,
                              options: { ...res.options, wintext: e },
                            }));
                          }}
                        ></CustomEditor>

                        <h2>Enter Lose Text</h2>
                        <CustomEditor
                          data={
                            addNewQuestion?.options?.losetext ||
                            "<p>Your Lose Text Here</p>"
                          }
                          value={addNewQuestion?.options?.losetext || ""}
                          onChange={(e) => {
                            setAddNewQuestion((res) => ({
                              ...res,
                              options: { ...res.options, losetext: e },
                            }));
                          }}
                        ></CustomEditor>
                      </>
                    )}

                    <Divider className="my-5"></Divider>
                    <h2>Explanation</h2>
                    <CustomEditor
                      data={
                        addNewQuestion?.explanation ||
                        "<strong>Write your Explanation Here...</strong>"
                      }
                      value={addNewQuestion?.explanation || ""}
                      onChange={(e) => {
                        setAddNewQuestion((res) => ({
                          ...res,
                          explanation: e,
                        }));
                      }}
                    ></CustomEditor>
                    <h2>Explanation Image</h2>
                    <ImageUploader
                      size="small"
                      onUploadComplete={(e) => {
                        setAddNewQuestion((res) => ({
                          ...res,
                          explanationimage: e,
                        }));
                      }}
                    ></ImageUploader>
                    <h2>Explanation Video</h2>
                    <Input
                      label="Explanation Video"
                      placeholder="Enter YT Embed or Video URL"
                      value={addNewQuestion?.explanationvideo || ""}
                      onChange={(e) => {
                        setAddNewQuestion((res) => ({
                          ...res,
                          explanationvideo: e.target.value,
                        }));
                      }}
                    ></Input>
                    <h2>Explanation Maths</h2>
                    {editlatex == true ? (
                      <EditableMathField
                        mathquillDidMount={(mathField) => {
                          editlatex == true ? mathField.focus() : "";
                        }}
                        latex={latex}
                        onChange={(mathField) => {
                          setLatex(mathField.latex());
                        }}
                      ></EditableMathField>
                    ) : (
                      <div className="w-full pointer-events-none opacity-50">
                        <StaticMathField
                          className="w-full"
                          latex={latex}
                        ></StaticMathField>
                      </div>
                    )}
                    <Button
                      color="primary"
                      onClick={() => {
                        setEditLatext(!editlatex);
                      }}
                    >
                      {editlatex ? "Save Edit" : "Edit Now"}
                    </Button>

                    <h2>Hint</h2>
                    <CustomEditor
                      data={
                        addNewQuestion?.hint ||
                        "<strong>Write your Hint Here...</strong>"
                      }
                      value={addNewQuestion?.hint || ""}
                      onChange={(e) => {
                        setAddNewQuestion((res) => ({ ...res, hint: e }));
                      }}
                    ></CustomEditor>
                    <Button
                      onClick={() => {
                        insertData(
                          "questions",
                          {
                            question: addNewQuestion?.question,
                            title: addNewQuestion?.title,
                            type:
                              addNewQuestion.type == false
                                ? "options"
                                : "input",
                            video: addNewQuestion?.video || "",
                            explanation: addNewQuestion?.explanation || "",
                            correct:
                              addNewQuestion.type == true
                                ? 0
                                : addNewQuestion?.correct || 0,
                            isActive: true,

                            explanationvideo:
                              addNewQuestion?.explanationvideo || "",
                            answerimage: addNewQuestion?.answerimage || "",
                            questionimage: addNewQuestion?.questionimage || "",
                            options: addNewQuestion?.options,
                            parent: parentMain,
                            test_id: parentMain,
                            hint: addNewQuestion?.hint || "",
                            explanation: addNewQuestion?.explanation || "",
                            explanationimage:
                              addNewQuestion?.explanationimage || "",
                            equation: latex || "",
                          },
                          () => {
                            getData(
                              "questions",
                              "title,id",
                              "parent",
                              parentMain,
                              (e) => {
                                setQuestions(e), setQuestionToggle(false);
                              },
                              ({ errortext }) => {
                                console.log(errortext);
                              }
                            );
                          },
                          () => {}
                        );
                      }}
                      className="text-left text-sm w-auto mr-auto"
                      color="primary"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M11.7498 3C12.1295 3 12.4434 3.28201 12.4931 3.64808L12.5 3.74985L12.5012 11H19.7543C20.1685 11 20.5043 11.3358 20.5043 11.75C20.5043 12.1297 20.2221 12.4435 19.8561 12.4932L19.7543 12.5H12.5012L12.5032 19.7491C12.5033 20.1633 12.1676 20.4993 11.7534 20.4993C11.3737 20.4993 11.0598 20.2173 11.0101 19.8512L11.0032 19.7494L11.0012 12.5H3.7522C3.33798 12.5 3.0022 12.1642 3.0022 11.75C3.0022 11.3703 3.28435 11.0565 3.65043 11.0068L3.7522 11H11.0012L11 3.75015C10.9999 3.33594 11.3356 3 11.7498 3Z"
                          fill="currentColor"
                        />
                      </svg>
                      Add Question
                    </Button>
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <motion.div
        className="flex flex-col overflow-hidden w-full h-full items-stretch justify-stretch"
        key={view}
        initial={{ x: -50, opacity: 0 }}
        exit={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      >
        {view == 0 ? (
          /* View 1 */
          <div
            className={
              "h-full w-full flex flex-row justify-start items-start bg-gray-100 rounded-xl p-0 overflow-hidden"
            }
          >
            <div
              className={
                "w-full absolute lg:sticky lg:top-0 lg:w-[400px] z-[1] transition-all lg:transition-none overflow-y-auto -translate-x-full lg:translate-x-0 lg:transform-none h-full bg-gray-50 overflow-hidden flex flex-col items-start justify-start " +
                (drawerActive ? " !translate-x-0" : "")
              }
            >
              <div className="flex mb-0 flex-col w-full text-left justify-start align-top items-start">
                <div className="flex  bg-gradient-to-r from-slate-50 sticky top-0 z-[99] to-slate-200 text-black font-bold p-4 flex-row items-center justify-between w-full">
                  <Button
                    size="sm"
                    onPress={() => {
                      onBack();
                    }}
                    color="primary"
                    variant="bordered"
                    startContent={<ChevronLeft></ChevronLeft>}
                  >
                    {" "}
                    Back{" "}
                  </Button>
                </div>
              </div>
              {categories &&
                categories.map((i, d) => {
                  return (
                    <div className="flex mb-0 flex-col w-full text-left justify-start align-top items-start">
                      <div className="flex  bg-gradient-to-r from-secondary-500 sticky top-0 z-[99] to-yellow-200 text-black font-bold p-4 flex-row items-center justify-between w-full">
                        <div className="w-full flex flex-row items-center justify-start">
                          <Star size={16}></Star> <Spacer x={2}></Spacer>{" "}
                          <h2 className="font-medium mr-5">{i.title}</h2>
                        </div>
                        {role == "admin" ? (
                          <div className="flex flex-row items-center">
                            <Dropdown
                              onOpenChange={() => {
                                setCategoryTitle(i.title);
                              }}
                            >
                              <DropdownTrigger>
                                <Button size="sm" isIconOnly color="success">
                                  <Edit2 color="white" size={16}></Edit2>
                                </Button>
                              </DropdownTrigger>
                              <DropdownMenu>
                                <DropdownItem isReadOnly>
                                  <Input
                                    className="sf"
                                    type="text"
                                    placeholder="Enter Text"
                                    label="Category Title"
                                    value={categoryTitle || ""}
                                    onChange={(e) => {
                                      setCategoryTitle(e.target.value);
                                    }}
                                  ></Input>
                                  <Button
                                    size="sm"
                                    className="my-2 sf text-white to-purple-900 w-full border-1 border-purple-500 bg-gradient-to-r from-primary shadow-md"
                                    onClick={() => {
                                      categoryTitle != undefined
                                        ? updateCategoryTitle(
                                            i.id,
                                            categoryTitle
                                          )
                                        : "";
                                    }}
                                  >
                                    Update
                                  </Button>
                                </DropdownItem>
                              </DropdownMenu>
                            </Dropdown>
                            <Spacer x={2}></Spacer>
                            <Button
                              size="sm"
                              color="danger"
                              isIconOnly
                              onPress={() => {
                                deleteParentCategory(i.id);
                              }}
                            >
                              <Trash2 color="white" size={16}></Trash2>
                            </Button>
                          </div>
                        ) : (
                          ""
                        )}
                      </div>
                      <div className="w-full border-b-1 border-gray-200 bg-white"></div>
                      <ul className="flex flex-col w-full">
                        {gamecategories &&
                          categories &&
                          gamecategories
                            .filter((item) => item.parent == i.id)
                            .map((z, v) => {
                              return (
                                /* Sub Category Item */ <>
                                  <div
                                    onClick={() => {
                                      z.id == selectedLevel
                                        ? setSelectedLevel()
                                        : (setSelectedLevel(z.id),
                                          getLevels(z.id));
                                    }}
                                    className={
                                      "relative bg-white  p-4 py-1 w-full mb-0 border-b-1 cursor-pointer  transition-all flex flex-row text-center " +
                                      (selectedLevel == z.id
                                        ? " !bg-secondary-50"
                                        : "")
                                    }
                                  >
                                    <div className="flex w-full flex-row items-center justify-center align-middle py-3">
                                      <div className="flex flex-1 flex-row items-center justify-start">
                                        <BookAIcon size={24}></BookAIcon>

                                        <Spacer x={2}></Spacer>
                                        <p className="text-sm font-medium">
                                          {z.title}
                                        </p>
                                      </div>
                                      <ChevronDown
                                        className={
                                          "transition-all " +
                                          (selectedLevel == z.id
                                            ? "rotate-180"
                                            : "")
                                        }
                                      ></ChevronDown>
                                      <Spacer x={2}></Spacer>
                                      {role == "admin" ? (
                                        <Popover
                                          onOpenChange={(e) => {
                                            e == true
                                              ? setEditable((res) => ({
                                                  ...res,
                                                  gct: z.title,
                                                  gci: z.icon,
                                                }))
                                              : "";
                                          }}
                                          placement="bottom left"
                                          onClick={() => {}}
                                        >
                                          <PopoverTrigger>
                                            <Button
                                              isIconOnly
                                              size="sm"
                                              color="success"
                                            >
                                              <Edit2
                                                size={16}
                                                color="white"
                                              ></Edit2>
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent>
                                            <Input
                                              className="sf"
                                              placeholder="Enter Category Text"
                                              label="Category Text"
                                              onChange={(e) => {
                                                setEditable((res) => ({
                                                  ...res,
                                                  gct: e.target.value,
                                                }));
                                              }}
                                              value={editable?.gct}
                                            ></Input>
                                            {/* <ImageUploader
                                      data={{ image: editable?.gci }}
                                      onUploadComplete={(e) => {
                                        setEditable((res) => ({
                                          ...res,
                                          gci: e,
                                        }));
                                      }}
                                    ></ImageUploader> */}
                                            <Button
                                              className="mr-auto sf text-white"
                                              color="primary"
                                              onPress={() => {
                                                updateGameCategory(
                                                  editable,
                                                  z.id
                                                );
                                              }}
                                            >
                                              Update
                                            </Button>
                                          </PopoverContent>
                                        </Popover>
                                      ) : (
                                        ""
                                      )}
                                      <Spacer x={2}></Spacer>
                                      {/* Delete Category Button */}
                                      {role == "admin" ? (
                                        <Button
                                          onPress={() => {
                                            deleteCategoryById(z.id);
                                          }}
                                          color="danger"
                                          isIconOnly
                                          size="sm"
                                        >
                                          <X size={16}></X>
                                        </Button>
                                      ) : (
                                        ""
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className={
                                      "relative flex flex-col overflow-y-auto w-full h-0 overflow-hidden my-0  max-h-60 md:max-h-full " +
                                      (selectedLevel == z.id
                                        ? " py-4 !h-full"
                                        : "")
                                    }
                                  >
                                    {levelLoading && levelData == undefined ? (
                                      <Skeleton className="w-full p-8 rounded-xl"></Skeleton>
                                    ) : (
                                      ""
                                    )}
                                    {(levelData == undefined ||
                                      levelData?.length == 0) &&
                                      !levelLoading && (
                                        <div className="w-full text-center p-2">
                                          <p className="w-full p-2 flex flex-row items-center justify-center py-2 rounded-xl shadow-md bg-gray-50 border-dashed border-1">
                                            <AlertOctagon
                                              size={16}
                                            ></AlertOctagon>
                                            <Spacer x={2}></Spacer>
                                            No Test Found in this category
                                          </p>
                                        </div>
                                      )}
                                    {levelData &&
                                      levelData.map((i, d) => {
                                        return (
                                          <div
                                            key={i.id}
                                            className="px-2 mb-2 flex-1"
                                          >
                                            {" "}
                                            <div
                                              onClick={() => {
                                                setActiveLevel(i),
                                                  setDrawerActive(false),
                                                  getLeaderBoard(i.uuid);
                                              }}
                                              className={
                                                `w-full flex flex-col justify-between cursor-pointer h-auto text-left shadow-sm p-3 rounded-md hover:scale-[0.995]  bg-white  transition-all hover:shadow-md ` +
                                                (activeLevel?.id == i.id
                                                  ? " border-1 border-secondary bg-secondary-50"
                                                  : "")
                                              }
                                            >
                                              <div className="flex flex-row justify-between w-full">
                                                <h2 className="font-bold flex flex-row items-center  justify-start text-md">
                                                  {i.title}
                                                </h2>

                                                {activeLevel?.id == i.id &&
                                                  role != "admin" && (
                                                    <CheckCircle2
                                                      className="fill-lime-500"
                                                      stroke="white"
                                                    ></CheckCircle2>
                                                  )}
                                                {role == "admin" ? (
                                                  <div className="flex flex-row items-center justify-between">
                                                    <Popover
                                                      onOpenChange={(e) => {
                                                        e == true
                                                          ? setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                lt: i.title,
                                                                lv: i.video,

                                                                ld: i.difficulty,
                                                                li: i.image,
                                                                ltime: i.time,
                                                                lobj: i.objective,
                                                                ldesc:
                                                                  i.description,
                                                                calculator_allowed:
                                                                  i?.calculator_allowed,
                                                                is_scientific:
                                                                  i?.is_scientific,
                                                                demo: i?.demo,
                                                              })
                                                            )
                                                          : "";
                                                      }}
                                                      placement="bottom left"
                                                      onClick={() => {}}
                                                    >
                                                      <PopoverTrigger>
                                                        <Button
                                                          className=" from-primary to-purple-500 bg-gradient-to-t shadow-md shadow-purple-400 border-purple-300 border-1"
                                                          size="sm"
                                                          isIconOnly={true}
                                                        >
                                                          <svg
                                                            width="18"
                                                            height="18"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                          >
                                                            <path
                                                              d="M13.94 5 19 10.06 9.062 20a2.25 2.25 0 0 1-.999.58l-5.116 1.395a.75.75 0 0 1-.92-.921l1.395-5.116a2.25 2.25 0 0 1 .58-.999L13.938 5Zm7.09-2.03a3.578 3.578 0 0 1 0 5.06l-.97.97L15 3.94l.97-.97a3.578 3.578 0 0 1 5.06 0Z"
                                                              fill="#fff"
                                                            />
                                                          </svg>
                                                        </Button>
                                                      </PopoverTrigger>

                                                      <PopoverContent className="max-w-[500px] max-h-[500px] sf overflow-y-auto flex flex-col justify-start items-start align-middle">
                                                        <Input
                                                          className="my-2"
                                                          autoFocus
                                                          label="Level Title"
                                                          type="text"
                                                          placeholder="Enter your Level Title"
                                                          value={editable?.lt}
                                                          onChange={(e) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                lt: e.target
                                                                  .value,
                                                              })
                                                            );
                                                          }}
                                                        ></Input>

                                                        <Input
                                                          className="my-2"
                                                          label="Video/Youtube Embed URL"
                                                          type="text"
                                                          placeholder="Enter Valid Video Embed URL"
                                                          value={editable?.lv}
                                                          onChange={(e) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                lv: convertToYouTubeEmbed(
                                                                  e.target.value
                                                                ),
                                                              })
                                                            );
                                                          }}
                                                        ></Input>
                                                        <Popover>
                                                          <PopoverTrigger>
                                                            <Button
                                                              className="my-2"
                                                              isDisabled={
                                                                newLevelData?.video ==
                                                                undefined
                                                              }
                                                              color="primary"
                                                            >
                                                              <svg
                                                                width="24"
                                                                height="24"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                              >
                                                                <path
                                                                  d="M9.5 9.38455V14.6162C9.5 15.1858 10.1099 15.5475 10.6097 15.2743L15.3959 12.6582C15.9163 12.3737 15.9162 11.6263 15.3958 11.3419L10.6097 8.72641C10.1099 8.45328 9.5 8.81499 9.5 9.38455ZM5.25 3C3.45507 3 2 4.45507 2 6.25V17.75C2 19.5449 3.45507 21 5.25 21H18.75C20.5449 21 22 19.5449 22 17.75V6.25C22 4.45507 20.5449 3 18.75 3H5.25ZM3.5 6.25C3.5 5.2835 4.2835 4.5 5.25 4.5H18.75C19.7165 4.5 20.5 5.2835 20.5 6.25V17.75C20.5 18.7165 19.7165 19.5 18.75 19.5H5.25C4.2835 19.5 3.5 18.7165 3.5 17.75V6.25Z"
                                                                  fill="currentColor"
                                                                />
                                                              </svg>
                                                              Preview Video
                                                            </Button>
                                                          </PopoverTrigger>
                                                          <PopoverContent>
                                                            <iframe
                                                              title="YouTube Video Player"
                                                              width={"100%"}
                                                              height={"200px"}
                                                              src={
                                                                newLevelData?.video ||
                                                                ""
                                                              }
                                                              frameBorder="0"
                                                              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                                              allowFullScreen
                                                            ></iframe>
                                                          </PopoverContent>
                                                        </Popover>

                                                        <Select
                                                          label="Level Difficulty"
                                                          placeholder="Select Difficulty"
                                                          onChange={(e) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                ld: e.target
                                                                  .value,
                                                              })
                                                            );
                                                          }}
                                                          className=" sf"
                                                          defaultSelectedKeys={[
                                                            (
                                                              editable?.ld + 1
                                                            ).toString(),
                                                          ]}
                                                        >
                                                          {difficulty.map(
                                                            (difficultyz) => (
                                                              <SelectItem
                                                                className="sf"
                                                                key={
                                                                  difficultyz.value
                                                                }
                                                                value={
                                                                  difficultyz.value
                                                                }
                                                              >
                                                                {
                                                                  difficultyz.title
                                                                }
                                                              </SelectItem>
                                                            )
                                                          )}
                                                        </Select>

                                                        <Switch
                                                          className="my-2"
                                                          isSelected={
                                                            editable?.demo
                                                          }
                                                          onValueChange={(
                                                            e
                                                          ) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                demo: e,
                                                              })
                                                            );
                                                          }}
                                                        >
                                                          Is Demo ?{" "}
                                                        </Switch>
                                                        <Switch
                                                          className="my-2"
                                                          isSelected={
                                                            editable?.calculator_allowed ??
                                                            false
                                                          }
                                                          onValueChange={(
                                                            e
                                                          ) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                calculator_allowed:
                                                                  e,
                                                              })
                                                            );
                                                          }}
                                                        >
                                                          Is Calculator Allowed
                                                          ?{" "}
                                                        </Switch>
                                                        <Switch
                                                          className="my-2"
                                                          isSelected={
                                                            editable?.is_scientific ??
                                                            false
                                                          }
                                                          onValueChange={(
                                                            e
                                                          ) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                is_scientific:
                                                                  e,
                                                              })
                                                            );
                                                          }}
                                                        >
                                                          Should be Scientific
                                                          Calculator ?{" "}
                                                        </Switch>
                                                        <Input
                                                          className="my-2"
                                                          autoFocus
                                                          label="Level Time in minutes"
                                                          type="number"
                                                          placeholder="Enter Level Minutes"
                                                          value={
                                                            editable?.ltime ??
                                                            ""
                                                          }
                                                          onChange={(e) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                ltime:
                                                                  e.target
                                                                    .value,
                                                              })
                                                            );
                                                          }}
                                                        ></Input>
                                                        <Slider
                                                          minValue={5}
                                                          onChange={(e) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                ltime: e,
                                                              })
                                                            );
                                                          }}
                                                          value={
                                                            editable?.ltime
                                                          }
                                                          maxValue={180}
                                                        ></Slider>

                                                        <ImageUploader
                                                          size="small"
                                                          data={{
                                                            image:
                                                              editable?.li ||
                                                              "",
                                                          }}
                                                          onUploadComplete={(
                                                            e
                                                          ) => {
                                                            setEditable(
                                                              (res) => ({
                                                                ...res,
                                                                li: e,
                                                              })
                                                            );
                                                          }}
                                                        ></ImageUploader>

                                                        <h2>
                                                          Level Description
                                                        </h2>
                                                        <div className="h-auto">
                                                          <QuillWarapper
                                                            /* data={editable?.ldesc} */
                                                            value={
                                                              editable?.ldesc ||
                                                              ""
                                                            }
                                                            onChange={(e) => {
                                                              setEditable(
                                                                (res) => ({
                                                                  ...res,
                                                                  ldesc: e,
                                                                })
                                                              );
                                                            }}
                                                          ></QuillWarapper>
                                                        </div>

                                                        <h2>
                                                          Milestone Objective
                                                        </h2>
                                                        <div className="h-auto">
                                                          <QuillWarapper
                                                            /* data={editable?.lobj} */
                                                            value={
                                                              editable?.lobj ||
                                                              ""
                                                            }
                                                            onChange={(e) => {
                                                              setEditable(
                                                                (res) => ({
                                                                  ...res,
                                                                  lobj: e,
                                                                })
                                                              );
                                                            }}
                                                          ></QuillWarapper>
                                                        </div>

                                                        <Button
                                                          className="mr-auto sf relative flex-shrink-0 text-white"
                                                          color="primary"
                                                          onPress={() => {
                                                            updateLevel(
                                                              editable,
                                                              i.id,
                                                              i.parent
                                                            );
                                                          }}
                                                        >
                                                          Update Level
                                                        </Button>
                                                      </PopoverContent>
                                                    </Popover>
                                                    <Tooltip
                                                      content="Re-order Questions"
                                                      size="sm"
                                                    >
                                                      <Button
                                                        size="sm"
                                                        onPress={() => {
                                                          getOrderQuestions(
                                                            i.id,
                                                            () => {
                                                              setReorderModal(
                                                                true
                                                              );
                                                            },
                                                            () => {}
                                                          );
                                                        }}
                                                        isIconOnly
                                                        className="ml-2 shadow-md border-1 from-gray-50 to-white bg-gradient-to-r"
                                                      >
                                                        <RefreshCw
                                                          size={16}
                                                        ></RefreshCw>
                                                      </Button>
                                                    </Tooltip>
                                                    <Tooltip
                                                      content="Add Questions"
                                                      size="sm"
                                                    >
                                                      <Button
                                                        onPress={() => {
                                                          setParentMain(i.id),
                                                            getData(
                                                              "questions",
                                                              "title,id",
                                                              "parent",
                                                              i.id,
                                                              (e) => {
                                                                setQuestions(e),
                                                                  setQuestionToggle(
                                                                    true
                                                                  );
                                                              },
                                                              ({
                                                                errortext,
                                                              }) => {
                                                                console.log(
                                                                  errortext
                                                                );
                                                              }
                                                            );
                                                        }}
                                                        className="text-black border-gray-100 to-gray-300 from-white bg-gradient-to-t shadow-md border-1 mx-2 bg-gray-100"
                                                        size="sm"
                                                        isIconOnly={true}
                                                      >
                                                        <svg
                                                          width="18"
                                                          height="18"
                                                          fill="none"
                                                          viewBox="0 0 24 24"
                                                          xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                          <path
                                                            d="M11.883 3.007 12 3a1 1 0 0 1 .993.883L13 4v7h7a1 1 0 0 1 .993.883L21 12a1 1 0 0 1-.883.993L20 13h-7v7a1 1 0 0 1-.883.993L12 21a1 1 0 0 1-.993-.883L11 20v-7H4a1 1 0 0 1-.993-.883L3 12a1 1 0 0 1 .883-.993L4 11h7V4a1 1 0 0 1 .883-.993L12 3l-.117.007Z"
                                                            fill="#222F3D"
                                                          />
                                                        </svg>
                                                      </Button>
                                                    </Tooltip>
                                                    <Button
                                                      color="danger"
                                                      size="sm"
                                                      onPress={() => {
                                                        DeleteLevelbyId(
                                                          i.id,
                                                          i.parent
                                                        );
                                                      }}
                                                      isIconOnly={true}
                                                      className="text-white border-gray-50 from-danger to-secondary bg-gradient-to-b border-1 mx-0  shadow-sm shadow-danger"
                                                    >
                                                      <svg
                                                        width="18"
                                                        height="18"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                      >
                                                        <path
                                                          d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z"
                                                          fill="#fff"
                                                        />
                                                      </svg>
                                                    </Button>

                                                    <Spacer x={2}></Spacer>
                                                    <ChevronRight></ChevronRight>
                                                  </div>
                                                ) : (
                                                  ""
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    {role == "admin" ? (
                                      <Popover className="flex flex-col items-start align-middle justify-start overflow-hidden">
                                        <PopoverTrigger autoFocus={false}>
                                          <div className="w-full my-2 flex flex-row items-center justify-center align-middle p-2 border-1 border-gray-300 rounded-xl px-5 shadow-sm bg-white cursor-pointer hover:bg-gray-200 transition-all mx-auto">
                                            <svg
                                              className="mr-2"
                                              width="24"
                                              height="24"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM12 7C12.4142 7 12.75 7.33579 12.75 7.75V11.25H16.25C16.6642 11.25 17 11.5858 17 12C17 12.4142 16.6642 12.75 16.25 12.75H12.75V16.25C12.75 16.6642 12.4142 17 12 17C11.5858 17 11.25 16.6642 11.25 16.25V12.75H7.75C7.33579 12.75 7 12.4142 7 12C7 11.5858 7.33579 11.25 7.75 11.25H11.25V7.75C11.25 7.33579 11.5858 7 12 7Z"
                                                fill="currentColor"
                                              />
                                            </svg>

                                            <p className="text-xs">
                                              Add New Level to this Category
                                            </p>
                                            <Spacer y={5}></Spacer>
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="sf flex flex-col justify-start items-start overflow-y-auto max-w-[500px] max-h-[500px]">
                                          <Input
                                            className="my-2"
                                            autoFocus
                                            label="Level Title"
                                            type="text"
                                            placeholder="Enter your Level Title"
                                            onChange={(e) => {
                                              setNewLevelData((res) => ({
                                                ...res,
                                                title: e.target.value,
                                              }));
                                            }}
                                          ></Input>

                                          {/*  <Dropdown>
                        <DropdownTrigger>
                          <Button
                            size="sm"
                            className="flex-grow-1 flex-shrink-0 text-white"
                            color="primary"
                          >
                            <svg
                              width="24"
                              height="24"
                              fill="none"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M18.25 3.509a.75.75 0 1 0 0-1.5l-13-.004a.75.75 0 1 0 0 1.5l13 .004Zm-6.602 18.488.102.007a.75.75 0 0 0 .743-.649l.007-.101-.001-13.685 3.722 3.72a.75.75 0 0 0 .976.072l.085-.072a.75.75 0 0 0 .072-.977l-.073-.084-4.997-4.996a.75.75 0 0 0-.976-.073l-.085.072-5.003 4.997a.75.75 0 0 0 .976 1.134l.084-.073 3.719-3.713L11 21.254c0 .38.282.693.648.743Z"
                                fill="white"
                              />
                            </svg>{" "}
                            Upload Video
                          </Button>
                        </DropdownTrigger>

                        <DropdownMenu>
                          <DropdownItem isReadOnly>
                            <VideoUploader
                              onComplete={(e) => {
                                setNewLevelData((res) => ({
                                  ...res,
                                  video: e,
                                }));
                              }}
                              value={newLevelData?.video || ""}
                            ></VideoUploader>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown> */}
                                          <Input
                                            className="my-2"
                                            label="Video/Youtube Embed URL"
                                            type="text"
                                            value={newLevelData?.video}
                                            placeholder="Enter Valid Video Embed URL"
                                            onChange={(e) => {
                                              setNewLevelData((res) => ({
                                                ...res,
                                                video: convertToYouTubeEmbed(
                                                  e.target.value
                                                ),
                                              }));
                                            }}
                                          ></Input>
                                          <Popover>
                                            <PopoverTrigger>
                                              <Button
                                                className="my-2"
                                                isDisabled={
                                                  newLevelData?.video ==
                                                  undefined
                                                }
                                                color="primary"
                                              >
                                                <svg
                                                  width="24"
                                                  height="24"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  xmlns="http://www.w3.org/2000/svg"
                                                >
                                                  <path
                                                    d="M9.5 9.38455V14.6162C9.5 15.1858 10.1099 15.5475 10.6097 15.2743L15.3959 12.6582C15.9163 12.3737 15.9162 11.6263 15.3958 11.3419L10.6097 8.72641C10.1099 8.45328 9.5 8.81499 9.5 9.38455ZM5.25 3C3.45507 3 2 4.45507 2 6.25V17.75C2 19.5449 3.45507 21 5.25 21H18.75C20.5449 21 22 19.5449 22 17.75V6.25C22 4.45507 20.5449 3 18.75 3H5.25ZM3.5 6.25C3.5 5.2835 4.2835 4.5 5.25 4.5H18.75C19.7165 4.5 20.5 5.2835 20.5 6.25V17.75C20.5 18.7165 19.7165 19.5 18.75 19.5H5.25C4.2835 19.5 3.5 18.7165 3.5 17.75V6.25Z"
                                                    fill="currentColor"
                                                  />
                                                </svg>
                                                Preview Video
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                              <iframe
                                                title="YouTube Video Player"
                                                width={"100%"}
                                                height={"200px"}
                                                src={newLevelData?.video || ""}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                              ></iframe>
                                            </PopoverContent>
                                          </Popover>

                                          <Select
                                            label="Level Difficulty"
                                            placeholder="Select Difficulty"
                                            onChange={(e) => {
                                              setNewLevelData((res) => ({
                                                ...res,
                                                difficulty: e.target.value,
                                              }));
                                            }}
                                            className=" sf"
                                          >
                                            {difficulty.map((difficultyz) => (
                                              <SelectItem
                                                className="sf"
                                                key={difficultyz.value}
                                                value={difficultyz.value}
                                              >
                                                {difficultyz.title}
                                              </SelectItem>
                                            ))}
                                          </Select>

                                          <Input
                                            className="my-2"
                                            autoFocus
                                            label="Level Time in Numbers"
                                            type="number"
                                            placeholder="Enter Max Game Time"
                                            onChange={(e) => {
                                              setNewLevelData((res) => ({
                                                ...res,
                                                time: e.target.value,
                                              }));
                                            }}
                                          ></Input>

                                          <ImageUploader
                                            size="small"
                                            data={{
                                              image: newLevelData?.image || "",
                                            }}
                                            onUploadComplete={(e) => {
                                              setNewLevelData((res) => ({
                                                ...res,
                                                image: e,
                                              }));
                                            }}
                                          ></ImageUploader>

                                          <h2>Level Description</h2>
                                          <div className="h-auto">
                                            <QuillWarapper
                                              value={
                                                newLevelData?.description ||
                                                "<p></p>"
                                              }
                                              onChange={(e) => {
                                                setNewLevelData((res) => ({
                                                  ...res,
                                                  description: e,
                                                }));
                                              }}
                                            ></QuillWarapper>
                                          </div>

                                          <h2>Milestone Objective</h2>
                                          <div className="h-auto">
                                            <QuillWarapper
                                              value={
                                                newLevelData?.objective ||
                                                "<p></p>"
                                              }
                                              onChange={(e) => {
                                                setNewLevelData((res) => ({
                                                  ...res,
                                                  objective: e,
                                                }));
                                              }}
                                            ></QuillWarapper>
                                          </div>

                                          <Button
                                            color="primary"
                                            className="relative text-white my-2 flex-shrink-0"
                                            onClick={() => {
                                              addNewLevel(
                                                newLevelData,
                                                selectedLevel
                                              );
                                            }}
                                          >
                                            Add Level
                                            {loading == true ? (
                                              <Spinner color="white"></Spinner>
                                            ) : (
                                              ""
                                            )}
                                          </Button>
                                        </PopoverContent>
                                      </Popover>
                                    ) : (
                                      ""
                                    )}
                                  </div>
                                </>
                              );
                            })}
                      </ul>
                    </div>
                  );
                })}
              {/* Add New Category Parent */}
              {role == "admin" ? (
                <Dropdown className="sf">
                  <DropdownTrigger>
                    <Button
                      color="primary"
                      size="sm"
                      className="w-full mt-auto z-[999] flex-shrink-0 sticky bottom-0 rounded-0"
                    >
                      Add New Category
                    </Button>
                  </DropdownTrigger>

                  <DropdownMenu>
                    <DropdownItem isReadOnly>
                      <Input
                        label="Title"
                        placeholder="Enter Title"
                        onChange={(e) => {
                          setCategoryData((res) => ({
                            ...res,
                            title: e.target.value,
                            slug: e.target.value.replace(" ", "-"),
                          }));
                        }}
                      ></Input>
                    </DropdownItem>

                    <DropdownItem isReadOnly>
                      <Dropdown>
                        <DropdownTrigger>
                          <div className="p-2 bg-gray-100 rounded-md">
                            <p className="text-xs text-gray-500">
                              Select Category
                            </p>
                            {getTextFromKey(
                              categoryData?.parent,
                              "id",
                              categories,
                              "title"
                            ) || "Click to Select Category"}
                          </div>
                        </DropdownTrigger>

                        <DropdownMenu className="sf max-h-[50vh] overflow-auto">
                          {categories &&
                            categories.map((i, d) => {
                              return (
                                <DropdownItem
                                  onPress={() => {
                                    setCategoryData((res) => ({
                                      ...res,
                                      parent: i.id,
                                    }));
                                  }}
                                >
                                  {i.title}
                                </DropdownItem>
                              );
                            })}
                          <DropdownItem isReadOnly>
                            <Input
                              label="Add New Category"
                              value={categoryData?.cattitle || ""}
                              placeholder="Enter Title"
                              onChange={(e) => {
                                setCategoryData((res) => ({
                                  ...res,
                                  cattitle: e.target.value,
                                }));
                              }}
                            ></Input>
                            <Spacer y={2}></Spacer>
                            <Button
                              onClick={() => {
                                addNewCategory(categoryData?.cattitle);
                              }}
                              color="primary"
                              className="text-white"
                            >
                              Add Category{" "}
                              {loading == true ? (
                                <Spinner size="sm" color="white"></Spinner>
                              ) : (
                                ""
                              )}
                            </Button>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </DropdownItem>
                    <DropdownItem isReadOnly>
                      <Button
                        onClick={() => {
                          addNewGameCategory(categoryData);
                        }}
                        color="primary"
                        className="text-white"
                      >
                        Add Game Category{" "}
                        {loading == true ? (
                          <Spinner size="sm" color="white"></Spinner>
                        ) : (
                          ""
                        )}
                      </Button>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              ) : (
                ""
              )}
            </div>

            <div
              className={
                "flex-1 absolute z-0 left-0 top-0 w-full lg:w-auto h-full lg:relative bg-gray-100 p-0 lg:p-4 flex flex-col items-start justify-start rounded-xl overflow-y-auto overflow-x-hidden lg:!transform-none translate-x-0 "
              }
            >
              {!activeLevel && (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                  <PencilIcon size={48}></PencilIcon>
                  <Spacer y={2}></Spacer>
                  <h2 className="text-md max-w-[20ch]">
                    Please Select a test from list to view
                  </h2>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeLevel?.id + "ipm"}
                  initial={{ x: -50, opacity: 0 }}
                  exit={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.3 }}
                  className="w-full  flex-shrink-0 mb-10 md:mb-0 flex flex-col items-start justify-start  rounded-xl py-2 lg:py-0 px-2 relative"
                >
                  {activeLevel ? (
                    <>
                      <Button
                        onPress={() => {
                          setDrawerActive(true), setActiveLevel();
                        }}
                        size="md"
                        startContent={
                          <ArrowRight
                            size={16}
                            className=" -rotate-180"
                          ></ArrowRight>
                        }
                        className="bg-white mb-4 shadow-md flex lg:hidden border-1 rounded-full text-black "
                      >
                        Back to Modules
                      </Button>
                      {activeLevel && (
                        <div className="w-full relative aspect-video overflow-hidden rounded-xl">
                          {activeLevel?.image && (
                            <Image
                              fetchPriority="high"
                              classNames={{
                                wrapper: "w-full h-full !max-w-[unset]",
                              }}
                              className="w-full z-0 relative h-full object-cover"
                              src={activeLevel?.image}
                            />
                          )}

                          <div className=" absolute left-0 bottom-0 w-full h-[70%] bg-gradient-to-t z-0 from-[#000a] to-[50%] to-transparent"></div>
                          <div className=" absolute w-full p-4 z-[1] flex flex-row items-start justify-start bottom-0 left-0">
                            {activeLevel?.video && (
                              <Button
                                onPress={() => {
                                  setVideo(activeLevel?.video);
                                }}
                                size="lg"
                                endContent={<Video></Video>}
                                className="bg-gradient-to-r from-purple-800 to-secondary text-white shadow-md border-1 relative rounded-full  mr-3 "
                              >
                                Watch Video
                              </Button>
                            )}
                            {!(
                              plays &&
                              plays?.filter(
                                (item) => item.test_uuid.id == activeLevel?.id
                              )?.length > 0
                            ) ? (
                              <Button
                                as={Link}
                                target="_blank"
                                href={`/test/${activeLevel?.uuid}`}
                                size="lg"
                                startContent={
                                  <div className="w-3 h-3 rounded-full  animate-ping bg-secondary -z-[1]"></div>
                                }
                                endContent={<ArrowRight></ArrowRight>}
                                className="bg-white shadow-md border-1 relative rounded-full text-black "
                              >
                                Start Test
                              </Button>
                            ) : (
                              <></>
                            )}

                            {plays &&
                              plays?.filter(
                                (item) => item.test_uuid.id == activeLevel?.id
                              )?.length > 0 && (
                                <div className="ml-4 flex  flex-row items-center justify-start">
                                  <Button
                                    onPress={() => {
                                      setActiveResult(activeLevel?.id);
                                    }}
                                    size="lg"
                                    startContent={<Eye size={24}></Eye>}
                                    className="bg-warning shadow-md border-1 relative rounded-full text-black "
                                  >
                                    Results & Analytics
                                  </Button>
                                  {role === "admin" && (
                                    <Button
                                      onPress={() =>
                                        fetchLevelSubmissions(activeLevel?.uuid)
                                      }
                                      size="lg"
                                      color="primary"
                                      className="ml-2 bg-gradient-to-r from-purple-500 to-primary text-white shadow-md border-1 relative rounded-full"
                                    >
                                      <Eye size={24} />
                                      View Submissions
                                    </Button>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                      <h2 className=" text-3xl font-bold text-primary my-4">
                        {activeLevel?.title}
                      </h2>
                      <div className="flex flex-row flex-wrap items-center justify-start">
                        <Chip
                          className="mr-2 mb-2"
                          variant="flat"
                          size="md"
                          color="primary"
                        >
                          Difficulty :{" "}
                          {
                            difficulty.find(
                              (item) => item.value == activeLevel?.difficulty
                            )?.title
                          }
                        </Chip>
                        <Chip
                          className="mr-2 mb-2"
                          variant="flat"
                          size="md"
                          color="success"
                        >
                          Question Count : {activeLevel?.questions?.length}
                        </Chip>
                        <Chip
                          className="mr-2 mb-2"
                          variant="flat"
                          size="md"
                          color="primary"
                        >
                          Test Time :{" "}
                          {convertSecondsToMinutes(activeLevel?.time)}
                        </Chip>
                      </div>

                      <Spacer y={8}></Spacer>

                      <div className="flex flex-col-reverse 2xl:flex-row items-start justify-start w-full">
                        <div className="flex flex-col w-full items-start justify-start flex-1">
                          <Spacer y={2}></Spacer>
                          <div className="w-full rounded-xl text-left bg-white shadow-sm p-4">
                            <h2 className="text-2xl font-semibold text-primary">
                              Level Description
                            </h2>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: activeLevel?.description,
                              }}
                            ></div>
                          </div>
                          <Spacer y={2}></Spacer>
                          <div className="w-full rounded-xl text-left bg-white shadow-sm p-4">
                            <h2 className="text-2xl font-semibold text-primary">
                              Level Objective
                            </h2>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: activeLevel?.objective,
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="rounded-xl text-left bg-white shadow-sm p-4 mb-4 mt-2 ml-4">
                          <h2 className="text-2xl font-bold text-primary mb-2">
                            🏆 Top Rankers This Week
                          </h2>
                          <Leaderboard
                            scores={leaderboardData ?? []}
                          ></Leaderboard>
                        </div>
                      </div>
                    </>
                  ) : (
                    ""
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          ""
        )}
      </motion.div>
    </div>
  );
}
