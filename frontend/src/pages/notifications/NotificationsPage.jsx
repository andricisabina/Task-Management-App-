import React, { useState, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import api, { tasksApi, projectsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const NotificationsPage = () => {
  const { currentUser } = useAuth ? useAuth() : { currentUser: null };
  const { notifications, markAsRead, unreadCount, fetchNotifications } = useNotifications();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTaskId, setRejectTaskId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState({}); // { [taskId]: 'accepted' | 'rejected' }
  const [modalTask, setModalTask] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const handleAcceptTask = async (taskId) => {
    // Optimistically update UI
    setPendingActions((prev) => ({ ...prev, [taskId]: 'accepted' }));
    try {
      await tasksApi.acceptProfessionalTask(taskId);
      await fetchNotifications();
      toast.success("Task accepted successfully");
    } catch (error) {
      // Revert UI if error
      setPendingActions((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
      toast.error(error.message || "Failed to accept task");
      await fetchNotifications();
    }
  };

  const handleRejectTask = async (taskId) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    // Optimistically update UI
    setPendingActions((prev) => ({ ...prev, [taskId]: 'rejected' }));
    try {
      setRejectLoading(true);
      await tasksApi.rejectProfessionalTask(taskId, { rejectionReason: rejectReason });
      setShowRejectModal(false);
      setRejectTaskId(null);
      setRejectReason("");
      await fetchNotifications();
      toast.success("Task rejected successfully");
    } catch (error) {
      // Revert UI if error
      setPendingActions((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
      toast.error(error.message || "Failed to reject task");
      await fetchNotifications();
    } finally {
      setRejectLoading(false);
    }
  };

  const handleAcceptLeader = async (projectId) => {
    try {
      await projectsApi.acceptLeaderInvitation(projectId);
      await fetchNotifications();
      toast.success("Leader invitation accepted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to accept leader invitation");
    }
  };

  const handleRejectLeader = async (projectId) => {
    try {
      await projectsApi.rejectLeaderInvitation(projectId);
      await fetchNotifications();
      toast.success("Leader invitation rejected successfully");
    } catch (error) {
      toast.error(error.message || "Failed to reject leader invitation");
    }
  };

  const openRejectModal = (taskId) => {
    setRejectTaskId(taskId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleViewTask = async (taskId, type) => {
    if (type === 'professional') {
      setModalLoading(true);
      try {
        const response = await tasksApi.getProfessionalTask(taskId);
        setModalTask(response.data);
        setModalOpen(true);
      } catch (err) {
        toast.error('Failed to load task details');
      } finally {
        setModalLoading(false);
      }
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h2>Notifications {unreadCount > 0 && <span style={{ color: "#ff5252" }}>({unreadCount} unread)</span>}</h2>
      {notifications.length === 0 && <div>No notifications</div>}
      <div>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              background: n.isRead ? "#f9f9f9" : "#f0f6ff",
              padding: 16,
              margin: "16px 0",
              borderRadius: 8,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              cursor: "pointer",
            }}
            onClick={() => markAsRead(n.id)}
          >
            <div style={{ fontWeight: 600 }}>{n.title}</div>
            <div>{n.message}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{new Date(n.createdAt).toLocaleString()}</div>
            
            {/* Action buttons based on notification type */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {n.type === 'task_assigned' && n.relatedId && (
                <>
                  {n.taskStatus === 'accepted' || n.taskStatus === 'in-progress' ? (
                    <span style={{ color: '#4caf50', fontWeight: 600 }}>Task Accepted</span>
                  ) : n.taskStatus === 'rejected' ? (
                    <span style={{ color: '#f44336', fontWeight: 600 }}>Task Rejected</span>
                  ) : n.taskStatus === 'pending' ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptTask(n.relatedId);
                        }}
                        style={{
                          background: "#4caf50",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 20px",
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: "pointer"
                        }}
                      >
                        Accept Task
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRejectModal(n.relatedId);
                        }}
                        style={{
                          background: "#f44336",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 20px",
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: "pointer"
                        }}
                      >
                        Reject Task
                      </button>
                    </>
                  ) : null}
                </>
              )}

              {n.type === 'leader_invitation' && n.relatedId && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptLeader(n.relatedId);
                    }}
                    style={{
                      background: "#4caf50",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 20px",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: "pointer"
                    }}
                  >
                    Accept Invitation
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRejectLeader(n.relatedId);
                    }}
                    style={{
                      background: "#f44336",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 20px",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: "pointer"
                    }}
                  >
                    Reject Invitation
                  </button>
                </>
              )}

              {n.type === 'task_assigned' && n.relatedId && n.link && (
                n.relatedType === 'professional_task' ? (
                  <button
                    onClick={() => handleViewTask(n.relatedId, 'professional')}
                    style={{
                      background: "#1976d2",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 20px",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: "pointer"
                    }}
                  >
                    View Task
                  </button>
                ) : (
                  <Link
                    to={n.link}
                    style={{
                      background: "#1976d2",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 20px",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: "pointer",
                      textDecoration: "none"
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    View Task
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reject Task Modal */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              width: "100%",
              maxWidth: 500
            }}
          >
            <h3>Reject Task</h3>
            <p>Please provide a reason for rejecting this task:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: "100%",
                minHeight: 100,
                margin: "16px 0",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ddd"
              }}
              placeholder="Enter rejection reason..."
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectTaskId(null);
                  setRejectReason("");
                }}
                style={{
                  background: "#9e9e9e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 20px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectTask(rejectTaskId)}
                disabled={rejectLoading}
                style={{
                  background: "#f44336",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 20px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: rejectLoading ? "not-allowed" : "pointer",
                  opacity: rejectLoading ? 0.7 : 1
                }}
              >
                {rejectLoading ? "Rejecting..." : "Reject Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && modalTask && (
        <div className="modal-overlay" style={{zIndex: 2000}}>
          <div className="modal-container" style={{maxWidth: 500, background: '#fff', borderRadius: 8, padding: 24, margin: '40px auto'}}>
            <h2 style={{marginBottom: 12}}>{modalTask.title}</h2>
            <p style={{marginBottom: 8}}>{modalTask.description}</p>
            <p><b>Deadline:</b> {modalTask.dueDate ? new Date(modalTask.dueDate).toLocaleString() : 'N/A'}</p>
            <p><b>Project:</b> {modalTask.ProfessionalProject?.title || 'N/A'}</p>
            <button onClick={() => setModalOpen(false)} style={{marginTop: 16, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 15, cursor: 'pointer'}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage; 