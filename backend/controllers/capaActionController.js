const { CapaAction, ManufacturingFacility, NonConformity, Audit, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * CAPA Action Controller for CQM System
 * Manages Corrective and Preventive Actions (formerly ChangeRequests)
 */

// Get all CAPA actions with filtering and pagination
exports.getAllCapaActions = async (req, res) => {
  try {
    const {
      facility_id,
      nc_id,
      audit_id,
      capa_type,
      status,
      priority,
      assigned_to,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 20,
      sortBy = 'submission_date',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};

    if (facility_id) where.facility_id = facility_id;
    if (nc_id) where.nc_id = nc_id;
    if (audit_id) where.audit_id = audit_id;
    if (capa_type) where.capa_type = capa_type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_to) where.assigned_to = assigned_to;

    // Date range filter
    if (start_date || end_date) {
      where.submission_date = {};
      if (start_date) where.submission_date[Op.gte] = new Date(start_date);
      if (end_date) where.submission_date[Op.lte] = new Date(end_date);
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { capa_reference: { [Op.iLike]: `%${search}%` } },
        { capa_title: { [Op.iLike]: `%${search}%` } },
        { problem_statement: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch CAPA actions
    const { count, rows: capaActions } = await CapaAction.findAndCountAll({
      where,
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility',
          attributes: ['id', 'facility_name', 'facility_code', 'country']
        },
        {
          model: NonConformity,
          as: 'nonConformity',
          attributes: ['id', 'nc_reference', 'severity', 'description']
        },
        {
          model: Audit,
          as: 'audit',
          attributes: ['id', 'audit_reference', 'audit_type']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'raiser',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    // Calculate statistics
    const stats = {
      total: count,
      submitted: await CapaAction.count({ where: { ...where, status: 'Submitted' } }),
      approved: await CapaAction.count({ where: { ...where, status: 'Approved' } }),
      in_progress: await CapaAction.count({ where: { ...where, status: 'In Progress' } }),
      completed: await CapaAction.count({ where: { ...where, status: 'Completed' } }),
      verified: await CapaAction.count({ where: { ...where, status: 'Verified' } }),
      by_type: {
        corrective: await CapaAction.count({ where: { ...where, capa_type: 'Corrective' } }),
        preventive: await CapaAction.count({ where: { ...where, capa_type: 'Preventive' } }),
        both: await CapaAction.count({ where: { ...where, capa_type: 'Both' } })
      }
    };

    res.status(200).json({
      success: true,
      data: capaActions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching CAPA actions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching CAPA actions',
      error: error.message
    });
  }
};

// Get CAPA action by ID
exports.getCapaActionById = async (req, res) => {
  try {
    const { id } = req.params;

    const capaAction = await CapaAction.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: NonConformity,
          as: 'nonConformity'
        },
        {
          model: Audit,
          as: 'audit'
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: User,
          as: 'raiser',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'verifier',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    // Calculate days until due
    const daysUntilDue = capaAction.getDaysUntilDue();
    const isOverdue = capaAction.isOverdue();

    res.status(200).json({
      success: true,
      data: {
        ...capaAction.toJSON(),
        days_until_due: daysUntilDue,
        is_overdue: isOverdue
      }
    });
  } catch (error) {
    console.error('Error fetching CAPA action:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching CAPA action',
      error: error.message
    });
  }
};

// Create CAPA action
exports.createCapaAction = async (req, res) => {
  try {
    const capaData = {
      ...req.body,
      capa_reference: req.body.capa_reference || generateCapaReference(),
      raised_by: req.user.id,
      status: 'Submitted',
      submission_date: new Date()
    };

    const capaAction = await CapaAction.create(capaData);

    const createdCapa = await CapaAction.findByPk(capaAction.id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: NonConformity,
          as: 'nonConformity'
        },
        {
          model: User,
          as: 'assignee'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'CAPA action created successfully',
      data: createdCapa
    });
  } catch (error) {
    console.error('Error creating CAPA action:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating CAPA action',
      error: error.message
    });
  }
};

// Create CAPA from non-conformity
exports.createCapaFromNC = async (req, res) => {
  try {
    const { nc_id } = req.params;
    const { capa_title, proposed_action, action_plan, assigned_to, target_completion_date, priority } = req.body;

    // Get the non-conformity
    const nc = await NonConformity.findByPk(nc_id);

    if (!nc) {
      return res.status(404).json({
        success: false,
        message: 'Non-conformity not found'
      });
    }

    // Create CAPA
    const capaData = {
      nc_id: nc_id,
      facility_id: nc.facility_id,
      audit_id: nc.audit_id,
      capa_reference: generateCapaReference(),
      capa_title: capa_title || `CAPA for ${nc.nc_reference}`,
      capa_type: 'Corrective',
      problem_statement: nc.description,
      root_cause: nc.root_cause || 'To be determined',
      proposed_action,
      action_plan,
      assigned_to,
      raised_by: req.user.id,
      target_completion_date,
      priority: priority || nc.severity === 'Major' ? 'Critical' : 'High',
      status: 'Submitted',
      submission_date: new Date()
    };

    const capaAction = await CapaAction.create(capaData);

    const createdCapa = await CapaAction.findByPk(capaAction.id, {
      include: [
        {
          model: NonConformity,
          as: 'nonConformity'
        },
        {
          model: User,
          as: 'assignee'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'CAPA action created from non-conformity',
      data: createdCapa
    });
  } catch (error) {
    console.error('Error creating CAPA from NC:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating CAPA action from non-conformity',
      error: error.message
    });
  }
};

// Update CAPA action
exports.updateCapaAction = async (req, res) => {
  try {
    const { id } = req.params;

    const capaAction = await CapaAction.findByPk(id);

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    await capaAction.update(req.body);

    const updatedCapa = await CapaAction.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: NonConformity,
          as: 'nonConformity'
        },
        {
          model: User,
          as: 'assignee'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'CAPA action updated successfully',
      data: updatedCapa
    });
  } catch (error) {
    console.error('Error updating CAPA action:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating CAPA action',
      error: error.message
    });
  }
};

