"use client"

import { extractDateInfo } from "@/utils/DateUtil"
import { supabase } from "@/utils/supabaseClient"
import { Button, Card, CardBody, CardHeader, CardFooter, Divider, Chip, Progress } from "@nextui-org/react"
import { useEffect, useState } from "react"
import { useNMNContext } from "./NMNContext"

function StudentAttendance({ userData }) {
  const user = userData
  const [attendance, setAttendance] = useState()
  const [isLoading, setIsLoading] = useState(true)
  const { userDetails, isDemo } = useNMNContext()

  // Get the start date of the current week (Monday)
  function getCurrentWeekStartDate() {
    const today = new Date()
    const currentDay = today.getDay() // 0 is Sunday, 1 is Monday, etc.
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1

    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToSubtract)

    return monday.toISOString().split("T")[0]
  }

  async function getLastSevenDays(a) {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("student", a?.email)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setAttendance(data)
    }
    setIsLoading(false)
  }

  function isTodayMarked(a) {
    if (a == undefined || a?.length == 0) {
      return undefined
    }

    const todayDate = new Date().toISOString().split("T")[0]
    const matchingItems = a.filter((item) => item.created_at.startsWith(todayDate))

    return matchingItems[0] || undefined
  }

  useEffect(() => {
    if (userDetails != undefined) {
      getLastSevenDays(userDetails)
    }
  }, [userDetails])

  async function markAs(a) {
    setIsLoading(true)
    const currentTime = new Date()

    const { error } = await supabase.from("attendance").insert({
      student: userDetails?.email,
      status: a,
      attended_at: currentTime.toISOString(),
      isAvailable: true,
      onVacation: a == "holiday" ? true : false,
    })

    if (!error) {
      getLastSevenDays(userDetails)
    } else {
      setIsLoading(false)
    }
  }

  function getDateStatus(dateString) {
    if (!attendance) return null

    const targetDate = new Date(dateString)
    const targetDateFormatted = targetDate.toISOString().split("T")[0]

    const matchingRecords = attendance.filter((record) => {
      const recordDate = new Date(record.attended_at).toISOString().split("T")[0]
      return recordDate === targetDateFormatted
    })

    const status = matchingRecords.length > 0 ? matchingRecords[0] : null

    if (!status)
      return (
        <Chip size="sm" variant="flat" color="default">
          Not marked
        </Chip>
      )

    switch (status.status) {
      case "present":
        return (
          <Chip size="sm" variant="solid" color="success">
            Present
          </Chip>
        )
      case "absent":
        return (
          <Chip size="sm" variant="solid" color="danger">
            Absent
          </Chip>
        )
      case "holiday":
        return (
          <Chip size="sm" variant="solid" color="primary">
            Holiday
          </Chip>
        )
      default:
        return (
          <Chip size="sm" variant="flat" color="default">
            Not marked
          </Chip>
        )
    }
  }

  function isToday(dateString) {
    const today = new Date()
    const todayFormatted = today.toISOString().split("T")[0]
    return dateString === todayFormatted
  }

  // Generate dates for the current week
  function getCurrentWeekDates() {
    const startDate = getCurrentWeekStartDate()
    const dates = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      dates.push(date.toISOString().split("T")[0])
    }

    return dates
  }

  // Calculate attendance statistics
  function getAttendanceStats() {
    if (!attendance || attendance.length === 0) return { present: 0, absent: 0, holiday: 0, total: 0 }

    const present = attendance.filter((a) => a.status === "present").length
    const absent = attendance.filter((a) => a.status === "absent").length
    const holiday = attendance.filter((a) => a.status === "holiday").length
    const total = present + absent + holiday

    return { present, absent, holiday, total }
  }

  const weekDates = getCurrentWeekDates()
  const stats = getAttendanceStats()
  const presentPercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="flex flex-col items-start px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold">Weekly Attendance Report</h2>
        <p className="text-sm text-default-500">Your attendance for the current week</p>
      </CardHeader>

      <CardBody className="px-4 py-2 overflow-visible">
        {isLoading ? (
          <Progress size="sm" isIndeterminate aria-label="Loading..." className="my-4" />
        ) : (
          <>
            {/* Attendance Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
              <Card shadow="sm" className="p-2">
                <CardBody className="p-1 text-center">
                  <p className="text-xs text-default-500">Rate</p>
                  <p className="text-lg font-bold">{presentPercentage}%</p>
                </CardBody>
              </Card>

              <Card shadow="sm" className="p-2">
                <CardBody className="p-1 text-center">
                  <p className="text-xs text-default-500">Present</p>
                  <p className="text-lg font-bold text-success">{stats.present}</p>
                </CardBody>
              </Card>

              <Card shadow="sm" className="p-2">
                <CardBody className="p-1 text-center">
                  <p className="text-xs text-default-500">Absent</p>
                  <p className="text-lg font-bold text-danger">{stats.absent}</p>
                </CardBody>
              </Card>

              <Card shadow="sm" className="p-2">
                <CardBody className="p-1 text-center">
                  <p className="text-xs text-default-500">Holiday</p>
                  <p className="text-lg font-bold text-primary">{stats.holiday}</p>
                </CardBody>
              </Card>
            </div>

            <Divider className="my-2" />

            {/* Weekly Calendar */}
            <div className="space-y-2 my-3">
              {weekDates.map((dateString, index) => {
                const dateInfo = extractDateInfo(dateString, 0)
                const isCurrentDay = isToday(dateString)

                return (
                  <Card key={index} shadow="sm" className={`w-full ${isCurrentDay ? "border border-success" : ""}`}>
                    <CardBody className="py-2 px-3">
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-md ${isCurrentDay ? "bg-success-100" : "bg-default-100"}`}>
                            <span className="font-medium">{dateInfo.dayName}</span>
                          </div>
                          <span className="text-sm text-default-500">
                            {dateInfo.date} {dateInfo.monthName}
                          </span>
                        </div>
                        <div>{getDateStatus(dateString)}</div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </CardBody>

      {!isDemo && (
        <>
          <Divider />
          <CardFooter className="flex flex-col items-start gap-3 px-4 py-3">
            <h3 className="text-md font-semibold">Today's Attendance</h3>

            {attendance && isTodayMarked(attendance) ? (
              <div className="flex items-center gap-2">
                <Chip
                  size="md"
                  variant="solid"
                  color={
                    isTodayMarked(attendance)?.status === "present"
                      ? "success"
                      : isTodayMarked(attendance)?.status === "absent"
                        ? "danger"
                        : "primary"
                  }
                >
                  {isTodayMarked(attendance)?.status === "present"
                    ? "Present"
                    : isTodayMarked(attendance)?.status === "absent"
                      ? "Absent"
                      : "On Vacation"}
                </Chip>
                <span className="text-sm text-default-500">
                  Marked at {new Date(isTodayMarked(attendance)?.created_at).toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 w-full">
                <Button color="success" size="sm" onPress={() => markAs("present")} isLoading={isLoading}>
                  Mark as Present
                </Button>
                <Button color="danger" size="sm" onPress={() => markAs("absent")} isLoading={isLoading}>
                  Mark as Absent
                </Button>
                <Button color="primary" size="sm" onPress={() => markAs("holiday")} isLoading={isLoading}>
                  Mark as Holiday/Vacation
                </Button>
              </div>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  )
}

export default StudentAttendance

