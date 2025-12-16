const { Risk, Project, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// @desc    Get all risks for a project
// @route   GET /api/projects/:id/risks
// @access  Private
const getRisks = async (req, res, next) => {
  try {
    const risks = await Risk.findAll({
      where: { project_id: req.params.id },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['risk_score', 'DESC'], ['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: risks.length,
      data: risks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single risk
// @route   GET /api/risks/:id
// @access  Private
const getRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!risk) {
      return next(new AppError('Risk not found', 404));
    }

    res.status(200).json({
      success: true,
      data: risk
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get risk matrix data (P-I Matrix)
// @route   GET /api/projects/:id/risks/matrix
// @access  Private
const getRiskMatrix = async (req, res, next) => {
  try {
    const risks = await Risk.findAll({
      where: { 
        project_id: req.params.id,
        status: { [Op.notIn]: ['closed'] }
      },
      attributes: ['id', 'title', 'probability', 'impact', 'risk_score', 'category']
    });

    // Group risks by probability and impact
    const matrix = {
      'very-high': { 'very-low': [], 'low': [], 'medium': [], 'high': [], 'very-high': [] },
      'high': { 'very-low': [], 'low': [], 'medium': [], 'high': [], 'very-high': [] },
      'medium': { 'very-low': [], 'low': [], 'medium': [], 'high': [], 'very-high': [] },
      'low': { 'very-low': [], 'low': [], 'medium': [], 'high': [], 'very-high': [] },
      'very-low': { 'very-low': [], 'low': [], 'medium': [], 'high': [], 'very-high': [] }
    };

    risks.forEach(risk => {
      if (matrix[risk.probability] && matrix[risk.probability][risk.impact]) {
        matrix[risk.probability][risk.impact].push(risk);
      }
    });

    res.status(200).json({
      success: true,
      data: matrix
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get risk summary
// @route   GET /api/projects/:id/risks/summary
// @access  Private
const getRiskSummary = async (req, res, next) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_risks,
        COUNT(CASE WHEN status = 'identified' THEN 1 END) as identified_count,
        COUNT(CASE WHEN status = 'assessed' THEN 1 END) as assessed_count,
        COUNT(CASE WHEN status = 'mitigated' THEN 1 END) as mitigated_count,
        COUNT(CASE WHEN status = 'monitoring' THEN 1 END) as monitoring_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
        COUNT(CASE WHEN status = 'occurred' THEN 1 END) as occurred_count,
        COUNT(CASE WHEN risk_score >= 15 THEN 1 END) as high_risk_count,
        COUNT(CASE WHEN risk_score BETWEEN 8 AND 14 THEN 1 END) as medium_risk_count,
        COUNT(CASE WHEN risk_score < 8 THEN 1 END) as low_risk_count,
        AVG(risk_score) as average_risk_score
      FROM risks
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

// @desc    Create risk
// @route   POST /api/projects/:id/risks
// @access  Private
const createRisk = async (req, res, next) => {
  try {
    const risk = await Risk.create({
      project_id: req.params.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: risk
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update risk
// @route   PUT /api/risks/:id
// @access  Private
const updateRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findByPk(req.params.id);

    if (!risk) {
      return next(new AppError('Risk not found', 404));
    }

    await risk.update(req.body);

    res.status(200).json({
      success: true,
      data: risk
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete risk
// @route   DELETE /api/risks/:id
// @access  Private
const deleteRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findByPk(req.params.id);

    if (!risk) {
      return next(new AppError('Risk not found', 404));
    }

    await risk.destroy();

    res.status(200).json({
      success: true,
      message: 'Risk deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update risk mitigation
// @route   PUT /api/risks/:id/mitigate
// @access  Private
const mitigateRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findByPk(req.params.id);

    if (!risk) {
      return next(new AppError('Risk not found', 404));
    }

    const { response_strategy, response_plan, contingency_plan } = req.body;

    await risk.update({
      status: 'mitigated',
      response_strategy,
      response_plan,
      contingency_plan
    });

    res.status(200).json({
      success: true,
      data: risk
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close risk
// @route   PUT /api/risks/:id/close
// @access  Private
const closeRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findByPk(req.params.id);

    if (!risk) {
      return next(new AppError('Risk not found', 404));
    }

    await risk.update({
      status: 'closed'
    });

    res.status(200).json({
      success: true,
      data: risk
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRisks,
  getRisk,
  getRiskMatrix,
  getRiskSummary,
  createRisk,
  updateRisk,
  deleteRisk,
  mitigateRisk,
  closeRisk
};
