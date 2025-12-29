import { CtoLocal, formatHHMMTo12Hour } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import axios from "axios";
import {
  Button,
  Chip,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollShadow,
  Spacer,
  Tooltip,
} from "@nextui-org/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNMNContext } from "./NMNContext";
import { isToday } from "date-fns";

export default function Classes() {
  const [batches, setBatches] = useState();
  const { isDemo } = useNMNContext();
  const [view, setView] = useState(0);
  const [currentBatch, setCurrentBatch] = useState();
  const [classes, setClasses] = useState();
  const [history, setHistory] = useState();
  const [attendance, setAttendance] = useState();
  const [pin, setPIN] = useState();
  const [isAdmin, setIsAdmin] = useState(false);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        const res = await axios.post("/api/isAdmin", {
          email: user.email,
        });
        if (res.data?.success) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  async function getBatches() {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("User not authenticated");
      return null;
    }

    // First, get the courses the user is enrolled in
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course")
      .eq("email", user.email)
      .eq("is_expired", false);

    if (enrollmentError) {
      toast.error("Unable to Load Enrollments");
      return null;
    }

    if (!enrollmentData || enrollmentData.length === 0) {
      setBatches([]);
      return null;
    }

    // Extract course IDs
    const courseIds = enrollmentData
      .map((enrollment) => enrollment.course)
      .filter(Boolean);

    if (courseIds.length === 0) {
      setBatches([]);
      return null;
    }

    // Fetch batches for the enrolled courses
    const { data, error } = await supabase
      .from("batches")
      .select("*,course_id(*)")
      .in("course_id", courseIds)
      .eq("status", "live")
      .eq("is_deleted", false);

    if (error) {
      toast.error("Unable to Load Batches");
      return null;
    }

    if (data) {
      setBatches(data);
      return null;
    }
  }

  async function getClasses(a) {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("batch_id", a);
    if (error) {
      toast.error("Unable to Load Batches");
      return null;
    }
    if (data) {
      setClasses(data);
      getAttendance(data);
      return null;
    }
  }

  async function getAttendance(a) {
    const uids = Array.isArray(a) ? a?.map((item) => item.uuid) : "";

    const { data, error } = await supabase
      .from("classes_attendance")
      .select("*")
      .in("class_id", uids);
    if (data) {
      setAttendance(data);
    }
    if (error) {
    }
  }
  async function getHistory(a) {
    const { data, error } = await supabase
      .from("classes_history")
      .select("*")
      .eq("batch_id", a)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Unable to Load Classes");
      return null;
    }
    if (data) {
      setHistory(data);
      return null;
    }
  }
  useEffect(() => {
    checkAdmin();
    getBatches();
  }, []);

  async function verifyClassPIN(i, p, b) {
    const r = toast.loading("Verifying PIN");
    const { data, error } = await supabase.rpc("mark_attendance", {
      class_id_arg: i,
      pin_arg: p,
    });
    if (data) {
      if (data && data?.success) {
        toast.success("Verified Successfully");
        toast.remove(r);
        getClasses(b);
      } else {
        toast.error("Invalid Code");
        toast.remove(r);
      }
    }
    if (error) {
      toast.error("Invalid Code");
      toast.remove(r);
    }
  }

  function getDaysComponent(a) {
    const dayMap = [
      {
        title: "Monday",
        short: "M",
        index: 1,
      },
      {
        title: "Tuesday",
        short: "T",
        index: 2,
      },
      {
        title: "Wednesday",
        short: "W",
        index: 3,
      },
      {
        title: "Thursday",
        short: "T",
        index: 4,
      },
      {
        title: "Friday",
        short: "F",
        index: 5,
      },
      {
        title: "Saturday",
        short: "S",
        index: 6,
      },
      {
        title: "Sunday",
        short: "S",
        index: 0,
      },
    ];

    return (
      <Tooltip
        size="sm"
        color="secondary"
        content={dayMap.find((item) => item.index == a)?.title ?? "unknown"}
      >
        <div className="w-4 h-4 mr-1 hover:bg-secondary hover:text-white !hover:border-secondary cursor-pointer hover:scale-125 transition-all text-primary rounded-full border-1 border-primary bg-primary-50 flex flex-col items-center justify-center">
          {dayMap.find((item) => item.index == a)?.short ?? "Error"}
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="w-full flex flex-col h-full items-start justify-start overflow-hidden ">
      <div className="w-full rounded-xl bg-gray-50 h-full p-4 flex flex-col items-start justify-start overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={view + "batches"}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.2, ease: [0.62, 0.13, 0.12, 0.94] }}
            exit={{ x: 50, opacity: 0 }}
            className="w-full flex flex-col items-start justify-start flex-nowrap overflow-hidden"
          >
            {view == 0 ? (
              <>
                <h2 className="text-2xl font-bold text-primary">
                  Your Batches
                </h2>
                <ScrollShadow className="w-full my-4 overflow-y-auto">
                  {batches && batches.length > 0 ? (
                    batches.map((i, d) => {
                      return (
                        <>
                          <div className="w-full rounded-lg bg-white shadow-sm p-4 flex flex-row items-center justify-start">
                            <div className="flex flex-col justify-start items-start">
                              <p className="font-bold text-lg text-primary">
                                {i.title}{" "}
                                {isDemo ? (
                                  <Chip
                                    color="success"
                                    size="sm"
                                    className="ml-2"
                                  >
                                    Demo Batch
                                  </Chip>
                                ) : (
                                  ""
                                )}
                              </p>
                              {i?.description ? (
                                <p className="text-sm text-gray-500 leading-none">
                                  {i.description}
                                </p>
                              ) : (
                                ""
                              )}
                              {isAdmin && (
                                <div className="flex flex-row items-center justify-start my-1">
                                  {i.start_date ? (
                                    <div className="flex flex-row items-center justify-start text-sm">
                                      <p className="font-bold">Start Date:</p>{" "}
                                      <p>
                                        {CtoLocal(i.start_date)?.date}{" "}
                                        {CtoLocal(i.start_date)?.monthName}{" "}
                                        {CtoLocal(i.start_date)?.year}
                                      </p>{" "}
                                    </div>
                                  ) : (
                                    ""
                                  )}
                                  <Spacer x={2} y={2}></Spacer>
                                  {i.end_date ? (
                                    <div className="flex flex-row items-center justify-start text-sm">
                                      <p className="font-bold">End Date:</p>{" "}
                                      <p>
                                        {CtoLocal(i.end_date)?.date}{" "}
                                        {CtoLocal(i.end_date)?.monthName}{" "}
                                        {CtoLocal(i.end_date)?.year}
                                      </p>{" "}
                                    </div>
                                  ) : (
                                    ""
                                  )}
                                </div>
                              )}
                              {/* <div className="flex flex-row items-center justify-start text-xs">
                                Schedules: <Spacer x={1}></Spacer>
                                {i?.days &&
                                  i?.days?.map((z, v) => {
                                    return getDaysComponent(z);
                                  })}
                              </div> */}
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-end">
                              {/* <Button
                                size="sm"
                                color="default"
                                onPress={() => {
                                  isDemo == true
                                    ? toast.error(
                                        "Cannot Access History in Demo Mode"
                                      )
                                    : (setView(2),
                                      setCurrentBatch(i.id),
                                      getHistory(i.id));
                                }}
                              >
                                Class History
                              </Button> */}
                              <Spacer x={2}></Spacer>
                              <Button
                                size="sm"
                                color="primary"
                                onPress={() => {
                                  setView(1),
                                    setCurrentBatch(i.id),
                                    getClasses(i.id);
                                }}
                              >
                                Enter
                              </Button>
                            </div>
                          </div>
                          <Spacer y={2}></Spacer>
                        </>
                      );
                    })
                  ) : (
                    <div className="w-full rounded-lg bg-white shadow-sm p-8 flex flex-col items-center justify-center text-center">
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        No Batches Assigned
                      </p>
                      <p className="text-sm text-gray-500">
                        You are not currently enrolled in any active batches.
                        Please contact your administrator for enrollment.
                      </p>
                    </div>
                  )}
                </ScrollShadow>
              </>
            ) : (
              ""
            )}
            {view == 1 ? (
              <>
                <h2 className="text-2xl font-bold text-primary">
                  Your Classes
                </h2>
                <div className="w-full my-4 flex flex-col items-start justify-start">
                  <Button
                    color="primary"
                    size="sm"
                    startContent={
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z"
                          fill="#ffffff"
                        />
                      </svg>
                    }
                    onPress={() => {
                      setView(0), setClasses(), setHistory();
                    }}
                  >
                    Back to Batches
                  </Button>
                  <Spacer y={2}></Spacer>
                  {classes &&
                    classes.map((i, d) => {
                      return (
                        <>
                          <div className="w-full rounded-lg bg-white shadow-sm p-4 flex flex-row items-center justify-start">
                            <div className="flex flex-col items-start justify-start">
                              {" "}
                              <p className="text-lg text-primary font-bold">
                                {i.title ?? "Today's Class"}
                              </p>
                              <div className="flex flex-row items-center justify-start">
                                {/* <h2 className="font-semibold text-purple-900">
                                  {formatHHMMTo12Hour(i.start_time)}
                                </h2> */}
                                {isToday(i?.start_time) && (
                                  <Chip
                                    color="success"
                                    size="sm"
                                    className="ml-2"
                                  >
                                    Today
                                  </Chip>
                                )}
                              </div>
                              <div className="flex flex-row items-center justify-start my-1">
                                {i.start_time ? (
                                  <div className="flex flex-row items-center justify-start text-sm">
                                    <p className="font-bold"></p>{" "}
                                    <p>{formatHHMMTo12Hour(i.start_time)}</p>{" "}
                                  </div>
                                ) : (
                                  ""
                                )}

                                <p className="mx-2">-</p>
                                {i.end_time ? (
                                  <div className="flex flex-row items-center justify-start text-sm">
                                    <p className="font-bold"></p>{" "}
                                    <p>{formatHHMMTo12Hour(i.end_time)}</p>{" "}
                                  </div>
                                ) : (
                                  ""
                                )}
                              </div>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-end">
                              {attendance &&
                              attendance?.some(
                                (item) => item.class_id == i.uuid
                              ) ? (
                                <p className="text-lime-700 flex flex-row items-center justify-center font-semibold border-1 rounded-lg p-2 border-lime-500 text-xs">
                                  <Check size={16} className="mr-2"></Check>
                                  Marked as Attended
                                </p>
                              ) : (
                                // <Popover>
                                //   <PopoverTrigger>
                                //     <Button
                                //       endContent={
                                //         <CheckCircle size={16}></CheckCircle>
                                //       }
                                //       size="sm"
                                //       color="success"
                                //     >
                                //       Mark Attendance
                                //     </Button>
                                //   </PopoverTrigger>
                                //   <PopoverContent className="p-4">
                                //     <Input
                                //       maxLength={6}
                                //       minLength={4}
                                //       label="Class PIN"
                                //       onChange={(e) => {
                                //         setPIN(e.target.value);
                                //       }}
                                //       placeholder="Enter Class PIN"
                                //     ></Input>
                                //     <Spacer y={2}></Spacer>
                                //     <Button
                                //       color="success"
                                //       size="sm"
                                //       onPress={() => {
                                //         verifyClassPIN(i.id, pin, i.batch_id);
                                //       }}
                                //     >
                                //       Verify PIN
                                //     </Button>
                                //   </PopoverContent>
                                // </Popover>
                                <></>
                              )}
                              <Spacer x={2}></Spacer>
                              <Button
                                size="sm"
                                color="primary"
                                href={`${i.url}`}
                                target="_blank"
                                as={Link}
                              >
                                Join Class
                              </Button>
                            </div>
                          </div>
                          <Spacer y={2}></Spacer>
                        </>
                      );
                    })}
                  {classes == undefined || (classes?.length == 0 && !isDemo) ? (
                    <div className="border-1 my-2 border-gray-100 bg-gray-100 rounded-xl text-gray-500 w-full p-2">
                      No Class scheduled for today
                    </div>
                  ) : (
                    ""
                  )}
                  {classes == undefined || (classes?.length == 0 && isDemo) ? (
                    <div className="border-1 my-2 border-gray-100 bg-gray-100 rounded-xl text-gray-500 w-full p-2">
                      Demo class will be visible here once available
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              </>
            ) : (
              ""
            )}

            {view == 2 ? (
              <>
                <h2 className="text-2xl font-bold text-primary">
                  Classes History
                </h2>
                <div className="w-full mt-4 flex h-full overflow-hidden  flex-col items-start justify-start">
                  <Button
                    color="primary"
                    size="sm"
                    startContent={
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z"
                          fill="#ffffff"
                        />
                      </svg>
                    }
                    onPress={() => {
                      setView(0), setClasses(), setHistory();
                    }}
                  >
                    Back to Batches
                  </Button>
                  <Spacer y={2}></Spacer>

                  <ScrollShadow className="w-full flex-1">
                    {history &&
                      history.map((i, d) => {
                        return (
                          <>
                            <div className="w-full rounded-lg bg-white shadow-sm p-4 flex flex-row items-center justify-start relative overflow-hidden">
                              <div className="font-sans bg-secondary rounded-full h-full  text-black font-bold text-xs uppercase p-1  mr-4 px-4">
                                <div>
                                  {/* {CtoLocal(i.start_time).date}{" "}
                                  {CtoLocal(i.start_time).monthName?.substring(
                                    0,
                                    3
                                  )} */}
                                </div>
                              </div>
                              <p>{i.title ?? "Today's Class"}</p>
                              <div className="flex-1 flex flex-row items-center justify-end">
                                {i?.recording && (
                                  <Button
                                    size="sm"
                                    color="primary"
                                    as={Link}
                                    target="_blank"
                                    href={i?.recording ?? "#"}
                                  >
                                    View Recording
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Spacer y={2}></Spacer>
                          </>
                        );
                      })}
                  </ScrollShadow>
                </div>
              </>
            ) : (
              ""
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
