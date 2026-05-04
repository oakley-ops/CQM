const { NexusProductScope, NexusProcessStepAssessment, NexusCapaItem, NexusQualificationPlan } = require('../../models');
const { evaluateGate } = require('../../utils/nexusGate');
const logger = require('../../utils/logger');
const { AuditLogger } = require('../../utils/auditLogger');
const { generateActionId } = require('../../utils/nexusActionId');
const processStepsData = require('../../seed-data/nexus/process-steps.json');

const NC_SEVERITIES = ['NC+', 'nc-'];

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
    const scope = await NexusProductScope.create({
      audit_record_id: Number(req.params.id),
      ...req.body,
    });

    // Seed process steps for this product category
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
      logger.info(`NEXUS: Seeded ${steps.length} process steps for scope ${scope.id} (${scope.product_category})`);
    }

    res.status(201).json({ ...scope.toJSON(), steps_seeded: steps.length });
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

    const prevConformity = step.conformity;
    await step.update(req.body);

    // Auto-create CAPA when NC+/nc- is set for the first time
    if (NC_SEVERITIES.includes(step.conformity) && !NC_SEVERITIES.includes(prevConformity)) {
      const scope = await NexusProductScope.findByPk(req.params.scopeId);
      const auditId = scope?.audit_record_id;
      if (auditId) {
        const existing = await NexusCapaItem.findOne({
          where: { source_type: 'process-step', source_entity_id: step.id },
        });
        if (!existing) {
          const actionId = await generateActionId(auditId, 'PST');
          const capa = await NexusCapaItem.create({
            audit_record_id: auditId,
            action_id: actionId,
            requirement_id: '#0583#',
            source_type: 'process-step',
            source_entity_id: step.id,
            severity: step.conformity === 'NC+' ? 'NC+' : 'nc-',
            observation: `Non-conformity on process step ${step.process_tag}: ${step.process_name}`,
            status: 'Not yet started',
            created_by: req.user?.id,
          });
          AuditLogger.capa('AUTO_CREATE', capa, req.user);
        }
      }
    }

    res.json(step);
  } catch (err) {
    logger.error('updateStep error', err);
    res.status(500).json({ error: 'Failed to update process step' });
  }
};
