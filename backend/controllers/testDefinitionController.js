const { TestDefinition, TestCategory, TestResult, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Test Definition Controller for CQM System
 * Manages the ~100 test definitions required for card quality management
 */

// Get all test definitions with filtering and pagination
exports.getAllTestDefinitions = async (req, res) => {
  try {
    const { 
      category_id, 
      iso_standard, 
      test_type, 
      is_mandatory, 
      is_cqm_required,
      is_destructive,
      risk_level,
      status,
      search,
      page = 1,
      limit = 50,
      sortBy = 'test_id',
      sortOrder = 'ASC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (category_id) where.category_id = category_id;
    if (iso_standard) where.iso_standard = { [Op.iLike]: `%${iso_standard}%` };
    if (test_type) where.test_type = test_type;
    if (is_mandatory !== undefined) where.is_mandatory = is_mandatory === 'true';
    if (is_cqm_required !== undefined) where.is_cqm_required = is_cqm_required === 'true';
    if (is_destructive !== undefined) where.is_destructive = is_destructive === 'true';
    if (risk_level) where.risk_level = risk_level;
    if (status) where.status = status;

    // Search functionality
    if (search) {
      where[Op.or] = [
        { test_id: { [Op.iLike]: `%${search}%` } },
        { test_name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch test definitions
    const { count, rows: testDefinitions } = await TestDefinition.findAndCountAll({
      where,
      include: [
        {
          model: TestCategory,
          as: 'category',
          attributes: ['id', 'category_code', 'name', 'iso_standard']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    // Calculate statistics
    const stats = {
      total: count,
      mandatory: await TestDefinition.count({ where: { ...where, is_mandatory: true } }),
      optional: await TestDefinition.count({ where: { ...where, is_mandatory: false } }),
      destructive: await TestDefinition.count({ where: { ...where, is_destructive: true } }),
      non_destructive: await TestDefinition.count({ where: { ...where, is_destructive: false } }),
      by_risk: {
        critical: await TestDefinition.count({ where: { ...where, risk_level: 'Critical' } }),
        high: await TestDefinition.count({ where: { ...where, risk_level: 'High' } }),
        medium: await TestDefinition.count({ where: { ...where, risk_level: 'Medium' } }),
        low: await TestDefinition.count({ where: { ...where, risk_level: 'Low' } })
      }
    };

    res.status(200).json({
      success: true,
      data: testDefinitions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching test definitions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test definitions',
      error: error.message
    });
  }
};

// Get test definition by ID
exports.getTestDefinitionById = async (req, res) => {
  try {
    const { id } = req.params;

    const testDefinition = await TestDefinition.findByPk(id, {
      include: [
        {
          model: TestCategory,
          as: 'category',
          attributes: ['id', 'category_code', 'name', 'iso_standard', 'description']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: TestDefinition,
          as: 'supersededBy',
          attributes: ['id', 'test_id', 'test_name', 'version', 'status']
        }
      ]
    });

    if (!testDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Test definition not found'
      });
    }

    // Get test results count
    const testResultsCount = await TestResult.count({
      where: { test_definition_id: id }
    });

    res.status(200).json({
      success: true,
      data: {
        ...testDefinition.toJSON(),
        test_results_count: testResultsCount
      }
    });
  } catch (error) {
    console.error('Error fetching test definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test definition',
      error: error.message
    });
  }
};

// Get tests by category
exports.getTestsByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { status = 'Active', sortBy = 'test_id', sortOrder = 'ASC' } = req.query;

    const tests = await TestDefinition.findAll({
      where: {
        category_id,
        status
      },
      include: [
        {
          model: TestCategory,
          as: 'category',
          attributes: ['id', 'category_code', 'name']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    // Group by test type
    const groupedByType = tests.reduce((acc, test) => {
      const type = test.test_type || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(test);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: tests,
      grouped: groupedByType,
      count: tests.length,
      stats: {
        mandatory: tests.filter(t => t.is_mandatory).length,
        optional: tests.filter(t => !t.is_mandatory).length,
        destructive: tests.filter(t => t.is_destructive).length
      }
    });
  } catch (error) {
    console.error('Error fetching tests by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tests by category',
      error: error.message
    });
  }
};

// Get tests by ISO standard
exports.getTestsByISOStandard = async (req, res) => {
  try {
    const { iso_standard } = req.params;
    const { status = 'Active' } = req.query;

    const tests = await TestDefinition.findAll({
      where: {
        iso_standard: { [Op.iLike]: `%${iso_standard}%` },
        status
      },
      include: [
        {
          model: TestCategory,
          as: 'category'
        }
      ],
      order: [['test_id', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Error fetching tests by ISO standard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tests by ISO standard',
      error: error.message
    });
  }
};

// Create test definition
exports.createTestDefinition = async (req, res) => {
  try {
    const testData = {
      ...req.body,
      created_by: req.user.id,
      status: req.body.status || 'Draft'
    };

    const testDefinition = await TestDefinition.create(testData);

    const createdTest = await TestDefinition.findByPk(testDefinition.id, {
      include: [
        {
          model: TestCategory,
          as: 'category'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Test definition created successfully',
      data: createdTest
    });
  } catch (error) {
    console.error('Error creating test definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test definition',
      error: error.message
    });
  }
};

// Update test definition
exports.updateTestDefinition = async (req, res) => {
  try {
    const { id } = req.params;

    const testDefinition = await TestDefinition.findByPk(id);

    if (!testDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Test definition not found'
      });
    }

    await testDefinition.update(req.body);

    const updatedTest = await TestDefinition.findByPk(id, {
      include: [
        {
          model: TestCategory,
          as: 'category'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Test definition updated successfully',
      data: updatedTest
    });
  } catch (error) {
    console.error('Error updating test definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating test definition',
      error: error.message
    });
  }
};

// Approve test definition
exports.approveTestDefinition = async (req, res) => {
  try {
    const { id } = req.params;

    const testDefinition = await TestDefinition.findByPk(id);

    if (!testDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Test definition not found'
      });
    }

    await testDefinition.update({
      status: 'Active',
      approved_by: req.user.id,
      approval_date: new Date(),
      effective_date: req.body.effective_date || new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Test definition approved successfully',
      data: testDefinition
    });
  } catch (error) {
    console.error('Error approving test definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving test definition',
      error: error.message
    });
  }
};

// Supersede test definition (create new version)
exports.supersedeTestDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_version, ...newTestData } = req.body;

    const oldTest = await TestDefinition.findByPk(id);

    if (!oldTest) {
      return res.status(404).json({
        success: false,
        message: 'Test definition not found'
      });
    }

    // Create new version
    const newTest = await TestDefinition.create({
      ...oldTest.toJSON(),
      ...newTestData,
      id: undefined,
      version: new_version || (parseFloat(oldTest.version) + 0.1).toFixed(1),
      status: 'Draft',
      created_by: req.user.id,
      approved_by: null,
      approval_date: null,
      effective_date: null,
      superseded_by_id: null,
      superseded_date: null,
      created_at: undefined,
      updated_at: undefined
    });

    // Mark old test as superseded
    await oldTest.update({
      status: 'Superseded',
      superseded_by_id: newTest.id,
      superseded_date: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'New version created successfully',
      data: {
        old_test: oldTest,
        new_test: newTest
      }
    });
  } catch (error) {
    console.error('Error superseding test definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error superseding test definition',
      error: error.message
    });
  }
};

// Delete test definition
exports.deleteTestDefinition = async (req, res) => {
  try {
    const { id } = req.params;

    const testDefinition = await TestDefinition.findByPk(id);

    if (!testDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Test definition not found'
      });
    }

    // Check if test has been used
    const testResultsCount = await TestResult.count({
      where: { test_definition_id: id }
    });

    if (testResultsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete test definition. It has ${testResultsCount} associated test results. Consider marking it as Obsolete instead.`
      });
    }

    await testDefinition.destroy();

    res.status(200).json({
      success: true,
      message: 'Test definition deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting test definition',
      error: error.message
    });
  }
};

// Get test definition statistics
exports.getTestDefinitionStats = async (req, res) => {
  try {
    const totalTests = await TestDefinition.count();
    const activeTests = await TestDefinition.count({ where: { status: 'Active' } });
    const draftTests = await TestDefinition.count({ where: { status: 'Draft' } });
    const supersededTests = await TestDefinition.count({ where: { status: 'Superseded' } });
    
    const mandatoryTests = await TestDefinition.count({ where: { is_mandatory: true } });
    const optionalTests = await TestDefinition.count({ where: { is_mandatory: false } });
    
    const destructiveTests = await TestDefinition.count({ where: { is_destructive: true } });
    const nonDestructiveTests = await TestDefinition.count({ where: { is_destructive: false } });

    // Tests by category
    const byCategory = await TestDefinition.findAll({
      attributes: [
        'category_id',
        [sequelize.fn('COUNT', sequelize.col('TestDefinition.id')), 'count']
      ],
      include: [
        {
          model: TestCategory,
          as: 'category',
          attributes: ['category_code', 'name']
        }
      ],
      group: ['category_id', 'category.id'],
      raw: false
    });

    // Tests by risk level
    const byRiskLevel = await TestDefinition.findAll({
      attributes: [
        'risk_level',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['risk_level'],
      raw: true
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalTests,
        by_status: {
          active: activeTests,
          draft: draftTests,
          superseded: supersededTests
        },
        by_requirement: {
          mandatory: mandatoryTests,
          optional: optionalTests
        },
        by_destructiveness: {
          destructive: destructiveTests,
          non_destructive: nonDestructiveTests
        },
        by_category: byCategory,
        by_risk_level: byRiskLevel
      }
    });
  } catch (error) {
    console.error('Error fetching test definition stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test definition statistics',
      error: error.message
    });
  }
};

// Mark test as obsolete
exports.markAsObsolete = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const testDefinition = await TestDefinition.findByPk(id);

    if (!testDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Test definition not found'
      });
    }

    await testDefinition.update({
      status: 'Obsolete',
      notes: testDefinition.notes ? `${testDefinition.notes}\n\nMarked obsolete: ${reason}` : `Marked obsolete: ${reason}`
    });

    res.status(200).json({
      success: true,
      message: 'Test definition marked as obsolete',
      data: testDefinition
    });
  } catch (error) {
    console.error('Error marking test as obsolete:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking test as obsolete',
      error: error.message
    });
  }
};

// Import test definitions (bulk create)
exports.importTestDefinitions = async (req, res) => {
  try {
    const { tests } = req.body;

    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test definitions array'
      });
    }

    // Add created_by to all tests
    const testsWithCreator = tests.map(test => ({
      ...test,
      created_by: req.user.id
    }));

    const createdTests = await TestDefinition.bulkCreate(testsWithCreator);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdTests.length} test definitions`,
      data: createdTests
    });
  } catch (error) {
    console.error('Error importing test definitions:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing test definitions',
      error: error.message
    });
  }
};

