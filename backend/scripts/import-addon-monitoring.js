/**
 * Import #3004# add-on thickness delta data from exported JSON.
 * holoDelta  → measurement_value
 * sigDelta   → secondary_measurement_value
 * One session per Access DB row (keyed by rowId for guaranteed uniqueness).
 * Run: cd backend && node scripts/import-addon-monitoring.js
 * Safe to re-run — sessions use ON CONFLICT DO NOTHING.
 */
require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const { sequelize } = require('../models');

const DATA_FILE = path.join(__dirname, 'data', 'addon-monitoring.json');
const USL = 0.05;

async function main() {
  const records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, ''));
  console.log(`\n📦 ${records.length} sessions to import\n`);

  const [[def]] = await sequelize.query(
    `SELECT id FROM test_definitions WHERE test_id = '#3004#' LIMIT 1`
  );
  if (!def) throw new Error('#3004# not found — run migration 028 first.');
  console.log(`✅ #3004# definition id = ${def.id}`);

  let inserted = 0, skipped = 0, entryCount = 0;
  const now = new Date().toISOString();

  for (const rec of records) {
    const sessionNum = `ADDON-${rec.rowId}`;

    const [[result]] = await sequelize.query(`
      INSERT INTO test_sessions
        (session_number, session_type, card_type, batch_lot_number,
         test_date, status, general_notes, created_at, updated_at)
      VALUES
        (:sessionNum, 'Monitoring', 'CB', :jobNumber,
         :testDate, 'approved', :notes, :now, :now)
      ON CONFLICT (session_number) DO NOTHING
      RETURNING id
    `, {
      replacements: {
        sessionNum,
        jobNumber: rec.jobNumber,
        testDate:  rec.testDate,
        notes:     rec.operator ? `Operator: ${rec.operator}` : null,
        now,
      },
    });

    if (!result?.id) { skipped++; continue; }
    inserted++;
    const sessionId = result.id;

    const holoVal = rec.holoDelta  ?? null;
    const sigVal  = rec.sigPanelDelta ?? null;
    const pass    = (holoVal === null || holoVal <= USL) &&
                    (sigVal  === null || sigVal  <= USL);

    const [[sc]] = await sequelize.query(`
      INSERT INTO sample_cards (session_id, card_number, created_at, updated_at)
      VALUES (:sessionId, 1, :now, :now)
      RETURNING id
    `, { replacements: { sessionId, now } });

    await sequelize.query(`
      INSERT INTO test_entries
        (session_id, test_definition_id, sample_card_id,
         measurement_value, secondary_measurement_value,
         pass_status, created_at, updated_at)
      VALUES
        (:sessionId, :defId, :cardId,
         :holoVal, :sigVal,
         :pass, :now, :now)
    `, {
      replacements: {
        sessionId, defId: def.id, cardId: sc.id,
        holoVal, sigVal, pass, now,
      },
    });
    entryCount++;

    if (inserted % 500 === 0) process.stdout.write(`  ${inserted} sessions...\r`);
  }

  console.log(`\n✅ Import complete`);
  console.log(`   Sessions inserted : ${inserted}`);
  console.log(`   Sessions skipped  : ${skipped} (already existed)`);
  console.log(`   Entries inserted  : ${entryCount}`);
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
