"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,Image
} from "@nextui-org/react"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown, Ban, Code, Text } from "lucide-react"
import { isToday } from "date-fns"
import Link from "next/link"


// Utility function to extract date information
const extractDateInfo = (startDate, daysToAdd = 0) => {
  const date = new Date(startDate)
  date.setDate(date.getDate() + daysToAdd)

  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  return {
    date: date.getDate(),
    month: date.getMonth(),
    monthName: date.toLocaleString("default", { month: "long" }),
    year: date.getFullYear(),
    dayName: date.toLocaleString("default", { weekday: "long" }),
    shortDayName: date.toLocaleString("default", { weekday: "short" }),
    isToday,
  }
}

const transformStudyPlanData = (rawData) => {
    if (!Array.isArray(rawData)) return []
  
    return rawData.map((week) => {
      if (!Array.isArray(week) || week.length === 0) return { subjects: [] }
  
      const subjects = week
        .filter((day) => day.type === "section" && day.title === "Subjects")
        .flatMap((day) =>
          day.child.map((subject) => ({
            title: subject.title,
            data: subject.child.map((item) => ({
              title: item.title,
              value: item.content || "",
              type: item.type,
              url: item.type === "file" && item.content ? item.content : null,
            })),
          }))
        )
  
      return { subjects }
    })
  }
  

// Check if a value exists in an object array
const checkValueExists = (data, key) => {
  if (!data || !Array.isArray(data)) return false
  return data.some((item) => item[key] !== undefined && item[key] !== null && item[key] !== "")
}

// Get subject color based on index
const getSubjectColor = (index) => {
  const colors = ["primary", "secondary", "success", "warning", "danger"]
  return colors[index % colors.length]
}

