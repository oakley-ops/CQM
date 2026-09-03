// backend/tests/integration/qualificationItemEvidence.integration.test.js
/**
 * NEXUS Qualification Item — PDF evidence file upload/download/removal.
 * Own DB rebuild + user seeding (same pattern as qualificationItems.integration.test.js).
 */
const fs = require('fs');
const request = require('supertest');
const app = require('../../server');
const { sequelize, User, NexusQualificationItem } = require('../../models');

const PASSWORD = 'Passw0rd!';
let token;
let auditId;
let planId;
let itemId;

const auth = () => ({ Authorization: `Bearer ${token}` });

// A minimal-but-real PDF: starts with the %PDF- magic bytes the controller checks for.
const REAL_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const NOT_A_PDF = Buffer.from('this is just a text file pretending to be a pdf');

beforeAll(async () => {
  const dbName = sequelize.config.database;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }
  await sequelize.sync({ force: true });

  await User.create({
    username: 'ev_admin', email: 'ev_admin@test.cqm', password_hash: PASSWORD,
    first_name: 'Ev', last_name: 'Admin', role: 'admin',
  });
  const login = await request(app).post('/api/auth/login')
    .send({ username: 'ev_admin', password: PASSWORD });
  token = login.body.data.token;

  const audit = await request(app).post('/api/nexus/audits').set(auth())
    .send({ site_name: 'Ev Test Site', company: 'Ev Test Co', iso_9001_certified: true });
  auditId = audit.body.id;

  const plan = await request(app).post(`/api/nexus/audits/${auditId}/plans`).set(auth())
    .send({ plan_type: 'process', owner: 'Test Owner' });
  planId = plan.body.id;
});

beforeEach(async () => {
  const item = await request(app)
    .post(`/api/nexus/audits/${auditId}/plans/${planId}/items`).set(auth())
    .send({ title: 'FAT report obtained and reviewed' });
  itemId = item.body.id;
});

afterAll(async () => { await sequelize.close(); });

const evidenceUrl = () => `/api/nexus/audits/${auditId}/plans/${planId}/items/${itemId}/evidence`;

describe('POST .../items/:itemId/evidence', () => {
  test('uploads a real PDF and records it on the item', async () => {
    const res = await request(app).post(evidenceUrl()).set(auth())
      .attach('file', REAL_PDF, 'FAT-OASYS-2026.pdf');

    expect(res.status).toBe(200);
    expect(res.body.evidence_file_name).toBe('FAT-OASYS-2026.pdf');
    expect(res.body.evidence_file_size).toBe(REAL_PDF.length);
    expect(res.body.evidence_file_uploaded_at).toBeTruthy();

    const stored = await NexusQualificationItem.findByPk(itemId);
    expect(fs.existsSync(stored.evidence_file_path)).toBe(true);
    expect(fs.readFileSync(stored.evidence_file_path)).toEqual(REAL_PDF);
  });

  test('rejects a file that is not really a PDF, even with a pdf mimetype/name', async () => {
    const res = await request(app).post(evidenceUrl()).set(auth())
      .attach('file', NOT_A_PDF, { filename: 'fake.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    const stored = await NexusQualificationItem.findByPk(itemId);
    expect(stored.evidence_file_name).toBeNull();
  });

  test('uploading a second file replaces the first on disk', async () => {
    const first = await request(app).post(evidenceUrl()).set(auth())
      .attach('file', REAL_PDF, 'first.pdf');
    const firstPath = first.body.evidence_file_path
      ?? (await NexusQualificationItem.findByPk(itemId)).evidence_file_path;

    const second = await request(app).post(evidenceUrl()).set(auth())
      .attach('file', REAL_PDF, 'second.pdf');

    expect(second.status).toBe(200);
    expect(second.body.evidence_file_name).toBe('second.pdf');
    expect(fs.existsSync(firstPath)).toBe(false);
  });

  test('404s with a clear message for a nonexistent item', async () => {
    const res = await request(app)
      .post(`/api/nexus/audits/${auditId}/plans/${planId}/items/999999/evidence`).set(auth())
      .attach('file', REAL_PDF, 'x.pdf');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Qualification item not found');
  });
});

describe('GET .../items/:itemId/evidence', () => {
  test('downloads the exact bytes that were uploaded', async () => {
    await request(app).post(evidenceUrl()).set(auth()).attach('file', REAL_PDF, 'FAT.pdf');

    const res = await request(app).get(evidenceUrl()).set(auth()).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body).toEqual(REAL_PDF);
  });

  test('404s with a clear message when the item has no evidence file attached', async () => {
    const res = await request(app).get(evidenceUrl()).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No evidence file attached to this item');
  });
});

describe('DELETE .../items/:itemId/evidence', () => {
  test('clears the attachment and removes the file from disk', async () => {
    await request(app).post(evidenceUrl()).set(auth()).attach('file', REAL_PDF, 'FAT.pdf');
    const withFile = await NexusQualificationItem.findByPk(itemId);
    const filePath = withFile.evidence_file_path;

    const res = await request(app).delete(evidenceUrl()).set(auth());
    expect(res.status).toBe(200);

    const after = await NexusQualificationItem.findByPk(itemId);
    expect(after.evidence_file_name).toBeNull();
    expect(after.evidence_file_path).toBeNull();
    expect(fs.existsSync(filePath)).toBe(false);
    // Removing the evidence file must not touch the checklist item itself.
    expect(after.title).toBe('FAT report obtained and reviewed');
  });
});
