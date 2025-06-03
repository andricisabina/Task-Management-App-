"use client"

import React, { useRef, useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Briefcase,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  X,
  CornerUpLeft,
  Edit2,
  Trash2,
} from "react-feather"
import { toast } from "react-toastify"
import TaskModal from "../../components/tasks/TaskModal"
import { projectsApi, tasksApi } from "../../services/api"
import "./ProjectDetails.css"
import ReactDOM from "react-dom"
import { useAuth } from "../../context/AuthContext"
import ConfirmModal from "../../components/ConfirmModal"
import { useNotifications } from "../../context/NotificationContext"

const ProfessionalProjectDetails = () => {
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
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState({})
  const { currentUser } = useAuth()
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, comment: null })
  const [modalDepartments, setModalDepartments] = useState([])
  const { fetchNotifications } = useNotifications()

  useEffect(() => {
    fetchProjectDetails()
    fetchProjectComments()
  }, [projectId])

  useEffect(() => {
    if (project && project.ProfessionalTasks) {
      setTasks(project.ProfessionalTasks)
    }
  }, [project])

  useEffect(() => {
    if (modalDepartments.length > 0) {
      setIsModalOpen(true);
    }
  }, [modalDepartments]);

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const projectResponse = await projectsApi.getProfessionalProject(projectId)
      const project = {
        ...projectResponse.data,
        type: "professional"
      }

      setProject(project)
      alert("Departments: " + JSON.stringify(project.departments));
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjectComments = async () => {
    try {
      const response = await projectsApi.getProjectComments(projectId)
      setComments(response.data)
    } catch (err) {
      toast.error("Failed to load comments")
    }
  }

  const handleCreateTask = async () => {
    const projectResponse = await projectsApi.getProfessionalProject(projectId);
    const latestProject = {
      ...projectResponse.data,
      type: "professional"
    };

    setProject(latestProject);

    if (latestProject && latestProject.departments && latestProject.departments.length > 0) {
      setCurrentTask(null);
      setModalDepartments(latestProject.departments);
    } else {
      toast.error("Project departments not loaded yet!");
    }
  };

  const handleEditTask = (task) => {
    setCurrentTask(task)
    setModalDepartments(project.departments || [])
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksApi.deleteProfessionalTask(taskId)
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
        response = await tasksApi.updateProfessionalTask(currentTask.id, {
          ...taskData,
          projectId: project.id
        })
        setTasks(tasks.map((task) => (task.id === currentTask.id ? response.data : task)))
        toast.success("Task updated successfully")
      } else {
        response = await tasksApi.createProfessionalTask({
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
      
      const response = await tasksApi.updateProfessionalTask(taskId, { 
        ...taskToUpdate, 
        status: newStatus 
      })
      setTasks(tasks.map((task) => (task.id === taskId ? response.data : task)))
      toast.success("Task status updated")
      await fetchProjectDetails()
      await fetchNotifications()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleCommentChange = (e) => {
    setNewComment(e.target.value)
  }

  const handleReplyChange = (e) => {
    setReplyContent(e.target.value)
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const response = await projectsApi.addProjectComment(projectId, {
        content: newComment,
      })
      setComments([response.data, ...comments])
      setNewComment("")
      toast.success("Comment added successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!replyContent.trim()) return

    try {
      const response = await projectsApi.addProjectComment(projectId, {
        content: replyContent,
        parentId: replyingTo.id,
      })
      setComments([response.data, ...comments])
      setReplyContent("")
      setReplyingTo(null)
      toast.success("Reply added successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingContent(comment.content)
  }

  const handleSaveEdit = async (comment) => {
    try {
      const response = await projectsApi.editProjectComment(projectId, comment.id, {
        content: editingContent,
      })
      setComments(comments.map((c) => (c.id === comment.id ? response.data : c)))
      setEditingCommentId(null)
      toast.success("Comment updated successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteComment = (comment) => {
    setDeleteConfirm({ open: true, comment })
  }

  const confirmDeleteComment = async () => {
    try {
      await projectsApi.deleteProjectComment(projectId, deleteConfirm.comment.id)
      setComments(comments.filter((c) => c.id !== deleteConfirm.comment.id))
      setDeleteConfirm({ open: false, comment: null })
      toast.success("Comment deleted successfully")
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

  const tasksByDepartment = tasks.reduce((acc, task) => {
    if (task.departmentId) {
      if (!acc[task.departmentId]) {
        acc[task.departmentId] = []
      }
      acc[task.departmentId].push(task)
    }
    return acc
  }, {})

  const unassignedTasks = tasks.filter(task => !task.departmentId)

  if (isModalOpen) {
    console.log("Parent modalDepartments:", modalDepartments, "isModalOpen:", isModalOpen);
  }

  return (
    <div className="project-details-container">
      <div className="project-details-header">
        <Link to="/professional-projects" className="back-link">
          <ArrowLeft size={18} /> Back to Projects
        </Link>
        <div className="project-actions">
          <button
            className="btn btn-primary create-task-btn"
            onClick={handleCreateTask}
            disabled={!project || !project.departments || project.departments.length === 0}
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      <div className="project-info-card card">
        <div className="project-info-header">
          <div className="project-icon professional">
            <Briefcase size={24} />
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
          <div className="meta-item">
            <Users size={16} />
            <span>Manager: {project.creator?.name || project.creator?.email}</span>
          </div>
        </div>

        {/* Department Leaders */}
        {project.departments && project.departments.length > 0 && (
          <div className="department-leaders" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Department Leaders</h4>
            <ul style={{ paddingLeft: 16 }}>
              {project.departments.map(dept => (
                <li key={dept.id} style={{ marginBottom: 4 }}>
                  <strong>{dept.name}:</strong> {dept.ProjectDepartment?.leaderId ? 
                    (project.Users?.find(u => u.id === dept.ProjectDepartment.leaderId)?.name || 
                     project.Users?.find(u => u.id === dept.ProjectDepartment.leaderId)?.email || 
                     'Invited') : 'Not assigned'}
                </li>
              ))}
            </ul>
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

        {project.departments && project.departments.length > 0 ? (
          <div className="tasks-by-department">
            {project.departments.map(dept => (
              <div key={dept.id} style={{ marginBottom: 32 }}>
                <h3 style={{ marginBottom: 12 }}>{dept.name}</h3>
                {tasksByDepartment[dept.id] && tasksByDepartment[dept.id].length > 0 ? (
                  tasksByDepartment[dept.id].map(task => {
                    const isLeader = project.ProjectMembers?.some(
                      m => m.role === 'leader' && m.status === 'accepted' && m.userId === currentUser.id && m.departmentId === task.departmentId
                    )
                    const canUpdateStatus = currentUser && (
                      task.assignedToId === currentUser.id ||
                      (project.creator && project.creator.id === currentUser.id) ||
                      isLeader
                    )
                    return (
                      <div key={task.id} className="task-card card" style={{ 
                        cursor: 'pointer', 
                        marginBottom: 16,
                        borderLeft: `4px solid ${getPriorityBorderColor(task.priority)}`
                      }} onClick={() => navigate(`/tasks/professional/${task.id}`)}>
                        <div className="task-header">
                          <h4 className={`task-title${task.status === "completed" ? " completed" : ""}`} style={{ color: getPriorityBorderColor(task.priority) }}>{task.title}</h4>
                          <div className="task-actions">
                            {canUpdateStatus && (
                              <button
                                className="status-badge"
                                style={{
                                  backgroundColor: getStatusColor(task.status),
                                  color: getStatusTextColor(task.status)
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPopoverAnchor(e.currentTarget)
                                  setOpenStatusDropdown(task.id)
                                }}
                              >
                                {task.status}
                              </button>
                            )}
                            <button
                              className="task-dropdown-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTask(task)
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="task-description">{task.description}</p>
                        <div className="task-meta">
                          <span className="priority-badge" style={{ backgroundColor: getPriorityBorderColor(task.priority), color: task.priority.toLowerCase() === 'medium' ? '#222' : '#fff' }}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="due-date">
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                          {task.assignedTo && (
                            <span className="assigned-to">
                              Assigned to: {task.assignedTo.name}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="empty-state">
                    <p>No tasks assigned to this department</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {unassignedTasks.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 12 }}>Unassigned Tasks</h3>
            {unassignedTasks.map(task => {
              const isLeader = project.ProjectMembers?.some(
                m => m.role === 'leader' && m.status === 'accepted' && m.userId === currentUser.id && m.departmentId === task.departmentId
              )
              const canUpdateStatus = currentUser && (
                task.assignedToId === currentUser.id ||
                (project.creator && project.creator.id === currentUser.id) ||
                isLeader
              )
              return (
                <div key={task.id} className="task-card card" style={{ 
                  cursor: 'pointer', 
                  marginBottom: 16,
                  borderLeft: `4px solid ${getPriorityBorderColor(task.priority)}`
                }} onClick={() => navigate(`/tasks/professional/${task.id}`)}>
                  <div className="task-header">
                    <h4 className={`task-title${task.status === "completed" ? " completed" : ""}`} style={{ color: getPriorityBorderColor(task.priority) }}>{task.title}</h4>
                    <div className="task-actions">
                      {canUpdateStatus && (
                        <button
                          className="status-badge"
                          style={{
                            backgroundColor: getStatusColor(task.status),
                            color: getStatusTextColor(task.status)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPopoverAnchor(e.currentTarget)
                            setOpenStatusDropdown(task.id)
                          }}
                        >
                          {task.status}
                        </button>
                      )}
                      <button
                        className="task-dropdown-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditTask(task)
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="task-description">{task.description}</p>
                  <div className="task-meta">
                    <span className="priority-badge" style={{ backgroundColor: getPriorityBorderColor(task.priority), color: task.priority.toLowerCase() === 'medium' ? '#222' : '#fff' }}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="due-date">
                        Due: {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.assignedTo && (
                      <span className="assigned-to">
                        Assigned to: {task.assignedTo.name}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Project Comments Section */}
      <div className="project-comments card">
        <h3 className="comments-title">
          <MessageSquare size={18} /> Project Comments
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
                    {comment.isEdited && <span style={{ fontSize: '0.8em', color: '#888', marginLeft: 8 }}>(edited)</span>}
                  </div>
                  <span className="comment-time">
                    {formatDate(comment.createdAt)} at {formatTime(comment.createdAt)}
                  </span>
                  {/* Edit/Delete buttons for own comment */}
                  {currentUser && comment.userId === currentUser.id && (
                    <div className="comment-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditComment(comment)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteComment(comment)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {editingCommentId === comment.id ? (
                  <div className="edit-comment-form">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                    <div className="edit-actions">
                      <button
                        className="save-btn"
                        onClick={() => handleSaveEdit(comment)}
                      >
                        Save
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => setEditingCommentId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="comment-content">{comment.content}</p>
                )}
                {!comment.parentId && (
                  <button
                    className="reply-btn"
                    onClick={() => setReplyingTo(comment)}
                  >
                    <CornerUpLeft size={14} /> Reply
                  </button>
                )}
                {replyingTo && replyingTo.id === comment.id && (
                  <div className="reply-form">
                    <textarea
                      value={replyContent}
                      onChange={handleReplyChange}
                      placeholder="Write your reply..."
                    />
                    <div className="reply-actions">
                      <button
                        className="send-btn"
                        onClick={handleSubmitReply}
                      >
                        <Send size={14} /> Send
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent("")
                        }}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
                {/* Nested replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="replies-list">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="reply-item">
                        <div className="reply-header">
                          <div className="reply-author-info">
                            {reply.user?.profilePhoto ? (
                              <img
                                src={reply.user.profilePhoto}
                                alt={reply.user.name}
                                className="reply-author-avatar"
                              />
                            ) : (
                              <div className="reply-author-avatar-placeholder">
                                {reply.user?.name?.charAt(0)}
                              </div>
                            )}
                            <span className="reply-author">
                              {reply.user?.name || 'Unknown User'}
                            </span>
                            {reply.isEdited && (
                              <span style={{ fontSize: '0.8em', color: '#888', marginLeft: 8 }}>
                                (edited)
                              </span>
                            )}
                          </div>
                          <span className="reply-time">
                            {formatDate(reply.createdAt)} at {formatTime(reply.createdAt)}
                          </span>
                          {/* Edit/Delete buttons for own reply */}
                          {currentUser && reply.userId === currentUser.id && (
                            <div className="reply-actions">
                              <button
                                className="edit-btn"
                                onClick={() => handleEditComment(reply)}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="delete-btn"
                                onClick={() => handleDeleteComment(reply)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === reply.id ? (
                          <div className="edit-reply-form">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                            />
                            <div className="edit-actions">
                              <button
                                className="save-btn"
                                onClick={() => handleSaveEdit(reply)}
                              >
                                Save
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={() => setEditingCommentId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="reply-content">{reply.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="comment-form">
          <textarea
            value={newComment}
            onChange={handleCommentChange}
            placeholder="Write a comment..."
            required
          />
          <button type="submit" className="submit-btn">
            <Send size={16} /> Post Comment
          </button>
        </form>
      </div>

      {isModalOpen && modalDepartments.length > 0 && (
        <TaskModal
          task={currentTask}
          isProfessional={true}
          departments={modalDepartments}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}

      {openStatusDropdown && (
        <StatusPopover
          anchorEl={popoverAnchor}
          options={["todo", "in_progress", "completed"]}
          currentStatus={tasks.find(t => t.id === openStatusDropdown)?.status}
          onSelect={(status) => {
            handleStatusUpdate(openStatusDropdown, status)
            setOpenStatusDropdown(null)
          }}
          onClose={() => setOpenStatusDropdown(null)}
          getStatusTextColor={getStatusTextColor}
          getStatusColor={getStatusColor}
        />
      )}

      {deleteConfirm.open && (
        <ConfirmModal
          isOpen={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, comment: null })}
          onConfirm={confirmDeleteComment}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
        />
      )}
    </div>
  )
}

function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case "todo":
      return "#f0f0f0"
    case "in_progress":
      return "#e6f7ff"
    case "completed":
      return "#f6ffed"
    default:
      return "#f0f0f0"
  }
}

function getStatusTextColor(status) {
  switch (status.toLowerCase()) {
    case "todo":
      return "#595959"
    case "in_progress":
      return "#1890ff"
    case "completed":
      return "#52c41a"
    default:
      return "#595959"
  }
}

function getPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'urgent': return '#f5222d'; // red
    case 'high': return '#fa8c16'; // orange
    case 'medium': return '#ffdd00'; // yellow
    case 'low': return '#1890ff'; // blue
    default: return '#f0f0f0';
  }
}

function getPriorityTextColor(priority) {
  switch (priority.toLowerCase()) {
    case 'urgent': return '#fff'; // white text on red
    case 'high': return '#fff'; // white text on orange
    case 'medium': return '#222'; // dark text on yellow
    case 'low': return '#fff'; // white text on blue
    default: return '#222';
  }
}

function getPriorityBorderColor(priority) {
  switch (priority.toLowerCase()) {
    case 'urgent': return '#e5383b'; // red
    case 'high': return '#ff9f1c'; // orange
    case 'medium': return '#ffdd00'; // yellow
    case 'low': return '#8ecae6'; // blue
    default: return '#e0e0e0';
  }
}

function StatusPopover({ anchorEl, options, currentStatus, onSelect, onClose, getStatusTextColor, getStatusColor }) {
  const popoverRef = useRef(null)

  function handleClickOutside(event) {
    if (popoverRef.current && !popoverRef.current.contains(event.target)) {
      onClose()
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  if (!anchorEl) return null

  const rect = anchorEl.getBoundingClientRect()

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      className="status-popover"
      style={{
        position: "fixed",
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        zIndex: 1000,
      }}
    >
      {options.map((status) => (
        <button
          key={status}
          className="status-option"
          style={{
            backgroundColor: getStatusColor(status),
            color: getStatusTextColor(status),
          }}
          onClick={() => onSelect(status)}
        >
          {status.replace(/_/g, " ")}
        </button>
      ))}
    </div>,
    document.body
  )
}

export default ProfessionalProjectDetails 