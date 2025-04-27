const express = require('express');
const router = express.Router();
const {
  getCalendarTasks,
  getDailyCalendar,
  getWeeklyCalendar,
  getMonthlyCalendar
} = require('../controllers/calendarController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getCalendarTasks);
router.get('/daily/:date', getDailyCalendar);
router.get('/weekly/:startDate', getWeeklyCalendar);
router.get('/monthly/:year/:month', getMonthlyCalendar);

module.exports = router;