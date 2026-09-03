#!/usr/bin/env node
/**
 * extract-cqmap.js
 *
 * Reads a Mastercard CQMAP V3.A Excel file (.xlsx) and produces a structured
 * Markdown document ready for ingestion into the CQM RAG knowledge base.
 *
 * The output embeds CQM requirement codes (#XXXX#) so ragService's smart
 * chunker splits the document correctly at requirement boundaries.
 *
 * Usage:
 *   node backend/scripts/extract-cqmap.js <path/to/cqmap.xlsx> [output.md]
 *
 * If output path is omitted the .md is written alongside the .xlsx.
 */

'use strict';

const ExcelJS = require('exceljs');
const path    = require('path');
const fs      = require('fs');

// ── Constants ─────────────────────────────────────────────────────────────────

const PRODUCT_SHEETS = ['ic', 'icm', 'il', 'cb', 'icc', 'p', 'iacicm', 'bsm', 'iacil', 'iac'];

const PRODUCT_LABELS = {
  ic:     'IC — Integrated Circuit (Wafer)',
  icm:    'ICM — IC Module',
  il:     'IL — Inlay',
  cb:     'CB — Card Body',
  icc:    'ICC — Integrated Circuit Card',
  p:      'P — Personalization',
  iacicm: 'IAC-ICM — Interactive Authentication Card (ICM-based)',
  bsm:    'BSM — Biometric Sensor Module',
  iacil:  'IAC-IL — Interactive Authentication Card (Inlay-based)',
  iac:    'IAC — Interactive Authentication Card',
};

const QMS_SHEETS = [
  { name: 'QMS - has 9001 Cert',    label: 'QMS Requirements — Vendor with ISO 9001 Certificate' },
  { name: 'QMS - NO 9001 Cert',     label: 'QMS Requirements — Vendor without ISO 9001 Certificate' },
];

const REQ_CODE_RE = /^#[A-Z0-9]+#$/;

// ── Cell helpers ──────────────────────────────────────────────────────────────

function safeStr(val) {
  if (val == null) return '';
  if (typeof val === 'object') {
    // ExcelJS richText, hyperlink, formula result, or Date
    if (val.richText) return val.richText.map(r => r.text || '').join('');
    if (val.text != null) return String(val.text);
    if (val.result != null) return String(val.result);
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return '';
  }
  return String(val);
}

function cellText(row, col) {
  const c = row.getCell(col);
  let raw;
  try { raw = safeStr(c.value); } catch (_) { raw = ''; }
  return raw.trim().replace(/\r?\n/g, ' / ');
}

function cellRaw(row, col) {
  const c = row.getCell(col);
  let raw;
  try { raw = safeStr(c.value); } catch (_) { raw = ''; }
  return raw.trim();
}

function isPlaceholder(val) {
  return !val || val.startsWith('[') || val === 'tbd' || val === '0';
}

// ── Section extractors ────────────────────────────────────────────────────────

function extractCoversheet(wb) {
  const sheet = wb.getWorksheet('Coversheet');
  if (!sheet) return null;

  const g = (r, c) => cellText(sheet.getRow(r), c);

  const company        = g(5,  4);
  const site           = g(6,  4);
  const addrStreet     = g(7,  4);
  const addrCity       = g(8,  4);
  const addrState      = g(9,  4);
  const addrCountry    = g(10, 4);
  const primaryContact = cellRaw(sheet.getRow(11), 4);
  const cid            = g(13, 4);
  const cvcsRef        = g(14, 4);
  const workshops      = g(15, 4);
  const staffTotal     = g(33, 3);
  const staffProd      = g(33, 4);
  const prevType       = g(52, 4);
  const prevRank       = g(53, 4);
  const auditorName    = g(62, 4);
  const auditorCo      = g(63, 4);
  const auditorEmail   = g(64, 4);
  const auditType      = g(68, 4);
  const auditMode      = g(69, 4);
  const auditStart     = g(70, 4);
  const auditEnd       = g(71, 4);

  // Production volumes rows 36-45: col2=type, col3=total, col4=banking
  const volumes = [];
  for (let r = 36; r <= 45; r++) {
    const row   = sheet.getRow(r);
    const type  = cellText(row, 2);
    const total = cellText(row, 3);
    const bank  = cellText(row, 4);
    if (type) volumes.push({ type, total: total || '0', bank: bank || '0' });
  }

  return {
    company, site, addrStreet, addrCity, addrState, addrCountry,
    primaryContact, cid, cvcsRef, workshops,
    staffTotal, staffProd,
    prevType, prevRank,
    auditorName, auditorCo, auditorEmail,
    auditType, auditMode, auditStart, auditEnd,
    volumes,
  };
}

