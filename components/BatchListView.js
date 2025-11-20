import { Button, Select, SelectItem } from "@nextui-org/react";
import AddBatchModal from "./AddBatchModal";
import BatchCard from "./BatchCard";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function BatchListView({
  batches,
  controls,
  dayMap,
  setScheduleData,
  setAssignModal,
  getStudents,
  setCurrentBatch,
  updateBatch,
  setView,
  getClasses,
  addBatch,
  getBatches,
}) {
  const [newBatchData, setNewBatchData] = useState();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBatchData, setEditBatchData] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");

  const handleEditBatch = (batch) => {
    setEditBatchData(batch);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditBatchData(null);
  };

  const handleDeleteBatch = (batchId) => {
    // Refresh the batch list after deletion
    if (getBatches) {
      getBatches();
    }
  };

  // Extract unique course titles and centers dynamically
  const uniqueCourses = Array.from(
    new Set(
      batches
        ?.map((b) => b?.courses?.title)
        .filter((title) => title && title.trim() !== "")
    )
  );

  const filteredBatches =
    batches?.filter(
      (b) =>
        (selectedStatus === "all" ||
          b.status?.toLowerCase() === selectedStatus) &&
        (selectedCourse === "all" || b?.courses?.title === selectedCourse)
    ) || [];

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full font-sans flex flex-col items-start overflow-y-auto flex-1 justify-start p-4 rounded-xl">
        {/* Filters + Create Button */}
        <div className="w-full flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-3 align-items-center items-center justify-end">
            {/* Status Filter */}
            <Select
              size="sm"
              label="Filter by Status"
              placeholder="Select status"
              className="max-w-xs"
              onChange={(e) => setSelectedStatus(e.target.value)}
              selectedKeys={selectedStatus ? [selectedStatus] : []}
            >
              <SelectItem key="all">All</SelectItem>
              <SelectItem key="live">Live</SelectItem>
              <SelectItem key="draft">Draft</SelectItem>
              <SelectItem key="completed">Completed</SelectItem>
              <SelectItem key="expired">Expired</SelectItem>
              <SelectItem key="archived">Archived</SelectItem>
            </Select>

            {/* Course Filter */}
            <Select
              size="sm"
              label="Filter by Course"
              placeholder="Select course"
              className="max-w-xs"
              onChange={(e) => setSelectedCourse(e.target.value)}
              selectedKeys={selectedCourse ? [selectedCourse] : []}
            >
              <SelectItem key="all">All</SelectItem>
              {uniqueCourses.map((course) => (
                <SelectItem key={course}>{course}</SelectItem>
              ))}
            </Select>

            <div>
              <Button
                className="max-w-xs py-6"
                size="md"
                color="primary"
                onPress={() => {
                  setNewBatchData({});
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="inline-block w-5 h-5" />
                Create New Batch
              </Button>
            </div>
          </div>
        </div>
        {/* Create/Edit Modals */}
        <AddBatchModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          controls={controls}
          newBatchData={newBatchData}
          setNewBatchData={setNewBatchData}
          addBatch={addBatch}
        />

        <AddBatchModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          controls={controls}
          newBatchData={editBatchData}
          setNewBatchData={setEditBatchData}
          addBatch={updateBatch}
          isEditMode={true}
        />

        {/* Batch Cards Grid */}
        {filteredBatches.length > 0 ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
            {filteredBatches
              .sort((a, b) => b.id - a.id)
              .map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  dayMap={dayMap}
                  setScheduleData={setScheduleData}
                  setAssignModal={setAssignModal}
                  getStudents={getStudents}
                  setCurrentBatch={setCurrentBatch}
                  setView={setView}
                  getClasses={getClasses}
                  onEditBatch={() => handleEditBatch(batch)}
                  onDeleteBatch={handleDeleteBatch}
                />
              ))}
          </div>
        ) : (
          <div className="w-full flex justify-center items-center h-40">
            <p className="text-gray-500 text-md font-bold">
              <h2>No batches found matching your filters.</h2>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
