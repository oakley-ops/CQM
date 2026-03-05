const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  deleteExpense
} = require('../controllers/expenseController');

const router = express.Router({ mergeParams: true });

// Project-specific routes
router
  .route('/')
  .get(protect, getExpenses)
  .post(protect, createExpense);

router.get('/summary', protect, getExpenseSummary);

// Individual expense routes
router
  .route('/:id')
  .put(protect, updateExpense)
  .delete(protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), deleteExpense);

// Approval routes
router.put('/:id/approve', protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), approveExpense);
router.put('/:id/reject', protect, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), rejectExpense);

module.exports = router;
