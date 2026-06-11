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
