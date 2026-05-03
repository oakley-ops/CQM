const { NexusDocumentRef } = require('../../models');
const logger = require('../../utils/logger');

// GET /api/nexus/audits/:id/documents
exports.listDocs = async (req, res) => {
  try {
    const docs = await NexusDocumentRef.findAll({
      where: { audit_record_id: req.params.id },
      order: [['requirement_id', 'ASC'], ['created_at', 'ASC']],
    });
    res.json(docs);
  } catch (err) {
    logger.error('listDocs error', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

// POST /api/nexus/audits/:id/documents
exports.createDoc = async (req, res) => {
  try {
    const doc = await NexusDocumentRef.create({
      audit_record_id: Number(req.params.id),
      created_by: req.user?.id,
      ...req.body,
    });
    res.status(201).json(doc);
  } catch (err) {
    logger.error('createDoc error', err);
    res.status(500).json({ error: 'Failed to create document reference' });
  }
};

// PATCH /api/nexus/audits/:id/documents/:docId
exports.updateDoc = async (req, res) => {
  try {
    const doc = await NexusDocumentRef.findOne({
      where: { id: req.params.docId, audit_record_id: req.params.id },
    });
    if (!doc) return res.status(404).json({ error: 'Document reference not found' });
    await doc.update(req.body);
    res.json(doc);
  } catch (err) {
    logger.error('updateDoc error', err);
    res.status(500).json({ error: 'Failed to update document reference' });
  }
};

// DELETE /api/nexus/audits/:id/documents/:docId
exports.deleteDoc = async (req, res) => {
  try {
    const doc = await NexusDocumentRef.findOne({
      where: { id: req.params.docId, audit_record_id: req.params.id },
    });
    if (!doc) return res.status(404).json({ error: 'Document reference not found' });
    await doc.destroy();
    res.status(204).send();
  } catch (err) {
    logger.error('deleteDoc error', err);
    res.status(500).json({ error: 'Failed to delete document reference' });
  }
};
