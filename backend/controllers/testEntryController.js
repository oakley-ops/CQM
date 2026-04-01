const { TestEntry, TestSession, TestDefinition, TestCategory, TestEntryMetadata, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const multer = require('multer');
const pdf = require('pdf-parse');

// In-memory multer for PDF uploads (no disk writes)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadMiddleware = upload.single('pdf');

/**
 * Parse peel strength PDF text into structured rows.
 * Handles both Card Center (>= 3.5 N/cm) and Card Edge (>= 5 N/cm) tables.
 */
function parsePeelText(text) {
  // Card Center rows have a Tearing column (YES/NO) before min peel
  // Pattern: H_N | avg | max | location | Front/Back | L-->R | YES/NO | minPeel | PASS/FAIL
  const centerRegex = /(H_\d+)(\d+(?:\.\d+)?)(\d+(?:\.\d+)?)(\d+(?:\.\d+)?)(Front|Back)(L-->R|R-->L)(YES|NO)(\d+(?:\.\d+)?)(PASS|FAIL)/g;
  // Card Edge rows have no Tearing column
  // Pattern: H_N | avg | max | location | Front/Back | L-->R | minPeel | PASS/FAIL
  const edgeRegex = /(H_\d+)(\d+(?:\.\d+)?)(\d+(?:\.\d+)?)(\d+(?:\.\d+)?)(Front|Back)(L-->R|R-->L)(\d+(?:\.\d+)?)(PASS|FAIL)/g;

  const centerRows = [];
  const edgeRows = [];
  let m;

  while ((m = centerRegex.exec(text)) !== null) {
    centerRows.push({
      sectionId: m[1],
      avgPeel: parseFloat(m[2]),
      maxPeel: parseFloat(m[3]),
      frontBack: m[5],
      direction: m[6],
      tearing: m[7],
      minPeel: parseFloat(m[8]),
      passFail: m[9],
      sectionType: 'Center',
    });
  }

  // Edge regex would also match center rows (since YES/NO blocks it) - safe to run on full text
  while ((m = edgeRegex.exec(text)) !== null) {
    // Skip section IDs already captured as center rows
    const alreadyCenter = centerRows.some(r => {
      // Check if this match position overlaps a center match by comparing sectionId + values
      return r.sectionId === m[1] && r.maxPeel === parseFloat(m[3]) && r.minPeel === parseFloat(m[7]);
    });
    if (!alreadyCenter) {
      edgeRows.push({
        sectionId: m[1],
        avgPeel: parseFloat(m[2]),
        maxPeel: parseFloat(m[3]),
        frontBack: m[5],
        direction: m[6],
        minPeel: parseFloat(m[7]),
        passFail: m[8],
        sectionType: 'Edge',
      });
    }
  }

  return { centerRows, edgeRows };
}

/**
 * Parse a peel strength PDF and return structured row data
 * POST /api/test-entries/parse-peel-pdf
 */
exports.parsePeelPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const data = await pdf(req.file.buffer);
    const { centerRows, edgeRows } = parsePeelText(data.text);

    res.json({
      success: true,
      data: { centerRows, edgeRows, rawText: data.text },
    });
  } catch (error) {
    logger.error('Error parsing peel PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to parse PDF', error: error.message });
  }
};

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

    // Delete ALL existing entries for this session before reinserting — makes save idempotent.
    await TestEntry.destroy({
      where: { session_id: sessionId },
      transaction,
    });

    // Insert all entries fresh
    const results = await TestEntry.bulkCreate(
      entries.map(entry => ({
        session_id: sessionId,
        test_definition_id: entry.testDefinitionId,
        sample_card_id: entry.sampleCardId || null,
        measurement_value: entry.measurementValue,
        secondary_measurement_value: entry.secondaryMeasurementValue ?? null,
        assessment_value: entry.assessmentValue,
        pass_status: entry.passStatus,
        multi_value_notes: entry.multiValueNotes,
        notes: entry.notes,
        retest_required: entry.retestRequired || false,
      })),
      { transaction }
    );

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

/**
 * Upsert test-level metadata (header fields for specialized forms like warpage)
 * POST /api/test-entries/metadata
 */
exports.upsertEntryMetadata = async (req, res) => {
  try {
    const { sessionId, testDefinitionId, metadata } = req.body;

    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Test session not found' });
    }
    if (session.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Can only edit metadata on draft sessions' });
    }

    const values = {
      sampled_by:              metadata.sampledBy ?? null,
      technician:              metadata.technician ?? null,
      test_time:               metadata.testTime ?? null,
      temperature_c:           metadata.temperatureC ?? null,
      humidity_pct:            metadata.humidityPct ?? null,
      calibration_verified:    metadata.calibrationVerified ?? null,
      calibration_valid_until: metadata.calibrationValidUntil ?? null,
      env_logger_id:           metadata.envLoggerId ?? null,
      cal_valid_until:         metadata.calValidUntil ?? null,
      sample_preconditioned:   metadata.samplePreconditioned ?? null,
      job_notes:               metadata.jobNotes ?? null,
      extra_data:              metadata.extraData ?? null,
    };

    const [record, created] = await TestEntryMetadata.findOrCreate({
      where: { session_id: sessionId, test_definition_id: testDefinitionId },
      defaults: values,
    });

    if (!created) {
      await record.update(values);
    }

    res.json({ success: true, data: record });
  } catch (error) {
    logger.error('Error upserting entry metadata:', error);
    res.status(500).json({ success: false, message: 'Failed to save metadata', error: error.message });
  }
};

/**
 * Store rendered PDF page images for a test entry (OverlayPeel)
 * POST /api/test-entries/metadata/pdf-pages
 */
exports.storePdfPages = async (req, res) => {
  try {
    const { sessionId, testDefinitionId, pages } = req.body;

    if (!Array.isArray(pages)) {
      return res.status(400).json({ success: false, message: 'pages must be an array' });
    }

    const session = await TestSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Test session not found' });
    }
    if (session.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Can only update metadata on draft sessions' });
    }

    const [record, created] = await TestEntryMetadata.findOrCreate({
      where: { session_id: sessionId, test_definition_id: testDefinitionId },
      defaults: { pdf_pages: pages },
    });
    if (!created) {
      await record.update({ pdf_pages: pages });
    }

    res.json({ success: true, message: `${pages.length} page(s) stored` });
  } catch (error) {
    logger.error('Error storing PDF pages:', error);
    res.status(500).json({ success: false, message: 'Failed to store PDF pages', error: error.message });
  }
};

/**
 * Get test-level metadata for a specific session + test definition
 * GET /api/test-entries/metadata/:sessionId/:testDefinitionId
 */
exports.getEntryMetadata = async (req, res) => {
  try {
    const { sessionId, testDefinitionId } = req.params;
    const record = await TestEntryMetadata.findOne({
      where: { session_id: sessionId, test_definition_id: testDefinitionId }
    });
    res.json({ success: true, data: record || null });
  } catch (error) {
    logger.error('Error fetching entry metadata:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch metadata', error: error.message });
  }
};
