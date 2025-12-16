const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getChangeRequests,
  getChangeRequest,
  createChangeRequest,
  updateChangeRequest,
  reviewChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  implementChangeRequest,
  deleteChangeRequest
} = require('../controllers/changeRequestController');

const router = express.Router({ mergeParams: true });

// Project-specific routes
router
  .route('/')
  .get(protect, getChangeRequests)
  .post(protect, createChangeRequest);

// Individual change request routes
router
  .route('/:id')
  .get(protect, getChangeRequest)
  .put(protect, updateChangeRequest)
  .delete(protect, authorize(ROLES.ADMIN), deleteChangeRequest);

// Workflow routes
router.put('/:id/review', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), reviewChangeRequest);
router.put('/:id/approve', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), approveChangeRequest);
router.put('/:id/reject', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), rejectChangeRequest);
router.put('/:id/implement', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), implementChangeRequest);

module.exports = router;
