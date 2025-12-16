const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getRisks,
  getRisk,
  getRiskMatrix,
  getRiskSummary,
  createRisk,
  updateRisk,
  deleteRisk,
  mitigateRisk,
  closeRisk
} = require('../controllers/riskController');

// Project-specific routes
router.route('/')
  .get(protect, getRisks)
  .post(protect, createRisk);

router.get('/matrix', protect, getRiskMatrix);
router.get('/summary', protect, getRiskSummary);

// Global routes (single risk operations)
router.route('/:id')
  .get(protect, getRisk)
  .put(protect, updateRisk)
  .delete(protect, deleteRisk);

// Workflow routes
router.put('/:id/mitigate', protect, mitigateRisk);
router.put('/:id/close', protect, closeRisk);

module.exports = router;
