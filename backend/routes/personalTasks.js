const express = require('express');
const router = express.Router();
const personalTaskController = require('../controllers/personalTaskController');
const personalTaskExportController = require('../controllers/personalTaskExportController');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Task routes
router.get('/', personalTaskController.getPersonalTasks);
router.get('/statistics', personalTaskController.getTaskStatistics);
router.get('/export/excel', personalTaskExportController.exportToExcel);
router.get('/:id', personalTaskController.getPersonalTaskById);
router.post('/', personalTaskController.createPersonalTask);
router.put('/:id', personalTaskController.updatePersonalTask);
router.delete('/:id', personalTaskController.deletePersonalTask);
router.post('/reorder', personalTaskController.reorderTasks);

module.exports = router;
