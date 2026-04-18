/**
 * seed-demo-data.js
 * Generates 5 months of realistic card production test data (Jan–May 2026)
 * Simulates Monitoring + Qualification sessions across PHY, CBY, ELE, ICC-REQ categories
 * Includes realistic failure/re-qualification flows and multi-product qualification pipeline
 * Run: cd backend && node seed-demo-data.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, TestSession, TestEntry, TestDefinition, TestCategory, SampleCard, sequelize } = require('./models');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min, max, dp = 2) {
  return Math.round((Math.random() * (max - min) + min) * 10 ** dp) / 10 ** dp;
}

function offsetDate(baseStr, days, hours = 8) {
  const d = new Date(baseStr);
  d.setDate(d.getDate() + days);
  d.setHours(hours, rand(0, 59, 0), 0, 0);
  return d;
}

function sessionNumber(seq) {
  return `QCH-2026-${String(seq).padStart(3, '0')}`;
}

// Generate realistic measurement value + pass status per test definition id
function genEntry(defId, failChance) {
  const fail = Math.random() < failChance;

  const specs = {
    33: { target: 0.80, spread: 0.018, min: 0.76, max: 0.84, dp: 3 },          // IT-PHY-002 Thickness mm
    32: { target: 85.60, spread: 0.045, min: 85.48, max: 85.72, dp: 2,          // IT-PHY-001 Width mm
          secondary: { target: 53.98, spread: 0.022, min: 53.92, max: 54.03 } },
    34: { target: 3.18, spread: 0.08, min: 3.08, max: 3.48, dp: 2 },            // IT-PHY-003 Corners mm
    35: { target: 0.84, spread: 0.025, min: 0.76, max: 0.92, dp: 3 },           // IT-PHY-004 Thickness add-on mm
    29: { target: 0.035, spread: 0.012, min: 0.005, max: 0.079, dp: 3 },        // #3006# Edge burrs mm (pass if ≤ 0.08)
    30: { target: 1.2,   spread: 0.28, min: 0.42, max: 1.95, dp: 2,             // #3008# Peel strength N (pass if ≥ 0.35)
          passIfAbove: 0.35 },
    31: { target: 10.5,  spread: 2.1,  min: 5.8,  max: 14.8, dp: 1,             // #3015# Overlay peel N (pass if ≥ 5.0)
          passIfAbove: 5.0 },
    49: { target: 35,    spread: 5,    min: 22,   max: 48,   dp: 1 },            // IT-ELE-001 Q-factor
    50: { target: 55,    spread: 9,    min: 35,   max: 72,   dp: 0 },            // IT-ELE-002 Reading distance mm
  };

  const spec = specs[defId];
  if (!spec) {
    // Pass/fail test
    return { measurement_value: null, secondary_measurement_value: null, pass_status: !fail };
  }

  let value, passStatus;
  const dp = spec.dp ?? 2;

  if (fail) {
    if (spec.passIfAbove !== undefined) {
      value = rand(spec.min * 0.4, spec.passIfAbove * 0.88, dp);
    } else {
      const side = Math.random() > 0.5;
      value = side
        ? rand(spec.max + spec.spread * 0.6, spec.max + spec.spread * 2.5, dp)
        : rand(spec.min - spec.spread * 2.5, spec.min - spec.spread * 0.6, dp);
    }
    passStatus = false;
  } else {
    const bias = (Math.random() - 0.5) * 2 * spec.spread;
    value = spec.target + bias;
    // Clamp firmly inside spec
    if (spec.passIfAbove !== undefined) {
      value = Math.max(spec.passIfAbove + 0.05, value);
    } else {
      value = Math.max(spec.min + 0.002, Math.min(spec.max - 0.002, value));
    }
    value = Math.round(value * 10 ** dp) / 10 ** dp;
    passStatus = true;
  }

  const result = { measurement_value: value, secondary_measurement_value: null, pass_status: passStatus };
  if (spec.secondary && passStatus) {
    const b = (Math.random() - 0.5) * 2 * spec.secondary.spread;
    result.secondary_measurement_value = Math.round(
      Math.max(spec.secondary.min + 0.001, Math.min(spec.secondary.max - 0.001, spec.secondary.target + b)) * 1000
    ) / 1000;
  }
  return result;
}

// ─── Session Definitions ──────────────────────────────────────────────────────
//
// Product catalogue (CAT numbers):
//   CAT-2026-01  Visa Classic Dual Interface v3.2
//   CAT-2026-02  Mastercard Standard Contact v2.1
//   CAT-2026-03  AMEX Blue Contactless v1.0
//   CAT-2026-04  National ID Card Type A v1.0
//   CAT-2026-05  Prepaid Visa Chip v1.5
//   CAT-2026-06  Transit NFC Card Type A v1.0
//   CAT-2026-07  Corporate Badge RFID v3.1
//   CAT-2026-08  Debit Mastercard Contactless v4.0
//   CAT-2026-09  National ID Card Type B v1.0
//   CAT-2026-10  Visa Infinite Contactless v1.0
//   CAT-2026-11  Prepaid Mastercard v2.2
//   CAT-2026-12  Loyalty Card RFID v1.0
//   CAT-2026-13  Visa Classic DI v3.3 (Spec Rev.)
//   CAT-2026-14  National Bank Premium Credit v1.0
//
// Qualification failure / re-qualification threads:
//   QUA-2601-003   Prepaid Visa Chip v1.5  → FAIL (Jan) → PASS re-qual (Feb)
//   QUA-2602-002   Transit NFC Type A       → FAIL ELE (Feb) → PASS re-qual (Mar)
//   QUA-2603-002   Corporate Badge RFID     → FAIL PHY (Mar) → PASS re-qual (Apr)
//   QUA-2604-001   National ID Type B       → FAIL PHY (Apr) → re-qual submitted (Apr)
//   QUA-2605-001   Loyalty Card RFID        → FAIL CBY (May) → re-qual submitted (May)

const SESSION_PLAN = [

  // ══════════════════════════════════════════════════════════════════════════
  // JANUARY 2026
  // ══════════════════════════════════════════════════════════════════════════

  // ── Visa Classic DI v3.2 — Full Qualification (2-day) ──
  { date:'2026-01-06', type:'Qualification', batch:'QUA-2601-001', job:'Visa Classic Dual Interface v3.2',
    cat:'CAT-2026-01', cardType:'ICC',     inspector:'Isaac',
    cats:['PHY','CBY'],       sampleCount:8, status:'approved',
    submitOffset:1,  approveOffset:2,  failRates:{PHY:0.01,CBY:0.02} },
  { date:'2026-01-07', type:'Qualification', batch:'QUA-2601-001', job:'Visa Classic Dual Interface v3.2',
    cat:'CAT-2026-01', cardType:'ICC',     inspector:'Dayjuh',
    cats:['ICC-REQ','ELE'],   sampleCount:8, status:'approved',
    submitOffset:1,  approveOffset:2,  failRates:{'ICC-REQ':0.01,ELE:0.01} },

  // ── Monitoring — Visa Classic DI ──
  { date:'2026-01-09', type:'Monitoring', batch:'MON-2601-001', job:'Visa Classic DI — Batch 001',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Frankie',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-01-12', type:'Monitoring', batch:'MON-2601-002', job:'Visa Classic DI — Batch 002',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Chloe',
    cats:['CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{CBY:0.00} },

  // ── Mastercard Standard Contact v2.1 — Full Qualification (2-day) ──
  { date:'2026-01-13', type:'Qualification', batch:'QUA-2601-002', job:'Mastercard Standard Contact v2.1',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Dayjuh',
    cats:['PHY','CBY'],       sampleCount:8, status:'approved',
    submitOffset:1,  approveOffset:2,  failRates:{PHY:0.02,CBY:0.03} },
  { date:'2026-01-14', type:'Qualification', batch:'QUA-2601-002', job:'Mastercard Standard Contact v2.1',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Frankie',
    cats:['ICC-REQ','ELE'],   sampleCount:8, status:'approved',
    submitOffset:1,  approveOffset:2,  failRates:{'ICC-REQ':0.01,ELE:0.02} },

  // ── Monitoring — Visa Classic DI (continued) ──
  { date:'2026-01-14', type:'Monitoring', batch:'MON-2601-003', job:'Visa Classic DI — Batch 003',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Isaac',
    cats:['PHY','CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,CBY:0.00} },
  { date:'2026-01-16', type:'Monitoring', batch:'MON-2601-004', job:'Visa Classic DI — Batch 004',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Dayjuh',
    cats:['CBY'], sampleCount:1, status:'rejected', submitOffset:0, approveOffset:1, failRates:{CBY:0.60},
    notes:'REJECTED — Multiple peel strength failures below minimum threshold (0.35 N). Batch quarantined pending root cause analysis.' },

  // ── Prepaid Visa Chip v1.5 — 1st Qualification Attempt → FAIL ──
  { date:'2026-01-20', type:'Qualification', batch:'QUA-2601-003', job:'Prepaid Visa Chip v1.5',
    cat:'CAT-2026-05', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'rejected',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.30,CBY:0.50},
    notes:'REJECTED — Excessive laminate delamination on 4/8 samples (CBY). Card body thickness variation exceeds ±0.02 mm tolerance on 3/8 samples (PHY). Corrective action required before re-qualification. CAPA-2026-003 raised.' },
  { date:'2026-01-21', type:'Qualification', batch:'QUA-2601-003', job:'Prepaid Visa Chip v1.5',
    cat:'CAT-2026-05', cardType:'ICC', inspector:'Isaac',
    cats:['ELE'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{ELE:0.05} },

  // ── Monitoring (mid-Jan) ──
  { date:'2026-01-19', type:'Monitoring', batch:'MON-2601-005', job:'Visa Classic DI — Batch 005',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Frankie',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-01-21', type:'Monitoring', batch:'MON-2601-006', job:'Visa Classic DI — Batch 006',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:2, failRates:{PHY:0.00,CBY:0.05} },
  { date:'2026-01-23', type:'Monitoring', batch:'MON-2601-007', job:'Visa Classic DI — Batch 007',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Isaac',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-01-28', type:'Monitoring', batch:'MON-2601-008', job:'MC Standard Contact — Batch 001',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Frankie',
    cats:['CBY'], sampleCount:1, status:'rejected', submitOffset:0, approveOffset:1, failRates:{CBY:0.70},
    notes:'REJECTED — Corner impact test failed on 3 of 4 samples. Structural integrity concern. Escalated to production engineering.' },
  { date:'2026-01-30', type:'Monitoring', batch:'MON-2601-009', job:'MC Standard Contact — Batch 002',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','ELE'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,ELE:0.00} },

  // ══════════════════════════════════════════════════════════════════════════
  // FEBRUARY 2026
  // ══════════════════════════════════════════════════════════════════════════

  { date:'2026-02-03', type:'Monitoring', batch:'MON-2602-001', job:'Visa Classic DI — Batch 008',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Isaac',
    cats:['PHY','CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,CBY:0.00} },

  // ── Prepaid Visa Chip v1.5 — Re-qualification after CAPA-2026-003 ──
  { date:'2026-02-04', type:'Qualification', batch:'QUA-2601-003R', job:'Prepaid Visa Chip v1.5 [Re-qual]',
    cat:'CAT-2026-05', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.01,CBY:0.02},
    notes:'Re-qualification following corrective action on lamination press temperature profile (CAPA-2026-003). All PHY and CBY results within specification. Approved.' },
  { date:'2026-02-05', type:'Qualification', batch:'QUA-2601-003R', job:'Prepaid Visa Chip v1.5 [Re-qual]',
    cat:'CAT-2026-05', cardType:'ICC', inspector:'Isaac',
    cats:['ICC-REQ','ELE'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:1, failRates:{'ICC-REQ':0.00,ELE:0.01} },

  { date:'2026-02-05', type:'Monitoring', batch:'MON-2602-002', job:'MC Standard Contact — Batch 003',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Dayjuh',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-02-07', type:'Monitoring', batch:'MON-2602-003', job:'Visa Classic DI — Batch 009',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Frankie',
    cats:['CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:3, failRates:{CBY:0.04} },

  // ── Transit NFC Card Type A v1.0 — 1st Qualification Attempt → FAIL ELE ──
  { date:'2026-02-09', type:'Qualification', batch:'QUA-2602-002', job:'Transit NFC Card Type A v1.0',
    cat:'CAT-2026-06', cardType:'PICC', inspector:'Dayjuh',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.02,CBY:0.02} },
  { date:'2026-02-10', type:'Qualification', batch:'QUA-2602-002', job:'Transit NFC Card Type A v1.0',
    cat:'CAT-2026-06', cardType:'PICC', inspector:'Isaac',
    cats:['ELE','ICC-REQ'], sampleCount:8, status:'rejected',
    submitOffset:1, approveOffset:2, failRates:{ELE:0.55,'ICC-REQ':0.30},
    notes:'REJECTED — Q-factor 22–28 on 5/8 samples, below minimum of 30 (ELE). Reading distance <35 mm on 3/8 samples. Antenna tuning non-conforming. Referred to RF engineering for antenna coil redesign (ECN-2026-007).' },

  { date:'2026-02-10', type:'Monitoring', batch:'MON-2602-004', job:'Visa Classic DI — Batch 010',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,CBY:0.00} },
  { date:'2026-02-12', type:'Monitoring', batch:'MON-2602-005', job:'MC Standard Contact — Batch 004',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Isaac',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-02-14', type:'Monitoring', batch:'MON-2602-006', job:'Visa Classic DI — Batch 011',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Dayjuh',
    cats:['CBY'], sampleCount:1, status:'rejected', submitOffset:0, approveOffset:1, failRates:{CBY:0.55},
    notes:'REJECTED — Solidity/adhesion blocking test failed. Laminate separation detected under heat & humidity exposure. Root cause: adhesive lot variance.' },

  // ── AMEX Blue Contactless v1.0 — Full Qualification (2-day) ──
  { date:'2026-02-17', type:'Qualification', batch:'QUA-2602-001', job:'AMEX Blue Contactless v1.0',
    cat:'CAT-2026-03', cardType:'PICC', inspector:'Dayjuh',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.01,CBY:0.02} },
  { date:'2026-02-18', type:'Qualification', batch:'QUA-2602-001', job:'AMEX Blue Contactless v1.0',
    cat:'CAT-2026-03', cardType:'PICC', inspector:'Frankie',
    cats:['ELE','ICC-REQ'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{ELE:0.01,'ICC-REQ':0.01} },

  { date:'2026-02-18', type:'Monitoring', batch:'MON-2602-007', job:'Visa Classic DI — Batch 012',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Frankie',
    cats:['PHY','ELE'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,ELE:0.00} },
  { date:'2026-02-19', type:'Monitoring', batch:'MON-2602-008', job:'MC Standard Contact — Batch 005',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Chloe',
    cats:['CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:2, failRates:{CBY:0.00} },
  { date:'2026-02-21', type:'Monitoring', batch:'MON-2602-009', job:'Visa Classic DI — Batch 013',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Isaac',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:3, failRates:{PHY:0.00} },
  { date:'2026-02-26', type:'Monitoring', batch:'MON-2602-010', job:'AMEX Blue Contactless — Batch 001',
    cat:'CAT-2026-03', cardType:'PICC', inspector:'Frankie',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-02-28', type:'Monitoring', batch:'MON-2602-011', job:'MC Standard Contact — Batch 006',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Chloe',
    cats:['CBY'], sampleCount:1, status:'submitted', submitOffset:1, approveOffset:null, failRates:{CBY:0.00} },

  // ══════════════════════════════════════════════════════════════════════════
  // MARCH 2026
  // ══════════════════════════════════════════════════════════════════════════

  // ── Transit NFC Card Type A — Re-qualification after antenna redesign ──
  { date:'2026-03-01', type:'Qualification', batch:'QUA-2602-002R', job:'Transit NFC Card Type A v1.0 [Re-qual]',
    cat:'CAT-2026-06', cardType:'PICC', inspector:'Isaac',
    cats:['ELE','ICC-REQ'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{ELE:0.01,'ICC-REQ':0.01},
    notes:'Re-qualification following antenna coil redesign (ECN-2026-007). Q-factor 32–41 on all 8 samples. Reading distance 48–67 mm. All results within specification. Full qualification approved.' },

  { date:'2026-03-03', type:'Monitoring', batch:'MON-2603-001', job:'Visa Classic DI — Batch 014',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Isaac',
    cats:['PHY','CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:2, failRates:{PHY:0.00,CBY:0.00} },
  { date:'2026-03-05', type:'Monitoring', batch:'MON-2603-002', job:'AMEX Blue Contactless — Batch 002',
    cat:'CAT-2026-03', cardType:'PICC', inspector:'Dayjuh',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-03-07', type:'Monitoring', batch:'MON-2603-003', job:'MC Standard Contact — Batch 007',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Frankie',
    cats:['CBY'], sampleCount:1, status:'rejected', submitOffset:0, approveOffset:1, failRates:{CBY:0.60},
    notes:'REJECTED — ICM adhesion failure. Module lift detected on 2 samples. Possible contamination on bonding surface. Batch held pending investigation.' },

  // ── Corporate Badge RFID v3.1 — 1st Qualification Attempt → FAIL PHY ──
  { date:'2026-03-09', type:'Qualification', batch:'QUA-2603-002', job:'Corporate Badge RFID v3.1',
    cat:'CAT-2026-07', cardType:'PICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'rejected',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.45,CBY:0.08},
    notes:'REJECTED — Card thickness 0.83–0.86 mm on 4/8 samples, exceeds maximum 0.84 mm (PHY). Root cause: substrate lot out of specification. Supplier NCR-2026-011 raised. Corrective substrate lot requested.' },
  { date:'2026-03-10', type:'Qualification', batch:'QUA-2603-002', job:'Corporate Badge RFID v3.1',
    cat:'CAT-2026-07', cardType:'PICC', inspector:'Isaac',
    cats:['ELE'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{ELE:0.03} },

  { date:'2026-03-10', type:'Monitoring', batch:'MON-2603-004', job:'Visa Classic DI — Batch 015',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','ELE'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:2, failRates:{PHY:0.00,ELE:0.00} },

  // ── Debit Mastercard Contactless v4.0 — Full Qualification (2-day) ──
  { date:'2026-03-12', type:'Qualification', batch:'QUA-2603-003', job:'Debit Mastercard Contactless v4.0',
    cat:'CAT-2026-08', cardType:'PICC', inspector:'Dayjuh',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.01,CBY:0.03} },
  { date:'2026-03-13', type:'Qualification', batch:'QUA-2603-003', job:'Debit Mastercard Contactless v4.0',
    cat:'CAT-2026-08', cardType:'PICC', inspector:'Frankie',
    cats:['ICC-REQ','ELE'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{'ICC-REQ':0.01,ELE:0.02} },

  { date:'2026-03-17', type:'Monitoring', batch:'MON-2603-005', job:'AMEX Blue Contactless — Batch 003',
    cat:'CAT-2026-03', cardType:'PICC', inspector:'Isaac',
    cats:['PHY'], sampleCount:1, status:'submitted', submitOffset:1, approveOffset:null, failRates:{PHY:0.00} },
  { date:'2026-03-19', type:'Monitoring', batch:'MON-2603-006', job:'Visa Classic DI — Batch 016',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Dayjuh',
    cats:['CBY'], sampleCount:1, status:'submitted', submitOffset:1, approveOffset:null, failRates:{CBY:0.00} },
  { date:'2026-03-24', type:'Monitoring', batch:'MON-2603-007', job:'MC Standard Contact — Batch 008',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Frankie',
    cats:['PHY','CBY'], sampleCount:1, status:'submitted', submitOffset:1, approveOffset:null, failRates:{PHY:0.00,CBY:0.00} },

  // ── National ID Card Type A v1.0 — Full Qualification ──
  { date:'2026-03-28', type:'Qualification', batch:'QUA-2603-001', job:'National ID Card Type A v1.0',
    cat:'CAT-2026-04', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','CBY','ICC-REQ'], sampleCount:8, status:'submitted',
    submitOffset:1, approveOffset:null, failRates:{PHY:0.01,CBY:0.02,'ICC-REQ':0.01} },

  // ══════════════════════════════════════════════════════════════════════════
  // APRIL 2026
  // ══════════════════════════════════════════════════════════════════════════

  // ── Corporate Badge RFID v3.1 — Re-qualification with conforming substrate ──
  { date:'2026-04-01', type:'Qualification', batch:'QUA-2603-002R', job:'Corporate Badge RFID v3.1 [Re-qual]',
    cat:'CAT-2026-07', cardType:'PICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.01,CBY:0.02},
    notes:'Re-qualification with conforming substrate lot (supplier corrective action verified per NCR-2026-011). Thickness 0.795–0.803 mm on all 8 samples. Approved.' },
  { date:'2026-04-02', type:'Qualification', batch:'QUA-2603-002R', job:'Corporate Badge RFID v3.1 [Re-qual]',
    cat:'CAT-2026-07', cardType:'PICC', inspector:'Isaac',
    cats:['ELE','ICC-REQ'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{ELE:0.01,'ICC-REQ':0.01} },

  { date:'2026-04-04', type:'Monitoring', batch:'MON-2604-001', job:'Visa Classic DI — Batch 017',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Frankie',
    cats:['PHY','CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,CBY:0.00} },
  { date:'2026-04-07', type:'Monitoring', batch:'MON-2604-002', job:'MC Standard Contact — Batch 009',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Chloe',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },

  // ── National ID Card Type B v1.0 — 1st Qualification Attempt → FAIL PHY (warpage) ──
  { date:'2026-04-08', type:'Qualification', batch:'QUA-2604-001', job:'National ID Card Type B v1.0',
    cat:'CAT-2026-09', cardType:'ICC', inspector:'Dayjuh',
    cats:['PHY','CBY'], sampleCount:8, status:'rejected',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.50,CBY:0.06},
    notes:'REJECTED — Warpage 1.8–2.2 mm on 5/8 samples, exceeds maximum 1.5 mm (PHY). Suspected cause: inadequate cooling dwell time during lamination. CAPA-2026-009 raised. Production engineering to review press cycle parameters.' },
  { date:'2026-04-09', type:'Qualification', batch:'QUA-2604-001', job:'National ID Card Type B v1.0',
    cat:'CAT-2026-09', cardType:'ICC', inspector:'Frankie',
    cats:['ICC-REQ'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:1, failRates:{'ICC-REQ':0.02} },

  { date:'2026-04-11', type:'Monitoring', batch:'MON-2604-003', job:'AMEX Blue Contactless — Batch 004',
    cat:'CAT-2026-03', cardType:'PICC', inspector:'Isaac',
    cats:['PHY','ELE'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,ELE:0.00} },

  // ── Visa Infinite Contactless v1.0 — Full Qualification (2-day) ──
  { date:'2026-04-14', type:'Qualification', batch:'QUA-2604-002', job:'Visa Infinite Contactless v1.0',
    cat:'CAT-2026-10', cardType:'PICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.01,CBY:0.01} },
  { date:'2026-04-15', type:'Qualification', batch:'QUA-2604-002', job:'Visa Infinite Contactless v1.0',
    cat:'CAT-2026-10', cardType:'PICC', inspector:'Dayjuh',
    cats:['ELE','ICC-REQ'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{ELE:0.02,'ICC-REQ':0.01} },

  { date:'2026-04-18', type:'Monitoring', batch:'MON-2604-004', job:'Visa Classic DI — Batch 018',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Frankie',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-04-21', type:'Monitoring', batch:'MON-2604-005', job:'Debit MC Contactless — Batch 001',
    cat:'CAT-2026-08', cardType:'PICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,CBY:0.00} },

  // ── Prepaid Mastercard v2.2 — Full Qualification (2-day) ──
  { date:'2026-04-22', type:'Qualification', batch:'QUA-2604-003', job:'Prepaid Mastercard v2.2',
    cat:'CAT-2026-11', cardType:'ICC', inspector:'Isaac',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.02,CBY:0.03} },
  { date:'2026-04-23', type:'Qualification', batch:'QUA-2604-003', job:'Prepaid Mastercard v2.2',
    cat:'CAT-2026-11', cardType:'ICC', inspector:'Dayjuh',
    cats:['ICC-REQ','ELE'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{'ICC-REQ':0.01,ELE:0.01} },

  { date:'2026-04-25', type:'Monitoring', batch:'MON-2604-006', job:'MC Standard Contact — Batch 010',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Frankie',
    cats:['CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{CBY:0.00} },
  { date:'2026-04-26', type:'Monitoring', batch:'MON-2604-007', job:'Transit NFC — Batch 001',
    cat:'CAT-2026-06', cardType:'PICC', inspector:'Chloe',
    cats:['PHY','ELE'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:2, failRates:{PHY:0.00,ELE:0.00} },

  // ── National ID Type B — Re-qualification after CAPA-2026-009 ──
  { date:'2026-04-28', type:'Qualification', batch:'QUA-2604-001R', job:'National ID Card Type B v1.0 [Re-qual]',
    cat:'CAT-2026-09', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'submitted',
    submitOffset:1, approveOffset:null, failRates:{PHY:0.02,CBY:0.02},
    notes:'Re-qualification following lamination press cycle parameter update (CAPA-2026-009). Warpage 0.4–0.8 mm on all 8 samples — well within 1.5 mm spec. Awaiting QA manager sign-off.' },
  { date:'2026-04-29', type:'Qualification', batch:'QUA-2604-001R', job:'National ID Card Type B v1.0 [Re-qual]',
    cat:'CAT-2026-09', cardType:'ICC', inspector:'Isaac',
    cats:['ICC-REQ','ELE'], sampleCount:8, status:'submitted',
    submitOffset:1, approveOffset:null, failRates:{'ICC-REQ':0.01,ELE:0.01} },

  // ══════════════════════════════════════════════════════════════════════════
  // MAY 2026
  // ══════════════════════════════════════════════════════════════════════════

  { date:'2026-05-02', type:'Monitoring', batch:'MON-2605-001', job:'Visa Classic DI — Batch 019',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Frankie',
    cats:['CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{CBY:0.00} },
  { date:'2026-05-04', type:'Monitoring', batch:'MON-2605-002', job:'Corporate Badge RFID — Batch 001',
    cat:'CAT-2026-07', cardType:'PICC', inspector:'Dayjuh',
    cats:['PHY','ELE'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,ELE:0.00} },

  // ── Loyalty Card RFID v1.0 — 1st Qualification Attempt → FAIL CBY (peel) ──
  { date:'2026-05-05', type:'Qualification', batch:'QUA-2605-001', job:'Loyalty Card RFID v1.0',
    cat:'CAT-2026-12', cardType:'PICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'rejected',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.04,CBY:0.60},
    notes:'REJECTED — Peel strength 0.18–0.28 N on 6/8 samples, minimum spec 0.35 N (CBY). Overlay adhesive non-conforming. NCR-2026-014 raised against adhesive supplier lot 26-ADH-089. Production hold on all cards using this lot.' },
  { date:'2026-05-06', type:'Qualification', batch:'QUA-2605-001', job:'Loyalty Card RFID v1.0',
    cat:'CAT-2026-12', cardType:'PICC', inspector:'Isaac',
    cats:['ELE'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:1, failRates:{ELE:0.03} },

  { date:'2026-05-09', type:'Monitoring', batch:'MON-2605-003', job:'AMEX Blue Contactless — Batch 005',
    cat:'CAT-2026-03', cardType:'PICC', inspector:'Frankie',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },

  // ── Visa Classic DI v3.3 (Spec Revision) — Full Qualification (2-day) ──
  { date:'2026-05-12', type:'Qualification', batch:'QUA-2605-002', job:'Visa Classic DI v3.3 (Spec Rev.)',
    cat:'CAT-2026-13', cardType:'ICC', inspector:'Isaac',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.01,CBY:0.02} },
  { date:'2026-05-13', type:'Qualification', batch:'QUA-2605-002', job:'Visa Classic DI v3.3 (Spec Rev.)',
    cat:'CAT-2026-13', cardType:'ICC', inspector:'Chloe',
    cats:['ICC-REQ','ELE'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{'ICC-REQ':0.01,ELE:0.01} },

  { date:'2026-05-14', type:'Monitoring', batch:'MON-2605-004', job:'Prepaid Mastercard — Batch 001',
    cat:'CAT-2026-11', cardType:'ICC', inspector:'Dayjuh',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },
  { date:'2026-05-16', type:'Monitoring', batch:'MON-2605-005', job:'Debit MC Contactless — Batch 002',
    cat:'CAT-2026-08', cardType:'PICC', inspector:'Frankie',
    cats:['CBY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{CBY:0.00} },

  // ── Loyalty Card RFID — Re-qualification with approved adhesive lot ──
  { date:'2026-05-19', type:'Qualification', batch:'QUA-2605-001R', job:'Loyalty Card RFID v1.0 [Re-qual]',
    cat:'CAT-2026-12', cardType:'PICC', inspector:'Dayjuh',
    cats:['PHY','CBY'], sampleCount:8, status:'approved',
    submitOffset:1, approveOffset:2, failRates:{PHY:0.01,CBY:0.02},
    notes:'Re-qualification with approved adhesive lot 26-ADH-112 (NCR-2026-014 closed). Peel strength 0.92–1.38 N on all 8 samples. Well within spec. PASS.' },
  { date:'2026-05-20', type:'Qualification', batch:'QUA-2605-001R', job:'Loyalty Card RFID v1.0 [Re-qual]',
    cat:'CAT-2026-12', cardType:'PICC', inspector:'Isaac',
    cats:['ELE','ICC-REQ'], sampleCount:8, status:'submitted',
    submitOffset:1, approveOffset:null, failRates:{ELE:0.01,'ICC-REQ':0.01} },

  { date:'2026-05-22', type:'Monitoring', batch:'MON-2605-006', job:'Visa Infinite Contactless — Batch 001',
    cat:'CAT-2026-10', cardType:'PICC', inspector:'Chloe',
    cats:['PHY','ELE'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00,ELE:0.00} },
  { date:'2026-05-24', type:'Monitoring', batch:'MON-2605-007', job:'MC Standard Contact — Batch 011',
    cat:'CAT-2026-02', cardType:'ICC', inspector:'Frankie',
    cats:['PHY'], sampleCount:1, status:'approved', submitOffset:1, approveOffset:1, failRates:{PHY:0.00} },

  // ── National Bank Premium Credit v1.0 — New Product Qualification ──
  { date:'2026-05-26', type:'Qualification', batch:'QUA-2605-003', job:'National Bank Premium Credit v1.0',
    cat:'CAT-2026-14', cardType:'ICC', inspector:'Chloe',
    cats:['PHY','CBY'], sampleCount:8, status:'submitted',
    submitOffset:1, approveOffset:null, failRates:{PHY:0.02,CBY:0.03} },
  { date:'2026-05-27', type:'Qualification', batch:'QUA-2605-003', job:'National Bank Premium Credit v1.0',
    cat:'CAT-2026-14', cardType:'ICC', inspector:'Dayjuh',
    cats:['ICC-REQ','ELE'], sampleCount:8, status:'submitted',
    submitOffset:1, approveOffset:null, failRates:{'ICC-REQ':0.02,ELE:0.02} },

  { date:'2026-05-29', type:'Monitoring', batch:'MON-2605-008', job:'Visa Classic DI — Batch 020',
    cat:'CAT-2026-01', cardType:'ICC', inspector:'Isaac',
    cats:['PHY','CBY'], sampleCount:1, status:'submitted', submitOffset:1, approveOffset:null, failRates:{PHY:0.00,CBY:0.00} },
];

// ─── Category subset for monitoring sessions ──────────────────────────────────
const MONITORING_TESTS = {
  PHY:       [33, 32, 34, 13],
  CBY:       [29, 30, 28, 39],
  ELE:       [49, 50],
  ENV:       [19],
  'ICC-REQ': [14, 15, 16, 22, 41, 42, 44, 48],
};

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting demo data seed (5 months: Jan–May 2026)...\n');

  // ── 0. Wipe existing demo data ───────────────────────────────────────────────
  console.log('🗑️  Clearing existing session data...');
  await TestEntry.destroy({ where: {}, truncate: false });
  await SampleCard.destroy({ where: {}, truncate: false });
  await TestSession.destroy({ where: {}, truncate: false });
  console.log('✅  Cleared.\n');

  // ── 1. Create quality engineers ──────────────────────────────────────────────
  const password = await bcrypt.hash('cqm2026!', 10);
  const engineerDefs = [
    { first_name: 'Dayjuh',  last_name: 'Williams', email: 'dayjuh@qualitycontrolhub.com',  role: 'tester' },
    { first_name: 'Frankie', last_name: 'Torres',   email: 'frankie@qualitycontrolhub.com', role: 'tester' },
    { first_name: 'Isaac',   last_name: 'Mensah',   email: 'isaac@qualitycontrolhub.com',   role: 'tester' },
    { first_name: 'Chloe',   last_name: 'Laurent',  email: 'chloe@qualitycontrolhub.com',   role: 'tester' },
  ];
  const engineerMap = {};
  for (const def of engineerDefs) {
    const [user] = await User.findOrCreate({
      where: { email: def.email },
      defaults: { ...def, password_hash: password, is_active: true },
    });
    engineerMap[def.first_name] = user.id;
    console.log(`👤  ${user.first_name} ${user.last_name} (id=${user.id})`);
  }
  console.log('');

  // ── 2. Load test definitions grouped by category ─────────────────────────────
  const allDefs = await TestDefinition.findAll({
    where: { status: 'active' },
    include: [{ model: TestCategory, as: 'category', attributes: ['category_code'] }],
  });

  const defsByCategory = {};
  for (const d of allDefs) {
    const code = d.category?.category_code;
    if (!code) continue;
    if (!defsByCategory[code]) defsByCategory[code] = [];
    defsByCategory[code].push(d);
  }

  function getDefsForSession(catCode, type) {
    if (type === 'Qualification') return defsByCategory[catCode] || [];
    const ids = MONITORING_TESTS[catCode];
    if (!ids) return defsByCategory[catCode] || [];
    return (defsByCategory[catCode] || []).filter(d => ids.includes(d.id));
  }

  // ── 3. Create sessions + entries ─────────────────────────────────────────────
  let sessionSeq = 0;
  let totalEntries = 0;
  const monthBuckets = { '01':0, '02':0, '03':0, '04':0, '05':0 };

  for (const plan of SESSION_PLAN) {
    sessionSeq++;
    const inspectorId = engineerMap[plan.inspector];
    const submittedAt = plan.submitOffset != null ? offsetDate(plan.date, plan.submitOffset, 16) : null;
    const approvedAt  = plan.approveOffset != null ? offsetDate(plan.date, plan.approveOffset, 10) : null;

    const session = await TestSession.create({
      session_number:      sessionNumber(sessionSeq),
      session_type:        plan.type || 'Monitoring',
      card_type:           plan.cardType,
      manufacturing_stage: plan.type,
      batch_lot_number:    plan.batch,
      job_name:            plan.job,
      cat_number:          plan.cat,
      test_date:           plan.date,
      inspector_id:        inspectorId,
      status:              plan.status,
      submitted_at:        submittedAt,
      approved_at:         approvedAt,
      approved_by:         approvedAt ? engineerMap['Isaac'] : null,
      general_notes:       plan.notes || null,
    });

    let sessionEntries = 0;
    let sessionCards = [];

    if (plan.sampleCount > 1) {
      for (let c = 1; c <= plan.sampleCount; c++) {
        const card = await SampleCard.create({
          session_id:  session.id,
          card_number: c,
          notes:       `Sample card ${c} of ${plan.sampleCount}`,
        });
        sessionCards.push(card);
      }
    }

    for (const catCode of plan.cats) {
      const defs = getDefsForSession(catCode, plan.type);
      const failRate = (plan.failRates || {})[catCode] ?? 0.02;

      if (plan.sampleCount > 1) {
        for (const def of defs) {
          for (const card of sessionCards) {
            const { measurement_value, secondary_measurement_value, pass_status } = genEntry(def.id, failRate);
            await TestEntry.create({
              session_id:                 session.id,
              test_definition_id:         def.id,
              sample_card_id:             card.id,
              measurement_value,
              secondary_measurement_value,
              pass_status,
              retest_required:            !pass_status,
              notes:                      !pass_status ? `Qualification failure — sample card ${card.card_number} out of spec` : null,
            });
            sessionEntries++;
          }
        }
      } else {
        for (const def of defs) {
          const { measurement_value, secondary_measurement_value, pass_status } = genEntry(def.id, failRate);
          await TestEntry.create({
            session_id:                 session.id,
            test_definition_id:         def.id,
            sample_card_id:             null,
            measurement_value,
            secondary_measurement_value,
            pass_status,
            retest_required:            !pass_status,
            notes:                      !pass_status ? 'Monitoring result out of spec — retest required' : null,
          });
          sessionEntries++;
        }
      }
    }

    totalEntries += sessionEntries;
    const month = plan.date.slice(5, 7);
    if (monthBuckets[month] !== undefined) monthBuckets[month]++;

    const icon = plan.status === 'approved' ? '✅' : plan.status === 'rejected' ? '❌' : '⏳';
    const typeTag = plan.type === 'Qualification' ? '[QUAL]' : '[MON] ';
    console.log(`${icon} ${typeTag} [${sessionNumber(sessionSeq)}] ${plan.date}  ${plan.batch.padEnd(17)} ${plan.inspector.padEnd(8)} ${String(sessionEntries).padStart(3)} entries — ${plan.status.toUpperCase()}`);
  }

  // ── 4. Summary ───────────────────────────────────────────────────────────────
  const quals   = SESSION_PLAN.filter(p => p.type === 'Qualification');
  const mons    = SESSION_PLAN.filter(p => p.type === 'Monitoring');
  const counts  = { approved: 0, submitted: 0, rejected: 0 };
  SESSION_PLAN.forEach(p => counts[p.status]++);
  const qualCounts = { approved: 0, submitted: 0, rejected: 0 };
  quals.forEach(p => qualCounts[p.status]++);

  console.log(`\n${'─'.repeat(74)}`);
  console.log(`📋  Total sessions      : ${SESSION_PLAN.length}  (${quals.length} qual / ${mons.length} monitoring)`);
  console.log(`    Approved            : ${counts.approved}`);
  console.log(`    Submitted (pending) : ${counts.submitted}`);
  console.log(`    Rejected            : ${counts.rejected}`);
  console.log(`    Total entries       : ${totalEntries}`);
  console.log(`\n📅  Sessions by month:`);
  console.log(`    Jan: ${monthBuckets['01']}   Feb: ${monthBuckets['02']}   Mar: ${monthBuckets['03']}   Apr: ${monthBuckets['04']}   May: ${monthBuckets['05']}`);
  console.log(`\n🔬  Qualification breakdown:`);
  console.log(`    Total qual sessions : ${quals.length}`);
  console.log(`    Approved            : ${qualCounts.approved}`);
  console.log(`    Submitted (pending) : ${qualCounts.submitted}`);
  console.log(`    Rejected (failed)   : ${qualCounts.rejected}  (${Math.round(qualCounts.rejected / quals.length * 100)}% failure rate)`);
  console.log(`\n📦  Products qualified  :`);
  console.log(`    Visa Classic DI v3.2, Mastercard Standard Contact v2.1`);
  console.log(`    AMEX Blue Contactless v1.0, National ID Type A v1.0`);
  console.log(`    Prepaid Visa Chip v1.5, Transit NFC Type A v1.0`);
  console.log(`    Corporate Badge RFID v3.1, Debit MC Contactless v4.0`);
  console.log(`    Visa Infinite Contactless v1.0, Prepaid Mastercard v2.2`);
  console.log(`    Loyalty Card RFID v1.0, Visa Classic DI v3.3 (Spec Rev.)`);
  console.log(`    National Bank Premium Credit v1.0, National ID Type B v1.0`);
  console.log(`\n🔄  Re-qualification threads:`);
  console.log(`    Prepaid Visa Chip v1.5      FAIL Jan → PASS Feb  (lamination process)`);
  console.log(`    Transit NFC Type A           FAIL Feb → PASS Mar  (antenna redesign)`);
  console.log(`    Corporate Badge RFID v3.1    FAIL Mar → PASS Apr  (substrate lot)`);
  console.log(`    National ID Type B v1.0      FAIL Apr → PENDING   (cooling cycle)`);
  console.log(`    Loyalty Card RFID v1.0       FAIL May → PENDING   (adhesive lot)`);
  console.log(`\n🔑  Engineer logins (password: cqm2026!):`);
  console.log(`    dayjuh@qualitycontrolhub.com`);
  console.log(`    frankie@qualitycontrolhub.com`);
  console.log(`    isaac@qualitycontrolhub.com`);
  console.log(`    chloe@qualitycontrolhub.com`);
  console.log(`${'─'.repeat(74)}`);

  process.exit(0);
}

seed().catch(e => {
  console.error('❌ Seed failed:', e.message);
  if (e.original) console.error('   DB error:', e.original.message);
  if (e.errors) e.errors.forEach(ve => console.error('   Validation:', ve.message, ve.path, ve.value));
  console.error(e.stack);
  process.exit(1);
});
