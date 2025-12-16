const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation
} = require('../controllers/resourceController');

// Team Members
router.route('/team')
  .get(protect, getTeamMembers)
  .post(protect, createTeamMember);

router.route('/team/:memberId')
  .put(protect, updateTeamMember)
  .delete(protect, deleteTeamMember);

// Resource Allocations
router.route('/allocations')
  .get(protect, getAllocations)
  .post(protect, createAllocation);

router.route('/allocations/:allocationId')
  .put(protect, updateAllocation)
  .delete(protect, deleteAllocation);

module.exports = router;
