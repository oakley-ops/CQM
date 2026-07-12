const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const v = require('../middleware/nexusValidators');

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
router.post('/audits',                 v.createAudit, validate, auditCtrl.createAudit);
router.get('/audits/:id',              v.idParam(), validate, auditCtrl.getAudit);
router.patch('/audits/:id',            v.updateAudit, validate, auditCtrl.updateAudit);
router.delete('/audits/:id',           v.idParam(), validate, auditCtrl.deleteAudit);

// ── QMS Assessment ───────────────────────────────────────────────────────────
router.get('/audits/:id/qms',                              qmsCtrl.listQms);
router.get('/audits/:id/qms/summary',                      qmsCtrl.qmsSummary);
router.patch('/audits/:id/qms/:requirementId',             v.updateQms, validate, qmsCtrl.updateQms);

// ── Product Scope & Process Steps ────────────────────────────────────────────
router.get('/audits/:id/scope',                                     scopeCtrl.listScopes);
router.post('/audits/:id/scope',                                    v.createScope, validate, scopeCtrl.createScope);
router.patch('/audits/:id/scope/:scopeId',                          v.updateScope, validate, scopeCtrl.updateScope);
router.get('/audits/:id/scope/:scopeId/gate',                       scopeCtrl.checkScopeGate);
router.get('/audits/:id/scope/:scopeId/steps',                      scopeCtrl.listSteps);
router.patch('/audits/:id/scope/:scopeId/steps/:stepId',            v.updateStep, validate, scopeCtrl.updateStep);

// ── Assessment Workbook ───────────────────────────────────────────────────────
router.get('/audits/:id/workbook',   workbookCtrl.getWorkbook);
router.get('/audits/:id/readiness',  workbookCtrl.getReadiness);
router.get('/audits/:id/export/cqmap', exportCtrl.exportCqmap);
router.get('/audits/:id/export/readiness', exportCtrl.exportReadiness);

// ── CAPA ─────────────────────────────────────────────────────────────────────
router.get('/audits/:id/capa',          capaCtrl.listCapa);
router.post('/audits/:id/capa',         v.createCapa, validate, capaCtrl.createCapa);
router.get('/audits/:id/capa/summary',  capaCtrl.capaSummary);
router.patch('/audits/:id/capa/:capaId', v.updateCapa, validate, capaCtrl.updateCapa);

// ── Qualification Plans & Gate ────────────────────────────────────────────────
router.get('/audits/:id/plans',                                planCtrl.listPlans);
router.post('/audits/:id/plans',                               v.createPlan, validate, planCtrl.createPlan);
router.get('/audits/:id/plans/:planId',                        planCtrl.getPlan);
router.patch('/audits/:id/plans/:planId',                      v.updatePlan, validate, planCtrl.updatePlan);
router.get('/audits/:id/plans/:planId/gate',                   planCtrl.checkGate);
router.patch('/audits/:id/plans/:planId/items/:itemId',        v.updateItem, validate, planCtrl.updateItem);
router.post('/audits/:id/plans/:planId/reviews',               v.createReview, validate, planCtrl.createReview);
router.patch('/audits/:id/plans/:planId/reviews/:reviewId',    v.updateReview, validate, planCtrl.updateReview);

// ── Product Conformity Monitoring ────────────────────────────────────────────
router.get('/conformity',                          conformityCtrl.getConformityOverview);
router.get('/conformity/:cardType/sessions',       conformityCtrl.getCardTypeSessions);

// ── Components Registry ───────────────────────────────────────────────────────
router.get('/audits/:id/components',              compCtrl.listComponents);
router.post('/audits/:id/components',             v.createComponent, validate, compCtrl.createComponent);
router.patch('/audits/:id/components/:compId',    v.updateComponent, validate, compCtrl.updateComponent);
router.delete('/audits/:id/components/:compId',   v.updateComponent, validate, compCtrl.deleteComponent);

// ── Audit Report PDF ──────────────────────────────────────────────────────────
router.get('/audits/:id/report',                  reportCtrl.generateReport);

// ── AI Insights ───────────────────────────────────────────────────────────────
router.post('/ai/readiness/:auditId',             aiLimiter, aiCtrl.getReadinessScore);
router.post('/ai/spc/:cardType',                  aiLimiter, aiCtrl.getSpcAnalysis);

// ── Document Register ─────────────────────────────────────────────────────────
router.get('/audits/:id/documents',           docCtrl.listDocs);
router.post('/audits/:id/documents',          v.createDoc, validate, docCtrl.createDoc);
router.patch('/audits/:id/documents/:docId',  v.updateDoc, validate, docCtrl.updateDoc);
router.delete('/audits/:id/documents/:docId', v.updateDoc, validate, docCtrl.deleteDoc);

// ── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts',                  alertCtrl.listAlerts);
router.get('/alerts/summary',          alertCtrl.alertSummary);
router.patch('/alerts/:id/read',       v.alertId, validate, alertCtrl.markRead);
router.patch('/alerts/:id/dismiss',    v.alertId, validate, alertCtrl.dismissAlert);
router.post('/alerts/:id/advice',      v.alertId, validate, aiLimiter, alertCtrl.getAlertAdvice);
router.post('/watchdog/run',           aiLimiter, alertCtrl.runWatchdog);

module.exports = router;
