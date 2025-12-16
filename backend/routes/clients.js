const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const clientController = require('../controllers/clientController');

// Apply authentication middleware to all routes
router.use(protect);

// Client routes
router.get('/', clientController.getAllClients);
router.get('/:id', clientController.getClientById);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router;
