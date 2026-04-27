-- Migration 031: Drop all PMBOK-era tables
-- The app was pivoted from PMBOK project management to CQM (Card Quality Management).
-- These tables have no corresponding models, routes, or frontend code.

-- Remove the project_id FK from quotes before dropping projects
ALTER TABLE quotes DROP COLUMN IF EXISTS project_id;

-- Drop all PMBOK tables (CASCADE removes inter-PMBOK FK constraints automatically)
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS resource_allocations CASCADE;
DROP TABLE IF EXISTS defects CASCADE;
DROP TABLE IF EXISTS quality_inspections CASCADE;
DROP TABLE IF EXISTS evm_snapshots CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS communication_logs CASCADE;
DROP TABLE IF EXISTS meeting_minutes CASCADE;
DROP TABLE IF EXISTS status_reports CASCADE;
DROP TABLE IF EXISTS wbs_items CASCADE;
DROP TABLE IF EXISTS requirements CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS lessons_learned CASCADE;
DROP TABLE IF EXISTS stakeholders CASCADE;
DROP TABLE IF EXISTS project_charters CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS change_requests CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
