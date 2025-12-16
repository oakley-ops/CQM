const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
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
  .delete(protect, deleteInspection);

// Status change routes
router.put('/:id/complete', protect, completeInspection);
router.put('/:id/approve', protect, approveInspection);
router.put('/:id/reject', protect, rejectInspection);

module.exports = router;
