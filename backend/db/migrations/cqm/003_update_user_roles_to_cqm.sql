-- Migration: 003_update_user_roles_to_cqm.sql
-- Purpose: Rename user roles from PMBOK terminology to CQM terminology
--   project_manager -> quality_manager
--   team_lead       -> auditor
--   team_member     -> tester
--   stakeholder     -> viewer
--   admin           -> (unchanged)

UPDATE users SET role = 'quality_manager' WHERE role = 'project_manager';
UPDATE users SET role = 'auditor'         WHERE role = 'team_lead';
UPDATE users SET role = 'tester'          WHERE role = 'team_member';
UPDATE users SET role = 'viewer'          WHERE role = 'stakeholder';
