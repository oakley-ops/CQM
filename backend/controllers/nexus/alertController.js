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

const ALERT_TYPES = {
  NC_NO_CAPA: 'nc-no-capa',
  OVERDUE_CAPA: 'overdue-capa',
  CAPA_DUE_SOON: 'capa-due-soon',
  LOW_QMS_SCORE: 'low-qms-score',
  AUDIT_APPROACHING_30: 'audit-approaching-30',
  AUDIT_APPROACHING_60: 'audit-approaching-60',
};

const CAPA_RESOLVED_STATUSES = ['Complete', 'Cancelled', 'Finding Rejected'];

// Internal: run watchdog rules for one audit record
async function runWatchdogForAudit(audit) {
  const auditId = audit.id;
  const today = new Date().toISOString().split('T')[0];

  const upsertAlert = async (type, severity, title, message, actionRequired, extra = {}) => {
    const where = { audit_record_id: auditId, alert_type: type, is_dismissed: false, ...extra };
    await NexusAlert.findOrCreate({
      where,
      defaults: { ...where, severity, title, message, action_required: actionRequired },
    });
  };

  // Fetch all data the rules need in parallel
  const [ncPlusAssessments, capaItems, qmsAll] = await Promise.all([
    NexusQmsAssessment.findAll({ where: { audit_record_id: auditId, conformity: 'NC+' } }),
    NexusCapaItem.findAll({ where: { audit_record_id: auditId } }),
    NexusQmsAssessment.findAll({ where: { audit_record_id: auditId }, attributes: ['conformity'] }),
  ]);

  // Rule 1: NC+ with no linked CAPA — batch the existence check
  const ncPlusIds = ncPlusAssessments.map(a => a.id);
  const linkedCapas = ncPlusIds.length === 0 ? [] : await NexusCapaItem.findAll({
    where: { audit_record_id: auditId, source_type: 'qms', source_entity_id: { [Op.in]: ncPlusIds } },
    attributes: ['source_entity_id'],
  });
  const linkedCapaIds = new Set(linkedCapas.map(c => c.source_entity_id));
  const rule1Alerts = ncPlusAssessments
    .filter(a => !linkedCapaIds.has(a.id))
    .map(a => upsertAlert(
      ALERT_TYPES.NC_NO_CAPA, 'critical',
      `Critical non-conformity without CAPA: ${a.requirement_id}`,
      `Requirement ${a.requirement_id} (${a.title}) is rated NC+ but has no Corrective Action Plan item.`,
      'Create a CAPA item immediately in the CAPA module and assign a responsible person and deadline.',
      { requirement_id: a.requirement_id, entity_type: 'qms_assessment', entity_id: a.id }
    ));

  // Rules 2 & 3: CAPA deadlines
  const capaAlerts = capaItems.flatMap(c => {
    const promises = [];
    if (c.deadline && c.deadline < today && !CAPA_RESOLVED_STATUSES.includes(c.status)) {
      const days = Math.floor((new Date(today) - new Date(c.deadline)) / 86400000);
      promises.push(upsertAlert(
        ALERT_TYPES.OVERDUE_CAPA, 'critical',
        `Overdue CAPA: ${c.action_id}`,
        `CAPA item ${c.action_id} was due on ${c.deadline} (${days} days ago) and is still "${c.status}". An auditor will flag this as an unresolved finding.`,
        'Update the CAPA status or contact the responsible person to provide evidence of completion.',
        { entity_type: 'capa_item', entity_id: c.id }
      ));
    }
    if (c.deadline && c.deadline >= today) {
      const daysLeft = Math.floor((new Date(c.deadline) - new Date(today)) / 86400000);
      if (daysLeft <= 7 && !['Complete', 'Cancelled'].includes(c.status)) {
        promises.push(upsertAlert(
          ALERT_TYPES.CAPA_DUE_SOON, 'high',
          `CAPA due in ${daysLeft} days: ${c.action_id}`,
          `CAPA item ${c.action_id} (${c.requirement_id}) is due on ${c.deadline}.`,
          'Complete the corrective action and upload evidence before the deadline.',
          { entity_type: 'capa_item', entity_id: c.id }
        ));
      }
    }
    return promises;
  });

  // Rule 4: QMS conformity score < 80%
  const rule4Alerts = [];
  if (qmsAll.length > 0) {
    const scored = qmsAll.filter(a => !['tbd', 'n/a'].includes(a.conformity));
    const passing = scored.filter(a => ['Full', 'RI'].includes(a.conformity));
    const score = scored.length > 0 ? Math.round((passing.length / scored.length) * 100) : null;
    if (score !== null && score < 80) {
      rule4Alerts.push(upsertAlert(
        ALERT_TYPES.LOW_QMS_SCORE, 'high',
        `QMS conformity score below threshold: ${score}%`,
        `Your QMS self-assessment score is ${score}%, below the 80% passing threshold. ${scored.length - passing.length} requirements are rated NC+, nc-, or RI.`,
        'Review all non-conforming requirements in the QMS Assessment module and resolve or create CAPA items for each.'
      ));
    }
  }

  // Rule 5: Audit approaching
  const rule5Alerts = [];
  if (audit.next_audit_date) {
    const daysToAudit = Math.floor((new Date(audit.next_audit_date) - new Date(today)) / 86400000);
    const openCapas = capaItems.filter(c => !CAPA_RESOLVED_STATUSES.includes(c.status)).length;
    if (daysToAudit <= 30 && daysToAudit > 0) {
      rule5Alerts.push(upsertAlert(
        ALERT_TYPES.AUDIT_APPROACHING_30, 'high',
        `Audit in ${daysToAudit} days — ${openCapas} open CAPAs`,
        `Your next audit is scheduled for ${audit.next_audit_date}. You have ${openCapas} open CAPA items that must be resolved.`,
        'Complete all open CAPAs and ensure evidence is uploaded before the audit date.'
      ));
    } else if (daysToAudit <= 60 && daysToAudit > 30) {
      rule5Alerts.push(upsertAlert(
        ALERT_TYPES.AUDIT_APPROACHING_60, 'medium',
        `Audit in ${daysToAudit} days`,
        `Your next audit is in ${daysToAudit} days (${audit.next_audit_date}). You have ${openCapas} open CAPA items.`,
        'Review the NEXUS dashboard and resolve any open findings before the audit date.'
      ));
    }
  }

  await Promise.all([...rule1Alerts, ...capaAlerts, ...rule4Alerts, ...rule5Alerts]);
}

