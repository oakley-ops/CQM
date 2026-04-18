/**
 * Fix ISO 7810 spec limits for test definitions.
 * Run once: node backend/scripts/fix-spec-limits.js
 */
require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const updates = [
  // ID 3: "Card Dimensions Verification" — imported data is thickness-scale (~0.73 mm mean).
  // ISO 7810: nominal thickness 0.76 mm ± 0.08 mm → 0.68–0.84 mm
  {
    id: 3,
    min_acceptable_value: 0.680,
    max_acceptable_value: 0.840,
    unit_of_measurement: 'mm',
    note: 'Card Thickness — ISO 7810: 0.76 ±0.08 mm',
  },
  // ID 4: "Warpage Testing" — already has USL=0.50; add LSL=0
  {
    id: 4,
    min_acceptable_value: 0.000,
    max_acceptable_value: 0.500,
    unit_of_measurement: 'mm',
    note: 'Warpage ≤ 0.5 mm (internal spec)',
  },
  // ID 33: "Thickness outside Contacts…" — already 0.76–0.84 but extend to ISO: 0.68–0.84
  {
    id: 33,
    min_acceptable_value: 0.680,
    max_acceptable_value: 0.840,
    unit_of_measurement: 'mm',
    note: 'Card Thickness — ISO 7810: 0.76 ±0.08 mm',
  },
  // ID 37: "Overall Card Warpage (IS7810)"
  {
    id: 37,
    min_acceptable_value: 0.000,
    max_acceptable_value: 1.500,
    unit_of_measurement: 'mm',
    note: 'ISO 7810: warpage ≤ 1.5 mm',
  },
];

(async () => {
  for (const u of updates) {
    const [, rowsAffected] = await sequelize.query(
      `UPDATE test_definitions
       SET min_acceptable_value = :lsl,
           max_acceptable_value = :usl,
           unit_of_measurement  = :unit,
           updated_at           = NOW()
       WHERE id = :id`,
      {
        replacements: { lsl: u.min_acceptable_value, usl: u.max_acceptable_value, unit: u.unit_of_measurement, id: u.id },
        type: QueryTypes.UPDATE,
      }
    );
    console.log(`  ID ${u.id}: updated (${u.note})`);
  }
  console.log('\nSpec limits updated. Re-run check-spc.js to verify.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
