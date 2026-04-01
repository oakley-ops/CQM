const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listPunchTools, createPunchTool, deactivatePunchTool } = require('../controllers/punchToolController');

router.get('/', authenticate, listPunchTools);
router.post('/', authenticate, createPunchTool);
router.patch('/:id/deactivate', authenticate, deactivatePunchTool);

module.exports = router;
