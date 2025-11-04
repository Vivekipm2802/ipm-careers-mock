import { supabase } from "@/utils/supabaseClient";
import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spacer,
} from "@nextui-org/react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { useNMNContext } from "./NMNContext";
import { CtoLocal } from "@/utils/DateUtil";
import {
  isAfter,
  isBefore,
  addDays,
  parseISO,
  format,
  endOfDay,
} from "date-fns";
import { ChartBarIncreasing, ChartSplineIcon, Lock } from "lucide-react";

export default function MockTests({ enrolled = [] }) {
  const { isDemo } = useNMNContext();
  const [type, setType] = useState(0);
  const [tests, setTests] = useState();
  const [courses, setCourses] = useState();
  const [categories, setCategories] = useState();
  const [allCategories, setAllCategories] = useState();
  const [activeCategory, setActiveCategory] = useState(0);
  const [allTests, setAllTests] = useState();
  const [results, setResults] = useState();
  const [activeResult, setActiveResult] = useState(undefined);

  // Create a Set of test IDs that have results for O(1) lookup
  const testIdsWithResults = results
    ? new Set(results.map((r) => r.test_id))
    : new Set();

  async function getCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title")
      .order("id", { ascending: true });
    if (data) {
      setCourses(data);
    }
  }

  async function getResults() {
    let allResults = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("mock_plays")
        .select("uid, test_id, created_at")
        .range(from, from + batchSize - 1);

      if (error) {
        console.error("Error fetching results:", error);
        return;
      }

      if (data && data.length > 0) {
        allResults = [...allResults, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    setResults(allResults);
  }
  async function getCategories(a) {
    const r = toast.loading("getting categories");
    const { data, error } = await supabase
      .from("mock_categories")
      .select("id, title, seq")
      .order("seq", { ascending: true });
    if (data) {
      toast.remove(r);
      setCategories(data);
    } else {
      toast.error("failed to get categories");
      toast.remove(r);
    }
  }

  async function getAllCategories(a) {
    const { data, error } = await supabase
      .from("mock_categories_view")
      .select("id, title, seq")
      .order("seq", { ascending: true });
    if (data) {
      setAllCategories(data);
    } else {
      toast.error("failed to get categories");
    }
  }

  async function getTests() {
    const { data, error } = await supabase
      .from("mock_test")
      .select(
        "id, title, description, category, course, seq, start_time, end_time, uid, config"
      )
      .order("seq", { ascending: true });

    if (data) {
      setTests(data);
    } else {
      toast.error("Error loading tests.");
    }
  }
  async function getAllTests() {
    const { data, error } = await supabase
      .from("mock_test_view")
      .select(
        "id, title, description, category, course, seq, start_time, end_time, config"
      )
      .order("seq", { ascending: true });

    if (data) {
      setAllTests(data);
    } else {
      toast.error("Error loading tests.");
    }
  }
  const router = useRouter();

  useEffect(() => {
    getCourses();
    getTests();
    getAllTests();
    getCategories();
    getAllCategories();
    getResults();
  }, []);
  return (
    <div className="flex flex-col overflow-hidden justify-start items-start w-full">
      <Modal
        isOpen={activeResult}
        onClose={() => {
          setActiveResult(undefined);
        }}
      >
        <ModalContent>
          <ModalHeader>Your Attempts</ModalHeader>
          <ModalBody>
            {results &&
              results
                .filter((item) => item.test_id == activeResult)
                ?.map((i, d) => {
                  return (
                    <div
                      key={i.uid || d}
                      className="flex flex-row items-center justify-between"
                    >
                      <div className="flex-1">
                        <h2 className="text-xs">
                          <strong className="text-primary">
                            {CtoLocal(i?.created_at)?.time}{" "}
                            {CtoLocal(i?.created_at)?.amPm}
                          </strong>
                          <br />
                          {CtoLocal(i?.created_at)?.date}{" "}
                          {CtoLocal(i?.created_at)?.monthName}{" "}
                          {CtoLocal(i?.created_at)?.year}
                        </h2>
                      </div>
                      <div className="flex flex-row items-center justify-end">
                        <Button
                          endContent={
                            <ChartBarIncreasing size={16}></ChartBarIncreasing>
                          }
                          as={Link}
                          target="_blank"
                          href={`/mock/result/${i?.uid}`}
                          size="sm"
                          color="success"
                        >
                          View Result
                        </Button>
                        <Spacer x={2}></Spacer>
                        <Button
                          endContent={
                            <ChartSplineIcon size={16}></ChartSplineIcon>
                          }
                          as={Link}
                          target="_blank"
                          href={`/mock/analytics/${i?.uid}`}
                          size="sm"
                          className="text-white bg-gradient-purple"
                        >
                          View Analysis
                        </Button>
                      </div>
                    </div>
                  );
                })}
          </ModalBody>
          <ModalFooter>
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={() => {
                setActiveResult(undefined);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {tests != undefined ? (
        <div className="pr-2 mt-4 overflow-hidden flex flex-col justify-start items-start flex-1 h-full  w-full text-left">
          <h2 className="font-bold text-2xl text-primary">Mock Tests</h2>
          <Spacer x={2}></Spacer>
          <div className="flex flex-row justify-start items-center">
            <div className="flex flex-row p-2 rounded-xl bg-gray-200 text-sm items-center justify-start">
              <div
                className={
                  " rounded-xl p-2 font-sans font-medium " +
                  (type == 0 ? "shadow-md bg-white" : "")
                }
                onClick={() => {
                  setType(0);
                }}
              >
                By Category
              </div>
              {isDemo ? (
                ""
              ) : (
                <>
                  {" "}
                  <Spacer x={2}></Spacer>
                  <div
                    className={
                      " rounded-xl p-2 font-sans font-medium " +
                      (type == 1 ? "shadow-md bg-white" : "")
                    }
                    onClick={() => {
                      setType(1);
                    }}
                  >
                    By Courses
                  </div>
                </>
              )}
            </div>
          </div>
          <Spacer y={4} x={4}></Spacer>
          <AnimatePresence mode="wait">
            <motion.div
              transition={{
                duration: 0.2, // duration in seconds
                ease: [0.82, -0.07, 0, 1.13], // cubic-bezier values
              }}
              key={type + "div"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="overflow-hidden w-full 1 h-full flex flex-col items-start justify-start "
            >
              {type == 0 ? (
                <>
                  {categories && categories?.length == 0
                    ? "No Category Found , Please try adding one"
                    : ""}

                  <div className="w-full h-full flex flex-col items-start justify-start overflow-hidden">
                    {tests && tests?.length == 0
                      ? "No Test Found , Please try adding one"
                      : ""}
                    <Spacer y={4} x={4}></Spacer>

                    <div className="w-full flex flex-row flex-shrink-0 scrollbar-hide overflow-x-auto items-center justify-start">
                      {categories &&
                        categories?.map((z, v) => {
                          return (
                            <div
                              key={z.id}
                              onClick={() => {
                                setActiveCategory(v);
                              }}
                              className={
                                "bg-gray-100 flex-shrink-0 px-3 cursor-pointer hover:brightness-90  p-2 text-sm rounded-t-lg  mx-[1px] " +
                                (v == activeCategory &&
                                  " !bg-gradient-purple text-white")
                              }
                            >
                              {z?.title}
                            </div>
                          );
                        })}
                      {categories &&
                        allCategories
                          ?.filter(
                            (item) =>
                              !categories?.some((cat) => cat.id == item.id)
                          )
                          ?.map((z, v) => {
                            return (
                              <div
                                key={z.id}
                                onClick={() => {
                                  setActiveCategory(v);
                                }}
                                className={
                                  "bg-gray-100 flex flex-row flex-shrink-0 px-3 cursor-pointer hover:brightness-90  p-2 text-sm rounded-t-lg  mx-[1px] pointer-events-none grayscale opacity-80 "
                                }
                              >
                                <Lock size={16} className="mr-2"></Lock>
                                {z?.title}
                              </div>
                            );
                          })}
                    </div>
                    <motion.div
                      key={activeCategory}
                      initial={{ y: 10, opacity: 0 }}
                      exit={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 100 }}
                      transition={{ duration: 0.2, type: "tween" }}
                      className="w-full p-3 border-1 bg-gray-50 rounded-b-xl overflow-y-auto"
                    >
                      {allTests?.length == 0 && tests?.length == 0 ? (
                        <div className="rounded-xl bg-white w-full border-gray-300 border-1 border-dashed text-gray-600 my-2 p-2 text-center ">
                          No Test Found in this Category
                        </div>
                      ) : (
                        ""
                      )}
                      {tests &&
                        categories &&
                        tests
                          ?.filter(
                            (item) =>
                              item?.category == categories[activeCategory]?.id
                          )
                          ?.map((i, d) => {
                            return (
                              <ListCard
                                key={i.id}
                                hasResult={testIdsWithResults.has(i?.id)}
                                openResult={() => {
                                  setActiveResult(i?.id);
                                }}
                                i={i}
                              ></ListCard>
                            );
                          })}

                      {tests &&
                        allTests &&
                        categories &&
                        allTests
                          ?.filter(
                            (item) =>
                              item?.category ==
                                categories[activeCategory]?.id &&
                              !tests?.some((test) => test.id == item.id)
                          )
                          ?.map((i, d) => {
                            return (
                              <ListCard
                                key={i.id}
                                hasResult={testIdsWithResults.has(i?.id)}
                                openResult={() => {
                                  setActiveResult(i?.id);
                                }}
                                demo={
                                  i?.config?.public_access !== true &&
                                  !enrolled?.some(
                                    (enrollment) =>
                                      enrollment?.course?.id === i?.course
                                  )
                                }
                                i={i}
                              ></ListCard>
                            );
                          })}
                    </motion.div>
                    {/* {categories && categories?.map((z,v)=>{
    return <><div className="font-sans font-semibold text-lg my-4">{z.title}</div>
    <Divider className="my-1"></Divider>
    


    </>
})} */}
                  </div>
                </>
              ) : (
                ""
              )}
              {type == 1 ? (
                <div className="w-full h-full flex flex-col items-start justify-start overflow-y-auto">
                  {courses &&
                    courses?.map((i, d) => {
                      return (
                        <div key={i.id}>
                          <div className="font-sans text-lg font-bold my-4">
                            {i.title}
                          </div>
                          <Divider className="my-1"></Divider>

                          {tests == undefined ||
                          tests?.filter((item) => item.course == i.id) == 0 ? (
                            <div className="rounded-xl border-gray-300 border-1 border-dashed text-gray-600 my-2 p-2 text-center ">
                              No Test Found in this Category
                            </div>
                          ) : (
                            ""
                          )}
                          {tests &&
                            tests
                              ?.filter((item) => item.course == i.id)
                              ?.map((z, d) => {
                                return (
                                  <ListCard
                                    key={z.id}
                                    hasResult={testIdsWithResults.has(z?.id)}
                                    openResult={() => {
                                      setActiveResult(z?.id);
                                    }}
                                    i={z}
                                  ></ListCard>
                                );
                              })}
                        </div>
                      );
                    })}
                </div>
              ) : (
                ""
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}

const ListCard = ({ i, demo, hasResult, openResult }) => {
  return (
    <div className="w-full bg-white rounded-md border-1 border-gray-100 flex flex-row justify-between py-1 px-1 shadow-sm items-center my-1">
      <div className="w-[70px] flex flex-col items-center justify-center aspect-square rounded-lg bg-gray-50">
        <p className="text-xl text-primary font-bold">
          {CtoLocal(i?.start_time)?.date}
        </p>
        <p className="text-xs">{CtoLocal(i?.start_time)?.monthName}</p>
      </div>
      <Spacer x={2}></Spacer>
      <div className="flex flex-col items-start justify-start flex-1 text-left">
        <p className="font-semibold text-primary">{i?.title}</p>
        <p className="text-sm text-gray-500">{i?.description}</p>
      </div>
      <div className="flex flex-row pr-2">
        {hasResult && (
          <Button onPress={() => openResult()} size="sm" color="success">
            View Result
          </Button>
        )}

        {demo == true ? (
          <Button
            size="sm"
            color="secondary"
            className="text-black"
            onPress={() => {
              toast.success("Please contact Us.");
            }}
            endContent={<Lock size={16}></Lock>}
          >
            Unlock
          </Button>
        ) : (
          <>
            {i?.start_time
              ? (() => {
                  const now = new Date();
                  const startTime = parseISO(i.start_time);
                  const availableFrom = addDays(startTime, -2);

                  if (
                    isAfter(now, availableFrom) &&
                    isBefore(now, addDays(startTime, 1)) &&
                    isBefore(now, parseISO(i?.end_time))
                  ) {
                    return (
                      <Button
                        size="sm"
                        className="ml-2 text-white"
                        color="primary"
                        as={Link}
                        href={`/mock/${i?.uid}`}
                        target="_blank"
                      >
                        Select Test
                      </Button>
                    );
                  } else if (isBefore(now, availableFrom)) {
                    return (
                      <span className="ml-2 text-sm text-gray-500">
                        Available from {format(startTime, "MMM dd, yyyy")}
                      </span>
                    );
                  } else if (
                    i?.end_time &&
                    isAfter(now, endOfDay(parseISO(i.end_time)))
                  ) {
                    return (
                      <span className="ml-2 text-sm text-gray-500">
                        Test time has passed
                      </span>
                    );
                  } else if (
                    i?.end_time &&
                    isBefore(now, parseISO(i?.end_time))
                  ) {
                    return (
                      <Button
                        size="sm"
                        className="ml-2 text-white"
                        color="primary"
                        as={Link}
                        href={`/mock/${i?.uid}`}
                        target="_blank"
                      >
                        Select Test
                      </Button>
                    );
                  }

                  return null;
                })()
              : null}
          </>
        )}
      </div>
    </div>
  );
};
