import React, { useMemo, useState, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import { Clock } from 'react-feather';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/BigCalendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const statusColors = {
  'pending': '#ffb300',
  'in-progress': '#1976d2',
  'todo': '#ffb300',
  'professional': '#023e8a',
  'personal': '#25a18e',
};

const typeLabels = {
  'personal': 'Personal',
  'professional': 'Professional',
};

function formatDeadline(date) {
  return format(new Date(date), "PPPP 'at' p"); // e.g., Monday, May 22nd, 2025 at 3:00 PM
}

const BigCalendar = ({ tasks }) => {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const calendarRef = useRef();

  // Map tasks to events for the calendar
  const events = useMemo(() =>
    (tasks || [])
      .filter(task => task.status !== 'completed')
      .map(task => {
        const start = new Date(task.dueDate);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour after start
        return {
          id: `${task.type}-${task.id}`,
          title: `${task.title}`,
          start,
          end,
          allDay: false, // Show at the hour of the deadline
          status: task.status,
          type: task.type,
          deadline: true,
          raw: task,
        };
      }),
    [tasks]
  );

  // Custom event style
  const eventStyleGetter = (event) => {
    const backgroundColor = statusColors[event.type] || '#4a90e2';
    return {
      style: {
        backgroundColor,
        color: '#fff',
        borderRadius: '8px',
        border: '2px solid #e53935', // Red border for deadline
        fontWeight: 500,
        fontSize: '1rem',
        padding: '4px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
      },
    };
  };

  // Custom event rendering: only show the name, but show a custom popup on hover
  const EventComponent = ({ event }) => {
    const handleMouseEnter = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPopupPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      setHoveredEvent(event);
    };
    const handleMouseLeave = () => {
      setHoveredEvent(null);
    };
    return (
      <span
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Clock size={16} color="#fff" style={{ marginRight: 2 }} title="Deadline" />
        <span style={{ fontWeight: 600 }}>{event.title}</span>
      </span>
    );
  };

  // Render the custom popup
  const renderPopup = () => {
    if (!hoveredEvent) return null;
    // Position the popup absolutely above the event
    const style = {
      position: 'fixed',
      left: popupPos.x,
      top: popupPos.y - 60, // 60px above the event
      transform: 'translate(-50%, -100%)',
      zIndex: 9999,
      background: '#222',
      color: '#fff',
      borderRadius: '12px',
      padding: '1rem 1.2rem',
      minWidth: 220,
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      fontSize: '1rem',
      pointerEvents: 'none',
      opacity: 1,
      transition: 'opacity 0.15s',
    };
    return (
      <div style={style} className="custom-popup">
        <div className="popup-title" style={{ fontWeight: 700, color: '#4a90e2', marginBottom: 6 }}>{hoveredEvent.title}</div>
        <div className="popup-row"><span className="popup-label" style={{ color: '#ffb300', fontWeight: 600 }}>Type:</span> {typeLabels[hoveredEvent.type]}</div>
        <div className="popup-row"><span className="popup-label" style={{ color: '#ffb300', fontWeight: 600 }}>Deadline:</span> {formatDeadline(hoveredEvent.start)}</div>
      </div>
    );
  };

  return (
    <div className="big-calendar-container" ref={calendarRef}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 650, background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}
        eventPropGetter={eventStyleGetter}
        components={{ event: EventComponent }}
        popup
        views={['month', 'week', 'day']}
        defaultView="month"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        toolbar
        selectable={false}
        showAllEvents
      />
      {renderPopup()}
    </div>
  );
};

export default BigCalendar; 