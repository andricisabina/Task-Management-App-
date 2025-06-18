import { useState, useEffect } from "react"
import { X, Calendar, Clock, Users, Paperclip, MessageSquare, Send } from "react-feather"
import { toast } from "react-toastify"
import TaskModal from "./TaskModal"
import { tasksApi } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import "./TaskDetailsModal.css"

const TaskDetailsModal = ({ taskId, type, onClose, onTaskChange }) => {
  const [task, setTask] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { currentUser } = useAuth()
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [extensionDays, setExtensionDays] = useState(1)
  const [extensionReason, setExtensionReason] = useState("")
  const [showRejectExtensionModal, setShowRejectExtensionModal] = useState(false)
  const [rejectExtensionReason, setRejectExtensionReason] = useState("")

  useEffect(() => {
    const fetchTaskDetails = async () => {
      setIsLoading(true)
      try {
        let response
        if (type === 'professional') {
          response = await tasksApi.getProfessionalTask(taskId)
        } else {
          response = await tasksApi.getPersonalTask(taskId)
        }
        setTask(response.data)
      } catch (err) {
        setTask(null)
        toast.error(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTaskDetails()
  }, [type, taskId])

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    try {
      let response
      if (type === 'professional') {
        response = await tasksApi.updateProfessionalTask(task.id, { ...task, status: newStatus })
      } else {
        response = await tasksApi.updatePersonalTask(task.id, { ...task, status: newStatus })
      }
      setTask(response.data)
      toast.success(
        `Task status updated to ${
          newStatus === 'todo' ? 'To Do' :
          newStatus === 'in-progress' ? 'In Progress' :
          newStatus === 'completed' ? 'Completed' :
          newStatus === 'on-hold' ? 'On Hold' :
          newStatus === 'cancelled' ? 'Cancelled' :
          newStatus.replace(/\b\w/g, l => l.toUpperCase())
        }`
      )
      if (onTaskChange) onTaskChange()
    } catch (err) {
      toast.error('Failed to update status: ' + (err.message || err))
    }
  }

  const handleEditTask = () => {
    setIsEditModalOpen(true)
  }

  const handleSaveTask = async (taskData) => {
    try {
      let response
      if (type === 'professional') {
        response = await tasksApi.updateProfessionalTask(task.id, { ...task, ...taskData })
      } else {
        response = await tasksApi.updatePersonalTask(task.id, { ...task, ...taskData })
      }
      setTask(response.data)
      setIsEditModalOpen(false)
      toast.success("Task updated successfully")
      if (onTaskChange) onTaskChange()
    } catch (err) {
      toast.error('Failed to update task: ' + (err.message || err))
    }
  }

  const handleDeleteTask = async () => {
    try {
      if (type === 'professional') {
        await tasksApi.deleteProfessionalTask(task.id)
      } else {
        await tasksApi.deletePersonalTask(task.id)
      }
      toast.success("Task deleted successfully")
      if (onTaskChange) onTaskChange()
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const formatTime = (dateTimeString) => {
    const date = new Date(dateTimeString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (isLoading) {
    return (
      <div className="task-details-modal">
        <div className="modal-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading task details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="task-details-modal">
        <div className="modal-content">
          <div className="error-container">
            <h2>Task Not Found</h2>
            <p>The task you're looking for doesn't exist or has been deleted.</p>
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="task-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h1 className="task-title">{task.title}</h1>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="task-info-card">
          <div className="task-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>Due: {formatDate(task.dueDate)}</span>
            </div>
            <div className="meta-item">
              <Clock size={16} />
              <span>Created: {formatDate(task.createdAt)}</span>
            </div>
            {task.estimatedTime && (
              <div className="meta-item">
                <Clock size={16} />
                <span>Estimated Time: {(task.estimatedTime / 60).toFixed(1)} hours</span>
              </div>
            )}
            {task.actualTime && (
              <div className="meta-item">
                <Clock size={16} />
                <span>Actual Time: {(task.actualTime / 60).toFixed(1)} hours</span>
              </div>
            )}
            {task.assignedTo && (
              <div className="meta-item">
                <Users size={16} />
                <span>Assigned to: {task.assignedTo.name || task.assignedTo.email}</span>
              </div>
            )}
            <div className={`priority-badge priority-${task.priority}`}>
              <span>
                {task.priority === "high"
                  ? "High Priority"
                  : task.priority === "medium"
                    ? "Medium Priority"
                    : "Low Priority"}
              </span>
            </div>
          </div>

          <div className="task-status-selector">
            <select value={task.status} onChange={handleStatusChange} className={`status-select status-${task.status}`} disabled={task.status === 'completed'}>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="task-description">
            <h3>Description</h3>
            <p>{task.description}</p>
          </div>

          {task.attachments && task.attachments.length > 0 && (
            <div className="task-attachments">
              <h3>
                <Paperclip size={16} /> Attachments
              </h3>
              <ul className="attachments-list">
                {task.attachments.map((attachment) => (
                  <li key={attachment.id} className="attachment-item">
                    <a href="#" className="attachment-link">
                      {attachment.name}
                    </a>
                    <span className="attachment-size">{attachment.size}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="task-actions">
            <button className="edit-btn" onClick={handleEditTask} disabled={task.status === 'completed'}>
              Edit Task
            </button>
            <button className="btn btn-danger" onClick={handleDeleteTask}>
              Delete Task
            </button>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <TaskModal
          task={task}
          isProfessional={!!task.assignedTo}
          teamMembers={task.assignedTo ? [task.assignedTo] : []}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}

export default TaskDetailsModal 