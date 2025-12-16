const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { protect } = require('../middleware/auth');

/**
 * Email Routes
 * All routes require authentication
 */

/**
 * @route   GET /api/email/status
 * @desc    Get email configuration status
 * @access  Private
 */
router.get('/status', protect, emailController.getEmailStatus);

/**
 * @route   POST /api/email/verify
 * @desc    Verify email service configuration
 * @access  Private
 */
router.post('/verify', protect, emailController.verifyEmailConfig);

/**
 * @route   POST /api/email/test
 * @desc    Send a test email
 * @access  Private
 */
router.post('/test', protect, emailController.sendTestEmail);

/**
 * @route   POST /api/email/send
 * @desc    Send a custom email
 * @access  Private
 */
router.post('/send', protect, emailController.sendCustomEmail);

/**
 * @route   POST /api/email/reports/:id/executive
 * @desc    Send executive dashboard report via email
 * @access  Private
 */
router.post('/reports/:id/executive', protect, emailController.sendExecutiveDashboard);

/**
 * @route   POST /api/email/reports/:id/status
 * @desc    Send status report via email
 * @access  Private
 */
router.post('/reports/:id/status', protect, emailController.sendStatusReport);

module.exports = router;
