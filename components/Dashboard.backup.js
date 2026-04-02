import { supabase } from "@/utils/supabaseClient";
import { Button, Spacer } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { useNMNContext } from "./NMNContext";
import StudentAttendance from "./StudentAttendance";
import DemoComponent from "./DemoComponent";
import { motion } from "framer-motion";
import ClassDashboard from "./TodaysClasses";
import { toast } from "react-hot-toast";
import DailyRC from "./DailyRC";
import WordOfTheDay from "./WordOfTheDay";
import Loader from "./Loader";
import axios from "axios";

export default function Dashboard({ userData }) {
  const [isNull, setIsNull] = useState(true);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [results, setResults] = useState([]);

  async function getClasses() {
    // Get the course IDs the student is enrolled in
    const enrolledCourseIds =
      userCourses?.map((enrollment) => enrollment.course?.id).filter(Boolean) ||
      [];

    let enrolledClasses = [];
    let demoClasses = [];

    // Fetch classes for enrolled courses (existing behavior)
    if (enrolledCourseIds.length > 0) {
      const { data, error } = await supabase
        .from("classes")
        .select("*, batches!inner(course_id,demo)")
        .in("batches.course_id", enrolledCourseIds)
        .eq("batches.is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) {
        toast.error("Error Loading Classes");
        return;
      }

      enrolledClasses = data ?? [];
    }

    // Append ALL classes whose batches have demo=true
    const { data: demoData, error: demoError } = await supabase
      .from("classes")
      .select("*, batches!inner(course_id,demo)")
      .eq("batches.demo", true)
      .eq("batches.is_deleted", false)
      .order("created_at", { ascending: true });

    if (demoError) {
      toast.error("Error Loading Demo Classes");
      return;
    }

    demoClasses = demoData ?? [];

    // Merge + de-dup (in case an enrolled class is also from a demo batch)
    const merged = [...enrolledClasses, ...demoClasses].filter(Boolean);
    const deduped = Array.from(new Map(merged.map((c) => [c?.id, c])).values());

    // Keep consistent ordering
    deduped.sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });

    setClasses(deduped);
  }

  const { setCTXSlug, sk, setSK, userCourses } = useNMNContext();

  async function checkAdminStatus() {
    try {
      const response = await axios.post("/api/isAdmin", {
        email: userData?.email,
      });
      if (response.data.success) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  }

  async function getResults() {
    const { data, error } = await supabase
      .from("results")
      .select("*,test(course(title,id),id)")
      .match({ email: userData?.email, status: "finished" });

    if (error) {
      console.error("Error loading results:", error);
      toast.error("Error loading results");
      setIsNull(true);
      setLoading(false);
      return;
    }

    if (data && data?.length > 0) {
      setResults(data);
      setIsNull(false);
      setLoading(false);
      /* getActiveResult(data[0].id) */
    } else {
      setIsNull(true);
      setLoading(false);
    }
  }

  const { isDemo } = useNMNContext();
  const links = [
    {
      title: "Concept Tests",
      slug: "play",
      icon: <img src="/concept.png" className="w-8" />,
      shape: "bg-red-100",
      keys: 2,
      demo: true,
    },
    {
      title: "Mock Tests",
      slug: "mocks",
      icon: <img src="/concept.png" className="w-8" />,
      shape: "bg-blue-200",
      keys: 2,
      demo: true,
    },
    {
      title: "Daily Learning",
      slug: "currentaffairs",
      icon: <img src="/daily.png" className="w-8" />,
      shape: "bg-purple-200",
      demo: true,
      keys: 3,
    },
    {
      title: "Study Planner",
      slug: "studyplan",
      icon: <img src="/plan.svg" className="w-8" />,
      shape: "bg-yellow-200",
      demo: false,
      keys: 7,
    },
    {
      title: "Previous Year Papers",
      slug: "exmscan",
      icon: <img src="/studym.png" className="w-8" />,
      shape: "bg-teal-200",
      demo: true,
      keys: 6,
    },
    {
      title: "Pre Recorded Videos",
      slug: "prv",
      icon: <img src="/studym.png" className="w-8" />,
      shape: "bg-pink-200",
      keys: 5,
      demo: true,
    },
  ];

  useEffect(() => {
    getResults();
    if (userData?.email) {
      checkAdminStatus();
    }
  }, [userData?.email]);

  useEffect(() => {
    // Fetch classes
    getClasses();
  }, []);

  const t1 = `Hi ${userData?.user_metadata?.full_name || "Unknown User"},`;
  const t2 = "Welcome to IPM Careers Study Panel";

  if (loading) {
    return (
      <div className="w-full h-screen bg-white flex flex-col justify-center items-center align-middle">
        <Loader></Loader>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col overflow-y-auto pr-0 md:pr-4">
      <motion.div className="flex bg-gradient-purple rounded-xl text-white mb-4 p-8 overflow-hidden flex-col md:flex-row w-full items-stretch justify-end align-middle py-6 md:py-6 min-h-[12rem]">
        <div className="w-full md:w-full text-left text-2xl font-bold flex flex-col items-start justify-end  relative mr-5">
          <h2 className="flex flex-row flex-wrap items-start justify-start">
            {t1.split(" ").map((i, d) => {
              return (
                <div className=" overflow-hidden mr-1.5">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    exit={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    key={"fea"}
                    transition={{
                      type: "tween",
                      duration: 0.6,
                      delay: 0.1 + d * 0.05,
                      ease: [0.57, 0, 0, 0.99],
                    }}
                  >
                    {i}
                  </motion.div>
                </div>
              );
            })}
          </h2>
          <div className="flex flex-row flex-wrap items-start justify-start">
            {t2.split(" ").map((i, d) => {
              return (
                <div className=" overflow-hidden text-secondary-400 mr-1.5">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    exit={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    key={"fea"}
                    transition={{
                      type: "tween",
                      duration: 0.6,
                      delay: 0.3 + d * 0.05,
                      ease: [0.57, 0, 0, 0.99],
                    }}
                  >
                    {i}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="border-1 p-2 rounded-xl relative">
        {isNull && !loading ? (
          <div>
            <div className="p-1 px-2 border-dashed border-1 border-gray-200 rounded-md bg-gray-100 text-gray-500 flex flex-row items-center justify-between">
              You have not attempted any SWOT test yet.
              <Button
                className="my-1 text-white"
                size="sm"
                color="primary"
                onPress={() => {
                  setCTXSlug("kyc");
                }}
              >
                Go to SWOT Tests
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-sans w-full text-left text-primary p-1 text-2xl font-bold">
              Your <br />
              Study Area
            </h2>
            <div className="flex flex-row items-center justify-between border-1 rounded-xl px-2 p-1 bg-gray-100">
              <h2>You have an ongoing study plan</h2>
              <div className="flex flex-row items-center justify-end">
                <Button
                  className="my-1 text-white"
                  size="sm"
                  color="success"
                  onPress={() => {
                    setCTXSlug("kyc");
                  }}
                >
                  View Result
                </Button>
                <Spacer x={2}></Spacer>
                <Button
                  className="my-1 text-white"
                  size="sm"
                  color="primary"
                  onPress={() => {
                    setCTXSlug("prv"), setSK(new Set(["5"]));
                  }}
                >
                  Start Learning
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      <Spacer y={2}></Spacer>
      <div className="p-4 border-1 border-gray-200 my-2 rounded-xl flex flex-col justify-start items-start">
        <h2 className="font-sans w-full text-left text-primary p-1 text-2xl font-bold">
          Quick Links
        </h2>
        <div className="flex flex-row items-center justify-start w-full flex-wrap">
          {links &&
            links
              .filter((item) => (isDemo ? item.demo == true : true))
              .map((i, d) => {
                return (
                  <div className="flex-[100%] sm:flex-[50%] lg:flex-[33.333%] xl:flex-[33.333%] relative !flex-grow-0 p-1">
                    <div
                      className="rounded-xl group relative overflow-hidden hover:bg-secondary hover:border-black transition-all   flex flex-row items-center justify-center p-2 text-sm border-1 shadow-sm bg-white "
                      onClick={() => {
                        setCTXSlug(i.slug), setSK(new Set(i.keys.toString()));
                      }}
                    >
                      <div className="w-full flex flex-row justify-between z-10 items-center">
                        {i.icon}
                        <h2 className="font-sans font-medium text-sm text-center w-full">
                          {i.title}
                        </h2>
                      </div>
                      <div
                        className={
                          i.shape +
                          " group-hover:opacity-0 pointer-events-none transition-all flex flex-row  w-full h-full absolute z-0 "
                        }
                      ></div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
      <Spacer y={2}></Spacer>
      <div className="flex flex-col lg:flex-col items-stretch justify-between gap-4">
        <div className="p-4 border-1 w-full border-gray-200 my-2 rounded-xl flex flex-col justify-start items-start">
          <WordOfTheDay></WordOfTheDay>
        </div>
        <div className="p-4 border-1 w-full border-gray-200 my-2 rounded-xl flex flex-col justify-start items-start">
          <DailyRC></DailyRC>
        </div>
      </div>
      <Spacer y={2}></Spacer>
      <ClassDashboard classes={classes ?? []}></ClassDashboard>
      {/* <div className="p-4 border-1 border-gray-200 my-2 rounded-xl flex flex-col justify-start items-start">
    <h2 className="font-sans w-full text-left text-primary p-1 text-2xl font-bold">Assigned Tests</h2>
    <div className="flex relative flex-row items-center justify-start w-full flex-wrap">
    {isDemo ? <>
    <DemoComponent></DemoComponent>
    </>:''}
    
    </div>
</div> */}

      {isAdmin && (
        <div className="flex flex-col lg:flex-row items-start justify-start">
          <div className="p-4 flex-1 lg:w-[unset] w-full border-1 border-gray-200 my-2 rounded-xl flex flex-col justify-start items-start">
            <h2 className="font-sans w-full text-left text-primary p-1 text-2xl font-bold">
              Your Courses
            </h2>
            <div className="flex flex-row items-center justify-start w-full flex-wrap relative">
              {isDemo ? <DemoComponent></DemoComponent> : ""}
              {userCourses &&
                userCourses.map((i, d) => {
                  return (
                    <div className="flex-[50%] flex-grow-0 relative bg-gradient-to-b from-gray-100 hover:shadow-lg hover:border-primary transition-all to-white shadow-md overflow-hidden flex flex-col rounded-xl border-1 border-gray-200 p-4">
                      <div className=" pointer-events-none w-32 h-32 absolute -right-16 -top-16 bg-primary opacity-50 rounded-full"></div>
                      <Spacer y={6}></Spacer>
                      <h2 className="font-bold text-2xl text-left text-primary">
                        {i?.course?.title}
                      </h2>
                    </div>
                  );
                })}
            </div>
          </div>

          <Spacer className=" hidden md:flex " x={4} y={4}></Spacer>
          <div className="p-0 flex-1 lg:w-[unset] w-full my-2 rounded-xl flex flex-col justify-start items-start">
            {isDemo ? <DemoComponent floating={true}></DemoComponent> : ""}
            <StudentAttendance></StudentAttendance>
          </div>
        </div>
      )}
    </div>
  );
}
