"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "react-feather"
import "./Calendar.css"

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    // Simulating data fetching
    const fetchEvents = () => {
      // This would be an API call in a real application
      const mockEvents = [
        {
          id: 1,
          title: "Complete project proposal",
          date: "2023-04-15",
          taskId: 1,
          projectId: 1,
          projectTitle: "Website Redesign",
          priority: "high",
        },
        {
          id: 2,
          title: "Research competitors",
          date: "2023-04-18",
          taskId: 2,
          projectId: 1,
          projectTitle: "Website Redesign",
          priority: "medium",
        },
        {
          id: 3,
          title: "Learn React hooks",
          date: "2023-04-20",
          taskId: 4,
          projectId: 2,
          projectTitle: "Learn React Native",
          priority: "medium",
        },
        {
          id: 4,
          title: "Set up CI/CD pipeline",
          date: "2023-04-25",
          taskId: 3,
          projectId: 1,
          projectTitle: "Website Redesign",
          priority: "low",
        },
        {
          id: 5,
          title: "Optimize images",
          date: "2023-04-28",
          taskId: 5,
          projectId: 1,
          projectTitle: "Website Redesign",
          priority: "low",
        },
      ]
      setEvents(mockEvents)
    }

    fetchEvents()
  }, [])

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)
  }

  const renderCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)
    const days = []

    // Add empty cells
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const getEventsForDate = (day) => {
    if (!day) return []

    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return events.filter((event) => event.date === dateString)
  }

  const formatDate = (date) => {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    return date.toLocaleDateString(undefined, options)
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="calendar-container">
      <h1 className="page-title">Calendar</h1>

      <div className="calendar-card card">
        <div className="calendar-header">
          <button className="month-nav-btn" onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <h2 className="current-month">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="month-nav-btn" onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid">
          {weekDays.map((day, index) => (
            <div key={index} className="weekday">
              {day}
            </div>
          ))}

          {renderCalendar().map((day, index) => {
            const eventsForDay = getEventsForDate(day)
            const hasEvents = eventsForDay.length > 0
            const isSelected =
              selectedDate &&
              day === selectedDate.getDate() &&
              currentDate.getMonth() === selectedDate.getMonth() &&
              currentDate.getFullYear() === selectedDate.getFullYear()

            return (
              <div
                key={index}
                className={`calendar-day ${!day ? "empty" : ""} ${hasEvents ? "has-events" : ""} ${isSelected ? "selected" : ""}`}
                onClick={() => day && handleDateClick(day)}
              >
                {day && (
                  <>
                    <span className="day-number">{day}</span>
                    {hasEvents && (
                      <div className="event-indicators">
                        {eventsForDay.slice(0, 3).map((event, idx) => (
                          <span key={idx} className={`event-dot priority-${event.priority}`}></span>
                        ))}
                        {eventsForDay.length > 3 && <span className="more-events">+{eventsForDay.length - 3}</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="events-card card">
          <div className="events-header">
            <h3 className="events-date">
              <CalendarIcon size={18} />
              {formatDate(selectedDate)}
            </h3>
          </div>

          <div className="events-list">
            {getEventsForDate(selectedDate.getDate()).length > 0 ? (
              getEventsForDate(selectedDate.getDate()).map((event) => (
                <div key={event.id} className={`event-item priority-${event.priority}`}>
                  <Link to={`/tasks/${event.taskId}`} className="event-title">
                    {event.title}
                  </Link>
                  <div className="event-project">
                    <Link to={`/projects/${event.projectId}`}>{event.projectTitle}</Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-events">No tasks due on this date</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
