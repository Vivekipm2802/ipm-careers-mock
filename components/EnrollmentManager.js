"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { format } from "date-fns"
import {
  Search,
  MoreVertical,
  ChevronRight,
  Trash,
  Info,
  Calendar,
  User,
  Mail,
  CreditCard,
  UserPlus,
  BookOpen,
  X,
} from "lucide-react"

// NextUI components
import { Input } from "@nextui-org/input"
import { Spinner } from "@nextui-org/spinner"
import { Card, CardBody } from "@nextui-org/card"
import { Switch } from "@nextui-org/switch"
import { Chip } from "@nextui-org/chip"
import { Button } from "@nextui-org/button"
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/dropdown"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/modal"
import { Divider } from "@nextui-org/divider"
import { supabase } from "@/utils/supabaseClient"
import { Pagination, Select, SelectItem } from "@nextui-org/react"
import { debounce } from "lodash"


export default function EnrollmentManager() {
  // State management
  const [enrollments, setEnrollments] = useState([])
  const [filteredEnrollments, setFilteredEnrollments] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedEnrollment, setSelectedEnrollment] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [currentPage,setCurrentPage] = useState(1)
  const [totalPages,setTotalPages] = useState(1) 
  
  const sorting = [
   
    {
        title:'Alphabetically (A-Z)',
        value:'email',
        asc:true
    },
    {
        title:'Alphabetically (Z-A)',
        value:'email',
        asc:false
    },
   
    {
        title:'Date (old to new)',
        value:'created_at',
        asc:true
    },
    {
        title:'Date (new to old)',
        value:'created_at',
        asc:false
    }
]
  
  const [activeSorting,setActiveSorting] = useState(sorting[3])
  const resultsPerPage = 25;

  

  // Fetch enrollments on component mount
  useEffect(() => {
    fetchEnrollments()
  }, [])

  // Filter enrollments when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEnrollments(enrollments)
    } else {
      const lowercaseQuery = searchQuery.toLowerCase()
      const filtered = enrollments.filter(
        (enrollment) =>
          enrollment.email.toLowerCase().includes(lowercaseQuery) ||
          (enrollment.name && enrollment.name.toLowerCase().includes(lowercaseQuery)),
      )
      setFilteredEnrollments(filtered)
    }
  }, [searchQuery, enrollments])

  // Fetch enrollments and course details
  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      // Calculate offset for pagination
      const from = (currentPage - 1) * resultsPerPage;
      const to = from + resultsPerPage - 1;
  
      // Fetch paginated enrollments
      const { data, error } = await supabase
        .from("enrollments")
        .select("*,course(*)")
        .order(activeSorting?.value, { ascending: activeSorting?.asc })
        .range(from, to);
  
      if (error) throw error;
  
      setEnrollments(data);
      setFilteredEnrollments(data);
  
      // Fetch total count of enrollments (only once or if relevant filters change)
      if (currentPage === 1) {
        const { count, error: countError } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true });
  
        if (countError) throw countError;
  
        // Calculate total pages
        setTotalPages(Math.ceil(count / resultsPerPage));
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };
  
  

  useEffect(()=>{
    fetchEnrollments()
  },[activeSorting,currentPage])

  // Search functionality
  const handleSearch = async (query) => {
    if (query.trim().length < 3) return;
  
    setLoading(true);
    try {
      const from = (currentPage - 1) * resultsPerPage;
      const to = from + resultsPerPage - 1;
  
      // Fetch paginated search results
      const { data, count, error } = await supabase
        .from("enrollments")
        .select("*,course(*)", { count: "exact" }) // Include count
        .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
        .order(activeSorting?.value, { ascending: activeSorting?.asc })
        .range(from, to);
  
      if (error) throw error;
  
      setFilteredEnrollments(data);
  
      // Update total pages based on search results
      setTotalPages(Math.ceil(count / resultsPerPage));
    } catch (error) {
      console.error("Error searching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };
  

  // Toggle expired status
  const handleToggleExpired = async (id, isExpired) => {
    try {
      const { error } = await supabase.from("enrollments").update({ is_expired: isExpired }).eq("id", id)

      if (error) throw error

      // Update local state
      setEnrollments(
        enrollments.map((enrollment) => (enrollment.id === id ? { ...enrollment, is_expired: isExpired } : enrollment)),
      )

      // Update filtered enrollments as well
      setFilteredEnrollments(
        filteredEnrollments.map((enrollment) =>
          enrollment.id === id ? { ...enrollment, is_expired: isExpired } : enrollment,
        ),
      )

      // Update selected enrollment if it's the one being modified
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment({
          ...selectedEnrollment,
          is_expired: isExpired,
        })
      }
    } catch (error) {
      console.error("Error updating enrollment:", error)
    }
  }

  // Delete enrollment
  const handleDeleteEnrollment = async (id) => {
    try {
      const { error } = await supabase.from("enrollments").delete().eq("id", id)

      if (error) throw error

      // Update local state
      setEnrollments(enrollments.filter((enrollment) => enrollment.id !== id))
      setFilteredEnrollments(filteredEnrollments.filter((enrollment) => enrollment.id !== id))

      // Close details modal if the deleted enrollment was selected
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment(null)
        setShowDetails(false)
      }
    } catch (error) {
      console.error("Error deleting enrollment:", error)
    }
  }

  // View enrollment details
  const handleViewDetails = (enrollment) => {
    setSelectedEnrollment(enrollment)
    setShowDetails(true)
  }

  // Format date helper
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "PPP")
    } catch (error) {
      return "Invalid date"
    }
  }
  const debouncedSearch = useCallback(
    debounce((query) => handleSearch(query, true), 300), // 300ms delay
    [handleSearch]
  );
  
  const onChangeHandler = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  return (
    <div className="space-y-6 w-full h-full overflow-hidden">
      {/* Search Card */}
      <div className="shadow-md w-full flex-shrink-0 h-full overflow-hidden flex flex-col">
       
        <div className="grid grid-cols-4 gap-4 items-center">
  <Select multiple={false} selectedKeys={[sorting.findIndex(item=>item.asc == activeSorting?.asc && item.value == activeSorting?.value).toString()]} items={sorting} onSelectionChange={(e)=>{setActiveSorting(sorting[e.anchorKey])}} label="Sort by" className="w-full" size="sm" color="primary">
    {sorting?.map((item, index) => (
      <SelectItem key={index} title={item.title} value={item.value}  />
    ))}
  </Select>

  <div className="col-span-3">
    <Input
      placeholder="Search by email or name..."
      value={searchQuery}
      onChange={onChangeHandler}
      startContent={<Search className="text-default-400" size={20} />}
      className="w-full"
      size="lg"
      endContent={
        <Button size="sm" isIconOnly color="primary" onPress={() => handleSearch(searchQuery)}>
          <Search size={16} />
        </Button>
      }
    />
  </div>
</div>


          <Pagination onChange={(e)=>{setCurrentPage(e)}} page={currentPage} total={totalPages} className="my-0"></Pagination>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" color="primary" />
            </div>
          ) : filteredEnrollments?.length === 0 ? (
            <div className="text-center py-10 text-default-400">No enrollments found</div>
          ) : (
            /* Enrollment List */
            <div className="flex-1 overflow-y-auto pr-4 w-full flex">
            <motion.div
              
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="space-y-3 w-full flex flex-col items-start "
            >
              {filteredEnrollments.map((enrollment, index) => (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="w-full "
                >
                  {/* Enrollment Item */}
                  <Card
                  shadow="none"
                    className="cursor-pointer w-full border border-default-200"
                    isPressable
                    onPress={() => handleViewDetails(enrollment)}
                  >
                    <CardBody className="flex flex-row items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {enrollment.name
                              ? enrollment.name.charAt(0).toUpperCase()
                              : enrollment.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3 overflow-hidden">
                            
                            <p className="text-md text-default-500 truncate">{enrollment.email}</p>
                            <Chip size="sm" color="primary"  className="text-xs truncate">{enrollment?.course?.title || "No Name"}</Chip>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Chip color={enrollment.is_expired ? "danger" : "success"} variant="flat" size="sm">
                          {enrollment.is_expired ? "Expired" : "Active"}
                        </Chip>

                        <Switch
                          size="sm"
                          color="primary"
                          isSelected={!enrollment.is_expired}
                          onValueChange={() => handleToggleExpired(enrollment.id, !enrollment.is_expired)}
                          aria-label="Toggle enrollment status"
                          className="mr-2"
                          onClick={(e) => e.stopPropagation()}
                        />

                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly variant="light" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label="Enrollment actions"
                            onAction={(key) => {
                              if (key === "delete") {
                                handleDeleteEnrollment(enrollment.id)
                              } else if (key === "details") {
                                handleViewDetails(enrollment)
                              }
                            }}
                          >
                            <DropdownItem key="details" startContent={<Info size={18} />}>
                              View Details
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              startContent={<Trash size={18} />}
                            >
                              Delete
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>

                        <ChevronRight size={18} className="text-default-400" />
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </motion.div></div> 
          )}
       
      </div>

      {/* Details Modal */}
      {selectedEnrollment && (
        <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} size="lg" scrollBehavior="inside">
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex justify-between items-center w-full">
                    <h3 className="text-xl">Enrollment Details</h3>
                   
                  </div>
                  <p className="text-small text-default-500">ID: {selectedEnrollment.id}</p>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <Chip color={selectedEnrollment.is_expired ? "danger" : "success"} variant="flat">
                        {selectedEnrollment.is_expired ? "Expired" : "Active"}
                      </Chip>
                      <div className="text-small text-default-500 flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Created: {formatDate(selectedEnrollment.created_at)}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Mail className="text-default-500" size={18} />
                        <div>
                          <p className="text-small text-default-500">Email</p>
                          <p className="font-medium">{selectedEnrollment.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="text-default-500" size={18} />
                        <div>
                          <p className="text-small text-default-500">Name</p>
                          <p className="font-medium">{selectedEnrollment.name || "Not provided"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CreditCard className="text-default-500" size={18} />
                        <div>
                          <p className="text-small text-default-500">Paid By</p>
                          <p className="font-medium">{selectedEnrollment.paidby || "Not provided"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <UserPlus className="text-default-500" size={18} />
                        <div>
                          <p className="text-small text-default-500">Added By</p>
                          <p className="font-medium">{selectedEnrollment.addedby || "Not provided"}</p>
                        </div>
                      </div>
                    </div>

                    {selectedEnrollment.course_details && (
                      <>
                        <Divider />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="text-primary" size={20} />
                            <h4 className="text-lg font-medium">Course Details</h4>
                          </div>

                          <div className="bg-default-50 p-4 rounded-lg">
                            <h5 className="font-medium text-lg">{selectedEnrollment.course_details.title}</h5>
                            {selectedEnrollment.course_details.description && (
                              <p className="text-default-600 mt-2">{selectedEnrollment.course_details.description}</p>
                            )}
                            <p className="text-small text-default-500 mt-2">
                              Course ID: {selectedEnrollment.course_details.id}
                            </p>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button
                    color="danger"
                    variant="light"
                    startContent={<Trash size={16} />}
                    onPress={() => {
                      handleDeleteEnrollment(selectedEnrollment.id)
                      setShowDetails(false)
                    }}
                  >
                    Delete Enrollment
                  </Button>
                  <Button color="primary" onPress={() => setShowDetails(false)}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}

