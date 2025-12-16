const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const quoteMilestoneController = require('../controllers/quoteMilestoneController');

// Apply authentication middleware to all routes
router.use(protect);

// Milestone template routes
router.get('/', quoteMilestoneController.getAllMilestones);
router.post('/', quoteMilestoneController.createMilestone);
router.put('/:id', quoteMilestoneController.updateMilestone);
router.delete('/:id', quoteMilestoneController.deleteMilestone);
router.post('/reorder', quoteMilestoneController.reorderMilestones);

module.exports = router;
