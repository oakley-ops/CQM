/**
 * Pure readiness math for the NEXUS Assessment Workbook.
 *
 * Percentage semantics mirror the official cqmAP V3.A workbook
 * ("Audit Scope & Compliance" rows 12+): six buckets, tbd included in the
 * denominator, n/a outside the table math entirely.
 *
 * Rank suggestion is OURS (the official workbook leaves Rank to the auditor):
 * severity ladder NCC→D, NC+→C, nc-→B, else A.
 */

const BASE_BUCKETS = ['NCC', 'NC+', 'nc-', 'RI', 'Full', 'tbd'];

function normalizeConformity(value) {
  if (!value) return 'tbd';
  if (String(value).startsWith('Not assessed')) return 'tbd';
  const base = String(value).replace(/ \(Subcontractor\)$/, '');
  if (base === 'n/a') return 'n/a';
  return BASE_BUCKETS.includes(base) ? base : 'tbd';
}

function summarizeConformities(values) {
  const counts = { NCC: 0, 'NC+': 0, 'nc-': 0, RI: 0, Full: 0, tbd: 0, 'n/a': 0 };
  for (const v of values) counts[normalizeConformity(v)] += 1;

  const total = BASE_BUCKETS.reduce((acc, k) => acc + counts[k], 0); // excludes n/a
  const pct = {};
  for (const k of BASE_BUCKETS) {
    pct[k] = total > 0 ? Math.round((counts[k] / total) * 1000) / 10 : null;
  }
  const assessed = total - counts.tbd;
  return { counts, total, assessed, pct, complete: total > 0 && counts.tbd === 0 };
}

function suggestRank(summary) {
  if (!summary || summary.assessed === 0) return null;
  const c = summary.counts;
  if (c.NCC > 0) return 'D';
  if (c['NC+'] > 0) return 'C';
  if (c['nc-'] > 0) return 'B';
  return 'A';
}

module.exports = { normalizeConformity, summarizeConformities, suggestRank, BASE_BUCKETS };
