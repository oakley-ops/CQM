const express = require('express');
const { protect } = require('../middleware/auth');
const { 
  getCQMDashboard, 
  getComplianceMetrics,
  getAuditMetrics 
} = require('../controllers/dashboardController');

const router = express.Router();

// Routes
router.get('/', protect, getCQMDashboard);
router.get('/compliance', protect, getComplianceMetrics);
router.get('/audits', protect, getAuditMetrics);

module.exports = router;
