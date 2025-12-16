const { NonConformity, ManufacturingFacility, Audit, CapaAction, User, ISOComplianceRecord, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Non-Conformity Controller for CQM System
 * Manages non-conformities (formerly Risks)
 */

// Get all non-conformities with filtering and pagination
exports.getAllNonConformities = async (req, res) => {
  try {
    const {
      facility_id,
      audit_id,
      nc_type,
      severity,
      status,
      identified_by,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 20,
      sortBy = 'identified_date',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};

    if (facility_id) where.facility_id = facility_id;
    if (audit_id) where.audit_id = audit_id;
    if (nc_type) where.nc_type = nc_type;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (identified_by) where.identified_by = identified_by;

    // Date range filter
    if (start_date || end_date) {
      where.identified_date = {};
      if (start_date) where.identified_date[Op.gte] = new Date(start_date);
      if (end_date) where.identified_date[Op.lte] = new Date(end_date);
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { nc_reference: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { requirement_reference: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch non-conformities
    const { count, rows: nonConformities } = await NonConformity.findAndCountAll({
      where,
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility',
          attributes: ['id', 'facility_name', 'facility_code', 'country']
        },
        {
          model: Audit,
          as: 'audit',
          attributes: ['id', 'audit_reference', 'audit_type', 'scheduled_date']
        },
        {
          model: User,
          as: 'identifier',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    // Calculate statistics
    const stats = {
      total: count,
      open: await NonConformity.count({ where: { ...where, status: 'Open' } }),
      in_progress: await NonConformity.count({ where: { ...where, status: 'In Progress' } }),
      closed: await NonConformity.count({ where: { ...where, status: 'Closed' } }),
      by_severity: {
        major: await NonConformity.count({ where: { ...where, severity: 'Major' } }),
        minor: await NonConformity.count({ where: { ...where, severity: 'Minor' } }),
        observation: await NonConformity.count({ where: { ...where, severity: 'Observation' } })
      }
    };

    res.status(200).json({
      success: true,
      data: nonConformities,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching non-conformities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-conformities',
      error: error.message
    });
  }
};

// Get non-conformity by ID
exports.getNonConformityById = async (req, res) => {
  try {
    const { id } = req.params;

    const nonConformity = await NonConformity.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: Audit,
          as: 'audit'
        },
        {
          model: User,
          as: 'identifier',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!nonConformity) {
      return res.status(404).json({
        success: false,
        message: 'Non-conformity not found'
      });
    }

    // Get related CAPA actions
    const capaActions = await CapaAction.findAll({
      where: { nc_id: id },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        ...nonConformity.toJSON(),
        capa_actions: capaActions
      }
    });
  } catch (error) {
    console.error('Error fetching non-conformity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-conformity',
      error: error.message
    });
  }
};

// Log non-conformity
exports.logNonConformity = async (req, res) => {
  try {
    const ncData = {
      ...req.body,
      nc_reference: req.body.nc_reference || generateNCReference(),
      identified_by: req.user.id,
      status: 'Open'
    };

    const nonConformity = await NonConformity.create(ncData);

    const createdNC = await NonConformity.findByPk(nonConformity.id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: Audit,
          as: 'audit'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Non-conformity logged successfully',
      data: createdNC
    });
  } catch (error) {
    console.error('Error logging non-conformity:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging non-conformity',
      error: error.message
    });
  }
};

// Update non-conformity
exports.updateNonConformity = async (req, res) => {
  try {
    const { id } = req.params;

    const nonConformity = await NonConformity.findByPk(id);

    if (!nonConformity) {
      return res.status(404).json({
        success: false,
        message: 'Non-conformity not found'
      });
    }

    await nonConformity.update(req.body);

    const updatedNC = await NonConformity.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: Audit,
          as: 'audit'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Non-conformity updated successfully',
      data: updatedNC
    });
  } catch (error) {
    console.error('Error updating non-conformity:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating non-conformity',
      error: error.message
    });
  }
};

// Close non-conformity
exports.closeNonConformity = async (req, res) => {
  try {
    const { id } = req.params;
    const { closure_notes, closure_evidence } = req.body;

    const nonConformity = await NonConformity.findByPk(id);

    if (!nonConformity) {
      return res.status(404).json({
        success: false,
        message: 'Non-conformity not found'
      });
    }

    // Check if there are open CAPA actions
    const openCAPAs = await CapaAction.count({
      where: {
        nc_id: id,
        status: { [Op.in]: ['Submitted', 'Approved', 'In Progress'] }
      }
    });

    if (openCAPAs > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot close non-conformity. There are ${openCAPAs} open CAPA actions associated with it.`
      });
    }

    await nonConformity.update({
      status: 'Closed',
      closure_date: new Date(),
      closure_notes,
      closure_evidence,
      closed_by: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Non-conformity closed successfully',
      data: nonConformity
    });
  } catch (error) {
    console.error('Error closing non-conformity:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing non-conformity',
      error: error.message
    });
  }
};

// Delete non-conformity
exports.deleteNonConformity = async (req, res) => {
  try {
    const { id } = req.params;

    const nonConformity = await NonConformity.findByPk(id);

    if (!nonConformity) {
      return res.status(404).json({
        success: false,
        message: 'Non-conformity not found'
      });
    }

    // Check if there are associated CAPA actions
    const capaCount = await CapaAction.count({ where: { nc_id: id } });

    if (capaCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete non-conformity. It has ${capaCount} associated CAPA actions.`
      });
    }

    await nonConformity.destroy();

    res.status(200).json({
      success: true,
      message: 'Non-conformity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting non-conformity:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting non-conformity',
      error: error.message
    });
  }
};

