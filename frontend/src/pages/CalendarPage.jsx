import React, { useEffect, useState } from 'react';
import BigCalendar from '../components/BigCalendar';
import { useTaskContext } from '../context/TaskContext';

const CalendarPage = () => {
  const { tasks, fetchTasks } = useTaskContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        await fetchTasks();
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [fetchTasks]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <h1>Task Calendar</h1>
      <p className="calendar-description">
        View your tasks in month, week, or day view. Click on any event to see details.
      </p>
      <BigCalendar tasks={tasks} />
    </div>
  );
};

export default CalendarPage; 