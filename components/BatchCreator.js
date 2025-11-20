import { CtoLocal } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import axios from "axios";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Spacer,
  Tooltip,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Fuse from "fuse.js";
import {
  parseAbsoluteToLocal,
  parseZonedDateTime,
} from "@internationalized/date";
import { AnimatePresence, motion } from "framer-motion";
import { isToday } from "date-fns";
import BatchScheduleEditor from "./BatchScheduleEditor";
import BatchListView from "./BatchListView";
import ManageClasses from "./ManageClasses";
import AssignStudentsModal from "./AssignStudentsModal";

export default function BatchCreator() {
  const [batches, setBatches] = useState();
  const [view, setView] = useState(0);
  const [currentBatch, setCurrentBatch] = useState();
  const [courses, setCourses] = useState();
  const [centres, setCentres] = useState();
  const [hosts, setHosts] = useState();
  const [assignModal, setAssignModal] = useState(false);
  const [students, setStudents] = useState();
  const [allUsers, setAllUsers] = useState();
  const [centreFilters, setCentreFilters] = useState();
  const [searchTerm, setSearchTerm] = useState();
  const [currentStudents, setCurrentStudents] = useState();
  const [classes, setClasses] = useState();
  const [classData, setClassData] = useState();
  const [editClassData, setEditClassData] = useState();
  const [classPIN, setClassPIN] = useState();
  const [scheduleData, setScheduleData] = useState();
  const [schedules, setSchedules] = useState();

  async function getBatches() {
    const { data, error } = await supabase
      .from("batches")
      .select("*, courses(title)")
      .eq("is_deleted", false);

    if (error || !data || data.length === 0) {
      setBatches([]);
      return null;
    }

    setBatches(data);
    return null;
  }

  async function getCentres() {
    const { data, error } = await supabase.from("centres").select("*");
    if (error || data?.length == 0) {
      toast.error("Unable to Load Centres");
      return null;
    }
    if (data) {
      setCentres(data);
      return null;
    }
  }

  async function getStudents(a) {
    const r = toast.loading("Loading Students");
    const { data, error } = await supabase
      .from("batch_admits")
      .select("*")
      .eq("batch_id", a);
    if (error) {
      toast.error("Unable to Load Students");
      toast.remove(r);
      return null;
    }
    if (data) {
      setStudents(data.map((item) => item.student_id));
      toast.remove(r);
      setCurrentStudents(data);
      return null;
    }
  }

  async function getCourses() {
    const { data, error } = await supabase.from("courses").select("*");
    if (error || data?.length == 0) {
      toast.error("Unable to Load Courses");
      return null;
    }
    if (data) {
      setCourses(data);
      return null;
    }
  }

  async function assignStudents(a, b) {
    let filteredStudents = [];

    filteredStudents = a
      .filter((item) => !currentStudents?.some((i) => i.student_id == item))
      .map((item) => {
        return { batch_id: b, student_id: item };
      });

    const { data, error } = await supabase
      .from("batch_admits")
      .insert(filteredStudents)
      .select();

    if (error) {
      toast.error("Unable to Assign");
      return null;
    }

    if (data) {
      toast.success("Assigned Successfully");
      getStudents(b);
    }
  }

  async function removeFromBatch(a) {
    const { error } = await supabase.from("batch_admits").delete().eq("id", a);
    if (!error) {
      toast.success("Removed from this batch");
      getStudents(currentBatch);
    }
    if (error) {
      toast.error("Unable to Delete");
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

      return null;
    }
  }

  async function getHosts() {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .eq("role", "teacher");
    if (error) {
      toast.error("Unable to load teachers");
    }
    if (data) {
      setHosts(data);
    }
  }

  async function getAllUsers() {
    const { data, error } = await supabase.rpc("get_ipm_usr");
    if (error) {
      toast.error("Unable to Load Users");
    }
    if (data) {
      setAllUsers(data);
    }
  }

  async function getClassPIN(a) {
    const { data, error } = await supabase
      .from("classes_pin")
      .select("pin")
      .eq("class_id", a);

    if (data && data?.length > 0) {
      setClassPIN(data[0].pin);
    }
    if (error) {
      toast.error("Unable to Retrieve PIN");
    }
  }

  function filterUser(usrs) {
    let filteredUsers = usrs;

    if (centreFilters?.length > 0) {
      filteredUsers = filteredUsers.filter((item) =>
        centreFilters.some((iz) => iz === item.centre)
      );
    }

    if (searchTerm) {
      const fuse = new Fuse(filteredUsers, {
        keys: ["email"],
        threshold: 0.3,
      });

      filteredUsers = fuse.search(searchTerm).map((result) => result.item);
    }

    const studentEmails = new Set(students);
    filteredUsers = filteredUsers.sort((a, b) => {
      const aIsStudent = studentEmails.has(a.email);
      const bIsStudent = studentEmails.has(b.email);

      if (aIsStudent && !bIsStudent) return -1;
      if (!aIsStudent && bIsStudent) return 1;
      return 0;
    });

    return filteredUsers;
  }

  async function deleteClass(a, b) {
    const { error } = await supabase.from("classes").delete().eq("id", a);
    if (!error) {
      toast.success("Deleted Successfully");
      getClasses(b);
    }
    if (error) {
      toast.error("Unable to delete");
    }
  }

  async function addBatch(a) {
    const requiredKeys = controls.reduce((keys, control) => {
      keys.push(control.key);
      return keys;
    }, []);

    const missingKeys = requiredKeys.filter((key) => !a.hasOwnProperty(key));

    if (missingKeys.length > 0) {
      toast.error(`Missing keys: ${missingKeys.join(", ")}`);
      return;
    }

    if (missingKeys.length > 0) {
      toast.error(`Missing keys: ${missingKeys.join(", ")}`);
      return;
    }
    const { data, error } = await supabase.from("batches").insert(a).select();
    if (error) {
      toast.error("Unable to Add");
    }
    if (data) {
      getBatches();
      toast.success("Added Batch successfully");
    }
  }

  async function addClass(a) {
    const requiredKeys = classControls.reduce((keys, control) => {
      if (!control.optional) {
        keys.push(control.key);
      }
      return keys;
    }, []);

    const missingKeys = requiredKeys.filter((key) => !a.hasOwnProperty(key));

    if (missingKeys.length > 0) {
      toast.error(`Missing keys: ${missingKeys.join(", ")}`);
      return;
    }

    a["batch_id"] = currentBatch;

    const { data, error } = await supabase.from("classes").insert(a).select();

    if (error) {
      toast.error("Unable to Add Class");
    }

    if (data) {
      getClasses(currentBatch);
      toast.success("Added Class Successfully");
    }

    await callWebhook();
    return;
  }

  async function callWebhook() {
    axios.get("/api/triggerQueue", () => {
      return "";
    });
  }

  async function updateBatch(a) {
    const requiredKeys = controls.reduce((keys, control) => {
      keys.push(control.key);
      return keys;
    }, []);

    const filteredData = requiredKeys.reduce((obj, key) => {
      if (a.hasOwnProperty(key)) {
        obj[key] = a[key];
      }
      return obj;
    }, {});

    filteredData.id = a.id;

    const missingKeys = requiredKeys.filter((key) => !a.hasOwnProperty(key));

    if (missingKeys.length > 0) {
      toast.error(`Missing keys: ${missingKeys.join(", ")}`);
      return;
    }

    const { data, error } = await supabase
      .from("batches")
      .update(filteredData)
      .eq("id", a.id)
      .select();

    if (error) {
      toast.error("Unable to Update Batch");
    } else if (data) {
      getBatches();
      toast.success("Updated Successfully");
    }
  }

  async function updateClass(a) {
    const { data, error } = await supabase
      .from("classes")
      .update(a)
      .eq("id", a.id)
      .select();
    if (error) {
      toast.error("Unable to Add");
    }
    if (data) {
      getClasses(a.batch_id);
      toast.success("Updated Class Successfully");
    }
  }

  useEffect(() => {
    getBatches();
    getCentres();
    getAllUsers();
    getCourses();
    getHosts();
  }, []);

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

  const statuses = [
    {
      title: "Save as Draft",
      value: "draft",
    },
    {
      title: "Set Batch Live",
      value: "live",
    },
    // {
    //   title: "Set Batch as Expired",
    //   value: "expired",
    // },
  ];

  const classStatus = [
    {
      title: "Draft",
      value: "draft",
    },
    {
      title: "Upcoming",
      value: "upcoming",
    },
    {
      title: "Expired",
      value: "expired",
    },
  ];

  const classControls = [
    {
      label: "Class Title",
      placeholder: "Enter Class Title",
      type: "text",
      key: "title",
    },

    {
      label: "Start Time",
      placeholder: "Enter Class Title",
      type: "datetime",
      key: "start_time",
    },
    {
      label: "End Time",
      placeholder: "Enter Class End Time",
      type: "datetime",
      key: "end_time",
    },
    {
      label: "Class URL",
      placeholder: "Enter Classroom URL",
      type: "text",
      key: "url",
      optional: true,
    },
    // {
    //   label: "Status",
    //   placeholder: "Select Class Status",
    //   type: "select",
    //   key: "status",
    //   items: classStatus,
    // },
  ];

  const controls = [
    {
      label: "Batch Title",
      placeholder: "Enter Batch Title",
      type: "text",
      key: "title",
    },
    {
      label: "Batch Description",
      placeholder: "Enter Batch Description",
      type: "text",
      key: "description",
    },
    {
      label: "Course",
      placeholder: "Select Course",
      type: "select",
      key: "course_id",
      items: courses,
    },
    {
      label: "Start Date",
      placeholder: "Select Start Date",
      type: "date",
      key: "start_date",
    },
    {
      label: "End Date",
      placeholder: "Select End Date",
      type: "date",
      key: "end_date",
    },
    {
      label: "Status",
      placeholder: "Select Batch Status",
      type: "select",
      key: "status",
      items: statuses,
    },
    {
      label: "Show in Demo",
      placeholder: "Show in demo mode",
      type: "switch",
      key: "demo",
    },
  ];

  if (scheduleData) {
    return (
      <BatchScheduleEditor
        scheduleData={scheduleData}
        schedules={schedules}
        setSchedules={setSchedules}
        hosts={hosts}
        onBack={() => {
          setScheduleData(undefined);
          setSchedules();
        }}
      />
    );
  }

  return (
    <div className=" overflow-hidden w-full h-full">
      <div className="flex flex-col justify-start items-start overflow-hidden w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + "batches"}
            transition={{ duration: 0.2, ease: [0.62, 0.13, 0.12, 0.94] }}
            exit={{ x: 50, opacity: 0 }}
            className="w-full flex flex-col items-start h-full flex-1 justify-start overflow-hidden"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            {/* Batch List View */}
            {view == 0 ? (
              <BatchListView
                batches={batches}
                centres={centres}
                hosts={hosts}
                controls={controls}
                dayMap={dayMap}
                setScheduleData={setScheduleData}
                setAssignModal={setAssignModal}
                getStudents={getStudents}
                setCurrentBatch={setCurrentBatch}
                updateBatch={updateBatch}
                setView={setView}
                getClasses={getClasses}
                addBatch={addBatch}
                getBatches={getBatches}
              />
            ) : (
              ""
            )}
            {view == 1 ? (
              <ManageClasses
                batches={batches}
                currentBatch={currentBatch}
                setView={setView}
                setClasses={setClasses}
                setCurrentBatch={setCurrentBatch}
                classes={classes}
                getClassPIN={getClassPIN}
                classPIN={classPIN}
                setClassPIN={setClassPIN}
                classControls={classControls}
                editClassData={editClassData}
                setEditClassData={setEditClassData}
                updateClass={updateClass}
                deleteClass={deleteClass}
                addClass={addClass}
                classData={classData}
                setClassData={setClassData}
              />
            ) : (
              ""
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AssignStudentsModal
        isOpen={assignModal}
        onClose={() => {
          setAssignModal(false);
          setCurrentBatch();
          setCentreFilters();
          setStudents();
          setCurrentStudents();
        }}
        centres={centres}
        centreFilters={centreFilters}
        setCentreFilters={setCentreFilters}
        allUsers={allUsers}
        currentStudents={currentStudents}
        students={students}
        setStudents={setStudents}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterUser={filterUser}
        assignStudents={assignStudents}
        removeFromBatch={removeFromBatch}
        currentBatch={currentBatch}
      />
    </div>
  );
}
