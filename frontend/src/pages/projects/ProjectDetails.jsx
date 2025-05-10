"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Folder,
  Briefcase,
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
import ReactDOM from "react-dom"

const ProjectDetails = () => {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetchProjectDetails()
  }, [projectId])

  useEffect(() => {
    if (project && project.type === "personal") {
      fetchProjectStats()
    }
    // eslint-disable-next-line
  }, [project])

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Determine if it's a professional project based on ID format
      const isProfessional = Number.parseInt(projectId) > 100
      
      // Fetch project details
      const projectResponse = isProfessional 
        ? await projectsApi.getProfessionalProject(projectId)
        : await projectsApi.getPersonalProject(projectId)
      
      const project = {
        ...projectResponse.data,
        type: isProfessional ? "professional" : "personal"
      }

      setProject(project)

      // Tasks are included in the project response
      if (project.Tasks) {
        setTasks(project.Tasks)
      } else if (project.PersonalTasks) {
        setTasks(project.PersonalTasks)
      }

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
      const api = project.type === "professional" ? tasksApi.deleteProfessionalTask : tasksApi.deletePersonalTask
      await api(taskId)
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
        if (project.type === "professional") {
          response = await tasksApi.updateProfessionalTask(currentTask.id, {
            ...taskData,
            projectId: project.id
          })
        } else {
          response = await tasksApi.updatePersonalTask(currentTask.id, {
            ...taskData,
            projectId: project.id
          })
        }
        setTasks(tasks.map((task) => (task.id === currentTask.id ? response.data : task)))
        toast.success("Task updated successfully")
      } else {
        if (project.type === "professional") {
          response = await tasksApi.createProfessionalTask({
            ...taskData,
            projectId: project.id
          })
        } else {
          console.log("Creating personal task with data:", { ...taskData, projectId: project.id });
          response = await tasksApi.createPersonalTask({
            ...taskData,
            projectId: project.id
          })
        }
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
      let response
      if (project.type === "professional") {
        response = await tasksApi.updateProfessionalTask(taskId, { ...taskToUpdate, status: newStatus })
      } else {
        response = await tasksApi.updatePersonalTask(taskId, { ...taskToUpdate, status: newStatus })
      }
      setTasks(tasks.map((task) => (task.id === taskId ? response.data : task)))
      toast.success("Task status updated")
      // Refresh project stats after status change
      if (project.type === "personal") {
        await fetchProjectStats()
      } else if (project.type === "professional") {
        // Professional project stats refresh (if implemented)
        if (projectsApi.getProfessionalProjectStats) {
          try {
            const statsResponse = await projectsApi.getProfessionalProjectStats(project.id)
            // If you have a state for professional stats, set it here
            // setProfessionalProjectStats(statsResponse.data)
            // Or update project state if needed
            setProject((prev) => ({ ...prev, ...statsResponse.data }))
          } catch (err) {
            // Optionally handle error
          }
        }
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    // Filter by search term
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    // Filter by status
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    // Filter by priority
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    // Only show tasks with the correct projectId for personal projects
    const matchesProject = project.type !== 'personal' || task.projectId == project.id;
    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  })

  // Normalize status for sorting
  const normalizeStatus = (status) => {
    if (!status) return '';
    return status.toLowerCase().replace(/\s|_/g, '-');
  };

  const statusOrder = {
    'todo': 1,
    'to-do': 1,
    'to do': 1,
    'in-progress': 2,
    'in progress': 2,
    'on-hold': 3,
    'on hold': 3,
    'cancelled': 4,
    'completed': 5,
    'done': 5
  };

  const sortedTasks = filteredTasks.slice().sort((a, b) => {
    return (statusOrder[normalizeStatus(a.status)] || 99) - (statusOrder[normalizeStatus(b.status)] || 99);
  });

  // Calculate stats for personal projects
  let totalTasks = 0
  let completedTasks = 0
  let completionRate = 0
  if (project && project.type === "personal" && projectStats) {
    totalTasks = projectStats.taskCounts.reduce((sum, t) => sum + parseInt(t.count), 0)
    completedTasks = parseInt(projectStats.taskCounts.find(t => t.status === "completed")?.count || 0)
    completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
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

  return (
    <div className="project-details-container">
      <div className="project-details-header">
        <Link to={project.type === "personal" ? "/personal-projects" : "/professional-projects"} className="back-link">
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
          <div className={`project-icon ${project.type === "professional" ? "professional" : ""}`}>
            {project.type === "professional" ? <Briefcase size={24} /> : <Folder size={24} />}
          </div>
          <div className="project-info-content">
            <h1 className="project-title">{project.title}</h1>
            <p className="project-description">{project.description}</p>
          </div>
        </div>

        <div className="project-meta">
          <div className="meta-item">
            <Calendar size={16} />
            <span>Created on {new Date(project.createdAt).toLocaleDateString()}</span>
          </div>

          {project.type === "professional" && (
            <div className="meta-item">
              <Users size={16} />
              <span>Team: {project.Users?.map(user => user.name).join(", ") || "No team members"}</span>
            </div>
          )}
        </div>

        <div className="project-progress">
          <div className="progress-stats">
            <div className="progress-wrapper">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${project.type === "personal" ? completionRate : (project.completionRate || 0)}%` }}></div>
              </div>
              <span className="progress-text">{project.type === "personal" ? completionRate : (project.completionRate || 0)}% Complete</span>
            </div>
            <div className="tasks-count">
              <span>{project.type === "personal" ? completedTasks : (project.completedTasks || 0)}/{project.type === "personal" ? totalTasks : (project.tasksCount || 0)} tasks completed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tasks-section">
        <div className="tasks-header">
          <h2 className="page-title">Tasks</h2>
        </div>
        <div className="search-filter-bar" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="search-bar" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: '100%', minWidth: 320, fontSize: '1.1rem' }}
            />
          </div>
          <button className="filter-btn" onClick={() => setIsFilterOpen(!isFilterOpen)} style={{ height: 48 }}>
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>

        {isFilterOpen && (
          <div className="filter-panel">
            <div className="filter-group">
              <label htmlFor="status-filter">Status</label>
              <select id="status-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="priority-filter">Priority</label>
              <select
                id="priority-filter"
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        )}

        {sortedTasks.length > 0 ? (
          <div className="tasks-grid">
            {sortedTasks.map((task) => (
              project.type === 'personal' ? (
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
                  <div
                    style={{ position: 'absolute', top: 0, right: 0, zIndex: 9999 }}
                    onMouseEnter={() => setHoveredStatusDropdown(task.id)}
                    onMouseLeave={() => { setHoveredStatusDropdown(null); setOpenStatusDropdown(null); }}
                  >
                    <span
                      ref={el => statusBadgeRefs.current[task.id] = el}
                      className={`task-status-bar status-${task.status.replace('in-progress', 'inprogress').replace('completed', 'done')}`}
                      style={{ fontSize: '1.05rem', padding: '6px 20px', borderRadius: 10, fontWeight: 600, minWidth: 120, maxWidth: 200, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'inline-block', width: 'auto', cursor: 'pointer', background: '#fff', whiteSpace: 'nowrap' }}
                      onClick={e => {
                        const el = statusBadgeRefs.current[task.id]
                        if (el) {
                          const rect = el.getBoundingClientRect()
                          setOpenStatusDropdown(openStatusDropdown === task.id ? null : task.id)
                          setPopoverAnchor(openStatusDropdown === task.id ? null : rect)
                        }
                      }}
                    >
                      {task.status === 'todo' ? 'To Do' : task.status === 'in-progress' ? 'In Progress' : task.status === 'completed' ? 'Completed' : task.status === 'on-hold' ? 'On Hold' : task.status === 'cancelled' ? 'Cancelled' : task.status.replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {openStatusDropdown === task.id && (
                      <StatusPopover
                        anchorRect={popoverAnchor}
                        options={statusOptions}
                        currentStatus={task.status}
                        onSelect={async value => {
                          await handleStatusUpdate(task.id, value)
                          setOpenStatusDropdown(null)
                          setPopoverAnchor(null)
                        }}
                        onClose={() => { setOpenStatusDropdown(null); setPopoverAnchor(null); }}
                        getStatusTextColor={getStatusTextColor}
                        getStatusColor={getStatusColor}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div key={task.id} className="task-card card">
                  <h3 className="task-title">{task.title}</h3>
                  <p className="task-description">{task.description}</p>
                  {task.assignedTo && (
                    <div className="task-assignee">
                      <Users size={14} />
                      <span>{task.User?.name || "Unassigned"}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="task-due-date">
                      <Calendar size={14} />
                      <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )
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
          isProfessional={project.type === "professional"}
          projectMembers={project.Users}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}

function getStatusColor(status) {
  switch (status) {
    case 'todo': return '#fffbe6';
    case 'in-progress': return '#e6f7ff';
    case 'completed': return '#e6ffed';
    case 'on-hold': return '#fff0f6';
    case 'cancelled': return '#f5f5f5';
    default: return '#f9f9f9';
  }
}
function getStatusTextColor(status) {
  switch (status) {
    case 'todo': return '#ad8b00';
    case 'in-progress': return '#1890ff';
    case 'completed': return '#389e0d';
    case 'on-hold': return '#c41d7f';
    case 'cancelled': return '#888';
    default: return '#222';
  }
}
const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]
function StatusPopover({ anchorRect, options, currentStatus, onSelect, onClose, getStatusTextColor, getStatusColor }) {
  const popoverRef = React.useRef(null)
  React.useEffect(() => {
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

function getPriorityColor(priority) {
  switch (priority) {
    case 'urgent': return '#ff7875';
    case 'high': return '#ffd666';
    case 'medium': return '#91d5ff';
    case 'low': return '#d9f7be';
    default: return '#f0f0f0';
  }
}
function getPriorityTextColor(priority) {
  switch (priority) {
    case 'urgent': return '#a8071a';
    case 'high': return '#ad6800';
    case 'medium': return '#0050b3';
    case 'low': return '#237804';
    default: return '#222';
  }
}

export default ProjectDetails