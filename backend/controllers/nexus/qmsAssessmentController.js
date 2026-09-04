const { NexusQmsAssessment } = require('../../models');
const logger = require('../../utils/logger');
const { ensureCapaForFinding } = require('../../utils/nexusCapa');

// GET /api/nexus/audits/:id/qms
exports.listQms = async (req, res) => {
  try {
    const assessments = await NexusQmsAssessment.findAll({
      where: { audit_record_id: req.params.id },
      order: [['section', 'ASC']],
    });
    res.json(assessments);
  } catch (err) {
    logger.error('listQms error', err);
    res.status(500).json({ error: 'Failed to fetch QMS assessments' });
  }
};

// PATCH /api/nexus/audits/:id/qms/:requirementId
exports.updateQms = async (req, res) => {
  try {
    const assessment = await NexusQmsAssessment.findOne({
      where: { audit_record_id: req.params.id, requirement_id: req.params.requirementId },
    });
    if (!assessment) return res.status(404).json({ error: 'QMS assessment not found' });

    await assessment.update(req.body);

    // Keep a CAPA item in sync with this finding — creates one for any NC+/nc-/NCC
    // (incl. subcontractor variants) and re-syncs severity on re-grade.
    await ensureCapaForFinding({
      auditRecordId: Number(req.params.id),
      sourceType: 'qms',
      sourceEntityId: assessment.id,
      requirementId: assessment.requirement_id,
      conformity: assessment.conformity,
      observation: `Non-conformity found on requirement ${assessment.requirement_id}: ${assessment.title}`,
      prefix: 'QMS',
      user: req.user,
    });

    res.json(assessment);
  } catch (err) {
    logger.error('updateQms error', err);
    res.status(500).json({ error: 'Failed to update QMS assessment' });
  }
};

// GET /api/nexus/audits/:id/qms/summary
exports.qmsSummary = async (req, res) => {
  try {
    const assessments = await NexusQmsAssessment.findAll({
      where: { audit_record_id: req.params.id },
      attributes: ['conformity'],
    });

    const counts = { 'NC+': 0, 'nc-': 0, RI: 0, Full: 0, NCC: 0, tbd: 0, 'n/a': 0 };
    assessments.forEach(a => {
      const key = a.conformity || 'tbd';
      counts[key] = (counts[key] || 0) + 1;
    });

    const total = assessments.length;
    const scored = total - counts.tbd - counts['n/a'];
    const passing = counts.Full + counts.RI;
    const score = scored > 0 ? Math.round((passing / scored) * 100) : null;

    res.json({ total, counts, score });
  } catch (err) {
    logger.error('qmsSummary error', err);
    res.status(500).json({ error: 'Failed to fetch QMS summary' });
  }
};
