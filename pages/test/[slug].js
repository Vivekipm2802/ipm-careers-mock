import React, { useState, useEffect } from "react";
import Flasher from "@/components/Flasher";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  Spacer,
} from "@nextui-org/react";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import HeaderMock from "./components/HeaderMock";
import { useTimer } from "react-timer-hook";
import { useNMNContext } from "@/components/NMNContext";
import { useMediaQuery } from "react-responsive";
import QuestionBrowser, { getStatusIcon } from "./components/QuestionBrowser";
import QuestionCard from "./components/QuestionCard";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Grip,
  Home,
  X,
  XCircle,
} from "lucide-react";
import Leaderboard from "./components/Leaderboard2";
import DraggableModal from "../mock/components/Modal";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "react-hot-toast";

const Game = () => {
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const [sideBarActive, setSidebarActive] = useState(!isMobile);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isHintAvailable, setIsHintAvailable] = useState(true);
  const [isHintVisible, setisHintVisible] = useState(false);
  const [config, setConfig] = useState({
    increment: 4,
    decrement: 1,
  });
  const [gamestate, setGameState] = useState(0);
  const [questions, setQuestions] = useState();
  const [parentData, setParentData] = useState();
  const [leaderboard, setLeaderBoard] = useState();
  const [report, setReport] = useState([]);
  const [tempAnswers, setTempAnswers] = useState({}); // For immediate icon feedback
  const [activeExplanation, setActiveExplanation] = useState();
  const [drawerActive, setDrawerActive] = useState(false);
  const [calculatorActive, setCalculatorActive] = useState(false);
  const [submitted, setSubmitted] = useState();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const { userDetails } = useNMNContext();
  const [confirmModal, setConfirmModal] = useState(false);
  const router = useRouter();

  async function submitScore(a) {
    const { data, error } = await supabase
      .from("plays")
      .insert({
        test_uuid: parentData?.uuid,
        report: a,
        score,
      })
      .select();
    if (data && data.length != 0) {
      setSubmitted(data[0]);
      getLeaderboard(parentData?.uuid);
    }
  }

  async function checkMultiple(uid) {
    setLoading(true);

    const { data, error } = await serversupabase
      .from("plays")
      .select("id")
      .eq("test_uuid", router.query.slug)
      .eq("isPassed", true)
      .eq("user", uid);

    setLoading(false);
    if (data && data?.length > 0) {
      setAllowed(false);
      return;
    } else {
      setAllowed(true);
    }
  }
  const timeDuration = parentData?.time * 60;

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
  }, [gamestate, restart, timeDuration]);

  const handleComplete = () => {
    setGameState(2);
    submitScore(report);
  };

  async function getQuestions() {
    const { data, error } = await supabase
      .from("levels")
      .select("*,questions!questions_parent_fkey(*)")
      .eq("uuid", router.query.slug)
      .order("seq", { foreignTable: "questions", ascending: true });
    if (data) {
      setQuestions(data[0]?.questions);

      const parent = { ...data[0] };
      delete parent["questions"];
      setParentData(parent);
      if (data.length == 0) {
        router.push("/404");
      }
    } else {
    }
  }
  async function getLeaderboard(a) {
    const { data, error } = await supabase
      .from("plays")
      .select("id,created_at,score,user,name,isPassed,test_uuid")
      .eq("test_uuid", a)
      .order("score", { ascending: false })
      .limit(20);
    if (data && data.length != 0) {
      setLeaderBoard(data);
    }
  }

  useEffect(() => {
    if (router.query.slug != undefined && userDetails != undefined) {
      getQuestions();
      checkMultiple(userDetails?.email);
    }
  }, [router, userDetails]);

  const addToReport = (newObject) => {
    setReport((prevReport) => {
      const existingIndex = prevReport.findIndex(
        (item) => item.id === newObject.id
      );

      if (existingIndex !== -1) {
        // Update existing object
        const updatedReport = [...prevReport];
        updatedReport[existingIndex] = {
          ...updatedReport[existingIndex],
          ...newObject,
        };
        return updatedReport;
      } else {
        // Add new object
        return [...prevReport, newObject];
      }
    });
  };

  const handleTempAnswer = (answerData) => {
    // Update temporary answers for immediate icon feedback
    setTempAnswers((prev) => ({
      ...prev,
      [answerData.id]: answerData,
    }));
  };

  const handleClearResponse = (questionId) => {
    // Remove from report
    setReport((prevReport) => {
      return prevReport.filter((item) => item.id !== questionId);
    });

    // Remove from temp answers
    setTempAnswers((prev) => {
      const newTemp = { ...prev };
      delete newTemp[questionId];
      return newTemp;
    });
  };

  const handleSubmit = (answerData) => {
    // Clear temp answer when actually submitting
    setTempAnswers((prev) => {
      const newTemp = { ...prev };
      delete newTemp[answerData.id];
      return newTemp;
    });
    const { selectedOption, options, id, type, value } = answerData;
    let isCorrect = false;
    let answer = "";

    if (type === "options") {
      const currentOption = options?.[selectedOption - 1];
      isCorrect = currentOption?.isCorrect;
      answer = currentOption?.title;
    } else if (type === "input") {
      // Handle input type questions
      isCorrect = value === options?.answer; // Assuming 'answer' is the correct value
      answer = value;
    }

    const existingReport = report.find((item) => item.id == id);
    let status = "answered";

    if (existingReport) {
      if (
        existingReport.status === "review" ||
        existingReport.status === "markedForReview"
      ) {
        // If already marked for review (or already marked for review), now it's both answered and marked for review
        status = "markedForReview";
      } else {
        // If already answered, keep as answered
        status = "answered";
      }
    }

    addToReport({
      id: id,
      status: status,
      selectedOption: selectedOption,
      timestamp: timeDuration - totalSeconds,
      isCorrect: isCorrect,
      answer: answer,
    });

    if (isCorrect) {
      setScore(score + config.increment);
      if (level < questions?.length - 1) {
        incrementLevel();
      }
    } else {
      if (level < questions?.length - 1) {
        incrementLevel();
      }
      setScore(score - config.decrement);
    }
  };

  const incrementLevel = () => {
    setLevel((res) => {
      // Only increment if not at last question
      if (res < questions.length - 1) {
        return res + 1;
      }

      return res;
    });
  };

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

  /* Submit if Complete */

  useEffect(() => {
    if (level == questions?.length) {
      if (questions?.length > report?.length) {
        setConfirmModal(true);
        setLevel(questions?.length - 1);
      }
    }
  }, [level]);
  const calculateIntervalDelta = (report, questions, d, i) => {
    if (d === 0) {
      // For the first question, just return its timestamp
      return report?.find((item) => item.id === i.id)?.timestamp;
    } else if (d === 1) {
      // For the second question, return the interval (no delta yet)
      const currentTimestamp = report?.find(
        (item) => item.id === i.id
      )?.timestamp;
      const previousTimestamp = report?.find(
        (item) => item.id === questions[d - 1]?.id
      )?.timestamp;
      return currentTimestamp - previousTimestamp;
    } else {
      // For subsequent questions, calculate the delta between intervals
      const currentInterval =
        report?.find((item) => item.id === i.id)?.timestamp -
        report.find((item) => item.id === questions[d - 1]?.id)?.timestamp;
      const previousInterval =
        report?.find((item) => item.id === questions[d - 1]?.id)?.timestamp -
        report.find((item) => item.id === questions[d - 2]?.id)?.timestamp;
      return currentInterval - previousInterval;
    }
  };

  if (userDetails == undefined || questions == undefined || loading) {
    return (
      <div className="flex flex-col justify-center align-middle items-center text-center sf h-[100vh] w-full">
        Loading...
      </div>
    );
  }

  if (allowed == false && !loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <h2>You have already attempted this test.</h2>
        <Button
          size="sm"
          color="secondary"
          onPress={() => {
            router.push("/");
          }}
        >
          Go Back
        </Button>
      </div>
    );
  }
  return (
    <div className="w-full sf h-screen max-h-screen  justify-center align-middle items-center overflow-hidden flex flex-col bg-primary">
      <Modal
        isOpen={confirmModal}
        onClose={() => {
          setConfirmModal(false);
        }}
      >
        <ModalContent>
          <ModalHeader>Are you sure you want to submit test?</ModalHeader>
          <ModalBody>
            You have answered {report?.length ?? 0} questions out of total{" "}
            {questions?.length} questions
          </ModalBody>
          <ModalFooter className="flex flex-row justify-start">
            <Button
              color="danger"
              size="sm"
              onPress={() => {
                setConfirmModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="default"
              className="from-primary border-1 border-white shadow-md shadow-primary-400 to-primary-600 bg-gradient-to-r text-white"
              onPress={() => {
                setConfirmModal(false);
                handleComplete();
              }}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <HeaderMock
        key={config?.title}
        isHintAvailable={isHintAvailable}
        isHintVisible={isHintVisible}
        setIsHintAvailable={setIsHintAvailable}
        onSetVisible={(e) => {
          setisHintVisible(e);
        }}
        level={level}
        questions={questions}
        calc={parentData?.calculator_allowed ?? false}
        remainingTime={totalSeconds}
        openCalculator={() => {
          setCalculatorActive(true);
        }}
        state={gamestate}
        userData={userDetails}
        title={parentData?.title}
        timeOut={config?.config?.timeout || 1800}
      ></HeaderMock>
      <DraggableModal
        handleModal={() => setCalculatorActive(false)}
        closeable={false}
        open={calculatorActive}
      >
        {parentData?.is_scientific ? (
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
      <div className="bg-white shadow-md overflow-hidden w-full h-full lg:p-0 flex flex-row items-start justify-start">
        {gamestate == 0 ? (
          <>
            <div className="w-full h-full overflow-y-auto flex flex-col text-center justify-start items-center align-middle">
              <div className="flex-1 p-3 sm:p-6 w-full flex flex-col items-start justify-start">
                <h2 className="font-bold gradtext text-3xl sm:text-4xl">
                  Hi , {userDetails.user_metadata.full_name}
                </h2>
                {parentData?.description && (
                  <div className="border-1 w-full shadow-md p-4 flex flex-col items-start justify-start rounded-xl mt-4">
                    <p className="gradtext font-bold text-2xl">
                      Test Description :
                    </p>
                    <Spacer y={2}></Spacer>
                    <div
                      className="text-left font-sans text-xs sm:text-sm"
                      dangerouslySetInnerHTML={{
                        __html: parentData?.description,
                      }}
                    ></div>
                  </div>
                )}
                {parentData?.objective && (
                  <div className="border-1 w-full shadow-md p-4 flex flex-col items-start justify-start rounded-xl mt-4">
                    <p className="gradtext font-bold text-2xl">
                      Test Objective :
                    </p>
                    <Spacer y={2}></Spacer>
                    <ScrollShadow
                      className="text-left font-sans text-xs sm:text-sm max-h-[20vh] sm:max-h-[unset]"
                      dangerouslySetInnerHTML={{
                        __html: parentData?.objective,
                      }}
                    ></ScrollShadow>
                  </div>
                )}
              </div>
              <div className="mt-auto sticky bottom-0 w-full bg-gray-50 p-4">
                <Button
                  color="default"
                  className="mr-2 px-5 sf"
                  onClick={() => {
                    router.push("/");
                  }}
                >
                  Go Back
                </Button>
                <Button
                  color="primary"
                  className="px-5 sf from-secondary to-yellow-300 bg-gradient-to-t border-1 shadow-md shadow-yellow-400"
                  onClick={() => {
                    setGameState(1);
                  }}
                >
                  Start Test
                </Button>
              </div>
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate == 1 ? (
          <>
            <div className="w-full flex flex-col justify-center align-middle items-stretch h-full relative">
              {isFlashing ? <Flasher></Flasher> : ""}
              <Button
                size="sm"
                color="primary"
                onPress={() => {
                  setSidebarActive(true);
                }}
                className="absolute flex sm:hidden right-0 z-[2] rounded-r-none top-2"
              >
                Open <Grip></Grip>
              </Button>

              <QuestionCard
                report={report}
                isPlaying={!(showModal || isHintVisible)}
                key={level}
                onReview={(e) => {
                  const existingReport = report.find((item) => item.id === e);
                  const hasTempAnswer = tempAnswers && tempAnswers[e];

                  if (
                    (existingReport && existingReport.status === "answered") ||
                    hasTempAnswer
                  ) {
                    // If already answered (either saved or temporary), mark as both answered and reviewed
                    addToReport({ id: e, status: "markedForReview" });
                  } else {
                    // If not answered yet, just mark for review
                    addToReport({ id: e, status: "review" });
                  }
                }}
                question={questions[level]}
                onSelect={(e) => {
                  handleSubmit(e);
                }}
                onTempAnswer={handleTempAnswer}
                onClearResponse={handleClearResponse}
                onNext={incrementLevel}
                isMarked={report?.some(
                  (item) =>
                    item?.id == questions[level]?.id && item?.status == "review"
                )}
                onFinish={() => {
                  if (!report || report.length === 0) {
                    toast.error(
                      "Please attempt at least 1 question to submit the test"
                    );
                  } else {
                    setConfirmModal(true);
                  }
                }}
              />
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate == 2 ? (
          <>
            <>
              {/* Backdrop */}
              {activeExplanation != undefined && (
                <motion.div
                  className="fixed  bg-black bg-opacity-50 z-40 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={"Modal2"}
                  // Explicitly set undefined
                />
              )}

              {/* Modal */}
              {activeExplanation != undefined && (
                <motion.div
                  key={"Modal"}
                  className="fixed inset-0 z-50 w-full flex justify-center items-start overflow-y-auto pointer-events-auto"
                  initial={{ opacity: 0, y: "10%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "10%" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-white p-4 w-full h-full md:h-auto rounded-lg overflow-hidden shadow-lg">
                    <XCircle
                      stroke="white"
                      fill="red"
                      className=" right-4 top-4 absolute pointer-events-auto z-[9999] cursor-pointer"
                      size={48}
                      onClick={() => {
                        setActiveExplanation(undefined);
                      }}
                    ></XCircle>
                    {/* Modal Header */}
                    <div className="flex flex-col gap-1 justify-start items-start p-4  text-black ">
                      <h2 className="text-2xl font-bold">Explanation</h2>
                    </div>

                    {/* Modal Body */}
                    <div className="p-4 overflow-y-auto">
                      {/* Explanation Video */}
                      {questions[activeExplanation]?.explanationvideo && (
                        <iframe
                          className="rounded-lg overflow-hidden max-w-6xl mx-auto bg-gray-200 w-full aspect-video"
                          width="100%"
                          height="100%"
                          src={questions[activeExplanation]?.explanationvideo}
                          frameBorder="0"
                          allowFullScreen
                        ></iframe>
                      )}
                      <div className="h-24"></div>
                      {/* Question Text */}
                      <div
                        className="text-sm font-bold [&_*]:!text-sm [&_*]:font-normal mt-4"
                        dangerouslySetInnerHTML={{
                          __html: questions[activeExplanation].question,
                        }}
                      ></div>

                      {/* Question Image */}
                      {questions[activeExplanation]?.questionimage && (
                        <img
                          src={questions[activeExplanation].questionimage}
                          className="mt-4"
                          alt="Question"
                        />
                      )}

                      {/* Explanation Text */}
                      <div
                        className="mt-4"
                        dangerouslySetInnerHTML={{
                          __html: questions[activeExplanation].explanation,
                        }}
                      ></div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-gray-100">
                      <div className="w-full">
                        <h2 className="font-bold text-md text-green-500">
                          Correct Answer:{" "}
                          {
                            questions[activeExplanation].options.find(
                              (item) => item.isCorrect
                            )?.title
                          }
                        </h2>
                        <h2 className="font-bold text-md text-blue-500">
                          Your Answer: {report[activeExplanation]?.answer}
                        </h2>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>

            <div className="w-full text-center h-full flex flex-col justify-between items-center">
              <div className="w-full h-full  flex flex-row overflow-y-auto items-start justify-start">
                <div
                  className={
                    "w-full fixed sm:relative transition-all z-[9] sm:!transform-none sm:z-0 left-0 top-0 max-w-[400px] flex-1 overflow-y-auto overflow-x-hidden border-r-1 h-full flex flex-col justify-start items-start " +
                    (drawerActive ? "translate-x-0" : "-translate-x-full")
                  }
                >
                  <div className="flex flex-col w-full p-0 text-center bg-slate-50 overflow-hidden relative">
                    <Button
                      size="sm"
                      isIconOnly
                      color="secondary"
                      onPress={() => {
                        setDrawerActive(false);
                      }}
                      className="absolute flex sm:hidden right top-1/2 -translate-y-1/2 z-50 rounded-r-none right-0"
                    >
                      <ChevronLeft></ChevronLeft>
                    </Button>

                    <div className="flex flex-row flex-wrap text-black justify-between align-middle items-center p-2 bg-white text-xs">
                      <h2 className="flex-1 font-medium text-sm">Name</h2>
                      <h2 className="flex-1 font-medium text-sm">Status</h2>
                      <h2 className="flex-1 font-medium text-sm">Intervals</h2>
                      <h2 className="flex-1 font-medium text-sm">
                        Explanation
                      </h2>
                    </div>
                    <div className="overflow-y-auto">
                      {questions &&
                        questions.map((i, d) => {
                          return (
                            <div className="flex flex-row hover:bg-slate-100 flex-wrap relative justify-between align-middle items-center p-2 text-xs">
                              <div className="w-[90%] absolute h-[1px] bg-gray-200 bottom-0 left-1/2 -translate-x-1/2"></div>
                              <h2 className="flex-1 gradtext font-bold">
                                Q {d + 1}{" "}
                              </h2>
                              <h2 className="flex-1 flex flex-row justify-center align-middle items-center">
                                <div className="w-6 z-10 h-6 flex flex-col items-center justify-center relative">
                                  {getStatusIcon(i, report, true)}
                                  {report.find((item) => item.id == i.id)
                                    ?.isCorrect ? (
                                    <Check
                                      className="z-10"
                                      color="white"
                                      size={16}
                                    ></Check>
                                  ) : (
                                    <X color="white" size={16}></X>
                                  )}
                                </div>
                              </h2>
                              <h2 className="flex-1 gradtext font-bold">
                                {calculateIntervalDelta(
                                  report,
                                  questions,
                                  d,
                                  i
                                )}
                                s
                              </h2>
                              <h2 className="flex-1">
                                <Button
                                  color="primary"
                                  size="sm"
                                  onPress={() => {
                                    setActiveExplanation(d);
                                  }}
                                  variant="light"
                                  isIconOnly
                                >
                                  <ChevronRight></ChevronRight>
                                </Button>
                              </h2>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <div className="flex bg-white flex-row justify-center items-center align-middle w-full shadow-sm p-2 rounded-lg">
                    <p className="flex-1 text-center text-green-500 font-bold">
                      Correct :{" "}
                      {report.filter((item) => item.isCorrect == true)?.length}
                    </p>
                    <p className="flex-1 text-center text-red-500 font-bold">
                      Incorrect :{" "}
                      {report.filter((item) => item.isCorrect == false)?.length}
                    </p>
                  </div>
                </div>
                <div className="flex-1 h-full flex flex-col items-start justify-start overflow-hidden">
                  <div className="flex w-full flex-col bg-gray-50 p-4">
                    <Button
                      onPress={() => {
                        setDrawerActive(true);
                      }}
                      className="mb-2 mr-auto flex sm:hidden"
                      color="primary"
                      size="sm"
                    >
                      Open Explanations<ChevronRight></ChevronRight>
                    </Button>
                    {report &&
                    report.filter((item) => item.isCorrect == true).length >
                      questions.length / 2 ? (
                      <p className="text-green-500">Your Test is Submitted</p>
                    ) : (
                      <></>
                    )}
                    <h2 className="my-3 flex flex-col align-middle justify-center items-center">
                      You scored{" "}
                      <span className=" text-5xl font-bold w-auto text-green-500">
                        {score}
                      </span>
                    </h2>

                    {
                      <p className="font-bold text-green-600 text-2xl text-center">
                        You have successfully completed the test
                      </p>
                    }
                    {submitted && (
                      <Button
                        as={Link}
                        href={`/test/analytics/${submitted?.uid}`}
                        size="lg"
                        className=" from-primary-500 to-primary-700 bg-gradient-to-r mx-auto text-white"
                      >
                        View Analysis
                      </Button>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 flex flex-col items-start justify-start flex-1 h-full overflow-y-auto p-0">
                    <Leaderboard scores={leaderboard ?? []}></Leaderboard>
                  </div>
                </div>
              </div>
              <div className="flex flex-row items-center justify-center w-full p-2 sticky bottom-0 bg-white border-t-1">
                <Button
                  className="my-2 from-secondary to-yellow-300 bg-gradient-to-b shadow-md shadow-yellow-200 border-1 border-white"
                  color="default"
                  onPress={() => {
                    router.push("/");
                  }}
                  startContent={<Home></Home>}
                >
                  Go back to Dashboard
                </Button>
              </div>
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate < 2 && (
          <QuestionBrowser
            switchQuestion={(e) => {
              setLevel(questions?.findIndex((item) => item.id == e));
            }}
            gamestate={gamestate}
            questions={questions}
            report={report}
            tempAnswers={tempAnswers}
            sideBarActive={sideBarActive}
            setSidebarActive={(e) => {
              setSidebarActive(e);
            }}
          ></QuestionBrowser>
        )}
      </div>
    </div>
  );
};

export default Game;
