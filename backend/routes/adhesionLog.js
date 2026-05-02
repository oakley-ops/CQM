const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adhesionLogController');

router.use(authenticate);

router.get('/',                         ctrl.list);
router.post('/',                        ctrl.create);
router.get('/job/:jobNumber/last',      ctrl.getLastForJob);
router.get('/:id',                      ctrl.getOne);
router.put('/:id',                      ctrl.update);
router.delete('/:id',                   ctrl.remove);

module.exports = router;
