const Anthropic = require('@anthropic-ai/sdk');
const { Op } = require('sequelize');
const {
  NexusAuditRecord,
  NexusQmsAssessment,
  NexusCapaItem,
  TestSession,
  TestEntry,
  TestDefinition,
} = require('../../models');
const { computeSPC } = require('../../utils/spcEngine');
const logger = require('../../utils/logger');

const client = new Anthropic();

// POST /api/nexus/ai/readiness/:auditId
exports.getReadinessScore = async (req, res) => {
  try {
    const auditId = Number(req.params.auditId);
    const today = new Date().toISOString().split('T')[0];

    const [audit, qmsRows, capas] = await Promise.all([
      NexusAuditRecord.findByPk(auditId),
      NexusQmsAssessment.findAll({ where: { audit_record_id: auditId }, attributes: ['conformity', 'requirement_id'] }),
      NexusCapaItem.findAll({ where: { audit_record_id: auditId } }),
    ]);

    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const scored      = qmsRows.filter(q => !['tbd', 'n/a'].includes(q.conformity));
    const qmsScore    = scored.length
      ? Math.round(scored.filter(q => ['Full', 'RI'].includes(q.conformity)).length / scored.length * 100)
      : null;
    const ncCount     = qmsRows.filter(q => q.conformity === 'NC+').length;
    const ncMinusCount = qmsRows.filter(q => q.conformity === 'nc-').length;
    const openCapas   = capas.filter(c => !['Complete', 'Cancelled', 'Finding Rejected'].includes(c.status));
    const overdueCapas = openCapas.filter(c => c.deadline && c.deadline < today);

    const prompt = `You are a Mastercard CQMAP V3.A audit readiness advisor.

Site: ${audit.site_name} (${audit.company ?? 'unknown company'})
QMS conformity score: ${qmsScore != null ? qmsScore + '%' : 'not yet assessed'}
NC+ findings: ${ncCount}  nc- findings: ${ncMinusCount}
Open CAPAs: ${openCapas.length} (${overdueCapas.length} overdue)
Next audit date: ${audit.next_audit_date ?? 'not set'}
Current date: ${today}

Rate audit readiness 0–100 and list 3–5 specific actionable items.
Respond ONLY as JSON (no markdown): { "score": number, "rating": "High/Medium/Low/Critical Risk", "actions": ["..."] }`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].text.trim();
    const jsonText = text.startsWith('{') ? text : text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    res.json(JSON.parse(jsonText));
  } catch (err) {
    logger.error('getReadinessScore error', err);
    res.status(500).json({ error: 'Failed to generate readiness score' });
  }
};

// POST /api/nexus/ai/spc/:cardType
exports.getSpcAnalysis = async (req, res) => {
  try {
    const { cardType } = req.params;

    const sessions = await TestSession.findAll({
      where: { card_type: cardType, status: 'approved' },
      order: [['test_date', 'DESC']],
      limit: 30,
      attributes: ['id'],
    });

    if (sessions.length === 0) {
      return res.json({ cardType, findings: [], summary: 'No approved sessions found for this card type.' });
    }

    const sessionIds = sessions.map(s => s.id);
    const entries = await TestEntry.findAll({
      where: {
        session_id: { [Op.in]: sessionIds },
        measurement_value: { [Op.not]: null },
      },
      include: [{
        model: TestDefinition,
        as: 'definition',
        attributes: ['test_name', 'lsl', 'usl', 'unit_of_measure'],
      }],
    });

    const groups = {};
    entries.forEach(e => {
      const key = e.test_definition_id;
      if (!key) return;
      if (!groups[key]) {
        groups[key] = {
          name: e.definition?.test_name,
          lsl: e.definition?.lsl != null ? Number(e.definition.lsl) : null,
          usl: e.definition?.usl != null ? Number(e.definition.usl) : null,
          unit: e.definition?.unit_of_measure,
          values: [],
        };
      }
      groups[key].values.push(Number(e.measurement_value));
    });

    const spcResults = Object.values(groups)
      .filter(g => g.values.length >= 5)
      .map(g => ({ test: g.name, unit: g.unit, ...computeSPC(g.values, g.lsl, g.usl) }));

    if (spcResults.length === 0) {
      return res.json({ cardType, findings: [], summary: 'Insufficient measurement data for SPC analysis (need ≥5 values per test).' });
    }

    const spcSummary = spcResults.map(r => ({
      test: r.test,
      unit: r.unit,
      n: r.n,
      mean: r.mean != null ? Number(r.mean.toFixed(4)) : null,
      cpk: r.cpk != null ? Number(r.cpk.toFixed(3)) : null,
      cp: r.cp != null ? Number(r.cp.toFixed(3)) : null,
      violations: r.violations?.length ?? 0,
    }));

    const prompt = `You are a statistical process control expert reviewing quality data for card type "${cardType}".

SPC results (last 30 approved sessions):
${JSON.stringify(spcSummary, null, 2)}

Cpk < 1.0 indicates the process is not capable (failing spec). Cpk 1.0–1.33 is marginal. Cpk ≥ 1.33 is acceptable.
Nelson rule violations indicate out-of-control conditions.

Identify the most important quality findings and provide actionable recommendations.
Respond ONLY as JSON (no markdown):
{
  "summary": "2-3 sentence overall assessment",
  "findings": [
    { "test": "test name", "status": "ok|warning|critical", "message": "specific observation and recommendation" }
  ]
}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 768,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].text.trim();
    const jsonText = text.startsWith('{') ? text : text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const analysis = JSON.parse(jsonText);

    res.json({ cardType, spcSummary, analysis });
  } catch (err) {
    logger.error('getSpcAnalysis error', err);
    res.status(500).json({ error: 'Failed to generate SPC analysis' });
  }
};
