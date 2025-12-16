const { Audit, ManufacturingFacility, User, NonConformity, CapaAction, QmsDocument, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Audit Controller for CQM System
 * Manages CQM audits (formerly Milestones)
 */

// Get all audits with filtering and pagination
exports.getAllAudits = async (req, res) => {
  try {
    const {
      facility_id,
      audit_type,
      audit_status,
      auditor_id,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 20,
      sortBy = 'scheduled_date',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};

    if (facility_id) where.facility_id = facility_id;
    if (audit_type) where.audit_type = audit_type;
    if (audit_status) where.audit_status = audit_status;
    if (auditor_id) where.auditor_id = auditor_id;

    // Date range filter
    if (start_date || end_date) {
      where.scheduled_date = {};
      if (start_date) where.scheduled_date[Op.gte] = new Date(start_date);
      if (end_date) where.scheduled_date[Op.lte] = new Date(end_date);
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { audit_reference: { [Op.iLike]: `%${search}%` } },
        { audit_title: { [Op.iLike]: `%${search}%` } },
        { scope: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch audits
    const { count, rows: audits } = await Audit.findAndCountAll({
      where,
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility',
          attributes: ['id', 'facility_name', 'facility_code', 'country', 'location']
        },
        {
          model: User,
          as: 'auditor',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'leadAuditor',
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
      scheduled: await Audit.count({ where: { ...where, audit_status: 'Scheduled' } }),
      in_progress: await Audit.count({ where: { ...where, audit_status: 'In Progress' } }),
      completed: await Audit.count({ where: { ...where, audit_status: 'Completed' } }),
      by_type: {
        initial: await Audit.count({ where: { ...where, audit_type: 'Initial' } }),
        surveillance: await Audit.count({ where: { ...where, audit_type: 'Surveillance' } }),
        recertification: await Audit.count({ where: { ...where, audit_type: 'Re-certification' } })
      }
    };

    res.status(200).json({
      success: true,
      data: audits,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audits',
      error: error.message
    });
  }
};

// Get audit by ID
exports.getAuditById = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: User,
          as: 'auditor',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: User,
          as: 'leadAuditor',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        }
      ]
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Get related non-conformities
    const nonConformities = await NonConformity.findAll({
      where: { audit_id: id },
      include: [
        {
          model: User,
          as: 'identifier',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    // Get related CAPA actions
    const capaActions = await CapaAction.findAll({
      where: { audit_id: id },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    // Get related documents
    const documents = await QmsDocument.findAll({
      where: { related_audit_id: id },
      attributes: ['id', 'document_reference', 'document_name', 'document_type']
    });

    res.status(200).json({
      success: true,
      data: {
        ...audit.toJSON(),
        non_conformities: nonConformities,
        capa_actions: capaActions,
        documents: documents,
        stats: {
          total_ncs: nonConformities.length,
          major_ncs: nonConformities.filter(nc => nc.severity === 'Major').length,
          minor_ncs: nonConformities.filter(nc => nc.severity === 'Minor').length,
          observations: nonConformities.filter(nc => nc.severity === 'Observation').length,
          total_capas: capaActions.length,
          pending_capas: capaActions.filter(c => ['Submitted', 'Approved', 'In Progress'].includes(c.status)).length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit',
      error: error.message
    });
  }
};

// Schedule audit
exports.scheduleAudit = async (req, res) => {
  try {
    const auditData = {
      ...req.body,
      audit_reference: req.body.audit_reference || generateAuditReference(),
      audit_status: 'Scheduled',
      created_by: req.user.id
    };

    const audit = await Audit.create(auditData);

    const createdAudit = await Audit.findByPk(audit.id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: User,
          as: 'auditor'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Audit scheduled successfully',
      data: createdAudit
    });
  } catch (error) {
    console.error('Error scheduling audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling audit',
      error: error.message
    });
  }
};

// Update audit
exports.updateAudit = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findByPk(id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    await audit.update(req.body);

    const updatedAudit = await Audit.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: User,
          as: 'auditor'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Audit updated successfully',
      data: updatedAudit
    });
  } catch (error) {
    console.error('Error updating audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating audit',
      error: error.message
    });
  }
};

// Start audit (change status to In Progress)
exports.startAudit = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findByPk(id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    await audit.update({
      audit_status: 'In Progress',
      actual_start_date: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Audit started successfully',
      data: audit
    });
  } catch (error) {
    console.error('Error starting audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting audit',
      error: error.message
    });
  }
};

