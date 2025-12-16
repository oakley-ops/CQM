const { ManufacturingFacility, User, TestResult, Audit, NonConformity, CapaAction, QmsDocument, CardBatch, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Manufacturing Facility Controller for CQM System
 * Manages manufacturing facilities (formerly Projects)
 */

// Get all facilities with filtering and pagination
exports.getAllFacilities = async (req, res) => {
  try {
    const {
      country,
      location,
      technology,
      cqm_status,
      certification_status,
      facility_type,
      search,
      page = 1,
      limit = 20,
      sortBy = 'facility_name',
      sortOrder = 'ASC'
    } = req.query;

    // Build where clause
    const where = {};

    if (country) where.country = country;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (technology) where.technology = technology;
    if (cqm_status) where.cqm_status = cqm_status;
    if (certification_status) where.certification_status = certification_status;
    if (facility_type) where.facility_type = facility_type;

    // Search functionality
    if (search) {
      where[Op.or] = [
        { facility_name: { [Op.iLike]: `%${search}%` } },
        { facility_code: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { company_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch facilities
    const { count, rows: facilities } = await ManufacturingFacility.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'facilityManager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    // Get statistics for each facility
    const facilitiesWithStats = await Promise.all(
      facilities.map(async (facility) => {
        const stats = await getFacilityStats(facility.id);
        return {
          ...facility.toJSON(),
          stats
        };
      })
    );

    res.status(200).json({
      success: true,
      data: facilitiesWithStats,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching facilities',
      error: error.message
    });
  }
};

// Get facility by ID
exports.getFacilityById = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await ManufacturingFacility.findByPk(id, {
      include: [
        {
          model: User,
          as: 'facilityManager',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        }
      ]
    });

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Get comprehensive statistics
    const stats = await getFacilityStats(id);

    // Get recent activities
    const recentActivities = await getRecentActivities(id);

    res.status(200).json({
      success: true,
      data: {
        ...facility.toJSON(),
        stats,
        recent_activities: recentActivities
      }
    });
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching facility',
      error: error.message
    });
  }
};

// Create facility
exports.createFacility = async (req, res) => {
  try {
    const facilityData = {
      ...req.body,
      created_by: req.user.id
    };

    const facility = await ManufacturingFacility.create(facilityData);

    const createdFacility = await ManufacturingFacility.findByPk(facility.id, {
      include: [
        {
          model: User,
          as: 'facilityManager'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Manufacturing facility created successfully',
      data: createdFacility
    });
  } catch (error) {
    console.error('Error creating facility:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating facility',
      error: error.message
    });
  }
};

// Update facility
exports.updateFacility = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await ManufacturingFacility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    await facility.update(req.body);

    const updatedFacility = await ManufacturingFacility.findByPk(id, {
      include: [
        {
          model: User,
          as: 'facilityManager'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Facility updated successfully',
      data: updatedFacility
    });
  } catch (error) {
    console.error('Error updating facility:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating facility',
      error: error.message
    });
  }
};

// Delete facility
exports.deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await ManufacturingFacility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    await facility.destroy();

    res.status(200).json({
      success: true,
      message: 'Facility deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting facility:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting facility',
      error: error.message
    });
  }
};

// Get CQM label for facility
exports.getCQMLabel = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await ManufacturingFacility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    const cqmLabel = facility.cqm_label || generateCQMLabel(facility);

    res.status(200).json({
      success: true,
      data: {
        facility_id: facility.id,
        facility_name: facility.facility_name,
        cqm_label: cqmLabel,
        label_structure: parseCQMLabel(cqmLabel),
        certification_status: facility.certification_status,
        certificate_expiry_date: facility.certificate_expiry_date
      }
    });
  } catch (error) {
    console.error('Error fetching CQM label:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching CQM label',
      error: error.message
    });
  }
};

