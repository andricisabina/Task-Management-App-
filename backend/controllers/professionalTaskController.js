const { ProfessionalTask, ProfessionalProject, User, Department, ProjectMember, Comment, Attachment, Notification, sequelize } = require('../models');
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

  // Fetch the project
  const project = await ProfessionalProject.findByPk(req.body.projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if the user is the project manager (creator)
  const isManager = project.creatorId === req.user.id;

  // Check if the user is a leader for this project (accepted)
  const isLeader = await ProjectMember.findOne({
    where: {
      userId: req.user.id,
      projectId: project.id,
      role: 'leader',
      status: 'accepted'
    }
  });

  if (!isManager && !isLeader) {
    return next(new ErrorResponse('Only the project manager or team leaders can create tasks for this project', 403));
  }

  // Assignment by email
  let assignee = null;
  if (req.body.assignedToEmail) {
    assignee = await User.findOne({ where: { email: req.body.assignedToEmail } });
    if (!assignee) {
      return next(new ErrorResponse(`User not found with email ${req.body.assignedToEmail}`, 404));
    }
    req.body.assignedToId = assignee.id;
  } else if (req.body.assignedToId) {
    assignee = await User.findByPk(req.body.assignedToId);
    if (!assignee) {
      return next(new ErrorResponse(`User not found with id of ${req.body.assignedToId}`, 404));
    }
  }

  // Save original due date for tracking extensions
  if (req.body.dueDate) {
    req.body.originalDueDate = req.body.dueDate;
  }

  // Set departmentId from request or project
  if (!req.body.departmentId) {
    req.body.departmentId = project.departmentId;
  }

  const task = await ProfessionalTask.create(req.body);

  // Create notification and send email for assigned user if applicable
  if (assignee) {
    await Notification.create({
      userId: assignee.id,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      type: 'task_assigned',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
    // Send email (assume sendEmail utility is available)
    try {
      await require('../utils/sendEmail')({
        to: assignee.email,
        subject: 'You have been assigned a new task',
        text: `Hello ${assignee.name},\n\nYou have been assigned a new task: ${task.title}\nProject: ${project.title}\nDue Date: ${task.dueDate}\n\nPlease log in to view the details.`,
      });
    } catch (emailErr) {
      // Log but do not fail the request
      console.error('Failed to send assignment email:', emailErr);
    }
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
        attributes: ['id', 'title', 'creatorId']
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

  // Save old assignee for notification logic
  const oldAssigneeId = task.assignedToId;

  // Special handling for task status changes
  if (req.body.status) {
    // Only assignee can mark task as completed
    if (req.body.status === 'completed' && !isAssignee && req.user.role !== 'admin') {
      return next(new ErrorResponse(`Only the assignee can mark a task as completed`, 403));
    }
    // Set completedAt if task is being marked as completed
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
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
    }
    // Allow transitions to 'todo', 'on-hold', and 'cancelled' without special logic
    // No extra checks needed for these statuses
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
      } else if (req.body.extensionStatus === 'rejected') {
        // Set status back to in-progress
        req.body.status = 'in-progress';
      }
    }
  }

  // Update task
  await task.update(req.body);

  // --- PROJECT COMPLETION LOGIC START ---
  // If task is part of a project and is now completed, check if all tasks are completed/cancelled/rejected
  if (task.projectId && req.body.status === 'completed') {
    const incompleteTasks = await ProfessionalTask.count({
      where: {
        projectId: task.projectId,
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      }
    });
    if (incompleteTasks === 0) {
      // All tasks are completed/cancelled/rejected, mark project as completed
      const project = await ProfessionalProject.findByPk(task.projectId);
      if (project && project.status !== 'completed') {
        try {
          await project.update({ status: 'completed' });
          // Get socket.io instance
          const io = req.app.get('io');
          // Find all department leaders for this project
          const leaders = await ProjectMember.findAll({
            where: {
              projectId: project.id,
              role: 'leader',
              status: 'accepted'
            },
            include: [{ model: User, as: 'member', attributes: ['id', 'name', 'email'] }]
          });
          // Notify project creator
          const notifications = [];
          notifications.push(await Notification.create({
            userId: project.creatorId,
            title: 'Project Completed',
            message: `Your professional project "${project.title}" has been marked as completed.`,
            type: 'project_update',
            relatedId: project.id,
            relatedType: 'professional_project',
            link: `/projects/professional/${project.id}`
          }));
          if (io) {
            io.to(`user_${project.creatorId}`).emit('notification', notifications[0].toJSON());
          }
          // Notify all department leaders
          for (const leader of leaders) {
            if (leader.userId !== project.creatorId) { // Avoid duplicate notification if creator is also a leader
              const notif = await Notification.create({
                userId: leader.userId,
                title: 'Project Completed',
                message: `The professional project "${project.title}" you lead has been marked as completed.`,
                type: 'project_update',
                relatedId: project.id,
                relatedType: 'professional_project',
                link: `/projects/professional/${project.id}`
              });
              if (io) {
                io.to(`user_${leader.userId}`).emit('notification', notif.toJSON());
              }
            }
          }
        } catch (err) {
          console.error('[ERROR] Failed to handle professional project completion:', err);
        }
      }
    }
  }
  // --- PROJECT COMPLETION LOGIC END ---

  // Notify all involved users (except the updater) on any update
  const involvedUserIds = new Set();
  if (task.assignedToId) involvedUserIds.add(task.assignedToId);
  if (task.assignedById) involvedUserIds.add(task.assignedById);
  if (task.ProfessionalProject && task.ProfessionalProject.creatorId) involvedUserIds.add(task.ProfessionalProject.creatorId);
  involvedUserIds.delete(req.user.id); // Don't notify the updater

  // If assignee is changed, notify new assignee and send email
  if (req.body.assignedToId && req.body.assignedToId !== oldAssigneeId) {
    await Notification.create({
      userId: req.body.assignedToId,
      title: 'Task Assigned to You',
      message: `You have been assigned to task: ${task.title}`,
      type: 'task_assigned',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
    // Send email on assignment
    const sendEmail = require('../utils/sendEmail');
    const user = await User.findByPk(req.body.assignedToId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Task Assigned to You',
          text: `You have been assigned to task: ${task.title}`
        });
      } catch (e) { console.error('Failed to send email:', e); }
    }
    involvedUserIds.delete(req.body.assignedToId); // Already notified above
  }

  // Notify all other involved users
  const io = req.app.get('io');
  for (const userId of involvedUserIds) {
    await Notification.create({
      userId,
      title: 'Task Updated',
      message: `Task "${task.title}" has been updated`,
      type: 'task_updated',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
    io.to(`user_${userId}`).emit('notification', {
      title: 'Task Updated',
      message: `Task "${task.title}" has been updated`,
      type: 'task_updated',
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
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [{ model: ProfessionalProject, attributes: ['id', 'title', 'creatorId'] }]
  });
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
  // Notify all involved users (assignee, assigner, manager) except the commenter
  const involvedUserIds = new Set();
  if (task.assignedToId) involvedUserIds.add(task.assignedToId);
  if (task.assignedById) involvedUserIds.add(task.assignedById);
  if (task.ProfessionalProject && task.ProfessionalProject.creatorId) involvedUserIds.add(task.ProfessionalProject.creatorId);
  involvedUserIds.delete(req.user.id);
  const sendEmail = require('../utils/sendEmail');
  const io = req.app.get('io');
  for (const userId of involvedUserIds) {
    await Notification.create({
      userId,
      title: 'New Comment on Task',
      message: `${req.user.name} commented on task "${task.title}"`,
      type: 'comment_added',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
    // Send email
    const user = await User.findByPk(userId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'New Comment on Task',
          text: `${req.user.name} commented on task: ${task.title} in project ${task.ProfessionalProject.title}\n\nComment: ${req.body.content}`
        });
      } catch (e) { console.error('Failed to send email:', e); }
    }
    io.to(`user_${userId}`).emit('notification', {
      title: 'New Comment on Task',
      message: `${req.user.name} commented on task: ${task.title} in project ${task.ProfessionalProject.title}\n\nComment: ${req.body.content}`,
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

// @desc    Accept a professional task (by assignee)
// @route   POST /api/professional-tasks/:id/accept
// @access  Private
exports.acceptProfessionalTask = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [{ model: ProfessionalProject, attributes: ['id', 'title', 'creatorId'] }]
  });
  if (!task) return next(new ErrorResponse('Task not found', 404));
  if (task.assignedToId !== req.user.id) return next(new ErrorResponse('Only the assigned user can accept this task', 403));
  if (task.status !== 'pending') return next(new ErrorResponse('Task cannot be accepted in its current status', 400));

  await task.update({ status: 'in-progress' });

  // Notify assigner and manager
  const assigner = task.assignedById ? await User.findByPk(task.assignedById) : null;
  const manager = task.ProfessionalProject ? await User.findByPk(task.ProfessionalProject.creatorId) : null;
  const notifications = [];
  if (assigner) notifications.push({
    userId: assigner.id,
    title: 'Task Accepted',
    message: `${req.user.name} accepted the task: ${task.title}`,
    type: 'task_updated',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`
  });
  if (manager && (!assigner || manager.id !== assigner.id)) notifications.push({
    userId: manager.id,
    title: 'Task Accepted',
    message: `${req.user.name} accepted the task: ${task.title}`,
    type: 'task_updated',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`
  });
  await Notification.bulkCreate(notifications);
  const io = req.app.get('io');
  notifications.forEach(n => {
    io.to(`user_${n.userId}`).emit('notification', n);
  });
  // Send emails
  const sendEmail = require('../utils/sendEmail');
  for (const n of notifications) {
    const user = await User.findByPk(n.userId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Task Accepted',
          text: `${req.user.name} has accepted the task: ${task.title} in project ${task.ProfessionalProject.title}`
        });
      } catch (e) { console.error('Failed to send email:', e); }
    }
  }
  res.status(200).json({ success: true, data: task });
});

