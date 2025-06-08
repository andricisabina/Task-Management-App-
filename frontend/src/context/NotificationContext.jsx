import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from "react-toastify";
import { io as socketIOClient } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationId, setLastNotificationId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { currentUser } = useAuth() || {};

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.isRead).length);

      // Show toast for new notification
      if (response.data.length > 0 && response.data[0].id !== lastNotificationId) {
        if (lastNotificationId !== null) {
          // Only show toast if this isn't the first load
          const n = response.data[0];
          toast.info(
            <div>
              <b>{n.title}</b>
              <div>{n.message}</div>
            </div>,
            { autoClose: 5000 }
          );
        }
        setLastNotificationId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const setupSocket = () => {
    if (!currentUser) return;

    console.log('[DEBUG] Setting up socket connection for user:', currentUser.id);
    
    // Configure socket.io with reconnection options
    const socketInstance = socketIOClient('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Expose socket instance for testing
    window.socket = socketInstance;

    socketInstance.on('connect', () => {
      console.log('[DEBUG] Socket connected successfully');
      setIsConnected(true);
      
      // Join user's room after connection
      socketInstance.emit('join', currentUser.id);
      console.log('[DEBUG] Emitted join event for user:', currentUser.id);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[ERROR] Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[DEBUG] Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[DEBUG] Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      
      // Re-join user's room after reconnection
      socketInstance.emit('join', currentUser.id);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('[ERROR] Socket reconnection error:', error);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[ERROR] Socket reconnection failed after all attempts');
    });

    socketInstance.on('notification', (notification) => {
      console.log('[DEBUG] Received notification:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast.info(
        <div>
          <b>{notification.title}</b>
          <div>{notification.message}</div>
        </div>,
        { autoClose: 5000 }
      );
    });

    setSocket(socketInstance);
    return socketInstance;
  };

  useEffect(() => {
    const socketInstance = setupSocket();
    
    return () => {
      console.log('[DEBUG] Cleaning up socket connection');
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
    // Set up polling for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const value = {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
