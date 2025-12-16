const express = require('express');
const router = express.Router();
const testResultController = require('../controllers/testResultController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Test Result Routes for CQM System
 * Base Path: /api/test-results
 */

// Validation rules
const recordTestResultValidation = [
  body('facility_id').isInt().withMessage('Facility ID must be an integer'),
  body('test_definition_id').isInt().withMessage('Test definition ID must be an integer'),
  body('test_date').isISO8601().withMessage('Invalid test date')
];

// GET /api/test-results - Get all test results with filtering
router.get(
  '/',
  authenticate,
  testResultController.getAllTestResults
);

// GET /api/test-results/stats - Get test statistics
router.get(
  '/stats',
  authenticate,
  testResultController.getTestStatistics
);

// GET /api/test-results/trends - Get test trends
router.get(
  '/trends',
  authenticate,
  query('facility_id').optional().isInt(),
  query('test_definition_id').optional().isInt(),
  validateRequest,
  testResultController.getTestTrends
);

// GET /api/test-results/batch/:batch_id - Get test results by batch
router.get(
  '/batch/:batch_id',
  authenticate,
  param('batch_id').isInt().withMessage('Batch ID must be an integer'),
  validateRequest,
  testResultController.getTestResultsByBatch
);

// GET /api/test-results/:id - Get test result by ID
router.get(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Test result ID must be an integer'),
  validateRequest,
  testResultController.getTestResultById
);

// POST /api/test-results - Record new test result
router.post(
  '/',
  authenticate,
  recordTestResultValidation,
  validateRequest,
  testResultController.recordTestResult
);

// PUT /api/test-results/:id - Update test result
router.put(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Test result ID must be an integer'),
  validateRequest,
  testResultController.updateTestResult
);

// PUT /api/test-results/:id/verify - Verify test result
router.put(
  '/:id/verify',
  authenticate,
  param('id').isInt().withMessage('Test result ID must be an integer'),
  validateRequest,
  testResultController.verifyTestResult
);

// DELETE /api/test-results/:id - Delete test result
router.delete(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Test result ID must be an integer'),
  validateRequest,
  testResultController.deleteTestResult
);

module.exports = router;

