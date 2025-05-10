"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Calendar, Clock, AlertCircle, CheckCircle } from "react-feather"
import { dashboardApi } from "../../services/api"
import "./Dashboard.css"

const Dashboard = () => {
  const [summary, setSummary] = useState({
    todayTasks: [],
    overdueTasks: [],
    recentProjects: [],
  })
  const [allTasks, setAllTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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
      <h1 className="page-title">Task Dashboard</h1>

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
                    <Link to={`/tasks/${task.type || (task.assignedToId ? 'professional' : 'personal')}/${task.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                    </Link>
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
                    <Link to={`/tasks/${task.type || (task.assignedToId ? 'professional' : 'personal')}/${task.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No overdue tasks</p>
              </div>
            )}
          </div>

          <div className="card all-tasks">
            <div className="card-header">
              <h2 className="card-title">All Tasks</h2>
            </div>
            {allTasks.length > 0 ? (
              <ul className="task-list">
                {allTasks.map((task) => (
                  <li key={task.type + '-' + task.id} className="task-item">
                    <Link to={`/tasks/${task.type || (task.assignedToId ? 'professional' : 'personal')}/${task.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="task-info">
                        <span className="task-title">{task.title}</span>
                        <span className={`task-priority ${task.priority}`}>{task.priority}</span>
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
                    </Link>
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

        <div className="dashboard-column">
          <div className="card recent-projects">
            <div className="card-header">
              <h2 className="card-title">Recent Projects</h2>
              <div className="project-links">
                <Link to="/personal-projects" className="project-link">
                  Personal
                </Link>
                <Link to="/professional-projects" className="project-link">
                  Professional
                </Link>
              </div>
            </div>
            {summary.recentProjects.length > 0 ? (
              <ul className="project-list">
                {summary.recentProjects.map((project) => (
                  <li key={project.id} className="project-item">
                    <div className="project-info">
                      <span className="project-title">{project.title}</span>
                      <span className="project-type">{project.type}</span>
                    </div>
                    <div className="progress-wrapper">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${project.completionRate || 0}%` }}></div>
                      </div>
                      <span className="progress-text">{project.completionRate || 0}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No recent projects</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
