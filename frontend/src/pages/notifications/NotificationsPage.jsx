import React, { useState, useEffect, useRef } from "react";
import { useNotifications } from "../../context/NotificationContext";
import api, { tasksApi, projectsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Bell } from "react-feather";

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
  const [extensionLoading, setExtensionLoading] = useState({}); // { [taskId]: 'approving' | 'rejecting' }
  const [extensionStatuses, setExtensionStatuses] = useState({}); // { [taskId]: extensionStatus }

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
        if (err.message && (err.message.toLowerCase().includes('not found') || err.message.toLowerCase().includes('404'))){
          toast.error('Task not found or has been deleted.');
        } else {
          toast.error('Failed to load task details');
        }
      } finally {
        setModalLoading(false);
      }
    }
  };

  const handleApproveExtension = async (taskId) => {
    setExtensionLoading((prev) => ({ ...prev, [taskId]: 'approving' }));
    try {
      await tasksApi.approveDeadlineExtension(taskId);
      setExtensionStatuses((prev) => ({ ...prev, [taskId]: 'approved' }));
      // Optionally update the notification object in place for instant UI feedback
      const notif = notifications.find(n => n.relatedId === taskId && n.type === 'extension_requested');
      if (notif && notif.data) notif.data.extensionStatus = 'approved';
      await fetchNotifications();
      toast.success('Extension approved');
    } catch (error) {
      toast.error(error.message || 'Failed to approve extension');
    } finally {
      setExtensionLoading((prev) => ({ ...prev, [taskId]: undefined }));
    }
  };

  const handleRejectExtension = async (taskId) => {
    setExtensionLoading((prev) => ({ ...prev, [taskId]: 'rejecting' }));
    try {
      await tasksApi.rejectDeadlineExtension(taskId);
      setExtensionStatuses((prev) => ({ ...prev, [taskId]: 'rejected' }));
      const notif = notifications.find(n => n.relatedId === taskId && n.type === 'extension_requested');
      if (notif && notif.data) notif.data.extensionStatus = 'rejected';
      await fetchNotifications();
      toast.success('Extension rejected');
    } catch (error) {
      toast.error(error.message || 'Failed to reject extension');
    } finally {
      setExtensionLoading((prev) => ({ ...prev, [taskId]: undefined }));
    }
  };

  // Update useEffect to preserve local status if backend data is missing it
  useEffect(() => {
    setExtensionStatuses(prev => {
      const extStatuses = { ...prev };
      notifications.forEach(n => {
        if (n.type === 'extension_requested' && n.relatedId) {
          // Prefer backend status, otherwise keep local
          extStatuses[n.relatedId] = n.data?.extensionStatus || extStatuses[n.relatedId] || 'requested';
        }
      });
      return extStatuses;
    });
  }, [notifications]);

  const filteredNotifications = notifications.filter((n) => {
    if ((n.type === 'task_assigned' || n.type === 'extension_requested') && n.relatedType === 'professional_task' && n.relatedId) {
      return true;
    }
    return false;
  });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Bell size={32} color="#C4DFF5" style={{ verticalAlign: 'middle' }} />
        <h1 className="page-title" style={{ lineHeight: '1', display: 'flex', alignItems: 'center', marginBottom: 0 }}>
          Notifications {unreadCount > 0 && <span style={{ color: "#ff5252" }}>({unreadCount} unread)</span>}
        </h1>
      </div>
      {notifications.length === 0 && <div>No notifications</div>}
      <div>
        {notifications.map((n) => {
          if ((n.type === 'task_assigned' || n.type === 'extension_requested') && n.relatedType === 'professional_task' && n.relatedId && n.taskStatus === 'deleted') {
            return (
              <div
                key={`deleted-${n.id}`}
                style={{
                  background: '#fff0f0',
                  padding: 16,
                  margin: '16px 0',
                  borderRadius: 8,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  color: '#f44336',
                  fontWeight: 600,
                }}
              >
                Task deleted
              </div>
            );
          }
          return (
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
                {n.type === 'task_assigned' && n.relatedId && n.relatedType === 'professional_task' && (
                  n.taskAccepted === true ? (
                    <span style={{ color: '#4caf50', fontWeight: 600 }}>Task Accepted</span>
                  ) : n.taskAccepted === false ? (
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
                  ) : null
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

                {n.type === 'extension_requested' && n.relatedId && (
                  (() => {
                    const days = n.data?.extensionRequestDays;
                    const reason = n.data?.extensionRequestReason;
                    const extStatus = extensionStatuses[n.relatedId];
                    return (
                      <div style={{ fontSize: 14 }}>
                        <div><b>Days requested:</b> {days || '?'}</div>
                        <div><b>Reason:</b> {reason || 'N/A'}</div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 16, marginTop: 16 }}>
                          {extStatus === 'requested' ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApproveExtension(n.relatedId); }}
                                disabled={extensionLoading[n.relatedId] === 'approving'}
                                style={{
                                  background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 15, cursor: extensionLoading[n.relatedId] ? 'not-allowed' : 'pointer', opacity: extensionLoading[n.relatedId] ? 0.7 : 1, minWidth: 0, width: 'auto'
                                }}
                              >
                                {extensionLoading[n.relatedId] === 'approving' ? 'Approving...' : 'Approve Extension'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRejectExtension(n.relatedId); }}
                                disabled={extensionLoading[n.relatedId] === 'rejecting'}
                                style={{
                                  background: '#f44336', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 15, cursor: extensionLoading[n.relatedId] ? 'not-allowed' : 'pointer', opacity: extensionLoading[n.relatedId] ? 0.7 : 1, minWidth: 0, width: 'auto'
                                }}
                              >
                                {extensionLoading[n.relatedId] === 'rejecting' ? 'Rejecting...' : 'Reject Extension'}
                              </button>
                            </>
                          ) : extStatus === 'approved' ? (
                            <span style={{ color: '#4caf50', fontWeight: 600, fontSize: 14 }}>Extension Approved</span>
                          ) : extStatus === 'rejected' ? (
                            <span style={{ color: '#f44336', fontWeight: 600, fontSize: 14 }}>Extension Rejected</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          );
        })}
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