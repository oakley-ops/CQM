const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCQMDashboard,
  getComplianceMetrics,
  getAuditMetrics,
  getTestEntryMetrics
} = require('../controllers/dashboardController');

const router = express.Router();

// Routes
router.get('/', protect, getCQMDashboard);
router.get('/compliance', protect, getComplianceMetrics);
router.get('/audits', protect, getAuditMetrics);
router.get('/test-entries', protect, getTestEntryMetrics);

module.exports = router;
