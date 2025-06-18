const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadProfilePhoto,
  getUsersByDepartment,
  searchUserByEmail,
  getUsersForProject
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes below require authentication
router.use(protect);

// User search and department search are available to all authenticated users
router.get('/search', searchUserByEmail);
router.get('/department/:departmentId', getUsersByDepartment);
router.get('/project/:projectId', getUsersForProject);

// Profile photo upload (for all users) - MUST come before /:id route
router.put('/profile-upload', uploadProfilePhoto);

// Admin only routes
router.route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;