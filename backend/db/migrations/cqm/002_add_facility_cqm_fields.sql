-- =====================================================
-- CQM Transformation Migration 002
-- Add CQM-Specific Fields to Manufacturing Facilities
-- =====================================================
-- Description: Add CQM certification, location, and audit fields
-- Date: December 16, 2025
-- Author: CQM Transformation Team
-- =====================================================

BEGIN;

-- Display migration start
DO $$ 
BEGIN 
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 002: Adding CQM Fields';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- SECTION 1: Location Information
-- =====================================================

-- Add country code (ISO 3166-1 alpha-2)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'country_code'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN country_code CHAR(2);
        RAISE NOTICE '✓ Added column: country_code';
    ELSE
        RAISE NOTICE '⚠ Column country_code already exists';
    END IF;
END $$;

-- Add country name
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'country_name'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN country_name VARCHAR(100);
        RAISE NOTICE '✓ Added column: country_name';
    END IF;
END $$;

-- Add location code (internal)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'location_code'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN location_code VARCHAR(2);
        RAISE NOTICE '✓ Added column: location_code';
    END IF;
END $$;

-- Add facility code (unique identifier)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'facility_code'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN facility_code VARCHAR(50) UNIQUE;
        RAISE NOTICE '✓ Added column: facility_code';
    END IF;
END $$;

-- =====================================================
-- SECTION 2: Technology & Capabilities
-- =====================================================

-- Add technology type (Contact, Dual, Contactless)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'technology_type'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN technology_type VARCHAR(50);
        
        ALTER TABLE manufacturing_facilities
        ADD CONSTRAINT valid_technology_type 
        CHECK (technology_type IN ('Contact', 'Dual', 'Contactless') OR technology_type IS NULL);
        
        RAISE NOTICE '✓ Added column: technology_type with constraint';
    END IF;
END $$;

-- Add manufacturing capabilities (array)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'manufacturing_capabilities'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN manufacturing_capabilities TEXT[];
        
        COMMENT ON COLUMN manufacturing_facilities.manufacturing_capabilities IS 
        'Array of capabilities: IC Manufacturing, IC Module Production, Inlay Assembly, Card Production, Chip Embedding, Personalization';
        
        RAISE NOTICE '✓ Added column: manufacturing_capabilities';
    END IF;
END $$;

-- Add production capacity
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'production_capacity'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN production_capacity INTEGER;
        
        COMMENT ON COLUMN manufacturing_facilities.production_capacity IS 'Cards per day';
        
        RAISE NOTICE '✓ Added column: production_capacity';
    END IF;
END $$;

-- =====================================================
-- SECTION 3: CQM Label Structure (ACCLLTTTTS)
-- =====================================================

-- Add CQM label (full label)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'cqm_label'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN cqm_label VARCHAR(11) UNIQUE;
        
        COMMENT ON COLUMN manufacturing_facilities.cqm_label IS 
        'CQM Label Format: ACCLLTTTTS (e.g., A0001C0001A)';
        
        RAISE NOTICE '✓ Added column: cqm_label';
    END IF;
END $$;

-- Add label component: Country Code (CC)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'label_country_code'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN label_country_code CHAR(2);
        RAISE NOTICE '✓ Added column: label_country_code';
    END IF;
END $$;

-- Add label component: Location Code (LL)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'label_location_code'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN label_location_code VARCHAR(2);
        RAISE NOTICE '✓ Added column: label_location_code';
    END IF;
END $$;

-- Add label component: Technology (TTTT)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'label_technology'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN label_technology VARCHAR(4);
        
        COMMENT ON COLUMN manufacturing_facilities.label_technology IS 
        'C=Contact, D=Dual, L=Contactless';
        
        RAISE NOTICE '✓ Added column: label_technology';
    END IF;
END $$;

-- Add label component: Status (S)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'label_status'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN label_status CHAR(1);
        
        ALTER TABLE manufacturing_facilities
        ADD CONSTRAINT valid_label_status 
        CHECK (label_status IN ('R', 'A') OR label_status IS NULL);
        
        COMMENT ON COLUMN manufacturing_facilities.label_status IS 
        'R=Recognition, A=Approval';
        
        RAISE NOTICE '✓ Added column: label_status with constraint';
    END IF;
END $$;

-- =====================================================
-- SECTION 4: Certification Status
-- =====================================================

-- Add certification status
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'certification_status'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN certification_status VARCHAR(50) DEFAULT 'Not Certified';
        
        ALTER TABLE manufacturing_facilities
        ADD CONSTRAINT valid_certification_status 
        CHECK (certification_status IN ('Not Certified', 'In Process', 'Certified', 'Suspended', 'Expired'));
        
        RAISE NOTICE '✓ Added column: certification_status';
    END IF;
END $$;

-- Add certificate number
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'certificate_number'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN certificate_number VARCHAR(100);
        RAISE NOTICE '✓ Added column: certificate_number';
    END IF;
END $$;

-- Add certificate issue date
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'certificate_issue_date'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN certificate_issue_date DATE;
        RAISE NOTICE '✓ Added column: certificate_issue_date';
    END IF;
END $$;

-- Add certificate expiry date
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'certificate_expiry_date'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN certificate_expiry_date DATE;
        RAISE NOTICE '✓ Added column: certificate_expiry_date';
    END IF;
END $$;

-- =====================================================
-- SECTION 5: Audit Information
-- =====================================================

-- Add last audit date
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'last_audit_date'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN last_audit_date DATE;
        RAISE NOTICE '✓ Added column: last_audit_date';
    END IF;
