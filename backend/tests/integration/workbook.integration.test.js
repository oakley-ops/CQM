// backend/tests/integration/workbook.integration.test.js
/**
 * NEXUS Assessment Workbook integration tests.
 * Own DB rebuild + user seeding (same pattern as cqm.integration.test.js).
 */
const request = require('supertest');
const app = require('../../server');
const {
  sequelize, User, NexusProcessStepAssessment,
} = require('../../models');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { buildCqmapWorkbook } = require('../../services/cqmapExportService');

const PASSWORD = 'Passw0rd!';
let token;
let auditId;

const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const dbName = sequelize.config.database;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }
  await sequelize.sync({ force: true });

  await User.create({
    username: 'wb_admin', email: 'wb_admin@test.cqm', password_hash: PASSWORD,
    first_name: 'WB', last_name: 'Admin', role: 'admin',
  });
  const login = await request(app).post('/api/auth/login')
    .send({ username: 'wb_admin', password: PASSWORD });
  token = login.body.data.token;

  const audit = await request(app).post('/api/nexus/audits').set(auth())
    .send({ site_name: 'WB Test Site', company: 'WB Test Co', iso_9001_certified: true });
  auditId = audit.body.id;
});

afterAll(async () => { await sequelize.close(); });

describe('createScope seed_steps flag', () => {
  test('default POST /scope seeds process steps', async () => {
    const res = await request(app).post(`/api/nexus/audits/${auditId}/scope`).set(auth())
      .send({ product_category: 'icc', product_variant: 'ICC - Any IC Card', in_scope: true });
    expect(res.status).toBe(201);
    expect(res.body.steps_seeded).toBeGreaterThan(0);
    const steps = await NexusProcessStepAssessment.count({ where: { product_scope_id: res.body.id } });
    expect(steps).toBe(res.body.steps_seeded);
  });

  test('POST /scope with seed_steps:false creates the scope row but NO steps', async () => {
    const res = await request(app).post(`/api/nexus/audits/${auditId}/scope`).set(auth())
      .send({ product_category: 'icc', product_variant: 'plICC - plastic ICC', in_scope: true, seed_steps: false });
    expect(res.status).toBe(201);
    expect(res.body.steps_seeded).toBe(0);
    const steps = await NexusProcessStepAssessment.count({ where: { product_scope_id: res.body.id } });
    expect(steps).toBe(0);
  });
});

describe('GET /api/nexus/audits/:id/workbook', () => {
  test('returns chapters in doc order with rows and progress', async () => {
    const res = await request(app).get(`/api/nexus/audits/${auditId}/workbook`).set(auth());
    expect(res.status).toBe(200);

    const kinds = res.body.chapters.map(c => c.kind);
    expect(kinds[0]).toBe('site-profile');
    expect(kinds[1]).toBe('scope');
    expect(kinds[2]).toBe('qms');
    expect(kinds[kinds.length - 1]).toBe('readiness');

    // icc was put in scope in the previous describe block → category chapter exists
    const icc = res.body.chapters.find(c => c.kind === 'category' && c.category === 'icc');
    expect(icc).toBeDefined();
    expect(icc.rows.length).toBeGreaterThan(0);
    expect(icc.rows[0]).toHaveProperty('process_tag');
    expect(icc.rows[0]).toHaveProperty('conformity');
    expect(icc.progress.total).toBe(icc.rows.length);

    const qms = res.body.chapters.find(c => c.kind === 'qms');
    expect(qms.rows.length).toBeGreaterThan(0);
    expect(qms.rows[0]).toHaveProperty('requirement_id');

    expect(res.body).toHaveProperty('scopeCatalog');
    expect(res.body).toHaveProperty('capas');
    expect(Array.isArray(res.body.testEvidenceTags)).toBe(true);
  });

  test('404 for a missing audit', async () => {
    const res = await request(app).get('/api/nexus/audits/999999/workbook').set(auth());
    expect(res.status).toBe(404);
  });
});

