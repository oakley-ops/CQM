/**
 * Import historical card quality data from Access databases into CQM system.
 *
 * Source files:
 *   DB1: c:\Users\Quali\Documents\access_export\Database1_recent_year.csv
 *        (Card lamination tests — May 2024 to May 2025, 1390 rows)
 *   DB2: c:\Users\Quali\Documents\access_export\db2\Sheet1.csv
 *        (Card dimension log — all rows, filtered to same period)
 *
 * Maps to:
 *   TestSession  — one per unique job+date+operator combination
 *   TestEntry    — measurements linked to existing TestDefinitions
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { sequelize, TestSession, TestEntry, TestDefinition, TestCategory } = require('./models');

// ─── File paths ──────────────────────────────────────────────────────────────
const DB1_FILE = path.join('C:\\Users\\Quali\\Documents\\access_export\\Database1_recent_year.csv');
const DB2_FILE = path.join('C:\\Users\\Quali\\Documents\\access_export\\db2\\Sheet1.csv');

// ─── Date filter ─────────────────────────────────────────────────────────────
const CUTOFF_DATE = new Date('2024-05-21');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseDate(val) {
  if (!val) return null;
  const d = new Date(val.split(' ')[0]);
  return isNaN(d) ? null : d;
}

function toFloat(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toBool(val) {
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim().toLowerCase() === 'true';
}

function sessionNumber(prefix, jobNum, dateStr, idx) {
  const d = dateStr ? dateStr.split('T')[0].replace(/-/g, '') : 'NODATE';
  return `IMP-${prefix}-${String(jobNum).replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${d}-${idx}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await sequelize.authenticate();
  console.log('✅ Database connected\n');

  // ── Look up test definitions we need ──────────────────────────────────────
  const allDefs = await TestDefinition.findAll({
    include: [{ model: TestCategory, as: 'category' }]
  });

  function findDef(namePart) {
    const match = allDefs.find(d =>
      d.test_name.toLowerCase().includes(namePart.toLowerCase()) ||
      (d.short_name && d.short_name.toLowerCase().includes(namePart.toLowerCase()))
    );
    if (!match) throw new Error(`TestDefinition not found for: "${namePart}"`);
    return match;
  }

  const defDimensions = findDef('Dimensions');
  const defWarpage    = findDef('Warpage');
  const defEMV        = findDef('Chip');

  console.log(`📋 Using definitions:`);
  console.log(`   Dimensions → ID ${defDimensions.id} (${defDimensions.test_name})`);
  console.log(`   Warpage    → ID ${defWarpage.id} (${defWarpage.test_name})`);
  console.log(`   EMV        → ID ${defEMV.id} (${defEMV.test_name})\n`);

  const transaction = await sequelize.transaction();

  try {
    let totalSessions = 0;
    let totalEntries  = 0;

    // ════════════════════════════════════════════════════════════════════════
    // DB1 — Card lamination / hologram / foil tests
    // ════════════════════════════════════════════════════════════════════════
    console.log('📂 Importing DB1 — Card lamination tests...');
    const db1Raw = fs.readFileSync(DB1_FILE, 'utf8');
    const db1Rows = parse(db1Raw, { columns: true, skip_empty_lines: true });

    let db1Sessions = 0;
    let db1Entries  = 0;

    for (let i = 0; i < db1Rows.length; i++) {
      const row = db1Rows[i];

      const testDate = parseDate(row['Test Date']);
      if (!testDate || testDate < CUTOFF_DATE) continue;

      const jobNum   = (row['Job Number'] || '').trim() || 'UNKNOWN';
      const operator = (row['Operator']   || '').trim() || 'Unknown';
      const machine  = (row['Machine Number'] || '').trim();
      const emvPass  = toBool(row['EMV']);

      const avgCardThick = toFloat(row['AVG Card Thickness']);
      const avgHoloThick = toFloat(row['AVG Holo Thickness']);
      const avgSigThick  = toFloat(row['AVG Sig Thickness']);
      const avgFoilThick = toFloat(row['AVG Foil Thickness']);

      const holoResult = toFloat(row['Hologram Results']);
      const sigResult  = toFloat(row['Sig Panel Results']);
      const foilResult = toFloat(row['Foil Results']);

      // Build notes from raw measurements
      const measureNotes = [
        `Card A/B/C: ${row['Card Thickness A']}/${row['Card Thickness B']}/${row['Card Thickness C']}`,
        `Holo A/B/C: ${row['Hologram Thickness A']}/${row['Hologram Thickness B']}/${row['Hologram Thickness C']}`,
        `SigPanel A/B/C: ${row['Sig Panel Thickness A']}/${row['Sig Panel Thickness B']}/${row['Sig Panel Thickness C']}`,
        `Foil A/B/C: ${row['Foil Thickness A']}/${row['Foil Thickness B']}/${row['Foil Thickness C']}`,
        `Holo Delta: ${holoResult}, SigPanel Delta: ${sigResult}, Foil Delta: ${foilResult}`
      ].join(' | ');

      // One session per row
      const sesNum = sessionNumber('LAM', jobNum, testDate.toISOString(), i);

      const session = await TestSession.create({
        session_number:      sesNum,
        session_type:        'Monitoring',
        card_type:           'Standard',
        job_name:            jobNum,
        batch_lot_number:    jobNum,
        test_date:           testDate.toISOString().split('T')[0],
        equipment_id:        machine ? `Machine-${machine}` : null,
        status:              'approved',
        general_notes:       `Operator: ${operator} | Imported from legacy Access DB (Card Add-on)`,
        manufacturing_stage: 'Lamination'
      }, { transaction });

      db1Sessions++;

      // Entry 1 — Card dimensions (avg card thickness as primary value)
      await TestEntry.create({
        session_id:               session.id,
        test_definition_id:       defDimensions.id,
        measurement_value:        avgCardThick,
        secondary_measurement_value: avgHoloThick,
        pass_status:              emvPass,
        multi_value_notes:        measureNotes,
        notes:                    `Avg Sig Panel: ${avgSigThick}, Avg Foil: ${avgFoilThick}`
      }, { transaction });

      // Entry 2 — EMV pass/fail
      await TestEntry.create({
        session_id:         session.id,
        test_definition_id: defEMV.id,
        pass_status:        emvPass,
        notes:              `EMV result from lamination test record`
      }, { transaction });

      db1Entries += 2;
    }

    console.log(`   ✅ DB1: ${db1Sessions} sessions, ${db1Entries} entries\n`);
    totalSessions += db1Sessions;
    totalEntries  += db1Entries;

    // ════════════════════════════════════════════════════════════════════════
    // DB2 — Card dimension log (width, height, thickness per card + warpage)
    // ════════════════════════════════════════════════════════════════════════
    console.log('📂 Importing DB2 — Card dimension log...');
    const db2Raw  = fs.readFileSync(DB2_FILE, 'utf8');
    const db2Rows = parse(db2Raw, { columns: true, skip_empty_lines: true });

    let db2Sessions = 0;
    let db2Entries  = 0;

    for (let i = 0; i < db2Rows.length; i++) {
      const row = db2Rows[i];

      const testDate = parseDate(row['TestDate']);
      if (!testDate || testDate < CUTOFF_DATE) continue;

      const jobNum      = (row['JobNumber']    || '').trim() || 'UNKNOWN';
      const batchNum    = (row['Batch Number'] || '').trim() || jobNum;
      const operator    = (row['Operator']     || '').trim() || 'Unknown';
      const diePress    = (row['DiePress']     || '').trim();
      const emvPass     = toBool(row['EMV']);
      const silkFront   = row['Silk Screen Front'] || '';
      const silkBack    = row['Silk Screen Back']  || '';

      // Collect per-card thickness measurements (cards 1–10, 4 readings each)
      const cardThickReadings = [];
      const cardWidths  = [];
      const cardHeights = [];
      for (let c = 1; c <= 10; c++) {
        const w  = toFloat(row[`Card${c}Width`]);
        const h  = toFloat(row[`Card${c}Height`]);
        const ta = toFloat(row[`Card${c}ThickA`]);
        const tb = toFloat(row[`Card${c}ThickB`]);
        const tc = toFloat(row[`Card${c}ThickC`]);
        const td = toFloat(row[`Card${c}ThickD`]);
        if (ta !== null) cardThickReadings.push(ta, tb, tc, td);
        if (w  !== null) cardWidths.push(w);
        if (h  !== null) cardHeights.push(h);
      }

      const avgThick = cardThickReadings.length
        ? cardThickReadings.reduce((a, b) => a + (b || 0), 0) / cardThickReadings.filter(v => v !== null).length
        : null;
      const avgWidth = cardWidths.length
        ? cardWidths.reduce((a, b) => a + b, 0) / cardWidths.length
        : null;
      const avgHeight = cardHeights.length
        ? cardHeights.reduce((a, b) => a + b, 0) / cardHeights.length
        : null;

      // Collect warpage readings
      const warpageKeys = [
        'WarpageTest1','WarpageTest2','WarpageTest3','WarpageTest4','WarpageTest5',
        'WapageTest6','WarpageTest7','WarpageTest 8','WarpageTest9','WarpageTest10'
      ];
      const warpageVals = warpageKeys.map(k => toFloat(row[k])).filter(v => v !== null);
      const avgWarpage  = warpageVals.length
        ? warpageVals.reduce((a, b) => a + b, 0) / warpageVals.length
        : null;

      const cornerImpact = [
        row['CornerImpactTest1'], row['CornerImpactTest2'],
        row['CornerImpactTest3'], row['CornerImpactTest4']
      ].filter(Boolean).join('/');

      const dimNotes = [
        `Avg Width: ${avgWidth?.toFixed(4)}, Avg Height: ${avgHeight?.toFixed(4)}, Avg Thick: ${avgThick?.toFixed(4)}`,
        `Cards measured: ${cardThickReadings.length / 4}`,
        `Silk Front: ${silkFront}, Silk Back: ${silkBack}`,
        `Corner Impact: ${cornerImpact}`
      ].join(' | ');

      const sesNum = sessionNumber('DIM', jobNum, testDate.toISOString(), i);

      const session = await TestSession.create({
        session_number:      sesNum,
        session_type:        'Monitoring',
        card_type:           'Standard',
        job_name:            jobNum,
        batch_lot_number:    batchNum,
        test_date:           testDate.toISOString().split('T')[0],
        equipment_id:        diePress ? `DiePress-${diePress}` : null,
        status:              'approved',
        general_notes:       `Operator: ${operator} | Imported from legacy Access DB (Dimension Log)`,
        manufacturing_stage: 'Card Dimensions'
      }, { transaction });

      db2Sessions++;

      // Entry 1 — Card dimensions
      await TestEntry.create({
        session_id:               session.id,
        test_definition_id:       defDimensions.id,
        measurement_value:        avgThick !== null ? parseFloat(avgThick.toFixed(4)) : null,
        secondary_measurement_value: avgWidth !== null ? parseFloat(avgWidth.toFixed(4)) : null,
        pass_status:              emvPass,
        multi_value_notes:        dimNotes,
        notes:                    `Avg Height: ${avgHeight?.toFixed(4)}`
      }, { transaction });

      // Entry 2 — Warpage
      if (avgWarpage !== null) {
        await TestEntry.create({
          session_id:         session.id,
          test_definition_id: defWarpage.id,
          measurement_value:  parseFloat(avgWarpage.toFixed(4)),
          pass_status:        emvPass,
          multi_value_notes:  warpageVals.map((v, idx) => `W${idx + 1}: ${v}`).join(' | '),
          notes:              `${warpageVals.length} warpage readings`
        }, { transaction });
        db2Entries++;
      }

      // Entry 3 — EMV
      await TestEntry.create({
        session_id:         session.id,
        test_definition_id: defEMV.id,
        pass_status:        emvPass,
        notes:              `EMV result from dimension log`
      }, { transaction });

      db2Entries += 2;
    }

    console.log(`   ✅ DB2: ${db2Sessions} sessions, ${db2Entries} entries\n`);
    totalSessions += db2Sessions;
    totalEntries  += db2Entries;

    await transaction.commit();

    console.log('═══════════════════════════════════════════');
    console.log(`✅ Import complete!`);
    console.log(`   Total sessions created: ${totalSessions}`);
    console.log(`   Total entries created:  ${totalEntries}`);
    console.log('═══════════════════════════════════════════');

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Import failed, rolling back:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
