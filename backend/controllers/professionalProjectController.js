const { ProfessionalProject, ProfessionalTask, User, Department, ProjectMember, sequelize, Comment } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all professional projects user has access to
// @route   GET /api/professional-projects
// @access  Private
exports.getProfessionalProjects = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Find all projects where user is creator (manager) or assigned as leader
    const projects = await ProfessionalProject.findAll({
      where: {
        [Op.or]: [
          { creatorId: userId },
          { '$ProjectMembers.userId$': userId, '$ProjectMembers.role$': 'leader' }
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ProjectMember,
          as: 'ProjectMembers',
          attributes: ['userId', 'departmentId', 'role', 'status'],
          where: { role: 'leader' },
          required: false,
          include: [{ model: User, as: 'member', attributes: ['id', 'name', 'email'] }]
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
      count: projects.length,
      data: projects
    });
  } catch (err) {
    console.error('Error in getProfessionalProjects:', err);
    return next(new ErrorResponse('Failed to fetch professional projects', 500));
  }
});

// @desc    Get single professional project
// @route   GET /api/professional-projects/:id
// @access  Private
exports.getProfessionalProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Only allow access if user is creator or assigned as leader
  const project = await ProfessionalProject.findOne({
    where: {
      id,
      [Op.or]: [
        { creatorId: userId },
        { '$ProjectMembers.userId$': userId, '$ProjectMembers.role$': 'leader' }
      ]
    },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      },
      {
        model: ProjectMember,
        as: 'ProjectMembers',
        attributes: ['userId', 'departmentId', 'role', 'status'],
        where: { role: 'leader' },
        required: false,
        include: [{ model: User, as: 'member', attributes: ['id', 'name', 'email'] }]
      },
      {
        model: Department,
        as: 'departments',
        through: { attributes: ['leaderId'] },
        attributes: ['id', 'name', 'color']
      },
      {
        model: ProfessionalTask,
        order: [['dueDate', 'ASC']]
      }
    ]
  });
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${id}`, 404));
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
  const { title, description, startDate, dueDate, status, priority, color, departments } = req.body;
  const creatorId = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    // 1. Create the project
    const project = await ProfessionalProject.create({
      title, description, startDate, dueDate, status, priority, color, creatorId
    }, { transaction });

    // 2. Add creator as manager
    await ProjectMember.create({
      userId: creatorId,
      projectId: project.id,
      role: 'manager',
      status: 'accepted'
    }, { transaction });

    // 3. For each department: add ProjectDepartment, invite leader
    for (const dept of departments) {
      // dept: { departmentId, leaderEmail }
      let leader = await User.findOne({ where: { email: dept.leaderEmail } });
      if (!leader) {
        // Optionally, create a new user with this email
        leader = await User.create({ email: dept.leaderEmail, name: dept.leaderEmail.split('@')[0] }, { transaction });
      }

      // Add to ProjectDepartment with leaderId
      await project.addDepartment(dept.departmentId, { through: { leaderId: leader.id }, transaction });

      // Add leader as ProjectMember (role: 'leader', status: 'invited')
      await ProjectMember.create({
        userId: leader.id,
        projectId: project.id,
        departmentId: dept.departmentId,
        role: 'leader',
        status: 'invited',
        invitedById: creatorId
      }, { transaction });

      // Send invitation email (sample)
      try {
        await sendEmail({
          to: leader.email,
          subject: `Invitation to lead department in project: ${title}`,
          text: `Hello ${leader.name},\n\nYou have been invited to be the leader of the department in the project: ${title}.\nPlease log in to accept the invitation.\n\nThank you!`
        });
      } catch (emailErr) {
        console.error('Failed to send leader invitation email:', emailErr);
      }
    }

    await transaction.commit();

    // Fetch and return the created project with relationships
    const createdProject = await ProfessionalProject.findByPk(project.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, through: { attributes: [] }, attributes: ['id', 'name', 'email'] },
        { model: Department, as: 'departments', through: { attributes: ['leaderId'] }, attributes: ['id', 'name', 'color'] }
      ]
    });

    res.status(201).json({ success: true, data: createdProject });
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
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          through: { attributes: [] },
          attributes: ['id', 'name', 'email']
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

// @desc    Get all comments for a professional project (with replies)
// @route   GET /api/professional-projects/:id/comments
// @access  Private
exports.getProjectComments = asyncHandler(async (req, res, next) => {
  const projectId = req.params.id;
  // Only members or creator can view comments
  const project = await ProfessionalProject.findByPk(projectId, {
    include: [{ model: User, attributes: ['id'] }]
  });
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${projectId}`, 404));
  }
  const isMember = project.Users.some(u => u.id === req.user.id);
  const isCreator = project.creatorId === req.user.id;
  if (!isMember && !isCreator && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to view comments for this project', 401));
  }
  // Fetch all comments for this project (taskId is null for project comments)
  const comments = await Comment.findAll({
    where: { projectId, parentId: null },
    include: [{ model: User, attributes: ['id', 'name', 'profilePhoto'] }],
    order: [['createdAt', 'ASC']]
  });
  // Fetch replies for each comment
  const commentIds = comments.map(c => c.id);
  const replies = await Comment.findAll({
    where: { parentId: commentIds },
    include: [{ model: User, attributes: ['id', 'name', 'profilePhoto'] }],
    order: [['createdAt', 'ASC']]
  });
  // Attach replies to parent comments
  const repliesByParent = {};
  replies.forEach(reply => {
    if (!repliesByParent[reply.parentId]) repliesByParent[reply.parentId] = [];
    repliesByParent[reply.parentId].push(reply);
  });
  // Normalize user field for comments and replies
  const commentsWithReplies = comments.map(comment => {
    const c = comment.toJSON();
    c.user = c.user || c.User;
    delete c.User;
    c.replies = (repliesByParent[comment.id] || []).map(reply => {
      const r = reply.toJSON();
      r.user = r.user || r.User;
      delete r.User;
      return r;
    });
    return c;
  });
  res.status(200).json({ success: true, data: commentsWithReplies });
});