// Approve CAPA action
exports.approveCapaAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_comments } = req.body;

    const capaAction = await CapaAction.findByPk(id);

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    await capaAction.update({
      approval_status: 'Approved',
      approved_by: req.user.id,
      approval_date: new Date(),
      status: 'Approved',
      notes: approval_comments ? `${capaAction.notes || ''}\n\nApproval: ${approval_comments}` : capaAction.notes
    });

    res.status(200).json({
      success: true,
      message: 'CAPA action approved successfully',
      data: capaAction
    });
  } catch (error) {
    console.error('Error approving CAPA action:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving CAPA action',
      error: error.message
    });
  }
};

// Reject CAPA action
exports.rejectCapaAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const capaAction = await CapaAction.findByPk(id);

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    await capaAction.update({
      approval_status: 'Rejected',
      approved_by: req.user.id,
      approval_date: new Date(),
      status: 'Rejected',
      rejection_reason
    });

    res.status(200).json({
      success: true,
      message: 'CAPA action rejected',
      data: capaAction
    });
  } catch (error) {
    console.error('Error rejecting CAPA action:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting CAPA action',
      error: error.message
    });
  }
};

// Track CAPA completion (update progress)
exports.trackCapaCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress_percentage, current_step, obstacles } = req.body;

    const capaAction = await CapaAction.findByPk(id);

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    const updateData = {
      progress_percentage,
      current_step,
      obstacles
    };

    // Auto-update status based on progress
    if (progress_percentage === 0 && capaAction.status === 'Approved') {
      updateData.status = 'Approved';
    } else if (progress_percentage > 0 && progress_percentage < 100) {
      updateData.status = 'In Progress';
    } else if (progress_percentage === 100) {
      updateData.status = 'Completed';
      updateData.actual_completion_date = new Date();
    }

    await capaAction.update(updateData);

    res.status(200).json({
      success: true,
      message: 'CAPA progress updated successfully',
      data: capaAction
    });
  } catch (error) {
    console.error('Error tracking CAPA completion:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking CAPA completion',
      error: error.message
    });
  }
};

// Verify CAPA effectiveness
exports.verifyCapaEffectiveness = async (req, res) => {
  try {
    const { id } = req.params;
    const { effectiveness_verified, verification_notes, verification_method } = req.body;

    const capaAction = await CapaAction.findByPk(id);

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    if (capaAction.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'CAPA action must be completed before effectiveness can be verified'
      });
    }

    await capaAction.update({
      effectiveness_verified,
      verified_by: req.user.id,
      verification_date: new Date(),
      verification_notes,
      effectiveness_verification_method: verification_method,
      status: effectiveness_verified ? 'Verified' : 'In Progress'
    });

    res.status(200).json({
      success: true,
      message: 'CAPA effectiveness verified successfully',
      data: capaAction
    });
  } catch (error) {
    console.error('Error verifying CAPA effectiveness:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying CAPA effectiveness',
      error: error.message
    });
  }
};

