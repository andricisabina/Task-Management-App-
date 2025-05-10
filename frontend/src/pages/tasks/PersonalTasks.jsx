"use client"

import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, Filter, CheckCircle, Calendar } from "react-feather"
import { toast } from "react-toastify"
import TaskModal from "../../components/tasks/TaskModal"
import "./Tasks.css"
import { tasksApi } from "../../services/api"
import ReactDOM from "react-dom"

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

const PersonalTasks = () => {
  const [tasks, setTasks] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState(null)
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null)
  const [hoveredStatusDropdown, setHoveredStatusDropdown] = useState(null)
  const [popoverAnchor, setPopoverAnchor] = useState(null)
  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
  ]
  const statusDropdownWrapperRef = useRef(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusDropdownWrapperRef.current && !statusDropdownWrapperRef.current.contains(event.target)) {
        setOpenStatusDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getPersonalTasks({ showStandalone: true })
      setTasks(response.data)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleStatusChange = (e) => {
    setFilterStatus(e.target.value)
  }

  const handlePriorityChange = (e) => {
    setFilterPriority(e.target.value)
  }

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen)
  }

  const filteredTasks = tasks.filter((task) => {
    // Filter by search term
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase())

    // Filter by status
    const matchesStatus = filterStatus === "all" || task.status === filterStatus

    // Filter by priority
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority

    return matchesSearch && matchesStatus && matchesPriority
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
      if (currentTask) {
        const response = await tasksApi.updatePersonalTask(currentTask.id, taskData)
        setTasks(tasks.map((task) => (task.id === currentTask.id ? response.data : task)))
        toast.success("Task updated successfully")
      } else {
        // Only create a standalone task if no projectId is provided
        if (!taskData.projectId) {
          const response = await tasksApi.createPersonalTask(taskData)
          setTasks([response.data, ...tasks])
          toast.success("Task created successfully")
        } else {
          // If projectId is provided, don't add it to the tasks list since it belongs to a project
          await tasksApi.createPersonalTask(taskData)
          toast.success("Task created successfully in project")
        }
      }
      setIsModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const taskToUpdate = tasks.find((task) => task.id === taskId)
      if (!taskToUpdate) return
      const response = await tasksApi.updatePersonalTask(taskId, { ...taskToUpdate, status: newStatus })
      setTasks(tasks.map((task) => (task.id === taskId ? response.data : task)))
      toast.success("Task status updated")
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h1 className="page-title">My Tasks</h1>
        <button className="btn btn-primary create-btn" onClick={handleCreateTask}>
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="search-filter-bar">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <button className="filter-btn" onClick={toggleFilter}>
          <Filter size={18} />
          <span>Filter</span>
        </button>
      </div>

      {isFilterOpen && (
        <div className="filter-panel">
          <div className="filter-group">
            <label htmlFor="status-filter">Status</label>
            <select id="status-filter" value={filterStatus} onChange={handleStatusChange} className="filter-select">
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
              onChange={handlePriorityChange}
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
        <div className="tasks-list">
          {sortedTasks.map((task) => (
            <div key={task.id} className={`task-card card priority-${task.priority}`} style={{ display: 'flex', flexDirection: 'column', padding: 24, marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', position: 'relative', overflow: 'visible' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#222', flex: 1 }}>{task.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <span className="priority-badge" style={{ fontWeight: 500, textTransform: 'capitalize', background: getPriorityColor(task.priority), color: getPriorityTextColor(task.priority), padding: '2px 12px', borderRadius: 8 }}>{task.priority}</span>
                <span style={{ color: '#888', fontSize: '0.95rem' }}>
                  Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'N/A'}
                </span>
                {task.PersonalProject && (
                  <Link to={`/personal-projects/${task.PersonalProject.id}`} style={{ color: task.PersonalProject.color || '#1890ff', fontSize: '0.95rem', textDecoration: 'none' }}>
                    Project: {task.PersonalProject.title}
                  </Link>
                )}
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
          <CheckCircle size={48} />
          <h3>No tasks found</h3>
          <p>{searchTerm ? "No tasks match your search criteria." : "You haven't created any tasks yet."}</p>
          <button className="btn btn-primary" onClick={handleCreateTask}>
            Create Your First Task
          </button>
        </div>
      )}

      {isModalOpen && <TaskModal task={currentTask} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} />}
    </div>
  )
}

export default PersonalTasks
