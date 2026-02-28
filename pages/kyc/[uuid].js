import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import ReactCanvasConfetti from "react-canvas-confetti";

import Flasher from "@/components/Flasher";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  Spacer,
  modal,
} from "@nextui-org/react";
import { serversupabase, supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

import dynamic from "next/dynamic";
import { useStopwatch } from "react-timer-hook";

import { toast } from "react-hot-toast";

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
const canvasStyles = {
  position: "fixed",
  pointerEvents: "none",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  zIndex: 9999,
};

const ProgressLine = (props) => {
  const level = props.currentLevel || undefined;
  const questions = props.question || undefined;

  if (questions == undefined || questions?.length == 0) {
    return <></>;
  }

  return (
    <div className="hidden lg:flex flex-col">
      <div className="flex flex-row py-2">
        {questions &&
          questions?.slice(0, questions?.length / 2).map((i, d) => {
            return (
              <div
                className={`h-[18px] w-[18px] md:md-2 md:h-[14px] md:w-[14px] relative transition-all bg-gray-300 rounded-full mx-1 ${
                  d < level ? "bg-primary" : "scale-75"
                }`}
              >
                {d < level - 1 ? (
                  <div className="absolute top-[50%] right-[-100%] translate-y-[-50%] w-full bg-primary h-[1px]"></div>
                ) : (
                  ""
                )}
              </div>
            );
          })}
      </div>

      <div className="flex flex-row py-2">
        {questions &&
          questions
            ?.slice(questions?.length / 2 + 1, questions?.length)
            .map((i, d) => {
              return (
                <div
                  className={`h-[18px] w-[18px] md:md-2 md:h-[14px] md:w-[14px] relative transition-all bg-gray-300 rounded-full mx-1 ${
                    d + questions?.length / 2 < level
                      ? "bg-primary"
                      : "scale-75"
                  }`}
                >
                  {d + questions?.length / 2 < level - 1 ? (
                    <div className="absolute top-[50%] right-[-100%] translate-y-[-50%] w-full bg-primary h-[1px]"></div>
                  ) : (
                    ""
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
};

const QuestionCard = ({
  question,
  handleOptionClick,
  time,
  handleSubmitAnswer,
  isPlaying,
  endGame,
}) => {
  const [answer, setAnswer] = useState();
  if (question == undefined) {
    return (
      <div>Question Undefined {console.log("Question is:" + question)}</div>
    );
  }

  return (
    <div className="sf w-full max-w-[800px] h-full overflow-y-auto mx-auto p-5 flex-1 justify-center align-middle items-start flex flex-col text-left ">
      <div className="shadow-lg rounded-xl w-full p-4 lg:p-10 relative">
        <div className="absolute top-5 right-5">
          <CountdownCircleTimer
            key={1}
            isPlaying={true}
            size={46}
            strokeWidth={3}
            duration={4200}
            colors={["#05ffa3", "#fbff05", "#ffa305", "#ff0505"]}
            colorsTime={[90, 60, 30, 0]}
            onComplete={() => {
              endGame();
            }}
          >
            {({ remainingTime }) => (
              <p className="font-bold flex flex-row text-xs">
                {Math.floor(remainingTime / 60)}:{remainingTime % 60}
              </p>
            )}
          </CountdownCircleTimer>
        </div>
        <h2 className="font-bold text-2xl text-primary">{question.title}</h2>
        <div
          className="font-light max-h-[50vh] overflow-y-auto text-sm qcontent"
          dangerouslySetInnerHTML={{ __html: question.question }}
        ></div>

        {question && question?.questionimage != undefined ? (
          <img src={question?.questionimage} />
        ) : (
          ""
        )}
        <ul className="p-0">
          {question?.type == "options" ? (
            <>
              <h2 className="my-2 text-xl font-bold text-secondary">
                Select the Correct Option
              </h2>
              <div className="flex flex-row flex-wrap justify-start -m-2">
                {question.options.map((option, index) => (
                  <li
                    onClick={() =>
                      handleOptionClick(
                        option.isCorrect,
                        option.text,
                        option.text,
                        question,
                        option.popupimage,
                      )
                    }
                    key={index}
                    className="rounded-xl flex flex-row items-center justify-center shadow-md p-3 m-2 mt-2 hover:bg-primary hover:text-white  text-xs md:text-sm cursor-pointer transition-all"
                  >
                    {option.title}
                  </li>
                ))}
              </div>
            </>
          ) : (
            <>
              <Input
                className="my-2"
                placement="Enter your Answer"
                onChange={(e) => {
                  setAnswer(e.target.value);
                }}
              ></Input>
              <Button
                color="primary"
                isDisabled={answer == undefined}
                onPress={() => {
                  handleSubmitAnswer(
                    answer == question.options.answer,
                    answer == question.options.answer
                      ? question.options.wintext
                      : question.options.losetext,
                    question.options.text,
                    question,
                  );
                }}
              >
                Submit Answer
              </Button>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

const Game = ({ test_id, isContinue, course }) => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(4);
  const [level, setLevel] = useState(0);
  const [secondaryLevel, setSecondaryLevel] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({});
  /* const [wrongAttempts, setWrongAttempts] = useState([]); */
  const [isFlashing, setIsFlashing] = useState(false);
  const [isHintAvailable, setIsHintAvailable] = useState(true);
  const [userData, setUserData] = useState();
  const [isHintVisible, setisHintVisible] = useState(false);
  const [config, setConfig] = useState({
    increment: 1,
    decrement: 1,
  });
  const [psuedo, setPsuedo] = useState();
  const [gamestate, setGameState] = useState(0);
  const [questions, setQuestions] = useState();
  const [parentData, setParentData] = useState();
  const [leaderboard, setLeaderBoard] = useState();
  const [timestamp, setTimestamp] = useState([]);
  const [gameOverModal, setGameOverModal] = useState(false);
  const [key, setKey] = useState("");
  const [played, setPlayed] = useState(false);
  /* const memoizedQuestion = useMemo(() =>{return  getRandomQuestion()}, [secondaryLevel,gamestate]); */
  const [uniqueSubjects, setUniqueSubjects] = useState();
  const [testData, setTestData] = useState();
  const [scoreboard, setScoreboard] = useState();
  const [resultID, setResultID] = useState();
  const [insModal, setInsModal] = useState(false);
  const [consent, setConsent] = useState(false);
  const [completed, setCompleted] = useState([]);
  useEffect(() => {
    if (userData) {
      checkIfResultAlreadyExists(userData?.email);
    }
  }, [userData]);

  useEffect(() => {
    if (level && questions && level < questions?.length) {
      if (
        level != undefined &&
        questions &&
        !completed.includes(questions[level].parent)
      ) {
        setCompleted((item) => [...item, questions[level].parent]);
      }
    }
  }, [level]);
  async function checkIfResultAlreadyExists(a) {
    const { data, error } = await supabase
      .from("results")
      .select("id")
      .match({ email: a, status: "finished", test: test_id });

    if (data && data?.length > 0) {
      toast.error("You cannot attempt this test again");
      setTimeout(() => {
        router.back();
      }, 1500);
    } else {
    }
  }

  const {
    totalSeconds,
    seconds,
    minutes,
    hours,
    days,
    isRunning,
    start,
    pause,
    reset,
  } = useStopwatch({ autoStart: false });

  const StaticMathField = dynamic(() => import("react-mathquill"), {
    ssr: false,
  });
  function generateRandomKey() {
    const randomKey = Math.random().toString(36).substring(2, 10); // Generate a random key
    setKey(randomKey); // Set the random key using setKey
  }

  const router = useRouter();

  async function prepareGame() {
    await getQuestions();

    if (isContinue == null || isContinue == undefined) {
      await insertResult();
    } else {
      setResultID(isContinue);
    }

    setInsModal(true);
  }
  useEffect(() => {
    if (level == 2) {
      updateTest(resultID);
    }
  }, [level]);
  async function updateTest(a) {
    const { data, error } = await supabase
      .from("results")
      .update({
        status: "paused",
      })
      .eq("id", a)
      .select();

    if (data) {
    } else {
      toast.error("error updating test");
    }
  }

  async function insertResult() {
    const r = toast.loading("Preparing test for you");
    const { data, error } = await supabase
      .from("results")
      .insert({
        test: test_id,
        email: userData?.email,
        status: "paused",
        currentLevel: 0,
      })
      .select();

    if (data) {
      setResultID(data[0]?.id);

      toast.success("All set now!!");
      toast.remove(r);
    } else {
      toast.error(
        "This test already exists in attempted test , continue the test from dashboard or contact admin.",
      );
      toast.remove(r);

      setTimeout(() => {
        router.back();
      }, 2000);
    }
  }

  async function getPsuedoModule(a) {
    const { data, error } = await supabase.rpc("get_psuedo", {
      test_id_param: test_id,
    });
    if (data) {
      setPsuedo(data);
    } else {
    }
  }

  async function getTestData(a) {
    const { data, error } = await supabase.rpc("get_swot_data", { test_id: a });

    if (data) {
      setTestData(data);
      setUniqueSubjects([...new Set(data.map((item) => item.subject_name))]);
    } else {
    }
  }

  useEffect(() => {
    getTestData(test_id);
    getPsuedoModule(test_id);
  }, []);

  async function getQuestions() {
    const { data, error } = await supabase.rpc("get_swot_questions_by_parent", {
      parent_id: test_id,
    });
    if (data) {
      setQuestions(data);
      const scoredata = new Set(data?.map((item) => item.parent));
      const configdata = Array.from(scoredata).map((i, d) => {
        return {
          module: i,
          score: 0,
          total: testData.filter((item) => item.parent_id == i)[0]?.match_count,
        };
      });
      if (psuedo && psuedo?.length > 0) {
        psuedo.map((i, d) => {
          configdata.push({ score: 5, total: 10, module: i.module });
        });
      }
      /* console.log(configdata,scoredata) */
      setScoreboard(configdata);
      if (data.length == 0) {
      }
    } else {
      console.log(error);
      /* router.push('/login') */
    }
  }
  /* useEffect(()=>{
if(level + 1 == questions?.length && wrongAttempts?.length == 0){
  submitScore(score)
}

},[level,wrongAttempts]) */

  async function getParentData() {
    const { data, error } = await supabase
      .from("questions")
      .select("parent(*)")
      .eq("slug", router.query.slug)
      .limit(1);
    if (data && data.length != 0) {
      console.log(data);
      setParentData(data[0]);
    } else {
      console.log(error);
    }
  }

  /* async function submitScore(ascore){
  const {data,error} = await supabase.from('plays').insert({
slug:router.query.slug,
score:ascore + (lives*5),
game:parentData?.parent?.id,
lives:lives,
timestamps:timestamp,
name:userData?.user_metadata.full_name,
user:userData.email,

  }).select();
  if(data && data.length != 0){
    console.log(data)
    getLeaderboard(router.query.slug)
}
else{
    console.log(error)
}
} */

  async function submitScoreboard(a) {
    if (resultID == undefined) {
      toast.error("error submitting without result id");
    }
    const dataToInsert = scoreboard.map((i, d) => {
      return {
        module: i?.module,
        score: i?.score,
        result_id: resultID,
        total: i?.total,
      };
    });

    /* console.log(dataToInsert) */
    const { data, error } = await supabase
      .from("scores")
      .insert([...dataToInsert])
      .select();
    if (data) {
      toast.success("Successfully submitted results");
      updateResultStatus(resultID);
    } else {
      toast.error("Error submitting , duplicate result already exists");
      updateResultStatus(resultID);
    }
  }

  async function updateResultStatus(a) {
    const { data, error } = await supabase
      .from("results")
      .update({ status: "finished" })
      .eq("id", a)
      .select();
    if (data) {
    }
  }

  async function getLeaderboard(a) {
    const { data, error } = await supabase
      .from("plays")
      .select("*")
      .eq("slug", a)
      .order("score", { ascending: false })
      .limit(3);
    if (data && data.length != 0) {
      console.log(data);
      setLeaderBoard(data);
    } else {
      console.log(error);
    }
  }

  function handleSubmitAnswer(a, b, c, d) {
    if (a == true) {
      handleOptionClick(a, b, c, d);
    } else {
      handleOptionClick(a, b, c, d);
    }
  }
  useEffect(() => {
    if (router.query.uuid != undefined || test_id) {
      getParentData();
    }
  }, [router]);

  async function getUserData() {
    const { data } = await supabase.auth.getUser();

    if (data && data.user != undefined) {
      setUserData(data.user);
      console.log(data.user);
    } else {
      setUserData("no data");
    }
  }
  useEffect(() => {
    getUserData();
  }, []);

  useEffect(() => {
    if (lives == 0) {
      setFlash();
      setGameState(2);
      setGameOverModal(true);
    }
  }, [lives]);

  function showHint(a) {
    setLives((lives) => lives - 1);
  }

  const setFlash = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 1000);
  };

  const refAnimationInstance = useRef(null);

  const getInstance = useCallback((instance) => {
    refAnimationInstance.current = instance;
  }, []);

  const makeShot = useCallback((particleRatio, opts) => {
    refAnimationInstance.current &&
      refAnimationInstance.current({
        ...opts,
        origin: { y: 0.7 },
        particleCount: Math.floor(200 * particleRatio),
      });
  }, []);

  const fire = useCallback(() => {
    makeShot(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    makeShot(0.2, {
      spread: 60,
    });

    makeShot(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    makeShot(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    makeShot(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, [makeShot]);

  const startGame = () => {
    setLevel(0);
    setScore(0);
    setLives(3);
    setShowModal(false);
    setWrongAttempts([]);
  };

  function updateModuleScore(a, b) {
    const moduleIndex = testData.findIndex((item) => item.parent_id === b);
    console.log(moduleIndex);
    setScoreboard((prevData) => {
      const newData = [...prevData]; // Create a copy of the data array
      newData[moduleIndex] = {
        ...newData[moduleIndex],
        score: newData[moduleIndex].score + 1,
      }; // Update the value at the given index
      return newData; // Set the state with the updated data
    });
  }

  const handleOptionClick = (
    isCorrect,
    congratstext,
    headertext,
    cQ,
    popup,
  ) => {
    if (isCorrect) {
      setTimestamp((res) => [...res, `${hours}:${minutes}:${seconds}`]);

      setScore(score + config.increment);
      updateModuleScore(1, cQ.parent);
      if (level < questions?.length) {
        setLevel(level + 1);
      }
      setSecondaryLevel(secondaryLevel + 1);
      setIsHintAvailable(true);
      setModalContent({
        color: "green",
        text: congratstext,
        message: headertext,
        isCorrect: true,
        popupimage: popup,
      });
      fire();
      setShowModal(true);
      generateRandomKey();
    } else {
      /* setLives(lives - 1); */
      setFlash();
      if (level < questions?.length) {
        setLevel(level + 1);
      }
      setSecondaryLevel(secondaryLevel + 1);
      /* setScore(score - config.decrement); */
      setIsHintAvailable(true);

      setModalContent({
        color: "red",
        text: congratstext,
        message: headertext,
        isCorrect: false,
        popupimage: popup,
      });
      setShowModal(true);
      generateRandomKey();
    }
  };
  async function handleIncompleteSubmit() {}

  useEffect(() => {
    if (showModal == true) {
      pause();
    } else {
      start();
    }
  }, [showModal]);
  function removeObjectAtIndex(array, index, handler) {
    // Check if the index is valid
    if (index < 0 || index >= array.length) {
      console.error("Invalid index");
      return;
    }

    // Remove the object at the specified index
    const removedObject = array.splice(index, 1)[0];

    // Call the handler function with the updated array and removed object
    if (handler && typeof handler === "function") {
      handler(array, removedObject);
    }
  }
  function handleStart() {
    setInsModal(false);
    setGameState(1);
    start();
  }

  /* function setPlayerd(){
if(played != true){
  setPlayed(true)}
  return '';
}
const setToPlayed = setPlayerd(); */
  useEffect(() => {
    if (level == questions?.length) {
      submitScoreboard(scoreboard);
      setInterval(() => {
        fire();
      }, 2000);
    }
  }, [level]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (gamestate == 1) {
        event.preventDefault();
        event.returnValue =
          "Your Game is in Progress , Are you sure want to unload?"; // Display a custom message here if needed
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [gamestate]);

  useEffect(() => {
    if (level < questions?.length) {
      const currentQuestion = questions[level];
      // You can set the current question for rendering here.
    }
  }, [level]);
  if (userData == undefined) {
    return (
      <div className="flex flex-col justify-center align-middle items-center text-center sf h-[100vh] w-full">
        Loading...
      </div>
    );
  }

  if (testData == undefined) {
    return (
      <div className="flex flex-col justify-center align-middle items-center text-center sf h-[100vh] w-full">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full sf h-[100vh] p-2 justify-center align-middle items-center overflow-hidden max-h-[100vh] flex flex-col bg-primary">
      <Modal
        placement="center"
        scrollBehavior="inside"
        className="sf overflow-hidden"
        isOpen={insModal}
        backdrop="opaque"
        classNames={{ backdrop: "opacity-10 bg-overlay/5" }}
        isDismissable={false}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h2 className="text-secondary">Self-Assessment SWOT Test</h2>
                {/* {testData?.filter(item => item.parent_id == questions[level]?.parent)[0]?.parent_title || "Not Found"} */}
              </ModalHeader>

              <ModalBody className="overflow-y-auto">
                <div className="text-sm text-gray-500 my-2">
                  Welcome to the Self-Assessment SWOT Test! <br />
                  <br />
                  This quick test will help you gauge your strengths and
                  weaknesses. It will adapt to your responses, providing a
                  personalized assessment experience.
                  <br />
                  <br />
                  <strong className="text-black">Instructions:</strong>
                  <br />
                  <br />
                  Take your time to read each question and response options
                  carefully. <br />
                  <br />
                  Avoid underestimating or overestimating your abilities. Your
                  goal is to assess your current level of understanding
                  accurately. Once you have answered all the questions, review
                  your responses, and ensure you have not missed any questions.{" "}
                  <br />
                  <br />
                  Good luck! Your honest self-assessment will help tailor the
                  course to your needs. Begin the test when you're ready and
                  give your best. <br />
                  <br />
                  <strong className="text-black">Please Remember</strong> – The
                  test cannot be paused and needs to be completed in one ‘Go.’
                </div>

                {/* <RadioGroup
 label="Before start, please rate yourself:"
 orientation="horizontal">
  <Radio value={'good'}>Good</Radio>
  <Radio value={'notgood'}>Not-so-Good</Radio>
</RadioGroup> */}
              </ModalBody>
              <ModalFooter>
                {consent == false ? (
                  <Button
                    color="danger"
                    variant="ghost"
                    onPress={() => {
                      router.back();
                    }}
                  >
                    Cancel
                  </Button>
                ) : (
                  ""
                )}
                <Button
                  color="primary"
                  className="text-white"
                  onPress={() => {
                    handleStart();
                  }}
                >
                  Continue
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>{" "}
      </Modal>

      <ReactCanvasConfetti refConfetti={getInstance} style={canvasStyles} />
      <div className="bg-white rounded-xl flex flex-row flex-nowrap shadow-md w-full h-full p-5">
        {gamestate == 0 ? (
          <>
            <div className="w-full h-full flex flex-col text-center justify-center items-center align-middle">
              <div className="bg-white rounded-2xl  shadow-md border-1 border-gray-100 p-4 m-1 w-full max-w-[800px]">
                <h2 className="font-bold">
                  Hi , {userData.user_metadata.full_name}
                </h2>
                <div className="flex flex-col lg:flex-row w-full max-h-[50vh] overflow-y-auto">
                  {uniqueSubjects &&
                    uniqueSubjects.map((i, d) => {
                      return (
                        <div className="bg-white flex-1 p-0">
                          <h2 className="w-full bg-primary rounded-xl text-white p-3">
                            {i}
                          </h2>
                          <div className="w-full flex flex-row flex-wrap justify-center items-center my-4">
                            {testData &&
                              testData
                                .filter((item) => item.subject_name == i)
                                .map((z, v) => {
                                  return (
                                    <div className="p-2 flex flex-row justify-center bg-white rounded-full shadow-md mb-1 mr-1 px-4 text-sm border-1 border-gray-50 align-middle items-center ">
                                      {z?.parent_title}{" "}
                                      <div className="bg-primary ml-2 text-white rounded-full w-auto px-2 h-auto flex justify-start items-start align-middle text-center text-xs relative">
                                        <p className="">
                                          {z.match_count} Questions
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: parentData?.parent?.objective,
                  }}
                ></div>
                <div className="mt-2 ">
                  <Button
                    color="default"
                    className="mr-2 px-5 sf"
                    onClick={() => {
                      router.back();
                    }}
                  >
                    Go Back
                  </Button>
                  <Button
                    color="primary"
                    className="px-5 sf text-white to-primary border-1 shadow-sm shadow-primary from-primary-900 bg-gradient-to-tr"
                    onClick={() => {
                      prepareGame();
                    }}
                  >
                    {isContinue == null || isContinue == undefined
                      ? "Start"
                      : "Continue"}{" "}
                    SWOT Test
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          ""
        )}

        {gamestate == 1 ? (
          <>
            {/* <h1>Level Name : {parentData?.parent?.title}</h1> */}
            {lives <= 0 && (
              <div>
                <p>Game Over</p>
                <p>Your score: {score}</p>
                <button onClick={startGame}>Start Over</button>
              </div>
            )}

            <Modal
              placement="center"
              className="sf overflow-hidden"
              isOpen={showModal}
              backdrop="opaque"
              classNames={{ backdrop: "opacity-10 bg-overlay/5" }}
              isDismissable={false}
              scrollBehavior="inside"
            >
              <ModalContent>
                {(onClose) => (
                  <>
                    <ModalHeader
                      className={`flex flex-col gap-1 justify-start items-start text-white ${
                        modalContent && modalContent.isCorrect == false
                          ? "bg-red-500"
                          : "bg-green-500"
                      } `}
                    >
                      {modalContent && modalContent.isCorrect == false ? (
                        <p>Incorrect</p>
                      ) : (
                        <p>Correct</p>
                      )}
                      <div className="border-1 rounded-xl text-sm border-white p-1 px-2 w-auto">
                        {modalContent && modalContent.isCorrect == false ? (
                          <p>You have not scored any Point</p>
                        ) : (
                          <p>You have earned {config.increment} Point</p>
                        )}
                      </div>
                    </ModalHeader>
                    <ModalBody>
                      {modalContent?.popupimage != undefined ? (
                        <img
                          className="max-w-[400px] rounded-lg overflow-hidden shadow-md object-cover"
                          src={modalContent?.popupimage}
                        />
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: modalContent?.text,
                          }}
                        ></div>
                      )}
                    </ModalBody>

                    <ModalFooter>
                      <Button
                        className="flex-1 text-white"
                        color="primary"
                        onPress={() => {
                          setShowModal(false);
                        }}
                      >
                        Next
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>

            {level < questions.length && (
              <>
                <div className="lg:flex hidden w-[300px] flex-0 h-full flex-col bg-gray-50 rounded-lg p-2">
                  <h2 className="text-md font-bold">Modules : </h2>
                  <Spacer y={2}></Spacer>
                  <div className="flex flex-col justify-start items-start align-top overflow-y-auto">
                    {testData &&
                      testData.map((i, d) => {
                        return (
                          <div
                            className={
                              "w-full bg-white border-1 flex flex-row items-center align-middle justify-center border-gray-200 my-1 rounded-lg p-2 text-center text-sm" +
                              ` ${
                                i.parent_id == questions[level].parent
                                  ? "!bg-green-200 border-green-400"
                                  : " "
                              }`
                            }
                            data-status={
                              testData &&
                              testData?.filter(
                                (item) =>
                                  item.parent_id == questions[level].parent,
                              ).length > 0
                                ? true
                                : false
                            }
                          >
                            {i.parent_title}
                            {completed.includes(i.parent_id) ? (
                              <svg
                                className="ml-auto"
                                width="24"
                                height="24"
                                fill="none"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm3.22 6.97-4.47 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 1 0-1.06-1.06Z"
                                  fill="#2ECC70"
                                />
                              </svg>
                            ) : (
                              ""
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center align-middle items-stretch h-full">
                  <div className="flex flex-col lg:flex-col font-bold text-sm lg:text-sm gap-2 mt-2 lg:mt-0 md:mt-0 p-2  text-left justify-start align-middle items-start w-full">
                    <p>
                      Question Module:{" "}
                      {testData.filter(
                        (item) => item.parent_id == questions[level]?.parent,
                      )[0]?.parent_title || "Not Found"}
                    </p>
                    <p>Question: {level + 1}</p>
                    {/* <p>Score: {score}</p> */}
                    {/*  <p className='flex flex-row justify-center align-middle items-center'>Lives: <span className='flex flex-row'>{lives != undefined && Array(lives).fill().map((i,d)=>{
            return <div className='h-[24px] w-[24px] relative mx-1'><Icon></Icon></div>
          })}</span></p> */}
                  </div>

                  {isFlashing ? <Flasher></Flasher> : ""}
                  <div className="absolute top-5 right-5">
                    <h2 className="text-right">
                      Level : {level + 1}/{questions?.length}
                    </h2>
                    {/* <ProgressLine currentLevel={level + 1 } question={questions}></ProgressLine> */}
                    {/* <Dropdown onClose={()=>{setisHintVisible(false)}}>
            <DropdownTrigger>
          <Button onPress={()=>{showHint(questions[level].hint),generateRandomKey(),setisHintVisible(true),setIsHintAvailable(false)}} isDisabled={!isHintAvailable} className='my-2' color='primary'>See Hint <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.538 18.999L15.2473 20.2575C15.0241 21.2208 14.2013 21.9184 13.2285 21.993L13.0554 21.9996H10.9437C9.95426 21.9996 9.0885 21.3547 8.79678 20.4232L8.75135 20.2559L8.461 18.999H15.538ZM12 2.00098C16.0041 2.00098 19.25 5.24691 19.25 9.25098C19.25 11.3875 18.3144 13.3443 16.4846 15.0917C16.4493 15.1254 16.4247 15.1687 16.4137 15.2162L15.886 17.499H8.114L7.58801 15.2164C7.57702 15.1688 7.55234 15.1255 7.51701 15.0917C5.68616 13.3443 4.75 11.3875 4.75 9.25098C4.75 5.24691 7.99593 2.00098 12 2.00098Z" fill="currentColor"/>
</svg>
</Button>

</DropdownTrigger>
<DropdownMenu>
    <DropdownItem>
        <div dangerouslySetInnerHTML={{__html:questions[level].hint}}></div>
    </DropdownItem>
</DropdownMenu>
</Dropdown> */}
                  </div>

                  <QuestionCard
                    endGame={() => {
                      setLevel(questions?.length);
                    }}
                    isPlaying={!(showModal || isHintVisible)}
                    key={1}
                    time={parentData?.parent?.time}
                    handleSubmitAnswer={(e, f, g, h) => {
                      (console.log(e, f, g, h), handleSubmitAnswer(e, f, g, h));
                    }}
                    question={questions[level]}
                    handleOptionClick={handleOptionClick}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          ""
        )}

        {gamestate == 2 ? (
          <>
            <div className="w-full h-full text-center flex flex-col justify-center align-middle items-center">
              <div className="font-bold sf text-red-500 text-xl text-center w-full ">
                Game Over
              </div>
              <h2 className="my-5">
                You scored{" "}
                <span className="text-white bg-green-500  p-3 rounded-full">
                  {score}
                </span>
              </h2>
              <div className="flex flex-row gap-1">
                <Button
                  color="danger"
                  onPress={() => {
                    router.push("/");
                  }}
                >
                  Quit
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    router.reload();
                  }}
                >
                  Restart Game
                </Button>
              </div>
            </div>
          </>
        ) : (
          ""
        )}

        {level == questions?.length ? (
          <div className="w-full h-full flex flex-col align-middle justify-center items-center">
            <p className="font-bold text-green-600 text-2xl text-center">
              You have successfully completed {parentData?.parent?.title}
            </p>

            {/* <p>Now Next Level will be unlocked</p> */}
            <h2 className="my-3 flex flex-col align-middle justify-center items-center">
              You scored{" "}
              <span className=" text-5xl font-bold w-auto text-green-500">
                {score + lives * 5}
              </span>
            </h2>
            <p className="text-green-500">Your Score is Submitted</p>
            {/* <h2 className='font-bold text-xl my-5'>View your Result on the Dashboard</h2> */}
            <div className="flex flex-col w-full max-w-[800px] p-0 text-center bg-gray-100 rounded-xl overflow-hidden">
              {/*  <div className='flex flex-row flex-wrap justify-between align-middle items-center p-2 bg-primary'>
    <h2 className='flex-1 font-bold'>Name</h2>
    <h2 className='flex-1 font-bold'>Score</h2>
     
  </div> */}
              {/*  {leaderboard && leaderboard.map((i,d)=>{
    return <div className='flex flex-row flex-wrap justify-between align-middle items-center p-2'>
     <h2 className='flex-1'>{i.name}</h2>
    <h2 className='flex-1'>{i.score}</h2> 
    </div>
  })} */}
            </div>
            <Button
              className="my-2 text-white"
              color="secondary"
              onPress={() => {
                router.back();
              }}
            >
              View your Result
            </Button>
          </div>
        ) : (
          ""
        )}
      </div>

      {/* <pre>{JSON.stringify(scoreboard, null, 2)}</pre> */}
    </div>
  );
};

export default Game;
export async function getServerSideProps(context) {
  const { uuid } = context.query;
  const continue_id = context.query.continue || null;

  const { data, error } = await serversupabase
    .from("swot_test")
    .select("id,course(title)")
    .eq("uid", uuid);
  if (data && data?.length > 0) {
  } else {
    return {
      notFound: true,
    };
  }

  console.log(continue_id);
  return {
    props: {
      test_id: data[0]?.id,
      isContinue: continue_id || null,
      course: data[0]?.course?.title || "Not Found",
    },
  };
}
