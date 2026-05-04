const fs = require('fs');
const path = require('path');
const { AutodataRun } = require('../models');
const { startRun }    = require('../services/autodata/orchestratorService');
const logger = require('../utils/logger');

// POST /api/autodata/runs
exports.createRun = async (req, res) => {
  try {
    const { run_name, dateFrom, dateTo, cardTypes, categoryIds, format } = req.body;

    const run = await AutodataRun.create({
      run_name: run_name || `Run ${new Date().toISOString().split('T')[0]}`,
      status: 'queued',
      config: { dateFrom, dateTo, cardTypes, categoryIds, format: format || 'jsonl' },
      dataset_format: format || 'jsonl',
      created_by: req.user?.id,
    });

    // Fire and forget — pipeline updates the run record asynchronously
    startRun(run.id);

    res.status(202).json(run);
  } catch (err) {
    logger.error('createRun error', err);
    res.status(500).json({ error: 'Failed to start autodata run' });
  }
};

// GET /api/autodata/runs
exports.listRuns = async (req, res) => {
  try {
    const runs = await AutodataRun.findAll({
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json(runs);
  } catch (err) {
    logger.error('listRuns error', err);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
};

// GET /api/autodata/runs/:id
exports.getRun = async (req, res) => {
  try {
    const run = await AutodataRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    logger.error('getRun error', err);
    res.status(500).json({ error: 'Failed to fetch run' });
  }
};

// GET /api/autodata/runs/:id/download
exports.downloadDataset = async (req, res) => {
  try {
    const run = await AutodataRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    if (run.status !== 'completed' || !run.dataset_path) {
      return res.status(409).json({ error: 'Dataset not ready' });
    }
    if (!fs.existsSync(run.dataset_path)) {
      return res.status(404).json({ error: 'Dataset file not found on disk' });
    }

    const ext = run.dataset_format === 'csv' ? 'csv' : 'jsonl';
    res.setHeader('Content-Type', ext === 'csv' ? 'text/csv' : 'application/x-ndjson');
    res.setHeader('Content-Disposition', `attachment; filename="autodata-run-${run.id}.${ext}"`);
    fs.createReadStream(run.dataset_path).pipe(res);
  } catch (err) {
    logger.error('downloadDataset error', err);
    res.status(500).json({ error: 'Failed to download dataset' });
  }
};

// DELETE /api/autodata/runs/:id
exports.deleteRun = async (req, res) => {
  try {
    const run = await AutodataRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    if (run.dataset_path) {
      const dir = path.dirname(run.dataset_path);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }

    await run.destroy();
    res.status(204).send();
  } catch (err) {
    logger.error('deleteRun error', err);
    res.status(500).json({ error: 'Failed to delete run' });
  }
};
