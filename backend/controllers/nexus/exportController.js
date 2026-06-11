// backend/controllers/nexus/exportController.js
const { buildCqmapWorkbook } = require('../../services/cqmapExportService');
const { NexusAuditRecord } = require('../../models');
const logger = require('../../utils/logger');

// GET /api/nexus/audits/:id/export/cqmap
exports.exportCqmap = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const wb = await buildCqmapWorkbook(req.params.id);
    const safe = (s) => String(s ?? '').replace(/[^A-Za-z0-9-]+/g, '_').slice(0, 40);
    const filename = `CQMAP-V3A-${safe(audit.company)}-${safe(audit.site_name)}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    logger.error('exportCqmap error', err);
    if (res.headersSent) return res.end(); // mid-stream failure: download is already corrupt
    res.status(500).json({ error: 'Failed to export CQMAP workbook' });
  }
};
