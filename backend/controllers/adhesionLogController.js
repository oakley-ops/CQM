const { Op } = require('sequelize');
const { AdhesionLog } = require('../models');
const logger = require('../utils/logger');

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeMin(strips, tores) {
  // "Tore" strips count as a pass (overlay tore = strong bond), so we skip them
  // when looking for a numeric minimum.
  const values = ['a', 'b', 'c', 'd', 'e']
    .filter(k => !tores[k] && strips[k] != null && strips[k] !== '')
    .map(k => parseFloat(strips[k]));
  return values.length ? Math.min(...values) : null;
}

function computeResult(minLbfCm, threshold) {
  if (minLbfCm == null) return null;
  return minLbfCm >= threshold ? 'PASS' : 'FAIL';
}

// ─── List ─────────────────────────────────────────────────────────────────────

exports.list = async (req, res) => {
  try {
    const {
      job_number, result, from_date, to_date,
      page = 1, limit = 50
    } = req.query;

    const where = {};
    if (job_number) where.job_number = { [Op.iLike]: `%${job_number}%` };
    if (result)     where.result      = result.toUpperCase();
    if (from_date || to_date) {
      where.test_date = {};
      if (from_date) where.test_date[Op.gte] = from_date;
      if (to_date)   where.test_date[Op.lte] = to_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AdhesionLog.findAndCountAll({
      where,
      order: [['test_date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), rows });
  } catch (err) {
    logger.error('adhesionLog.list error', err);
    res.status(500).json({ error: 'Failed to fetch adhesion log entries' });
  }
};

// ─── Get one ──────────────────────────────────────────────────────────────────

exports.getOne = async (req, res) => {
  try {
    const entry = await AdhesionLog.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    logger.error('adhesionLog.getOne error', err);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const body = req.body;

    const strips = { a: body.strip_a, b: body.strip_b, c: body.strip_c, d: body.strip_d, e: body.strip_e };
    const tores  = { a: !!body.strip_a_tore, b: !!body.strip_b_tore, c: !!body.strip_c_tore, d: !!body.strip_d_tore, e: !!body.strip_e_tore };

    const threshold  = parseFloat(body.pass_threshold ?? 1.50);
    const minLbfCm   = computeMin(strips, tores);
    const minLbfIn   = minLbfCm != null ? Math.round(minLbfCm * 2.54 * 1000) / 1000 : null;
    const result     = computeResult(minLbfCm, threshold);

    const entry = await AdhesionLog.create({
      ...body,
      min_lbf_cm:     minLbfCm,
      min_lbf_in:     minLbfIn,
      pass_threshold: threshold,
      result,
      created_by:     req.user?.id ?? null
    });

    res.status(201).json(entry);
  } catch (err) {
    logger.error('adhesionLog.create error', err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

exports.update = async (req, res) => {
  try {
    const entry = await AdhesionLog.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const body   = { ...entry.toJSON(), ...req.body };
    const strips = { a: body.strip_a, b: body.strip_b, c: body.strip_c, d: body.strip_d, e: body.strip_e };
    const tores  = { a: !!body.strip_a_tore, b: !!body.strip_b_tore, c: !!body.strip_c_tore, d: !!body.strip_d_tore, e: !!body.strip_e_tore };

    const threshold = parseFloat(body.pass_threshold ?? 1.50);
    const minLbfCm  = computeMin(strips, tores);
    const minLbfIn  = minLbfCm != null ? Math.round(minLbfCm * 2.54 * 1000) / 1000 : null;
    const result    = computeResult(minLbfCm, threshold);

    await entry.update({ ...req.body, min_lbf_cm: minLbfCm, min_lbf_in: minLbfIn, pass_threshold: threshold, result });
    res.json(entry);
  } catch (err) {
    logger.error('adhesionLog.update error', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

exports.remove = async (req, res) => {
  try {
    const entry = await AdhesionLog.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    await entry.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error('adhesionLog.remove error', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
};

// ─── Get last entry for a job (for auto-fill) ─────────────────────────────────

exports.getLastForJob = async (req, res) => {
  try {
    const entry = await AdhesionLog.findOne({
      where: { job_number: req.params.jobNumber },
      order: [['test_date', 'DESC'], ['id', 'DESC']]
    });
    res.json(entry ?? null);
  } catch (err) {
    logger.error('adhesionLog.getLastForJob error', err);
    res.status(500).json({ error: 'Failed to fetch last entry for job' });
  }
};
