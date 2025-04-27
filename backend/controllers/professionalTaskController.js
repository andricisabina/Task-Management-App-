const { ProfessionalTask, ProfessionalProject, User, Comment, Attachment, Notification, sequelize } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer storage for task attachments
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/attachments';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Use task ID + timestamp + file extension for unique filenames
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `task-${req.params.id}-${uniqueSuffix}${ext}`);
  }
});

// Initialize upload
const upload = multer({
  storage,
  limits: { fileSize: 10000000 }, // 10MB
});

// @desc    Get all professional tasks for a user
// @route   GET /api/professional-tasks
// @access  Private
exports.getProfessionalTasks = asyncHandler(async (req, res, next) => {
  let query = {
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'departmentId', 'color']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email', 'profilePhoto']
      }
    ],
    order: [['createdAt', 'DESC']]
  };

  // Different queries for different roles
  if (req.user.role === 'admin') {
    // Admin can see all tasks
  } else {
    // Regular users see tasks assigned to them or created by them
    query.where = {
      [Op.or]: [
        { assignedToId: req.user.id },
        { assignedById: req.user.id }
      ]
    };
  }

  // Filter by status if provided
  if (req.query.status) {
    if (!query.where) query.where = {};
    query.where.status = req.query.status;
  }

  // Filter by priority if provided
  if (req.query.priority) {
    if (!query.where) query.where = {};
    query.where.priority = req.query.priority;
  }

  // Filter by project if provided
  if (req.query.projectId) {
    if (!query.where) query.where = {};
    query.where.projectId = req.query.projectId;
  }

  // Filter by department if provided
  if (req.query.departmentId) {
    if (!query.where) query.where = {};
    query.where.departmentId = req.query.departmentId;
  }

  // Filter by assigned user if provided
  if (req.query.assignedToId) {
    if (!query.where) query.where = {};
    query.where.assignedToId = req.query.assignedToId;
  }

  // Filter by due date range
  if (req.query.startDate && req.query.endDate) {
    if (!query.where) query.where = {};
    query.where.dueDate = {
      [Op.between]: [
        new Date(req.query.startDate),
        new Date(req.query.endDate)
      ]
    };
  } else if (req.query.startDate) {
    if (!query.where) query.where = {};
    query.where.dueDate = {
      [Op.gte]: new Date(req.query.startDate)
    };
  } else if (req.query.endDate) {
    if (!query.where) query.where = {};
    query.where.dueDate = {
      [Op.lte]: new Date(req.query.endDate)
    };
  }

  // Filter by due date
  if (req.query.dueToday === 'true') {
    if (!query.where) query.where = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    query.where.dueDate = {
      [Op.gte]: today,
      [Op.lt]: tomorrow
    };
  }

  if (req.query.overdue === 'true') {
    if (!query.where) query.where = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    query.where.dueDate = {
      [Op.lt]: today
    };
    query.where.status = {
      [Op.notIn]: ['completed', 'cancelled', 'rejected']
    };
  }

  // Search by title or description
  if (req.query.search) {
    if (!query.where) query.where = {};
    query.where[Op.or] = [
      { title: { [Op.like]: `%${req.query.search}%` } },
      { description: { [Op.like]: `%${req.query.search}%` } }
    ];
  }

  const tasks = await ProfessionalTask.findAll(query);
  
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// @desc    Get single professional task
// @route   GET /api/professional-tasks/:id
// @access  Private
exports.getProfessionalTask = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'departmentId', 'creatorId', 'color']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email', 'profilePhoto']
      },
      {
        model: Comment,
        include: [{
          model: User,
          attributes: ['id', 'name', 'profilePhoto']
        }],
        order: [['createdAt', 'ASC']]
      },
      {
        model: Attachment,
        attributes: ['id', 'fileName', 'filePath', 'fileSize', 'fileType', 'description'],
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'name']
        }]
      }
    ]
  });
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user has access to this task
  const isAssignee = task.assignedToId === req.user.id;
  const isAssigner = task.assignedById === req.user.id;
  const isProjectCreator = task.ProfessionalProject && task.ProfessionalProject.creatorId === req.user.id;
  
  if (!isAssignee && !isAssigner && !isProjectCreator && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to view this task`, 401));
  }
  
  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Create new professional task
// @route   POST /api/professional-tasks
// @access  Private
exports.createProfessionalTask = asyncHandler(async (req, res, next) => {
  // Add assigner ID to body
  req.body.assignedById = req.user.id;
  
  // Check if project exists
  const project = await ProfessionalProject.findByPk(req.body.projectId);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.body.projectId}`, 404));
  }
  
  // Check if assignee exists if provided
  if (req.body.assignedToId) {
    const assignee = await User.findByPk(req.body.assignedToId);
    
    if (!assignee) {
      return next(new ErrorResponse(`User not found with id of ${req.body.assignedToId}`, 404));
    }
  }
  
  // Save original due date for tracking extensions
  if (req.body.dueDate) {
    req.body.originalDueDate = req.body.dueDate;
  }
  
  // Set department same as project
  req.body.departmentId = project.departmentId;
  
  const task = await ProfessionalTask.create(req.body);
  
  // Create notification for assigned user if applicable
  if (req.body.assignedToId) {
    await Notification.create({
      userId: req.body.assignedToId,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      type: 'task_assigned',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
  }
  
  res.status(201).json({
    success: true,
    data: task
  });
});

