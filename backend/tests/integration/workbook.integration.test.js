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
