import { supabase } from "@/utils/supabaseClient";
import { Button, Spacer, Textarea } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function WordOfTheDay() {
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [data, setData] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null); // Store review and score
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if a submission exists

  // Fetch the word of the day
  async function getWord() {
    const { data, error } = await supabase
      .from("word_of_the_day")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) {
      toast.error("Unable to get the word of the day");
      return;
    }
    if (data && data.length > 0) {
      setData(data[0]);
      checkSubmission(data[0].id); // Check if a submission exists for this word
    }
  }

  // Check if a submission for the current word exists
  async function checkSubmission(wordId) {
    const { data: submissionData, error } = await supabase
      .from("wotd_submissions")
      .select("*")
      .eq("word_id", wordId)
      .limit(1);

    if (error) {
      toast.error("Error checking submissions");
      return;
    }

    if (submissionData && submissionData.length > 0) {
      setSubmissionResult(submissionData[0]); // Display the existing submission
      setHasSubmitted(true); // Prevent showing the input area
    }
  }

  // Submit a sentence
  async function handleSubmit() {
    if (!input) {
      toast.error("Please write a sentence before submitting!");
      return;
    }

    if (!data?.id) {
      toast.error("Word of the day is not available!");
      return;
    }

    // Check if the input contains the word of the day (case-insensitive, whole word)
    if (data?.word) {
      const wordRegex = new RegExp(`\\b${data.word}\\b`, "i");
      if (!wordRegex.test(input)) {
        toast.error(`Your sentence must use the word "${data.word}"`);
        return;
      }
    }

    setIsAnalyzing(true);

    const { data: submissionData, error } = await supabase
      .from("wotd_submissions")
      .insert([{ sentence: input, word_id: data.id }])
      .select();

    setIsAnalyzing(false);

    if (error) {
      toast.error("Failed to submit your sentence");
    } else if (submissionData && submissionData.length > 0) {
      toast.success("Sentence submitted successfully!");
      setInput(""); // Clear the textarea after submission
      setSubmissionResult(submissionData[0]); // Store the review and score
      setHasSubmitted(true); // Prevent further submissions
    }
  }

  useEffect(() => {
    getWord();
  }, []);

  return (
    <div className="w-full flex flex-col justify-start items-start">
      <h2 className="text-2xl font-bold font-sans text-primary">
        Word of The Day
      </h2>
      <div className="w-full rounded-xl mb-2 bg-gray-50 text-left p-4">
        <p>
          <strong>Today's Word</strong>
        </p>
        <Spacer y={1} />
        <h2 className="text-2xl font-bold text-purple-500">{data?.word}</h2>
        <p>
          <strong>Meaning</strong>: {data?.meaning}
        </p>
      </div>
      {!hasSubmitted && (
        <div className="w-full flex flex-row items-center justify-start rounded-xl bg-gray-50 text-left p-4">
          <Textarea
            variant="bordered"
            value={input}
            label="Make a Sentence with the Given Word"
            placeholder="Type your sentence here..."
            onChange={(e) => setInput(e.target.value)}
          />
          <Spacer x={2} />
          <Button
            isLoading={isAnalyzing}
            className="bg-gradient-purple border-1 border-white shadow-md text-white"
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      )}
      {submissionResult && (
        <div className="w-full rounded-xl mt-2 bg-gray-50 text-left p-4">
          <p>
            <strong>Review:</strong> {submissionResult.review}
          </p>
          <p>
            <strong>Score:</strong> {submissionResult.score}
          </p>
        </div>
      )}
    </div>
  );
}