export default function StudyPlanViewer({ rawData,fullData,onBack }) {
  const START_DATE = fullData?.start_date

  const [activeDate, setActiveDate] = useState(0)
  const [weekView, setWeekView] = useState(0)
  const [visibleDays, setVisibleDays] = useState(7) // Number of days visible in the table
  const [weekSelectorPage, setWeekSelectorPage] = useState(1)
  const [weekSelectorView, setWeekSelectorView] = useState("dropdown")
  const [selectedData,setSelectedData] = useState()
  const WEEKS_PER_PAGE = 5

  // Transform the data
  const transformedData = transformStudyPlanData(rawData)

  // Create the plan object
  const studyPlan = {
    title: fullData?.title,
    start_date: START_DATE,
    data: transformedData,
  }

  

  // Calculate week information
  const weeks = rawData.map((week, index) => {
    const startDayOffset = index * 7
    const startDateInfo = extractDateInfo(START_DATE, startDayOffset)
    const endDateInfo = extractDateInfo(START_DATE, startDayOffset + week.length - 1)
  
    return {
      weekNumber: index + 1,
      startDate: `${startDateInfo.date} ${startDateInfo.monthName}`,
      endDate: `${endDateInfo.date} ${endDateInfo.monthName}`,
      days: week.length,
      year: startDateInfo.year,
      month: startDateInfo.monthName,
    }
  })
  

  // Handle week change
  const changeWeek = (weekIndex) => {
    if (weekIndex >= 0 && weekIndex < weeks.length) {
      setWeekView(weekIndex)
      // Calculate the day index in the overall plan
      let dayIndex = 0
      
      setActiveDate(dayIndex)
      setSelectedData(rawData[weekIndex][dayIndex ])
    }
  }

  // Adjust visible days based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setVisibleDays(3)
        setWeekSelectorView("dropdown")
      } else if (window.innerWidth < 1024) {
        setVisibleDays(5)
        setWeekSelectorView("dropdown")
      } else {
        setVisibleDays(7)
        setWeekSelectorView("dropdown")
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Calculate current week's days
  const currentWeekDays = rawData[weekView]?.length || 0

  // Calculate total days before current week
  const daysBeforeCurrentWeek =
    weekView > 0 ? rawData.slice(0, weekView).reduce((sum, week) => sum + week.length, 0) : 0

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="w-full flex flex-col space-y-4">
        <Card className="shadow-sm">
          <CardBody className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Button className="mb-2" startContent={<ChevronLeft size={16}></ChevronLeft>} onPress={()=>{onBack()}} size="sm" color="primary">Back to Plans</Button>
                <h2 className="text-2xl font-bold text-primary">Your Study Plan</h2>
                <h3 className="text-xl font-bold text-danger">{studyPlan.title}</h3>
                <p className="text-default-500">
                  Starting from {extractDateInfo(studyPlan.start_date).dayName},{" "}
                  {extractDateInfo(studyPlan.start_date).date} {extractDateInfo(studyPlan.start_date).monthName}{" "}
                  {extractDateInfo(studyPlan.start_date).year}
                </p>
              </motion.div>

              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">Week:</span>

                  {/* Simple Dropdown for week selection */}
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        variant="bordered"
                        size="sm"
                        endContent={<ChevronDown className="h-4 w-4" />}
                        className="min-w-[200px] justify-between"
                      >
                        Week {weekView + 1}: {weeks[weekView]?.startDate} - {weeks[weekView]?.endDate}
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Select Week" className="max-h-[400px] overflow-y-auto">
                      {weeks.map((week, index) => (
                        <DropdownItem
                          key={`week-${index}`}
                          onClick={() => changeWeek(index)}
                          className={weekView === index ? "bg-primary-100 dark:bg-primary-800" : ""}
                        >
                          Week {week.weekNumber}: {week.startDate} - {week.endDate}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                </div>

                <div className="text-xs text-gray-500">
                  Showing Week {weekView + 1} of {weeks.length}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Week information */}
        {weeks[weekView] && (
          <motion.div
            className="bg-primary-100 max-w-md p-4 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-medium">
                Week {weeks[weekView].weekNumber}: {weeks[weekView].startDate} - {weeks[weekView].endDate}
              </h3>
              <span className="bg-primary text-white px-3 py-1 rounded-full text-sm">{weeks[weekView].days} Days</span>
            </div>

            <div className="flex justify-between mt-2">
              <Button
                size="sm"
                variant="light"
                isDisabled={weekView === 0}
                onClick={() => changeWeek(weekView - 1)}
                startContent={<ChevronLeft className="h-4 w-4" />}
              >
                Previous Week
              </Button>

              <Button
                size="sm"
                variant="light"
                isDisabled={weekView === weeks.length - 1}
                onClick={() => changeWeek(weekView + 1)}
                endContent={<ChevronRight className="h-4 w-4" />}
              >
                Next Week
              </Button>
            </div>
          </motion.div>
        )}

        {/* Calendar-style day selector */}
        <Card className="shadow-md max-w-md">
          <CardBody className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`week-${weekView}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Calendar header - days of week */}
                <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-xs font-semibold text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 * Math.ceil(currentWeekDays / 7) }).map((_, index) => {
                    // Calculate the day index relative to the current week
                   
                  

                    // Check if this day is part of the current week's data
                    const isValidDay = rawData[weekView]?.length - 1 >= index ;
                    const totalDays = (weekView * 7) + index;

                    // Call function with the calculated days
                    const dateInfo = extractDateInfo(START_DATE, totalDays);

                    return (
                      <motion.div
                        key={`calendar-day-${index}`}
                        className={`aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-all ${!isValidDay ? "opacity-10 pointer-events-none" : ""} ${
                            activeDate === index && isValidDay && selectedData != undefined
                              ? "bg-primary text-white shadow-md"
                              : isValidDay
                                ? "hover:bg-primary-100 dark:hover:bg-primary-800"
                                : "bg-gray-100 dark:bg-gray-800"
                          } ${dateInfo.isToday && isValidDay ? "ring-2 ring-primary" : ""}`}
                        onClick={() => isValidDay && (setActiveDate(index),setSelectedData(rawData[weekView][index]))}
                        whileHover={isValidDay ? { scale: 1.05 } : {}}
                        whileTap={isValidDay ? { scale: 0.95 } : {}}
                      >
                        <div className="flex flex-col items-center justify-center h-full w-full">
                        {!isValidDay || !isToday ? <Ban></Ban>  : <span className="text-sm font-medium">{dateInfo.date}</span>}
                          {dateInfo.isToday && isValidDay && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1"></div>
                          )}

                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </CardBody>
        </Card>

        {/* Selected day details */}
        <AnimatePresence mode="wait">
        {selectedData?.child?.length > 0 && (
  <motion.div
    key={`detail-day-${activeDate}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4 }}
    className="w-full mt-4"
  >
    <Card className="shadow-md">
      <CardHeader className="flex items-center gap-2 pb-0">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{selectedData.title}</h3>
      </CardHeader>

      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedData.child.map((section, sectionIndex) => (
            <motion.div
              key={`section-${sectionIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
            >
              <Card shadow="none" className="h-full border border-gray-100 dark:border-gray-700">
                <CardHeader className="bg-gray-200 dark:bg-gray-700 p-3 font-medium">
                  {section.title}
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y">
                    {section.child.map((item, itemIndex) => (
                      <div
                        key={`detail-item-${itemIndex}`}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        {item.content && (
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            {item.type === "file" ? (
                              <FileText className="h-4 w-4 text-primary" />
                            ) : item.type === "html" ? (
                              <Text className="h-4 w-4 text-primary" />
                            ) : (
                              <Clock className="h-4 w-4 text-primary" />
                            )}
                            {item.title}
                          </h4>
                        )}

                        {item.type === "text" && item.content && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                            {item.content}
                          </p>
                        )}

                        {item.type === "file" && item.content && (
                          <motion.div
                            className="mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Button
                              color="primary"
                              variant="flat"
                              size="sm"
                              as={Link}
                              href={item.content}
                              className="mt-2 w-full"
                              startContent={<FileText className="h-4 w-4" />}
                            >
                              View Material
                            </Button>
                          </motion.div>
                        )}

                        {item.type === "html" && item.content && (
                          <div
                            className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-md"
                            dangerouslySetInnerHTML={{ __html: item.content }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      </CardBody>
    </Card>
  </motion.div>
)}




        </AnimatePresence>
      </div>
    </div>
  )
}