// Complete audit
exports.completeAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const { findings_summary, recommendations, overall_result } = req.body;

    const audit = await Audit.findByPk(id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Count non-conformities
    const ncCounts = await NonConformity.findAll({
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { audit_id: id },
      group: ['severity'],
      raw: true
    });

    const ncSummary = ncCounts.reduce((acc, item) => {
      acc[item.severity.toLowerCase()] = parseInt(item.count);
      return acc;
    }, { major: 0, minor: 0, observation: 0 });

    await audit.update({
      audit_status: 'Completed',
      completion_date: new Date(),
      findings_summary,
      recommendations,
      overall_result,
      major_nc_count: ncSummary.major,
      minor_nc_count: ncSummary.minor,
      observation_count: ncSummary.observation
    });

    res.status(200).json({
      success: true,
      message: 'Audit completed successfully',
      data: audit
    });
  } catch (error) {
    console.error('Error completing audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing audit',
      error: error.message
    });
  }
};

// Generate audit report
exports.generateAuditReport = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: User,
          as: 'auditor'
        },
        {
          model: User,
          as: 'leadAuditor'
        }
      ]
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Get all related data
    const nonConformities = await NonConformity.findAll({
      where: { audit_id: id },
      include: [
        {
          model: User,
          as: 'identifier',
          attributes: ['first_name', 'last_name']
        }
      ]
    });

    const capaActions = await CapaAction.findAll({
      where: { audit_id: id },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['first_name', 'last_name']
        }
      ]
    });

    // Generate report data
    const report = {
      audit_information: {
        reference: audit.audit_reference,
        title: audit.audit_title,
        type: audit.audit_type,
        scope: audit.scope,
        scheduled_date: audit.scheduled_date,
        actual_start_date: audit.actual_start_date,
        completion_date: audit.completion_date,
        duration_days: audit.duration_days
      },
      facility_information: {
        name: audit.facility.facility_name,
        code: audit.facility.facility_code,
        location: `${audit.facility.location}, ${audit.facility.country}`,
        technology: audit.facility.technology
      },
      audit_team: {
        lead_auditor: audit.leadAuditor ? `${audit.leadAuditor.first_name} ${audit.leadAuditor.last_name}` : null,
        auditor: audit.auditor ? `${audit.auditor.first_name} ${audit.auditor.last_name}` : null,
        team_members: audit.audit_team
      },
      findings: {
        summary: audit.findings_summary,
        major_ncs: audit.major_nc_count,
        minor_ncs: audit.minor_nc_count,
        observations: audit.observation_count,
        details: nonConformities.map(nc => ({
          reference: nc.nc_reference,
          type: nc.nc_type,
          severity: nc.severity,
          description: nc.description,
          requirement: nc.requirement_reference,
          identified_date: nc.identified_date,
          status: nc.status
        }))
      },
      corrective_actions: capaActions.map(capa => ({
        reference: capa.capa_reference,
        title: capa.capa_title,
        type: capa.capa_type,
        assigned_to: capa.assignee ? `${capa.assignee.first_name} ${capa.assignee.last_name}` : null,
        target_date: capa.target_completion_date,
        status: capa.status
      })),
      recommendations: audit.recommendations,
      overall_result: audit.overall_result,
      next_audit: {
        type: getNextAuditType(audit.audit_type),
        recommended_date: calculateNextAuditDate(audit.audit_type, audit.completion_date)
      }
    };

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating audit report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating audit report',
      error: error.message
    });
  }
};

