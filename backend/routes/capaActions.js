const express = require('express');
const router = express.Router();
const capaActionController = require('../controllers/capaActionController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * CAPA Action Routes for CQM System
 * Base Path: /api/capa-actions
 */

// Validation rules
const createCapaValidation = [
  body('facility_id').isInt().withMessage('Facility ID must be an integer'),
  body('capa_title').notEmpty().withMessage('CAPA title is required'),
  body('capa_type').notEmpty().withMessage('CAPA type is required')
    .isIn(['Corrective', 'Preventive', 'Both'])
    .withMessage('Invalid CAPA type'),
  body('problem_statement').notEmpty().withMessage('Problem statement is required'),
  body('assigned_to').isInt().withMessage('Assigned to must be a valid user ID'),
  body('target_completion_date').isISO8601().withMessage('Invalid target completion date')
];

const createCapaFromNCValidation = [
  param('nc_id').isInt().withMessage('NC ID must be an integer'),
  body('capa_title').optional().isString(),
  body('proposed_action').notEmpty().withMessage('Proposed action is required'),
  body('action_plan').notEmpty().withMessage('Action plan is required'),
  body('assigned_to').isInt().withMessage('Assigned to must be a valid user ID'),
  body('target_completion_date').isISO8601().withMessage('Invalid target completion date')
];

const trackCompletionValidation = [
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  body('progress_percentage').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('current_step').optional().isString()
];

const verifyEffectivenessValidation = [
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  body('effectiveness_verified').isBoolean().withMessage('Effectiveness verified must be boolean'),
  body('verification_notes').notEmpty().withMessage('Verification notes are required')
];

// GET /api/capa-actions - Get all CAPA actions with filtering
router.get(
  '/',
  authenticate,
  capaActionController.getAllCapaActions
);

// GET /api/capa-actions/stats - Get CAPA statistics
router.get(
  '/stats',
  authenticate,
  capaActionController.getCapaStatistics
);

// GET /api/capa-actions/overdue - Get overdue CAPA actions
router.get(
  '/overdue',
  authenticate,
  capaActionController.getOverdueCapaActions
);

// GET /api/capa-actions/:id - Get CAPA action by ID
router.get(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  validateRequest,
  capaActionController.getCapaActionById
);

// POST /api/capa-actions - Create new CAPA action
router.post(
  '/',
  authenticate,
  createCapaValidation,
  validateRequest,
  capaActionController.createCapaAction
);

// POST /api/capa-actions/from-nc/:nc_id - Create CAPA from non-conformity
router.post(
  '/from-nc/:nc_id',
  authenticate,
  createCapaFromNCValidation,
  validateRequest,
  capaActionController.createCapaFromNC
);

// PUT /api/capa-actions/:id - Update CAPA action
router.put(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  validateRequest,
  capaActionController.updateCapaAction
);

// PUT /api/capa-actions/:id/approve - Approve CAPA action
router.put(
  '/:id/approve',
  authenticate,
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  validateRequest,
  capaActionController.approveCapaAction
);

// PUT /api/capa-actions/:id/reject - Reject CAPA action
router.put(
  '/:id/reject',
  authenticate,
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  body('rejection_reason').notEmpty().withMessage('Rejection reason is required'),
  validateRequest,
  capaActionController.rejectCapaAction
);

// PUT /api/capa-actions/:id/track - Track CAPA completion (update progress)
router.put(
  '/:id/track',
  authenticate,
  trackCompletionValidation,
  validateRequest,
  capaActionController.trackCapaCompletion
);

// PUT /api/capa-actions/:id/verify - Verify CAPA effectiveness
router.put(
  '/:id/verify',
  authenticate,
  verifyEffectivenessValidation,
  validateRequest,
  capaActionController.verifyCapaEffectiveness
);

// PUT /api/capa-actions/:id/close - Close CAPA action
router.put(
  '/:id/close',
  authenticate,
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  validateRequest,
  capaActionController.closeCapaAction
);

// DELETE /api/capa-actions/:id - Delete CAPA action
router.delete(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('CAPA ID must be an integer'),
  validateRequest,
  capaActionController.deleteCapaAction
);

module.exports = router;

