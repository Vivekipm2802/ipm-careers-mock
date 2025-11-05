import { Tooltip } from "@nextui-org/react";

export default function DayBadge({ dayIndex, dayMap }) {
  return (
    <Tooltip
      size="sm"
      color="secondary"
      content={
        dayMap.find((item) => item.index == dayIndex)?.title ?? "unknown"
      }
    >
      <div className="text-xs w-5 h-5 mr-1 hover:bg-secondary hover:text-white !hover:border-secondary cursor-pointer hover:scale-125 transition-all text-primary rounded-full border-1 border-primary bg-primary-50 flex flex-col items-center justify-center">
        {dayMap.find((item) => item.index == dayIndex)?.short ?? "Error"}
      </div>
    </Tooltip>
  );
}
