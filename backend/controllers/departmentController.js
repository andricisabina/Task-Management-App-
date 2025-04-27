const { Department, User, ProfessionalProject, sequelize } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
exports.getDepartments = asyncHandler(async (req, res, next) => {
  const departments = await Department.findAll({
    order: [['name', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments
  });
});

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
exports.getDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findByPk(req.params.id, {
    include: [
      {
        model: User,
        attributes: ['id', 'name', 'email', 'profilePhoto']
      },
      {
        model: ProfessionalProject,
        attributes: ['id', 'title', 'status']
      }
    ]
  });
  
  if (!department) {
    return next(new ErrorResponse(`Department not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: department
  });
});

// @desc    Create department
// @route   POST /api/departments
// @access  Private/Admin
exports.createDepartment = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to create departments`, 401));
  }
  
  const department = await Department.create(req.body);
  
  res.status(201).json({
    success: true,
    data: department
  });
});

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
exports.updateDepartment = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to update departments`, 401));
  }
  
  let department = await Department.findByPk(req.params.id);
  
  if (!department) {
    return next(new ErrorResponse(`Department not found with id of ${req.params.id}`, 404));
  }
  
  department = await department.update(req.body);
  
  res.status(200).json({
    success: true,
    data: department
  });
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
exports.deleteDepartment = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to delete departments`, 401));
  }
  
  const department = await Department.findByPk(req.params.id);
  
  if (!department) {
    return next(new ErrorResponse(`Department not found with id of ${req.params.id}`, 404));
  }
  
  // Check if department has users
  const userCount = await User.count({
    where: { departmentId: req.params.id }
  });
  
  if (userCount > 0) {
    return next(new ErrorResponse(`Cannot delete department with associated users`, 400));
  }
  
  // Check if department has projects
  const projectCount = await ProfessionalProject.count({
    where: { departmentId: req.params.id }
  });
  
  if (projectCount > 0) {
    return next(new ErrorResponse(`Cannot delete department with associated projects`, 400));
  }
  
  await department.destroy();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get department statistics
// @route   GET /api/departments/:id/stats
// @access  Private
exports.getDepartmentStats = asyncHandler(async (req, res, next) => {
  const department = await Department.findByPk(req.params.id);
  
  if (!department) {
    return next(new ErrorResponse(`Department not found with id of ${req.params.id}`, 404));
  }
  
  // Get users count
  const usersCount = await User.count({
    where: { departmentId: req.params.id }
  });
  
  // Get projects count and status breakdown
  const projectStats = await ProfessionalProject.findAll({
    where: { departmentId: req.params.id },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });
  
  // Get completion rate
  const totalProjects = await ProfessionalProject.count({
    where: { departmentId: req.params.id }
  });
  
  const completedProjects = await ProfessionalProject.count({
    where: { 
      departmentId: req.params.id,
      status: 'completed'
    }
  });
  
  const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
  
  // Get active users (users with assigned tasks)
  const { ProfessionalTask } = require('../models');
  const activeUsers = await User.findAll({
    where: { departmentId: req.params.id },
    include: [{
      model: ProfessionalTask,
      as: 'assignedTasks',
      where: {
        status: { [Op.notIn]: ['completed', 'cancelled', 'rejected'] }
      },
      required: true
    }],
    attributes: ['id', 'name', 'email']
  });
  
  res.status(200).json({
    success: true,
    data: {
      usersCount,
      projectStats,
      completionRate,
      activeUsers: activeUsers.length,
      totalProjects,
      completedProjects
    }
  });
});