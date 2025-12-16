const { Budget, Project, Expense } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { sequelize } = require('../config/database');

// @desc    Get all budgets for a project
// @route   GET /api/projects/:id/budgets
// @access  Private
const getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.findAll({
      where: { project_id: req.params.id },
      include: [{
        model: Expense,
        as: 'expenses',
        where: { status: 'approved' },
        required: false
      }],
      order: [['category', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: budgets.length,
      data: budgets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get budget summary
// @route   GET /api/projects/:id/budgets/summary
// @access  Private
const getBudgetSummary = async (req, res, next) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        SUM(COALESCE(approved_amount, planned_amount)) as total_budget,
        (SELECT SUM(amount) FROM expenses WHERE project_id = :projectId AND status = 'approved') as total_expenses,
        SUM(COALESCE(approved_amount, planned_amount)) - COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = :projectId AND status = 'approved'), 0) as remaining_budget
      FROM budgets
      WHERE project_id = :projectId
    `, {
      replacements: { projectId: req.params.id }
    });

    const summary = results[0] || { total_budget: 0, total_expenses: 0, remaining_budget: 0 };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create budget
// @route   POST /api/projects/:id/budgets
// @access  Private
const createBudget = async (req, res, next) => {
  try {
    const budget = await Budget.create({
      project_id: req.params.id,
      created_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findByPk(req.params.id);

    if (!budget) {
      return next(new AppError('Budget not found', 404));
    }

    await budget.update(req.body);

    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findByPk(req.params.id);

    if (!budget) {
      return next(new AppError('Budget not found', 404));
    }

    await budget.destroy();

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgets,
  getBudgetSummary,
  createBudget,
  updateBudget,
  deleteBudget
};
