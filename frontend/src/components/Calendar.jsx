import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../styles/Calendar.css';
import { CheckCircle, Clock, AlertCircle, Calendar as CalendarIcon } from 'react-feather';

const statusIcons = {
  'pending': <Clock size={18} color="#FFA500" title="Pending" />,
  'in-progress': <AlertCircle size={18} color="#007bff" title="In Progress" />,
  'todo': <Clock size={18} color="#FFA500" title="To Do" />,
};

const statusColors = {
  'pending': '#fffbe6',
  'in-progress': '#e6f0ff',
  'todo': '#fffbe6',
};

function formatLongDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const CalendarComponent = ({ tasks }) => {
  const [date, setDate] = useState(new Date());

  // Only show tasks that are not completed
  const getTasksForDate = (date) => {
    return tasks?.filter(task => {
      if (task.status === 'completed') return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    }) || [];
  };

  // Custom tile content to show task count (not including completed)
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const tasksForDate = getTasksForDate(date);
      return tasksForDate.length > 0 ? (
        <div className="task-dot modern-task-dot" title={`${tasksForDate.length} task(s)`}>
          {tasksForDate.length}
        </div>
      ) : null;
    }
    return null;
  };

  // Custom tile class to highlight today and selected date
  const tileClassName = ({ date: tileDate, view }) => {
    if (view === 'month') {
      const isToday = new Date().toDateString() === tileDate.toDateString();
      const isSelected = date.toDateString() === tileDate.toDateString();
      if (isSelected) return 'modern-selected-tile';
      if (isToday) return 'modern-today-tile';
    }
    return null;
  };

  const tasksForSelectedDate = getTasksForDate(date);

  return (
    <div className="calendar-container modern-calendar-container">
      <div className="calendar-header">
        <CalendarIcon size={32} color="#1976d2" style={{ marginRight: 12 }} />
        <span className="calendar-header-date">{formatLongDate(date)}</span>
      </div>
      <Calendar
        onChange={setDate}
        value={date}
        tileContent={tileContent}
        tileClassName={tileClassName}
        className="custom-calendar modern-custom-calendar"
        locale="en-US"
      />
      <div className="selected-date-tasks modern-selected-date-tasks">
        <h3>Tasks for {formatLongDate(date)}</h3>
        {tasksForSelectedDate.length === 0 ? (
          <div className="no-tasks">No tasks for this day!</div>
        ) : (
          <ul className="task-list">
            {tasksForSelectedDate.map(task => (
              <li key={task.id} className={`task-card status-${task.status.toLowerCase()}`}
                  style={{ background: statusColors[task.status] || '#f5f5f5' }}>
                <span className="task-icon">
                  {statusIcons[task.status] || <Clock size={18} color="#888" />}
                </span>
                <span className="task-title">{task.title}</span>
                {/* Optionally, show due time or priority here */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CalendarComponent; 