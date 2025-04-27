const express = require('express');
const router = express.Router();
const {
  getUserDashboard,
  getTeamDashboard,
  getProductivityStats,
  getDepartmentProductivity
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/user', getUserDashboard);
router.get('/team', getTeamDashboard);
router.get('/productivity', getProductivityStats);
router.get('/department-productivity/:departmentId', 
  authorize('admin', 'manager'), 
  getDepartmentProductivity);

module.exports = router;