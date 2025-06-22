import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SocketTest = () => {
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState('');
  const { isConnected, unreadCount, notifications } = useNotifications();
  const { currentUser } = useAuth();

  const sendTestMessage = async () => {
    try {
      const response = await api.post('/api/test-socket', {
        userId: currentUser.id,
        message: message || 'Test message'
      });
      setTestResult(`Test message sent: ${response.data.message}`);
    } catch (error) {
      setTestResult(`Error: ${error.message}`);
    }
  };

  const createTestNotification = async () => {
    try {
      const response = await api.post('/api/test-notification', {
        userId: currentUser.id
      });
      setTestResult(`Test notification created: ${response.data.data.title}`);
    } catch (error) {
      setTestResult(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Socket & Notification Test</h2>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h3>Status</h3>
        <p><strong>Socket Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</p>
        <p><strong>User ID:</strong> {currentUser?.id || 'Not logged in'}</p>
        <p><strong>Unread Count:</strong> {unreadCount}</p>
        <p><strong>Total Notifications:</strong> {notifications.length}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Socket Message</h3>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter test message"
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <button onClick={sendTestMessage} style={{ padding: '5px 10px' }}>
          Send Test Message
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Notification</h3>
        <button onClick={createTestNotification} style={{ padding: '5px 10px' }}>
          Create Test Notification
        </button>
      </div>

      {testResult && (
        <div style={{ padding: '10px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50' }}>
          <strong>Result:</strong> {testResult}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Recent Notifications</h3>
        {notifications.slice(0, 5).map((notification) => (
          <div key={notification.id} style={{ 
            padding: '10px', 
            margin: '5px 0', 
            backgroundColor: notification.isRead ? '#f9f9f9' : '#f0f6ff',
            border: '1px solid #ddd'
          }}>
            <div><strong>{notification.title}</strong></div>
            <div>{notification.message}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {new Date(notification.createdAt).toLocaleString()} - {notification.isRead ? 'Read' : 'Unread'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocketTest; 