function extractAuditScope(wb) {
  const sheet = wb.getWorksheet('Audit Scope & Compliance');
  if (!sheet) return [];

  const rows = [];
  sheet.eachRow((row, rn) => {
    if (rn < 12) return;
    const cat    = cellText(row, 1);
    const prod   = cellText(row, 2);
    const inc    = cellText(row, 3);
    const aud    = cellText(row, 4);
    const rank   = cellText(row, 5);
    const ncc    = cellText(row, 6);
    const ncplus = cellText(row, 7);
    const ncmin  = cellText(row, 8);
    const ri     = cellText(row, 9);
    const full   = cellText(row, 10);
    if (!prod) return;
    rows.push({ cat, prod, inc, aud, rank, ncc, ncplus, ncmin, ri, full });
  });
  return rows;
}

function extractQmsSheet(wb, sheetName) {
  const sheet = wb.getWorksheet(sheetName);
  if (!sheet) return { company: '', site: '', reqs: [] };

  const company = cellText(sheet.getRow(1), 2);
  const site    = cellText(sheet.getRow(2), 2);
  const reqs    = [];

  sheet.eachRow((row, rn) => {
    if (rn < 7) return;
    const code = cellText(row, 1);
    if (!REQ_CODE_RE.test(code)) return;

    const iso     = cellText(row, 2);
    const title   = cellText(row, 3);
    const isoCov  = cellText(row, 4);
    const status  = cellText(row, 7);
    const docRef  = cellText(row, 8);
    const comment = cellText(row, 9);
    const audConf = cellText(row, 10);
    const audObs  = cellText(row, 13);
    const audAct  = cellText(row, 14);

    reqs.push({ code, iso, title, isoCov, status, docRef, comment, audConf, audObs, audAct });
  });

  return { company, site, reqs };
}

function extractProductSheet(wb, sheetName) {
  const sheet = wb.getWorksheet(sheetName);
  if (!sheet) return { company: '', site: '', product: '', reqs: [] };

  const company = cellText(sheet.getRow(1), 2);
  const site    = cellText(sheet.getRow(2), 2);
  const product = cellText(sheet.getRow(3), 2) || cellText(sheet.getRow(3), 3);
  const reqs    = [];

  sheet.eachRow((row, rn) => {
    if (rn < 7) return;
    const code = cellText(row, 1);
    if (!REQ_CODE_RE.test(code)) return;

    const name      = cellText(row, 3);
    const chgV222   = cellText(row, 8);
    const chgPrev   = cellText(row, 9);
    const status    = cellText(row, 10);  // Vendor self-assessment
    const subcon    = cellText(row, 11);  // Subcontractor site (name, city, country)
    const docRef    = cellText(row, 13);  // Process spec reference
    const audConf   = cellText(row, 15);  // Auditor conformity (if present)
    const audVerify = cellText(row, 16);  // Auditor process step verification

    reqs.push({ code, name, chgV222, chgPrev, status, subcon, docRef, audConf, audVerify });
  });

  return { company, site, product, reqs };
}