// Get non-conformities by type
exports.getNonConformitiesByType = async (req, res) => {
  try {
    const { facility_id, start_date, end_date } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (start_date || end_date) {
      where.identified_date = {};
      if (start_date) where.identified_date[Op.gte] = new Date(start_date);
      if (end_date) where.identified_date[Op.lte] = new Date(end_date);
    }

    const byType = await NonConformity.findAll({
      attributes: [
        'nc_type',
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['nc_type', 'severity'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: byType
    });
  } catch (error) {
    console.error('Error fetching NCs by type:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-conformities by type',
      error: error.message
    });
  }
};

// Get non-conformity trends
exports.getNonConformityTrends = async (req, res) => {
  try {
    const { facility_id, start_date, end_date, interval = 'month' } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (start_date || end_date) {
      where.identified_date = {};
      if (start_date) where.identified_date[Op.gte] = new Date(start_date);
      if (end_date) where.identified_date[Op.lte] = new Date(end_date);
    }

    const trends = await NonConformity.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', interval, sequelize.col('identified_date')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN severity = 'Major' THEN 1 ELSE 0 END")), 'major'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN severity = 'Minor' THEN 1 ELSE 0 END")), 'minor'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN severity = 'Observation' THEN 1 ELSE 0 END")), 'observation']
      ],
      where,
      group: [sequelize.fn('DATE_TRUNC', interval, sequelize.col('identified_date'))],
      order: [[sequelize.fn('DATE_TRUNC', interval, sequelize.col('identified_date')), 'ASC']],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching NC trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-conformity trends',
      error: error.message
    });
  }
};

// Get non-conformity statistics
exports.getNonConformityStatistics = async (req, res) => {
  try {
    const { facility_id, start_date, end_date } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (start_date || end_date) {
      where.identified_date = {};
      if (start_date) where.identified_date[Op.gte] = new Date(start_date);
      if (end_date) where.identified_date[Op.lte] = new Date(end_date);
    }

    const [
      totalNCs,
      openNCs,
      closedNCs,
      majorNCs,
      minorNCs,
      observations
    ] = await Promise.all([
      NonConformity.count({ where }),
      NonConformity.count({ where: { ...where, status: 'Open' } }),
      NonConformity.count({ where: { ...where, status: 'Closed' } }),
      NonConformity.count({ where: { ...where, severity: 'Major' } }),
      NonConformity.count({ where: { ...where, severity: 'Minor' } }),
      NonConformity.count({ where: { ...where, severity: 'Observation' } })
    ]);

    // NCs by source
    const bySource = await NonConformity.findAll({
      attributes: [
        'nc_source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['nc_source'],
      raw: true
    });

    // Average closure time
    const closedWithTime = await NonConformity.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.literal("EXTRACT(EPOCH FROM (closure_date - identified_date)) / 86400")), 'avg_days']
      ],
      where: {
        ...where,
        status: 'Closed',
        closure_date: { [Op.ne]: null }
      },
      raw: true
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalNCs,
        open: openNCs,
        closed: closedNCs,
        closure_rate: totalNCs > 0 ? ((closedNCs / totalNCs) * 100).toFixed(2) : 0,
        by_severity: {
          major: majorNCs,
          minor: minorNCs,
          observation: observations
        },
        by_source: bySource,
        average_closure_days: closedWithTime[0]?.avg_days ? Math.round(closedWithTime[0].avg_days) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching NC statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-conformity statistics',
      error: error.message
    });
  }
};

// Get overdue non-conformities
exports.getOverdueNonConformities = async (req, res) => {
  try {
    const { facility_id } = req.query;

    const where = {
      status: { [Op.in]: ['Open', 'In Progress'] },
      target_closure_date: { [Op.lt]: new Date() }
    };

    if (facility_id) where.facility_id = facility_id;

    const overdueNCs = await NonConformity.findAll({
      where,
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility',
          attributes: ['id', 'facility_name', 'facility_code']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['target_closure_date', 'ASC']]
    });

    const ncsWithDays = overdueNCs.map(nc => {
      const daysOverdue = Math.ceil(
        (new Date() - new Date(nc.target_closure_date)) / (1000 * 60 * 60 * 24)
      );

      return {
        ...nc.toJSON(),
        days_overdue: daysOverdue,
        urgency: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium'
      };
    });

    res.status(200).json({
      success: true,
      data: ncsWithDays,
      count: ncsWithDays.length
    });
  } catch (error) {
    console.error('Error fetching overdue NCs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue non-conformities',
      error: error.message
    });
  }
};

// Helper function: Generate NC reference
function generateNCReference() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `NC-${year}${month}-${random}`;
}

module.exports = exports;

