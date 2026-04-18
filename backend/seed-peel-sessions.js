/**
 * Seed test sessions for Peel Strength (Laminate Adhesion) and Overlay Peel tests.
 * Run: cd backend && node seed-peel-sessions.js
 */
require('dotenv').config();
const { sequelize } = require('./config/database');

const INSPECTOR_ID = 1;
const DEF_PEEL_STRENGTH = 28;   // #3008# Peel Strength (Laminate Adhesion)
const DEF_OVERLAY_PEEL  = 29;   // #3015# Solidity/Peel Strength of the Overlay

async function seed() {
  await sequelize.authenticate();
  console.log('Connected.\n');

  const t = await sequelize.transaction();
  try {

    // ── Session 1: Peel Strength (Laminate Adhesion) — Monitoring ──────────
    const [ps_session] = await sequelize.query(`
      INSERT INTO test_sessions
        (session_type, card_type, batch_lot_number, cat_number, job_name,
         test_date, inspector_id, status, general_notes, created_at, updated_at)
      VALUES
        ('Monitoring', 'ALL', 'BATCH-PS-2026-001', 'CAT-4412', 'Alpha Card Run',
         '2026-04-05', ${INSPECTOR_ID}, 'submitted',
         'Laminate adhesion peel strength — ISO 7810:2003 §8.8', NOW(), NOW())
      RETURNING id
    `, { transaction: t });
    const psId = ps_session[0].id;
    console.log(`Created Peel Strength session id=${psId}`);

    // 8 sample cards for peel strength
    const psCardRows = Array.from({ length: 8 }, (_, i) => `(${psId}, NULL, ${i + 1}, '', NOW(), NOW())`).join(',');
    const [psCards] = await sequelize.query(`
      INSERT INTO sample_cards (session_id, category_id, card_number, notes, created_at, updated_at)
      VALUES ${psCardRows} RETURNING id, card_number
    `, { transaction: t });

    // Peel strength measurements (P1, P2) — all passing (≥ 0.35 N/mm)
    const peelData = [
      { p1: 0.42, p2: 0.39, side: 'Front/Back' },
      { p1: 0.51, p2: 0.48, side: 'Front Right' },
      { p1: 0.38, p2: 0.40, side: 'Front Left'  },
      { p1: 0.45, p2: 0.44, side: 'Back Right'  },
      { p1: 0.37, p2: 0.36, side: 'Back Left'   },
      { p1: 0.49, p2: 0.47, side: 'Front/Back'  },
      { p1: 0.35, p2: 0.35, side: 'Front Right' }, // borderline pass
      { p1: 0.61, p2: 0.59, side: 'Back Left'   },
    ];

    for (let i = 0; i < psCards.length; i++) {
      const card = psCards[i];
      const d = peelData[i];
      await sequelize.query(`
        INSERT INTO test_entries
          (session_id, test_definition_id, sample_card_id,
           measurement_value, secondary_measurement_value,
           pass_status, notes, retest_required, created_at, updated_at)
        VALUES
          (${psId}, ${DEF_PEEL_STRENGTH}, ${card.id},
           ${d.p1}, ${d.p2},
           true, '${d.side}', false, NOW(), NOW())
      `, { transaction: t });
    }
    console.log(`  Inserted ${psCards.length} peel strength entries`);

    // Session-level metadata (stored in test_entry_metadata)
    await sequelize.query(`
      INSERT INTO test_entry_metadata
        (session_id, test_definition_id, sampled_by, technician, temperature_c, humidity_pct,
         sample_preconditioned, cal_valid_until, env_logger_id,
         extra_data, created_at, updated_at)
      VALUES
        (${psId}, ${DEF_PEEL_STRENGTH}, 'J. Smith', 'M. Torres', 23.1, 51.2,
         true, '2026-12-31', 'ENV-007',
         '{"qCardTestProcedure":"QC-PS-001","imadaTestStandId":"TS-22","imadaTestStandCalUntil":"2026-09-30","imadaForceGaugeId":"FG-14","imadaForceGaugeCalUntil":"2026-09-30","forceGaugeSoftwareVersion":"v3.1.2","highResImages":"Y","hotTempC":155,"hotTempF":311,"hotPressureBar":4.5,"hotDwellTime":"03:30","coldTempC":20,"coldTempF":68,"coldPressureBar":3.0,"coldDwellTime":"01:30","laminatorId":"LAM-A","numCycles":1,"overlayMaterial":"PET 30µm"}',
         NOW(), NOW())
    `, { transaction: t });

    // ── Session 2: Solidity/Peel Strength of the Overlay — Qualification ───
    const [op_session] = await sequelize.query(`
      INSERT INTO test_sessions
        (session_type, card_type, batch_lot_number, cat_number, job_name,
         test_date, inspector_id, status, general_notes, created_at, updated_at)
      VALUES
        ('Qualification', 'ALL', 'BATCH-OP-2026-001', 'CAT-4412', 'Alpha Card Run',
         '2026-04-05', ${INSPECTOR_ID}, 'submitted',
         'Overlay peel strength — CQM 3A §9.1.20. Mix of Edge and Center sections.', NOW(), NOW())
      RETURNING id
    `, { transaction: t });
    const opId = op_session[0].id;
    console.log(`Created Overlay Peel session id=${opId}`);

    // 10 sections for overlay peel
    const opCardRows = Array.from({ length: 10 }, (_, i) => `(${opId}, NULL, ${i + 1}, '', NOW(), NOW())`).join(',');
    const [opCards] = await sequelize.query(`
      INSERT INTO sample_cards (session_id, category_id, card_number, notes, created_at, updated_at)
      VALUES ${opCardRows} RETURNING id, card_number
    `, { transaction: t });

    // Section data: sectionId|Edge|Front  /  sectionId|Center|Back  etc.
    // Edge ≥ 5 N/cm, Center ≥ 3.5 N/cm
    const overlayData = [
      { sectionId: 'H_1',  type: 'Edge',   fb: 'Front', minP: 6.2,  maxP: 7.1 },
      { sectionId: 'H_2',  type: 'Edge',   fb: 'Back',  minP: 5.8,  maxP: 6.5 },
      { sectionId: 'H_3',  type: 'Center', fb: 'Front', minP: 4.1,  maxP: 5.0 },
      { sectionId: 'H_4',  type: 'Center', fb: 'Back',  minP: 3.9,  maxP: 4.6 },
      { sectionId: 'H_5',  type: 'Edge',   fb: 'Front', minP: 6.8,  maxP: 7.4 },
      { sectionId: 'H_6',  type: 'Edge',   fb: 'Back',  minP: 5.1,  maxP: 5.9 },
      { sectionId: 'H_7',  type: 'Center', fb: 'Front', minP: 3.6,  maxP: 4.2 },
      { sectionId: 'H_8',  type: 'Center', fb: 'Back',  minP: 4.8,  maxP: 5.3 },
      { sectionId: 'H_9',  type: 'Edge',   fb: 'Front', minP: 7.0,  maxP: 7.8 },
      { sectionId: 'H_10', type: 'Edge',   fb: 'Back',  minP: 5.5,  maxP: 6.1 },
    ];

    for (let i = 0; i < opCards.length; i++) {
      const card = opCards[i];
      const d = overlayData[i];
      const notes = `${d.sectionId}|${d.type}|${d.fb}`;
      const threshold = d.type === 'Edge' ? 5.0 : 3.5;
      const pass = d.minP >= threshold;
      await sequelize.query(`
        INSERT INTO test_entries
          (session_id, test_definition_id, sample_card_id,
           measurement_value, secondary_measurement_value,
           pass_status, notes, retest_required, created_at, updated_at)
        VALUES
          (${opId}, ${DEF_OVERLAY_PEEL}, ${card.id},
           ${d.minP}, ${d.maxP},
           ${pass}, '${notes}', false, NOW(), NOW())
      `, { transaction: t });
    }
    console.log(`  Inserted ${opCards.length} overlay peel entries`);

    await sequelize.query(`
      INSERT INTO test_entry_metadata
        (session_id, test_definition_id, sampled_by, technician, temperature_c, humidity_pct,
         sample_preconditioned, env_logger_id, cal_valid_until,
         extra_data, created_at, updated_at)
      VALUES
        (${opId}, ${DEF_OVERLAY_PEEL}, 'J. Smith', 'M. Torres', 23.0, 50.5,
         true, 'ENV-007', '2026-12-31',
         '{"hotTempC":155,"hotTempF":311,"hotPressureBar":4.5,"hotDwellTime":"03:30","coldTempC":20,"coldTempF":68,"coldPressureBar":3.0,"coldDwellTime":"01:30","laminatorId":"LAM-A","numCycles":1,"overlayMaterial":"PET 30µm","laminatorNotes":"Standard production run"}',
         NOW(), NOW())
    `, { transaction: t });

    await t.commit();
    console.log('\n✅ Peel strength sessions seeded successfully.');
    console.log(`   Session ${psId} → Peel Strength (Laminate Adhesion) [Monitoring, 8 cards]`);
    console.log(`   Session ${opId} → Overlay Peel Strength [Qualification, 10 sections]`);
  } catch (err) {
    await t.rollback();
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