// @desc    Update professional task
// @route   PUT /api/professional-tasks/:id
// @access  Private
exports.updateProfessionalTask = asyncHandler(async (req, res, next) => {
  let task = await ProfessionalTask.findByPk(req.params.id, {
    include: [
      {
        model: ProfessionalProject,
        attributes: ['creatorId']
      }
    ]
  });
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user has permission to update
  const isAssignee = task.assignedToId === req.user.id;
  const isAssigner = task.assignedById === req.user.id;
  const isProjectCreator = task.ProfessionalProject && task.ProfessionalProject.creatorId === req.user.id;
  
  if (!isAssignee && !isAssigner && !isProjectCreator && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to update this task`, 401));
  }
  
  // Special handling for task status changes
  if (req.body.status) {
    // Only assignee can mark task as completed
    if (req.body.status === 'completed' && !isAssignee && req.user.role !== 'admin') {
      return next(new ErrorResponse(`Only the assignee can mark a task as completed`, 403));
    }
    
    // Set completedAt if task is being marked as completed
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
      
      // Create notification for task assigner
      if (task.assignedById) {
        await Notification.create({
          userId: task.assignedById,
          title: 'Task Completed',
          message: `Task "${task.title}" has been marked as completed`,
          type: 'task_completed',
          relatedId: task.id,
          relatedType: 'professional_task',
          link: `/tasks/professional/${task.id}`
        });
      }
    } else if (req.body.status !== 'completed' && task.status === 'completed') {
      req.body.completedAt = null;
    }
    
    // Handle rejection reasons
    if (req.body.status === 'rejected' && !req.body.rejectionReason) {
      return next(new ErrorResponse(`Rejection reason is required when rejecting a task`, 400));
    }
    
    // Handle deadline extension requests
    if (req.body.status === 'deadline-extension-requested') {
      if (!req.body.extensionRequestDays || !req.body.extensionRequestReason) {
        return next(new ErrorResponse(`Extension days and reason are required for deadline extension requests`, 400));
      }
      
      req.body.extensionStatus = 'requested';
      
      // Create notification for task assigner
      if (task.assignedById) {
        await Notification.create({
          userId: task.assignedById,
          title: 'Deadline Extension Requested',
          message: `A deadline extension of ${req.body.extensionRequestDays} days has been requested for task "${task.title}"`,
          type: 'extension_requested',
          relatedId: task.id,
          relatedType: 'professional_task',
          link: `/tasks/professional/${task.id}`
        });
      }
    }
    
    // Handle extension responses
    if (req.body.extensionStatus && (req.body.extensionStatus === 'approved' || req.body.extensionStatus === 'rejected')) {
      // Only assigner or project creator can approve/reject extensions
      if (!isAssigner && !isProjectCreator && req.user.role !== 'admin') {
        return next(new ErrorResponse(`Only the task assigner or project creator can respond to extension requests`, 403));
      }
      
      if (req.body.extensionStatus === 'approved' && task.extensionRequestDays > 0) {
        // Calculate new due date
        const currentDueDate = new Date(task.dueDate);
        currentDueDate.setDate(currentDueDate.getDate() + task.extensionRequestDays);
        req.body.dueDate = currentDueDate;
        
        // Set status back to in-progress
        req.body.status = 'in-progress';
        
        // Create notification for assignee
        if (task.assignedToId) {
          await Notification.create({
            userId: task.assignedToId,
            title: 'Deadline Extension Approved',
            message: `Your deadline extension request for task "${task.title}" has been approved`,
            type: 'extension_response',
            relatedId: task.id,
            relatedType: 'professional_task',
            link: `/tasks/professional/${task.id}`
          });
        }
      } else if (req.body.extensionStatus === 'rejected') {
        // Set status back to in-progress
        req.body.status = 'in-progress';
        
        // Create notification for assignee
        if (task.assignedToId) {
          await Notification.create({
            userId: task.assignedToId,
            title: 'Deadline Extension Rejected',
            message: `Your deadline extension request for task "${task.title}" has been rejected`,
            type: 'extension_response',
            relatedId: task.id,
            relatedType: 'professional_task',
            link: `/tasks/professional/${task.id}`
          });
        }
      }
    }
  }
  
  // Update task
  await task.update(req.body);
  
  // If assignee is changed, create notification
  if (req.body.assignedToId && req.body.assignedToId !== task.assignedToId) {
    await Notification.create({
      userId: req.body.assignedToId,
      title: 'Task Assigned to You',
      message: `You have been assigned to task: ${task.title}`,
      type: 'task_assigned',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
  }
  
  // Fetch updated task with relationships
  const updatedTask = await ProfessionalTask.findByPk(task.id, {
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email', 'profilePhoto']
      }
    ]
  });
  
  res.status(200).json({
    success: true,
    data: updatedTask
  });
});

// @desc    Delete professional task
// @route   DELETE /api/professional-tasks/:id
// @access  Private
exports.deleteProfessionalTask = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [
      {
        model: ProfessionalProject,
        attributes: ['creatorId']
      }
    ]
  });
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user has permission to delete
  const isAssigner = task.assignedById === req.user.id;
  const isProjectCreator = task.ProfessionalProject && task.ProfessionalProject.creatorId === req.user.id;
  
  if (!isAssigner && !isProjectCreator && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to delete this task`, 401));
  }
  
  const transaction = await sequelize.transaction();
  
  try {
    // Delete all comments
    await Comment.destroy({
      where: { taskId: task.id },
      transaction
    });
    
    // Delete all attachments (and physical files)
    const attachments = await Attachment.findAll({
      where: { taskId: task.id }
    });
    
    for (const attachment of attachments) {
      const filePath = path.join(__dirname, '..', attachment.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await attachment.destroy({ transaction });
    }
    
    // Delete related notifications
    await Notification.destroy({
      where: {
        relatedId: task.id,
        relatedType: 'professional_task'
      },
      transaction
    });
    
    // Delete task
    await task.destroy({ transaction });
    
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Add comment to task
// @route   POST /api/professional-tasks/:id/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id);
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  // Create comment
  const comment = await Comment.create({
    content: req.body.content,
    userId: req.user.id,
    taskId: task.id,
    parentId: req.body.parentId || null
  });
  
  // Fetch comment with user data
  const commentWithUser = await Comment.findByPk(comment.id, {
    include: [{
      model: User,
      attributes: ['id', 'name', 'profilePhoto']
    }]
  });
  
  // Create notification for task assignee if the commenter is not the assignee
  if (task.assignedToId && task.assignedToId !== req.user.id) {
    await Notification.create({
      userId: task.assignedToId,
      title: 'New Comment on Task',
      message: `${req.user.name} commented on task "${task.title}"`,
      type: 'comment_added',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
  }
  
  // Create notification for task assigner if the commenter is not the assigner
  if (task.assignedById && task.assignedById !== req.user.id && task.assignedById !== task.assignedToId) {
    await Notification.create({
      userId: task.assignedById,
      title: 'New Comment on Task',
      message: `${req.user.name} commented on task "${task.title}"`,
      type: 'comment_added',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
  }
  
  res.status(201).json({
    success: true,
    data: commentWithUser
  });
});

// @desc    Upload file attachment
// @route   POST /api/professional-tasks/:id/attachments
// @access  Private
exports.uploadAttachment = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id);
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  const uploadMiddleware = upload.single('file');
  
  uploadMiddleware(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return next(new ErrorResponse(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(new ErrorResponse(err.message, 400));
    }
    
    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }
    
    // Create attachment record
    const attachment = await Attachment.create({
      fileName: req.file.originalname,
      filePath: req.file.path.replace(/\\/g, '/'),
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      taskId: task.id,
      uploadedBy: req.user.id,
      description: req.body.description || null
    });
    
    // Create notification for task assignee if the uploader is not the assignee
    if (task.assignedToId && task.assignedToId !== req.user.id) {
      await Notification.create({
        userId: task.assignedToId,
        title: 'New Attachment on Task',
        message: `${req.user.name} added an attachment to task "${task.title}"`,
        type: 'task_updated',
        relatedId: task.id,
        relatedType: 'professional_task',
        link: `/tasks/professional/${task.id}`
      });
    }
    
    res.status(201).json({
      success: true,
      data: attachment
    });
  });
});