// @desc    Reject a professional task (by assignee)
// @route   POST /api/professional-tasks/:id/reject
// @access  Private
exports.rejectProfessionalTask = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [{ model: ProfessionalProject, attributes: ['id', 'title', 'creatorId'] }]
  });
  if (!task) return next(new ErrorResponse('Task not found', 404));
  if (task.assignedToId !== req.user.id) return next(new ErrorResponse('Only the assigned user can reject this task', 403));
  if (task.status !== 'pending') return next(new ErrorResponse('Task cannot be rejected in its current status', 400));
  if (!req.body.rejectionReason) return next(new ErrorResponse('Rejection reason is required', 400));

  await task.update({ status: 'rejected', rejectionReason: req.body.rejectionReason });

  // Notify assigner and manager
  const assigner = task.assignedById ? await User.findByPk(task.assignedById) : null;
  const manager = task.ProfessionalProject ? await User.findByPk(task.ProfessionalProject.creatorId) : null;
  const notifications = [];
  if (assigner) notifications.push({
    userId: assigner.id,
    title: 'Task Rejected',
    message: `${req.user.name} rejected the task: ${task.title}`,
    type: 'task_updated',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`
  });
  if (manager && (!assigner || manager.id !== assigner.id)) notifications.push({
    userId: manager.id,
    title: 'Task Rejected',
    message: `${req.user.name} rejected the task: ${task.title}`,
    type: 'task_updated',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`
  });
  await Notification.bulkCreate(notifications);
  const io = req.app.get('io');
  notifications.forEach(n => {
    io.to(`user_${n.userId}`).emit('notification', n);
  });
  // Send emails
  const sendEmail = require('../utils/sendEmail');
  for (const n of notifications) {
    const user = await User.findByPk(n.userId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Task Rejected',
          text: `${req.user.name} has rejected the task: ${task.title} in project ${task.ProfessionalProject.title}\nReason: ${req.body.rejectionReason}`
        });
      } catch (e) { console.error('Failed to send email:', e); }
    }
  }
  res.status(200).json({ success: true, data: task });
});