END $$;

-- Add next audit due date
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'next_audit_due_date'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN next_audit_due_date DATE;
        RAISE NOTICE '✓ Added column: next_audit_due_date';
    END IF;
END $$;

-- Add audit frequency (months)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'audit_frequency_months'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN audit_frequency_months INTEGER DEFAULT 24;
        
        COMMENT ON COLUMN manufacturing_facilities.audit_frequency_months IS 
        'Typical values: 12, 18, 24 months';
        
        RAISE NOTICE '✓ Added column: audit_frequency_months';
    END IF;
END $$;

-- =====================================================
-- SECTION 6: Letter of Approval (LoA)
-- =====================================================

-- Add LoA status
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'loa_status'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN loa_status VARCHAR(50);
        
        COMMENT ON COLUMN manufacturing_facilities.loa_status IS 
        'Status: Active, Pending, Expired';
        
        RAISE NOTICE '✓ Added column: loa_status';
    END IF;
END $$;

-- Add LoA reference number
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'loa_reference_number'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN loa_reference_number VARCHAR(100);
        RAISE NOTICE '✓ Added column: loa_reference_number';
    END IF;
END $$;

-- Add LoA issue date
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'loa_issue_date'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN loa_issue_date DATE;
        RAISE NOTICE '✓ Added column: loa_issue_date';
    END IF;
END $$;

-- =====================================================
-- SECTION 7: Contact Information
-- =====================================================

-- Add facility manager name
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'facility_manager_name'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN facility_manager_name VARCHAR(255);
        RAISE NOTICE '✓ Added column: facility_manager_name';
    END IF;
END $$;

-- Add facility manager email
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'facility_manager_email'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN facility_manager_email VARCHAR(255);
        RAISE NOTICE '✓ Added column: facility_manager_email';
    END IF;
END $$;

-- Add quality manager name
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'quality_manager_name'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN quality_manager_name VARCHAR(255);
        RAISE NOTICE '✓ Added column: quality_manager_name';
    END IF;
END $$;

-- Add quality manager email
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'quality_manager_email'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN quality_manager_email VARCHAR(255);
        RAISE NOTICE '✓ Added column: quality_manager_email';
    END IF;
END $$;

-- Add phone
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'phone'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN phone VARCHAR(50);
        RAISE NOTICE '✓ Added column: phone';
    END IF;
END $$;

-- =====================================================
-- SECTION 8: Additional Details
-- =====================================================

-- Add ISO certifications (array)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'iso_certifications'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN iso_certifications TEXT[];
        
        COMMENT ON COLUMN manufacturing_facilities.iso_certifications IS 
        'Array: ISO 9001, ISO 14001, etc.';
        
        RAISE NOTICE '✓ Added column: iso_certifications';
    END IF;
END $$;

-- Add established date
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'established_date'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN established_date DATE;
        RAISE NOTICE '✓ Added column: established_date';
    END IF;
END $$;

-- Add employee count
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manufacturing_facilities' AND column_name = 'employee_count'
    ) THEN
        ALTER TABLE manufacturing_facilities 
        ADD COLUMN employee_count INTEGER;
        RAISE NOTICE '✓ Added column: employee_count';
    END IF;
END $$;

-- =====================================================
-- SECTION 9: Create Indexes for Performance
-- =====================================================

DO $$ 
BEGIN 
    -- Index on country_code for filtering by country
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_facilities_country'
    ) THEN
        CREATE INDEX idx_facilities_country 
        ON manufacturing_facilities(country_code);
        RAISE NOTICE '✓ Created index: idx_facilities_country';
    END IF;

    -- Index on technology_type for filtering by technology
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_facilities_tech'
    ) THEN
        CREATE INDEX idx_facilities_tech 
        ON manufacturing_facilities(technology_type);
        RAISE NOTICE '✓ Created index: idx_facilities_tech';
    END IF;

    -- Index on certification_status for filtering certified facilities
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_facilities_cert_status'
    ) THEN
        CREATE INDEX idx_facilities_cert_status 
        ON manufacturing_facilities(certification_status);
        RAISE NOTICE '✓ Created index: idx_facilities_cert_status';
    END IF;

    -- Index on cqm_label for lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_facilities_cqm_label'
    ) THEN
        CREATE INDEX idx_facilities_cqm_label 
        ON manufacturing_facilities(cqm_label);
        RAISE NOTICE '✓ Created index: idx_facilities_cqm_label';
    END IF;

    -- Index on certificate_expiry_date for expiry alerts
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_facilities_expiry'
    ) THEN
        CREATE INDEX idx_facilities_expiry 
        ON manufacturing_facilities(certificate_expiry_date);
        RAISE NOTICE '✓ Created index: idx_facilities_expiry';
    END IF;
END $$;

-- Display completion message
DO $$ 
BEGIN 
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 002 Completed Successfully!';
    RAISE NOTICE 'Total Fields Added: 30+';
    RAISE NOTICE 'Indexes Created: 5';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Migration Summary:
-- ------------------
-- Added 30+ CQM-specific columns to manufacturing_facilities table
-- 
-- Categories:
-- 1. Location Information (4 fields)
-- 2. Technology & Capabilities (3 fields)
-- 3. CQM Label Structure (5 fields)
-- 4. Certification Status (4 fields)
-- 5. Audit Information (3 fields)
-- 6. Letter of Approval (3 fields)
-- 7. Contact Information (5 fields)
-- 8. Additional Details (3 fields)
-- 
-- Performance Indexes: 5
-- Constraints: 3 (technology_type, label_status, certification_status)