async function runWatchdogForActiveAudits() {
  const audits = await NexusAuditRecord.findAll({
    where: { status: ['draft', 'in-progress', 'submitted'] },
  });
  await Promise.all(audits.map(a => runWatchdogForAudit(a)));
  return audits.length;
}

// POST /api/nexus/watchdog/run  (manual trigger or called by scheduler)
exports.runWatchdog = async (req, res) => {
  try {
    const auditId = req.body?.audit_record_id;
    let count;
    if (auditId) {
      const audit = await NexusAuditRecord.findByPk(auditId);
      if (!audit) return res.status(404).json({ error: 'Audit record not found' });
      await runWatchdogForAudit(audit);
      count = 1;
    } else {
      count = await runWatchdogForActiveAudits();
    }

    logger.info(`NEXUS watchdog ran across ${count} audit records`);
    res.json({ message: `Watchdog ran for ${count} audit records` });
  } catch (err) {
    logger.error('runWatchdog error', err);
    res.status(500).json({ error: 'Watchdog run failed' });
  }
};

// Start the watchdog scheduler (call once on server startup)
exports.startWatchdogScheduler = () => {
  const INTERVAL_MS = 15 * 60 * 1000;

  const tick = async () => {
    try {
      const checked = await runWatchdogForActiveAudits();
      logger.info(`NEXUS watchdog: checked ${checked} active audits`);
    } catch (err) {
      logger.error('NEXUS watchdog scheduler error', err);
    }
  };

  // Run once on startup so overdue items surface immediately, not 15 min later
  tick();
  setInterval(tick, INTERVAL_MS);

  logger.info('NEXUS watchdog scheduler started (15-min interval, immediate first-run)');
};
