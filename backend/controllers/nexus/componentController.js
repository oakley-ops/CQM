const { NexusAuditComponent } = require('../../models');
const logger = require('../../utils/logger');

// GET /api/nexus/audits/:id/components
exports.listComponents = async (req, res) => {
  try {
    const components = await NexusAuditComponent.findAll({
      where: { audit_record_id: req.params.id },
      order: [['component_type', 'ASC'], ['created_at', 'ASC']],
    });
    res.json(components);
  } catch (err) {
    logger.error('listComponents error', err);
    res.status(500).json({ error: 'Failed to fetch components' });
  }
};

// POST /api/nexus/audits/:id/components
exports.createComponent = async (req, res) => {
  try {
    const component = await NexusAuditComponent.create({
      audit_record_id: Number(req.params.id),
      created_by: req.user?.id,
      ...req.body,
    });
    res.status(201).json(component);
  } catch (err) {
    logger.error('createComponent error', err);
    res.status(500).json({ error: 'Failed to create component' });
  }
};

// PATCH /api/nexus/audits/:id/components/:compId
exports.updateComponent = async (req, res) => {
  try {
    const component = await NexusAuditComponent.findOne({
      where: { id: req.params.compId, audit_record_id: req.params.id },
    });
    if (!component) return res.status(404).json({ error: 'Component not found' });
    await component.update(req.body);
    res.json(component);
  } catch (err) {
    logger.error('updateComponent error', err);
    res.status(500).json({ error: 'Failed to update component' });
  }
};

// DELETE /api/nexus/audits/:id/components/:compId
exports.deleteComponent = async (req, res) => {
  try {
    const component = await NexusAuditComponent.findOne({
      where: { id: req.params.compId, audit_record_id: req.params.id },
    });
    if (!component) return res.status(404).json({ error: 'Component not found' });
    await component.destroy();
    res.status(204).send();
  } catch (err) {
    logger.error('deleteComponent error', err);
    res.status(500).json({ error: 'Failed to delete component' });
  }
};