// @desc    Request deadline extension (by assignee)
// @route   POST /api/professional-tasks/:id/request-extension
// @access  Private
exports.requestDeadlineExtension = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [{ model: ProfessionalProject, attributes: ['id', 'title', 'creatorId'] }]
  });
  if (!task) return next(new ErrorResponse('Task not found', 404));
  if (task.assignedToId !== req.user.id) return next(new ErrorResponse('Only the assigned user can request an extension', 403));
  if (!req.body.extensionRequestDays || !req.body.extensionRequestReason) return next(new ErrorResponse('Extension days and reason are required', 400));
  if (req.body.extensionRequestDays < 1 || req.body.extensionRequestDays > 7) return next(new ErrorResponse('Extension days must be between 1 and 7', 400));

  await task.update({
    status: 'deadline-extension-requested',
    extensionRequestDays: req.body.extensionRequestDays,
    extensionRequestReason: req.body.extensionRequestReason,
    extensionStatus: 'requested'
  });

  // Notify assigner and manager
  const assigner = task.assignedById ? await User.findByPk(task.assignedById) : null;
  const manager = task.ProfessionalProject ? await User.findByPk(task.ProfessionalProject.creatorId) : null;
  const notifications = [];
  if (assigner) notifications.push({
    userId: assigner.id,
    title: 'Deadline Extension Requested',
    message: `${req.user.name} requested a deadline extension for task: ${task.title}`,
    type: 'extension_requested',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`,
    data: {
      extensionRequestDays: req.body.extensionRequestDays,
      extensionRequestReason: req.body.extensionRequestReason
    }
  });
  if (manager && (!assigner || manager.id !== assigner.id)) notifications.push({
    userId: manager.id,
    title: 'Deadline Extension Requested',
    message: `${req.user.name} requested a deadline extension for task: ${task.title}`,
    type: 'extension_requested',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`,
    data: {
      extensionRequestDays: req.body.extensionRequestDays,
      extensionRequestReason: req.body.extensionRequestReason
    }
  });
  await Notification.bulkCreate(notifications);
  const io = req.app.get('io');
  notifications.forEach(n => {
    io.to(`user_${n.userId}`).emit('notification', n);
  });
  // Send emails
  const sendEmail = require('../utils/sendEmail');
  for (const n of notifications) {
    const user = await User.findByPk(n.userId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Deadline Extension Requested',
          text: `${req.user.name} has requested a deadline extension for task: ${task.title} in project ${task.ProfessionalProject.title}\nDays requested: ${req.body.extensionRequestDays}\nReason: ${req.body.extensionRequestReason}`
        });
      } catch (e) { console.error('Failed to send email:', e); }
    }
  }
  res.status(200).json({ success: true, data: task });
});

