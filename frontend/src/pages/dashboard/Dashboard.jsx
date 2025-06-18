"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Calendar, Clock, AlertCircle, CheckCircle, Home } from "react-feather"
import { dashboardApi } from "../../services/api"
import "./Dashboard.css"
import TaskDetailsModal from "../../components/tasks/TaskDetailsModal"
import { useAuth } from "../../context/AuthContext"

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState({
    todayTasks: [],
    overdueTasks: [],
    recentProjects: [],
  })
  const [allTasks, setAllTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await dashboardApi.getDashboardData()
      setSummary({
        todayTasks: [
          ...(response.data.tasksToday?.personal || []),
          ...(response.data.tasksToday?.professional || [])
        ],
        overdueTasks: [
          ...(response.data.tasksOverdue?.personal || []),
          ...(response.data.tasksOverdue?.professional || [])
        ],
        recentProjects: [] // You can enhance this later with real data
      })
      setAllTasks(response.data.allTasks || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
  }

  // Calculate summary stats
  const totalTasks = allTasks.length;
  const todayCount = summary.todayTasks.length;
  const overdueCount = summary.overdueTasks.length;

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchDashboardData}>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Home size={32} color="#C4DFF5" />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Home</h1>
        </div>
        <div style={{ fontSize: '1.3rem', color: 'inherit', fontWeight: 600, marginTop: 8 }}>
          Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}!
        </div>
        <div style={{ display: 'flex', gap: 32, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={22} color="#43a047" />
            <span style={{ fontWeight: 500 }}>Today's Tasks:</span>
            <span style={{ fontWeight: 700, color: '#222' }}>{todayCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={22} color="#f44336" />
            <span style={{ fontWeight: 500 }}>Overdue:</span>
            <span style={{ fontWeight: 700, color: '#222' }}>{overdueCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={22} color="#1976d2" />
            <span style={{ fontWeight: 500 }}>Total Tasks:</span>
            <span style={{ fontWeight: 700, color: '#222' }}>{totalTasks}</span>
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <div className="card today-tasks">
            <div className="card-header">
              <h2 className="card-title">Today's Tasks</h2>
            </div>
            {summary.todayTasks.length > 0 ? (
              <ul className="task-list">
                {summary.todayTasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <div 
                      className="task-link" 
                      onClick={() => handleTaskClick(task)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="task-info">
                        <span className="task-title">{task.title}</span>
                        <span className={`task-priority ${task.priority}`}>{task.priority}</span>
                      </div>
                      <div className="task-status">
                        {task.status === "done" ? (
                          <CheckCircle size={16} className="status-icon done" />
                        ) : task.status === "inprogress" ? (
                          <Clock size={16} className="status-icon inprogress" />
                        ) : (
                          <AlertCircle size={16} className="status-icon todo" />
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No tasks scheduled for today</p>
              </div>
            )}
          </div>

          <div className="card overdue-tasks">
            <div className="card-header">
              <h2 className="card-title">Overdue Tasks</h2>
            </div>
            {summary.overdueTasks.length > 0 ? (
              <ul className="task-list">
                {summary.overdueTasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <div 
                      className="task-link" 
                      onClick={() => handleTaskClick(task)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="task-info">
                        <span className="task-title">{task.title}</span>
                        <span className={`task-priority ${task.priority}`}>{task.priority}</span>
                      </div>
                      <div className="task-status">
                        <Calendar size={14} />
                        <span className="due-date">
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No overdue tasks</p>
              </div>
            )}
          </div>
        </div>
        <div className="dashboard-column">
          <div className="card all-tasks">
            <div className="card-header">
              <h2 className="card-title">All Tasks</h2>
            </div>
            {allTasks.length > 0 ? (
              <ul className="task-list">
                {allTasks.map((task) => (
                  <li key={task.type + '-' + task.id} className="task-item">
                    <div 
                      className="task-link" 
                      onClick={() => handleTaskClick(task)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="task-info">
                        <span className="task-title">{task.title}</span>
                        {/* <span className={`task-priority ${task.priority}`}>{task.priority}</span> */}
                        {task.project && (
                          <span className="task-project" style={{ color: task.project.color || '#888', marginLeft: 8 }}>
                            {task.project.title}
                          </span>
                        )}
                      </div>
                      <div className="task-status">
                        <Calendar size={14} />
                        <span className="due-date">
                          Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="task-type" style={{ marginLeft: 8, fontStyle: 'italic', color: '#888' }}>
                          {task.type === 'personal' ? 'Personal' : 'Professional'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No tasks found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailsModal
          taskId={selectedTask.id}
          type={selectedTask.type || (selectedTask.assignedToId ? 'professional' : 'personal')}
          onClose={() => setSelectedTask(null)}
          onTaskChange={fetchDashboardData}
        />
      )}
    </div>
  )
}

export default Dashboard
