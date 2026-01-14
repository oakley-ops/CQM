# CQM Testing Framework - Comprehensive Implementation Plan

**Date:** December 20, 2025  
**Status:** Planning Phase  
**Complexity:** High

---

## 📋 Executive Summary

Implementation of a comprehensive Card Quality Management (CQM) testing framework to capture and manage quality testing data for smart card manufacturing, covering over 100+ standardized tests across 6 major infrastructure categories.

---

## 🎯 Requirements Analysis

### Test Categories (6 Major Groups)

#### 1. **Module Manufacturer Tests (ICM)** - 14 tests
- Infrastructure quality requirements for IC module production
- Standards: ISO7810, ISO7816-1, ISO10373-1

#### 2. **Card Body Fabrication (CB)** - 21 tests  
- Physical card body manufacturing quality
- Standards: ISO7810, ISO7811, ISO7816-1, ANSI NCITS 322

#### 3. **Card Embedder (ICC)** - 14 tests
- Non-personalized card with embedded module
- Standards: ISO7810, ISO7811, EMV

#### 4. **Physical Test Methods** - 23 tests
- Comprehensive physical testing procedures
- Standards: ISO10373-1, ANSI NCITS 322

#### 5. **Magnetic Stripe Tests** - 22 tests
- MasterCard additional requirements
- Standards: ISO7811, ISO10373-2, ANSI NCITS 322

#### 6. **Card Personalization** - 11 tests
- Embossing, printing, laser engraving quality
- Standards: ANSI NCITS 322

#### 7. **Card Lamination (PICC)** - 20 tests
- Lamination quality for proximity cards
- Standards: ISO7810, ISO10373, ANSI NCITS 322

**Total:** ~125 standardized tests

---

## 🗄️ Database Schema Design

### Core Tables

#### 1. **`test_categories`** (Already exists)
```sql
- id (PK)
- category_code (e.g., 'ICM', 'CB', 'ICC', 'PT', 'MS', 'CP', 'PICC')
- category_name (e.g., 'Module Manufacturer')
- description
- display_order
```

#### 2. **`test_definitions`** (Enhance existing)
```sql
- id (PK)
- test_category_id (FK)
- test_code (e.g., '4.1.1', '5.1.2', '10.3.2')
- test_name (e.g., 'Toxicity', 'Width and Height')
- description
- iso_standard (e.g., 'ISO7810', 'ISO7816-1')
- test_method_reference
- measurement_type (Numeric, Pass/Fail, Visual)
- expected_value
- tolerance
- unit_of_measure
- required_equipment
- test_duration_minutes
- frequency (Per Batch, Daily, Weekly)
- status (Active, Superseded, Obsolete)
```

#### 3. **`iso_standards`** (NEW)
```sql
- id (PK)
- standard_code (e.g., 'ISO7810', 'ISO7816-1', 'ISO10373-1')
- standard_name
- version
- description
- effective_date
- superseded_date
```

#### 4. **`test_parameters`** (NEW)
```sql
- id (PK)
- test_definition_id (FK)
- parameter_name (e.g., 'Width', 'Height', 'Temperature')
- data_type (Numeric, Text, Boolean)
- expected_value
- min_value
- max_value
- tolerance
- unit
- required (Boolean)
```

#### 5. **`batch_test_sessions`** (NEW)
```sql
- id (PK)
- batch_id (FK -> card_batches)
- facility_id (FK)
- client_id (FK) -- American Express, Visa, etc.
- test_category_id (FK)
- session_reference
- tester_id (FK -> users)
- test_date
- status (In Progress, Completed, Failed, Aborted)
- total_tests_planned
- tests_completed
- tests_passed
- tests_failed
- notes
- created_at
- updated_at
```

#### 6. **`test_results`** (Enhance existing)
```sql
-- Current fields
- id (PK)
- batch_id (FK)
- test_definition_id (FK)
- facility_id (FK)
- performed_by (FK -> users)

-- Add new fields
- test_session_id (FK -> batch_test_sessions)
- sample_id (Card identifier from batch)
- test_date
- result_status (Pass, Fail, Conditional Pass, Pending Review)
- actual_value (Decimal)
- measurement_unit
- pass_fail_criteria
- deviation_percentage

-- Multi-parameter support
- test_parameters_json (JSON storing multiple parameters)
  {
    "width": { "value": 85.60, "unit": "mm", "status": "Pass" },
    "height": { "value": 53.98, "unit": "mm", "status": "Pass" }
  }

-- Documentation
- test_procedure_followed (Boolean)
- environmental_conditions (JSON)
  {
    "temperature": 23,
    "humidity": 50,
    "pressure": 1013
  }
- equipment_used
- evidence_urls (Array of image/document URLs)
- notes
- reviewed_by (FK -> users)
- review_date
- review_notes
```

