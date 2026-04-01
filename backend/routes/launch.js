const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const launchController = require('../controllers/launchController');

router.post('/smartqc', authenticate, launchController.launchSmartQC);

module.exports = router;
