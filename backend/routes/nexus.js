const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { aiLimiter } = require('../middleware/rateLimiter');
const { nexusEvidenceUpload } = require('../middleware/nexusEvidenceUpload');

const auditCtrl    = require('../controllers/nexus/auditRecordController');
const qmsCtrl      = require('../controllers/nexus/qmsAssessmentController');
const scopeCtrl    = require('../controllers/nexus/productScopeController');
const capaCtrl     = require('../controllers/nexus/capaController');
const planCtrl     = require('../controllers/nexus/qualificationPlanController');
const docCtrl         = require('../controllers/nexus/documentController');
const conformityCtrl  = require('../controllers/nexus/conformityController');
const compCtrl        = require('../controllers/nexus/componentController');
const reportCtrl      = require('../controllers/nexus/reportController');
const aiCtrl          = require('../controllers/nexus/aiController');
const alertCtrl    = require('../controllers/nexus/alertController');
const workbookCtrl = require('../controllers/nexus/workbookController');
const exportCtrl   = require('../controllers/nexus/exportController');

// Every NEXUS controller replies with { error: '...' } on failure, but the frontend's
// shared axios interceptor (frontend/src/services/api.ts) only reads `message` off the
// response body — so a specific reason was silently replaced by a generic fallback
// ("Invalid request data.", "Resource not found.") in the UI. Mirror it here, once, for
// every response this router sends, rather than editing every res.json({ error }) call
// site individually. Only fills the gap — a response that already sets its own `message`
// (e.g. the #0706# gate-check errors) is left untouched.
router.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && 'error' in body && !('message' in body)) {
      body.message = body.error;
    }
    return originalJson(body);
  };
  next();
});

// All NEXUS routes require authentication
router.use(authenticate);

// Reads are open to any authenticated user; every mutation (POST/PATCH/PUT/DELETE)
// requires an elevated quality role. This guards audit/CAPA/QMS/scope/component/
// document/plan writes and the watchdog trigger against low-privilege accounts.
const requireQualityWrite = authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER, ROLES.AUDITOR);
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return requireQualityWrite(req, res, next);
});

// ── Dashboard Stats ───────────────────────────────────────────────────────────
router.get('/stats',                   auditCtrl.getStats);

// ── Audit Records ────────────────────────────────────────────────────────────
router.get('/audits',                  auditCtrl.listAudits);
router.post('/audits',                 auditCtrl.createAudit);
router.get('/audits/:id',              auditCtrl.getAudit);
router.patch('/audits/:id',            auditCtrl.updateAudit);
router.delete('/audits/:id',           auditCtrl.deleteAudit);

// ── QMS Assessment ───────────────────────────────────────────────────────────
router.get('/audits/:id/qms',                              qmsCtrl.listQms);
router.get('/audits/:id/qms/summary',                      qmsCtrl.qmsSummary);
router.patch('/audits/:id/qms/:requirementId',             qmsCtrl.updateQms);

// ── Product Scope & Process Steps ────────────────────────────────────────────
router.get('/audits/:id/scope',                                     scopeCtrl.listScopes);
router.post('/audits/:id/scope',                                    scopeCtrl.createScope);
router.patch('/audits/:id/scope/:scopeId',                          scopeCtrl.updateScope);
router.delete('/audits/:id/scope/:scopeId',                         scopeCtrl.deleteScope);
router.get('/audits/:id/scope/:scopeId/gate',                       scopeCtrl.checkScopeGate);
router.get('/audits/:id/scope/:scopeId/steps',                      scopeCtrl.listSteps);
router.patch('/audits/:id/scope/:scopeId/steps/:stepId',            scopeCtrl.updateStep);

// ── Assessment Workbook ───────────────────────────────────────────────────────
router.get('/audits/:id/workbook',   workbookCtrl.getWorkbook);
router.get('/audits/:id/readiness',  workbookCtrl.getReadiness);
router.get('/audits/:id/export/cqmap', exportCtrl.exportCqmap);
router.get('/audits/:id/export/readiness', exportCtrl.exportReadiness);

// ── CAPA ─────────────────────────────────────────────────────────────────────
router.get('/audits/:id/capa',          capaCtrl.listCapa);
router.post('/audits/:id/capa',         capaCtrl.createCapa);
router.get('/audits/:id/capa/summary',  capaCtrl.capaSummary);
router.patch('/audits/:id/capa/:capaId', capaCtrl.updateCapa);

// ── Qualification Plans & Gate ────────────────────────────────────────────────
router.get('/audits/:id/plans',                                planCtrl.listPlans);
router.post('/audits/:id/plans',                               planCtrl.createPlan);
router.get('/audits/:id/plans/:planId',                        planCtrl.getPlan);
router.patch('/audits/:id/plans/:planId',                      planCtrl.updatePlan);
router.get('/audits/:id/plans/:planId/gate',                   planCtrl.checkGate);
router.post('/audits/:id/plans/:planId/items',                 planCtrl.createItem);
router.patch('/audits/:id/plans/:planId/items/:itemId',        planCtrl.updateItem);
router.delete('/audits/:id/plans/:planId/items/:itemId',       planCtrl.deleteItem);
router.post('/audits/:id/plans/:planId/items/:itemId/evidence',   nexusEvidenceUpload.single('file'), planCtrl.uploadEvidence);
router.get('/audits/:id/plans/:planId/items/:itemId/evidence',    planCtrl.downloadEvidence);
router.delete('/audits/:id/plans/:planId/items/:itemId/evidence', planCtrl.deleteEvidence);
router.post('/audits/:id/plans/:planId/reviews',               planCtrl.createReview);
router.patch('/audits/:id/plans/:planId/reviews/:reviewId',    planCtrl.updateReview);

// ── Product Conformity Monitoring ────────────────────────────────────────────
router.get('/conformity',                          conformityCtrl.getConformityOverview);
router.get('/conformity/:cardType/sessions',       conformityCtrl.getCardTypeSessions);

// ── Components Registry ───────────────────────────────────────────────────────
router.get('/audits/:id/components',              compCtrl.listComponents);
router.post('/audits/:id/components',             compCtrl.createComponent);
router.patch('/audits/:id/components/:compId',    compCtrl.updateComponent);
router.delete('/audits/:id/components/:compId',   compCtrl.deleteComponent);

// ── Audit Report PDF ──────────────────────────────────────────────────────────
router.get('/audits/:id/report',                  reportCtrl.generateReport);

// ── AI Insights ───────────────────────────────────────────────────────────────
router.post('/ai/readiness/:auditId',             aiLimiter, aiCtrl.getReadinessScore);
router.post('/ai/spc/:cardType',                  aiLimiter, aiCtrl.getSpcAnalysis);

// ── Document Register ─────────────────────────────────────────────────────────
router.get('/audits/:id/documents',           docCtrl.listDocs);
router.post('/audits/:id/documents',          docCtrl.createDoc);
router.patch('/audits/:id/documents/:docId',  docCtrl.updateDoc);
router.delete('/audits/:id/documents/:docId', docCtrl.deleteDoc);

// ── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts',                  alertCtrl.listAlerts);
router.get('/alerts/summary',          alertCtrl.alertSummary);
router.patch('/alerts/:id/read',       alertCtrl.markRead);
router.patch('/alerts/:id/dismiss',    alertCtrl.dismissAlert);
router.post('/alerts/:id/advice',      aiLimiter, alertCtrl.getAlertAdvice);
router.post('/watchdog/run',           aiLimiter, alertCtrl.runWatchdog);

module.exports = router;
