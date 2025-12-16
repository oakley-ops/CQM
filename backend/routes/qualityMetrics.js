const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getQualityMetrics,
  getQualityMetric,
  getMetricsSummary,
  getMetricsTrends,
  createQualityMetric,
  updateQualityMetric,
  deleteQualityMetric
} = require('../controllers/qualityMetricController');

// Project-specific routes
router.route('/')
  .get(protect, getQualityMetrics)
  .post(protect, createQualityMetric);

router.get('/summary', protect, getMetricsSummary);
router.get('/trends', protect, getMetricsTrends);

// Global routes (single metric operations)
router.route('/:id')
  .get(protect, getQualityMetric)
  .put(protect, updateQualityMetric)
  .delete(protect, deleteQualityMetric);

module.exports = router;
