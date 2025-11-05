import { Button } from "@nextui-org/react";
import AddBatchModal from "./AddBatchModal";
import BatchCard from "./BatchCard";
import { useState } from "react";

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
}) {
  const [newBatchData, setNewBatchData] = useState();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBatchData, setEditBatchData] = useState(null);

  const handleEditBatch = (batch) => {
    setEditBatchData(batch);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditBatchData(null);
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full font-sans flex flex-col items-start overflow-y-auto flex-1 justify-start p-4 rounded-xl bg-gray-50">
        <div className="w-full flex justify-end mb-4">
          <Button
            size="sm"
            color="primary"
            onPress={() => setIsCreateModalOpen(true)}
          >
            Create New Batch
          </Button>
        </div>

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

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
          {batches &&
            [...batches]
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
                />
              ))}
        </div>
      </div>
    </div>
  );
}
