const { QualityMetric, Project } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { sequelize } = require('../config/database');

// @desc    Get all quality metrics for a project
// @route   GET /api/projects/:id/quality-metrics
// @access  Private
const getQualityMetrics = async (req, res, next) => {
  try {
    const metrics = await QualityMetric.findAll({
      where: { project_id: req.params.id },
      order: [['measurement_date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: metrics.length,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quality metrics summary
// @route   GET /api/projects/:id/quality-metrics/summary
// @access  Private
const getMetricsSummary = async (req, res, next) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_metrics,
        COUNT(CASE WHEN status = 'on-target' THEN 1 END) as on_target_count,
        COUNT(CASE WHEN status = 'at-risk' THEN 1 END) as at_risk_count,
        COUNT(CASE WHEN status = 'off-target' THEN 1 END) as off_target_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM quality_metrics
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

// @desc    Create quality metric
// @route   POST /api/projects/:id/quality-metrics
// @access  Private
const createQualityMetric = async (req, res, next) => {
  try {
    const metric = await QualityMetric.create({
      project_id: req.params.id,
      created_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: metric
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quality metric
// @route   PUT /api/quality-metrics/:id
// @access  Private
const updateQualityMetric = async (req, res, next) => {
  try {
    const metric = await QualityMetric.findByPk(req.params.id);

    if (!metric) {
      return next(new AppError('Quality metric not found', 404));
    }

    await metric.update(req.body);

    res.status(200).json({
      success: true,
      data: metric
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quality metric
// @route   GET /api/quality-metrics/:id
// @access  Private
const getQualityMetric = async (req, res, next) => {
  try {
    const metric = await QualityMetric.findByPk(req.params.id);

    if (!metric) {
      return next(new AppError('Quality metric not found', 404));
    }

    res.status(200).json({
      success: true,
      data: metric
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete quality metric
// @route   DELETE /api/quality-metrics/:id
// @access  Private
const deleteQualityMetric = async (req, res, next) => {
  try {
    const metric = await QualityMetric.findByPk(req.params.id);

    if (!metric) {
      return next(new AppError('Quality metric not found', 404));
    }

    await metric.destroy();

    res.status(200).json({
      success: true,
      message: 'Quality metric deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quality metrics trends
// @route   GET /api/projects/:id/quality-metrics/trends
// @access  Private
const getMetricsTrends = async (req, res, next) => {
  try {
    const { metric_name, days = 30 } = req.query;
    
    const whereClause = {
      project_id: req.params.id
    };

    if (metric_name) {
      whereClause.metric_name = metric_name;
    }

    const metrics = await QualityMetric.findAll({
      where: whereClause,
      order: [['measurement_date', 'ASC']],
      limit: parseInt(days)
    });

    res.status(200).json({
      success: true,
      count: metrics.length,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQualityMetrics,
  getQualityMetric,
  getMetricsSummary,
  getMetricsTrends,
  createQualityMetric,
  updateQualityMetric,
  deleteQualityMetric
};
