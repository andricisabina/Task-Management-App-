const { ProfessionalProject, ProfessionalTask, User, Department, ProjectMember, sequelize } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

// @desc    Get all professional projects user has access to
// @route   GET /api/professional-projects
// @access  Private
exports.getProfessionalProjects = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const projects = await ProfessionalProject.findAll({
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'email']
      },
      {
        model: User,
        through: { attributes: [] },
        attributes: ['id', 'username', 'email']
      },
      {
        model: Department,
        as: 'departments',
        through: { attributes: [] },
        attributes: ['id', 'name', 'color']
      }
    ],
    where: {
      [Op.or]: [
        { creatorId: userId },
        { '$Users.id$': userId }
      ]
    }
  });
  
  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects
  });
});

// @desc    Get single professional project
// @route   GET /api/professional-projects/:id
// @access  Private
exports.getProfessionalProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const project = await ProfessionalProject.findOne({
    where: {
      id,
      [Op.or]: [
        { creatorId: userId },
        { '$Users.id$': userId }
      ]
    },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'email']
      },
      {
        model: User,
        through: { attributes: [] },
        attributes: ['id', 'username', 'email']
      },
      {
        model: Department,
        as: 'departments',
        through: { attributes: [] },
        attributes: ['id', 'name', 'color']
      }
    ]
  });
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${id}`, 404));
  }
  
  // Check if user has access to this project
  const isMember = await ProjectMember.findOne({
    where: {
      userId: req.user.id,
      projectId: id
    }
  });
  
  const isCreator = project.creatorId === req.user.id;
  
  if (!isMember && !isCreator && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to view this project`, 401));
  }
  
  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Create new professional project
// @route   POST /api/professional-projects
// @access  Private
exports.createProfessionalProject = asyncHandler(async (req, res, next) => {
  const { title, description, startDate, dueDate, status, priority, color, members, departments } = req.body;
  const creatorId = req.user.id;
  
  const transaction = await sequelize.transaction();
  
  try {
    const project = await ProfessionalProject.create({
      title,
      description,
      startDate,
      dueDate,
      status,
      priority,
      color,
      creatorId
    }, { transaction });
    
    // Add members if specified
    if (members && Array.isArray(members)) {
      await project.addUsers(members, { transaction });
    }
    
    // Add departments if specified
    if (departments && Array.isArray(departments)) {
      await project.addDepartments(departments, { transaction });
    }
    
    // Add creator as a project member
    await ProjectMember.create({
      userId: req.user.id,
      projectId: project.id
    }, { transaction });
    
    // Add other members if specified
    if (req.body.members && req.body.members.length > 0) {
      const membersToAdd = req.body.members.map(userId => ({
        userId,
        projectId: project.id
      }));
      
      await ProjectMember.bulkCreate(membersToAdd, { transaction });
    }
    
    await transaction.commit();
    
    // Fetch project with relationships
    const createdProject = await ProfessionalProject.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          through: { attributes: [] },
          attributes: ['id', 'username', 'email']
        },
        {
          model: Department,
          as: 'departments',
          through: { attributes: [] },
          attributes: ['id', 'name', 'color']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: createdProject
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Update professional project
// @route   PUT /api/professional-projects/:id
// @access  Private
exports.updateProfessionalProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title, description, startDate, dueDate, status, priority, color, members, departments } = req.body;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Check if user has access to the project
    const project = await ProfessionalProject.findOne({
      where: {
        id,
        [Op.or]: [
          { creatorId: userId },
          { '$Users.id$': userId }
        ]
      },
      include: [
        {
          model: User,
          through: { attributes: [] }
        }
      ]
    });

    if (!project) {
      return next(new ErrorResponse(`Project not found with id of ${id}`, 404));
    }

    // Only creator can update project details
    if (project.creatorId === userId) {
      await project.update({
        title,
        description,
        startDate,
        dueDate,
        status,
        priority,
        color
      }, { transaction });

      // Update members if specified
      if (members && Array.isArray(members)) {
        await project.setUsers([userId, ...members], { transaction });
      }

      // Update departments if specified
      if (departments && Array.isArray(departments)) {
        await project.setDepartments(departments, { transaction });
      }
    } else {
      return next(new ErrorResponse(`User not authorized to update this project`, 401));
    }
    
    await transaction.commit();
    
    // Fetch updated project with relationships
    const updatedProject = await ProfessionalProject.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          through: { attributes: [] },
          attributes: ['id', 'username', 'email']
        },
        {
          model: Department,
          as: 'departments',
          through: { attributes: [] },
          attributes: ['id', 'name', 'color']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

// @desc    Delete professional project
// @route   DELETE /api/professional-projects/:id
// @access  Private
exports.deleteProfessionalProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const project = await ProfessionalProject.findOne({
    where: {
      id,
      creatorId: userId
    }
  });
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${id}`, 404));
  }
  
  // Check if user is creator or admin
  if (project.creatorId !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to delete this project`, 401));
  }
  
  const transaction = await sequelize.transaction();
  
  try {
    // Delete all related tasks
    await ProfessionalTask.destroy({
      where: { projectId: id },
      transaction
    });
    
    // Delete all project members
    await ProjectMember.destroy({
      where: { projectId: id },
      transaction
    });
    
    // Delete project
    await project.destroy({ transaction });
    
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

// @desc    Add member to professional project
// @route   POST /api/professional-projects/:id/members
// @access  Private
exports.addProjectMember = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  const { id: projectId } = req.params;
  
  if (!userId) {
    return next(new ErrorResponse('Please provide a user ID', 400));
  }
  
  const project = await ProfessionalProject.findByPk(projectId);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${projectId}`, 404));
  }
  
  // Check if user is creator or admin
  if (project.creatorId !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to update this project`, 401));
  }
  
  // Check if user exists
  const user = await User.findByPk(userId);
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
  }
  
  // Check if member already exists
  const existingMember = await ProjectMember.findOne({
    where: { userId, projectId }
  });
  
  if (existingMember) {
    return next(new ErrorResponse(`User is already a member of this project`, 400));
  }
  
  // Add member
  await ProjectMember.create({ userId, projectId });
  
  res.status(200).json({
    success: true,
    message: 'Member added successfully'
  });
});

