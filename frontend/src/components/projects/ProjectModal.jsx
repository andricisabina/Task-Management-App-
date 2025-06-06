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
  const [alreadyInvolved, setAlreadyInvolved] = useState([]);
  const [alreadyLeaders, setAlreadyLeaders] = useState({});

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
    if (project && project.departments) {
      // Get the IDs of departments already involved in the project
      const involvedDeptIds = project.departments.map(d => d.id);
      setAlreadyInvolved(involvedDeptIds);
      
      // Set up leader emails for existing departments
      const leaderEmailsMap = {};
      project.departments.forEach(d => {
        if (d.leader) {
          leaderEmailsMap[d.id] = d.leader.email;
        }
      });
      setAlreadyLeaders(leaderEmailsMap);
      
      // Set selected departments to include already involved ones
      setSelectedDepartments(involvedDeptIds);
      setLeaderEmails(leaderEmailsMap);
    }
  }, [project]);

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
    const id = typeof deptId === 'object' ? deptId.id : deptId;
    setSelectedDepartments((prev) =>
      prev.includes(id)
        ? prev.filter((d) => d !== id)
        : [...prev, id]
    );
  };

  const handleLeaderEmailChange = (deptId, value) => {
    setLeaderEmails((prev) => ({ ...prev, [deptId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault()

    if (isProfessional) {
      // Validate leader emails for all selected departments (that are not already involved)
      const missingLeader = selectedDepartments.some(
        deptId => !alreadyInvolved.includes(deptId) && (!leaderEmails[deptId] || leaderEmails[deptId].trim() === '')
      );
      if (missingLeader) {
        alert('Please enter a leader email for every selected department.');
        return;
      }
    }

    const projectData = {
      title: formData.title,
      description: formData.description,
    }

    if (isProfessional) {
      if (project) {
        // EDIT: send departments as array of IDs, newDepartments as array of objects
        projectData.departments = selectedDepartments;
        projectData.newDepartments = selectedDepartments
          .filter(deptId => !alreadyInvolved.includes(deptId))
          .map((deptId) => ({
            departmentId: deptId,
            leaderEmail: leaderEmails[deptId] || '',
          }));
      } else {
        // CREATE: send departments as array of objects
        projectData.departments = selectedDepartments.map(deptId => ({
          departmentId: deptId,
          leaderEmail: leaderEmails[deptId] || ''
        }));
      }
    }

    onSave(projectData)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{project ? "Edit Project" : "Create Project"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
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
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>

          {isProfessional && (
            <div className="form-group">
              <label>Departments</label>
              <div className="departments-list">
                {departments.map((dept) => {
                  const isInvolved = alreadyInvolved.includes(dept.id);
                  return (
                    <div key={dept.id} className="department-item">
                      <label className="department-label">
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(dept.id)}
                          onChange={() => handleDepartmentChange(dept.id)}
                          disabled={isInvolved}
                        />
                        <span className={isInvolved ? 'already-involved' : ''}>
                          {dept.name}
                          {isInvolved && ' (Already Involved)'}
                        </span>
                      </label>
                      {selectedDepartments.includes(dept.id) && !isInvolved && (
                        <input
                          type="email"
                          placeholder="Leader Email"
                          value={leaderEmails[dept.id] || ''}
                          onChange={(e) => handleLeaderEmailChange(dept.id, e.target.value)}
                          required
                        />
                      )}
                    </div>
                  );
                })}
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
