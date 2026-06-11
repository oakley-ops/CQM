// backend/controllers/nexus/workbookController.js
const {
  NexusAuditRecord, NexusQmsAssessment, NexusProductScope,
  NexusProcessStepAssessment, NexusCapaItem, NexusQualificationPlan,
  NexusReadinessSnapshot,
  TestDefinition,
} = require('../../models');
const { summarizeConformities, suggestRank } = require('../../utils/nexusReadiness');
const { evaluateGate } = require('../../utils/nexusGate');
const scopeCatalog = require('../../seed-data/nexus/scope-catalog.json');
const logger = require('../../utils/logger');

const CATEGORY_ORDER = ['ic', 'icm', 'il', 'cb', 'icc', 'p', 'iacicm', 'bsm', 'iacil', 'iac'];

// The cqmAP qualification/D&D spine tags get the "Open Qualification Plan" action.
const QUALIFICATION_SPINE = new Set([
  '#0651#', '#0582#', '#0654#', '#0652#', '#0653#', '#0571#', '#0706#',
  '#0552#', '#0553#', '#0581#', '#0501#', '#0502#',
]);

const SITE_PROFILE_FIELDS = [
  'company', 'site_name', 'address_line1', 'city', 'country_code',
  'primary_contact_name', 'primary_contact_email',
];

/**
 * Key-order-independent stringify. Postgres JSONB does not preserve key order,
 * so comparing a stored payload against a freshly built object with plain
 * JSON.stringify would see phantom differences and write a snapshot per read.
 */
function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

function progressOf(rows, conformityOf) {
  const total = rows.length;
  const done = rows.filter(r => {
    const c = conformityOf(r);
    return c && c !== 'tbd' && !String(c).startsWith('Not assessed');
  }).length;
  return { done, total };
}

