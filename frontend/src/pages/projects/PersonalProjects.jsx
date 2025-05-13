"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, MoreVertical, Folder } from "react-feather"
import { toast } from "react-toastify"
import ProjectModal from "../../components/projects/ProjectModal"
import { projectsApi } from "../../services/api"
import "./Projects.css"

const PersonalProjects = () => {
  const [projects, setProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      fetchProjects();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const response = await projectsApi.getPersonalProjects()
      const projects = response.data

      // Fetch stats for each project in parallel
      const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
          try {
            const statsRes = await projectsApi.getPersonalProjectStats(project.id)
            const taskCounts = statsRes.data.taskCounts || []
            const completedTasks = parseInt(taskCounts.find(t => t.status === "completed")?.count || 0)
            const tasksCount = taskCounts.reduce((sum, t) => sum + parseInt(t.count), 0)
            const completionRate = tasksCount > 0 ? Math.round((completedTasks / tasksCount) * 100) : 0
            return {
              ...project,
              completionRate,
              completedTasks,
              tasksCount,
            }
          } catch {
            // If stats fail, fallback to project as is
            return { ...project, completionRate: 0, completedTasks: 0, tasksCount: 0 }
          }
        })
      )

      setProjects(projectsWithStats)
      setError(null)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const filteredProjects = projects.filter((project) => 
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateProject = () => {
    setCurrentProject(null)
    setIsModalOpen(true)
  }

  const handleEditProject = (project) => {
    setCurrentProject(project)
    setIsModalOpen(true)
  }

  const handleDeleteProject = async (projectId) => {
    try {
      await projectsApi.deletePersonalProject(projectId)
      setProjects(projects.filter((project) => project.id !== projectId))
      toast.success("Project deleted successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSaveProject = async (projectData) => {
    try {
      if (currentProject) {
        const response = await projectsApi.updatePersonalProject(currentProject.id, projectData)
        setProjects(
          projects.map((project) => 
            project.id === currentProject.id ? response.data : project
          )
        )
        toast.success("Project updated successfully")
      } else {
        const response = await projectsApi.createPersonalProject(projectData)
        setProjects([response.data, ...projects])
        toast.success("Project created successfully")
      }
      setIsModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading projects...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchProjects}>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1 className="page-title">My Projects</h1>
        <button className="btn btn-primary create-btn" onClick={handleCreateProject}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="search-bar">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {filteredProjects.length > 0 ? (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <div key={project.id} className="project-card card">
              <div className="project-card-header">
                <div className="project-icon">
                  <Folder size={20} />
                </div>
                <div className="project-dropdown">
                  <div className="dropdown">
                    <button className="dropdown-btn">
                      <MoreVertical size={18} />
                    </button>
                    <div className="dropdown-content">
                      <button onClick={() => handleEditProject(project)}>Edit</button>
                      <button onClick={() => handleDeleteProject(project.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
              <Link to={`/projects/personal/${project.id}`} className="project-card-content">
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-stats">
                  <div className="progress-wrapper">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${project.completionRate || 0}%` }}></div>
                    </div>
                    <span className="progress-text">{project.completionRate || 0}%</span>
                  </div>
                  <div className="tasks-count">
                    <span>
                      {project.completedTasks || 0}/{project.tasksCount || 0} tasks
                    </span>
                  </div>
                </div>
                <div className="project-date">Created on {new Date(project.createdAt).toLocaleDateString()}</div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Folder size={48} />
          <h3>No projects found</h3>
          <p>
            {searchTerm
              ? "No projects match your search. Try a different term."
              : "You haven't created any personal projects yet."}
          </p>
          <button className="btn btn-primary" onClick={handleCreateProject}>
            Create Your First Project
          </button>
        </div>
      )}

      {isModalOpen && (
        <ProjectModal 
          project={currentProject} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveProject} 
        />
      )}
    </div>
  )
}

export default PersonalProjects