function extractComponents(wb) {
  const sheet = wb.getWorksheet('Components');
  if (!sheet) return [];

  const items = [];
  sheet.eachRow((row, rn) => {
    if (rn < 4) return;
    const compId  = cellText(row, 1);
    const type    = cellText(row, 2);
    const article = cellText(row, 3);
    const product = cellText(row, 4);
    const suppCo  = cellText(row, 5);
    const suppCity= cellText(row, 6);
    const country = cellText(row, 7);
    const countryFull = cellText(row, 8);
    const certSt  = cellText(row, 9);
    const cqmLabel= cellText(row, 10);

    // Skip rows with no real data
    if (!type && !article && !suppCo) return;
    items.push({ compId, type, article, product, suppCo, suppCity, country, countryFull, certSt, cqmLabel });
  });
  return items;
}

function extractCAP(wb) {
  const sheet = wb.getWorksheet('CAP');
  if (!sheet) return [];

  const findings = [];
  sheet.eachRow((row, rn) => {
    if (rn <= 12) return; // skip header rows and template row
    const actionId = cellText(row, 1);
    const reqCode  = cellText(row, 2);
    const severity = cellText(row, 3);
    const obs      = cellText(row, 4);
    const sugCA    = cellText(row, 5);
    const deadline = cellText(row, 6);
    const ca       = cellText(row, 7);
    const targetDt = cellText(row, 8);
    const resp     = cellText(row, 9);
    const statusDt = cellText(row, 10);
    const status   = cellText(row, 11);
    const statusDesc = cellText(row, 12);
    const evidence = cellText(row, 13);
    const audDate  = cellText(row, 14);
    const audStatus= cellText(row, 15);
    const comment  = cellText(row, 16);

    // Skip template placeholder rows
    if (!actionId || actionId.startsWith('[')) return;
    findings.push({
      actionId, reqCode, severity, obs, sugCA, deadline,
      ca, targetDt, resp, statusDt, status, statusDesc,
      evidence, audDate, audStatus, comment,
    });
  });
  return findings;
}

// ── Markdown builder ──────────────────────────────────────────────────────────

