const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Audit Routes for CQM System
 * Base Path: /api/audits
 */

// Validation rules
const scheduleAuditValidation = [
  body('facility_id').isInt().withMessage('Facility ID must be an integer'),
  body('audit_title').notEmpty().withMessage('Audit title is required'),
  body('audit_type').notEmpty().withMessage('Audit type is required')
    .isIn(['Initial', 'Surveillance', 'Re-certification', 'Remote', 'On-site'])
    .withMessage('Invalid audit type'),
  body('scheduled_date').isISO8601().withMessage('Invalid scheduled date')
];

const completeAuditValidation = [
  param('id').isInt().withMessage('Audit ID must be an integer'),
  body('findings_summary').notEmpty().withMessage('Findings summary is required'),
  body('overall_result').isIn(['Pass', 'Fail', 'Conditional Pass']).withMessage('Invalid overall result')
];

// GET /api/audits - Get all audits with filtering
router.get(
  '/',
  authenticate,
  auditController.getAllAudits
);

// GET /api/audits/stats - Get audit statistics
router.get(
  '/stats',
  authenticate,
  auditController.getAuditStatistics
);

// GET /api/audits/upcoming - Get upcoming audits
router.get(
  '/upcoming',
  authenticate,
  query('days').optional().isInt().withMessage('Days must be an integer'),
  validateRequest,
  auditController.getUpcomingAudits
);

// GET /api/audits/:id - Get audit by ID
router.get(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Audit ID must be an integer'),
  validateRequest,
  auditController.getAuditById
);

// GET /api/audits/:id/report - Generate audit report
router.get(
  '/:id/report',
  authenticate,
  param('id').isInt().withMessage('Audit ID must be an integer'),
  validateRequest,
  auditController.generateAuditReport
);

// POST /api/audits - Schedule new audit
router.post(
  '/',
  authenticate,
  scheduleAuditValidation,
  validateRequest,
  auditController.scheduleAudit
);

// PUT /api/audits/:id - Update audit
router.put(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Audit ID must be an integer'),
  validateRequest,
  auditController.updateAudit
);

// PUT /api/audits/:id/start - Start audit
router.put(
  '/:id/start',
  authenticate,
  param('id').isInt().withMessage('Audit ID must be an integer'),
  validateRequest,
  auditController.startAudit
);

// PUT /api/audits/:id/complete - Complete audit
router.put(
  '/:id/complete',
  authenticate,
  completeAuditValidation,
  validateRequest,
  auditController.completeAudit
);

// DELETE /api/audits/:id - Delete audit
router.delete(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Audit ID must be an integer'),
  validateRequest,
  auditController.deleteAudit
);

module.exports = router;

