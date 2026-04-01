const { sequelize, TestSession, TestEntry, TestCategory, TestDefinition, KpiConfig } = require('../models');
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

    // Count sessions by test_date (not entries by created_at — bulk re-saves reset that timestamp)
    const testsToday = await TestSession.count({
      where: { test_date: { [Op.gte]: today } }
    });

    const testsThisWeek = await TestSession.count({
      where: { test_date: { [Op.gte]: weekAgo } }
    });

    const testsThisMonth = await TestSession.count({
      where: { test_date: { [Op.gte]: monthAgo } }
    });

    // Sessions count by status
    const sessionsCount = {
      draft:     await TestSession.count({ where: { status: 'draft' } }),
      submitted: await TestSession.count({ where: { status: 'submitted' } }),
      approved:  await TestSession.count({ where: { status: 'approved' } }),
      rejected:  await TestSession.count({ where: { status: 'rejected' } })
    };

    // Only count entries from submitted or approved sessions for pass rates
    // (drafts are works-in-progress and should not skew quality metrics)
    const completedSessions = await TestSession.findAll({
      where: { status: { [Op.in]: ['submitted', 'approved'] } },
      attributes: ['id']
    });
    const completedSessionIds = completedSessions.map(s => s.id);

    // Overall pass rate (submitted + approved sessions only)
    let overallPassRate = 0;
    if (completedSessionIds.length > 0) {
      const allEntries = await TestEntry.findAll({
        where: {
          session_id: { [Op.in]: completedSessionIds },
          pass_status: { [Op.not]: null }
        },
        attributes: ['pass_status']
      });
      const totalWithStatus = allEntries.length;
      const passedCount = allEntries.filter(e => e.pass_status === true).length;
      overallPassRate = totalWithStatus > 0
        ? Math.round((passedCount / totalWithStatus) * 100)
        : 0;
    }

    // Tests by category (submitted + approved sessions only)
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

        if (definitionIds.length === 0 || completedSessionIds.length === 0) {
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
            session_id: { [Op.in]: completedSessionIds },
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

    // Pass rate trend (last N days) — keyed by session test_date, submitted/approved only
    const trendDays = Math.min(Math.max(parseInt(req.query.trendDays) || 7, 1), 90);
    const passRateTrend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySessions = await TestSession.findAll({
        where: {
          test_date: { [Op.gte]: date, [Op.lt]: nextDate },
          status: { [Op.in]: ['submitted', 'approved'] }
        },
        attributes: ['id']
      });
      const daySessionIds = daySessions.map(s => s.id);

      let dayTotal = 0;
      let dayPassed = 0;
      if (daySessionIds.length > 0) {
        const dayEntries = await TestEntry.findAll({
          where: {
            session_id: { [Op.in]: daySessionIds },
            pass_status: { [Op.not]: null }
          },
          attributes: ['pass_status']
        });
        dayTotal = dayEntries.length;
        dayPassed = dayEntries.filter(e => e.pass_status === true).length;
      }

      passRateTrend.push({
        date: date.toISOString().split('T')[0],
        passRate: dayTotal > 0 ? Math.round((dayPassed / dayTotal) * 100) : 0,
        totalTests: dayTotal
      });
    }

    // Recent sessions (all statuses, most recent first)
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

// Get KPI evaluations — compare current computed values against kpi_config thresholds
exports.getKPIs = async (req, res) => {
  try {
    const configs = await KpiConfig.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });

    // ---- Compute current values for each known KPI key ----

    // Completed session IDs (submitted + approved)
    const completedSessions = await TestSession.findAll({
      where: { status: { [Op.in]: ['submitted', 'approved'] } },
      attributes: ['id', 'submitted_at', 'approved_at', 'status']
    });
    const completedSessionIds = completedSessions.map(s => s.id);

    // 1. overall_pass_rate
    let overallPassRate = 0;
    if (completedSessionIds.length > 0) {
      const allEntries = await TestEntry.findAll({
        where: { session_id: { [Op.in]: completedSessionIds }, pass_status: { [Op.not]: null } },
        attributes: ['pass_status']
      });
      const total = allEntries.length;
      const passed = allEntries.filter(e => e.pass_status === true).length;
      overallPassRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    }

    // 2. first_pass_yield — sessions where every entry passes
    let firstPassYield = 0;
    if (completedSessionIds.length > 0) {
      const sessionEntryMap = new Map();
      const allEntries = await TestEntry.findAll({
        where: { session_id: { [Op.in]: completedSessionIds }, pass_status: { [Op.not]: null } },
        attributes: ['session_id', 'pass_status']
      });
      for (const e of allEntries) {
        if (!sessionEntryMap.has(e.session_id)) sessionEntryMap.set(e.session_id, { total: 0, passed: 0 });
        const rec = sessionEntryMap.get(e.session_id);
        rec.total++;
        if (e.pass_status === true) rec.passed++;
      }
      const perfectSessions = [...sessionEntryMap.values()].filter(r => r.total > 0 && r.passed === r.total).length;
      firstPassYield = sessionEntryMap.size > 0 ? Math.round((perfectSessions / sessionEntryMap.size) * 100) : 0;
    }

    // 3. pending_approval
    const pendingApproval = await TestSession.count({ where: { status: 'submitted' } });

    // 4. rejection_rate
    const rejectedCount  = await TestSession.count({ where: { status: 'rejected' } });
    const finalisedCount = completedSessionIds.length + rejectedCount;
    const rejectionRate  = finalisedCount > 0 ? Math.round((rejectedCount / finalisedCount) * 100 * 10) / 10 : 0;

    // 5. avg_days_to_approve (rolling 30 days of approved sessions)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentApproved = await TestSession.findAll({
      where: { status: 'approved', approved_at: { [Op.gte]: thirtyDaysAgo }, submitted_at: { [Op.not]: null } },
      attributes: ['submitted_at', 'approved_at']
    });
    let avgDaysToApprove = 0;
    if (recentApproved.length > 0) {
      const totalMs = recentApproved.reduce((sum, s) => {
        return sum + (new Date(s.approved_at) - new Date(s.submitted_at));
      }, 0);
      avgDaysToApprove = Math.round((totalMs / recentApproved.length / 86400000) * 10) / 10;
    }

    const currentValues = {
      overall_pass_rate:  overallPassRate,
      first_pass_yield:   firstPassYield,
      pending_approval:   pendingApproval,
      rejection_rate:     rejectionRate,
      avg_days_to_approve: avgDaysToApprove,
    };

    // ---- Evaluate status for each KPI ----
    const kpis = configs.map(cfg => {
      const current = currentValues[cfg.kpi_key] ?? null;
      let status = 'grey'; // no data

      if (current !== null) {
        const target  = parseFloat(cfg.target_value);
        const warning = cfg.warning_threshold !== null ? parseFloat(cfg.warning_threshold) : null;

        if (cfg.higher_is_better) {
          // higher = better: green >= target, yellow >= warning, red < warning
          if (current >= target)                          status = 'green';
          else if (warning !== null && current >= warning) status = 'yellow';
          else                                             status = 'red';
        } else {
          // lower = better: green <= target, yellow <= warning, red > warning
          if (current <= target)                          status = 'green';
          else if (warning !== null && current <= warning) status = 'yellow';
          else                                             status = 'red';
        }
      }

      return {
        kpiKey:          cfg.kpi_key,
        kpiName:         cfg.kpi_name,
        description:     cfg.description,
        currentValue:    current,
        targetValue:     parseFloat(cfg.target_value),
        warningThreshold: cfg.warning_threshold !== null ? parseFloat(cfg.warning_threshold) : null,
        unit:            cfg.unit,
        higherIsBetter:  cfg.higher_is_better,
        status,
      };
    });

    res.status(200).json({ success: true, data: kpis });
  } catch (error) {
    console.error('Error getting KPIs:', error);
    res.status(500).json({ success: false, message: 'Error getting KPIs', error: error.message });
  }
};

