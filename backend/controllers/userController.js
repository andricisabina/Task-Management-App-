const { User, Department } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer storage for profile photos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/profile';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Use user ID + timestamp + file extension for unique filenames
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

// Check file type is image
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  
  // Check extension
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mime
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize upload
const upload = multer({
  storage,
  limits: { fileSize: 1000000 }, // 1MB
  fileFilter
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.findAll({
    attributes: { exclude: ['password'] },
    include: [{ model: Department }]
  });
  
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [{ model: Department }]
  });
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);
  
  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  
  await user.update(req.body);
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  
  await user.destroy();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload profile photo
// @route   PUT /api/users/profile-upload
// @access  Private
exports.uploadProfilePhoto = asyncHandler(async (req, res, next) => {
  const uploadMiddleware = upload.single('photo');
  
  uploadMiddleware(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return next(new ErrorResponse(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(new ErrorResponse(err.message, 400));
    }
    
    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }
    
    // Only allow the authenticated user to update their own photo (no role check)
    const user = await User.findByPk(req.user.id);
    
    // Delete old profile photo if exists
    if (user.profilePhoto) {
      const oldPhotoPath = path.join(__dirname, '..', user.profilePhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }
    
    // Update user with new profile photo path
    await user.update({
      profilePhoto: req.file.path.replace(/\\/g, '/')
    });
    
    res.status(200).json({
      success: true,
      data: {
        profilePhoto: user.profilePhoto
      }
    });
  });
});

// @desc    Get users by department
// @route   GET /api/users/department/:departmentId
// @access  Private
exports.getUsersByDepartment = asyncHandler(async (req, res, next) => {
  const { departmentId } = req.params;
  
  const users = await User.findAll({
    where: { departmentId },
    attributes: { exclude: ['password'] }
  });
  
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Search user by email
// @route   GET /api/users/search
// @access  Private
exports.searchUserByEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.query;
  if (!email) return next(new ErrorResponse('Email required', 400));
  const user = await User.findOne({ where: { email }, attributes: ['id', 'name', 'email'] });
  if (!user) return next(new ErrorResponse('User not found', 404));
  res.status(200).json({ user });
});