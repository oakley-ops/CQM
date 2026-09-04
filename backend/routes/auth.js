const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getUsers,
  deactivateUser,
  reactivateUser
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required')
];

const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
// Registration is admin-only by default (accounts are provisioned, not self-served).
// Set ALLOW_PUBLIC_REGISTRATION=true to re-enable open sign-up.
const registrationGuards =
  process.env.ALLOW_PUBLIC_REGISTRATION === 'true'
    ? []
    : [protect, authorize(ROLES.ADMIN)];
router.post('/register', ...registrationGuards, registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.get('/users', protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), getUsers);
router.put('/users/:id/deactivate', protect, authorize(ROLES.ADMIN), deactivateUser);
router.put('/users/:id/reactivate', protect, authorize(ROLES.ADMIN), reactivateUser);

module.exports = router;
