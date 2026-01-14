# 🗄️ CQM Database Schema Design

## Complete Database Structure for Card Quality Management System

**Version:** 1.0  
**Date:** December 16, 2025  
**Database:** PostgreSQL 12+

---

## 📊 Schema Overview

### Table Categories
1. **Core Tables** (6 tables) - Facilities, Certifications, Audits
2. **Test Management** (4 tables) - Tests, Results, Categories, Equipment
3. **Quality Management** (3 tables) - Non-Conformities, CAPA, ISO Standards
4. **Manufacturing** (3 tables) - Processes, Components, Batches
5. **Personnel** (2 tables) - Training, Qualifications
6. **Supplier Management** (2 tables) - Suppliers, Supplier Audits
7. **Document Management** (2 tables) - QMS Documents, Document Approvals
8. **System Tables** (2 tables) - Users, Audit Logs

**Total:** 24 tables (+ existing User authentication table)

---

## 🏭 1. CORE TABLES

### 1.1 manufacturing_facilities (formerly projects)

Primary table for tracking manufacturing facilities and their certifications.

```sql
CREATE TABLE manufacturing_facilities (
    -- Primary Key
    facility_id SERIAL PRIMARY KEY,
    
    -- Basic Information
    facility_name VARCHAR(255) NOT NULL,
    facility_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Location Information
    country_code CHAR(2) NOT NULL,           -- ISO 3166-1 alpha-2
    country_name VARCHAR(100) NOT NULL,
    location_code VARCHAR(2) NOT NULL,        -- Internal location code
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Technology & Capabilities
    technology_type VARCHAR(50) NOT NULL,     -- Contact, Dual, Contactless
    manufacturing_capabilities TEXT[],        -- Array: IC, Inlay, Card, etc.
    production_capacity INTEGER,              -- Cards per day
    
    -- CQM Label Structure: ACCLLTTTTS
    cqm_label VARCHAR(11) UNIQUE,            -- Example: A0001C0001A
    label_country_code CHAR(2),              -- CC part
    label_location_code VARCHAR(2),          -- LL part
    label_technology VARCHAR(4),             -- TTTT part
    label_status CHAR(1),                    -- S part: R=Recognition, A=Approval
    
    -- Certification Status
    certification_status VARCHAR(50) NOT NULL DEFAULT 'Not Certified',
    -- Options: Not Certified, In Process, Certified, Suspended, Expired
    certificate_number VARCHAR(100),
    certificate_issue_date DATE,
    certificate_expiry_date DATE,
    last_audit_date DATE,
    next_audit_due_date DATE,
    audit_frequency_months INTEGER DEFAULT 24, -- 12, 18, 24
    
    -- Letter of Approval (LoA)
    loa_status VARCHAR(50),                  -- Active, Pending, Expired
    loa_reference_number VARCHAR(100),
    loa_issue_date DATE,
    
    -- Contact Information
    facility_manager_name VARCHAR(255),
    facility_manager_email VARCHAR(255),
    quality_manager_name VARCHAR(255),
    quality_manager_email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Operational Status
    operational_status VARCHAR(50) DEFAULT 'Active',
    -- Options: Active, Inactive, Under Review, Suspended
    
    -- Additional Details
    iso_certifications TEXT[],               -- ISO 9001, ISO 14001, etc.
    established_date DATE,
    employee_count INTEGER,
    notes TEXT,
    
    -- System Fields
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_technology CHECK (
        technology_type IN ('Contact', 'Dual', 'Contactless')
    ),
    CONSTRAINT valid_cert_status CHECK (
        certification_status IN ('Not Certified', 'In Process', 'Certified', 'Suspended', 'Expired')
    ),
    CONSTRAINT valid_label_status CHECK (
        label_status IN ('R', 'A', NULL)
    )
);

CREATE INDEX idx_facilities_country ON manufacturing_facilities(country_code);
CREATE INDEX idx_facilities_tech ON manufacturing_facilities(technology_type);
CREATE INDEX idx_facilities_status ON manufacturing_facilities(certification_status);
CREATE INDEX idx_facilities_cqm_label ON manufacturing_facilities(cqm_label);
CREATE INDEX idx_facilities_expiry ON manufacturing_facilities(certificate_expiry_date);
```

---

### 1.2 certifications

Track all certifications for each facility.

```sql
CREATE TABLE certifications (
    -- Primary Key
    certification_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    facility_id INTEGER NOT NULL REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    
    -- Certification Details
    cqm_label VARCHAR(11) NOT NULL,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    certificate_type VARCHAR(50) NOT NULL,    -- Initial, Renewal, Re-certification
    
    -- Dates
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    effective_date DATE,
    
    -- Audit Information
    audit_id INTEGER REFERENCES audits(audit_id),
    audit_type VARCHAR(50),                   -- On-site, Remote, Surveillance
    auditor_name VARCHAR(255),
    auditor_organization VARCHAR(255) DEFAULT 'Smart Consulting',
    
    -- Status
    status VARCHAR(50) DEFAULT 'Active',      -- Active, Expired, Suspended, Revoked
    revocation_reason TEXT,
    revocation_date DATE,
    
    -- Renewal Information
    renewal_interval_months INTEGER DEFAULT 24,
    renewal_due_date DATE,
    renewal_notification_sent BOOLEAN DEFAULT FALSE,
    
    -- Letter of Approval
    loa_reference VARCHAR(100),
    loa_file_path VARCHAR(500),
    certificate_file_path VARCHAR(500),
    
    -- Notes
    notes TEXT,
    
    -- System Fields
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_cert_type CHECK (
        certificate_type IN ('Initial', 'Renewal', 'Re-certification')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('Active', 'Expired', 'Suspended', 'Revoked')
    )
);

CREATE INDEX idx_certifications_facility ON certifications(facility_id);
CREATE INDEX idx_certifications_status ON certifications(status);
CREATE INDEX idx_certifications_expiry ON certifications(expiry_date);
CREATE INDEX idx_certifications_label ON certifications(cqm_label);
```

---

### 1.3 audits (formerly milestones)

Track all audits for facilities.

