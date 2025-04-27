const express = require('express');
const router = express.Router();
const {
  getPersonalTasks,
  getPersonalTask,
  createPersonalTask,
  updatePersonalTask,
  deletePersonalTask,
  getTaskStats,
  bulkUpdateTasks
} = require('../controllers/personalTaskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getPersonalTasks)
  .post(createPersonalTask);

router.route('/:id')
  .get(getPersonalTask)
  .put(updatePersonalTask)
  .delete(deletePersonalTask);

router.get('/stats', getTaskStats);
router.put('/bulk-update', bulkUpdateTasks);

module.exports = router;