"use client"

import { useState, useEffect } from "react"
import { X } from "react-feather"
import "./TaskModal.css"

const TaskModal = ({ task, isProfessional = false, teamMembers = [], onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    dueTime: "",
    status: "pending",
    assignedTo: "",
    assignedToEmail: "",
  })

  useEffect(() => {
    if (task) {
      // Split dueDate into date and time if possible
      let dueDate = ""
      let dueTime = ""
      if (task.dueDate) {
        const dt = new Date(task.dueDate)
        dueDate = dt.toISOString().slice(0, 10)
        dueTime = dt.toTimeString().slice(0, 5)
      }
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        dueDate,
        dueTime,
        status: task.status || "pending",
        assignedTo: task.assignedTo || "",
        assignedToEmail: task.assignedToEmail || "",
      })
    } else {
      // Set default due date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setFormData({
        ...formData,
        dueDate: tomorrow.toISOString().split("T")[0],
        dueTime: "09:00",
        status: "pending"
      })
    }
  }, [task])

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
    // For professional tasks, use assignedToEmail
    if (isProfessional) {
      submitData.assignedToEmail = formData.assignedToEmail || ''
      delete submitData.assignedTo
    }
    onSave(submitData)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{task ? "Edit Task" : "Create New Task"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Task Title
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

          {isProfessional && (
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
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
