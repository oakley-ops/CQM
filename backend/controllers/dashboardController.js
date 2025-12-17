const { sequelize } = require('../models');
const { ManufacturingFacility } = require('../models');

/**
 * Dashboard Controller
 * Provides aggregated data for CQM dashboard
 */

// Get main CQM dashboard data
exports.getCQMDashboard = async (req, res) => {
  try {
    // Facility metrics
    const totalFacilities = await ManufacturingFacility.count();
    const activeCertifications = await ManufacturingFacility.count({
      where: { certification_status: 'Active' }
    });
    const pendingCertifications = await ManufacturingFacility.count({
      where: { certification_status: 'Pending' }
    });
    const expiredCertifications = await ManufacturingFacility.count({
      where: { certification_status: 'Expired' }
    });

    // Sample data structure for dashboard
    const dashboardData = {
      complianceMetrics: [
        { label: 'ISO 7810 Compliant', value: totalFacilities, color: '#4caf50' },
        { label: 'Pending Compliance', value: 0, color: '#ff9800' },
      ],
      auditMetrics: [
        { label: 'Completed Audits', value: 0, color: '#2196f3' },
        { label: 'Scheduled Audits', value: 0, color: '#ff9800' },
        { label: 'Overdue Audits', value: 0, color: '#f44336' },
      ],
      ncMetrics: [
        { label: 'Open NCs', value: 0, color: '#f44336' },
        { label: 'Closed NCs', value: 0, color: '#4caf50' },
      ],
      testMetrics: [
        { label: 'Tests Passed', value: 0, color: '#4caf50' },
        { label: 'Tests Failed', value: 0, color: '#f44336' },
        { label: 'Tests Pending', value: 0, color: '#ff9800' },
      ],
      productionMetrics: [
        { label: 'Active Batches', value: 0, color: '#2196f3' },
        { label: 'Completed Batches', value: 0, color: '#4caf50' },
      ],
      certificationMetrics: [
        { label: 'Active', value: activeCertifications, color: '#4caf50' },
        { label: 'Pending', value: pendingCertifications, color: '#ff9800' },
        { label: 'Expired', value: expiredCertifications, color: '#f44336' },
      ],
      facilityStats: {
        totalFacilities,
        activeCertifications,
        pendingCertifications,
        expiredCertifications,
      },
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard data',
      error: error.message
    });
  }
};

// Get compliance metrics
exports.getComplianceMetrics = async (req, res) => {
  try {
    const totalFacilities = await ManufacturingFacility.count();
    
    const metrics = [
      { label: 'ISO 7810 Compliant', value: totalFacilities, color: '#4caf50' },
      { label: 'Pending Compliance', value: 0, color: '#ff9800' },
    ];

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting compliance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting compliance metrics',
      error: error.message
    });
  }
};

// Get audit metrics
exports.getAuditMetrics = async (req, res) => {
  try {
    const metrics = [
      { label: 'Completed Audits', value: 0, color: '#2196f3' },
      { label: 'Scheduled Audits', value: 0, color: '#ff9800' },
      { label: 'Overdue Audits', value: 0, color: '#f44336' },
    ];

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting audit metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting audit metrics',
      error: error.message
    });
  }
};

module.exports = exports;
