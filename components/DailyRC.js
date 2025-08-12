import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CircularProgress,
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
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNMNContext } from "./NMNContext";

export default function DailyRC() {
  const [quiz, setQuiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState(false);
  const [modal, setModal] = useState(undefined);

  async function checkIfSubmitted(a) {
    const { data, error } = await supabase
      .from("daily_rc_submissions")
      .select("*")
      .eq("rc_id", a);
    if (error) {
      setLoading(false);
      return;
    }
    if (data) {
      setLoading(false);
      setSubmissions(data);
      return;
    }
  }
  async function getQuestion() {
    const { data, error } = await supabase
      .from("daily_rc_quiz")
      .select("*,answer_key(*)");
    if (error) {
      setLoading(false);
      return;
    }
    if (data) {
      setLoading(false);
      checkIfSubmitted(data[0]?.uid);

      setQuiz(data);
      return;
    }
  }

  async function submitAnswer(a, b) {
    const { data, error } = await supabase
      .from("daily_rc_submissions")
      .insert({
        selected: a,
        rc_id: b,
      })
      .select();
    if (error) {
      return;
    }
    if (data) {
      getQuestion();
      checkIfSubmitted(b);

      return;
    }
  }

  useEffect(() => {
    getQuestion();
  }, []);

  return (
    <div className="w-full flex flex-col items-start justify-start ">
      <Modal
        isOpen={modal != undefined}
        onClose={() => {
          setModal(undefined);
        }}
      >
        <ModalContent>
          <ModalHeader className="text-primary text-2xl">Solution</ModalHeader>
          <ModalBody>
            <h2 className="font-medium text-sm text-left">{modal?.title}</h2>
            <div
              className="w-full text-sm"
              dangerouslySetInnerHTML={{ __html: modal?.content }}
            ></div>
            <ScrollShadow
              className="w-full text-medium max-h-[50vh] p-2 border-1 border-lime-600 rounded-xl bg-lime-100"
              dangerouslySetInnerHTML={{ __html: modal?.answer_key?.solution }}
            ></ScrollShadow>
          </ModalBody>
          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
      <h2 className="text-2xl font-bold font-sans text-primary">
        Daily RC for you
      </h2>

      {loading && (
        <div className="flex flex-1 flex-col items-center text-xs justify-center w-full h-full">
          <CircularProgress size="sm"></CircularProgress>
          <Spacer y={2}></Spacer>
          Loading...
        </div>
      )}
      {!loading && quiz?.length == 0 && (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[100px] bg-slate-50 rounded-xl my-2">
          No Quiz Found Today
        </div>
      )}
      {quiz &&
        quiz.map((q, qind) => {
          return (
            <QuestionCard
              onView={() => {
                setModal(q);
              }}
              submissions={submissions}
              onSubmit={(e) => submitAnswer(e, q.uid)}
              item={q}
            ></QuestionCard>
          );
        })}
    </div>
  );
}

function QuestionCard({ item, onSubmit, submissions, onView }) {
  const { userDetails } = useNMNContext();
  const { id, title, content, options, type } = item;
  const [answer, setAnswer] = useState("");

  const isFound =
    submissions &&
    submissions?.find(
      (sub) => item.uid == sub.rc_id && sub.student_email == userDetails?.email
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {isFound ? (
        <div className="w-full min-h-[200px] flex flex-col items-center justify-center bg-gray-50 rounded-xl">
          <h2 className="flex flex-row items-center text-lg justify-center p-4">
            {isFound && isFound?.isCorrect ? (
              <CheckCircle2
                className="text-lime-500 flex-shrink-0"
                size={24}
              ></CheckCircle2>
            ) : (
              <XCircle className="text-red-500 flex-shrink-0"></XCircle>
            )}

            <Spacer x={2}></Spacer>
            {isFound && isFound?.isCorrect ? (
              <span className="text-lime-800 font-semibold">
                You got it right , keep answering the questions to maintain your
                streak.
              </span>
            ) : (
              <span className="text-red-700">
                Sorry , Your answer is incorrect. Try again tomorrow
              </span>
            )}
          </h2>
          <div className="flex flex-row items-center my-4 justify-center">
            <Button
              className="te"
              color="primary"
              size="sm"
              onPress={() => {
                onView();
              }}
            >
              View Solution
            </Button>
          </div>
        </div>
      ) : (
        <Card
          shadow="none"
          classNames={{ base: "!p-0 !m-0" }}
          className="w-full mx-auto !m-0  !p-0"
        >
          <CardHeader className="flex flex-col items-start px-0  pt-4">
            <h2 className="text-lg font-bold text-foreground text-left">
              {title}
            </h2>
          </CardHeader>
          <CardBody className="px-0  py-2">
            <div
              className="text-foreground-600 mb-4"
              dangerouslySetInnerHTML={{ __html: content }}
            ></div>
            {type === "options" &&
              options &&
              // Check if options is an array of RC question objects (with 'question' and 'options' keys)
              (Array.isArray(options) &&
              options.length > 0 &&
              typeof options[0] === "object" &&
              options[0].question &&
              options[0].options ? (
                <div>
                  {options.map((qObj, qIdx) => (
                    <div key={qIdx} className="mb-6">
                      <div className="font-semibold mb-2">{qObj.question}</div>
                      <RadioGroup
                        value={answer[qIdx] || ""}
                        onValueChange={(e) => {
                          setAnswer((prev) => ({
                            ...prev,
                            [qIdx]: e,
                          }));
                        }}
                        className="gap-2"
                      >
                        {qObj.options.map((opt, optIdx) => (
                          <Radio key={optIdx} value={optIdx}>
                            {opt}
                          </Radio>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              ) : (
                <RadioGroup
                  value={answer}
                  onValueChange={(e) => {
                    setAnswer(e);
                  }}
                  className="gap-2"
                >
                  {options.map((option, index) => (
                    <Radio key={index} value={index}>
                      {option}
                    </Radio>
                  ))}
                </RadioGroup>
              ))}
            {type === "input" && (
              <Input
                value={answer}
                onValueChange={(e) => {
                  setAnswer(e);
                }}
                placeholder="Type your answer here"
                className="w-full"
              />
            )}
          </CardBody>
          <CardFooter className="px-0 mt-4 pb-4 pt-0">
            <Button
              color="primary"
              onPress={(e) => {
                answer != undefined
                  ? onSubmit(answer)
                  : toast.error("Your Answer is empty" + answer);
              }}
              className="w-auto mr-2"
              disabled={!answer}
            >
              Submit Answer
            </Button>
          </CardFooter>
        </Card>
      )}
    </motion.div>
  );
}
