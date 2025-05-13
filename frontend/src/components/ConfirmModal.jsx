import React from "react";
import "./ConfirmModal.css";

const ConfirmModal = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="confirm-modal-backdrop">
      <div className="confirm-modal">
        <h3>{title || "Are you sure?"}</h3>
        <p>{message}</p>
        <div className="confirm-modal-actions">
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal; 