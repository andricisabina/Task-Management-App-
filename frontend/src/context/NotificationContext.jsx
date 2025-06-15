import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);
  const { currentUser } = useAuth() || {};
  
  // Use refs to maintain socket instance and prevent unnecessary re-renders
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

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
    // Clean up existing socket if it exists
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (!currentUser?.id) {
      console.log('[DEBUG] No user found, skipping socket setup');
      return;
    }

    console.log('[DEBUG] Setting up socket connection for user:', currentUser.id);
    
    // Configure socket.io with reconnection options
    const socketInstance = socketIOClient('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('[DEBUG] Socket connected successfully');
      setIsConnected(true);
      
      // Join user's room after connection
      socketInstance.emit('join', currentUser.id);
      console.log('[DEBUG] Emitted join event for user:', currentUser.id);

      // Clear polling interval when socket is connected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[ERROR] Socket connection error:', error);
      setIsConnected(false);
      
      // If socket connection fails, fall back to polling
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[DEBUG] Socket disconnected:', reason);
      setIsConnected(false);
      
      // Fall back to polling on disconnect
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(fetchNotifications, 30000);
      }
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

    return socketInstance;
  };

  // Setup socket connection and fetch notifications when user changes
  useEffect(() => {
    if (currentUser?.id) {
      setupSocket();
      fetchNotifications();
    }

    return () => {
      // Cleanup socket and polling on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentUser?.id]); // Only re-run if user ID changes

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
