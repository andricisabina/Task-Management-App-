const { ProfessionalProject, ProfessionalTask, User, Department, ProjectMember, sequelize, Comment, Notification, Attachment } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

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
          { '$ProjectMembers.userId$': userId }
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
        { '$ProjectMembers.userId$': userId }
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
        as: 'ProfessionalTasks',
        include: [
          {
            model: User,
            as: 'assignedTo',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Attachment,
            attributes: ['id', 'fileName', 'filePath', 'fileSize', 'fileType', 'description', 'uploadedBy'],
            include: [{
              model: User,
              as: 'uploader',
              attributes: ['id', 'name']
            }]
          }
        ]
      }
    ],
    order: [[{ model: ProfessionalTask, as: 'ProfessionalTasks' }, 'dueDate', 'ASC']]
  });
  
  console.log('Fetched project:', project ? project.id : null);
  console.log('Fetched project.departments:', project && project.departments ? project.departments : null);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${id}`, 404));
  }

  // Enrich each department with leader info
  if (project.departments && project.departments.length > 0) {
    const { User } = require('../models');
    for (const dept of project.departments) {
      const leaderId = dept.ProfessionalProjectDepartment?.leaderId;
      if (leaderId) {
        const leader = await User.findByPk(leaderId, { attributes: ['id', 'name', 'email'] });
        dept.setDataValue('leader', leader);
      } else {
        dept.setDataValue('leader', null);
      }
    }
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
      if (!dept.leaderEmail) {
        throw new ErrorResponse('Leader email is required for each department', 400);
      }
      let leader = await User.findOne({ where: { email: dept.leaderEmail } });
      if (!leader) {
        // Optionally, create a new user with this email
        const randomPassword = Math.random().toString(36).slice(-12);
        leader = await User.create({ email: dept.leaderEmail, name: dept.leaderEmail.split('@')[0], password: randomPassword }, { transaction });
      }

      // Add department to project (ensure link in ProjectDepartments table)
      await project.addDepartment(dept.departmentId, { through: { leaderId: leader.id }, transaction });

      // Use findOrCreate to robustly prevent duplicates and set correct role/status
      const [member, created] = await ProjectMember.findOrCreate({
        where: {
          userId: leader.id,
          projectId: project.id,
          departmentId: dept.departmentId
        },
        defaults: {
          role: 'leader',
          status: 'accepted',
          invitedById: creatorId
        },
        transaction
      });

      if (!created && (member.role !== 'leader' || member.status !== 'accepted')) {
        await member.update({
          role: 'leader',
          status: 'accepted',
          invitedById: creatorId
        }, { transaction });
      }

      // Send invitation email (sample)
      try {
        const acceptUrl = `http://localhost:5173/login`;
        await sendEmail({
          to: leader.email,
          subject: `Invitation to lead department in project: ${title}`,
          html: `<p>Hello ${leader.name},</p>
                 <p>You have been invited to be the leader of the department in the project: <b>${title}</b>.</p>
                 <p>Please click the button below to log in:</p>
                 <a href="${acceptUrl}" style="display:inline-block;padding:10px 20px;background:#1890ff;color:#fff;text-decoration:none;border-radius:4px;">Log In</a>
                 <p>If the button does not work, copy and paste this link into your browser:</p>
                 <p><a href="${acceptUrl}">${acceptUrl}</a></p>
                 <p>Thank you!</p>`
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
  const { title, description, startDate, dueDate, status, priority, color, members, departments, newDepartments } = req.body;

  // Add logging for debugging
  console.log('--- updateProfessionalProject payload ---');
  console.log('req.body:', JSON.stringify(req.body, null, 2));
  console.log('departments:', departments);
  console.log('newDepartments:', newDepartments);

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
        },
        {
          model: Department,
          as: 'departments',
          through: { attributes: ['leaderId'] },
          attributes: ['id']
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

      // Update departments if specified (existing departments only)
      if (departments && Array.isArray(departments)) {
        await project.setDepartments(departments, { transaction });
      }

      // Add new departments and leaders if provided
      if (newDepartments && Array.isArray(newDepartments)) {
        // Get current department IDs
        const currentDeptIds = project.departments.map(d => d.id);
        for (const dept of newDepartments) {
          if (currentDeptIds.includes(dept.departmentId)) continue; // skip if already involved
          // Validate leaderEmail
          if (!dept.leaderEmail) {
            throw new ErrorResponse('Leader email is required for new departments', 400);
          }
          // Find or create leader
          let leader = await User.findOne({ where: { email: dept.leaderEmail } });
          if (!leader) {
            const randomPassword = Math.random().toString(36).slice(-12);
            leader = await User.create({ email: dept.leaderEmail, name: dept.leaderEmail.split('@')[0], password: randomPassword }, { transaction });
          }
          // Add department to project with leaderId
          await project.addDepartment(dept.departmentId, { through: { leaderId: leader.id }, transaction });
          // Use findOrCreate to avoid duplicate ProjectMember
          await ProjectMember.findOrCreate({
            where: {
              userId: leader.id,
              projectId: project.id,
              departmentId: dept.departmentId
            },
            defaults: {
              role: 'leader',
              status: 'accepted',
              invitedById: userId
            },
            transaction
          });
          // Send invitation email
          try {
            await sendEmail({
              to: leader.email,
              subject: `Invitation to lead department in project: ${project.title}`,
              text: `Hello ${leader.name},\n\nYou have been invited to be the leader of the department in the project: ${project.title}.\nPlease log in to accept the invitation.\n\nThank you!`
            });
          } catch (emailErr) {
            console.error('Failed to send leader invitation email:', emailErr);
          }
        }
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
          through: { attributes: ['leaderId'] },
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
    // Add more specific error logging
    console.error('updateProfessionalProject error:', error);
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
    return next(new ErrorResponse(`You don't have permission to delete this project. Only project managers can delete projects.`, 401));
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
  const { userId, departmentId } = req.body;
  const { id: projectId } = req.params;
  
  if (!userId) {
    return next(new ErrorResponse('Please provide a user ID', 400));
  }
  
  const project = await ProfessionalProject.findByPk(projectId);
  
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${projectId}`, 404));
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

  // Authorization: manager/admin or department leader for this department
  let isAuthorized = false;
  if (project.creatorId === req.user.id || req.user.role === 'admin') {
    isAuthorized = true;
  } else if (departmentId) {
    // Check if requester is leader for this department
    const leader = await ProjectMember.findOne({
      where: {
        userId: req.user.id,
        projectId,
        departmentId,
        role: 'leader',
        status: 'accepted'
      }
    });
    if (leader) isAuthorized = true;
  }
  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to add member to this department/project', 401));
  }

  // Add member (with departmentId if provided)
  await ProjectMember.create({ userId, projectId, departmentId: departmentId || null });

  // Fetch and return the updated project with all members and user info
  const updatedProject = await ProfessionalProject.findOne({
    where: { id: projectId },
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      {
        model: ProjectMember,
        as: 'ProjectMembers',
        attributes: ['userId', 'departmentId', 'role', 'status'],
        required: false,
        include: [{ model: User, as: 'member', attributes: ['id', 'name', 'email'] }]
      },
      {
        model: Department,
        as: 'departments',
        through: { attributes: ['leaderId'] },
        attributes: ['id', 'name', 'color']
      }
    ]
  });
  return res.status(200).json({ success: true, data: updatedProject });
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
  
  // Debug: log all tasks for this project
  const debugTasks = await ProfessionalTask.findAll({ where: { projectId: req.params.id } });
  console.log(`[DEBUG] Tasks for project ${req.params.id}:`, debugTasks.map(t => t.toJSON()));
  
  // Task counts by assigned user
  const userStats = await ProfessionalTask.findAll({
    where: { projectId: req.params.id },
    paranoid: false,
    attributes: [
      'assignedToId',
      [sequelize.fn('COUNT', sequelize.col('ProfessionalTask.id')), 'total'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completed'],
    ],
    group: ['assignedToId'],
    include: [
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name']
      }
    ]
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

// @desc    Accept project leader invitation
// @route   POST /api/professional-projects/:id/accept-leader
// @access  Private
exports.acceptLeaderInvitation = asyncHandler(async (req, res, next) => {
  const project = await ProfessionalProject.findByPk(req.params.id);
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }

  // Find the project member record
  const projectMember = await ProjectMember.findOne({
    where: {
      projectId: project.id,
      userId: req.user.id,
      role: 'leader',
      status: 'invited'
    }
  });

  if (!projectMember) {
    return next(new ErrorResponse('No pending leader invitation found for this project', 404));
  }

  // Update the status to accepted
  await projectMember.update({ status: 'accepted' });

  // Create notification for project creator
  const notification = await Notification.create({
    userId: project.creatorId,
    title: 'Leader Invitation Accepted',
    message: `${req.user.name} has accepted the leader invitation for project: ${project.title}`,
    type: 'project_update',
    relatedId: project.id,
    relatedType: 'professional_project',
    link: `/projects/professional/${project.id}`
  });

  const io = req.app.get('io');
  io.to(`user_${project.creatorId}`).emit('notification', notification.toJSON());

  res.status(200).json({
    success: true,
    data: projectMember
  });
});

// @desc    Reject project leader invitation
// @route   POST /api/professional-projects/:id/reject-leader
// @access  Private
exports.rejectLeaderInvitation = asyncHandler(async (req, res, next) => {
  const project = await ProfessionalProject.findByPk(req.params.id);
  if (!project) {
    return next(new ErrorResponse(`Project not found with id of ${req.params.id}`, 404));
  }

  // Find the project member record
  const projectMember = await ProjectMember.findOne({
    where: {
      projectId: project.id,
      userId: req.user.id,
      role: 'leader',
      status: 'invited'
    }
  });

  if (!projectMember) {
    return next(new ErrorResponse('No pending leader invitation found for this project', 404));
  }

  // Update the status to declined
  await projectMember.update({ status: 'declined' });

  // Create notification for project creator
  const notification = await Notification.create({
    userId: project.creatorId,
    title: 'Leader Invitation Rejected',
    message: `${req.user.name} has rejected the leader invitation for project: ${project.title}`,
    type: 'project_update',
    relatedId: project.id,
    relatedType: 'professional_project',
    link: `/projects/professional/${project.id}`
  });

  const io = req.app.get('io');
  io.to(`user_${project.creatorId}`).emit('notification', notification.toJSON());

  res.status(200).json({
    success: true,
    data: projectMember
  });
});

// TEMP TEST ENDPOINT: Verify project-department association
exports.testProjectDepartments = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const project = await ProfessionalProject.findByPk(id, {
    include: [
      {
        model: Department,
        as: 'departments',
        through: { attributes: ['leaderId'] },
        attributes: ['id', 'name', 'color']
      }
    ]
  });
  console.log('TEST project.departments:', project && project.departments ? project.departments : null);
  res.status(200).json({
    success: true,
    departments: project ? project.departments : null
  });
});

// @desc    Accept leader invitation
// @route   GET /api/professional-projects/accept-leader-invitation
// @access  Public
exports.acceptLeaderInvitation = asyncHandler(async (req, res, next) => {
  const { projectId, departmentId, userId, token } = req.query;
  if (!projectId || !departmentId || !userId || !token) {
    return res.status(400).json({ success: false, message: 'Missing parameters.' });
  }

  const member = await ProjectMember.findOne({
    where: {
      userId,
      projectId,
      departmentId,
      role: 'leader',
      status: 'invited',
      leaderInvitationToken: token
    }
  });

  if (!member) {
    return res.status(400).json({ success: false, message: 'Invalid or expired invitation link.' });
  }

  await member.update({ status: 'accepted', leaderInvitationToken: null });

  res.status(200).json({ success: true, message: 'You have successfully accepted the leader invitation. You can now create tasks for your department.' });
});