describe('GET /api/nexus/audits/:id/readiness', () => {
  test('computes xlsx-faithful summaries and a rank suggestion', async () => {
    // Grade one icc step NC+ so a blocker + rank C suggestion appears.
    const wb = await request(app).get(`/api/nexus/audits/${auditId}/workbook`).set(auth());
    const icc = wb.body.chapters.find(c => c.kind === 'category' && c.category === 'icc');
    const step = icc.rows[0];
    await request(app)
      .patch(`/api/nexus/audits/${auditId}/scope/${icc.scopeId}/steps/${step.id}`)
      .set(auth()).send({ conformity: 'NC+' });

    const res = await request(app).get(`/api/nexus/audits/${auditId}/readiness`).set(auth());
    expect(res.status).toBe(200);

    const cat = res.body.categories.find(c => c.category === 'icc');
    expect(cat.summary.counts['NC+']).toBe(1);
    expect(cat.rankSuggestion).toBe('C');

    const blockerTags = res.body.blockers.map(b => b.tag);
    expect(blockerTags).toContain(step.process_tag);
    expect(res.body.qms.summary.total).toBeGreaterThan(0);
  });

  test('404 for a missing audit', async () => {
    const res = await request(app).get('/api/nexus/audits/999999/readiness').set(auth());
    expect(res.status).toBe(404);
  });
});

