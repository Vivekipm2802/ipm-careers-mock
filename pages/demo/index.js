import Head from "next/head";
import styles from "@/styles/Home.module.css";
import DefaultLayout from "@/layouts/DefaultLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import IsAdminCheck from "./../isAdminCheck";
import {
  DropdownItem,
  Dropdown,
  DropdownMenu,
  DropdownTrigger,
  DropdownSection,
  Modal,
  ModalBody,
  ModalHeader,
  ModalContent,
  Spacer,
  ModalFooter,
  Button,
  Input,
  Spinner,
  Select,
  SelectItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Switch,
  Divider,
  toggle,
  Chip,
  Checkbox,
  Textarea,
  Accordion,
  AccordionItem,
  ButtonGroup,
  Avatar,
} from "@nextui-org/react";
import { Document, Page, pdfjs } from "react-pdf";
import { CtoLocal, formatCreatedAt } from "@/utils/DateUtil";
import dynamic from "next/dynamic";
import { logoutUser } from "@/supabase/userUtility";
import ImageUploader from "@/components/ImageUploader";
import GameCard from "@/components/GameCard";
import Webinars from "@/components/Webinars";
import PYQManager from "@/components/PYQManager";

import BookBySubject from "@/components/BookBySubject";

import { Toaster, toast } from "react-hot-toast";
import DashTrack from "@/components/DashTrack";
import ExamScanner from "@/components/ExamScanner";
import VideoUploader from "@/components/VideoUploader";
import UserManager from "@/components/UserManager";
import { useNMNContext } from "@/components/NMNContext";
import ResultManager from "@/components/ResultManager";
import PrintManager from "@/components/PrintManager";
import Submissions from "@/components/Submission";
import CallSubmissions from "@/components/CallSubmissions";
import ResponseSubmissions from "@/components/ResponseSubmissions";
import Dashboard from "@/components/Dashboard";
import MockTests from "@/components/MockTests";
import Concept from "@/components/ConceptTest";
import MockTestEditor from "@/components/MockTestEditor";
import PerformanceUser from "@/components/PerformanceUser";
import DailyLearn from "@/components/DailyLearn";
import Link from "next/link";
import VideoGroups from "@/components/VideoGroups";
import PreRecorded from "@/components/PreRecorded";
import Classes from "@/components/Classes";
import ConceptGroups from "@/components/ConceptGroups";
import KYCManager from "@/components/KYCManager";
import Loader from "@/components/Loader";
const CustomEditor = dynamic(() => import("@/components/CustomEditor"), {
  ssr: false,
});