// Update certification status
exports.updateCertificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      certification_status,
      certificate_number,
      certificate_issue_date,
      certificate_expiry_date,
      certification_body,
      audit_type,
      notes
    } = req.body;

    const facility = await ManufacturingFacility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    await facility.update({
      certification_status,
      certificate_number,
      certificate_issue_date,
      certificate_expiry_date,
      certification_body,
      last_audit_type: audit_type,
      last_audit_date: new Date(),
      notes: notes ? `${facility.notes || ''}\n\n${new Date().toISOString()}: ${notes}` : facility.notes
    });

    res.status(200).json({
      success: true,
      message: 'Certification status updated successfully',
      data: facility
    });
  } catch (error) {
    console.error('Error updating certification status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating certification status',
      error: error.message
    });
  }
};

// Get facility dashboard data
exports.getFacilityDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await ManufacturingFacility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Get comprehensive statistics
    const stats = await getFacilityStats(id);

    // Get upcoming audits
    const upcomingAudits = await Audit.findAll({
      where: {
        facility_id: id,
        scheduled_date: { [Op.gte]: new Date() },
        audit_status: { [Op.in]: ['Scheduled', 'In Progress'] }
      },
      order: [['scheduled_date', 'ASC']],
      limit: 5
    });

    // Get open non-conformities
    const openNCs = await NonConformity.findAll({
      where: {
        facility_id: id,
        status: { [Op.in]: ['Open', 'In Progress'] }
      },
      order: [['severity', 'DESC'], ['identified_date', 'DESC']],
      limit: 10
    });

    // Get pending CAPAs
    const pendingCAPAs = await CapaAction.findAll({
      where: {
        facility_id: id,
        status: { [Op.in]: ['Submitted', 'Approved', 'In Progress'] }
      },
      order: [['target_completion_date', 'ASC']],
      limit: 10
    });

    // Get recent test results
    const recentTests = await TestResult.findAll({
      where: { facility_id: id },
      order: [['test_date', 'DESC']],
      limit: 10
    });

    // Get expiring certificates
    const daysUntilExpiry = facility.certificate_expiry_date 
      ? Math.ceil((new Date(facility.certificate_expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const certificationAlert = daysUntilExpiry !== null && daysUntilExpiry < 90 ? {
      type: daysUntilExpiry < 30 ? 'critical' : 'warning',
      message: `Certificate expires in ${daysUntilExpiry} days`,
      days_remaining: daysUntilExpiry
    } : null;

    res.status(200).json({
      success: true,
      data: {
        facility: facility.toJSON(),
        stats,
        upcoming_audits: upcomingAudits,
        open_non_conformities: openNCs,
        pending_capas: pendingCAPAs,
        recent_test_results: recentTests,
        certification_alert: certificationAlert
      }
    });
  } catch (error) {
    console.error('Error fetching facility dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching facility dashboard',
      error: error.message
    });
  }
};

