/**
 * express-validator rule sets for the NEXUS routes.
 *
 * Design notes:
 * - Optional fields are validated only when present (`.optional()`), so these
 *   rules never reject a payload the frontend already sends — they convert
 *   what would be a Sequelize 500 (bad enum / type) into a clean 400 and block
 *   malformed input.
 * - Only columns that are genuinely NOT NULL in the schema are required on
 *   create.
 * - Field whitelisting still happens in the controllers (pickWritable); these
 *   rules validate shape, they don't decide what persists.
 */
const { body, param } = require('express-validator');
const { CERT_STATUSES } = require('../seed-data/nexus/cqmap-vocab.generated');

// ── Shared enums (mirror the Sequelize model validators) ─────────────────────
const AUDIT_STATUS = ['draft', 'in-progress', 'submitted', 'closed'];
const GRADES = ['A', 'B', 'C', 'D'];
const AUDIT_TYPES = ['on-site', 'remote'];
const AUDIT_SCOPES = ['initial', 'renewal'];
const CAPA_SEVERITY = ['NC+', 'nc-', 'RI'];
const CAPA_STATUS = ['Not yet started', 'In progress', 'Under Review', 'Complete',
  'Cancelled', 'Finding Rejected', 'Awaiting Auditor'];
const CAPA_SOURCE = ['qms', 'process-step', 'manual'];
// The real DB CHECK constraint on nexus_audit_components.cert_status uses the official
// cqmAP vocabulary (see models/NexusAuditComponent.js) — not a simplified label set.
const CERT_STATUS = CERT_STATUSES;
const PRODUCT_CATEGORIES = ['ic', 'icm', 'il', 'cb', 'icc', 'p', 'iacicm', 'bsm', 'iacil', 'iac'];
const PLAN_TYPES = ['product', 'process'];
const ITEM_STATUS = ['pending', 'in-progress', 'complete', 'not-applicable'];

