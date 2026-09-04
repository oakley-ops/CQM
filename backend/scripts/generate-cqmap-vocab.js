#!/usr/bin/env node
/*
 * Generate canonical CQM vocabulary constants from the cqmAP V3.A workbook.
 *
 * Reads the (hidden) `SelectionLists` sheet of the CQM Assessment Plan — the single
 * source of truth for every controlled dropdown in CQM — and emits matching constant
 * files for the backend (CommonJS) and the frontend (TypeScript), so the app's enums
 * can never drift from the bible.
 *
 *   Run:  npm run gen:vocab     (from the repo root)
 *     or: node backend/scripts/generate-cqmap-vocab.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const XLSX_PATH = path.resolve(__dirname, '../../docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx');
const BACKEND_OUT = path.resolve(__dirname, '../seed-data/nexus/cqmap-vocab.generated.js');
const FRONTEND_OUT = path.resolve(__dirname, '../../frontend/src/types/nexus/cqmap-vocab.generated.ts');

// Resolve an exceljs cell to plain text (handles rich-text / formula-result cells).
function cellText(cell) {
  const v = cell && cell.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim();
    if ('result' in v) return v.result == null ? '' : String(v.result).trim();
    if ('text' in v) return String(v.text).trim();
    return '';
  }
  return String(v).trim();
}

// Read a column top-to-bottom from `startRow` until the first blank cell.
function readColumn(ws, col, startRow = 4) {
  const out = [];
  for (let r = startRow; r <= 300; r += 1) {
    const t = cellText(ws.getCell(`${col}${r}`));
    if (t === '') break;
    out.push(t);
  }
  return out;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.getWorksheet('SelectionLists');
  if (!ws) throw new Error('SelectionLists sheet not found in workbook');

  // ISO 3166-1 country code -> name (col A code, col B name)
  const COUNTRIES = [];
  for (let r = 4; r <= 300; r += 1) {
    const code = cellText(ws.getCell(`A${r}`));
    if (code === '') break;
    COUNTRIES.push({ code, name: cellText(ws.getCell(`B${r}`)) });
  }

  // Curated, named lists from the SelectionLists columns (header row 3).
  const lists = {
    COMPONENT_TYPES: readColumn(ws, 'D'),                 // Component Types
    PRODUCT_TYPES: readColumn(ws, 'E'),                   // Product Types ("Used for CQM Product")
    CERT_STATUSES: readColumn(ws, 'F'),                   // Certification Status
    AUDIT_SCOPES: readColumn(ws, 'G'),                    // Initial / Renewal
    AUDIT_TYPES: readColumn(ws, 'H').filter((v) => !v.startsWith('(') && v.toLowerCase() !== 'tbd'),
    AUDITOR_VERDICTS: readColumn(ws, 'J'),                // A/B/C/D/n/a/tbd
    VENDOR_PROCESS_STEP_CONFORMITY: readColumn(ws, 'K'),
    VENDOR_STATUS_PRODUCT: readColumn(ws, 'L'),
    AUDITOR_CONFORMITY: readColumn(ws, 'P'),              // NC+/nc-/RI/Full (+ subcontractor) — no NCC
    AUDITOR_CONFORMITY_NCC: readColumn(ws, 'R'),          // adds NCC — used for product/process steps
    QMS_VENDOR_COMPLIANCE: readColumn(ws, 'U'),           // Yes/Procedure only/Practice only/No/tbd/n/a
  };
  const AUDIT_GRADES = lists.AUDITOR_VERDICTS.filter((v) => ['A', 'B', 'C', 'D'].includes(v));
  const allLists = { ...lists, AUDIT_GRADES };

  const banner = (cmd) => [
    `// AUTO-GENERATED — do not edit by hand.`,
    `// Source: docs/cqmAP-3a-2025-11-30-VENDOR-COUNTRY-SITE.xlsx (SelectionLists sheet)`,
    `// Regenerate: ${cmd}`,
    '',
    '',
  ].join('\n');

  // ── Backend (CommonJS) ──
  const jsBody = Object.entries(allLists)
    .map(([k, arr]) => `const ${k} = ${JSON.stringify(arr, null, 2)};`)
    .join('\n\n');
  const js = banner('npm run gen:vocab')
    + jsBody
    + `\n\nconst COUNTRIES = ${JSON.stringify(COUNTRIES, null, 2)};\n\n`
    + `module.exports = { ${[...Object.keys(allLists), 'COUNTRIES'].join(', ')} };\n`;
  fs.writeFileSync(BACKEND_OUT, js);

  // ── Frontend (TypeScript) ──
  const tsBody = Object.entries(allLists)
    .map(([k, arr]) => `export const ${k} = ${JSON.stringify(arr, null, 2)} as const;`)
    .join('\n\n');
  const ts = banner('npm run gen:vocab')
    + tsBody
    + `\n\nexport const COUNTRIES: ReadonlyArray<{ code: string; name: string }> = ${JSON.stringify(COUNTRIES, null, 2)};\n\n`
    + `export type ComponentType = typeof COMPONENT_TYPES[number];\n`
    + `export type UsedForProduct = typeof PRODUCT_TYPES[number];\n`
    + `export type CertStatus = typeof CERT_STATUSES[number];\n`;
  fs.writeFileSync(FRONTEND_OUT, ts);

  const summary = Object.entries(allLists).map(([k, a]) => `  ${k}: ${a.length}`).join('\n');
  console.log(`✅ cqmAP vocab generated.\n${summary}\n  COUNTRIES: ${COUNTRIES.length}`);
  console.log(`   → ${path.relative(process.cwd(), BACKEND_OUT)}`);
  console.log(`   → ${path.relative(process.cwd(), FRONTEND_OUT)}`);
}

main().catch((e) => { console.error('❌ gen:vocab failed:', e.message); process.exit(1); });
