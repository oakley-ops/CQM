const { Project, Quote } = require('../models');
const { Op } = require('sequelize');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    // Get total projects count
    const totalProjects = await Project.count();

    // Get completed projects count
    const completedProjects = await Project.count({
      where: { status: 'completed' }
    });

    // Get in-progress projects count
    const inProgressProjects = await Project.count({
      where: { status: 'in_progress' }
    });

    // Calculate on-track percentage
    // Projects are on track if they're not at risk or behind schedule
    const onTrackProjects = await Project.count({
      where: {
        status: {
          [Op.notIn]: ['at_risk', 'delayed', 'cancelled']
        }
      }
    });

    const onTrackPercentage = totalProjects > 0 
      ? Math.round((onTrackProjects / totalProjects) * 100)
      : 0;

    // Get quote statistics
    const totalQuotes = await Quote.count();

    const activeQuotes = await Quote.count({
      where: { 
        status: { [Op.in]: ['Not Started', 'In Process'] }
      }
    });

    const completedQuotes = await Quote.count({
      where: { status: 'Completed' }
    });

    // Calculate total pipeline value
    const pipelineValue = await Quote.sum('quote_value', {
      where: { 
        status: { [Op.in]: ['Not Started', 'In Process'] }
      }
    }) || 0;

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        completedProjects,
        inProgressProjects,
        onTrackPercentage,
        totalQuotes,
        activeQuotes,
        completedQuotes,
        pipelineValue
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