// Numeric-id path params used across the routes.
const idParam = (name = 'id') => param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`);

// ── Audit records ────────────────────────────────────────────────────────────
const createAudit = [
  body('site_name').trim().notEmpty().withMessage('Site name is required'),
  body('company').trim().notEmpty().withMessage('Company is required'),
  body('status').optional().isIn(AUDIT_STATUS).withMessage('Invalid status'),
  body('grade').optional({ values: 'null' }).isIn(GRADES).withMessage('Grade must be A–D'),
  body('audit_type').optional({ values: 'null' }).isIn(AUDIT_TYPES),
  body('audit_scope').optional({ values: 'null' }).isIn(AUDIT_SCOPES),
  body('iso_9001_certified').optional().isBoolean().withMessage('iso_9001_certified must be boolean'),
  body('auditor_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid auditor email'),
  body('primary_contact_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid contact email'),
  body('audit_contact_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid contact email'),
  body('staff_total').optional({ values: 'null' }).isInt({ min: 0 }).withMessage('Staff total must be ≥ 0'),
  body('staff_in_production').optional({ values: 'null' }).isInt({ min: 0 }).withMessage('Staff in production must be ≥ 0'),
  body('country_code').optional({ values: 'falsy' }).isLength({ max: 2 }).withMessage('Country code is a 2-letter ISO code'),
  body('production_volumes').optional().isObject().withMessage('production_volumes must be an object'),
];

// On update every field is optional, but format still enforced when present.
const updateAudit = [
  idParam(),
  body('site_name').optional().trim().notEmpty().withMessage('Site name cannot be blank'),
  body('company').optional().trim().notEmpty().withMessage('Company cannot be blank'),
  body('status').optional().isIn(AUDIT_STATUS).withMessage('Invalid status'),
  body('grade').optional({ values: 'null' }).isIn(GRADES).withMessage('Grade must be A–D'),
  body('audit_type').optional({ values: 'null' }).isIn(AUDIT_TYPES),
  body('audit_scope').optional({ values: 'null' }).isIn(AUDIT_SCOPES),
  body('iso_9001_certified').optional().isBoolean(),
  body('auditor_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid auditor email'),
  body('primary_contact_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid contact email'),
  body('audit_contact_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid contact email'),
  body('staff_total').optional({ values: 'null' }).isInt({ min: 0 }),
  body('staff_in_production').optional({ values: 'null' }).isInt({ min: 0 }),
  body('production_volumes').optional().isObject(),
];

// ── QMS assessment ───────────────────────────────────────────────────────────
const updateQms = [
  idParam(),
  body('conformity').optional().isString(),
  body('vendor_compliance').optional().isString(),
];

// ── Product scope & steps ────────────────────────────────────────────────────
const createScope = [
  idParam(),
  body('product_category').isIn(PRODUCT_CATEGORIES).withMessage('Invalid product category'),
  body('in_scope').optional().isBoolean(),
  body('audited').optional().isBoolean(),
];
const updateScope = [idParam(), idParam('scopeId')];
const deleteScope = [idParam(), idParam('scopeId')];
const updateStep = [idParam(), idParam('scopeId'), idParam('stepId')];

// ── CAPA ─────────────────────────────────────────────────────────────────────
const createCapa = [
  idParam(),
  body('severity').isIn(CAPA_SEVERITY).withMessage('Severity must be NC+, nc-, or RI'),
  body('source_type').optional({ values: 'null' }).isIn(CAPA_SOURCE).withMessage('Invalid CAPA source'),
  body('source_entity_id').optional({ values: 'null' }).isInt({ min: 1 }),
  body('status').optional().isIn(CAPA_STATUS).withMessage('Invalid CAPA status'),
  body('deadline').optional({ values: 'falsy' }).isISO8601().withMessage('Deadline must be a date'),
  body('target_date').optional({ values: 'falsy' }).isISO8601().withMessage('Target date must be a date'),
];
const updateCapa = [
  idParam(), idParam('capaId'),
  body('severity').optional().isIn(CAPA_SEVERITY).withMessage('Severity must be NC+, nc-, or RI'),
  body('status').optional().isIn(CAPA_STATUS).withMessage('Invalid CAPA status'),
  body('deadline').optional({ values: 'falsy' }).isISO8601().withMessage('Deadline must be a date'),
  body('target_date').optional({ values: 'falsy' }).isISO8601().withMessage('Target date must be a date'),
];

// ── Qualification plans ──────────────────────────────────────────────────────
const createPlan = [
  idParam(),
  body('plan_type').optional().isIn(PLAN_TYPES).withMessage('Plan type must be product or process'),
];
const updatePlan = [idParam(), idParam('planId')];
const createItem = [
  idParam(), idParam('planId'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('status').optional().isIn(ITEM_STATUS).withMessage('Invalid item status'),
];
const updateItem = [idParam(), idParam('planId'), idParam('itemId')];
const deleteItem = [idParam(), idParam('planId'), idParam('itemId')];
const itemEvidence = [idParam(), idParam('planId'), idParam('itemId')];
const createReview = [idParam(), idParam('planId')];
const updateReview = [idParam(), idParam('planId'), idParam('reviewId')];

// ── Components ───────────────────────────────────────────────────────────────
const createComponent = [
  idParam(),
  body('component_type').trim().notEmpty().withMessage('Component type is required'),
  body('cert_status').optional({ values: 'falsy' }).isIn(CERT_STATUS).withMessage('Invalid certification status'),
  body('supplier_country_code').optional({ values: 'falsy' }).isLength({ max: 2 }).withMessage('Country code is a 2-letter ISO code'),
];
const updateComponent = [
  idParam(), idParam('compId'),
  body('cert_status').optional({ values: 'falsy' }).isIn(CERT_STATUS).withMessage('Invalid certification status'),
];

// ── Documents ────────────────────────────────────────────────────────────────
const createDoc = [
  idParam(),
  body('title').trim().notEmpty().withMessage('Document title is required'),
];
const updateDoc = [idParam(), idParam('docId')];

// ── Alerts ───────────────────────────────────────────────────────────────────
const alertId = [idParam()];

module.exports = {
  createAudit, updateAudit,
  updateQms,
  createScope, updateScope, deleteScope, updateStep,
  createCapa, updateCapa,
  createPlan, updatePlan, createItem, updateItem, deleteItem, itemEvidence, createReview, updateReview,
  createComponent, updateComponent,
  createDoc, updateDoc,
  alertId,
  idParam,
};
