import React, { useState } from 'react';
import { toast } from 'react-toastify';

const AddMemberModal = ({ open, onClose, onAdd, department, projectId }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Simulate user search by email (replace with real API call if needed)
  const handleSearch = async () => {
    setLoading(true);
    setUser(null);
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('User not found');
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      toast.error('User not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    console.log('handleAdd called', user, department);
    if (!user) return toast.error('Please select a user');
    onAdd(user.id, department?.id);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal" style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h2 style={{ marginBottom: 18 }}>Add Member to {department?.name || 'Project'}</h2>
        <div style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Enter user email..."
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 8 }}
            disabled={loading}
          />
          <button className="btn btn-sm btn-primary" onClick={handleSearch} disabled={loading || !email} style={{ marginBottom: 8 }}>
            {loading ? 'Searching...' : 'Search User'}
          </button>
        </div>
        {user && (
          <div style={{ marginBottom: 16, color: '#1890ff' }}>
            <strong>Found:</strong> {user.name || user.email}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!user || loading}>Add</button>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal; 