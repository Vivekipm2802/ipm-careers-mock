import { supabase } from "@/utils/supabaseClient";
import { Award, BarChart3, BookOpen, CalendarCheck, CalendarDays, CalendarOff, CalendarRange, ClipboardList, FileEdit, FileText, Flame, Hash, HelpCircle, Layers, LayoutDashboard, Lightbulb, Map, MessageSquare, Phone, PlayCircle, PlusCircle, Printer, School, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, UserCog, UserPlus, Users, UsersRound, Video, Zap, RotateCcw } from "lucide-react";
import { useRouter } from "next/router";
import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
} from "react";

// Step 1: Create the Context
const NMNContext = createContext();

// Step 2: Provide the Context
export const NMNContextProvider = ({ children }) => {
  // Define your shared state and functions
  const [redeemActive, setRedeemActive] = useState(false);
  const [reportActive, setReportActive] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [coursesModal, setCoursesModal] = useState(false);
  const [userDetails, setUserDetails] = useState();
  const [userCourses, setUserCourses] = useState();
  const [sk, setSK] = useState(new Set(["0"]));
  const [ctxSlug, setCTXSlug] = useState("dashboard");
  const [sideBar, setSideBar] = useState(false);
  const [isDemo, setDemo] = useState(false);
  const [sideBarContent, setSideBarContent] = useState(<p>Content</p>);
  const [isRouting, setIsRouting] = useState(false);

  // Phase 16 Ship C: collapsible desktop sidebar (icon-only by default, click toggle to expand).
  // Persisted in localStorage so the choice sticks across pages + sessions.
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(true);
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined"
        ? window.localStorage.getItem("ipm-sidebar-collapsed")
        : null;
      if (stored !== null) {
        setSidebarCollapsedState(stored === "true");
      }
    } catch (_e) { /* ignore */ }
  }, []);
  const setSidebarCollapsed = (v) => {
    setSidebarCollapsedState(v);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ipm-sidebar-collapsed", String(v));
      }
    } catch (_e) { /* ignore */ }
  };
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const payments = [
    {
      title: "Cash",
      value: 1,
    },
    {
      title: "Debit/Credit Card",
      value: 2,
    },
    {
      title: "UPI",
      value: 3,
    },
    {
      title: "Wallet",
      value: 4,
    },
    {
      title: "Cheque/EMI",
      value: 5,
    },
    {
      title: "Coupon Code",
      value: 10,
    },
  ];
  const fetchUserDetails = useMemo(() => {
    return async () => {
      const { data } = await supabase.auth.getUser();

      if (data && data.user != undefined) {
        setUserDetails(data.user);
      } else {
        setUserDetails(null);
      }
    };
  }, []);

  const router = useRouter();
  useEffect(() => {
    if (router.pathname === "/demo") {
      setDemo(true);
    } else {
      setDemo(false);
    }
  }, [router.pathname]);

  useEffect(() => {
    const handleRouteChangeStart = () => setIsRouting(true);
    const handleRouteChangeComplete = () => setIsRouting(false);
    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
    };
  }, [router.events]);

  const navitems = [
    {
      title: "Dashboard",
      subtitle: "Your Command Center for Success",
      demo: true,
      isExpanded: true,
      teacher: true,
      icon: <LayoutDashboard size={22} />,
      items: [
        {
          title: "Dashboard",
          type: "user",
          action: "dashboard",
          teacher: true,
          id: 10,
          icon: <LayoutDashboard size={20} />,
        },

        {
          title: "Your Performance",
          type: "user",
          demo: false,
          action: "performance",
          id: 1,
          icon: <TrendingUp size={20} />,
        },
        {
          title: "Enrollment Manager",
          type: "admin",
          action: "enrollmentmanager",
          id: 333,
          icon: <UserPlus size={20} />,
        },
        {
          title: "User Settings",
          type: "admin",
          action: "user",
          id: 3,
          icon: <Users size={20} />,
        },
        {
          title: "Bulk User",
          type: "admin",
          action: "bulkuser",
          id: 3,
          icon: <UsersRound size={20} />,
        },
        {
          title: "Course Config",
          type: "admin",
          action: "config",
          id: 4,
          icon: <Settings size={20} />,
        },
        {
          title: "Course Content Config",
          type: "admin",
          action: "configurator",
          id: 333,
          icon: <SlidersHorizontal size={20} />,
        },
        {
          title: "View Submissions",
          type: "admin",
          action: "submission",
          id: 236,
          icon: <ClipboardList size={20} />,
        },
        {
          title: "Call Predictor Submissions",
          type: "admin",
          action: "callsubmission",
          id: 237,
          icon: <Phone size={20} />,
        },
        {
          title: "Response Tool Submissions",
          type: "admin",
          action: "ressubmission",
          id: 238,
          icon: <MessageSquare size={20} />,
        },
        {
          title: "Question Audit",
          type: "admin",
          action: "questionaudit",
          id: 239,
          icon: <ShieldCheck size={20} />,
        },
        {
          title: "Manage Admit Card Prints",
          type: "admin",
          action: "print",
          id: 235,
          icon: <Printer size={20} />,
        },
        {
          title: "Manage SWOT Results",
          type: "admin",
          action: "resultmanage",
          id: 234,
          icon: <Award size={20} />,
        },
      ],
    },
    {
      title: "Classes",
      subtitle: "Online Classes curated for you",
      isExpanded: false,
      demo: true,
      teacher: true,
      icon: <School size={22} />,
      items: [
        /*    { title: 'Coming Soon', type: 'user' ,action:'batech-wise',id:41,
          icon:<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 16.25a3.25 3.25 0 0 1-3.25 3.25h-7.5A3.25 3.25 0 0 1 2 16.25v-8.5A3.25 3.25 0 0 1 5.25 4.5h7.5A3.25 3.25 0 0 1 16 7.75v8.5Zm5.762-10.357a1 1 0 0 1 .238.648v10.918a1 1 0 0 1-1.648.762L17 15.37V8.628l3.352-2.849a1 1 0 0 1 1.41.114Z" fill="#212121"/></svg>
          }, */

        {
          title: "Online Classes",
          type: "user",
          action: "batch-wise",
          teacher: true,
          id: 41,
          icon: <Video size={20} />,
        },
        {
          title: "Batch Creator",
          type: "admin",
          action: "batch-creator",
          teacher: true,
          id: 41,
          icon: <PlusCircle size={20} />,
        },
        {
          title: "Attendance",
          type: "admin",
          action: "attendance",
          id: 240,
          icon: <CalendarCheck size={20} />,
        },
        {
          title: "Teacher Manager",
          type: "admin",
          action: "teacher-manager",
          id: 41,
          icon: <UserCog size={20} />,
        },
        {
          title: "Holiday Manager",
          type: "admin",
          action: "holidays",
          id: 421,
          icon: <CalendarOff size={20} />,
        },
        // Progress Tracker retired (July 2026) — Your Performance is
        // the single "how am I doing" home. Slug "topic-wise" kept
        // in index.js so old deep links don't 404.
      ],
    },
    {
      title: "Tests",
      subtitle: "Master topics and prepare yourself for exams",
      isExpanded: true,
      demo: true,
      icon: <Target size={22} />,
      items: [
        {
          title: "Concept",
          type: "user",
          action: "play",
          id: 5,
          icon: <Target size={20} />,
        },
        {
          // Ship 5.1: the redesign moved students to ConceptTestStudent but
          // the admin management view (old Concept component, with View
          // Submissions → per-student Result/Analytics) kept living behind
          // slug "play-admin" — which had no menu entry. Restore the door.
          title: "Concept Manager",
          type: "admin",
          action: "play-admin",
          id: 56,
          icon: <FileEdit size={20} />,
        },
        {
          title: "Full Mocks",
          type: "user",
          action: "mocks",
          id: 5,
          icon: <Layers size={20} />,
        },
        {
          title: "Mock Tests Editor",
          type: "admin",
          action: "mocks-editor",
          id: 5,
          icon: <FileEdit size={20} />,
        },
        {
          title: "Test Generator",
          type: "admin",
          action: "test-generator",
          id: 55,
          icon: <Sparkles size={20} />,
        },
        {
          title: "Sectional",
          type: "user",
          action: "sectional-tests",
          id: 6,
          icon: <BookOpen size={20} />,
        },
        {
          title: "Mistake Vault",
          type: "user",
          action: "mistakevault",
          id: 63,
          badge: "NEW",
          icon: <RotateCcw size={20} />,
        },
        /*  { title: 'Assigned Tests', type: 'admin',demo:false ,action:'assigned-tests',id:53,
  icon:<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48" id="Task-List-Edit--Streamline-Plump" height="24" width="24"><desc>Task List Edit Streamline Icon: https://streamlinehq.com</desc><g id="task-list-edit--task-list-edit-work"><path id="Subtract" fill="#e79800" d="M33.604 8.294c-3.941 -3.864 -6.67 -4.952 -7.52 -5.218A161.833 161.833 0 0 0 21 3c-6.264 0 -10.566 0.32 -13.248 0.627 -2.201 0.252 -3.85 1.903 -4.092 4.105C3.34 10.622 3 15.473 3 23c0 7.527 0.341 12.378 0.66 15.268 0.242 2.202 1.891 3.853 4.092 4.105 2.164 0.247 5.383 0.504 9.837 0.594 -0.15 -2.597 -0.087 -4.453 0.015 -5.668 0.169 -2.02 1.134 -3.66 2.282 -4.807l12.34 -12.34c1.543 -1.543 4.028 -2.875 6.704 -2.792 -0.017 -0.645 -0.036 -1.262 -0.058 -1.853 -0.351 -0.98 -1.549 -3.567 -5.268 -7.213Z" stroke-width="3"></path><path id="Intersect" fill="#ffffff" d="M26.086 3.077c0.852 0.268 3.58 1.358 7.516 5.217 3.72 3.646 4.917 6.234 5.268 7.214l0.016 0.45c-2.087 0.311 -5.841 0.072 -8.69 -0.191a4.664 4.664 0 0 1 -4.229 -4.211c-0.268 -2.802 -0.506 -6.466 -0.18 -8.488l0.299 0.01Z" stroke-width="3"></path><path id="Rectangle 63" fill="#ffffff" d="M43.665 31.592c1.454 -1.453 2.01 -3.577 0.794 -5.235a17.773 17.773 0 0 0 -1.77 -2.046c-0.74 -0.74 -1.43 -1.318 -2.047 -1.77 -1.657 -1.216 -3.781 -0.66 -5.235 0.793l-12.34 12.34c-0.543 0.544 -0.915 1.233 -0.979 2 -0.087 1.041 -0.151 2.81 0.017 5.428a1.92 1.92 0 0 0 1.793 1.793c2.617 0.168 4.387 0.104 5.428 0.016 0.766 -0.064 1.456 -0.435 2 -0.98l12.34 -12.339Z" stroke-width="3"></path><path id="Intersect_2" fill="#e79800" d="M41 34.258c-0.003 -0.014 -0.483 -2.117 -3.312 -4.946 -2.838 -2.838 -4.946 -3.311 -4.946 -3.311l2.665 -2.666c1.454 -1.453 3.578 -2.01 5.236 -0.793a17.774 17.774 0 0 1 2.045 1.77c0.74 0.74 1.319 1.43 1.77 2.046 1.217 1.658 0.66 3.782 -0.793 5.235L41 34.258Z" stroke-width="3"></path><path id="Subtract_2" stroke="#833589" stroke-linecap="round" stroke-linejoin="round" d="M38.872 15.507c-0.351 -0.98 -1.549 -3.567 -5.268 -7.213 -3.941 -3.864 -6.67 -4.952 -7.52 -5.218A161.833 161.833 0 0 0 21 3c-6.264 0 -10.566 0.32 -13.248 0.627 -2.201 0.252 -3.85 1.903 -4.092 4.105C3.34 10.622 3 15.473 3 23c0 7.527 0.341 12.378 0.66 15.268 0.242 2.202 1.891 3.853 4.092 4.105 1.898 0.217 4.607 0.44 8.248 0.553" stroke-width="3"></path><path id="Intersect_3" stroke="#833589" stroke-linecap="round" stroke-linejoin="round" d="M38.886 15.958c-2.087 0.311 -5.841 0.072 -8.69 -0.191a4.664 4.664 0 0 1 -4.229 -4.211c-0.268 -2.802 -0.506 -6.466 -0.18 -8.488" stroke-width="3"></path><path id="Rectangle 64" stroke="#833589" stroke-linecap="round" stroke-linejoin="round" d="M41 34.258s-0.473 -2.108 -3.312 -4.946C34.85 26.473 32.742 26 32.742 26" stroke-width="3"></path><path id="Vector 1455" stroke="#833589" stroke-linecap="round" stroke-linejoin="round" d="m10 13 4 4 5 -7" stroke-width="3"></path><path id="Vector 1456" stroke="#833589" stroke-linecap="round" stroke-linejoin="round" d="m10 24 4 4 5 -7" stroke-width="3"></path><path id="Rectangle 65" stroke="#833589" stroke-linecap="round" stroke-linejoin="round" d="M43.665 31.592c1.454 -1.453 2.01 -3.577 0.794 -5.235a17.773 17.773 0 0 0 -1.77 -2.046c-0.74 -0.74 -1.43 -1.318 -2.047 -1.77 -1.657 -1.216 -3.781 -0.66 -5.235 0.793l-12.34 12.34c-0.543 0.544 -0.915 1.233 -0.979 2 -0.087 1.041 -0.151 2.81 0.017 5.428a1.92 1.92 0 0 0 1.793 1.793c2.617 0.168 4.387 0.104 5.428 0.016 0.766 -0.064 1.456 -0.435 2 -0.98l12.34 -12.339Z" stroke-width="3"></path></g></svg>
  } */
      ],
    },
    // Daily Learn retired (July 2026): the daily quiz now lives inside
    // DSB Challenge (Sim Room). The "currentaffairs" slug and DailyLearn
    // component are kept so old deep links and admin flows still work.
    {
      title: "DSB Challenge",
      isExpanded: false,
      demo: true,
      flat: true, // renders as a direct link in the sidebar, no accordion
      badge: "NEW",
      icon: <Zap size={20} />,
      subtitle: "Earn XP, complete missions, climb the arena",
      items: [
        {
          title: "DSB Challenge",
          type: "user",
          action: "dsbchallenge",
          id: 61,
          icon: <Zap size={20} />,
        },
      ],
    },


    {
      title: "Videos",
      demo: true,
      subtitle: "Unlock Knowledge at Your Fingertips",
      isExpanded: false,
      icon: <PlayCircle size={22} />,
      items: [
        {
          title: "Pre-Recorded Videos",
          type: "user",
          action: "prv",
          id: 11,
          icon: <PlayCircle size={20} />,
        },
        {
          title: "Live Recordings",
          type: "user",
          demo: false,
          action: "lvr",
          id: 41,
          icon: <Video size={20} />,
        },

        {
          title: "Class Notes",
          type: "user",
          demo: false,
          action: "pdfs",
          id: 12,
          icon: <FileText size={20} />,
        },
      ],
    },
    {
      title: "PYQ Papers",
      demo: true,
      subtitle: "Learn via Previous year questions",
      icon: <FileText size={22} />,
      isExpanded: false,
      items: [
        {
          title: "All Papers",
          type: "user",
          action: "pyqconcept",
          id: 21,
          icon: <FileText size={20} />,
        },
      ],
    },
    {
      title: "Doubts",
      demo: true,
      subtitle: "AI Samjhao + mentor video solutions",
      isExpanded: false,
      flat: true, // direct link — no dropdown for a single destination
      badge: "NEW",
      icon: <Lightbulb size={20} />,
      items: [
        {
          title: "Doubts",
          type: "user",
          action: "dbts",
          id: 7,
          icon: <HelpCircle size={20} />,
        },
      ],
    },
    {
      title: "My Plan",
      demo: false,
      subtitle: "access your personalized study plan over here",
      isExpanded: false,
      flat: true, // direct link — no dropdown for a single destination
      badge: "NEW",
      icon: <Map size={20} />,
      items: [
        {
          title: "My Plan",
          type: "user",
          action: "studyplan",
          id: 13,
          icon: <Map size={20} />,
        },
      ],
    },
  ];

  /* useEffect(()=>{
const t= navitems.find(item=>item?.items?.some(i=>i.action == ctxSlug)).title
console.log(t)
  setSK(t)
},[ctxSlug]) */

  // Use useEffect to call fetchUserDetails once when the provider mounts
  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  return (
    <NMNContext.Provider
      value={{
        redeemActive,
        setRedeemActive,
        profileModal,
        setProfileModal,
        coursesModal,
        setCoursesModal,
        userDetails,
        setUserDetails,
        ctxSlug,
        setCTXSlug,
        sk,
        setSK,
        userCourses,
        setUserCourses,
        payments,
        sideBar,
        setSideBar,
        setSideBarContent,
        sideBarContent,
        navitems,
        isDemo,
        isRouting,
        setIsRouting,
        reportActive,
        setReportActive,
        // Phase 16 Ship C
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </NMNContext.Provider>
  );
};
export const useNMNContext = () => {
  // Consume the context
  const context = useContext(NMNContext);
  if (!context) {
    throw new Error("useSharedState must be used within a SharedStateProvider");
  }
  return context;
};
