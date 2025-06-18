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
      const projects = response.data

      // Fetch stats for each project in parallel
      const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
          try {
            const statsRes = await projectsApi.getProfessionalProjectStats(project.id)
            const taskStats = statsRes.data.taskStats || []
            const completedTasks = parseInt(taskStats.find(t => t.status === "completed")?.count || 0)
            const tasksCount = taskStats.reduce((sum, t) => sum + parseInt(t.count), 0)
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
      await projectsApi.deleteProfessionalProject(projectId);
      setProjects(projects.filter((project) => project.id !== projectId));
      toast.success("Project deleted successfully");
    } catch (err) {
      toast.error("An error occurred");
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Briefcase size={32} color="#C4DFF5" style={{ verticalAlign: 'middle' }} />
          <h1 className="page-title" style={{ lineHeight: '1', display: 'flex', alignItems: 'center', marginBottom: 0 }}>Professional Projects</h1>
        </div>
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
                <div className="project-team meta-item">
                  <Users size={14} />
                  <span>
                    <strong>Manager:</strong> {project.creator?.name || project.creator?.email || "Unknown"}
                  </span>
                </div>
                {project.departments && project.departments.length > 0 && project.ProjectMembers && (
                  project.departments.map(dept => {
                    const leader = project.ProjectMembers?.find(
                      m => m.departmentId === dept.id && m.role === 'leader'
                    );
                    return (
                      <div className="meta-item" key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Users size={14} />
                        <span>
                          <strong>{dept.name} Leader:</strong> {leader?.member?.name || leader?.member?.email || 'Not assigned'}
                        </span>
                      </div>
                    );
                  })
                )}
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
