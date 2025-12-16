const { QuoteMilestoneTracking, QuoteMilestone, Quote, User } = require('../models');

// Get all milestones for a quote
exports.getQuoteMilestones = async (req, res) => {
  try {
    const { id } = req.params;

    const milestones = await QuoteMilestoneTracking.findAll({
      where: { quote_id: id },
      include: [
        { model: QuoteMilestone, as: 'milestone' },
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [[{ model: QuoteMilestone, as: 'milestone' }, 'sequence_order', 'ASC']]
    });

    res.json({
      success: true,
      data: milestones
    });
  } catch (error) {
    console.error('Error fetching quote milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quote milestones',
      error: error.message
    });
  }
};

// Update milestone tracking
exports.updateMilestoneTracking = async (req, res) => {
  try {
    const { id, milestone_id } = req.params;
    const updates = req.body;

    const tracking = await QuoteMilestoneTracking.findOne({
      where: { quote_id: id, milestone_id }
    });

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Milestone tracking not found'
      });
    }

    await tracking.update(updates);

    const updatedTracking = await QuoteMilestoneTracking.findOne({
      where: { quote_id: id, milestone_id },
      include: [
        { model: QuoteMilestone, as: 'milestone' },
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: updatedTracking
    });
  } catch (error) {
    console.error('Error updating milestone tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating milestone tracking',
      error: error.message
    });
  }
};

// Mark milestone as complete
exports.completeMilestone = async (req, res) => {
  try {
    const { id, milestone_id } = req.params;

    const tracking = await QuoteMilestoneTracking.findOne({
      where: { quote_id: id, milestone_id }
    });

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Milestone tracking not found'
      });
    }

    tracking.status = 'Completed';
    tracking.completed_date = new Date();
    await tracking.save();

    res.json({
      success: true,
      data: tracking
    });
  } catch (error) {
    console.error('Error completing milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing milestone',
      error: error.message
    });
  }
};

// Get all milestone templates
exports.getAllMilestones = async (req, res) => {
  try {
    const milestones = await QuoteMilestone.findAll({
      where: { is_active: true },
      order: [['sequence_order', 'ASC']]
    });

    res.json({
      success: true,
      data: milestones
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching milestones',
      error: error.message
    });
  }
};

// Create new milestone template
exports.createMilestone = async (req, res) => {
  try {
    const { name, description, target_duration_days } = req.body;

    // Get the highest sequence order and add 1
    const lastMilestone = await QuoteMilestone.findOne({
      order: [['sequence_order', 'DESC']]
    });

    const sequence_order = lastMilestone ? lastMilestone.sequence_order + 1 : 1;

    const milestone = await QuoteMilestone.create({
      name,
      description,
      sequence_order,
      target_duration_days,
      is_active: true
    });

    res.status(201).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating milestone',
      error: error.message
    });
  }
};

// Update milestone template
exports.updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, target_duration_days, sequence_order } = req.body;

    const milestone = await QuoteMilestone.findByPk(id);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    await milestone.update({
      name,
      description,
      target_duration_days,
      sequence_order
    });

    res.json({
      success: true,
      data: milestone
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating milestone',
      error: error.message
    });
  }
};

// Delete milestone template (soft delete)
exports.deleteMilestone = async (req, res) => {
  try {
    const { id } = req.params;

    const milestone = await QuoteMilestone.findByPk(id);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    await milestone.update({ is_active: false });

    res.json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting milestone',
      error: error.message
    });
  }
};

// Reorder milestones
exports.reorderMilestones = async (req, res) => {
  try {
    const { milestones } = req.body; // Array of { id, sequence_order }

    for (const item of milestones) {
      await QuoteMilestone.update(
        { sequence_order: item.sequence_order },
        { where: { id: item.id } }
      );
    }

    const updatedMilestones = await QuoteMilestone.findAll({
      where: { is_active: true },
      order: [['sequence_order', 'ASC']]
    });

    res.json({
      success: true,
      data: updatedMilestones
    });
  } catch (error) {
    console.error('Error reordering milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering milestones',
      error: error.message
    });
  }
};