```sql
CREATE TABLE audits (
    -- Primary Key
    audit_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    facility_id INTEGER NOT NULL REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    
    -- Audit Basic Information
    audit_name VARCHAR(255) NOT NULL,
    audit_reference VARCHAR(100) UNIQUE,
    audit_type VARCHAR(50) NOT NULL,          -- Initial, Surveillance, Re-certification, Remote
    audit_scope TEXT,
    
    -- Audit Schedule
    scheduled_date DATE NOT NULL,
    scheduled_duration_days INTEGER DEFAULT 2,
    actual_start_date DATE,
    actual_end_date DATE,
    actual_duration_days INTEGER,
    
    -- Audit Team
    lead_auditor_name VARCHAR(255) NOT NULL,
    lead_auditor_email VARCHAR(255),
    auditor_organization VARCHAR(255) DEFAULT 'Smart Consulting',
    team_members TEXT[],                      -- Array of auditor names
    
    -- Audit Status & Phase
    status VARCHAR(50) DEFAULT 'Scheduled',
    -- Options: Scheduled, Pre-Audit, In Progress, Completed, Report Issued, Closed
    current_phase VARCHAR(50),
    -- Options: Planning, Pre-Audit, On-site, Post-Audit, CAP, Closure
    
    -- Pre-Audit Phase
    pre_audit_started BOOLEAN DEFAULT FALSE,
    pre_audit_completed BOOLEAN DEFAULT FALSE,
    pre_audit_completion_date DATE,
    cqmgiap_completed BOOLEAN DEFAULT FALSE,  -- Internal Audit results
    cqmap_completed BOOLEAN DEFAULT FALSE,    -- Audit Plan
    pre_audit_documents_submitted BOOLEAN DEFAULT FALSE,
    pre_audit_gaps_identified TEXT,
    
    -- On-site Audit Phase
    opening_meeting_date TIMESTAMP,
    closing_meeting_date TIMESTAMP,
    site_tour_completed BOOLEAN DEFAULT FALSE,
    document_review_completed BOOLEAN DEFAULT FALSE,
    process_observation_completed BOOLEAN DEFAULT FALSE,
    personnel_interviews_completed BOOLEAN DEFAULT FALSE,
    
    -- Findings Summary
    major_nc_count INTEGER DEFAULT 0,
    minor_nc_count INTEGER DEFAULT 0,
    observation_count INTEGER DEFAULT 0,
    positive_findings TEXT,
    
    -- Post-Audit Phase
    report_issued BOOLEAN DEFAULT FALSE,
    report_issue_date DATE,
    report_file_path VARCHAR(500),
    
    -- CAPA Phase
    cap_required BOOLEAN DEFAULT FALSE,
    cap_submitted BOOLEAN DEFAULT FALSE,
    cap_submission_date DATE,
    cap_accepted BOOLEAN DEFAULT FALSE,
    cap_acceptance_date DATE,
    cap_evidence_verified BOOLEAN DEFAULT FALSE,
    all_nc_closed BOOLEAN DEFAULT FALSE,
    
    -- Closure
    audit_closed BOOLEAN DEFAULT FALSE,
    closure_date DATE,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_id INTEGER REFERENCES certifications(certification_id),
    
    -- Audit Outcome
    recommendation VARCHAR(100),
    -- Options: Approve, Approve with CAP, Reject, Defer
    overall_assessment TEXT,
    
    -- ISO Standards Audited
    iso_standards_audited TEXT[],             -- Array: ISO 7810, 7816, etc.
    
    -- Notes & Attachments
    audit_plan_file_path VARCHAR(500),
    notes TEXT,
    internal_notes TEXT,
    
    -- System Fields
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_audit_type CHECK (
        audit_type IN ('Initial', 'Surveillance', 'Re-certification', 'Remote', 'Special')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('Scheduled', 'Pre-Audit', 'In Progress', 'Completed', 'Report Issued', 'Closed', 'Cancelled')
    ),
    CONSTRAINT valid_recommendation CHECK (
        recommendation IN ('Approve', 'Approve with CAP', 'Reject', 'Defer', NULL)
    )
);

CREATE INDEX idx_audits_facility ON audits(facility_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_date ON audits(scheduled_date);
CREATE INDEX idx_audits_phase ON audits(current_phase);
CREATE INDEX idx_audits_type ON audits(audit_type);
```

---

## 🧪 2. TEST MANAGEMENT TABLES

### 2.1 test_categories

Hierarchical categorization of tests.

```sql
CREATE TABLE test_categories (
    -- Primary Key
    category_id SERIAL PRIMARY KEY,
    
    -- Category Information
    category_name VARCHAR(255) NOT NULL UNIQUE,
    category_code VARCHAR(50) UNIQUE,
    parent_category_id INTEGER REFERENCES test_categories(category_id),
    
    -- ISO Standard Reference
    primary_iso_standard VARCHAR(50),         -- ISO 7810, ISO 7816-1, etc.
    
    -- Description
    description TEXT,
    test_methodology TEXT,
    
    -- Category Metadata
    test_count INTEGER DEFAULT 0,            -- Number of tests in category
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed Data Examples:
-- Physical Tests (ISO 7810)
-- Smart Card Tests (ISO 7816-1)
-- EMV Chip Functionality
-- Magnetic Stripe Tests
-- Card Body Construction
-- Environmental Tests
-- Mechanical Tests
-- Electrical Tests

CREATE INDEX idx_test_categories_parent ON test_categories(parent_category_id);
CREATE INDEX idx_test_categories_iso ON test_categories(primary_iso_standard);
```

---

### 2.2 test_definitions

Master library of all test types (100+ tests).

```sql
CREATE TABLE test_definitions (
    -- Primary Key
    test_id SERIAL PRIMARY KEY,
    
    -- Test Identification
    test_code VARCHAR(50) NOT NULL UNIQUE,    -- PHY-TOX-001, EMV-CHIP-015, etc.
    test_name VARCHAR(255) NOT NULL,
    test_short_name VARCHAR(100),
    
    -- Test Classification
    category_id INTEGER NOT NULL REFERENCES test_categories(category_id),
    test_type VARCHAR(50) NOT NULL,           -- Physical, Electrical, Functional, Visual
    
    -- ISO Standard Reference
    iso_standard VARCHAR(50) NOT NULL,        -- ISO 7810, ISO 7816-1, etc.
    iso_section VARCHAR(100),                 -- Specific section reference
    iso_clause TEXT,
    
    -- Test Description
    test_objective TEXT NOT NULL,
    test_procedure TEXT NOT NULL,
    test_equipment_required TEXT[],
    sample_size INTEGER,
    test_duration_minutes INTEGER,
    
    -- Acceptance Criteria
    acceptance_criteria TEXT NOT NULL,
    measurement_unit VARCHAR(50),             -- mm, °C, mA, Pass/Fail, etc.
    min_value DECIMAL(10,4),
    max_value DECIMAL(10,4),
    target_value DECIMAL(10,4),
    tolerance DECIMAL(10,4),
    
    -- Test Parameters
    test_conditions TEXT,                     -- Temperature, humidity, etc.
    test_frequency VARCHAR(100),              -- Per batch, daily, weekly, etc.
    
    -- Importance & Risk
    criticality VARCHAR(50) DEFAULT 'Medium', -- Critical, High, Medium, Low
    risk_if_failed TEXT,
    
    -- Additional Information
    applicable_card_types TEXT[],            -- Contact, Contactless, Dual, Magnetic
    applicable_technologies TEXT[],          -- EMV, Magnetic, RFID, etc.
    test_method_standard VARCHAR(100),       -- ISO 10373, etc.
    
    -- Status
    is_mandatory BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    obsolete_date DATE,
    
    -- References
    related_tests INTEGER[],                 -- Array of related test_ids
    supersedes_test_id INTEGER REFERENCES test_definitions(test_id),
    
    -- Attachments
    procedure_document_path VARCHAR(500),
    reference_images TEXT[],
    
    -- System Fields
    version VARCHAR(20) DEFAULT '1.0',
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_test_type CHECK (
        test_type IN ('Physical', 'Electrical', 'Functional', 'Visual', 'Environmental', 'Mechanical')
    ),
    CONSTRAINT valid_criticality CHECK (
        criticality IN ('Critical', 'High', 'Medium', 'Low')
    )
);

CREATE INDEX idx_test_definitions_category ON test_definitions(category_id);
CREATE INDEX idx_test_definitions_iso ON test_definitions(iso_standard);
CREATE INDEX idx_test_definitions_code ON test_definitions(test_code);
CREATE INDEX idx_test_definitions_active ON test_definitions(is_active);
CREATE INDEX idx_test_definitions_mandatory ON test_definitions(is_mandatory);
```

