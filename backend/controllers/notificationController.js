const { Notification } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');
const { ProfessionalProject, Department } = require('../models');

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  let query = {
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']]
  };
  
  // Filter by read status
  if (req.query.isRead === 'true') {
    query.where.isRead = true;
  } else if (req.query.isRead === 'false') {
    query.where.isRead = false;
  }
  
  // Filter by type
  if (req.query.type) {
    query.where.type = req.query.type;
  }
  
  // Limit
  if (req.query.limit) {
    query.limit = parseInt(req.query.limit);
  }
  
  const notifications = await Notification.findAll(query);
  
  // Get unread count
  const unreadCount = await Notification.count({
    where: {
      userId: req.user.id,
      isRead: false
    }
  });
  
  const acceptedStatuses = ['in-progress', 'accepted', 'review', 'completed', 'deadline-extension-requested'];
  
  // Enhance notifications with task status for professional tasks
  const enhancedNotifications = await Promise.all(
    notifications.map(async (n) => {
      let notifObj = n.toJSON();
      if (n.relatedType === 'professional_task' && n.relatedId) {
        try {
          const { ProfessionalTask } = require('../models');
          const task = await ProfessionalTask.findByPk(n.relatedId);
          if (task) {
            notifObj.taskStatus = task.status;
            notifObj.taskAccepted = acceptedStatuses.includes(task.status)
              ? true
              : (task.status === 'rejected' ? false : null);

            // For extension_requested notifications, always include extensionStatus in data
            if (notifObj.type === 'extension_requested') {
              notifObj.data = notifObj.data || {};
              notifObj.data.extensionStatus = task.extensionStatus || 'requested';
            }
          } else {
            notifObj.taskStatus = 'deleted';
            notifObj.taskAccepted = null;
          }
        } catch {
          notifObj.taskStatus = 'deleted';
          notifObj.taskAccepted = null;
        }
      }
      return notifObj;
    })
  );
  
  console.log('Enhanced notifications:', JSON.stringify(enhancedNotifications, null, 2));
  res.status(200).json({
    success: true,
    count: enhancedNotifications.length,
    unreadCount,
    data: enhancedNotifications
  });
});

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });
  
  if (!notification) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = asyncHandler(async (req, res, next) => {
  // Only admin can create notifications for others
  if (req.user.role !== 'admin' && req.body.userId !== req.user.id) {
    return next(new ErrorResponse(`Not authorized to create notifications for other users`, 401));
  }
  
  const io = req.app.get('io');
  
  try {
    const notification = await Notification.create(req.body);
    
    // Emit real-time notification if socket.io is available
    if (io) {
      console.log(`[DEBUG] Emitting notification to user_${req.body.userId}:`, notification.toJSON());
      io.to(`user_${req.body.userId}`).emit('notification', notification.toJSON());
    } else {
      console.warn('[WARNING] Socket.io instance not available for real-time notification');
    }
    
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('[ERROR] Failed to create notification:', error);
    return next(new ErrorResponse('Failed to create notification', 500));
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });
  
  if (!notification) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
  }
  
  await notification.update({ isRead: true });
  
  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.update(
    { isRead: true },
    { where: { userId: req.user.id, isRead: false } }
  );
  
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });
  
  if (!notification) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
  }
  
  await notification.destroy();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.clearReadNotifications = asyncHandler(async (req, res, next) => {
  await Notification.destroy({
    where: {
      userId: req.user.id,
      isRead: true
    }
  });
  
  res.status(200).json({
    success: true,
    message: 'All read notifications deleted'
  });
});

// @desc    Get professional project
// @route   GET /api/professional-projects/:id
// @access  Private
exports.getProfessionalProject = asyncHandler(async (req, res, next) => {
  const project = await ProfessionalProject.findByPk(req.params.id, {
    include: [{ model: Department, as: 'departments' }]
  });
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }
  
  console.log("!!! PROFESSIONAL PROJECT DETAILS COMPONENT MOUNTED !!!");
  
  console.log("ProfessionalProjectDetails rendered");
  
  res.status(200).json({
    success: true,
    data: project
  });
});

// Helper function to create notification with real-time emission
const createNotificationWithEmission = async (notificationData, req) => {
  try {
    const notification = await Notification.create(notificationData);
    
    // Emit real-time notification if socket.io is available
    const io = req.app.get('io');
    if (io) {
      console.log(`[DEBUG] Emitting notification to user_${notificationData.userId}:`, notification.toJSON());
      io.to(`user_${notificationData.userId}`).emit('notification', notification.toJSON());
    } else {
      console.warn('[WARNING] Socket.io instance not available for real-time notification');
    }
    
    return notification;
  } catch (error) {
    console.error('[ERROR] Failed to create notification:', error);
    throw error;
  }
};

// Export the helper function for use in other controllers
module.exports.createNotificationWithEmission = createNotificationWithEmission;