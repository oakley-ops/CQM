require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
sequelize.query(
  'SELECT id, test_id, test_name, test_type, min_acceptable_value, max_acceptable_value, unit_of_measurement FROM test_definitions ORDER BY id',
  { type: QueryTypes.SELECT }
).then(rows => {
  rows.forEach(r => console.log(JSON.stringify(r)));
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
