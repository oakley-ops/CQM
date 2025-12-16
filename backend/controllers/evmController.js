const { EVMSnapshot, Project } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { sequelize } = require('../config/database');

// @desc    Get current EVM metrics
// @route   GET /api/projects/:id/evm
// @access  Private
const getEVMMetrics = async (req, res, next) => {
  try {
    const snapshot = await EVMSnapshot.findOne({
      where: { project_id: req.params.id },
      order: [['snapshot_date', 'DESC']]
    });

    if (!snapshot) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No EVM data available yet'
      });
    }

    // Calculate EVM metrics
    const pv = parseFloat(snapshot.planned_value);
    const ev = parseFloat(snapshot.earned_value);
    const ac = parseFloat(snapshot.actual_cost);
    const bac = parseFloat(snapshot.bac) || 0;

    const cpi = ac > 0 ? (ev / ac).toFixed(2) : 0;
    const spi = pv > 0 ? (ev / pv).toFixed(2) : 0;
    const cv = (ev - ac).toFixed(2);
    const sv = (ev - pv).toFixed(2);
    const eac = cpi > 0 ? (bac / cpi).toFixed(2) : bac;
    const etc = (eac - ac).toFixed(2);
    const vac = (bac - eac).toFixed(2);

    res.status(200).json({
      success: true,
      data: {
        snapshot_date: snapshot.snapshot_date,
        pv,
        ev,
        ac,
        bac,
        cpi: parseFloat(cpi),
        spi: parseFloat(spi),
        cv: parseFloat(cv),
        sv: parseFloat(sv),
        eac: parseFloat(eac),
        etc: parseFloat(etc),
        vac: parseFloat(vac),
        performance: {
          cost: cpi >= 1 ? 'Under Budget' : 'Over Budget',
          schedule: spi >= 1 ? 'Ahead of Schedule' : 'Behind Schedule'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create EVM snapshot
// @route   POST /api/projects/:id/evm/snapshot
// @access  Private (Admin, PM)
const createEVMSnapshot = async (req, res, next) => {
  try {
    const snapshot = await EVMSnapshot.create({
      project_id: req.params.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get EVM history
// @route   GET /api/projects/:id/evm/history
// @access  Private
const getEVMHistory = async (req, res, next) => {
  try {
    const snapshots = await EVMSnapshot.findAll({
      where: { project_id: req.params.id },
      order: [['snapshot_date', 'ASC']]
    });

    // Calculate metrics for each snapshot
    const history = snapshots.map(snapshot => {
      const pv = parseFloat(snapshot.planned_value);
      const ev = parseFloat(snapshot.earned_value);
      const ac = parseFloat(snapshot.actual_cost);
      const bac = parseFloat(snapshot.bac) || 0;

      const cpi = ac > 0 ? parseFloat((ev / ac).toFixed(2)) : 0;
      const spi = pv > 0 ? parseFloat((ev / pv).toFixed(2)) : 0;

      return {
        date: snapshot.snapshot_date,
        pv,
        ev,
        ac,
        cpi,
        spi
      };
    });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cost forecast
// @route   GET /api/projects/:id/evm/forecast
// @access  Private
const getCostForecast = async (req, res, next) => {
  try {
    const snapshot = await EVMSnapshot.findOne({
      where: { project_id: req.params.id },
      order: [['snapshot_date', 'DESC']]
    });

    if (!snapshot) {
      return next(new AppError('No EVM data available for forecasting', 404));
    }

    const ev = parseFloat(snapshot.earned_value);
    const ac = parseFloat(snapshot.actual_cost);
    const bac = parseFloat(snapshot.bac) || 0;

    const cpi = ac > 0 ? ev / ac : 1;
    const eac = cpi > 0 ? bac / cpi : bac;
    const etc = eac - ac;
    const vac = bac - eac;

    const forecast = {
      bac,
      current_cost: ac,
      eac: parseFloat(eac.toFixed(2)),
      etc: parseFloat(etc.toFixed(2)),
      vac: parseFloat(vac.toFixed(2)),
      completion_percentage: bac > 0 ? parseFloat(((ev / bac) * 100).toFixed(2)) : 0,
      forecast_status: vac >= 0 ? 'On Track' : 'At Risk'
    };

    res.status(200).json({
      success: true,
      data: forecast
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEVMMetrics,
  createEVMSnapshot,
  getEVMHistory,
  getCostForecast
};