#### 7. **`clients`** (NEW or use existing)
```sql
- id (PK)
- client_code (e.g., 'AMEX', 'VISA', 'MC')
- client_name (e.g., 'American Express')
- contact_info
- special_requirements (JSON)
```

---

## 🔄 Workflow Implementation

### Phase 1: Test Session Creation

```
1. Auditor selects:
   - Card Batch (from client, e.g., American Express batch #12345)
   - Test Category (e.g., "Card Body Fabrication")
   - Facility being tested
   
2. System creates BatchTestSession record
3. System displays all applicable tests for that category
4. Auditor reviews test checklist
```

### Phase 2: Test Execution

```
For each test in the session:

1. Display test details:
   - Test code and name
   - ISO standard reference
   - Required equipment
   - Expected values/tolerances
   - Test procedure

2. Auditor performs test and enters:
   - Sample card ID
   - All parameter measurements
   - Pass/Fail status
   - Environmental conditions
   - Photos/evidence (optional)
   - Notes

3. System validates:
   - Required fields completed
   - Values within tolerance
   - Auto-determines Pass/Fail if numeric

4. Save result and move to next test
```

### Phase 3: Session Completion

```
1. Review all test results
2. Generate summary report:
   - Total tests: X
   - Passed: Y
   - Failed: Z
   - Pass rate: %
   
3. Submit for review (if required)
4. Mark session as Complete
5. Generate compliance certificate (if all passed)
```

---

## 🖥️ Frontend UI Components

### 1. **Test Categories Page**
```
- Grid of 7 major test categories
- Each card shows:
  - Category name
  - Number of tests
  - Icon
  - Click to view tests
```

### 2. **Test Definitions Page**
```
- Filterable table of all test definitions
- Group by category
- Search by test code, name, ISO standard
- Edit test parameters
- Activate/deactivate tests
```

### 3. **Batch Test Session Creator**
```
Multi-step wizard:

Step 1: Select Batch
  - Search/select card batch
  - Display batch details (client, quantity, card type)
  
Step 2: Select Test Category
  - Choose which category to test (ICM, CB, ICC, etc.)
  - Shows number of tests in category
  
Step 3: Review Test Plan
  - List of all tests to be performed
  - Option to skip certain tests (with reason)
  - Estimated duration
  
Step 4: Begin Testing
  - Creates session and opens test execution view
```

### 4. **Test Execution Interface** ⭐ CRITICAL

```
Layout:
┌─────────────────────────────────────────────┐
│ Session: BS-12345 | Batch: AMEX-2024-001   │
│ Category: Card Body Fabrication             │
│ Progress: Test 5 of 21 (24%)               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Current Test: 5.1.2 Width and Height       │
│ Standard: ISO7810                           │
│                                             │
│ Sample Card ID: [_____________]             │
│                                             │
│ ┌─ Parameters ─────────────────────────┐   │
│ │                                       │   │
│ │ Width (mm):                          │   │
│ │ └─ Measured: [85.60] mm              │   │
│ │ └─ Expected: 85.60 ± 0.12 mm        │   │
│ │ └─ Status: ✓ Pass                    │   │
│ │                                       │   │
│ │ Height (mm):                         │   │
│ │ └─ Measured: [53.98] mm              │   │
│ │ └─ Expected: 53.98 ± 0.055 mm       │   │
│ │ └─ Status: ✓ Pass                    │   │
│ │                                       │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ Environmental Conditions:                   │
│ └─ Temperature: [23]°C                     │
│ └─ Humidity: [50]%                         │
│                                             │
│ Equipment Used: [Micrometer XYZ-100]       │
│                                             │
│ Evidence:                                   │
│ └─ [Upload Photos] 📸                      │
│                                             │
│ Notes: [____________________________]       │
│                                             │
│ [< Previous] [Save & Next >] [Skip Test]   │
└─────────────────────────────────────────────┘
```

### 5. **Session Progress Dashboard**
```
- List of all test sessions
- Filter by status, date, client, facility
- Quick stats cards
- Resume incomplete sessions
- View completed session reports
```

### 6. **Test Results Review**
```
- Table of all results for a session
- Color-coded Pass/Fail
- Click to view details
- Flag for review
- Add reviewer notes
- Approve/reject results
```

