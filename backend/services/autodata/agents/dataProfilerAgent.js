const { computeSPC } = require('../../../utils/spcEngine');

function profileData(entries) {
  const groups = {};

  entries.forEach(e => {
    const key = `${e.test_name}||${e.card_type}`;
    if (!groups[key]) {
      groups[key] = {
        test_name: e.test_name,
        card_type: e.card_type,
        category: e.category,
        unit: e.unit,
        lsl: e.lsl,
        usl: e.usl,
        values: [],
        ids: [],
      };
    }
    groups[key].values.push(e.measurement);
    groups[key].ids.push(e.id);
  });

  const profiles = {};
  const outlierIds = new Set();

  for (const [key, g] of Object.entries(groups)) {
    if (g.values.length < 3) continue;

    const spc = computeSPC(g.values, g.lsl, g.usl);
    const mean = spc.mean ?? 0;
    const std = spc.sigma ?? 0;

    // Flag outliers (beyond 3σ)
    g.values.forEach((v, i) => {
      if (std > 0 && Math.abs(v - mean) > 3 * std) {
        outlierIds.add(g.ids[i]);
      }
    });

    profiles[key] = {
      test_name: g.test_name,
      card_type: g.card_type,
      category: g.category,
      unit: g.unit,
      n: g.values.length,
      mean: spc.mean,
      sigma: spc.sigma,
      cpk: spc.cpk,
      cp: spc.cp,
      ucl: spc.ucl,
      lcl: spc.lcl,
      violations: spc.violations?.length ?? 0,
      pass_rate: g.values.length > 0
        ? Math.round(entries.filter(e => e.test_name === g.test_name && e.card_type === g.card_type && e.pass_status === 'pass').length / g.values.length * 100)
        : null,
    };
  }

  const passCount = entries.filter(e => e.pass_status === 'pass').length;

  return {
    profiles: Object.values(profiles),
    outlierIds: [...outlierIds],
    summary: {
      total: entries.length,
      unique_tests: Object.keys(profiles).length,
      pass_rate: entries.length > 0 ? Math.round(passCount / entries.length * 100) : null,
      outlier_count: outlierIds.size,
    },
  };
}

module.exports = { profileData };
