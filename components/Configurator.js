"use client"

import { useEffect, useState } from "react"
import { Select, SelectItem, Tabs, Tab, Skeleton, Switch } from "@nextui-org/react"
import { Filter } from "lucide-react"
import { supabase } from "@/utils/supabaseClient"
import { toast } from "react-hot-toast"

export default function ConfigManager() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessMeta, setAccessMeta] = useState([])
  const [content, setContent] = useState([])
  const [activeFilter, setActiveFilter] = useState(null)
  const [items, setItems] = useState([])

  // Predefined filter categories
  const filterCategories = [
    { id: "vgroup", name: "Video Groups", value: "video_groups", },
    { id: "mt", name: "Mock Tests", value: "mock_test", },
    { id: "lvl", name: "Levels", value: "levels" },
    { id: "prv", name: "Self Learning", value: "vcategory",filter:{key:'type',value:'parent'} },
    { id: "lv", name: "Live Videos", value: "lvcategory",filter:{key:'type',value:'parent'}  },
  ]

  async function fetchCourses() {
    try {
      const { data, error } = await supabase.from("courses").select("*")

      if (error) throw error

      if (data) {
        setCourses(data)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  // Fetch access_meta when a course is selected
  useEffect(() => {
    if (!selectedCourse) return

    async function fetchAccessMeta() {
      setLoading(true)
      try {
        const { data, error } = await supabase.from("access_meta").select("*").eq("course_id", selectedCourse)

        if (error) throw error

        if (data) {
          setAccessMeta(data)
          // Reset content and filter when changing course
          setContent([])

          // Auto-select the first filter when a course is selected
          if (filterCategories.length > 0) {
            const firstFilter = filterCategories[0].id
            setActiveFilter(firstFilter)
            getItems(filterCategories[0])
          }
        }
      } catch (error) {
        console.error("Error fetching access meta:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccessMeta()
  }, [selectedCourse])

  async function getItems(item) {
    setLoading(true)

    let query;
    query = supabase.from(item?.value).select('*')
    if(item?.filter){
        query = query.eq(item?.filter?.key, item?.filter?.value)
    }
    try {
      const { data, error } = await query;
      if (error) {
        toast.error("Unable to get items")
        return
      }
      if (data) {
        setItems(data)
      }
    } catch (error) {
      console.error("Error fetching items:", error)
      toast.error("Failed to load items")
    } finally {
      setLoading(false)
    }
  }

  // Handle course selection
  const handleCourseSelect = (courseId) => {
    setSelectedCourse(courseId)
  }

  // Handle filter selection
  const handleFilterSelect = (filterId) => {
    setActiveFilter(filterId)
    getItems(filterCategories?.find((item) => item.id === filterId))
  }

  // Handle toggle for access
  const handleToggleAccess = async (item, filterType) => {
    const filterCategory = filterCategories.find((cat) => cat.id === activeFilter)
    if (!filterCategory) return

    // Check if this item already has access
    const existingAccess = accessMeta.find((meta) => meta.content_id === item.id && meta.type === activeFilter)

    try {
      if (existingAccess) {
        // Remove access
        const { error } = await supabase.from("access_meta").delete().eq("id", existingAccess.id)

        if (error) throw error

        // Update local state
        setAccessMeta(accessMeta.filter((meta) => meta.id !== existingAccess.id))
        toast.success("Access removed")
      } else {
        // Add access
        const { data, error } = await supabase
          .from("access_meta")
          .insert({
            course_id: selectedCourse,
            content_id: item.id,
            type: activeFilter,
          })
          .select()

        if (error) throw error

        // Update local state
        if (data) {
          setAccessMeta([...accessMeta, ...data])
          toast.success("Access granted")
        }
      }
    } catch (error) {
      console.error("Error updating access:", error)
      toast.error("Failed to update access")
    }
  }

  // Check if an item has access
  const hasAccess = (itemId) => {
    return accessMeta.some((meta) => meta.content_id === itemId && meta.type === activeFilter)
  }

  // Check if all items are selected
  const isAllSelected = items.length > 0 && items.every((item) => hasAccess(item.id))

  // Toggle select all functionality
  const toggleSelectAll = async () => {
    setLoading(true)
    try {
      if (isAllSelected) {
        // Remove all access
        const idsToDelete = accessMeta
          .filter((meta) => meta.type === activeFilter && items.some((item) => item.id === meta.content_id))
          .map((meta) => meta.id)

        if (idsToDelete.length > 0) {
          const { error } = await supabase.from("access_meta").delete().in("id", idsToDelete)

          if (error) throw error

          // Update local state
          setAccessMeta(accessMeta.filter((meta) => !idsToDelete.includes(meta.id)))
          toast.success("All access removed")
        }
      } else {
        // Add access for all items
        const existingContentIds = accessMeta
          .filter((meta) => meta.type === activeFilter)
          .map((meta) => meta.content_id)

        const itemsToAdd = items
          .filter((item) => !existingContentIds.includes(item.id))
          .map((item) => ({
            course_id: selectedCourse,
            content_id: item.id,
            type: activeFilter,
          }))

        if (itemsToAdd.length > 0) {
          const { data, error } = await supabase.from("access_meta").insert(itemsToAdd).select()

          if (error) throw error

          // Update local state
          if (data) {
            setAccessMeta([...accessMeta, ...data])
            toast.success("Access granted to all items")
          }
        } else {
          toast.info("All items already have access")
        }
      }
    } catch (error) {
      console.error("Error updating batch access:", error)
      toast.error("Failed to update access for all items")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Course selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Course</label>
        <Select
          placeholder="Select a course..."
          selectedKeys={selectedCourse ? [selectedCourse.toString()] : []}
          onChange={(e) => handleCourseSelect(Number(e.target.value))}
          isLoading={loading}
          className="w-full"
          size="lg"
        >
          {courses.map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.title}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Filter categories */}
      {selectedCourse && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <h2 className="text-lg font-medium">Filter Content</h2>
          </div>

          <Tabs
            selectedKey={activeFilter || undefined}
            onSelectionChange={handleFilterSelect}
            variant="bordered"
            fullWidth
            classNames={{
              base: "w-full",
              tabList: "gap-2",
            }}
          >
            {filterCategories.map((category) => (
              <Tab key={category.id} title={category.name} />
            ))}
          </Tabs>
        </div>
      )}

      {/* Content display */}
      {selectedCourse && activeFilter && (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-medium">
            {filterCategories.find((c) => c.id === activeFilter)?.name || "Content"}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[150px] w-full rounded-lg" />
              <Skeleton className="h-[150px] w-full rounded-lg" />
            </div>
          ) : items?.length === 0 ? (
            <p className="text-gray-500">No content available for this filter.</p>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  {isAllSelected ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="flex flex-col items-start justify-start gap-4 overflow-y-auto flex-1 w-full border rounded-lg p-4 min-h-0">
                {items &&
                  items.map((item) => (
                    <div key={item.id} className="flex flex-row w-full items-center justify-between py-2 border-b">
                      <div className="font-medium">{item.title}</div>
                      <Switch
                        isSelected={hasAccess(item.id)}
                        onValueChange={() => handleToggleAccess(item, activeFilter)}
                      />
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

