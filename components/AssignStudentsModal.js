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
  Tabs,
  Tab,
} from "@nextui-org/react";
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
  students = [],
  setStudents,
  searchTerm,
  setSearchTerm,
  filterUser,
  assignStudents,
  removeFromBatch,
  currentBatch,
}) {
  const PAGE_SIZE = 50;

  const [fetchedStudents, setFetchedStudents] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const abortRef = React.useRef(null);
  // Guards against stale `.finally()` from an aborted/older request turning loading off
  // while a newer request is still in-flight.
  const fetchSeqRef = React.useRef(0);

  // Keep selection locally controlled to avoid parent prop/state race conditions
  // (e.g. uncheck + immediately click Assign).
  const getInitialSelected = React.useCallback(() => {
    const fromStudents = Array.isArray(students) ? students : [];
    const fromAssigned = Array.isArray(currentStudents)
      ? currentStudents.map((s) => s?.student_id).filter(Boolean)
      : [];
    return Array.from(new Set([...fromStudents, ...fromAssigned]));
  }, [students, currentStudents]);

  const [localSelected, setLocalSelected] = React.useState(() =>
    getInitialSelected()
  );
  const localSelectedRef = React.useRef(getInitialSelected());
  const wasOpenRef = React.useRef(false);
  const selectionDirtyRef = React.useRef(false);

  // Derived from the previous open state (ref) + current prop.
  // This lets us detect the very first render of an open session.
  const openingThisRender = isOpen && !wasOpenRef.current;

  // Debounce search term to avoid firing a request on every keystroke.
  // NOTE: Must be declared before any effects that call setDebouncedSearch.
  const [debouncedSearch, setDebouncedSearch] = React.useState(
    searchTerm || ""
  );
  React.useEffect(() => {
    // On open we explicitly reset searchTerm/debouncedSearch in the open-transition effect.
    // Skip scheduling any stale "previous searchTerm" debounce timer on that render.
    if (openingThisRender) return;

    const next = searchTerm || "";

    // If cleared, reflect immediately (no debounce).
    if (next.trim().length === 0) {
      setDebouncedSearch("");
      return;
    }

    const t = setTimeout(() => setDebouncedSearch(next), 300);
    return () => clearTimeout(t);
  }, [searchTerm, openingThisRender]);

  // Sync local selection only on the open transition (do NOT mirror props while open),
  // otherwise parent updates can re-check items unexpectedly while the modal is open.
  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Show loading immediately on open.
      setIsLoading(true);

      // Reset search state on every open.
      if (typeof setSearchTerm === "function") setSearchTerm("");
      setDebouncedSearch("");

      selectionDirtyRef.current = false;
      const init = getInitialSelected();
      setLocalSelected(init);
      localSelectedRef.current = init;

      // Ensure the user sees "Selected" at the top on open.
      if (listContainerRef.current) listContainerRef.current.scrollTop = 0;
    }

    if (!isOpen) {
      // Ensure we don't leave the modal in a "loading" state after close.
      setIsLoading(false);
      setLoadingMore(false);
      if (abortRef.current) abortRef.current.abort();
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, getInitialSelected, setSearchTerm]);

  // While the modal is open, keep selection in sync with incoming props
  // UNTIL the user changes selection (then we stop syncing to avoid re-checking).
  React.useEffect(() => {
    if (!isOpen) return;
    if (selectionDirtyRef.current) return;

    const init = getInitialSelected();
    setLocalSelected((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      if (prevArr.length !== init.length) return init;
      const prevSet = new Set(prevArr);
      for (const x of init) if (!prevSet.has(x)) return init;
      return prevArr;
    });
    localSelectedRef.current = init;
  }, [isOpen, getInitialSelected]);

  const normalizeApiResponse = React.useCallback((data) => {
    // v=2 returns: { emails: string[], hasMore: boolean }
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const emails = Array.isArray(data.emails) ? data.emails : [];
      const nextHasMore = Boolean(data.hasMore);
      return { emails, hasMore: nextHasMore };
    }

    // legacy response is: string[]
    if (Array.isArray(data)) return { emails: data, hasMore: false };

    return { emails: [], hasMore: false };
  }, []);

  const fetchPage = React.useCallback(
    async ({ pageToFetch, append }) => {
      const search =
        typeof debouncedSearch === "string" &&
        debouncedSearch.trim().length >= 2
          ? debouncedSearch.trim()
          : "";

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const url =
        `/api/listUsers?v=2&page=${pageToFetch}&pageSize=${PAGE_SIZE}` +
        (search ? `&search=${encodeURIComponent(search)}` : "");

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch students list");
      const data = await res.json();

      const { emails, hasMore: nextHasMore } = normalizeApiResponse(data);

      setHasMore(Boolean(nextHasMore));
      setPage(pageToFetch);

      setFetchedStudents((prev) => {
        const next = append ? prev.concat(emails) : emails;
        return Array.from(new Set(next.filter(Boolean)));
      });
    },
    [PAGE_SIZE, debouncedSearch, normalizeApiResponse]
  );

  React.useEffect(() => {
    if (!isOpen) return;

    // If we just opened and a stale searchTerm is still present, wait for the
    // open-transition effect to reset searchTerm/debouncedSearch before fetching.
    if (openingThisRender && (searchTerm || "").trim().length > 0) return;

    // When opening the modal or changing the debounced search term:
    // reset to first page + fetch only a small chunk.
    setIsLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setFetchedStudents([]);
    setPage(0);

    const seq = ++fetchSeqRef.current;

    fetchPage({ pageToFetch: 0, append: false })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Error fetching students:", err);
        }
      })
      .finally(() => {
        // Only the latest request is allowed to turn loading off.
        if (fetchSeqRef.current === seq) setIsLoading(false);
      });

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [isOpen, debouncedSearch, fetchPage, openingThisRender, searchTerm]);

  const loadMore = React.useCallback(() => {
    if (!isOpen) return;
    if (isLoading || loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    fetchPage({ pageToFetch: nextPage, append: true })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Error fetching more students:", err);
        }
      })
      .finally(() => setLoadingMore(false));
  }, [fetchPage, hasMore, isOpen, isLoading, loadingMore, page]);

  const listContainerRef = React.useRef(null);
  const handleScroll = React.useCallback(
    (e) => {
      const el = e.currentTarget;
      if (!el) return;

      // Load next page when user scrolls close to the bottom.
      const distanceFromBottom =
        el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (distanceFromBottom < 120) loadMore();
    },
    [loadMore]
  );

  // Keep a pinned "Selected" section at the top of the scroll area, then show the rest.
  const selectedStudentsSorted = React.useMemo(() => {
    const list = Array.isArray(localSelected)
      ? localSelected.filter(Boolean)
      : [];
    return list.slice().sort((a, b) => a.localeCompare(b));
  }, [localSelected]);

  const unselectedStudentsSorted = React.useMemo(() => {
    const selectedSet = new Set(selectedStudentsSorted);
    const combined = []
      .concat(fetchedStudents || [])
      .filter(Boolean)
      .filter((s) => !selectedSet.has(s));

    const unique = Array.from(new Set(combined));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [fetchedStudents, selectedStudentsSorted]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent className="max-w-[600px]">
        <ModalHeader>
          Select one or more students to assign to this batch
        </ModalHeader>
        <ModalBody>
          <Tabs aria-label="Student Selection">
            <Tab key="available" title="Available">
              <Input
                type="search"
                className="sticky top-0 z-10 bg-white mb-2"
                size="sm"
                placeholder="Search Here..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isLoading && fetchedStudents.length === 0 ? (
                <div className="flex justify-center items-center py-10">
                  <span>Loading...</span>
                </div>
              ) : (
                <div
                  ref={listContainerRef}
                  onScroll={handleScroll}
                  className="text-sm max-h-[50vh] overflow-y-auto"
                >
                  <CheckboxGroup
                    value={localSelected}
                    onValueChange={(next) => {
                      selectionDirtyRef.current = true;
                      setLocalSelected(next);
                      localSelectedRef.current = next;
                      if (typeof setStudents === "function") setStudents(next);
                    }}
                  >
                    {unselectedStudentsSorted.map((s) => {
                      const alreadyAssigned = currentStudents?.some(
                        (item) => item.student_id === s
                      );
                      return (
                        <Checkbox value={s} key={s}>
                          {s}{" "}
                          {alreadyAssigned && localSelected.includes(s) && (
                            <Chip
                              size="sm"
                              color="danger"
                              onClick={() => {
                                const found = currentStudents?.find(
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

                  <div className="py-2 flex justify-center">
                    {isLoading || loadingMore ? <span>Loading...</span> : null}
                  </div>
                </div>
              )}
            </Tab>
            <Tab key="selected" title={`Selected (${localSelected.length})`}>
              <div className="text-sm max-h-[50vh] overflow-y-auto">
                <CheckboxGroup
                  value={localSelected}
                  onValueChange={(next) => {
                    selectionDirtyRef.current = true;
                    setLocalSelected(next);
                    localSelectedRef.current = next;
                    if (typeof setStudents === "function") setStudents(next);
                  }}
                >
                  {selectedStudentsSorted.map((s) => {
                    const alreadyAssigned = currentStudents?.some(
                      (item) => item.student_id === s
                    );
                    return (
                      <Checkbox value={s} key={s}>
                        {s}{" "}
                        {alreadyAssigned && localSelected.includes(s) && (
                          <Chip
                            size="sm"
                            color="danger"
                            onClick={() => {
                              const found = currentStudents?.find(
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
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={async () => {
              const latest = Array.isArray(localSelectedRef.current)
                ? localSelectedRef.current
                : [];

              // Ensure parent state is aligned before triggering assignment logic.
              if (typeof setStudents === "function") setStudents(latest);

              // If a student was already in the batch but is now unchecked, remove them.
              const assigned = Array.isArray(currentStudents)
                ? currentStudents
                : [];
              const toRemove = assigned.filter(
                (cs) => cs?.student_id && !latest.includes(cs.student_id)
              );

              try {
                if (
                  typeof removeFromBatch === "function" &&
                  toRemove.length > 0
                ) {
                  await Promise.all(
                    toRemove
                      .map((cs) => cs?.id)
                      .filter(Boolean)
                      .map((id) => Promise.resolve(removeFromBatch(id)))
                  );
                }

                await Promise.resolve(assignStudents(latest, currentBatch));
              } finally {
                if (typeof onClose === "function") onClose();
              }
            }}
          >
            Assign
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
