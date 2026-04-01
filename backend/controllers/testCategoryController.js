const { TestCategory, TestDefinition } = require('../models');
const logger = require('../utils/logger');

/**
 * Get all test categories
 * GET /api/test-categories
 */
exports.getCategories = async (req, res) => {
  try {
    const { cardType, activeOnly } = req.query;

    const { Op } = require('sequelize');
    const where = {};
    if (activeOnly !== 'false') {
      where.is_active = true;
    }
    if (cardType && cardType !== 'ALL') {
      where.card_type = { [Op.in]: ['ALL', cardType] };
    }

    const categories = await TestCategory.findAll({
      where,
      order: [['display_order', 'ASC']],
      include: [{
        model: TestDefinition,
        as: 'definitions',
        attributes: ['id'],
        where: { status: 'active' },
        required: false
      }]
    });

    // Add test count and virtual fields (not serialized by toJSON) to each category
    const result = categories.map(cat => ({
      ...cat.toJSON(),
      category_name: cat.name,
      section_number: cat.iso_standard || '',
      testCount: cat.definitions?.length || 0
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching test categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test categories',
      error: error.message
    });
  }
};

/**
 * Get a single category with its test definitions
 * GET /api/test-categories/:id
 */
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await TestCategory.findByPk(id, {
      include: [{
        model: TestDefinition,
        as: 'definitions',
        where: { status: 'active' },
        required: false
      }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const data = {
      ...category.toJSON(),
      category_name: category.name,
      section_number: category.iso_standard || '',
    };

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching test category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test category',
      error: error.message
    });
  }
};

/**
 * Get categories by card type
 * GET /api/test-categories/by-card-type/:cardType
 */
exports.getCategoriesByCardType = async (req, res) => {
  try {
    const { cardType } = req.params;

    const categories = await TestCategory.findAll({
      where: {
        is_active: true
      },
      order: [['display_order', 'ASC']],
      include: [{
        model: TestDefinition,
        as: 'definitions',
        where: { status: 'active' },
        required: false
      }]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching categories by card type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * Get test definitions by category
 * GET /api/test-categories/:id/definitions
 */
exports.getDefinitionsByCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const definitions = await TestDefinition.findAll({
      where: {
        category_id: id,
        status: 'active'
      },
      order: [['test_id', 'ASC']],
      include: [{
        model: TestCategory,
        as: 'category',
        attributes: ['id', 'category_code', 'name']
      }]
    });

    res.json({
      success: true,
      data: definitions
    });
  } catch (error) {
    logger.error('Error fetching test definitions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test definitions',
      error: error.message
    });
  }
};
