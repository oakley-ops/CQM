const express = require('express');
const router = express.Router();
const nonConformityController = require('../controllers/nonConformityController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Non-Conformity Routes for CQM System
 * Base Path: /api/non-conformities
 */

// Validation rules
const logNCValidation = [
  body('facility_id').isInt().withMessage('Facility ID must be an integer'),
  body('nc_type').notEmpty().withMessage('NC type is required'),
  body('severity').notEmpty().withMessage('Severity is required')
    .isIn(['Major', 'Minor', 'Observation'])
    .withMessage('Invalid severity level'),
  body('description').notEmpty().withMessage('Description is required'),
  body('identified_date').isISO8601().withMessage('Invalid identified date')
];

const closeNCValidation = [
  param('id').isInt().withMessage('NC ID must be an integer'),
  body('closure_notes').notEmpty().withMessage('Closure notes are required')
];

// GET /api/non-conformities - Get all non-conformities with filtering
router.get(
  '/',
  authenticate,
  nonConformityController.getAllNonConformities
);

// GET /api/non-conformities/stats - Get NC statistics
router.get(
  '/stats',
  authenticate,
  nonConformityController.getNonConformityStatistics
);

// GET /api/non-conformities/by-type - Get NCs grouped by type
router.get(
  '/by-type',
  authenticate,
  nonConformityController.getNonConformitiesByType
);

// GET /api/non-conformities/trends - Get NC trends
router.get(
  '/trends',
  authenticate,
  query('facility_id').optional().isInt(),
  query('interval').optional().isIn(['day', 'week', 'month']),
  validateRequest,
  nonConformityController.getNonConformityTrends
);

// GET /api/non-conformities/overdue - Get overdue non-conformities
router.get(
  '/overdue',
  authenticate,
  nonConformityController.getOverdueNonConformities
);

// GET /api/non-conformities/:id - Get non-conformity by ID
router.get(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('NC ID must be an integer'),
  validateRequest,
  nonConformityController.getNonConformityById
);

// POST /api/non-conformities - Log new non-conformity
router.post(
  '/',
  authenticate,
  logNCValidation,
  validateRequest,
  nonConformityController.logNonConformity
);

// PUT /api/non-conformities/:id - Update non-conformity
router.put(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('NC ID must be an integer'),
  validateRequest,
  nonConformityController.updateNonConformity
);

// PUT /api/non-conformities/:id/close - Close non-conformity
router.put(
  '/:id/close',
  authenticate,
  closeNCValidation,
  validateRequest,
  nonConformityController.closeNonConformity
);

// DELETE /api/non-conformities/:id - Delete non-conformity
router.delete(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('NC ID must be an integer'),
  validateRequest,
  nonConformityController.deleteNonConformity
);

module.exports = router;

