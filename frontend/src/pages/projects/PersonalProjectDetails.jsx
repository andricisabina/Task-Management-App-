"use client"

import React, { useRef, useState, useEffect } from "react"
import ReactDOM from "react-dom"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Folder,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
} from "react-feather"
import { toast } from "react-toastify"
import TaskModal from "../../components/tasks/TaskModal"
import { projectsApi, tasksApi } from "../../services/api"
import "./ProjectDetails.css"
import { useAuth } from "../../context/AuthContext"

const PersonalProjectDetails = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState(null)
  const [error, setError] = useState(null)
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null)
  const [hoveredStatusDropdown, setHoveredStatusDropdown] = useState(null)
  const [popoverAnchor, setPopoverAnchor] = useState(null)
  const statusBadgeRefs = React.useRef({})
  const [projectStats, setProjectStats] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const { currentUser } = useAuth()
  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    fetchProjectDetails()
  }, [projectId])

  useEffect(() => {
    if (project) {
      fetchProjectStats()
      if (project.PersonalTasks) {
        setTasks(project.PersonalTasks)
      } else if (project.Tasks) {
        setTasks(project.Tasks)
      } else {
        setTasks([])
      }
    }
  }, [project])

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const projectResponse = await projectsApi.getPersonalProject(projectId)
      const project = {
        ...projectResponse.data,
        type: "personal"
      }

      setProject(project)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjectStats = async () => {
    try {
      const response = await projectsApi.getPersonalProjectStats(project.id)
      setProjectStats(response.data)
    } catch (err) {
      toast.error("Failed to load project stats")
    }
  }

  const handleCreateTask = () => {
    setCurrentTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task) => {
    setCurrentTask(task)
    setIsModalOpen(true)
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksApi.deletePersonalTask(taskId)
      setTasks(tasks.filter((task) => task.id !== taskId))
      toast.success("Task deleted successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSaveTask = async (taskData) => {
    try {
      let response
      if (currentTask) {
        response = await tasksApi.updatePersonalTask(currentTask.id, {
          ...taskData,
          projectId: project.id
        })
        setTasks(tasks.map((task) => (task.id === currentTask.id ? response.data : task)))
        toast.success("Task updated successfully")
      } else {
        response = await tasksApi.createPersonalTask({
          ...taskData,
          projectId: project.id
        })
        setTasks([response.data, ...tasks])
        toast.success("Task created successfully")
      }
      setIsModalOpen(false)
      await fetchProjectDetails()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const taskToUpdate = tasks.find((task) => task.id === taskId)
      if (!taskToUpdate) return
      
      const response = await tasksApi.updatePersonalTask(taskId, { 
        ...taskToUpdate, 
        status: newStatus 
      })
      setTasks(tasks.map((task) => (task.id === taskId ? response.data : task)))
      toast.success("Task status updated")
      await fetchProjectStats()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const normalizeStatus = (status) => {
    return status.toLowerCase().replace(/\s+/g, '_')
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading project details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchProjectDetails}>
          Try Again
        </button>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="error-container">
        <h2>Project Not Found</h2>
        <p>The project you're looking for doesn't exist or has been deleted.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    )
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || task.status === filterStatus
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="project-details-container">
      <div className="project-details-header">
        <Link to="/personal-projects" className="back-link">
          <ArrowLeft size={18} /> Back to Projects
        </Link>
        <div className="project-actions">
          <button className="btn btn-primary create-task-btn" onClick={handleCreateTask}>
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      <div className="project-info-card card">
        <div className="project-info-header">
          <div className="project-icon">
            <Folder size={24} />
          </div>
          <div className="project-info-content">
            <h1 className="project-title">{project.title}</h1>
            <p className="project-description">{project.description}</p>
          </div>
        </div>

        <div className="project-meta">
          <div className="meta-item">
            <Calendar size={16} />
            <span>Created on {formatDate(project.createdAt)}</span>
          </div>
        </div>

        {projectStats && (
          <div className="project-progress">
            <div className="progress-stats">
              <span className="progress-text">Progress</span>
              <span className="tasks-count">
                {projectStats.completedTasks}/{projectStats.totalTasks} tasks completed
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${projectStats.completionRate}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="tasks-section card">
        <div className="tasks-header">
          <div className="tasks-filters">
            <div className="search-bar">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button 
              className={`filter-btn ${isFilterOpen ? 'active' : ''}`}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
          <div className="tasks-tabs">
            <button
              className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              className={`tab-btn ${activeTab === "todo" ? "active" : ""}`}
              onClick={() => setActiveTab("todo")}
            >
              To Do
            </button>
            <button
              className={`tab-btn ${activeTab === "in_progress" ? "active" : ""}`}
              onClick={() => setActiveTab("in_progress")}
            >
              In Progress
            </button>
            <button
              className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Completed
            </button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="filter-panel">
            <div className="filter-group">
              <label>Status</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Priority</label>
              <select 
                value={filterPriority} 
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        )}

        {filteredTasks.length > 0 ? (
          <div className="tasks-list">
            {filteredTasks.map((task) => (
              <div key={task.id} className={`task-card card priority-${task.priority}`} style={{ display: 'flex', flexDirection: 'column', padding: 24, marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', position: 'relative', overflow: 'visible' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#222', flex: 1 }}>{task.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <span className="priority-badge" style={{ fontWeight: 500, textTransform: 'capitalize', background: getPriorityColor(task.priority), color: getPriorityTextColor(task.priority), padding: '2px 12px', borderRadius: 8 }}>{task.priority}</span>
                  <span style={{ color: '#888', fontSize: '0.95rem' }}>
                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div style={{ color: '#555', fontSize: '1rem', marginBottom: 8, maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.description}
                </div>
                <div className="task-actions" style={{ marginTop: 8 }}>
                  <button className="action-btn edit-btn" onClick={() => handleEditTask(task)}>
                    Edit
                  </button>
                  <button className="action-btn delete-btn" onClick={() => handleDeleteTask(task.id)}>
                    Delete
                  </button>
                </div>
                <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 9999 }}>
                  <span
                    className={`task-status-bar status-${task.status.replace('in-progress', 'inprogress').replace('completed', 'done')}`}
                    style={{ fontSize: '1.05rem', padding: '6px 20px', borderRadius: 10, fontWeight: 600, minWidth: 120, maxWidth: 200, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'inline-block', width: 'auto', cursor: 'pointer', background: '#fff', whiteSpace: 'nowrap' }}
                    onClick={e => {
                      const rect = e.target.getBoundingClientRect()
                      setOpenStatusDropdown(openStatusDropdown === task.id ? null : task.id)
                      setPopoverAnchor(openStatusDropdown === task.id ? null : rect)
                    }}
                  >
                    {task.status === 'todo' ? 'To Do' : task.status === 'in-progress' ? 'In Progress' : task.status === 'completed' ? 'Completed' : task.status === 'on-hold' ? 'On Hold' : task.status === 'cancelled' ? 'Cancelled' : task.status.replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {openStatusDropdown === task.id && (
                    <StatusPopover
                      anchorRect={popoverAnchor}
                      options={statusOptions}
                      currentStatus={task.status}
                      onSelect={value => handleStatusUpdate(task.id, value)}
                      onClose={() => { setOpenStatusDropdown(null); setPopoverAnchor(null); }}
                      getStatusTextColor={getStatusTextColor}
                      getStatusColor={getStatusColor}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No tasks found</h3>
            <p>
              {activeTab === "all"
                ? "This project doesn't have any tasks yet."
                : `No ${activeTab} tasks found.`}
            </p>
            <button className="btn btn-primary" onClick={handleCreateTask}>
              Create Your First Task
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <TaskModal
          task={currentTask}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          isPersonal={true}
        />
      )}

      {openStatusDropdown && (
        <StatusPopover
          anchorRect={popoverAnchor}
          options={statusOptions}
          currentStatus={tasks.find(t => t.id === openStatusDropdown)?.status}
          onSelect={value => handleStatusUpdate(openStatusDropdown, value)}
          onClose={() => { setOpenStatusDropdown(null); setPopoverAnchor(null); }}
          getStatusTextColor={getStatusTextColor}
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  )
}

function getStatusColor(status) {
  if (!status) return "#f0f0f0";
  switch (status.toLowerCase()) {
    case "todo":
      return "#f0f0f0"
    case "in_progress":
    case "in-progress":
      return "#e6f7ff"
    case "completed":
      return "#f6ffed"
    case "on-hold":
    case "on_hold":
      return "#fff0f6"
    case "cancelled":
      return "#f5f5f5"
    default:
      return "#f0f0f0"
  }
}

function getStatusTextColor(status) {
  if (!status) return "#595959";
  switch (status.toLowerCase()) {
    case "todo":
      return "#595959"
    case "in_progress":
    case "in-progress":
      return "#1890ff"
    case "completed":
      return "#52c41a"
    case "on-hold":
    case "on_hold":
      return "#c41d7f"
    case "cancelled":
      return "#888"
    default:
      return "#595959"
  }
}

function getPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case "low":
      return "#f6ffed"
    case "medium":
      return "#fff7e6"
    case "high":
      return "#fff1f0"
    default:
      return "#f6ffed"
  }
}

function getPriorityTextColor(priority) {
  switch (priority.toLowerCase()) {
    case "low":
      return "#52c41a"
    case "medium":
      return "#fa8c16"
    case "high":
      return "#f5222d"
    default:
      return "#52c41a"
  }
}

function StatusPopover({ anchorRect, options, currentStatus, onSelect, onClose, getStatusTextColor, getStatusColor }) {
  const popoverRef = useRef(null)
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])
  if (!anchorRect) return null
  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 6,
        left: anchorRect.right - 140,
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        zIndex: 99999,
        minWidth: 140,
        maxWidth: 180,
        maxHeight: 320,
        overflowY: 'visible',
        transition: 'opacity 0.15s',
      }}
    >
      {options.map(option => (
        <div
          key={option.value}
          onClick={() => { onSelect(option.value); onClose(); }}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            color: getStatusTextColor(option.value),
            background: currentStatus === option.value ? getStatusColor(option.value) : '#fff',
            fontWeight: currentStatus === option.value ? 700 : 500,
            fontSize: '1.01rem',
            whiteSpace: 'nowrap',
          }}
        >
          {option.label}
        </div>
      ))}
    </div>,
    document.body
  )
}

export default PersonalProjectDetails 