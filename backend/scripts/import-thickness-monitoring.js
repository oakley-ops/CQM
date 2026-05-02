/**
 * Import IT-PHY-002 thickness monitoring data from exported JSON.
 * Run: cd backend && node scripts/import-thickness-monitoring.js
 * Safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING.
 */
require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const { sequelize } = require('../models');

const DATA_FILE = path.join(__dirname, 'data', 'thickness-monitoring.json');
const LSL = 0.76;
const USL = 0.84;

async function main() {
  const raw     = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
  const parsed  = JSON.parse(raw);

  // Merge rows with the same job+date into one session
  const merged = {};
  for (const rec of parsed) {
    const key = `${rec.jobNumber}-${rec.testDate}`;
    if (!merged[key]) merged[key] = { ...rec, cards: [] };
    merged[key].cards.push(...rec.cards);
  }
  const records = Object.values(merged).map(rec => ({
    ...rec,
    cards: rec.cards.map((c, i) => ({ ...c, cardNumber: i + 1 })),
  }));

  console.log(`\n📦 ${parsed.length} rows → ${records.length} unique sessions\n`);

  // Resolve IT-PHY-002 definition id
  const [[def]] = await sequelize.query(
    `SELECT id FROM test_definitions WHERE test_id = '#3003#' LIMIT 1`
  );
  if (!def) throw new Error('#3003# not found — run seed-internal-tests.js first.');
  console.log(`✅ IT-PHY-002 definition id = ${def.id}`);

  let inserted = 0, skipped = 0, entryCount = 0;
  const now = new Date().toISOString();

  for (const rec of records) {
    const sessionNum = `${rec.jobNumber}-${rec.testDate}`;

    // Insert session — skip if already exists
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

    // Insert one sample_card + one test_entry per card
    for (const card of rec.cards) {
      const pass = card.thickAvg >= LSL && card.thickAvg <= USL;

      const [[sc]] = await sequelize.query(`
        INSERT INTO sample_cards (session_id, card_number, created_at, updated_at)
        VALUES (:sessionId, :cardNumber, :now, :now)
        RETURNING id
      `, { replacements: { sessionId, cardNumber: card.cardNumber, now } });

      await sequelize.query(`
        INSERT INTO test_entries
          (session_id, test_definition_id, sample_card_id, measurement_value,
           pass_status, created_at, updated_at)
        VALUES
          (:sessionId, :defId, :cardId, :value, :pass, :now, :now)
      `, {
        replacements: { sessionId, defId: def.id, cardId: sc.id, value: card.thickAvg, pass, now },
      });
      entryCount++;
    }

    if (inserted % 200 === 0) process.stdout.write(`  ${inserted} sessions...\r`);
  }

  console.log(`\n✅ Import complete`);
  console.log(`   Sessions inserted : ${inserted}`);
  console.log(`   Sessions skipped  : ${skipped} (already existed)`);
  console.log(`   Entries inserted  : ${entryCount}`);
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
