import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tasksApi } from "../../services/api";
import { toast } from "react-toastify";

const ProfessionalTaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line
  }, [id]);

  const fetchTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tasksApi.getProfessionalTask(id);
      setTask(response.data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading task details...</div>;
  }
  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchTask}>
          Try Again
        </button>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="error-container">
        <h2>Task Not Found</h2>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="task-details-container card">
      <h1 className="task-title">{task.title}</h1>
      <p className="task-description">{task.description}</p>
      <div className="task-meta">
        <div><strong>Status:</strong> {task.status}</div>
        <div><strong>Priority:</strong> {task.priority}</div>
        <div><strong>Due Date:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleString() : "-"}</div>
        <div><strong>Project:</strong> {task.ProfessionalProject?.title || "-"}</div>
        <div><strong>Department:</strong> {task.departmentId || "-"}</div>
        <div><strong>Assigned To:</strong> {task.assignedTo?.name || task.assignedTo?.email || "-"}</div>
      </div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 24 }}>
        Back
      </button>
    </div>
  );
};

export default ProfessionalTaskDetails; 