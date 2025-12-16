const express = require('express');
const router = express.Router();
const cardBatchController = require('../controllers/cardBatchController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Card Batch Routes for CQM System
 * Base Path: /api/card-batches
 */

// Validation rules
const createBatchValidation = [
  body('facility_id').isInt().withMessage('Facility ID must be an integer'),
  body('product_name').notEmpty().withMessage('Product name is required'),
  body('card_type').notEmpty().withMessage('Card type is required')
    .isIn(['Contact', 'Contactless', 'Dual Interface', 'Magnetic Stripe Only', 'Hybrid', 'Other'])
    .withMessage('Invalid card type'),
  body('planned_quantity').isInt({ min: 1 }).withMessage('Planned quantity must be at least 1'),
  body('production_date').isISO8601().withMessage('Invalid production date')
];

const completeBatchValidation = [
  param('id').isInt().withMessage('Batch ID must be an integer'),
  body('produced_quantity').isInt({ min: 0 }).withMessage('Produced quantity must be a non-negative integer'),
  body('accepted_quantity').isInt({ min: 0 }).withMessage('Accepted quantity must be a non-negative integer'),
  body('rejected_quantity').isInt({ min: 0 }).withMessage('Rejected quantity must be a non-negative integer')
];

const quarantineValidation = [
  param('id').isInt().withMessage('Batch ID must be an integer'),
  body('quarantine_reason').notEmpty().withMessage('Quarantine reason is required')
];

// GET /api/card-batches - Get all card batches with filtering
router.get(
  '/',
  authenticate,
  cardBatchController.getAllCardBatches
);

// GET /api/card-batches/stats - Get batch statistics
router.get(
  '/stats',
  authenticate,
  cardBatchController.getBatchStatistics
);

// GET /api/card-batches/:id - Get card batch by ID
router.get(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  validateRequest,
  cardBatchController.getCardBatchById
);

// POST /api/card-batches - Create new card batch
router.post(
  '/',
  authenticate,
  createBatchValidation,
  validateRequest,
  cardBatchController.createCardBatch
);

// PUT /api/card-batches/:id - Update card batch
router.put(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  validateRequest,
  cardBatchController.updateCardBatch
);

// PUT /api/card-batches/:id/start - Start batch production
router.put(
  '/:id/start',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  validateRequest,
  cardBatchController.startBatchProduction
);

// PUT /api/card-batches/:id/complete - Complete batch production
router.put(
  '/:id/complete',
  authenticate,
  completeBatchValidation,
  validateRequest,
  cardBatchController.completeBatchProduction
);

// PUT /api/card-batches/:id/approve - Approve batch (QC approval)
router.put(
  '/:id/approve',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  validateRequest,
  cardBatchController.approveBatch
);

// PUT /api/card-batches/:id/reject - Reject batch
router.put(
  '/:id/reject',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  body('rejection_reason').notEmpty().withMessage('Rejection reason is required'),
  validateRequest,
  cardBatchController.rejectBatch
);

// PUT /api/card-batches/:id/quarantine - Quarantine batch
router.put(
  '/:id/quarantine',
  authenticate,
  quarantineValidation,
  validateRequest,
  cardBatchController.quarantineBatch
);

// PUT /api/card-batches/:id/release-quarantine - Release batch from quarantine
router.put(
  '/:id/release-quarantine',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  body('release_notes').notEmpty().withMessage('Release notes are required'),
  validateRequest,
  cardBatchController.releaseBatchFromQuarantine
);

// PUT /api/card-batches/:id/release - Final release of batch
router.put(
  '/:id/release',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  validateRequest,
  cardBatchController.releaseBatch
);

// DELETE /api/card-batches/:id - Delete card batch
router.delete(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Batch ID must be an integer'),
  validateRequest,
  cardBatchController.deleteCardBatch
);

module.exports = router;

