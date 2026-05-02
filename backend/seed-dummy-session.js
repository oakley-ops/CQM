/**
 * Seed a dummy test session (J-1002) with all 17 active tests populated.
 * Status = "submitted" so the API-fallback restore path is exercised.
 * Card numbers are globally sequential per session (required by UNIQUE constraint).
 */

const { sequelize } = require('./models');

async function main() {
  const q = (sql, bind = []) => sequelize.query(sql, { replacements: bind, type: sequelize.QueryTypes.RAW });

  // ── 1. Clean up previous dummy run ──────────────────────────────────────────
  await q(`DELETE FROM test_entry_metadata WHERE session_id IN (
    SELECT id FROM test_sessions WHERE session_number = 'SES-DUMMY-001')`);
  await q(`DELETE FROM test_entries WHERE session_id IN (
    SELECT id FROM test_sessions WHERE session_number = 'SES-DUMMY-001')`);
  await q(`DELETE FROM sample_cards WHERE session_id IN (
    SELECT id FROM test_sessions WHERE session_number = 'SES-DUMMY-001')`);
  await q(`DELETE FROM test_sessions WHERE session_number = 'SES-DUMMY-001'`);
  await q(`DELETE FROM jobs WHERE job_number = 'J-1002'`);
  console.log('Cleaned up previous dummy data.');

  // ── 2. Create job ────────────────────────────────────────────────────────────
  const [[job]] = await q(`
    INSERT INTO jobs (job_number, card_type, status, start_date, description, created_at, updated_at)
    VALUES ('J-1002', 'Credit Card', 'active', CURRENT_DATE, 'Dummy job for form restore testing', NOW(), NOW())
    RETURNING id`);
  const jobId = job.id;
  console.log('Created job J-1002 id=', jobId);

  // ── 3. Create session ────────────────────────────────────────────────────────
  const [[ses]] = await q(`
    INSERT INTO test_sessions
      (session_number, job_id, job_name, card_type, manufacturing_stage, batch_lot_number,
       test_date, status, submitted_at, general_notes, created_at, updated_at)
    VALUES
      ('SES-DUMMY-001', ?, 'J-1002', 'Credit Card', 'Final QC', 'LOT-DUMMY-2024',
       CURRENT_DATE, 'submitted', NOW(), 'Dummy session – all 17 tests pre-filled', NOW(), NOW())
    RETURNING id`, [jobId]);
  const sesId = ses.id;
  console.log('Created session SES-DUMMY-001 id=', sesId);

  // ── 4. Look up test definition IDs ──────────────────────────────────────────
  const [[defs]] = await q(`
    SELECT td.id, td.test_id, td.category_id
    FROM test_definitions td
    WHERE td.status = 'active'
    ORDER BY td.category_id, td.test_id`);
  // build map: test_id string → { id, category_id }
  const defRows = Array.isArray(defs) ? defs : [[defs]].flat();

  // Re-query properly as array
  const [defList] = await sequelize.query(`
    SELECT td.id, td.test_id, td.category_id
    FROM test_definitions td
    WHERE td.status = 'active'
    ORDER BY td.category_id, td.test_id`);

  const byTestId = {};
  for (const d of defList) byTestId[d.test_id] = d;
  console.log('Active test defs:', defList.map(d => d.test_id).join(', '));

  // ── 5. Helper: insert sample cards + entries ─────────────────────────────────
  let cardCounter = 0;

  async function makeCards(count, catId) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      cardCounter++;
      const [[c]] = await q(`
        INSERT INTO sample_cards (session_id, card_number, category_id, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW()) RETURNING id`, [sesId, cardCounter, catId]);
      ids.push(c.id);
    }
    return ids;
  }

  async function addEntry(defId, cardId, opts = {}) {
    await q(`
      INSERT INTO test_entries
        (session_id, test_definition_id, sample_card_id, measurement_value, secondary_measurement_value,
         assessment_value, pass_status, multi_value_notes, notes, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [sesId, defId, cardId,
       opts.measurement ?? null,
       opts.secondary ?? null,
       opts.assessment ?? null,
       opts.pass !== false,   // boolean: true = pass
       opts.mvn ? JSON.stringify(opts.mvn) : null,
       opts.notes ?? null]);
  }

  async function addMeta(defId, opts = {}) {
    await q(`
      INSERT INTO test_entry_metadata
        (session_id, test_definition_id, sampled_by, technician, test_time,
         temperature_c, humidity_pct, calibration_verified, extra_data, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [sesId, defId,
       opts.sampledBy ?? 'I. Rodriguez',
       opts.technician ?? 'I. Rodriguez',
       opts.testTime ?? '09:30',
       opts.tempC ?? null,
       opts.humidity ?? 45,
       opts.calVerified ?? true,
       opts.extra ? JSON.stringify(opts.extra) : null]);
  }

  // ── 6. Physical Tests (category 1) ──────────────────────────────────────────
  // #3002# Width and Height – 5 cards, widthMm/heightMm in multi_value_notes
  {
    const def = byTestId['#3002#'];
    if (def) {
      const cards = await makeCards(5, def.category_id);
      const widths  = [85.60, 85.58, 85.61, 85.59, 85.62];
      const heights = [54.00, 53.98, 54.01, 54.00, 53.99];
      for (let i = 0; i < 5; i++) {
        await addEntry(def.id, cards[i], {
          measurement: widths[i],
          pass: 'pass',
          mvn: { widthMm: widths[i], heightMm: heights[i], punchPosition: 'Center' }
        });
      }
      console.log('  #3002# Width/Height: 5 cards');
    }
  }

  // #3003# Card Thickness – 5 cards
  {
    const def = byTestId['#3003#'];
    if (def) {
      const cards = await makeCards(5, def.category_id);
      const vals = [0.76, 0.77, 0.76, 0.75, 0.76];
      for (let i = 0; i < 5; i++) {
        await addEntry(def.id, cards[i], { measurement: vals[i], pass: 'pass' });
      }
      console.log('  #3003# Card Thickness: 5 cards');
    }
  }

  // #3004# Thickness within Add-on Areas – 5 cards
  {
    const def = byTestId['#3004#'];
    if (def) {
      const cards = await makeCards(5, def.category_id);
      const vals = [0.84, 0.85, 0.84, 0.86, 0.84];
      for (let i = 0; i < 5; i++) {
        await addEntry(def.id, cards[i], { measurement: vals[i], pass: 'pass' });
      }
      console.log('  #3004# Add-on Thickness: 5 cards');
    }
  }

  // #3005# Corners – 5 cards, corner measurements in multi_value_notes
  {
    const def = byTestId['#3005#'];
    if (def) {
      const cards = await makeCards(5, def.category_id);
      for (let i = 0; i < 5; i++) {
        await addEntry(def.id, cards[i], {
          pass: 'pass',
          mvn: {
            cornerA: { r1: 3.18, r2: 3.20 },
            cornerB: { r1: 3.17, r2: 3.19 },
            cornerC: { r1: 3.18, r2: 3.20 },
            cornerD: { r1: 3.16, r2: 3.18 }
          }
        });
      }
      console.log('  #3005# Corners: 5 cards');
    }
  }

  // ── 7. Card Body Construction (category 5) ───────────────────────────────────
  // #3006# Card Edges – 5 cards, assessment pass/fail
  {
    const def = byTestId['#3006#'];
    if (def) {
      const cards = await makeCards(5, def.category_id);
      for (const c of cards) {
        await addEntry(def.id, c, { assessment: 'pass', pass: 'pass' });
      }
      console.log('  #3006# Card Edges: 5 cards');
    }
  }

  // #3008# Peel Strength – 3 cards with peel-form metadata
  {
    const def = byTestId['#3008#'];
    if (def) {
      const cards = await makeCards(3, def.category_id);
      const vals = [2.8, 3.1, 2.9];
      for (let i = 0; i < 3; i++) {
        await addEntry(def.id, cards[i], {
          measurement: vals[i],
          pass: 'pass',
          notes: `Peel measurement card ${i + 1}`
        });
      }
      await addMeta(def.id, {
        extra: {
          temperatureF: 72,
          laminatorName: 'Oasys 1',
          coreVendor: 'Klockner',
          substrate: 'PMS 300 Blue Nanya',
          percentRecycled: '',
          coreThickness: '760 µm'
        }
      });
      console.log('  #3008# Peel Strength: 3 cards + metadata');
    }
  }

  // #3016# Solidity – Peel Strength between Core – 1 card
  {
    const def = byTestId['#3016#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { measurement: 18.5, pass: 'pass' });
      console.log('  #3016# Solidity Peel: 1 card');
    }
  }

  // #3018# Resistance to Corner Impact – 1 card
  {
    const def = byTestId['#3018#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { assessment: 'pass', pass: 'pass' });
      console.log('  #3018# Corner Impact: 1 card');
    }
  }

  // #3019# Resistance to Impact – 1 card
  {
    const def = byTestId['#3019#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { assessment: 'pass', pass: 'pass' });
      console.log('  #3019# Resistance to Impact: 1 card');
    }
  }

  // #8230# Adhesion of ICM to Card – 1 card
  {
    const def = byTestId['#8230#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { assessment: 'pass', pass: 'pass' });
      console.log('  #8230# Adhesion ICM: 1 card');
    }
  }

  // ── 8. Mechanical Tests (category 7) ─────────────────────────────────────────
  // #3054# 3 Wheel Test Robustness – 1 card
  {
    const def = byTestId['#3054#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { assessment: 'pass', pass: 'pass' });
      console.log('  #3054# 3-Wheel Test: 1 card');
    }
  }

  // #3055# Wrapping Test Robustness – 1 card
  {
    const def = byTestId['#3055#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { assessment: 'pass', pass: 'pass' });
      console.log('  #3055# Wrapping Test: 1 card');
    }
  }

  // ── 9. Electrical Tests (category 8) ─────────────────────────────────────────
  // IT-ELE-001 Q-Factor – 1 card
  {
    const def = byTestId['IT-ELE-001'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { measurement: 42.3, pass: 'pass' });
      console.log('  IT-ELE-001 Q-Factor: 1 card');
    }
  }

  // IT-ELE-002 Reading Distance – 1 card
  {
    const def = byTestId['IT-ELE-002'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { measurement: 85, pass: 'pass' });
      console.log('  IT-ELE-002 Reading Distance: 1 card');
    }
  }

  // ── 10. IC Card Requirements (category 9) ────────────────────────────────────
  // #3007# Overall Card Warpage – 5 cards
  {
    const def = byTestId['#3007#'];
    if (def) {
      const cards = await makeCards(5, def.category_id);
      for (const c of cards) {
        await addEntry(def.id, c, { assessment: 'pass', pass: 'pass' });
      }
      console.log('  #3007# Card Warpage: 5 cards');
    }
  }

  // #3042# Dynamic Bending Stress – 1 card
  {
    const def = byTestId['#3042#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { assessment: 'pass', pass: 'pass' });
      console.log('  #3042# Dynamic Bending: 1 card');
    }
  }

  // #3043# Dynamic Torsional Stress – 1 card
  {
    const def = byTestId['#3043#'];
    if (def) {
      const cards = await makeCards(1, def.category_id);
      await addEntry(def.id, cards[0], { assessment: 'pass', pass: 'pass' });
      console.log('  #3043# Dynamic Torsional: 1 card');
    }
  }

  console.log(`\nDone! Session id=${sesId}, total sample_cards=${cardCounter}`);
  await sequelize.close();
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
