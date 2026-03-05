const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getBudgets,
  getBudgetSummary,
  createBudget,
  updateBudget,
  deleteBudget
} = require('../controllers/budgetController');

const router = express.Router({ mergeParams: true });

// Project-specific routes
router
  .route('/')
  .get(protect, getBudgets)
  .post(protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), createBudget);

router.get('/summary', protect, getBudgetSummary);

// Individual budget routes
router
  .route('/:id')
  .put(protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), updateBudget)
  .delete(protect, authorize(ROLES.ADMIN), deleteBudget);

module.exports = router;
