/**
 * seed-realworld-sessions.js
 * 3 Monitoring + 3 Qualification sessions with deterministic, real-world data.
 * Includes both passing and failing results across PHY, CBY, and ELE test categories.
 *
 * Sessions:
 *   MON-RW-001  Visa Classic DI v3.2       — PHY monitoring       → APPROVED  (all pass)
 *   MON-RW-002  Mastercard Standard v2.1   — CBY monitoring       → REJECTED  (peel + corner impact fail)
 *   MON-RW-003  AMEX Blue Contactless v1.0 — ELE monitoring       → APPROVED  (Q-factor borderline, all pass)
 *   QUA-RW-001  Transit NFC Card Type B    — PHY+CBY qual (8 pcs) → REJECTED  (1 thickness OOT, 1 delamination)
 *   QUA-RW-002  Debit MC Contactless v4.0  — ELE qual (8 pcs)     → REJECTED  (antenna Q-factor + range failures)
 *   QUA-RW-003  Debit MC Contactless v4.0  — ELE re-qual (8 pcs)  → SUBMITTED (post-redesign, all pass)
 *
 * Run: cd backend && node seed-realworld-sessions.js
 */
require('dotenv').config();
const { sequelize } = require('./config/database');

// ─── Config ───────────────────────────────────────────────────────────────────
const INSPECTOR_ID   = 1;   // admin / Isaac (must exist)
const APPROVED_BY_ID = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function lookupDefs(t) {
  const NEEDED = [
    'IT-PHY-001', 'IT-PHY-002', 'IT-PHY-003', 'IT-PHY-006',
    'IT-CBY-001', 'IT-CBY-002', 'IT-CBY-006',
    'IT-ELE-001', 'IT-ELE-002',
  ];
  const [rows] = await sequelize.query(
    `SELECT id, test_id FROM test_definitions WHERE test_id IN (${NEEDED.map(n => `'${n}'`).join(',')})`,
    { transaction: t }
  );
  const map = {};
  rows.forEach(r => { map[r.test_id] = r.id; });
  const missing = NEEDED.filter(n => !map[n]);
  if (missing.length) throw new Error(`Missing test definitions: ${missing.join(', ')} — run seed-internal-tests.js first`);
  return map;
}

async function createSession(t, { session_number, session_type, card_type, batch_lot_number,
  cat_number, job_name, test_date, status, general_notes, approved_at }) {
  const approvedFields = status === 'approved'
    ? `, approved_by = ${APPROVED_BY_ID}, approved_at = '${approved_at}'`
    : '';
  const [rows] = await sequelize.query(`
    INSERT INTO test_sessions
      (session_number, session_type, card_type, batch_lot_number, cat_number, job_name,
       test_date, inspector_id, status, general_notes,
       submitted_at, created_at, updated_at)
    VALUES
      ('${session_number}', '${session_type}', '${card_type}', '${batch_lot_number}',
       '${cat_number}', $1, '${test_date}',
       ${INSPECTOR_ID}, '${status}', $2,
       CASE WHEN '${status}' = 'draft' THEN NULL ELSE NOW() - INTERVAL '1 hour' END,
       NOW(), NOW())
    RETURNING id
  `, { bind: [job_name, general_notes || null], transaction: t });
  const id = rows[0].id;
  if (status === 'approved') {
    await sequelize.query(
      `UPDATE test_sessions SET approved_by = ${APPROVED_BY_ID}, approved_at = '${approved_at}' WHERE id = ${id}`,
      { transaction: t }
    );
  }
  return id;
}

async function createCards(t, sessionId, count) {
  const vals = Array.from({ length: count }, (_, i) =>
    `(${sessionId}, NULL, ${i + 1}, '', NOW(), NOW())`
  ).join(',');
  const [cards] = await sequelize.query(
    `INSERT INTO sample_cards (session_id, category_id, card_number, notes, created_at, updated_at)
     VALUES ${vals} RETURNING id, card_number`,
    { transaction: t }
  );
  return cards;
}

async function addEntry(t, sessionId, defId, cardId, measurement, secondary, pass, notes = '') {
  await sequelize.query(`
    INSERT INTO test_entries
      (session_id, test_definition_id, sample_card_id,
       measurement_value, secondary_measurement_value,
       pass_status, notes, retest_required, created_at, updated_at)
    VALUES (${sessionId}, ${defId}, ${cardId},
      ${measurement ?? 'NULL'}, ${secondary ?? 'NULL'},
      ${pass}, $1, ${!pass}, NOW(), NOW())
  `, { bind: [notes], transaction: t });
}

