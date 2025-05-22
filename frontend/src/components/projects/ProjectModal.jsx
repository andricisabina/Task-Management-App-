"use client"

import { useState, useEffect } from "react"
import { X } from "react-feather"
import "./ProjectModal.css"
import { departmentsApi } from '../../services/api';

const ProjectModal = ({ project, isProfessional = false, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    team: "",
  })
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [leaderEmails, setLeaderEmails] = useState({});

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        description: project.description || "",
        team: project.team ? project.team.join(", ") : "",
      })
    }
  }, [project])

  useEffect(() => {
    if (isProfessional) {
      departmentsApi.getDepartments().then((res) => {
        setDepartments(res.data);
      });
    }
  }, [isProfessional]);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleDepartmentChange = (deptId) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleLeaderEmailChange = (deptId, value) => {
    setLeaderEmails((prev) => ({ ...prev, [deptId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault()

    const projectData = {
      title: formData.title,
      description: formData.description,
    }

    if (isProfessional) {
      projectData.departments = selectedDepartments.map((deptId) => ({
        departmentId: deptId,
        leaderEmail: leaderEmails[deptId] || '',
      }));
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
              <label className="form-label">Departments Involved</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {departments.map((dept) => (
                  <div key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id={`dept-${dept.id}`}
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={() => handleDepartmentChange(dept.id)}
                    />
                    <label htmlFor={`dept-${dept.id}`} style={{ minWidth: 60 }}>{dept.name}</label>
                    {selectedDepartments.includes(dept.id) && (
                      <input
                        type="email"
                        placeholder="Leader Email"
                        value={leaderEmails[dept.id] || ''}
                        onChange={e => handleLeaderEmailChange(dept.id, e.target.value)}
                        style={{ flex: 1, minWidth: 180 }}
                        required
                      />
                    )}
                  </div>
                ))}
              </div>
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
