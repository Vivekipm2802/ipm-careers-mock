import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Flasher from "@/components/Flasher";
import {
  Avatar,
  Button,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  ScrollShadow,
  Spacer,
} from "@nextui-org/react";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import FooterMock from "./components/FooterMock";
import HeaderMock from "./components/HeaderMock";
import { useNMNContext } from "@/components/NMNContext";
import _ from "lodash";
import {
  CountdownCircleTimer,
  useCountdown,
} from "react-countdown-circle-timer";
import DraggableModal from "./components/Modal";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";
import { useTimer } from "react-timer-hook";
import { CtoLocal } from "@/utils/DateUtil";
import { getAuthHeaders } from "@/utils/authHeaders";
import axios from "axios";

function Icon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="25"
      height="25"
      viewBox="0 0 192 192"
      className="relative w-full h-full"
    >
      <linearGradient id="a" x1="50%" x2="50%" y1="0%" y2="100%">
        <stop offset="0" stopColor="#f65e7a"></stop>
        <stop offset="0.051" stopColor="#f65e7a"></stop>
        <stop offset="0.1" stopColor="#f65d79"></stop>
        <stop offset="0.146" stopColor="#f55c78"></stop>
        <stop offset="0.191" stopColor="#f45b76"></stop>
        <stop offset="0.233" stopColor="#f35974"></stop>
        <stop offset="0.274" stopColor="#f25771"></stop>
        <stop offset="0.314" stopColor="#f1546f"></stop>
        <stop offset="0.353" stopColor="#f0526b"></stop>
        <stop offset="0.39" stopColor="#ee4f68"></stop>
        <stop offset="0.427" stopColor="#ed4b64"></stop>
        <stop offset="0.464" stopColor="#eb4860"></stop>
        <stop offset="0.5" stopColor="#e9445c"></stop>
        <stop offset="0.536" stopColor="#e84057"></stop>
        <stop offset="0.573" stopColor="#e63c53"></stop>
        <stop offset="0.61" stopColor="#e5374e"></stop>
        <stop offset="0.647" stopColor="#e33349"></stop>
        <stop offset="0.686" stopColor="#e22e44"></stop>
        <stop offset="0.726" stopColor="#e02940"></stop>
        <stop offset="0.767" stopColor="#df253b"></stop>
        <stop offset="0.809" stopColor="#de2037"></stop>
        <stop offset="0.854" stopColor="#dd1c33"></stop>
        <stop offset="0.9" stopColor="#dd1830"></stop>
        <stop offset="0.949" stopColor="#dc152e"></stop>
        <stop offset="1" stopColor="#dc142d"></stop>
      </linearGradient>
      <g fill="none" fillRule="evenodd">
        <circle cx="96" cy="96" r="96" fill="url(#a)"></circle>
        <path
          fill="#fff"
          d="M95.926 70.264c1.666-5.311 5.057-9.77 10.171-13.374 8.485-5.982 29.714-7.652 40.268 8.14 10.555 15.791 5.613 37.04-10.554 53.746-10.555 10.905-23.674 21.075-39.358 30.508a2 2 0 01-2.018.026c-13.021-7.386-26.062-17.564-39.12-30.534-20.1-19.962-21.546-37.989-10.773-53.747 10.772-15.757 31.73-14.12 40.215-8.14 5.115 3.606 8.52 8.065 10.215 13.377a.5.5 0 00.954-.002z"
        ></path>
      </g>
    </svg>
  );
}

