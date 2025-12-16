const express = require('express');
const router = express.Router();
const testDefinitionController = require('../controllers/testDefinitionController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Test Definition Routes for CQM System
 * Base Path: /api/test-definitions
 */

// Validation rules
const createTestDefinitionValidation = [
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('test_id').notEmpty().withMessage('Test ID is required'),
  body('test_name').notEmpty().withMessage('Test name is required'),
  body('iso_standard').notEmpty().withMessage('ISO standard is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('procedure').notEmpty().withMessage('Procedure is required'),
  body('pass_criteria').notEmpty().withMessage('Pass criteria is required')
];

const updateTestDefinitionValidation = [
  param('id').isInt().withMessage('Test definition ID must be an integer')
];

// GET /api/test-definitions - Get all test definitions with filtering
router.get(
  '/',
  authenticate,
  testDefinitionController.getAllTestDefinitions
);

// GET /api/test-definitions/stats - Get test definition statistics
router.get(
  '/stats',
  authenticate,
  testDefinitionController.getTestDefinitionStats
);

// GET /api/test-definitions/category/:category_id - Get tests by category
router.get(
  '/category/:category_id',
  authenticate,
  param('category_id').isInt().withMessage('Category ID must be an integer'),
  validateRequest,
  testDefinitionController.getTestsByCategory
);

// GET /api/test-definitions/iso/:iso_standard - Get tests by ISO standard
router.get(
  '/iso/:iso_standard',
  authenticate,
  testDefinitionController.getTestsByISOStandard
);

// GET /api/test-definitions/:id - Get test definition by ID
router.get(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Test definition ID must be an integer'),
  validateRequest,
  testDefinitionController.getTestDefinitionById
);

// POST /api/test-definitions - Create new test definition
router.post(
  '/',
  authenticate,
  createTestDefinitionValidation,
  validateRequest,
  testDefinitionController.createTestDefinition
);

// POST /api/test-definitions/import - Bulk import test definitions
router.post(
  '/import',
  authenticate,
  body('tests').isArray().withMessage('Tests must be an array'),
  validateRequest,
  testDefinitionController.importTestDefinitions
);

// PUT /api/test-definitions/:id - Update test definition
router.put(
  '/:id',
  authenticate,
  updateTestDefinitionValidation,
  validateRequest,
  testDefinitionController.updateTestDefinition
);

// PUT /api/test-definitions/:id/approve - Approve test definition
router.put(
  '/:id/approve',
  authenticate,
  param('id').isInt().withMessage('Test definition ID must be an integer'),
  validateRequest,
  testDefinitionController.approveTestDefinition
);

// POST /api/test-definitions/:id/supersede - Create new version (supersede)
router.post(
  '/:id/supersede',
  authenticate,
  param('id').isInt().withMessage('Test definition ID must be an integer'),
  body('new_version').optional().isString(),
  validateRequest,
  testDefinitionController.supersedeTestDefinition
);

// PUT /api/test-definitions/:id/obsolete - Mark as obsolete
router.put(
  '/:id/obsolete',
  authenticate,
  param('id').isInt().withMessage('Test definition ID must be an integer'),
  body('reason').notEmpty().withMessage('Reason is required'),
  validateRequest,
  testDefinitionController.markAsObsolete
);

// DELETE /api/test-definitions/:id - Delete test definition
router.delete(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Test definition ID must be an integer'),
  validateRequest,
  testDefinitionController.deleteTestDefinition
);

module.exports = router;

