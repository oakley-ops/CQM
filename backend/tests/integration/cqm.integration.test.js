/**
 * CQM Integration Tests
 * Comprehensive integration testing for Card Quality Management System
 */

const request = require('supertest');
const app = require('../../server');
const { sequelize } = require('../../models');

// Test data
let authToken;
let testFacility;
let testBatch;
let testDefinition;
let testResult;
let testAudit;
let testNC;
let testCAPA;

describe('CQM System Integration Tests', () => {
  // Setup: Connect to test database
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  // Cleanup: Close database connection
  afterAll(async () => {
    await sequelize.close();
  });

  // ==================================================
  // 1. Authentication Tests
  // ==================================================
  describe('Authentication Flow', () => {
    test('Should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@cqm.com',
          password: 'Test123!@#',
          role: 'quality_manager'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('Should login successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@cqm.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();

      authToken = response.body.token;
    });

    test('Should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@cqm.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should reject access without token', async () => {
      const response = await request(app)
        .get('/api/facilities');

      expect(response.status).toBe(401);
    });
  });

  // ==================================================
  // 2. Manufacturing Facility Tests
  // ==================================================
  describe('Manufacturing Facility Management', () => {
    test('Should create a new facility', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facility_name: 'Test Smart Card Facility',
          location: '123 Test Street, Singapore',
          country_code: 'SG',
          technology_type: 'Dual Interface',
          contact_person_id: 1,
          certification_status: 'Pending'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.facility_name).toBe('Test Smart Card Facility');

      testFacility = response.body.data;
    });

    test('Should retrieve all facilities', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should retrieve facility by ID', async () => {
      const response = await request(app)
        .get(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testFacility.id);
    });

    test('Should update facility', async () => {
      const response = await request(app)
        .put(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          certification_status: 'Certified',
          certificate_expiry_date: '2025-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.certification_status).toBe('Certified');
    });

    test('Should generate CQM label', async () => {
      const response = await request(app)
        .get(`/api/facilities/${testFacility.id}/cqm-label`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.cqm_label).toBeDefined();
    });
  });

  // ==================================================
  // 3. Test Definition Tests
  // ==================================================
  describe('Test Definition Management', () => {
    test('Should create test definition', async () => {
      const response = await request(app)
        .post('/api/test-definitions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category_id: 1,
          test_id: 'TEST-INT-001',
          test_name: 'Integration Test Sample',
          iso_standard: 'ISO 7810',
          procedure: 'Test procedure description',
          pass_criteria: 'Meets ISO 7810 specifications',
          measurement_type: 'Pass/Fail',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'Medium',
          status: 'Active'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testDefinition = response.body.data;
    });

    test('Should retrieve test definitions', async () => {
      const response = await request(app)
        .get('/api/test-definitions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should filter test definitions by category', async () => {
      const response = await request(app)
        .get('/api/test-definitions/category/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ==================================================
  // 4. Card Batch Tests
  // ==================================================
  describe('Card Batch Management', () => {
    test('Should create card batch', async () => {
      const response = await request(app)
        .post('/api/card-batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facility_id: testFacility.id,
          batch_number: 'BATCH-TEST-001',
          product_code: 'EMV-DUAL-01',
          card_type: 'Dual Interface EMV',
          quantity_produced: 10000,
          production_date: '2024-01-15',
          qc_status: 'Pending'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testBatch = response.body.data;
    });

    test('Should update batch QC status', async () => {
      const response = await request(app)
        .patch(`/api/card-batches/${testBatch.id}/qc-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          qc_status: 'Approved',
          qc_by: 1,
          qc_date: '2024-01-16'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.qc_status).toBe('Approved');
    });

    test('Should record batch yield', async () => {
      const response = await request(app)
        .patch(`/api/card-batches/${testBatch.id}/record-yield`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity_accepted: 9850,
          quantity_rejected: 150
        });

      expect(response.status).toBe(200);
      expect(response.body.data.quantity_accepted).toBe(9850);
    });
  });

  // ==================================================
  // 5. Test Results Tests
  // ==================================================
  describe('Test Results Management', () => {
    test('Should record test result', async () => {
      const response = await request(app)
        .post('/api/test-results')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facility_id: testFacility.id,
          test_definition_id: testDefinition.id,
          batch_id: testBatch.id,
          tester_id: 1,
          actual_value: '85.58mm x 53.97mm',
          result_status: 'Pass',
          notes: 'All measurements within tolerance'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testResult = response.body.data;
    });

    test('Should retrieve test results by batch', async () => {
      const response = await request(app)
        .get(`/api/test-results/batch/${testBatch.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should verify test result', async () => {
      const response = await request(app)
        .patch(`/api/test-results/${testResult.id}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          verified_by: 1,
          verification_date: '2024-01-16',
          verification_status: 'Verified'
        });

      expect(response.status).toBe(200);
    });
  });

  // ==================================================
  // 6. Audit Management Tests
  // ==================================================
  describe('Audit Management', () => {
    test('Should schedule an audit', async () => {
      const response = await request(app)
        .post('/api/audits/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facility_id: testFacility.id,
          audit_type: 'Initial',
          scheduled_date: '2024-03-01',
          auditor_id: 1,
          scope: 'Full CQM certification audit'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testAudit = response.body.data;
    });

    test('Should update audit status', async () => {
      const response = await request(app)
        .patch(`/api/audits/${testAudit.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          audit_status: 'In Progress'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.audit_status).toBe('In Progress');
    });

    test('Should retrieve upcoming audits', async () => {
      const response = await request(app)
        .get('/api/audits/upcoming?days=90')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ==================================================
  // 7. Non-Conformity Tests
  // ==================================================
  describe('Non-Conformity Management', () => {
    test('Should log non-conformity', async () => {
      const response = await request(app)
        .post('/api/non-conformities/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facility_id: testFacility.id,
          nc_type: 'Minor',
          severity: 'Medium',
          description: 'Card dimensions slightly exceed tolerance',
          raised_by: 1,
          status: 'Open'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testNC = response.body.data;
    });

    test('Should update NC status', async () => {
      const response = await request(app)
        .patch(`/api/non-conformities/${testNC.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'In Progress'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('In Progress');
    });

    test('Should retrieve non-conformities by facility', async () => {
      const response = await request(app)
        .get(`/api/non-conformities/by-facility/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ==================================================
  // 8. CAPA Actions Tests
  // ==================================================
  describe('CAPA Actions Management', () => {
    test('Should create CAPA from non-conformity', async () => {
      const response = await request(app)
        .post(`/api/capa-actions/from-non-conformity/${testNC.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assigned_to: 1,
          due_date: '2024-03-15'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testCAPA = response.body.data;
    });

    test('Should track CAPA progress', async () => {
      const response = await request(app)
        .patch(`/api/capa-actions/${testCAPA.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          progress_percentage: 50,
          status: 'In Progress'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('In Progress');
    });

    test('Should verify CAPA effectiveness', async () => {
      const response = await request(app)
        .patch(`/api/capa-actions/${testCAPA.id}/verify-effectiveness`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          verified_by: 1,
          verification_date: '2024-03-20',
          is_effective: true,
          verification_notes: 'CAPA actions successfully implemented'
        });

      expect(response.status).toBe(200);
    });
  });

  // ==================================================
  // 9. Complete Workflow Test
  // ==================================================
  describe('Complete CQM Workflow', () => {
    test('Should execute complete workflow: Facility -> Batch -> Test -> NC -> CAPA', async () => {
      // This test validates the entire CQM process flow
      
      // 1. Facility exists (already created)
      expect(testFacility).toBeDefined();
      
      // 2. Batch exists (already created)
      expect(testBatch).toBeDefined();
      
      // 3. Test results recorded (already created)
      expect(testResult).toBeDefined();
      
      // 4. Non-conformity logged (already created)
      expect(testNC).toBeDefined();
      
      // 5. CAPA created (already created)
      expect(testCAPA).toBeDefined();
      
      // 6. Verify all entities are linked correctly
      expect(testResult.facility_id).toBe(testFacility.id);
      expect(testResult.batch_id).toBe(testBatch.id);
      expect(testNC.facility_id).toBe(testFacility.id);
      expect(testCAPA.facility_id).toBe(testFacility.id);
    });
  });

  // ==================================================
  // 10. Performance and Edge Cases
  // ==================================================
  describe('Edge Cases and Validation', () => {
    test('Should reject invalid facility creation (missing required fields)', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facility_name: 'Incomplete Facility'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/facilities?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(5);
    });

    test('Should handle 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/facilities/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ==================================================
  // 11. Cleanup Tests
  // ==================================================
  describe('Cleanup', () => {
    test('Should delete test CAPA', async () => {
      const response = await request(app)
        .delete(`/api/capa-actions/${testCAPA.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('Should delete test NC', async () => {
      const response = await request(app)
        .delete(`/api/non-conformities/${testNC.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('Should delete test result', async () => {
      const response = await request(app)
        .delete(`/api/test-results/${testResult.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('Should delete test batch', async () => {
      const response = await request(app)
        .delete(`/api/card-batches/${testBatch.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('Should delete test definition', async () => {
      const response = await request(app)
        .delete(`/api/test-definitions/${testDefinition.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('Should delete test facility', async () => {
      const response = await request(app)
        .delete(`/api/facilities/${testFacility.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});