// @desc    Remove member from professional project
// @route   DELETE /api/professional-projects/:id/members/:userId
// @access  Private
exports.removeProjectMember = asyncHandler(async (req, res, next) => {
  const { id: projectId, userId } = req.params;
  
  const project = await ProfessionalProject.findByPk(projectId);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${projectId}`, 404));
  }
  
  // Check if user is creator or admin
  if (project.creatorId !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to update this project`, 401));
  }
  
  // Cannot remove the creator
  if (parseInt(userId) === project.creatorId) {
    return next(new ErrorResponse(`Cannot remove the project creator`, 400));
  }
  
  // Remove member
  await ProjectMember.destroy({
    where: { userId, projectId }
  });
  
  res.status(200).json({
    success: true,
    message: 'Member removed successfully'
  });
});

// @desc    Get project statistics
// @route   GET /api/professional-projects/:id/stats
// @access  Private
exports.getProjectStats = asyncHandler(async (req, res, next) => {
  const project = await ProfessionalProject.findByPk(req.params.id);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }
  
  // Task counts by status
  const taskStats = await ProfessionalTask.findAll({
    where: { projectId: req.params.id },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });
  
  // Task counts by assigned user
  const userStats = await ProfessionalTask.findAll({
    where: { projectId: req.params.id },
    attributes: [
      'assignedToId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completed']
    ],
    include: [{
      model: User,
      as: 'assignedTo',
      attributes: ['name']
    }],
    group: ['assignedToId']
  });
  
  // Overdue tasks
  const overdueTasks = await ProfessionalTask.count({
    where: {
      projectId: req.params.id,
      dueDate: { [Op.lt]: new Date() },
      status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
    }
  });
  
  res.status(200).json({
    success: true,
    data: {
      taskStats,
      userStats,
      overdueTasks,
      completionRate: project.completionRate
    }
  });
});