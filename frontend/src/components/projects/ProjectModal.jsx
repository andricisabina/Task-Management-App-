"use client"

import { useState, useEffect } from "react"
import { X } from "react-feather"
import "./ProjectModal.css"

const ProjectModal = ({ project, isProfessional = false, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    team: "",
  })

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        description: project.description || "",
        team: project.team ? project.team.join(", ") : "",
      })
    }
  }, [project])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const projectData = {
      title: formData.title,
      description: formData.description,
    }

    if (isProfessional) {
      projectData.team = formData.team
        .split(",")
        .map((member) => member.trim())
        .filter(Boolean)
    }

    onSave(projectData)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{project ? "Edit Project" : "Create New Project"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Project Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="form-input"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          {isProfessional && (
            <div className="form-group">
              <label htmlFor="team" className="form-label">
                Team Members (comma separated)
              </label>
              <input
                type="text"
                id="team"
                name="team"
                className="form-input"
                value={formData.team}
                onChange={handleChange}
                placeholder="e.g. John Doe, Jane Smith"
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {project ? "Update Project" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectModal
