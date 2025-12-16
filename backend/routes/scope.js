const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getWBSItems,
  createWBSItem,
  updateWBSItem,
  deleteWBSItem,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getContracts,
  createContract,
  updateContract,
  deleteContract
} = require('../controllers/scopeController');

// Requirements
router.route('/requirements')
  .get(protect, getRequirements)
  .post(protect, createRequirement);

router.route('/requirements/:requirementId')
  .put(protect, updateRequirement)
  .delete(protect, deleteRequirement);

// WBS Items
router.route('/wbs')
  .get(protect, getWBSItems)
  .post(protect, createWBSItem);

router.route('/wbs/:wbsId')
  .put(protect, updateWBSItem)
  .delete(protect, deleteWBSItem);

// Vendors (global)
router.route('/vendors')
  .get(protect, getVendors)
  .post(protect, createVendor);

router.route('/vendors/:vendorId')
  .put(protect, updateVendor)
  .delete(protect, deleteVendor);

// Contracts
router.route('/contracts')
  .get(protect, getContracts)
  .post(protect, createContract);

router.route('/contracts/:contractId')
  .put(protect, updateContract)
  .delete(protect, deleteContract);

module.exports = router;
