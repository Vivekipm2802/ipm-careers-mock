import React, { useState } from "react";
import { Button } from "@nextui-org/react";
import HeaderMock from "../components/HeaderMock";
import Link from "next/link";
import { serversupabase } from "@/utils/supabaseClient";
import { motion } from "framer-motion";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  XCircle,
} from "lucide-react";
import Leaderboard from "../components/Leaderboard2";
import { getStatusIcon } from "../components/QuestionBrowser";

const ResultPage = ({ result, questions, leaderboard }) => {
  function calculateIntervalDelta(report, questions, d, i) {
    if (d === 0) {
      // Render header at the top
      const testTitle =
        result?.test_uuid?.parent?.title || result?.test_uuid?.title;
      return report?.find((item) => item.id === i.id)?.timestamp ?? 0;
    } else if (d === 1) {
      const currentTimestamp =
        report?.find((item) => item.id === i.id)?.timestamp ?? 0;
      const previousTimestamp =
        report?.find((item) => item.id === questions[d - 1]?.id)?.timestamp ??
        0;
      return currentTimestamp - previousTimestamp;
    } else {
      const currentInterval =
        (report?.find((item) => item.id === i.id)?.timestamp ?? 0) -
        (report?.find((item) => item.id === questions[d - 1]?.id)?.timestamp ??
          0);
      const previousInterval =
        (report?.find((item) => item.id === questions[d - 1]?.id)?.timestamp ??
          0) -
        (report?.find((item) => item.id === questions[d - 2]?.id)?.timestamp ??
          0);
      return currentInterval - previousInterval;
    }
  }
  const [drawerActive, setDrawerActive] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState(undefined);

  if (!result || !questions) {
    return (
      <div className="flex flex-col justify-center align-middle items-center text-center sf h-[100vh] w-full">
        Loading...
      </div>
    );
  }

  const report = result.report || [];
  // Calculate score by replaying the report in order, matching [slug].js logic
  const increment = result?.config?.increment ?? 4;
  const decrement = result?.config?.decrement ?? 1;
  let score = 0;
  if (Array.isArray(report)) {
    // Sort report by timestamp if available, fallback to original order
    const sortedReport = [...report].sort((a, b) => {
      if (typeof a.timestamp === "number" && typeof b.timestamp === "number") {
        return a.timestamp - b.timestamp;
      }
      return 0;
    });
    sortedReport.forEach((item) => {
      if (item.isCorrect === true) {
        score += increment;
      } else if (item.isCorrect === false) {
        score -= decrement;
      }
    });
  }
  const correctCount = report.filter((item) => item.isCorrect === true).length;
  const incorrectCount = report.filter(
    (item) => item.isCorrect === false
  ).length;

  return (
    <div className="w-full sf h-screen max-h-screen justify-center align-middle items-center overflow-hidden flex flex-col bg-primary">
      <HeaderMock
        title={result?.test_uuid?.parent?.title || result?.test_uuid?.title}
        questions={questions}
      />
      {/* Explanation Modal */}
      {/* Backdrop */}
      {activeExplanation !== undefined && (
        <motion.div
          className="fixed  bg-black bg-opacity-50 z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          key={"Modal2"}
        />
      )}
      {/* Modal */}
      {activeExplanation !== undefined && (
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
              className="right-4 top-4 absolute pointer-events-auto z-[9999] cursor-pointer"
              size={48}
              onClick={() => setActiveExplanation(undefined)}
            />
            {/* Modal Header */}
            <div className="flex flex-col gap-1 justify-start items-start p-4 text-black">
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
                  __html: questions[activeExplanation]?.question,
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
                  __html: questions[activeExplanation]?.explanation,
                }}
              ></div>
            </div>
            {/* Modal Footer */}
            <div className="p-4 bg-gray-100">
              <div className="w-full">
                <h2 className="font-bold text-md text-green-500">
                  Correct Answer:{" "}
                  {Array.isArray(questions[activeExplanation]?.options)
                    ? questions[activeExplanation].options.find(
                        (item) => item.isCorrect
                      )?.title ?? "N/A"
                    : "N/A"}
                </h2>
                <h2 className="font-bold text-md text-blue-500">
                  Your Answer: {report[activeExplanation]?.answer ?? "N/A"}
                </h2>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-white shadow-md overflow-hidden w-full h-full lg:p-0 flex flex-row items-start justify-start">
        {/* Left: Question Breakdown */}
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
              onPress={() => setDrawerActive(false)}
              className="absolute flex sm:hidden right top-1/2 -translate-y-1/2 z-50 rounded-r-none right-0"
            >
              <ChevronLeft />
            </Button>
            <div className="flex flex-row flex-wrap text-black justify-between align-middle items-center p-2 bg-white text-xs">
              <h2 className="flex-1 font-medium text-sm">Name</h2>
              <h2 className="flex-1 font-medium text-sm">Status</h2>
              <h2 className="flex-1 font-medium text-sm">Intervals</h2>
              <h2 className="flex-1 font-medium text-sm">Explanation</h2>
            </div>
            <div className="overflow-y-auto">
              {questions &&
                questions.map((i, d) => (
                  <div
                    key={i.id}
                    className="flex flex-row hover:bg-slate-100 flex-wrap relative justify-between align-middle items-center p-2 text-xs"
                  >
                    <div className="w-[90%] absolute h-[1px] bg-gray-200 bottom-0 left-1/2 -translate-x-1/2"></div>
                    <h2 className="flex-1 gradtext font-bold">Q {d + 1} </h2>
                    <h2 className="flex-1 flex flex-row justify-center align-middle items-center">
                      <div className="w-6 z-10 h-6 flex flex-col items-center justify-center relative">
                        {getStatusIcon(i, report, true)}
                        {report.find((item) => item.id === i.id)?.isCorrect ? (
                          <Check className="z-10" color="white" size={16} />
                        ) : (
                          <X color="white" size={16} />
                        )}
                      </div>
                    </h2>
                    <h2 className="flex-1 gradtext font-bold">
                      {calculateIntervalDelta(report, questions, d, i)}s
                    </h2>
                    <h2 className="flex-1">
                      <Button
                        color="primary"
                        size="sm"
                        onPress={() => setActiveExplanation(d)}
                        variant="light"
                        isIconOnly
                      >
                        <ChevronRight />
                      </Button>
                    </h2>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex bg-white flex-row justify-center items-center align-middle w-full shadow-sm p-2 rounded-lg">
            <p className="flex-1 text-center text-green-500 font-bold">
              Correct :{" "}
              {report.filter((item) => item.isCorrect === true).length}
            </p>
            <p className="flex-1 text-center text-red-500 font-bold">
              Incorrect :{" "}
              {report.filter((item) => item.isCorrect === false).length}
            </p>
          </div>
        </div>
        {/* Right: Score, Message, Leaderboard */}
        <div className="flex-1 h-full flex flex-col items-start justify-start overflow-hidden">
          <div className="flex w-full flex-col bg-gray-50 p-4">
            <Button
              onPress={() => setDrawerActive(true)}
              className="mb-2 mr-auto flex sm:hidden"
              color="primary"
              size="sm"
            >
              Open Explanations
              <ChevronRight />
            </Button>
            {report &&
            report.filter((item) => item.isCorrect === true).length >
              questions.length / 2 ? (
              <p className="text-green-500 text-center">
                Your Test is Submitted
              </p>
            ) : (
              <></>
            )}
            <h2 className="my-3 flex flex-col align-middle justify-center items-center">
              You scored{" "}
              <span className="text-5xl font-bold w-auto text-green-500">
                {score}
              </span>
            </h2>
            {
              <p className="font-bold text-green-600 text-2xl text-center">
                You have successfully completed{" "}
                {result?.test_uuid?.parent?.title || result?.test_uuid?.title}
              </p>
            }
            {result?.uid && (
              <Button
                as={Link}
                href={`/test/analytics/${result?.uid}`}
                size="lg"
                className="from-primary-500 to-primary-700 bg-gradient-to-r mx-auto text-white mt-4"
                target="_blank"
              >
                View Analysis
              </Button>
            )}
          </div>
          <div className="w-full bg-gray-100 flex flex-col items-start justify-start flex-1 h-full overflow-y-auto p-0">
            <Leaderboard scores={leaderboard ?? []} />
          </div>
          <div className="flex flex-row items-center justify-center w-full p-2 sticky bottom-0 bg-white border-t-1">
            <Button
              className="my-2 from-secondary to-yellow-300 bg-gradient-to-b shadow-md shadow-yellow-200 border-1 border-white"
              color="default"
              as={Link}
              href="/"
              startContent={<Home />}
            >
              Go back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;

export async function getServerSideProps(context) {
  // Fetch result by uid
  const { data, error } = await serversupabase
    .from("plays")
    .select("*,test_uuid(*)")
    .eq("uid", context.query.uid);

  if (!data || data.length === 0 || error) {
    return { notFound: true };
  }

  const result = data[0];

  // Fetch questions for the test
  let questions = [];
  if (result?.test_uuid?.id) {
    const { data: qData } = await serversupabase
      .from("questions")
      .select("*")
      .eq("parent", result.test_uuid.id);
    questions = qData || [];
  }

  // Fetch leaderboard for the test
  let leaderboard = [];
  if (result?.test_uuid?.uuid) {
    const { data: lbData } = await serversupabase
      .from("plays")
      .select("id,created_at,score,user,name,isPassed,test_uuid")
      .eq("test_uuid", result.test_uuid.uuid)
      .order("score", { ascending: false })
      .limit(20);
    leaderboard = lbData || [];
  }

  return {
    props: {
      result,
      questions,
      leaderboard,
    },
  };
}
