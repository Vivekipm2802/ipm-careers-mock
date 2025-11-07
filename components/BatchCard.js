import { CtoLocal } from "@/utils/DateUtil";
import { Button, Chip } from "@nextui-org/react";
import DayBadge from "./DayBadge";
import { MapPin, BookOpen, Calendar, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/utils/supabaseClient"; // ✅ Import your Supabase client
import { useState } from "react";

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
  onDeleteBatch
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

  const handleDelete = async (e) => {
    e.stopPropagation(); // ✅ works fine now
    if (!confirm(`Are you sure you want to delete batch "${batch.title}"?`)) return;
  
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("batches")
        .delete()
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
        "rounded-lg bg-white shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200 h-full " +
        (batch.status == "draft" ? " opacity-70 grayscale" : "")
      }
    >
      {/* Header: Title and Status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-semibold text-lg text-gray-900 leading-snug">
          {batch.title}
        </h3>
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
        <BookOpen size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <span className="text-gray-700">{batch.courses.title}</span>
      </div>
    )}

    {/* Location */}
    {batch?.centres?.title && (
      <div className="flex items-start gap-2.5">
        <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <span className="text-gray-700">{batch.centres.title}</span>
      </div>
    )}

  </div>
  </div>
</div>


      {/* Action Button */}
      <div className="pt-4 border-t border-gray-100 flex justify-end">
      {/* <Button
        size="sm"
        color="danger"
        variant="flat"
        onClick={(e) => handleDelete(e)} // use onClick instead of onPress
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete Batch"}
      </Button> */}


        <Button
          size="sm"
          color="primary"
          variant="flat"
          startContent={<Edit size={16} />}
          onPress={(e) => {
            e?.stopPropagation?.();
            onEditBatch?.(batch);
          }}
        >
          Edit Batch
        </Button>
        {/* <Button
              size="sm"
              color="primary"
              startContent={<Calendar size={16} />}
              onPress={(e) => {
                e?.stopPropagation?.();
                setScheduleData(batch);
              }}
              className="flex-1"
            >
              Edit Schedule
            </Button> */}
        {/* </div> */}
        {/* <div className="flex flex-row gap-2">
            <Button
              size="sm"
              color="secondary"
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
          </div> */}
      </div>
    </div>
  );
}
