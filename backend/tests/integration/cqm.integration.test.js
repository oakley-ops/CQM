/**
 * CQM Backend Integration Tests
 *
 * Exercises the CURRENT API surface and locks in the security hardening:
 *   - username/password auth + JWT-protected routes
 *   - admin-gated registration (C2)
 *   - role-based access control on NEXUS / autodata / test-entry mutations (N2, C1)
 *   - autodata dataset `format` whitelist / path-traversal guard (N1)
 *   - the core Quality Test Entry flow (category → definition → session → entries)
 *
 * Runs against a dedicated `cqm_test` database (see jest.config.js / global-setup.js),
 * whose schema is rebuilt fresh each run with sequelize.sync({ force: true }).
 */

// Prevent the autodata pipeline from making real Groq/LLM calls when a run is created.
jest.mock('../../services/autodata/orchestratorService', () => ({ startRun: jest.fn() }));

const request = require('supertest');
const app = require('../../server');
const { sequelize, User, TestCategory, TestDefinition, TestSession } = require('../../models');

const PASSWORD = 'Passw0rd!';
const ROLE_LIST = ['admin', 'quality_manager', 'auditor', 'tester', 'viewer'];

const users = {};   // role -> User instance
const tokens = {};  // role -> JWT
let categoryId;
let definitionId;

const auth = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

beforeAll(async () => {
  // Safety net: refuse to run against anything that isn't a *_test database.
  const dbName = sequelize.config.database;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }

  await sequelize.sync({ force: true });

  // Seed one user per role.
  for (const role of ROLE_LIST) {
    users[role] = await User.create({
      username: `${role}_user`,
      email: `${role}@test.cqm`,
      password_hash: PASSWORD, // hashed by the beforeCreate hook
      first_name: role,
      last_name: 'Tester',
      role
    });
  }

  // Log each in to obtain a token.
  for (const role of ROLE_LIST) {
    const res = await request(app).post('/api/auth/login').send({ username: `${role}_user`, password: PASSWORD });
    tokens[role] = res.body?.data?.token;
  }

  // Seed a category + definition for the test-entry flow.
  const category = await TestCategory.create({ category_code: 'TST', name: 'Integration Test Category' });
  categoryId = category.id;
  const definition = await TestDefinition.create({
    category_id: categoryId,
    test_id: 'TST-001',
    test_name: 'Integration Test Definition',
    test_type: 'measurement',
    min_acceptable_value: 1,
    max_acceptable_value: 10
  });
  definitionId = definition.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Auth', () => {
  test('login with valid credentials returns a token', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin_user', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  test('login with wrong password is rejected (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin_user', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('login missing username is a validation error (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: PASSWORD });
    expect(res.status).toBe(400);
  });

  test('protected route without a token is rejected (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('protected route with a token succeeds', async () => {
    const res = await request(app).get('/api/auth/me').set(auth('admin'));
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('admin_user');
  });
});

describe('Registration gating (C2)', () => {
  test('register without a token is rejected (admin-only by default)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'nope@test.cqm', password: PASSWORD, first_name: 'No', last_name: 'Token'
    });
    expect([401, 403]).toContain(res.status);
  });

  test('admin can create an account, and it defaults to the tester role', async () => {
    const res = await request(app).post('/api/auth/register').set(auth('admin')).send({
      email: `created_${Date.now()}@test.cqm`, password: PASSWORD, first_name: 'New', last_name: 'User', role: 'admin'
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('tester'); // role from the body must be ignored
  });

  test('a non-admin (tester) cannot create accounts (403)', async () => {
    const res = await request(app).post('/api/auth/register').set(auth('tester')).send({
      email: 'x@test.cqm', password: PASSWORD, first_name: 'X', last_name: 'Y'
    });
    expect(res.status).toBe(403);
  });
});

describe('NEXUS RBAC (N2)', () => {
  test('reads are allowed for any authenticated user', async () => {
    const res = await request(app).get('/api/nexus/audits').set(auth('tester'));
    expect(res.status).toBe(200);
  });

  test('tester cannot create an audit (403)', async () => {
    const res = await request(app).post('/api/nexus/audits').set(auth('tester')).send({ site_name: 'S', company: 'C' });
    expect(res.status).toBe(403);
  });

  test('viewer cannot create an audit (403)', async () => {
    const res = await request(app).post('/api/nexus/audits').set(auth('viewer')).send({ site_name: 'S', company: 'C' });
    expect(res.status).toBe(403);
  });

  test('auditor is past the authorization gate (not 401/403)', async () => {
    const res = await request(app).post('/api/nexus/audits').set(auth('auditor')).send({ site_name: 'S', company: 'C' });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test('tester cannot trigger the compliance watchdog (403)', async () => {
    const res = await request(app).post('/api/nexus/watchdog/run').set(auth('tester'));
    expect(res.status).toBe(403);
  });
});

describe('Autodata RBAC + format whitelist (N2, N1)', () => {
  test('tester cannot create an autodata run (403)', async () => {
    const res = await request(app).post('/api/autodata/runs').set(auth('tester')).send({ format: 'jsonl' });
    expect(res.status).toBe(403);
  });

  test('admin run with a path-traversal format is coerced to jsonl', async () => {
    const res = await request(app)
      .post('/api/autodata/runs')
      .set(auth('admin'))
      .send({ run_name: 'rbac-test', format: '../../../../etc/evil' });
    expect(res.status).toBe(202);
    expect(res.body.dataset_format).toBe('jsonl'); // malicious value rejected
  });
});

describe('Test entry RBAC + core flow (C1)', () => {
  let sessionId;

  beforeAll(async () => {
    const session = await TestSession.create({
      card_type: 'CR80',
      batch_lot_number: 'LOT-TEST-1',
      test_date: '2026-01-01',
      session_type: 'Monitoring',
      status: 'draft',
      inspector_id: users.tester.id
    });
    sessionId = session.id;
  });

  test('viewer cannot bulk-save entries (403)', async () => {
    const res = await request(app).post('/api/test-entries/bulk').set(auth('viewer')).send({
      sessionId, entries: [{ testDefinitionId: definitionId, measurementValue: 5 }]
    });
    expect(res.status).toBe(403);
  });

  test('tester can bulk-save entries and pass_status is auto-derived', async () => {
    const res = await request(app).post('/api/test-entries/bulk').set(auth('tester')).send({
      sessionId,
      entries: [{ testDefinitionId: definitionId, measurementValue: 5, assessmentValue: 'Good' }]
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('entries can be retrieved for the session', async () => {
    const res = await request(app).get(`/api/test-entries/session/${sessionId}`).set(auth('tester'));
    expect(res.status).toBe(200);
    const list = res.body.data ?? res.body;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
    expect(list[0].pass_status).toBe(true); // 5 is within [1, 10]
  });
});

describe('Privileged shell-spawn route (C5)', () => {
  test('tester cannot launch SmartQC (403)', async () => {
    const res = await request(app).post('/api/launch/smartqc').set(auth('tester'));
    expect(res.status).toBe(403);
  });
});
