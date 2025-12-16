# 🧪 CQM API Testing Guide

## Overview

This guide provides comprehensive instructions for testing all CQM Tracking System API endpoints using Postman, Thunder Client, or similar API testing tools.

## 📋 Prerequisites

1. **Backend server running** on `http://localhost:5000`
2. **Database seeded** with test data
3. **API testing tool** installed:
   - [Postman](https://www.postman.com/downloads/)
   - [Thunder Client](https://www.thunderclient.com/) (VS Code extension)
   - [Insomnia](https://insomnia.rest/)

## 🚀 Quick Start

### 1. Import Test Collection

**For Postman:**
1. Open Postman
2. Click `Import` button
3. Select `backend/api-test-collection.json`
4. Collection will be imported with all 90+ endpoints

**For Thunder Client:**
1. Open VS Code
2. Install Thunder Client extension
3. Click Thunder Client icon in sidebar
4. Import collection from `backend/api-test-collection.json`

### 2. Set Environment Variables

Configure these variables in your testing tool:

```
base_url = http://localhost:5000/api
jwt_token = (will be set after login)
facility_id = 1
test_definition_id = 1
test_result_id = 1
audit_id = 1
nc_id = 1
capa_id = 1
batch_id = 1
```

### 3. Authentication Flow

**Step 1: Login**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "admin@cqm.com",
  "password": "admin123"
}
```

**Step 2: Copy JWT Token**
- From response, copy the `token` field
- Set it as `jwt_token` variable in your environment
- This token will be automatically used in all authenticated requests

## 📚 API Endpoint Categories

### 1. Authentication (2 endpoints)
- ✅ `POST /auth/login` - Login
- ✅ `POST /auth/register` - Register new user

### 2. Manufacturing Facilities (13 endpoints)
- ✅ `GET /facilities` - Get all facilities
- ✅ `GET /facilities/:id` - Get facility by ID
- ✅ `POST /facilities` - Create facility
- ✅ `PUT /facilities/:id` - Update facility
- ✅ `DELETE /facilities/:id` - Delete facility
- ✅ `GET /facilities/:id/cqm-label` - Get CQM label
- ✅ `PATCH /facilities/:id/certification-status` - Update certification
- ✅ `GET /facilities/:id/dashboard` - Get facility dashboard
- ✅ `GET /facilities/by-country/:countryCode` - Get by country
- ✅ `GET /facilities/by-technology/:technologyType` - Get by technology
- ✅ `GET /facilities/expiring-certificates` - Get expiring certificates

### 3. Test Definitions (14 endpoints)
- ✅ `GET /test-definitions` - Get all test definitions
- ✅ `GET /test-definitions/:id` - Get test definition by ID
- ✅ `POST /test-definitions` - Create test definition
- ✅ `PUT /test-definitions/:id` - Update test definition
- ✅ `DELETE /test-definitions/:id` - Delete test definition
- ✅ `GET /test-definitions/category/:categoryId` - Get by category
- ✅ `GET /test-definitions/iso-standard/:isoStandard` - Get by ISO standard
- ✅ `PATCH /test-definitions/:id/approve` - Approve test definition
- ✅ `PATCH /test-definitions/:id/supersede` - Supersede test definition
- ✅ `PATCH /test-definitions/:id/obsolete` - Mark as obsolete
- ✅ `GET /test-definitions/stats` - Get statistics
- ✅ `POST /test-definitions/import` - Import test definitions

### 4. Test Results (11 endpoints)
- ✅ `GET /test-results` - Get all test results
- ✅ `GET /test-results/:id` - Get test result by ID
- ✅ `POST /test-results` - Record test result
- ✅ `PUT /test-results/:id` - Update test result
- ✅ `DELETE /test-results/:id` - Delete test result
- ✅ `PATCH /test-results/:id/verify` - Verify test result
- ✅ `GET /test-results/trends/:testDefinitionId` - Get test trends
- ✅ `GET /test-results/batch/:batchId` - Get results by batch
- ✅ `GET /test-results/statistics` - Get test statistics

### 5. Audits (12 endpoints)
- ✅ `GET /audits` - Get all audits
- ✅ `GET /audits/:id` - Get audit by ID
- ✅ `POST /audits` - Create audit
- ✅ `PUT /audits/:id` - Update audit
- ✅ `DELETE /audits/:id` - Delete audit
- ✅ `POST /audits/schedule` - Schedule audit
- ✅ `POST /audits/:id/generate-report` - Generate audit report
- ✅ `GET /audits/:id/findings` - Get audit findings
- ✅ `PATCH /audits/:id/status` - Update audit status
- ✅ `GET /audits/facility/:facilityId` - Get audits by facility
- ✅ `GET /audits/upcoming` - Get upcoming audits
- ✅ `GET /audits/statistics` - Get audit statistics

### 6. Non-Conformities (11 endpoints)
- ✅ `GET /non-conformities` - Get all non-conformities
- ✅ `GET /non-conformities/:id` - Get non-conformity by ID
- ✅ `POST /non-conformities` - Create non-conformity
- ✅ `PUT /non-conformities/:id` - Update non-conformity
- ✅ `DELETE /non-conformities/:id` - Delete non-conformity
- ✅ `POST /non-conformities/log` - Log non-conformity
- ✅ `PATCH /non-conformities/:id/status` - Update NC status
- ✅ `GET /non-conformities/by-type/:ncType` - Get by type
- ✅ `GET /non-conformities/by-facility/:facilityId` - Get by facility
- ✅ `GET /non-conformities/overdue` - Get overdue NCs
- ✅ `GET /non-conformities/statistics` - Get NC statistics

### 7. CAPA Actions (15 endpoints)
- ✅ `GET /capa-actions` - Get all CAPA actions
- ✅ `GET /capa-actions/:id` - Get CAPA action by ID
- ✅ `POST /capa-actions` - Create CAPA action
- ✅ `PUT /capa-actions/:id` - Update CAPA action
- ✅ `DELETE /capa-actions/:id` - Delete CAPA action
- ✅ `POST /capa-actions/from-non-conformity/:ncId` - Create from NC
- ✅ `PATCH /capa-actions/:id/progress` - Track progress
- ✅ `PATCH /capa-actions/:id/verify-effectiveness` - Verify effectiveness
- ✅ `PATCH /capa-actions/:id/close` - Close CAPA action
- ✅ `GET /capa-actions/by-facility/:facilityId` - Get by facility
- ✅ `GET /capa-actions/overdue` - Get overdue CAPAs
- ✅ `GET /capa-actions/statistics` - Get CAPA statistics
- ✅ `PATCH /capa-actions/:id/assign` - Assign CAPA action
- ✅ `POST /capa-actions/:id/upload-evidence` - Upload evidence
- ✅ `GET /capa-actions/:id/history` - Get CAPA history

### 8. Card Batches (14 endpoints)
- ✅ `GET /card-batches` - Get all card batches
- ✅ `GET /card-batches/:id` - Get card batch by ID
- ✅ `POST /card-batches` - Create card batch
- ✅ `PUT /card-batches/:id` - Update card batch
- ✅ `DELETE /card-batches/:id` - Delete card batch
- ✅ `PATCH /card-batches/:id/qc-status` - Update QC status
- ✅ `PATCH /card-batches/:id/record-yield` - Record batch yield
- ✅ `GET /card-batches/:id/traceability` - Get traceability
- ✅ `PATCH /card-batches/:id/quarantine` - Quarantine batch
- ✅ `PATCH /card-batches/:id/release` - Release batch
- ✅ `GET /card-batches/statistics` - Get batch statistics
- ✅ `GET /card-batches/by-product-code/:productCode` - Get by product code
- ✅ `GET /card-batches/by-facility/:facilityId` - Get by facility
- ✅ `GET /card-batches/by-status/:status` - Get by status

## 🧪 Testing Workflow

### Scenario 1: Complete Facility Setup & Audit

1. **Login** - Get authentication token
2. **Create Facility** - `POST /facilities`
3. **Get CQM Label** - `GET /facilities/:id/cqm-label`
4. **Schedule Audit** - `POST /audits/schedule`
5. **Update Audit Status** - `PATCH /audits/:id/status`
6. **Update Certification** - `PATCH /facilities/:id/certification-status`

### Scenario 2: Complete Test & Quality Workflow

1. **Create Card Batch** - `POST /card-batches`
2. **Get Test Definitions** - `GET /test-definitions`
3. **Record Test Results** - `POST /test-results` (multiple times)
4. **Get Batch Results** - `GET /test-results/batch/:batchId`
5. **Update QC Status** - `PATCH /card-batches/:id/qc-status`
6. **Record Yield** - `PATCH /card-batches/:id/record-yield`

### Scenario 3: Non-Conformity & CAPA Workflow

1. **Log Non-Conformity** - `POST /non-conformities/log`
2. **Create CAPA from NC** - `POST /capa-actions/from-non-conformity/:ncId`
3. **Assign CAPA** - `PATCH /capa-actions/:id/assign`
4. **Track Progress** - `PATCH /capa-actions/:id/progress`
5. **Verify Effectiveness** - `PATCH /capa-actions/:id/verify-effectiveness`
6. **Close CAPA** - `PATCH /capa-actions/:id/close`
7. **Update NC Status** - `PATCH /non-conformities/:id/status`

## 📊 Expected Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Resource data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Operation failed",
  "errors": [
    {
      "field": "field_name",
      "message": "Error description",
      "value": "invalid_value"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## 🔐 Authorization Roles

Different endpoints require different roles:

- **Admin**: Full access to all endpoints
- **Quality Manager**: Facility, test, audit, NC, CAPA management
- **Auditor**: Read access to audits, facilities, test results
- **Production Manager**: Batch management, test results
- **Tester**: Test result recording, viewing test definitions

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized" error
**Solution**: Ensure JWT token is set correctly in authorization header

### Issue: "Validation failed" error
**Solution**: Check request body matches required fields and formats

### Issue: "Resource not found" error
**Solution**: Verify resource ID exists in database

### Issue: "Too many requests" error
**Solution**: Rate limit reached, wait 15 minutes or adjust rate limit settings

## 📝 Swagger Documentation

For interactive API documentation, visit:
```
http://localhost:5000/api-docs
```

This provides:
- ✅ Interactive API testing interface
- ✅ Complete schema documentation
- ✅ Request/response examples
- ✅ Authentication setup

## ✅ Testing Checklist

### Basic Functionality
- [ ] All GET endpoints return 200 OK
- [ ] All POST endpoints create resources successfully
- [ ] All PUT endpoints update resources successfully
- [ ] All PATCH endpoints update specific fields
- [ ] All DELETE endpoints remove resources

### Validation
- [ ] Required fields are validated
- [ ] Data types are validated
- [ ] Enum values are validated
- [ ] Date formats are validated
- [ ] URL formats are validated

### Authorization
- [ ] Endpoints require authentication
- [ ] Role-based access control works
- [ ] Unauthorized access returns 401/403

### Error Handling
- [ ] Invalid IDs return 404
- [ ] Validation errors return 400
- [ ] Server errors return 500
- [ ] Error messages are descriptive

### Edge Cases
- [ ] Pagination works correctly
- [ ] Filtering works correctly
- [ ] Sorting works correctly
- [ ] Empty results handled gracefully
- [ ] Large datasets handled efficiently

## 🎯 Performance Testing

### Load Testing Targets
- Response time: < 200ms for simple queries
- Response time: < 500ms for complex queries
- Throughput: > 100 requests/second
- Concurrent users: 50+

### Tools for Load Testing
- Apache JMeter
- Artillery
- k6
- Locust

## 📞 Support

For issues or questions:
- Check API documentation: `http://localhost:5000/api-docs`
- Review error logs: `backend/logs/`
- Contact: support@cqm.com

---

**Last Updated:** December 2024  
**API Version:** 1.0.0  
**Total Endpoints:** 92

