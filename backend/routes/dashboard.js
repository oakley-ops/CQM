const express = require('express');
const { protect } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

const router = express.Router();

// Routes
router.get('/stats', protect, getDashboardStats);

module.exports = router;
