import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  const lastNotificationIdRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const { currentUser } = useAuth() || {};
  
  // Use refs to maintain socket instance and prevent unnecessary re-renders
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isInitializedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      
      const notificationsData = response.data.data || response.data;
      const unreadCountData = notificationsData.filter(n => !n.isRead).length;
      
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);

      if (notificationsData.length > 0 && notificationsData[0].id !== lastNotificationIdRef.current && isInitializedRef.current) {
        const n = notificationsData[0];
        toast.info(
          <div>
            <b>{n.title}</b>
            <div>{n.message}</div>
          </div>,
          { autoClose: 5000 }
        );
      }
      
      if (notificationsData.length > 0) {
        lastNotificationIdRef.current = notificationsData[0].id;
      }
      
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [currentUser?.id]);

  const markAsRead = useCallback(async (notificationId) => {
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
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
      await fetchNotifications(); // Re-fetch to ensure sync
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [fetchNotifications]);

  const setupSocket = useCallback(() => {
    // Clean up existing socket if it exists
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (!currentUser?.id) {
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
      
      // Expose socket to window for debugging
      window.socket = socketInstance;
      
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
      
      // Remove socket from window on error
      if (window.socket === socketInstance) {
        delete window.socket;
      }
      
      // If socket connection fails, fall back to polling
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[DEBUG] Socket disconnected:', reason);
      setIsConnected(false);
      
      // Remove socket from window on disconnect
      if (window.socket === socketInstance) {
        delete window.socket;
      }
      
      // Fall back to polling on disconnect
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(fetchNotifications, 30000);
      }
    });

    socketInstance.on('notification', (notification) => {
      console.log('[DEBUG] Received real-time notification:', notification);
      setNotifications((prev) => {
        // Check if notification already exists to prevent duplicates
        const exists = prev.some(n => n.id === notification.id);
        if (exists) {
          console.log('[DEBUG] Notification already exists, skipping duplicate');
          return prev;
        }
        return [notification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      toast.info(
        <div>
          <b>{notification.title}</b>
          <div>{notification.message}</div>
        </div>,
        { autoClose: 5000 }
      );
    });

    socketInstance.on('test_message', (data) => {
      console.log('[DEBUG] Received test message:', data);
    });

    socketInstance.on('room_joined', (data) => {
      console.log('[DEBUG] Room joined:', data);
    });

    socketInstance.on('error', (error) => {
      console.error('[ERROR] Socket error:', error);
      toast.error('Socket connection error');
    });

    return socketInstance;
  }, [currentUser?.id, fetchNotifications]);

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
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentUser?.id, fetchNotifications, setupSocket]);

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
