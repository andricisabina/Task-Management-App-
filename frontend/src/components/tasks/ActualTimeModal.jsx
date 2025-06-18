"use client"

import { useState } from "react"
import { X, Clock } from "react-feather"
import "./TaskModal.css"

const ActualTimeModal = ({ task, onClose, onComplete }) => {
  const [actualTime, setActualTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!actualTime || parseFloat(actualTime) <= 0) {
      alert("Please enter a valid time")
      return
    }

    setIsSubmitting(true)
    try {
      // Convert hours to minutes for storage
      const actualTimeInMinutes = Math.round(parseFloat(actualTime) * 60)
      await onComplete(actualTimeInMinutes)
    } catch (error) {
      console.error("Error completing task:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "400px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={20} color="#1976d2" />
            <h2>Complete Task</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "16px 0" }}>
          <p style={{ marginBottom: "16px", color: "#666" }}>
            Task: <strong>{task?.title}</strong>
          </p>
          {task?.estimatedTime && (
            <p style={{ marginBottom: "16px", color: "#666" }}>
              Estimated Time: <strong>{(task.estimatedTime / 60).toFixed(1)} hours</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="actualTime" className="form-label">
              Actual Time Spent (hours)
            </label>
            <input
              type="number"
              id="actualTime"
              name="actualTime"
              className="form-input"
              value={actualTime}
              onChange={(e) => setActualTime(e.target.value)}
              placeholder="e.g., 3.5"
              min="0"
              step="0.5"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting || !actualTime}
            >
              {isSubmitting ? "Completing..." : "Complete Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ActualTimeModal 