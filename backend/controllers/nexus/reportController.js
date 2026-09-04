const {
  NexusAuditRecord,
  NexusQmsAssessment,
  NexusProductScope,
  NexusProcessStepAssessment,
  NexusCapaItem,
  NexusDocumentRef,
  NexusAuditComponent,
} = require('../../models');
const pdfService = require('../../services/pdfService');
const logger = require('../../utils/logger');

const CONFORMITY_COLORS = {
  'NC+': '#d32f2f',
  'nc-': '#f57c00',
  'RI':  '#1976d2',
  'Full': '#388e3c',
  'NCC': '#7b1fa2',
  'tbd': '#9e9e9e',
  'n/a': '#bdbdbd',
};

const CERT_STATUS_COLORS = {
  'Supplier (CQM certified)': '#388e3c',
  'Supplier (CQM certification pending)': '#f57c00',
  'Supplier (not CQM certified)': '#d32f2f',
  'Subcontractor (CQM certified themselves)': '#1976d2',
  'Subcontractor (not CQM certified themselves)': '#d32f2f',
  'Other (Describe in Comments)': '#9e9e9e',
};

function badge(text, color) {
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${text ?? 'tbd'}</span>`;
}

function gradeBadge(grade) {
  const colors = { A: '#388e3c', B: '#1976d2', C: '#f57c00', D: '#d32f2f' };
  const color = colors[grade] || '#9e9e9e';
  return `<span style="background:${color};color:#fff;padding:4px 14px;border-radius:6px;font-size:18px;font-weight:700;">${grade ?? 'N/A'}</span>`;
}

function buildReportHtml({ audit, qmsRows, scopes, capas, docs, components }) {
  const today = new Date().toISOString().split('T')[0];

  const scored = qmsRows.filter(q => !['tbd', 'n/a'].includes(q.conformity));
  const passing = scored.filter(q => ['Full', 'RI'].includes(q.conformity));
  const qmsScore = scored.length ? Math.round(passing.length / scored.length * 100) : 0;
  const ncPlus  = qmsRows.filter(q => q.conformity === 'NC+').length;
  const ncMinus = qmsRows.filter(q => q.conformity === 'nc-').length;
  const ri      = qmsRows.filter(q => q.conformity === 'RI').length;
  const full    = qmsRows.filter(q => q.conformity === 'Full').length;

  const openCapas    = capas.filter(c => !['Complete', 'Cancelled', 'Finding Rejected'].includes(c.status));
  const overdueCapas = openCapas.filter(c => c.deadline && c.deadline < today);

  const qmsRows_html = qmsRows.slice(0, 60).map(r => `
    <tr>
      <td style="font-family:monospace;font-size:11px;">${r.requirement_id ?? ''}</td>
      <td style="font-size:12px;">${r.requirement_text ?? ''}</td>
      <td style="text-align:center;">${badge(r.conformity, CONFORMITY_COLORS[r.conformity] ?? '#9e9e9e')}</td>
      <td style="font-size:11px;">${r.auditor_comment ?? ''}</td>
    </tr>`).join('');

  const scopeRows_html = scopes.map(s => {
    const steps = s.processSteps || [];
    const ncSteps = steps.filter(st => ['NC+', 'nc-'].includes(st.conformity)).length;
    return `
    <tr>
      <td>${s.product_category ?? ''}</td>
      <td style="text-align:center;">${s.in_scope ? '✓' : '—'}</td>
      <td style="text-align:center;">${s.rank ?? '—'}</td>
      <td style="text-align:center;">${badge(s.cert_outcome, s.cert_outcome === 'Certified' ? '#388e3c' : '#f57c00')}</td>
      <td style="text-align:center;">${ncSteps}</td>
    </tr>`;
  }).join('');

  const capaRows_html = capas.map(c => {
    const overdue = c.deadline && c.deadline < today && !['Complete', 'Cancelled', 'Finding Rejected'].includes(c.status);
    return `
    <tr style="${overdue ? 'background:#fff8f8;' : ''}">
      <td style="font-family:monospace;font-size:11px;">${c.action_id ?? ''}</td>
      <td style="font-size:11px;">${c.requirement_id ?? ''}</td>
      <td style="text-align:center;">${badge(c.severity, c.severity === 'NC+' ? '#d32f2f' : c.severity === 'nc-' ? '#f57c00' : '#9e9e9e')}</td>
      <td style="font-size:12px;">${c.description ?? ''}</td>
      <td style="text-align:center;">${badge(c.status, ['Complete'].includes(c.status) ? '#388e3c' : '#f57c00')}</td>
      <td style="text-align:center;font-size:11px;">${c.deadline ?? '—'}${overdue ? ' ⚠' : ''}</td>
    </tr>`;
  }).join('');

  const docRows_html = docs.map(d => `
    <tr>
      <td style="font-family:monospace;font-size:11px;">${d.doc_id ?? ''}</td>
      <td>${d.title ?? ''}</td>
      <td style="font-size:11px;">${d.requirement_id ?? ''}</td>
      <td style="font-size:11px;">${d.doc_type ?? ''}</td>
    </tr>`).join('');

  const compRows_html = components.map(c => `
    <tr>
      <td>${c.supplier_name ?? ''}</td>
      <td>${c.component_type ?? ''}</td>
      <td>${c.article_number ?? ''}</td>
      <td>${c.used_for_product ?? ''}</td>
      <td style="text-align:center;">${badge(c.cert_status, CERT_STATUS_COLORS[c.cert_status] ?? '#9e9e9e')}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #212121; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin: 28px 0 10px; border-bottom: 2px solid #1976d2; padding-bottom: 4px; color: #1976d2; }
  .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0 24px; }
  .cover-item label { font-size: 11px; color: #666; display: block; }
  .cover-item span { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #1976d2; color: #fff; padding: 6px 8px; font-size: 11px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
  .stat-box { border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; text-align: center; }
  .stat-box .num { font-size: 28px; font-weight: 700; }
  .stat-box .lbl { font-size: 11px; color: #666; }
  .page-break { page-break-before: always; }
  footer { margin-top: 32px; font-size: 10px; color: #9e9e9e; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 8px; }
</style>
</head>
<body>

<!-- COVER -->
<h1>NEXUS Audit Report</h1>
<p style="color:#666;font-size:12px;">Generated: ${today} | CQMAP V3.A</p>
<div style="margin:16px 0;">${gradeBadge(audit?.grade)}</div>
<div class="cover-grid">
  <div class="cover-item"><label>Site Name</label><span>${audit?.site_name ?? '—'}</span></div>
  <div class="cover-item"><label>Company</label><span>${audit?.company ?? '—'}</span></div>
  <div class="cover-item"><label>Audit Start</label><span>${audit?.audit_date_start ?? '—'}</span></div>
  <div class="cover-item"><label>Audit End</label><span>${audit?.audit_date_end ?? '—'}</span></div>
  <div class="cover-item"><label>Auditor</label><span>${audit?.auditor_name ??'—'}</span></div>
  <div class="cover-item"><label>Next Audit</label><span>${audit?.next_audit_date ?? '—'}</span></div>
  <div class="cover-item"><label>ISO 9001 Certified</label><span>${audit?.iso_9001_certified ? 'Yes' : 'No'}</span></div>
  <div class="cover-item"><label>Status</label><span>${audit?.status ?? '—'}</span></div>
</div>

<!-- QMS SUMMARY -->
<h2>QMS Self-Assessment Summary</h2>
<div class="stat-grid">
  <div class="stat-box"><div class="num" style="color:#388e3c;">${qmsScore}%</div><div class="lbl">Conformity Score</div></div>
  <div class="stat-box"><div class="num" style="color:#d32f2f;">${ncPlus}</div><div class="lbl">NC+ (Critical)</div></div>
  <div class="stat-box"><div class="num" style="color:#f57c00;">${ncMinus}</div><div class="lbl">nc- (Minor)</div></div>
  <div class="stat-box"><div class="num" style="color:#1976d2;">${ri}</div><div class="lbl">RI (Improve)</div></div>
</div>
<table>
  <thead><tr><th>Req ID</th><th>Requirement</th><th>Conformity</th><th>Auditor Comment</th></tr></thead>
  <tbody>${qmsRows_html || '<tr><td colspan="4" style="text-align:center;color:#9e9e9e;">No requirements assessed</td></tr>'}</tbody>
</table>

<!-- PRODUCT SCOPE -->
<h2 class="page-break">Product Scope</h2>
<table>
  <thead><tr><th>Product Category</th><th>In Scope</th><th>Rank</th><th>Cert Outcome</th><th>NC Steps</th></tr></thead>
  <tbody>${scopeRows_html || '<tr><td colspan="5" style="text-align:center;color:#9e9e9e;">No product scope defined</td></tr>'}</tbody>
</table>

<!-- CAPA -->
<h2>CAPA Register</h2>
<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
  <div class="stat-box"><div class="num">${capas.length}</div><div class="lbl">Total CAPAs</div></div>
  <div class="stat-box"><div class="num" style="color:#f57c00;">${openCapas.length}</div><div class="lbl">Open</div></div>
  <div class="stat-box"><div class="num" style="color:#d32f2f;">${overdueCapas.length}</div><div class="lbl">Overdue</div></div>
</div>
<table>
  <thead><tr><th>Action ID</th><th>Req ID</th><th>Severity</th><th>Description</th><th>Status</th><th>Deadline</th></tr></thead>
  <tbody>${capaRows_html || '<tr><td colspan="6" style="text-align:center;color:#9e9e9e;">No CAPAs recorded</td></tr>'}</tbody>
</table>

<!-- DOCUMENTS -->
<h2 class="page-break">Document Register</h2>
<table>
  <thead><tr><th>Doc ID</th><th>Title</th><th>Requirement</th><th>Type</th></tr></thead>
  <tbody>${docRows_html || '<tr><td colspan="4" style="text-align:center;color:#9e9e9e;">No documents registered</td></tr>'}</tbody>
</table>

<!-- COMPONENTS -->
<h2>Components Registry</h2>
<table>
  <thead><tr><th>Supplier</th><th>Component Type</th><th>Article Number</th><th>Used For</th><th>Cert Status</th></tr></thead>
  <tbody>${compRows_html || '<tr><td colspan="5" style="text-align:center;color:#9e9e9e;">No components registered</td></tr>'}</tbody>
</table>

<footer>NEXUS Qualification Hub — CQMAP V3.A Audit Report — ${audit?.site_name ?? ''} — ${today}</footer>
</body>
</html>`;
}

// GET /api/nexus/audits/:id/report
exports.generateReport = async (req, res) => {
  try {
    const auditId = Number(req.params.id);

    const [audit, qmsRows, scopes, capas, docs, components] = await Promise.all([
      NexusAuditRecord.findByPk(auditId),
      NexusQmsAssessment.findAll({ where: { audit_record_id: auditId } }),
      NexusProductScope.findAll({
        where: { audit_record_id: auditId },
        include: [{ model: NexusProcessStepAssessment, as: 'processSteps' }],
      }),
      NexusCapaItem.findAll({ where: { audit_record_id: auditId }, order: [['created_at', 'ASC']] }),
      NexusDocumentRef.findAll({ where: { audit_record_id: auditId } }),
      NexusAuditComponent.findAll({ where: { audit_record_id: auditId } }),
    ]);

    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const html = buildReportHtml({ audit, qmsRows, scopes, capas, docs, components });
    const pdfBuffer = await pdfService.generatePDF(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="NEXUS-Audit-${auditId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('generateReport error', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};
