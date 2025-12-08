import { CtoLocal } from "@/utils/DateUtil";
import { Button, Chip } from "@nextui-org/react";
import DayBadge from "./DayBadge";
import { MapPin, BookOpen, Calendar, Edit, Trash2, Users } from "lucide-react";
import { supabase } from "@/utils/supabaseClient"; // ✅ Import your Supabase client
import { useState, useRef } from "react";

export default function BatchCard({
  batch,
  dayMap,
  setScheduleData,
  setAssignModal,
  getStudents,
  setCurrentBatch,
  setView,
  getClasses,
  onEditBatch,
  onDeleteBatch,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "live":
        return "success";
      case "expired":
        return "danger";
      case "draft":
        return "default";
      case "completed":
        return "primary";
      case "archived":
        return "warning";
      default:
        return "default";
    }
  };
  const menuRef = useRef(null);

  const handleDelete = async (e) => {
    e.stopPropagation(); // ✅ works fine now
    if (!confirm(`Are you sure you want to delete batch "${batch.title}"?`))
      return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("batches")
        .update({ is_deleted: true })
        .eq("id", batch.id);

      if (error) throw error;

      alert("Batch deleted successfully!");
      if (onDeleteBatch) onDeleteBatch(batch.id);
    } catch (err) {
      console.error("Error deleting batch:", err);
      alert("Failed to delete batch. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={
        "rounded-lg bg-white shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200 h-full"
      }
    >
      {/* Header: Title and Status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 leading-snug">
            {batch.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {batch?.status && (
            <Chip
              size="sm"
              variant="flat"
              color={getStatusColor(batch.status)}
              className="capitalize"
            >
              {batch.status}
            </Chip>
          )}
          <div className="relative">
            <details ref={menuRef} className="group">
              <summary className="list-none cursor-pointer p-1.5 rounded-full hover:bg-gray-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                  />
                </svg>
              </summary>
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-md z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuRef.current) menuRef.current.open = false;
                    onEditBatch?.(batch);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuRef.current) menuRef.current.open = false;
                    handleDelete(e);
                  }}
                  disabled={isDeleting}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col gap-3 flex-1 mb-5">
        {/* Description */}
        {batch?.description && (
          <p className="text-sm text-gray-600 leading-relaxed mt-1 text-left">
            {batch.description}
          </p>
        )}

        {/* Schedule Days */}
        {batch?.days && batch.days.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {batch.days.map((dayIndex, index) => (
                <DayBadge key={index} dayIndex={dayIndex} dayMap={dayMap} />
              ))}
            </div>
          </div>
        )}
        {/* Date + Course/Location in 2 columns */}
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
          {/* Left column - Dates */}
          {(batch?.start_date || batch?.end_date) && (
            <div className="flex flex-col gap-2">
              {batch?.start_date && (
                <div className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="text-gray-500 font-medium">Start:</span>
                    <span className="text-gray-900">
                      {(() => {
                        const dateInfo = CtoLocal(batch.start_date);
                        return `${dateInfo.date} ${dateInfo.monthName} ${dateInfo.year}`;
                      })()}
                    </span>
                  </div>
                </div>
              )}
              {batch?.end_date && (
                <div className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="text-gray-500 font-medium">End:</span>
                    <span className="text-gray-900">
                      {(() => {
                        const dateInfo = CtoLocal(batch.end_date);
                        return `${dateInfo.date} ${dateInfo.monthName} ${dateInfo.year}`;
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
            {batch?.courses?.title && (
              <div className="flex items-start gap-2.5">
                <BookOpen
                  size={18}
                  className="text-gray-400 mt-0.5 flex-shrink-0"
                />
                <span className="text-gray-700">{batch.courses.title}</span>
              </div>
            )}

            {/* Location */}
            {batch?.centres?.title && (
              <div className="flex items-start gap-2.5">
                <MapPin
                  size={18}
                  className="text-gray-400 mt-0.5 flex-shrink-0"
                />
                <span className="text-gray-700">{batch.centres.title}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <div className="flex flex-row gap-2">
          <Button
            size="sm"
            color="secondary"
            variant="flat"
            startContent={<Users size={16} />}
            onPress={(e) => {
              e?.stopPropagation?.();
              setAssignModal(true);
              getStudents(batch.id);
              setCurrentBatch(batch.id);
            }}
            className="flex-1"
          >
            Assign Students
          </Button>
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<BookOpen size={16} />}
            onPress={(e) => {
              e?.stopPropagation?.();
              setCurrentBatch(batch.id);
              setView(1);
              getClasses(batch.id);
            }}
            className="flex-1"
          >
            Manage Classes
          </Button>
        </div>
      </div>
    </div>
  );
}
