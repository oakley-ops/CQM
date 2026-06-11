// backend/services/cqmapExportService.js
/**
 * Fills the official CQMAP V3.A template with the audit's data.
 * Row matching is always by tag/label column, never by hardcoded row numbers
 * (see plan "Verified facts" §3 for the cell map).
 *
 * KNOWN RISK: exceljs round-trips of complex workbooks can drop some styling
 * or conditional formatting. The template has no macros (.xlsx). If a filled
 * export turns out broken when opened in Excel, the fallback is to generate a
 * from-scratch workbook with the same sheet names/columns — keep that decision
 * in this service so callers don't change.
 *
 * Verified column mappings (from template inspection):
 *   Coversheet:              D5=company, D6=site, D7=address, D8=city, D9=province, D10=country
 *                            D11=primary contact, D12=audit contact, D13=customer_id, D14=cvcs_reference
 *                            C33=staff_total, D33=staff_in_production
 *                            rows 36-45: B=category code, C=total, D=banking
 *   Audit Scope & Compliance: col B=product label, col C=in_scope Yes/No, col D=audited Yes/No, col E=rank
 *   QMS sheets:              col A=requirement_id tag (#NNNN#), col G=vendor_compliance (enum),
 *                            col H=vendor_evidence_ref (free text reference), col I=auditor_comment,
 *                            col J=conformity (NC+/nc-/RI/Full)
 *   Category sheets:         col A=process_tag (#XXX#), col J=vendor_compliance (enum),
 *                            col K=vendor_site, col M=vendor_process_spec_ref, col P=vendor_control_plan_ref,
 *                            col S=production_equipment, col T=test_equipment,
 *                            col V=conformity, col X=auditor_notes
 */
const ExcelJS = require('exceljs');
const path = require('path');
const {
  NexusAuditRecord, NexusQmsAssessment, NexusProductScope, NexusProcessStepAssessment,
} = require('../models');
const { normalizeConformity } = require('../utils/nexusReadiness');
const scopeCatalog = require('../seed-data/nexus/scope-catalog.json');

const TEMPLATE = path.join(__dirname, '../templates/cqmAP-3a-template.xlsx');
const CATEGORIES = ['ic', 'icm', 'il', 'cb', 'icc', 'p', 'iacicm', 'bsm', 'iacil', 'iac'];

function contactCell(name, email, phone) {
  return `Name: ${name ?? ''}\nE-mail: ${email ?? ''}\nPhone: ${phone ?? ''}`;
}

function fillCoversheet(ws, audit) {
  ws.getCell('D5').value = audit.company;
  ws.getCell('D6').value = audit.site_name;
  ws.getCell('D7').value = audit.address_line1 ?? audit.address ?? null;
  ws.getCell('D8').value = audit.city ?? null;
  ws.getCell('D9').value = audit.state_province ?? null;
  ws.getCell('D10').value = audit.country_code ?? audit.country ?? null;
  ws.getCell('D11').value = contactCell(audit.primary_contact_name, audit.primary_contact_email, audit.primary_contact_phone);
  ws.getCell('D12').value = contactCell(audit.audit_contact_name, audit.audit_contact_email, audit.audit_contact_phone);
  ws.getCell('D13').value = audit.customer_id ?? null;
  ws.getCell('D14').value = audit.cvcs_reference ?? null;
  ws.getCell('C33').value = audit.staff_total ?? null;
  ws.getCell('D33').value = audit.staff_in_production ?? null;

  // Production volumes: rows 36-45 list category codes in column B.
  const volumes = audit.production_volumes || {};
  for (let r = 36; r <= 45; r++) {
    const cat = String(ws.getCell(`B${r}`).value ?? '').trim();
    if (volumes[cat]) {
      ws.getCell(`C${r}`).value = volumes[cat].total ?? null;
      ws.getCell(`D${r}`).value = volumes[cat].banking ?? null;
    }
  }
}

