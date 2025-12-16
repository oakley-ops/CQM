const { QuoteAction, User } = require('../models');

// Get all actions for a quote
exports.getQuoteActions = async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.query;

    const where = { quote_id: id };
    if (completed !== undefined) {
      where.completed = completed === 'true';
    }

    const actions = await QuoteAction.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    console.error('Error fetching quote actions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quote actions',
      error: error.message
    });
  }
};

// Create new action
exports.createAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action_type, description, assigned_to, due_date } = req.body;

    const action = await QuoteAction.create({
      quote_id: id,
      action_type,
      description,
      assigned_to,
      due_date,
      created_by: req.user.id
    });

    const createdAction = await QuoteAction.findByPk(action.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdAction
    });
  } catch (error) {
    console.error('Error creating action:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating action',
      error: error.message
    });
  }
};

// Update action
exports.updateAction = async (req, res) => {
  try {
    const { action_id } = req.params;
    const updates = req.body;

    const action = await QuoteAction.findByPk(action_id);
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }

    await action.update(updates);

    const updatedAction = await QuoteAction.findByPk(action_id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: updatedAction
    });
  } catch (error) {
    console.error('Error updating action:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating action',
      error: error.message
    });
  }
};

// Mark action as complete
exports.completeAction = async (req, res) => {
  try {
    const { action_id } = req.params;

    const action = await QuoteAction.findByPk(action_id);
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }

    action.completed = true;
    action.completed_date = new Date();
    await action.save();

    res.json({
      success: true,
      data: action
    });
  } catch (error) {
    console.error('Error completing action:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing action',
      error: error.message
    });
  }
};

// Delete action
exports.deleteAction = async (req, res) => {
  try {
    const { action_id } = req.params;

    const action = await QuoteAction.findByPk(action_id);
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }

    await action.destroy();

    res.json({
      success: true,
      message: 'Action deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting action:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting action',
      error: error.message
    });
  }
};