export default function Home(props) {
  const [type, setType] = useState("user");
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [userData, setUserData] = useState();
  const [loading, setLoading] = useState(false);
  const [replyData, setReplyData] = useState();
  const [activeReply, setActiveReply] = useState(null);
  const [categories, setCategories] = useState();
  const [gamecategories, setGameCategories] = useState();
  const [gamestate, setGameState] = useState(0);
  const [levelData, setLevelData] = useState();
  const [activeLevel, setActiveLevel] = useState(0);
  const [activeLevelData, setActiveLevelData] = useState(0);
  const [activeExcerpt, setActiveExcerpt] = useState();
  const [history, setHistory] = useState();
  const [panel, setPanel] = useState();
  const [questions, setQuestions] = useState();
  const [questionToggle, setQuestionToggle] = useState(false);
  const [scores, setScores] = useState();
  const [mindMapData, setMindMapData] = useState();
  const [mindmaps, setMindMaps] = useState();
  const [activeMind, setActiveMind] = useState();
  const [activeMap, setActiveMap] = useState();
  const [updateMapData, setUpdateMapData] = useState();
  const [courses, setCourses] = useState();
  const [addNewQuestion, setAddNewQuestion] = useState({
    type: false,
    options: [
      { isCorrect: false },
      { isCorrect: false },
      { isCorrect: false },
      { isCorrect: false },
    ],
  });

  const [toggleMaps, setToggleMaps] = useState(true);
  const [coursesEnrolled, setCoursesEnrolled] = useState();
  const [activeCourse, setActiveCourse] = useState();
  const [courseData, setCourseData] = useState();
  const [enrollmentData, setEnrollmentdata] = useState();
  const [emails, setEmails] = useState();
  const [videos, setVideos] = useState();
  const [vcategory, setVCategory] = useState();

  const [videosData, setVideosData] = useState();
  const [lvideosData, setLVideosData] = useState();
  const [mindMapCategories, setMindMapCategories] = useState();
  const [profileDetails, setProfileDetails] = useState();

  const [fullScreenVideo, setFullScreenVideo] = useState(false);
  const [videoURL, setVideoURL] = useState();
  const [dna, setDNA] = useState();
  const [pdfs, setPDFs] = useState();
  const [imagequizes, setImageQuizes] = useState();
  const [numPages, setNumPages] = useState();
  const [pageNumber, setPageNumber] = useState(1);

  const [tutorialData, setTutorialData] = useState();
  const [tutorialCategories, setTutorialCategories] = useState();
  const [tutorials, setTutorials] = useState();
  const [pdfMaterial, setPDFMaterial] = useState();
  const [pdfData, setPDFData] = useState();
  const [pdfCategories, setPDFCategories] = useState();
  const [activePDFMaterial, setActivePDFMaterial] = useState();

  const [generated, setGenerated] = useState();

  const [coursesLoading, setCoursesLoading] = useState(true);

  const [requriedInfo, setRequiredInfo] = useState(false);
  const [centres, setCentres] = useState();
  const [requiredData, setRequiredData] = useState();
  const [livevideos, setLiveVideos] = useState();
  const [lvcategory, setLVCategory] = useState();

  const [redeemCode, setRedeemCode] = useState();

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const {
    profileModal,
    setProfileModal,
    coursesModal,
    setCoursesModal,
    setRedeemActive,
    redeemActive,
    setUserDetails,
    ctxSlug,
    setCTXSlug,
    setUserCourses,
    payments,
  } = useNMNContext();
  const slug = ctxSlug;

  const setSlug = (a) => {
    setCTXSlug(a);
  };

  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax//libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

  const [activeCA, setActiveCA] = useState({
    title: "Daily News Analysis",
    value: "dna",
  });

  function FullScreenVideo(a) {
    setVideoURL(a);
    setFullScreenVideo(true);
  }

  useEffect(() => {
    getCategories();
    getGameCategories();
    getPanel();
    getScores();
    getMindMapCategories();
    getTutorialCategories();
    getTutorials();
    getCourses();
  }, []);
  function convertUTCtoFormattedDate(utcDate) {
    // Create a Date object from the UTC string
    const date = new Date(utcDate);

    // Get the components of the date
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1; // Month is zero-based
    const year = date.getUTCFullYear();

    // Format the components into the desired string
    const formattedDate = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")} - ${String(day).padStart(2, "0")}/${String(
      month
    ).padStart(2, "0")}/${year}`;

    return formattedDate;
  }
  useEffect(() => {
    // Dynamically import react-mathquill styles
    import("react-mathquill").then(({ addStyles }) => {
      addStyles(); // Call the addStyles function to apply the required styles
    });
  }, []);

  useEffect(() => {
    if (userData != undefined) {
      getEnrollments(userData.email);
    }
  }, [userData]);

  async function getEnrollments(a, b) {
    const query = supabase.from("enrollments").select("*,course(*)");

    if (b == true) {
    } else {
      query.eq("email", a);
    }
    const { data, error } = await query;
    if (data && data.length > 0) {
      setCoursesEnrolled(data);
      setUserCourses(data);
      setCoursesLoading(false);
    } else {
      setCoursesLoading(false);
    }
  }
  const catypes = [
    {
      title: "Daily News Analysis",
      value: "dna",
    },
    {
      title: "PDF Study Material",
      value: "pdfs",
    },
    {
      title: "Daily Image Quizes",
      value: "iq",
    },
  ];
  async function getScores() {
    const { data, error } = await supabase
      .from("plays")
      .select("*,game(id,title)")
      .order("score", { ascending: false })
      .limit(10);

    if (data) {
      setScores(data);
    } else {
    }
  }

  useEffect(() => {
    if (userData != undefined) {
      getHistory(userData.email);
    }
  }, [userData]);

  const [questionData, setQuestionData] = useState({
    active: false,
  });

  async function getUserData() {
    const { data } = await supabase.auth.getUser();

    if (data && data.user != undefined) {
      setUserData(data.user);
      setUserDetails(data.user);
    } else {
      setUserData("no data");
      setUserDetails(null);
    }
  }
  async function getTutorials() {
    const { data, error } = await supabase
      .from("tutorials")
      .select("*")
      .eq("type", "content")
      .order("created_at", { ascending: true });
    if (data) {
      setTutorials(data);
    }
  }
  async function getPDFMaterial() {
    const { data, error } = await supabase
      .from("pdfs")
      .select("*")
      .eq("type", "content")
      .order("created_at", { ascending: true });
    if (data) {
      setPDFMaterial(data);
    }
  }
  async function getTutorialCategories() {
    const { data, error } = await supabase
      .from("tutorials")
      .select("*")
      .eq("type", "category")
      .order("created_at", { ascending: true });
    if (data) {
      setTutorialCategories(data);
    }
  }
  async function getPDFCategories() {
    const { data, error } = await supabase
      .from("pdfs")
      .select("*")
      .eq("type", "category")
      .order("created_at", { ascending: true });
    if (data) {
      setPDFCategories(data);
    }
  }
  async function addTutorialCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("tutorials").insert({
      title: a?.title,
      description: a?.description,
      type: "category",
    });

    if (!error) {
      getTutorialCategories();
    }
  }
  async function addPDFCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("pdfs").insert({
      title: a?.title,
      description: a?.description,
      type: "category",
    });

    if (!error) {
      getPDFCategories();
    }
  }
  async function addTutorial(a, b) {
    console.log(arguments);
    if (a == undefined || b == undefined) {
      return null;
    }

    const { error } = await supabase.from("tutorials").insert({
      title: a?.vtitle,
      description: a?.vdescription,
      video: a?.vvideo,
      type: "content",
      parent: b,
    });

    if (!error) {
      getTutorials();
    }
  }
  async function addPDFMaterial(a, b) {
    if (a == undefined || b == undefined) {
      return null;
    }

    const { error } = await supabase.from("pdfs").insert({
      title: a?.vtitle,
      description: a?.vdescription,
      url: a?.vvideo,
      type: "content",
      parent: b,
    });

    if (!error) {
      getPDFMaterial();
    }
  }
  async function updateTutorialCategory(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase
      .from("tutorials")
      .update({
        title: a?.utitle,
        description: a?.udescription,
      })
      .eq("id", b);

    if (!error) {
      getTutorialCategories();
    }
  }
  async function updatePDFCategory(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase
      .from("pdfs")
      .update({
        title: a?.utitle,
        description: a?.udescription,
      })
      .eq("id", b);

    if (!error) {
      getPDFCategories();
    }
  }
  async function updatePDFMaterial(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase
      .from("pdfs")
      .update({
        title: a?.utitle,
        description: a?.udescription,
        url: a?.vvideo,
      })
      .eq("id", b);

    if (!error) {
      getPDFMaterial();
    }
  }
  async function updateTutorials(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase
      .from("tutorials")
      .update({
        title: a?.vtitle,
        description: a?.vdescription,
        video: a?.vvideo,
      })
      .eq("id", b);

    if (!error) {
      getTutorials();
    }
  }
  async function DeleteTutorialCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("tutorials").delete().eq("id", a);

    if (!error) {
      getTutorialCategories();
    }
  }
  async function DeletePDFCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("pdfs").delete().eq("id", a);

    if (!error) {
      getPDFCategories();
    }
  }
  async function DeleteTutorials(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("tutorials").delete().eq("id", a);

    if (!error) {
      getTutorials();
    }
  }
  async function DeletePDFMaterial(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("pdfs").delete().eq("id", a);

    if (!error) {
      getPDFMaterial();
    }
  }

  useEffect(() => {
    getUserData();
  }, []);

  const [deleteData, setDeleteData] = useState({
    active: false,
  });
  async function getDiscussions() {
    const { data, error } = await supabase
      .from("discussion")
      .select("*")
      .is("replyto", null);
    if (data) {
      setDiscussions(data);
    } else {
    }
  }
  async function getReplies() {
    const { data, error } = await supabase
      .from("discussion")
      .select("*")
      .not("replyto", "is", null);
    if (data) {
      setReplies(data);
    } else {
    }
  }
  async function getMindMap() {
    const { data, error } = await supabase.from("mindmaps").select("*");
    if (data) {
      setMindMaps(data);
    } else {
    }
  }

  async function getMindMapCategories() {
    const { data, error } = await supabase.from("mcategory").select("*");
    if (data) {
      setMindMapCategories(data);
    } else {
    }
  }
  useEffect(() => {
    getUserInfo();
  }, []);

  const router = useRouter();

  async function getUserInfo() {
    const user = await supabase.auth.getUser();

    if (user && user.data.user != undefined) {
      setLoggedIn(true);
    } else {
      router.push("/login");
    }
  }
  useEffect(() => {
    handleItemClick(ctxSlug);
  }, [ctxSlug]);
  const handleItemClick = (action) => {
    // Perform the action based on the item's "action" property
    switch (action) {
      case "discussion":
        getDiscussions(), getReplies();
        break;
      case "dashboard":
        getHistory(userData?.email);
        break;
      case "profile":
        // Handle profile page navigation
        break;
      case "mindmap":
        getMindMap();
        getMindMapCategories();
        break;
      case "user":
        getCourses();
        getEmails();
        getEnrollments({}, true);
        break;

      case "prv":
        getVideos();
        getVideoCategories();
      case "lvr":
        getLVideos();
        getLVideoCategories();
        break;
      case "currentaffairs":
        getDNA();
        getImageQuizes();
        getPDFs();
        break;
      case "config":
        getMindMap();
        getMindMapCategories();
        getEnrollments({}, true);
        getVideoCategories();
        getVideos();
        getCourses();
        getCategories();
        getGameCategories();
        getLVideoCategories();
        break;
      case "tutorial":
        getTutorials();
        getTutorialCategories();
        break;
      case "pdfs":
        getPDFCategories();
        getPDFMaterial();
        break;
      case "webinars":
        getEnrollments({}, false);
        break;
      // Add more cases for other actions
      default:
        break;
    }
  };
  async function getDNA() {
    const { data, error } = await supabase
      .from("ca")
      .select("*")
      .eq("type", "dna")
      .order("created_at", { ascending: false });
    if (data) {
      setDNA(data);
    } else {
    }
  }
  async function getImageQuizes() {
    const { data, error } = await supabase
      .from("ca")
      .select("*")
      .eq("type", "iq")
      .order("created_at", { ascending: false });
    if (data) {
      setImageQuizes(data);
    } else {
    }
  }
  async function getPDFs() {
    const { data, error } = await supabase
      .from("ca")
      .select("*")
      .eq("type", "pdf")
      .order("created_at", { ascending: false });
    if (data) {
      setPDFs(data);
    } else {
    }
  }

  async function getVideoCategories() {
    const { data, error } = await supabase.from("vcategory").select("*");
    if (data) {
      setVCategory(data);
    }
  }
  async function getLVideoCategories() {
    const { data, error } = await supabase.from("lvcategory").select("*");
    if (data) {
      setLVCategory(data);
    }
  }
  async function getLVideos() {
    const { data, error } = await supabase.from("lvideos").select("*");
    if (data) {
      setLiveVideos(data);
    }
  }

  async function updateProfile(a) {
    const r = toast.loading("Updating Profile Picture");
    const { data, error } = await supabase.auth.updateUser({
      data: { profile_pic: a },
    });
    if (data) {
      getUserData();
      toast.success("Successfully Uploaded Profile Picture");
      toast.remove(r);
    } else {
      toast.error("Error Updating Profile Picture");
      toast.remove(r);
    }
  }
  async function getVideos() {
    const { data, error } = await supabase.from("videos").select("*");
    if (data) {
      setVideos(data);
    }
  }
  async function getCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("id", { ascending: true });
    if (data) {
      setCourses(data);
    }
  }
  async function addNewMindMapCat(a) {
    if (a == undefined) {
      return null;
    }
    setLoading(true);

    const { error } = await supabase.from("mcategory").insert({
      title: a,
      category: slug == "mindmap" ? 1 : 2,
    });

    if (!error) {
      setLoading(false);
      getMindMapCategories();
    } else {
      setLoading(false);
    }
  }

  async function addNewMindMap(a) {
    if (a == undefined) {
      return null;
    }
    setLoading(true);

    const { error } = await supabase.from("mindmaps").insert({
      title: a.title,
      content: a.content,
      url: a.url,
      parent: a.parent,
    });

    if (!error) {
      setLoading(false);
      getMindMap();
    } else {
      setLoading(false);
    }
  }

  async function deletMindMapbyId(a) {
    if (a == undefined) {
      return null;
    }
    const { error } = await supabase.from("mindmaps").delete().eq("id", a);
    if (!error) {
      getMindMap();
    } else {
    }
  }
  async function updateMCategory(a, b) {
    if (a == undefined) {
      return null;
    }
    const { error } = await supabase
      .from("mcategory")
      .update({
        title: a,
      })
      .eq("id", b);
    if (!error) {
      getMindMapCategories();
    } else {
    }
  }

  function countObjectsWithReplyTo(array, argA) {
    if (array == undefined) {
      return 0;
    }
    // Use the reduce function to count matching objects
    const totalCount = array.reduce((count, obj) => {
      if (obj.replyto === argA) {
        return count + 1;
      } else {
        return count;
      }
    }, 0);

    return totalCount;
  }
  async function deleteQuestionbyId(a) {
    setDeleteData({ active: false });
    const { error } = await supabase.from("discussion").delete().eq("id", a);

    if (!error) {
      getDiscussions();
      getReplies();
    }
  }

  async function addQuestiontoDB(a) {
    setLoading(true);
    const { data, error } = await supabase
      .from("discussion")
      .insert({
        user: userData.email,
        type: props?.type == "admin" ? "teacher" : "student",
        message: a.question,
      })
      .select();

    if (data) {
      setQuestionData({ active: false });
      getDiscussions();
      getReplies();
      setLoading(false);
    } else {
      setLoading(false);
    }
  }
  async function AddVideoCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("vcategory").insert({
      title: a.cattitle,
      description: a.catdesc,
    });

    if (!error) {
      getVideoCategories();
    }
  }
  async function AddLVideoCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("lvcategory").insert({
      title: a.cattitle,
      description: a.catdesc,
    });

    if (!error) {
      getLVideoCategories();
    }
  }
  async function AddVideo(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("videos").insert({
      title: a?.title,
      url: a?.url,
      type: a?.type,
      category: b,
      by: userData?.email || "nitin4glory20@gmail.com",
    });

    if (!error) {
      getVideos();
    }
  }
  async function AddLVideo(a, b) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("lvideos").insert({
      title: a?.title,
      url: a?.url,
      type: a?.type,
      category: b,
      by: userData?.email || "nitin4glory20@gmail.com",
    });

    if (!error) {
      getLVideos();
    }
  }
  async function DeleteVideo(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("videos").delete().eq("id", a);

    if (!error) {
      getVideos();
    }
  }
  async function DeleteLVideo(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("lvideos").delete().eq("id", a);

    if (!error) {
      getLVideos();
    }
  }
  async function DeleteVideoCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("vcategory").delete().eq("id", a);

    if (!error) {
      getVideoCategories();
    }
  }
  async function DeleteLVideoCategory(a) {
    if (a == undefined) {
      return null;
    }

    const { error } = await supabase.from("lvcategory").delete().eq("id", a);

    if (!error) {
      getLVideoCategories();
    }
  }
  function filterArrayByReplyTo(arr, value) {
    if (arr == undefined) {
      return [];
    }

    return arr.filter((obj) => obj.replyto === value);
  }

  async function getGameCategories() {
    const { data, error } = await supabase.from("m_categories").select("*");

    if (data) {
      setGameCategories(data);
    }
  }
  async function getCategories() {
    const { data, error } = await supabase.from("categories").select("*");

    if (data) {
      setCategories(data);
    }
  }

  async function getLevels(a) {
    const { data, error } = await supabase
      .from("levels")
      .select("*")
      .eq("parent", a)
      .order("created_at", { ascending: true });

    if (data) {
      setLevelData(data);
    } else {
      setLevelData();
    }
  }

  async function getHistory(a) {
    if (a == undefined) {
      return null;
    }
    const { data, error } = await supabase
      .from("plays")
      .select("score,game(title,parent(title))")
      .eq("user", a)
      .limit(10);

    if (data != undefined) {
      setHistory(data);
    } else {
    }
  }

  async function getPanel() {
    const { data, error } = await supabase
      .from("panels")
      .select("*")
      .eq("slug", "dashboard-panel");

    if (data != undefined) {
      setPanel(data[0]);
    } else {
    }
  }

  function getTextFromKey(data, keyToMatch, arrayToSearch, propertyToRetrieve) {
    const matchedObject = arrayToSearch.find(
      (item) => item[keyToMatch] === data
    );

    if (matchedObject) {
      return matchedObject[propertyToRetrieve];
    }

    return null; // Return null if no matching object is found
  }

  useEffect(() => {
    if (
      activeLevel >= 0 &&
      levelData != undefined &&
      activeLevel < levelData?.length
    ) {
      setActiveLevelData(levelData[activeLevel]);
    } else {
      setActiveLevelData();
    }
  }, [activeLevel, gamestate, levelData]);

  useEffect(() => {
    setActiveMap(
      mindmaps != undefined && mindmaps.filter((res) => res.id == activeMind)[0]
    );
  }, [activeMind]);
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

  function toggleCategory(isAdd, value) {
    console.log(isAdd);
    if (isAdd) {
      // Check if the value is not already in the array to avoid duplicates
      if (!courseData?.category?.includes(value)) {
        setCourseData({
          ...courseData,
          category: [...(courseData?.category || ""), value],
        });
      }
    } else {
      // Remove the value from the array
      setCourseData({
        ...courseData,
        category: courseData?.category?.filter((item) => item !== value),
      });
    }
  }
  function toggleVCategory(isAdd, value) {
    console.log(isAdd);
    if (isAdd) {
      // Check if the value is not already in the array to avoid duplicates
      if (!courseData?.videos?.includes(value)) {
        setCourseData({
          ...courseData,
          videos: [...(courseData?.videos || ""), value],
        });
      }
    } else {
      // Remove the value from the array
      setCourseData({
        ...courseData,
        videos: courseData?.videos?.filter((item) => item !== value),
      });
    }
  }

  function toggleLVCategory(isAdd, value) {
    console.log(isAdd);
    if (isAdd) {
      // Check if the value is not already in the array to avoid duplicates
      if (!courseData?.lvideos?.includes(value)) {
        setCourseData({
          ...courseData,
          lvideos: [...(courseData?.lvideos || ""), value],
        });
      }
    } else {
      // Remove the value from the array
      setCourseData({
        ...courseData,
        lvideos: courseData?.lvideos?.filter((item) => item !== value),
      });
    }
  }

  function toggleGameCategory(isAdd, value) {
    if (isAdd) {
      // Check if the value is not already in the array to avoid duplicates
      if (!courseData?.quizes?.includes(value)) {
        setCourseData({
          ...courseData,
          quizes: [...(courseData?.quizes || ""), value],
        });
      }
    } else {
      // Remove the value from the array
      setCourseData({
        ...courseData,
        quizes: courseData?.quizes?.filter((item) => item !== value),
      });
    }
  }

  async function UpdateMapTitle(a, b) {
    if (a == undefined) {
      return null;
    }
    const { error } = await supabase
      .from("mindmaps")
      .update({
        title: a,
      })
      .eq("id", b);

    if (!error) {
      getMindMap();
    }
  }
  async function UpdateMapURL(a, b) {
    if (a == undefined) {
      return null;
    }
    const { error } = await supabase
      .from("mindmaps")
      .update({
        url: a,
      })
      .eq("id", b);

    if (!error) {
      getMindMap();
    }
  }

  useEffect(() => {
    if (activeCourse != undefined) {
      setCourseData({
        mindmaps: courses[activeCourse].mindmaps || [],
        quizes: courses[activeCourse].quizes || [],
        vocab: courses[activeCourse].vocab || [],
        category: courses[activeCourse].category || [],
        mcategory: courses[activeCourse].mcategory || [],
        videos: courses[activeCourse].videos || [],
        lvideos: courses[activeCourse].lvideos || [],
      });
    }
  }, [activeCourse]);

  async function updateCourse(a, b) {
    const { error } = await supabase
      .from("courses")
      .update({
        mcategory: a.mcategory,
        mindmaps: a.mindmaps,
        quizes: a.quizes,
        category: a.category,
        videos: a.videos,
        lvideos: a?.lvideos,
      })
      .eq("id", b);

    if (!error) {
      toast.success("Updated Course");
      getCourses();
    }
  }

  async function getCentres() {
    const { data, error } = await supabase.from("centres").select("*");
    if (data) {
      setCentres(data);
    } else {
    }
  }
  function checkRequiredInfo() {
    if (userData != undefined) {
      if (
        userData?.user_metadata?.whatsapp &&
        userData?.user_metadata?.centre
      ) {
        setRequiredInfo(true);

        return null;
      } else {
        setRequiredInfo(false);
        getCentres();
        return null;
      }
    }
  }

  useEffect(() => {
    checkRequiredInfo();
  }, [userData]);

  const appendToMindArray = (id) => {
    // Create a new array with the appended value
    const currentMindmaps = courseData.mindmaps || []; // Get the current mindmaps or initialize an empty array
    const newMindmaps = [...currentMindmaps, id];

    // Update the state with the new array
    setCourseData({ ...courseData, mindmaps: newMindmaps }); // Preserve the existing courseData properties
  };
  useEffect(() => {}, [activeLevelData]);

  async function updateRequired(a) {
    if (a == undefined) {
      toast.error("Please fill the details");
      return null;
    }

    if (
      a?.whatsapp == undefined ||
      parseInt(a?.whatsapp)?.toString().length < 10
    ) {
      toast.error("Please fill WhatsApp Number");
      return null;
    }
    if (a?.centre == undefined) {
      toast.error("Please select centre");
      return null;
    }
    const { data, error } = await supabase.auth.updateUser({
      data: { whatsapp: a?.whatsapp, centre: a.centre },
    });

    if (data) {
      toast.success("Updated Details");
      setRequiredInfo(true);
    }
    if (error) {
      toast.error("Failed to Update Details , please contact admin");
    }
  }
  function convertToWebP(url) {
    if (url == undefined) {
      return null;
    }

    // Insert transformation options into the URL
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload") + 1;
    const transformation = "c_fill,w_256,h_256,f_webp";

    // Insert the transformation
    parts.splice(uploadIndex, 0, transformation);

    // Reconstruct the URL
    const transformedUrl = parts.join("/");
    return transformedUrl;
  }
  async function redeemCourse(a) {
    if (a == undefined || userData?.email == undefined) {
      toast.error("Code Undefined");
      return null;
    }

    const { error } = await supabase.rpc("activate_course", {
      cc: a,
      email: "",
    });

    if (!error) {
      toast.success("Activated");
      setRedeemActive(false);
      getEnrollments(userData?.email, false);
      getCentres();
    }
    if (error) {
      toast.error(error.message);
    }
  }

  const icon = {
    whatsapp: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="2619 506 120 120"
        width={24}
        height={24}
      >
        <defs>
          <style>{".cls-1{fill:#27d045}.cls-3{fill:#fff}"}</style>
        </defs>
        <g data-name="Group 36" id="Group_36" transform="translate(2300 73)">
          <circle
            className="cls-1"
            cx={60}
            cy={60}
            data-name="Ellipse 18"
            id="Ellipse_18"
            r={60}
            transform="translate(319 433)"
          />
          <g data-name="Group 35" id="Group_35" transform="translate(254 386)">
            <g data-name="Group 34" id="Group_34">
              <g
                data-name="Ellipse 19"
                id="Ellipse_19"
                transform="translate(94 75)"
                stroke="#fff"
                strokeWidth="5px"
                fill="none"
              >
                <circle cx={31.5} cy={31.5} r={31.5} stroke="none" />
                <circle cx={31.5} cy={31.5} r={29} />
              </g>
              <path
                className="cls-3"
                d="M1424 191l-4.6 16.3 16.9-4.7.9-5.2-11 3.5 2.9-10.5z"
                data-name="Path 126"
                id="Path_126"
                transform="translate(-1325 -68)"
              />
              <path
                className="cls-1"
                d="M1266 90c0-.1 3.5-11.7 3.5-11.7l8.4 7.9z"
                data-name="Path 127"
                id="Path_127"
                transform="translate(-1165 43)"
              />
            </g>
            <path
              className="cls-3"
              d="M1439.3 160.6a9.4 9.4 0 00-3.9 6.1c-.5 3.9 1.9 7.9 1.9 7.9a50.876 50.876 0 008.6 9.8 30.181 30.181 0 009.6 5.1 11.378 11.378 0 006.4.6 9.167 9.167 0 004.8-3.2 9.851 9.851 0 00.6-2.2 5.868 5.868 0 000-2c-.1-.7-7.3-4-8-3.8s-1.3 1.5-2.1 2.6-1.1 1.6-1.9 1.6-4.3-1.4-7.6-4.4a15.875 15.875 0 01-4.3-6s.6-.7 1.4-1.8a5.664 5.664 0 001.3-2.4c0-.5-2.8-7.6-3.5-7.9a11.852 11.852 0 00-3.3 0z"
              data-name="Path 128"
              id="Path_128"
              transform="translate(-1326.332 -68.467)"
            />
          </g>
        </g>
      </svg>
    ),
  };

  if (userData == undefined || coursesLoading == true) {
    return (
      <div className="w-full h-full min-h-[100vh] bg-white overflow-hidden flex flex-col justify-center items-center align-middle">
        <Loader></Loader>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>IPM Careers Panel</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/*  <Toaster className="sf" position="bottom-right" toastOptions={{
    duration: 2000,
}}></Toaster> */}
      <Modal
        size="3xl"
        scrollBehavior="outside"
        className="flex mdl overflow-hidden flex-col gap-1 text-center items-center"
        onClose={() => {
          setActiveReply();
        }}
        placement="bottom-center"
        isOpen={activeReply != undefined ? true : false}
      >
        <ModalContent className="sf">
          {(onClose) => (
            <>
              <ModalHeader className="text-left w-full flex flex-col">
                {activeReply.message}
                <p className="font-medium text-sm text-gray-500">
                  Posted by :{" "}
                  {activeReply.user != userData.email
                    ? activeReply.user
                    : "You"}
                </p>
              </ModalHeader>
              <ModalBody className="h-full overflow-y-auto w-full">
                <h2 className="text-left">
                  All Replies (
                  {countObjectsWithReplyTo(replies, activeReply.id)})
                </h2>
                {replies &&
                  filterArrayByReplyTo(replies, activeReply.id).map((i, d) => {
                    return (
                      <div className=" w-full text-left border-1 border-gray-200 rounded-xl py-2 px-4 ">
                        {i.type == "teacher" ? (
                          <p className="flex flex-row border-1 border-black rounded-full align-middle justify-start items-center w-fit px-2 py-1 text-xs ">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9.90878 3.69964C11.1832 2.88267 12.8168 2.88267 14.0912 3.69964L22.1548 8.86861C22.3689 9.0059 22.4989 9.24238 22.5 9.49677C22.5011 9.75116 22.3732 9.98876 22.1602 10.1279L19 12.1926V17.75C19 17.9122 18.9474 18.0701 18.85 18.2L18.8489 18.2014L18.8477 18.2031L18.8446 18.2071L18.8364 18.2178C18.8321 18.2233 18.8269 18.2298 18.8209 18.2373C18.8179 18.2411 18.8146 18.2452 18.8111 18.2495C18.7904 18.2751 18.7619 18.3095 18.7253 18.3513C18.6522 18.4348 18.5469 18.5483 18.4081 18.6816C18.1305 18.9481 17.7176 19.2948 17.1587 19.6387C16.0359 20.3297 14.3387 21 12 21C9.66127 21 7.96408 20.3297 6.8413 19.6387C6.2824 19.2948 5.86951 18.9481 5.59193 18.6816C5.45308 18.5483 5.34778 18.4348 5.27468 18.3513C5.23204 18.3025 5.1901 18.2531 5.15107 18.2014C5.14956 18.1994 5.15 18.2 5.15 18.2C5.05263 18.0701 5 17.9122 5 17.75V12.1926L3 10.8859V16.25C3 16.6642 2.66421 17 2.25 17C1.83579 17 1.5 16.6642 1.5 16.25V9.49997C1.5 9.22949 1.64318 8.99246 1.85788 8.86052L9.90878 3.69964ZM14.1194 15.3812C12.8317 16.2225 11.1683 16.2225 9.88058 15.3812L6.5 13.1725V17.4687C6.5368 17.5072 6.58034 17.5512 6.63073 17.5996C6.84143 17.8018 7.17072 18.0802 7.62745 18.3612C8.53592 18.9203 9.96373 19.5 12 19.5C14.0363 19.5 15.4641 18.9203 16.3726 18.3612C16.8293 18.0802 17.1586 17.8018 17.3693 17.5996C17.4197 17.5512 17.4632 17.5072 17.5 17.4687V13.1725L14.1194 15.3812ZM13.2817 4.96246C12.5006 4.46173 11.4994 4.46173 10.7183 4.96246L3.63041 9.506L10.701 14.1254C11.4902 14.6411 12.5098 14.6411 13.299 14.1254L20.3696 9.506L13.2817 4.96246Z"
                                fill="currentColor"
                              />
                            </svg>
                            Teacher
                          </p>
                        ) : (
                          ""
                        )}
                        <div
                          dangerouslySetInnerHTML={{ __html: i.message }}
                          className={`${
                            activeExcerpt == d ? "" : "max-h-10"
                          } overflow-hidden`}
                        ></div>{" "}
                        <a
                          onClick={() => {
                            setActiveExcerpt(d != activeExcerpt ? d : null);
                          }}
                          className={"text-primary cursor-pointer"}
                        >
                          {d == activeExcerpt ? "Read Less..." : "Read More..."}
                        </a>
                        <p className="text-xs text-gray-500">{i.user}</p>{" "}
                        {i.user == userData.email ? (
                          <p
                            className={
                              "text-red-500 cursor-pointer text-xs border-1 border-red-500 inline-block p-1 rounded-lg my-1 hover:bg-red-500 hover:text-white"
                            }
                            onClick={() => {
                              deleteQuestionbyId(i.id);
                            }}
                          >
                            Delete
                          </p>
                        ) : (
                          ""
                        )}
                      </div>
                    );
                  })}
              </ModalBody>
              <div className="border-b-1 border-grey w-full"></div>
              <ModalFooter className="w-full flex-col align-top justify-start flex-wrap relative flex">
                <p className="w-full text-left font-medium">
                  Write a Reply {props?.type == "admin" ? "as a Teacher" : ""}
                </p>
                <CustomEditor
                  data={
                    replyData?.message ||
                    "<strong>Write your Comment Here...</strong>"
                  }
                  onChange={(e) => {
                    setReplyData((res) => ({ ...res, message: e }));
                  }}
                ></CustomEditor>
                <Button
                  className=" inline text-left hover:shadow-lg mr-auto w-auto"
                  color="primary"
                  onPress={() => {
                    addReply(replyData.message, activeReply.id, "student");
                  }}
                >
                  Add Your Reply
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        size="3xl"
        className="flex mdl flex-col gap-1 text-center items-center"
        onClose={() => {
          setQuestionData({ active: false });
        }}
        placement="bottom-center"
        isOpen={questionData.active}
      >
        <ModalContent className="sf">
          {(onClose) => (
            <>
              <ModalBody className="w-full mt-5">
                <Input
                  className="w-full"
                  type="email"
                  label="Question"
                  placeholder="Enter your Question"
                  onChange={(e) => {
                    setQuestionData((res) => ({
                      ...res,
                      question: e.target.value,
                    }));
                  }}
                ></Input>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  className="text-black"
                  onPress={() => {
                    addQuestiontoDB(questionData);
                  }}
                >
                  Add Question{" "}
                  {loading ? (
                    <Spinner
                      className="transition-all"
                      size="sm"
                      color="white"
                    ></Spinner>
                  ) : (
                    ""
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Code Redempter */}
      <Modal
        size="3xl"
        className="flex mdl flex-col gap-1 text-center items-center"
        onClose={() => {
          setRedeemActive(false);
        }}
        placement="center"
        isOpen={redeemActive}
      >
        <ModalContent className="font-sans">
          {(onClose) => (
            <>
              <ModalBody className="w-full mt-5">
                <Input
                  className="w-full"
                  type="email"
                  label="Redeem Course"
                  placeholder="Enter your Course Redeem Code"
                  onChange={(e) => {
                    setRedeemCode(e.target.value);
                  }}
                ></Input>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  className="text-white"
                  onPress={() => {
                    redeemCourse(redeemCode);
                  }}
                >
                  Redeem{" "}
                  {loading ? (
                    <Spinner
                      className="transition-all"
                      size="sm"
                      color="white"
                    ></Spinner>
                  ) : (
                    ""
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Courses List */}
      <Modal
        size="3xl"
        className="flex mdl flex-col gap-1 text-center items-center"
        onClose={() => {
          setCoursesModal(false);
        }}
        placement="center"
        isOpen={coursesModal}
      >
        <ModalContent className="font-sans">
          {(onClose) => (
            <>
              <ModalBody className="w-full mt-5">
                <div className="w-full flex flex-col justify-start items-start">
                  <h2 className="text-2xl font-medium text-primary">
                    Your Courses
                  </h2>
                  <div className="w-full flex flex-row bg-green-50 border-green-200 border-1 my-4 rounded-xl">
                    <h2 className="text-sm font-bold flex-1 text-center p-1">
                      Added On
                    </h2>
                    <h2 className="text-sm font-bold flex-1 text-center p-1">
                      Course Name
                    </h2>
                    <h2 className="text-sm font-bold flex-1 text-center p-1">
                      Payment Method
                    </h2>
                    <h2 className="text-sm font-bold flex-1 text-center p-1">
                      Added by
                    </h2>
                  </div>
                  {coursesEnrolled &&
                    coursesEnrolled.map((i, d) => {
                      return (
                        <div className="w-full flex flex-row">
                          <p className="flex-1 text-xs">
                            {CtoLocal(i.created_at).dayName}{" "}
                            {CtoLocal(i.created_at).date},{" "}
                            {CtoLocal(i.created_at).monthName} ,{" "}
                            {CtoLocal(i.created_at).year}
                          </p>
                          <p className="flex-1 text-xs">{i.course.title}</p>
                          <p className="flex-1 text-xs">
                            {payments.filter(
                              (item) => item.value == i.paidby
                            )[0].title || "undefined"}
                          </p>
                          <p className="flex-1 text-xs">
                            {i.addedby == "admin@ipmcareer.in"
                              ? "Automatic"
                              : i.addedby}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </ModalBody>
              <ModalFooter></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        key={videoURL}
        size="3xl"
        className="flex mdl flex-col gap-1 text-center items-center"
        onClose={() => {
          setFullScreenVideo(false);
        }}
        placement="center"
        isOpen={fullScreenVideo}
      >
        <ModalContent className="sf">
          {(onClose) => (
            <>
              <ModalBody className="w-full mt-5 p-8">
                <iframe
                  className="rounded-lg overflow-hidden aspect-video w-full"
                  width="100%"
                  height="100%"
                  src={videoURL}
                  frameborder="0"
                  allowfullscreen="true"
                ></iframe>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        className="flex flex-col gap-1 text-center items-center"
        onClose={() => {
          setDeleteData({ active: false });
        }}
        placement="center"
        isOpen={deleteData.active}
      >
        <ModalContent className="sf">
          {(onClose) => (
            <>
              <ModalBody>
                <p className="font-bold sf mt-6">{deleteData.message}</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  onPress={() => {
                    setDeleteData({ active: false });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  className="text-white"
                  onPress={() => {
                    deleteQuestionbyId(deleteData.id);
                  }}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {isLoggedIn == true ? (
        <DefaultLayout currentSlug={slug} type={props.type || type || "user"}>
          <div className="w-full h-full p-2 pt-3  md:pb-2 lg:pb-2">
            <Modal
              className="flex flex-col gap-1 text-center items-center"
              onClose={() => {
                setProfileModal(false);
              }}
              placement="center"
              isOpen={profileModal}
            >
              <ModalContent className="sf">
                {(onClose) => (
                  <>
                    <ModalHeader>
                      <h2 className="text-2xl text-left text-primary">
                        Profile Details
                      </h2>
                    </ModalHeader>
                    <ModalBody className="text-left w-full font-light ">
                      <div className="flex flex-row items-center justify-between">
                        <Popover>
                          <PopoverTrigger>
                            <div className="w-auto h-auto relative overflow-hidden rounded-full group">
                              {userData?.user_metadata?.profile_pic ? (
                                ""
                              ) : (
                                <div className=" w-3 h-3  rounded-full p-0 absolute right-1/2 top-1/2 z-10">
                                  <div
                                    className="w-full -z-[1]  animate-ping rounded-full h-full bg-red-500"
                                    width={14}
                                  />
                                  <div
                                    className="w-full -z-[1]   rounded-full h-full bg-red-500 absolute left-0 top-0"
                                    width={14}
                                  />
                                </div>
                              )}
                              <div className="absolute z-[1] text-xs text-center translate-y-full group-hover:opacity-100 transition-all cursor-pointer group-hover:translate-y-0 left-0 bottom-0 w-full h-auto p-2 text-white bg-primary px-4">
                                Edit Profile Picture{" "}
                              </div>
                              <Avatar
                                src={userData?.user_metadata?.profile_pic}
                                className="w-28 h-28"
                              ></Avatar>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent>
                            <div className="w-full h-auto min-w-[300px]">
                              <ImageUploader
                                data={{ image: profileDetails?.profile_pic }}
                                onUploadComplete={(e) => {
                                  setProfileDetails((res) => ({
                                    ...res,
                                    profile_pic: e,
                                  }));
                                }}
                              ></ImageUploader>
                              <Button
                                size="sm"
                                color="primary"
                                onPress={() => {
                                  updateProfile(profileDetails?.profile_pic);
                                }}
                              >
                                Update
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Spacer x={4}></Spacer>
                        <div className="flex-1 text-left">
                          <h2>Name : {userData?.user_metadata?.full_name}</h2>
                          <p>Email : {userData.email}</p>

                          <p>City : {userData.user_metadata?.city}</p>
                          <p>Centre : {userData?.user_metadata?.centre}</p>
                        </div>
                      </div>
                      <Spacer y={5}></Spacer>
                    </ModalBody>{" "}
                  </>
                )}
              </ModalContent>
            </Modal>
            <Dropdown
              backdrop="blur"
              className={styles.dropdown}
              placement="bottom-end"
            >
              <DropdownTrigger>
                <div
                  className={
                    "fixed top-4 right-4 border-2 border-primary rounded-full lg:flex hidden group"
                  }
                >
                  <div className=" absolute left-0 top-0 w-full h-full bg-primary rounded-full scale-100 group-hover:scale-150 opacity-0 group-hover:opacity-25 transition-all"></div>
                  {props?.type == "admin" ? (
                    <div className="absolute right-0 bottom-0 w-4 h-4 z-10 bg-white rounded-full p-1">
                      <img
                        className="w-full h-full"
                        src="/crown.png"
                        width={14}
                      />
                    </div>
                  ) : (
                    ""
                  )}
                  {userData?.user_metadata?.profile_pic ? (
                    ""
                  ) : (
                    <div className="absolute top-0 left-0 w-3 h-3 z-10  rounded-full p-0">
                      <div
                        className="w-full -z-[1]  animate-ping rounded-full h-full bg-red-500"
                        width={14}
                      />
                      <div
                        className="w-full -z-[1]   rounded-full h-full bg-red-500 absolute left-0 top-0"
                        width={14}
                      />
                    </div>
                  )}
                  <Avatar
                    size="xl"
                    className="w-12 h-12"
                    src={
                      convertToWebP(userData?.user_metadata?.profile_pic) ??
                      "/defprofile.svg"
                    }
                  ></Avatar>
                </div>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownSection>
                  <DropdownItem showDivider={true} isReadOnly>
                    <h2 style={{ fontWeight: "500" }}>
                      {" "}
                      {userData?.user_metadata?.full_name}
                    </h2>
                    <p style={{ color: "#666" }}> {userData.email}</p>
                    <div className="flex flex-row justify-center items-center align-middle shadow-sm shadow-purple-400 border-1 rounded-full from-primary to-purple-400 bg-gradient-to-r text-sm my-2 p-1 text-center bg-primary text-white">
                      <p className="capitalize">
                        My Centre : {userData?.user_metadata?.centre}
                      </p>
                    </div>
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection>
                  <DropdownItem
                    startContent={
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M17.754 14a2.249 2.249 0 0 1 2.25 2.249v.918a2.75 2.75 0 0 1-.513 1.599C17.945 20.929 15.42 22 12 22c-3.422 0-5.945-1.072-7.487-3.237a2.75 2.75 0 0 1-.51-1.595v-.92a2.249 2.249 0 0 1 2.249-2.25h11.501ZM12 2.004a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
                          fill="#222F3D"
                        />
                      </svg>
                    }
                    onPress={() => {
                      setProfileModal(true);
                    }}
                  >
                    <div className="flex flex-row items-center justify-start relative">
                      <p>My Profile </p>
                      {userData?.user_metadata?.profile_pic ? (
                        ""
                      ) : (
                        <div className=" w-3 h-3 z-10 relative ml-4  rounded-full p-0">
                          <div
                            className="w-full -z-[1]  animate-ping rounded-full h-full bg-red-500"
                            width={14}
                          />
                          <div
                            className="w-full -z-[1]   rounded-full h-full bg-red-500 absolute left-0 top-0"
                            width={14}
                          />
                        </div>
                      )}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    startContent={
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M11 10a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0Z"
                          fill="#222F3D"
                        />
                        <path
                          d="M4 4.5A2.5 2.5 0 0 1 6.5 2H18a2.5 2.5 0 0 1 2.5 2.5v14.25a.75.75 0 0 1-.75.75H5.5a1 1 0 0 0 1 1h13.25a.75.75 0 0 1 0 1.5H6.5A2.5 2.5 0 0 1 4 19.5v-15Zm9 1.25a.75.75 0 0 0-1.5 0v1.604a2.751 2.751 0 0 0-1.152 4.632l-1.294 3.236a.75.75 0 0 0 1.392.556l1.235-3.087a2.76 2.76 0 0 0 1.138 0l1.235 3.087a.75.75 0 0 0 1.392-.556l-1.294-3.236A2.751 2.751 0 0 0 13 7.354V5.75Z"
                          fill="#222F3D"
                        />
                      </svg>
                    }
                    onPress={() => {
                      setCoursesModal(true);
                    }}
                  >
                    My Courses
                  </DropdownItem>

                  <DropdownItem
                    startContent={
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15.59 2.53a2.25 2.25 0 0 0-3.181 0L2.53 12.41a2.25 2.25 0 0 0 0 3.182l1.172 1.171c.51.511 1.227.42 1.66.162a1.25 1.25 0 0 1 1.713 1.713c-.257.433-.349 1.15.162 1.66L8.41 21.47a2.25 2.25 0 0 0 3.182 0l9.878-9.878a2.25 2.25 0 0 0 0-3.182l-1.171-1.172c-.51-.51-1.228-.42-1.661-.162a1.25 1.25 0 0 1-1.713-1.713c.258-.433.349-1.15-.162-1.66L15.591 2.53Z"
                          className="fill-primary"
                        />
                      </svg>
                    }
                    onPress={() => {
                      setRedeemActive(true);
                    }}
                  >
                    <p className="text-primary">Redeem a Coupon Code</p>
                  </DropdownItem>
                  <DropdownItem
                    startContent={
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8.205 4.844a1 1 0 0 1 .844 1.813A6.997 6.997 0 0 0 12 20a6.998 6.998 0 0 0 2.965-13.336 1 1 0 0 1 .848-1.812A8.996 8.996 0 0 1 21 13.003C21 17.973 16.97 22 12 22s-9-4.028-9-8.996a8.996 8.996 0 0 1 5.205-8.16ZM12 2a1 1 0 0 1 .993.883L13 3v7a1 1 0 0 1-1.993.118L11 10V3a1 1 0 0 1 1-1Z"
                          fill="#C0382B"
                        />
                      </svg>
                    }
                    onPress={() => {
                      logoutUser(router);
                    }}
                  >
                    <p style={{ color: "#f00" }}>Logout</p>
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>

            <div className=" sf h-full w-full bg-white rounded-xl relative p-2 md:p-5 ">
              {slug == "mindmap" || slug == "mindmap2" ? (
                <div className="h-full w-full overflow-y-auto overflow-x-hidden flex flex-col-reverse md:flex-row">
                  {props.type == "admin" ? (
                    <Dropdown className="sf">
                      <DropdownTrigger>
                        <div className="flex absolute right-4 bottom-5 flex-col align-middle justify-center items-center">
                          <div className="rounded-full transform-gpu bg-primary p-3 hover:bg-gray-100 transition-all cursor-pointer">
                            <svg
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
                          </div>
                          <p className="text-xs text-gray-500">
                            Add New MindMap
                          </p>
                        </div>
                      </DropdownTrigger>

                      <DropdownMenu>
                        <DropdownItem isReadOnly>
                          <Input
                            label="Mindmap Title"
                            placeholder="Enter MindMap Title"
                            onChange={(e) => {
                              setMindMapData((res) => ({
                                ...res,
                                title: e.target.value,
                                slug: e.target.value.replace(" ", "-"),
                              }));
                            }}
                          ></Input>
                        </DropdownItem>
                        <DropdownItem isReadOnly>
                          <Input
                            label="MindMap URL"
                            placeholder="MindMap URL"
                            onChange={(e) => {
                              setMindMapData((res) => ({
                                ...res,
                                url: e.target.value,
                              }));
                            }}
                          ></Input>
                        </DropdownItem>

                        <DropdownItem isReadOnly>
                          <Switch
                            className="my-2 text-xs"
                            onValueChange={(e) => {
                              setMindMapData((res) => ({ ...res, type: e }));
                            }}
                          >
                            Content Type (Text/HTML)
                          </Switch>
                          {mindMapData?.type == true ? (
                            <CustomEditor
                              data={mindMapData?.content?.text || "Write Here"}
                              value={mindMapData?.content?.text || "Write Here"}
                              onChange={(e) => {
                                setMindMapData((res) => ({
                                  ...res,
                                  content: { text: e, type: "html" },
                                }));
                              }}
                            ></CustomEditor>
                          ) : (
                            <Input
                              label="Content"
                              placeholder="Enter Content"
                              onChange={(e) => {
                                setMindMapData((res) => ({
                                  ...res,
                                  content: {
                                    text: e.target.value,
                                    type: "text",
                                  },
                                }));
                              }}
                            ></Input>
                          )}
                        </DropdownItem>
                        <DropdownItem isReadOnly>
                          <Dropdown>
                            <DropdownTrigger>
                              <div className="p-2 bg-gray-100 rounded-md">
                                <p className="text-xs text-gray-500">
                                  Select Category
                                </p>
                                {getTextFromKey(
                                  mindMapData?.parent,
                                  "id",
                                  mindMapCategories,
                                  "title"
                                ) || "Click to Select Category"}
                              </div>
                            </DropdownTrigger>

                            <DropdownMenu className="sf">
                              {mindMapCategories &&
                                mindMapCategories
                                  ?.filter(
                                    (res) =>
                                      (res.category === 1 &&
                                        slug === "mindmap") ||
                                      (res.category === 2 &&
                                        slug === "mindmap2")
                                  )
                                  .map((i, d) => {
                                    return (
                                      <DropdownItem
                                        onPress={() => {
                                          setMindMapData((res) => ({
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
                                  value={mindMapData?.cattitle || ""}
                                  placeholder="Enter Title"
                                  onChange={(e) => {
                                    setMindMapData((res) => ({
                                      ...res,
                                      cattitle: e.target.value,
                                    }));
                                  }}
                                ></Input>
                                <Spacer y={2}></Spacer>
                                <Button
                                  onClick={() => {
                                    addNewMindMapCat(mindMapData.cattitle);
                                  }}
                                  color="primary"
                                >
                                  Add Mindmap Category{" "}
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
                              addNewMindMap(mindMapData);
                            }}
                            color="primary"
                          >
                            Add Mind Map{" "}
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

                  {toggleMaps == true ? (
                    <div className="w-full md:mt-0 mt-5 md:w-[400px] h-full rounded-lg overflow-y-auto">
                      {mindMapCategories && mindMapCategories?.length > 0 ? (
                        <h2 className="w-full text-left">
                          All Categories (
                          {
                            mindMapCategories?.filter(
                              (res) =>
                                (res.category === 1 && slug === "mindmap") ||
                                (res.category === 2 && slug === "mindmap2")
                            ).length
                          }
                          )
                        </h2>
                      ) : (
                        <p>No Category of MindMaps Found</p>
                      )}
                      {mindMapCategories != undefined &&
                        mindMapCategories
                          .filter(
                            (res) =>
                              (res.category === 1 && slug === "mindmap") ||
                              (res.category === 2 && slug === "mindmap2")
                          )
                          .map((i, d) => {
                            return (
                              <>
                                <div className="flex flex-row justify-between items-center align-middle p-2 relative border-b-1 border-gray-200 mr-5 my-2 px-3 sf font-bold">
                                  {i.title}

                                  {props?.type == "admin" ? (
                                    <div className="flex flex-row">
                                      <Popover
                                        onOpenChange={(e) => {
                                          e == true
                                            ? setUpdateMapData((res) => ({
                                                ...res,
                                                cattitle: i.title,
                                              }))
                                            : "";
                                        }}
                                      >
                                        <PopoverTrigger>
                                          <div className="bg-secondary font-medium rounded-lg px-2 hover:brightness-75 text-xs text-primary mr-2">
                                            Update Title
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="sf text-left flex flex-col justify-start align-middle items-start">
                                          <Input
                                            value={updateMapData?.cattitle}
                                            onChange={(e) => {
                                              setUpdateMapData((res) => ({
                                                ...res,
                                                cattitle: e.target.value,
                                              }));
                                            }}
                                            title="Enter Title"
                                          ></Input>
                                          <Button
                                            className="my-2"
                                            color="primary"
                                            onPress={() => {
                                              updateMCategory(
                                                updateMapData?.cattitle,
                                                i.id
                                              );
                                            }}
                                          >
                                            Update Title
                                          </Button>
                                        </PopoverContent>
                                      </Popover>
                                      <div className=" bg-primary rounded-lg px-2 hover:brightness-75 text-xs">
                                        Set Allowed
                                      </div>
                                    </div>
                                  ) : (
                                    ""
                                  )}
                                </div>
                                <div className="w-full relative flex flex-col pr-5 pl-2">
                                  {mindmaps &&
                                    mindmaps
                                      .filter((res) => res.parent === i.id)
                                      .map((z, v) => (
                                        <div
                                          className={
                                            "w-full flex flex-row justify-between align-middle items-center cursor-pointer text-left px-5 rounded-lg my-1 py-2 bg-gray-100" +
                                            " " +
                                            (activeMind == z.id
                                              ? "bg-primary"
                                              : "")
                                          }
                                          onClick={() => {
                                            setActiveMind(z.id),
                                              props?.type != "admin"
                                                ? setToggleMaps(false)
                                                : "";
                                          }}
                                          key={v}
                                        >
                                          {z.title}
                                          {props?.type == "admin" ? (
                                            <div className="flex flex-row gap-1">
                                              <Popover
                                                onOpenChange={(e) => {
                                                  e == true
                                                    ? setUpdateMapData(
                                                        (res) => ({
                                                          ...res,
                                                          title: z.title,
                                                        })
                                                      )
                                                    : "";
                                                }}
                                                className="sf text-left flex justify-start items-start"
                                              >
                                                <PopoverTrigger>
                                                  <p className="text-xs bg-gray-200 m-0 p-1 cursor-pointer hover:brightness-75 rounded-full ">
                                                    Update Title
                                                  </p>
                                                </PopoverTrigger>
                                                <PopoverContent>
                                                  <Input
                                                    value={updateMapData?.title}
                                                    onChange={(e) => {
                                                      setUpdateMapData(
                                                        (res) => ({
                                                          ...res,
                                                          title: e.target.value,
                                                        })
                                                      );
                                                    }}
                                                    title="Enter Title"
                                                  ></Input>
                                                  <Button
                                                    className="my-2"
                                                    color="primary"
                                                    onPress={() => {
                                                      UpdateMapTitle(
                                                        updateMapData?.title,
                                                        z.id
                                                      );
                                                    }}
                                                  >
                                                    Update Title
                                                  </Button>
                                                </PopoverContent>
                                              </Popover>
                                              <Popover
                                                onOpenChange={(e) => {
                                                  e == true
                                                    ? setUpdateMapData(
                                                        (res) => ({
                                                          ...res,
                                                          url: z.url,
                                                        })
                                                      )
                                                    : "";
                                                }}
                                                className="sf text-left flex justify-start items-start"
                                              >
                                                <PopoverTrigger>
                                                  <p className="text-xs bg-gray-200 m-0 p-1 cursor-pointer hover:brightness-75 rounded-full ">
                                                    Update URL
                                                  </p>
                                                </PopoverTrigger>
                                                <PopoverContent>
                                                  <Input
                                                    value={updateMapData?.url}
                                                    onChange={(e) => {
                                                      setUpdateMapData(
                                                        (res) => ({
                                                          ...res,
                                                          url: e.target.value,
                                                        })
                                                      );
                                                    }}
                                                    title="Enter Title"
                                                  ></Input>
                                                  <Button
                                                    className="my-2"
                                                    color="primary"
                                                    onPress={() => {
                                                      UpdateMapURL(
                                                        updateMapData?.url,
                                                        z.id
                                                      );
                                                    }}
                                                  >
                                                    Update URL
                                                  </Button>
                                                </PopoverContent>
                                              </Popover>
                                              <p
                                                className="text-xs bg-red-500 m-0 p-1 cursor-pointer hover:brightness-75 rounded-full text-white"
                                                onClick={() => {
                                                  deletMindMapbyId(z.id);
                                                }}
                                              >
                                                Delete
                                              </p>
                                            </div>
                                          ) : (
                                            ""
                                          )}
                                        </div>
                                      ))}
                                </div>
                              </>
                            );
                          })}
                    </div>
                  ) : (
                    ""
                  )}
                  <div className="w-full md:w-auto flex-0 md:flex-1  h-full bg-gray-100 rounded-lg overflow-y-auto">
                    {mindmaps == undefined ? <p>No Mindmap Found</p> : ""}
                    {activeMap == undefined ? (
                      <p className="w-full h-full text-center justify-center align-middle items-center flex">
                        Please Select a Mind Map to View
                      </p>
                    ) : (
                      ""
                    )}
                    {mindmaps != undefined &&
                    activeMind != undefined &&
                    activeMap != undefined ? (
                      <div className="p-5 relative text-left">
                        {toggleMaps == false ? (
                          <Button
                            color="primary"
                            className="my-2"
                            onPress={() => {
                              setToggleMaps(true);
                            }}
                          >
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M15.5303 4.21967C15.8232 4.51256 15.8232 4.98744 15.5303 5.28033L8.81066 12L15.5303 18.7197C15.8232 19.0126 15.8232 19.4874 15.5303 19.7803C15.2374 20.0732 14.7626 20.0732 14.4697 19.7803L7.21967 12.5303C6.92678 12.2374 6.92678 11.7626 7.21967 11.4697L14.4697 4.21967C14.7626 3.92678 15.2374 3.92678 15.5303 4.21967Z"
                                fill="currentColor"
                              />
                            </svg>
                            See All Maps
                          </Button>
                        ) : (
                          ""
                        )}
                        <iframe
                          className="rounded-xl border-1 border-gray-200"
                          key={activeMind}
                          width={"100%"}
                          height={"400px"}
                          src={activeMap.url}
                        ></iframe>
                        <h2 className="font-bold text-left w-full my-2 text-3xl text-secondary">
                          Map : {activeMap.title}
                        </h2>

                        {activeMap?.content?.type == "text" ? (
                          <div className="w-full text-left">
                            {activeMap?.content?.text}
                          </div>
                        ) : (
                          ""
                        )}
                        {activeMap?.content?.type == "html" ? (
                          <div
                            className="w-full text-left"
                            dangerouslySetInnerHTML={{
                              __html: activeMap?.content?.text,
                            }}
                          ></div>
                        ) : (
                          ""
                        )}
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ) : (
                ""
              )}

              {slug == "topic-wise" ? (
                <div className="flex flex-col w-full h-full">
                  <DashTrack
                    userData={userData}
                    goToTest={() => {
                      setSlug("kyc");
                    }}
                  ></DashTrack>
                </div>
              ) : (
                ""
              )}

              {slug == "kyc" ? (
                <KYCManager
                  userData={userData}
                  role={props?.type || "user"}
                  enrolled={coursesEnrolled}
                ></KYCManager>
              ) : (
                ""
              )}

              {slug == "dashboard" ? (
                <div className="flex flex-col w-full h-full">
                  <div className="flex flex-col md:flex-row w-full items-stretch justify-center align-middle py-2 md:py-5">
                    <div className="w-full md:w-full text-left text-2xl font-bold  relative mr-5">
                      <h2>
                        Hi{" "}
                        {userData?.user_metadata?.full_name || "Unknown User"},
                      </h2>
                      <p className="text-primary">
                        Welcome to IPM Careers Study Panel
                      </p>
                    </div>
                  </div>

                  <Dashboard userData={userData}></Dashboard>
                </div>
              ) : (
                ""
              )}

              {slug == "mocks" ? (
                <div className="flex flex-col w-full h-full">
                  <MockTests enrolled={coursesEnrolled || []}></MockTests>
                </div>
              ) : (
                ""
              )}
              {slug == "play" ? (
                <ConceptGroups
                  title="Select Concept Test Collection"
                  role={props?.type}
                  type={"concept"}
                >
                  {({ group, clearSelection }) => (
                    <Concept
                      group={group}
                      onBack={() => {
                        clearSelection();
                      }}
                      role={props?.type || "user"}
                    ></Concept>
                  )}
                </ConceptGroups>
              ) : (
                ""
              )}

              {slug == "prv" ? (
                <VideoGroups
                  title="Select Video Pack"
                  role={props?.type}
                  type={"video"}
                >
                  {({ group, clearSelection }) => (
                    <PreRecorded
                      demoListName={"videos_view"}
                      onBack={(e) => {
                        clearSelection();
                      }}
                      group={group}
                      title={"Pre Recorded Videos"}
                      listName={"videos"}
                      categoryName={"vcategory"}
                      role={props?.type}
                    ></PreRecorded>
                  )}
                </VideoGroups>
              ) : (
                ""
              )}

              {slug == "dbts" ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <h2 className="text-gray-600 text-xl">
                    Get Fast Video Solutions for all your Doubts on
                  </h2>
                  <h2 className="text-4xl font-bold font-sans text-primary">
                    "DoubtsPad"
                  </h2>
                  <Spacer y={4}></Spacer>
                  <Button
                    className="bg-secondary text-black"
                    startContent={
                      <svg
                        id="Livello_1"
                        data-name="Livello 1"
                        viewBox="0 0 240 240"
                        width={24}
                        height={24}
                      >
                        <defs>
                          <linearGradient
                            id="linear-gradient"
                            x1={120}
                            y1={240}
                            x2={120}
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop offset={0} stopColor="#1d93d2" />
                            <stop offset={1} stopColor="#38b0e3" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx={120}
                          cy={120}
                          r={120}
                          fill="url(#linear-gradient)"
                        />
                        <path
                          d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687 30.255-29.492 30.255-29.492l31.525-60.89L81.737 118.6z"
                          fill="#c8daea"
                        />
                        <path
                          d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0 17.415-15.763 17.415-15.763"
                          fill="#a9c6d8"
                        />
                        <path
                          d="M81.486 130.178L52.2 120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229 2.1-2.2 6.489-4.523 120.106-45.36 120.106-45.36s3.208-1.081 5.1-.362a2.766 2.766 0 011.885 2.055 9.357 9.357 0 01.254 2.585c-.009.752-.1 1.449-.169 2.542-.692 11.165-21.4 94.493-21.4 94.493s-1.239 4.876-5.678 5.043a8.13 8.13 0 01-5.925-2.292c-8.711-7.493-38.819-27.727-45.472-32.177a1.27 1.27 0 01-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6 53.821-51.492c.108-.379-.3-.566-.848-.4-3.482 1.281-63.844 39.4-70.506 43.607a3.21 3.21 0 01-1.48.09z"
                          fill="#fff"
                        />
                        <script />
                      </svg>
                    }
                    as={Link}
                    href="https://t.me/ipmatdoubtspad"
                  >
                    Open DoubtsPad
                  </Button>
                </div>
              ) : (
                ""
              )}

              {/* Live Video Recording */}

              {slug == "lvr" ? (
                <VideoGroups
                  title="Select Live Video Pack"
                  role={props?.type}
                  type={"lvideo"}
                >
                  {({ group, clearSelection }) => (
                    <PreRecorded
                      demoListName={"live_videos_view"}
                      onBack={(e) => {
                        clearSelection();
                      }}
                      group={group}
                      title={"Live Recorded Videos"}
                      listName={"lvideos"}
                      categoryName={"lvcategory"}
                      role={props?.type}
                    ></PreRecorded>
                  )}
                </VideoGroups>
              ) : (
                ""
              )}

              {slug == "batch-wise" ? <Classes></Classes> : ""}

              {slug == "tutorial" ? (
                <div className="w-full h-full flex flex-col justify-center align-middle items-center">
                  <div className="w-full h-full flex flex-col overflow-y-auto">
                    <Accordion isCompact defaultExpandedKeys={["0"]}>
                      {tutorialCategories &&
                        tutorialCategories.map((i, d) => {
                          return (
                            <AccordionItem
                              startContent={
                                props?.type == "admin" ? (
                                  <>
                                    <Popover
                                      className="flex flex-col justify-start align-middle items-start sf"
                                      onOpenChange={(e) => {
                                        e == true
                                          ? setTutorialData((res) => ({
                                              ...res,
                                              utitle: i?.title,
                                              udescription: i?.description,
                                            }))
                                          : "";
                                      }}
                                    >
                                      <PopoverTrigger>
                                        <Button
                                          className="mr-2"
                                          size="sm"
                                          color="success"
                                        >
                                          Update
                                        </Button>
                                      </PopoverTrigger>

                                      <PopoverContent>
                                        <Input
                                          value={tutorialData?.utitle}
                                          label="Tutorial Category Title"
                                          placeholder="Enter Tutorial Category Title"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              utitle: e.target.value,
                                            }));
                                          }}
                                        ></Input>
                                        <Textarea
                                          value={tutorialData?.udescription}
                                          className="mt-3"
                                          label="Tutorial Category Description (optional)"
                                          placeholder="Enter Tutorial Category Description (optional)"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              udescription: e.target.value,
                                            }));
                                          }}
                                        ></Textarea>

                                        <Button
                                          className="mr-2"
                                          size="sm"
                                          color="primary"
                                          onPress={() => {
                                            updateTutorialCategory(
                                              tutorialData,
                                              i.id
                                            );
                                          }}
                                        >
                                          Update
                                        </Button>
                                      </PopoverContent>
                                    </Popover>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onPress={() => {
                                        DeleteTutorialCategory(i.id);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                ) : (
                                  ""
                                )
                              }
                              key={d}
                              aria-label={i.title}
                              title={i.title}
                              subtitle={i.description}
                            >
                              {/* Tutorial Content */}
                              <div className="flex flex-row flex-wrap justify-start align-top items-start">
                                {tutorials &&
                                  tutorials
                                    .filter((res) => res.parent == i.id)
                                    .map((z, v) => {
                                      return (
                                        <div className="flex flex-col justify-start items-start align-top">
                                          <iframe
                                            className="rounded-lg overflow-hidden w-[150px] lg:w-[250px] m-1 bg-gray-200 lg:min-h-[5vw] aspect-video"
                                            width="100%"
                                            height="100%"
                                            src={z?.video}
                                            frameborder="0"
                                            allowfullscreen="true"
                                          ></iframe>
                                          <h2 className="font-bold">
                                            {z?.title}
                                          </h2>
                                          <p className="text-sm text-gray-600">
                                            {z?.description}
                                          </p>
                                          <div>
                                            {props?.type == "admin" ? (
                                              <>
                                                <Popover
                                                  className="flex flex-col justify-start align-middle items-start sf"
                                                  onOpenChange={(e) => {
                                                    e == true
                                                      ? setTutorialData(
                                                          (res) => ({
                                                            ...res,
                                                            vtitle: z?.title,
                                                            vdescription:
                                                              z?.description,
                                                            vvideo: z?.video,
                                                          })
                                                        )
                                                      : "";
                                                  }}
                                                >
                                                  <PopoverTrigger>
                                                    <Button
                                                      className="mr-2"
                                                      size="sm"
                                                      color="success"
                                                    >
                                                      Update
                                                    </Button>
                                                  </PopoverTrigger>

                                                  <PopoverContent>
                                                    <Input
                                                      value={
                                                        tutorialData?.vvideo
                                                      }
                                                      className="mb-3"
                                                      label="Tutorial Video URL"
                                                      placeholder="Enter Tutorial Video URL"
                                                      onChange={(e) => {
                                                        setTutorialData(
                                                          (res) => ({
                                                            ...res,
                                                            vvideo:
                                                              e.target.value,
                                                          })
                                                        );
                                                      }}
                                                    ></Input>
                                                    <Popover>
                                                      <PopoverTrigger>
                                                        {tutorialData?.vvideo !=
                                                        undefined ? (
                                                          <Button
                                                            className="mb-3"
                                                            color="primary"
                                                          >
                                                            Preview Video
                                                          </Button>
                                                        ) : (
                                                          ""
                                                        )}
                                                      </PopoverTrigger>
                                                      <PopoverContent>
                                                        <iframe
                                                          className="rounded-lg overflow-hidden min-h-[20vw] lg:min-h-[10vw] w-full"
                                                          width="100%"
                                                          height="100%"
                                                          src={
                                                            tutorialData?.vvideo
                                                          }
                                                          frameborder="0"
                                                          allowfullscreen="true"
                                                        ></iframe>
                                                      </PopoverContent>
                                                    </Popover>

                                                    <Input
                                                      value={
                                                        tutorialData?.vtitle
                                                      }
                                                      label="Tutorial Title"
                                                      placeholder="Enter Tutorial Video Title"
                                                      onChange={(e) => {
                                                        setTutorialData(
                                                          (res) => ({
                                                            ...res,
                                                            vtitle:
                                                              e.target.value,
                                                          })
                                                        );
                                                      }}
                                                    ></Input>
                                                    <Textarea
                                                      value={
                                                        tutorialData?.vdescription
                                                      }
                                                      className="mt-3"
                                                      label="Tutorial Video Description (optional)"
                                                      placeholder="Enter Tutorial Description (optional)"
                                                      onChange={(e) => {
                                                        setTutorialData(
                                                          (res) => ({
                                                            ...res,
                                                            vdescription:
                                                              e.target.value,
                                                          })
                                                        );
                                                      }}
                                                    ></Textarea>

                                                    <Button
                                                      className="mr-2"
                                                      size="sm"
                                                      color="primary"
                                                      onPress={() => {
                                                        updateTutorials(
                                                          tutorialData,
                                                          z.id
                                                        );
                                                      }}
                                                    >
                                                      Update
                                                    </Button>
                                                  </PopoverContent>
                                                </Popover>
                                                <Button
                                                  color="danger"
                                                  size="sm"
                                                  onPress={() => {
                                                    DeleteTutorials(z.id);
                                                  }}
                                                >
                                                  Delete
                                                </Button>
                                              </>
                                            ) : (
                                              ""
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                {tutorials == undefined ||
                                tutorials?.length == 0 ? (
                                  <div className="rounded-lg p-5 overflow-hidden min-h-[10vw] border-dashed border-1 border-gray-400 lg:min-h-[5vw] flex flex-col justify-center items-center align-middle relative aspect-video w-[150px] lg:w-[250px] m-1">
                                    No Video Found
                                  </div>
                                ) : (
                                  ""
                                )}
                                {props?.type == "admin" ? (
                                  <div className="rounded-lg p-5 overflow-hidden min-h-[10vw] bg-gray-200 lg:min-h-[5vw] flex flex-col justify-center items-center align-middle relative aspect-video w-[150px] lg:w-[250px] m-1">
                                    <Popover>
                                      <PopoverTrigger>
                                        <Button color="primary">
                                          Add Video
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="sf py-5 min-w-[500px] flex flex-col justify-start items-start">
                                        <Input
                                          className="mb-3"
                                          label="Tutorial Video URL"
                                          placeholder="Enter Tutorial Video URL"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              vvideo: e.target.value,
                                            }));
                                          }}
                                        ></Input>
                                        <Popover>
                                          <PopoverTrigger>
                                            {tutorialData?.vvideo !=
                                            undefined ? (
                                              <Button
                                                className="mb-3"
                                                color="primary"
                                              >
                                                Preview Video
                                              </Button>
                                            ) : (
                                              ""
                                            )}
                                          </PopoverTrigger>
                                          <PopoverContent>
                                            <iframe
                                              className="rounded-lg overflow-hidden min-h-[20vw] lg:min-h-[10vw] w-full"
                                              width="100%"
                                              height="100%"
                                              src={tutorialData?.vvideo}
                                              frameborder="0"
                                              allowfullscreen="true"
                                            ></iframe>
                                          </PopoverContent>
                                        </Popover>
                                        <Input
                                          label="Tutorial Title"
                                          placeholder="Enter Tutorial Title"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              vtitle: e.target.value,
                                            }));
                                          }}
                                        ></Input>
                                        <Textarea
                                          className="mt-3"
                                          label="Tutorial Description"
                                          placeholder="Enter Tutorial Description"
                                          onChange={(e) => {
                                            setTutorialData((res) => ({
                                              ...res,
                                              vdescription: e.target.value,
                                            }));
                                          }}
                                        ></Textarea>

                                        <Button
                                          onPress={() => {
                                            addTutorial(tutorialData, i.id);
                                          }}
                                          color="primary"
                                          className="sf mt-3"
                                        >
                                          Add Video
                                        </Button>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </div>
                            </AccordionItem>
                          );
                        })}
                    </Accordion>

                    {props?.type == "admin" ? (
                      <Popover className="w-full sf">
                        <PopoverTrigger>
                          <div className="w-full border-1 rounded-lg border-dashed border-gray-200 p-2 hover:border-gray-500 cursor-pointer">
                            Add New Category
                          </div>
                        </PopoverTrigger>

                        <PopoverContent className="w-full p-5 min-w-[500px] text-left items-start justify-start">
                          <Input
                            label="Tutorial Category Title"
                            placeholder="Enter Tutorial Category Title"
                            onChange={(e) => {
                              setTutorialData((res) => ({
                                ...res,
                                title: e.target.value,
                              }));
                            }}
                          ></Input>
                          <Textarea
                            className="mt-3"
                            label="Tutorial Category Description (optional)"
                            placeholder="Enter Tutorial Category Description (optional)"
                            onChange={(e) => {
                              setTutorialData((res) => ({
                                ...res,
                                description: e.target.value,
                              }));
                            }}
                          ></Textarea>
                          <Button
                            onPress={() => {
                              addTutorialCategory(tutorialData);
                            }}
                            color="primary"
                            className="sf mt-3"
                          >
                            Add Tutorial Category
                          </Button>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ) : (
                ""
              )}

              {slug == "pdfs" ? (
                <div className="w-full h-full flex flex-row justify-center align-middle items-center">
                  <div className="lg:w-1/2 h-full flex flex-col overflow-y-auto">
                    <Accordion isCompact defaultExpandedKeys={["0"]}>
                      {pdfCategories &&
                        pdfCategories.map((i, d) => {
                          return (
                            <AccordionItem
                              startContent={
                                props?.type == "admin" ? (
                                  <>
                                    <Popover
                                      className="flex flex-col justify-start align-middle items-start sf"
                                      onOpenChange={(e) => {
                                        e == true
                                          ? setPDFData((res) => ({
                                              ...res,
                                              utitle: i?.title,
                                              udescription: i?.description,
                                            }))
                                          : "";
                                      }}
                                    >
                                      <PopoverTrigger>
                                        <Button
                                          className="mr-2"
                                          size="sm"
                                          color="success"
                                        >
                                          Update
                                        </Button>
                                      </PopoverTrigger>

                                      <PopoverContent>
                                        <Input
                                          value={pdfData?.utitle}
                                          label="PDF Category Title"
                                          placeholder="Enter PDF Category Title"
                                          onChange={(e) => {
                                            setPDFData((res) => ({
                                              ...res,
                                              utitle: e.target.value,
                                            }));
                                          }}
                                        ></Input>
                                        <Textarea
                                          value={pdfData?.udescription}
                                          className="mt-3"
                                          label="PDF Category Description (optional)"
                                          placeholder="Enter PDF Category Description (optional)"
                                          onChange={(e) => {
                                            setPDFData((res) => ({
                                              ...res,
                                              udescription: e.target.value,
                                            }));
                                          }}
                                        ></Textarea>

                                        <Button
                                          className="mr-2"
                                          size="sm"
                                          color="primary"
                                          onPress={() => {
                                            updatePDFCategory(pdfData, i.id);
                                          }}
                                        >
                                          Update
                                        </Button>
                                      </PopoverContent>
                                    </Popover>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onPress={() => {
                                        DeletePDFCategory(i.id);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                ) : (
                                  ""
                                )
                              }
                              key={d}
                              aria-label={i.title}
                              title={i.title}
                              subtitle={i.description}
                            >
                              {/* PDF Content */}
                              <div className="flex flex-row flex-wrap justify-start align-top items-start">
                                {pdfMaterial &&
                                  pdfMaterial
                                    .filter((res) => res.parent == i.id)
                                    .map((z, v) => {
                                      return (
                                        <div className="flex flex-col justify-start items-start align-top">
                                          <div className="aspect-video w-[200px] border-1 border-gray-200 p-3 rounded-xl text-center flex flex-col justify-center items-center align-middle">
                                            <Button
                                              color="primary"
                                              onPress={() => {
                                                setActivePDFMaterial(z);
                                              }}
                                            >
                                              Open Document
                                            </Button>
                                          </div>
                                          <h2 className="font-bold">
                                            {z?.title}
                                          </h2>
                                          <p className="text-sm text-gray-600">
                                            {z?.description}
                                          </p>
                                          <div>
                                            {props?.type == "admin" ? (
                                              <>
                                                <Popover
                                                  className="flex flex-col justify-start align-middle items-start sf"
                                                  onOpenChange={(e) => {
                                                    e == true
                                                      ? setPDFData((res) => ({
                                                          ...res,
                                                          vtitle: z?.title,
                                                          vdescription:
                                                            z?.description,
                                                          vvideo: z?.url,
                                                        }))
                                                      : "";
                                                  }}
                                                >
                                                  <PopoverTrigger>
                                                    <Button
                                                      className="mr-2"
                                                      size="sm"
                                                      color="success"
                                                    >
                                                      Update
                                                    </Button>
                                                  </PopoverTrigger>

                                                  <PopoverContent>
                                                    <Input
                                                      value={pdfData?.vvideo}
                                                      className="mb-3"
                                                      label="PDF URL"
                                                      placeholder="Enter PDF URL"
                                                      onChange={(e) => {
                                                        setPDFData((res) => ({
                                                          ...res,
                                                          vvideo:
                                                            e.target.value,
                                                        }));
                                                      }}
                                                    ></Input>

                                                    <Input
                                                      value={pdfData?.vtitle}
                                                      label="PDF Title"
                                                      placeholder="Enter PDF Video Title"
                                                      onChange={(e) => {
                                                        setPDFData((res) => ({
                                                          ...res,
                                                          vtitle:
                                                            e.target.value,
                                                        }));
                                                      }}
                                                    ></Input>
                                                    <Textarea
                                                      value={
                                                        pdfData?.vdescription
                                                      }
                                                      className="mt-3"
                                                      label="PDF Description (optional)"
                                                      placeholder="Enter PDF Description (optional)"
                                                      onChange={(e) => {
                                                        setPDFData((res) => ({
                                                          ...res,
                                                          vdescription:
                                                            e.target.value,
                                                        }));
                                                      }}
                                                    ></Textarea>

                                                    <Button
                                                      className="mr-2"
                                                      size="sm"
                                                      color="primary"
                                                      onPress={() => {
                                                        updatePDFMaterial(
                                                          pdfData,
                                                          z.id
                                                        );
                                                      }}
                                                    >
                                                      Update
                                                    </Button>
                                                  </PopoverContent>
                                                </Popover>
                                                <Button
                                                  color="danger"
                                                  size="sm"
                                                  onPress={() => {
                                                    DeletePDFMaterial(z.id);
                                                  }}
                                                >
                                                  Delete
                                                </Button>
                                              </>
                                            ) : (
                                              ""
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                {pdfMaterial == undefined ||
                                pdfMaterial?.length == 0 ? (
                                  <div className="rounded-lg p-5 overflow-hidden min-h-[10vw] border-dashed border-1 border-gray-400 lg:min-h-[5vw] flex flex-col justify-center items-center align-middle relative aspect-video w-[150px] lg:w-[250px] m-1">
                                    No PDF Found
                                  </div>
                                ) : (
                                  ""
                                )}
                                {props?.type == "admin" ? (
                                  <div className="rounded-lg p-5 overflow-hidden min-h-[10vw] bg-gray-200 lg:min-h-[5vw] flex flex-col justify-center items-center align-middle relative aspect-video w-[150px] lg:w-[250px] m-1">
                                    <Popover>
                                      <PopoverTrigger>
                                        <Button color="primary">Add PDF</Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="sf py-5 min-w-[500px] flex flex-col justify-start items-start">
                                        <Input
                                          className="mb-3"
                                          label="PDF URL"
                                          placeholder="Enter PDF URL"
                                          onChange={(e) => {
                                            setPDFData((res) => ({
                                              ...res,
                                              vvideo: e.target.value,
                                            }));
                                          }}
                                        ></Input>

                                        <Input
                                          label="PDF Title"
                                          placeholder="Enter PDF Title"
                                          onChange={(e) => {
                                            setPDFData((res) => ({
                                              ...res,
                                              vtitle: e.target.value,
                                            }));
                                          }}
                                        ></Input>
                                        <Textarea
                                          className="mt-3"
                                          label="PDF Description"
                                          placeholder="Enter PDF Description"
                                          onChange={(e) => {
                                            setPDFData((res) => ({
                                              ...res,
                                              vdescription: e.target.value,
                                            }));
                                          }}
                                        ></Textarea>

                                        <Button
                                          onPress={() => {
                                            addPDFMaterial(pdfData, i.id);
                                          }}
                                          color="primary"
                                          className="sf mt-3"
                                        >
                                          Add PDF
                                        </Button>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </div>
                            </AccordionItem>
                          );
                        })}
                    </Accordion>

                    {props?.type == "admin" ? (
                      <Popover className="w-full sf">
                        <PopoverTrigger>
                          <div className="w-full border-1 rounded-lg border-dashed border-gray-200 p-2 hover:border-gray-500 cursor-pointer">
                            Add PDF Category
                          </div>
                        </PopoverTrigger>

                        <PopoverContent className="w-full p-5 min-w-[500px] text-left items-start justify-start">
                          <Input
                            label="PDF Category Title"
                            placeholder="Enter PDF Category Title"
                            onChange={(e) => {
                              setPDFData((res) => ({
                                ...res,
                                title: e.target.value,
                              }));
                            }}
                          ></Input>
                          <Textarea
                            className="mt-3"
                            label="PDF Category Description (optional)"
                            placeholder="Enter PDF Category Description (optional)"
                            onChange={(e) => {
                              setPDFData((res) => ({
                                ...res,
                                description: e.target.value,
                              }));
                            }}
                          ></Textarea>
                          <Button
                            onPress={() => {
                              addPDFCategory(pdfData);
                            }}
                            color="primary"
                            className="sf mt-3"
                          >
                            Add PDF Category
                          </Button>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      ""
                    )}
                  </div>

                  {/* PDF Viewwer */}

                  <div className="lg:w-1/2 flex-wrap flex flex-col overflow-hidden h-full">
                    <Document
                      className={"relative"}
                      file={activePDFMaterial?.url}
                      onLoadSuccess={onDocumentLoadSuccess}
                    >
                      <Page
                        className={" bg-white z-10 "}
                        pageNumber={pageNumber}
                      />
                    </Document>
                  </div>
                </div>
              ) : (
                ""
              )}
              {slug == "currentaffairs" ? (
                <DailyLearn role={props?.type}></DailyLearn>
              ) : (
                ""
              )}

              {slug == "pyqconcept" ? (
                <PYQManager
                  viewBy="topic"
                  isAdmin={props?.type == "admin"}
                ></PYQManager>
              ) : (
                ""
              )}

              {slug == "pyqyear" ? (
                <PYQManager
                  viewBy="year"
                  isAdmin={props?.type == "admin"}
                ></PYQManager>
              ) : (
                ""
              )}

              {slug == "webinars" ? (
                <div className="w-full h-full">
                  <Webinars
                    data={userData}
                    enrolled={coursesEnrolled || ""}
                    role={props?.type}
                  ></Webinars>
                </div>
              ) : (
                ""
              )}

              {slug == "bookbysub" ? (
                <div className="w-full h-full">
                  <BookBySubject
                    changeSlug={(e) => {
                      setSlug(e);
                    }}
                    enrolled={coursesEnrolled}
                    userData={userData}
                    role={props?.type}
                  ></BookBySubject>
                </div>
              ) : (
                ""
              )}

              {slug == "exmscan" ? (
                <ExamScanner
                  userData={userData}
                  role={props?.type || "user"}
                ></ExamScanner>
              ) : (
                ""
              )}
            </div>
          </div>
        </DefaultLayout>
      ) : (
        ""
      )}
    </>
  );
}