---

### 2.3 test_results (formerly tasks)

Record of all test results performed.

```sql
CREATE TABLE test_results (
    -- Primary Key
    result_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    facility_id INTEGER NOT NULL REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    test_id INTEGER NOT NULL REFERENCES test_definitions(test_id),
    batch_id INTEGER REFERENCES production_batches(batch_id),
    
    -- Test Execution Information
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    test_time TIME,
    test_reference VARCHAR(100) UNIQUE,
    
    -- Sample Information
    sample_id VARCHAR(100),
    sample_size INTEGER,
    card_type VARCHAR(100),                  -- Contact, Contactless, Dual
    card_technology VARCHAR(100),            -- EMV, Magnetic, RFID
    
    -- Test Results
    result_status VARCHAR(50) NOT NULL,      -- Pass, Fail, Conditional Pass, Invalid
    measured_value DECIMAL(10,4),
    measurement_unit VARCHAR(50),
    
    -- Multiple Measurements (if applicable)
    measurements JSONB,                      -- Array of multiple readings
    statistical_data JSONB,                  -- Mean, SD, min, max, etc.
    
    -- Pass/Fail Determination
    acceptance_met BOOLEAN,
    deviation_from_target DECIMAL(10,4),
    deviation_percentage DECIMAL(5,2),
    
    -- Test Conditions
    test_temperature DECIMAL(5,2),
    test_humidity DECIMAL(5,2),
    test_conditions_notes TEXT,
    
    -- Personnel
    performed_by INTEGER REFERENCES users(user_id),
    performed_by_name VARCHAR(255),
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_by_name VARCHAR(255),
    review_date DATE,
    approved_by INTEGER REFERENCES users(user_id),
    approval_date DATE,
    
    -- Equipment Used
    equipment_id INTEGER REFERENCES test_equipment(equipment_id),
    equipment_calibration_date DATE,
    equipment_calibration_due_date DATE,
    
    -- Failure Analysis (if failed)
    failure_mode VARCHAR(255),
    root_cause TEXT,
    corrective_action_taken TEXT,
    retest_required BOOLEAN DEFAULT FALSE,
    retest_result_id INTEGER REFERENCES test_results(result_id),
    
    -- Attachments & Evidence
    test_report_file_path VARCHAR(500),
    photos TEXT[],                           -- Array of file paths
    raw_data_file_path VARCHAR(500),
    
    -- Audit Trail
    is_audit_sample BOOLEAN DEFAULT FALSE,
    audit_id INTEGER REFERENCES audits(audit_id),
    
    -- Quality Flags
    flagged_for_review BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    outlier_detected BOOLEAN DEFAULT FALSE,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_result_status CHECK (
        result_status IN ('Pass', 'Fail', 'Conditional Pass', 'Invalid', 'Pending Review')
    )
);

CREATE INDEX idx_test_results_facility ON test_results(facility_id);
CREATE INDEX idx_test_results_test ON test_results(test_id);
CREATE INDEX idx_test_results_batch ON test_results(batch_id);
CREATE INDEX idx_test_results_date ON test_results(test_date);
CREATE INDEX idx_test_results_status ON test_results(result_status);
CREATE INDEX idx_test_results_performed_by ON test_results(performed_by);
CREATE INDEX idx_test_results_flagged ON test_results(flagged_for_review);
```

---

### 2.4 test_equipment

Track testing equipment and calibration.

```sql
CREATE TABLE test_equipment (
    -- Primary Key
    equipment_id SERIAL PRIMARY KEY,
    
    -- Equipment Information
    equipment_code VARCHAR(50) NOT NULL UNIQUE,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100),              -- Durability Tester, EMV Analyzer, etc.
    manufacturer VARCHAR(255),
    model_number VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    
    -- Location & Assignment
    facility_id INTEGER REFERENCES manufacturing_facilities(facility_id),
    location VARCHAR(255),
    assigned_to INTEGER REFERENCES users(user_id),
    
    -- Calibration Information
    requires_calibration BOOLEAN DEFAULT TRUE,
    calibration_frequency_days INTEGER DEFAULT 365,
    last_calibration_date DATE,
    next_calibration_due_date DATE,
    calibration_certificate_path VARCHAR(500),
    calibration_status VARCHAR(50) DEFAULT 'Valid',
    -- Options: Valid, Due Soon, Overdue, Not Required
    
    -- Service Information
    purchase_date DATE,
    warranty_expiry_date DATE,
    last_service_date DATE,
    next_service_due_date DATE,
    service_provider VARCHAR(255),
    
    -- Operational Status
    operational_status VARCHAR(50) DEFAULT 'Operational',
    -- Options: Operational, Out of Service, Under Calibration, Decommissioned
    
    -- Usage Tracking
    total_tests_performed INTEGER DEFAULT 0,
    last_used_date DATE,
    
    -- Notes
    notes TEXT,
    maintenance_history JSONB,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_calibration_status CHECK (
        calibration_status IN ('Valid', 'Due Soon', 'Overdue', 'Not Required')
    ),
    CONSTRAINT valid_operational_status CHECK (
        operational_status IN ('Operational', 'Out of Service', 'Under Calibration', 'Decommissioned')
    )
);

CREATE INDEX idx_equipment_facility ON test_equipment(facility_id);
CREATE INDEX idx_equipment_calibration_due ON test_equipment(next_calibration_due_date);
CREATE INDEX idx_equipment_status ON test_equipment(operational_status);
```

---

## 🎯 3. QUALITY MANAGEMENT TABLES

### 3.1 non_conformities (formerly risks)

Track non-conformities found during audits.

