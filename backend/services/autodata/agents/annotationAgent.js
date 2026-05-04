const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();
const BATCH_SIZE = 15;

async function annotateData(entries, outlierIds) {
  const outlierSet = new Set(outlierIds);
  const annotated = [];

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    const payload = batch.map(e => ({
      id: e.id,
      test: e.test_name,
      category: e.category,
      card_type: e.card_type,
      value: e.measurement,
      unit: e.unit,
      lsl: e.lsl,
      usl: e.usl,
      pass_status: e.pass_status,
      is_outlier: outlierSet.has(e.id),
    }));

    const prompt = `You are an ISO 7810/7816 smart card quality expert. Annotate each test entry with a quality assessment.

Entries to annotate:
${JSON.stringify(payload, null, 2)}

For each entry, determine:
- quality_level: "excellent" (cpk ≥ 1.67 equivalent, well within spec) / "acceptable" (within spec) / "marginal" (close to limit) / "fail" (out of spec) / "outlier" (statistical outlier)
- assessment: 1-sentence observation about this measurement
- confidence: 0.0–1.0 (how confident you are in the assessment)

Respond ONLY as a JSON array (no markdown), one object per entry in the same order:
[{"id": <id>, "quality_level": "...", "assessment": "...", "confidence": 0.9}, ...]`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].text.trim();
    const jsonText = text.startsWith('[') ? text : text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const results = JSON.parse(jsonText);

    results.forEach((r, idx) => {
      const entry = batch[idx];
      if (!entry) return;
      annotated.push({
        ...entry,
        quality_level: r.quality_level ?? 'acceptable',
        assessment: r.assessment ?? '',
        confidence: r.confidence ?? 0.7,
      });
    });
  }

  return annotated;
}

module.exports = { annotateData };
