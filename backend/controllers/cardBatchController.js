const { CardBatch, ManufacturingFacility, TestResult, User, Component, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Card Batch Controller for CQM System
 * Manages production batches of smart cards
 */

// Get all card batches with filtering and pagination
exports.getAllCardBatches = async (req, res) => {
  try {
    const {
      facility_id,
      card_type,
      status,
      quality_status,
      operator_id,
      production_date_start,
      production_date_end,
      customer_name,
      search,
      page = 1,
      limit = 20,
      sortBy = 'production_date',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};

    if (facility_id) where.facility_id = facility_id;
    if (card_type) where.card_type = card_type;
    if (status) where.status = status;
    if (quality_status) where.quality_status = quality_status;
    if (operator_id) where.operator_id = operator_id;
    if (customer_name) where.customer_name = { [Op.iLike]: `%${customer_name}%` };

    // Date range filter
    if (production_date_start || production_date_end) {
      where.production_date = {};
      if (production_date_start) where.production_date[Op.gte] = new Date(production_date_start);
      if (production_date_end) where.production_date[Op.lte] = new Date(production_date_end);
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { batch_number: { [Op.iLike]: `%${search}%` } },
        { product_name: { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch card batches
    const { count, rows: cardBatches } = await CardBatch.findAndCountAll({
      where,
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility',
          attributes: ['id', 'facility_name', 'facility_code', 'country']
        },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'supervisor',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    // Calculate yield and defect rates
    const batchesWithRates = cardBatches.map(batch => {
      const yieldRate = batch.getYieldPercentage();
      const defectRate = batch.getDefectRate();
      
      return {
        ...batch.toJSON(),
        yield_rate: yieldRate,
        defect_rate: defectRate
      };
    });

    // Calculate statistics
    const stats = {
      total: count,
      in_production: await CardBatch.count({ where: { ...where, status: 'In Production' } }),
      completed: await CardBatch.count({ where: { ...where, status: 'Completed' } }),
      approved: await CardBatch.count({ where: { ...where, status: 'Approved' } }),
      released: await CardBatch.count({ where: { ...where, status: 'Released' } }),
      quarantined: await CardBatch.count({ where: { ...where, is_quarantined: true } })
    };

    res.status(200).json({
      success: true,
      data: batchesWithRates,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching card batches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching card batches',
      error: error.message
    });
  }
};

// Get card batch by ID
exports.getCardBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const cardBatch = await CardBatch.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'supervisor',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    // Get test results for this batch
    const testResults = await TestResult.findAll({
      where: { batch_id: id },
      include: [
        {
          model: require('../models').TestDefinition,
          as: 'testDefinition',
          attributes: ['id', 'test_id', 'test_name']
        }
      ],
      order: [['test_date', 'DESC']],
      limit: 20
    });

    // Calculate rates
    const yieldRate = cardBatch.getYieldPercentage();
    const defectRate = cardBatch.getDefectRate();

    res.status(200).json({
      success: true,
      data: {
        ...cardBatch.toJSON(),
        yield_rate: yieldRate,
        defect_rate: defectRate,
        test_results: testResults
      }
    });
  } catch (error) {
    console.error('Error fetching card batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching card batch',
      error: error.message
    });
  }
};

// Create card batch
exports.createCardBatch = async (req, res) => {
  try {
    const batchData = {
      ...req.body,
      batch_number: req.body.batch_number || generateBatchNumber()
    };

    const cardBatch = await CardBatch.create(batchData);

    const createdBatch = await CardBatch.findByPk(cardBatch.id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: User,
          as: 'operator'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Card batch created successfully',
      data: createdBatch
    });
  } catch (error) {
    console.error('Error creating card batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating card batch',
      error: error.message
    });
  }
};

// Update card batch
exports.updateCardBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    await cardBatch.update(req.body);

    const updatedBatch = await CardBatch.findByPk(id, {
      include: [
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: User,
          as: 'operator'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Card batch updated successfully',
      data: updatedBatch
    });
  } catch (error) {
    console.error('Error updating card batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating card batch',
      error: error.message
    });
  }
};

// Start batch production
exports.startBatchProduction = async (req, res) => {
  try {
    const { id } = req.params;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    await cardBatch.update({
      status: 'In Production',
      start_date: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Batch production started',
      data: cardBatch
    });
  } catch (error) {
    console.error('Error starting batch production:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting batch production',
      error: error.message
    });
  }
};

// Complete batch production
exports.completeBatchProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { produced_quantity, accepted_quantity, rejected_quantity, scrap_quantity, production_notes } = req.body;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    await cardBatch.update({
      status: 'Completed',
      end_date: new Date(),
      produced_quantity,
      accepted_quantity,
      rejected_quantity,
      scrap_quantity,
      production_notes
    });

    res.status(200).json({
      success: true,
      message: 'Batch production completed',
      data: cardBatch
    });
  } catch (error) {
    console.error('Error completing batch production:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing batch production',
      error: error.message
    });
  }
};

// Approve batch (QC approval)
exports.approveBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { quality_notes } = req.body;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    if (cardBatch.status !== 'Completed' && cardBatch.status !== 'Testing') {
      return res.status(400).json({
        success: false,
        message: 'Batch must be completed or tested before approval'
      });
    }

    await cardBatch.update({
      status: 'Approved',
      quality_status: 'Pass',
      qc_approved: true,
      qc_approval_date: new Date(),
      qc_approved_by: req.user.id,
      quality_notes
    });

    res.status(200).json({
      success: true,
      message: 'Batch approved successfully',
      data: cardBatch
    });
  } catch (error) {
    console.error('Error approving batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving batch',
      error: error.message
    });
  }
};

