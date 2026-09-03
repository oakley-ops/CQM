const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { aiLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/autodataController');

router.use(authenticate);

// Autodata is a heavy ML-dataset / LLM tool: restrict it to elevated roles.
const requireDataWrite = authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER);

router.get('/runs',              requireDataWrite, ctrl.listRuns);
router.post('/runs',             requireDataWrite, aiLimiter, ctrl.createRun);
router.get('/runs/:id',          requireDataWrite, ctrl.getRun);
router.get('/runs/:id/download', requireDataWrite, ctrl.downloadDataset);
router.delete('/runs/:id',       requireDataWrite, ctrl.deleteRun);

module.exports = router;