```sql
CREATE TABLE non_conformities (
    -- Primary Key
    nc_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    facility_id INTEGER NOT NULL REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    audit_id INTEGER REFERENCES audits(audit_id),
    
    -- NC Identification
    nc_reference VARCHAR(100) NOT NULL UNIQUE,
    nc_title VARCHAR(255) NOT NULL,
    nc_type VARCHAR(50) NOT NULL,             -- Major, Minor, Observation
    
    -- NC Details
    description TEXT NOT NULL,
    requirement_violated TEXT NOT NULL,       -- Which ISO requirement was violated
    iso_standard_reference VARCHAR(100),      -- ISO 7810:2003 clause 5.3
    
    -- Finding Information
    finding_date DATE NOT NULL DEFAULT CURRENT_DATE,
    discovery_method VARCHAR(100),            -- Audit, Inspection, Test, Customer Complaint
    evidence_description TEXT,
    photos TEXT[],                           -- Array of evidence photos
    documents TEXT[],                        -- Array of evidence documents
    
    -- Impact Assessment
    impact_severity VARCHAR(50),             -- Critical, High, Medium, Low
    potential_risks TEXT,
    affected_products TEXT[],
    affected_processes TEXT[],
    customer_impact VARCHAR(100),            -- None, Potential, Actual
    
    -- Root Cause Analysis
    root_cause TEXT,
    root_cause_analysis_method VARCHAR(100), -- 5 Whys, Fishbone, etc.
    root_cause_verified BOOLEAN DEFAULT FALSE,
    
    -- Responsible Parties
    raised_by INTEGER REFERENCES users(user_id),
    raised_by_name VARCHAR(255),
    assigned_to INTEGER REFERENCES users(user_id),
    assigned_to_name VARCHAR(255),
    quality_manager_id INTEGER REFERENCES users(user_id),
    
    -- Status & Timeline
    status VARCHAR(50) DEFAULT 'Open',
    -- Options: Open, CAPA Assigned, Under Review, Closed, Verified
    identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_closure_date DATE,
    actual_closure_date DATE,
    
    -- Closure Information
    closure_verification TEXT,
    verified_by INTEGER REFERENCES users(user_id),
    verification_date DATE,
    effectiveness_verified BOOLEAN DEFAULT FALSE,
    
    -- Priority
    priority VARCHAR(50) DEFAULT 'Medium',   -- Critical, High, Medium, Low
    escalated BOOLEAN DEFAULT FALSE,
    escalation_date DATE,
    escalation_reason TEXT,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_nc_type CHECK (
        nc_type IN ('Major', 'Minor', 'Observation')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('Open', 'CAPA Assigned', 'Under Review', 'Closed', 'Verified')
    ),
    CONSTRAINT valid_priority CHECK (
        priority IN ('Critical', 'High', 'Medium', 'Low')
    ),
    CONSTRAINT valid_severity CHECK (
        impact_severity IN ('Critical', 'High', 'Medium', 'Low', NULL)
    )
);

CREATE INDEX idx_nc_facility ON non_conformities(facility_id);
CREATE INDEX idx_nc_audit ON non_conformities(audit_id);
CREATE INDEX idx_nc_type ON non_conformities(nc_type);
CREATE INDEX idx_nc_status ON non_conformities(status);
CREATE INDEX idx_nc_date ON non_conformities(identified_date);
CREATE INDEX idx_nc_assigned_to ON non_conformities(assigned_to);
```

---

### 3.2 capa_actions (formerly change_requests)

Corrective and Preventive Actions.

```sql
CREATE TABLE capa_actions (
    -- Primary Key
    capa_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    nc_id INTEGER REFERENCES non_conformities(nc_id) ON DELETE CASCADE,
    facility_id INTEGER NOT NULL REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    audit_id INTEGER REFERENCES audits(audit_id),
    
    -- CAPA Identification
    capa_reference VARCHAR(100) NOT NULL UNIQUE,
    capa_title VARCHAR(255) NOT NULL,
    capa_type VARCHAR(50) NOT NULL,          -- Corrective, Preventive, Both
    
    -- CAPA Description
    problem_statement TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    proposed_action TEXT NOT NULL,
    action_plan TEXT NOT NULL,
    
    -- Implementation
    implementation_steps JSONB,              -- Array of steps with completion status
    resources_required TEXT,
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    
    -- Responsibility
    raised_by INTEGER REFERENCES users(user_id),
    assigned_to INTEGER NOT NULL REFERENCES users(user_id),
    assigned_to_name VARCHAR(255),
    quality_manager_id INTEGER REFERENCES users(user_id),
    management_sponsor VARCHAR(255),
    
    -- Timeline
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    due_in_days INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN actual_completion_date IS NULL 
            THEN (target_completion_date - CURRENT_DATE)
            ELSE 0
        END
    ) STORED,
    
    -- Status
    status VARCHAR(50) DEFAULT 'Submitted',
    -- Options: Submitted, Under Review, Approved, In Progress, Completed, Verified, Closed, Rejected
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approved_by INTEGER REFERENCES users(user_id),
    approval_date DATE,
    rejection_reason TEXT,
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    current_step VARCHAR(255),
    obstacles TEXT,
    
    -- Evidence of Completion
    completion_evidence TEXT[],              -- Array of file paths
    completion_notes TEXT,
    before_photos TEXT[],
    after_photos TEXT[],
    
    -- Effectiveness Review
    effectiveness_criteria TEXT,
    effectiveness_review_date DATE,
    effectiveness_verified BOOLEAN DEFAULT FALSE,
    effectiveness_verification_method TEXT,
    verified_by INTEGER REFERENCES users(user_id),
    verification_date DATE,
    verification_notes TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Priority
    priority VARCHAR(50) DEFAULT 'Medium',   -- Critical, High, Medium, Low
    overdue BOOLEAN GENERATED ALWAYS AS (
        CASE 
            WHEN status NOT IN ('Completed', 'Verified', 'Closed') 
                AND target_completion_date < CURRENT_DATE 
            THEN TRUE
            ELSE FALSE
        END
    ) STORED,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_capa_type CHECK (
        capa_type IN ('Corrective', 'Preventive', 'Both')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('Submitted', 'Under Review', 'Approved', 'In Progress', 'Completed', 'Verified', 'Closed', 'Rejected')
    ),
    CONSTRAINT valid_approval_status CHECK (
        approval_status IN ('Pending', 'Approved', 'Rejected')
    ),
    CONSTRAINT valid_priority CHECK (
        priority IN ('Critical', 'High', 'Medium', 'Low')
    )
);

CREATE INDEX idx_capa_nc ON capa_actions(nc_id);
CREATE INDEX idx_capa_facility ON capa_actions(facility_id);
CREATE INDEX idx_capa_status ON capa_actions(status);
CREATE INDEX idx_capa_assigned ON capa_actions(assigned_to);
CREATE INDEX idx_capa_due_date ON capa_actions(target_completion_date);
CREATE INDEX idx_capa_overdue ON capa_actions(overdue);
```

---

### 3.3 iso_standards

Reference table for ISO standards and requirements.

