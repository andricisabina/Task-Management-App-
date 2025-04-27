"use client"

import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Calendar, Clock, Users, Paperclip, MessageSquare, Send } from "react-feather"
import { toast } from "react-toastify"
import TaskModal from "../../components/tasks/TaskModal"
import "./TaskDetails.css"

const TaskDetails = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    // Simulating data fetching
    const fetchTaskDetails = () => {
      // This would be API calls in a real application
      setTimeout(() => {
        const mockTask = {
          id: Number.parseInt(taskId),
          title: "Design homepage mockup",
          description:
            "Create a mockup for the homepage using Figma. Include mobile and desktop versions. Make sure to follow the brand guidelines and use the approved color palette.",
          status: "in-progress",
          priority: "high",
          dueDate: "2023-04-15",
          createdAt: "2023-04-01",
          projectId: 1,
          projectTitle: "Website Redesign",
          assignedTo: "Sarah M.",
          attachments: [
            { id: 1, name: "design-brief.pdf", size: "1.2 MB" },
            { id: 2, name: "color-palette.png", size: "245 KB" },
          ],
        }

        const mockComments = [
          {
            id: 1,
            author: "John D.",
            content: "I've added some reference designs to the shared folder. Please take a look.",
            timestamp: "2023-04-05T10:30:00",
          },
          {
            id: 2,
            author: "Sarah M.",
            content: "Thanks, I'll check them out. I'm planning to have the first draft ready by tomorrow.",
            timestamp: "2023-04-05T11:15:00",
          },
          {
            id: 3,
            author: "Alex K.",
            content: "Don't forget to include the new logo in the header section.",
            timestamp: "2023-04-06T09:45:00",
          },
        ]

        setTask(mockTask)
        setComments(mockComments)
        setIsLoading(false)
      }, 500)
    }

    fetchTaskDetails()
  }, [taskId])

  const handleStatusChange = (e) => {
    const newStatus = e.target.value
    setTask({ ...task, status: newStatus })
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
  }

  const handleEditTask = () => {
    setIsModalOpen(true)
  }

  const handleSaveTask = (taskData) => {
    setTask({ ...task, ...taskData })
    setIsModalOpen(false)
    toast.success("Task updated successfully")
  }

  const handleDeleteTask = () => {
    // This would be an API call in a real application
    toast.success("Task deleted successfully")
    navigate("/tasks")
  }

  const handleCommentChange = (e) => {
    setNewComment(e.target.value)
  }

  const handleSubmitComment = (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const newCommentObj = {
      id: Date.now(),
      author: "You",
      content: newComment,
      timestamp: new Date().toISOString(),
    }

    setComments([...comments, newCommentObj])
    setNewComment("")
    toast.success("Comment added")
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
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading task details...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="error-container">
        <h2>Task Not Found</h2>
        <p>The task you're looking for doesn't exist or has been deleted.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="task-details-container">
      <div className="task-details-header">
        <Link to="/tasks" className="back-link">
          <ArrowLeft size={18} /> Back to Tasks
        </Link>
        <div className="task-actions">
          <button className="btn btn-secondary" onClick={handleEditTask}>
            Edit Task
          </button>
          <button className="btn btn-danger" onClick={handleDeleteTask}>
            Delete Task
          </button>
        </div>
      </div>

      <div className="task-info-card card" style={{ position: 'relative' }}>
        <span className={`task-status-bar status-${task.status}`}>{
          task.status === 'todo' ? 'To Do' :
          task.status === 'in-progress' ? 'In Progress' :
          task.status === 'completed' ? 'Completed' :
          task.status === 'on-hold' ? 'On Hold' :
          task.status === 'cancelled' ? 'Cancelled' :
          task.status.replace(/\b\w/g, l => l.toUpperCase())
        }</span>
        <div className="task-info-header">
          <h1 className="task-title">{task.title}</h1>
          <div className="task-status-selector">
            <select value={task.status} onChange={handleStatusChange} className={`status-select status-${task.status}`}>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="task-meta">
          <div className="meta-item">
            <Calendar size={16} />
            <span>Due: {formatDate(task.dueDate)}</span>
          </div>
          <div className="meta-item">
            <Clock size={16} />
            <span>Created: {formatDate(task.createdAt)}</span>
          </div>
          {task.assignedTo && (
            <div className="meta-item">
              <Users size={16} />
              <span>Assigned to: {task.assignedTo}</span>
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

        <div className="task-project-link">
          <span>Project: </span>
          <Link to={`/projects/${task.projectId}`}>{task.projectTitle}</Link>
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
      </div>

      <div className="task-comments card">
        <h3 className="comments-title">
          <MessageSquare size={18} /> Comments
        </h3>

        <div className="comments-list">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-time">
                    {formatDate(comment.timestamp)} at {formatTime(comment.timestamp)}
                  </span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))
          ) : (
            <div className="no-comments">No comments yet</div>
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="comment-form">
          <textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={handleCommentChange}
            className="comment-input"
            rows="3"
          ></textarea>
          <button type="submit" className="btn btn-primary comment-submit" disabled={!newComment.trim()}>
            <Send size={16} /> Send
          </button>
        </form>
      </div>

      {isModalOpen && (
        <TaskModal
          task={task}
          isProfessional={!!task.assignedTo}
          teamMembers={task.assignedTo ? [task.assignedTo] : []}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}

export default TaskDetails
