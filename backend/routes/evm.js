const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getEVMMetrics,
  createEVMSnapshot,
  getEVMHistory,
  getCostForecast
} = require('../controllers/evmController');

const router = express.Router({ mergeParams: true });

// EVM routes
router.get('/', protect, getEVMMetrics);
router.post('/snapshot', protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), createEVMSnapshot);
router.get('/history', protect, getEVMHistory);
router.get('/forecast', protect, getCostForecast);

module.exports = router;