function buildMarkdown(cover, scopeRows, qmsSections, productSections, components, findings) {
  const lines = [];

  const company = (cover && cover.company) || '[Company]';
  const site    = (cover && cover.site)    || '[Site]';

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`# Mastercard CQMAP V3.A — ${company} / ${site}`);
  lines.push(`**CQM Requirements Version:** 3a – November 2025`);
  lines.push(`**CQMAP Template:** V03-00\n`);

  // ── Site Profile ─────────────────────────────────────────────────────────────
  if (cover) {
    lines.push(`## Site Profile\n`);
    lines.push(`- **Company:** ${company}`);
    lines.push(`- **Site:** ${site}`);

    const addr = [cover.addrStreet, cover.addrCity, cover.addrState, cover.addrCountry]
      .filter(v => v && !isPlaceholder(v)).join(', ');
    if (addr) lines.push(`- **Address:** ${addr}`);

    if (!isPlaceholder(cover.primaryContact))
      lines.push(`- **CQM Primary Contact:** ${cover.primaryContact.replace(/\r?\n/g, ' | ')}`);
    if (!isPlaceholder(cover.cid))      lines.push(`- **Customer ID (CID):** ${cover.cid}`);
    if (!isPlaceholder(cover.cvcsRef))  lines.push(`- **CVCS Reference:** ${cover.cvcsRef}`);
    if (!isPlaceholder(cover.workshops)) lines.push(`- **Workshops / Activities:** ${cover.workshops}`);
    if (!isPlaceholder(cover.staffTotal))
      lines.push(`- **Staff Total:** ${cover.staffTotal} | In Production: ${cover.staffProd}`);
    if (!isPlaceholder(cover.prevType)) lines.push(`- **Previous Audit Type:** ${cover.prevType}`);
    if (!isPlaceholder(cover.prevRank)) lines.push(`- **Previous Audit Rank:** ${cover.prevRank}`);
    lines.push('');

    lines.push(`## Audit\n`);
    const aud = [cover.auditorName, cover.auditorCo, cover.auditorEmail]
      .filter(v => v && !isPlaceholder(v)).join(' | ');
    if (aud) lines.push(`- **Auditor:** ${aud}`);
    const atype = [cover.auditType, cover.auditMode].filter(v => v && !isPlaceholder(v)).join(' | ');
    if (atype) lines.push(`- **Audit Type:** ${atype}`);
    const dates = [cover.auditStart, cover.auditEnd].filter(v => v && !isPlaceholder(v));
    if (dates.length) lines.push(`- **Audit Dates:** ${dates.join(' to ')}`);
    lines.push('');

    const realVols = cover.volumes.filter(v => v.total !== '0' || v.bank !== '0');
    if (realVols.length > 0) {
      lines.push(`## Production Volumes (12 months prior)\n`);
      lines.push(`| Product Type | Total | For Banking |`);
      lines.push(`|---|---|---|`);
      for (const v of realVols) lines.push(`| ${v.type} | ${v.total} | ${v.bank} |`);
      lines.push('');
    }
  }

  // ── Audit Scope ───────────────────────────────────────────────────────────────
  if (scopeRows.length > 0) {
    lines.push(`## Audit Scope & Conformity Levels\n`);
    lines.push(`| Category | Product | In Scope | Audited | Rank | NCC% | NC+% | nc-% | RI% | Full% |`);
    lines.push(`|---|---|---|---|---|---|---|---|---|---|`);
    for (const s of scopeRows) {
      lines.push(
        `| ${s.cat} | ${s.prod} | ${s.inc} | ${s.aud} | ${s.rank} | ` +
        `${s.ncc} | ${s.ncplus} | ${s.ncmin} | ${s.ri} | ${s.full} |`
      );
    }
    lines.push('');
  }

  // ── QMS Requirements ──────────────────────────────────────────────────────────
  for (const { label, data } of qmsSections) {
    if (!data || data.reqs.length === 0) continue;

    lines.push(`---\n\n## ${label}\n`);
    if (data.company && !isPlaceholder(data.company))
      lines.push(`**Company:** ${data.company} | **Site:** ${data.site}\n`);

    for (const req of data.reqs) {
      lines.push(`### ${req.code} ${req.title}`);
      if (req.iso)     lines.push(`- **ISO 9000 Section:** ${req.iso}${req.isoCov ? ` (Coverage: ${req.isoCov})` : ''}`);
      if (req.status && !isPlaceholder(req.status))  lines.push(`- **Vendor Assessment:** ${req.status}`);
      if (req.docRef && !isPlaceholder(req.docRef))  lines.push(`- **Process Doc Reference:** ${req.docRef}`);
      if (req.comment && !isPlaceholder(req.comment)) lines.push(`- **Vendor Comment:** ${req.comment}`);
      if (req.audConf && !isPlaceholder(req.audConf)) lines.push(`- **Auditor Conformity:** ${req.audConf}`);
      if (req.audObs && !isPlaceholder(req.audObs))   lines.push(`- **Auditor Observation:** ${req.audObs}`);
      if (req.audAct && !isPlaceholder(req.audAct))   lines.push(`- **Auditor Recommended Action:** ${req.audAct}`);
      lines.push('');
    }
  }

  // ── Product Process Requirements ──────────────────────────────────────────────
  for (const { sheetName, data } of productSections) {
    if (!data || data.reqs.length === 0) continue;

    const label = PRODUCT_LABELS[sheetName] || sheetName.toUpperCase();
    lines.push(`---\n\n## ${label} Process Requirements\n`);

    if (data.company && !isPlaceholder(data.company)) {
      const productInfo = data.product && !isPlaceholder(data.product) ? ` | **Product:** ${data.product}` : '';
      lines.push(`**Company:** ${data.company} | **Site:** ${data.site}${productInfo}\n`);
    }

    for (const req of data.reqs) {
      lines.push(`### ${req.code} ${req.name}`);
      if (req.chgV222 && !isPlaceholder(req.chgV222))   lines.push(`- **Changed in V2.22:** ${req.chgV222}`);
      if (req.chgPrev && !isPlaceholder(req.chgPrev))   lines.push(`- **Changed in Previous Version:** ${req.chgPrev}`);
      if (req.status && !isPlaceholder(req.status))     lines.push(`- **Vendor Assessment:** ${req.status}`);
      if (req.subcon && !isPlaceholder(req.subcon))     lines.push(`- **Subcontractor Site:** ${req.subcon}`);
      if (req.docRef && !isPlaceholder(req.docRef))     lines.push(`- **Process Spec Reference:** ${req.docRef}`);
      if (req.audConf && !isPlaceholder(req.audConf))   lines.push(`- **Auditor Conformity:** ${req.audConf}`);
      if (req.audVerify && !isPlaceholder(req.audVerify)) lines.push(`- **Auditor Process Verification:** ${req.audVerify}`);
      lines.push('');
    }
  }

  // ── Component Inventory ───────────────────────────────────────────────────────
  if (components.length > 0) {
    lines.push(`---\n\n## CQM Component Inventory\n`);
    lines.push(`**Company:** ${company} | **Site:** ${site}\n`);

    for (const c of components) {
      lines.push(`### Component ${c.compId || '—'}: ${c.type}`);
      if (c.article)     lines.push(`- **Article / Name:** ${c.article}`);
      if (c.product)     lines.push(`- **Used for CQM Product:** ${c.product}`);
      const suppLoc = [c.suppCo, c.suppCity, c.countryFull || c.country].filter(Boolean).join(', ');
      if (suppLoc)       lines.push(`- **Supplier:** ${suppLoc}`);
      if (c.certSt)      lines.push(`- **CQM Certification Status:** ${c.certSt}`);
      if (c.cqmLabel)    lines.push(`- **CQM Label:** ${c.cqmLabel}`);
      lines.push('');
    }
  }

  // ── Corrective Action Plan ────────────────────────────────────────────────────
  if (findings.length > 0) {
    lines.push(`---\n\n## Corrective Action Plan (CAP)\n`);
    lines.push(`**Company:** ${company} | **Site:** ${site}\n`);

    for (const f of findings) {
      const reqTag = REQ_CODE_RE.test(f.reqCode) ? f.reqCode : '';
      lines.push(`### CAP Finding ${f.actionId}${reqTag ? ` — ${reqTag}` : ''}`);
      if (f.reqCode)    lines.push(`- **Requirement:** ${f.reqCode}`);
      if (f.severity)   lines.push(`- **Severity:** ${f.severity}`);
      if (f.obs)        lines.push(`- **Observation:** ${f.obs}`);
      if (f.sugCA)      lines.push(`- **Suggested Corrective Action:** ${f.sugCA}`);
      if (f.deadline)   lines.push(`- **Deadline:** ${f.deadline}`);
      if (f.ca)         lines.push(`- **Corrective Action Planned:** ${f.ca}`);
      if (f.targetDt)   lines.push(`- **Target Date:** ${f.targetDt}`);
      if (f.resp)       lines.push(`- **Responsibility:** ${f.resp}`);
      if (f.status)     lines.push(`- **Status:** ${f.status}${f.statusDt ? ` (${f.statusDt})` : ''}`);
      if (f.statusDesc) lines.push(`- **Status Description:** ${f.statusDesc}`);
      if (f.evidence)   lines.push(`- **Evidence:** ${f.evidence}`);
      if (f.audStatus)  lines.push(`- **Auditor Review Status:** ${f.audStatus}${f.audDate ? ` (${f.audDate})` : ''}`);
      if (f.comment)    lines.push(`- **Comment:** ${f.comment}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function printStats(md, cover, qmsSections, productSections, components, findings) {
  const reqCodes = (md.match(/#[A-Z0-9]+#/g) || []);
  const uniqueCodes = new Set(reqCodes).size;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  CQMAP Extraction Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (cover) {
    console.log(`  Vendor   : ${cover.company}`);
    console.log(`  Site     : ${cover.site}`);
    console.log(`  Audit    : ${cover.auditType} | ${cover.auditMode}`);
  }
  console.log(`  Output   : ${(md.length / 1024).toFixed(1)} KB`);
  console.log('  ── Requirement codes ─────────────────────');
  console.log(`  Total occurrences : ${reqCodes.length}`);
  console.log(`  Unique codes      : ${uniqueCodes}`);
  console.log('  ── Sheet coverage ────────────────────────');
  for (const { sheetName, data } of productSections) {
    if (data) console.log(`  ${sheetName.padEnd(8)} : ${data.reqs.length} requirements`);
  }
  for (const { label, data } of qmsSections) {
    if (data) console.log(`  QMS      : ${data.reqs.length} requirements (${label.slice(0, 30)}…)`);
  }
  console.log(`  Components : ${components.length}`);
  console.log(`  CAP findings : ${findings.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [,, xlsxArg, outArg] = process.argv;

  if (!xlsxArg) {
    console.error('Usage: node backend/scripts/extract-cqmap.js <path/to/cqmap.xlsx> [output.md]');
    console.error('');
    console.error('Example:');
    console.error('  node backend/scripts/extract-cqmap.js docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx');
    process.exit(1);
  }

  const xlsxPath = path.resolve(xlsxArg);
  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    process.exit(1);
  }

  const outPath = outArg
    ? path.resolve(outArg)
    : xlsxPath.replace(/\.xlsx$/i, '.md');

  console.log(`Reading: ${xlsxPath}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  console.log(`Worksheets found: ${wb.worksheets.map(s => s.name).join(', ')}`);

  console.log('Extracting sections…');
  const cover      = extractCoversheet(wb);
  const scopeRows  = extractAuditScope(wb);
  const components = extractComponents(wb);
  const findings   = extractCAP(wb);

  const qmsSections = QMS_SHEETS.map(({ name, label }) => ({
    label,
    data: extractQmsSheet(wb, name),
  }));

  const productSections = PRODUCT_SHEETS.map(sheetName => ({
    sheetName,
    data: extractProductSheet(wb, sheetName),
  }));

  console.log('Building Markdown…');
  const md = buildMarkdown(cover, scopeRows, qmsSections, productSections, components, findings);

  fs.writeFileSync(outPath, md, 'utf8');

  printStats(md, cover, qmsSections, productSections, components, findings);
  console.log(`Written: ${outPath}`);
}

// ── Module API (used by ragController for XLSX upload pipeline) ───────────────

/**
 * Extract a CQMAP V3.A Excel file and return the Markdown text + metadata.
 * @param {string} xlsxPath  Absolute path to the .xlsx file.
 * @returns {Promise<{ markdown: string, vendor: string, site: string, auditType: string, auditMode: string, chunkCount: number }>}
 */
async function extractCQMAPToText(xlsxPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);

  const cover          = extractCoversheet(wb);
  const scopeRows      = extractAuditScope(wb);
  const components     = extractComponents(wb);
  const findings       = extractCAP(wb);
  const qmsSections    = QMS_SHEETS.map(({ name, label }) => ({ label, data: extractQmsSheet(wb, name) }));
  const productSections = PRODUCT_SHEETS.map(sheetName => ({ sheetName, data: extractProductSheet(wb, sheetName) }));

  const markdown = buildMarkdown(cover, scopeRows, qmsSections, productSections, components, findings);

  const reqCodes = (markdown.match(/#(?:[A-Z]{1,2}[0-9]{2,4}|[0-9]{4})#/g) || []);

  return {
    markdown,
    vendor:    cover ? cover.company    : '[Company]',
    site:      cover ? cover.site       : '[Site]',
    auditType: cover ? cover.auditType  : '',
    auditMode: cover ? cover.auditMode  : '',
    auditDate: cover ? cover.auditStart : '',
    reqCodeCount: reqCodes.length,
    uniqueCodeCount: new Set(reqCodes).size,
  };
}

module.exports = { extractCQMAPToText };

// ── CLI entry (only runs when invoked directly) ───────────────────────────────

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
