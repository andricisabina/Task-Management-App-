"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, MoreVertical, Briefcase, Users } from "react-feather"
import { toast } from "react-toastify"
import ProjectModal from "../../components/projects/ProjectModal"
import { projectsApi } from "../../services/api"
import "./Projects.css"

const ProfessionalProjects = () => {
  const [projects, setProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const response = await projectsApi.getProfessionalProjects()
      setProjects(response.data)
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
      await projectsApi.deleteProfessionalProject(projectId)
      setProjects(projects.filter((project) => project.id !== projectId))
      toast.success("Project deleted successfully")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSaveProject = async (projectData) => {
    try {
      if (currentProject) {
        const response = await projectsApi.updateProfessionalProject(currentProject.id, projectData)
        setProjects(
          projects.map((project) => 
            project.id === currentProject.id ? response.data : project
          )
        )
        toast.success("Project updated successfully")
      } else {
        const response = await projectsApi.createProfessionalProject(projectData)
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
        <h1 className="page-title">Professional Projects</h1>
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
            <div
              key={project.id}
              className="project-card card"
              style={{
                opacity: project.completionRate === 100 ? 0.5 : 1,
                transition: 'opacity 0.3s',
                cursor: project.completionRate === 100 ? 'pointer' : 'default',
              }}
            >
              <div className="project-card-header">
                <div className="project-icon professional">
                  <Briefcase size={20} />
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
              <Link to={`/projects/professional/${project.id}`} className="project-card-content">
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
                <div className="project-team">
                  <Users size={14} />
                  <span>
                    {project.Users?.map(user => user.name).join(", ") || "No team members"}
                  </span>
                </div>
                <div className="project-date">Created on {new Date(project.createdAt).toLocaleDateString()}</div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Briefcase size={48} />
          <h3>No professional projects found</h3>
          <p>
            {searchTerm
              ? "No projects match your search. Try a different term."
              : "You haven't created any professional projects yet."}
          </p>
          <button className="btn btn-primary" onClick={handleCreateProject}>
            Create Your First Professional Project
          </button>
        </div>
      )}

      {isModalOpen && (
        <ProjectModal
          project={currentProject}
          isProfessional={true}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProject}
        />
      )}
    </div>
  )
}

export default ProfessionalProjects
