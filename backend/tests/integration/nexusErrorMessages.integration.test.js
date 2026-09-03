// backend/tests/integration/nexusErrorMessages.integration.test.js
/**
 * Every NEXUS controller replies with { error: '...' } on failure, but the frontend's
 * shared axios interceptor (frontend/src/services/api.ts) only reads `message` off the
 * response body — so a specific backend reason was silently replaced by a generic
 * fallback ("Invalid request data.", "Resource not found.") in the UI. This checks that
 * `message` is mirrored from `error` broadly, across endpoints nobody has hand-fixed.
 */
const request = require('supertest');
const app = require('../../server');
const { sequelize, User } = require('../../models');

const PASSWORD = 'Passw0rd!';
let token;

const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const dbName = sequelize.config.database;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }
  await sequelize.sync({ force: true });

  await User.create({
    username: 'err_admin', email: 'err_admin@test.cqm', password_hash: PASSWORD,
    first_name: 'Err', last_name: 'Admin', role: 'admin',
  });
  const login = await request(app).post('/api/auth/login')
    .send({ username: 'err_admin', password: PASSWORD });
  token = login.body.data.token;
});

afterAll(async () => { await sequelize.close(); });

describe('NEXUS error responses mirror error into message', () => {
  test('deleteAudit 404 (never individually fixed) carries a matching message', async () => {
    const res = await request(app).delete('/api/nexus/audits/999999').set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Audit record not found');
    expect(res.body.message).toBe('Audit record not found');
  });

  test('updateScope 404 (a different controller, also never individually fixed) matches too', async () => {
    const res = await request(app)
      .patch('/api/nexus/audits/999999/scope/999999').set(auth())
      .send({ in_scope: true });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Product scope not found');
    expect(res.body.message).toBe('Product scope not found');
  });

  test('success responses are untouched — no message is invented when there is no error', async () => {
    const audit = await request(app).post('/api/nexus/audits').set(auth())
      .send({ site_name: 'Err Test Site', company: 'Err Test Co' });
    expect(audit.status).toBe(201);
    expect(audit.body.error).toBeUndefined();
    expect(audit.body.message).toBeUndefined();
  });

  test('a response that already sets both error and message is left as-is (no clobbering)', async () => {
    // productScopeController's rank-gate check already ships both keys with different
    // wording than a bare error-copy would produce — confirms the mirror only fills gaps.
    const audit = await request(app).post('/api/nexus/audits').set(auth())
      .send({ site_name: 'Gate Test Site', company: 'Gate Test Co' });
    const scope = await request(app).post(`/api/nexus/audits/${audit.body.id}/scope`).set(auth())
      .send({ product_category: 'cb', in_scope: true });

    const res = await request(app)
      .patch(`/api/nexus/audits/${audit.body.id}/scope/${scope.body.id}`).set(auth())
      .send({ rank: 'A' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Gate not passed');
    expect(res.body.message).toBe(
      'A qualification plan must exist for this product before assigning a positive rank (#0706#).'
    );
  });
});
