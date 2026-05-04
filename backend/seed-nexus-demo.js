/**
 * Seed demo data for the NEXUS Qualification Hub.
 * Reflects realistic card manufacturing processes:
 *   Audit 1 — Idemia France SAS: ICC card manufacturer (cb + icc), Grade A, Closed, ISO 9001
 *   Audit 2 — CPI Card Group:    ICC + Personalization (icc + p), Grade B, In-Progress, non-ISO 9001
 *
 * Run: node backend/seed-nexus-demo.js  (from repo root)
 *   or: node seed-nexus-demo.js         (from backend/)
 */

const path = require('path');
// Support running from repo root or from backend/
const modelsPath = __filename.includes(`${path.sep}backend${path.sep}`)
  ? './models'
  : './backend/models';
const { sequelize } = require(modelsPath);

const q = (sql, bind = []) =>
  sequelize.query(sql, { replacements: bind, type: sequelize.QueryTypes.RAW });

function pad2(n) { return String(n).padStart(2, '0'); }
function actionId(year, month, prefix, seq) {
  return `${String(year).slice(-2)}-${pad2(month)}/${prefix}${pad2(seq)}`;
}

// ── QMS assessments ───────────────────────────────────────────────────────────

const QMS_9001 = [
  { req: '#0113#', sec: '4.4.3',   title: 'Determining the scope of the quality management system',                  iso: 'ISO only',  compliance: 'Yes',            conformity: 'Full', comment: 'QMS scope statement covers all card body, ICC assembly, and personalization stages. Approved by QD.' },
  { req: '#0114#', sec: '4.4.4',   title: 'Management System and Processes',                                          iso: 'ISO only',  compliance: 'Yes',            conformity: 'Full', comment: 'Process map and SIPOC diagrams available for all core manufacturing processes.' },
  { req: '#0211#', sec: '4.5.1.1', title: 'Leadership and commitment – General',                                      iso: 'ISO only',  compliance: 'Yes',            conformity: 'Full', comment: 'Quality policy signed by VP Manufacturing. Management review minutes reviewed — quarterly cadence maintained.' },
  { req: '#0221#', sec: '4.5.2.1', title: 'Establishing the quality policy',                                          iso: 'ISO only',  compliance: 'Yes',            conformity: 'Full', comment: 'Quality policy posted at all production stations. Communicated during annual onboarding.' },
  { req: '#0231#', sec: '4.5.3',   title: 'Organization – Organizational roles, responsibilities and authorities',   iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Org chart with quality roles published. RACI matrix for lamination and embedding reviewed.' },
  { req: '#0233#', sec: '4.5.3.2', title: 'Organization – CQM Primary Contact',                                      iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Arnaud Bertin designated as CQM primary contact. Contact details current in Mastercard portal.' },
  { req: '#0311#', sec: '4.6.1.1', title: 'Determining and addressing risks and opportunities',                       iso: 'ISO only',  compliance: 'Yes',            conformity: 'Full', comment: 'Risk register covers lamination delamination, ICM supply chain disruption, and laser engraver downtime.' },
  { req: '#0421#', sec: '4.7.2',   title: 'Competence',                                                               iso: 'ISO only',  compliance: 'Yes',            conformity: 'Full', comment: 'Training matrix current for all 142 production operators. Annual competency sign-off completed.' },
  { req: '#0511#', sec: '4.8.1',   title: 'Documented Information – General',                                        iso: 'ISO only',  compliance: 'Yes',            conformity: 'Full', comment: 'DCS in place. All SOPs version-controlled. Electronic change-request workflow observed.' },
  { req: '#0521#', sec: '4.8.2',   title: 'Creating and updating documented information',                             iso: 'ISO only',  compliance: 'Procedure only', conformity: 'RI',   comment: 'Procedure exists; 2 lamination WIs not reviewed in >18 months. Recommend update at next internal audit.' },
  { req: '#0571#', sec: '4.9',     title: 'Design and development – General',                                        iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'D&D stage-gate process well documented. DDR package reviewed for ICC-DI product.' },
  { req: '#0583#', sec: '5.0',     title: 'Production and service provision',                                         iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Production travellers verified. Lot traceability maintained from incoming PVC sheet to finished card.' },
  { req: '#0601#', sec: '6.1',     title: 'Monitoring and measurement – General',                                     iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Calibration schedule current. All critical gauges (thickness, peel, warpage) traceable to BIPM.' },
  { req: '#0706#', sec: '5.1',     title: 'Qualification gate – all process steps assessed',                         iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'All 26 applicable process steps assessed. Gate #0706# passed 2025-09-01.' },
  { req: '#0701#', sec: '5.2',     title: 'Continuous quality monitoring records',                                   iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: '18 months of CQM test sessions on file. No gaps. All submitted and approved.' },
  { req: '#0702#', sec: '5.2',     title: 'Monitoring results meet defined pass rate thresholds',                    iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Pass rate 97.8% across all physical and electrical tests. Above 95% threshold.' },
  { req: '#0811#', sec: '5.4',     title: 'Cpk data for critical test parameters',                                   iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Cpk ≥ 1.45 for thickness, peel strength, and corner radius. SPC charts reviewed.' },
];

const QMS_NO9001 = [
  { req: '#0233#', sec: '4.5.3.2', title: 'Organization – CQM Primary Contact',                                      iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Sarah Chen designated as CQM primary contact. Contact verified in Mastercard portal.' },
  { req: '#0311#', sec: '4.6.1.1', title: 'Determining and addressing risks and opportunities',                       iso: 'Nothing',   compliance: 'Procedure only', conformity: 'RI',   comment: 'Risk register exists but does not address ICM delamination or laser engraver failure scenarios.' },
  { req: '#0421#', sec: '4.7.2',   title: 'Competence',                                                               iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Operator certification records available. 3 new hires completing lamination certification.' },
  { req: '#0511#', sec: '4.8.1',   title: 'Documented Information – General',                                        iso: 'Nothing',   compliance: 'Procedure only', conformity: 'nc-',  comment: '4 work instructions found without revision dates: WI-LAM-007, WI-LAM-012, WI-PERS-003, WI-PERS-008. Minor NC.' },
  { req: '#0521#', sec: '4.8.2',   title: 'Creating and updating documented information',                             iso: 'Nothing',   compliance: 'No',             conformity: 'NC+',  comment: 'No formal document change process. SOPs updated without review or approval sign-off. Significant NC — packaging and lamination SOPs affected.' },
  { req: '#0571#', sec: '4.9',     title: 'Design and development – General',                                        iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Design review process documented and followed for new card designs.' },
  { req: '#0583#', sec: '5.0',     title: 'Production and service provision',                                         iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Lot traceability maintained from card body receipt to personalized card shipment.' },
  { req: '#0601#', sec: '6.1',     title: 'Monitoring and measurement – General',                                     iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Calibration program in place. Thickness gauge and peel tester calibrated annually by accredited lab.' },
  { req: '#0706#', sec: '5.1',     title: 'Qualification gate – all process steps assessed',                         iso: 'Nothing',   compliance: 'Procedure only', conformity: 'RI',   comment: '3 process steps not yet assessed (P40 Single Card Printing SetUp, P80 Fulfilment, G40 Lamination). Due 30 days.' },
  { req: '#0701#', sec: '5.2',     title: 'Continuous quality monitoring records',                                   iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: '12 months of CQM test sessions reviewed. No significant gaps identified.' },
  { req: '#0702#', sec: '5.2',     title: 'Monitoring results meet defined pass rate thresholds',                    iso: 'Nothing',   compliance: 'Yes',            conformity: 'Full', comment: 'Pass rate 96.1%. Above 95% threshold. Peel strength failures noted in 1 lot — isolated incident.' },
  { req: '#0811#', sec: '5.4',     title: 'Cpk data for critical test parameters',                                   iso: 'Nothing',   compliance: 'Procedure only', conformity: 'nc-',  comment: 'Overlay peel Cpk = 1.19, below 1.33 threshold. Lamination temperature investigation ongoing.' },
];

// ── Card Body (cb) process steps — Audit 1 (Grade A, all Full/RI) ────────────
const CB_STEPS_A1 = [
  { tag: '#A00#', name: 'IQC – Incoming Quality Control',                compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'IQC-CB-001 Rev6',   conformity: 'Full', notes: 'PVC/PET core sheets, overlay film, and printing inks inspected on receipt. AQL Level II. COA required for all materials. Zero exceptions in last quarter.' },
  { tag: '#F10#', name: 'Printing the Mastercard logo',                   compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'PRT-SOP-003 Rev4',  conformity: 'Full', notes: 'Offset print. Color densitometry verified daily against Pantone standard. Delta-E < 2.0 on all production runs.' },
  { tag: '#G10#', name: 'Tape Laying',                                    compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'LAY-SPC-002 Rev3',  conformity: 'Full', notes: 'Magnetic stripe tape applied using automated tape-layer. Position accuracy ±0.1mm. Cpk = 1.58.' },
  { tag: '#G20#', name: 'Collation',                                      compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'COL-SOP-001 Rev2',  conformity: 'Full', notes: 'Layer stack verified by operator before lamination. Core/overlay sequence confirmed per job traveller.' },
  { tag: '#G30#', name: 'Void Filling',                                   compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'VF-SOP-001 Rev1',   conformity: 'Full', notes: 'Cavity fill material applied to hologram and signature panel recess areas. Visual inspection 100%.' },
  { tag: '#G40#', name: 'Lamination',                                     compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'LAM-SPC-005 Rev7',  conformity: 'Full', notes: 'Hot press lamination at 155°C ±2°C, 120 N/cm². All 4 platens calibrated monthly. Warp <0.3mm on 100% of sheets. Cpk temperature uniformity = 1.61.' },
  { tag: '#G50#', name: 'Card Singulation (Card Punching)',               compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'PUNCH-SPC-003 Rev4', conformity: 'Full', notes: 'Die punch verified against ISO 7810 corner radius spec. Width/height measurement by CMM on 30 cards/sheet. Cpk = 1.52.' },
  { tag: '#H10#', name: 'Hologram and Signature Panel Application',       compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'HOL-SOP-002 Rev3',  conformity: 'Full', notes: 'Hot-stamp hologram application. Peel adhesion tested per lot. Signature panel adhesion force >8N verified.' },
  { tag: '#3002#', name: 'Width and Height [ISO 7810]',                   compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-DIM-001 Rev5',   conformity: 'Full', notes: 'Automated CMM measurement. 100% of cards within ±0.08mm tolerance. Cpk width = 1.67, Cpk height = 1.71.' },
  { tag: '#3003#', name: 'Thickness outside Contacts and Add-on Areas [ISO 7810]', compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-THK-001 Rev4', conformity: 'Full', notes: 'Contact thickness measurement at 5 points per card. All within 0.76mm ±0.08mm. Cpk = 1.55.' },
  { tag: '#3005#', name: 'Corners [ISO 7810]',                            compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-COR-001 Rev3',   conformity: 'Full', notes: 'Corner radius profile gauge verified daily. All 4 corners within 3.18mm ±0.30mm spec. Cpk = 1.48.' },
  { tag: '#3006#', name: 'Card Edges [ISO 7810]',                         compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-EDG-001 Rev2',   conformity: 'Full', notes: 'Edge roughness and perpendicularity checked. No burrs or delaminated edges observed on audit sample.' },
  { tag: '#3007#', name: 'Overall Card Warpage [ISO 7810]',               compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-WARP-002 Rev3',  conformity: 'Full', notes: 'Warpage gauge used on 100% of cards. All within 1.5mm maximum. Average 0.22mm. Cpk = 1.62.' },
  { tag: '#3015#', name: 'Peel Strength of the Overlay [ISO 7810]',       compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-PEEL-001 Rev5',  conformity: 'Full', notes: 'Tensile tester pull at 90°. Overlay peel force >8N across all 5 measurement positions. Cpk = 1.49.' },
  { tag: '#3016#', name: 'Peel Strength between Core Layers [ISO 7810]',  compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-PEEL-002 Rev3',  conformity: 'Full', notes: 'Core layer peel strength >8N. No delamination observed. Cpk = 1.53.' },
  { tag: '#3019#', name: 'Resistance to Impact [ISO 7810]',               compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-IMP-001 Rev2',   conformity: 'Full', notes: 'Corner impact drop test (1m). No cracks or delamination on 30-card sample. Pass rate 100%.' },
  { tag: '#3042#', name: 'Dynamic Bending Stress [ISO 7810]',             compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-BEND-001 Rev3',  conformity: 'Full', notes: '250 cycles at ±30N. No failures. Bending stiffness Cpk = 1.44. SPC chart maintained at test station.' },
  { tag: '#3043#', name: 'Dynamic Torsional Stress [ISO 7810]',           compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-TORS-001 Rev2',  conformity: 'Full', notes: '250 cycles torsion. No surface cracking or delamination observed on 10-card sample.' },
  { tag: '#3044#', name: 'Temperature and Humidity Exposure',             compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-ENV-001 Rev3',   conformity: 'Full', notes: '23°C/90%RH exposure 24h. Post-exposure dimensional check within spec. Chamber calibration current.' },
  { tag: '#3050#', name: 'ESD Conductivity – ESC',                        compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-ESD-001 Rev2',   conformity: 'Full', notes: 'Surface resistance measured per card lot. All within acceptable range. No ESD failures in last 6 months.' },
];

// ── ICC steps (extra beyond CB) — Audit 1 ────────────────────────────────────
const ICC_STEPS_A1 = [
  { tag: '#I10#',  name: 'ICM Preparation (Hotmelt Lamination)',          compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'ICM-PREP-SOP-001 Rev3', conformity: 'Full', notes: 'Hotmelt film applied to ICM tape reel. Film thickness controlled by gravimetric check per reel. No voids on X-ray.' },
  { tag: '#I30#',  name: 'ICM Cavity Milling',                            compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'MILL-SPC-004 Rev5',     conformity: 'Full', notes: 'CNC milling. Cavity depth Cpk = 1.58. Tool wear monitored every 500 cards. Vision system verifies cavity position.' },
  { tag: '#I50#',  name: 'ICM Embedding',                                 compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'EMB-SPC-002 Rev4',      conformity: 'Full', notes: 'Adhesive dispensing weight controlled ±0.5mg. ICM pull-out force >60N verified on 5 cards/lot. Cpk = 1.46.' },
  { tag: '#L10#',  name: 'Electrical Test (Card)',                         compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'ET-CARD-SPC-001 Rev6',  conformity: 'Full', notes: '100% electrical test per ISO 7816. ATR verified. Contactless reading distance >4cm. Pass rate 99.7%.' },
  { tag: '#3054#', name: '3 Wheel Test Robustness [ISO 10373-1]',         compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-3WT-001 Rev2',       conformity: 'Full', notes: '3-wheel test 1000 cycles. No module lifting or delamination. Pass rate 100% on 10-card sample.' },
  { tag: '#3055#', name: 'Wrapping Test Robustness',                      compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-WRAP-001 Rev1',      conformity: 'Full', notes: 'Card wrapped 180° around 3.18mm mandrel. No surface cracking or ICM displacement.' },
  { tag: '#3058#', name: 'Adhesion of ICM to Card',                       compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-ADHESION-001 Rev3',  conformity: 'Full', notes: 'ICM adhesion pull force measured per lot. Minimum >60N. Average 78N. Cpk = 1.51.' },
  { tag: '#3061#', name: 'Verification of Antenna Functionality (ATS)',   compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-RF-001 Rev4',        conformity: 'Full', notes: '100% ATS/ATQ verification. All cards respond within ISO 14443 timing spec. Pass rate 99.9%.' },
  { tag: '#3064#', name: 'Reading Distance',                              compliance: 'Yes', site: 'Idemia La Ferté-Alais', spec: 'QC-RDIST-001 Rev2',     conformity: 'Full', notes: 'Reading distance >4cm on all cards tested. Minimum measured 4.3cm. Above threshold.' },
];

// ── ICC steps — Audit 2 (CPI, mixed conformity) ──────────────────────────────
const ICC_STEPS_A2 = [
  { tag: '#A00#',  name: 'IQC – Incoming Quality Control',                compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'IQC-ICC-001 Rev3',     conformity: 'Full', notes: 'Card bodies (from certified CB supplier) and ICMs inspected on receipt. COA verified per lot.' },
  { tag: '#I10#',  name: 'ICM Preparation (Hotmelt Lamination)',          compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'ICM-PREP-001 Rev2',    conformity: 'Full', notes: 'Hotmelt film applied. Weight checked per reel. No anomalies observed.' },
  { tag: '#I30#',  name: 'ICM Cavity Milling',                            compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'MILL-SPC-002 Rev3',    conformity: 'Full', notes: 'Cavity depth Cpk = 1.41. Tool change schedule followed. Vision system position verification active.' },
  { tag: '#I40#',  name: 'Card Bumping for ICM Connection',               compliance: 'Procedure only', site: 'CPI Littleton CO', spec: 'BUMP-SOP-001 Rev1',    conformity: 'RI',   notes: 'Procedure exists but bump height SPC chart not yet implemented. Operator performs visual check only. RI observation.' },
  { tag: '#I50#',  name: 'ICM Embedding',                                 compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'EMB-SPC-001 Rev2',     conformity: 'Full', notes: 'Adhesive dispense controlled. ICM pull force >60N on sample. Cpk = 1.38.' },
  { tag: '#G40#',  name: 'Lamination',                                    compliance: 'Procedure only', site: 'CPI Littleton CO', spec: 'LAM-SPC-001 Rev2',     conformity: 'nc-',  notes: 'Lamination station 4 temperature probe reads 2°C below setpoint. Probe calibration certificate expired 2026-03-01. Overlay peel Cpk = 1.19 (below 1.33). Minor NC raised.' },
  { tag: '#L10#',  name: 'Electrical Test (Card)',                         compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'ET-CARD-SPC-001 Rev4', conformity: 'Full', notes: '100% electrical test. ATR pass rate 99.6%. One ICM lot rejected and returned to supplier.' },
  { tag: '#3003#', name: 'Thickness outside Contacts and Add-on Areas',   compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-THK-001 Rev3',      conformity: 'Full', notes: 'Thickness within tolerance. Cpk = 1.41. Measurement at 5 positions per card.' },
  { tag: '#3054#', name: '3 Wheel Test Robustness [ISO 10373-1]',         compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-3WT-001 Rev1',      conformity: 'Full', notes: '1000 cycles. No module displacement. Pass rate 100% on sample.' },
  { tag: '#3058#', name: 'Adhesion of ICM to Card',                       compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-ADHESION-001 Rev2', conformity: 'Full', notes: 'Average ICM pull force 71N. Above 60N minimum. Cpk = 1.39.' },
  { tag: '#3061#', name: 'Verification of Antenna Functionality (ATS)',   compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-RF-001 Rev3',       conformity: 'Full', notes: '100% ATS verification. Reading distance >4cm confirmed.' },
];

// ── Personalization (p) steps — Audit 2 (mixed conformity) ───────────────────
const PERS_STEPS_A2 = [
  { tag: '#A00#', name: 'IQC – Incoming Quality Control (Card Bodies)',   compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'IQC-PERS-001 Rev2',  conformity: 'Full', notes: 'Personalized card body inspection: visual defects, warpage, and embossability pre-check. Zero rejections at IQC this quarter.' },
  { tag: '#P10#', name: 'Data Preparation',                               compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'DATA-SOP-002 Rev4',  conformity: 'Full', notes: 'Cardholder data prepared per issuer spec. Encryption verified. Data integrity checksums confirmed before job release.' },
  { tag: '#P20#', name: 'Job Assignment',                                 compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'JOB-SOP-001 Rev3',   conformity: 'Full', notes: 'Job tickets matched to card stock and embosser settings. 2-person verification for security-sensitive jobs.' },
  { tag: '#P30#', name: 'Card Issuance from Vault',                       compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'VAULT-SOP-003 Rev5', conformity: 'Full', notes: 'Dual-control vault access. Card count reconciled before and after issuance. No discrepancies in last 6 months.' },
  { tag: '#P60#', name: 'Card Personalisation SetUp',                     compliance: 'Procedure only', site: 'CPI Littleton CO', spec: 'PERS-SOP-004 Rev2',  conformity: 'RI',   notes: 'Setup procedure exists; pre-run check cards not formally dispositioned (pass/fail) before production. RI observation.' },
  { tag: '#P70#', name: 'Card Personalisation',                           compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'PERS-SPC-001 Rev3',  conformity: 'Full', notes: 'Inline OCR verification of embossed characters. ATR 100% test passed on each card. Magnetic encoding 100% verified.' },
  { tag: '#P80#', name: 'Fulfilment / Packaging',                         compliance: 'No',             site: 'CPI Littleton CO', spec: null,                 conformity: 'NC+',  notes: 'No documented packaging specification found for mailer assembly and card shipment. Cards packaged without tamper-evident seal. Significant NC+ raised.' },
  { tag: '#4001#', name: 'Embossing – Card Dimensions after Embossing',   compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-EMBS-001 Rev3',  conformity: 'Full', notes: 'Post-embossing dimensional check. Width/height within tolerance after embossing. 30 cards measured per run.' },
  { tag: '#4017#', name: 'Laser Engraving – Visual Appearance',           compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-LASER-001 Rev2', conformity: 'Full', notes: 'Character depth and contrast within spec. Daily standard verification card checked against reference.' },
  { tag: '#4018#', name: 'Laser Engraving – Durability',                  compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-LASER-002 Rev2', conformity: 'Full', notes: 'Tape test and abrasion test on sample cards. No character degradation observed.' },
  { tag: '#4019#', name: 'Magnetic Encoding Characteristics',             compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-MAG-001 Rev4',   conformity: 'Full', notes: '100% magnetic encoding verification. BPI, flux reversal count, and jitter within ISO 7811 limits.' },
  { tag: '#4021#', name: 'Electric Encoding Characteristics',             compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-ELEC-001 Rev3',  conformity: 'Full', notes: 'ATR/ATS verified per ISO 7816/14443. Pass rate 99.8%. Failures traced to one ICM lot — removed from production.' },
  { tag: '#4022#', name: 'Answer-to-Reset – 100% Test',                   compliance: 'Yes',            site: 'CPI Littleton CO', spec: 'QC-ATR-001 Rev4',   conformity: 'Full', notes: '100% ATR test at personalization. Response time within spec. Zero ATR failures this quarter.' },
  { tag: '#4024#', name: 'Verification of Contactless Functionality after Personalization (Sampling)', compliance: 'Yes', site: 'CPI Littleton CO', spec: 'QC-RF-PERS-001 Rev2', conformity: 'Full', notes: 'Sampling test per lot. Reading distance and ATS confirmed post-embossing. No RF failures.' },
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Connecting to database...');

  const [[adminUser]] = await q(`SELECT id FROM users WHERE email = 'admin@cqm.com' LIMIT 1`);
  if (!adminUser) throw new Error('Admin user not found — run npm run create-admin first.');
  const adminId = adminUser.id;
  console.log(`✅ Using admin user id=${adminId}`);

  // ── 0. Clean up ────────────────────────────────────────────────────────────
  console.log('🧹 Cleaning up previous NEXUS demo data...');
  const WHERE_COMPANY = `WHERE company IN ('Idemia France SAS','CPI Card Group')`;
  const WHERE_AUD = `WHERE audit_record_id IN (SELECT id FROM nexus_audit_records ${WHERE_COMPANY})`;

  await q(`DELETE FROM nexus_alerts        ${WHERE_AUD}`);
  await q(`DELETE FROM nexus_document_refs ${WHERE_AUD}`);
  await q(`DELETE FROM nexus_capa_items    ${WHERE_AUD}`);
  await q(`DELETE FROM nexus_qualification_items WHERE plan_id IN (
    SELECT np.id FROM nexus_qualification_plans np
    JOIN nexus_audit_records na ON np.audit_record_id = na.id
    ${WHERE_COMPANY})`);
  await q(`DELETE FROM nexus_design_reviews WHERE plan_id IN (
    SELECT np.id FROM nexus_qualification_plans np
    JOIN nexus_audit_records na ON np.audit_record_id = na.id
    ${WHERE_COMPANY})`);
  await q(`DELETE FROM nexus_qualification_plans ${WHERE_AUD}`);
  await q(`DELETE FROM nexus_process_step_assessments WHERE product_scope_id IN (
    SELECT ns.id FROM nexus_product_scopes ns
    JOIN nexus_audit_records na ON ns.audit_record_id = na.id
    ${WHERE_COMPANY})`);
  await q(`DELETE FROM nexus_product_scopes   ${WHERE_AUD}`);
  await q(`DELETE FROM nexus_qms_assessments  ${WHERE_AUD}`);
  await q(`DELETE FROM nexus_audit_components ${WHERE_AUD}`);
  await q(`DELETE FROM nexus_audit_records    ${WHERE_COMPANY}`);
  console.log('✅ Cleanup done.');

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT 1 — Idemia France SAS
  //           Card Body + ICC manufacturer, France — Grade A, Closed, ISO 9001
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 Creating Audit 1: Idemia France SAS (CB + ICC manufacturer)...');

  const [[aud1]] = await q(`
    INSERT INTO nexus_audit_records
      (site_name, company, address_line1, city, state_province, postal_code, country_code,
       audit_date_start, audit_date_end, auditor, audit_type, audit_scope,
       iso_9001_certified, grade, status, cqmap_version, next_audit_date,
       report_date, general_notes, created_by, created_at, updated_at)
    VALUES
      ('La Ferté-Alais Manufacturing Centre', 'Idemia France SAS',
       '2 Rue Bernard Lépine', 'La Ferté-Alais', 'Île-de-France', '91590', 'FR',
       '2025-09-22', '2025-09-24', 'Dr. Elena Fischer', 'on-site', 'renewal',
       true, 'A', 'closed', 'V3.A', '2026-09-01',
       '2025-10-10',
       'Renewal audit for card body lamination, ICC chip embedding, and card finishing. Site demonstrates excellent quality system maturity. Grade A retained. Minor document control RI noted — 2 lamination WIs not reviewed in >18 months.',
       ?, NOW(), NOW())
    RETURNING id`, [adminId]);
  const aud1Id = aud1.id;
  console.log(`  ✅ Audit record id=${aud1Id}`);

  // QMS
  for (const r of QMS_9001) {
    await q(`INSERT INTO nexus_qms_assessments
      (audit_record_id, requirement_id, section, title, iso_9001_coverage,
       vendor_compliance, conformity, auditor_comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [aud1Id, r.req, r.sec, r.title, r.iso, r.compliance, r.conformity, r.comment]);
  }
  console.log(`  ✅ ${QMS_9001.length} QMS assessments`);

  // Components
  const aud1Components = [
    { type: 'CB (Card body only)',                    article: 'IDM-CB-DI-2025', product: 'Mastercard DI Card Body',         supplier: 'Idemia La Ferté-Alais',  city: 'La Ferté-Alais', cc: 'FR', cert: 'CQM Certified',   label: 'CQM-CB-2025-FR-001', comment: 'PVC card body with magnetic stripe and overlay. Grade A. Next audit Sep 2026.' },
    { type: 'ICC (Integrated Circuit Card)',           article: 'IDM-ICC-DI-2025', product: 'Mastercard/Visa DI ICC',        supplier: 'Idemia La Ferté-Alais',  city: 'La Ferté-Alais', cc: 'FR', cert: 'CQM Certified',   label: 'CQM-ICC-2025-FR-002', comment: 'Dual-interface card with embedded NXP MIFARE module. Audited jointly with CB.' },
    { type: 'ICM (Module assembly only)',              article: 'NXP-MIFARE-DESFire', product: 'NXP External ICM',           supplier: 'NXP Semiconductors',     city: 'Eindhoven',       cc: 'NL', cert: 'CQM Certified',   label: 'CQM-ICM-2024-NL-007', comment: 'ICM sourced externally from NXP (certified). Not in scope of this audit — verified via CSI letter.' },
  ];
  for (const c of aud1Components) {
    await q(`INSERT INTO nexus_audit_components
      (audit_record_id, component_type, article_number, used_for_product,
       supplier_name, supplier_city, supplier_country_code, cert_status, cert_label, comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [aud1Id, c.type, c.article, c.product, c.supplier, c.city, c.cc, c.cert, c.label, c.comment]);
  }
  console.log(`  ✅ ${aud1Components.length} audit components`);

  // Scope 1a: Card Body (cb)
  const [[scopeCB]] = await q(`
    INSERT INTO nexus_product_scopes
      (audit_record_id, product_category, product_variant, product_name,
       in_scope, audited, rank, cert_outcome, notes, created_at, updated_at)
    VALUES (?, 'cb', 'PVC/PET Composite', 'Mastercard DI Card Body',
            true, true, 'A', 'A',
            'Card body lamination, printing, punching, and finishing. All 20 process steps assessed. Grade A awarded. Cpk ≥ 1.48 for all critical physical parameters.',
            NOW(), NOW())
    RETURNING id`, [aud1Id]);
  const scopeCBId = scopeCB.id;
  for (const s of CB_STEPS_A1) {
    await q(`INSERT INTO nexus_process_step_assessments
      (product_scope_id, process_tag, process_name, vendor_compliance, vendor_site,
       vendor_process_spec_ref, conformity, auditor_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [scopeCBId, s.tag, s.name, s.compliance, s.site, s.spec, s.conformity, s.notes]);
  }
  console.log(`  ✅ Scope CB created (${CB_STEPS_A1.length} steps)`);

  // Scope 1b: Integrated Circuit Card (icc)
  const [[scopeICC1]] = await q(`
    INSERT INTO nexus_product_scopes
      (audit_record_id, product_category, product_variant, product_name,
       in_scope, audited, rank, cert_outcome, notes, created_at, updated_at)
    VALUES (?, 'icc', 'Dual Interface EMV', 'Mastercard/Visa DI ICC',
            true, true, 'A', 'A',
            'ICC embedding, cavity milling, and electrical test. All 9 ICC-specific steps assessed. ICM adhesion and 3-wheel test results excellent. Grade A awarded.',
            NOW(), NOW())
    RETURNING id`, [aud1Id]);
  const scopeICC1Id = scopeICC1.id;
  for (const s of ICC_STEPS_A1) {
    await q(`INSERT INTO nexus_process_step_assessments
      (product_scope_id, process_tag, process_name, vendor_compliance, vendor_site,
       vendor_process_spec_ref, conformity, auditor_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [scopeICC1Id, s.tag, s.name, s.compliance, s.site, s.spec, s.conformity, s.notes]);
  }
  console.log(`  ✅ Scope ICC created (${ICC_STEPS_A1.length} steps)`);

  // Document refs
  const aud1Docs = [
    { req: '#0601#', docId: 'CAL-IDM-2025',  title: 'Equipment Calibration Master Schedule — La Ferté-Alais 2025', type: 'calibration-record', ver: '4.0', notes: 'Covers 38 critical instruments (thickness gauge, peel tester, CMM, warpage gauge). External calibration by Cofrac lab.' },
    { req: '#0602#', docId: 'TRN-IDM-2025',  title: 'Operator Training Matrix — Card Manufacturing 2025',           type: 'training-record',    ver: '2.1', notes: '142 operators current. Annual re-certification in lamination and embedding. 100% coverage.' },
    { req: '#0603#', docId: 'WI-CB-2025',    title: 'Work Instruction Master List — Card Body Manufacturing',        type: 'sop',                ver: '6.4', notes: 'All 48 WIs reviewed and DCS-controlled. 2 lamination WIs flagged for 18-month review — RI observation.' },
    { req: '#0603#', docId: 'WI-ICC-2025',   title: 'Work Instruction Master List — ICC Assembly',                   type: 'sop',                ver: '3.2', notes: 'All 22 ICC WIs current. Cavity milling and embedding WIs reviewed 2025-Q3.' },
    { req: '#0571#', docId: 'DDR-ICC-2025',  title: 'DI ICC Design and Development Review Package',                  type: 'design-review',      ver: '3.0', notes: 'Intermediate and final reviews completed. Board sign-off obtained 2025-08-30.' },
    { req: '#0706#', docId: 'GATE-IDM-2025', title: '#0706# Qualification Gate Evidence Package — ICC+CB',           type: 'qualification-gate', ver: '1.0', notes: 'All 6 gate conditions satisfied. Gate passed 2025-09-01.' },
  ];
  for (const d of aud1Docs) {
    await q(`INSERT INTO nexus_document_refs
      (audit_record_id, requirement_id, doc_id, title, doc_type, version, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [aud1Id, d.req, d.docId, d.title, d.type, d.ver, d.notes, adminId]);
  }
  console.log(`  ✅ ${aud1Docs.length} document refs`);

  // Qualification plan — CB scope
  const [[planCB]] = await q(`
    INSERT INTO nexus_qualification_plans
      (audit_record_id, product_scope_id, plan_type, version, owner, status, notes, created_by, created_at, updated_at)
    VALUES (?, ?, 'product', '3.0', 'Arnaud Bertin', 'approved',
            'Card body qualification plan for Mastercard DI CB. All items complete. Gate #0706# passed. Grade A awarded.',
            ?, NOW(), NOW())
    RETURNING id`, [aud1Id, scopeCBId, adminId]);
  const planCBId = planCB.id;

  const cbPlanItems = [
    { req: '#0706#', sec: '5.1', title: 'Qualification gate: all CB process steps assessed',           status: 'complete',     evidence: 'process-step-assessment', ref: 'All 20 CB steps assessed',         resp: 'A. Bertin',   target: '2025-08-15', done: '2025-08-12', notes: 'All steps rated Full. Zero NC findings.' },
    { req: '#0701#', sec: '5.2', title: 'Continuous quality monitoring records available',              status: 'complete',     evidence: 'test-session',            ref: 'SES-2025-CB-001 through 016',     resp: 'Q. Dept.',    target: '2025-08-15', done: '2025-08-15', notes: '16 months of sessions. No gaps.' },
    { req: '#0702#', sec: '5.2', title: 'Monitoring results meet defined pass rate thresholds',         status: 'complete',     evidence: 'test-session',            ref: 'CB QC Summary Report 2025-Q3',    resp: 'Q. Dept.',    target: '2025-08-15', done: '2025-08-14', notes: 'Pass rate 97.8%.' },
    { req: '#0705#', sec: '5.3', title: 'SPC evidence: control charts and Cpk ≥ 1.33',                status: 'complete',     evidence: 'test-session',            ref: 'SPC-CB-2025-08',                  resp: 'SPC Team',    target: '2025-09-01', done: '2025-08-28', notes: 'Cpk ≥ 1.45 for thickness, peel, width, height.' },
    { req: '#0811#', sec: '5.4', title: 'Cpk data available for critical test parameters',              status: 'complete',     evidence: 'test-session',            ref: 'CPK-CB-2025-08',                  resp: 'SPC Team',    target: '2025-09-01', done: '2025-08-25', notes: 'All critical Cpk ≥ 1.45.' },
    { req: '#0571#', sec: '4.9', title: 'Intermediate design review completed',                         status: 'complete',     evidence: 'design-review',           ref: 'DDR-ICC-2025 Intermediate',       resp: 'A. Bertin',   target: '2025-07-01', done: '2025-06-25', notes: 'Approved. No conditional actions.' },
    { req: '#0571#', sec: '4.9', title: 'Final design review completed and approved',                   status: 'complete',     evidence: 'design-review',           ref: 'DDR-ICC-2025 Final',              resp: 'A. Bertin',   target: '2025-09-01', done: '2025-08-30', notes: 'Full approval granted.' },
    { req: '#0583#', sec: '5.0', title: 'All NC process steps have documented corrective actions',      status: 'complete',     evidence: 'capa',                    ref: 'No NC steps — N/A',              resp: 'Q. Dept.',    target: '2025-09-01', done: '2025-09-01', notes: 'Zero NC+ or nc- process step findings in CB scope.' },
    { req: '#0601#', sec: '6.1', title: 'Equipment calibration records available',                      status: 'complete',     evidence: 'document',                ref: 'CAL-IDM-2025',                    resp: 'Metrology',   target: '2025-08-01', done: '2025-07-28', notes: 'All 38 instruments calibrated. Cofrac accredited lab.' },
    { req: '#0602#', sec: '6.2', title: 'Operator training records available',                          status: 'complete',     evidence: 'document',                ref: 'TRN-IDM-2025',                    resp: 'HR',          target: '2025-08-01', done: '2025-07-22', notes: '100% operator coverage.' },
    { req: '#0603#', sec: '6.3', title: 'Work instructions / SOPs available and controlled',            status: 'complete',     evidence: 'document',                ref: 'WI-CB-2025 v6.4',                resp: 'Doc Control', target: '2025-08-01', done: '2025-08-01', notes: '48 WIs DCS-controlled.' },
    { req: '#0604#', sec: '6.4', title: 'Product specifications and drawing package available',          status: 'complete',     evidence: 'document',                ref: 'IDM-CB-SPEC-2025 Rev5',           resp: 'Engineering', target: '2025-08-01', done: '2025-07-30', notes: 'Customer-approved spec pack on file.' },
  ];
  for (const i of cbPlanItems) {
    await q(`INSERT INTO nexus_qualification_items
      (plan_id, requirement_id, section, title, status, evidence_type, evidence_ref,
       responsible, target_date, completed_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [planCBId, i.req, i.sec, i.title, i.status, i.evidence, i.ref, i.resp, i.target, i.done, i.notes]);
  }
  await q(`INSERT INTO nexus_design_reviews
    (plan_id, review_type, reviewer, review_date, outcome, notes, created_by, created_at, updated_at)
    VALUES
      (?, 'intermediate', 'Dr. Elena Fischer', '2025-06-25', 'approved',
       'Intermediate DR approved without conditions. All process steps assessed, SPC charts active, calibration current.', ?, NOW(), NOW()),
      (?, 'final', 'Dr. Elena Fischer', '2025-08-30', 'approved',
       'Final DR approved. Grade A qualification confirmed. All 20 CB steps rated Full. Cpk ≥ 1.48 across all critical parameters.', ?, NOW(), NOW())`,
    [planCBId, adminId, planCBId, adminId]);
  console.log(`  ✅ CB qualification plan: ${cbPlanItems.length} items + 2 design reviews`);

  // CAPA — Audit 1 (one minor RI, completed)
  await q(`INSERT INTO nexus_capa_items
    (audit_record_id, action_id, requirement_id, source_type, severity,
     observation, suggested_action, deadline,
     corrective_action, target_date, responsibility, status, status_description,
     evidence_ref, auditor_review_status, auditor_comment, created_by, created_at, updated_at)
    VALUES (?, ?, '#0521#', 'qms', 'RI',
     'WI-LAM-007 (Lamination Temperature Control) and WI-LAM-012 (Lamination Pressure Profile) last reviewed >18 months ago. Minor procedural gap.',
     'Schedule review of both lamination WIs within 60 days. Update revision dates and re-issue.',
     '2025-12-01',
     'Both WIs reviewed, updated, and re-issued by Document Control. WI-LAM-007 Rev5, WI-LAM-012 Rev4.',
     '2025-11-15', 'Document Control Manager', 'Complete', 'WIs updated and reissued. Confirmed during close-out call.',
     'WI-LAM-007 Rev5 / WI-LAM-012 Rev4 attached to audit file.', 'Completed',
     'Verified complete at close-out review 2025-11-20.', ?, NOW(), NOW())`,
    [aud1Id, actionId(2025, 9, 'QMS', 1), adminId]);

  // Alert — Audit 1
  await q(`INSERT INTO nexus_alerts
    (audit_record_id, alert_type, severity, title, message, action_required,
     requirement_id, entity_type, is_read, is_dismissed, created_at)
    VALUES (?, 'audit-approaching-30', 'low',
     'Annual renewal audit due in ~10 months',
     'Audit record for Idemia France SAS (Grade A) is closed. Next on-site renewal audit target: 2026-09-01.',
     'Begin site self-assessment preparation Q2 2026. Confirm auditor availability by June 2026.',
     null, null, true, false, NOW())`, [aud1Id]);
  console.log(`  ✅ 1 CAPA (RI, Complete) + 1 alert`);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT 2 — CPI Card Group
  //           ICC assembler + Personalization bureau, USA — Grade B, In-Progress
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 Creating Audit 2: CPI Card Group (ICC assembly + Personalization)...');

  const [[aud2]] = await q(`
    INSERT INTO nexus_audit_records
      (site_name, company, address_line1, city, state_province, postal_code, country_code,
       audit_date_start, audit_date_end, auditor, audit_type, audit_scope,
       iso_9001_certified, grade, status, cqmap_version, next_audit_date,
       report_date, general_notes, created_by, created_at, updated_at)
    VALUES
      ('Littleton Card Production and Personalization Facility', 'CPI Card Group',
       '10026 W. San Juan Way', 'Littleton', 'Colorado', '80127', 'US',
       '2026-04-07', '2026-04-09', 'Michael Torres', 'on-site', 'renewal',
       false, 'B', 'in-progress', 'V3.A', null,
       null,
       'Renewal audit of ICC chip embedding and card personalization operations. Three findings raised: NC+ on personalization fulfilment (no packaging spec), nc- on document control (4 undated SOPs), nc- on lamination process (temp probe deviation / Overlay Peel Cpk 1.19). CAPA program active. Grade B pending close-out.',
       ?, NOW(), NOW())
    RETURNING id`, [adminId]);
  const aud2Id = aud2.id;
  console.log(`  ✅ Audit record id=${aud2Id}`);

  // QMS
  for (const r of QMS_NO9001) {
    await q(`INSERT INTO nexus_qms_assessments
      (audit_record_id, requirement_id, section, title, iso_9001_coverage,
       vendor_compliance, conformity, auditor_comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [aud2Id, r.req, r.sec, r.title, r.iso, r.compliance, r.conformity, r.comment]);
  }
  console.log(`  ✅ ${QMS_NO9001.length} QMS assessments`);

  // Components
  const aud2Components = [
    { type: 'ICC (Integrated Circuit Card)',     article: 'CPI-ICC-DI-001',  product: 'Mastercard/Visa DI ICC',     supplier: 'CPI Card Group Littleton', city: 'Littleton', cc: 'US', cert: 'Pending',       label: null,                   comment: 'Renewal audit in progress. Current CQM cert expired 2026-01-31. Grade B pending.' },
    { type: 'CB (Card body only)',               article: 'EXT-CB-MULTI-001', product: 'PVC Card Body — External',  supplier: 'Multibase SA',             city: 'Gémenos',   cc: 'FR', cert: 'CQM Certified', label: 'CQM-CB-2025-FR-009',   comment: 'Card body sourced from certified CB supplier. Verified via current CSI letter.' },
    { type: 'ICM (Module assembly only)',        article: 'NXP-MIFARE-DESFire', product: 'NXP External ICM',       supplier: 'NXP Semiconductors',       city: 'Eindhoven', cc: 'NL', cert: 'CQM Certified', label: 'CQM-ICM-2024-NL-007',  comment: 'ICM sourced from NXP (certified). Not in scope of this audit.' },
  ];
  for (const c of aud2Components) {
    await q(`INSERT INTO nexus_audit_components
      (audit_record_id, component_type, article_number, used_for_product,
       supplier_name, supplier_city, supplier_country_code, cert_status, cert_label, comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [aud2Id, c.type, c.article, c.product, c.supplier, c.city, c.cc, c.cert, c.label, c.comment]);
  }
  console.log(`  ✅ ${aud2Components.length} audit components`);

  // Scope 2a: ICC
  const [[scopeICC2]] = await q(`
    INSERT INTO nexus_product_scopes
      (audit_record_id, product_category, product_variant, product_name,
       in_scope, audited, rank, cert_outcome, notes, created_at, updated_at)
    VALUES (?, 'icc', 'Dual Interface EMV', 'Mastercard/Visa DI ICC',
            true, true, 'B', null,
            'ICC chip embedding scope. Lamination nc- finding (overlay peel Cpk 1.19). CAPA open. Card bumping RI noted. Grade B pending close-out.',
            NOW(), NOW())
    RETURNING id`, [aud2Id]);
  const scopeICC2Id = scopeICC2.id;
  for (const s of ICC_STEPS_A2) {
    await q(`INSERT INTO nexus_process_step_assessments
      (product_scope_id, process_tag, process_name, vendor_compliance, vendor_site,
       vendor_process_spec_ref, conformity, auditor_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [scopeICC2Id, s.tag, s.name, s.compliance, s.site, s.spec, s.conformity, s.notes]);
  }
  console.log(`  ✅ Scope ICC created (${ICC_STEPS_A2.length} steps)`);

  // Scope 2b: Personalization
  const [[scopeP]] = await q(`
    INSERT INTO nexus_product_scopes
      (audit_record_id, product_category, product_variant, product_name,
       in_scope, audited, rank, cert_outcome, notes, created_at, updated_at)
    VALUES (?, 'p', 'EMV + Contactless', 'Mastercard/Visa DI Personalization',
            true, true, 'B', null,
            'Personalization bureau scope. NC+ on fulfilment/packaging (no spec). Personalization setup RI noted. Grade B pending close-out.',
            NOW(), NOW())
    RETURNING id`, [aud2Id]);
  const scopePId = scopeP.id;
  for (const s of PERS_STEPS_A2) {
    await q(`INSERT INTO nexus_process_step_assessments
      (product_scope_id, process_tag, process_name, vendor_compliance, vendor_site,
       vendor_process_spec_ref, conformity, auditor_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [scopePId, s.tag, s.name, s.compliance, s.site, s.spec, s.conformity, s.notes]);
  }
  console.log(`  ✅ Scope Personalization created (${PERS_STEPS_A2.length} steps)`);

  // Document refs
  const aud2Docs = [
    { req: '#0511#', docId: 'DOC-CPI-001',  title: 'Document Control Procedure Rev1.3',                           type: 'sop',                ver: '1.3', notes: 'Procedure exists but 4 SOPs found un-dated. Requires corrective action as part of CAPA 26-04/QMS01.' },
    { req: '#0601#', docId: 'CAL-CPI-2026', title: 'Calibration Register 2026 — Littleton Facility',             type: 'calibration-record', ver: '2.0', notes: 'Calibration records complete except lamination station 4 probe (expired). Addressed in CAPA 26-04/PST01.' },
    { req: '#0583#', docId: 'PKG-SPEC-001', title: 'Packaging Specification — Personalized Card Shipment',        type: 'sop',                ver: null,  notes: 'MISSING — no documented packaging specification exists. NC+ raised (CAPA 26-04/PST02). Draft under review.' },
    { req: '#0603#', docId: 'WI-PERS-2026', title: 'Personalization Work Instructions Master List',               type: 'sop',                ver: '2.1', notes: '4 undated WIs identified: WI-LAM-007, WI-LAM-012, WI-PERS-003, WI-PERS-008. Update required.' },
  ];
  for (const d of aud2Docs) {
    await q(`INSERT INTO nexus_document_refs
      (audit_record_id, requirement_id, doc_id, title, doc_type, version, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [aud2Id, d.req, d.docId, d.title, d.type, d.ver, d.notes, adminId]);
  }
  console.log(`  ✅ ${aud2Docs.length} document refs`);

  // Qualification plan — ICC + P (combined, in-progress)
  const [[plan2]] = await q(`
    INSERT INTO nexus_qualification_plans
      (audit_record_id, product_scope_id, plan_type, version, owner, status, notes, created_by, created_at, updated_at)
    VALUES (?, ?, 'product', '1.2', 'Sarah Chen', 'in-progress',
            'DI ICC + Personalization qualification plan. 3 active CAPAs must close before gate #0706# can pass. Target close-out: 2026-07-31.',
            ?, NOW(), NOW())
    RETURNING id`, [aud2Id, scopeICC2Id, adminId]);
  const plan2Id = plan2.id;

  const plan2Items = [
    { req: '#0706#', sec: '5.1', title: 'Qualification gate: all ICC + Personalization process steps assessed', status: 'in-progress', evidence: 'process-step-assessment', ref: '22/25 steps complete — G40, P60, P80 outstanding', resp: 'Sarah Chen',    target: '2026-06-30', done: null,         notes: 'Lamination (G40 nc-) and Fulfilment (P80 NC+) and Pers Setup (P60 RI) not yet resolved.' },
    { req: '#0701#', sec: '5.2', title: 'Continuous quality monitoring records available',                       status: 'complete',    evidence: 'test-session',            ref: 'SES-2025-ICC-001 through 012',  resp: 'Q. Dept.',      target: '2026-05-01', done: '2026-04-15', notes: '12 months on file. No gaps.' },
    { req: '#0702#', sec: '5.2', title: 'Monitoring results meet defined pass rate thresholds',                  status: 'complete',    evidence: 'test-session',            ref: 'QC Summary Report ICC 2026-Q1', resp: 'Q. Dept.',      target: '2026-05-01', done: '2026-04-20', notes: 'Pass rate 96.1%. Above threshold.' },
    { req: '#0705#', sec: '5.3', title: 'SPC evidence: control charts and Cpk ≥ 1.33',                         status: 'in-progress', evidence: 'test-session',            ref: 'SPC-ICC-2026 (overlay peel open)',resp: 'SPC Team',      target: '2026-06-30', done: null,         notes: 'Overlay peel Cpk = 1.19. Below 1.33. Investigation tied to lamination CAPA 26-04/PST01.' },
    { req: '#0811#', sec: '5.4', title: 'Cpk data available for critical test parameters',                       status: 'in-progress', evidence: 'test-session',            ref: 'CPK-ICC-2026-04',               resp: 'SPC Team',      target: '2026-06-30', done: null,         notes: 'Thickness Cpk = 1.41 (pass). Peel Cpk = 1.19 (fail). Corrective action in progress.' },
    { req: '#0571#', sec: '4.9', title: 'Intermediate design review completed and signed off',                   status: 'complete',    evidence: 'design-review',           ref: 'DDR-ICC-2026 Intermediate',      resp: 'Sarah Chen',    target: '2026-03-31', done: '2026-03-28', notes: 'Approved conditional — 3 actions open, due 2026-06-30.' },
    { req: '#0571#', sec: '4.9', title: 'Final design review completed and approved',                            status: 'pending',     evidence: 'design-review',           ref: 'Scheduled 2026-07-15',           resp: 'Sarah Chen',    target: '2026-07-15', done: null,         notes: 'Blocked by NC+ packaging CAPA and nc- lamination CAPA.' },
    { req: '#0583#', sec: '5.0', title: 'All NC process steps have documented corrective actions',               status: 'in-progress', evidence: 'capa',                    ref: '26-04/PST01, 26-04/PST02, 26-04/QMS01', resp: 'Q. Dept.', target: '2026-06-30', done: null,     notes: '3 CAPAs open: NC+ fulfilment, nc- lamination, nc- doc control.' },
    { req: '#0601#', sec: '6.1', title: 'Equipment calibration records available',                               status: 'in-progress', evidence: 'document',                ref: 'CAL-CPI-2026 (partial)',          resp: 'Metrology',     target: '2026-05-15', done: null,         notes: 'Lamination station 4 probe recalibration in progress (CAPA). All other instruments current.' },
    { req: '#0602#', sec: '6.2', title: 'Operator training records available',                                   status: 'complete',    evidence: 'document',                ref: 'TRN-CPI-2026-04',                resp: 'HR',            target: '2026-05-01', done: '2026-04-18', notes: '94% coverage. 3 new hires in lamination cert training.' },
    { req: '#0603#', sec: '6.3', title: 'Work instructions / SOPs available and controlled',                     status: 'in-progress', evidence: 'document',                ref: 'Pending — CAPA 26-04/QMS01',    resp: 'Doc Control',   target: '2026-06-30', done: null,         notes: 'Blocked by doc control CAPA. 4 WIs require revision dating.' },
    { req: '#0604#', sec: '6.4', title: 'Product specifications and drawing package available',                  status: 'complete',    evidence: 'document',                ref: 'CPI-ICC-SPEC-2026 Rev2',         resp: 'Engineering',   target: '2026-05-01', done: '2026-04-22', notes: 'Customer-approved spec pack confirmed on file.' },
  ];
  for (const i of plan2Items) {
    await q(`INSERT INTO nexus_qualification_items
      (plan_id, requirement_id, section, title, status, evidence_type, evidence_ref,
       responsible, target_date, completed_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [plan2Id, i.req, i.sec, i.title, i.status, i.evidence, i.ref, i.resp, i.target, i.done, i.notes]);
  }
  await q(`INSERT INTO nexus_design_reviews
    (plan_id, review_type, reviewer, review_date, outcome, notes, created_by, created_at, updated_at)
    VALUES
      (?, 'intermediate', 'Michael Torres', '2026-03-28', 'conditional',
       'Intermediate DR approved conditional on: (1) close NC+ fulfilment/packaging CAPA by 2026-06-30, (2) close nc- lamination temp/Cpk CAPA by 2026-06-30, (3) close nc- document control CAPA by 2026-06-30.',
       ?, NOW(), NOW()),
      (?, 'final', null, null, 'pending',
       'Final DR pending. Blocked by 3 open conditional actions from intermediate review. Target date: 2026-07-15.',
       ?, NOW(), NOW())`,
    [plan2Id, adminId, plan2Id, adminId]);
  console.log(`  ✅ Qualification plan: ${plan2Items.length} items + 2 design reviews`);

  // CAPAs — Audit 2 (3 items)
  await q(`INSERT INTO nexus_capa_items
    (audit_record_id, action_id, requirement_id, source_type,
     severity, observation, suggested_action, deadline,
     corrective_action, target_date, responsibility, status, status_description,
     auditor_review_status, auditor_comment, created_by, created_at, updated_at)
    VALUES
    (?, ?, '#0583#', 'process-step',
     'NC+',
     'No documented packaging specification found for personalized card fulfilment and shipment. Cards assembled in plain trays without tamper-evident sealing. No defined AQL inspection level for outgoing product. No shipper qualification criteria documented. Significant non-conformity.',
     'Create and approve a packaging specification covering: tamper-evident packaging requirement, AQL sampling plan, label content requirements, and shipper qualification criteria. Validate new process before next production run.',
     '2026-06-30',
     null, '2026-06-30', 'Operations Manager / Quality Director', 'Ongoing',
     'Packaging spec draft PKG-SPEC-001 Rev Draft in review. Target approval 2026-05-31.',
     'Open',
     'Critical finding. Final design review cannot proceed until this CAPA is closed and verified.',
     ?, NOW(), NOW())`,
    [aud2Id, actionId(2026, 4, 'PST', 1), adminId]);

  await q(`INSERT INTO nexus_capa_items
    (audit_record_id, action_id, requirement_id, source_type,
     severity, observation, suggested_action, deadline,
     corrective_action, target_date, responsibility, status, status_description,
     auditor_review_status, auditor_comment, created_by, created_at, updated_at)
    VALUES
    (?, ?, '#0583#', 'process-step',
     'nc-',
     'Lamination station 4 temperature probe shows 2°C deviation below setpoint during audit observation. Calibration certificate expired 2026-03-01. Overlay peel strength Cpk = 1.19, below CQM 1.33 threshold. Possible causal link between temperature control gap and reduced peel performance.',
     'Recalibrate lamination station 4 temperature probe. Perform root cause analysis on peel Cpk. Implement SPC control chart for lamination temperature at station 4.',
     '2026-06-30',
     'Station 4 probe recalibrated 2026-04-15 by external metrology lab. Root cause analysis initiated — temperature deviation confirmed to correlate with peel Cpk reduction. SPC chart design in progress.',
     '2026-06-15', 'Process Engineering / Metrology', 'Ongoing',
     'Recalibration complete. Latest Cpk trending up (1.21 as of 2026-04-28). SPC chart implementation on track for 2026-05-20.',
     'Open', null,
     ?, NOW(), NOW())`,
    [aud2Id, actionId(2026, 4, 'PST', 2), adminId]);

  await q(`INSERT INTO nexus_capa_items
    (audit_record_id, action_id, requirement_id, source_type,
     severity, observation, suggested_action, deadline,
     corrective_action, target_date, responsibility, status, status_description,
     auditor_review_status, auditor_comment, created_by, created_at, updated_at)
    VALUES
    (?, ?, '#0521#', 'qms',
     'nc-',
     '4 work instructions found without revision dates: WI-LAM-007 (Lamination Temperature Control), WI-LAM-012 (Lamination Pressure Profile), WI-PERS-003 (Personalization Setup), WI-PERS-008 (Fulfilment Inspection). Minor non-conformity against document control procedure.',
     'Update all 4 work instructions to include revision date in document header and update document register. Implement a periodic review schedule (annual) for all manufacturing WIs.',
     '2026-06-30',
     'WI-LAM-007 and WI-LAM-012 updated and re-issued. WI-PERS-003 and WI-PERS-008 in review cycle.',
     '2026-05-31', 'Document Control Coordinator', 'Ongoing',
     '2 of 4 WIs updated. Remaining 2 personalization WIs targeted for completion 2026-05-15.',
     'Open', null,
     ?, NOW(), NOW())`,
    [aud2Id, actionId(2026, 4, 'QMS', 1), adminId]);
  console.log(`  ✅ 3 CAPA items (NC+, nc-, nc-)`);

  // Alerts — Audit 2
  await q(`INSERT INTO nexus_alerts
    (audit_record_id, alert_type, severity, title, message, action_required,
     requirement_id, entity_type, is_read, is_dismissed, created_at)
    VALUES
    (?, 'nc-no-capa', 'critical',
     'NC+ open — Personalization Fulfilment has no packaging specification',
     'Audit record for CPI Card Group has an open NC+ finding on Personalization Fulfilment step (P80). CAPA 26-04/PST01 is Ongoing. Cards are currently being shipped without a documented packaging spec or tamper-evident sealing. This audit cannot advance to Grade A/B/C until resolved.',
     'Review CAPA 26-04/PST01 progress. Escalate if PKG-SPEC-001 approval is delayed past 2026-05-31. Consider interim control measure.',
     '#0583#', 'capa_item', false, false, NOW()),

    (?, 'overdue-capa', 'high',
     'Lamination Cpk still below 1.33 — nc- CAPA 26-04/PST02 approaching deadline',
     'Lamination station 4 temp probe was recalibrated 2026-04-15. Latest overlay peel Cpk = 1.21 — still below the 1.33 CQM threshold. CAPA due 2026-06-15.',
     'Confirm SPC control chart for lamination temperature implemented before 2026-05-20. Re-measure overlay peel Cpk on 30-card sample after stabilization. Update CAPA status.',
     '#0583#', 'capa_item', false, false, NOW()),

    (?, 'low-qms-score', 'high',
     'QMS conformity score below 80% threshold',
     'Current QMS assessment shows NC+ (document control procedure — no change process) and nc- (4 undated WIs) findings. Estimated conformity score ~67%, below the 80% threshold required for Grade A consideration.',
     'Prioritize closure of CAPA 26-04/QMS01 (WI revision dates). Once all 4 WIs are updated, re-assess conformity score to confirm above 80%.',
     null, null, false, false, NOW()),

    (?, 'capa-due-soon', 'medium',
     'Document control CAPA 26-04/QMS01 — 2 of 4 WIs still pending',
     'CAPA 26-04/QMS01 (nc- document control) has target date 2026-05-31. WI-PERS-003 and WI-PERS-008 revision dates not yet added.',
     'Confirm WI-PERS-003 and WI-PERS-008 are updated and signed off before 2026-05-15. Update CAPA status and notify auditor.',
     '#0521#', 'capa_item', true, false, NOW())`,
    [aud2Id, aud2Id, aud2Id, aud2Id]);
  console.log(`  ✅ 4 alerts (1 critical, 2 high, 1 medium)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
🎉 NEXUS demo data seeded successfully!

  Audit 1 — Idemia France SAS (id=${aud1Id})
            CB + ICC card manufacturer, France — Grade A, Closed, ISO 9001
            17 QMS assessments | 2 scopes: CB (20 steps) + ICC (9 steps)
            1 CAPA (RI, Complete) | 12 qualification items (all complete) | 2 design reviews (both approved)
            6 document refs | 3 audit components | 1 alert (low)

  Audit 2 — CPI Card Group (id=${aud2Id})
            ICC assembly + Personalization, USA — Grade B, In-Progress, non-ISO 9001
            12 QMS assessments | 2 scopes: ICC (11 steps, nc- lamination) + Personalization (14 steps, NC+ fulfilment)
            3 CAPAs (NC+ packaging, nc- lamination Cpk, nc- doc control)
            12 qualification items (mixed) | 2 design reviews (intermediate conditional, final pending)
            4 document refs | 3 audit components | 4 alerts (critical/high/high/medium)
`);

  await sequelize.close();
}

main().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
