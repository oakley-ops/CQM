const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/autodataController');

router.use(authenticate);

router.get('/runs',            ctrl.listRuns);
router.post('/runs',           ctrl.createRun);
router.get('/runs/:id',        ctrl.getRun);
router.get('/runs/:id/download', ctrl.downloadDataset);
router.delete('/runs/:id',     ctrl.deleteRun);

module.exports = router;
