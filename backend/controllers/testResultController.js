const { TestResult, TestDefinition, TestCategory, ManufacturingFacility, CardBatch, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Test Result Controller for CQM System
 * Manages test results (formerly Tasks) for card quality testing
 */

// Get all test results with filtering and pagination
exports.getAllTestResults = async (req, res) => {
  try {
    const {
      facility_id,
      batch_id,
      test_definition_id,
      category_id,
      result_status,
      tester_id,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 50,
      sortBy = 'test_date',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};

    if (facility_id) where.facility_id = facility_id;
    if (batch_id) where.batch_id = batch_id;
    if (test_definition_id) where.test_definition_id = test_definition_id;
    if (result_status) where.result_status = result_status;
    if (tester_id) where.tester_id = tester_id;

    // Date range filter
    if (start_date || end_date) {
      where.test_date = {};
      if (start_date) where.test_date[Op.gte] = new Date(start_date);
      if (end_date) where.test_date[Op.lte] = new Date(end_date);
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { result_reference: { [Op.iLike]: `%${search}%` } },
        { comments: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch test results
    const { count, rows: testResults } = await TestResult.findAndCountAll({
      where,
      include: [
        {
          model: TestDefinition,
          as: 'testDefinition',
          attributes: ['id', 'test_id', 'test_name', 'iso_standard', 'measurement_type', 'unit_of_measurement'],
          include: [
            {
              model: TestCategory,
              as: 'category',
              attributes: ['id', 'category_code', 'name']
            }
          ],
          ...(category_id && { where: { category_id } })
        },
        {
          model: ManufacturingFacility,
          as: 'facility',
          attributes: ['id', 'facility_name', 'facility_code', 'country']
        },
        {
          model: CardBatch,
          as: 'batch',
          attributes: ['id', 'batch_number', 'product_name']
        },
        {
          model: User,
          as: 'tester',
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
      passed: await TestResult.count({ where: { ...where, result_status: 'Pass' } }),
      failed: await TestResult.count({ where: { ...where, result_status: 'Fail' } }),
      pending: await TestResult.count({ where: { ...where, result_status: 'Pending' } }),
      in_progress: await TestResult.count({ where: { ...where, result_status: 'In Progress' } })
    };

    stats.pass_rate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: testResults,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test results',
      error: error.message
    });
  }
};

// Get test result by ID
exports.getTestResultById = async (req, res) => {
  try {
    const { id } = req.params;

    const testResult = await TestResult.findByPk(id, {
      include: [
        {
          model: TestDefinition,
          as: 'testDefinition',
          include: [
            {
              model: TestCategory,
              as: 'category'
            }
          ]
        },
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: CardBatch,
          as: 'batch'
        },
        {
          model: User,
          as: 'tester',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'verifier',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: 'Test result not found'
      });
    }

    res.status(200).json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Error fetching test result:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test result',
      error: error.message
    });
  }
};

// Record test result
exports.recordTestResult = async (req, res) => {
  try {
    const testData = {
      ...req.body,
      tester_id: req.user.id,
      result_reference: req.body.result_reference || generateResultReference()
    };

    // Validate that test definition exists
    const testDefinition = await TestDefinition.findByPk(testData.test_definition_id);
    if (!testDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Test definition not found'
      });
    }

    // Determine pass/fail based on test definition criteria
    if (testData.actual_value !== undefined && testDefinition.measurement_type === 'Numeric') {
      const actualValue = parseFloat(testData.actual_value);
      
      if (testDefinition.min_acceptable_value !== null && testDefinition.max_acceptable_value !== null) {
        testData.result_status = (
          actualValue >= testDefinition.min_acceptable_value && 
          actualValue <= testDefinition.max_acceptable_value
        ) ? 'Pass' : 'Fail';
      } else if (testDefinition.target_value !== null && testDefinition.tolerance !== null) {
        const diff = Math.abs(actualValue - testDefinition.target_value);
        testData.result_status = diff <= testDefinition.tolerance ? 'Pass' : 'Fail';
      }
    }

    const testResult = await TestResult.create(testData);

    // Update batch statistics if batch_id is provided
    if (testResult.batch_id) {
      await updateBatchTestStats(testResult.batch_id);
    }

    const createdResult = await TestResult.findByPk(testResult.id, {
      include: [
        {
          model: TestDefinition,
          as: 'testDefinition'
        },
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: CardBatch,
          as: 'batch'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Test result recorded successfully',
      data: createdResult
    });
  } catch (error) {
    console.error('Error recording test result:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording test result',
      error: error.message
    });
  }
};

