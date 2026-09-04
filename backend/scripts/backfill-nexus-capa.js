#!/usr/bin/env node
/*
 * Backfill CAPA items for existing NC findings that have no linked CAPA yet.
 *
 * Scans every QMS assessment and process-step assessment; for any NC+/nc-/NCC verdict
 * (incl. subcontractor variants) without a CAPA, creates one. Idempotent — safe to re-run;
 * it only creates what is missing. Useful after upgrading the auto-CAPA logic, or for
 * findings entered before auto-CAPA existed.
 *
 *   Run: npm run capa:backfill   (or: node backend/scripts/backfill-nexus-capa.js)
 */
require('dotenv').config();
const { sequelize, NexusQmsAssessment, NexusProcessStepAssessment, NexusProductScope } = require('../models');
const { ensureCapaForFinding, capaSeverityFor } = require('../utils/nexusCapa');

(async () => {
  let qms = 0;
  let steps = 0;
  try {
    await sequelize.authenticate();

    for (const a of await NexusQmsAssessment.findAll()) {
      if (!capaSeverityFor(a.conformity)) continue;
      const { created } = await ensureCapaForFinding({
        auditRecordId: a.audit_record_id,
        sourceType: 'qms',
        sourceEntityId: a.id,
        requirementId: a.requirement_id,
        conformity: a.conformity,
        observation: `Non-conformity found on requirement ${a.requirement_id}: ${a.title}`,
        prefix: 'QMS',
        user: null,
      });
      if (created) qms += 1;
    }

    const allSteps = await NexusProcessStepAssessment.findAll({
      include: [{ model: NexusProductScope, as: 'productScope', attributes: ['audit_record_id'] }],
    });
    for (const s of allSteps) {
      if (!capaSeverityFor(s.conformity)) continue;
      const auditId = s.productScope?.audit_record_id;
      if (!auditId) continue;
      const { created } = await ensureCapaForFinding({
        auditRecordId: auditId,
        sourceType: 'process-step',
        sourceEntityId: s.id,
        requirementId: (s.process_tag || '#0583#').slice(0, 10),
        conformity: s.conformity,
        observation: `Non-conformity on process step ${s.process_tag}: ${s.process_name}`,
        prefix: 'PST',
        user: null,
      });
      if (created) steps += 1;
    }

    console.log(`✅ CAPA backfill complete — created ${qms} from QMS findings, ${steps} from process-step findings.`);
  } catch (e) {
    console.error('❌ capa:backfill failed:', e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