// @desc    Add a comment to a professional project
// @route   POST /api/professional-projects/:id/comments
// @access  Private
exports.addProjectComment = asyncHandler(async (req, res, next) => {
  const projectId = req.params.id;
  const { content, parentId } = req.body;
  // Only members or creator can comment
  const project = await ProfessionalProject.findByPk(projectId, {
    include: [{ model: User, attributes: ['id'] }]
  });
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${projectId}`, 404));
  }
  const isMember = project.Users.some(u => u.id === req.user.id);
  const isCreator = project.creatorId === req.user.id;
  if (!isMember && !isCreator && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to comment on this project', 401));
  }
  // Create comment
  const comment = await Comment.create({
    content,
    userId: req.user.id,
    projectId,
    parentId: parentId || null
  });
  // Fetch comment with user data
  const commentWithUser = await Comment.findByPk(comment.id, {
    include: [{ model: User, attributes: ['id', 'name', 'profilePhoto'] }]
  });
  // Normalize user field
  const c = commentWithUser.toJSON();
  c.user = c.user || c.User;
  delete c.User;
  res.status(201).json({ success: true, data: c });
});

// @desc    Edit a comment on a professional project
// @route   PUT /api/professional-projects/:projectId/comments/:commentId
// @access  Private
exports.editProjectComment = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const comment = await Comment.findByPk(commentId);
  if (!comment) {
    return next(new ErrorResponse('Comment not found', 404));
  }
  // Only author or admin can edit
  if (comment.userId !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to edit this comment', 401));
  }
  comment.content = content;
  comment.isEdited = true;
  await comment.save();
  // Fetch with user
  const commentWithUser = await Comment.findByPk(comment.id, {
    include: [{ model: User, attributes: ['id', 'name', 'profilePhoto'] }]
  });
  // Normalize user field
  const c = commentWithUser.toJSON();
  c.user = c.user || c.User;
  delete c.User;
  res.status(200).json({ success: true, data: c });
});

// @desc    Delete a comment on a professional project
// @route   DELETE /api/professional-projects/:projectId/comments/:commentId
// @access  Private
exports.deleteProjectComment = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;
  const comment = await Comment.findByPk(commentId);
  if (!comment) {
    return next(new ErrorResponse('Comment not found', 404));
  }
  // Only author or admin can delete
  if (comment.userId !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this comment', 401));
  }
  await comment.destroy();
  res.status(200).json({ success: true, data: {} });
});