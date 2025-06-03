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

const ProjectDetails = () => {
  const { type, projectId } = useParams()
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
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState({})
  const { currentUser } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, comment: null });

  useEffect(() => {
    fetchProjectDetails()
    if (type === 'professional') {
      fetchProjectComments()
    }
  }, [projectId])

  useEffect(() => {
    if (project && project.type === "personal") {
      fetchProjectStats()
    }
    // eslint-disable-next-line
  }, [project])

  useEffect(() => {
    if (project && project.type === "professional" && (project.completionRate === 100 || (projectStats && projectStats.completionRate === 100))) {
      // Only notify once per session per project
      if (!window.__notifiedCompletedProjects) window.__notifiedCompletedProjects = {};
      if (!window.__notifiedCompletedProjects[project.id]) {
        toast.info("🎉 Project is 100% complete!", { autoClose: 5000 });
        window.__notifiedCompletedProjects[project.id] = true;
      }
    }
  }, [project, projectStats]);

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Determine project type from route param
      const isProfessional = type === "professional"
      
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
      if (type === "personal") {
        const response = await projectsApi.getPersonalProjectStats(project.id)
        setProjectStats(response.data)
      } else if (type === "professional" && projectsApi.getProfessionalProjectStats) {
        // If you have professional stats endpoint, call it here
        const response = await projectsApi.getProfessionalProjectStats(project.id)
        setProjectStats(response.data)
      }
    } catch (err) {
      toast.error("Failed to load project stats")
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
        parentId: null
      })
      
      setComments([...comments, response.data])
      setNewComment("")
      toast.success("Comment added successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!replyContent.trim() || !replyingTo) return

    try {
      const response = await projectsApi.addProjectComment(projectId, {
        content: replyContent,
        parentId: replyingTo.id
      })
      
      // Add the reply to the parent comment's replies
      setComments(comments.map(comment => 
        comment.id === replyingTo.id 
          ? { ...comment, replies: [...(comment.replies || []), response.data] }
          : comment
      ))
      
      setReplyContent("")
      setReplyingTo(null)
      toast.success("Reply added successfully")
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

  // Edit comment handler
  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingContent((prev) => ({ ...prev, [comment.id]: comment.content }))
  }

  const handleSaveEdit = async (comment) => {
    try {
      const response = await projectsApi.editProjectComment(projectId, comment.id, { content: editingContent[comment.id] })
      setComments(comments.map(c => {
        if (c.id === comment.id) return { ...c, ...response.data }
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === comment.id ? { ...r, ...response.data } : r) }
        }
        return c
      }))
      setEditingCommentId(null)
      setEditingContent((prev) => {
        const newState = { ...prev }
        delete newState[comment.id]
        return newState
      })
      toast.success("Comment updated")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteComment = (comment) => {
    setDeleteConfirm({ open: true, comment });
  };

  const confirmDeleteComment = async () => {
    const comment = deleteConfirm.comment;
    setDeleteConfirm({ open: false, comment: null });
    try {
      await projectsApi.deleteProjectComment(projectId, comment.id);
      setComments(comments.filter(c => c.id !== comment.id).map(c => ({
        ...c,
        replies: c.replies ? c.replies.filter(r => r.id !== comment.id) : []
      })));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err.message);
    }
  };

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
              <span>Manager: {project.creator?.name || project.creator?.email}</span>
            </div>
          )}
        </div>

        {/* Department Leaders */}
        {project.type === "professional" && project.departments && project.departments.length > 0 && (
          <div className="department-leaders" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Department Leaders</h4>
            <ul style={{ paddingLeft: 16 }}>
              {project.departments.map(dept => (
                <li key={dept.id} style={{ marginBottom: 4 }}>
                  <strong>{dept.name}:</strong> {dept.ProjectDepartment?.leaderId ? (project.Users?.find(u => u.id === dept.ProjectDepartment.leaderId)?.name || project.Users?.find(u => u.id === dept.ProjectDepartment.leaderId)?.email || 'Invited') : 'Not assigned'}
                </li>
              ))}
            </ul>
          </div>
        )}

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

      {/* Project Comments Section */}
      {type === 'professional' && (
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
                    {currentUser && comment.user?.id === currentUser.id && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-link" onClick={() => handleEditComment(comment)} title="Edit"><Edit2 size={16} /></button>
                        <button className="btn btn-link" onClick={() => handleDeleteComment(comment)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="edit-comment-form">
                      <textarea
                        value={editingContent[comment.id] || ""}
                        onChange={e => setEditingContent((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                        className="comment-input"
                        rows="2"
                      />
                      <div className="reply-actions">
                        <button className="btn btn-link" onClick={() => { setEditingCommentId(null); setEditingContent((prev) => { const n = { ...prev }; delete n[comment.id]; return n }) }}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => handleSaveEdit(comment)} disabled={!editingContent[comment.id]?.trim()}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-content">{comment.content}</p>
                  )}
                  {/* Reply button */}
                  <button 
                    className="btn btn-link reply-btn"
                    onClick={() => setReplyingTo(comment)}
                  >
                    <CornerUpLeft size={14} /> Reply
                  </button>
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="replies-list">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="reply-item">
                          <div className="comment-header">
                            <div className="comment-author-info">
                              {reply.user?.profilePhoto ? (
                                <img 
                                  src={reply.user.profilePhoto} 
                                  alt={reply.user.name} 
                                  className="comment-author-avatar"
                                />
                              ) : (
                                <div className="comment-author-avatar-placeholder">
                                  {reply.user?.name?.charAt(0)}
                                </div>
                              )}
                              <span className="comment-author">{reply.user?.name || 'Unknown User'}</span>
                              {reply.isEdited && <span style={{ fontSize: '0.8em', color: '#888', marginLeft: 8 }}>(edited)</span>}
                            </div>
                            <span className="comment-time">
                              {formatDate(reply.createdAt)} at {formatTime(reply.createdAt)}
                            </span>
                            {/* Edit/Delete buttons for own reply */}
                            {currentUser && reply.user?.id === currentUser.id && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-link" onClick={() => handleEditComment(reply)} title="Edit"><Edit2 size={16} /></button>
                                <button className="btn btn-link" onClick={() => handleDeleteComment(reply)} title="Delete"><Trash2 size={16} /></button>
                              </div>
                            )}
                          </div>
                          {editingCommentId === reply.id ? (
                            <div className="edit-comment-form">
                              <textarea
                                value={editingContent[reply.id] || ""}
                                onChange={e => setEditingContent((prev) => ({ ...prev, [reply.id]: e.target.value }))}
                                className="comment-input"
                                rows="2"
                              />
                              <div className="reply-actions">
                                <button className="btn btn-link" onClick={() => { setEditingCommentId(null); setEditingContent((prev) => { const n = { ...prev }; delete n[reply.id]; return n }) }}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => handleSaveEdit(reply)} disabled={!editingContent[reply.id]?.trim()}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <p className="comment-content">{reply.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Reply form */}
                  {replyingTo?.id === comment.id && (
                    <form onSubmit={handleSubmitReply} className="reply-form">
                      <textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={handleReplyChange}
                        className="comment-input"
                        rows="2"
                      ></textarea>
                      <div className="reply-actions">
                        <button 
                          type="button" 
                          className="btn btn-link"
                          onClick={() => {
                            setReplyingTo(null)
                            setReplyContent("")
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={!replyContent.trim()}
                        >
                          <Send size={14} /> Reply
                        </button>
                      </div>
                    </form>
                  )}
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
          task={currentTask}
          isProfessional={project.type === "professional"}
          projectMembers={project.Users}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        onConfirm={confirmDeleteComment}
        onCancel={() => setDeleteConfirm({ open: false, comment: null })}
      />
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

/* Comment Edit/Delete UI Enhancements */
const styles = `
.edit-comment-form {
  background: #f7fafd;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0 12px 0;
}
.comment-header .btn-link {
  background: none;
  border: none;
  padding: 4px;
  margin-left: 4px;
  cursor: pointer;
  color: #888;
  transition: color 0.2s;
}
.comment-header .btn-link:hover {
  color: #2563eb;
  background: #e0e7ff;
  border-radius: 4px;
}
.reply-actions .btn-link {
  color: #888;
}
.reply-actions .btn-link:hover {
  color: #2563eb;
  background: #e0e7ff;
  border-radius: 4px;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('comment-edit-style')) {
  const style = document.createElement('style');
  style.id = 'comment-edit-style';
  style.innerHTML = styles;
  document.head.appendChild(style);
}

export default ProjectDetails