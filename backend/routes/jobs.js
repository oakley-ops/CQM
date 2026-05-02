const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const jobController = require('../controllers/jobController');

// All routes require authentication
router.use(authenticate);

// List & create
router.get('/', jobController.listJobs);
router.post('/', jobController.createJob);

// Single job by job_number
router.get('/:jobNumber/statistics', jobController.getJobStatistics);
router.get('/:jobNumber/spc/:testDefinitionId', jobController.getJobSPC);
router.get('/:jobNumber/control-chart/:testDefinitionId', jobController.getJobControlChart);
router.get('/:jobNumber', jobController.getJob);
router.patch('/:jobNumber', jobController.updateJob);
router.delete('/:jobNumber', jobController.deleteJob);

// Link a session to a job
router.post('/sessions/:sessionId/link', jobController.linkSessionToJob);

module.exports = router;
