-- =====================================================
-- CQM Transformation Migration 001
-- Rename Core PMBOK Tables to CQM Equivalents
-- =====================================================
-- Description: Rename existing PMBOK tables to match CQM terminology
-- Date: December 16, 2025
-- Author: CQM Transformation Team
-- =====================================================

BEGIN;

-- Display migration start
DO $$ 
BEGIN 
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 001: Renaming Core Tables';
    RAISE NOTICE '========================================';
END $$;

-- 1. Rename: projects → manufacturing_facilities
-- This is the core entity for tracking card production facilities
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE projects RENAME TO manufacturing_facilities;
        RAISE NOTICE '✓ Renamed: projects → manufacturing_facilities';
    ELSE
        RAISE NOTICE '⚠ Table projects does not exist or already renamed';
    END IF;
END $$;

-- 2. Rename: tasks → test_results
-- Tasks become test result records (100+ different tests)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE tasks RENAME TO test_results;
        RAISE NOTICE '✓ Renamed: tasks → test_results';
    ELSE
        RAISE NOTICE '⚠ Table tasks does not exist or already renamed';
    END IF;
END $$;

-- 3. Rename: milestones → audits
-- Milestones become audit events (on-site, remote, surveillance)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestones') THEN
        ALTER TABLE milestones RENAME TO audits;
        RAISE NOTICE '✓ Renamed: milestones → audits';
    ELSE
        RAISE NOTICE '⚠ Table milestones does not exist or already renamed';
    END IF;
END $$;

-- 4. Rename: risks → non_conformities
-- Risks become Non-Conformities (Major, Minor, Observation)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks') THEN
        ALTER TABLE risks RENAME TO non_conformities;
        RAISE NOTICE '✓ Renamed: risks → non_conformities';
    ELSE
        RAISE NOTICE '⚠ Table risks does not exist or already renamed';
    END IF;
END $$;

-- 5. Rename: change_requests → capa_actions
-- Change Requests become CAPA (Corrective and Preventive Actions)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'change_requests') THEN
        ALTER TABLE change_requests RENAME TO capa_actions;
        RAISE NOTICE '✓ Renamed: change_requests → capa_actions';
    ELSE
        RAISE NOTICE '⚠ Table change_requests does not exist or already renamed';
    END IF;
END $$;

-- 6. Rename: project_documents → qms_documents
-- Project Documents become QMS (Quality Management System) Documents
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_documents') THEN
        ALTER TABLE project_documents RENAME TO qms_documents;
        RAISE NOTICE '✓ Renamed: project_documents → qms_documents';
    ELSE
        RAISE NOTICE '⚠ Table project_documents does not exist or already renamed';
    END IF;
END $$;

-- 7. Rename: quality_metrics → iso_compliance_records
-- Quality Metrics become ISO Compliance tracking records
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quality_metrics') THEN
        ALTER TABLE quality_metrics RENAME TO iso_compliance_records;
        RAISE NOTICE '✓ Renamed: quality_metrics → iso_compliance_records';
    ELSE
        RAISE NOTICE '⚠ Table quality_metrics does not exist or already renamed';
    END IF;
END $$;

-- Rename Foreign Key Columns to match new table names
-- This ensures referential integrity is maintained

-- Update foreign key column in test_results (formerly tasks)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_results' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE test_results RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: test_results.project_id → facility_id';
    END IF;
END $$;

-- Update foreign key column in audits (formerly milestones)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audits' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE audits RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: audits.project_id → facility_id';
    END IF;
END $$;

-- Update foreign key column in non_conformities (formerly risks)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'non_conformities' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE non_conformities RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: non_conformities.project_id → facility_id';
    END IF;
END $$;

-- Update foreign key column in capa_actions (formerly change_requests)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'capa_actions' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE capa_actions RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: capa_actions.project_id → facility_id';
    END IF;
END $$;

-- Update foreign key column in qms_documents (formerly project_documents)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qms_documents' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE qms_documents RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: qms_documents.project_id → facility_id';
    END IF;
END $$;

-- Update other tables that reference projects
DO $$ 
BEGIN 
    -- Update project_charters
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_charters' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE project_charters RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: project_charters.project_id → facility_id';
    END IF;

    -- Update stakeholders
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stakeholders' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE stakeholders RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: stakeholders.project_id → facility_id';
    END IF;

    -- Update lessons_learned
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons_learned' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE lessons_learned RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: lessons_learned.project_id → facility_id';
    END IF;

    -- Update task_dependencies
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_dependencies' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE task_dependencies RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: task_dependencies.project_id → facility_id';
    END IF;

    -- Update budgets
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budgets' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE budgets RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: budgets.project_id → facility_id';
    END IF;

    -- Update expenses
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE expenses RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: expenses.project_id → facility_id';
    END IF;

    -- Update evm_snapshots
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evm_snapshots' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE evm_snapshots RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: evm_snapshots.project_id → facility_id';
    END IF;

    -- Update iso_compliance_records (formerly quality_metrics)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'iso_compliance_records' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE iso_compliance_records RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: iso_compliance_records.project_id → facility_id';
    END IF;

    -- Update quality_inspections
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quality_inspections' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE quality_inspections RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: quality_inspections.project_id → facility_id';
    END IF;

    -- Update defects
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defects' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE defects RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: defects.project_id → facility_id';
    END IF;

    -- Update team_members
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE team_members RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: team_members.project_id → facility_id';
    END IF;

    -- Update resource_allocations
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resource_allocations' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE resource_allocations RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: resource_allocations.project_id → facility_id';
    END IF;

    -- Update status_reports
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_reports' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE status_reports RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: status_reports.project_id → facility_id';
    END IF;

    -- Update meeting_minutes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meeting_minutes' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE meeting_minutes RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: meeting_minutes.project_id → facility_id';
    END IF;

    -- Update communication_logs
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communication_logs' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE communication_logs RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: communication_logs.project_id → facility_id';
    END IF;

    -- Update requirements
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requirements' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE requirements RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: requirements.project_id → facility_id';
    END IF;

    -- Update wbs_items
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wbs_items' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE wbs_items RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: wbs_items.project_id → facility_id';
    END IF;

    -- Update contracts
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE contracts RENAME COLUMN project_id TO facility_id;
        RAISE NOTICE '✓ Renamed column: contracts.project_id → facility_id';
    END IF;
END $$;

-- Display completion message
DO $$ 
BEGIN 
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 001 Completed Successfully!';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Migration Notes:
-- ----------------
-- This migration renames all core PMBOK tables to CQM equivalents
-- All foreign key relationships are preserved
-- Data integrity is maintained
-- This is a structural change only - no data is lost
-- 
-- Tables Renamed:
-- 1. projects → manufacturing_facilities
-- 2. tasks → test_results  
-- 3. milestones → audits
-- 4. risks → non_conformities
-- 5. change_requests → capa_actions
-- 6. project_documents → qms_documents
-- 7. quality_metrics → iso_compliance_records
--
-- All project_id columns renamed to facility_id across all tables

