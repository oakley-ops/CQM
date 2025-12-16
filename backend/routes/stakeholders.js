const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getStakeholders,
  getStakeholder,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
  getStakeholderMatrix
} = require('../controllers/stakeholderController');

const router = express.Router({ mergeParams: true });

// Project-specific routes
router
  .route('/')
  .get(protect, getStakeholders)
  .post(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), createStakeholder);

router.get('/matrix', protect, getStakeholderMatrix);

// Individual stakeholder routes
router
  .route('/:id')
  .get(protect, getStakeholder)
  .put(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), updateStakeholder)
  .delete(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), deleteStakeholder);

module.exports = router;
