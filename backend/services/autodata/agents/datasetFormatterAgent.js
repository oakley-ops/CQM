const fs = require('fs');
const path = require('path');

async function formatDataset(entries, runId, format = 'jsonl') {
  const outputDir = path.join(__dirname, '../../../datasets', String(runId));
  fs.mkdirSync(outputDir, { recursive: true });

  const datasetPath = path.join(outputDir, `dataset.${format}`);

  const records = entries.map(e => ({
    input: {
      test_name: e.test_name,
      category: e.category,
      card_type: e.card_type,
      measurement: e.measurement,
      unit: e.unit,
      lsl: e.lsl,
      usl: e.usl,
      pass_status: e.pass_status,
    },
    output: {
      quality_level: e.quality_level,
      assessment: e.assessment,
      confidence: e.confidence,
    },
  }));

  if (format === 'jsonl') {
    const lines = records.map(r => JSON.stringify(r)).join('\n');
    fs.writeFileSync(datasetPath, lines, 'utf8');
  } else {
    // CSV
    const headers = ['test_name', 'category', 'card_type', 'measurement', 'unit', 'lsl', 'usl', 'pass_status', 'quality_level', 'assessment', 'confidence'];
    const rows = records.map(r => headers.map(h => {
      const val = r.input[h] ?? r.output[h] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','));
    fs.writeFileSync(datasetPath, [headers.join(','), ...rows].join('\n'), 'utf8');
  }

  // Write dataset card
  const card = {
    run_id: runId,
    format,
    sample_count: records.length,
    schema: {
      input: ['test_name', 'category', 'card_type', 'measurement', 'unit', 'lsl', 'usl', 'pass_status'],
      output: ['quality_level', 'assessment', 'confidence'],
    },
    quality_levels: ['excellent', 'acceptable', 'marginal', 'fail', 'outlier'],
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outputDir, 'dataset_card.json'), JSON.stringify(card, null, 2), 'utf8');

  return datasetPath;
}

module.exports = { formatDataset };
