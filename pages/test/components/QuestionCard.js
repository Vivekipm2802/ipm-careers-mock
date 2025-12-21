import {
  Button,
  Divider,
  Input,
  Radio,
  RadioGroup,
  ScrollShadow,
  Spacer,
} from "@nextui-org/react";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";

export default function QuestionCard({
  question,
  onSelect,
  index,
  onReview,
  isMarked,
  report,
  onFinish,
  onTempAnswer,
  onNext,
  onClearResponse,
}) {
  const [answeredData, setAnsweredData] = useState();
  const [inputValue, setInputValue] = useState("");

  const { id, title, type, questionimage, options, label } = question || {};

  const isDevelopment = process.env.NODE_ENV === "development";

  // Reset input value when question changes or when response is cleared
  useEffect(() => {
    if (!question) return;
    const existingReport = report?.find((item) => item.id === question.id);
    if (!existingReport) {
      setInputValue("");
      setAnsweredData(undefined);
    } else if (existingReport && type === "input" && existingReport.value) {
      setInputValue(existingReport.value || "");
    }
  }, [question?.id, report, type]);

  if (!question) {
    return <div>Question Undefined</div>;
  }

  return (
    <div className="font-sans w-full flex-1 flex flex-col text-left overflow-hidden">
      <div className="rounded-xl w-full h-full flex flex-col items-start justify-start  relative overflow-y-auto">
        <div className="w-full flex-1 h-full flex flex-col items-start justify-start p-4 lg:p-8">
          <h2 className="font-medium text-md text-primary">Question {index}</h2>
          <Divider className="my-2" />
          <h2 className="font-bold text-2xl text-primary">
            {title} {isDevelopment && `Question ID ${id}`}
          </h2>
          <Spacer y={4} />
          <div className="w-full flex flex-col flex-1 mb-auto">
            <ScrollShadow
              className="font-medium [&_*]:sm:!text-sm [&_*]:!text-xs [&_*]:!font-normal [&_*]:!font-sans text-sm qcontent overflow-y-auto max-h-[40vh] lg:max-h-[40vh]"
              dangerouslySetInnerHTML={{ __html: question.question }}
            />
            <Spacer y={4} />
            <Divider />
            <Spacer y={4} />
            {questionimage && (
              <img
                className="max-h-[30vh]"
                src={questionimage}
                alt="Question"
              />
            )}
            <ul className="p-0">
              {type === "options" && (
                <RadioGroup
                  label={label || "Select the correct option"}
                  classNames={{ label: "gradtext text-md font-bold" }}
                  value={
                    report?.find((item) => item.id == question.id)
                      ?.selectedOption ||
                    (answeredData?.selectedOption
                      ? String(answeredData.selectedOption)
                      : "")
                  }
                  onValueChange={(e) => {
                    const answerData = { selectedOption: e, ...question };
                    setAnsweredData(answerData);
                    // Immediately notify parent for icon update
                    if (onTempAnswer) {
                      onTempAnswer(answerData);
                    }
                  }}
                >
                  {options.map((option, index) => (
                    <Radio
                      className="flex flex-row items-center justify-start"
                      value={String(index + 1)}
                      key={index}
                    >
                      {option.image ? (
                        <img
                          src={option.image}
                          className="w-auto h-[64px] object-contain"
                          alt={`Option ${index + 1}`}
                        />
                      ) : (
                        <>
                          <p className="text-sm">{option.title}</p>
                          {isDevelopment && option.isCorrect && (
                            <div className="rounded-full w-1 h-1 bg-green-500" />
                          )}
                        </>
                      )}
                    </Radio>
                  ))}
                </RadioGroup>
              )}
              {type === "input" && (
                <>
                  <Spacer y={4} />
                  <Input
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      const answerData = { ...question, value: e.target.value };
                      setAnsweredData(answerData);
                      // Immediately notify parent for icon update
                      if (onTempAnswer) {
                        onTempAnswer(answerData);
                      }
                    }}
                    placeholder="Enter your Answer Here"
                    label="Answer"
                  />
                  {isDevelopment && <div>Answer: {options.answer}</div>}
                  <Spacer y={4} />
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="sticky bg-white border-t-1 w-full bottom-0 p-4 flex items-center justify-between">
          <div>
            <Button
              color={isMarked ? "success" : "primary"}
              variant={isMarked ? "flat" : undefined}
              size="sm"
              onPress={() => {
                isMarked ? "" : onReview(question.id);
              }}
              startContent={
                isMarked && <Check className="text-success" size={16}></Check>
              }
            >
              {isMarked ? "Marked for Review" : "Mark this question for Review"}
            </Button>
            <Button
              color="warning"
              variant="flat"
              className="ml-2"
              size="sm"
              onPress={() => {
                if (onClearResponse) {
                  onClearResponse(question.id);
                  setAnsweredData(undefined);
                  setInputValue("");
                }
              }}
              isDisabled={
                !answeredData && !report?.find((item) => item.id == question.id)
              }
            >
              Clear Response
            </Button>
            <Button
              color="primary"
              className="text-white ml-2"
              size="sm"
              onPress={() => {
                if (answeredData) {
                  // If there's unsaved answer data, save it
                  onSelect(answeredData);
                  setAnsweredData(undefined);
                } else {
                  // If already answered or marked for review, navigate to next question
                  setAnsweredData(undefined);
                  if (
                    onNext &&
                    report?.find((item) => item.id == question.id)
                  ) {
                    onNext();
                  }
                }
              }}
              isDisabled={
                !answeredData && !report?.find((item) => item.id == question.id)
              }
            >
              {answeredData ? "Save & Next" : "Next"}
              <svg
                width="14"
                height="14"
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
          <Button
            color="danger"
            className="text-white"
            size="sm"
            onPress={() => {
              if (onFinish) onFinish();
            }}
          >
            Finish Test
          </Button>
        </div>
      </div>
    </div>
  );
}
