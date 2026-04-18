require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const jobNumber = process.argv[2] || '40661';

sequelize.query(`
  SELECT td.id, td.test_name, td.min_acceptable_value AS lsl, td.max_acceptable_value AS usl,
         td.unit_of_measurement AS unit,
         COUNT(te.id)::int AS n,
         ROUND(AVG(te.measurement_value)::numeric,4) AS mean,
         ROUND(STDDEV(te.measurement_value)::numeric,6) AS sigma,
         ROUND(MIN(te.measurement_value)::numeric,4) AS min_val,
         ROUND(MAX(te.measurement_value)::numeric,4) AS max_val
  FROM test_definitions td
  JOIN test_entries te ON te.test_definition_id = td.id
  JOIN test_sessions ts ON ts.id = te.session_id
  JOIN jobs j ON j.id = ts.job_id
  WHERE j.job_number = '${jobNumber}' AND te.measurement_value IS NOT NULL
  GROUP BY td.id, td.test_name, td.min_acceptable_value, td.max_acceptable_value, td.unit_of_measurement
  ORDER BY n DESC
`, { type: QueryTypes.SELECT }).then(rows => {
  rows.forEach(r => {
    let cpk = null;
    if (r.sigma && r.lsl != null && r.usl != null) {
      const cpu = (r.usl - r.mean) / (3 * r.sigma);
      const cpl = (r.mean - r.lsl) / (3 * r.sigma);
      cpk = Math.min(cpu, cpl).toFixed(3);
    }
    console.log(`${r.test_name} | n=${r.n} | mean=${r.mean} | sigma=${r.sigma} | LSL=${r.lsl} | USL=${r.usl} | unit=${r.unit} | Cpk=${cpk}`);
  });
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
