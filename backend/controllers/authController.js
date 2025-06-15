const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { User } = require('../models');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, username, email, password } = req.body;

  if (!username || username.length < 3) {
    return next(new ErrorResponse('Username is required and must be at least 3 characters', 400));
  }

  // Check if username already exists
  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    return next(new ErrorResponse('Username is already taken', 400));
  }

  // Create user
  const user = await User.create({
    name,
    username,
    email,
    password
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ 
    where: { email }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Remove password from response
  const userResponse = user.toJSON();
  delete userResponse.password;

  sendTokenResponse(userResponse, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    username: req.body.username,
    bio: req.body.bio,
    organization: req.body.organization,
    position: req.body.position,
    emailNotifications: req.body.emailNotifications,
    pushNotifications: req.body.pushNotifications
  };

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  await user.update(fieldsToUpdate);

  // Remove password from response
  const userResponse = user.toJSON();
  delete userResponse.password;

  res.status(200).json({
    success: true,
    data: userResponse
  });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  // Remove password from response
  const userResponse = user.toJSON();
  delete userResponse.password;

  sendTokenResponse(userResponse, 200, res);
});

// @desc    Update profile photo
// @route   PUT /api/auth/updatephoto
// @access  Private
exports.updateProfilePhoto = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const user = await User.findByPk(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  user.profilePhoto = req.file.filename;
  await user.save();

  // Remove password from response
  const userResponse = user.toJSON();
  delete userResponse.password;

  res.status(200).json({
    success: true,
    data: userResponse
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user
    });
};

module.exports = {
  register: exports.register,
  login: exports.login,
  getMe: exports.getMe,
  logout: exports.logout,
  updateDetails: exports.updateDetails,
  updatePassword: exports.updatePassword,
  updateProfilePhoto: exports.updateProfilePhoto
};