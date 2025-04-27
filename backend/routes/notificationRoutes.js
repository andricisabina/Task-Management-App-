const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getNotifications)
  .post(createNotification);

router.route('/:id')
  .get(getNotification)
  .delete(deleteNotification);

router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/clear-read', clearReadNotifications);

module.exports = router;