```sql
CREATE TABLE iso_standards (
    -- Primary Key
    standard_id SERIAL PRIMARY KEY,
    
    -- Standard Identification
    standard_code VARCHAR(50) NOT NULL UNIQUE, -- ISO 7810, ISO 7816-1, etc.
    standard_full_name VARCHAR(255) NOT NULL,
    standard_short_name VARCHAR(100),
    
    -- Version Information
    version_year INTEGER NOT NULL,            -- 2003, 2019, etc.
    edition VARCHAR(50),
    revision VARCHAR(50),
    publication_date DATE,
    
    -- Standard Details
    scope TEXT,
    applicable_to TEXT[],                     -- Card types, technologies
    supersedes VARCHAR(100),                  -- Previous version
    superseded_by VARCHAR(100),               -- Newer version
    
    -- Requirements
    total_requirements INTEGER,
    critical_requirements INTEGER,
    requirements_summary TEXT,
    key_requirements JSONB,                  -- Structured list of requirements
    
    -- Testing
    related_test_method VARCHAR(100),        -- ISO 10373, etc.
    test_definitions_count INTEGER DEFAULT 0,
    
    -- Status
    is_current BOOLEAN DEFAULT TRUE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    obsolete_date DATE,
    
    -- Compliance
    applicable_card_types TEXT[],
    applicable_technologies TEXT[],
    
    -- Documentation
    document_file_path VARCHAR(500),
    purchase_url TEXT,
    iso_organization_url TEXT,
    
    -- Notes
    notes TEXT,
    compliance_tips TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed Data Examples:
-- ISO/IEC 7810:2019 - Identification cards — Physical characteristics
-- ISO/IEC 7811-1:2018 - Recording technique — Part 1: Embossing
-- ISO/IEC 7813:2006 - Financial transaction cards
-- ISO/IEC 7816-1:2011 - Smart cards — Part 1: Physical characteristics
-- ISO/IEC 7816-2:2007 - Smart cards — Part 2: Cards with contacts
-- ISO/IEC 7816-3:2006 - Smart cards — Part 3: Electronic signals
-- ISO/IEC 10373-1:2006 - Test methods — Part 1: General characteristics

CREATE INDEX idx_iso_standards_code ON iso_standards(standard_code);
CREATE INDEX idx_iso_standards_current ON iso_standards(is_current);
CREATE INDEX idx_iso_standards_mandatory ON iso_standards(is_mandatory);
```

---

## 🏭 4. MANUFACTURING TABLES

### 4.1 production_batches

Track production batches for traceability.

```sql
CREATE TABLE production_batches (
    -- Primary Key
    batch_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    facility_id INTEGER NOT NULL REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    process_id INTEGER REFERENCES manufacturing_processes(process_id),
    
    -- Batch Information
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    batch_name VARCHAR(255),
    product_type VARCHAR(100) NOT NULL,      -- Contact Card, Contactless Card, etc.
    product_specification VARCHAR(255),
    
    -- Production Details
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    production_line VARCHAR(100),
    shift VARCHAR(50),
    quantity_produced INTEGER NOT NULL,
    quantity_tested INTEGER DEFAULT 0,
    quantity_passed INTEGER DEFAULT 0,
    quantity_failed INTEGER DEFAULT 0,
    
    -- Material Traceability
    raw_materials JSONB,                     -- Array of materials used
    component_batch_numbers TEXT[],
    supplier_ids INTEGER[],
    
    -- Quality Status
    quality_status VARCHAR(50) DEFAULT 'Pending',
    -- Options: Pending, Testing, Passed, Failed, Quarantined, Released
    quality_approval_date DATE,
    approved_by INTEGER REFERENCES users(user_id),
    
    -- Testing
    mandatory_tests_completed BOOLEAN DEFAULT FALSE,
    test_completion_percentage DECIMAL(5,2),
    first_article_inspection BOOLEAN DEFAULT FALSE,
    
    -- Defects
    defect_count INTEGER DEFAULT 0,
    defect_rate DECIMAL(5,2),
    
    -- Release
    release_status VARCHAR(50) DEFAULT 'Hold',
    -- Options: Hold, Approved for Release, Released, Rejected
    release_date DATE,
    release_authorization VARCHAR(255),
    
    -- Customer Information
    customer_name VARCHAR(255),
    customer_order_reference VARCHAR(100),
    
    -- Notes
    notes TEXT,
    quality_notes TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_quality_status CHECK (
        quality_status IN ('Pending', 'Testing', 'Passed', 'Failed', 'Quarantined', 'Released')
    ),
    CONSTRAINT valid_release_status CHECK (
        release_status IN ('Hold', 'Approved for Release', 'Released', 'Rejected')
    )
);

CREATE INDEX idx_batches_facility ON production_batches(facility_id);
CREATE INDEX idx_batches_number ON production_batches(batch_number);
CREATE INDEX idx_batches_date ON production_batches(production_date);
CREATE INDEX idx_batches_status ON production_batches(quality_status);
```

---

### 4.2 manufacturing_processes

Define manufacturing processes and controls.

```sql
CREATE TABLE manufacturing_processes (
    -- Primary Key
    process_id SERIAL PRIMARY KEY,
    
    -- Foreign Key
    facility_id INTEGER NOT NULL REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    
    -- Process Information
    process_code VARCHAR(50) NOT NULL UNIQUE,
    process_name VARCHAR(255) NOT NULL,
    process_type VARCHAR(100) NOT NULL,
    -- Options: IC Manufacturing, IC Module Production, Inlay Assembly, 
    --          Card Production, Chip Embedding, Personalization
    
    -- Process Description
    process_description TEXT,
    process_flow_diagram_path VARCHAR(500),
    
    -- Process Parameters
    control_parameters JSONB,                -- Critical parameters to monitor
    operating_conditions TEXT,
    equipment_required TEXT[],
    
    -- Quality Control
    inspection_points JSONB,                 -- Where inspections occur
    critical_quality_attributes TEXT[],
    sampling_plan TEXT,
    
    -- Monitoring
    monitoring_frequency VARCHAR(100),       -- Continuous, hourly, per batch
    spc_charts_required BOOLEAN DEFAULT FALSE,
    
    -- Process Capability
    process_capability_cpk DECIMAL(5,3),
    last_capability_study_date DATE,
    
    -- Documentation
    work_instruction_path VARCHAR(500),
    sop_document_path VARCHAR(500),
    training_materials TEXT[],
    
    -- Personnel Requirements
    certified_operators_required BOOLEAN DEFAULT TRUE,
    minimum_training_hours INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_review_date DATE,
    next_review_due_date DATE,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_process_type CHECK (
        process_type IN ('IC Manufacturing', 'IC Module Production', 'Inlay Assembly', 
                        'Card Production', 'Chip Embedding', 'Personalization', 'Other')
    )
);

CREATE INDEX idx_processes_facility ON manufacturing_processes(facility_id);
CREATE INDEX idx_processes_type ON manufacturing_processes(process_type);
CREATE INDEX idx_processes_active ON manufacturing_processes(is_active);
```

---

### 4.3 components

Track components and materials.

```sql
CREATE TABLE components (
    -- Primary Key
    component_id SERIAL PRIMARY KEY,
    
    -- Component Information
    component_code VARCHAR(50) NOT NULL UNIQUE,
    component_name VARCHAR(255) NOT NULL,
    component_type VARCHAR(100) NOT NULL,
    -- Options: Integrated Circuit, IC Module, Antenna, Card Body, Overlay, etc.
    
    -- Specifications
    specification VARCHAR(255),
    technical_datasheet_path VARCHAR(500),
    quality_specification TEXT,
    
    -- Supplier Information
    primary_supplier_id INTEGER REFERENCES supplier_management(supplier_id),
    alternate_suppliers INTEGER[],           -- Array of supplier_ids
    
    -- Quality Requirements
    incoming_inspection_required BOOLEAN DEFAULT TRUE,
    inspection_criteria TEXT,
    test_requirements TEXT[],
    quality_certifications_required TEXT[],
    
    -- Traceability
    lot_tracking_required BOOLEAN DEFAULT TRUE,
    serialization_required BOOLEAN DEFAULT FALSE,
    shelf_life_days INTEGER,
    
    -- Usage
    applicable_products TEXT[],
    usage_per_unit DECIMAL(10,4),
    unit_of_measure VARCHAR(50),
    
    -- Inventory
    current_stock INTEGER,
    reorder_point INTEGER,
    lead_time_days INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_date DATE,
    obsolete_date DATE,
    
    -- Notes
    notes TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_components_type ON components(component_type);
CREATE INDEX idx_components_supplier ON components(primary_supplier_id);
CREATE INDEX idx_components_active ON components(is_active);
```

