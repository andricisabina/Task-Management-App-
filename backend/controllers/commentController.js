const { Comment, User, ProfessionalTask, Notification } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all comments for a task
// @route   GET /api/comments/task/:taskId
// @access  Private
exports.getCommentsByTask = asyncHandler(async (req, res, next) => {
  const comments = await Comment.findAll({
    where: { taskId: req.params.taskId },
    include: [{
      model: User,
      attributes: ['id', 'name', 'profilePhoto']
    }],
    order: [['createdAt', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments
  });
});

// @desc    Get single comment
// @route   GET /api/comments/:id
// @access  Private
exports.getComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findByPk(req.params.id, {
    include: [{
      model: User,
      attributes: ['id', 'name', 'profilePhoto']
    }]
  });
  
  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Create comment
// @route   POST /api/comments
// @access  Private
exports.createComment = asyncHandler(async (req, res, next) => {
  // Add user ID to body
  req.body.userId = req.user.id;
  
  // Check if task exists
  const task = await ProfessionalTask.findByPk(req.body.taskId);
  
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${req.body.taskId}`, 404));
  }
  
  const comment = await Comment.create(req.body);
  
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
    const io = req.app.get('io');
    io.to(`user_${task.assignedToId}`).emit('notification', {
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
    const io = req.app.get('io');
    io.to(`user_${task.assignedById}`).emit('notification', {
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

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
exports.updateComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findByPk(req.params.id);
  
  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user owns the comment
  if (comment.userId !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to update this comment`, 401));
  }
  
  // Mark as edited
  req.body.isEdited = true;
  
  // Update comment
  comment = await comment.update(req.body);
  
  // Get updated comment with user data
  const updatedComment = await Comment.findByPk(comment.id, {
    include: [{
      model: User,
      attributes: ['id', 'name', 'profilePhoto']
    }]
  });
  
  res.status(200).json({
    success: true,
    data: updatedComment
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findByPk(req.params.id);
  
  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user owns the comment
  if (comment.userId !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User not authorized to delete this comment`, 401));
  }
  
  await comment.destroy();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});