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
    return <div>Question Undefined </div>;
  }
  return (
    <div className="font-sans w-full  flex-1 justify-start align-middle items-start flex flex-col text-left ">
      <div className=" rounded-xl w-full p-4 lg:p-8 relative">
        <h2 className="font-medium text-md text-primary">Question {index}</h2>
        <Divider className="my-2"></Divider>
        <h2 className="font-bold text-2xl text-primary">
          {question?.title}{" "}
          {process.env.NODE_ENV == "development" ? (
            <>Question ID {question.id}</>
          ) : (
            ""
          )}
        </h2>
        <Spacer y={4}></Spacer>
        <div className="w-full flex flex-col">
          <ScrollShadow
            className="font-medium text-sm  qcontent overflow-y-auto max-h-[40vh] lg:max-h-[40vh]"
            dangerouslySetInnerHTML={{ __html: question.question }}
          ></ScrollShadow>
          <Spacer y={4}></Spacer>
          <Divider></Divider>
          <Spacer y={4}></Spacer>
          {question && question?.questionimage != undefined ? (
            <img className="max-h-[30vh]" src={question?.questionimage} />
          ) : (
            ""
          )}
          <ul className="p-0">
            {question?.type == "options" ? (
              <>
                <RadioGroup
                  label={question?.label || "Select the correct option"}
                  value={
                    answered?.filter((item) => item.id == question.id)[0]
                      ?.value || ""
                  }
                  onValueChange={(e) => {
                    onSelect({ id: question.id, value: e });
                  }}
                >
                  {question.options.map((option, index) => (
                    <Radio
                      className="flex flex-row items-center justify-start"
                      value={index + 1}
                      key={index}
                    >
                      {option?.image != undefined ? (
                        <img
                          src={option?.image}
                          className="w-auto h-full max-h-12 object-contain"
                        />
                      ) : (
                        <>
                          <p className="text-sm">{option.title}</p>{" "}
                          {process.env.NODE_ENV == "development" &&
                          option.isCorrect ? (
                            <div className="rounded-full w-1 h-1 bg-green-500"></div>
                          ) : (
                            ""
                          )}
                        </>
                      )}
                    </Radio>
                  ))}
                </RadioGroup>
              </>
            ) : (
              <></>
            )}
            {question?.type == "input" ? (
              <>
                <Spacer y={4}></Spacer>
                <Input
                  value={
                    answered?.filter((item) => item.id == question.id)[0]
                      ?.value || ""
                  }
                  onChange={(e) => {
                    onSelect({ id: question.id, value: e.target.value });
                  }}
                  placeholder="Enter your Answer Here"
                  label="Answer"
                ></Input>
                {process.env.NODE_ENV == "development" ? (
                  <>Answer : {question?.options?.answer}</>
                ) : (
                  ""
                )}
                <Spacer y={4}></Spacer>
              </>
            ) : (
              ""
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const MockTest = ({ config, is_allowed, data }) => {
  const [level, setLevel] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);

  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const [sideBarActive, setSidebarActive] = useState(!isMobile);
  const [answered, setAnswered] = useState();
  const [miscData, setMiscData] = useState();
  const [sections, setSections] = useState();
  const [modules, setModules] = useState();
  const [currentSection, setCurrentSection] = useState(0);
  const [insindex, setInsIndex] = useState(0);
  const [calculatorActive, setCalculatorActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [gamestate, setGameState] = useState(0);
  const [questions, setQuestions] = useState();
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
    [data?.start_time]
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
        a.map((i) => i.module.id)
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
      const r = sections.map((section) => ({
        title: section.subject.title,
        child: modules
          .filter((b) => b.parent_sub == section.id)
          .flatMap((z) =>
            questions
              .filter((question) => question.parent === z.module.id)
              .sort((a, b) => a.seq - b.seq)
              .map((lp) => ({ id: lp.id, index: questionIndex++ }))
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

  const timeDuration = config?.config?.switch_section
    ? Number(config?.config?.timeout) || 1800 // Ensure timeout is a valid number
    : Number(sections?.[currentSection]?.time) || 1800; // Ensure section time is valid

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
      setGameState(2);
      submitScore(answered, miscData);
    } else {
      setCurrentSection((prevSection) => prevSection + 1);

      setCurrentQ(
        questions.findIndex(
          (item) => item.id == organized[currentSection + 1].child[0].id
        )
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
    if (a == undefined || b == undefined) {
      toast.error("Please attemp the test before submit");
      return null;
    }

    const r = toast.loading("Submitting Test");

    setLoading(true);
    const { data, error } = await supabase
      .from("mock_plays")
      .insert({
        test_id: config?.id,
        status: "completed",
        report: a,
      })
      .select();
    if (data && data.length != 0) {
      toast.success("Submitted Answered");
      setLoading(false);
      setGameState(2);
      router.push(`/mock/result/${data[0].uid}`);
      toast.remove(r);
    } else {
      toast.success("Unable to Submit");
      setLoading(false);
      toast.remove(r);
    }
  }

  useEffect(() => {
    if (userDetails != undefined) {
      getPlays();
    }
  }, [userDetails]);

  useEffect(() => {
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
        a.map((i) => i.id)
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
          _.find(filt, { id: questions[currentQ].id })
        );

        if (isLast && config?.config?.switch_section == false) {
          toast.error(
            "You have reached end of questions in this section , please change to previous question from menu or wait for next section"
          );
          return null;
        }
        isLast
          ? (setCurrentSection((res) => res + 1),
            setCurrentQ(
              questions.findIndex(
                (item) => item.id == organized[currentSection + 1].child[0].id
              )
            ),
            addMiscItem({
              id: organized[currentSection + 1].child[0].id,
              status: "pending",
            }))
          : toast.error("invalid");
      }
    } else {
      toast.error(
        "You have reached end of questions, click on submit if you have finished your test"
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
        setCurrentQ(questionIndex),
          addMiscItem({ id: prev.id, status: "pending" });
      } else {
        const isFirst = _.isEqual(
          _.first(filt),
          _.find(filt, { id: questions[currentQ].id })
        );

        isFirst
          ? (setCurrentSection((res) => res - 1),
            setCurrentQ(
              questions.findIndex(
                (item) => item.id == organized[currentSection - 1].child[0].id
              )
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
  function getStatusIcon(a) {
    if (
      answered?.some((item) => item.id == a.id) &&
      miscData
        ?.filter((item) => item.status == "review")
        .some((item) => item.id == a.id)
    ) {
      return (
        <img
          className=" z-0 absolute left-0 top-0 w-full h-full object-contain"
          src="/amr.svg"
        />
      );
    }

    if (answered?.some((item) => item.id == a.id)) {
      return (
        <img
          className=" z-0 absolute left-0 top-0 w-full h-full object-contain"
          src="/sc.svg"
        />
      );
    }
    if (
      miscData
        ?.filter((item) => item.status == "review")
        ?.some((item) => item.id == a.id)
    ) {
      return (
        <img
          className=" z-0 absolute left-0 top-0 w-full h-full object-contain"
          src="/mr.svg"
        />
      );
    }
    if (miscData?.some((item) => item.id == a.id)) {
      return (
        <img
          className=" -z-[10] absolute left-0 top-0 w-full h-full object-contain"
          src="/na.svg"
        />
      );
    }
    return "";
  }

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
    process.env.NODE_ENV != "development"
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
  if (questions == undefined && questions?.length < 1) {
    return (
      <div className="flex flex-col relative  justify-center align-middle items-center text-center font-sans h-screen w-full">
        Loading...
      </div>
    );
  }

  if (is_allowed == false && process.env.NODE_ENV != "development") {
    return (
      <div className="flex flex-col w-full h-screen fixed left-0 top-0 justify-start  md:justify-center items-center p-0 md:p-8 bg-gray-50">
        <div className="w-full max-w-[800px]">
          <div className="w-full h-auto overflow-hidden rounded-none md:rounded-xl shadow-md border-1 border-gray-300">
            <img className="w-full h-full object-cover" src={data?.image} />
          </div>
          <div className="w-full bg-white shadow-md rounded-xl p-2 my-2 text-center ">
            <h3 className="text-xl font-semibold text-primary">
              Test Date : {CtoLocal(data.start_time).date}{" "}
              {CtoLocal(data.start_time).monthName}{" "}
              {CtoLocal(data.start_time).year}{" "}
            </h3>
            <h3 className="text-xl font-semibold text-secondary">
              Test Time : {CtoLocal(data.start_time).time}{" "}
              {CtoLocal(data.start_time).amPm} Onwards
            </h3>
            {data?.end_time && isExpired(data?.end_time) ? (
              <>
                <p className="p-2 rounded-xl mt-4 bg-red-50 border-1 border-red-300 text-red-600">
                  Test Expired
                </p>
              </>
            ) : (
              <>
                <p className="text-sm my-2">
                  Test is not unlocked yet ,<br /> Please check again later
                  after the test start time
                </p>
                <p className="border-primary border-1 bg-primary-50 rounded-xl text-primary py-2 font-semibold">
                  Remaining Time : {convertSeconds(remainingTime)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative font-sans h-screen p-0 justify-center align-middle items-center overflow-hidden max-h-[100vh] flex flex-col bg-gray-200">
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
                submitScore(answered, miscData), setSubmitModal(false);
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
      <div className="bg-white shadow-md w-full flex-nowrap flex-1 flex flex-col overflow-hidden">
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
          timeOut={config?.config?.timeout || 1800}
        ></HeaderMock>
        <div className="flex-1 p-0 flex flex-row justify-start items-start flex-nowrap overflow-hidden">
          <div className="flex flex-col items-start justify-start h-full flex-1 relative overflow-hidden">
            {gamestate === 1 ? (
              <div className=" flex-col w-full px-6 py-2 hidden md:flex">
                <div>Sections</div>
                <Divider></Divider>
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
                              (config?.config?.switch_section ||
                                process.env.NODE_ENV == "development") ??
                              false
                                ? (setCurrentSection(d),
                                  setCurrentQ(
                                    questions.findIndex(
                                      (item) => item.id == i.child[0].id
                                    )
                                  ))
                                : toast.error(
                                    "You cannot switch sections in this test"
                                  );
                            }}
                            className={
                              "text-sm mx-1 my-1 px-4 py-2 rounded-xl bg-gray-50 cursor-pointer hover:border-primary border-transparent border-1 shadow-md flex-shrink-0 " +
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

            <div className="flex flex-col flex-1 overflow-hidden w-full md:pb-0 pb-12">
              {gamestate == 0 ? (
                <div className="p-6">
                  {insindex == 0 ? (
                    <>
                      <h2 className="font-bold text-xl text-primary">
                        Instructions
                      </h2>
                      <div
                        className="text-xs font-sans overflow-y-auto max-h-[70vh]"
                        dangerouslySetInnerHTML={{
                          __html: config?.config?.instructions,
                        }}
                      ></div>
                    </>
                  ) : (
                    ""
                  )}
                  {insindex == 1 ? (
                    <>
                      <div
                        className="text-xs font-sans overflow-y-auto max-h-[70vh]"
                        dangerouslySetInnerHTML={{
                          __html: config?.config?.instructions2,
                        }}
                      ></div>
                    </>
                  ) : (
                    ""
                  )}
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
                  setGameState(1),
                    setCurrentQ(
                      questions.findIndex(
                        (item) => item.id == organized[0]?.child[0]?.id
                      )
                    ),
                    addMiscItem({
                      id: organized[0]?.child[0]?.id,
                      status: "pending",
                    }),
                    openFullscreen();
                }}
                state={gamestate}
                onNext={() => {
                  handleNext();
                }}
                onPrev={() => {
                  handlePrev();
                }}
                onReview={() => {
                  addMiscItem({ id: questions[currentQ].id, status: "review" }),
                    toast.success("Marked for Review");
                }}
                onClear={() => {
                  clearResponse(questions[currentQ].id);
                }}
                onSubmit={() => {
                  answered?.length > 0
                    ? setSubmitModal(true)
                    : toast.error(
                        "Please attempt at least 1 question to submit the test"
                      );
                }}
                onSaveNext={() => {}}
              ></FooterMock>
            ) : (
              ""
            )}
          </div>
          <div
            className={
              "flex h-full flex-col w-full max-w-0 bg-white shadow-[-2px_-2px_12px_-6px_#6663] transition-all z-[20] ease-in-out duration-100 translate-x-full fixed right-0 top-0  lg:relative  lg:translate-x-0 " +
              (sideBarActive ? " !max-w-[400px] !translate-x-0" : "")
            }
          >
            <div
              className="bg-primary w-auto h-auto bottom-8 lg:hidden flex  absolute p-2 rounded-r-xl"
              onClick={() => {
                setSidebarActive(false);
              }}
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
            </div>
            <div
              className={
                "w-full flex-col hidden " + (sideBarActive ? " !flex " : "")
              }
            >
              {gamestate == 0 ? (
                <div className="p-4">
                  <div className="p-4 rounded-xl border-1 border-gray-200 flex flex-row">
                    <Avatar
                      src={userDetails?.user_metadata?.profile_pic || ""}
                      className="w-32 h-32"
                    ></Avatar>
                    <div className="flex flex-col p-2 px-4">
                      <h2 className="text-xl font-bold text-primary">
                        {userDetails?.user_metadata?.full_name}
                      </h2>
                    </div>
                  </div>
                </div>
              ) : (
                ""
              )}

              {gamestate == 1 ? (
                <>
                  <div className="p-4 font-sans flex flex-row flex-wrap text-xs w-full">
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div className="w-8 h-8 relative">
                        <img
                          className="w-full h-full object-contain z-0"
                          src="/sc.svg"
                        />
                        <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                          <p className="text-white flex text-center">
                            {answered?.length || 0}
                          </p>
                        </div>
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Answered</p>
                    </div>
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div className="w-8 h-8 relative">
                        <img
                          className="w-full h-full object-contain z-0"
                          src="/na.svg"
                        />
                        <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                          <p className="text-white flex text-center">
                            {(miscData?.length || 0) - (answered?.length || 0)}
                          </p>
                        </div>
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Not Answered</p>
                    </div>
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div className="w-8 h-8 relative">
                        <div className="w-8 h-8 object-contain border-1 text-black border-gray-400 aspect-square flex flex-col items-center justify-center rounded-md from-white to-gray-200 bg-gradient-to-b" />
                        <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                          <p className="text-black flex text-center">
                            {questions?.length - (miscData?.length || 0)}
                          </p>
                        </div>
                      </div>

                      <Spacer x={2} y={2}></Spacer>
                      <p>Not Visited</p>
                    </div>
                    <div className=" w-1/2 flex-row flex items-center justify-start p-1">
                      <div className="w-8 h-8 relative">
                        <img
                          className="w-full h-full object-contain z-0"
                          src="/mr.svg"
                        />
                        <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                          <p className="text-white flex text-center">
                            {miscData?.filter((item) => item.status == "review")
                              ?.length || 0}
                          </p>
                        </div>
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Marked for Review</p>
                    </div>
                    <div className=" w-full flex-row flex items-center justify-start p-1 relative">
                      <div className="w-8 h-8 relative">
                        <img
                          className="w-full h-full object-contain z-0"
                          src="/amr.svg"
                        />
                        <div className="absolute left-0 top-0 w-full h-full flex flex-col z-10 justify-center items-center mt-[1px]">
                          <p className="text-white flex text-center">
                            {miscData?.filter((item1) =>
                              answered
                                ?.map((item2) => item2.id)
                                .includes(item1.id)
                            )?.length || 0}
                          </p>
                        </div>
                      </div>
                      <Spacer x={2} y={2}></Spacer>
                      <p>Answered & Marked for Review</p>
                    </div>
                  </div>
                  <div className="bg-primary text-xs px-6 p-4 text-white">
                    {organized[currentSection]?.title}
                  </div>
                  <div className="p-4 bg-primary-50">
                    {config?.config?.switch_questions == true ? (
                      <h2>Choose a Question</h2>
                    ) : (
                      ""
                    )}
                    <div className="flex flex-row relative items-center justify-start flex-wrap">
                      {organized &&
                        organized[currentSection]?.child.map((i, d) => {
                          return (
                            <div
                              className="p-1 relative group"
                              onClick={() => {
                                config?.config?.switch_questions ?? false
                                  ? (setCurrentQ(
                                      questions.findIndex(
                                        (item) => item.id == i.id
                                      )
                                    ),
                                    addMiscItem({
                                      id: i.id,
                                      status: "pending",
                                    }))
                                  : toast.error(
                                      "You cannot switch question in this test."
                                    );
                              }}
                            >
                              <div className="absolute left-0 top-0 opacity-0 group-hover:opacity-100 w-full h-full transition-all group-hover:scale-95 scale-75 z-[1] border-1 border-secondary-400 rounded-md"></div>
                              <div
                                className={
                                  "p-1 z-10 cursor-pointer flex flex-col items-center justify-center relative font-sans " +
                                  getStatus(i)
                                }
                              >
                                <p className="z-10  mt-[4px]">{d + 1}</p>
                                {getStatusIcon(i)}
                              </div>
                            </div>
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
  const { data, error } = await serversupabase
    .from("mock_test")
    .select("*")
    .eq("uid", context.query.slug);
  if (error || data?.length == 0) {
    return { notFound: true };
  }
  if (data) {
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

  return {
    props: {
      config: data[0],
      is_allowed:
        (data[0]?.start_time || data[0]?.end_time) && p == false
          ? getStatus(data[0]?.start_time, data[0]?.end_time)
          : true,
      data: data[0],
    },
  };
}
