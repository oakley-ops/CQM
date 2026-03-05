const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getInspections,
  getInspection,
  createInspection,
  updateInspection,
  deleteInspection,
  completeInspection,
  approveInspection,
  rejectInspection
} = require('../controllers/inspectionController');

// Project-specific routes
router.route('/')
  .get(protect, getInspections)
  .post(protect, createInspection);

// Global routes (single inspection operations)
router.route('/:id')
  .get(protect, getInspection)
  .put(protect, updateInspection)
  .delete(protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), deleteInspection);

// Status change routes
router.put('/:id/complete', protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER, ROLES.AUDITOR), completeInspection);
router.put('/:id/approve', protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), approveInspection);
router.put('/:id/reject', protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), rejectInspection);

module.exports = router;