// Reject batch
exports.rejectBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    await cardBatch.update({
      status: 'Rejected',
      quality_status: 'Fail',
      qc_approved: false,
      quality_notes: rejection_reason
    });

    res.status(200).json({
      success: true,
      message: 'Batch rejected',
      data: cardBatch
    });
  } catch (error) {
    console.error('Error rejecting batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting batch',
      error: error.message
    });
  }
};

// Quarantine batch
exports.quarantineBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { quarantine_reason } = req.body;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    await cardBatch.update({
      status: 'Quarantined',
      is_quarantined: true,
      quarantine_date: new Date(),
      quarantine_reason
    });

    res.status(200).json({
      success: true,
      message: 'Batch quarantined',
      data: cardBatch
    });
  } catch (error) {
    console.error('Error quarantining batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error quarantining batch',
      error: error.message
    });
  }
};

// Release batch from quarantine
exports.releaseBatchFromQuarantine = async (req, res) => {
  try {
    const { id } = req.params;
    const { release_notes } = req.body;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    if (!cardBatch.is_quarantined) {
      return res.status(400).json({
        success: false,
        message: 'Batch is not quarantined'
      });
    }

    await cardBatch.update({
      status: 'Testing',
      is_quarantined: false,
      notes: `${cardBatch.notes || ''}\n\nReleased from quarantine: ${release_notes}`
    });

    res.status(200).json({
      success: true,
      message: 'Batch released from quarantine',
      data: cardBatch
    });
  } catch (error) {
    console.error('Error releasing batch from quarantine:', error);
    res.status(500).json({
      success: false,
      message: 'Error releasing batch from quarantine',
      error: error.message
    });
  }
};

// Release batch (final release)
exports.releaseBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { release_certificate_number } = req.body;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    if (!cardBatch.qc_approved) {
      return res.status(400).json({
        success: false,
        message: 'Batch must be QC approved before final release'
      });
    }

    await cardBatch.update({
      status: 'Released',
      release_date: new Date(),
      released_by: req.user.id,
      release_certificate_number
    });

    res.status(200).json({
      success: true,
      message: 'Batch released successfully',
      data: cardBatch
    });
  } catch (error) {
    console.error('Error releasing batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error releasing batch',
      error: error.message
    });
  }
};

// Delete card batch
exports.deleteCardBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const cardBatch = await CardBatch.findByPk(id);

    if (!cardBatch) {
      return res.status(404).json({
        success: false,
        message: 'Card batch not found'
      });
    }

    // Check if batch has test results
    const testResultsCount = await TestResult.count({ where: { batch_id: id } });

    if (testResultsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete batch. It has ${testResultsCount} associated test results.`
      });
    }

    await cardBatch.destroy();

    res.status(200).json({
      success: true,
      message: 'Card batch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting card batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting card batch',
      error: error.message
    });
  }
};

// Get batch statistics
exports.getBatchStatistics = async (req, res) => {
  try {
    const { facility_id, start_date, end_date, card_type } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (card_type) where.card_type = card_type;
    if (start_date || end_date) {
      where.production_date = {};
      if (start_date) where.production_date[Op.gte] = new Date(start_date);
      if (end_date) where.production_date[Op.lte] = new Date(end_date);
    }

    const [
      totalBatches,
      completedBatches,
      approvedBatches,
      releasedBatches,
      quarantinedBatches
    ] = await Promise.all([
      CardBatch.count({ where }),
      CardBatch.count({ where: { ...where, status: 'Completed' } }),
      CardBatch.count({ where: { ...where, status: 'Approved' } }),
      CardBatch.count({ where: { ...where, status: 'Released' } }),
      CardBatch.count({ where: { ...where, is_quarantined: true } })
    ]);

    // Total production quantities
    const quantities = await CardBatch.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('planned_quantity')), 'total_planned'],
        [sequelize.fn('SUM', sequelize.col('produced_quantity')), 'total_produced'],
        [sequelize.fn('SUM', sequelize.col('accepted_quantity')), 'total_accepted'],
        [sequelize.fn('SUM', sequelize.col('rejected_quantity')), 'total_rejected']
      ],
      where,
      raw: true
    });

    // Average yield rate
    const avgYield = quantities[0].total_produced > 0 
      ? ((quantities[0].total_accepted / quantities[0].total_produced) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        total_batches: totalBatches,
        completed: completedBatches,
        approved: approvedBatches,
        released: releasedBatches,
        quarantined: quarantinedBatches,
        quantities: {
          planned: parseInt(quantities[0].total_planned) || 0,
          produced: parseInt(quantities[0].total_produced) || 0,
          accepted: parseInt(quantities[0].total_accepted) || 0,
          rejected: parseInt(quantities[0].total_rejected) || 0
        },
        average_yield_rate: avgYield
      }
    });
  } catch (error) {
    console.error('Error fetching batch statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batch statistics',
      error: error.message
    });
  }
};

// Helper function: Generate batch number
function generateBatchNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `BATCH-${year}${month}${day}-${random}`;
}

module.exports = exports;

