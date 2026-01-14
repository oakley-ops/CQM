const { TestSession, TestEntry, TestDefinition, TestCategory, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const pdfService = require('../services/pdfService');

/**
 * Get all test sessions with pagination and filtering
 * GET /api/test-sessions
 */
exports.getSessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      cardType,
      batchLotNumber,
      startDate,
      endDate,
      inspectorId
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (cardType) where.card_type = cardType;
    if (batchLotNumber) where.batch_lot_number = { [Op.iLike]: `%${batchLotNumber}%` };
    if (inspectorId) where.inspector_id = inspectorId;
    if (startDate || endDate) {
      where.test_date = {};
      if (startDate) where.test_date[Op.gte] = startDate;
      if (endDate) where.test_date[Op.lte] = endDate;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await TestSession.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: TestEntry,
          as: 'entries',
          attributes: ['id', 'pass_status']
        }
      ]
    });

    // Calculate stats for each session
    const sessions = rows.map(session => {
      const entries = session.entries || [];
      const totalTests = entries.length;
      const passedTests = entries.filter(e => e.pass_status === true).length;
      const failedTests = entries.filter(e => e.pass_status === false).length;

      return {
        ...session.toJSON(),
        totalTests,
        passedTests,
        failedTests,
        passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      };
    });

    res.json({
      success: true,
      data: sessions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching test sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test sessions',
      error: error.message
    });
  }
};

/**
 * Get a single test session with all entries
 * GET /api/test-sessions/:id
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await TestSession.findByPk(id, {
      include: [
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: TestEntry,
          as: 'entries',
          include: [{
            model: TestDefinition,
            as: 'definition',
            include: [{
              model: TestCategory,
              as: 'category'
            }]
          }]
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Error fetching test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test session',
      error: error.message
    });
  }
};

/**
 * Create a new test session
 * POST /api/test-sessions
 */
exports.createSession = async (req, res) => {
  try {
    const {
      cardType,
      manufacturingStage,
      batchLotNumber,
      cardSerialNumber,
      testDate,
      equipmentId,
      generalNotes
    } = req.body;

    // Generate session number
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await TestSession.count() || 0;
    const sessionNumber = `TS-${datePrefix}-${String(count + 1).padStart(3, '0')}`;

    const session = await TestSession.create({
      session_number: sessionNumber,
      card_type: cardType,
      manufacturing_stage: manufacturingStage,
      batch_lot_number: batchLotNumber,
      card_serial_number: cardSerialNumber,
      test_date: testDate || new Date(),
      inspector_id: req.user.id,
      equipment_id: equipmentId,
      general_notes: generalNotes,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      data: session,
      message: 'Test session created successfully'
    });
  } catch (error) {
    logger.error('Error creating test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test session',
      error: error.message
    });
  }
};

/**
 * Update a test session
 * PUT /api/test-sessions/:id
 */
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cardType,
      manufacturingStage,
      batchLotNumber,
      cardSerialNumber,
      testDate,
      equipmentId,
      generalNotes
    } = req.body;

    const session = await TestSession.findByPk(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft sessions can be updated'
      });
    }

    await session.update({
      card_type: cardType || session.card_type,
      manufacturing_stage: manufacturingStage || session.manufacturing_stage,
      batch_lot_number: batchLotNumber || session.batch_lot_number,
      card_serial_number: cardSerialNumber,
      test_date: testDate || session.test_date,
      equipment_id: equipmentId,
      general_notes: generalNotes
    });

    res.json({
      success: true,
      data: session,
      message: 'Test session updated successfully'
    });
  } catch (error) {
    logger.error('Error updating test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test session',
      error: error.message
    });
  }
};

/**
 * Delete a draft test session
 * DELETE /api/test-sessions/:id
 */
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await TestSession.findByPk(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft sessions can be deleted'
      });
    }

    await session.destroy();

    res.json({
      success: true,
      message: 'Test session deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test session',
      error: error.message
    });
  }
};

/**
 * Submit a test session for approval
 * PUT /api/test-sessions/:id/submit
 */
exports.submitSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await TestSession.findByPk(id, {
      include: [{
        model: TestEntry,
        as: 'entries'
      }]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft sessions can be submitted'
      });
    }

    if (!session.entries || session.entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit a session with no test entries'
      });
    }

    await session.update({
      status: 'submitted',
      submitted_at: new Date()
    });

    res.json({
      success: true,
      data: session,
      message: 'Test session submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit test session',
      error: error.message
    });
  }
};

/**
 * Approve a test session
 * PUT /api/test-sessions/:id/approve
 */
exports.approveSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await TestSession.findByPk(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only submitted sessions can be approved'
      });
    }

    await session.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date()
    });

    res.json({
      success: true,
      data: session,
      message: 'Test session approved successfully'
    });
  } catch (error) {
    logger.error('Error approving test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve test session',
      error: error.message
    });
  }
};

/**
 * Reject a test session
 * PUT /api/test-sessions/:id/reject
 */
exports.rejectSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const session = await TestSession.findByPk(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (session.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only submitted sessions can be rejected'
      });
    }

    await session.update({
      status: 'rejected',
      general_notes: session.general_notes
        ? `${session.general_notes}\n\nRejection reason: ${reason}`
        : `Rejection reason: ${reason}`
    });

    res.json({
      success: true,
      data: session,
      message: 'Test session rejected'
    });
  } catch (error) {
    logger.error('Error rejecting test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject test session',
      error: error.message
    });
  }
};

/**
 * Export test session as PDF
 * GET /api/test-sessions/:id/export-pdf
 */
exports.exportPDF = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Generating PDF for session ${id}`);

    const session = await TestSession.findByPk(id, {
      include: [
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: TestEntry,
          as: 'entries',
          include: [{
            model: TestDefinition,
            as: 'definition',
            include: [{
              model: TestCategory,
              as: 'category'
            }]
          }]
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    // Generate PDF
    logger.info('Starting PDF generation...');
    const pdfBuffer = await pdfService.generateSessionReport(
      session.toJSON(),
      session.entries ? session.entries.map(e => e.toJSON()) : []
    );

    // Ensure it's a Buffer
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    // Verify PDF has valid content (PDF files start with %PDF)
    if (buffer.length < 100) {
      logger.error('PDF buffer too small:', buffer.length);
      throw new Error('Generated PDF is invalid or empty');
    }

    const pdfHeader = buffer.slice(0, 5).toString();
    if (pdfHeader !== '%PDF-') {
      logger.error('Invalid PDF header:', pdfHeader);
      throw new Error('Generated content is not a valid PDF');
    }

    logger.info(`PDF generated successfully, size: ${buffer.length} bytes`);

    // Set response headers for PDF download
    const filename = `TestSession_${session.session_number}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Clear any existing headers and set proper PDF headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Send the buffer directly
    return res.send(buffer);

  } catch (error) {
    logger.error('Error exporting test session PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF',
      error: error.message
    });
  }
};
