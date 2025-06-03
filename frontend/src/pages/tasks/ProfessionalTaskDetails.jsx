import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { tasksApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { X } from 'react-feather';
import './TaskDetails.css';

const ProfessionalTaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { currentUser } = useAuth();
  const { fetchNotifications } = useNotifications();

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setIsLoading(true);
      const response = await tasksApi.getProfessionalTask(taskId);
      setTask(response.data);
    } catch (err) {
      toast.error(err.message);
      navigate('/professional-tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTask = async () => {
    try {
      const response = await tasksApi.acceptProfessionalTask(taskId);
      setTask(response.data);
      toast.success('Task accepted successfully');
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRejectTask = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await tasksApi.rejectProfessionalTask(taskId, { rejectionReason });
      setTask(response.data);
      setShowRejectModal(false);
      setRejectionReason('');
      toast.success('Task rejected successfully');
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!task) {
    return <div className="error">Task not found</div>;
  }

  const canAcceptReject = currentUser && task.assignedToId === currentUser.id && task.status === 'pending';

  return (
    <div className="task-details-container">
      <div className="task-details-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <X size={20} /> Back
        </button>
        <h1 className="task-title">{task.title}</h1>
      </div>

      <div className="task-details-content">
        <div className="task-info-section">
          <h2>Task Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Status</label>
              <span className={`status-badge ${task.status}`}>{task.status}</span>
            </div>
            <div className="info-item">
              <label>Priority</label>
              <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
            </div>
            <div className="info-item">
              <label>Due Date</label>
              <span>{task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Project</label>
              <span>{task.ProfessionalProject?.title || 'Not assigned'}</span>
            </div>
            <div className="info-item">
              <label>Department</label>
              <span>{task.departmentId || 'Not assigned'}</span>
            </div>
            <div className="info-item">
              <label>Assigned To</label>
              <span>{task.assignedTo?.name || task.assignedTo?.email || 'Not assigned'}</span>
            </div>
          </div>
        </div>

        <div className="task-description-section">
          <h2>Description</h2>
          <p>{task.description}</p>
        </div>

        {canAcceptReject && (
          <div className="task-actions">
            <button className="btn btn-success" onClick={handleAcceptTask}>
              Accept Task
            </button>
            <button className="btn btn-danger" onClick={() => setShowRejectModal(true)}>
              Reject Task
            </button>
          </div>
        )}

        {task.status === 'rejected' && task.rejectionReason && (
          <div className="rejection-reason">
            <h3>Rejection Reason</h3>
            <p>{task.rejectionReason}</p>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Reject Task</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="rejectionReason">Reason for rejection:</label>
                <textarea
                  id="rejectionReason"
                  className="form-input"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Please provide a reason for rejecting this task..."
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleRejectTask}>
                  Reject Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalTaskDetails; 