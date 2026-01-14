const { TestEntry, TestSession, TestDefinition, TestCategory, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Create or update a test entry
 * POST /api/test-entries
 */
exports.createOrUpdateEntry = async (req, res) => {
  try {
    const {
      sessionId,
      testDefinitionId,
      measurementValue,
      assessmentValue,
      passStatus,
      multiValueNotes,
      notes,
      retestRequired
    } = req.body;

    // Verify session exists and is editable
    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only add entries to draft sessions'
      });
    }

    // Upsert the entry
    const [entry, created] = await TestEntry.upsert({
      session_id: sessionId,
      test_definition_id: testDefinitionId,
      measurement_value: measurementValue,
      assessment_value: assessmentValue,
      pass_status: passStatus,
      multi_value_notes: multiValueNotes,
      notes,
      retest_required: retestRequired || false
    }, {
      returning: true
    });

    res.status(created ? 201 : 200).json({
      success: true,
      data: entry,
      message: created ? 'Test entry created' : 'Test entry updated'
    });
  } catch (error) {
    logger.error('Error creating/updating test entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save test entry',
      error: error.message
    });
  }
};

/**
 * Bulk save test entries for a session
 * POST /api/test-entries/bulk
 */
exports.bulkSaveEntries = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { sessionId, entries } = req.body;

    // Verify session exists and is editable
    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Can only add entries to draft sessions'
      });
    }

    // Process each entry
    const results = [];
    for (const entry of entries) {
      const [savedEntry] = await TestEntry.upsert({
        session_id: sessionId,
        test_definition_id: entry.testDefinitionId,
        measurement_value: entry.measurementValue,
        assessment_value: entry.assessmentValue,
        pass_status: entry.passStatus,
        multi_value_notes: entry.multiValueNotes,
        notes: entry.notes,
        retest_required: entry.retestRequired || false
      }, {
        transaction,
        returning: true
      });
      results.push(savedEntry);
    }

    await transaction.commit();

    // Get updated stats
    const allEntries = await TestEntry.findAll({
      where: { session_id: sessionId }
    });

    const totalTests = allEntries.length;
    const passedTests = allEntries.filter(e => e.pass_status === true).length;
    const failedTests = allEntries.filter(e => e.pass_status === false).length;

    res.json({
      success: true,
      data: {
        savedCount: results.length,
        totalTests,
        passedTests,
        failedTests,
        passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      },
      message: `${results.length} test entries saved successfully`
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error bulk saving test entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save test entries',
      error: error.message
    });
  }
};

/**
 * Get all entries for a session
 * GET /api/test-entries/session/:sessionId
 */
exports.getEntriesBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const entries = await TestEntry.findAll({
      where: { session_id: sessionId },
      include: [{
        model: TestDefinition,
        as: 'definition',
        include: [{
          model: TestCategory,
          as: 'category'
        }]
      }],
      order: [[{ model: TestDefinition, as: 'definition' }, 'display_order', 'ASC']]
    });

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    logger.error('Error fetching test entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test entries',
      error: error.message
    });
  }
};

/**
 * Delete a test entry
 * DELETE /api/test-entries/:id
 */
exports.deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await TestEntry.findByPk(id, {
      include: [{
        model: TestSession,
        as: 'session'
      }]
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Test entry not found'
      });
    }

    if (entry.session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete entries from draft sessions'
      });
    }

    await entry.destroy();

    res.json({
      success: true,
      message: 'Test entry deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting test entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test entry',
      error: error.message
    });
  }
};