### 7. **Reports & Analytics**
```
- Pass/fail rates by test
- Pass/fail rates by client
- Pass/fail rates by facility
- Trending over time
- Failed test analysis
- Export to PDF/Excel
```

---

## 🛠️ Implementation Steps

### Step 1: Database Schema (Week 1)

**Files to create/modify:**
```
backend/models/ISOStandard.js (NEW)
backend/models/TestParameter.js (NEW)
backend/models/BatchTestSession.js (NEW)
backend/models/Client.js (NEW or enhance existing)

backend/models/TestCategory.js (enhance)
backend/models/TestDefinition.js (enhance)
backend/models/TestResult.js (enhance)
```

**Migration scripts:**
```
backend/migrations/add_iso_standards_table.js
backend/migrations/add_test_parameters_table.js
backend/migrations/add_batch_test_sessions_table.js
backend/migrations/enhance_test_results_table.js
```

### Step 2: Seed Test Definitions (Week 1-2)

**Create comprehensive test definition data:**
```
backend/seeders/seed_cqm_tests.js
  - 125+ test definitions
  - All ISO standards
  - Test parameters
  - Expected values and tolerances
```

**JSON structure:**
```json
{
  "category": "CB",
  "tests": [
    {
      "code": "5.1.2",
      "name": "Width and Height",
      "standard": "ISO7810",
      "parameters": [
        {
          "name": "Width",
          "expected": 85.60,
          "tolerance": 0.12,
          "unit": "mm",
          "type": "numeric"
        },
        {
          "name": "Height",
          "expected": 53.98,
          "tolerance": 0.055,
          "unit": "mm",
          "type": "numeric"
        }
      ]
    }
  ]
}
```

### Step 3: Backend API (Week 2)

**New controllers:**
```
backend/controllers/batchTestSessionController.js
  - POST /api/batch-test-sessions - Create session
  - GET /api/batch-test-sessions - List sessions
  - GET /api/batch-test-sessions/:id - Get session details
  - PUT /api/batch-test-sessions/:id - Update session
  - POST /api/batch-test-sessions/:id/complete - Complete session
  
backend/controllers/testParameterController.js
  - GET /api/test-definitions/:id/parameters - Get test parameters
  
backend/controllers/isoStandardController.js
  - GET /api/iso-standards - List all standards
```

**Enhanced controllers:**
```
backend/controllers/testResultController.js
  - POST /api/test-results/bulk - Bulk save results
  - GET /api/test-results/session/:sessionId - Get session results
  - PUT /api/test-results/:id/review - Review result
```

### Step 4: Frontend Components (Week 3-4)

**New pages:**
```
frontend/src/pages/cqm/TestCategories.tsx
frontend/src/pages/cqm/TestDefinitionsManager.tsx
frontend/src/pages/cqm/BatchTestSessions.tsx
frontend/src/pages/cqm/TestExecution.tsx ⭐ CRITICAL
frontend/src/pages/cqm/SessionReview.tsx
frontend/src/pages/cqm/TestReports.tsx
```

**New components:**
```
frontend/src/components/CQM/TestSession/
  - SessionWizard.tsx (multi-step session creation)
  - TestExecutionCard.tsx (individual test entry)
  - ParameterInput.tsx (dynamic parameter fields)
  - EnvironmentalConditions.tsx (temp, humidity capture)
  - EvidenceUpload.tsx (photo/document upload)
  - SessionProgress.tsx (progress tracker)
  - ResultReview.tsx (review interface)
```

### Step 5: Redux State Management (Week 3)

```
frontend/src/store/slices/cqm/
  - batchTestSessionSlice.ts
  - testParameterSlice.ts
  - isoStandardSlice.ts
  
  Enhance:
  - testDefinitionSlice.ts
  - testResultSlice.ts
```

### Step 6: Testing & Validation (Week 5)

```
- Unit tests for all new models
- API endpoint testing
- Frontend component testing
- End-to-end workflow testing
- Performance testing (bulk data entry)
```

### Step 7: Documentation (Week 5)

```
- User manual for test execution
- Training materials for auditors
- API documentation
- Database schema documentation
```

---

## 📊 Data Flow Example

### Example: Testing American Express Card Batch

