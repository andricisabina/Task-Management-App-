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
  getTasksForCalendar,
  deleteAttachment
} = require('../controllers/professionalTaskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Register attachment delete route early to avoid conflicts
router.delete('/attachments/:id', deleteAttachment);

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

router.route('/:id/accept').post(require('../controllers/professionalTaskController').acceptProfessionalTask);
router.route('/:id/reject').post(require('../controllers/professionalTaskController').rejectProfessionalTask);
router.route('/:id/request-extension').post(require('../controllers/professionalTaskController').requestDeadlineExtension);
router.route('/:id/approve-extension').post(require('../controllers/professionalTaskController').approveDeadlineExtension);
router.route('/:id/reject-extension').post(require('../controllers/professionalTaskController').rejectDeadlineExtension);

module.exports = router;