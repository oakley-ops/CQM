const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCQMDashboard,
  getComplianceMetrics,
  getAuditMetrics,
  getTestEntryMetrics,
  getKPIs,
  getKPIHistory,
  updateKPIThreshold
} = require('../controllers/dashboardController');

const router = express.Router();

// Routes
router.get('/', protect, getCQMDashboard);
router.get('/compliance', protect, getComplianceMetrics);
router.get('/audits', protect, getAuditMetrics);
router.get('/test-entries', protect, getTestEntryMetrics);
router.get('/kpis', protect, getKPIs);
router.get('/kpis/history', protect, getKPIHistory);
router.put('/kpis/:kpiKey', protect, updateKPIThreshold);

module.exports = router;
