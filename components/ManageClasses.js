import {
  Button,
  Chip,
  DatePicker,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Spacer,
} from "@nextui-org/react";
import { isToday } from "date-fns";
import {
  parseAbsoluteToLocal,
  parseZonedDateTime,
} from "@internationalized/date";
import { Plus, Edit, Trash2, Calendar, Link } from "lucide-react";

export default function ManageClasses({
  batches,
  currentBatch,
  setView,
  setClasses,
  setCurrentBatch,
  classes,
  getClassPIN,
  classPIN,
  setClassPIN,
  classControls,
  editClassData,
  setEditClassData,
  updateClass,
  deleteClass,
  addClass,
  classData,
  setClassData,
}) {
  return (
    <div className="p-4 w-full">
      <div className="flex">
        <div className="flex flex-row justify-between w-full items-center">
          <div className="flex gap-4">
            <Button
              size="sm"
              onPress={() => {
                setView(0);
                setClasses();
                setCurrentBatch();
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
                    fill="#333"
                  />
                </svg>
              }
              className="bg-transparent pl-0"
            >
              Back to Batches
            </Button>
            <h2 className="font-bold text-2xl">
              Manage Classes for{" "}
              {batches.find((item) => item.id == currentBatch)?.title}
            </h2>
          </div>

          <Popover>
            <PopoverTrigger>
              <Button size="md" color="primary" className="z-1">
                <Plus className="inline-block w-5 h-5" />
                Add Class Manually
              </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-[400px] py-4 items-end">
              {classControls?.map((l) => {
                if (l.type === "text")
                  return (
                    <Input
                      size="sm"
                      className="mb-2"
                      label={l.label}
                      placeholder={l.placeholder}
                      onChange={(e) =>
                        setClassData((res) => ({
                          ...res,
                          [l.key]: e.target.value,
                        }))
                      }
                    />
                  );
                if (l.type === "datetime")
                  return (
                    <Input
                      type="time"
                      size="sm"
                      className="mb-2"
                      label={l.label}
                      placeholder={l.placeholder}
                      onChange={(e) =>
                        setClassData((res) => ({
                          ...res,
                          [l.key]: e.target.value,
                        }))
                      }
                    />
                  );
                if (l.type === "select")
                  return (
                    <Select
                      size="sm"
                      className="mb-2"
                      label={l.label}
                      placeholder={l.placeholder}
                      onChange={(e) =>
                        setClassData((res) => ({
                          ...res,
                          [l.key]: e.target.value,
                        }))
                      }
                    >
                      {l.items?.map((p) => (
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
                      ))}
                    </Select>
                  );
              })}
              <div className="mb-3 w-full">
                <p className="font-semibold text-sm mb-1 text-[#333]">
                  Days of Week
                </p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={classData?.daysOfWeek?.includes(day) ?? false}
                        onChange={(e) => {
                          setClassData((prev) => {
                            const currentDays = prev.daysOfWeek || [];
                            return {
                              ...prev,
                              daysOfWeek: e.target.checked
                                ? [...currentDays, day]
                                : currentDays.filter((d) => d !== day),
                            };
                          });
                        }}
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                color="primary"
                onPress={() => addClass(classData)}
              >
                Add Class
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full justify-start items-start rounded-xl mt-4">
        {classes &&
          classes.map((i) => (
            <>
              <div className="w-full rounded-lg bg-white shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div className="flex flex-col gap-3 flex-1 mb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 leading-snug">
                      {i.title ?? "Today's Class"}
                    </h3>
                    {i.status && (
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          i.status === "Ongoing"
                            ? "success"
                            : i.status === "Upcoming"
                            ? "warning"
                            : i.status === "Completed"
                            ? "default"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {i.status}
                      </Chip>
                    )}
                  </div>
                  {i?.daysOfWeek && i.daysOfWeek.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {i.daysOfWeek.map((day, idx) => (
                        <Chip
                          key={idx}
                          size="sm"
                          color="default"
                          variant="flat"
                        >
                          {day}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {isToday(i?.start_time) && (
                    <Chip color="success" size="sm" className="mt-2">
                      Today
                    </Chip>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                    {/* Left column - Time */}
                    {(i.start_time || i.end_time) && (
                      <div className="flex flex-col gap-2">
                        {i?.start_time && (
                          <div className="flex items-center gap-2.5">
                            <Calendar
                              size={16}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <div className="flex items-baseline gap-2 text-sm">
                              <span className="text-gray-500 font-medium">
                                Start:
                              </span>
                              <span className="text-gray-900">
                                {(() => {
                                  try {
                                    const [hours, minutes] =
                                      i.start_time.split(":");
                                    const date = new Date();
                                    date.setHours(parseInt(hours, 10));
                                    date.setMinutes(parseInt(minutes, 10));
                                    return date.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    });
                                  } catch {
                                    return i.start_time;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                        {i?.end_time && (
                          <div className="flex items-center gap-2.5">
                            <Calendar
                              size={16}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <div className="flex items-baseline gap-2 text-sm">
                              <span className="text-gray-500 font-medium">
                                End:
                              </span>
                              <span className="text-gray-900">
                                {(() => {
                                  try {
                                    const [hours, minutes] =
                                      i.end_time.split(":");
                                    const date = new Date();
                                    date.setHours(parseInt(hours, 10));
                                    date.setMinutes(parseInt(minutes, 10));
                                    return date.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    });
                                  } catch {
                                    return i.end_time;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right column - Course & Location */}
                    <div className="flex flex-col gap-2 text-sm">
                      {/* Course */}
                      {i?.url && (
                        <div className="flex items-center gap-2.5 justify-end">
                          <Link
                            size={18}
                            className="text-gray-400 mt-0.5 flex-shrink-0"
                          />
                          <span className="text-gray-700 text-left">{i.url}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end mt-2">
                  {/* <Popover
                    onOpenChange={(e) =>
                      e ? setEditClassData(i) : setEditClassData()
                    }
                  >
                    <PopoverTrigger>
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        startContent={<Edit size={16} />}
                        className="ml-2 flex items-center gap-1"
                      >
                        Edit Class
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      {classControls?.map((l) => {
                        if (l.type === "text")
                          return (
                            <Input
                              size="sm"
                              value={
                                (editClassData && editClassData[l.key]) ?? ""
                              }
                              className="mb-2"
                              label={l.label}
                              placeholder={l.placeholder}
                              onChange={(e) =>
                                setEditClassData((res) => ({
                                  ...res,
                                  [l.key]: e.target.value,
                                }))
                              }
                            />
                          );
                        if (l.type === "datetime")
                          return (
                            <DatePicker
                              hideTimeZone
                              value={parseAbsoluteToLocal(
                                (editClassData && editClassData[l.key]) ??
                                  "2024-08-03T10:34:23.123Z"
                              )}
                              granularity="minute"
                              className="mb-2"
                              size="sm"
                              label={l.label}
                              placeholder={l.placeholder}
                              onChange={(e) =>
                                setEditClassData((res) => ({
                                  ...res,
                                  [l.key]:
                                    typeof e.toAbsoluteString === "function"
                                      ? e.toAbsoluteString()
                                      : e.toString(),
                                }))
                              }
                            />
                          );
                        if (l.type === "select")
                          return (
                            <Select
                              size="sm"
                              selectedKeys={[
                                (
                                  editClassData && editClassData[l.key]
                                )?.toString() ?? "",
                              ]}
                              className="mb-2"
                              label={l.label}
                              placeholder={l.placeholder}
                              onChange={(e) =>
                                setEditClassData((res) => ({
                                  ...res,
                                  [l.key]: e.target.value,
                                }))
                              }
                            >
                              {l.items?.map((p) => (
                                <SelectItem
                                  key={
                                    p.id ??
                                    p.value ??
                                    p.title?.toLocaleLowerCase()
                                  }
                                >
                                  {p.title ?? p?.display_name ?? p?.userEmail}
                                </SelectItem>
                              ))}
                            </Select>
                          );
                      })}
                      <Input
                        size="sm"
                        value={editClassData?.recording ?? ""}
                        className="mb-2"
                        label="Recording URL"
                        placeholder="Enter Recording Url"
                        onChange={(e) =>
                          setEditClassData((res) => ({
                            ...res,
                            recording: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => updateClass(editClassData)}
                      >
                        Update Class
                      </Button>
                    </PopoverContent>
                  </Popover>

                  <Spacer x={2} /> */}
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        startContent={<Trash2 size={16} />}
                        className="flex items-center gap-1"
                      >
                        Delete Class
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-[300px] text-xs p-4">
                      Are you sure you want to delete {i.title}?
                      <Spacer y={4} />
                      <div className="flex flex-row items-center justify-center">
                        <Button color="danger" variant="bordered" size="sm">
                          Cancel
                        </Button>
                        <Spacer x={2} />
                        <Button
                          onPress={() => deleteClass(i.id, i.batch_id)}
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
            </>
          ))}
      </div>

      {(!classes || classes.length === 0) && (
        <div className="border-1 my-16 border-gray-100 bg-gray-100 rounded-xl text-gray-500 w-full px-2 py-8">
          No Classes scheduled for today
        </div>
      )}
    </div>
  );
}
