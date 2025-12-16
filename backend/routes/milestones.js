const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  completeMilestone,
  deleteMilestone
} = require('../controllers/milestoneController');

const router = express.Router({ mergeParams: true });

// Project-specific routes
router
  .route('/')
  .get(protect, getMilestones)
  .post(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), createMilestone);

// Individual milestone routes
router
  .route('/:id')
  .get(protect, getMilestone)
  .put(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), updateMilestone)
  .delete(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), deleteMilestone);

router.put('/:id/complete', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), completeMilestone);

module.exports = router;
