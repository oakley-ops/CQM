const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getCharter,
  createCharter,
  updateCharter,
  approveCharter,
  deleteCharter
} = require('../controllers/charterController');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(protect, getCharter)
  .post(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), createCharter)
  .put(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), updateCharter)
  .delete(protect, authorize(ROLES.ADMIN), deleteCharter);

router.put('/approve', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), approveCharter);

module.exports = router;
