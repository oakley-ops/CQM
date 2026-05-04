const VALID_LEVELS = new Set(['excellent', 'acceptable', 'marginal', 'fail', 'outlier']);
const MIN_CONFIDENCE = 0.5;

function assessQuality(annotated) {
  const valid = [];
  const rejected = [];

  annotated.forEach(entry => {
    const reasons = [];

    if (!VALID_LEVELS.has(entry.quality_level)) {
      reasons.push(`invalid quality_level: ${entry.quality_level}`);
    }
    if (typeof entry.confidence !== 'number' || entry.confidence < MIN_CONFIDENCE) {
      reasons.push(`low confidence: ${entry.confidence}`);
    }
    if (!entry.assessment || entry.assessment.length < 5) {
      reasons.push('missing or too-short assessment');
    }
    // Sanity check: pass_status vs quality_level alignment
    if (entry.pass_status === 'fail' && entry.quality_level === 'excellent') {
      reasons.push('quality_level=excellent contradicts pass_status=fail');
    }

    if (reasons.length > 0) {
      rejected.push({ id: entry.id, reasons });
    } else {
      valid.push(entry);
    }
  });

  return {
    valid,
    rejected,
    quality_rate: annotated.length > 0 ? Math.round(valid.length / annotated.length * 100) : 0,
  };
}

module.exports = { assessQuality };
