const { SampleCard, TestEntry, TestSession, sequelize } = require('../models');
const logger = require('../utils/logger');

// POST /api/sample-cards/bulk  — create N cards for a session (optionally scoped to a category)
//
// Default mode is a destructive recreate: existing cards in scope (and the test
// entries referencing them) are deleted and the batch is rebuilt 1..count. The
// session hub relies on this to shrink a batch.
//
// extend: true — non-destructive. Only card numbers above the current maximum
// are created; nothing is deleted, so entries already saved by other tests in
// the same category survive. Returns ALL cards in scope either way. Used by the
// per-test save on TestEntryPage, which must never clobber sibling tests.
exports.createBulk = async (req, res) => {
  try {
    const { sessionId, count, categoryId, extend } = req.body;
    const session = await TestSession.findByPk(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'draft') return res.status(400).json({ success: false, message: 'Session is not a draft' });

    if (extend) {
      const where = { session_id: sessionId };
      if (categoryId) where.category_id = categoryId;
      const existing = await SampleCard.findAll({ where, order: [['card_number', 'ASC']] });
      const maxExisting = existing.reduce((m, c) => Math.max(m, c.card_number), 0);

      if (count > maxExisting) {
        const toCreate = [];
        for (let i = maxExisting + 1; i <= count; i++) {
          toCreate.push({ session_id: sessionId, category_id: categoryId || null, card_number: i });
        }
        await SampleCard.bulkCreate(toCreate);
      }

      const all = await SampleCard.findAll({ where, order: [['card_number', 'ASC']] });
      return res.status(201).json({ success: true, data: all });
    }

    const transaction = await sequelize.transaction();
    try {
      // Delete test entries referencing the cards we're about to replace (avoids FK violation)
      const existingCards = await SampleCard.findAll({
        where: categoryId ? { session_id: sessionId, category_id: categoryId } : { session_id: sessionId },
        attributes: ['id'],
        transaction,
      });
      if (existingCards.length > 0) {
        const cardIds = existingCards.map(c => c.id);
        await TestEntry.destroy({ where: { sample_card_id: cardIds }, transaction });
      }

      // Delete existing cards scoped to this session+category
      const destroyWhere = { session_id: sessionId };
      if (categoryId) destroyWhere.category_id = categoryId;
      await SampleCard.destroy({ where: destroyWhere, transaction });

      const cards = [];
      for (let i = 1; i <= count; i++) {
        cards.push({ session_id: sessionId, category_id: categoryId || null, card_number: i });
      }
      const created = await SampleCard.bulkCreate(cards, { transaction });
      await transaction.commit();
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    logger.error('Error creating sample cards:', error);
    res.status(500).json({ success: false, message: 'Failed to create sample cards', error: error.message });
  }
};

// GET /api/sample-cards/session/:sessionId  — optionally filter by ?categoryId=
exports.getBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { categoryId } = req.query;
    const where = { session_id: sessionId };
    if (categoryId) where.category_id = parseInt(categoryId);
    const cards = await SampleCard.findAll({ where, order: [['card_number', 'ASC']] });
    res.json({ success: true, data: cards });
  } catch (error) {
    logger.error('Error fetching sample cards:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sample cards', error: error.message });
  }
};
