import { CtoLocal } from "@/utils/DateUtil";
import { supabase } from "@/utils/supabaseClient";
import {
  Avatar,
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
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  TimeInput,
  Tooltip,
  select,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Fuse from "fuse.js";
import {
  now,
  parseAbsoluteToLocal,
  parseDate,
  parseDateTime,
  parseTime,
  parseZonedDateTime,
  Time,
  parseAbsolute,
  ZonedDateTime,
} from "@internationalized/date";
import ImageUploader from "./ImageUploader";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { isToday } from "date-fns";
import { Calendar, ChevronLeft } from "lucide-react";
export default function BatchCreator() {
  const [batches, setBatches] = useState();
  const [view, setView] = useState(0);
  const [editBatch, setEditBatch] = useState();
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
  const [batchData, setBatchData] = useState();
  const [editBatchData, setEditBatchData] = useState();
  const [classes, setClasses] = useState();
  const [classData, setClassData] = useState();
  const [editClassData, setEditClassData] = useState();
  const [classPIN, setClassPIN] = useState();
  const [scheduleData, setScheduleData] = useState();
  const [teachers, setTeachers] = useState();
  const [schedules, setSchedules] = useState();

  async function getBatches() {
    const { data, error } = await supabase.from("batches").select("*");
    if (error || data?.length == 0) {
      toast.error("Unable to Load Batches");
      return null;
    }
    if (data) {
      setBatches(data);
      return null;
    }
  }

  useEffect(() => {
    if (scheduleData != undefined) {
      getSchedules(scheduleData?.id);
    }
  }, [scheduleData]);

  async function getSchedules(batch_id) {
    const { data, error } = await supabase
      .from("batch_schedule")
      .select("*")
      .eq("batch_id", batch_id);

    if (error) {
      return;
    }
    if (data) {
      setSchedules(data);
      return;
    }
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
  useEffect(() => {
    getBatches();
    getCentres();
    getAllUsers();
    getCourses();
    getHosts();
  }, []);

  const group = [
    {
      title: "By Courses",
      key: "course",
    },
  ];

  async function getAllUsers() {
    const { data, error } = await supabase.rpc("get_ipm_usr");
    if (error) {
      toast.error("Unable to Load Users");
    }
    if (data) {
      setAllUsers(data);
    }
  }
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

  async function addSchedule(a) {
    delete a["new"];
    const { data, error } = await supabase
      .from("batch_schedule")
      .insert(a)
      .select();

    if (error) {
      if (data) {
        toast.error("Duplicate Entry");
        return;
      }
      toast.error("Unable to Add");
      return;
    }
    if (data) {
      toast.success("Added Successfully");
      getSchedules(scheduleData?.id);
      return;
    }
  }

  async function updateSchedule(a) {
    const { data, error } = await supabase
      .from("batch_schedule")
      .update(a)
      .eq("id", a?.id)
      .select();

    if (error) {
      if (data) {
        toast.error("Duplicate Entry");
        return;
      }
      toast.error("Unable to Update");
      return;
    }
    if (data) {
      toast.success("Updated Successfully");
      getSchedules(scheduleData?.id);
      return;
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

  function getDaysComponent(a) {
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
  const statuses = [
    {
      title: "Save as Draft",
      value: "draft",
    },
    {
      title: "Set Batch Live",
      value: "live",
    },
    {
      title: "Set Batch as Expired",
      value: "expired",
    },
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
    {
      label: "Status",
      placeholder: "Select Class Status",
      type: "select",
      key: "status",
      items: classStatus,
    },
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
      label: "Batch Image",
      placeholder: "Upload Batch Image...",
      type: "image",
      key: "image",
    },
    {
      label: "Centre",
      placeholder: "Select Centre",
      type: "select",
      key: "centre",
      items: centres,
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
      label: "Days of Week",
      placeholder: "Select Days of Week",
      type: "checkbox",
      key: "days",
      items: dayMap,
    },

    {
      label: "Batch Time (everyday)",
      placeholder: "Select Batch Time",
      type: "time",
      key: "time",
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
      label: "Batch Host",
      placeholder: "Select Host of the batch",
      type: "select",
      key: "host_id",
      items: hosts,
    },
    {
      label: "Duration",
      placeholder: "Enter Duration in minutes",
      type: "text",
      key: "duration",
    },
    {
      label: "Show in Demo",
      placeholder: "Show in demo mode",
      type: "switch",
      key: "demo",
    },
  ];

  function filterUser(usrs) {
    let filteredUsers = usrs;

    // If centreFilters are available, filter by centre
    if (centreFilters?.length > 0) {
      filteredUsers = filteredUsers.filter((item) =>
        centreFilters.some((iz) => iz === item.centre)
      );
    }

    // If searchTerm is available, perform fuzzy search on emails
    if (searchTerm) {
      const fuse = new Fuse(filteredUsers, {
        keys: ["email"],
        threshold: 0.3, // Adjust the threshold as needed
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
    // Filter required keys only (exclude optional ones)
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

    // Add batch_id
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

    const missingKeys = requiredKeys.filter((key) => !a.hasOwnProperty(key));

    if (missingKeys.length > 0) {
      toast.error(`Missing keys: ${missingKeys.join(", ")}`);
      return;
    }

    if (missingKeys.length > 0) {
      toast.error(`Missing keys: ${missingKeys.join(", ")}`);
      return;
    }
    const { data, error } = await supabase
      .from("batches")
      .update(a)
      .eq("id", a.id)
      .select();
    if (error) {
      toast.error("Unable to Add");
    }
    if (data) {
      getBatches();
      toast.success("Updated Successfully");
    }
  }

  function getTimeinLocal(a) {
    if (a === undefined) {
      return new Time(0, 0);
    }

    // Extract time and zone parts
    const [time, zone] = a.split("+");

    // Parse time parts
    const [hours, minutes] = time.split(":").map(Number);

    // Parse zone parts, handling cases where minutes might be missing
    const [zoneHours, zoneMinutes] = (zone ? zone.split(":") : [0, 0]).map(
      Number
    );

    // Adjust local time based on the timezone offset
    const localHours = hours - zoneHours;
    const localMinutes = minutes - (zoneMinutes || 0);

    // Adjust minutes and hours if minutes go below 0 or above 60
    let adjustedHours = localHours;
    let adjustedMinutes = localMinutes;

    if (adjustedMinutes < 0) {
      adjustedMinutes += 60;
      adjustedHours -= 1;
    } else if (adjustedMinutes >= 60) {
      adjustedMinutes -= 60;
      adjustedHours += 1;
    }

    // Handle cases where hours might go below 0
    if (adjustedHours < 0) {
      adjustedHours += 24;
    }

    const result = new Time(adjustedHours, adjustedMinutes);

    return result;
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

  async function handleSave() {
    return;
  }

  function padNumber(num) {
    return num.toString().padStart(2, "0");
  }
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (scheduleData) {
    return (
      <div className="w-full h-full p-4 flex flex-col items-start justify-start space-y-4">
        <Button
          className="bg-gradient-purple text-white"
          size="sm"
          startContent={<ChevronLeft size={16} />}
          onPress={() => {
            setScheduleData(undefined), setSchedules();
          }}
        >
          Back to Batches
        </Button>

        <h2 className="text-2xl font-bold text-primary">
          Batch Name : {scheduleData?.title}
        </h2>
        <Table aria-label="Schedule Editor Table" className="mt-4">
          <TableHeader>
            <TableColumn>DAY</TableColumn>
            <TableColumn>TIME</TableColumn>
            <TableColumn>TEACHER</TableColumn>
          </TableHeader>
          <TableBody>
            {daysOfWeek.map((day, index) => (
              <TableRow key={day}>
                <TableCell>{day}</TableCell>
                <TableCell>
                  {scheduleData.days.includes(index) ? (
                    <TimeInput
                      granularity="minute"
                      label={`Batch Time on ${day}`}
                      value={(() => {
                        try {
                          const schedule = schedules?.find(
                            (schedule) => schedule.day === index
                          )?.time;
                          if (!schedule) return null; // If no time exists, return null
                          const dateObj = new Date(schedule); // Convert timestamp to Date
                          return new Time(
                            dateObj.getHours(),
                            dateObj.getMinutes()
                          ); // Convert to Time object
                        } catch (error) {
                          return null; // Return null on error
                        }
                      })()}
                      onChange={(e) => {
                        setSchedules((prevSchedules = []) => {
                          const existingScheduleIndex = prevSchedules.findIndex(
                            (schedule) => schedule.day === index
                          );

                          if (!(e instanceof Time)) return prevSchedules; // Ensure `e` is a valid Time object

                          // Get the current date to create a full timestamp
                          const now = new Date();
                          now.setHours(e.hour, e.minute, 0, 0); // Set the time from `TimeInput`

                          // Convert to ISO 8601 format (UTC timezone)
                          const isoTime = now.toISOString();

                          if (existingScheduleIndex !== -1) {
                            // Update existing schedule
                            const updatedSchedules = [...prevSchedules];
                            updatedSchedules[existingScheduleIndex] = {
                              ...updatedSchedules[existingScheduleIndex],
                              time: isoTime, // Store in ISO format
                            };
                            return updatedSchedules;
                          } else {
                            // Add new schedule
                            return [
                              ...prevSchedules,
                              {
                                day: index,
                                time: isoTime,
                                batch_id: scheduleData?.id,
                                new: true,
                              },
                            ];
                          }
                        });
                      }}
                    />
                  ) : (
                    <p>Not Scheduled</p>
                  )}
                </TableCell>
                <TableCell className="flex flex-row items-center justify-center">
                  {scheduleData.days.includes(index) ? (
                    <Select
                      placeholder="Select a teacher"
                      selectedKeys={[
                        schedules
                          ?.find((schedule) => schedule.day == index)
                          ?.host?.toString() ?? null,
                      ]}
                      onChange={(e) => {
                        const teacherId = e.target.value;
                        setSchedules((prevSchedules) => {
                          const existingScheduleIndex =
                            prevSchedules?.findIndex(
                              (schedule) => schedule.day === index
                            );

                          if (existingScheduleIndex !== -1) {
                            // Update existing schedule
                            const updatedSchedules = [...prevSchedules];
                            updatedSchedules[existingScheduleIndex].host =
                              teacherId;
                            return updatedSchedules;
                          } else {
                            // Add new schedule
                            return [
                              ...prevSchedules,
                              {
                                day: index,
                                host: teacherId,
                                batch_id: scheduleData?.id,
                                new: true,
                              },
                            ];
                          }
                        });
                      }}
                    >
                      {hosts.map((teacher) => (
                        <SelectItem
                          textValue={teacher.display_name || teacher?.userEmail}
                          key={teacher.id}
                          value={teacher.id}
                        >
                          <p>{teacher.display_name || "Unnamed"}</p>
                          <p className="text-xs text-gray-400">
                            {teacher?.userEmail}
                          </p>
                        </SelectItem>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-gray-400">Not Scheduled</span>
                  )}
                  <Spacer x={2}></Spacer>{" "}
                  {schedules?.some((item) => item.day == index) && (
                    <>
                      {" "}
                      {schedules?.find((item) => item.day == index)?.new ? (
                        <Button
                          onPress={() => {
                            addSchedule(
                              schedules?.find((item) => item.day == index)
                            );
                          }}
                          size="sm"
                          color="primary"
                        >
                          Add
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onPress={() => {
                            updateSchedule(
                              schedules?.find((item) => item.day == index)
                            );
                          }}
                          color="primary"
                        >
                          Update
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className=" overflow-hidden w-full h-full">
      <Modal
        isOpen={assignModal}
        onClose={() => {
          setAssignModal(false),
            setCurrentBatch(),
            setCentreFilters(),
            setStudents(),
            setCurrentStudents();
        }}
      >
        <ModalContent className="w-full max-w-[1200px]">
          <ModalHeader>Assign Students to this batch</ModalHeader>
          <ModalBody>
            <p>Filter by Centres</p>

            <div className="w-full flex flex-row items-center justify-start flex-wrap">
              {centres &&
                centres.map((i, d) => {
                  return (
                    <div
                      className=" cursor-pointer"
                      onClick={() => {
                        setCentreFilters((res) => {
                          const currentFilters = res || [];
                          if (_.includes(currentFilters, i.value)) {
                            return _.without(currentFilters, i.value);
                          } else {
                            return _.concat(currentFilters, i.value);
                          }
                        });
                      }}
                    >
                      <Chip
                        color={
                          centreFilters?.some((item) => item == i.value)
                            ? "primary"
                            : "default"
                        }
                        className="mb-1 mr-1 hover:bg-primary-200 hover:text-black"
                        size="sm"
                      >
                        {i.title}
                      </Chip>
                    </div>
                  );
                })}
            </div>
            <Input
              className="max-w-[300px]"
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              placeholder="Search Here..."
              label="Search"
              size="sm"
              type="search"
            ></Input>
            <CheckboxGroup
              label="Select Students to Assign"
              value={students}
              onValueChange={(e) => {
                setStudents(e);
              }}
              size="sm"
              className="max-h-[50vh] overflow-y-auto text-xs"
            >
              {allUsers &&
                filterUser(allUsers).map((i, d) => {
                  return (
                    <Checkbox value={i.email}>
                      {i.email}{" "}
                      {currentStudents?.some(
                        (item) => item.student_id == i.email
                      ) ? (
                        <span
                          onClick={() => {
                            removeFromBatch(
                              currentStudents.find(
                                (item) => item.student_id == i.email
                              )?.id
                            );
                          }}
                        >
                          <Chip size="sm" className="!text-xs" color="danger">
                            Remove
                          </Chip>
                        </span>
                      ) : (
                        ""
                      )}
                    </Checkbox>
                  );
                })}
            </CheckboxGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              onPress={() => {
                setAssignModal(false);
              }}
              size="sm"
              color="danger"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              size="sm"
              onPress={() => {
                assignStudents(students, currentBatch);
              }}
            >
              Assign
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
            {view == 0 ? (
              <>
                <div key={group.key}>
                  {group &&
                    group.map((i, d) => {
                      return (
                        <div
                          key={i.key}
                          title={i.title}
                          className="w-full h-full overflow-y-auto"
                        >
                          <div className="w-full font-sans flex flex-col items-start overflow-y-auto flex-1 justify-start p-4 rounded-xl bg-gray-50">
                            {i.key == "course" ? (
                              <>
                                {courses &&
                                  courses.map((i, d) => {
                                    return (
                                      <>
                                        <div className="text-2xl font-bold text-primary">
                                          {i.title}
                                        </div>
                                        <div className="w-full flex flex-col justify-start items-start">
                                          {batches &&
                                            batches
                                              .filter(
                                                (item) => item.course_id == i.id
                                              )
                                              .map((z, v) => {
                                                return (
                                                  <>
                                                    <div
                                                      className={
                                                        "w-full rounded-lg bg-white shadow-sm p-4 flex flex-row items-center justify-start " +
                                                        (z.status == "draft"
                                                          ? " opacity-70 grayscale"
                                                          : "")
                                                      }
                                                    >
                                                      <div className="flex flex-col justify-start items-start">
                                                        <p className="font-bold text-lg text-primary">
                                                          {z.title}
                                                        </p>
                                                        {z?.description ? (
                                                          <p className="text-sm text-gray-500 leading-none">
                                                            {z.description}
                                                          </p>
                                                        ) : (
                                                          ""
                                                        )}
                                                        <div className="flex flex-row items-center justify-start my-1">
                                                          {z.start_date ? (
                                                            <div className="flex flex-row items-center justify-start text-sm">
                                                              <p className="font-bold">
                                                                Start Date:
                                                              </p>{" "}
                                                              <p>
                                                                {
                                                                  CtoLocal(
                                                                    z.start_date
                                                                  )?.date
                                                                }{" "}
                                                                {
                                                                  CtoLocal(
                                                                    z.start_date
                                                                  )?.monthName
                                                                }{" "}
                                                                {
                                                                  CtoLocal(
                                                                    z.start_date
                                                                  )?.year
                                                                }
                                                              </p>{" "}
                                                            </div>
                                                          ) : (
                                                            ""
                                                          )}
                                                          <Spacer
                                                            x={2}
                                                            y={2}
                                                          ></Spacer>
                                                          {z.end_date ? (
                                                            <div className="flex flex-row items-center justify-start text-sm">
                                                              <p className="font-bold">
                                                                End Date:
                                                              </p>{" "}
                                                              <p>
                                                                {
                                                                  CtoLocal(
                                                                    z.end_date
                                                                  )?.date
                                                                }{" "}
                                                                {
                                                                  CtoLocal(
                                                                    z.end_date
                                                                  )?.monthName
                                                                }{" "}
                                                                {
                                                                  CtoLocal(
                                                                    z.end_date
                                                                  )?.year
                                                                }
                                                              </p>{" "}
                                                            </div>
                                                          ) : (
                                                            ""
                                                          )}
                                                        </div>
                                                        <div className="flex flex-row items-center justify-start text-xs">
                                                          Schedules:{" "}
                                                          <Spacer
                                                            x={1}
                                                          ></Spacer>
                                                          {z?.days &&
                                                            z?.days?.map(
                                                              (b, t) => {
                                                                return getDaysComponent(
                                                                  b
                                                                );
                                                              }
                                                            )}
                                                        </div>
                                                      </div>
                                                      <div className="flex-1 flex flex-row items-center justify-end">
                                                        <Button
                                                          size="sm"
                                                          color="primary"
                                                          startContent={
                                                            <Calendar
                                                              size={16}
                                                            ></Calendar>
                                                          }
                                                          onPress={() => {
                                                            setScheduleData(z);
                                                          }}
                                                        >
                                                          Edit Schedule
                                                        </Button>
                                                        <Spacer x={2}></Spacer>
                                                        <Button
                                                          size="sm"
                                                          color="secondary"
                                                          onPress={() => {
                                                            setAssignModal(
                                                              true
                                                            ),
                                                              getStudents(z.id),
                                                              setCurrentBatch(
                                                                z.id
                                                              );
                                                          }}
                                                        >
                                                          Assign Students
                                                        </Button>
                                                        <Spacer x={2}></Spacer>
                                                        <Popover
                                                          onOpenChange={(e) => {
                                                            e == true
                                                              ? setEditBatchData(
                                                                  z
                                                                )
                                                              : setEditBatchData();
                                                          }}
                                                        >
                                                          <PopoverTrigger>
                                                            <Button
                                                              size="sm"
                                                              color="success"
                                                              onPress={() => {}}
                                                            >
                                                              Edit Batch
                                                            </Button>
                                                          </PopoverTrigger>
                                                          <PopoverContent className="max-h-[40vh] w-[300px]  p-4 flex flex-col items-start justify-start  overflow-y-auto">
                                                            {controls &&
                                                              controls.map(
                                                                (l, t) => {
                                                                  if (
                                                                    l.type ==
                                                                    "text"
                                                                  ) {
                                                                    return (
                                                                      <Input
                                                                        size="sm"
                                                                        value={
                                                                          (editBatchData &&
                                                                            editBatchData[
                                                                              l
                                                                                .key
                                                                            ]) ??
                                                                          ""
                                                                        }
                                                                        className="mb-2"
                                                                        label={
                                                                          l.label
                                                                        }
                                                                        placeholder={
                                                                          l.placeholder
                                                                        }
                                                                        onChange={(
                                                                          e
                                                                        ) => {
                                                                          setEditBatchData(
                                                                            (
                                                                              res
                                                                            ) => ({
                                                                              ...res,
                                                                              [l.key]:
                                                                                e
                                                                                  .target
                                                                                  .value,
                                                                            })
                                                                          );
                                                                        }}
                                                                      ></Input>
                                                                    );
                                                                  }
                                                                  if (
                                                                    l.type ==
                                                                    "checkbox"
                                                                  ) {
                                                                    return (
                                                                      <CheckboxGroup
                                                                        value={
                                                                          (editBatchData &&
                                                                            editBatchData[
                                                                              l
                                                                                .key
                                                                            ]) ??
                                                                          ""
                                                                        }
                                                                        size="sm"
                                                                        className="w-full my-2"
                                                                        label={
                                                                          l.label
                                                                        }
                                                                        placeholder={
                                                                          l.placeholder
                                                                        }
                                                                        onValueChange={(
                                                                          e
                                                                        ) => {
                                                                          setEditBatchData(
                                                                            (
                                                                              res
                                                                            ) => ({
                                                                              ...res,
                                                                              [l.key]:
                                                                                e,
                                                                            })
                                                                          );
                                                                        }}
                                                                      >
                                                                        {l.items &&
                                                                          l.items.map(
                                                                            (
                                                                              p,
                                                                              a
                                                                            ) => {
                                                                              return (
                                                                                <Checkbox
                                                                                  value={
                                                                                    p.index
                                                                                  }
                                                                                >
                                                                                  {
                                                                                    p.title
                                                                                  }
                                                                                </Checkbox>
                                                                              );
                                                                            }
                                                                          )}
                                                                      </CheckboxGroup>
                                                                    );
                                                                  }
                                                                  if (
                                                                    l.type ==
                                                                    "time"
                                                                  ) {
                                                                    return (
                                                                      <TimeInput
                                                                        granularity="minute"
                                                                        value={parseTime(
                                                                          (editBatchData &&
                                                                            editBatchData[
                                                                              l
                                                                                .key
                                                                            ]) ??
                                                                            "00:00:00"
                                                                        )}
                                                                        className="mb-2"
                                                                        size="sm"
                                                                        label={
                                                                          l.label
                                                                        }
                                                                        placeholder={
                                                                          l.placeholder
                                                                        }
                                                                        onChange={(
                                                                          e
                                                                        ) => {
                                                                          setEditBatchData(
                                                                            (
                                                                              res
                                                                            ) => ({
                                                                              ...res,
                                                                              [l.key]:
                                                                                typeof e.toAbsoluteString ===
                                                                                "function"
                                                                                  ? e.toAbsoluteString()
                                                                                  : e.toString(),
                                                                            })
                                                                          );
                                                                        }}
                                                                      ></TimeInput>
                                                                    );
                                                                  }
                                                                  if (
                                                                    l.type ==
                                                                    "switch"
                                                                  ) {
                                                                    return (
                                                                      <Switch
                                                                        granularity="minute"
                                                                        isSelected={
                                                                          editBatchData &&
                                                                          editBatchData[
                                                                            l
                                                                              .key
                                                                          ]
                                                                        }
                                                                        className="mb-2"
                                                                        size="sm"
                                                                        onValueChange={(
                                                                          e
                                                                        ) => {
                                                                          setEditBatchData(
                                                                            (
                                                                              res
                                                                            ) => ({
                                                                              ...res,
                                                                              [l.key]:
                                                                                e,
                                                                            })
                                                                          );
                                                                        }}
                                                                      >
                                                                        {
                                                                          l.label
                                                                        }
                                                                      </Switch>
                                                                    );
                                                                  }

                                                                  if (
                                                                    l.type ==
                                                                    "date"
                                                                  ) {
                                                                    return (
                                                                      <DatePicker
                                                                        hideTimeZone
                                                                        value={parseAbsoluteToLocal(
                                                                          (editBatchData &&
                                                                            editBatchData[
                                                                              l
                                                                                .key
                                                                            ]) ??
                                                                            "2024-08-03T10:34:23.123Z"
                                                                        )}
                                                                        granularity="minute"
                                                                        className="mb-2"
                                                                        size="sm"
                                                                        label={
                                                                          l.label
                                                                        }
                                                                        placeholder={
                                                                          l.placeholder
                                                                        }
                                                                        onChange={(
                                                                          e
                                                                        ) => {
                                                                          setEditBatchData(
                                                                            (
                                                                              res
                                                                            ) => ({
                                                                              ...res,
                                                                              [l.key]:
                                                                                typeof e.toAbsoluteString ===
                                                                                "function"
                                                                                  ? e.toAbsoluteString()
                                                                                  : e.toString(),
                                                                            })
                                                                          );
                                                                        }}
                                                                      ></DatePicker>
                                                                    );
                                                                  }
                                                                  if (
                                                                    l.type ==
                                                                    "image"
                                                                  ) {
                                                                    return (
                                                                      <>
                                                                        <p>
                                                                          {
                                                                            i.placeholder
                                                                          }
                                                                        </p>
                                                                        <ImageUploader
                                                                          data={{
                                                                            image:
                                                                              (editBatchData &&
                                                                                editBatchData[
                                                                                  l
                                                                                    .key
                                                                                ]) ??
                                                                              "",
                                                                          }}
                                                                          label={
                                                                            l.label
                                                                          }
                                                                          placeholder={
                                                                            l.placeholder
                                                                          }
                                                                          onUploadComplete={(
                                                                            e
                                                                          ) => {
                                                                            setEditBatchData(
                                                                              (
                                                                                res
                                                                              ) => ({
                                                                                ...res,
                                                                                [l.key]:
                                                                                  e,
                                                                              })
                                                                            );
                                                                          }}
                                                                        ></ImageUploader>
                                                                      </>
                                                                    );
                                                                  }
                                                                  if (
                                                                    l.type ==
                                                                    "select"
                                                                  ) {
                                                                    return (
                                                                      <Select
                                                                        size="sm"
                                                                        selectedKeys={[
                                                                          (
                                                                            editBatchData &&
                                                                            editBatchData[
                                                                              l
                                                                                .key
                                                                            ]
                                                                          )?.toString() ??
                                                                            "",
                                                                        ]}
                                                                        className="mb-2"
                                                                        label={
                                                                          l.label
                                                                        }
                                                                        placeholder={
                                                                          l.placeholder
                                                                        }
                                                                        onChange={(
                                                                          e
                                                                        ) => {
                                                                          setEditBatchData(
                                                                            (
                                                                              res
                                                                            ) => ({
                                                                              ...res,
                                                                              [l.key]:
                                                                                e
                                                                                  .target
                                                                                  .value,
                                                                            })
                                                                          );
                                                                        }}
                                                                      >
                                                                        {l.items &&
                                                                          l.items?.map(
                                                                            (
                                                                              p,
                                                                              a
                                                                            ) => {
                                                                              return (
                                                                                <SelectItem
                                                                                  key={
                                                                                    p.id ??
                                                                                    p.value ??
                                                                                    p?.title?.toLocaleLowerCase()
                                                                                  }
                                                                                >
                                                                                  {p.title ??
                                                                                    p?.display_name ??
                                                                                    p?.userEmail}
                                                                                </SelectItem>
                                                                              );
                                                                            }
                                                                          )}
                                                                      </Select>
                                                                    );
                                                                  }
                                                                }
                                                              )}

                                                            <Button
                                                              className="flex-shrink-0"
                                                              size="sm"
                                                              color="primary"
                                                              onPress={() => {
                                                                updateBatch(
                                                                  editBatchData
                                                                );
                                                              }}
                                                            >
                                                              Update Batch
                                                            </Button>
                                                          </PopoverContent>
                                                        </Popover>
                                                        <Spacer x={2}></Spacer>
                                                        <Button
                                                          size="sm"
                                                          color="primary"
                                                          onPress={() => {
                                                            setCurrentBatch(
                                                              z.id
                                                            ),
                                                              setView(1),
                                                              getClasses(z.id);
                                                          }}
                                                        >
                                                          Manage Classes
                                                        </Button>
                                                      </div>
                                                    </div>
                                                    <Spacer y={2}></Spacer>
                                                  </>
                                                );
                                              })}
                                        </div>
                                        <Popover placement="top">
                                          <PopoverTrigger>
                                            <Button
                                              size="sm"
                                              color="primary"
                                              className="shadow-sm border-1 border-white shadow-primary sticky"
                                            >
                                              Create New Batch in this Course
                                            </Button>
                                          </PopoverTrigger>

                                          <PopoverContent className="max-h-[40vh] w-[300px]  p-4 flex flex-col items-start justify-start  overflow-y-auto">
                                            {controls &&
                                              controls.map((l, t) => {
                                                if (l.type == "text") {
                                                  return (
                                                    <Input
                                                      size="sm"
                                                      className="mb-2"
                                                      label={l.label}
                                                      placeholder={
                                                        l.placeholder
                                                      }
                                                      onChange={(e) => {
                                                        setBatchData((res) => ({
                                                          ...res,
                                                          [l.key]:
                                                            e.target.value,
                                                        }));
                                                      }}
                                                    ></Input>
                                                  );
                                                }
                                                if (l.type == "checkbox") {
                                                  return (
                                                    <CheckboxGroup
                                                      size="sm"
                                                      className="w-full my-2"
                                                      label={l.label}
                                                      placeholder={
                                                        l.placeholder
                                                      }
                                                      onValueChange={(e) => {
                                                        setBatchData((res) => ({
                                                          ...res,
                                                          [l.key]: e,
                                                        }));
                                                      }}
                                                    >
                                                      {l.items &&
                                                        l.items.map((p, a) => {
                                                          return (
                                                            <Checkbox
                                                              value={p.index}
                                                            >
                                                              {p.title}
                                                            </Checkbox>
                                                          );
                                                        })}
                                                    </CheckboxGroup>
                                                  );
                                                }
                                                if (l.type == "time") {
                                                  return (
                                                    <TimeInput
                                                      className="mb-2"
                                                      size="sm"
                                                      label={l.label}
                                                      placeholder={
                                                        l.placeholder
                                                      }
                                                      onChange={(e) => {
                                                        setBatchData((res) => ({
                                                          ...res,
                                                          [l.key]:
                                                            typeof e.toAbsoluteString ===
                                                            "function"
                                                              ? e.toAbsoluteString()
                                                              : e.toString(),
                                                        }));
                                                      }}
                                                    ></TimeInput>
                                                  );
                                                }
                                                if (l.type == "date") {
                                                  return (
                                                    <DatePicker
                                                      granularity="minute"
                                                      className="mb-2"
                                                      size="sm"
                                                      label={l.label}
                                                      placeholder={
                                                        l.placeholder
                                                      }
                                                      onChange={(e) => {
                                                        setBatchData((res) => ({
                                                          ...res,
                                                          [l.key]:
                                                            typeof e.toAbsoluteString ===
                                                            "function"
                                                              ? e.toAbsoluteString()
                                                              : e.toString(),
                                                        }));
                                                      }}
                                                    ></DatePicker>
                                                  );
                                                }
                                                if (l.type == "image") {
                                                  return (
                                                    <>
                                                      <p>{i.placeholder}</p>
                                                      <ImageUploader
                                                        label={l.label}
                                                        placeholder={
                                                          l.placeholder
                                                        }
                                                        onUploadComplete={(
                                                          e
                                                        ) => {
                                                          setBatchData(
                                                            (res) => ({
                                                              ...res,
                                                              [l.key]: e,
                                                            })
                                                          );
                                                        }}
                                                      ></ImageUploader>
                                                    </>
                                                  );
                                                }
                                                if (l.type == "select") {
                                                  return (
                                                    <Select
                                                      size="sm"
                                                      className="mb-2"
                                                      label={l.label}
                                                      placeholder={
                                                        l.placeholder
                                                      }
                                                      onChange={(e) => {
                                                        setBatchData((res) => ({
                                                          ...res,
                                                          [l.key]:
                                                            e.target.value,
                                                        }));
                                                      }}
                                                    >
                                                      {l.items &&
                                                        l.items?.map((p, a) => {
                                                          return (
                                                            <SelectItem
                                                              key={
                                                                p.id ??
                                                                p.value ??
                                                                p?.title?.toLocaleLowerCase()
                                                              }
                                                            >
                                                              {p.title ??
                                                                p?.display_name ??
                                                                p?.userEmail}
                                                            </SelectItem>
                                                          );
                                                        })}
                                                    </Select>
                                                  );
                                                }
                                                if (l.type == "switch") {
                                                  return (
                                                    <Switch
                                                      granularity="minute"
                                                      isSelected={
                                                        batchData &&
                                                        batchData[l.key]
                                                      }
                                                      className="mb-2"
                                                      size="sm"
                                                      onValueChange={(e) => {
                                                        setBatchData((res) => ({
                                                          ...res,
                                                          [l.key]: e,
                                                        }));
                                                      }}
                                                    >
                                                      {l.label}
                                                    </Switch>
                                                  );
                                                }
                                              })}
                                            <Button
                                              className=" flex-grow-1 flex-shrink-0"
                                              size="sm"
                                              color="primary"
                                              onPress={() => {
                                                addBatch(batchData);
                                              }}
                                            >
                                              Add Batch
                                            </Button>
                                          </PopoverContent>
                                        </Popover>
                                      </>
                                    );
                                  })}
                              </>
                            ) : (
                              ""
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              ""
            )}
            {view == 1 ? (
              <>
                <h2 className="font-bold text-2xl">
                  Manage Classes for{" "}
                  {batches.find((item) => item.id == currentBatch)?.title}
                </h2>
                <Spacer y={4}></Spacer>
                <Button
                  size="sm"
                  color="primary"
                  onPress={() => {
                    setView(0), setClasses(), setCurrentBatch();
                  }}
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
                        fill="#DDE6E8"
                      />
                    </svg>
                  }
                >
                  Back to Batches
                </Button>

                <div className="flex flex-col w-full justify-start items-start bg-gray-50 rounded-xl p-4">
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
                                <h2 className="font-semibold text-purple-900">
                                  {CtoLocal(i?.start_time).dayName} |{" "}
                                  {CtoLocal(i?.start_time).date}{" "}
                                  {CtoLocal(i?.start_time).monthName} -{" "}
                                  {CtoLocal(i?.start_time).year}
                                </h2>

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
                                    <p>
                                      {CtoLocal(i.start_time)?.time}{" "}
                                      {CtoLocal(i.start_time)?.amPm}
                                    </p>{" "}
                                  </div>
                                ) : (
                                  ""
                                )}

                                <p className="mx-2">-</p>
                                {i.end_time ? (
                                  <div className="flex flex-row items-center justify-start text-sm">
                                    <p className="font-bold"></p>{" "}
                                    <p>
                                      {CtoLocal(i.end_time)?.time}{" "}
                                      {CtoLocal(i.end_time)?.amPm}
                                    </p>{" "}
                                  </div>
                                ) : (
                                  ""
                                )}
                              </div>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-end">
                              <Popover
                                onOpenChange={(e) => {
                                  e == true ? getClassPIN(i.id) : setClassPIN();
                                }}
                              >
                                <PopoverTrigger>
                                  <Button size="sm" color="primary">
                                    View Class PIN
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent>{classPIN}</PopoverContent>
                              </Popover>
                              <Popover
                                onOpenChange={(e) => {
                                  e == true
                                    ? setEditClassData(i)
                                    : setEditClassData();
                                }}
                              >
                                <PopoverTrigger>
                                  <Button
                                    size="sm"
                                    color="primary"
                                    className="ml-2"
                                  >
                                    Edit Class
                                  </Button>
                                </PopoverTrigger>

                                <PopoverContent>
                                  {classControls &&
                                    classControls.map((l, t) => {
                                      if (l.type == "text") {
                                        return (
                                          <Input
                                            size="sm"
                                            value={
                                              (editClassData &&
                                                editClassData[l.key]) ??
                                              ""
                                            }
                                            className="mb-2"
                                            label={l.label}
                                            placeholder={l.placeholder}
                                            onChange={(e) => {
                                              setEditClassData((res) => ({
                                                ...res,
                                                [l.key]: e.target.value,
                                              }));
                                            }}
                                          ></Input>
                                        );
                                      }

                                      if (l.type == "datetime") {
                                        return (
                                          <DatePicker
                                            hideTimeZone
                                            value={parseAbsoluteToLocal(
                                              (editClassData &&
                                                editClassData[l.key]) ??
                                                "2024-08-03T10:34:23.123Z"
                                            )}
                                            granularity="minute"
                                            className="mb-2"
                                            size="sm"
                                            label={l.label}
                                            placeholder={l.placeholder}
                                            onChange={(e) => {
                                              setEditClassData((res) => ({
                                                ...res,
                                                [l.key]:
                                                  typeof e.toAbsoluteString ===
                                                  "function"
                                                    ? e.toAbsoluteString()
                                                    : e.toString(),
                                              }));
                                            }}
                                          ></DatePicker>
                                        );
                                      }

                                      if (l.type == "select") {
                                        return (
                                          <Select
                                            size="sm"
                                            selectedKeys={[
                                              (
                                                editClassData &&
                                                editClassData[l.key]
                                              )?.toString() ?? "",
                                            ]}
                                            className="mb-2"
                                            label={l.label}
                                            placeholder={l.placeholder}
                                            onChange={(e) => {
                                              setEditClassData((res) => ({
                                                ...res,
                                                [l.key]: e.target.value,
                                              }));
                                            }}
                                          >
                                            {l.items &&
                                              l.items?.map((p, a) => {
                                                return (
                                                  <SelectItem
                                                    key={
                                                      p.id ??
                                                      p.value ??
                                                      p.title?.toLocaleLowerCase()
                                                    }
                                                  >
                                                    {p.title ??
                                                      p?.display_name ??
                                                      p?.userEmail}
                                                  </SelectItem>
                                                );
                                              })}
                                          </Select>
                                        );
                                      }
                                    })}
                                  <Input
                                    size="sm"
                                    value={
                                      (editClassData &&
                                        editClassData["recording"]) ??
                                      ""
                                    }
                                    className="mb-2"
                                    label={"Recording URL"}
                                    placeholder={"Enter Recording Url"}
                                    onChange={(e) => {
                                      setEditClassData((res) => ({
                                        ...res,
                                        recording: e.target.value,
                                      }));
                                    }}
                                  ></Input>
                                  <Button
                                    size="sm"
                                    color="primary"
                                    onPress={() => {
                                      updateClass(editClassData);
                                    }}
                                  >
                                    Update Class
                                  </Button>
                                </PopoverContent>
                              </Popover>
                              <Spacer x={2}></Spacer>
                              <Popover>
                                <PopoverTrigger>
                                  <Button size="sm" color="danger">
                                    Delete Class
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="max-w-[300px] text-xs p-4">
                                  Are you sure you want to delete {i.title} ?
                                  <Spacer y={4}></Spacer>
                                  <div className="flex flex-row items-center justify-center">
                                    <Button
                                      color="danger"
                                      variant="bordered"
                                      size="sm"
                                    >
                                      Cancel
                                    </Button>
                                    <Spacer x={2}></Spacer>
                                    <Button
                                      onPress={() => {
                                        deleteClass(i.id, i.batch_id);
                                      }}
                                      color="danger"
                                      size="sm"
                                    >
                                      Confirm
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <Spacer y={2}></Spacer>
                        </>
                      );
                    })}
                  {classes == undefined || classes?.length == 0 ? (
                    <div className="border-1 my-2 border-gray-100 bg-gray-100 rounded-xl text-gray-500 w-full p-2">
                      No Class scheduled for today
                    </div>
                  ) : (
                    ""
                  )}
                  <Popover>
                    <PopoverTrigger>
                      <Button size="sm" color="primary">
                        Add Class Manually
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="min-w-[400px]">
                      {classControls &&
                        classControls.map((l, t) => {
                          if (l.type == "text") {
                            return (
                              <Input
                                size="sm"
                                className="mb-2"
                                label={l.label}
                                placeholder={l.placeholder}
                                onChange={(e) => {
                                  setClassData((res) => ({
                                    ...res,
                                    [l.key]: e.target.value,
                                  }));
                                }}
                              ></Input>
                            );
                          }

                          if (l.type == "datetime") {
                            return (
                              <DatePicker
                                defaultValue={parseZonedDateTime(
                                  "2022-11-07T00:45[Asia/Kolkata]"
                                )}
                                className="mb-2"
                                size="sm"
                                label={l.label}
                                placeholder={l.placeholder}
                                onChange={(e) => {
                                  setClassData((res) => ({
                                    ...res,
                                    [l.key]:
                                      typeof e.toAbsoluteString === "function"
                                        ? e.toAbsoluteString()
                                        : e.toString(),
                                  }));
                                }}
                              ></DatePicker>
                            );
                          }

                          if (l.type == "select") {
                            return (
                              <Select
                                size="sm"
                                className="mb-2"
                                label={l.label}
                                placeholder={l.placeholder}
                                onChange={(e) => {
                                  setClassData((res) => ({
                                    ...res,
                                    [l.key]: e.target.value,
                                  }));
                                }}
                              >
                                {l.items &&
                                  l.items?.map((p, a) => {
                                    return (
                                      <SelectItem
                                        key={
                                          p.id ??
                                          p.value ??
                                          p.email ??
                                          p?.title?.toLocaleLowerCase()
                                        }
                                      >
                                        {p.title}
                                      </SelectItem>
                                    );
                                  })}
                              </Select>
                            );
                          }
                        })}
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => {
                          addClass(classData);
                        }}
                      >
                        Add Class
                      </Button>
                    </PopoverContent>
                  </Popover>
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
