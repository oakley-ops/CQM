const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

/**
 * Google Sheets Export Routes
 * All routes require authentication
 */

/**
 * @route   GET /api/export/status
 * @desc    Check Google Sheets service status
 * @access  Private
 */
router.get('/status', protect, exportController.checkGoogleSheetsStatus);

/**
 * @route   POST /api/export/projects/:id/documents
 * @desc    Export project documents to Google Sheets
 * @access  Private
 */
router.post('/projects/:id/documents', protect, exportController.exportDocumentsToSheets);

/**
 * @route   POST /api/export/projects/:id/tasks
 * @desc    Export project tasks to Google Sheets
 * @access  Private
 */
router.post('/projects/:id/tasks', protect, exportController.exportTasksToSheets);

/**
 * @route   POST /api/export/projects/:id/budget
 * @desc    Export project budget and expenses to Google Sheets
 * @access  Private
 */
router.post('/projects/:id/budget', protect, exportController.exportBudgetToSheets);

/**
 * @route   POST /api/export/projects/:id/risks
 * @desc    Export project risks to Google Sheets
 * @access  Private
 */
router.post('/projects/:id/risks', protect, exportController.exportRisksToSheets);

/**
 * @route   POST /api/export/projects/:id/complete
 * @desc    Export complete project data to Google Sheets (all tabs)
 * @access  Private
 */
router.post('/projects/:id/complete', protect, exportController.exportCompleteProjectToSheets);

module.exports = router;
