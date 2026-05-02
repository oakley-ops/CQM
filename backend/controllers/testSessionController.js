const { TestSession, TestEntry, TestDefinition, TestCategory, TestEntryMetadata, SampleCard, User, Job, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const pdfService = require('../services/pdfService');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Spawn the Python report generator and return the PDF buffer.
 * @param {string} type - 'session' or 'management'
 * @param {string} jsonPayload - JSON string to pass via stdin
 * @returns {Promise<Buffer>}
 */
/**
 * Resolve the Python 3 executable. On Windows the 'python' command may be a
 * Microsoft Store stub (exit 9009) rather than a real interpreter.
 * We test candidates synchronously so we fail fast with a clear message.
 */
function resolvePython() {
  const { execFileSync } = require('child_process');
  const candidates = ['python3', 'python', 'py'];
  for (const cmd of candidates) {
    try {
      const out = execFileSync(cmd, ['--version'], { timeout: 5000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (/Python 3/i.test(out)) return cmd;
    } catch (_) {
      // Store alias exits non-zero or command not found — try next
    }
  }
  return null;
}

function callPythonReport(type, jsonPayload) {
  return new Promise((resolve, reject) => {
    const pythonExe = resolvePython();
    if (!pythonExe) {
      return reject(new Error(
        'Python 3 is not installed or not in PATH. ' +
        'Install it from https://www.python.org/downloads/ (check "Add Python to PATH"), ' +
        'then run: pip install -r backend/report_service/requirements.txt'
      ));
    }

    const scriptPath = path.join(__dirname, '..', 'report_service', 'generate.py');
    const child = spawn(pythonExe, [scriptPath, '--type', type]);

    const chunks = [];
    const stderrChunks = [];

    // Suppress EPIPE/EOF on stdin when process exits before we finish writing
    child.stdin.on('error', () => {});

    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

    child.on('close', (code) => {
      if (code !== 0) {
        const stderrMsg = Buffer.concat(stderrChunks).toString('utf8');
        return reject(new Error(`Python report generator exited with code ${code}: ${stderrMsg}`));
      }
      resolve(Buffer.concat(chunks));
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });

    try {
      child.stdin.write(jsonPayload);
      child.stdin.end();
    } catch (_) {
      // stdin may already be closed if Python failed immediately
    }
  });
}

/**
 * Get qualification / monitoring compliance status for a product (catNumber)
 * GET /api/test-sessions/qualification-status?catNumber=XXX
 */
exports.getQualificationStatus = async (req, res) => {
  try {
    const { catNumber } = req.query;
    if (!catNumber) {
      return res.status(400).json({ success: false, message: 'catNumber is required' });
    }

    // Latest approved qualification
    const lastApprovedQual = await TestSession.findOne({
      where: { cat_number: catNumber, session_type: 'Qualification', status: 'approved' },
      order: [['approved_at', 'DESC']]
    });

    // Latest qualification of any status (to detect re-qual-pending)
    const lastQual = await TestSession.findOne({
      where: { cat_number: catNumber, session_type: 'Qualification' },
      order: [['created_at', 'DESC']]
    });

    // Latest approved/submitted monitoring session
    const lastMonitoring = await TestSession.findOne({
      where: { cat_number: catNumber, session_type: 'Monitoring', status: { [Op.in]: ['approved', 'submitted'] } },
      order: [['test_date', 'DESC']]
    });

    // Determine qualification status
    let status = 'unqualified';
    if (lastApprovedQual) {
      // Check if a qualification was rejected AFTER the last approval (re-qual needed)
      const rejectedAfterApproval = await TestSession.findOne({
        where: {
          cat_number: catNumber,
          session_type: 'Qualification',
          status: 'rejected',
          created_at: { [Op.gt]: lastApprovedQual.approved_at }
        }
      });
      status = rejectedAfterApproval ? 're-qual-pending' : 'qualified';
    } else if (lastQual && lastQual.status === 'rejected') {
      status = 're-qual-pending';
    }

    // Expiry check — find categories used in the last approved qualification via entries
    let isExpired = false;
    let daysUntilExpiry = null;
    let requiredFrequencyDays = null;

    if (status === 'qualified' && lastApprovedQual) {
      const usedCategories = await TestCategory.findAll({
        include: [{
          model: TestDefinition,
          as: 'definitions',
          required: true,
          include: [{
            model: TestEntry,
            as: 'entries',
            required: true,
            where: { session_id: lastApprovedQual.id }
          }]
        }]
      });

      // Use the most restrictive (smallest) valid_months and frequency across all categories
      const validMonthsList = usedCategories
        .map(c => c.qualification_valid_months)
        .filter(v => v != null);
      const freqDaysList = usedCategories
        .map(c => c.monitoring_frequency_days)
        .filter(v => v != null);

      if (validMonthsList.length > 0) {
        const minValidMonths = Math.min(...validMonthsList);
        const approvedAt = new Date(lastApprovedQual.approved_at);
        const expiresAt = new Date(approvedAt);
        expiresAt.setMonth(expiresAt.getMonth() + minValidMonths);
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        daysUntilExpiry = Math.ceil((expiresAt - now) / msPerDay);
        isExpired = daysUntilExpiry <= 0;
      }

      if (freqDaysList.length > 0) {
        requiredFrequencyDays = Math.min(...freqDaysList);
      }
    }

    // Monitoring overdue check
    let monitoringOverdue = false;
    let daysSinceLastMonitoring = null;
    if (requiredFrequencyDays && lastMonitoring) {
      const lastDate = new Date(lastMonitoring.test_date);
      const now = new Date();
      daysSinceLastMonitoring = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      monitoringOverdue = daysSinceLastMonitoring > requiredFrequencyDays;
    } else if (requiredFrequencyDays && !lastMonitoring && status === 'qualified') {
      monitoringOverdue = true;
    }

    res.json({
      success: true,
      data: {
        status,
        lastQualification: lastApprovedQual,
        isExpired,
        daysUntilExpiry,
        lastMonitoring,
        monitoringOverdue,
        daysSinceLastMonitoring,
        requiredFrequencyDays
      }
    });
  } catch (error) {
    logger.error('Error fetching qualification status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch qualification status', error: error.message });
  }
};

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
      sessionType,
      batchLotNumber,
      startDate,
      endDate,
      inspectorId
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (cardType) where.card_type = cardType;
    if (sessionType) where.session_type = sessionType;
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
      order: [['test_date', 'DESC'], ['created_at', 'DESC']],
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'job_number'],
          required: false,
        },
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
          model: Job,
          as: 'job',
          attributes: ['id', 'job_number']
        },
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
      jobNumber,
      jobName,
      batchLotNumber,
      catNumber,
      cardType,
      sessionType,
      testDate,
      manufacturingStage,
    } = req.body;

    // Auto-generate session number; store jobNumber separately in job_name if provided
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
    const { Op } = require('sequelize');
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
    const todayCount = await TestSession.count({
      where: { created_at: { [Op.between]: [startOfDay, endOfDay] } }
    });
    const sessionNumber = `TS-${datePrefix}-${String(todayCount + 1).padStart(3, '0')}`;

    // Upsert a job if a jobNumber was provided, then link the session
    let jobId = null;
    if (jobNumber) {
      const { Job } = require('../models');
      const [job] = await Job.findOrCreate({
        where: { job_number: String(jobNumber).trim() },
        defaults: {
          job_number: String(jobNumber).trim(),
          card_type: cardType || null,
          status: 'active',
          start_date: testDate || new Date()
        }
      });
      jobId = job.id;
    }

    const session = await TestSession.create({
      session_number: sessionNumber,
      job_id: jobId,
      job_name: jobName,
      session_type: sessionType || 'Monitoring',
      card_type: cardType || 'ALL',
      manufacturing_stage: manufacturingStage || null,
      batch_lot_number: batchLotNumber,
      cat_number: catNumber,
      test_date: testDate || new Date(),
      inspector_id: req.user.id,
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
      jobNumber,
      jobName,
      batchLotNumber,
      catNumber,
      cardType,
      sessionType,
      testDate,
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
      session_number: jobNumber || session.session_number,
      job_name: jobName,
      session_type: sessionType || session.session_type,
      card_type: cardType || session.card_type,
      batch_lot_number: batchLotNumber || session.batch_lot_number,
      cat_number: catNumber,
      test_date: testDate || session.test_date,
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

    if (session.status !== 'draft' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Only draft sessions can be deleted. Admins can delete any session.'
      });
    }

    const jobId = session.job_id;

    // Delete child records first to avoid FK constraint violations
    await TestEntryMetadata.destroy({ where: { session_id: id } });
    await TestEntry.destroy({ where: { session_id: id } });
    await SampleCard.destroy({ where: { session_id: id } });
    await session.destroy();

    // If this session was linked to a job and that job now has no sessions, delete the job too
    if (jobId) {
      const remainingSessions = await TestSession.count({ where: { job_id: jobId } });
      if (remainingSessions === 0) {
        await Job.destroy({ where: { id: jobId } });
      }
    }

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

    // Enforce sample size requirements per category
    const sampleCounts = await SampleCard.findAll({
      where: { session_id: id },
      attributes: ['category_id', [sequelize.fn('MAX', sequelize.col('card_number')), 'max_card']],
      group: ['category_id'],
      raw: true
    });

    for (const sc of sampleCounts) {
      if (!sc.category_id) continue;
      const category = await TestCategory.findByPk(sc.category_id);
      if (!category) continue;

      const required = session.session_type === 'Qualification'
        ? category.qualification_sample_size
        : category.monitoring_sample_size;
      const actual = parseInt(sc.max_card, 10);

      if (actual < required) {
        return res.status(400).json({
          success: false,
          message: `Insufficient samples for "${category.name}": ${actual} card(s) tested, minimum ${required} required for a ${session.session_type} session.`
        });
      }
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

    const requal = session.session_type === 'Qualification'
      ? '\n\n⚠ RE-QUALIFICATION REQUIRED: This product must complete a new Qualification session before Monitoring can resume.'
      : '';

    await session.update({
      status: 'rejected',
      general_notes: session.general_notes
        ? `${session.general_notes}\n\nRejection reason: ${reason}${requal}`
        : `Rejection reason: ${reason}${requal}`
    });

    res.json({
      success: true,
      data: session,
      message: session.session_type === 'Qualification'
        ? 'Qualification session rejected. Re-qualification required before Monitoring resumes.'
        : 'Test session rejected'
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
 * Re-open a rejected session for editing
 * PUT /api/test-sessions/:id/reopen
 */
exports.reopenSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await TestSession.findByPk(id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Test session not found' });
    }
    if (session.status !== 'rejected' && session.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only rejected or approved sessions can be re-opened' });
    }

    await session.update({ status: 'draft' });

    res.json({ success: true, data: session, message: 'Test session re-opened for editing' });
  } catch (error) {
    logger.error('Error reopening test session:', error);
    res.status(500).json({ success: false, message: 'Failed to re-open session', error: error.message });
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

    // Fetch metadata for all entries (includes pdf_pages for OverlayPeel)
    const metadataRecords = await TestEntryMetadata.findAll({
      where: { session_id: id }
    });
    const metadataMap = new Map(metadataRecords.map(m => [m.test_definition_id, m.toJSON()]));

    // Generate PDF
    logger.info('Starting PDF generation...');
    const pdfBuffer = await pdfService.generateSessionReport(
      session.toJSON(),
      session.entries ? session.entries.map(e => e.toJSON()) : [],
      metadataMap
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

/**
 * Export a single test session as a professional PDF report (via Python/xhtml2pdf)
 * GET /api/test-sessions/:id/export-report
 */
exports.exportProfessionalReport = async (req, res) => {
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

    const payload = JSON.stringify({
      session: session.toJSON(),
      entries: session.entries ? session.entries.map(e => e.toJSON()) : []
    });

    const pdfBuffer = await callPythonReport('session', payload);

    const date = new Date().toISOString().split('T')[0];
    const filename = `ProfessionalReport_${session.session_number}_${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error exporting professional report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export professional report',
      error: error.message
    });
  }
};

/**
 * Export a management summary PDF report for multiple sessions (via Python/xhtml2pdf)
 * GET /api/test-sessions/management-report
 */
exports.exportManagementReport = async (req, res) => {
  try {
    const { startDate, endDate, cardType, status } = req.query;

    const where = {};
    if (status) where.status = status;
    if (cardType) where.card_type = cardType;
    if (startDate || endDate) {
      where.test_date = {};
      if (startDate) where.test_date[Op.gte] = startDate;
      if (endDate) where.test_date[Op.lte] = endDate;
    }

    const rows = await TestSession.findAll({
      where,
      limit: 500,
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

    const sessionsData = rows.map(session => {
      const plain = session.toJSON();
      const entries = plain.entries || [];
      const totalTests = entries.length;
      const passedTests = entries.filter(e => e.pass_status === true).length;
      const failedTests = entries.filter(e => e.pass_status === false).length;
      const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
      return {
        ...plain,
        totalTests,
        passedTests,
        failedTests,
        passRate
      };
    });

    const payload = JSON.stringify({
      sessions: sessionsData,
      dateFrom: startDate || '',
      dateTo: endDate || ''
    });

    const pdfBuffer = await callPythonReport('management', payload);

    const date = new Date().toISOString().split('T')[0];
    const filename = `ManagementReport_${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error exporting management report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export management report',
      error: error.message
    });
  }
};