// Update test result
exports.updateTestResult = async (req, res) => {
  try {
    const { id } = req.params;

    const testResult = await TestResult.findByPk(id);

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: 'Test result not found'
      });
    }

    await testResult.update(req.body);

    // Update batch statistics if batch changed
    if (testResult.batch_id) {
      await updateBatchTestStats(testResult.batch_id);
    }

    const updatedResult = await TestResult.findByPk(id, {
      include: [
        {
          model: TestDefinition,
          as: 'testDefinition'
        },
        {
          model: ManufacturingFacility,
          as: 'facility'
        },
        {
          model: CardBatch,
          as: 'batch'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Test result updated successfully',
      data: updatedResult
    });
  } catch (error) {
    console.error('Error updating test result:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating test result',
      error: error.message
    });
  }
};

// Verify test result
exports.verifyTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_notes } = req.body;

    const testResult = await TestResult.findByPk(id);

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: 'Test result not found'
      });
    }

    await testResult.update({
      is_verified: true,
      verified_by: req.user.id,
      verification_date: new Date(),
      verification_notes
    });

    res.status(200).json({
      success: true,
      message: 'Test result verified successfully',
      data: testResult
    });
  } catch (error) {
    console.error('Error verifying test result:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying test result',
      error: error.message
    });
  }
};

// Delete test result
exports.deleteTestResult = async (req, res) => {
  try {
    const { id } = req.params;

    const testResult = await TestResult.findByPk(id);

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: 'Test result not found'
      });
    }

    const batchId = testResult.batch_id;
    await testResult.destroy();

    // Update batch statistics
    if (batchId) {
      await updateBatchTestStats(batchId);
    }

    res.status(200).json({
      success: true,
      message: 'Test result deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test result:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting test result',
      error: error.message
    });
  }
};

// Get test trends
exports.getTestTrends = async (req, res) => {
  try {
    const { facility_id, test_definition_id, start_date, end_date, interval = 'day' } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (test_definition_id) where.test_definition_id = test_definition_id;

    if (start_date || end_date) {
      where.test_date = {};
      if (start_date) where.test_date[Op.gte] = new Date(start_date);
      if (end_date) where.test_date[Op.lte] = new Date(end_date);
    }

    // Get results grouped by date
    const dateFormat = interval === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    
    const trends = await TestResult.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', interval, sequelize.col('test_date')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('TestResult.id')), 'total_tests'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result_status = 'Pass' THEN 1 ELSE 0 END")), 'passed_tests'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result_status = 'Fail' THEN 1 ELSE 0 END")), 'failed_tests']
      ],
      where,
      group: [sequelize.fn('DATE_TRUNC', interval, sequelize.col('test_date'))],
      order: [[sequelize.fn('DATE_TRUNC', interval, sequelize.col('test_date')), 'ASC']],
      raw: true
    });

    // Calculate pass rate for each period
    const trendsWithRate = trends.map(trend => ({
      ...trend,
      pass_rate: trend.total_tests > 0 ? ((trend.passed_tests / trend.total_tests) * 100).toFixed(2) : 0
    }));

    res.status(200).json({
      success: true,
      data: trendsWithRate
    });
  } catch (error) {
    console.error('Error fetching test trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test trends',
      error: error.message
    });
  }
};

