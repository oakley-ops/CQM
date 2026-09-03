const { NexusProductScope, NexusProcessStepAssessment, NexusQualificationPlan } = require('../../models');
const { evaluateGate } = require('../../utils/nexusGate');
const logger = require('../../utils/logger');
const { ensureCapaForFinding } = require('../../utils/nexusCapa');
const processStepsData = require('../../seed-data/nexus/process-steps.json');

// GET /api/nexus/audits/:id/scope
exports.listScopes = async (req, res) => {
  try {
    const scopes = await NexusProductScope.findAll({
      where: { audit_record_id: req.params.id },
      order: [['product_category', 'ASC']],
    });
    res.json(scopes);
  } catch (err) {
    logger.error('listScopes error', err);
    res.status(500).json({ error: 'Failed to fetch product scopes' });
  }
};

// POST /api/nexus/audits/:id/scope
exports.createScope = async (req, res) => {
  try {
    const { seed_steps, ...scopeFields } = req.body;
    const scope = await NexusProductScope.create({
      audit_record_id: Number(req.params.id),
      ...scopeFields,
    });

    // Seed process steps for this product category. Variant rows created by the
    // workbook's Scope chapter pass seed_steps:false — only the category's
    // primary scope row owns an assessment step set.
    let seeded = 0;
    if (seed_steps !== false) {
      const steps = processStepsData[scope.product_category] || [];
      if (steps.length > 0) {
        await NexusProcessStepAssessment.bulkCreate(
          steps.map(s => ({
            product_scope_id: scope.id,
            process_tag: s.process_tag,
            process_name: s.process_name,
            conformity: 'tbd',
          }))
        );
        seeded = steps.length;
        logger.info(`NEXUS: Seeded ${seeded} process steps for scope ${scope.id} (${scope.product_category})`);
      }
    }

    res.status(201).json({ ...scope.toJSON(), steps_seeded: seeded });
  } catch (err) {
    logger.error('createScope error', err);
    res.status(500).json({ error: 'Failed to create product scope' });
  }
};

// PATCH /api/nexus/audits/:id/scope/:scopeId
exports.updateScope = async (req, res) => {
  try {
    const scope = await NexusProductScope.findOne({
      where: { id: req.params.scopeId, audit_record_id: req.params.id },
    });
    if (!scope) return res.status(404).json({ error: 'Product scope not found' });

    // Gate enforcement: rank A/B/C requires #0706# gate to pass
    if (req.body.rank && ['A', 'B', 'C'].includes(req.body.rank)) {
      const plan = await NexusQualificationPlan.findOne({
        where: { product_scope_id: scope.id },
        order: [['created_at', 'DESC']],
      });
      if (!plan) {
        return res.status(422).json({
          error: 'Gate not passed',
          message: 'A qualification plan must exist for this product before assigning a positive rank (#0706#).',
          gate: { passed: false, hasPlan: false, conditions: [] },
        });
      }
      const gate = await evaluateGate(plan);
      if (!gate.passed) {
        return res.status(422).json({
          error: 'Gate not passed',
          message: 'The #0706# qualification gate must pass before this rank can be assigned.',
          gate: { ...gate, hasPlan: true, planId: plan.id },
        });
      }
    }

    await scope.update(req.body);
    res.json(scope);
  } catch (err) {
    logger.error('updateScope error', err);
    res.status(500).json({ error: 'Failed to update product scope' });
  }
};

// DELETE /api/nexus/audits/:id/scope/:scopeId
exports.deleteScope = async (req, res) => {
  try {
    const scope = await NexusProductScope.findOne({
      where: { id: req.params.scopeId, audit_record_id: req.params.id },
    });
    if (!scope) return res.status(404).json({ error: 'Product scope not found' });
    await scope.destroy();
    res.json({ message: 'Product scope deleted' });
  } catch (err) {
    logger.error('deleteScope error', err);
    res.status(500).json({ error: 'Failed to delete product scope' });
  }
};

// GET /api/nexus/audits/:id/scope/:scopeId/gate
exports.checkScopeGate = async (req, res) => {
  try {
    const scope = await NexusProductScope.findOne({
      where: { id: req.params.scopeId, audit_record_id: req.params.id },
    });
    if (!scope) return res.status(404).json({ error: 'Scope not found' });

    const plan = await NexusQualificationPlan.findOne({
      where: { product_scope_id: scope.id },
      order: [['created_at', 'DESC']],
    });

    if (!plan) {
      return res.json({
        passed: false,
        hasPlan: false,
        conditions: [],
        message: 'No qualification plan exists for this product. Create one in Qualification Plans first.',
      });
    }

    const gate = await evaluateGate(plan);
    res.json({ ...gate, hasPlan: true, planId: plan.id });
  } catch (err) {
    logger.error('checkScopeGate error', err);
    res.status(500).json({ error: 'Failed to check scope gate' });
  }
};

// GET /api/nexus/audits/:id/scope/:scopeId/steps
exports.listSteps = async (req, res) => {
  try {
    const steps = await NexusProcessStepAssessment.findAll({
      where: { product_scope_id: req.params.scopeId },
      order: [['process_tag', 'ASC']],
    });
    res.json(steps);
  } catch (err) {
    logger.error('listSteps error', err);
    res.status(500).json({ error: 'Failed to fetch process steps' });
  }
};

// PATCH /api/nexus/audits/:id/scope/:scopeId/steps/:stepId
exports.updateStep = async (req, res) => {
  try {
    const step = await NexusProcessStepAssessment.findOne({
      where: { id: req.params.stepId, product_scope_id: req.params.scopeId },
    });
    if (!step) return res.status(404).json({ error: 'Process step not found' });

    await step.update(req.body);

    // Keep a CAPA item in sync with this finding (any NC+/nc-/NCC incl. subcontractor variants).
    const scope = await NexusProductScope.findByPk(req.params.scopeId);
    if (scope?.audit_record_id) {
      await ensureCapaForFinding({
        auditRecordId: scope.audit_record_id,
        sourceType: 'process-step',
        sourceEntityId: step.id,
        requirementId: (step.process_tag || '#0583#').slice(0, 10),
        conformity: step.conformity,
        observation: `Non-conformity on process step ${step.process_tag}: ${step.process_name}`,
        prefix: 'PST',
        user: req.user,
      });
    }

    res.json(step);
  } catch (err) {
    logger.error('updateStep error', err);
    res.status(500).json({ error: 'Failed to update process step' });
  }
};
