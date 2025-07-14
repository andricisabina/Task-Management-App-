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
const { User } = require('../models');

// All routes below require authentication
router.use(protect);

// User search and department search are available to all authenticated users
router.get('/search', searchUserByEmail);
router.get('/department/:departmentId', getUsersByDepartment);
router.get('/project/:projectId', getUsersForProject);

// Profile photo upload (for all users) - MUST come before /:id route
router.put('/profile-upload', uploadProfilePhoto);

// Serve user profile photo from DB
router.get('/:id/photo', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || !user.profilePhoto) return res.status(404).send('Not found');
    // If you store the MIME type, use it; otherwise, default to jpeg
    res.set('Content-Type', user.profilePhotoType || 'image/jpeg');
    res.send(user.profilePhoto);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Admin only routes
router.route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;