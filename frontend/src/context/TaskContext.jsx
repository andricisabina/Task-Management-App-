import React, { createContext, useContext, useState, useCallback } from 'react';
import { tasksApi } from '../services/api';

const TaskContext = createContext();

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both personal and professional tasks
      const [personalRes, professionalRes] = await Promise.all([
        tasksApi.getPersonalTasks(),
        tasksApi.getProfessionalTasks(),
      ]);
      const personalTasks = (personalRes.data || personalRes).map(task => ({ ...task, type: 'personal' }));
      const professionalTasks = (professionalRes.data || professionalRes).map(task => ({ ...task, type: 'professional' }));
      setTasks([...personalTasks, ...professionalTasks]);
    } catch (err) {
      setError(err.message || 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = async (taskData) => {
    try {
      const response = await tasksApi.createPersonalTask(taskData);
      setTasks(prevTasks => [...prevTasks, { ...(response.data || response), type: 'personal' }]);
      return response.data || response;
    } catch (err) {
      setError(err.message || 'Failed to add task');
      throw err;
    }
  };

  const updateTask = async (taskId, taskData) => {
    try {
      const response = await tasksApi.updatePersonalTask(taskId, taskData);
      setTasks(prevTasks =>
        prevTasks.map(task => (task.id === taskId ? { ...(response.data || response), type: 'personal' } : task))
      );
      return response.data || response;
    } catch (err) {
      setError(err.message || 'Failed to update task');
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await tasksApi.deletePersonalTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (err) {
      setError(err.message || 'Failed to delete task');
      throw err;
    }
  };

  const value = {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export default TaskContext; 