---

## 👥 5. PERSONNEL TABLES

### 5.1 personnel_training

Track employee training and qualifications.

```sql
CREATE TABLE personnel_training (
    -- Primary Key
    training_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    employee_id INTEGER NOT NULL REFERENCES users(user_id),
    facility_id INTEGER REFERENCES manufacturing_facilities(facility_id),
    
    -- Employee Information
    employee_name VARCHAR(255) NOT NULL,
    employee_number VARCHAR(50),
    job_title VARCHAR(255),
    department VARCHAR(100),
    
    -- Training Information
    training_topic VARCHAR(255) NOT NULL,
    training_type VARCHAR(100) NOT NULL,
    -- Options: Initial Training, Refresher, Certification, Re-certification, OJT
    training_category VARCHAR(100),
    -- Options: Quality, Manufacturing, Safety, Technical, ISO Standards, etc.
    
    -- Training Details
    training_provider VARCHAR(255),
    trainer_name VARCHAR(255),
    training_method VARCHAR(100),            -- Classroom, Online, On-the-job, etc.
    training_duration_hours DECIMAL(5,2),
    training_materials TEXT[],
    
    -- Dates
    training_date DATE NOT NULL,
    expiry_date DATE,
    next_refresher_due_date DATE,
    
    -- Assessment
    assessment_required BOOLEAN DEFAULT FALSE,
    assessment_score DECIMAL(5,2),
    passing_score DECIMAL(5,2) DEFAULT 80.00,
    assessment_passed BOOLEAN,
    assessment_date DATE,
    
    -- Certification
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(100),
    certificate_file_path VARCHAR(500),
    
    -- Qualification
    qualified_for TEXT[],                    -- Array of processes/tasks
    qualification_level VARCHAR(50),         -- Basic, Intermediate, Advanced, Expert
    
    -- Status
    training_status VARCHAR(50) DEFAULT 'Completed',
    -- Options: Scheduled, In Progress, Completed, Expired, Cancelled
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Compliance
    mandatory_training BOOLEAN DEFAULT FALSE,
    iso_requirement VARCHAR(100),
    regulatory_requirement VARCHAR(100),
    
    -- Notes
    notes TEXT,
    
    -- System Fields
    recorded_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_training_type CHECK (
        training_type IN ('Initial Training', 'Refresher', 'Certification', 'Re-certification', 'OJT', 'Other')
    ),
    CONSTRAINT valid_training_status CHECK (
        training_status IN ('Scheduled', 'In Progress', 'Completed', 'Expired', 'Cancelled')
    )
);

CREATE INDEX idx_training_employee ON personnel_training(employee_id);
CREATE INDEX idx_training_facility ON personnel_training(facility_id);
CREATE INDEX idx_training_expiry ON personnel_training(expiry_date);
CREATE INDEX idx_training_status ON personnel_training(is_current);
CREATE INDEX idx_training_topic ON personnel_training(training_topic);
```

---

### 5.2 personnel_qualifications

Quick view of employee qualifications matrix.

```sql
CREATE TABLE personnel_qualifications (
    -- Primary Key
    qualification_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    employee_id INTEGER NOT NULL REFERENCES users(user_id),
    process_id INTEGER REFERENCES manufacturing_processes(process_id),
    facility_id INTEGER REFERENCES manufacturing_facilities(facility_id),
    
    -- Qualification Information
    qualification_name VARCHAR(255) NOT NULL,
    qualification_type VARCHAR(100),         -- Process, Equipment, Task, Role
    
    -- Status
    qualification_status VARCHAR(50) DEFAULT 'Qualified',
    -- Options: In Training, Qualified, Expired, Suspended
    qualification_date DATE NOT NULL,
    expiry_date DATE,
    
    -- Level
    proficiency_level VARCHAR(50),           -- Trainee, Qualified, Advanced, Expert
    
    -- Assessor
    qualified_by INTEGER REFERENCES users(user_id),
    assessor_name VARCHAR(255),
    
    -- Evidence
    supporting_documents TEXT[],
    
    -- Notes
    notes TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_qualification_status CHECK (
        qualification_status IN ('In Training', 'Qualified', 'Expired', 'Suspended')
    ),
    CONSTRAINT valid_proficiency CHECK (
        proficiency_level IN ('Trainee', 'Qualified', 'Advanced', 'Expert', NULL)
    ),
    CONSTRAINT unique_employee_qualification UNIQUE (employee_id, qualification_name, process_id)
);

CREATE INDEX idx_qualifications_employee ON personnel_qualifications(employee_id);
CREATE INDEX idx_qualifications_process ON personnel_qualifications(process_id);
CREATE INDEX idx_qualifications_status ON personnel_qualifications(qualification_status);
```

---

## 🤝 6. SUPPLIER MANAGEMENT TABLES

### 6.1 supplier_management

Track suppliers and their qualifications.

```sql
CREATE TABLE supplier_management (
    -- Primary Key
    supplier_id SERIAL PRIMARY KEY,
    
    -- Supplier Information
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_type VARCHAR(100),              -- Component, Material, Service, Equipment
    
    -- Contact Information
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website TEXT,
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Business Information
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    years_in_business INTEGER,
    
    -- Supplier Classification
    supplier_category VARCHAR(100),          -- Critical, Preferred, Approved, Conditional
    risk_rating VARCHAR(50),                 -- Low, Medium, High
    
    -- Products/Services Supplied
    products_supplied TEXT[],
    services_supplied TEXT[],
    component_types TEXT[],
    
    -- Qualification Status
    qualification_status VARCHAR(50) DEFAULT 'Under Evaluation',
    -- Options: Under Evaluation, Qualified, Approved, Conditional, Suspended, Disqualified
    qualification_date DATE,
    qualification_expiry_date DATE,
    
    -- Quality Agreement
    quality_agreement_signed BOOLEAN DEFAULT FALSE,
    quality_agreement_date DATE,
    quality_agreement_file_path VARCHAR(500),
    
    -- Certifications
    iso_9001_certified BOOLEAN DEFAULT FALSE,
    iso_14001_certified BOOLEAN DEFAULT FALSE,
    other_certifications TEXT[],
    certification_documents TEXT[],
    
    -- Performance Metrics
    quality_score DECIMAL(5,2),              -- 0-100
    delivery_score DECIMAL(5,2),
    responsiveness_score DECIMAL(5,2),
    overall_performance_score DECIMAL(5,2),
    
    -- Audit Information
    last_audit_date DATE,
    next_audit_due_date DATE,
    audit_frequency_months INTEGER DEFAULT 24,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_date DATE,
    suspension_date DATE,
    suspension_reason TEXT,
    
    -- Financial
    payment_terms VARCHAR(100),
    currency VARCHAR(3),
    
    -- Notes
    notes TEXT,
    strengths TEXT,
    concerns TEXT,
    
    -- System Fields
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_qualification_status CHECK (
        qualification_status IN ('Under Evaluation', 'Qualified', 'Approved', 'Conditional', 'Suspended', 'Disqualified')
    ),
    CONSTRAINT valid_category CHECK (
        supplier_category IN ('Critical', 'Preferred', 'Approved', 'Conditional', NULL)
    ),
    CONSTRAINT valid_risk_rating CHECK (
        risk_rating IN ('Low', 'Medium', 'High', NULL)
    )
);

CREATE INDEX idx_suppliers_status ON supplier_management(qualification_status);
CREATE INDEX idx_suppliers_active ON supplier_management(is_active);
CREATE INDEX idx_suppliers_category ON supplier_management(supplier_category);
CREATE INDEX idx_suppliers_code ON supplier_management(supplier_code);
```

