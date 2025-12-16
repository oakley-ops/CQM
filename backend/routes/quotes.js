const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const quoteController = require('../controllers/quoteController');
const quoteMilestoneController = require('../controllers/quoteMilestoneController');
const quoteActionController = require('../controllers/quoteActionController');

// Apply authentication middleware to all routes
router.use(protect);

// Quote routes
router.post('/', quoteController.createQuote);
router.get('/', quoteController.getAllQuotes);
router.get('/statistics', quoteController.getQuoteStatistics);
router.get('/:id', quoteController.getQuoteById);
router.put('/:id', quoteController.updateQuote);
router.patch('/:id/status', quoteController.updateQuoteStatus);
router.patch('/:id/next-stage', quoteController.moveToNextStage);
router.post('/:id/convert-to-project', quoteController.convertToProject);
router.delete('/:id', quoteController.deleteQuote);

// Milestone routes for specific quote
router.get('/:id/milestones', quoteMilestoneController.getQuoteMilestones);
router.put('/:id/milestones/:milestone_id', quoteMilestoneController.updateMilestoneTracking);
router.patch('/:id/milestones/:milestone_id/complete', quoteMilestoneController.completeMilestone);

// Action routes for specific quote
router.get('/:id/actions', quoteActionController.getQuoteActions);
router.post('/:id/actions', quoteActionController.createAction);
router.put('/:id/actions/:action_id', quoteActionController.updateAction);
router.patch('/:id/actions/:action_id/complete', quoteActionController.completeAction);
router.delete('/:id/actions/:action_id', quoteActionController.deleteAction);

module.exports = router;
