import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { usersApi } from '../../services/api';

const AddMemberModal = ({ open, onClose, onAdd, department, projectId }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('AddMemberModal open:', open, 'projectId:', projectId);
    if (open && projectId) {
      setLoading(true);
      usersApi.getUsersForProject(projectId)
        .then(res => {
          console.log('Fetched users:', res.data);
          setUsers(res.data || []);
        })
        .catch(() => {
          toast.error('Failed to fetch users');
        })
        .finally(() => setLoading(false));
    }
  }, [open, projectId]);

  const handleAdd = () => {
    const user = users.find(u => u.id === parseInt(selectedUserId));
    if (!user) return toast.error('Please select a user');
    onAdd(user.id, department?.id);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal" style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h2 style={{ marginBottom: 18 }}>Add Member to {department?.name || 'Project'}</h2>
        <div style={{ marginBottom: 16 }}>
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 8 }}
            disabled={loading}
          >
            <option value="">Select a user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name ? `${user.name} (${user.email})` : user.email}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!selectedUserId || loading}>Add</button>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal; 