/** Group steps into the doc's three sub-sections by tag shape. */
function sectionOf(tag) {
  if (QUALIFICATION_SPINE.has(tag)) return 'qualification';
  if (/^#\d{4}#$/.test(tag)) return /^#[2-3]\d{3}#$/.test(tag) ? 'product' : 'qualification';
  return 'process'; // #A10#, #B20#, #L10#, #X00#, #Y10#, ...
}

async function loadWorkbookData(auditId) {
  const audit = await NexusAuditRecord.findByPk(auditId);
  if (!audit) return null;

  const [qmsRows, scopes, capas, testDefs] = await Promise.all([
    NexusQmsAssessment.findAll({ where: { audit_record_id: auditId }, order: [['section', 'ASC']] }),
    NexusProductScope.findAll({ where: { audit_record_id: auditId }, order: [['product_category', 'ASC'], ['id', 'ASC']] }),
    NexusCapaItem.findAll({ where: { audit_record_id: auditId }, order: [['id', 'ASC']] }),
    TestDefinition.findAll({ attributes: ['test_id'] }),
  ]);

  // Primary scope row per in-scope category owns the chapter + steps.
  const primaryByCategory = new Map();
  for (const cat of CATEGORY_ORDER) {
    const catScopes = scopes.filter(s => s.product_category === cat && s.in_scope);
    if (catScopes.length === 0) continue;
    const primaryLabel = (scopeCatalog[cat]?.variants || []).find(v => v.primary)?.label;
    const primary = catScopes.find(s => s.product_variant === primaryLabel) || catScopes[0];
    primaryByCategory.set(cat, primary);
  }

  const stepsByScope = new Map();
  await Promise.all([...primaryByCategory.values()].map(async (scope) => {
    const steps = await NexusProcessStepAssessment.findAll({
      where: { product_scope_id: scope.id }, order: [['id', 'ASC']],
    });
    stepsByScope.set(scope.id, steps);
  }));

  return { audit, qmsRows, scopes, capas, testDefs, primaryByCategory, stepsByScope };
}

// GET /api/nexus/audits/:id/workbook
exports.getWorkbook = async (req, res) => {
  try {
    const data = await loadWorkbookData(req.params.id);
    if (!data) return res.status(404).json({ error: 'Audit not found' });
    const { audit, qmsRows, scopes, capas, testDefs, primaryByCategory, stepsByScope } = data;

    const chapters = [];

    const filledProfile = SITE_PROFILE_FIELDS.filter(f => audit[f]).length;
    chapters.push({
      key: 'site-profile', kind: 'site-profile', title: 'Site Profile',
      progress: { done: filledProfile, total: SITE_PROFILE_FIELDS.length },
    });

    chapters.push({
      key: 'scope', kind: 'scope', title: 'Audit Scope',
      scopes: scopes.map(s => s.toJSON()),
      progress: { done: scopes.filter(s => s.in_scope).length > 0 ? 1 : 0, total: 1 },
    });

    chapters.push({
      key: 'qms', kind: 'qms',
      title: `QMS Requirements (${audit.iso_9001_certified ? 'ISO 9001 certified' : 'non-certified'})`,
      rows: qmsRows.map(r => r.toJSON()),
      progress: progressOf(qmsRows, r => r.conformity),
    });

    for (const cat of CATEGORY_ORDER) {
      const scope = primaryByCategory.get(cat);
      if (!scope) continue;
      const steps = stepsByScope.get(scope.id) || [];
      chapters.push({
        key: `cat-${cat}`, kind: 'category', category: cat, scopeId: scope.id,
        title: `${scopeCatalog[cat]?.label ?? cat.toUpperCase()} — Requirements`,
        rows: steps.map(s => ({ ...s.toJSON(), section: sectionOf(s.process_tag) })),
        progress: progressOf(steps, s => s.conformity),
      });
    }

    // progress: null — readiness is a summary-only chapter; progress shown inline
    chapters.push({ key: 'readiness', kind: 'readiness', title: 'Readiness & Export', progress: null });

    // CAPA badges, keyed by "<source_type>:<source_entity_id>". A source can
    // accumulate several CAPAs over time; the badge shows the latest and how many.
    const capaIndex = {};
    for (const c of capas) {
      if (c.source_type && c.source_entity_id) {
        const key = `${c.source_type}:${c.source_entity_id}`;
        capaIndex[key] = {
          id: c.id, action_id: c.action_id, status: c.status, severity: c.severity,
          count: (capaIndex[key]?.count ?? 0) + 1,
        };
      }
    }

    res.json({
      audit: audit.toJSON(),
      chapters,
      capas: capaIndex,
      testEvidenceTags: testDefs.map(d => d.test_id).filter(Boolean),
      scopeCatalog,
    });
  } catch (err) {
    logger.error('getWorkbook error', err);
    res.status(500).json({ error: 'Failed to build workbook' });
  }
};

// GET /api/nexus/audits/:id/readiness
exports.getReadiness = async (req, res) => {
  try {
    const data = await loadWorkbookData(req.params.id);
    if (!data) return res.status(404).json({ error: 'Audit not found' });
    const { qmsRows, primaryByCategory, stepsByScope } = data;

    const blockers = [];

    const qmsSummary = summarizeConformities(qmsRows.map(r => r.conformity));
    for (const r of qmsRows) {
      if (['NC+', 'NCC'].includes(r.conformity)) {
        blockers.push({ type: 'finding', chapterKey: 'qms', tag: r.requirement_id, title: r.title, detail: r.conformity });
      }
    }

    const categories = [];
    for (const [cat, scope] of primaryByCategory) {
      const steps = stepsByScope.get(scope.id) || [];
      const summary = summarizeConformities(steps.map(s => s.conformity));
      for (const s of steps) {
        const base = String(s.conformity).replace(/ \(Subcontractor\)$/, '');
        if (['NC+', 'NCC'].includes(base)) {
          blockers.push({ type: 'finding', chapterKey: `cat-${cat}`, tag: s.process_tag, title: s.process_name, detail: s.conformity });
        }
      }

      // #0706# gate state from the scope's latest qualification plan
      let gate = { hasPlan: false, passed: false, conditions: [] };
      const plan = await NexusQualificationPlan.findOne({
        where: { product_scope_id: scope.id }, order: [['created_at', 'DESC']],
      });
      if (plan) gate = { hasPlan: true, planId: plan.id, ...(await evaluateGate(plan)) };
      if (!gate.passed) {
        blockers.push({
          type: 'gate', chapterKey: `cat-${cat}`, tag: '#0706#',
          title: 'Qualification gate not passed',
          detail: gate.hasPlan ? 'One or more gate conditions failing' : 'No qualification plan exists',
        });
      }
      if (summary.total > 0 && !summary.complete) {
        blockers.push({
          type: 'unassessed', chapterKey: `cat-${cat}`, tag: null,
          title: `${scopeCatalog[cat]?.label ?? cat}`, detail: `${summary.counts.tbd} requirement(s) unassessed`,
        });
      }

      categories.push({
        category: cat, scopeId: scope.id, label: scopeCatalog[cat]?.label ?? cat,
        currentRank: scope.rank === 't' ? null : scope.rank,
        summary, rankSuggestion: suggestRank(summary), gate,
      });
    }

    if (!qmsSummary.complete && qmsSummary.total > 0) {
      blockers.push({
        type: 'unassessed', chapterKey: 'qms', tag: null,
        title: 'QMS Requirements', detail: `${qmsSummary.counts.tbd} requirement(s) unassessed`,
      });
    }

    const ranks = categories.map(c => c.rankSuggestion).filter(Boolean);
    const worstRank = ['D', 'C', 'B', 'A'].find(r => ranks.includes(r)) ?? null;

    // Trend: expose the previous snapshot, then record this one if it differs.
    const current = {
      qms: { summary: qmsSummary },
      categories: categories.map(c => ({ category: c.category, summary: c.summary, rankSuggestion: c.rankSuggestion })),
      blockerCount: blockers.length,
    };
    const last = await NexusReadinessSnapshot.findOne({
      where: { audit_record_id: req.params.id }, order: [['created_at', 'DESC']],
    });
    const previous = last ? last.payload : null;
    // snapshot=false: internal callers (the PDF export) read readiness without
    // advancing the trend baseline.
    const skipSnapshot = req.query && req.query.snapshot === 'false';
    if (!skipSnapshot && (!last || stableStringify(last.payload) !== stableStringify(current))) {
      await NexusReadinessSnapshot.create({ audit_record_id: req.params.id, payload: current });
    }

    res.json({
      qms: { summary: qmsSummary, rankSuggestion: suggestRank(qmsSummary) },
      categories,
      blockers,
      overall: {
        complete: qmsSummary.complete && categories.every(c => c.summary.complete),
        worstRank,
      },
      previous,
      previousAt: last ? last.created_at : null,
    });
  } catch (err) {
    logger.error('getReadiness error', err);
    res.status(500).json({ error: 'Failed to compute readiness' });
  }
};
