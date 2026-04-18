'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/kappaController');

// All Kappa routes require authentication
router.use(authenticate);

// ── Studies ───────────────────────────────────────────────────────────────────
router.get('/trend',    ctrl.getTrend);      // before /:id to avoid conflict
router.get('/',         ctrl.listStudies);
router.post('/',        ctrl.createStudy);
router.get('/:id',      ctrl.getStudy);
router.put('/:id',      ctrl.updateStudy);
router.delete('/:id',   ctrl.deleteStudy);

// ── Ratings ───────────────────────────────────────────────────────────────────
router.get('/:id/ratings',  ctrl.getRatings);
router.post('/:id/ratings', ctrl.submitRatings);

// ── Results ───────────────────────────────────────────────────────────────────
router.get('/:id/results',  ctrl.getResults);

module.exports = router;
