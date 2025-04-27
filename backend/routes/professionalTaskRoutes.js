const express = require('express');
const router = express.Router();
const {
  getProfessionalTasks,
  getProfessionalTask,
  createProfessionalTask,
  updateProfessionalTask,
  deleteProfessionalTask,
  addComment,
  uploadAttachment,
  getTaskStats,
  getTasksForCalendar
} = require('../controllers/professionalTaskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getProfessionalTasks)
  .post(createProfessionalTask);

router.route('/:id')
  .get(getProfessionalTask)
  .put(updateProfessionalTask)
  .delete(deleteProfessionalTask);

router.post('/:id/comments', addComment);
router.post('/:id/attachments', uploadAttachment);
router.get('/stats', getTaskStats);
router.get('/calendar', getTasksForCalendar);

module.exports = router;