// Get test results by batch
exports.getTestResultsByBatch = async (req, res) => {
  try {
    const { batch_id } = req.params;

    const testResults = await TestResult.findAll({
      where: { batch_id },
      include: [
        {
          model: TestDefinition,
          as: 'testDefinition',
          include: [
            {
              model: TestCategory,
              as: 'category'
            }
          ]
        },
        {
          model: User,
          as: 'tester',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['test_date', 'DESC']]
    });

    // Group by category
    const groupedByCategory = testResults.reduce((acc, result) => {
      const categoryName = result.testDefinition?.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(result);
      return acc;
    }, {});

    // Calculate statistics
    const stats = {
      total: testResults.length,
      passed: testResults.filter(r => r.result_status === 'Pass').length,
      failed: testResults.filter(r => r.result_status === 'Fail').length,
      pending: testResults.filter(r => r.result_status === 'Pending').length
    };

    stats.pass_rate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0;
    stats.completion_rate = stats.total > 0 ? (((stats.passed + stats.failed) / stats.total) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: testResults,
      grouped_by_category: groupedByCategory,
      stats
    });
  } catch (error) {
    console.error('Error fetching test results by batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test results by batch',
      error: error.message
    });
  }
};

// Get test statistics
exports.getTestStatistics = async (req, res) => {
  try {
    const { facility_id, start_date, end_date } = req.query;

    const where = {};
    if (facility_id) where.facility_id = facility_id;
    if (start_date || end_date) {
      where.test_date = {};
      if (start_date) where.test_date[Op.gte] = new Date(start_date);
      if (end_date) where.test_date[Op.lte] = new Date(end_date);
    }

    const [
      totalTests,
      passedTests,
      failedTests,
      pendingTests,
      verifiedTests
    ] = await Promise.all([
      TestResult.count({ where }),
      TestResult.count({ where: { ...where, result_status: 'Pass' } }),
      TestResult.count({ where: { ...where, result_status: 'Fail' } }),
      TestResult.count({ where: { ...where, result_status: 'Pending' } }),
      TestResult.count({ where: { ...where, is_verified: true } })
    ]);

    // Tests by category
    const byCategory = await TestResult.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('TestResult.id')), 'count'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result_status = 'Pass' THEN 1 ELSE 0 END")), 'passed']
      ],
      include: [
        {
          model: TestDefinition,
          as: 'testDefinition',
          attributes: [],
          include: [
            {
              model: TestCategory,
              as: 'category',
              attributes: ['id', 'name', 'category_code']
            }
          ]
        }
      ],
      where,
      group: ['testDefinition.category.id', 'testDefinition.category.name', 'testDefinition.category.category_code'],
      raw: false
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        pending: pendingTests,
        verified: verifiedTests,
        pass_rate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0,
        verification_rate: totalTests > 0 ? ((verifiedTests / totalTests) * 100).toFixed(2) : 0,
        by_category: byCategory
      }
    });
  } catch (error) {
    console.error('Error fetching test statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test statistics',
      error: error.message
    });
  }
};

// Helper function: Generate result reference
function generateResultReference() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `TR-${year}${month}${day}-${random}`;
}

// Helper function: Update batch test statistics
async function updateBatchTestStats(batchId) {
  try {
    const CardBatch = require('../models').CardBatch;
    
    const [totalTests, passedTests, failedTests] = await Promise.all([
      TestResult.count({ where: { batch_id: batchId } }),
      TestResult.count({ where: { batch_id: batchId, result_status: 'Pass' } }),
      TestResult.count({ where: { batch_id: batchId, result_status: 'Fail' } })
    ]);

    const completionPercentage = totalTests > 0 ? ((passedTests + failedTests) / totalTests) * 100 : 0;

    await CardBatch.update(
      {
        tests_completed: totalTests,
        tests_passed: passedTests,
        tests_failed: failedTests,
        test_completion_percentage: completionPercentage.toFixed(2)
      },
      { where: { id: batchId } }
    );
  } catch (error) {
    console.error('Error updating batch test stats:', error);
  }
}

module.exports = exports;

