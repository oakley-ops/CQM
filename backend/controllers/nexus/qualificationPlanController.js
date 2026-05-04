const {
  NexusQualificationPlan, NexusQualificationItem, NexusDesignReview,
  NexusProductScope, NexusProcessStepAssessment,
} = require('../../models');
const logger = require('../../utils/logger');
const qualItems = require('../../seed-data/nexus/qualification-items.json');
const { evaluateGate } = require('../../utils/nexusGate');

// GET /api/nexus/audits/:id/plans
exports.listPlans = async (req, res) => {
  try {
    const plans = await NexusQualificationPlan.findAll({
      where: { audit_record_id: req.params.id },
      order: [['created_at', 'ASC']],
    });
    res.json(plans);
  } catch (err) {
    logger.error('listPlans error', err);
    res.status(500).json({ error: 'Failed to fetch qualification plans' });
  }
};

// POST /api/nexus/audits/:id/plans
exports.createPlan = async (req, res) => {
  try {
    const plan = await NexusQualificationPlan.create({
      audit_record_id: Number(req.params.id),
      created_by: req.user?.id,
      ...req.body,
    });

    // Auto-seed qualification items
    if (qualItems.length > 0) {
      await NexusQualificationItem.bulkCreate(
        qualItems.map(q => ({ plan_id: plan.id, ...q }))
      );
    }

    res.status(201).json(plan);
  } catch (err) {
    logger.error('createPlan error', err);
    res.status(500).json({ error: 'Failed to create qualification plan' });
  }
};

// GET /api/nexus/audits/:id/plans/:planId
exports.getPlan = async (req, res) => {
  try {
    const plan = await NexusQualificationPlan.findOne({
      where: { id: req.params.planId, audit_record_id: req.params.id },
    });
    if (!plan) return res.status(404).json({ error: 'Qualification plan not found' });

    const [items, reviews, gate] = await Promise.all([
      NexusQualificationItem.findAll({ where: { plan_id: plan.id }, order: [['id', 'ASC']] }),
      NexusDesignReview.findAll({ where: { plan_id: plan.id }, order: [['review_type', 'ASC']] }),
      evaluateGate(plan),
    ]);

    res.json({ ...plan.toJSON(), items, reviews, gate });
  } catch (err) {
    logger.error('getPlan error', err);
    res.status(500).json({ error: 'Failed to fetch qualification plan' });
  }
};

// PATCH /api/nexus/audits/:id/plans/:planId
exports.updatePlan = async (req, res) => {
  try {
    const plan = await NexusQualificationPlan.findOne({
      where: { id: req.params.planId, audit_record_id: req.params.id },
    });
    if (!plan) return res.status(404).json({ error: 'Qualification plan not found' });
    await plan.update(req.body);
    res.json(plan);
  } catch (err) {
    logger.error('updatePlan error', err);
    res.status(500).json({ error: 'Failed to update qualification plan' });
  }
};

// GET /api/nexus/audits/:id/plans/:planId/gate
exports.checkGate = async (req, res) => {
  try {
    const plan = await NexusQualificationPlan.findOne({
      where: { id: req.params.planId, audit_record_id: req.params.id },
    });
    if (!plan) return res.status(404).json({ error: 'Qualification plan not found' });
    const gate = await evaluateGate(plan);
    res.json(gate);
  } catch (err) {
    logger.error('checkGate error', err);
    res.status(500).json({ error: 'Failed to evaluate gate' });
  }
};

// ── Qualification Items ───────────────────────────────────────────────────────

// PATCH /api/nexus/audits/:id/plans/:planId/items/:itemId
exports.updateItem = async (req, res) => {
  try {
    const item = await NexusQualificationItem.findOne({
      where: { id: req.params.itemId, plan_id: req.params.planId },
    });
    if (!item) return res.status(404).json({ error: 'Qualification item not found' });
    if (req.body.status === 'complete' && !item.completed_date) {
      req.body.completed_date = new Date().toISOString().split('T')[0];
    }
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    logger.error('updateItem error', err);
    res.status(500).json({ error: 'Failed to update qualification item' });
  }
};

// ── Design Reviews ────────────────────────────────────────────────────────────

// POST /api/nexus/audits/:id/plans/:planId/reviews
exports.createReview = async (req, res) => {
  try {
    const plan = await NexusQualificationPlan.findOne({
      where: { id: req.params.planId, audit_record_id: req.params.id },
    });
    if (!plan) return res.status(404).json({ error: 'Qualification plan not found' });
    const review = await NexusDesignReview.create({
      plan_id: plan.id,
      created_by: req.user?.id,
      ...req.body,
    });
    res.status(201).json(review);
  } catch (err) {
    logger.error('createReview error', err);
    res.status(500).json({ error: 'Failed to create design review' });
  }
};

// PATCH /api/nexus/audits/:id/plans/:planId/reviews/:reviewId
exports.updateReview = async (req, res) => {
  try {
    const review = await NexusDesignReview.findOne({
      where: { id: req.params.reviewId, plan_id: req.params.planId },
    });
    if (!review) return res.status(404).json({ error: 'Design review not found' });
    await review.update(req.body);
    res.json(review);
  } catch (err) {
    logger.error('updateReview error', err);
    res.status(500).json({ error: 'Failed to update design review' });
  }
};