---

### 6.2 supplier_audits

Track supplier audits and assessments.

```sql
CREATE TABLE supplier_audits (
    -- Primary Key
    supplier_audit_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    supplier_id INTEGER NOT NULL REFERENCES supplier_management(supplier_id) ON DELETE CASCADE,
    
    -- Audit Information
    audit_reference VARCHAR(100) NOT NULL UNIQUE,
    audit_type VARCHAR(100) NOT NULL,        -- Initial Qualification, Surveillance, Re-qualification
    audit_method VARCHAR(50),                -- On-site, Remote, Document Review
    
    -- Schedule
    scheduled_date DATE NOT NULL,
    actual_date DATE,
    audit_duration_days INTEGER,
    
    -- Audit Team
    lead_auditor INTEGER REFERENCES users(user_id),
    audit_team TEXT[],
    
    -- Audit Scope
    audit_scope TEXT,
    areas_audited TEXT[],
    
    -- Findings
    major_findings_count INTEGER DEFAULT 0,
    minor_findings_count INTEGER DEFAULT 0,
    observations_count INTEGER DEFAULT 0,
    positive_findings TEXT,
    
    -- Results
    audit_result VARCHAR(50),                -- Approved, Conditional, Not Approved
    overall_score DECIMAL(5,2),
    
    -- Action Required
    corrective_actions_required BOOLEAN DEFAULT FALSE,
    action_plan_submitted BOOLEAN DEFAULT FALSE,
    action_plan_due_date DATE,
    actions_verified BOOLEAN DEFAULT FALSE,
    
    -- Documentation
    audit_report_file_path VARCHAR(500),
    findings_list JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'Scheduled',
    -- Options: Scheduled, In Progress, Completed, Report Issued, Closed
    
    -- Notes
    notes TEXT,
    recommendations TEXT,
    
    -- System Fields
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_audit_type CHECK (
        audit_type IN ('Initial Qualification', 'Surveillance', 'Re-qualification', 'Special')
    ),
    CONSTRAINT valid_audit_result CHECK (
        audit_result IN ('Approved', 'Conditional', 'Not Approved', NULL)
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('Scheduled', 'In Progress', 'Completed', 'Report Issued', 'Closed', 'Cancelled')
    )
);

CREATE INDEX idx_supplier_audits_supplier ON supplier_audits(supplier_id);
CREATE INDEX idx_supplier_audits_date ON supplier_audits(scheduled_date);
CREATE INDEX idx_supplier_audits_status ON supplier_audits(status);
```

---

## 📄 7. DOCUMENT MANAGEMENT TABLES

### 7.1 qms_documents (formerly project_documents)

Quality Management System documents.

```sql
CREATE TABLE qms_documents (
    -- Primary Key
    document_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    facility_id INTEGER REFERENCES manufacturing_facilities(facility_id) ON DELETE CASCADE,
    
    -- Document Information
    document_number VARCHAR(100) NOT NULL UNIQUE,
    document_title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    -- Options: Policy, Procedure, Work Instruction, Form, Record, 
    --          Certificate, Report, Specification, Drawing, Other
    
    -- Classification
    document_category VARCHAR(100),          -- Quality, Manufacturing, Safety, Training, etc.
    confidentiality_level VARCHAR(50) DEFAULT 'Internal',
    -- Options: Public, Internal, Confidential, Restricted
    
    -- Version Control
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    revision INTEGER DEFAULT 0,
    version_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_date DATE,
    
    -- Approval Workflow
    status VARCHAR(50) DEFAULT 'Draft',
    -- Options: Draft, Under Review, Approved, Obsolete, Archived
    prepared_by INTEGER REFERENCES users(user_id),
    prepared_by_name VARCHAR(255),
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_by_name VARCHAR(255),
    review_date DATE,
    approved_by INTEGER REFERENCES users(user_id),
    approved_by_name VARCHAR(255),
    approval_date DATE,
    
    -- Document Control
    review_frequency_months INTEGER DEFAULT 12,
    next_review_due_date DATE,
    last_review_date DATE,
    supersedes_document_id INTEGER REFERENCES qms_documents(document_id),
    superseded_by_document_id INTEGER REFERENCES qms_documents(document_id),
    
    -- File Information
    file_name VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_size_kb INTEGER,
    file_type VARCHAR(50),
    
    -- ISO Reference
    iso_standard_reference VARCHAR(100),
    iso_requirement_clause VARCHAR(100),
    
    -- Distribution
    distribution_list TEXT[],                -- Who needs this document
    access_level VARCHAR(50) DEFAULT 'General',
    -- Options: General, Restricted, Management Only, QA Only
    
    -- Training
    training_required BOOLEAN DEFAULT FALSE,
    training_record_required BOOLEAN DEFAULT FALSE,
    
    -- Notes
    description TEXT,
    notes TEXT,
    change_description TEXT,                 -- What changed in this version
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_doc_type CHECK (
        document_type IN ('Policy', 'Procedure', 'Work Instruction', 'Form', 'Record', 
                         'Certificate', 'Report', 'Specification', 'Drawing', 'Other')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('Draft', 'Under Review', 'Approved', 'Obsolete', 'Archived')
    ),
    CONSTRAINT valid_confidentiality CHECK (
        confidentiality_level IN ('Public', 'Internal', 'Confidential', 'Restricted')
    )
);

CREATE INDEX idx_qms_docs_facility ON qms_documents(facility_id);
CREATE INDEX idx_qms_docs_type ON qms_documents(document_type);
CREATE INDEX idx_qms_docs_status ON qms_documents(status);
CREATE INDEX idx_qms_docs_number ON qms_documents(document_number);
CREATE INDEX idx_qms_docs_review_due ON qms_documents(next_review_due_date);
```

---

### 7.2 document_approvals

Track document approval workflow.