async function addMetadata(t, sessionId, defId, extra = {}) {
  const base = { sampled_by: 'Quality Lab', technician: 'M. Torres',
    temperature_c: 23.0, humidity_pct: 50.0,
    sample_preconditioned: true, cal_valid_until: '2026-12-31', env_logger_id: 'ENV-007' };
  const merged = { ...base, ...extra };
  await sequelize.query(`
    INSERT INTO test_entry_metadata
      (session_id, test_definition_id, sampled_by, technician,
       temperature_c, humidity_pct, sample_preconditioned,
       cal_valid_until, env_logger_id, extra_data, created_at, updated_at)
    VALUES (${sessionId}, ${defId}, $1, $2,
      ${merged.temperature_c}, ${merged.humidity_pct},
      ${merged.sample_preconditioned}, $3, $4,
      $5, NOW(), NOW())
  `, {
    bind: [
      merged.sampled_by, merged.technician,
      merged.cal_valid_until, merged.env_logger_id,
      JSON.stringify(merged.extra_data || {}),
    ],
    transaction: t,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  await sequelize.authenticate();
  console.log('Connected.\n');

  const t = await sequelize.transaction();
  try {
    const D = await lookupDefs(t);
    console.log('Test definitions loaded:', Object.entries(D).map(([k,v]) => `${k}→${v}`).join(', '), '\n');

    // ══════════════════════════════════════════════════════════════════════════
    // MON-RW-001 │ Visa Classic DI v3.2 │ PHY Monitoring │ APPROVED — all pass
    // Batch: MON-2604-T01 │ April 3 2026 │ 1 card │ Inspector: Isaac
    // ══════════════════════════════════════════════════════════════════════════
    console.log('── MON-RW-001: Visa Classic DI — PHY Monitoring ──');
    const mon1Id = await createSession(t, {
      session_number:  'QCH-RW-001',
      session_type:    'Monitoring',
      card_type:       'ICC',
      batch_lot_number:'MON-2604-T01',
      cat_number:      'CAT-2026-01',
      job_name:        'Visa Classic Dual Interface v3.2 — April Batch 01',
      test_date:       '2026-04-03',
      status:          'approved',
      approved_at:     '2026-04-04 10:15:00',
      general_notes:   'Routine PHY monitoring check per weekly schedule. Card dimensions within nominal range. No anomalies observed. Laminator LAM-A. ISO 7810 compliance confirmed.',
    });
    const mon1Cards = await createCards(t, mon1Id, 1);
    const [m1c] = mon1Cards;
    // IT-PHY-001: Width 85.61 mm / Height 53.99 mm — PASS (85.48–85.72 / 53.92–54.03)
    await addEntry(t, mon1Id, D['IT-PHY-001'], m1c.id, 85.61, 53.99, true, 'W=85.61 mm H=53.99 mm — within ID-1 spec');
    // IT-PHY-002: Thickness 0.803 mm — PASS (0.76–0.84)
    await addEntry(t, mon1Id, D['IT-PHY-002'], m1c.id, 0.803, null, true, 'Outside ICM area — nominal');
    // IT-PHY-003: Corner radius 3.19 mm — PASS (3.08–3.48)
    await addEntry(t, mon1Id, D['IT-PHY-003'], m1c.id, 3.19, null, true, 'All four corners checked — uniform');
    // IT-PHY-006: Warpage 0.31 mm — PASS (≤ 1.50 mm per ISO 7810)
    await addEntry(t, mon1Id, D['IT-PHY-006'], m1c.id, 0.31, null, true, 'Card lies flat, no measurable bow');

    await addMetadata(t, mon1Id, D['IT-PHY-001'], { extra_data: { caliper_id: 'CAL-DIM-003', caliper_cal_until: '2026-09-30', measurement_tool: 'Mitutoyo 500-196-30' } });
    await addMetadata(t, mon1Id, D['IT-PHY-002'], { extra_data: { caliper_id: 'CAL-DIM-003', thickness_gauge_id: 'TG-011', measurement_points: 5 } });
    console.log(`  ✅ Session id=${mon1Id} — 1 card, 4 PHY tests — APPROVED\n`);

    // ══════════════════════════════════════════════════════════════════════════
    // MON-RW-002 │ Mastercard Standard Contact v2.1 │ CBY Monitoring │ REJECTED
    // Batch: MON-2604-T02 │ April 7 2026 │ 1 card
    // FAILURES: peel strength below 0.35 N, corner impact fail
    // ══════════════════════════════════════════════════════════════════════════
    console.log('── MON-RW-002: Mastercard Standard Contact — CBY Monitoring ──');
    const mon2Id = await createSession(t, {
      session_number:  'QCH-RW-002',
      session_type:    'Monitoring',
      card_type:       'ICC',
      batch_lot_number:'MON-2604-T02',
      cat_number:      'CAT-2026-02',
      job_name:        'Mastercard Standard Contact v2.1 — April Batch 03',
      test_date:       '2026-04-07',
      status:          'rejected',
      general_notes:   'REJECTED — Peel strength critically below minimum threshold (0.28 N vs 0.35 N min). Corner impact test failed — visible crack propagation post-test. Batch lot MON-2604-T02 quarantined. CAPA-2026-011 raised. Root cause: suspected adhesive lot variance (ADH-Lot-B112). Production hold issued.',
    });
    const mon2Cards = await createCards(t, mon2Id, 1);
    const [m2c] = mon2Cards;
    // IT-CBY-001: Peel strength between core layers 0.28 N — FAIL (< 0.35 N min)
    await addEntry(t, mon2Id, D['IT-CBY-001'], m2c.id, 0.28, null, false,
      'FAIL — Measured 0.28 N, minimum 0.35 N. Delamination initiated at 68% of spec force. Adhesive layer visually inconsistent.');
    // IT-CBY-002: Corner impact — FAIL (pass/fail test)
    await addEntry(t, mon2Id, D['IT-CBY-002'], m2c.id, null, null, false,
      'FAIL — Hairline crack 3.2 mm from corner tip observed post-impact. Card did not maintain structural integrity through full test cycle.');
    // IT-CBY-006: Card edges / edge burrs 0.04 mm — PASS (≤ 0.08 mm)
    await addEntry(t, mon2Id, D['IT-CBY-006'], m2c.id, 0.04, null, true,
      'Edge burr 0.04 mm — within 0.08 mm limit. Cut quality acceptable.');

    await addMetadata(t, mon2Id, D['IT-CBY-001'], {
      temperature_c: 23.4, humidity_pct: 52.1,
      extra_data: { peel_stand_id: 'TS-22', force_gauge_id: 'FG-14', force_gauge_cal_until: '2026-09-30', crosshead_speed_mm_min: 100, adhesive_lot: 'ADH-Lot-B112', laminator_id: 'LAM-B' }
    });
    console.log(`  ❌ Session id=${mon2Id} — 1 card, 3 CBY tests — REJECTED (peel 0.28N, corner impact fail)\n`);

    // ══════════════════════════════════════════════════════════════════════════
    // MON-RW-003 │ AMEX Blue Contactless v1.0 │ ELE Monitoring │ APPROVED
    // Batch: MON-2604-T03 │ April 9 2026 │ 1 card
    // Q-factor borderline (32) but passing; reading distance solid
    // ══════════════════════════════════════════════════════════════════════════
    console.log('── MON-RW-003: AMEX Blue Contactless — ELE Monitoring ──');
    const mon3Id = await createSession(t, {
      session_number:  'QCH-RW-003',
      session_type:    'Monitoring',
      card_type:       'PICC',
      batch_lot_number:'MON-2604-T03',
      cat_number:      'CAT-2026-03',
      job_name:        'AMEX Blue Contactless v1.0 — April Batch 02',
      test_date:       '2026-04-09',
      status:          'approved',
      approved_at:     '2026-04-09 16:30:00',
      general_notes:   'ELE monitoring — Q-factor within spec at lower acceptable margin (32 vs 30 min). Reading distance solid at 58 mm. Antenna performance consistent with previous monitoring checks. No follow-up required. Approved.',
    });
    const mon3Cards = await createCards(t, mon3Id, 1);
    const [m3c] = mon3Cards;
    // IT-ELE-001: Q-factor 32 — PASS (≥ 30 min, borderline but acceptable)
    await addEntry(t, mon3Id, D['IT-ELE-001'], m3c.id, 32.0, null, true,
      'Q-factor 32.0 — borderline but within specification (min 30). Recommend monitoring trend over next 3 batches.');
    // IT-ELE-002: Reading distance 58 mm — PASS (≥ 35 mm min)
    await addEntry(t, mon3Id, D['IT-ELE-002'], m3c.id, 58, null, true,
      'Reading distance 58 mm at NFC Forum reference reader. Nominal performance.');

    await addMetadata(t, mon3Id, D['IT-ELE-001'], {
      temperature_c: 22.8, humidity_pct: 49.6,
      extra_data: { rf_analyser_id: 'RFA-004', rf_analyser_cal_until: '2026-06-30', test_frequency_mhz: 13.56, coupling_coil_id: 'CC-A1', resonance_freq_mhz: 13.59 }
    });
    await addMetadata(t, mon3Id, D['IT-ELE-002'], {
      extra_data: { reader_id: 'NFC-REF-B', reader_cal_until: '2026-12-31', test_standard: 'ISO/IEC 14443', ambient_temp_c: 22.8 }
    });
    console.log(`  ✅ Session id=${mon3Id} — 1 card, 2 ELE tests — APPROVED (Q-factor borderline 32)\n`);

    // ══════════════════════════════════════════════════════════════════════════
    // QUA-RW-001 │ Transit NFC Card Type B v1.2 │ PHY+CBY Qualification │ REJECTED
    // Batch: QUA-2604-T01 │ April 2 2026 │ 8 cards
    // FAILURES: Card 6 thickness OOT (0.857 mm > 0.84 max); Card 3 peel delamination
    // ══════════════════════════════════════════════════════════════════════════
    console.log('── QUA-RW-001: Transit NFC Type B v1.2 — PHY+CBY Qualification (8 pcs) ──');
    const qua1Id = await createSession(t, {
      session_number:  'QCH-RW-004',
      session_type:    'Qualification',
      card_type:       'PICC',
      batch_lot_number:'QUA-2604-T01',
      cat_number:      'CAT-2026-NFC-B',
      job_name:        'Transit NFC Card Type B v1.2 — Initial Qualification',
      test_date:       '2026-04-02',
      status:          'rejected',
      general_notes:   'REJECTED — Card 6 fails IT-PHY-002 (thickness 0.857 mm exceeds 0.84 mm max). Card 3 fails IT-CBY-001 (core peel 0.31 N below 0.35 N min). Two non-conformities in 8-sample qualification; both are critical parameters. CAPA-2026-009 raised for laminator pressure calibration (LAM-C daily drift suspected). Re-qualification required after corrective action.',
    });
    const qua1Cards = await createCards(t, qua1Id, 8);

    // Thickness results — 7 pass, Card 6 (index 5) fails
    const thicknessData = [
      { val: 0.798, pass: true,  note: 'Nominal centre measurement — within 0.76–0.84 mm' },
      { val: 0.812, pass: true,  note: 'Slight upper bias — acceptable' },
      { val: 0.789, pass: true,  note: 'Lower nominal — acceptable' },
      { val: 0.804, pass: true,  note: 'Nominal — acceptable' },
      { val: 0.831, pass: true,  note: 'Upper range — still within spec' },
      { val: 0.857, pass: false, note: 'FAIL — 0.857 mm exceeds max 0.840 mm. Over-spec by 0.017 mm. Retest required.' },
      { val: 0.793, pass: true,  note: 'Nominal — acceptable' },
      { val: 0.806, pass: true,  note: 'Nominal — acceptable' },
    ];
    for (let i = 0; i < qua1Cards.length; i++) {
      const d = thicknessData[i];
      await addEntry(t, qua1Id, D['IT-PHY-002'], qua1Cards[i].id, d.val, null, d.pass, d.note);
    }

    // Width/Height results — all 8 pass
    const widthData = [
      { w: 85.59, h: 53.98 }, { w: 85.62, h: 54.00 }, { w: 85.61, h: 54.01 }, { w: 85.60, h: 53.99 },
      { w: 85.63, h: 54.02 }, { w: 85.58, h: 53.97 }, { w: 85.61, h: 54.00 }, { w: 85.60, h: 53.98 },
    ];
    for (let i = 0; i < qua1Cards.length; i++) {
      const d = widthData[i];
      await addEntry(t, qua1Id, D['IT-PHY-001'], qua1Cards[i].id, d.w, d.h, true,
        `W=${d.w} mm H=${d.h} mm — within ID-1 tolerances`);
    }

    // Core peel strength — 7 pass, Card 3 (index 2) fails
    const peelData = [
      { val: 0.48, pass: true,  note: '0.48 N — solid adhesion' },
      { val: 0.52, pass: true,  note: '0.52 N — solid adhesion' },
      { val: 0.31, pass: false, note: 'FAIL — 0.31 N below 0.35 N min. Visible partial delamination at 80% peel travel. Layer separation at core–overlay interface.' },
      { val: 0.44, pass: true,  note: '0.44 N — acceptable' },
      { val: 0.61, pass: true,  note: '0.61 N — excellent adhesion' },
      { val: 0.39, pass: true,  note: '0.39 N — acceptable' },
      { val: 0.55, pass: true,  note: '0.55 N — solid adhesion' },
      { val: 0.42, pass: true,  note: '0.42 N — acceptable' },
    ];
    for (let i = 0; i < qua1Cards.length; i++) {
      const d = peelData[i];
      await addEntry(t, qua1Id, D['IT-CBY-001'], qua1Cards[i].id, d.val, null, d.pass, d.note);
    }

    // Edge burrs — all 8 pass
    const edgeData = [0.031, 0.025, 0.042, 0.038, 0.029, 0.045, 0.033, 0.027];
    for (let i = 0; i < qua1Cards.length; i++) {
      await addEntry(t, qua1Id, D['IT-CBY-006'], qua1Cards[i].id, edgeData[i], null, true,
        `Edge burr ${edgeData[i]} mm — within 0.08 mm limit`);
    }

    await addMetadata(t, qua1Id, D['IT-PHY-002'], {
      temperature_c: 23.1, humidity_pct: 50.8,
      extra_data: { caliper_id: 'CAL-DIM-003', thickness_gauge_id: 'TG-011', laminator_id: 'LAM-C', measurement_points_per_card: 5, standard: 'ISO/IEC 10373-1 §13.2.14' }
    });
    await addMetadata(t, qua1Id, D['IT-CBY-001'], {
      extra_data: { peel_stand_id: 'TS-22', force_gauge_id: 'FG-14', crosshead_speed_mm_min: 100, adhesive_lot: 'ADH-Lot-A887', peel_angle_deg: 90 }
    });
    console.log(`  ❌ Session id=${qua1Id} — 8 cards, PHY+CBY — REJECTED (thickness OOT card 6, peel fail card 3)\n`);

    // ══════════════════════════════════════════════════════════════════════════
    // QUA-RW-002 │ Debit MC Contactless v4.0 │ ELE Qualification │ REJECTED
    // Batch: QUA-2604-T02 │ April 4 2026 │ 8 cards
    // FAILURES: Q-factor fails on cards 1,4,7 (22–27 vs ≥30 min)
    //           Reading distance fails on cards 2,5 (28–32 mm vs ≥35 min)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('── QUA-RW-002: Debit MC Contactless v4.0 — ELE Qualification (8 pcs) ──');
    const qua2Id = await createSession(t, {
      session_number:  'QCH-RW-005',
      session_type:    'Qualification',
      card_type:       'PICC',
      batch_lot_number:'QUA-2604-T02',
      cat_number:      'CAT-2026-08',
      job_name:        'Debit Mastercard Contactless v4.0 — Initial Qualification',
      test_date:       '2026-04-04',
      status:          'rejected',
      general_notes:   'REJECTED — Antenna coil out of specification. Q-factor failures on 3/8 samples (cards 1, 4, 7): measured 22–27 vs minimum 30. Reading distance failures on 2/8 samples (cards 2, 5): measured 28–32 mm vs minimum 35 mm. RF engineering notified. Root cause: antenna coil inductance 6.8 µH vs target 7.4 µH — coil winding pitch deviation in new substrate supplier batch (SUB-Lot-C204). ECN-2026-014 raised for antenna redesign. Full ELE re-qualification required.',
    });
    const qua2Cards = await createCards(t, qua2Id, 8);

    // Q-Factor — cards 1,4,7 (index 0,3,6) FAIL
    const qfactorData = [
      { val: 22.0, pass: false, note: 'FAIL — Q-factor 22.0 vs minimum 30. Below spec by 8.0. Antenna resonance severely degraded. Inductance 6.1 µH measured (target 7.4 µH).' },
      { val: 38.5, pass: true,  note: '38.5 — nominal Q-factor, good antenna performance' },
      { val: 41.2, pass: true,  note: '41.2 — above nominal, excellent resonance' },
      { val: 25.5, pass: false, note: 'FAIL — Q-factor 25.5 vs minimum 30. Below spec. Coil winding irregularity visible under magnification.' },
      { val: 35.8, pass: true,  note: '35.8 — acceptable, slight lower bias vs nominal 40' },
      { val: 43.1, pass: true,  note: '43.1 — nominal' },
      { val: 27.0, pass: false, note: 'FAIL — Q-factor 27.0 vs minimum 30. Borderline non-conformance. Short circuit between antenna turns suspected.' },
      { val: 39.4, pass: true,  note: '39.4 — nominal' },
    ];
    for (let i = 0; i < qua2Cards.length; i++) {
      const d = qfactorData[i];
      await addEntry(t, qua2Id, D['IT-ELE-001'], qua2Cards[i].id, d.val, null, d.pass, d.note);
    }

    // Reading distance — cards 2,5 (index 1,4) FAIL
    const readDistData = [
      { val: 48,  pass: true,  note: '48 mm — acceptable operating distance' },
      { val: 28,  pass: false, note: 'FAIL — 28 mm vs minimum 35 mm. Reader coupling insufficient. Consistent with low Q-factor on adjacent cards in lot.' },
      { val: 62,  pass: true,  note: '62 mm — above nominal, strong coupling' },
      { val: 55,  pass: true,  note: '55 mm — nominal' },
      { val: 32,  pass: false, note: 'FAIL — 32 mm vs minimum 35 mm. Marginal coupling. Substrate impedance mismatch suspected.' },
      { val: 67,  pass: true,  note: '67 mm — excellent range' },
      { val: 51,  pass: true,  note: '51 mm — acceptable' },
      { val: 59,  pass: true,  note: '59 mm — nominal' },
    ];
    for (let i = 0; i < qua2Cards.length; i++) {
      const d = readDistData[i];
      await addEntry(t, qua2Id, D['IT-ELE-002'], qua2Cards[i].id, d.val, null, d.pass, d.note);
    }

    await addMetadata(t, qua2Id, D['IT-ELE-001'], {
      temperature_c: 22.5, humidity_pct: 48.9,
      extra_data: { rf_analyser_id: 'RFA-004', rf_analyser_cal_until: '2026-06-30', test_frequency_mhz: 13.56, coupling_coil_id: 'CC-A1', substrate_lot: 'SUB-Lot-C204', antenna_nominal_inductance_uh: 7.4, antenna_measured_avg_uh: 6.8 }
    });
    await addMetadata(t, qua2Id, D['IT-ELE-002'], {
      extra_data: { reader_id: 'NFC-REF-B', reader_cal_until: '2026-12-31', test_standard: 'ISO/IEC 14443-2', ambient_temp_c: 22.5 }
    });
    console.log(`  ❌ Session id=${qua2Id} — 8 cards, ELE — REJECTED (Q-factor 3/8 fail, reading distance 2/8 fail)\n`);

    // ══════════════════════════════════════════════════════════════════════════
    // QUA-RW-003 │ Debit MC Contactless v4.0 RE-QUAL │ ELE │ SUBMITTED
    // Batch: QUA-2604-T02R │ April 10 2026 │ 8 cards
    // Following ECN-2026-014 antenna redesign — all pass
    // ══════════════════════════════════════════════════════════════════════════
    console.log('── QUA-RW-003: Debit MC Contactless v4.0 — ELE Re-Qualification (8 pcs) ──');
    const qua3Id = await createSession(t, {
      session_number:  'QCH-RW-006',
      session_type:    'Qualification',
      card_type:       'PICC',
      batch_lot_number:'QUA-2604-T02R',
      cat_number:      'CAT-2026-08',
      job_name:        'Debit Mastercard Contactless v4.0 — ELE Re-Qualification (post ECN-2026-014)',
      test_date:       '2026-04-10',
      status:          'submitted',
      general_notes:   'Re-qualification following antenna coil redesign per ECN-2026-014. Antenna inductance increased to 7.5 µH (target 7.4 µH ±0.3) via pitch correction on new substrate lot SUB-Lot-D001. All 8 samples pass Q-factor and reading distance. Awaiting QA manager approval.',
    });
    const qua3Cards = await createCards(t, qua3Id, 8);

    // Q-Factor — all 8 PASS (post-redesign, tighter distribution)
    const qfactorRequalData = [
      { val: 38.2, note: '38.2 — nominal, inductance 7.5 µH measured' },
      { val: 41.7, note: '41.7 — above nominal, excellent resonance' },
      { val: 39.5, note: '39.5 — nominal' },
      { val: 42.3, note: '42.3 — strong performance' },
      { val: 37.8, note: '37.8 — lower nominal, acceptable' },
      { val: 44.1, note: '44.1 — excellent' },
      { val: 40.6, note: '40.6 — nominal, within 5% of target 42' },
      { val: 38.9, note: '38.9 — nominal' },
    ];
    for (let i = 0; i < qua3Cards.length; i++) {
      const d = qfactorRequalData[i];
      await addEntry(t, qua3Id, D['IT-ELE-001'], qua3Cards[i].id, d.val, null, true, d.note);
    }

    // Reading distance — all 8 PASS
    const readDistRequalData = [
      { val: 54,  note: '54 mm — nominal coupling, improved from prior batch' },
      { val: 61,  note: '61 mm — good range' },
      { val: 58,  note: '58 mm — nominal' },
      { val: 63,  note: '63 mm — strong coupling' },
      { val: 49,  note: '49 mm — lower nominal, within spec' },
      { val: 68,  note: '68 mm — excellent range' },
      { val: 55,  note: '55 mm — nominal' },
      { val: 57,  note: '57 mm — nominal' },
    ];
    for (let i = 0; i < qua3Cards.length; i++) {
      const d = readDistRequalData[i];
      await addEntry(t, qua3Id, D['IT-ELE-002'], qua3Cards[i].id, d.val, null, true, d.note);
    }

    await addMetadata(t, qua3Id, D['IT-ELE-001'], {
      temperature_c: 23.2, humidity_pct: 50.4,
      extra_data: { rf_analyser_id: 'RFA-004', rf_analyser_cal_until: '2026-06-30', test_frequency_mhz: 13.56, coupling_coil_id: 'CC-A1', substrate_lot: 'SUB-Lot-D001', antenna_nominal_inductance_uh: 7.4, antenna_measured_avg_uh: 7.5, ecn_reference: 'ECN-2026-014', prior_rejection: 'QCH-RW-005' }
    });
    await addMetadata(t, qua3Id, D['IT-ELE-002'], {
      extra_data: { reader_id: 'NFC-REF-B', reader_cal_until: '2026-12-31', test_standard: 'ISO/IEC 14443-2', ecn_reference: 'ECN-2026-014' }
    });
    console.log(`  ✅ Session id=${qua3Id} — 8 cards, ELE re-qual — SUBMITTED (all pass, awaiting approval)\n`);

    // ─── Commit ──────────────────────────────────────────────────────────────
    await t.commit();

    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ Real-world sessions seeded successfully\n');
    console.log('  Session           Type            Status    Outcome');
    console.log('  ─────────────────────────────────────────────────────────────');
    console.log(`  QCH-RW-001 (${mon1Id})  Monitoring/PHY  APPROVED  4 tests / 4 pass`);
    console.log(`  QCH-RW-002 (${mon2Id})  Monitoring/CBY  REJECTED  3 tests / 1 pass, 2 FAIL`);
    console.log(`  QCH-RW-003 (${mon3Id})  Monitoring/ELE  APPROVED  2 tests / 2 pass (Q borderline)`);
    console.log(`  QCH-RW-004 (${qua1Id})  Qual/PHY+CBY    REJECTED  32 entries / 2 FAIL (thickness OOT, peel low)`);
    console.log(`  QCH-RW-005 (${qua2Id})  Qual/ELE        REJECTED  16 entries / 5 FAIL (3 Q-factor, 2 read dist)`);
    console.log(`  QCH-RW-006 (${qua3Id})  Qual/ELE re-q.  SUBMITTED 16 entries / 16 pass`);
    console.log('════════════════════════════════════════════════════════════════');

  } catch (err) {
    await t.rollback();
    console.error('\n❌ Seed failed:', err.message);
    if (err.message.includes('Missing test definitions')) {
      console.error('   → Run: cd backend && node seed-internal-tests.js');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
