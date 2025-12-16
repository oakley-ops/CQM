const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Manufacturing Facility Routes for CQM System
 * Base Path: /api/facilities
 */

// Validation rules
const createFacilityValidation = [
  body('facility_name').notEmpty().withMessage('Facility name is required'),
  body('facility_code').notEmpty().withMessage('Facility code is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('technology').notEmpty().withMessage('Technology is required')
    .isIn(['Contact', 'Contactless', 'Dual Interface', 'Hybrid'])
    .withMessage('Invalid technology type')
];

const updateCertificationValidation = [
  param('id').isInt().withMessage('Facility ID must be an integer'),
  body('certification_status').notEmpty().withMessage('Certification status is required')
];

// GET /api/facilities - Get all facilities with filtering
router.get(
  '/',
  authenticate,
  facilityController.getAllFacilities
);

// GET /api/facilities/by-country - Get facilities grouped by country
router.get(
  '/by-country',
  authenticate,
  facilityController.getFacilitiesByCountry
);

// GET /api/facilities/by-technology - Get facilities grouped by technology
router.get(
  '/by-technology',
  authenticate,
  facilityController.getFacilitiesByTechnology
);

// GET /api/facilities/expiring-certificates - Get facilities with expiring certificates
router.get(
  '/expiring-certificates',
  authenticate,
  query('days').optional().isInt().withMessage('Days must be an integer'),
  validateRequest,
  facilityController.getExpiringCertificates
);

// GET /api/facilities/:id - Get facility by ID
router.get(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Facility ID must be an integer'),
  validateRequest,
  facilityController.getFacilityById
);

// GET /api/facilities/:id/dashboard - Get comprehensive facility dashboard
router.get(
  '/:id/dashboard',
  authenticate,
  param('id').isInt().withMessage('Facility ID must be an integer'),
  validateRequest,
  facilityController.getFacilityDashboard
);

// GET /api/facilities/:id/cqm-label - Get CQM label for facility
router.get(
  '/:id/cqm-label',
  authenticate,
  param('id').isInt().withMessage('Facility ID must be an integer'),
  validateRequest,
  facilityController.getCQMLabel
);

// POST /api/facilities - Create new facility
router.post(
  '/',
  authenticate,
  createFacilityValidation,
  validateRequest,
  facilityController.createFacility
);

// PUT /api/facilities/:id - Update facility
router.put(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Facility ID must be an integer'),
  validateRequest,
  facilityController.updateFacility
);

// PUT /api/facilities/:id/certification - Update certification status
router.put(
  '/:id/certification',
  authenticate,
  updateCertificationValidation,
  validateRequest,
  facilityController.updateCertificationStatus
);

// DELETE /api/facilities/:id - Delete facility
router.delete(
  '/:id',
  authenticate,
  param('id').isInt().withMessage('Facility ID must be an integer'),
  validateRequest,
  facilityController.deleteFacility
);

module.exports = router;

