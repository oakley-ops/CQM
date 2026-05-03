const {
  NexusAuditRecord, NexusQmsAssessment, NexusProductScope,
  NexusCapaItem, NexusAlert, User,
} = require('../../models');
const logger = require('../../utils/logger');
const qms9001 = require('../../seed-data/nexus/qms-requirements-9001.json');
const qmsNo9001 = require('../../seed-data/nexus/qms-requirements-no9001.json');

// Calculate next audit date based on grade
function calcNextAuditDate(grade, endDate) {
  if (!grade || !endDate) return null;
  const months = { A: 24, B: 18, C: 12, D: 6 };
  const d = new Date(endDate);
  d.setMonth(d.getMonth() + (months[grade] || 18));
  return d.toISOString().split('T')[0];
}

// Auto-generate CAPA action_id: YY-MM/siteCodeNN
function genCapaActionId(auditId, seq) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const nn = String(seq).padStart(2, '0');
  return `${yy}-${mm}/AUD${auditId}-${nn}`;
}

// GET /api/nexus/audits
exports.listAudits = async (req, res) => {
  try {
    const audits = await NexusAuditRecord.findAll({
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(audits);
  } catch (err) {
    logger.error('listAudits error', err);
    res.status(500).json({ error: 'Failed to fetch audit records' });
  }
};

// GET /api/nexus/audits/:id
exports.getAudit = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: NexusProductScope, as: 'productScopes' },
      ],
    });
    if (!audit) return res.status(404).json({ error: 'Audit record not found' });
    res.json(audit);
  } catch (err) {
    logger.error('getAudit error', err);
    res.status(500).json({ error: 'Failed to fetch audit record' });
  }
};

// POST /api/nexus/audits
exports.createAudit = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.create({
      ...req.body,
      created_by: req.user?.id,
    });

    // Seed QMS assessments based on ISO cert flag
    const reqs = audit.iso_9001_certified ? qms9001 : qmsNo9001;
    const assessments = reqs.map(r => ({
      audit_record_id: audit.id,
      requirement_id: r.requirement_id,
      section: r.section,
      title: r.title,
      iso_9001_coverage: r.iso_9001_coverage,
      vendor_compliance: 'tbd',
      conformity: 'tbd',
    }));
    await NexusQmsAssessment.bulkCreate(assessments);

    logger.info(`NEXUS: AuditRecord ${audit.id} created, ${assessments.length} QMS reqs seeded`);
    res.status(201).json({ ...audit.toJSON(), qms_seeded: assessments.length });
  } catch (err) {
    logger.error('createAudit error', err);
    res.status(500).json({ error: 'Failed to create audit record' });
  }
};

// PATCH /api/nexus/audits/:id
exports.updateAudit = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit record not found' });

    const updates = { ...req.body };

    // Recalculate next audit date when grade or end date changes
    const newGrade = updates.grade ?? audit.grade;
    const newEnd = updates.audit_date_end ?? audit.audit_date_end;
    if (newGrade && newEnd) {
      updates.next_audit_date = calcNextAuditDate(newGrade, newEnd);
    }

    await audit.update(updates);
    res.json(audit);
  } catch (err) {
    logger.error('updateAudit error', err);
    res.status(500).json({ error: 'Failed to update audit record' });
  }
};

// DELETE /api/nexus/audits/:id
exports.deleteAudit = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit record not found' });
    await audit.destroy();
    res.json({ message: 'Audit record deleted' });
  } catch (err) {
    logger.error('deleteAudit error', err);
    res.status(500).json({ error: 'Failed to delete audit record' });
  }
};
