// backend/tests/integration/nexusGate.integration.test.js
/**
 * #0706# gate — the "vendor site" condition was designed for auditing an
 * external vendor's process steps and doesn't apply to internal equipment/
 * process qualification. It's been removed from the gate entirely.
 */
const request = require('supertest');
const app = require('../../server');
const { sequelize, User } = require('../../models');

const PASSWORD = 'Passw0rd!';
let token;
let auditId;
let scopeId;
let planId;

const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const dbName = sequelize.config.database;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }
  await sequelize.sync({ force: true });

  await User.create({
    username: 'gate_admin', email: 'gate_admin@test.cqm', password_hash: PASSWORD,
    first_name: 'Gate', last_name: 'Admin', role: 'admin',
  });
  const login = await request(app).post('/api/auth/login')
    .send({ username: 'gate_admin', password: PASSWORD });
  token = login.body.data.token;

  const audit = await request(app).post('/api/nexus/audits').set(auth())
    .send({ site_name: 'Gate Test Site', company: 'Gate Test Co' });
  auditId = audit.body.id;

  const scope = await request(app).post(`/api/nexus/audits/${auditId}/scope`).set(auth())
    .send({ product_category: 'cb', in_scope: true });
  scopeId = scope.body.id;

  const plan = await request(app).post(`/api/nexus/audits/${auditId}/plans`).set(auth())
    .send({ plan_type: 'process', owner: 'Test Owner', product_scope_id: scopeId });
  planId = plan.body.id;
});

afterAll(async () => { await sequelize.close(); });

describe('GET /api/nexus/audits/:id/plans/:planId/gate', () => {
  test('no condition mentions vendor site, even though every seeded step has none', async () => {
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/plans/${planId}/gate`).set(auth());
    expect(res.status).toBe(200);
    const labels = res.body.conditions.map(c => c.label);
    expect(labels.some(l => /vendor site/i.test(l))).toBe(false);
  });

  test('the NC+/nc- process-step condition is still evaluated (only vendor site was dropped)', async () => {
    const res = await request(app)
      .get(`/api/nexus/audits/${auditId}/plans/${planId}/gate`).set(auth());
    const labels = res.body.conditions.map(c => c.label);
    expect(labels).toContain('No open NC+ / nc- process step findings');
  });
});
