const { NexusQmsAssessment, NexusCapaItem, NexusAuditRecord } = require('../../models');
const logger = require('../../utils/logger');
const { AuditLogger } = require('../../utils/auditLogger');
const { generateActionId } = require('../../utils/nexusActionId');

const NC_SEVERITIES = ['NC+', 'nc-'];

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

    const prevConformity = assessment.conformity;
    await assessment.update(req.body);

    // Auto-create CAPA when NC+/nc- is set for the first time
    if (
      NC_SEVERITIES.includes(assessment.conformity) &&
      !NC_SEVERITIES.includes(prevConformity)
    ) {
      const existingCapa = await NexusCapaItem.findOne({
        where: {
          audit_record_id: req.params.id,
          requirement_id: assessment.requirement_id,
          source_type: 'qms',
          source_entity_id: assessment.id,
        },
      });

      if (!existingCapa) {
        const actionId = await generateActionId(req.params.id, 'QMS');
        const capa = await NexusCapaItem.create({
          audit_record_id: Number(req.params.id),
          action_id: actionId,
          requirement_id: assessment.requirement_id,
          source_type: 'qms',
          source_entity_id: assessment.id,
          severity: assessment.conformity === 'NC+' ? 'NC+' : 'nc-',
          observation: `Non-conformity found on requirement ${assessment.requirement_id}: ${assessment.title}`,
          status: 'Not yet started',
          created_by: req.user?.id,
        });
        AuditLogger.capa('AUTO_CREATE', capa, req.user);
      }
    }

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