```sql
CREATE TABLE document_approvals (
    -- Primary Key
    approval_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    document_id INTEGER NOT NULL REFERENCES qms_documents(document_id) ON DELETE CASCADE,
    
    -- Approval Information
    approval_step INTEGER NOT NULL,          -- 1 = Review, 2 = Approve, etc.
    approval_role VARCHAR(100) NOT NULL,     -- Reviewer, Approver, QA Manager, etc.
    required_user_id INTEGER REFERENCES users(user_id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'Pending',    -- Pending, Approved, Rejected
    
    -- Response
    decision_date TIMESTAMP,
    decision_by INTEGER REFERENCES users(user_id),
    decision_name VARCHAR(255),
    comments TEXT,
    rejection_reason TEXT,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_date TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (
        status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')
    ),
    CONSTRAINT unique_doc_step_user UNIQUE (document_id, approval_step, required_user_id)
);

CREATE INDEX idx_approvals_document ON document_approvals(document_id);
CREATE INDEX idx_approvals_user ON document_approvals(required_user_id);
CREATE INDEX idx_approvals_status ON document_approvals(status);
```

---

## 🔐 8. SYSTEM TABLES

### 8.1 users (existing - update for CQM roles)

```sql
-- Update existing users table with CQM roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facility_id INTEGER REFERENCES manufacturing_facilities(facility_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS qualifications TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_level VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_auditor BOOLEAN DEFAULT FALSE;

-- CQM Roles:
-- System Administrator
-- Quality Manager
-- Auditor
-- Test Technician
-- Production Manager
-- Document Controller
-- Viewer

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_facility ON users(facility_id);
```

---

### 8.2 system_audit_log

Track all important system actions for audit trail.

```sql
CREATE TABLE system_audit_log (
    -- Primary Key
    log_id BIGSERIAL PRIMARY KEY,
    
    -- Action Information
    action_type VARCHAR(100) NOT NULL,       -- CREATE, UPDATE, DELETE, LOGIN, etc.
    table_name VARCHAR(100),
    record_id INTEGER,
    
    -- User Information
    user_id INTEGER REFERENCES users(user_id),
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    
    -- Change Details
    before_value JSONB,
    after_value JSONB,
    changes JSONB,
    
    -- Context
    action_description TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Timestamp
    timestamp TIMESTAMP DEFAULT NOW(),
    
    -- Classification
    severity VARCHAR(50),                    -- Info, Warning, Critical
    category VARCHAR(100)                    -- Security, Data Change, Quality, etc.
);

CREATE INDEX idx_audit_log_user ON system_audit_log(user_id);
CREATE INDEX idx_audit_log_table ON system_audit_log(table_name);
CREATE INDEX idx_audit_log_timestamp ON system_audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON system_audit_log(action_type);
```

---

## 📊 VIEWS FOR REPORTING

### Certificate Expiry View

```sql
CREATE OR REPLACE VIEW v_certificate_expiry_alerts AS
SELECT 
    f.facility_id,
    f.facility_name,
    f.country_code,
    c.certificate_number,
    c.cqm_label,
    c.expiry_date,
    (c.expiry_date - CURRENT_DATE) AS days_until_expiry,
    CASE 
        WHEN c.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN c.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Critical'
        WHEN c.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'Warning'
        WHEN c.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'Notice'
        ELSE 'OK'
    END AS alert_level
FROM manufacturing_facilities f
JOIN certifications c ON f.facility_id = c.facility_id
WHERE c.status = 'Active'
ORDER BY c.expiry_date;
```

---

### Test Results Summary View

```sql
CREATE OR REPLACE VIEW v_test_results_summary AS
SELECT 
    f.facility_id,
    f.facility_name,
    tc.category_name,
    td.test_name,
    COUNT(*) AS total_tests,
    SUM(CASE WHEN tr.result_status = 'Pass' THEN 1 ELSE 0 END) AS passed,
    SUM(CASE WHEN tr.result_status = 'Fail' THEN 1 ELSE 0 END) AS failed,
    ROUND(100.0 * SUM(CASE WHEN tr.result_status = 'Pass' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pass_rate
FROM test_results tr
JOIN manufacturing_facilities f ON tr.facility_id = f.facility_id
JOIN test_definitions td ON tr.test_id = td.test_id
JOIN test_categories tc ON td.category_id = tc.category_id
WHERE tr.test_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY f.facility_id, f.facility_name, tc.category_name, td.test_name
ORDER BY f.facility_name, tc.category_name;
```

---

### NC & CAPA Status View

```sql
CREATE OR REPLACE VIEW v_nc_capa_status AS
SELECT 
    f.facility_id,
    f.facility_name,
    COUNT(DISTINCT nc.nc_id) AS total_ncs,
    SUM(CASE WHEN nc.nc_type = 'Major' THEN 1 ELSE 0 END) AS major_ncs,
    SUM(CASE WHEN nc.nc_type = 'Minor' THEN 1 ELSE 0 END) AS minor_ncs,
    SUM(CASE WHEN nc.status = 'Open' THEN 1 ELSE 0 END) AS open_ncs,
    COUNT(DISTINCT ca.capa_id) AS total_capas,
    SUM(CASE WHEN ca.status = 'Completed' THEN 1 ELSE 0 END) AS completed_capas,
    SUM(CASE WHEN ca.overdue THEN 1 ELSE 0 END) AS overdue_capas
FROM manufacturing_facilities f
LEFT JOIN non_conformities nc ON f.facility_id = nc.facility_id
LEFT JOIN capa_actions ca ON nc.nc_id = ca.nc_id
GROUP BY f.facility_id, f.facility_name
ORDER BY f.facility_name;
```

---

## 🔄 MIGRATION STRATEGY

### Step 1: Backup Current Database
```bash
pg_dump pmbok_db > pmbok_backup_$(date +%Y%m%d).sql
```

### Step 2: Create New Database (Optional - for testing)
```bash
createdb cqm_tracking_test
psql cqm_tracking_test < pmbok_backup_$(date +%Y%m%d).sql
```

### Step 3: Run Migrations Sequentially
```bash
psql cqm_tracking_test -f migrations/001_rename_core_tables.sql
psql cqm_tracking_test -f migrations/002_modify_facilities_table.sql
# ... continue with all migrations
```

### Step 4: Seed Test Definitions and ISO Standards
```bash
node seed-test-definitions.js
node seed-iso-standards.js
```

### Step 5: Test All Queries
```bash
npm run test:database
```

---

## 📈 INDEXES SUMMARY

### Critical Indexes for Performance
- Facility lookups by CQM label, country, status
- Test results by facility, date, status
- Audits by facility, date, status
- NC/CAPA by facility, status, due date
- Certificate expiry dates
- Training expiry dates
- Document version lookups

---

## 🎯 NEXT STEPS

1. **Review & Validate** this schema with domain experts
2. **Obtain CQM Requirements Document** (V2.22) from Smart Consulting
3. **Create Seed Data** for 100+ test definitions
4. **Write Migration Scripts** based on this schema
5. **Test on Development Database** before production
6. **Document All Changes** for team review

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2025  
**Status:** Ready for Development



