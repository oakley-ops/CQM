const { NexusCapaItem } = require('../../models');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

// GET /api/nexus/audits/:id/capa
exports.listCapa = async (req, res) => {
  try {
    const items = await NexusCapaItem.findAll({
      where: { audit_record_id: req.params.id },
      order: [
        ['severity', 'ASC'],   // NC+ first
        ['deadline', 'ASC'],
      ],
    });
    res.json(items);
  } catch (err) {
    logger.error('listCapa error', err);
    res.status(500).json({ error: 'Failed to fetch CAPA items' });
  }
};

// POST /api/nexus/audits/:id/capa
exports.createCapa = async (req, res) => {
  try {
    const count = await NexusCapaItem.count({ where: { audit_record_id: req.params.id } });
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const actionId = `${yy}-${mm}/MAN${String(count + 1).padStart(2, '0')}`;

    const item = await NexusCapaItem.create({
      audit_record_id: Number(req.params.id),
      action_id: actionId,
      source_type: 'manual',
      ...req.body,
      created_by: req.user?.id,
    });
    res.status(201).json(item);
  } catch (err) {
    logger.error('createCapa error', err);
    res.status(500).json({ error: 'Failed to create CAPA item' });
  }
};

// PATCH /api/nexus/audits/:id/capa/:capaId
exports.updateCapa = async (req, res) => {
  try {
    const item = await NexusCapaItem.findOne({
      where: { id: req.params.capaId, audit_record_id: req.params.id },
    });
    if (!item) return res.status(404).json({ error: 'CAPA item not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    logger.error('updateCapa error', err);
    res.status(500).json({ error: 'Failed to update CAPA item' });
  }
};

// GET /api/nexus/audits/:id/capa/summary
exports.capaSummary = async (req, res) => {
  try {
    const items = await NexusCapaItem.findAll({
      where: { audit_record_id: req.params.id },
      attributes: ['severity', 'status', 'deadline'],
    });

    const bySeverity = { 'NC+': 0, 'nc-': 0, RI: 0 };
    const byStatus = {};
    let overdue = 0;
    const today = new Date().toISOString().split('T')[0];

    items.forEach(i => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      if (i.deadline && i.deadline < today && !['Complete', 'Cancelled', 'Finding Rejected'].includes(i.status)) {
        overdue++;
      }
    });

    res.json({ total: items.length, bySeverity, byStatus, overdue });
  } catch (err) {
    logger.error('capaSummary error', err);
    res.status(500).json({ error: 'Failed to fetch CAPA summary' });
  }
};
