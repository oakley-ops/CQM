/**
 * Seed 3 dummy NEXUS Hub audit records for demo/testing:
 *   1. PASSING  – GlobalCard Manufacturing GmbH (Grade A, closed)
 *   2. FAILING  – Pacific Smart Cards Ltd. (Grade D, submitted)
 *   3. AT RISK  – Meridian Card Solutions S.A. (Grade C, in-progress)
 *
 * Run:  node backend/seed-nexus-dummy-audits.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const {
  NexusAuditRecord,
  NexusQmsAssessment,
  NexusCapaItem,
  NexusProductScope,
  NexusProcessStepAssessment,
  NexusDocumentRef,
  NexusAuditComponent,
} = require('./models');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function qmsRow(auditId, reqId, section, title, conformity, vendorCompliance, comment = null) {
  return {
    audit_record_id: auditId,
    requirement_id: reqId,
    section,
    title,
    vendor_compliance: vendorCompliance,
    conformity,
    auditor_comment: comment,
  };
}

function capaRow(auditId, seq, reqId, severity, observation, suggestedAction, status, deadline, responsibility, auditorReviewStatus = 'Open') {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return {
    audit_record_id: auditId,
    action_id: `${yy}-${mm}/AUD${auditId}-${String(seq).padStart(2, '0')}`,
    requirement_id: reqId,
    source_type: 'qms',
    severity,
    observation,
    suggested_action: suggestedAction,
    deadline,
    responsibility,
    status,
    auditor_review_status: auditorReviewStatus,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit 1 — PASSING  GlobalCard Manufacturing GmbH (DE) — Grade A
// ─────────────────────────────────────────────────────────────────────────────
async function seedPassing() {
  const audit = await NexusAuditRecord.create({
    site_name: 'GlobalCard Manufacturing GmbH',
    company: 'GlobalCard Group',
    address_line1: 'Industriestrasse 42',
    city: 'Frankfurt',
    state_province: 'Hesse',
    postal_code: '60549',
    country_code: 'DE',
    audit_date_start: '2025-10-14',
    audit_date_end: '2025-10-16',
    auditor_name: 'Sophie Müller',
    audit_type: 'on-site',
    audit_scope: 'renewal',
    iso_9001_certified: true,
    grade: 'A',
    status: 'closed',
    cqmap_version: 'V3.A',
    next_audit_date: '2027-10-16',
    report_date: '2025-10-20',
    notes: 'Site demonstrated excellent QMS maturity. ISO 9001:2015 certification in good standing. All prior CAPA actions verified closed.',
  });

  const id = audit.id;

  // QMS — mostly Full / RI, two nc- all resolved
  await NexusQmsAssessment.bulkCreate([
    qmsRow(id, '#0111#', '4.4.1', 'Understanding the organization and its context', 'Full', 'Yes', 'Context documented in QMS manual rev 4.2; SWOT analysis updated Q3 2025.'),
    qmsRow(id, '#0112#', '4.4.2', 'Understanding the needs and expectations of interested parties', 'Full', 'Yes', 'Stakeholder register maintained and reviewed annually.'),
    qmsRow(id, '#0113#', '4.4.3', 'Determining the scope of the quality management system', 'Full', 'Yes'),
    qmsRow(id, '#0114#', '4.4.4', 'Management System and Processes', 'Full', 'Yes', 'Process map and turtle diagrams available for all key processes.'),
    qmsRow(id, '#0211#', '4.5.1.1', 'Leadership and commitment – General', 'Full', 'Yes', 'Management review minutes reviewed — held quarterly.'),
    qmsRow(id, '#0212#', '4.5.1.2', 'Leadership and commitment – Customer focus', 'Full', 'Yes'),
    qmsRow(id, '#0221#', '4.5.2.1', 'Establishing the quality policy', 'Full', 'Yes'),
    qmsRow(id, '#0222#', '4.5.2.2', 'Communicating the quality policy', 'RI', 'Yes', 'Policy posted on intranet only; recommend physical posting in production area.'),
    qmsRow(id, '#0231#', '4.5.3', 'Organization – Roles, responsibilities and authorities', 'Full', 'Yes'),
    qmsRow(id, '#0233#', '4.5.3.2', 'Organization – CQM Primary Contact', 'Full', 'Yes'),
    qmsRow(id, '#0234#', '4.5.3.3', 'Organization – Complaints Handling Responsibility', 'Full', 'Yes'),
    qmsRow(id, '#0310#', '4.6.1', 'Planning – Actions to address risks and opportunities', 'Full', 'Yes'),
    qmsRow(id, '#0585#', '4.6.1.2', 'Planning – Risk Management (pFMEA, dFMEA etc)', 'Full', 'Yes', 'FMEA reviewed and updated post last NCE. Actions closed.'),
    qmsRow(id, '#0311#', '4.6.2', 'Planning – Quality objectives and planning to achieve them', 'Full', 'Yes'),
    qmsRow(id, '#0411#', '4.7.1.1', 'Resources – General', 'Full', 'Yes'),
    qmsRow(id, '#0421#', '4.7.1.2', 'Resources – People', 'Full', 'Yes'),
    qmsRow(id, '#0431#', '4.7.1.3', 'Resources – Infrastructure', 'Full', 'Yes'),
    qmsRow(id, '#0432#', '4.7.2', 'Resources – Physical Security', 'nc-', 'Yes', 'Badge reader log retention was 30 days — below 90-day requirement. Corrected during audit.'),
    qmsRow(id, '#0441#', '4.7.2.2.1', 'Monitoring and measuring resources – General', 'Full', 'Yes'),
    qmsRow(id, '#0442#', '4.7.2.2.2', 'Monitoring and measuring resources – Measurement traceability', 'Full', 'Yes'),
    qmsRow(id, '#0451#', '4.7.2.3', 'Organizational Knowledge', 'nc-', 'Procedure only', 'Training records for 2 new operatives missing sign-off. HR confirmed corrected.'),
    qmsRow(id, '#0312#', '4.6.3', 'Planning – Planning of changes of the QMS', 'Full', 'Yes'),
  ]);

  // CAPAs — both closed
  await NexusCapaItem.bulkCreate([
    capaRow(id, 1, '#0432#', 'nc-',
      'Badge reader access logs retained for only 30 days against the 90-day CQMAP requirement.',
      'Update DLP policy to enforce 90-day retention; verify with IT within 30 days.',
      'Complete', '2025-11-15', 'IT Security Manager – Klaus Bauer', 'Completed'),
    capaRow(id, 2, '#0451#', 'nc-',
      'Training completion sign-offs absent for 2 newly onboarded machine operators.',
      'HR to obtain backdated signatures and implement automated training tracker.',
      'Complete', '2025-11-15', 'HR Director – Anna Fischer', 'Completed'),
  ]);

  // Product scope — IC and ICM cards, both certified
  const ic = await NexusProductScope.create({
    audit_record_id: id,
    product_category: 'ic',
    product_name: 'GlobalChip CC-4 Contact Card',
    product_variant: 'Dual interface EMV',
    in_scope: true,
    audited: true,
    rank: 'A',
    cert_outcome: 'A',
    notes: 'High-volume production line. All process steps conformant.',
  });

  const icm = await NexusProductScope.create({
    audit_record_id: id,
    product_category: 'icm',
    product_name: 'GlobalChip MC-7 Contactless Module',
    product_variant: 'M/Chip Advance',
    in_scope: true,
    audited: true,
    rank: 'A',
    cert_outcome: 'A',
    notes: 'Module qualification completed Q2 2025.',
  });

  // Process steps for IC card
  await NexusProcessStepAssessment.bulkCreate([
    { product_scope_id: ic.id, process_tag: 'P01', process_name: 'Wafer Preparation', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P02', process_name: 'Module Assembly', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P03', process_name: 'Card Body Lamination', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P04', process_name: 'Module Embedding', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P05', process_name: 'Electrical Testing', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P06', process_name: 'Personalization', conformity: 'RI', vendor_compliance: 'Yes', auditor_notes: 'Minor rework logging gap — improvement suggested.' },
    { product_scope_id: icm.id, process_tag: 'P01', process_name: 'Antenna Coil Winding', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: icm.id, process_tag: 'P02', process_name: 'Inlay Lamination', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: icm.id, process_tag: 'P03', process_name: 'RF Testing', conformity: 'Full', vendor_compliance: 'Yes' },
  ]);

  // Documents
  await NexusDocumentRef.bulkCreate([
    { audit_record_id: id, requirement_id: '#0114#', doc_id: 'QM-001', title: 'Quality Management Manual Rev 4.2', doc_type: 'Quality Manual', version: '4.2' },
    { audit_record_id: id, requirement_id: '#0585#', doc_id: 'FMEA-IC-007', title: 'pFMEA – IC Card Assembly Line', doc_type: 'FMEA', version: '7.0' },
    { audit_record_id: id, requirement_id: '#0441#', doc_id: 'CAL-2025', title: 'Calibration Schedule 2025 – Electrical Test Equipment', doc_type: 'Calibration Record', version: '2025' },
    { audit_record_id: id, requirement_id: '#0432#', doc_id: 'SEC-POL-003', title: 'Physical Security Policy', doc_type: 'Policy', version: '3.1' },
    { audit_record_id: id, requirement_id: '#0421#', doc_id: 'HR-TRAIN-2025', title: 'Operator Training Matrix 2025', doc_type: 'Training Record', version: '2025' },
  ]);

  // Components
  await NexusAuditComponent.bulkCreate([
    { audit_record_id: id, component_type: 'ICM', article_number: 'SLE97144', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'Infineon Technologies', supplier_city: 'Munich', supplier_country_code: 'DE', cert_status: 'Supplier (CQM certified)', cert_label: 'MC-CHIP-2024' },
    { audit_record_id: id, component_type: 'CB', article_number: 'PVC-WH-760', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'Klöckner Pentaplast', supplier_city: 'Montabaur', supplier_country_code: 'DE', cert_status: 'Supplier (CQM certified)', cert_label: 'MC-BODY-2024' },
    { audit_record_id: id, component_type: 'aIL (no IC)', article_number: 'ANT-DI-320', used_for_product: 'ICM', supplier_name: 'Smartrac Technology', supplier_city: 'Amsterdam', supplier_country_code: 'NL', cert_status: 'Subcontractor (CQM certified themselves)', cert_label: 'MC-ANT-2023' },
    { audit_record_id: id, component_type: 'CB', article_number: 'EP-3422B', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'Henkel AG', supplier_city: 'Düsseldorf', supplier_country_code: 'DE', cert_status: 'Supplier (CQM certified)' },
  ]);

  console.log(`✓ PASSING audit created — ID ${id} (GlobalCard Manufacturing GmbH, Grade A)`);
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit 2 — FAILING  Pacific Smart Cards Ltd. (PH) — Grade D
// ─────────────────────────────────────────────────────────────────────────────
async function seedFailing() {
  const audit = await NexusAuditRecord.create({
    site_name: 'Pacific Smart Cards Ltd.',
    company: 'Pacific Electronics Group',
    address_line1: 'PEZA Industrial Zone, Bldg 7',
    city: 'Laguna',
    state_province: 'Calabarzon',
    postal_code: '4030',
    country_code: 'PH',
    audit_date_start: '2025-11-03',
    audit_date_end: '2025-11-05',
    auditor_name: 'James Reyes',
    audit_type: 'on-site',
    audit_scope: 'renewal',
    iso_9001_certified: false,
    grade: 'D',
    status: 'submitted',
    cqmap_version: 'V3.A',
    next_audit_date: '2026-05-05',
    report_date: '2025-11-12',
    notes: 'Multiple critical non-conformities identified. Security controls severely deficient. Physical access logs not maintained. CAPA register not managed since last audit. Re-audit required within 6 months.',
  });

  const id = audit.id;

  await NexusQmsAssessment.bulkCreate([
    qmsRow(id, '#0111#', '4.4.1', 'Understanding the organization and its context', 'nc-', 'Procedure only', 'Context analysis exists but is 3 years out of date.'),
    qmsRow(id, '#0112#', '4.4.2', 'Understanding the needs and expectations of interested parties', 'tbd', 'tbd'),
    qmsRow(id, '#0113#', '4.4.3', 'Determining the scope of the quality management system', 'nc-', 'Procedure only', 'Scope statement does not reflect current product lines (contactless added in 2023, not included).'),
    qmsRow(id, '#0114#', '4.4.4', 'Management System and Processes', 'NC+', 'No', 'No process map exists. Procedures are informal, undocumented verbal instructions for 4 of 8 key processes.'),
    qmsRow(id, '#0211#', '4.5.1.1', 'Leadership and commitment – General', 'NC+', 'No', 'Management review not conducted in 18 months. No minutes available.'),
    qmsRow(id, '#0212#', '4.5.1.2', 'Leadership and commitment – Customer focus', 'nc-', 'Practice only', 'Customer KPIs not formally tracked.'),
    qmsRow(id, '#0221#', '4.5.2.1', 'Establishing the quality policy', 'Full', 'Yes', 'Quality policy posted and signed by GM.'),
    qmsRow(id, '#0222#', '4.5.2.2', 'Communicating the quality policy', 'nc-', 'Practice only', 'Operators interviewed unaware of quality policy content.'),
    qmsRow(id, '#0231#', '4.5.3', 'Organization – Roles, responsibilities and authorities', 'nc-', 'Procedure only', 'QA Manager role vacant for 4 months. Responsibilities unassigned.'),
    qmsRow(id, '#0233#', '4.5.3.2', 'Organization – CQM Primary Contact', 'Full', 'Yes'),
    qmsRow(id, '#0234#', '4.5.3.3', 'Organization – Complaints Handling Responsibility', 'NC+', 'No', 'No complaints log maintained. 3 customer NCEs from 2024 have no recorded response.'),
    qmsRow(id, '#0310#', '4.6.1', 'Planning – Actions to address risks and opportunities', 'NC+', 'No', 'No risk register. FMEA last updated 2021, prior product family.'),
    qmsRow(id, '#0585#', '4.6.1.2', 'Planning – Risk Management (pFMEA, dFMEA etc)', 'NC+', 'No', 'Process FMEA absent for IC embedding and electrical test lines.'),
    qmsRow(id, '#0311#', '4.6.2', 'Planning – Quality objectives and planning to achieve them', 'nc-', 'Procedure only', 'Objectives defined but no measurement system in place.'),
    qmsRow(id, '#0411#', '4.7.1.1', 'Resources – General', 'RI', 'Yes', 'Equipment list exists but maintenance records incomplete for 30% of assets.'),
    qmsRow(id, '#0421#', '4.7.1.2', 'Resources – People', 'NC+', 'No', 'No formal competency assessment. 6 operatives without required training certifications.'),
    qmsRow(id, '#0431#', '4.7.1.3', 'Resources – Infrastructure', 'nc-', 'Practice only', 'Clean room differential pressure alarms disabled. No compensating control.'),
    qmsRow(id, '#0432#', '4.7.2', 'Resources – Physical Security', 'NC+', 'No', 'Production area accessible without badge. Visitor log not maintained. CCTV coverage gap on loading bay.'),
    qmsRow(id, '#0441#', '4.7.2.2.1', 'Monitoring and measuring resources – General', 'nc-', 'Practice only', '4 test instruments overdue for calibration.'),
    qmsRow(id, '#0442#', '4.7.2.2.2', 'Monitoring and measuring resources – Measurement traceability', 'NC+', 'No', 'Calibration certificates for 2 critical instruments cannot be located.'),
    qmsRow(id, '#0451#', '4.7.2.3', 'Organizational Knowledge', 'nc-', 'Procedure only', 'Key process knowledge held by single individuals with no documented backup.'),
    qmsRow(id, '#0312#', '4.6.3', 'Planning – Planning of changes of the QMS', 'nc-', 'tbd', 'Change control procedure exists but evidence of use not demonstrated.'),
  ]);

  // CAPAs — 7 items, 5 open/overdue, 1 ongoing, 1 complete
  const today = new Date();
  const pastDeadline = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  const futureDeadline = (daysAhead) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  await NexusCapaItem.bulkCreate([
    capaRow(id, 1, '#0114#', 'NC+',
      'No documented process map. 4 of 8 key production processes have no written procedure.',
      'Document all production process procedures and publish to QMS within 60 days. Train operatives.',
      'Not yet started', pastDeadline(45), 'QA Manager (vacant – interim: Operations Director)',
      'Open'),
    capaRow(id, 2, '#0211#', 'NC+',
      'Management review has not been conducted in 18 months.',
      'Schedule and hold management review within 30 days. Establish quarterly cadence going forward.',
      'Not yet started', pastDeadline(60), 'General Manager – Ricardo Santos',
      'Open'),
    capaRow(id, 3, '#0234#', 'NC+',
      '3 customer NCEs from 2024 have no documented root cause or customer response on record.',
      'Investigate all 3 NCEs, complete 8D reports, and submit responses to Mastercard.',
      'Not yet started', pastDeadline(30), 'Quality Manager (interim)',
      'Open'),
    capaRow(id, 4, '#0432#', 'NC+',
      'Production area accessible without access control. CCTV gap on loading bay. No visitor log.',
      'Install badge reader on production entry. Fix CCTV blind spot. Implement mandatory visitor log.',
      'Ongoing', pastDeadline(15), 'Facilities Manager – Mario Cruz',
      'Open'),
    capaRow(id, 5, '#0585#', 'NC+',
      'Process FMEA absent for IC embedding line and electrical test processes.',
      'Conduct pFMEA for both processes with cross-functional team. Review with QA.',
      'Not yet started', pastDeadline(20), 'Process Engineering Lead',
      'Open'),
    capaRow(id, 6, '#0421#', 'NC+',
      '6 operatives lack required training certifications for their assigned processes.',
      'Enroll operatives in required training. No uncertified operator to run critical processes.',
      'Ongoing', futureDeadline(14), 'HR Manager – Lourdes Dela Cruz',
      'Open'),
    capaRow(id, 7, '#0442#', 'NC+',
      'Calibration certificates missing for 2 critical test instruments.',
      'Locate or re-calibrate instruments. Remove from service until certificates confirmed.',
      'Complete', pastDeadline(5), 'Metrology Lead',
      'Completed'),
  ]);

  // Product scope — IC card (in scope, failed), ICM (in scope, failed)
  const ic = await NexusProductScope.create({
    audit_record_id: id,
    product_category: 'ic',
    product_name: 'PacCard IC-100 Contact Card',
    product_variant: 'EMV Contact',
    in_scope: true,
    audited: true,
    rank: 'D',
    cert_outcome: 'N',
    notes: 'Multiple NC+ process step findings. Production suspended pending corrective actions.',
  });

  const icm = await NexusProductScope.create({
    audit_record_id: id,
    product_category: 'icm',
    product_name: 'PacCard CL-200 Contactless Module',
    product_variant: 'NFC/RFID',
    in_scope: true,
    audited: true,
    rank: 'D',
    cert_outcome: 'N',
    notes: 'Antenna coil process has no documented procedure or FMEA.',
  });

  await NexusProcessStepAssessment.bulkCreate([
    { product_scope_id: ic.id, process_tag: 'P01', process_name: 'Wafer Preparation', conformity: 'nc-', vendor_compliance: 'Practice only', auditor_notes: 'Procedure exists but not followed; ESD controls observed to be inconsistent.' },
    { product_scope_id: ic.id, process_tag: 'P02', process_name: 'Module Assembly', conformity: 'NC+', vendor_compliance: 'No', auditor_notes: 'No written work instruction. Operator demonstrated variation in process parameters.' },
    { product_scope_id: ic.id, process_tag: 'P03', process_name: 'Card Body Lamination', conformity: 'nc-', vendor_compliance: 'Practice only', auditor_notes: 'Temperature log has gaps. Press calibration overdue.' },
    { product_scope_id: ic.id, process_tag: 'P04', process_name: 'Module Embedding', conformity: 'NC+', vendor_compliance: 'No', auditor_notes: 'No control plan. Reject rate 4.2% vs 0.5% target — unaddressed.' },
    { product_scope_id: ic.id, process_tag: 'P05', process_name: 'Electrical Testing', conformity: 'nc-', vendor_compliance: 'Practice only', auditor_notes: '2 test instruments overdue for calibration; still in use.' },
    { product_scope_id: icm.id, process_tag: 'P01', process_name: 'Antenna Coil Winding', conformity: 'NC+', vendor_compliance: 'No', auditor_notes: 'No documented procedure. Yield data not collected.' },
    { product_scope_id: icm.id, process_tag: 'P02', process_name: 'Inlay Lamination', conformity: 'nc-', vendor_compliance: 'Procedure only', auditor_notes: 'Procedure not updated since 2022; equipment changed.' },
    { product_scope_id: icm.id, process_tag: 'P03', process_name: 'RF Testing', conformity: 'nc-', vendor_compliance: 'Practice only', auditor_notes: 'Pass/fail criteria not formally defined in procedure.' },
  ]);

  await NexusDocumentRef.bulkCreate([
    { audit_record_id: id, requirement_id: '#0221#', doc_id: 'QP-001', title: 'Quality Policy Statement Rev 1.0', doc_type: 'Policy', version: '1.0' },
    { audit_record_id: id, requirement_id: '#0234#', doc_id: 'COMP-LOG', title: 'Customer Complaints Register (incomplete)', doc_type: 'Log', version: 'N/A', notes: 'Only 2025 Q1 entries present; Q2-Q4 2024 missing.' },
  ]);

  await NexusAuditComponent.bulkCreate([
    { audit_record_id: id, component_type: 'ICM', article_number: 'NXP-P60', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'NXP Semiconductors', supplier_city: 'Eindhoven', supplier_country_code: 'NL', cert_status: 'Supplier (CQM certified)', cert_label: 'MC-CHIP-2023' },
    { audit_record_id: id, component_type: 'CB', article_number: 'PVC-UN-760', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'Local Supplier (unverified)', supplier_city: 'Manila', supplier_country_code: 'PH', cert_status: 'Supplier (not CQM certified)', comment: 'Supplier not on approved vendor list. No qualification evidence.' },
    { audit_record_id: id, component_type: 'aIL (no IC)', article_number: 'UNKNOWN', used_for_product: 'ICM', supplier_name: 'Unknown – no supplier records', supplier_country_code: 'PH', cert_status: 'Subcontractor (not CQM certified themselves)', comment: 'Supplier traceability completely absent.' },
  ]);

  console.log(`✓ FAILING audit created — ID ${id} (Pacific Smart Cards Ltd., Grade D)`);
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit 3 — AT RISK  Meridian Card Solutions S.A. (MX) — Grade C
// ─────────────────────────────────────────────────────────────────────────────
async function seedAtRisk() {
  const audit = await NexusAuditRecord.create({
    site_name: 'Meridian Card Solutions S.A.',
    company: 'Meridian Financial Technologies',
    address_line1: 'Parque Industrial Monterrey Norte, Nave 12',
    city: 'Monterrey',
    state_province: 'Nuevo León',
    postal_code: '66600',
    country_code: 'MX',
    audit_date_start: '2026-01-20',
    audit_date_end: '2026-01-22',
    auditor_name: 'Carlos Herrera',
    audit_type: 'on-site',
    audit_scope: 'renewal',
    iso_9001_certified: false,
    grade: 'C',
    status: 'in-progress',
    cqmap_version: 'V3.A',
    next_audit_date: '2027-01-22',
    report_date: null,
    notes: 'Audit in progress. Several nc- findings raised. 2 potential NC+ issues under investigation regarding security zoning and change control. CAPAs not yet actioned.',
  });

  const id = audit.id;

  const today = new Date();
  const upcoming = (daysAhead) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };
  const pastDeadline = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  await NexusQmsAssessment.bulkCreate([
    qmsRow(id, '#0111#', '4.4.1', 'Understanding the organization and its context', 'Full', 'Yes', 'Context analysis current and reviewed at last management review.'),
    qmsRow(id, '#0112#', '4.4.2', 'Understanding the needs and expectations of interested parties', 'RI', 'Yes', 'Stakeholder needs identified but formal review not documented.'),
    qmsRow(id, '#0113#', '4.4.3', 'Determining the scope of the quality management system', 'Full', 'Yes'),
    qmsRow(id, '#0114#', '4.4.4', 'Management System and Processes', 'RI', 'Procedure only', 'Process documentation exists but several procedures are overdue for review.'),
    qmsRow(id, '#0211#', '4.5.1.1', 'Leadership and commitment – General', 'Full', 'Yes', 'Management review held semi-annually. Minutes available.'),
    qmsRow(id, '#0212#', '4.5.1.2', 'Leadership and commitment – Customer focus', 'Full', 'Yes'),
    qmsRow(id, '#0221#', '4.5.2.1', 'Establishing the quality policy', 'Full', 'Yes'),
    qmsRow(id, '#0222#', '4.5.2.2', 'Communicating the quality policy', 'Full', 'Yes'),
    qmsRow(id, '#0231#', '4.5.3', 'Organization – Roles, responsibilities and authorities', 'nc-', 'Practice only', 'QA and Operations roles overlap in 2 process areas. Accountability unclear.'),
    qmsRow(id, '#0233#', '4.5.3.2', 'Organization – CQM Primary Contact', 'Full', 'Yes'),
    qmsRow(id, '#0234#', '4.5.3.3', 'Organization – Complaints Handling Responsibility', 'nc-', 'Procedure only', 'Complaints procedure not followed consistently — 2 cases closed without root cause.'),
    qmsRow(id, '#0310#', '4.6.1', 'Planning – Actions to address risks and opportunities', 'nc-', 'Procedure only', 'Risk register exists but only updated at year-end; mid-year production changes not captured.'),
    qmsRow(id, '#0585#', '4.6.1.2', 'Planning – Risk Management (pFMEA, dFMEA etc)', 'RI', 'Yes', 'pFMEA present for main line. New embedding machine added in Q3 — FMEA update in draft, not finalized.'),
    qmsRow(id, '#0311#', '4.6.2', 'Planning – Quality objectives and planning to achieve them', 'Full', 'Yes'),
    qmsRow(id, '#0411#', '4.7.1.1', 'Resources – General', 'Full', 'Yes'),
    qmsRow(id, '#0421#', '4.7.1.2', 'Resources – People', 'nc-', 'Procedure only', 'Training matrix exists but 3 operators have lapsed certifications not yet renewed.'),
    qmsRow(id, '#0431#', '4.7.1.3', 'Resources – Infrastructure', 'Full', 'Yes'),
    qmsRow(id, '#0432#', '4.7.2', 'Resources – Physical Security', 'nc-', 'Yes', 'Security zoning separating personalization area from general production is inconsistently enforced. Under investigation — may escalate to NC+.'),
    qmsRow(id, '#0441#', '4.7.2.2.1', 'Monitoring and measuring resources – General', 'Full', 'Yes'),
    qmsRow(id, '#0442#', '4.7.2.2.2', 'Monitoring and measuring resources – Measurement traceability', 'RI', 'Yes', '1 non-critical instrument calibration overdue by 3 weeks.'),
    qmsRow(id, '#0451#', '4.7.2.3', 'Organizational Knowledge', 'Full', 'Yes'),
    qmsRow(id, '#0312#', '4.6.3', 'Planning – Planning of changes of the QMS', 'nc-', 'Procedure only', 'Change control log has 3 entries where impact assessment was skipped.'),
  ]);

  // CAPAs — 4 open, deadlines approaching, none overdue yet
  await NexusCapaItem.bulkCreate([
    capaRow(id, 1, '#0432#', 'nc-',
      'Physical separation between personalization area and general production is not consistently maintained. Tailgating observed on two occasions.',
      'Install interlocked access gates between zones. Brief all staff on security zoning policy. Security audit to confirm effectiveness.',
      'Not yet started', upcoming(21), 'Facilities & Security Manager – Elena Morales',
      'Open'),
    capaRow(id, 2, '#0231#', 'nc-',
      'Overlapping quality/operations responsibilities in IC embedding and electrical test areas creating accountability gaps.',
      'Revise RACI matrix for embedding and test processes. Update job descriptions. Re-brief team leads.',
      'Not yet started', upcoming(30), 'Operations Director – Miguel Ángel Torres',
      'Open'),
    capaRow(id, 3, '#0234#', 'nc-',
      '2 customer complaint cases closed without documented root cause analysis.',
      'Re-open both cases, complete 8D or PDCA root cause. Update complaints procedure to enforce RC step as gate.',
      'Ongoing', upcoming(14), 'Quality Manager – Sofía Gutiérrez',
      'Open'),
    capaRow(id, 4, '#0421#', 'nc-',
      '3 operators with lapsed certifications continue to work on assigned processes.',
      'Immediately reassign operators to non-critical tasks until recertified. Schedule training within 2 weeks.',
      'Ongoing', upcoming(10), 'HR & Training Lead – Juan Ramírez',
      'Open'),
    capaRow(id, 5, '#0312#', 'nc-',
      '3 change control entries lack the required impact assessment.',
      'Retrospectively complete impact assessments for the 3 identified changes. Enforce gate in change control form.',
      'Not yet started', pastDeadline(7), 'QA Manager – Sofía Gutiérrez',
      'Open'),
  ]);

  // Product scope — IC in scope (at risk), CB under review
  const ic = await NexusProductScope.create({
    audit_record_id: id,
    product_category: 'ic',
    product_name: 'Meridian MC-3 Dual Interface Card',
    product_variant: 'EMV Dual Interface',
    in_scope: true,
    audited: true,
    rank: 'C',
    cert_outcome: 'R',
    notes: 'Conditional recognition pending resolution of security zoning CAPA. Re-assessment scheduled Q2 2026.',
  });

  const cb = await NexusProductScope.create({
    audit_record_id: id,
    product_category: 'cb',
    product_name: 'Meridian CB-1 Card Body',
    product_variant: 'PVC Composite',
    in_scope: true,
    audited: false,
    rank: 't',
    cert_outcome: null,
    notes: 'Audit of card body line deferred to Q2 2026 due to planned equipment replacement.',
  });

  await NexusProcessStepAssessment.bulkCreate([
    { product_scope_id: ic.id, process_tag: 'P01', process_name: 'Wafer Preparation', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P02', process_name: 'Module Assembly', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P03', process_name: 'Card Body Lamination', conformity: 'nc-', vendor_compliance: 'Yes', auditor_notes: 'New lamination press added Q3 2025; pFMEA update still in draft.' },
    { product_scope_id: ic.id, process_tag: 'P04', process_name: 'Module Embedding', conformity: 'Full', vendor_compliance: 'Yes' },
    { product_scope_id: ic.id, process_tag: 'P05', process_name: 'Electrical Testing', conformity: 'RI', vendor_compliance: 'Yes', auditor_notes: '1 instrument borderline on calibration. Recommend proactive replacement schedule.' },
    { product_scope_id: ic.id, process_tag: 'P06', process_name: 'Personalization', conformity: 'nc-', vendor_compliance: 'Yes', auditor_notes: 'Security zoning between personalization and main floor not consistently enforced — linked to open CAPA.' },
  ]);

  await NexusDocumentRef.bulkCreate([
    { audit_record_id: id, requirement_id: '#0114#', doc_id: 'QM-002', title: 'Quality Management Manual Rev 2.1', doc_type: 'Quality Manual', version: '2.1', notes: 'Several procedures due for review in Q1 2026.' },
    { audit_record_id: id, requirement_id: '#0585#', doc_id: 'FMEA-MC3-005', title: 'pFMEA – Dual Interface Card Assembly (DRAFT)', doc_type: 'FMEA', version: 'DRAFT', notes: 'Update pending for new lamination press — not yet approved.' },
    { audit_record_id: id, requirement_id: '#0432#', doc_id: 'SEC-POL-001', title: 'Physical Security Policy Rev 1.0', doc_type: 'Policy', version: '1.0', notes: 'Policy does not reflect current facility layout post-2024 expansion.' },
    { audit_record_id: id, requirement_id: '#0441#', doc_id: 'CAL-2026', title: 'Calibration Schedule 2026', doc_type: 'Calibration Record', version: '2026', notes: '1 instrument overdue; others on track.' },
  ]);

  await NexusAuditComponent.bulkCreate([
    { audit_record_id: id, component_type: 'ICM', article_number: 'SLE97144', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'Infineon Technologies', supplier_city: 'Munich', supplier_country_code: 'DE', cert_status: 'Supplier (CQM certified)', cert_label: 'MC-CHIP-2024' },
    { audit_record_id: id, component_type: 'CB', article_number: 'PVC-WH-760', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'Klöckner Pentaplast', supplier_city: 'Montabaur', supplier_country_code: 'DE', cert_status: 'Supplier (CQM certified)' },
    { audit_record_id: id, component_type: 'aIL (no IC)', article_number: 'ANT-DI-220', used_for_product: 'mICC (ICC made from ICM and CB)', supplier_name: 'Linxens', supplier_city: 'Paris', supplier_country_code: 'FR', cert_status: 'Subcontractor (CQM certified themselves)', cert_label: 'MC-ANT-2024' },
    { audit_record_id: id, component_type: 'CB', article_number: 'LAM-OVL-50', used_for_product: 'CB', supplier_name: 'HID Global Materials', supplier_city: 'Austin', supplier_country_code: 'US', cert_status: 'Supplier (CQM certification pending)', comment: 'Certification in progress — expected Q2 2026.' },
  ]);

  console.log(`✓ AT RISK audit created — ID ${id} (Meridian Card Solutions S.A., Grade C)`);
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('Seeding NEXUS dummy audits…\n');
    await seedPassing();
    await seedFailing();
    await seedAtRisk();
    console.log('\nAll 3 dummy audits seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
