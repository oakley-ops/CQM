const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCQMDashboard,
  getComplianceMetrics,
  getAuditMetrics,
  getTestEntryMetrics,
  getKPIs,
  getKPIHistory,
  updateKPIThreshold,
  exportKPIReport,
  getRejectionBreakdown,
  getSpcDefs,
  getSpcData,
  getActionItems,
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
router.get('/kpis/export', protect, exportKPIReport);
router.get('/rejection-breakdown', protect, getRejectionBreakdown);
router.get('/spc-defs', protect, getSpcDefs);
router.get('/spc-data', protect, getSpcData);
router.get('/action-items', protect, getActionItems);

module.exports = router;
