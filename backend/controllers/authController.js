const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { ROLES } = require('../config/constants');
const { blockUser, unblockUser } = require('../utils/tokenBlocklist');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRE || '1d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return next(new AppError('User already exists with this email', 400));
    }

    // Create user - role is always tester on self-registration
    const user = await User.create({
      email,
      password_hash: password,
      first_name,
      last_name,
      role: ROLES.TESTER
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(new AppError('Please provide username and password', 400));
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Check if user is active
    if (!user.is_active) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone } = req.body;

    const user = await User.findByPk(req.user.id);
    
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (phone) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Please provide current and new password', 400));
    }

    const user = await User.findByPk(req.user.id);

    // Check current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Update password
    user.password_hash = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active'],
      where: { is_active: true }
    });

    // Format user names
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      email: user.email,
      role: user.role
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate a user account (immediately invalidates their JWT via Redis blocklist)
// @route   PUT /api/auth/users/:id/deactivate
// @access  Private/Admin
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.id === req.user.id) {
      return next(new AppError('You cannot deactivate your own account', 400));
    }

    await user.update({ is_active: false });

    // Block all tokens issued before now for this user (Redis-backed; no-op if Redis unavailable)
    await blockUser(user.id);

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been deactivated`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reactivate a user account
// @route   PUT /api/auth/users/:id/reactivate
// @access  Private/Admin
const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await user.update({ is_active: true });

    // Remove blocklist entry so new tokens are accepted
    await unblockUser(user.id);

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been reactivated`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getUsers,
  deactivateUser,
  reactivateUser
};
