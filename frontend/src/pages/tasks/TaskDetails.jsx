"use client"

import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Calendar, Clock, Users, Paperclip, MessageSquare, Send, X } from "react-feather"
import { toast } from "react-toastify"
import TaskModal from "../../components/tasks/TaskModal"
import { tasksApi } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import "./TaskDetails.css"

const TaskDetails = () => {
  const { type, taskId } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { currentUser } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionDays, setExtensionDays] = useState(1);
  const [extensionReason, setExtensionReason] = useState("");
  const [showRejectExtensionModal, setShowRejectExtensionModal] = useState(false);
  const [rejectExtensionReason, setRejectExtensionReason] = useState("");

  useEffect(() => {
    const fetchTaskDetails = async () => {
      setIsLoading(true)
      try {
        let response
        if (type === 'professional') {
          response = await tasksApi.getProfessionalTask(taskId)
          // Fetch comments for professional tasks
          const commentsResponse = await tasksApi.getTaskComments(taskId)
          setComments(commentsResponse.data)
        } else {
          response = await tasksApi.getPersonalTask(taskId)
          setComments([])
        }
        setTask(response.data)
      } catch (err) {
        setTask(null)
        setComments([])
        toast.error(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTaskDetails()
  }, [type, taskId])

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

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const response = await tasksApi.addTaskComment(task.id, {
        content: newComment,
        parentId: null // For now, we're not handling nested comments
      })
      
      // Add the new comment to the list
      setComments([...comments, response.data])
      setNewComment("")
      toast.success("Comment added successfully")
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

  // Accept task handler
  const handleAcceptTask = async () => {
    try {
      await tasksApi.acceptProfessionalTask(task.id);
      toast.success("Task accepted!");
      // Refresh task details
      const response = await tasksApi.getProfessionalTask(task.id);
      setTask(response.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Reject task handler
  const handleRejectTask = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    try {
      await tasksApi.rejectProfessionalTask(task.id, { rejectionReason });
      toast.success("Task rejected!");
      setShowRejectModal(false);
      setRejectionReason("");
      // Refresh task details
      const response = await tasksApi.getProfessionalTask(task.id);
      setTask(response.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Request extension handler
  const handleRequestExtension = async () => {
    if (!extensionReason.trim() || extensionDays < 1 || extensionDays > 7) {
      toast.error("Please provide a valid reason and days (1-7)." );
      return;
    }
    try {
      await tasksApi.requestProfessionalTaskExtension(task.id, {
        extensionRequestDays: extensionDays,
        extensionRequestReason: extensionReason
      });
      toast.success("Extension request sent!");
      setShowExtensionModal(false);
      setExtensionReason("");
      setExtensionDays(1);
      // Refresh task details
      const response = await tasksApi.getProfessionalTask(task.id);
      setTask(response.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Approve extension handler
  const handleApproveExtension = async () => {
    try {
      await tasksApi.approveProfessionalTaskExtension(task.id);
      toast.success("Extension request approved!");
      // Refresh task details
      const response = await tasksApi.getProfessionalTask(task.id);
      setTask(response.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Reject extension handler
  const handleRejectExtension = async () => {
    if (!rejectExtensionReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    try {
      await tasksApi.rejectProfessionalTaskExtension(task.id, { rejectExtensionReason });
      toast.success("Extension request rejected!");
      setShowRejectExtensionModal(false);
      setRejectExtensionReason("");
      // Refresh task details
      const response = await tasksApi.getProfessionalTask(task.id);
      setTask(response.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

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

        {/* Accept/Reject buttons for assignee of professional task */}
        {type === 'professional' && task.status === 'pending' && currentUser && task.assignedToId === currentUser.id && (
          <div className="task-action-bar" style={{ margin: '16px 0', display: 'flex', gap: 12 }}>
            <button className="btn btn-success" onClick={handleAcceptTask}>Accept Task</button>
            <button className="btn btn-danger" onClick={() => setShowRejectModal(true)}>Reject Task</button>
          </div>
        )}
        {/* Deadline extension request for assignee */}
        {type === 'professional' && currentUser && task.assignedToId === currentUser.id &&
          (task.extensionStatus !== 'requested' && task.extensionStatus !== 'approved') && (
          <div className="task-action-bar" style={{ margin: '16px 0', display: 'flex', gap: 12 }}>
            <button className="btn btn-warning" onClick={() => setShowExtensionModal(true)}>Request Deadline Extension</button>
          </div>
        )}
        {/* Reject modal */}
        {showRejectModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Reject Task</h3>
                <button className="close-btn" onClick={() => setShowRejectModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-form">
                <label htmlFor="rejectionReason">Reason for rejection:</label>
                <textarea
                  id="rejectionReason"
                  className="form-input"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  required
                />
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleRejectTask}>Reject Task</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Extension modal */}
        {showExtensionModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Request Deadline Extension</h3>
                <button className="close-btn" onClick={() => setShowExtensionModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-form">
                <label htmlFor="extensionDays">Days (1-7):</label>
                <input
                  type="number"
                  id="extensionDays"
                  className="form-input"
                  min={1}
                  max={7}
                  value={extensionDays}
                  onChange={e => setExtensionDays(Number(e.target.value))}
                  required
                />
                <label htmlFor="extensionReason">Reason:</label>
                <textarea
                  id="extensionReason"
                  className="form-input"
                  value={extensionReason}
                  onChange={e => setExtensionReason(e.target.value)}
                  rows={3}
                  required
                />
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowExtensionModal(false)}>Cancel</button>
                  <button className="btn btn-warning" onClick={handleRequestExtension}>Request Extension</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extension request details and actions for managers */}
        {type === 'professional' && task.extensionStatus === 'requested' && 
         currentUser && (task.assignedById === currentUser.id || task.ProfessionalProject?.creatorId === currentUser.id) && (
          <div className="extension-request-section" style={{ margin: '16px 0', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <h4>Extension Request</h4>
            <div className="extension-details">
              <p><strong>Requested Days:</strong> {task.extensionRequestDays}</p>
              <p><strong>Reason:</strong> {task.extensionRequestReason}</p>
              <p><strong>Requested On:</strong> {formatDate(task.extensionRequestDate)}</p>
            </div>
            <div className="task-action-bar" style={{ marginTop: '12px', display: 'flex', gap: 12 }}>
              <button className="btn btn-success" onClick={handleApproveExtension}>Approve Extension</button>
              <button className="btn btn-danger" onClick={() => setShowRejectExtensionModal(true)}>Reject Extension</button>
            </div>
          </div>
        )}

        {/* Reject extension modal */}
        {showRejectExtensionModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Reject Extension Request</h3>
                <button className="close-btn" onClick={() => setShowRejectExtensionModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-form">
                <label htmlFor="rejectExtensionReason">Reason for rejection:</label>
                <textarea
                  id="rejectExtensionReason"
                  className="form-input"
                  value={rejectExtensionReason}
                  onChange={e => setRejectExtensionReason(e.target.value)}
                  rows={3}
                  required
                />
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowRejectExtensionModal(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleRejectExtension}>Reject Extension</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments section for professional tasks */}
      {type === 'professional' && (
        <div className="task-comments card">
          <h3 className="comments-title">
            <MessageSquare size={18} /> Comments
          </h3>

          <div className="comments-list">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <div className="comment-author-info">
                      {comment.user?.profilePhoto ? (
                        <img 
                          src={comment.user.profilePhoto} 
                          alt={comment.user.name} 
                          className="comment-author-avatar"
                        />
                      ) : (
                        <div className="comment-author-avatar-placeholder">
                          {comment.user?.name?.charAt(0)}
                        </div>
                      )}
                      <span className="comment-author">{comment.user?.name || 'Unknown User'}</span>
                    </div>
                    <span className="comment-time">
                      {formatDate(comment.createdAt)} at {formatTime(comment.createdAt)}
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
            <button 
              type="submit" 
              className="btn btn-primary comment-submit" 
              disabled={!newComment.trim()}
            >
              <Send size={16} /> Send
            </button>
          </form>
        </div>
      )}

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
