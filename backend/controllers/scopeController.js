const { Requirement, WBSItem, Vendor, Contract, Project } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// Requirements
const getRequirements = async (req, res, next) => {
  try {
    const requirements = await Requirement.findAll({
      where: { project_id: req.params.id },
      order: [['requirement_id', 'ASC']]
    });
    res.status(200).json({ success: true, data: requirements });
  } catch (error) {
    next(error);
  }
};

const createRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.create({ project_id: req.params.id, ...req.body });
    res.status(201).json({ success: true, data: requirement });
  } catch (error) {
    next(error);
  }
};

const updateRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findByPk(req.params.requirementId);
    if (!requirement) return next(new AppError('Requirement not found', 404));
    await requirement.update(req.body);
    res.status(200).json({ success: true, data: requirement });
  } catch (error) {
    next(error);
  }
};

const deleteRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findByPk(req.params.requirementId);
    if (!requirement) return next(new AppError('Requirement not found', 404));
    await requirement.destroy();
    res.status(200).json({ success: true, message: 'Requirement deleted' });
  } catch (error) {
    next(error);
  }
};

// WBS Items
const getWBSItems = async (req, res, next) => {
  try {
    const items = await WBSItem.findAll({
      where: { project_id: req.params.id },
      include: [{ model: WBSItem, as: 'children' }],
      order: [['wbs_code', 'ASC']]
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const createWBSItem = async (req, res, next) => {
  try {
    const item = await WBSItem.create({ project_id: req.params.id, ...req.body });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

const updateWBSItem = async (req, res, next) => {
  try {
    const item = await WBSItem.findByPk(req.params.wbsId);
    if (!item) return next(new AppError('WBS item not found', 404));
    await item.update(req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

const deleteWBSItem = async (req, res, next) => {
  try {
    const item = await WBSItem.findByPk(req.params.wbsId);
    if (!item) return next(new AppError('WBS item not found', 404));
    await item.destroy();
    res.status(200).json({ success: true, message: 'WBS item deleted' });
  } catch (error) {
    next(error);
  }
};

// Vendors
const getVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.findAll({ order: [['name', 'ASC']] });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    next(error);
  }
};

const createVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

const updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByPk(req.params.vendorId);
    if (!vendor) return next(new AppError('Vendor not found', 404));
    await vendor.update(req.body);
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

const deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByPk(req.params.vendorId);
    if (!vendor) return next(new AppError('Vendor not found', 404));
    await vendor.destroy();
    res.status(200).json({ success: true, message: 'Vendor deleted' });
  } catch (error) {
    next(error);
  }
};

// Contracts
const getContracts = async (req, res, next) => {
  try {
    const contracts = await Contract.findAll({
      where: { project_id: req.params.id },
      include: [{ model: Vendor, as: 'vendor' }],
      order: [['start_date', 'DESC']]
    });
    res.status(200).json({ success: true, data: contracts });
  } catch (error) {
    next(error);
  }
};

const createContract = async (req, res, next) => {
  try {
    const contract = await Contract.create({ project_id: req.params.id, ...req.body });
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
};

const updateContract = async (req, res, next) => {
  try {
    const contract = await Contract.findByPk(req.params.contractId);
    if (!contract) return next(new AppError('Contract not found', 404));
    await contract.update(req.body);
    res.status(200).json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
};

const deleteContract = async (req, res, next) => {
  try {
    const contract = await Contract.findByPk(req.params.contractId);
    if (!contract) return next(new AppError('Contract not found', 404));
    await contract.destroy();
    res.status(200).json({ success: true, message: 'Contract deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
