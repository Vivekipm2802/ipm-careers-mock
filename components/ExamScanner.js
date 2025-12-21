import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spacer,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import styles from "./ExamScanner.module.css";
import CustomRenderMethod from "./CustomRenderMethod";
import { Clock3 } from "lucide-react";
function ExamScanner() {
  const [questions, setQuestions] = useState();
  const [categories, setCategories] = useState();
  const [tabs, setTabs] = useState();
  const [views, setViews] = useState(0);
  const [activeTab, setActiveTab] = useState();
  const [tabCategories, setTabCategories] = useState();
  const [subTab, setSubTab] = useState();
  const [activeQuestion, setActiveQuestion] = useState();
  const [option, setOption] = useState();
  const [error, setError] = useState();
  const [open, setOpen] = useState();

  async function getTabs() {
    const { data, error } = await supabase
      .from("tab_category")
      .select("*")
      .eq("type", "segment");

    if (data) {
      setTabs(data);
      toast.success("Loaded Tabs");
    } else {
      toast.error("Unable to Load Tabs");
    }
  }
  async function getTabCategories(a) {
    setTabCategories();
    const { data, error } = await supabase
      .from("tab_category")
      .select("*")
      .eq("type", "sub")
      .eq("parent", a);

    if (data) {
      setTabCategories(data);
      toast.success("Loaded Tab Categories");
    } else {
      toast.error("Unable to Load Tab Categories");
    }
  }

  async function getCategories(a) {
    const { data, error } = await supabase
      .from("question_category")
      .select("*")
      .eq("parent_category", a);

    if (data && data?.length > 0) {
      setCategories(data);
      toast.success("Loaded Categories");
    }
    if (data && data?.length == 0) {
      toast.error("This Category has no data");
    }
    if (error) {
      toast.error("Unable to Load Categories");
    }
  }

  async function loadQuestionbyId(a) {
    setQuestions();
    const r = toast.loading("Loading Questions");
    const { data, error } = await supabase
      .from("scanner_questions")
      .select("*")
      .eq("category", a)
      .order("created_at", { ascending: true });
    if (data) {
      setQuestions(data);
      toast.success("Loaded Quetsions");
      setViews(1);
    } else {
      alert("Unable to load");
      toast.success("Unable to Load Quetsions");
    }
    toast.remove(r);
  }
  function checkWin(a, b) {
    if (a == b) {
      setError([
        "Yes,You are absolutely right ! You may review the solution if you want",
        "green",
      ]);
    } else {
      setError([
        "Incorrect Option , Please Try Again or Check the Solution",
        "red",
      ]);
    }
  }
  /*     
useEffect(()=>{
    getTabs()
},[]) */

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <Chip
        color="primary"
        size="lg"
        startContent={<Clock3 className="mr-2" size={24}></Clock3>}
      >
        Will be available soon
      </Chip>
      <Spacer y={2}></Spacer>
      <p>We are preparing magical content for you , check back soon :)</p>
    </div>
  );

  return (
    <div className="w-full h-full bg-gray-100 rounded-md flex flex-col justify-start p-4 items-start overflow-hidden">
      {views == 0 ? (
        <div className="w-full">
          <h2 className="text-left w-full text-lg font-semibold">
            Select a Exam
          </h2>
          <div className="w-full flex flex-col">
            {tabs &&
              tabs.map((i, d) => {
                return (
                  <div
                    onClick={() => {
                      getTabCategories(i.id), setActiveTab(d), setCategories();
                    }}
                    className={`bg-white  rounded-md shadow-sm my-1 p-2 text-left hover:bg-primary transition-all ${
                      activeTab == d ? "!bg-primary" : ""
                    }`}
                  >
                    <p>{i.title}</p>
                  </div>
                );
              })}
          </div>

          {tabCategories != undefined && tabCategories?.length > 0 ? (
            <h2 className="text-left w-full text-lg font-semibold">
              Select a Category
            </h2>
          ) : (
            ""
          )}
          <div className="w-full flex flex-col">
            {tabCategories != undefined &&
              tabCategories.map((i, d) => {
                return (
                  <div
                    onClick={() => {
                      getCategories(i.id), setSubTab(d);
                    }}
                    className={`bg-white  rounded-md shadow-sm my-1 p-2 text-left hover:bg-primary transition-all ${
                      subTab == d ? "!bg-primary" : ""
                    }`}
                  >
                    <p>{i.title}</p>
                  </div>
                );
              })}
          </div>

          {categories != undefined && categories?.length > 0 ? (
            <h2 className="text-left w-full text-lg font-semibold">
              Select a Sub Category
            </h2>
          ) : (
            ""
          )}
          <div className="w-full flex flex-col overflow-y-auto h-full max-h-[60vh]">
            {categories != undefined &&
              categories.map((i, d) => {
                return (
                  <div
                    onClick={() => {
                      loadQuestionbyId(i.id);
                    }}
                    className="bg-white  rounded-md shadow-sm my-1 p-2 text-left hover:bg-primary transition-all"
                  >
                    <p>{i.title}</p>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        ""
      )}

      {views == 1 ? (
        <div className="w-full flex flex-col">
          <Button
            color="primary"
            className="mr-auto my-2"
            onPress={() => {
              setViews(0);
            }}
          >
            Back to Selection
          </Button>
          <div className="flex flex-col w-full shadow-sm hover:shadow-md rounded-lg">
            {questions != undefined && questions?.length > 0 ? (
              <h2 className="text-left w-full text-lg font-semibold">
                Select a Question
              </h2>
            ) : (
              ""
            )}
            <div className="w-full flex flex-col overflow-y-auto h-full max-h-[60vh]">
              {questions != undefined &&
                questions.map((i, d) => {
                  return (
                    <div
                      onClick={() => {
                        setActiveQuestion(i), setViews(2);
                      }}
                      className="bg-white  rounded-md shadow-sm my-1 p-2 text-left hover:bg-primary transition-all"
                    >
                      <p>{i.question}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        ""
      )}

      {views == 2 && activeQuestion != undefined ? (
        <div className="w-full flex flex-col sf">
          <Modal
            placement="center"
            isOpen={open}
            onClose={() => {
              setOpen(false);
            }}
            scrollBehavior="inside"
          >
            <ModalContent>
              <ModalHeader>{activeQuestion.question}</ModalHeader>
              <ModalBody className="max-h-[70vh]">
                <div className={styles.scroller}>
                  <h2 className="text-md font-semibold text-left sf">
                    Solution
                  </h2>
                  {/* <CustomRenderMethod data={a.description}/> */}
                  <div className="text-left flex flex-col justify-start items-start text-sm">
                    <CustomRenderMethod data={activeQuestion.answer} />
                  </div>

                  {activeQuestion.video ? (
                    <>
                      <Spacer y={2}></Spacer>
                      <Divider></Divider>
                      <Spacer y={2}></Spacer>
                      <h2 className={styles.label + " my-2 sf"}>
                        Video Explanation
                      </h2>
                      <div className={styles.iframe_container}>
                        {activeQuestion.isYT ? (
                          <iframe
                            width="100%"
                            height="100%"
                            src={activeQuestion.video}
                            frameborder="0"
                            allowfullscreen
                          ></iframe>
                        ) : (
                          <video controls>
                            <source
                              src={activeQuestion.video}
                              type="video/mp4"
                            />
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                    </>
                  ) : (
                    ""
                  )}
                  <Spacer y={2}></Spacer>
                  <Divider></Divider>
                  <Spacer y={2}></Spacer>
                  {activeQuestion?.audio ? (
                    <>
                      <h2 className={styles.label}>Audio Explanation</h2>
                      <div className={"audiocont"}>
                        <h2>Play the audio to listen to the solution</h2>
                        <audio
                          controls
                          src={activeQuestion.audio}
                          onPlay={(e) => console.log("onPlay")}
                        />
                      </div>
                    </>
                  ) : (
                    ""
                  )}

                  <div className={styles.shares}>
                    <ShareButtons
                      title={activeQuestion.question}
                      url={`https://study.ipmcareer.com/question/${activeQuestion.slug}`}
                    ></ShareButtons>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="faded"
                  color="danger"
                  onPress={() => {
                    setOpen(false);
                  }}
                >
                  Close
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
          <Button
            color="primary"
            className="mr-auto my-2"
            onPress={() => {
              setViews(1);
            }}
          >
            Back to Questions
          </Button>
          {/*   <h2 className="text-left w-ful font-semibold text-md">{activeQuestion.question}</h2> */}

          <div className={styles.question_wrap + " w-full "}>
            {/* <p className={styles.breadcrumb}>Home {">>"} <a href={`/question_category/${z.category.slug}`} style={{color:"var(--brand-col2)"}}>{z?.category?.title}</a> {">>"} {z.slug}</p> */}
            {activeQuestion.image ? <img src={activeQuestion.image} /> : ""}
            <h1 className={styles.heading + " text-left !text-md"}>
              {activeQuestion.question}
            </h1>
            <div
              className={styles.qdesc + " overflow-y-auto h-auto max-h-[30vh]"}
            >
              <CustomRenderMethod
                key={activeQuestion.id}
                data={activeQuestion.description}
              />
            </div>
            {/* <CustomRenderMethod data={activeQuestion.answer}/> */}
            <Divider></Divider>
            <h4 className="text-left">Select the Correct Option:</h4>
            <div className="w-full flex flex-row flex-wrap">
              {activeQuestion && questions.length > 0 && activeQuestion.options
                ? activeQuestion.options.answers.map((l, k) => {
                    return (
                      <div
                        onClick={() => {
                          setOption(k),
                            setError(),
                            checkWin(
                              k,
                              activeQuestion.options.correctAnswerIndex
                            );
                        }}
                        className={
                          styles.item +
                          " flex-grow-0 flex-[45%] !m-1 flex " +
                          (option == k ? styles.activeQ : "")
                        }
                      >
                        <svg
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm3.22 6.97-4.47 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 1 0-1.06-1.06Z"
                            fill="#DDE6E8"
                          />
                        </svg>
                        {l}
                      </div>
                    );
                  })
                : ""}
            </div>
            {error != undefined ? (
              <div
                className={styles.error + " text-xs text-left my-2"}
                style={{ color: error[1] }}
              >
                {error[0]}
              </div>
            ) : (
              ""
            )}
            <Divider></Divider>
            <div className={"my-1 flex flex-row justify-start items-start"}>
              <Button
                className={styles.btn}
                size="sm"
                onPress={() => {
                  setOpen(true);
                }}
              >
                Check Solution
              </Button>
            </div>

            <div className={styles.spacer}></div>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}
const ShareButtons = ({ url, title }) => {
  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(title)}`,
      "_blank"
    );
  };

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/shareArticle?url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent(title)}`,
      "_blank"
    );
  };

  const shareOnPinterest = () => {
    window.open(
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
        url
      )}&description=${encodeURIComponent(title)}`,
      "_blank"
    );
  };

  return (
    <div className={styles.sharebuttons}>
      <h3>Share the solution with your mates:</h3>
      <button onClick={shareOnFacebook}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="126.445 2.281 589 589"
          id="facebook"
        >
          <circle cx="420.945" cy="296.781" r="294.5" fill="#3c5a9a"></circle>
          <path
            fill="#fff"
            d="M516.704 92.677h-65.239c-38.715 0-81.777 16.283-81.777 72.402.189 19.554 0 38.281 0 59.357H324.9v71.271h46.174v205.177h84.847V294.353h56.002l5.067-70.117h-62.531s.14-31.191 0-40.249c0-22.177 23.076-20.907 24.464-20.907 10.981 0 32.332.032 37.813 0V92.677h-.032z"
          ></path>
        </svg>
      </button>
      <button onClick={shareOnTwitter}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          id="twitter"
          width={24}
          height={24}
        >
          <path
            fill="#03A9F4"
            d="M16 3.539a6.839 6.839 0 0 1-1.89.518 3.262 3.262 0 0 0 1.443-1.813 6.555 6.555 0 0 1-2.08.794 3.28 3.28 0 0 0-5.674 2.243c0 .26.022.51.076.748a9.284 9.284 0 0 1-6.761-3.431 3.285 3.285 0 0 0 1.008 4.384A3.24 3.24 0 0 1 .64 6.578v.036a3.295 3.295 0 0 0 2.628 3.223 3.274 3.274 0 0 1-.86.108 2.9 2.9 0 0 1-.621-.056 3.311 3.311 0 0 0 3.065 2.285 6.59 6.59 0 0 1-4.067 1.399c-.269 0-.527-.012-.785-.045A9.234 9.234 0 0 0 5.032 15c6.036 0 9.336-5 9.336-9.334 0-.145-.005-.285-.012-.424A6.544 6.544 0 0 0 16 3.539z"
          ></path>
        </svg>
      </button>
      <button onClick={shareOnLinkedIn}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="24"
          height="24"
          id="linkedin"
        >
          <g fill="#1976D2">
            <path d="M0 5h3.578v11H0zM13.324 5.129c-.038-.012-.074-.025-.114-.036a2.32 2.32 0 0 0-.145-.028A3.207 3.207 0 0 0 12.423 5c-2.086 0-3.409 1.517-3.845 2.103V5H5v11h3.578v-6s2.704-3.766 3.845-1v7H16V8.577a3.568 3.568 0 0 0-2.676-3.448z"></path>
            <circle cx="1.75" cy="1.75" r="1.75"></circle>
          </g>
        </svg>
      </button>
      <button onClick={shareOnPinterest}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="24"
          height="24"
          id="pinterest"
        >
          <path
            fill="#D32F2F"
            d="M8.717 0C4.332 0 2 2.81 2 5.874c0 1.421.794 3.193 2.065 3.755.193.087.298.05.341-.129.038-.136.205-.791.286-1.1a.283.283 0 0 0-.068-.278c-.422-.488-.757-1.377-.757-2.211 0-2.137 1.699-4.212 4.59-4.212 2.5 0 4.249 1.624 4.249 3.947 0 2.625-1.389 4.441-3.194 4.441-.999 0-1.743-.784-1.507-1.754.285-1.155.844-2.397.844-3.23 0-.747-.422-1.365-1.284-1.365-1.017 0-1.842 1.007-1.842 2.359 0 .859.304 1.439.304 1.439l-1.193 4.823c-.316 1.285.043 3.366.074 3.545.019.099.13.13.192.049.099-.13 1.315-1.865 1.656-3.119.124-.457.633-2.31.633-2.31.335.605 1.302 1.112 2.332 1.112 3.064 0 5.278-2.693 5.278-6.035C14.988 2.397 12.246 0 8.717 0"
          ></path>
        </svg>
      </button>
    </div>
  );
};
export default ExamScanner;
