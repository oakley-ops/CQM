const express = require('express');
const router = express.Router();
const excelExportController = require('../controllers/excelExportController');
const { protect } = require('../middleware/auth');

/**
 * Excel Export Routes (No Google API Required)
 * Downloads Excel files directly - compatible with Google Sheets
 */

/**
 * @route   GET /api/excel-export/projects/:id/documents
 * @desc    Export project documents to Excel
 * @access  Private
 */
router.get('/projects/:id/documents', protect, excelExportController.exportDocumentsToExcel);

/**
 * @route   GET /api/excel-export/projects/:id/tasks
 * @desc    Export project tasks to Excel
 * @access  Private
 */
router.get('/projects/:id/tasks', protect, excelExportController.exportTasksToExcel);

/**
 * @route   GET /api/excel-export/projects/:id/budget
 * @desc    Export project budget and expenses to Excel
 * @access  Private
 */
router.get('/projects/:id/budget', protect, excelExportController.exportBudgetToExcel);

/**
 * @route   GET /api/excel-export/projects/:id/risks
 * @desc    Export project risks to Excel
 * @access  Private
 */
router.get('/projects/:id/risks', protect, excelExportController.exportRisksToExcel);

/**
 * @route   GET /api/excel-export/projects/:id/complete
 * @desc    Export complete project data to Excel (all tabs)
 * @access  Private
 */
router.get('/projects/:id/complete', protect, excelExportController.exportCompleteProjectToExcel);

module.exports = router;
