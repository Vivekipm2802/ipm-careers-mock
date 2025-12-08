import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Input,
  Checkbox,
  CheckboxGroup,
  Button,
} from "@nextui-org/react";
import _ from "lodash";
import React from "react";

/**
 * AssignStudentsModal component extracted from BatchCreator.
 *
 * Props:
 * - isOpen: controls modal visibility
 * - onClose: function to close modal
 * - centres: list of centres
 * - centreFilters: current active centre filters
 * - setCentreFilters: setter for filters
 * - allUsers: array of all users
 * - currentStudents: users already in the batch
 * - students: array of selected student emails
 * - setStudents: setter for student selection
 * - searchTerm: text for filtering users
 * - setSearchTerm: setter for search term
 * - filterUser: function to filter users by criteria
 * - assignStudents: callback for assigning selected students to batch
 * - removeFromBatch: callback for removing a student
 * - currentBatch: batch id for assignment
 */
export default function AssignStudentsModal({
  isOpen,
  onClose,
  centres,
  centreFilters,
  setCentreFilters,
  allUsers,
  currentStudents,
  students,
  setStudents,
  searchTerm,
  setSearchTerm,
  filterUser,
  assignStudents,
  removeFromBatch,
  currentBatch,
}) {
  const [fetchedStudents, setFetchedStudents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      try {
        let allStudents = [];
        let page = 0;
        let keepFetching = true;
        const pageSize = 1000;

        while (keepFetching) {
          const res = await fetch(`/api/listUsers?page=${page}&pageSize=${pageSize}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              allStudents = allStudents.concat(data);
              // If we received fewer records than pageSize, we've reached the end
              if (data.length < pageSize) {
                keepFetching = false;
              } else {
                page += 1;
              }
            } else {
              keepFetching = false;
            }
          } else {
            console.error("Failed to fetch students list");
            keepFetching = false;
          }
        }

        setFetchedStudents(allStudents);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
      setLoading(false);
    }

    if (isOpen) fetchStudents();
  }, [isOpen]);

  const filtered = fetchedStudents
    .filter((item) => {
      // Support array of objects or strings safely
      if (!item) return false;
      const email =
        typeof item === "string"
          ? item
          : typeof item.email === "string"
          ? item.email
          : "";
      if (!email || !searchTerm) return true;
      return email
        ?.toString()
        ?.toLowerCase()
        ?.includes(searchTerm?.toString()?.toLowerCase());
    })
    .map((item) =>
      typeof item === "string"
        ? item
        : typeof item.email === "string"
        ? item.email
        : ""
    )
    .sort((a, b) => {
    const aSelected = students.includes(a);
    const bSelected = students.includes(b);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.localeCompare(b);
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent className="max-w-[600px]">
        <ModalHeader>
          Select one or more students to assign to this batch
        </ModalHeader>
        <ModalBody>
          <Input
            type="search"
            className="sticky top-0 z-10 bg-white mb-2"
            size="sm"
            placeholder="Search Here..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {loading && fetchedStudents.length === 0 ? (
            <div className="flex justify-center items-center py-10">
              <span>Loading...</span>
            </div>
          ) : (
            <CheckboxGroup
              value={students}
              onValueChange={setStudents}
              className="text-sm max-h-[50vh] overflow-y-auto"
            >
              {filtered.map((s, idx) => {
                const alreadyAssigned = currentStudents?.some(
                  (item) => item.student_id === s
                );
                return (
                  <Checkbox value={s} key={idx}>
                    {s}{" "}
                    {alreadyAssigned && (
                      <Chip
                        size="sm"
                        color="danger"
                        onClick={() => {
                          const found = currentStudents.find(
                            (item) => item.student_id == s
                          );
                          if (found) removeFromBatch(found.id);
                        }}
                      >
                        Remove
                      </Chip>
                    )}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="danger" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => assignStudents(students, currentBatch)}
          >
            Assign
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
