const { sequelize, TestSession, TestEntry, TestCategory, TestDefinition, KpiConfig } = require('../models');
const { ManufacturingFacility } = require('../models');
const { Op } = require('sequelize');
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

function resolvePython() {
  const { execFileSync } = require('child_process');
  for (const cmd of ['python3', 'python', 'py']) {
    try {
      const out = execFileSync(cmd, ['--version'], { timeout: 5000, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
      if (/Python 3/i.test(out)) return cmd;
    } catch (_) {}
  }
  return null;
}

function callPythonReport(type, jsonPayload) {
  return new Promise((resolve, reject) => {
    const pythonExe = resolvePython();
    if (!pythonExe) return reject(new Error('Python 3 is not installed or not in PATH.'));
    const scriptPath = path.join(__dirname, '..', 'report_service', 'generate.py');
    const child = spawn(pythonExe, [scriptPath, '--type', type]);
    const chunks = [], stderrChunks = [];
    child.stdin.on('error', () => {});
    child.stdout.on('data', c => chunks.push(c));
    child.stderr.on('data', c => stderrChunks.push(c));
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`Python report generator exited with code ${code}: ${Buffer.concat(stderrChunks).toString()}`));
      resolve(Buffer.concat(chunks));
    });
    child.on('error', err => reject(new Error(`Failed to spawn Python: ${err.message}`)));
    try { child.stdin.write(jsonPayload); child.stdin.end(); } catch (_) {}
  });
}

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

    // ---- Optional date window filter (days param from query string) ----
    const days = parseInt(req.query.days) || null;
    const dateFilter = {};
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
      dateFilter.test_date = { [Op.gte]: since };
    }

    // ---- Compute current values for each known KPI key ----

    // Completed session IDs (submitted + approved) — optionally filtered by date window
    const completedSessions = await TestSession.findAll({
      where: { status: { [Op.in]: ['submitted', 'approved'] }, ...dateFilter },
      attributes: ['id', 'submitted_at', 'approved_at', 'status']
    });
    const completedSessionIds = completedSessions.map(s => s.id);

    // Helper: resolve effective pass/fail from explicit pass_status or assessment_value
    const PASS_ASSESSMENTS = new Set(['Excellent', 'Good', 'Acceptable']);
    const resolveEntryPass = (e) => {
      if (e.pass_status !== null && e.pass_status !== undefined) return e.pass_status === true;
      if (e.assessment_value) return PASS_ASSESSMENTS.has(e.assessment_value);
      return null;
    };

    // 1. overall_pass_rate
    let overallPassRate = 0;
    if (completedSessionIds.length > 0) {
      const allEntries = await TestEntry.findAll({
        where: {
          session_id: { [Op.in]: completedSessionIds },
          [Op.or]: [{ pass_status: { [Op.not]: null } }, { assessment_value: { [Op.not]: null } }],
        },
        attributes: ['pass_status', 'assessment_value']
      });
      const resolved = allEntries.map(resolveEntryPass).filter(v => v !== null);
      const total = resolved.length;
      const passed = resolved.filter(v => v).length;
      overallPassRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    }

    // 2. first_pass_yield — sessions where every entry passes
    let firstPassYield = 0;
    if (completedSessionIds.length > 0) {
      const sessionEntryMap = new Map();
      const allEntries = await TestEntry.findAll({
        where: {
          session_id: { [Op.in]: completedSessionIds },
          [Op.or]: [{ pass_status: { [Op.not]: null } }, { assessment_value: { [Op.not]: null } }],
        },
        attributes: ['session_id', 'pass_status', 'assessment_value']
      });
      for (const e of allEntries) {
        const p = resolveEntryPass(e);
        if (p === null) continue;
        if (!sessionEntryMap.has(e.session_id)) sessionEntryMap.set(e.session_id, { total: 0, passed: 0 });
        const rec = sessionEntryMap.get(e.session_id);
        rec.total++;
        if (p) rec.passed++;
      }
      const perfectSessions = [...sessionEntryMap.values()].filter(r => r.total > 0 && r.passed === r.total).length;
      firstPassYield = sessionEntryMap.size > 0 ? Math.round((perfectSessions / sessionEntryMap.size) * 100) : 0;
    }

    // 3. pending_approval
    const pendingApproval = await TestSession.count({ where: { status: 'submitted' } });

    // 4. rejection_rate
    const rejectedCount  = await TestSession.count({ where: { status: 'rejected', ...dateFilter } });
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
    const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 36);
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
          where: {
            session_id: { [Op.in]: completedIds },
            [Op.or]: [
              { pass_status: { [Op.not]: null } },
              { assessment_value: { [Op.not]: null } },
            ],
          },
          attributes: ['session_id', 'pass_status', 'assessment_value']
        });

        // Resolve effective pass/fail: explicit pass_status takes precedence; otherwise
        // derive from assessment_value (Poor → fail, everything else → pass).
        const PASS_ASSESSMENTS = new Set(['Excellent', 'Good', 'Acceptable']);
        const resolvePass = (e) => {
          if (e.pass_status !== null && e.pass_status !== undefined) return e.pass_status === true;
          if (e.assessment_value) return PASS_ASSESSMENTS.has(e.assessment_value);
          return null;
        };

        const resolved = entries.map(e => ({ session_id: e.session_id, passed: resolvePass(e) }))
          .filter(e => e.passed !== null);

        const total  = resolved.length;
        const passed = resolved.filter(e => e.passed).length;
        overallPassRate = total > 0 ? Math.round((passed / total) * 100) : null;

        const sessionEntryMap = new Map();
        for (const e of resolved) {
          if (!sessionEntryMap.has(e.session_id)) sessionEntryMap.set(e.session_id, { total: 0, passed: 0 });
          const rec = sessionEntryMap.get(e.session_id);
          rec.total++;
          if (e.passed) rec.passed++;
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

/**
 * Rejection root cause breakdown
 * GET /api/dashboard/rejection-breakdown?days=30
 * Returns top failing test definitions with failure counts
 */
exports.getRejectionBreakdown = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Sessions in the period (all statuses so we catch failures in draft/submitted too,
    // but limit to submitted+approved+rejected so drafts don't pollute the picture)
    const periodSessions = await TestSession.findAll({
      where: {
        test_date: { [Op.gte]: since },
        status: { [Op.in]: ['submitted', 'approved', 'rejected'] }
      },
      attributes: ['id', 'session_type', 'status']
    });
    const sessionIds = periodSessions.map(s => s.id);

    if (sessionIds.length === 0) {
      return res.json({ success: true, data: { causes: [], totalFailedEntries: 0, periodDays: days } });
    }

    // All failed entries in those sessions
    const failedEntries = await TestEntry.findAll({
      where: { session_id: { [Op.in]: sessionIds }, pass_status: false },
      attributes: ['session_id', 'test_definition_id'],
      include: [{
        model: TestDefinition,
        as: 'definition',
        attributes: ['test_name', 'test_id'],
        include: [{
          model: TestCategory,
          as: 'category',
          attributes: ['name', 'category_code']
        }]
      }]
    });

    // Aggregate by definition
    const causeMap = new Map();
    for (const entry of failedEntries) {
      const def = entry.definition;
      if (!def) continue;
      const key = def.id || def.test_id;
      if (!causeMap.has(key)) {
        causeMap.set(key, {
          testName: def.test_name,
          testId: def.test_id,
          categoryName: def.category?.name || 'Unknown',
          categoryCode: def.category?.category_code || '',
          failureCount: 0,
          sessionsAffected: new Set()
        });
      }
      const rec = causeMap.get(key);
      rec.failureCount++;
      rec.sessionsAffected.add(entry.session_id);
    }

    const causes = [...causeMap.values()]
      .map(r => ({ ...r, sessionsAffected: r.sessionsAffected.size }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 15);

    res.json({
      success: true,
      data: { causes, totalFailedEntries: failedEntries.length, periodDays: days }
    });
  } catch (error) {
    logger.error('Error fetching rejection breakdown:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rejection breakdown', error: error.message });
  }
};

