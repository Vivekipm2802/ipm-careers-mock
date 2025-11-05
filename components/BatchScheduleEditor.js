import {
  Button,
  Select,
  SelectItem,
  Spacer,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  TimeInput,
} from "@nextui-org/react";
import { Time } from "@internationalized/date";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "@/utils/supabaseClient";

export default function BatchScheduleEditor({
  scheduleData,
  schedules,
  setSchedules,
  hosts,
  onBack,
}) {
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
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

  return (
    <div className="w-full h-full p-4 flex flex-col items-start justify-start space-y-4">
      <Button
        className="bg-gradient-purple text-white"
        size="sm"
        startContent={<ChevronLeft size={16} />}
        onPress={onBack}
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
                        const existingScheduleIndex = prevSchedules?.findIndex(
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
