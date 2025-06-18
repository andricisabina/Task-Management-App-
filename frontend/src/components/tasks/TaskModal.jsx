"use client"

import { useState, useEffect } from "react"
import { X } from "react-feather"
import "./TaskModal.css"

const TaskModal = ({ task, type = 'personal', teamMembers = [], departments = [], onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    dueTime: "",
    assignedTo: "",
    assignedToEmail: "",
    departmentId: "",
    status: "todo",
    estimatedTime: ""
  })

  useEffect(() => {
    const isProfessional = type === 'professional';
    if (task) {
      let dueDate = "";
      let dueTime = "";
      if (task.dueDate) {
        const dt = new Date(task.dueDate);
        dueDate = dt.toISOString().slice(0, 10);
        dueTime = dt.toTimeString().slice(0, 5);
      }
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        dueDate,
        dueTime,
        assignedTo: task.assignedTo || "",
        assignedToEmail: task.assignedToEmail || "",
        departmentId: isProfessional ? (task.departmentId || (departments && departments.length > 0 ? departments[0].id : "")) : "",
        status: task.status || (isProfessional ? "pending" : "todo"),
        estimatedTime: task.estimatedTime ? (task.estimatedTime / 60).toString() : ""
      });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        dueDate: tomorrow.toISOString().split("T")[0],
        dueTime: "09:00",
        assignedTo: "",
        assignedToEmail: "",
        departmentId: isProfessional && departments && departments.length > 0 ? departments[0].id : "",
        status: isProfessional ? "pending" : "todo",
        estimatedTime: ""
      });
    }
    // eslint-disable-next-line
  }, [task, type, departments && departments.length > 0 ? departments[0].id : ""]);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Combine date and time into a single ISO string
    let dueDateTime = formData.dueDate
    if (formData.dueDate && formData.dueTime) {
      dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString()
    }
    const submitData = {
      ...formData,
      dueDate: dueDateTime,
    }
    delete submitData.dueTime

    // Convert estimated time from hours to minutes for professional tasks
    if (type === 'professional' && formData.estimatedTime) {
      submitData.estimatedTime = Math.round(parseFloat(formData.estimatedTime) * 60);
    } else {
      delete submitData.estimatedTime;
    }

    // Convert estimated time from hours to minutes for both personal and professional tasks
    if (formData.estimatedTime) {
      submitData.estimatedTime = Math.round(parseFloat(formData.estimatedTime) * 60);
    } else {
      delete submitData.estimatedTime;
    }

    // Only include departmentId for professional tasks
    if (!type === 'professional') {
      delete submitData.departmentId
    }

    // For professional tasks, use assignedToEmail
    if (type === 'professional') {
      submitData.assignedToEmail = formData.assignedToEmail || ''
      delete submitData.assignedTo
    }
    onSave(submitData)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{task ? "Edit Task" : "Create Task"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title
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
              value={formData.description}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority" className="form-label">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                className="form-input"
                value={formData.priority}
                onChange={handleChange}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dueDate" className="form-label">
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                className="form-input"
                value={formData.dueDate}
                onChange={handleChange}
                required
              />
              <input
                type="time"
                id="dueTime"
                name="dueTime"
                className="form-input"
                value={formData.dueTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {type === 'professional' && (
            <div className="form-group">
              <label htmlFor="estimatedTime" className="form-label">
                Estimated Time (hours)
              </label>
              <input
                type="number"
                id="estimatedTime"
                name="estimatedTime"
                className="form-input"
                value={formData.estimatedTime}
                onChange={handleChange}
                placeholder="e.g., 2.5"
                min="0"
                step="0.5"
              />
            </div>
          )}

          {type === 'personal' && (
            <div className="form-group">
              <label htmlFor="estimatedTime" className="form-label">
                Estimated Time (hours)
              </label>
              <input
                type="number"
                id="estimatedTime"
                name="estimatedTime"
                className="form-input"
                value={formData.estimatedTime}
                onChange={handleChange}
                placeholder="e.g., 2.5"
                min="0"
                step="0.5"
              />
            </div>
          )}

          {type === 'professional' && departments.length > 0 && (
            <div className="form-group">
              <label htmlFor="departmentId" className="form-label">
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                className="form-input"
                value={formData.departmentId}
                onChange={handleChange}
                required
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'professional' && (
            <div className="form-group">
              <label htmlFor="assignedToEmail" className="form-label">
                Assign To (Email)
              </label>
              <input
                type="email"
                id="assignedToEmail"
                name="assignedToEmail"
                className="form-input"
                value={formData.assignedToEmail || ''}
                onChange={handleChange}
                placeholder="Enter user email"
                required
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={type === 'professional' && departments.length === 0}>
              {task ? "Update Task" : "Create Task"}
            </button>
          </div>
          {type === 'professional' && departments.length === 0 && (
            <div style={{ color: 'red', marginTop: 8 }}>
              No departments available. Please add departments to the project first.
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default TaskModal
