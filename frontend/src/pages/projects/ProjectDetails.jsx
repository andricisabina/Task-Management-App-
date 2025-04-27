"use client"

import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Plus,
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

  useEffect(() => {
    fetchProjectDetails()
  }, [projectId])

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
      }

    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
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
      const api = project.type === "professional" ? tasksApi : tasksApi
      
      if (currentTask) {
        const response = await api.updateTask(currentTask.id, {
          ...taskData,
          projectId: project.id
        })
        setTasks(tasks.map((task) => (task.id === currentTask.id ? response.data : task)))
        toast.success("Task updated successfully")
      } else {
        const response = await api.createTask({
          ...taskData,
          projectId: project.id
        })
        setTasks([response.data, ...tasks])
        toast.success("Task created successfully")
      }
      setIsModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "all") return true
    if (activeTab === "todo") return task.status === "todo"
    if (activeTab === "inprogress") return task.status === "inprogress"
    if (activeTab === "done") return task.status === "done"
    return true
  })

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
                <div className="progress-fill" style={{ width: `${project.completionRate || 0}%` }}></div>
              </div>
              <span className="progress-text">{project.completionRate || 0}% Complete</span>
            </div>
            <div className="tasks-count">
              <span>{project.completedTasks || 0}/{project.tasksCount || 0} tasks completed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tasks-section">
        <div className="tasks-header">
          <h2>Tasks</h2>
          <div className="task-filters">
            <button
              className={`filter-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              className={`filter-btn ${activeTab === "todo" ? "active" : ""}`}
              onClick={() => setActiveTab("todo")}
            >
              To Do
            </button>
            <button
              className={`filter-btn ${activeTab === "inprogress" ? "active" : ""}`}
              onClick={() => setActiveTab("inprogress")}
            >
              In Progress
            </button>
            <button
              className={`filter-btn ${activeTab === "done" ? "active" : ""}`}
              onClick={() => setActiveTab("done")}
            >
              Done
            </button>
          </div>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="tasks-grid">
            {filteredTasks.map((task) => (
              <div key={task.id} className="task-card card" style={{ position: 'relative' }}>
                <span className={`status-badge status-${task.status}`}>
                  {task.status === "todo"
                    ? "To Do"
                    : task.status === "inprogress"
                    ? "In Progress"
                    : "Done"}
                </span>
                <div className="task-card-header">
                  <div className={`task-status ${task.status}`} style={{ flex: 1 }}>
                    {task.status === "done" ? (
                      <CheckCircle size={16} />
                    ) : task.status === "inprogress" ? (
                      <Clock size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                  </div>
                  <div className="task-actions">
                    <button className="btn btn-icon" onClick={() => handleEditTask(task)}>
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="task-title">{task.title}</h3>
                <p className="task-description">{task.description}</p>
                {project.type === "professional" && task.assignedTo && (
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

export default ProjectDetails
