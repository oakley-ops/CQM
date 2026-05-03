const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const auditCtrl    = require('../controllers/nexus/auditRecordController');
const qmsCtrl      = require('../controllers/nexus/qmsAssessmentController');
const scopeCtrl    = require('../controllers/nexus/productScopeController');
const capaCtrl     = require('../controllers/nexus/capaController');
const planCtrl     = require('../controllers/nexus/qualificationPlanController');
const alertCtrl    = require('../controllers/nexus/alertController');

// All NEXUS routes require authentication
router.use(authenticate);

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
router.get('/audits/:id/scope/:scopeId/steps',                      scopeCtrl.listSteps);
router.patch('/audits/:id/scope/:scopeId/steps/:stepId',            scopeCtrl.updateStep);

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
router.patch('/audits/:id/plans/:planId/items/:itemId',        planCtrl.updateItem);
router.post('/audits/:id/plans/:planId/reviews',               planCtrl.createReview);
router.patch('/audits/:id/plans/:planId/reviews/:reviewId',    planCtrl.updateReview);

// ── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts',                  alertCtrl.listAlerts);
router.get('/alerts/summary',          alertCtrl.alertSummary);
router.patch('/alerts/:id/read',       alertCtrl.markRead);
router.patch('/alerts/:id/dismiss',    alertCtrl.dismissAlert);
router.post('/watchdog/run',           alertCtrl.runWatchdog);

module.exports = router;
