const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const sampleCardController = require('../controllers/sampleCardController');

router.post('/bulk', authenticate, sampleCardController.createBulk);
router.get('/session/:sessionId', authenticate, sampleCardController.getBySession);

module.exports = router;
