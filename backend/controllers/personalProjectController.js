const { PersonalProject, PersonalTask, sequelize, Notification } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

// @desc    Get all personal projects for a user
// @route   GET /api/personal-projects
// @access  Private
exports.getPersonalProjects = asyncHandler(async (req, res, next) => {
  const projects = await PersonalProject.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']]
  });
  
  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects
  });
});

// @desc    Get single personal project
// @route   GET /api/personal-projects/:id
// @access  Private
exports.getPersonalProject = asyncHandler(async (req, res, next) => {
  // Find project and include its tasks
  const project = await PersonalProject.findOne({
    where: { 
      id: req.params.id,
      userId: req.user.id
    },
    include: [{
      model: PersonalTask,
      order: [['dueDate', 'ASC']]
    }]
  });
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Create new personal project
// @route   POST /api/personal-projects
// @access  Private
exports.createPersonalProject = asyncHandler(async (req, res, next) => {
  // Add user ID to body
  req.body.userId = req.user.id;
  
  const project = await PersonalProject.create(req.body);
  
  res.status(201).json({
    success: true,
    data: project
  });
});

// @desc    Update personal project
// @route   PUT /api/personal-projects/:id
// @access  Private
exports.updatePersonalProject = asyncHandler(async (req, res, next) => {
  let project = await PersonalProject.findByPk(req.params.id);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user owns the project
  if (project.userId !== req.user.id) {
    return next(new ErrorResponse(`User not authorized to update this project`, 401));
  }
  
  // Store previous status
  const prevStatus = project.status;
  // Update project
  project = await project.update(req.body);

  // Debug log for all updates
  console.log('Updating project:', req.body, 'Previous status:', prevStatus);

  // Send notification if project is completed
  if (req.body.status === 'completed' && prevStatus !== 'completed') {
    try {
      console.log('Attempting to create notification for completed project:', project.id, project.title);
      const io = req.app.get('io');
      const notification = await Notification.create({
        userId: project.userId,
        title: 'Project Completed',
        message: `Your personal project "${project.title}" has been marked as completed.`,
        type: 'project_update',
        relatedId: project.id,
        relatedType: 'personal_project',
        link: `/projects/personal/${project.id}`
      });
      console.log('Notification created successfully');
      io.to(`user_${project.userId}`).emit('notification', notification);
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }
  
  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Delete personal project
// @route   DELETE /api/personal-projects/:id
// @access  Private
exports.deletePersonalProject = asyncHandler(async (req, res, next) => {
  const project = await PersonalProject.findByPk(req.params.id);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user owns the project
  if (project.userId !== req.user.id) {
    return next(new ErrorResponse(`User not authorized to delete this project`, 401));
  }
  
  // Delete associated tasks first
  await PersonalTask.destroy({
    where: { projectId: req.params.id }
  });
  
  // Delete project
  await project.destroy();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get project stats (counts by status)
// @route   GET /api/personal-projects/:id/stats
// @access  Private
exports.getProjectStats = asyncHandler(async (req, res, next) => {
  const project = await PersonalProject.findOne({
    where: { 
      id: req.params.id,
      userId: req.user.id
    }
  });
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }
  
  // Get task counts by status
  const taskCounts = await PersonalTask.findAll({
    where: { projectId: req.params.id },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });
  
  // Get overdue tasks count
  const overdueCount = await PersonalTask.count({
    where: {
      projectId: req.params.id,
      dueDate: {
        [Op.lt]: new Date()
      },
      status: {
        [Op.notIn]: ['completed', 'cancelled']
      }
    }
  });
  
  res.status(200).json({
    success: true,
    data: {
      taskCounts,
      overdueCount
    }
  });
});