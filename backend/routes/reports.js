const express = require('express');
const router = express.Router();
const reportingController = require('../controllers/reportingController');
const { protect } = require('../middleware/auth');

// Executive Dashboard
router.get('/projects/:id/reports/executive-dashboard', protect, reportingController.getExecutiveDashboard);
router.get('/projects/:id/reports/executive-dashboard/pdf', protect, reportingController.exportExecutiveDashboardPDF);

// Status Report
router.get('/projects/:id/reports/status-report', protect, reportingController.getStatusReport);
router.get('/projects/:id/reports/status-report/pdf', protect, reportingController.exportStatusReportPDF);

module.exports = router;
