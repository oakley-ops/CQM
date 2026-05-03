const { TestSession, TestEntry, TestCategory, TestDefinition } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../../utils/logger');

// GET /api/nexus/conformity
// Returns per-card_type monitoring summary for the dashboard
exports.getConformityOverview = async (req, res) => {
  try {
    const cutoff90 = new Date();
    cutoff90.setDate(cutoff90.getDate() - 90);

    // Aggregate pass rates per card_type from approved sessions
    const sessions = await TestSession.findAll({
      where: { status: 'approved' },
      attributes: ['id', 'card_type', 'test_date', 'session_type'],
      order: [['test_date', 'DESC']],
    });

    const grouped = {};
    for (const s of sessions) {
      if (!grouped[s.card_type]) {
        grouped[s.card_type] = { card_type: s.card_type, sessions: [], lastSession: null };
      }
      grouped[s.card_type].sessions.push(s);
      if (!grouped[s.card_type].lastSession || s.test_date > grouped[s.card_type].lastSession) {
        grouped[s.card_type].lastSession = s.test_date;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // For each card_type, pull entry pass rates from the last 90 days
    const result = await Promise.all(
      Object.values(grouped).map(async (g) => {
        const recentSessionIds = g.sessions
          .filter(s => new Date(s.test_date) >= thirtyDaysAgo)
          .map(s => s.id);

        const last90SessionIds = g.sessions
          .filter(s => new Date(s.test_date) >= cutoff90)
          .map(s => s.id);

        const [totalEntries, passEntries] = last90SessionIds.length === 0 ? [0, 0] : await Promise.all([
          TestEntry.count({ where: { session_id: { [Op.in]: last90SessionIds } } }),
          TestEntry.count({ where: { session_id: { [Op.in]: last90SessionIds }, pass_status: true } }),
        ]);

        const passRate = totalEntries > 0 ? Math.round((passEntries / totalEntries) * 100) : null;
        const daysSinceLast = g.lastSession
          ? Math.floor((new Date(today) - new Date(g.lastSession)) / 86400000)
          : null;

        return {
          card_type: g.card_type,
          total_sessions: g.sessions.length,
          sessions_last_30d: recentSessionIds.length,
          last_session_date: g.lastSession,
          days_since_last: daysSinceLast,
          pass_rate_90d: passRate,
          total_entries_90d: totalEntries,
          monitoring_risk: daysSinceLast === null || daysSinceLast > 30,
          threshold_risk: passRate !== null && passRate < 80,
        };
      })
    );

    result.sort((a, b) => a.card_type.localeCompare(b.card_type));
    res.json(result);
  } catch (err) {
    logger.error('getConformityOverview error', err);
    res.status(500).json({ error: 'Failed to fetch conformity overview' });
  }
};

// GET /api/nexus/conformity/:cardType/sessions
// Returns recent sessions for a given card_type with pass rates
exports.getCardTypeSessions = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const sessions = await TestSession.findAll({
      where: {
        card_type: req.params.cardType,
        status: { [Op.in]: ['submitted', 'approved'] },
      },
      order: [['test_date', 'DESC']],
      limit,
      attributes: ['id', 'session_number', 'card_type', 'test_date', 'batch_lot_number', 'session_type', 'status'],
    });

    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) return res.json([]);

    // Get pass counts per session
    const entryCounts = await TestEntry.findAll({
      where: { session_id: { [Op.in]: sessionIds } },
      attributes: [
        'session_id',
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal('CASE WHEN pass_status = true THEN 1 ELSE 0 END')), 'passing'],
      ],
      group: ['session_id'],
      raw: true,
    });

    const countMap = {};
    for (const row of entryCounts) {
      countMap[row.session_id] = { total: Number(row.total), passing: Number(row.passing) };
    }

    const result = sessions.map(s => {
      const counts = countMap[s.id] ?? { total: 0, passing: 0 };
      return {
        ...s.toJSON(),
        total_entries: counts.total,
        passing_entries: counts.passing,
        pass_rate: counts.total > 0 ? Math.round((counts.passing / counts.total) * 100) : null,
      };
    });

    res.json(result);
  } catch (err) {
    logger.error('getCardTypeSessions error', err);
    res.status(500).json({ error: 'Failed to fetch card type sessions' });
  }
};
