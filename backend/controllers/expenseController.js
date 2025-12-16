const { Expense, Budget, Project, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { sequelize } = require('../config/database');

// @desc    Get all expenses for a project
// @route   GET /api/projects/:id/expenses
// @access  Private
const getExpenses = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = { project_id: req.params.id };

    if (status) where.status = status;
    if (category) where.category = category;

    const expenses = await Expense.findAll({
      where,
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: ['id', 'category']
        }
      ],
      order: [['expense_date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense summary
// @route   GET /api/projects/:id/expenses/summary
// @access  Private
const getExpenseSummary = async (req, res, next) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_total,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_total
      FROM expenses
      WHERE project_id = :projectId
    `, {
      replacements: { projectId: req.params.id }
    });

    res.status(200).json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create expense
// @route   POST /api/projects/:id/expenses
// @access  Private
const createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({
      project_id: req.params.id,
      created_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return next(new AppError('Expense not found', 404));
    }

    await expense.update(req.body);

    res.status(200).json({
      success: true,
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve expense
// @route   PUT /api/expenses/:id/approve
// @access  Private (Admin, PM)
const approveExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return next(new AppError('Expense not found', 404));
    }

    await expense.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date()
    });

    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense approved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject expense
// @route   PUT /api/expenses/:id/reject
// @access  Private (Admin, PM)
const rejectExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return next(new AppError('Expense not found', 404));
    }

    await expense.update({
      status: 'rejected',
      approved_by: req.user.id,
      approved_at: new Date()
    });

    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense rejected'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      return next(new AppError('Expense not found', 404));
    }

    await expense.destroy();

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  deleteExpense
};