```
1. Auditor logs in
2. Navigates to "Batch Test Sessions"
3. Clicks "New Test Session"

Wizard Step 1 - Select Batch:
  - Searches for "AMEX-2024-001"
  - Batch details shown:
    * Client: American Express
    * Card type: Dual Interface EMV
    * Quantity: 10,000 cards
    * Production date: Dec 15, 2024

Wizard Step 2 - Select Category:
  - Selects "Card Body Fabrication (CB)"
  - Shows: 21 tests required

Wizard Step 3 - Review Plan:
  ✓ 5.1.2 Width and Height
  ✓ 5.1.3 CB Thickness
  ✓ 5.1.4 Thickness within Add-On Areas
  ... (18 more tests)
  
  [x] Skip test 5.1.21 (Reason: Not applicable)
  
  Estimated time: 4-6 hours

Wizard Step 4 - Begin Testing:
  - Session created: BS-12345
  - Opens Test Execution interface

Test Execution:
  For each of 20 tests:
  
  Test 1: Width and Height
    - Sample card: AMEX-001
    - Measure width: 85.58 mm ✓ Pass
    - Measure height: 53.99 mm ✓ Pass
    - Take photo of measurement
    - Save & Next
  
  Test 2: CB Thickness
    - Sample card: AMEX-002
    - Measure thickness: 0.76 mm ✓ Pass
    - Equipment: Micrometer Model XYZ
    - Save & Next
  
  ... continue for all tests ...

Session Complete:
  - Review all 20 results
  - 20 passed, 0 failed
  - Pass rate: 100%
  - Generate compliance certificate
  - Submit for QA review
  - Mark session as Complete
```

---

## 🎨 UI/UX Considerations

### Design Principles:
1. **Mobile-friendly** - Auditors may use tablets
2. **Quick data entry** - Minimize typing
3. **Real-time validation** - Immediate feedback
4. **Auto-save** - Don't lose progress
5. **Offline capable** - Work without internet (future)
6. **Photo capture** - Built-in camera support
7. **Barcode scanning** - Quick sample ID entry (future)

### Color Coding:
- 🟢 Pass - Green
- 🔴 Fail - Red
- 🟡 Pending - Yellow
- 🔵 In Progress - Blue
- ⚪ Not Started - Grey

---

## 📈 Reporting Features

### Standard Reports:
1. **Batch Compliance Report**
   - All test results for a batch
   - Pass/fail summary
   - Deviations noted
   - Reviewer signatures
   
2. **Facility Performance Report**
   - Pass rates by test category
   - Trending over time
   - Common failure modes
   
3. **Client Quality Report**
   - Batch-by-batch performance
   - ISO compliance status
   - Recommendations
   
4. **Audit Trail Report**
   - Who tested what and when
   - Changes to results
   - Review history

---

## 🔐 Security & Compliance

### Access Control:
- **Tester role:** Execute tests, enter results
- **Reviewer role:** Review and approve results
- **Quality Manager:** Full access, analytics
- **Admin:** System configuration

### Audit Trail:
- Log all test result entries
- Log all modifications
- Log all reviews and approvals
- Immutable after final approval

### Data Integrity:
- Digital signatures for approvals
- Tamper-proof result storage
- Backup and disaster recovery

---

## ⏱️ Timeline Estimate

**Total: 5-6 weeks**

| Week | Tasks |
|------|-------|
| 1 | Database schema, migrations, model updates |
| 1-2 | Seed all 125+ test definitions |
| 2 | Backend API development |
| 3 | Frontend components (Session management) |
| 4 | Frontend components (Test execution UI) |
| 5 | Testing, bug fixes, documentation |
| 6 | Training, deployment, go-live |

---

## ✅ Success Criteria

1. ✅ All 125+ test definitions loaded and accessible
2. ✅ Auditors can create test sessions in < 2 minutes
3. ✅ Data entry for one test takes < 1 minute
4. ✅ System auto-validates pass/fail based on tolerances
5. ✅ Complete session generates PDF report
6. ✅ 100% of test data captured and searchable
7. ✅ Zero data loss during test execution
8. ✅ Reports available in real-time

---

## 🚀 Quick Start (MVP)

For **immediate implementation**, start with:

1. **One test category** (e.g., Card Body Fabrication - 21 tests)
2. **Basic test execution UI** (single-parameter tests first)
3. **Simple pass/fail recording**
4. **Basic session management**
5. **PDF report generation**

**Expand from there** based on feedback!

---

## 📝 Next Steps

**Immediate Actions:**
1. ✅ Review and approve this plan
2. Create detailed test definition JSON file
3. Set up database migrations
4. Build test session creation wizard
5. Build test execution interface (MVP)

**Questions to Answer:**
1. Which test category should we implement first?
2. Do we need offline capability from day 1?
3. What's the priority: speed or completeness?
4. Should we integrate with existing document management?
5. Do we need barcode scanning support?

---

**Status:** ✅ **Plan Complete - Ready for Implementation**

Would you like me to start with any specific part of this implementation?
