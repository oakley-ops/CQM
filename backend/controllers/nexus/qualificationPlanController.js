const fs = require('fs');
const {
  NexusQualificationPlan, NexusQualificationItem, NexusDesignReview,
  NexusProductScope, NexusProcessStepAssessment,
} = require('../../models');
const logger = require('../../utils/logger');
const qualItemsProduct = require('../../seed-data/nexus/qualification-items-product.json');
const { evaluateGate } = require('../../utils/nexusGate');

// MIME type is client-controlled and spoofable, so once the upload is on disk we verify
// the real %PDF- magic bytes before accepting it (same check testEntryController.js uses
// for in-memory PDF uploads, adapted for a file already written to disk).
function isPdfFile(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(5);
    fs.readSync(fd, buf, 0, 5, 0);
    return buf.toString('latin1') === '%PDF-';
  } finally {
    fs.closeSync(fd);
  }
}

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

    // Product plans auto-seed the canonical CQMAP checklist. Process plans start empty —
    // equipment/process qualification checklists are built by hand (Add Item), since they
    // vary too much per machine to seed from one fixed template.
    const seedItems = plan.plan_type === 'process' ? [] : qualItemsProduct;
    if (seedItems.length > 0) {
      await NexusQualificationItem.bulkCreate(
        seedItems.map(q => ({ plan_id: plan.id, ...q }))
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

// POST /api/nexus/audits/:id/plans/:planId/items
exports.createItem = async (req, res) => {
  try {
    const plan = await NexusQualificationPlan.findOne({
      where: { id: req.params.planId, audit_record_id: req.params.id },
    });
    if (!plan) return res.status(404).json({ error: 'Qualification plan not found' });
    const item = await NexusQualificationItem.create({
      plan_id: plan.id,
      ...req.body,
    });
    res.status(201).json(item);
  } catch (err) {
    logger.error('createItem error', err);
    res.status(500).json({ error: 'Failed to create qualification item' });
  }
};

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

// DELETE /api/nexus/audits/:id/plans/:planId/items/:itemId
exports.deleteItem = async (req, res) => {
  try {
    const item = await NexusQualificationItem.findOne({
      where: { id: req.params.itemId, plan_id: req.params.planId },
    });
    if (!item) return res.status(404).json({ error: 'Qualification item not found' });
    await item.destroy();
    res.json({ message: 'Qualification item deleted' });
  } catch (err) {
    logger.error('deleteItem error', err);
    res.status(500).json({ error: 'Failed to delete qualification item' });
  }
};

// POST /api/nexus/audits/:id/plans/:planId/items/:itemId/evidence
// multer (nexusEvidenceUpload.single('file')) has already written req.file to disk
// by the time this runs.
exports.uploadEvidence = async (req, res) => {
  try {
    const item = await NexusQualificationItem.findOne({
      where: { id: req.params.itemId, plan_id: req.params.planId },
    });
    if (!item) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Qualification item not found', message: 'Qualification item not found' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded', message: 'No file uploaded' });
    }

    if (!isPdfFile(req.file.path)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        error: 'File is not a valid PDF',
        message: 'That file is not a valid PDF — only real PDF files can be attached as evidence.',
      });
    }

    // Replacing an existing attachment — drop the old file once the new one is confirmed good.
    if (item.evidence_file_path) fs.unlink(item.evidence_file_path, () => {});

    await item.update({
      evidence_file_name: req.file.originalname,
      evidence_file_path: req.file.path,
      evidence_file_size: req.file.size,
      evidence_file_uploaded_at: new Date(),
    });
    res.json(item);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    logger.error('uploadEvidence error', err);
    res.status(500).json({ error: 'Failed to upload evidence file' });
  }
};

// GET /api/nexus/audits/:id/plans/:planId/items/:itemId/evidence
exports.downloadEvidence = async (req, res) => {
  try {
    const item = await NexusQualificationItem.findOne({
      where: { id: req.params.itemId, plan_id: req.params.planId },
    });
    if (!item) return res.status(404).json({ error: 'Qualification item not found' });
    if (!item.evidence_file_path) {
      return res.status(404).json({ error: 'No evidence file attached to this item' });
    }
    res.download(item.evidence_file_path, item.evidence_file_name || 'evidence.pdf', (err) => {
      if (err) logger.error('downloadEvidence stream error', err);
    });
  } catch (err) {
    logger.error('downloadEvidence error', err);
    res.status(500).json({ error: 'Failed to download evidence file' });
  }
};

// DELETE /api/nexus/audits/:id/plans/:planId/items/:itemId/evidence
exports.deleteEvidence = async (req, res) => {
  try {
    const item = await NexusQualificationItem.findOne({
      where: { id: req.params.itemId, plan_id: req.params.planId },
    });
    if (!item) return res.status(404).json({ error: 'Qualification item not found' });

    if (item.evidence_file_path) fs.unlink(item.evidence_file_path, () => {});

    await item.update({
      evidence_file_name: null,
      evidence_file_path: null,
      evidence_file_size: null,
      evidence_file_uploaded_at: null,
    });
    res.json(item);
  } catch (err) {
    logger.error('deleteEvidence error', err);
    res.status(500).json({ error: 'Failed to remove evidence file' });
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