// Get facilities by country
exports.getFacilitiesByCountry = async (req, res) => {
  try {
    const facilitiesByCountry = await ManufacturingFacility.findAll({
      attributes: [
        'country',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['country'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: facilitiesByCountry
    });
  } catch (error) {
    console.error('Error fetching facilities by country:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching facilities by country',
      error: error.message
    });
  }
};

// Get facilities by technology
exports.getFacilitiesByTechnology = async (req, res) => {
  try {
    const facilitiesByTech = await ManufacturingFacility.findAll({
      attributes: [
        'technology',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['technology'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: facilitiesByTech
    });
  } catch (error) {
    console.error('Error fetching facilities by technology:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching facilities by technology',
      error: error.message
    });
  }
};

// Get expiring certificates
exports.getExpiringCertificates = async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const facilities = await ManufacturingFacility.findAll({
      where: {
        certificate_expiry_date: {
          [Op.lte]: expiryDate,
          [Op.gte]: new Date()
        },
        certification_status: { [Op.in]: ['Certified', 'Active'] }
      },
      order: [['certificate_expiry_date', 'ASC']],
      include: [
        {
          model: User,
          as: 'facilityManager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    const facilitiesWithDays = facilities.map(facility => {
      const daysRemaining = Math.ceil(
        (new Date(facility.certificate_expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...facility.toJSON(),
        days_until_expiry: daysRemaining,
        urgency: daysRemaining < 30 ? 'critical' : daysRemaining < 60 ? 'high' : 'medium'
      };
    });

    res.status(200).json({
      success: true,
      data: facilitiesWithDays,
      count: facilitiesWithDays.length
    });
  } catch (error) {
    console.error('Error fetching expiring certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring certificates',
      error: error.message
    });
  }
};

// Helper function: Get facility statistics
async function getFacilityStats(facilityId) {
  try {
    const [
      totalTests,
      passedTests,
      failedTests,
      totalAudits,
      openNCs,
      closedNCs,
      pendingCAPAs,
      completedCAPAs,
      totalBatches,
      documents
    ] = await Promise.all([
      TestResult.count({ where: { facility_id: facilityId } }),
      TestResult.count({ where: { facility_id: facilityId, result_status: 'Pass' } }),
      TestResult.count({ where: { facility_id: facilityId, result_status: 'Fail' } }),
      Audit.count({ where: { facility_id: facilityId } }),
      NonConformity.count({ where: { facility_id: facilityId, status: { [Op.in]: ['Open', 'In Progress'] } } }),
      NonConformity.count({ where: { facility_id: facilityId, status: 'Closed' } }),
      CapaAction.count({ where: { facility_id: facilityId, status: { [Op.in]: ['Submitted', 'Approved', 'In Progress'] } } }),
      CapaAction.count({ where: { facility_id: facilityId, status: 'Completed' } }),
      CardBatch.count({ where: { facility_id: facilityId } }),
      QmsDocument.count({ where: { facility_id: facilityId } })
    ]);

    return {
      tests: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        pass_rate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0
      },
      audits: {
        total: totalAudits
      },
      non_conformities: {
        open: openNCs,
        closed: closedNCs,
        total: openNCs + closedNCs
      },
      capa_actions: {
        pending: pendingCAPAs,
        completed: completedCAPAs,
        total: pendingCAPAs + completedCAPAs
      },
      batches: {
        total: totalBatches
      },
      documents: {
        total: documents
      }
    };
  } catch (error) {
    console.error('Error calculating facility stats:', error);
    return null;
  }
}

// Helper function: Get recent activities
async function getRecentActivities(facilityId) {
  try {
    const activities = [];

    // Recent audits
    const recentAudits = await Audit.findAll({
      where: { facility_id: facilityId },
      order: [['scheduled_date', 'DESC']],
      limit: 3
    });
    activities.push(...recentAudits.map(a => ({
      type: 'audit',
      date: a.scheduled_date,
      description: `${a.audit_type} audit - ${a.audit_status}`,
      data: a
    })));

    // Recent NCs
    const recentNCs = await NonConformity.findAll({
      where: { facility_id: facilityId },
      order: [['identified_date', 'DESC']],
      limit: 3
    });
    activities.push(...recentNCs.map(nc => ({
      type: 'non_conformity',
      date: nc.identified_date,
      description: `${nc.nc_type} NC - ${nc.severity}`,
      data: nc
    })));

    // Sort by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return activities.slice(0, 10);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}

// Helper function: Generate CQM label
function generateCQMLabel(facility) {
  // Format: ACCLLTTTTS
  // CC = Country code
  // LL = Location
  // TTTT = Technology (Contact/Dual/Contactless)
  // S = Status (R=Recognition, A=Approval)
  
  const countryCode = (facility.country || 'XX').substring(0, 2).toUpperCase();
  const locationCode = (facility.location || 'XX').substring(0, 2).toUpperCase();
  const techMap = {
    'Contact': 'CONT',
    'Dual Interface': 'DUAL',
    'Contactless': 'CTLS',
    'Hybrid': 'HYBR'
  };
  const techCode = techMap[facility.technology] || 'OTHR';
  const statusCode = facility.certification_status === 'Certified' ? 'A' : 'R';

  return `${countryCode}${locationCode}${techCode}${statusCode}`;
}

// Helper function: Parse CQM label
function parseCQMLabel(label) {
  if (!label || label.length < 9) return null;

  return {
    country_code: label.substring(0, 2),
    location_code: label.substring(2, 4),
    technology_code: label.substring(4, 8),
    status_code: label.substring(8, 9),
    full_label: label
  };
}

module.exports = exports;

