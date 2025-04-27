const { PersonalTask, PersonalProject, sequelize } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

// @desc    Get all personal tasks for a user
// @route   GET /api/personal-tasks
// @access  Private
exports.getPersonalTasks = asyncHandler(async (req, res, next) => {
  let query = {
    where: { userId: req.user.id },
    include: [{
      model: PersonalProject,
      attributes: ['id', 'title', 'color']
    }],
    order: [['createdAt', 'DESC']]
  };

  // Filter by status if provided
  if (req.query.status) {
    query.where.status = req.query.status;
  }

  // Filter by priority if provided
  if (req.query.priority) {
    query.where.priority = req.query.priority;
  }

  // Filter by project if provided
  if (req.query.projectId) {
    query.where.projectId = req.query.projectId;
  }

  // Filter standalone tasks
  if (req.query.standalone === 'true') {
    query.where.projectId = null;
  }

  // Filter by due date range
  if (req.query.startDate && req.query.endDate) {
    query.where.dueDate = {
      [Op.between]: [
        new Date(req.query.startDate),
        new Date(req.query.endDate)
      ]
    };
  } else if (req.query.startDate) {
    query.where.dueDate = {
      [Op.gte]: new Date(req.query.startDate)
    };
  } else if (req.query.endDate) {
    query.where.dueDate = {
      [Op.lte]: new Date(req.query.endDate)
    };
  }

  // Filter by due date
  if (req.query.dueToday === 'true') {
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    query.where.dueDate = {
      [Op.lt]: today
    };
    query.where.status = {
      [Op.notIn]: ['completed', 'cancelled']
    };
  }

  // Search by title or description
  if (req.query.search) {
    query.where[Op.or] = [
      { title: { [Op.like]: `%${req.query.search}%` } },
      { description: { [Op.like]: `%${req.query.search}%` } }
    ];
  }

  const tasks = await PersonalTask.findAll(query);
  
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// @desc    Get single personal task
// @route   GET /api/personal-tasks/:id
// @access  Private
exports.getPersonalTask = asyncHandler(async (req, res, next) => {
  const task = await PersonalTask.findOne({
    where: { 
      id: req.params.id,
      userId: req.user.id
    },
    include: [{
      model: PersonalProject,
      attributes: ['id', 'title', 'color']
    }]
  });
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Create new personal task
// @route   POST /api/personal-tasks
// @access  Private
exports.createPersonalTask = asyncHandler(async (req, res, next) => {
  // Add user ID to body
  req.body.userId = req.user.id;
  
  // Check if project exists if projectId is provided
  if (req.body.projectId) {
    const project = await PersonalProject.findOne({
      where: {
        id: req.body.projectId,
        userId: req.user.id
      }
    });
    
    if (!project) {
      return next(new ErrorResponse(`Project not found with id of ${req.body.projectId}`, 404));
    }
  }
  
  const task = await PersonalTask.create(req.body);
  
  res.status(201).json({
    success: true,
    data: task
  });
});

// @desc    Update personal task
// @route   PUT /api/personal-tasks/:id
// @access  Private
exports.updatePersonalTask = asyncHandler(async (req, res, next) => {
  let task = await PersonalTask.findByPk(req.params.id);
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user owns the task
  if (task.userId !== req.user.id) {
    return next(new ErrorResponse(`User not authorized to update this task`, 401));
  }
  
  // Check if project exists if projectId is provided
  if (req.body.projectId) {
    const project = await PersonalProject.findOne({
      where: {
        id: req.body.projectId,
        userId: req.user.id
      }
    });
    
    if (!project) {
      return next(new ErrorResponse(`Project not found with id of ${req.body.projectId}`, 404));
    }
  }
  
  // Set completedAt if task is being marked as completed
  if (req.body.status === 'completed' && task.status !== 'completed') {
    req.body.completedAt = new Date();
  } else if (req.body.status !== 'completed' && task.status === 'completed') {
    req.body.completedAt = null;
  }
  
  // Update task
  task = await task.update(req.body);
  
  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Delete personal task
// @route   DELETE /api/personal-tasks/:id
// @access  Private
exports.deletePersonalTask = asyncHandler(async (req, res, next) => {
  const task = await PersonalTask.findByPk(req.params.id);
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user owns the task
  if (task.userId !== req.user.id) {
    return next(new ErrorResponse(`User not authorized to delete this task`, 401));
  }
  
  await task.destroy();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get task statistics
// @route   GET /api/personal-tasks/stats
// @access  Private
exports.getTaskStats = asyncHandler(async (req, res, next) => {
  // Task counts by status
  const statusCounts = await PersonalTask.findAll({
    where: { userId: req.user.id },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });
  
  // Task counts by priority
  const priorityCounts = await PersonalTask.findAll({
    where: { userId: req.user.id },
    attributes: [
      'priority',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['priority']
  });
  
  // Overdue tasks
  const overdueTasks = await PersonalTask.count({
    where: {
      userId: req.user.id,
      dueDate: { [Op.lt]: new Date() },
      status: { [Op.notIn]: ['completed', 'cancelled'] }
    }
  });
  
  // Completion rate
  const totalTasks = await PersonalTask.count({
    where: { 
      userId: req.user.id,
      // Exclude tasks without due dates for completion rate calculation
      dueDate: { [Op.ne]: null }
    }
  });
  
  const completedTasks = await PersonalTask.count({
    where: { 
      userId: req.user.id,
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
  
  const tasksDueToday = await PersonalTask.count({
    where: {
      userId: req.user.id,
      dueDate: {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      },
      status: { [Op.notIn]: ['completed', 'cancelled'] }
    }
  });
  
  // Tasks by project
  const tasksByProject = await PersonalTask.findAll({
    where: { 
      userId: req.user.id,
      projectId: { [Op.ne]: null }
    },
    attributes: [
      'projectId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    include: [{
      model: PersonalProject,
      attributes: ['title']
    }],
    group: ['projectId']
  });
  
  res.status(200).json({
    success: true,
    data: {
      statusCounts,
      priorityCounts,
      overdueTasks,
      completionRate,
      tasksDueToday,
      tasksByProject
    }
  });
});

// @desc    Bulk update tasks
// @route   PUT /api/personal-tasks/bulk-update
// @access  Private
exports.bulkUpdateTasks = asyncHandler(async (req, res, next) => {
  const { taskIds, updates } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return next(new ErrorResponse('Please provide an array of task IDs', 400));
  }
  
  if (!updates || Object.keys(updates).length === 0) {
    return next(new ErrorResponse('Please provide update fields', 400));
  }
  
  // Verify all tasks belong to user
  const tasksCount = await PersonalTask.count({
    where: {
      id: { [Op.in]: taskIds },
      userId: req.user.id
    }
  });
  
  if (tasksCount !== taskIds.length) {
    return next(new ErrorResponse('One or more tasks not found or not authorized', 404));
  }
  
  // Handle completion status special case
  if (updates.status === 'completed') {
    updates.completedAt = new Date();
  } else if (updates.status && updates.status !== 'completed') {
    updates.completedAt = null;
  }
  
  // Update tasks
  await PersonalTask.update(updates, {
    where: {
      id: { [Op.in]: taskIds },
      userId: req.user.id
    }
  });
  
  res.status(200).json({
    success: true,
    message: `${tasksCount} tasks updated successfully`
  });
});