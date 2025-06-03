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
import { useNotifications } from "../../context/NotificationContext"

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
  const { fetchNotifications } = useNotifications()
  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const statusOrder = {
    'todo': 1,
    'in-progress': 2,
    'on-hold': 3,
    'cancelled': 4,
    'completed': 5
  };

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
    console.log('handleStatusUpdate called', { taskId, newStatus });
    try {
      const taskToUpdate = tasks.find((task) => task.id === taskId)
      if (!taskToUpdate) {
        console.log('Task not found');
        return
      }
      console.log('Updating task:', taskToUpdate)
      const response = await tasksApi.updatePersonalTask(taskId, { 
        ...taskToUpdate, 
        status: newStatus 
      })
      console.log('API response:', response)
      setTasks(tasks.map((task) => (task.id === taskId ? response.data : task)))
      toast.success("Task status updated")
      await fetchProjectStats()
      await fetchNotifications()
    } catch (err) {
      console.error('Error updating status:', err)
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

  const sortedTasks = filteredTasks.slice().sort((a, b) => {
    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
  });

  return (
    <div className="project-details-container">
      <div className="project-details-header">
        <Link to="/projects/personal" className="back-link">
          <ArrowLeft size={20} />
          Back to Projects
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
          (() => {
            // Calculate completed and total tasks from taskCounts
            const taskCounts = projectStats.taskCounts || [];
            const completedTasks = parseInt(taskCounts.find(t => t.status === "completed")?.count || 0);
            const totalTasks = taskCounts.reduce((sum, t) => sum + parseInt(t.count), 0);
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            return (
              <div className="project-progress">
                <div className="progress-stats">
                  <span className="progress-text">Progress</span>
                  <span className="tasks-count">
                    {completedTasks}/{totalTasks} tasks completed
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            );
          })()
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

        {sortedTasks.length > 0 ? (
          <div className="tasks-list">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`task-card card priority-${task.priority}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 24,
                  marginBottom: 16,
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  background: '#fff',
                  position: 'relative',
                  overflow: 'visible',
                  borderLeft: `4px solid ${getPriorityBorderColor(task.priority)}`,
                  opacity: task.status === 'completed' ? 0.5 : 1,
                  filter: task.status === 'completed' ? 'grayscale(0.3)' : 'none',
                  transition: 'opacity 0.3s, filter 0.3s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    className={`task-title${task.status === "completed" ? " completed" : ""}`}
                    style={{ fontSize: '1.5rem', fontWeight: 700, flex: 1, color: getPriorityBorderColor(task.priority) }}
                  >
                    {task.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <span className="priority-badge" style={{ fontWeight: 500, textTransform: 'capitalize', background: getPriorityBorderColor(task.priority), color: task.priority === 'medium' ? '#222' : '#fff', padding: '2px 12px', borderRadius: 8 }}>{task.priority}</span>
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
                <div
                  style={{ position: 'absolute', top: 0, right: 0, zIndex: 9999 }}
                >
                  <span
                    className={`task-status-bar status-${task.status.replace('in-progress', 'inprogress').replace('completed', 'done')}`}
                    style={{
                      fontSize: '1.05rem',
                      padding: '8px 24px',
                      borderRadius: 12,
                      fontWeight: 600,
                      minWidth: 120,
                      maxWidth: 200,
                      textAlign: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                      display: 'inline-block',
                      width: 'auto',
                      cursor: 'pointer',
                      background: openStatusDropdown === task.id ? '#f0f4ff' : '#fff',
                      whiteSpace: 'nowrap',
                      border: '1px solid #e0e0e0',
                      transition: 'background 0.15s, box-shadow 0.15s',
                    }}
                    onClick={e => {
                      const rect = e.target.getBoundingClientRect()
                      setOpenStatusDropdown(openStatusDropdown === task.id ? null : task.id)
                      setPopoverAnchor(openStatusDropdown === task.id ? null : rect)
                    }}
                    onMouseEnter={e => e.target.style.background = '#f5f7fa'}
                    onMouseLeave={e => e.target.style.background = openStatusDropdown === task.id ? '#f0f4ff' : '#fff'}
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
  switch (priority) {
    case 'urgent': return '#f5222d'; // red
    case 'high': return '#fa8c16'; // orange
    case 'medium': return '#ffdd00'; // yellow
    case 'low': return '#1890ff'; // blue
    default: return '#f0f0f0';
  }
}

function getPriorityTextColor(priority) {
  switch (priority) {
    case 'urgent': return '#fff'; // white text on red
    case 'high': return '#fff'; // white text on orange
    case 'medium': return '#222'; // dark text on yellow
    case 'low': return '#fff'; // white text on blue
    default: return '#222';
  }
}

function getPriorityBorderColor(priority) {
  switch (priority) {
    case 'urgent': return '#e5383b'; // red
    case 'high': return '#ff9f1c'; // orange
    case 'medium': return '#ffdd00'; // yellow
    case 'low': return '#8ecae6'; // blue
    default: return '#e0e0e0';
  }
}

function StatusPopover({ anchorRect, options, currentStatus, onSelect, onClose, getStatusTextColor, getStatusColor }) {
  console.log('StatusPopover rendered');
  const popoverRef = useRef(null)
  const ignoreNextClick = useRef(true)
  useEffect(() => {
    function handleClickOutside(event) {
      if (ignoreNextClick.current) {
        ignoreNextClick.current = false;
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
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
        zIndex: 999999,
        minWidth: 140,
        maxWidth: 180,
        maxHeight: 320,
        overflowY: 'visible',
        transition: 'opacity 0.15s',
        pointerEvents: 'auto',
      }}
    >
      {options.map(option => (
        <div
          key={option.value}
          tabIndex={0}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            color: getStatusTextColor(option.value),
            background: currentStatus === option.value ? getStatusColor(option.value) : '#fff',
            fontWeight: currentStatus === option.value ? 700 : 500,
            fontSize: '1.01rem',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
          }}
          onMouseDown={async () => {
            console.log('StatusPopover option clicked', option.value);
            await onSelect(option.value);
            onClose();
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