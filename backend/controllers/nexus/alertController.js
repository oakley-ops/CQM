const { NexusAlert, NexusAuditRecord, NexusQmsAssessment, NexusCapaItem, NexusProductScope } = require('../../models');
const { TestSession } = require('../../models');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

// GET /api/nexus/alerts
exports.listAlerts = async (req, res) => {
  try {
    const where = { is_dismissed: false };
    if (req.query.audit_record_id) where.audit_record_id = req.query.audit_record_id;

    const alerts = await NexusAlert.findAll({
      where,
      order: [
        ['severity', 'ASC'],  // critical first (c < h < l < m alphabetically — use manual sort)
        ['created_at', 'DESC'],
      ],
    });

    // Sort by severity weight
    const weight = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => (weight[a.severity] ?? 9) - (weight[b.severity] ?? 9));

    res.json(alerts);
  } catch (err) {
    logger.error('listAlerts error', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

// GET /api/nexus/alerts/summary
exports.alertSummary = async (req, res) => {
  try {
    const alerts = await NexusAlert.findAll({
      where: { is_dismissed: false, is_read: false },
      attributes: ['severity'],
    });

    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    alerts.forEach(a => {
      counts[a.severity] = (counts[a.severity] || 0) + 1;
      counts.total++;
    });

    res.json(counts);
  } catch (err) {
    logger.error('alertSummary error', err);
    res.status(500).json({ error: 'Failed to fetch alert summary' });
  }
};

// PATCH /api/nexus/alerts/:id/read
exports.markRead = async (req, res) => {
  try {
    const alert = await NexusAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    await alert.update({ is_read: true });
    res.json(alert);
  } catch (err) {
    logger.error('markRead error', err);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
};

// PATCH /api/nexus/alerts/:id/dismiss
exports.dismissAlert = async (req, res) => {
  try {
    const alert = await NexusAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    await alert.update({ is_dismissed: true });
    res.json(alert);
  } catch (err) {
    logger.error('dismissAlert error', err);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
};

// Internal: run watchdog rules for one audit record
async function runWatchdogForAudit(audit) {
  const auditId = audit.id;
  const today = new Date().toISOString().split('T')[0];
  const alerts = [];

  const upsertAlert = async (type, severity, title, message, actionRequired, extra = {}) => {
    // Avoid duplicate active alerts of same type for same audit
    const existing = await NexusAlert.findOne({
      where: { audit_record_id: auditId, alert_type: type, is_dismissed: false, ...extra },
    });
    if (!existing) {
      await NexusAlert.create({
        audit_record_id: auditId,
        alert_type: type,
        severity,
        title,
        message,
        action_required: actionRequired,
        ...extra,
      });
    }
  };

  // Rule 1: NC+ with no linked CAPA
  const ncPlusAssessments = await NexusQmsAssessment.findAll({
    where: { audit_record_id: auditId, conformity: 'NC+' },
  });
  for (const a of ncPlusAssessments) {
    const capa = await NexusCapaItem.findOne({
      where: { audit_record_id: auditId, requirement_id: a.requirement_id, source_type: 'qms', source_entity_id: a.id },
    });
    if (!capa) {
      await upsertAlert(
        'nc-no-capa', 'critical',
        `Critical non-conformity without CAPA: ${a.requirement_id}`,
        `Requirement ${a.requirement_id} (${a.title}) is rated NC+ but has no Corrective Action Plan item.`,
        'Create a CAPA item immediately in the CAPA module and assign a responsible person and deadline.',
        { requirement_id: a.requirement_id, entity_type: 'qms_assessment', entity_id: a.id }
      );
    }
  }

  // Rule 2: Overdue CAPAs
  const capaItems = await NexusCapaItem.findAll({ where: { audit_record_id: auditId } });
  for (const c of capaItems) {
    if (c.deadline && c.deadline < today && !['Complete', 'Cancelled', 'Finding Rejected'].includes(c.status)) {
      const days = Math.floor((new Date(today) - new Date(c.deadline)) / 86400000);
      await upsertAlert(
        'overdue-capa', 'critical',
        `Overdue CAPA: ${c.action_id}`,
        `CAPA item ${c.action_id} was due on ${c.deadline} (${days} days ago) and is still "${c.status}". An auditor will flag this as an unresolved finding.`,
        'Update the CAPA status or contact the responsible person to provide evidence of completion.',
        { entity_type: 'capa_item', entity_id: c.id }
      );
    }

    // Rule 3: CAPA due in < 7 days
    if (c.deadline && c.deadline >= today) {
      const daysLeft = Math.floor((new Date(c.deadline) - new Date(today)) / 86400000);
      if (daysLeft <= 7 && !['Complete', 'Cancelled'].includes(c.status)) {
        await upsertAlert(
          'capa-due-soon', 'high',
          `CAPA due in ${daysLeft} days: ${c.action_id}`,
          `CAPA item ${c.action_id} (${c.requirement_id}) is due on ${c.deadline}.`,
          'Complete the corrective action and upload evidence before the deadline.',
          { entity_type: 'capa_item', entity_id: c.id }
        );
      }
    }
  }

  // Rule 4: QMS conformity score < 80%
  const qmsAll = await NexusQmsAssessment.findAll({
    where: { audit_record_id: auditId },
    attributes: ['conformity'],
  });
  if (qmsAll.length > 0) {
    const scored = qmsAll.filter(a => !['tbd', 'n/a'].includes(a.conformity));
    const passing = scored.filter(a => ['Full', 'RI'].includes(a.conformity));
    const score = scored.length > 0 ? Math.round((passing.length / scored.length) * 100) : null;
    if (score !== null && score < 80) {
      await upsertAlert(
        'low-qms-score', 'high',
        `QMS conformity score below threshold: ${score}%`,
        `Your QMS self-assessment score is ${score}%, below the 80% passing threshold. ${scored.length - passing.length} requirements are rated NC+, nc-, or RI.`,
        'Review all non-conforming requirements in the QMS Assessment module and resolve or create CAPA items for each.'
      );
    }
  }

  // Rule 5: Audit approaching
  if (audit.next_audit_date) {
    const daysToAudit = Math.floor((new Date(audit.next_audit_date) - new Date(today)) / 86400000);
    if (daysToAudit <= 30 && daysToAudit > 0) {
      const openCapas = capaItems.filter(c => !['Complete', 'Cancelled', 'Finding Rejected'].includes(c.status)).length;
      await upsertAlert(
        'audit-approaching-30', 'high',
        `Audit in ${daysToAudit} days — ${openCapas} open CAPAs`,
        `Your next audit is scheduled for ${audit.next_audit_date}. You have ${openCapas} open CAPA items that must be resolved.`,
        'Complete all open CAPAs and ensure evidence is uploaded before the audit date.'
      );
    } else if (daysToAudit <= 60 && daysToAudit > 30) {
      const openCapas = capaItems.filter(c => !['Complete', 'Cancelled', 'Finding Rejected'].includes(c.status)).length;
      await upsertAlert(
        'audit-approaching-60', 'medium',
        `Audit in ${daysToAudit} days`,
        `Your next audit is in ${daysToAudit} days (${audit.next_audit_date}). You have ${openCapas} open CAPA items.`,
        'Review the NEXUS dashboard and resolve any open findings before the audit date.'
      );
    }
  }

  return alerts;
}

// POST /api/nexus/watchdog/run  (manual trigger or called by scheduler)
exports.runWatchdog = async (req, res) => {
  try {
    const auditId = req.body?.audit_record_id;
    const audits = auditId
      ? [await NexusAuditRecord.findByPk(auditId)]
      : await NexusAuditRecord.findAll({ where: { status: ['draft', 'in-progress', 'submitted'] } });

    let created = 0;
    for (const audit of audits.filter(Boolean)) {
      await runWatchdogForAudit(audit);
      created++;
    }

    logger.info(`NEXUS watchdog ran across ${created} audit records`);
    res.json({ message: `Watchdog ran for ${created} audit records` });
  } catch (err) {
    logger.error('runWatchdog error', err);
    res.status(500).json({ error: 'Watchdog run failed' });
  }
};

// Start the watchdog scheduler (call once on server startup)
exports.startWatchdogScheduler = () => {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  setInterval(async () => {
    try {
      const audits = await NexusAuditRecord.findAll({
        where: { status: ['draft', 'in-progress', 'submitted'] },
      });
      for (const audit of audits) {
        await runWatchdogForAudit(audit);
      }
      logger.info(`NEXUS watchdog: checked ${audits.length} active audits`);
    } catch (err) {
      logger.error('NEXUS watchdog scheduler error', err);
    }
  }, INTERVAL_MS);

  logger.info('NEXUS watchdog scheduler started (15-min interval)');
};