function fillScopeSheet(ws, audit, scopes) {
  const byLabel = new Map(scopes.map(s => [s.product_variant, s]));
  // QMS rows in the scope table are driven by the ISO flag, not scope rows.
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 12) return;
    const label = row.getCell('B').value;
    if (typeof label !== 'string') return;
    if (label === 'QMS - Vendor has 9001 Certificate') {
      row.getCell('C').value = audit.iso_9001_certified ? 'Yes' : 'No';
      return;
    }
    if (label === 'QMS - Vendor has NO ISO 9001 Certificate') {
      row.getCell('C').value = audit.iso_9001_certified ? 'No' : 'Yes';
      return;
    }
    const scope = byLabel.get(label.trim());
    if (!scope) return;
    row.getCell('C').value = scope.in_scope ? 'Yes' : 'No';
    row.getCell('D').value = scope.audited ? 'Yes' : 'No';
    // rank 't' means tbd — do not write into the xlsx Rank column
    if (scope.rank && scope.rank !== 't') row.getCell('E').value = scope.rank;
  });
}

function fillQmsSheet(ws, qmsRows) {
  const byTag = new Map(qmsRows.map(r => [r.requirement_id, r]));
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 7) return;
    const tag = row.getCell('A').value;
    const rec = typeof tag === 'string' ? byTag.get(tag.trim()) : null;
    if (!rec) return;
    // G = vendor compliance enum (Yes/Procedure only/etc.)
    if (rec.vendor_compliance && rec.vendor_compliance !== 'tbd') {
      row.getCell('G').value = rec.vendor_compliance;
    }
    // H = vendor evidence reference (free text)
    if (rec.vendor_evidence_ref) row.getCell('H').value = rec.vendor_evidence_ref;
    // I = vendor comment — no model field for it yet, leave the template cell untouched.
    // J = auditor conformity
    row.getCell('J').value = normalizeConformity(rec.conformity);
    // K = auditor comment / reference to audit report section
    if (rec.auditor_comment) row.getCell('K').value = rec.auditor_comment;
  });
}

function fillCategorySheet(ws, steps) {
  const byTag = new Map(steps.map(s => [s.process_tag, s]));
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 7) return;
    const tag = row.getCell('A').value;
    const step = typeof tag === 'string' ? byTag.get(tag.trim()) : null;
    if (!step) return;
    if (step.vendor_compliance) row.getCell('J').value = step.vendor_compliance;
    if (step.vendor_site) row.getCell('K').value = step.vendor_site;
    if (step.vendor_process_spec_ref) row.getCell('M').value = step.vendor_process_spec_ref;
    if (step.vendor_control_plan_ref) row.getCell('P').value = step.vendor_control_plan_ref;
    if (step.production_equipment) row.getCell('S').value = step.production_equipment;
    if (step.test_equipment) row.getCell('T').value = step.test_equipment;
    row.getCell('V').value = step.conformity;
    if (step.auditor_notes) row.getCell('X').value = step.auditor_notes;
  });
}

async function buildCqmapWorkbook(auditId) {
  const audit = await NexusAuditRecord.findByPk(auditId);
  if (!audit) throw Object.assign(new Error('Audit not found'), { status: 404 });

  const [qmsRows, scopes] = await Promise.all([
    NexusQmsAssessment.findAll({ where: { audit_record_id: auditId } }),
    NexusProductScope.findAll({ where: { audit_record_id: auditId } }),
  ]);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE);

  fillCoversheet(wb.getWorksheet('Coversheet'), audit);
  fillScopeSheet(wb.getWorksheet('Audit Scope & Compliance'), audit, scopes);
  fillQmsSheet(
    wb.getWorksheet(audit.iso_9001_certified ? 'QMS - has 9001 Cert' : 'QMS - NO 9001 Cert'),
    qmsRows,
  );

  for (const cat of CATEGORIES) {
    const catScopes = scopes.filter(s => s.product_category === cat && s.in_scope);
    if (catScopes.length === 0) continue;
    const primaryLabel = (scopeCatalog[cat]?.variants || []).find(v => v.primary)?.label;
    const primary = catScopes.find(s => s.product_variant === primaryLabel) || catScopes[0];
    const steps = await NexusProcessStepAssessment.findAll({ where: { product_scope_id: primary.id } });
    if (steps.length > 0) fillCategorySheet(wb.getWorksheet(cat), steps);
  }

  return wb;
}

module.exports = { buildCqmapWorkbook };