// @desc    Approve deadline extension (by assigner or manager)
// @route   POST /api/professional-tasks/:id/approve-extension
// @access  Private
exports.approveDeadlineExtension = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [{ model: ProfessionalProject, attributes: ['id', 'title', 'creatorId'] }]
  });
  if (!task) return next(new ErrorResponse('Task not found', 404));
  const isAssigner = task.assignedById === req.user.id;
  const isManager = task.ProfessionalProject && task.ProfessionalProject.creatorId === req.user.id;
  if (!isAssigner && !isManager && req.user.role !== 'admin') return next(new ErrorResponse('Only the assigner or manager can approve extension', 403));
  if (task.extensionStatus !== 'requested') return next(new ErrorResponse('No pending extension request', 400));
  if (!task.extensionRequestDays || task.extensionRequestDays < 1 || task.extensionRequestDays > 7) return next(new ErrorResponse('Invalid extension days', 400));

  // Update due date
  const newDueDate = new Date(task.dueDate);
  newDueDate.setDate(newDueDate.getDate() + task.extensionRequestDays);
  await task.update({
    dueDate: newDueDate,
    status: 'in-progress',
    extensionStatus: 'approved',
    extensionRequestDays: 0,
    extensionRequestReason: null
  });

  // Notify assignee
  if (task.assignedToId) {
    await Notification.create({
      userId: task.assignedToId,
      title: 'Deadline Extension Approved',
      message: `Your deadline extension request for task: ${task.title} was approved`,
      type: 'extension_response',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
    // Send email
    const sendEmail = require('../utils/sendEmail');
    const user = await User.findByPk(task.assignedToId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Deadline Extension Approved',
          text: `Your deadline extension request for task: ${task.title} in project ${task.ProfessionalProject.title} was approved. New due date: ${newDueDate.toLocaleString()}`
        });
      } catch (e) { console.error('Failed to send email:', e); }
    }
  }
  const io = req.app.get('io');
  io.to(`user_${task.assignedToId}`).emit('notification', {
    title: 'Deadline Extension Approved',
    message: `Your deadline extension request for task: ${task.title} in project ${task.ProfessionalProject.title} was approved. New due date: ${newDueDate.toLocaleString()}`,
    type: 'extension_response',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`
  });
  res.status(200).json({ success: true, data: task });
});

// @desc    Reject deadline extension (by assigner or manager)
// @route   POST /api/professional-tasks/:id/reject-extension
// @access  Private
exports.rejectDeadlineExtension = asyncHandler(async (req, res, next) => {
  const task = await ProfessionalTask.findByPk(req.params.id, {
    include: [{ model: ProfessionalProject, attributes: ['id', 'title', 'creatorId'] }]
  });
  if (!task) return next(new ErrorResponse('Task not found', 404));
  const isAssigner = task.assignedById === req.user.id;
  const isManager = task.ProfessionalProject && task.ProfessionalProject.creatorId === req.user.id;
  if (!isAssigner && !isManager && req.user.role !== 'admin') return next(new ErrorResponse('Only the assigner or manager can reject extension', 403));
  if (task.extensionStatus !== 'requested') return next(new ErrorResponse('No pending extension request', 400));

  await task.update({
    status: 'in-progress',
    extensionStatus: 'rejected',
    extensionRequestDays: 0,
    extensionRequestReason: null
  });

  // Notify assignee
  if (task.assignedToId) {
    await Notification.create({
      userId: task.assignedToId,
      title: 'Deadline Extension Rejected',
      message: `Your deadline extension request for task: ${task.title} was rejected`,
      type: 'extension_response',
      relatedId: task.id,
      relatedType: 'professional_task',
      link: `/tasks/professional/${task.id}`
    });
    // Send email
    const sendEmail = require('../utils/sendEmail');
    const user = await User.findByPk(task.assignedToId);
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Deadline Extension Rejected',
          text: `Your deadline extension request for task: ${task.title} in project ${task.ProfessionalProject.title} was rejected.`
        });
      } catch (e) { console.error('Failed to send email:', e); }
    }
  }
  const io = req.app.get('io');
  io.to(`user_${task.assignedToId}`).emit('notification', {
    title: 'Deadline Extension Rejected',
    message: `Your deadline extension request for task: ${task.title} in project ${task.ProfessionalProject.title} was rejected.`,
    type: 'extension_response',
    relatedId: task.id,
    relatedType: 'professional_task',
    link: `/tasks/professional/${task.id}`
  });
  res.status(200).json({ success: true, data: task });
});

// @desc    Delete an attachment
// @route   DELETE /api/attachments/:id
// @access  Private
exports.deleteAttachment = asyncHandler(async (req, res, next) => {
  console.log('DELETE /api/attachments/:id called');
  console.log('req.user:', req.user);
  console.log('req.params.id:', req.params.id);
  const attachment = await Attachment.findByPk(req.params.id);
  console.log('Found attachment:', attachment);
  if (!attachment) {
    return next(new ErrorResponse('Attachment not found', 404));
  }
  if (attachment.uploadedBy !== req.user.id && req.user.role !== 'admin') {
    console.log('Not authorized: uploadedBy:', attachment.uploadedBy, 'user.id:', req.user.id, 'user.role:', req.user.role);
    return next(new ErrorResponse('Not authorized to delete this attachment', 403));
  }
  // Remove file from disk
  const filePath = path.join(__dirname, '..', attachment.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await attachment.destroy();
  res.status(200).json({ success: true });
});

module.exports = exports;