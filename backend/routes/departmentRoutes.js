const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getDepartments)
  .post(authorize('admin'), createDepartment);

router.route('/:id')
  .get(getDepartment)
  .put(authorize('admin'), updateDepartment)
  .delete(authorize('admin'), deleteDepartment);

router.get('/:id/stats', getDepartmentStats);

module.exports = router;