describe('CQMAP xlsx export', () => {
  test('buildCqmapWorkbook fills coversheet, scope, QMS, and category cells', async () => {
    // Make the data distinctive first.
    await request(app).patch(`/api/nexus/audits/${auditId}`).set(auth())
      .send({ city: 'Burlington', country_code: 'US', primary_contact_name: 'Jane QA' });
    const qmsRes = await request(app).get(`/api/nexus/audits/${auditId}/qms`).set(auth());
    const firstQms = qmsRes.body[0];
    // Use vendor_evidence_ref (free-text) — vendor_compliance is a validated enum.
    // requirement_id contains '#' chars (e.g. #0113#) which are URL fragment delimiters;
    // encode them so the path segment reaches the server correctly.
    await request(app)
      .patch(`/api/nexus/audits/${auditId}/qms/${encodeURIComponent(firstQms.requirement_id)}`)
      .set(auth())
      .send({ conformity: 'Full', vendor_evidence_ref: 'Documented in QM-001' });

    const wb = await buildCqmapWorkbook(auditId);

    const cover = wb.getWorksheet('Coversheet');
    expect(cover.getCell('D5').value).toBe('WB Test Co');
    expect(cover.getCell('D6').value).toBe('WB Test Site');
    expect(cover.getCell('D8').value).toBe('Burlington');

    // Scope sheet: the icc "Any" row was put in scope in Task 2's tests.
    const scopeWs = wb.getWorksheet('Audit Scope & Compliance');
    let iccRowFound = false;
    scopeWs.eachRow((row) => {
      if (row.getCell('B').value === 'ICC - Any IC Card') {
        iccRowFound = true;
        expect(row.getCell('C').value).toBe('Yes');
      }
    });
    expect(iccRowFound).toBe(true);

    // QMS sheet (ISO-certified variant): matched by tag in column A.
    // Column H = vendor evidence reference (free-text), column J = auditor conformity.
    const qmsWs = wb.getWorksheet('QMS - has 9001 Cert');
    let qmsRowFound = false;
    qmsWs.eachRow((row) => {
      if (row.getCell('A').value === firstQms.requirement_id) {
        qmsRowFound = true;
        expect(row.getCell('J').value).toBe('Full');
        expect(row.getCell('H').value).toBe('Documented in QM-001');
      }
    });
    expect(qmsRowFound).toBe(true);

    // Category sheet: the NC+ step from Task 3's readiness test.
    const iccWs = wb.getWorksheet('icc');
    let stepFound = false;
    iccWs.eachRow((row) => {
      if (row.getCell('V').value === 'NC+') stepFound = true;
    });
    expect(stepFound).toBe(true);
  });

  test('GET /export/cqmap streams an xlsx attachment', async () => {
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/export/cqmap`).set(auth())
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/CQMAP.*\.xlsx/);
    // Round-trip: the streamed buffer must be a parseable workbook.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    expect(wb.getWorksheet('Coversheet')).toBeDefined();
  });

  test('table parts open in real Excel without a repair prompt (no synthesized autoFilter)', async () => {
    // ExcelJS's own reader is too lenient to catch this — it round-trips its own
    // (non-spec-compliant) output consistently, which is exactly why the previous
    // test alone didn't catch the corruption Excel actually flags. Real Excel's
    // strict XML validation rejects a table whose <autoFilter> lists a
    // <filterColumn> for every column when the source template had none, and
    // "repairs" the file by deleting the whole element from every table part.
    // Inspecting the raw part directly is the only way to actually verify this.
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/export/cqmap`).set(auth())
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    const zip = await JSZip.loadAsync(res.body);
    const tableFiles = Object.keys(zip.files).filter(f => /^xl\/tables\/table\d+\.xml$/.test(f));
    expect(tableFiles.length).toBeGreaterThan(0);

    for (const path of tableFiles) {
      const xml = await zip.file(path).async('string');
      expect(xml).not.toMatch(/<filterColumn\b/);
    }
  });

  test('worksheet parts have no corrupted formula cached values', async () => {
    // exceljs also mishandles cached values on formula cells it round-trips
    // (found on real sheets neither fillXxx function ever writes to, e.g.
    // "Audit Agenda"): a formula whose branches mix string/numeric results
    // gets its cached value overwritten with the literal text "NaN", and a
    // formula cached as an empty string loses its <v> (and t="str") entirely.
    // Both leave the <f> itself intact, so this strips ALL cached formula
    // values uniformly rather than chasing every variant — the workbook uses
    // automatic calculation (no calcMode="manual"), so Excel recalculates a
    // correct value immediately on open regardless.
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/export/cqmap`).set(auth())
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    const zip = await JSZip.loadAsync(res.body);
    const sheetFiles = Object.keys(zip.files).filter(f => /^xl\/worksheets\/sheet\d+\.xml$/.test(f));
    expect(sheetFiles.length).toBeGreaterThan(0);

    for (const path of sheetFiles) {
      const xml = await zip.file(path).async('string');
      expect(xml).not.toMatch(/<v>NaN<\/v>/);
      // No formula cell should carry a cached <v> at all post-fix.
      expect(xml).not.toMatch(/<\/f>(?:<v\b[^>]*>[\s\S]*?<\/v>|<v\/>)/);
      expect(xml).not.toMatch(/<f\b[^>]*\/>(?:<v\b[^>]*>[\s\S]*?<\/v>|<v\/>)/);
    }
  });
});

describe('readiness trend', () => {
  test('second readiness call returns previous snapshot for delta display', async () => {
    // First call records a snapshot…
    await request(app).get(`/api/nexus/audits/${auditId}/readiness`).set(auth());
    // …change something…
    const wb = await request(app).get(`/api/nexus/audits/${auditId}/workbook`).set(auth());
    const icc = wb.body.chapters.find(c => c.kind === 'category' && c.category === 'icc');
    await request(app)
      .patch(`/api/nexus/audits/${auditId}/scope/${icc.scopeId}/steps/${icc.rows[1].id}`)
      .set(auth()).send({ conformity: 'Full' });
    // …second call exposes the previous numbers.
    const res = await request(app).get(`/api/nexus/audits/${auditId}/readiness`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.previous).not.toBeNull();
    expect(res.body.previous.categories.find(c => c.category === 'icc').summary.counts.Full)
      .toBeLessThan(res.body.categories.find(c => c.category === 'icc').summary.counts.Full);
  });
});

describe('GET /api/nexus/audits/:id/export/readiness', () => {
  test('returns a PDF attachment (or a clear engine error on Chrome-less machines)', async () => {
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/export/readiness`).set(auth())
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    if (res.status === 200) {
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    } else {
      expect(res.status).toBe(500);
    }
  });
});
