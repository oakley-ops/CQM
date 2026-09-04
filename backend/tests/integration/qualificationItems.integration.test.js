// backend/tests/integration/qualificationItems.integration.test.js
/**
 * NEXUS Qualification Plan — custom checklist item creation and removal.
 * Own DB rebuild + user seeding (same pattern as workbook.integration.test.js).
 */
const request = require('supertest');
const app = require('../../server');
const { sequelize, User, NexusQualificationItem } = require('../../models');

const PASSWORD = 'Passw0rd!';
let token;
let auditId;
let planId;

const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const dbName = sequelize.config.database;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }
  await sequelize.sync({ force: true });

  await User.create({
    username: 'qi_admin', email: 'qi_admin@test.cqm', password_hash: PASSWORD,
    first_name: 'QI', last_name: 'Admin', role: 'admin',
  });
  const login = await request(app).post('/api/auth/login')
    .send({ username: 'qi_admin', password: PASSWORD });
  token = login.body.data.token;

  const audit = await request(app).post('/api/nexus/audits').set(auth())
    .send({ site_name: 'QI Test Site', company: 'QI Test Co', iso_9001_certified: true });
  auditId = audit.body.id;

  const plan = await request(app).post(`/api/nexus/audits/${auditId}/plans`).set(auth())
    .send({ plan_type: 'process', owner: 'Test Owner' });
  planId = plan.body.id;
});

afterAll(async () => { await sequelize.close(); });

describe('POST /api/nexus/audits/:id/plans — seeding behavior', () => {
  test('a process plan starts with an empty checklist', async () => {
    const res = await request(app).post(`/api/nexus/audits/${auditId}/plans`).set(auth())
      .send({ plan_type: 'process', owner: 'Test Owner' });
    expect(res.status).toBe(201);

    const items = await NexusQualificationItem.count({ where: { plan_id: res.body.id } });
    expect(items).toBe(0);
  });

  test('a product plan still auto-seeds the canonical checklist', async () => {
    const res = await request(app).post(`/api/nexus/audits/${auditId}/plans`).set(auth())
      .send({ plan_type: 'product', owner: 'Test Owner' });
    expect(res.status).toBe(201);

    const items = await NexusQualificationItem.count({ where: { plan_id: res.body.id } });
    expect(items).toBeGreaterThan(0);
  });
});

describe('POST /api/nexus/audits/:id/plans/:planId/items', () => {
  test('adds a custom checklist item to the plan', async () => {
    const res = await request(app)
      .post(`/api/nexus/audits/${auditId}/plans/${planId}/items`).set(auth())
      .send({
        title: 'Factory Acceptance Test (FAT) report obtained and reviewed',
        evidence_type: 'document',
        responsible: 'Process Eng.',
      });

    expect(res.status).toBe(201);
    expect(res.body.plan_id).toBe(planId);
    expect(res.body.title).toBe('Factory Acceptance Test (FAT) report obtained and reviewed');
    expect(res.body.status).toBe('pending');

    const stored = await NexusQualificationItem.findByPk(res.body.id);
    expect(stored).not.toBeNull();
    expect(stored.plan_id).toBe(planId);
  });

  test('the new item appears in the plan detail response afterward', async () => {
    const before = await request(app).get(`/api/nexus/audits/${auditId}/plans/${planId}`).set(auth());
    const countBefore = before.body.items.length;

    await request(app)
      .post(`/api/nexus/audits/${auditId}/plans/${planId}/items`).set(auth())
      .send({ title: 'Second custom item' });

    const after = await request(app).get(`/api/nexus/audits/${auditId}/plans/${planId}`).set(auth());
    expect(after.body.items.length).toBe(countBefore + 1);
  });

  test('404s with a clear message for a nonexistent plan', async () => {
    const res = await request(app)
      .post(`/api/nexus/audits/${auditId}/plans/999999/items`).set(auth())
      .send({ title: 'Should not be created' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Qualification plan not found');
  });
});

describe('DELETE /api/nexus/audits/:id/plans/:planId/items/:itemId', () => {
  test('removes a checklist item from the plan', async () => {
    const created = await request(app)
      .post(`/api/nexus/audits/${auditId}/plans/${planId}/items`).set(auth())
      .send({ title: 'Item to be removed' });
    const itemId = created.body.id;

    const res = await request(app)
      .delete(`/api/nexus/audits/${auditId}/plans/${planId}/items/${itemId}`).set(auth());
    expect(res.status).toBe(200);

    const stored = await NexusQualificationItem.findByPk(itemId);
    expect(stored).toBeNull();
  });

  test('the removed item no longer appears in the plan detail response', async () => {
    const created = await request(app)
      .post(`/api/nexus/audits/${auditId}/plans/${planId}/items`).set(auth())
      .send({ title: 'Another item to remove' });
    const itemId = created.body.id;

    await request(app)
      .delete(`/api/nexus/audits/${auditId}/plans/${planId}/items/${itemId}`).set(auth());

    const detail = await request(app).get(`/api/nexus/audits/${auditId}/plans/${planId}`).set(auth());
    expect(detail.body.items.find(i => i.id === itemId)).toBeUndefined();
  });

  test('404s with a clear message for a nonexistent item', async () => {
    const res = await request(app)
      .delete(`/api/nexus/audits/${auditId}/plans/${planId}/items/999999`).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Qualification item not found');
  });
});
