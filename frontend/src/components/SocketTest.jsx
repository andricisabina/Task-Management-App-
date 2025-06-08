import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import { toast } from 'react-toastify';

const SocketTest = () => {
  const { currentUser } = useAuth();
  const { isConnected } = useNotifications();
  const [testMessages, setTestMessages] = useState([]);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    // Listen for test messages
    const handleTestMessage = (data) => {
      console.log('[DEBUG] Received test message:', data);
      setTestMessages(prev => [data, ...prev]);
      toast.info(data.message);
    };

    // Get socket instance from NotificationContext
    const socket = window.socket;
    if (socket) {
      socket.on('test_message', handleTestMessage);
      socket.on('room_joined', (data) => {
        console.log('[DEBUG] Room joined:', data);
        toast.success(`Joined room: ${data.room}`);
      });
    }

    return () => {
      if (socket) {
        socket.off('test_message', handleTestMessage);
        socket.off('room_joined');
      }
    };
  }, []);

  const sendTestMessage = async () => {
    try {
      const response = await api.post('/test-socket', {
        userId: currentUser.id,
        message: customMessage || 'Test message from client'
      });
      console.log('[DEBUG] Test message sent:', response);
      toast.success('Test message sent');
    } catch (error) {
      console.error('[ERROR] Failed to send test message:', error);
      toast.error('Failed to send test message');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Socket Connection Test</h2>
      <div style={{ marginBottom: '20px' }}>
        <p>Connection Status: <span style={{ color: isConnected ? 'green' : 'red' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span></p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Enter test message"
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <button
          onClick={sendTestMessage}
          style={{
            padding: '5px 10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send Test Message
        </button>
      </div>

      <div>
        <h3>Test Messages:</h3>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '10px',
          borderRadius: '4px'
        }}>
          {testMessages.map((msg, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '5px', borderBottom: '1px solid #eee' }}>
              <p><strong>Message:</strong> {msg.message}</p>
              <p><small>Time: {new Date(msg.timestamp).toLocaleString()}</small></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocketTest; 