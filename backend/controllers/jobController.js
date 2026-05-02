const { Op, QueryTypes } = require('sequelize');
const { sequelize, Job, TestSession, TestEntry, TestDefinition, SampleCard, User } = require('../models');
const logger = require('../utils/logger');
const { computeSPC } = require('../utils/spcEngine');

// ─── List Jobs ───────────────────────────────────────────────────────────────
exports.listJobs = async (req, res) => {
  try {
    const {
      search, status, card_type,
      page = 1, limit = 50,
      sort = 'start_date', order = 'DESC'
    } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { job_number: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { customer_reference: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;
    if (card_type) where.card_type = card_type;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const allowedSort = ['job_number', 'start_date', 'end_date', 'status', 'card_type', 'created_at'];
    const sortCol = allowedSort.includes(sort) ? sort : 'start_date';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Job.findAndCountAll({
      where,
      order: [[sortCol, sortDir]],
      limit: parseInt(limit),
      offset,
      distinct: true,
      include: [
        {
          model: TestSession,
          as: 'sessions',
          attributes: ['id', 'status', 'test_date'],
          required: false
        }
      ]
    });

    // Compute summary stats per job
    const jobs = rows.map(j => {
      const sessions = j.sessions || [];
      const totalSessions = sessions.length;
      return {
        id: j.id,
        job_number: j.job_number,
        card_type: j.card_type,
        status: j.status,
        start_date: j.start_date,
        end_date: j.end_date,
        description: j.description,
        customer_reference: j.customer_reference,
        source_file: j.source_file,
        session_count: totalSessions,
        created_at: j.created_at,
        updated_at: j.updated_at
      };
    });

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('listJobs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
};

// ─── Get Single Job ───────────────────────────────────────────────────────────
exports.getJob = async (req, res) => {
  try {
    const { jobNumber } = req.params;
    const job = await Job.findOne({
      where: { job_number: jobNumber },
      include: [
        {
          model: TestSession,
          as: 'sessions',
          attributes: ['id', 'session_number', 'test_date', 'session_type', 'status', 'equipment_id', 'general_notes'],
          include: [
            { model: User, as: 'inspector', attributes: ['id', 'first_name', 'last_name', 'email'] }
          ],
          order: [['test_date', 'ASC']]
        }
      ]
    });

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    res.json({ success: true, data: job });
  } catch (err) {
    logger.error('getJob error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch job' });
  }
};

// ─── Create Job ───────────────────────────────────────────────────────────────
exports.createJob = async (req, res) => {
  try {
    const { job_number, card_type, status, start_date, end_date, description, customer_reference } = req.body;

    if (!job_number) {
      return res.status(400).json({ success: false, message: 'job_number is required' });
    }

    const existing = await Job.findOne({ where: { job_number } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Job ${job_number} already exists` });
    }

    const job = await Job.create({ job_number, card_type, status, start_date, end_date, description, customer_reference });
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    logger.error('createJob error:', err);
    res.status(500).json({ success: false, message: 'Failed to create job' });
  }
};

// ─── Update Job ───────────────────────────────────────────────────────────────
exports.updateJob = async (req, res) => {
  try {
    const { jobNumber } = req.params;
    const job = await Job.findOne({ where: { job_number: jobNumber } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const { card_type, status, start_date, end_date, description, customer_reference } = req.body;
    await job.update({ card_type, status, start_date, end_date, description, customer_reference });
    res.json({ success: true, data: job });
  } catch (err) {
    logger.error('updateJob error:', err);
    res.status(500).json({ success: false, message: 'Failed to update job' });
  }
};

// ─── Delete Job ───────────────────────────────────────────────────────────────
exports.deleteJob = async (req, res) => {
  try {
    const { jobNumber } = req.params;
    const job = await Job.findOne({ where: { job_number: jobNumber } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    await job.destroy();
    res.json({ success: true, message: `Job ${jobNumber} deleted` });
  } catch (err) {
    logger.error('deleteJob error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete job' });
  }
};

// ─── Job Statistics ───────────────────────────────────────────────────────────
exports.getJobStatistics = async (req, res) => {
  try {
    const { jobNumber } = req.params;
    const job = await Job.findOne({ where: { job_number: jobNumber } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Per-test-definition stats
    const measurements = await sequelize.query(`
      SELECT
        td.id                                                     AS test_definition_id,
        td.test_name,
        td.unit_of_measurement                                    AS unit,
        td.min_acceptable_value                                   AS spec_min,
        td.max_acceptable_value                                   AS spec_max,
        COUNT(te.id)::int                                         AS n,
        ROUND(AVG(te.measurement_value)::numeric, 4)              AS mean,
        ROUND(STDDEV(te.measurement_value)::numeric, 4)           AS std_dev,
        ROUND(MIN(te.measurement_value)::numeric, 4)              AS min_val,
        ROUND(MAX(te.measurement_value)::numeric, 4)              AS max_val,
        SUM(CASE WHEN te.pass_status = false THEN 1 ELSE 0 END)::int AS fail_count,
        SUM(CASE WHEN te.pass_status IS NOT NULL THEN 1 ELSE 0 END)::int AS assessed_count
      FROM test_entries te
      JOIN test_sessions ts ON ts.id = te.session_id
      JOIN test_definitions td ON td.id = te.test_definition_id
      WHERE ts.job_id = :jobId
        AND te.measurement_value IS NOT NULL
      GROUP BY td.id, td.test_name, td.unit_of_measurement, td.min_acceptable_value, td.max_acceptable_value
      ORDER BY td.test_name
    `, { replacements: { jobId: job.id }, type: QueryTypes.SELECT });

    // Compute Cpk for each measurement type (suppress when mean outside spec)
    const measurementsWithCpk = measurements.map(m => {
      let cpk = null;
      let spec_valid = false;
      if (m.spec_min !== null && m.spec_max !== null && m.std_dev && parseFloat(m.std_dev) > 0) {
        const mean = parseFloat(m.mean);
        const sigma = parseFloat(m.std_dev);
        const lsl = parseFloat(m.spec_min);
        const usl = parseFloat(m.spec_max);
        spec_valid = mean >= lsl && mean <= usl;
        if (spec_valid) {
          const cpu = (usl - mean) / (3 * sigma);
          const cpl = (mean - lsl) / (3 * sigma);
          cpk = Math.round(Math.min(cpu, cpl) * 100) / 100;
        }
      }
      return { ...m, cpk, spec_valid };
    });

    // Overall pass rate
    const [overall] = await sequelize.query(`
      SELECT
        COUNT(te.id)::int                                              AS total_entries,
        SUM(CASE WHEN te.pass_status = true  THEN 1 ELSE 0 END)::int AS pass_count,
        SUM(CASE WHEN te.pass_status = false THEN 1 ELSE 0 END)::int AS fail_count,
        COUNT(DISTINCT te.session_id)::int                            AS total_sessions
      FROM test_entries te
      JOIN test_sessions ts ON ts.id = te.session_id
      WHERE ts.job_id = :jobId
    `, { replacements: { jobId: job.id }, type: QueryTypes.SELECT });

    // Session dates
    const [dateRange] = await sequelize.query(`
      SELECT MIN(test_date) AS start_date, MAX(test_date) AS end_date
      FROM test_sessions
      WHERE job_id = :jobId
    `, { replacements: { jobId: job.id }, type: QueryTypes.SELECT });

    // Operator breakdown
    const operators = await sequelize.query(`
      SELECT
        TRIM(CONCAT(u.first_name, ' ', u.last_name))                  AS operator_name,
        COUNT(DISTINCT ts.id)::int                                     AS session_count,
        SUM(CASE WHEN te.pass_status = true  THEN 1 ELSE 0 END)::int AS pass_count,
        SUM(CASE WHEN te.pass_status = false THEN 1 ELSE 0 END)::int AS fail_count
      FROM test_sessions ts
      LEFT JOIN users u ON u.id = ts.inspector_id
      LEFT JOIN test_entries te ON te.session_id = ts.id
      WHERE ts.job_id = :jobId
      GROUP BY u.first_name, u.last_name
      ORDER BY session_count DESC
    `, { replacements: { jobId: job.id }, type: QueryTypes.SELECT });

    const assessed = overall?.assessed_count || (overall?.pass_count + overall?.fail_count) || 0;
    const passRate = assessed > 0
      ? Math.round((overall.pass_count / assessed) * 1000) / 10
      : null;

    res.json({
      success: true,
      data: {
        job_number: job.job_number,
        job_id: job.id,
        card_type: job.card_type,
        status: job.status,
        date_range: {
          start: dateRange?.start_date,
          end: dateRange?.end_date
        },
        summary: {
          total_sessions: overall?.total_sessions || 0,
          total_entries: overall?.total_entries || 0,
          pass_count: overall?.pass_count || 0,
          fail_count: overall?.fail_count || 0,
          pass_rate: passRate
        },
        measurements: measurementsWithCpk,
        operators
      }
    });
  } catch (err) {
    logger.error('getJobStatistics error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute job statistics' });
  }
};

// ─── Control Chart Data ───────────────────────────────────────────────────────
exports.getJobControlChart = async (req, res) => {
  try {
    const { jobNumber, testDefinitionId } = req.params;
    const job = await Job.findOne({ where: { job_number: jobNumber } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const definition = await TestDefinition.findByPk(testDefinitionId);
    if (!definition) return res.status(404).json({ success: false, message: 'Test definition not found' });

    // All individual measurements in chronological order
    const points = await sequelize.query(`
      SELECT
        ts.id           AS session_id,
        ts.session_number,
        ts.test_date,
        ts.equipment_id,
        TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS operator_name,
        te.measurement_value,
        te.pass_status,
        sc.card_number AS card_identifier
      FROM test_entries te
      JOIN test_sessions ts ON ts.id = te.session_id
      LEFT JOIN users u ON u.id = ts.inspector_id
      LEFT JOIN sample_cards sc ON sc.id = te.sample_card_id
      WHERE ts.job_id = :jobId
        AND te.test_definition_id = :defId
        AND te.measurement_value IS NOT NULL
      ORDER BY ts.test_date ASC, ts.id ASC, te.id ASC
    `, {
      replacements: { jobId: job.id, defId: parseInt(testDefinitionId) },
      type: QueryTypes.SELECT
    });

    // Group by session for the session-level mean line
    const sessionMap = {};
    points.forEach(p => {
      if (!sessionMap[p.session_id]) {
        sessionMap[p.session_id] = {
          session_id: p.session_id,
          session_number: p.session_number,
          test_date: p.test_date,
          equipment_id: p.equipment_id,
          operator_name: p.operator_name,
          measurements: []
        };
      }
      sessionMap[p.session_id].measurements.push({
        value: parseFloat(p.measurement_value),
        pass_status: p.pass_status,
        card_identifier: p.card_identifier
      });
    });

    const sessions = Object.values(sessionMap).map(s => {
      const vals = s.measurements.map(m => m.value);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { ...s, session_mean: Math.round(mean * 10000) / 10000 };
    });

    res.json({
      success: true,
      data: {
        job_number: jobNumber,
        test_definition_id: parseInt(testDefinitionId),
        test_name: definition.test_name,
        unit: definition.unit_of_measurement,
        spec_min: definition.min_acceptable_value,
        spec_max: definition.max_acceptable_value,
        target: definition.target_value,
        points,
        sessions
      }
    });
  } catch (err) {
    logger.error('getJobControlChart error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch control chart data' });
  }
};

// ─── SPC Analysis for a specific test definition within a job ─────────────────
exports.getJobSPC = async (req, res) => {
  try {
    const { jobNumber, testDefinitionId } = req.params;
    const job = await Job.findOne({ where: { job_number: jobNumber } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const definition = await TestDefinition.findByPk(testDefinitionId);
    if (!definition) return res.status(404).json({ success: false, message: 'Test definition not found' });

    // Fetch all measurements in chronological order
    const rows = await sequelize.query(`
      SELECT
        te.id              AS entry_id,
        te.measurement_value,
        te.pass_status,
        ts.id              AS session_id,
        ts.session_number,
        ts.test_date,
        TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS operator_name,
        sc.card_number AS card_identifier
      FROM test_entries te
      JOIN test_sessions ts ON ts.id = te.session_id
      LEFT JOIN users u     ON u.id = ts.inspector_id
      LEFT JOIN sample_cards sc ON sc.id = te.sample_card_id
      WHERE ts.job_id = :jobId
        AND te.test_definition_id = :defId
        AND te.measurement_value IS NOT NULL
      ORDER BY ts.test_date ASC, ts.id ASC, te.id ASC
    `, {
      replacements: { jobId: job.id, defId: parseInt(testDefinitionId) },
      type: QueryTypes.SELECT
    });

    if (rows.length < 2) {
      return res.json({
        success: true,
        data: {
          job_number: jobNumber,
          test_definition_id: parseInt(testDefinitionId),
          test_name: definition.test_name,
          unit: definition.unit_of_measurement,
          spec_min: definition.min_acceptable_value,
          spec_max: definition.max_acceptable_value,
          n: rows.length,
          error: 'Need at least 2 measurements for SPC',
          individuals: rows.map((r, i) => ({
            idx: i + 1,
            value: parseFloat(r.measurement_value),
            session_id: r.session_id,
            session_number: r.session_number,
            date: r.test_date,
            card_identifier: r.card_identifier,
            operator_name: r.operator_name,
            pass_status: r.pass_status,
          })),
        }
      });
    }

    const values = rows.map(r => parseFloat(r.measurement_value));
    const lsl = definition.min_acceptable_value !== null ? parseFloat(definition.min_acceptable_value) : null;
    const usl = definition.max_acceptable_value !== null ? parseFloat(definition.max_acceptable_value) : null;

    const spc = computeSPC(values, lsl, usl);

    // Merge per-row metadata into the annotated individuals array
    const individuals = spc.individuals.map((ind, i) => ({
      ...ind,
      session_id: rows[i].session_id,
      session_number: rows[i].session_number,
      date: rows[i].test_date,
      card_identifier: rows[i].card_identifier,
      operator_name: rows[i].operator_name,
      pass_status: rows[i].pass_status,
    }));

    res.json({
      success: true,
      data: {
        job_number: jobNumber,
        test_definition_id: parseInt(testDefinitionId),
        test_name: definition.test_name,
        unit: definition.unit_of_measurement,
        spec_min: lsl,
        spec_max: usl,
        target: definition.target_value || null,
        ...spc,
        individuals,
      }
    });
  } catch (err) {
    logger.error('getJobSPC error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute SPC analysis' });
  }
};

// ─── Link session to a job (upsert job by session_number) ────────────────────
exports.linkSessionToJob = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { job_number } = req.body;
    if (!job_number) return res.status(400).json({ success: false, message: 'job_number required' });

    const [job] = await Job.findOrCreate({
      where: { job_number },
      defaults: { job_number, status: 'active' }
    });

    await TestSession.update({ job_id: job.id }, { where: { id: sessionId } });
    res.json({ success: true, data: { job_id: job.id, job_number: job.job_number } });
  } catch (err) {
    logger.error('linkSessionToJob error:', err);
    res.status(500).json({ success: false, message: 'Failed to link session to job' });
  }
};