exports.getKPIHistory = async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 24);
    const history = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd   = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const label = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const completedSessions = await TestSession.findAll({
        where: {
          test_date: { [Op.between]: [monthStart, monthEnd] },
          status: { [Op.in]: ['submitted', 'approved'] }
        },
        attributes: ['id', 'submitted_at', 'approved_at']
      });
      const completedIds = completedSessions.map(s => s.id);

      const allMonthSessions = await TestSession.findAll({
        where: {
          test_date: { [Op.between]: [monthStart, monthEnd] },
          status: { [Op.in]: ['submitted', 'approved', 'rejected'] }
        },
        attributes: ['id', 'status']
      });

      let overallPassRate = null;
      let firstPassYield = null;

      if (completedIds.length > 0) {
        const entries = await TestEntry.findAll({
          where: { session_id: { [Op.in]: completedIds }, pass_status: { [Op.not]: null } },
          attributes: ['session_id', 'pass_status']
        });

        const total  = entries.length;
        const passed = entries.filter(e => e.pass_status === true).length;
        overallPassRate = total > 0 ? Math.round((passed / total) * 100) : null;

        const sessionEntryMap = new Map();
        for (const e of entries) {
          if (!sessionEntryMap.has(e.session_id)) sessionEntryMap.set(e.session_id, { total: 0, passed: 0 });
          const rec = sessionEntryMap.get(e.session_id);
          rec.total++;
          if (e.pass_status === true) rec.passed++;
        }
        const perfect = [...sessionEntryMap.values()].filter(r => r.total > 0 && r.passed === r.total).length;
        firstPassYield = sessionEntryMap.size > 0 ? Math.round((perfect / sessionEntryMap.size) * 100) : null;
      }

      const rejectedCount  = allMonthSessions.filter(s => s.status === 'rejected').length;
      const finalisedCount = allMonthSessions.length;
      const rejectionRate  = finalisedCount > 0
        ? Math.round((rejectedCount / finalisedCount) * 100 * 10) / 10
        : null;

      const approvedSessions = completedSessions.filter(
        s => s.approved_at !== null && s.submitted_at !== null
      );
      let avgDaysToApprove = null;
      if (approvedSessions.length > 0) {
        const totalMs = approvedSessions.reduce((sum, s) => {
          return sum + (new Date(s.approved_at) - new Date(s.submitted_at));
        }, 0);
        avgDaysToApprove = Math.round((totalMs / approvedSessions.length / 86400000) * 10) / 10;
      }

      history.push({
        month:            label,
        overallPassRate,
        firstPassYield,
        rejectionRate,
        avgDaysToApprove,
        sessionCount:     completedIds.length,
      });
    }

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Error getting KPI history:', error);
    res.status(500).json({ success: false, message: 'Error getting KPI history', error: error.message });
  }
};

exports.updateKPIThreshold = async (req, res) => {
  try {
    const { kpiKey } = req.params;
    const { targetValue, warningThreshold } = req.body;

    const config = await KpiConfig.findOne({ where: { kpi_key: kpiKey } });
    if (!config) {
      return res.status(404).json({ success: false, message: 'KPI not found' });
    }

    const updates = {};
    if (targetValue !== undefined)      updates.target_value      = targetValue;
    if (warningThreshold !== undefined) updates.warning_threshold = warningThreshold;

    await config.update(updates);

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('Error updating KPI threshold:', error);
    res.status(500).json({ success: false, message: 'Error updating KPI threshold', error: error.message });
  }
};

module.exports = exports;