// @desc    Get task statistics
// @route   GET /api/professional-tasks/stats
// @access  Private
exports.getTaskStats = asyncHandler(async (req, res, next) => {
  // For admin, get all tasks stats
  // For regular users, get stats for tasks they're involved with
  let whereClause = {};
  
  if (req.user.role !== 'admin') {
    whereClause = {
      [Op.or]: [
        { assignedToId: req.user.id },
        { assignedById: req.user.id }
      ]
    };
  }
  
  // Department filter
  if (req.query.departmentId) {
    whereClause.departmentId = req.query.departmentId;
  }
  
  // Status counts
  const statusCounts = await ProfessionalTask.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });
  
  // Priority counts
  const priorityCounts = await ProfessionalTask.findAll({
    where: whereClause,
    attributes: [
      'priority',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['priority']
  });
  
  // Department counts
  const departmentCounts = await ProfessionalTask.findAll({
    where: whereClause,
    attributes: [
      'departmentId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    include: [{
      model: ProfessionalProject,
      attributes: ['departmentId'],
      include: [{
        model: Department,
        attributes: ['name']
      }]
    }],
    group: ['departmentId']
  });
  
  // Overdue tasks
  const overdueTasks = await ProfessionalTask.count({
    where: {
      ...whereClause,
      dueDate: { [Op.lt]: new Date() },
      status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
    }
  });
  
  // Completion rate
  const totalTasks = await ProfessionalTask.count({
    where: { 
      ...whereClause,
      dueDate: { [Op.ne]: null }
    }
  });
  
  const completedTasks = await ProfessionalTask.count({
    where: { 
      ...whereClause,
      status: 'completed',
      dueDate: { [Op.ne]: null }
    }
  });
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Tasks due today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tasksDueToday = await ProfessionalTask.count({
    where: {
      ...whereClause,
      dueDate: {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      },
      status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
    }
  });
  
  // Projects with most tasks
  const projectTaskCounts = await ProfessionalTask.findAll({
    where: whereClause,
    attributes: [
      'projectId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    include: [{
      model: ProfessionalProject,
      attributes: ['title']
    }],
    group: ['projectId'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit: 5
  });
  
  res.status(200).json({
    success: true,
    data: {
      statusCounts,
      priorityCounts,
      departmentCounts,
      overdueTasks,
      completionRate,
      tasksDueToday,
      projectTaskCounts
    }
  });
});

// @desc    Get tasks by date range (for calendar)
// @route   GET /api/professional-tasks/calendar
// @access  Private
exports.getTasksForCalendar = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return next(new ErrorResponse('Please provide start and end dates', 400));
  }
  
  // For admin, get all tasks in date range
  // For regular users, get tasks they're involved with
  let whereClause = {
    dueDate: {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    }
  };
  
  if (req.user.role !== 'admin') {
    whereClause = {
      ...whereClause,
      [Op.or]: [
        { assignedToId: req.user.id },
        { assignedById: req.user.id }
      ]
    };
  }
  
  // Department filter
  if (req.query.departmentId) {
    whereClause.departmentId = req.query.departmentId;
  }
  
  // Project filter
  if (req.query.projectId) {
    whereClause.projectId = req.query.projectId;
  }
  
  const tasks = await ProfessionalTask.findAll({
    where: whereClause,
    include: [
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'color']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name']
      }
    ],
    order: [['dueDate', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

module.exports = exports;