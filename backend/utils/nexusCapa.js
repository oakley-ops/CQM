const { NexusCapaItem } = require('../models');
const { generateActionId } = require('./nexusActionId');
const { AuditLogger } = require('./auditLogger');

// Map any cqmAP conformity verdict to a CAPA severity (NC+/nc-), or null when it is not
// a non-conformity. Handles NCC (critical — tracked as NC+, since the CAP sheet severity
// scale is only NC+/nc-/RI) and the "(Subcontractor)" verdict variants.
function capaSeverityFor(conformity) {
  if (!conformity) return null;
  const c = String(conformity);
  if (c.startsWith('NCC')) return 'NC+';
  if (c.startsWith('NC+')) return 'NC+';
  if (c.startsWith('nc-')) return 'nc-';
  return null; // RI / Full / tbd / n/a / "Not assessed ..." → no corrective action needed
}

// Ensure the CAPA item that tracks a non-conformity finding exists and stays in sync.
// Idempotent on (source_type, source_entity_id): creates one when the finding is an NC and
// none exists, re-syncs the severity if the finding was re-graded, and no-ops otherwise.
// Never deletes — a finding that becomes conformant keeps its CAPA so the vendor's
// remediation work and the audit trail are preserved.
// Returns { capa, created, updated }.
async function ensureCapaForFinding({
  auditRecordId, sourceType, sourceEntityId, requirementId, conformity, observation, prefix, user,
}) {
  const severity = capaSeverityFor(conformity);
  const existing = await NexusCapaItem.findOne({
    where: { source_type: sourceType, source_entity_id: sourceEntityId },
  });

  if (!severity) return { capa: existing || null, created: false, updated: false };

  if (existing) {
    if (existing.severity !== severity) {
      await existing.update({ severity });
      AuditLogger.capa('AUTO_UPDATE', existing, user);
      return { capa: existing, created: false, updated: true };
    }
    return { capa: existing, created: false, updated: false };
  }

  const c = String(conformity);
  const obs = `${c.startsWith('NCC') ? '[CRITICAL / NCC] ' : ''}${observation}${c.includes('(Subcontractor)') ? ' [subcontractor]' : ''}`;
  const capa = await NexusCapaItem.create({
    audit_record_id: auditRecordId,
    action_id: await generateActionId(auditRecordId, prefix),
    requirement_id: requirementId,
    source_type: sourceType,
    source_entity_id: sourceEntityId,
    severity,
    observation: obs,
    status: 'Not yet started',
    created_by: user?.id ?? null,
  });
  AuditLogger.capa('AUTO_CREATE', capa, user);
  return { capa, created: true, updated: false };
}

module.exports = { capaSeverityFor, ensureCapaForFinding };