exports.exportKPIReport = async (req, res) => {
  try {
    const days   = Math.min(Math.max(parseInt(req.query.days)   || 30, 1), 365);
    const months = Math.min(Math.max(parseInt(req.query.months) ||  6, 1),  36);
    const since  = new Date(); since.setDate(since.getDate() - days);

    // ── Reuse getKPIs logic ──────────────────────────────────────────
    const configs = await KpiConfig.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });

    const completedSessions = await TestSession.findAll({
      where: { status: { [Op.in]: ['submitted', 'approved'] }, test_date: { [Op.gte]: since } },
      attributes: ['id', 'submitted_at', 'approved_at', 'status']
    });
    const completedSessionIds = completedSessions.map(s => s.id);

    let overallPassRate = 0;
    if (completedSessionIds.length > 0) {
      const entries = await TestEntry.findAll({
        where: { session_id: { [Op.in]: completedSessionIds }, pass_status: { [Op.not]: null } },
        attributes: ['pass_status']
      });
      const total = entries.length;
      overallPassRate = total > 0 ? Math.round((entries.filter(e => e.pass_status).length / total) * 100) : 0;
    }

    let firstPassYield = 0;
    if (completedSessionIds.length > 0) {
      const map = new Map();
      const entries = await TestEntry.findAll({
        where: { session_id: { [Op.in]: completedSessionIds }, pass_status: { [Op.not]: null } },
        attributes: ['session_id', 'pass_status']
      });
      for (const e of entries) {
        if (!map.has(e.session_id)) map.set(e.session_id, { total: 0, passed: 0 });
        const r = map.get(e.session_id); r.total++;
        if (e.pass_status) r.passed++;
      }
      const perfect = [...map.values()].filter(r => r.total > 0 && r.passed === r.total).length;
      firstPassYield = map.size > 0 ? Math.round((perfect / map.size) * 100) : 0;
    }

    const pendingApproval = await TestSession.count({ where: { status: 'submitted' } });
    const rejectedCount   = await TestSession.count({ where: { status: 'rejected' } });
    const finalisedCount  = completedSessionIds.length + rejectedCount;
    const rejectionRate   = finalisedCount > 0 ? Math.round((rejectedCount / finalisedCount) * 100 * 10) / 10 : 0;

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentApproved = await TestSession.findAll({
      where: { status: 'approved', approved_at: { [Op.gte]: thirtyDaysAgo }, submitted_at: { [Op.not]: null } },
      attributes: ['submitted_at', 'approved_at']
    });
    let avgDaysToApprove = 0;
    if (recentApproved.length > 0) {
      avgDaysToApprove = Math.round(
        (recentApproved.reduce((s, r) => s + (new Date(r.approved_at) - new Date(r.submitted_at)), 0)
          / recentApproved.length / 86400000) * 10
      ) / 10;
    }

    const currentValues = { overall_pass_rate: overallPassRate, first_pass_yield: firstPassYield, pending_approval: pendingApproval, rejection_rate: rejectionRate, avg_days_to_approve: avgDaysToApprove };

    const kpis = configs.map(cfg => {
      const current = currentValues[cfg.kpi_key] ?? null;
      let status = 'grey';
      if (current !== null) {
        const target = parseFloat(cfg.target_value);
        const warning = cfg.warning_threshold !== null ? parseFloat(cfg.warning_threshold) : null;
        if (cfg.higher_is_better) {
          status = current >= target ? 'green' : (warning !== null && current >= warning ? 'yellow' : 'red');
        } else {
          status = current <= target ? 'green' : (warning !== null && current <= warning ? 'yellow' : 'red');
        }
      }
      return { kpiKey: cfg.kpi_key, kpiName: cfg.kpi_name, description: cfg.description, currentValue: current, targetValue: parseFloat(cfg.target_value), warningThreshold: cfg.warning_threshold !== null ? parseFloat(cfg.warning_threshold) : null, unit: cfg.unit, higherIsBetter: cfg.higher_is_better, status };
    });

    // ── Reuse getKPIHistory logic ────────────────────────────────────
    const history = [];
    const today = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const label = ms.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const mSessions = await TestSession.findAll({ where: { test_date: { [Op.between]: [ms, me] }, status: { [Op.in]: ['submitted', 'approved'] } }, attributes: ['id', 'submitted_at', 'approved_at'] });
      const mIds = mSessions.map(s => s.id);
      const allMSessions = await TestSession.findAll({ where: { test_date: { [Op.between]: [ms, me] }, status: { [Op.in]: ['submitted', 'approved', 'rejected'] } }, attributes: ['id', 'status'] });
      let mPassRate = null, mFPY = null;
      if (mIds.length > 0) {
        const ents = await TestEntry.findAll({ where: { session_id: { [Op.in]: mIds }, pass_status: { [Op.not]: null } }, attributes: ['session_id', 'pass_status'] });
        const tot = ents.length; const pas = ents.filter(e => e.pass_status).length;
        mPassRate = tot > 0 ? Math.round((pas / tot) * 100) : null;
        const sm = new Map();
        for (const e of ents) { if (!sm.has(e.session_id)) sm.set(e.session_id, { total: 0, passed: 0 }); const r = sm.get(e.session_id); r.total++; if (e.pass_status) r.passed++; }
        const perf = [...sm.values()].filter(r => r.total > 0 && r.passed === r.total).length;
        mFPY = sm.size > 0 ? Math.round((perf / sm.size) * 100) : null;
      }
      const mRej = allMSessions.filter(s => s.status === 'rejected').length;
      const mFin = allMSessions.length;
      const mRejRate = mFin > 0 ? Math.round((mRej / mFin) * 100 * 10) / 10 : null;
      const mApproved = mSessions.filter(s => s.approved_at && s.submitted_at);
      let mAvg = null;
      if (mApproved.length > 0) mAvg = Math.round((mApproved.reduce((s, r) => s + (new Date(r.approved_at) - new Date(r.submitted_at)), 0) / mApproved.length / 86400000) * 10) / 10;
      history.push({ month: label, sessionCount: mIds.length, overallPassRate: mPassRate, firstPassYield: mFPY, rejectionRate: mRejRate, avgDaysToApprove: mAvg });
    }

    // ── Session type breakdown (period-filtered) ────────────────────
    const sessionTypes = ['Qualification', 'Monitoring'];
    const allStatuses = ['approved', 'rejected', 'submitted', 'draft'];
    const sessionBreakdown = await Promise.all(sessionTypes.map(async type => {
      const counts = {};
      for (const st of allStatuses) counts[st] = await TestSession.count({ where: { session_type: type, status: st, test_date: { [Op.gte]: since } } });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { type, total, ...counts };
    }));

    // ── Rejection root cause breakdown ──────────────────────────────
    const periodSessionIds = (await TestSession.findAll({
      where: { test_date: { [Op.gte]: since }, status: { [Op.in]: ['submitted', 'approved', 'rejected'] } },
      attributes: ['id']
    })).map(s => s.id);

    let rejectionCauses = [];
    if (periodSessionIds.length > 0) {
      const failedEntries = await TestEntry.findAll({
        where: { session_id: { [Op.in]: periodSessionIds }, pass_status: false },
        attributes: ['session_id', 'test_definition_id'],
        include: [{
          model: TestDefinition, as: 'definition', attributes: ['test_name', 'test_id'],
          include: [{ model: TestCategory, as: 'category', attributes: ['name', 'category_code'] }]
        }]
      });
      const cm = new Map();
      for (const e of failedEntries) {
        const def = e.definition; if (!def) continue;
        const key = def.test_id || def.id;
        if (!cm.has(key)) cm.set(key, { testName: def.test_name, testId: def.test_id, categoryName: def.category?.name || 'Unknown', categoryCode: def.category?.category_code || '', failureCount: 0, sessionsAffected: new Set() });
        const r = cm.get(key); r.failureCount++; r.sessionsAffected.add(e.session_id);
      }
      rejectionCauses = [...cm.values()]
        .map(r => ({ ...r, sessionsAffected: r.sessionsAffected.size }))
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, 15);
    }

    const qualSessionCount = sessionBreakdown.find(r => r.type === 'Qualification')?.total ?? 0;
    const monSessionCount  = sessionBreakdown.find(r => r.type === 'Monitoring')?.total ?? 0;
    const periodLabel = `Last ${days} Day${days !== 1 ? 's' : ''} (${since.toISOString().slice(0,10)} – ${new Date().toISOString().slice(0,10)})`;

    const payload = JSON.stringify({ kpis, history, sessionBreakdown, periodLabel, qualSessionCount, monSessionCount, rejectionCauses, periodDays: days });

    const pdfBuffer = await callPythonReport('kpi', payload);

    const filename = `KPI-Report-${days}d-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error exporting KPI report:', error);
    res.status(500).json({ success: false, message: `Error exporting KPI report: ${error.message}` });
  }
};

// ── SPC / Cpk Data ────────────────────────────────────────────────────────────
// GET /dashboard/spc-defs   – list measurement test definitions that have data
exports.getSpcDefs = async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        td.id,
        td.test_id,
        td.test_name,
        td.unit_of_measurement,
        td.min_acceptable_value,
        td.max_acceptable_value,
        tc.category_code,
        tc.name AS category_name,
        COUNT(te.id)::int AS data_points
      FROM test_definitions td
      JOIN test_categories tc ON td.category_id = tc.id
      JOIN test_entries te ON te.test_definition_id = td.id
      WHERE td.test_type NOT IN ('passfail')
        AND te.measurement_value IS NOT NULL
      GROUP BY td.id, td.test_id, td.test_name, td.unit_of_measurement,
               td.min_acceptable_value, td.max_acceptable_value,
               tc.category_code, tc.name
      HAVING COUNT(te.id) >= 3
      ORDER BY COUNT(te.id) DESC, td.test_name
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('getSpcDefs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /dashboard/spc-data?testDefinitionId=33&days=180[&measurement=secondary]
exports.getSpcData = async (req, res) => {
  try {
    const defId       = parseInt(req.query.testDefinitionId, 10);
    const sessionType = req.query.sessionType || null;
    const startDate   = req.query.startDate || null;
    const endDate     = req.query.endDate   || null;
    // measurement=secondary uses secondary_measurement_value (e.g. height when primary=width)
    const useSecondary = req.query.measurement === 'secondary';
    const valueCol     = useSecondary ? 'te.secondary_measurement_value' : 'te.measurement_value';
    if (!defId || isNaN(defId)) return res.status(400).json({ success: false, message: 'testDefinitionId required' });

    let since, until;

    if (startDate && endDate) {
      // Explicit date range from the client
      since = startDate;
      until = endDate;
    } else {
      // Quick-select: anchor to most recent data point, go back N days
      const days = Math.min(parseInt(req.query.days, 10) || 30, 9999);
      const [[latest]] = await sequelize.query(`
        SELECT MAX(ts.test_date) AS max_date
        FROM test_entries te
        JOIN test_sessions ts ON te.session_id = ts.id
        WHERE te.test_definition_id = :defId
          AND ${valueCol} IS NOT NULL
          ${sessionType ? 'AND ts.session_type = :sessionType' : ''}
      `, { replacements: { defId, sessionType } });
      const anchor = latest?.max_date ? new Date(latest.max_date) : new Date();
      const sinceD = new Date(anchor);
      sinceD.setDate(sinceD.getDate() - days);
      since = sinceD.toISOString().slice(0, 10);
      until = anchor.toISOString().slice(0, 10);
    }

    // Test definition meta
    const [[def]] = await sequelize.query(`
      SELECT td.id, td.test_id, td.test_name, td.unit_of_measurement,
             td.min_acceptable_value, td.max_acceptable_value,
             tc.category_code, tc.name AS category_name
      FROM test_definitions td
      JOIN test_categories tc ON td.category_id = tc.id
      WHERE td.id = :defId
    `, { replacements: { defId } });
    if (!def) return res.status(404).json({ success: false, message: 'Test definition not found' });

    // Individual measurement points in chronological order
    const [points] = await sequelize.query(`
      SELECT
        te.id,
        ${valueCol} AS value,
        te.pass_status,
        ts.test_date        AS date,
        ts.session_number,
        ts.id               AS session_id,
        ts.session_type,
        sc.card_number
      FROM test_entries te
      JOIN test_sessions ts ON te.session_id = ts.id
      LEFT JOIN sample_cards sc ON te.sample_card_id = sc.id
      WHERE te.test_definition_id = :defId
        AND ${valueCol} IS NOT NULL
        AND ts.test_date >= :since
        AND ts.test_date <= :until
        ${sessionType ? 'AND ts.session_type = :sessionType' : ''}
      ORDER BY ts.test_date ASC, te.id ASC
    `, { replacements: { defId, since, until, sessionType } });

    if (points.length === 0) {
      return res.json({ success: true, data: { definition: def, points: [], stats: null } });
    }

    // Use proper I-MR SPC engine
    const { computeSPC } = require('../utils/spcEngine');
    const values = points.map(p => parseFloat(p.value));
    const lsl = def.min_acceptable_value !== null ? parseFloat(def.min_acceptable_value) : null;
    const usl = def.max_acceptable_value !== null ? parseFloat(def.max_acceptable_value) : null;

    const spc = computeSPC(values, lsl, usl);

    // Tag original points with SPC annotations
    const taggedPoints = points.map((p, i) => ({
      ...p,
      value: values[i],
      idx: i + 1,
      out_of_control: spc.individuals[i]?.out_of_control || false,
      out_of_spec: spc.individuals[i]?.out_of_spec || false,
    }));

    const dp = v => +(v).toFixed(4);
    res.json({
      success: true,
      data: {
        definition: def,
        points: taggedPoints,
        stats: {
          n: spc.n,
          mean: dp(spc.x_bar),
          sigma: dp(spc.sigma_within),
          sigma_overall: dp(spc.sigma_overall),
          ucl: dp(spc.ucl_i),
          lcl: dp(spc.lcl_i),
          ucl_mr: dp(spc.ucl_mr),
          mr_bar: dp(spc.mr_bar),
          usl, lsl,
          spec_valid: spc.spec_valid,
          cp:  spc.capability?.cp  ?? null,
          cpk: spc.capability?.cpk ?? null,
          pp:  spc.capability?.pp  ?? null,
          ppk: spc.capability?.ppk ?? null,
          sigmaLevel: spc.capability?.cpk != null ? dp(spc.capability.cpk * 3) : null,
        },
        histogram: spc.histogram.map(b => ({
          bin: `${b.bin_start.toFixed(3)}–${b.bin_end.toFixed(3)}`,
          midpoint: b.bin_center,
          freq: b.count,
          in_spec: b.in_spec,
        })),
        violations: spc.violations,
      },
    });
  } catch (error) {
    logger.error('getSpcData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
