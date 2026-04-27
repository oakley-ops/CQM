-- Migration 032: Drop team_members table missed in 031
DROP TABLE IF EXISTS team_members CASCADE;
