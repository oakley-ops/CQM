const { TestEntry, TestSession, TestDefinition, TestCategory } = require('../../../models');
const { Op } = require('sequelize');

async function collectData(config) {
  const { dateFrom, dateTo, cardTypes, categoryIds, limit = 500 } = config;

  const sessionWhere = { status: 'approved' };
  if (cardTypes?.length) sessionWhere.card_type = { [Op.in]: cardTypes };
  if (dateFrom || dateTo) {
    sessionWhere.test_date = {};
    if (dateFrom) sessionWhere.test_date[Op.gte] = dateFrom;
    if (dateTo)   sessionWhere.test_date[Op.lte] = dateTo;
  }

  const sessions = await TestSession.findAll({
    where: sessionWhere,
    attributes: ['id', 'card_type', 'test_date', 'batch_lot_number'],
    order: [['test_date', 'DESC']],
    limit: 200,
  });

  if (!sessions.length) return { entries: [], sessionCount: 0 };

  const sessionIds = sessions.map(s => s.id);
  const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s]));

  const entryWhere = {
    session_id: { [Op.in]: sessionIds },
    measurement_value: { [Op.not]: null },
  };

  const includeOpts = [{
    model: TestDefinition,
    as: 'definition',
    attributes: ['id', 'test_name', 'lsl', 'usl', 'unit_of_measure', 'test_type'],
    ...(categoryIds?.length ? {
      include: [{
        model: TestCategory,
        as: 'category',
        where: { id: { [Op.in]: categoryIds } },
        attributes: ['id', 'name', 'code'],
      }],
    } : {
      include: [{ model: TestCategory, as: 'category', attributes: ['id', 'name', 'code'] }],
    }),
  }];

  const entries = await TestEntry.findAll({
    where: entryWhere,
    include: includeOpts,
    limit,
    order: [['id', 'DESC']],
  });

  return {
    entries: entries.map(e => ({
      id: e.id,
      session_id: e.session_id,
      card_type: sessionMap[e.session_id]?.card_type,
      test_date: sessionMap[e.session_id]?.test_date,
      batch_lot_number: sessionMap[e.session_id]?.batch_lot_number,
      test_name: e.definition?.test_name,
      test_type: e.definition?.test_type,
      category: e.definition?.category?.name,
      category_code: e.definition?.category?.code,
      lsl: e.definition?.lsl != null ? Number(e.definition.lsl) : null,
      usl: e.definition?.usl != null ? Number(e.definition.usl) : null,
      unit: e.definition?.unit_of_measure,
      measurement: Number(e.measurement_value),
      pass_status: e.pass_status,
      assessment_value: e.assessment_value,
    })),
    sessionCount: sessions.length,
  };
}

module.exports = { collectData };
