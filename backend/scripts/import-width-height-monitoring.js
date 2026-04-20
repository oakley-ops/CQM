/**
 * Import #3002# width+height monitoring data from exported JSONs.
 * Stores width in measurement_value, height in secondary_measurement_value.
 * Run: cd backend && node scripts/import-width-height-monitoring.js
 * Safe to re-run — sessions use ON CONFLICT DO NOTHING.
 */
require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const { sequelize } = require('../models');

const WIDTH_FILE  = path.join(__dirname, 'data', 'width-monitoring.json');
const HEIGHT_FILE = path.join(__dirname, 'data', 'height-monitoring.json');
const LSL = -0.13;
const USL =  0.13;

function mergeByKey(raw) {
  const map = {};
  for (const rec of raw) {
    const key = `${rec.jobNumber}-${rec.testDate}`;
    if (!map[key]) map[key] = { ...rec, cards: [] };
    map[key].cards.push(...rec.cards);
  }
  // Re-number cards sequentially within each merged session
  for (const rec of Object.values(map)) {
    rec.cards = rec.cards.map((c, i) => ({ ...c, cardNumber: i + 1 }));
  }
  return map;
}

async function main() {
  const widthMap  = mergeByKey(JSON.parse(fs.readFileSync(WIDTH_FILE,  'utf8').replace(/^\uFEFF/, '')));
  const heightMap = mergeByKey(JSON.parse(fs.readFileSync(HEIGHT_FILE, 'utf8').replace(/^\uFEFF/, '')));

  const allKeys = [...new Set([...Object.keys(widthMap), ...Object.keys(heightMap)])];
  console.log(`\n📦 ${allKeys.length} unique sessions to import\n`);

  const [[def]] = await sequelize.query(
    `SELECT id FROM test_definitions WHERE test_id = '#3002#' LIMIT 1`
  );
  if (!def) throw new Error('#3002# not found — run migration 027 first.');
  console.log(`✅ #3002# definition id = ${def.id}`);

  let inserted = 0, skipped = 0, entryCount = 0;
  const now = new Date().toISOString();

  for (const key of allKeys) {
    const wRec = widthMap[key];
    const hRec = heightMap[key];
    const meta = wRec || hRec;

    const sessionNum = `WH-${meta.jobNumber}-${meta.testDate}`;

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
        jobNumber: meta.jobNumber,
        testDate:  meta.testDate,
        notes:     meta.operator ? `Operator: ${meta.operator}` : null,
        now,
      },
    });

    if (!result?.id) { skipped++; continue; }
    inserted++;
    const sessionId = result.id;

    // Width and height come from the same source rows — card counts should match.
    // Use whichever is longer as the authoritative card list.
    const wCards = wRec?.cards ?? [];
    const hCards = hRec?.cards ?? [];
    const cardCount = Math.max(wCards.length, hCards.length);

    for (let i = 0; i < cardCount; i++) {
      const widthVal  = wCards[i]?.widthMm  ?? null;
      const heightVal = hCards[i]?.heightMm ?? null;
      const pass = widthVal !== null
        ? (widthVal  >= LSL && widthVal  <= USL)
        : (heightVal !== null ? (heightVal >= LSL && heightVal <= USL) : false);

      const [[sc]] = await sequelize.query(`
        INSERT INTO sample_cards (session_id, card_number, created_at, updated_at)
        VALUES (:sessionId, :cardNumber, :now, :now)
        RETURNING id
      `, { replacements: { sessionId, cardNumber: i + 1, now } });

      await sequelize.query(`
        INSERT INTO test_entries
          (session_id, test_definition_id, sample_card_id,
           measurement_value, secondary_measurement_value,
           pass_status, created_at, updated_at)
        VALUES
          (:sessionId, :defId, :cardId,
           :widthVal, :heightVal,
           :pass, :now, :now)
      `, {
        replacements: {
          sessionId, defId: def.id, cardId: sc.id,
          widthVal, heightVal, pass, now,
        },
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
