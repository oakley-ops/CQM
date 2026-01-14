const { sequelize, TestSession, TestEntry, TestCategory, TestDefinition } = require('../models');
const { ManufacturingFacility } = require('../models');
const { Op } = require('sequelize');

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

// Get test entry metrics for dashboard
exports.getTestEntryMetrics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Tests today
    const testsToday = await TestEntry.count({
      where: {
        created_at: { [Op.gte]: today }
      }
    });

    // Tests this week
    const testsThisWeek = await TestEntry.count({
      where: {
        created_at: { [Op.gte]: weekAgo }
      }
    });

    // Tests this month
    const testsThisMonth = await TestEntry.count({
      where: {
        created_at: { [Op.gte]: monthAgo }
      }
    });

    // Overall pass rate
    const allEntries = await TestEntry.findAll({
      where: {
        pass_status: { [Op.not]: null }
      },
      attributes: ['pass_status']
    });

    const totalWithStatus = allEntries.length;
    const passedCount = allEntries.filter(e => e.pass_status === true).length;
    const overallPassRate = totalWithStatus > 0
      ? Math.round((passedCount / totalWithStatus) * 100)
      : 0;

    // Sessions count by status
    const sessionsCount = {
      draft: await TestSession.count({ where: { status: 'draft' } }),
      submitted: await TestSession.count({ where: { status: 'submitted' } }),
      approved: await TestSession.count({ where: { status: 'approved' } }),
      rejected: await TestSession.count({ where: { status: 'rejected' } })
    };

    // Tests by category
    const categories = await TestCategory.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC']]
    });

    const testsByCategory = await Promise.all(
      categories.map(async (category) => {
        const definitions = await TestDefinition.findAll({
          where: { category_id: category.id },
          attributes: ['id']
        });
        const definitionIds = definitions.map(d => d.id);

        if (definitionIds.length === 0) {
          return {
            categoryCode: category.category_code,
            categoryName: category.category_name,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            passRate: 0
          };
        }

        const entries = await TestEntry.findAll({
          where: {
            test_definition_id: { [Op.in]: definitionIds },
            pass_status: { [Op.not]: null }
          },
          attributes: ['pass_status']
        });

        const total = entries.length;
        const passed = entries.filter(e => e.pass_status === true).length;
        const failed = entries.filter(e => e.pass_status === false).length;

        return {
          categoryCode: category.category_code,
          categoryName: category.category_name,
          totalTests: total,
          passedTests: passed,
          failedTests: failed,
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0
        };
      })
    );

    // Pass rate trend (last 7 days)
    const passRateTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEntries = await TestEntry.findAll({
        where: {
          created_at: {
            [Op.gte]: date,
            [Op.lt]: nextDate
          },
          pass_status: { [Op.not]: null }
        },
        attributes: ['pass_status']
      });

      const dayTotal = dayEntries.length;
      const dayPassed = dayEntries.filter(e => e.pass_status === true).length;

      passRateTrend.push({
        date: date.toISOString().split('T')[0],
        passRate: dayTotal > 0 ? Math.round((dayPassed / dayTotal) * 100) : 0,
        totalTests: dayTotal
      });
    }

    // Recent sessions
    const recentSessions = await TestSession.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [{
        model: TestEntry,
        as: 'entries',
        attributes: ['id', 'pass_status']
      }]
    });

    const formattedSessions = recentSessions.map(session => {
      const entries = session.entries || [];
      const totalTests = entries.length;
      const passedTests = entries.filter(e => e.pass_status === true).length;
      const failedTests = entries.filter(e => e.pass_status === false).length;

      return {
        ...session.toJSON(),
        totalTests,
        passedTests,
        failedTests,
        passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        testsToday,
        testsThisWeek,
        testsThisMonth,
        overallPassRate,
        sessionsCount,
        testsByCategory,
        passRateTrend,
        recentSessions: formattedSessions
      }
    });
  } catch (error) {
    console.error('Error getting test entry metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting test entry metrics',
      error: error.message
    });
  }
};

module.exports = exports;
