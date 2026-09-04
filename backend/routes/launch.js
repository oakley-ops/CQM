const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const launchController = require('../controllers/launchController');

// Spawns a process on the server host — restrict to elevated roles.
router.post(
  '/smartqc',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER),
  launchController.launchSmartQC
);

module.exports = router;