// Delete audit
exports.deleteAudit = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findByPk(id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check if audit has associated data
    const ncCount = await NonConformity.count({ where: { audit_id: id } });
    const capaCount = await CapaAction.count({ where: { audit_id: id } });

    if (ncCount > 0 || capaCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete audit. It has ${ncCount} non-conformities and ${capaCount} CAPA actions. Consider marking as Cancelled instead.`
      });
    }

    await audit.destroy();

    res.status(200).json({
      success: true,
      message: 'Audit deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting audit:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting audit',
      error: error.message
    });
  }
};

// Get upcoming audits
exports.getUpcomingAudits = async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const audits = await Audit.findAll({
      where: {
        scheduled_date: {
          [Op.gte]: new Date(),
          [Op.lte]: futureDate
        },
        audit_status: { [Op.in]: ['Scheduled', 'In Progress'] }
      },
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility',
          attributes: ['id', 'facility_name', 'facility_code', 'country']
        },
        {
          model: User,
          as: 'auditor',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['scheduled_date', 'ASC']]
    });

    const auditsWithDays = audits.map(audit => {
      const daysUntil = Math.ceil(
        (new Date(audit.scheduled_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...audit.toJSON(),
        days_until_audit: daysUntil,
        urgency: daysUntil <= 7 ? 'high' : daysUntil <= 30 ? 'medium' : 'low'
      };
    });

    res.status(200).json({
      success: true,
      data: auditsWithDays,
      count: auditsWithDays.length
    });
  } catch (error) {
    console.error('Error fetching upcoming audits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming audits',
      error: error.message
    });
  }
};

// Get audit statistics
exports.getAuditStatistics = async (req, res) => {
  try {
    const { facility_id, start_date, end_date } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (start_date || end_date) {
      where.scheduled_date = {};
      if (start_date) where.scheduled_date[Op.gte] = new Date(start_date);
      if (end_date) where.scheduled_date[Op.lte] = new Date(end_date);
    }

    const [
      totalAudits,
      scheduledAudits,
      inProgressAudits,
      completedAudits,
      passedAudits,
      failedAudits
    ] = await Promise.all([
      Audit.count({ where }),
      Audit.count({ where: { ...where, audit_status: 'Scheduled' } }),
      Audit.count({ where: { ...where, audit_status: 'In Progress' } }),
      Audit.count({ where: { ...where, audit_status: 'Completed' } }),
      Audit.count({ where: { ...where, overall_result: 'Pass' } }),
      Audit.count({ where: { ...where, overall_result: 'Fail' } })
    ]);

    // Audits by type
    const byType = await Audit.findAll({
      attributes: [
        'audit_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['audit_type'],
      raw: true
    });

    // Average NCs per audit
    const avgNCs = await Audit.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('major_nc_count')), 'avg_major'],
        [sequelize.fn('AVG', sequelize.col('minor_nc_count')), 'avg_minor'],
        [sequelize.fn('AVG', sequelize.col('observation_count')), 'avg_observations']
      ],
      where,
      raw: true
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalAudits,
        scheduled: scheduledAudits,
        in_progress: inProgressAudits,
        completed: completedAudits,
        passed: passedAudits,
        failed: failedAudits,
        pass_rate: completedAudits > 0 ? ((passedAudits / completedAudits) * 100).toFixed(2) : 0,
        by_type: byType,
        average_ncs: avgNCs[0] || { avg_major: 0, avg_minor: 0, avg_observations: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit statistics',
      error: error.message
    });
  }
};

// Helper function: Generate audit reference
function generateAuditReference() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `AUD-${year}${month}-${random}`;
}

// Helper function: Get next audit type
function getNextAuditType(currentType) {
  const auditCycle = {
    'Initial': 'Surveillance',
    'Surveillance': 'Surveillance',
    'Re-certification': 'Surveillance'
  };
  return auditCycle[currentType] || 'Surveillance';
}

// Helper function: Calculate next audit date
function calculateNextAuditDate(auditType, completionDate) {
  if (!completionDate) return null;
  
  const date = new Date(completionDate);
  
  // Surveillance audits: every 12 months
  // Re-certification: every 36 months
  const monthsToAdd = auditType === 'Re-certification' ? 36 : 12;
  
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
}

module.exports = exports;

