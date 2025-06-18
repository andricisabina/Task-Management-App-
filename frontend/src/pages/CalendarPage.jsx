import React, { useEffect, useState } from 'react';
import BigCalendar from '../components/BigCalendar';
import { useTaskContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { Calendar } from "react-feather";

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
    <div className="calendar-page" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={32} color="#C4DFF5" />
          <h1 className="page-title" style={{ marginBottom: 8 }}>Task Calendar</h1>
        </div>
        <p className="calendar-description" style={{ color: '#555', fontSize: '1.1rem', marginBottom: 0 }}>
          View your tasks in month, week, or day view. Click on any task to see details.
        </p>
      </div>
      <BigCalendar tasks={userTasks} />
    </div>
  );
};

export default CalendarPage; 