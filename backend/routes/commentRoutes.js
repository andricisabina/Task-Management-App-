const express = require('express');
const router = express.Router();
const {
  getCommentsByTask,
  getComment,
  createComment,
  updateComment,
  deleteComment
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(createComment);

router.route('/:id')
  .get(getComment)
  .put(updateComment)
  .delete(deleteComment);

router.get('/task/:taskId', getCommentsByTask);

module.exports = router;