import React, { useEffect, useState } from 'react';
import BigCalendar from '../components/BigCalendar';
import { useTaskContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';

const CalendarPage = () => {
  const { tasks, fetchTasks } = useTaskContext();
  const { currentUser } = useAuth();
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

  // Filter tasks for the current user
  const userTasks = tasks.filter(task =>
    (task.type === 'personal' && task.userId === currentUser?.id) ||
    (task.type === 'professional' && task.assignedToId === currentUser?.id)
  );

  return (
    <div className="calendar-page">
      <h1>Task Calendar</h1>
      <p className="calendar-description">
        View your tasks in month, week, or day view. Click on any event to see details.
      </p>
      <BigCalendar tasks={userTasks} />
    </div>
  );
};

export default CalendarPage; 