// Close CAPA action
exports.closeCapaAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { closure_notes } = req.body;

    const capaAction = await CapaAction.findByPk(id);

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    if (!capaAction.effectiveness_verified) {
      return res.status(400).json({
        success: false,
        message: 'CAPA effectiveness must be verified before closing'
      });
    }

    await capaAction.update({
      status: 'Closed',
      closure_date: new Date(),
      completion_notes: closure_notes
    });

    res.status(200).json({
      success: true,
      message: 'CAPA action closed successfully',
      data: capaAction
    });
  } catch (error) {
    console.error('Error closing CAPA action:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing CAPA action',
      error: error.message
    });
  }
};

// Delete CAPA action
exports.deleteCapaAction = async (req, res) => {
  try {
    const { id } = req.params;

    const capaAction = await CapaAction.findByPk(id);

    if (!capaAction) {
      return res.status(404).json({
        success: false,
        message: 'CAPA action not found'
      });
    }

    await capaAction.destroy();

    res.status(200).json({
      success: true,
      message: 'CAPA action deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting CAPA action:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting CAPA action',
      error: error.message
    });
  }
};

// Get overdue CAPA actions
exports.getOverdueCapaActions = async (req, res) => {
  try {
    const { facility_id } = req.query;

    const where = {
      status: { [Op.in]: ['Submitted', 'Approved', 'In Progress'] },
      target_completion_date: { [Op.lt]: new Date() }
    };

    if (facility_id) where.facility_id = facility_id;

    const overdueCapas = await CapaAction.findAll({
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
      order: [['target_completion_date', 'ASC']]
    });

    const capasWithDays = overdueCapas.map(capa => {
      const daysOverdue = Math.ceil(
        (new Date() - new Date(capa.target_completion_date)) / (1000 * 60 * 60 * 24)
      );

      return {
        ...capa.toJSON(),
        days_overdue: daysOverdue,
        urgency: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium'
      };
    });

    res.status(200).json({
      success: true,
      data: capasWithDays,
      count: capasWithDays.length
    });
  } catch (error) {
    console.error('Error fetching overdue CAPAs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue CAPA actions',
      error: error.message
    });
  }
};

// Get CAPA statistics
exports.getCapaStatistics = async (req, res) => {
  try {
    const { facility_id, start_date, end_date } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (start_date || end_date) {
      where.submission_date = {};
      if (start_date) where.submission_date[Op.gte] = new Date(start_date);
      if (end_date) where.submission_date[Op.lte] = new Date(end_date);
    }

    const [
      totalCapas,
      submittedCapas,
      approvedCapas,
      inProgressCapas,
      completedCapas,
      verifiedCapas,
      closedCapas
    ] = await Promise.all([
      CapaAction.count({ where }),
      CapaAction.count({ where: { ...where, status: 'Submitted' } }),
      CapaAction.count({ where: { ...where, status: 'Approved' } }),
      CapaAction.count({ where: { ...where, status: 'In Progress' } }),
      CapaAction.count({ where: { ...where, status: 'Completed' } }),
      CapaAction.count({ where: { ...where, status: 'Verified' } }),
      CapaAction.count({ where: { ...where, status: 'Closed' } })
    ]);

    // Average completion time
    const avgCompletion = await CapaAction.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.literal("EXTRACT(EPOCH FROM (actual_completion_date - submission_date)) / 86400")), 'avg_days']
      ],
      where: {
        ...where,
        status: { [Op.in]: ['Completed', 'Verified', 'Closed'] },
        actual_completion_date: { [Op.ne]: null }
      },
      raw: true
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalCapas,
        submitted: submittedCapas,
        approved: approvedCapas,
        in_progress: inProgressCapas,
        completed: completedCapas,
        verified: verifiedCapas,
        closed: closedCapas,
        completion_rate: totalCapas > 0 ? (((completedCapas + verifiedCapas + closedCapas) / totalCapas) * 100).toFixed(2) : 0,
        verification_rate: completedCapas > 0 ? ((verifiedCapas / completedCapas) * 100).toFixed(2) : 0,
        average_completion_days: avgCompletion[0]?.avg_days ? Math.round(avgCompletion[0].avg_days) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching CAPA statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching CAPA statistics',
      error: error.message
    });
  }
};

// Helper function: Generate CAPA reference
function generateCapaReference() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `CAPA-${year}${month}-${random}`;
}

module.exports = exports;