const QuestionCard = ({ answered, question, onSelect, index }) => {
  if (question == undefined) {
    return <div style={{ padding: 40, color: "var(--c-text-tertiary)" }}>Question unavailable</div>;
  }
  const isDevelopment = process.env.NODE_ENV === "development";
  const selectedValue = answered?.filter((item) => item.id == question.id)[0]?.value || "";

  return (
    <div className="font-sans w-full flex-1 justify-start align-middle items-start flex flex-col text-left" style={{ background: "var(--c-bg)" }}>
      <div className="w-full relative" style={{ padding: "40px 56px 32px" }}>

        <div style={{
          fontSize: 12, fontWeight: 500,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--c-text-tertiary)", marginBottom: 12,
        }}>
          Question {index}
          {isDevelopment && (
            <span style={{ marginLeft: 12, opacity: 0.6 }}>{"· ID " + question.id}</span>
          )}
        </div>

        <h2 style={{
          fontSize: 22, fontWeight: 600,
          letterSpacing: "-0.018em", lineHeight: 1.35,
          color: "var(--c-text-primary)", marginBottom: 18, maxWidth: "70ch",
        }}>
          {question?.title}
        </h2>

        <div className="w-full" style={{ maxWidth: "70ch", marginBottom: 24 }}>
          <ScrollShadow
            className="qcontent"
            style={{
              fontSize: 16, lineHeight: 1.65,
              color: "var(--c-text-primary)",
              maxHeight: "35vh", overflowY: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: question.question }}
          />
        </div>

        {question?.questionimage && (
          <img
            src={question.questionimage}
            alt="Question"
            style={{
              maxHeight: "30vh", marginBottom: 24, borderRadius: 12,
              border: "1px solid var(--c-border-faint)",
            }}
          />
        )}

        {question?.type == "options" && (
          <div className="w-full" style={{ maxWidth: 640 }}>
            <div style={{
              fontSize: 13, fontWeight: 500,
              color: "var(--c-text-secondary)",
              marginBottom: 14, letterSpacing: "-0.005em",
            }}>
              {question?.label || "Choose one option"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {question.options.map((option, i) => {
                const optionValue = String(i + 1);
                const isSelected = selectedValue === optionValue;
                const letter = String.fromCharCode(65 + i);

                return (
                  <button
                    key={i}
                    onClick={() => onSelect({ id: question.id, value: optionValue })}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      padding: "16px 18px",
                      background: isSelected ? "var(--c-brand-primary-tint)" : "var(--c-surface)",
                      border: "1px solid " + (isSelected ? "var(--c-brand-primary)" : "var(--c-border-soft)"),
                      borderRadius: 14, cursor: "pointer",
                      textAlign: "left", width: "100%",
                      fontFamily: "inherit",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div style={{
                      flexShrink: 0,
                      width: 28, height: 28, borderRadius: 8,
                      background: isSelected ? "var(--c-brand-primary)" : "var(--c-surface-muted)",
                      color: isSelected ? "#fff" : "var(--c-text-secondary)",
                      display: "grid", placeItems: "center",
                      fontWeight: 600, fontSize: 13,
                      transition: "all 0.18s ease",
                    }}>
                      {letter}
                    </div>
                    <div style={{ flex: 1 }}>
                      {option?.image ? (
                        <img
                          src={option.image}
                          alt={"Option " + letter}
                          style={{ height: 64, width: "auto", objectFit: "contain" }}
                        />
                      ) : (
                        <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--c-text-primary)" }}>
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

        {question?.type == "input" && (
          <div className="w-full" style={{ maxWidth: 480 }}>
            <div style={{
              fontSize: 13, fontWeight: 500,
              color: "var(--c-text-secondary)",
              marginBottom: 8, letterSpacing: "-0.005em",
            }}>
              {question?.label || "Enter your answer"}
            </div>
            <Input
              value={selectedValue}
              onChange={(e) => onSelect({ id: question.id, value: e.target.value })}
              placeholder="Type your answer here"
              size="lg"
              variant="bordered"
            />
            {isDevelopment && (
              <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", marginTop: 8 }}>
                Dev expected: {question?.options?.answer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Phase 7: instructions screen helpers ──
const insTh = {
  background: "var(--c-surface-muted, var(--c-bg))",
  color: "var(--c-text-tertiary)",
  fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
  textTransform: "uppercase",
  textAlign: "left", padding: "12px 16px",
};
const insTd = {
  padding: "14px 16px",
  borderTop: "1px solid var(--c-border-faint)",
  color: "var(--c-text-secondary)",
};
function InsSection({ num, title }) {
  return (
    <h3 style={{ margin: "28px 0 12px", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--c-text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6,
        background: "var(--c-brand-primary-tint)",
        color: "var(--c-brand-primary)",
        display: "grid", placeItems: "center",
        fontSize: 11, fontWeight: 700,
      }}>{num}</span>
      {title}
    </h3>
  );
}
function LegendCard({ color, border, title, sub }) {
  const isGray = color === "gray";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px",
      background: "var(--c-surface-muted, var(--c-bg))",
      borderRadius: 10,
      border: "1px solid var(--c-border-faint)",
      fontSize: 13, color: "var(--c-text-secondary)",
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: isGray ? "var(--c-surface-sunken, var(--c-surface-muted))" : color,
        border: isGray ? "1px solid var(--c-border-soft)" : (border ? `2px solid ${border}` : "none"),
      }} />
      <span style={{ lineHeight: 1.4 }}>
        <b style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>{title}</b><br />
        {sub}
      </span>
    </div>
  );
}

const MockTest = ({
  config,
  is_allowed,
  data,
  previewSections,
  previewModules,
  previewQuestions,
}) => {
  const [level, setLevel] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);

  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const [sideBarActive, setSidebarActive] = useState(!isMobile);
  const [answered, setAnswered] = useState();
  const [miscData, setMiscData] = useState();
  const [sections, setSections] = useState(previewSections || undefined);
  const [modules, setModules] = useState(previewModules || undefined);
  const [currentSection, setCurrentSection] = useState(0);
  const [insindex, setInsIndex] = useState(0);
  const [calculatorActive, setCalculatorActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [gamestate, setGameState] = useState(0);
  const [questions, setQuestions] = useState(previewQuestions || undefined);
  const [organized, setOrganized] = useState();
  const [exists, setExists] = useState(undefined);

  const scrollRef = useRef(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 150, behavior: "smooth" });
    }
  };
  const { userDetails } = useNMNContext();
  function timeDifferenceInSeconds(futureTime) {
    const futureDate = new Date(futureTime);
    const currentDate = new Date();

    const differenceInMillis = futureDate - currentDate;
    const differenceInSeconds = Math.floor(differenceInMillis / 1000);

    return differenceInSeconds;
  }
  const t = useMemo(
    () => timeDifferenceInSeconds(data?.start_time),
    [data?.start_time],
  );
  const { remainingTime } = useCountdown({
    duration: t,
    key: "fejak",
    isPlaying: is_allowed == false,
    colors: "#abc",
  });

  const router = useRouter();
  async function getQuestions(a) {
    const { data, error } = await supabase
      .from("mock_questions")
      .select("*")
      .in(
        "parent",
        a.filter((i) => i.module).map((i) => i.module.id),
      )
      .order("seq", { ascending: true });
    if (data) {
      setQuestions(data);

      /* if(data.length == 0){
        router.push('/404')
    } */
    } else {
      router.push("/login");
    }
  }

  const addItem = (newItem) => {
    setAnswered((prevItems) => {
      // Check if the item already exists by ID
      const index = _.findIndex(prevItems, { id: newItem.id });

      if (index === -1) {
        // Item doesn't exist, add it
        return Array.isArray(prevItems) ? [...prevItems, newItem] : [newItem];
      } else {
        // Item exists, update it
        const updatedItems = [...prevItems];
        updatedItems[index] = newItem;
        return updatedItems;
      }
    });
  };
  useEffect(() => {
    if (sections && modules && questions) {
      let questionIndex = 1;
      // Filter to only subject-type sections (skip module-type groups)
      const subjectSections = sections.filter(
        (s) => s.type === "subject" || s.subject != null,
      );
      const r = subjectSections.map((section) => ({
        title: section.subject?.title || section.title || "Section",
        child: modules
          .filter((b) => b.parent_sub == section.id)
          .flatMap((z) =>
            questions
              .filter((question) => question.parent === z.module?.id)
              .sort((a, b) => a.seq - b.seq)
              .map((lp) => ({ id: lp.id, index: questionIndex++ })),
          ),
      }));

      setOrganized(r);
    }
  }, [questions, sections, modules]);

  const addMiscItem = (newItem) => {
    setMiscData((prevItems) => {
      // Check if the item already exists by ID
      const index = _.findIndex(prevItems, { id: newItem.id });

      if (index === -1) {
        // Item doesn't exist, add it
        return Array.isArray(prevItems) ? [...prevItems, newItem] : [newItem];
      } else {
        const updatedItems = [...prevItems];
        if (newItem.status == "pending") {
          return updatedItems;
        }
        updatedItems[index] = newItem;
        return updatedItems;
      }
    });
  };

  // ✅ NEW
  const totalTimeout = Number(config?.config?.timeout) || 1800;

  const subjectSections =
    sections?.filter((s) => s.type === "subject" || s.subject != null) || [];

  const sectionCount = subjectSections.length || 1;
  const sectionTime = Number(subjectSections?.[currentSection]?.time);

  const timeDuration = config?.config?.switch_section
    ? totalTimeout
    : sectionTime > 0
      ? sectionTime
      : Math.floor(totalTimeout / sectionCount);

  const { seconds, minutes, hours, totalSeconds, restart, isRunning } =
    useTimer({
      expiryTimestamp: new Date(),
      onExpire: () => handleComplete(),
      autoStart: false,
    });

  useEffect(() => {
    if (gamestate === 1) {
      const time = new Date();
      time.setSeconds(time.getSeconds() + timeDuration);

      restart(time);
    }
  }, [gamestate]); // Only triggers when `gamestate` changes

  useEffect(() => {
    if (gamestate === 1 && !config?.config?.switch_section) {
      const time = new Date();
      time.setSeconds(time.getSeconds() + timeDuration);

      restart(time);
    }
  }, [currentSection]); // Reduced dependencies

  const handleComplete = () => {
    if (
      currentSection === sections.length - 1 ||
      config?.config?.switch_section == true
    ) {
      submitScore(answered || [], miscData || []);
    } else {
      setCurrentSection((prevSection) => prevSection + 1);

      setCurrentQ(
        questions.findIndex(
          (item) => item.id == organized[currentSection + 1].child[0].id,
        ),
      );

      addMiscItem({
        id: organized[currentSection + 1].child[0].id,
        status: "pending",
      });
    }
  };
  const alas = data;
  async function getPlays() {
    const { data, error } = await supabase
      .from("mock_plays")
      .select("id,created_at,test_id")
      .eq("user", userDetails?.email)
      .eq("test_id", alas.id);
    if (data) {
      if (data?.length > 0) setExists(true);
    }
  }
  async function submitScore(a, b) {
    const r = toast.loading("Submitting Test");

    setLoading(true);
    try {
      // Try server-side API route first (bypasses RLS)
      const headers = await getAuthHeaders();
      const apiRes = await axios.post(
        "/api/submitMock",
        {
          test_id: config?.id,
          report: a || [],
          data: b || [],
        },
        { headers },
      );
      if (apiRes.data?.data) {
        toast.success("Test Submitted Successfully");
        setLoading(false);
        setGameState(2);
        router.push(`/mock/result/${apiRes.data.data.uid}`);
        toast.remove(r);
        return;
      }
    } catch (err) {
      // API route failed, try direct supabase insert as fallback
    }

    try {
      // Fallback: direct supabase insert
      const { data, error } = await supabase
        .from("mock_plays")
        .insert({
          test_id: config?.id,
          status: "completed",
          report: a || [],
        })
        .select();
      if (data && data.length > 0) {
        toast.success("Test Submitted Successfully");
        setLoading(false);
        setGameState(2);
        router.push(`/mock/result/${data[0].uid}`);
        toast.remove(r);
      } else {
        toast.error(
          error?.message || "Unable to Submit Test. Please try again.",
        );
        setLoading(false);
        setGameState(1);
        toast.remove(r);
      }
    } catch (err2) {
      toast.error("Unable to Submit Test. Please try again.");
      setLoading(false);
      setGameState(1);
      toast.remove(r);
    }
  }

  useEffect(() => {
    if (userDetails != undefined) {
      getPlays();
    }
  }, [userDetails]);

  useEffect(() => {
    if (previewSections) return; // Skip client fetch in preview mode — data already initialized from props
    if (router.query.slug != undefined) {
      getSections(config?.id);
    }
  }, [router]);

  async function getSections(a) {
    const { data, error } = await supabase
      .from("mock_groups")
      .select("*,subject(*)")
      .eq("test", a)
      .order("seq", { ascending: true });
    if (data) {
      setSections(data);
      getModules(data);
    } else {
      /* router.push('/login') */
    }
  }

  async function getModules(a) {
    const { data, error } = await supabase
      .from("mock_groups")
      .select("*,module(*)")
      .in(
        "parent_sub",
        a.map((i) => i.id),
      );
    if (data) {
      setModules(data);
      getQuestions(data);
    } else {
      /* router.push('/login') */
    }
  }

  function clearResponse(id) {
    setAnswered((prevItems) => _.reject(prevItems, { id }));
  }

  function openFullscreen() {
    if (process.env.NODE_ENV == "development") {
      return null;
    }
    /* Get the documentElement (<html>) to display the page in fullscreen */
    let elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      /* IE11 */
      elem.msRequestFullscreen();
    }
  }
  function handleNext() {
    const p = _.last(organized).child;
    const t = _.last(p);
    if (t.id != questions[currentQ].id) {
      const filt = organized[currentSection].child;
      const ind = filt.findIndex((item) => item.id == questions[currentQ].id);
      const next = organized[currentSection].child[ind + 1] ?? null;

      if (next != null) {
        const questionIndex = questions.findIndex((item) => item.id == next.id);
        setCurrentQ(questionIndex);
        /* setCurrentID(questions[currentQ+1].id), */
        addMiscItem({ id: next.id, status: "pending" });
      } else {
        const isLast = _.isEqual(
          _.last(filt),
          _.find(filt, { id: questions[currentQ].id }),
        );

        if (isLast && config?.config?.switch_section == false) {
          toast.error(
            "You have reached end of questions in this section , please change to previous question from menu or wait for next section",
          );
          return null;
        }
        isLast
          ? (setCurrentSection((res) => res + 1),
            setCurrentQ(
              questions.findIndex(
                (item) => item.id == organized[currentSection + 1].child[0].id,
              ),
            ),
            addMiscItem({
              id: organized[currentSection + 1].child[0].id,
              status: "pending",
            }))
          : toast.error("invalid");
      }
    } else {
      toast.error(
        "You have reached end of questions, click on submit if you have finished your test",
      );
    }
  }
  /* const scrollButtonRef = useRef(null);

  const handleScroller = (direction) => {
    if (scrollButtonRef.current) {
      const scrollAmount = 100;
      const currentScroll = scrollButtonRef.current.scrollTop;
      const maxScroll = scrollButtonRef.current.scrollHeight - scrollButtonRef.current.clientHeight;

      if (direction === 'up' && currentScroll > 0) {
        scrollButtonRef.current.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      } else if (direction === 'down' && currentScroll < maxScroll) {
        scrollButtonRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
    }
  }; */
  function handlePrev() {
    const p = _.first(organized).child;
    const t = _.first(p);
    if (t.id != questions[currentQ].id) {
      const filt = organized[currentSection].child;
      const ind = filt.findIndex((item) => item.id == questions[currentQ].id);
      const prev = organized[currentSection].child[ind - 1] ?? null;

      if (prev != null) {
        const questionIndex = questions.findIndex((item) => item.id == prev.id);
        (setCurrentQ(questionIndex),
          addMiscItem({ id: prev.id, status: "pending" }));
      } else {
        const isFirst = _.isEqual(
          _.first(filt),
          _.find(filt, { id: questions[currentQ].id }),
        );

        isFirst
          ? (setCurrentSection((res) => res - 1),
            setCurrentQ(
              questions.findIndex(
                (item) => item.id == organized[currentSection - 1].child[0].id,
              ),
            ))
          : toast.error("invalid");
      }
    } else {
      toast.error("Cannot go beyond first question");
    }
  }
  function convertSeconds(totalSeconds) {
    // Ensure the input is a positive integer
    totalSeconds = _.toInteger(totalSeconds);

    // Calculate hours, minutes and seconds
    const hours = _.floor(totalSeconds / 3600);
    const minutes = _.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Add zero padding
    const paddedHours = _.padStart(hours, 2, "0");
    const paddedMinutes = _.padStart(minutes, 2, "0");
    const paddedSeconds = _.padStart(seconds, 2, "0");

    return `${paddedHours} : ${paddedMinutes} : ${paddedSeconds}`;
  }

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

  function isExpired(a) {
    const current = new Date();
    const end = new Date(a);

    return current > end;
  }

  function getStatus(a) {
    if (
      answered?.some((item) => item.id == a.id) &&
      miscData
        ?.filter((item) => item.status == "review")
        .some((item) => item.id == a.id)
    ) {
      return " aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md";
    }

    if (answered?.some((item) => item.id == a.id)) {
      return " aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md";
    }
    if (
      miscData
        ?.filter((item) => item.status == "review")
        .some((item) => item.id == a.id)
    ) {
      return "aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md";
    }
    if (miscData?.some((item) => item.id == a.id)) {
      return " aspect-square text-white w-12 flex flex-col items-center justify-center rounded-md bg-transparent";
    }
    return " border-1 text-black border-gray-400 aspect-square w-12 flex flex-col items-center justify-center rounded-md from-white to-gray-200 bg-gradient-to-b";
  }
  // (Legacy getStatusIcon removed — pentagon SVG icons no longer used; status is rendered via CSS chips inside the sidebar.)

  if (userDetails == undefined) {
    return (
      <div className="flex flex-col relative justify-center align-middle items-center text-center font-sans h-screen w-full">
        <div className="flex flex-col justify-center items-center">
          Please Login to access this test
          <Spacer y={2} x={2}></Spacer>
          <Button
            color="primary"
            size="sm"
            as={Link}
            href={`/login?redirectTo=${router.asPath}`}
          >
            Login or Create an Account
          </Button>
        </div>
      </div>
    );
  }
  if (
    config?.config?.allow_retests == false &&
    exists != undefined &&
    exists == true &&
    process.env.NODE_ENV != "development" &&
    router.query.preview !== "true"
  ) {
    return (
      <div className="flex flex-col relative justify-center align-middle items-center text-center font-sans h-screen w-full">
        <div className="flex flex-col justify-center items-center">
          You cannot reattempt this test.
          <br /> Please contact admin if you need help.
          <Spacer y={2} x={2}></Spacer>
          <Button color="primary" size="sm" as={Link} href={`/`}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  if (questions == undefined || questions?.length < 1) {
    return (
      <div className="flex flex-col relative  justify-center align-middle items-center text-center font-sans h-screen w-full">
        Loading...
      </div>
    );
  }

  if (is_allowed == false && process.env.NODE_ENV != "development") {
    return (
      <div
        className="flex flex-col w-full h-screen fixed left-0 top-0 justify-start md:justify-center items-center p-0 md:p-8"
        style={{ background: "var(--c-bg)" }}
      >
        <div className="w-full max-w-[800px]">
          <div
            className="w-full h-auto overflow-hidden rounded-none md:rounded-xl"
            style={{ border: "1px solid var(--c-border-faint)" }}
          >
            <img className="w-full h-full object-cover" src={data?.image} />
          </div>
          <div
            className="w-full text-center my-2"
            style={{
              padding: 20,
              borderRadius: 14,
              background: "var(--c-surface)",
              border: "1px solid var(--c-border-faint)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.01em" }}>
              Test Date: {CtoLocal(data.start_time).date}{" "}
              {CtoLocal(data.start_time).monthName}{" "}
              {CtoLocal(data.start_time).year}
            </h3>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--c-brand-primary)", letterSpacing: "-0.01em", marginTop: 4 }}>
              Test Time: {CtoLocal(data.start_time).time}{" "}
              {CtoLocal(data.start_time).amPm} onwards
            </h3>
            {data?.end_time && isExpired(data?.end_time) ? (
              <p
                className="mt-4"
                style={{
                  padding: "10px 16px", borderRadius: 12,
                  background: "var(--c-danger-soft)",
                  border: "1px solid var(--c-danger)",
                  color: "var(--c-danger)", fontWeight: 500,
                }}
              >
                Test Expired
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "var(--c-text-secondary)", margin: "12px 0", lineHeight: 1.55 }}>
                  Test is not unlocked yet.<br /> Please check again after the test start time.
                </p>
                <p
                  style={{
                    padding: "10px 16px", borderRadius: 12,
                    background: "var(--c-brand-primary-tint)",
                    border: "1px solid var(--c-brand-primary)",
                    color: "var(--c-brand-primary)", fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Remaining Time: {convertSeconds(remainingTime)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative font-sans h-screen p-0 justify-center align-middle items-center overflow-hidden max-h-[100vh] flex flex-col" style={{ background: "var(--c-bg)" }}>
      {/* <div className='fixed flex flex-col left-0 top-0 w-full h-full z-50 bg-white md:hidden justify-center items-center text-xs text-center'>
      For Best Experience Please use any device with bigger screen.<br/> This test cannot be performed on mobile display.
      
    </div> */}
      <Modal
        isOpen={submitModal}
        onClose={() => {
          setSubmitModal(false);
        }}
      >
        <ModalContent>
          <ModalHeader>Are you sure you want to submit test?</ModalHeader>
          <ModalBody>
            You have answered {answered?.length ?? 0} questions out of total{" "}
            {questions?.length} questions
          </ModalBody>
          <ModalFooter className="flex flex-row justify-start">
            <Button
              color="danger"
              size="sm"
              onPress={() => {
                setSubmitModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="default"
              className="from-primary border-1 border-white shadow-md shadow-primary-400 to-primary-600 bg-gradient-to-r text-white"
              onPress={() => {
                submitScore(answered || [], miscData || []);
                setSubmitModal(false);
              }}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <DraggableModal
        handleModal={() => setCalculatorActive(false)}
        closeable={false}
        open={calculatorActive}
      >
        {config?.config?.is_scientific ? (
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
      <div className="shadow-md w-full flex-nowrap flex-1 flex flex-col overflow-hidden" style={{ background: "var(--c-bg)" }}>
        <HeaderMock
          key={config?.title}
          calc={config?.config?.calculator_allowed ?? false}
          remainingTime={totalSeconds}
          openCalculator={() => {
            setCalculatorActive(true);
          }}
          state={gamestate}
          userData={userDetails}
          title={config?.title}
          timeOut={timeDuration}
        ></HeaderMock>
        <div className="flex-1 p-0 flex flex-row justify-start items-stretch flex-nowrap overflow-hidden">
          <div className="flex flex-col items-start justify-start h-full flex-1 relative overflow-hidden">
            {gamestate === 1 ? (
              <div className=" flex-col w-full px-6 py-2 hidden md:flex" style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border-faint)" }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 8 }}>Sections</div>
                <div className="w-full h-auto relative">
                  <ScrollShadow
                    ref={scrollRef}
                    orientation="horizontal"
                    className="flex w-full flex-row flex-shrink-0 flex-nowrap overflow-x-auto scrollbar-hide"
                  >
                    {organized &&
                      organized.map((i, d) => {
                        return (
                          <div
                            onClick={() => {
                              ((config?.config?.switch_section ||
                                process.env.NODE_ENV == "development") ??
                              false)
                                ? (setCurrentSection(d),
                                  setCurrentQ(
                                    questions.findIndex(
                                      (item) => item.id == i.child[0].id,
                                    ),
                                  ))
                                : toast.error(
                                    "You cannot switch sections in this test",
                                  );
                            }}
                            className={
                              "text-sm mx-1 my-1 px-4 py-2 rounded-full cursor-pointer flex-shrink-0 transition-all border-1 " +
                              (currentSection == d
                                ? "bg-primary text-white "
                                : "")
                            }
                          >
                            {i.title}
                          </div>
                        );
                      })}
                  </ScrollShadow>
                  <Button
                    onPress={() => {
                      handleScroll();
                    }}
                    isIconOnly
                    color="primary"
                    timeDuration
                    size="sm"
                    className="right-0 border-1 flex md:hidden border-white absolute top-1/2 -translate-y-1/2"
                  >
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z"
                        fill="#fff"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            ) : (
              ""
            )}

            <div className="flex flex-col flex-1 overflow-hidden w-full md:pb-0 pb-24">
              {gamestate == 0 ? (
                <div style={{ background: "var(--c-bg)", padding: "32px 40px 24px", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
                  <div style={{ maxWidth: 760, margin: "0 auto" }}>

                    {/* Step indicator */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        display: "grid", placeItems: "center",
                        fontSize: 12, fontWeight: 600,
                        background: insindex == 0 ? "var(--c-brand-primary)" : "var(--c-surface-sunken, var(--c-surface-muted))",
                        color: insindex == 0 ? "#fff" : "var(--c-text-tertiary)",
                        border: insindex == 0 ? "1px solid transparent" : "1px solid var(--c-border-soft)",
                      }}>1</div>
                      <div style={{ flex: 1, height: 1, background: "var(--c-border-soft)" }} />
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        display: "grid", placeItems: "center",
                        fontSize: 12, fontWeight: 600,
                        background: insindex == 1 ? "var(--c-brand-primary)" : "var(--c-surface-sunken, var(--c-surface-muted))",
                        color: insindex == 1 ? "#fff" : "var(--c-text-tertiary)",
                        border: insindex == 1 ? "1px solid transparent" : "1px solid var(--c-border-soft)",
                      }}>2</div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--c-text-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase", marginLeft: 6 }}>
                        Step {insindex + 1} of 2
                      </span>
                    </div>

                    {/* ===== Page 0: General instructions ===== */}
                    {insindex == 0 ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                          Before you begin
                        </div>
                        <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 600, letterSpacing: "-0.022em", color: "var(--c-text-primary)", lineHeight: 1.15 }}>
                          Read the{" "}
                          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
                            instructions
                          </span>{" "}
                          carefully.
                        </h1>
                        <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--c-text-secondary)", margin: "0 0 28px", maxWidth: "56ch" }}>
                          A quick walkthrough so you know exactly what to expect inside the test. You can switch sections, mark questions for review, and revisit anything you skipped.
                        </p>

                        {/* Phase 7.2: always render new JSX. Legacy admin HTML override
                            (config.config.instructions) contained pentagon SVG <img> tags + hardcoded
                            light-mode styles that broke dark mode — ignored on purpose. */}
                        <InsSection num={1} title="General instructions" />
                        <ol className="ins-list">
                          <li>The test contains <b>{organized?.reduce((a, s) => a + (s.child?.length || 0), 0) || "multiple"} questions</b> across <b>{organized?.length || "multiple"} section(s)</b>.</li>
                          <li>Total time for this test is <b>{Math.floor((config?.config?.timeout || 0) / 60)} minutes</b>.</li>
                          <li>The clock will be set at the top of your screen. The countdown timer will display the remaining time available for you to complete the test.</li>
                          <li>When the timer reaches zero, the test will end automatically and your answers will be submitted.</li>
                          <li>The question palette on the right side of the screen will show the status of each question.</li>
                        </ol>

                        <InsSection num={2} title="Question types" />
                        <ol className="ins-list">
                          <li><b>MCQ (Multiple Choice Questions):</b> Select one option from the given choices.</li>
                          <li><b>SA (Short Answer):</b> Type your numerical answer in the input box provided.</li>
                        </ol>

                        <InsSection num={3} title="Navigation" />
                        <ol className="ins-list">
                          <li>Click on the question number in the palette to go to that question directly.</li>
                          <li>Use the <b>Next</b> and <b>Previous</b> buttons to navigate between questions.</li>
                          <li>Click on the section names at the top to switch between sections.</li>
                          <li>You can mark a question for <b>review</b> using the Mark for review button.</li>
                        </ol>
                      </>
                    ) : ("")}

                    {/* ===== Page 1: Marking scheme + legend ===== */}
                    {insindex == 1 ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 10 }}>
                          Page 2 of 2
                        </div>
                        <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 600, letterSpacing: "-0.022em", color: "var(--c-text-primary)", lineHeight: 1.15 }}>
                          Marking scheme &amp;{" "}
                          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--c-brand-primary)" }}>
                            palette
                          </span>
                          .
                        </h1>
                        <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--c-text-secondary)", margin: "0 0 28px", maxWidth: "56ch" }}>
                          How you&apos;ll be scored and how to read the question palette on the right.
                        </p>

                        {/* Phase 7.2: always render new JSX. Legacy admin HTML override
                            (config.config.instructions2) was empty/whitespace for most tests, which
                            left this page blank in dark mode — ignored on purpose. */}
                        <InsSection num={1} title="Marking scheme" />
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, margin: "4px 0 8px", border: "1px solid var(--c-border-faint)", borderRadius: 12, overflow: "hidden", fontSize: 13.5 }}>
                          <thead>
                            <tr>
                              <th style={insTh}>Question type</th>
                              <th style={{ ...insTh, textAlign: "center" }}>Correct</th>
                              <th style={{ ...insTh, textAlign: "center" }}>Wrong</th>
                              <th style={{ ...insTh, textAlign: "center" }}>Unanswered</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ ...insTd, color: "var(--c-text-primary)", fontWeight: 500 }}>MCQ</td>
                              <td style={{ ...insTd, textAlign: "center", color: "var(--c-success)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>+4</td>
                              <td style={{ ...insTd, textAlign: "center", color: "var(--c-danger)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>−1</td>
                              <td style={{ ...insTd, textAlign: "center", color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>0</td>
                            </tr>
                            <tr>
                              <td style={{ ...insTd, color: "var(--c-text-primary)", fontWeight: 500 }}>Short Answer</td>
                              <td style={{ ...insTd, textAlign: "center", color: "var(--c-success)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>+4</td>
                              <td style={{ ...insTd, textAlign: "center", color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>0</td>
                              <td style={{ ...insTd, textAlign: "center", color: "var(--c-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>0</td>
                            </tr>
                          </tbody>
                        </table>

                        <InsSection num={2} title="Question palette legend" />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", margin: "8px 0 4px" }}>
                          <LegendCard color="gray" title="Not visited" sub="Not opened yet" />
                          <LegendCard color="#ef4444" title="Not answered" sub="Visited, no answer" />
                          <LegendCard color="#22c55e" title="Answered" sub="Saved with an answer" />
                          <LegendCard color="#a855f7" title="Marked for review" sub="Want to revisit later" />
                          <div style={{ gridColumn: "span 2" }}>
                            <LegendCard color="#22c55e" border="#a855f7" title="Answered & marked" sub="Saved but you'd like to revisit if time permits" />
                          </div>
                        </div>

                        <InsSection num={3} title="Important notes" />
                        <ol className="ins-list">
                          <li>Ensure you have a stable internet connection throughout the test.</li>
                          <li>Do not refresh the page during the test.</li>
                          <li>Click the <b>Submit</b> button when you&apos;re done. You&apos;ll be redirected to your results page.</li>
                        </ol>
                      </>
                    ) : ("")}
                  </div>

                  {/* Inline styles for the clean ordered list */}
                  <style jsx global>{`
                    .ins-list { padding-left: 0; margin: 0 0 8px; list-style: none; counter-reset: ipmstep; }
                    .ins-list > li {
                      position: relative; padding: 10px 0 10px 32px;
                      font-size: 14.5px; line-height: 1.6;
                      color: var(--c-text-secondary);
                      border-top: 1px solid var(--c-border-faint);
                    }
                    .ins-list > li:first-child { border-top: none; }
                    .ins-list > li::before {
                      counter-increment: ipmstep;
                      content: counter(ipmstep);
                      position: absolute; left: 0; top: 12px;
                      width: 20px; height: 20px; border-radius: 6px;
                      background: var(--c-surface-sunken, var(--c-surface-muted));
                      color: var(--c-text-tertiary);
                      font: 600 11px/20px Inter, sans-serif;
                      text-align: center;
                      border: 1px solid var(--c-border-faint);
                    }
                    .ins-list b { color: var(--c-text-primary); font-weight: 600; }
                  `}</style>
                </div>
              ) : (
                ""
              )}
              {gamestate == 1 ? (
                <>
                  <ScrollShadow className="w-full flex flex-col h-full justify-start align-start items-start overflow-y-auto">
                    <QuestionCard
                      index={questions[currentQ]?.seq}
                      onSelect={(e) =>
                        addItem({ ...e, at: timeDuration - totalSeconds })
                      }
                      answered={answered}
                      key={"ipmc" + currentQ}
                      question={questions[currentQ]}
                    />
                  </ScrollShadow>
                </>
              ) : (
                ""
              )}

              {gamestate == 2 ? (
                <>
                  <div className="w-full h-full text-center flex flex-col justify-center align-middle items-center">
                    <h2 className="text-2xl text-center text-primary px-6 w-full">
                      Your Responses have been submitted and now you are being
                      redirected to results page.
                    </h2>
                  </div>
                </>
              ) : (
                ""
              )}
            </div>

            <div
              className=" bg-gradient-to-t opacity-40 md:opacity-100 from-primary to-primary-700 p-1 py-4 absolute right-0 top-1/2 -translate-y-1/2 rounded-l-xl cursor-pointer"
              onClick={() => {
                setSidebarActive(!sideBarActive);
              }}
            >
              <svg
                width="24"
                height="24"
                fill="none"
                className={
                  " transition-all " + (sideBarActive ? "rotate-180" : "")
                }
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z"
                  fill="#fff"
                />
              </svg>
            </div>
            {gamestate < 2 ? (
              <FooterMock
                config={config?.config}
                isLoading={loading}
                index={insindex}
                onInstruct={(e) => {
                  setInsIndex(e);
                }}
                onStart={() => {
                  (setGameState(1),
                    setCurrentQ(
                      questions.findIndex(
                        (item) => item.id == organized[0]?.child[0]?.id,
                      ),
                    ),
                    addMiscItem({
                      id: organized[0]?.child[0]?.id,
                      status: "pending",
                    }),
                    openFullscreen());
                }}
                state={gamestate}
                onNext={() => {
                  handleNext();
                }}
                onPrev={() => {
                  handlePrev();
                }}
                onReview={() => {
                  (addMiscItem({
                    id: questions[currentQ].id,
                    status: "review",
                  }),
                    toast.success("Marked for Review"));
                }}
                onClear={() => {
                  clearResponse(questions[currentQ].id);
                }}
                onSubmit={() => {
                  setSubmitModal(true);
                }}
                onSaveNext={() => {}}
              ></FooterMock>
            ) : (
              ""
            )}
          </div>
          <div
            className={
              "flex h-full flex-col w-full max-w-0 transition-all z-[20] ease-in-out duration-100 translate-x-full fixed right-0 top-0 lg:relative lg:translate-x-0 " +
              (sideBarActive ? " !max-w-[400px] !translate-x-0" : "")
            }
            style={{
              background: "var(--c-surface)",
              borderLeft: "1px solid var(--c-border-faint)",
            }}
          >
            <div
              className="w-auto h-auto bottom-8 lg:hidden flex absolute p-2"
              style={{
                background: "var(--c-brand-primary)",
                borderRadius: "0 12px 12px 0",
                cursor: "pointer",
              }}
              onClick={() => {
                setSidebarActive(false);
              }}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z"
                  fill="#fff"
                />
              </svg>
            </div>
            <div
              className={
                "w-full flex-col hidden " + (sideBarActive ? " !flex " : "")
              }
            >
              {gamestate == 0 ? (
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      background: "var(--c-surface-muted, var(--c-bg))",
                      border: "1px solid var(--c-border-faint)",
                      borderRadius: 14,
                      padding: 16,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <Avatar
                      src={userDetails?.user_metadata?.profile_pic || ""}
                      fallback={(userDetails?.user_metadata?.full_name || "S").split(" ").filter(Boolean).slice(0,2).map((s)=>s[0]).join("").toUpperCase()}
                      className="w-16 h-16"
                    ></Avatar>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-text-tertiary)" }}>
                        Signed in as
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--c-text-primary)", letterSpacing: "-0.015em", marginTop: 2 }}>
                        {userDetails?.user_metadata?.full_name || "Student"}
                      </div>
                    </div>
                  </div>

                  {/* Test summary — matches Phase 7 preview side card */}
                  <div style={{ height: 1, background: "var(--c-border-faint)", margin: "20px 0" }} />
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--c-text-tertiary)", marginBottom: 14 }}>
                    Test summary
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                    <span style={{ color: "var(--c-text-tertiary)" }}>Test name</span>
                    <span style={{ color: "var(--c-text-primary)", fontWeight: 500 }}>{data?.[0]?.title || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                    <span style={{ color: "var(--c-text-tertiary)" }}>Total questions</span>
                    <span style={{ color: "var(--c-text-primary)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {organized?.reduce((a, s) => a + (s.child?.length || 0), 0) || "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                    <span style={{ color: "var(--c-text-tertiary)" }}>Sections</span>
                    <span style={{ color: "var(--c-text-primary)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {organized?.length || "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                    <span style={{ color: "var(--c-text-tertiary)" }}>Duration</span>
                    <span style={{ color: "var(--c-text-primary)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {Math.floor((config?.config?.timeout || 0) / 60)} min
                    </span>
                  </div>
                  <div style={{ height: 1, background: "var(--c-border-faint)", margin: "20px 0" }} />
                  <div style={{ fontSize: 12, color: "var(--c-text-tertiary)", lineHeight: 1.6 }}>
                    Once you click &quot;I&apos;m ready to begin,&quot; the timer starts. You can&apos;t pause the test once it has started.
                  </div>
                </div>
              ) : (
                ""
              )}

              {gamestate == 1 ? (
                <>
                  <div className="font-sans flex flex-row flex-wrap text-xs w-full" style={{ padding: 16, color: "var(--c-text-secondary)" }}>
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#22c55e", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13 }}>
                        {answered?.length || 0}
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Answered</p>
                    </div>
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ef4444", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13 }}>
                        {(miscData?.length || 0) - (answered?.length || 0)}
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Not Answered</p>
                    </div>
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-bg)", color: "var(--c-text-secondary)", border: "1px solid var(--c-border-soft)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13 }}>
                        {questions?.length - (miscData?.length || 0)}
                      </div>

                      <Spacer x={2} y={2}></Spacer>
                      <p>Not Visited</p>
                    </div>
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#a855f7", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13 }}>
                        {miscData?.filter((item) => item.status == "review")?.length || 0}
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Marked for Review</p>
                    </div>
                    <div className=" w-full flex-row flex items-center justify-start p-1 relative">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#22c55e", border: "2px solid #a855f7", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13 }}>
                        {miscData?.filter((item1) => answered?.map((item2) => item2.id).includes(item1.id))?.length || 0}
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Answered & Marked for Review</p>
                    </div>
                  </div>
                  <div style={{ padding: "12px 24px", background: "var(--c-bg)", color: "var(--c-text-secondary)", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", borderTop: "1px solid var(--c-border-faint)", borderBottom: "1px solid var(--c-border-faint)" }}>
                    {organized[currentSection]?.title}
                  </div>
                  <div className="p-4" style={{ background: "var(--c-bg)" }}>
                    {config?.config?.switch_questions == true ? (
                      <h2>Choose a Question</h2>
                    ) : (
                      ""
                    )}
                    <div className="flex flex-row relative items-center justify-start flex-wrap">
                      {organized &&
                        organized[currentSection]?.child.map((i, d) => {
                          return (
                            <button
                              key={i.id}
                              onClick={() => {
                                (config?.config?.switch_questions ?? false)
                                  ? (setCurrentQ(questions.findIndex((item) => item.id == i.id)), addMiscItem({ id: i.id, status: "pending" }))
                                  : toast.error("You cannot switch question in this test.");
                              }}
                              style={(function(){
                                const isAns = answered?.some((a) => a.id == i.id);
                                const isMk = miscData?.filter((m) => m.status == "review").some((m) => m.id == i.id);
                                const isVis = miscData?.some((m) => m.id == i.id);
                                let bg = "var(--c-bg)", col = "var(--c-text-secondary)", bd = "var(--c-border-soft)";
                                if (isAns && isMk) { bg = "#22c55e"; col = "#fff"; bd = "#a855f7"; }
                                else if (isAns) { bg = "#22c55e"; col = "#fff"; bd = "#16a34a"; }
                                else if (isMk) { bg = "#a855f7"; col = "#fff"; bd = "#9333ea"; }
                                else if (isVis) { bg = "#ef4444"; col = "#fff"; bd = "#dc2626"; }
                                return { width: 40, height: 40, margin: 4, background: bg, color: col, border: "1px solid " + bd, borderRadius: 8, fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", cursor: "pointer", display: "grid", placeItems: "center", fontFamily: "inherit" };
                              })()}
                            >
                              {d + 1}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              ) : (
                ""
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTest;

export async function getServerSideProps(context) {
  const p = context?.query?.private == "true";

  // Try service role client first, fall back to anon client
  let data, error;
  ({ data, error } = await serversupabase
    .from("mock_test")
    .select("*")
    .eq("uid", context.query.slug));

  // If service role client fails, try anon client as fallback
  if (error || !data || data.length === 0) {
    const { supabase: anonClient } = require("@/utils/supabaseClient");
    const result = await anonClient
      .from("mock_test")
      .select("*")
      .eq("uid", context.query.slug);
    if (result.data && result.data.length > 0) {
      data = result.data;
      error = null;
    }
  }

  if (error || !data || data.length === 0) {
    return { notFound: true };
  }

  function getStatus(givenStartTime, givenEndTime) {
    const currentTime = new Date();
    const startTime = givenStartTime ? new Date(givenStartTime) : null;
    const endTime = givenEndTime ? new Date(givenEndTime) : null;

    if (startTime && endTime) {
      return currentTime > startTime && currentTime < endTime;
    }
    if (startTime) {
      return currentTime > startTime;
    }
    if (endTime) {
      return currentTime < endTime;
    }

    return true; // Return true if no time limits are set
  }

  const props = {
    config: data[0],
    is_allowed:
      (data[0]?.start_time || data[0]?.end_time) && p == false
        ? getStatus(data[0]?.start_time, data[0]?.end_time)
        : true,
    data: data[0],
  };

  // For preview mode, preload all test data server-side (bypasses RLS)
  if (context?.query?.preview === "true") {
    try {
      const testId = data[0].id;
      console.log("[Preview] Loading data for test ID:", testId);

      // Load ALL groups for this test (both subject and module types)
      const { data: allGroups, error: groupsErr } = await serversupabase
        .from("mock_groups")
        .select("*,subject(*),module(*)")
        .eq("test", testId)
        .order("seq", { ascending: true });

      console.log(
        "[Preview] Groups loaded:",
        allGroups?.length,
        "Error:",
        groupsErr?.message,
      );

      if (allGroups && allGroups.length > 0) {
        // Separate subject-type (sections) and module-type (modules)
        const sectionsData = allGroups.filter((g) => g.type === "subject");
        const modulesData = allGroups.filter((g) => g.type === "module");

        console.log(
          "[Preview] Sections:",
          sectionsData.length,
          "Modules:",
          modulesData.length,
        );

        if (modulesData.length > 0) {
          // Load questions for all modules
          const moduleIds = modulesData
            .filter((m) => m.module)
            .map((m) => m.module.id);

          console.log("[Preview] Loading questions for module IDs:", moduleIds);

          const { data: questionsData, error: qErr } = await serversupabase
            .from("mock_questions")
            .select("*")
            .in("parent", moduleIds)
            .order("seq", { ascending: true });

          console.log(
            "[Preview] Questions loaded:",
            questionsData?.length,
            "Error:",
            qErr?.message,
          );

          props.previewSections = sectionsData;
          props.previewModules = modulesData;
          props.previewQuestions = questionsData || [];
        } else {
          console.log("[Preview] No modules found, setting empty arrays");
          props.previewSections = sectionsData;
          props.previewModules = [];
          props.previewQuestions = [];
        }
      } else {
        console.log("[Preview] No groups found for test");
      }
    } catch (e) {
      console.error("[Preview] Error preloading data:", e);
    }
  }

  return { props };
}
