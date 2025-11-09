import { Button, ScrollShadow } from "@nextui-org/react";
import Link from "next/link";

const ClassDashboard = ({ classes }) => {
  const getClassStatus = (startTime, endTime) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      // Normalize timezone format if present, though we focus on hours:minutes:seconds
      timeStr = timeStr.replace(/([+-]\d{2})(?!:)/, "$1:00");
      let [h, m, s] = timeStr.split(":");
      h = parseInt(h) || 0;
      m = parseInt(m) || 0;
      s = parseInt(s) || 0;
      const d = new Date(today);
      d.setHours(h, m, s, 0);
      return d;
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (!start || !end || isNaN(start) || isNaN(end)) {
      return "invalid";
    }

    if (now < start) return "upcoming";
    if (now > end) return "expired";
    return "ongoing";
  };

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "expired":
        return "bg-gray-500 text-white";
      case "ongoing":
        return "bg-green-500 text-white";
      case "upcoming":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-300 text-black";
    }
  };

  return (
    <div className="w-full border-1 mb-3 mx-auto bg-white rounded-lg p-6">
      <div className="text-left flex flex-row items-center justify-between text-primary mb-4">
        <h2 className="text-2xl font-bold">Today's Classes</h2>
        {/* <Button size="sm" onPress={()=>{setCTXSlug('batch-wise'),setSK(new Set([1].toString()))}} color="secondary" className="text-black" endContent={<ArrowRight size={16}></ArrowRight>}>View All</Button> */}
      </div>
      <ScrollShadow className="max-h-[250px]">
        {classes.length === 0 ? (
          <p className="text-center text-gray-700">
            No classes scheduled for today.
          </p>
        ) : (
          classes.map((item) => {
            const status = getClassStatus(item.start_time, item.end_time);
            return (
              <div
                key={item.id}
                className="p-4 border mb-4 border-gray-200 rounded-lg bg-gray-50 shadow-sm"
              >
                <div className="flex flex-col md:flex-row flex-1 justify-between items-start md:items-center ">
                  <div className="flex flex-col items-start flex-1 justify-start">
                    <h3 className="text-lg text-left font-semibold">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatTime(item.start_time)} -{" "}
                      {formatTime(item.end_time)}
                    </p>
                  </div>
                  <div className=" flex flex-row items-center justify-center">
                    <div
                      className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                        status
                      )}`}
                    >
                      {status}
                    </div>
                    {/* <div className="text-xs rounded-full text-primary border-1 border-primary ml-2 p-1 px-3 bg-primary/20 rounded-1">
                      {status != "expired" && timeUntilClass(item?.start_time)}
                    </div> */}
                  </div>
                  <div className="flex-1 mt-2 md:mt-0 flex flex-row items-center justify-end">
                    <Button
                      as={Link}
                      href={`${item.url}`}
                      color="primary"
                      target="_blank"
                      isDisabled={status !== "ongoing"}
                    >
                      Join Class
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </ScrollShadow>
    </div>
  );
};

export default ClassDashboard;
