-- Migration 005: Add card_type column to test_categories
-- Existing generic categories default to 'ALL' (applies to every card type)

ALTER TABLE test_categories
  ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) NOT NULL DEFAULT 'ALL';
