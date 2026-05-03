const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const auditCtrl    = require('../controllers/nexus/auditRecordController');
const qmsCtrl      = require('../controllers/nexus/qmsAssessmentController');
const scopeCtrl    = require('../controllers/nexus/productScopeController');
const capaCtrl     = require('../controllers/nexus/capaController');
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

// ── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts',                  alertCtrl.listAlerts);
router.get('/alerts/summary',          alertCtrl.alertSummary);
router.patch('/alerts/:id/read',       alertCtrl.markRead);
router.patch('/alerts/:id/dismiss',    alertCtrl.dismissAlert);
router.post('/watchdog/run',           alertCtrl.runWatchdog);

module.exports = router;
