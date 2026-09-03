// backend/tests/integration/productScope.integration.test.js
/**
 * NEXUS Product Scope — deletion.
 * Own DB rebuild + user seeding (same pattern as qualificationItems.integration.test.js).
 */
const request = require('supertest');
const app = require('../../server');
const {
  sequelize, User, NexusProductScope, NexusProcessStepAssessment,
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
    username: 'ps_admin', email: 'ps_admin@test.cqm', password_hash: PASSWORD,
    first_name: 'PS', last_name: 'Admin', role: 'admin',
  });
  const login = await request(app).post('/api/auth/login')
    .send({ username: 'ps_admin', password: PASSWORD });
  token = login.body.data.token;

  const audit = await request(app).post('/api/nexus/audits').set(auth())
    .send({ site_name: 'PS Test Site', company: 'PS Test Co', iso_9001_certified: true });
  auditId = audit.body.id;
});

afterAll(async () => { await sequelize.close(); });

describe('DELETE /api/nexus/audits/:id/scope/:scopeId', () => {
  test('deletes the scope and its seeded process steps', async () => {
    const created = await request(app).post(`/api/nexus/audits/${auditId}/scope`).set(auth())
      .send({ product_category: 'cb', product_variant: 'PVC DI', in_scope: true });
    const scopeId = created.body.id;
    expect(created.body.steps_seeded).toBeGreaterThan(0);

    const res = await request(app)
      .delete(`/api/nexus/audits/${auditId}/scope/${scopeId}`).set(auth());
    expect(res.status).toBe(200);

    const stored = await NexusProductScope.findByPk(scopeId);
    expect(stored).toBeNull();

    const remainingSteps = await NexusProcessStepAssessment.count({ where: { product_scope_id: scopeId } });
    expect(remainingSteps).toBe(0);
  });

  test('the deleted scope no longer appears in the scope list', async () => {
    const created = await request(app).post(`/api/nexus/audits/${auditId}/scope`).set(auth())
      .send({ product_category: 'icc', product_variant: 'Dual Interface EMV', in_scope: true });
    const scopeId = created.body.id;

    await request(app).delete(`/api/nexus/audits/${auditId}/scope/${scopeId}`).set(auth());

    const list = await request(app).get(`/api/nexus/audits/${auditId}/scope`).set(auth());
    expect(list.body.find(s => s.id === scopeId)).toBeUndefined();
  });

  test('404s with a clear message for a nonexistent scope', async () => {
    const res = await request(app)
      .delete(`/api/nexus/audits/${auditId}/scope/999999`).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Product scope not found');
  });
});
