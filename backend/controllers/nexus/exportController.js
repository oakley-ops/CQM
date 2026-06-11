// backend/controllers/nexus/exportController.js
const { buildCqmapWorkbook } = require('../../services/cqmapExportService');
const { NexusAuditRecord } = require('../../models');
const pdfService = require('../../services/pdfService');
const logger = require('../../utils/logger');

const safe = (s) => String(s ?? '').replace(/[^A-Za-z0-9-]+/g, '_').slice(0, 40);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// GET /api/nexus/audits/:id/export/cqmap
exports.exportCqmap = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const wb = await buildCqmapWorkbook(req.params.id);
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

const RANK_COLORS = { A: '#388e3c', B: '#1976d2', C: '#f57c00', D: '#d32f2f' };

function pctRow(label, summary, rankSuggestion) {
  const p = (k) => summary.pct[k] === null ? '—' : `${summary.pct[k]}%`;
  const rank = rankSuggestion
    ? `<span style="background:${RANK_COLORS[rankSuggestion]};color:#fff;padding:2px 10px;border-radius:4px;font-weight:700;">${rankSuggestion}</span>`
    : '—';
  return `<tr>
    <td>${label}</td><td>${p('NCC')}</td><td>${p('NC+')}</td><td>${p('nc-')}</td>
    <td>${p('RI')}</td><td>${p('Full')}</td><td>${p('tbd')}</td>
    <td>${summary.assessed}/${summary.total}</td><td style="text-align:center">${rank}</td>
  </tr>`;
}

// GET /api/nexus/audits/:id/export/readiness
exports.exportReadiness = async (req, res) => {
  try {
    const audit = await NexusAuditRecord.findByPk(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    // Reuse the readiness computation rather than duplicating it. snapshot=false
    // keeps the export from advancing the readiness-trend baseline.
    const workbookCtrl = require('./workbookController');
    let readiness;
    const fakeRes = { json: (b) => { readiness = b; }, status: () => fakeRes };
    const fakeReq = { ...req, params: req.params, query: { ...req.query, snapshot: 'false' } };
    await workbookCtrl.getReadiness(fakeReq, fakeRes);
    // getReadiness reports its own errors through fakeRes.json too — an error
    // body has no .overall, so this also catches captured 404/500 responses.
    if (!readiness || !readiness.overall) {
      return res.status(500).json({ error: 'Failed to compute readiness' });
    }

    const blockerRows = readiness.blockers.map(b =>
      `<tr><td>${b.type}</td><td>${esc(b.tag)}</td><td>${esc(b.title)}</td><td>${esc(b.detail)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#222;margin:32px}
      h1{font-size:20px} h2{font-size:15px;margin-top:24px}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#f5f5f5}
    </style></head><body>
      <h1>CQM Readiness — ${esc(audit.company)} / ${esc(audit.site_name)}</h1>
      <p>Dry-run readiness against cqmAP V3.A · generated ${new Date().toISOString().slice(0, 10)} ·
         Overall: <strong>${readiness.overall.complete ? 'fully assessed' : 'assessment incomplete'}</strong>
         · Worst rank suggestion: <strong>${readiness.overall.worstRank ?? '—'}</strong></p>
      <h2>Conformity percentages (per the official workbook's math)</h2>
      <table><tr><th>Area</th><th>NCC%</th><th>NC+%</th><th>nc-%</th><th>RI%</th><th>Full%</th><th>tbd%</th><th>Assessed</th><th>Rank sugg.</th></tr>
        ${pctRow('QMS', readiness.qms.summary, readiness.qms.rankSuggestion)}
        ${readiness.categories.map(c => pctRow(c.label, c.summary, c.rankSuggestion)).join('')}
      </table>
      <h2>Blockers (${readiness.blockers.length})</h2>
      <table><tr><th>Type</th><th>Tag</th><th>Item</th><th>Detail</th></tr>${blockerRows || '<tr><td colspan="4">None 🎉</td></tr>'}</table>
    </body></html>`;

    const pdfBuffer = await pdfService.generatePDF(html);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CQM-Readiness-${safe(audit.company)}-${safe(audit.site_name)}-${new Date().toISOString().slice(0, 10)}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('exportReadiness error', err);
    res.status(500).json({ error: 'Failed to generate readiness PDF' });
  }
};
