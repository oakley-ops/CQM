ALTER TABLE test_definitions ADD COLUMN IF NOT EXISTS machine_tags TEXT[] DEFAULT '{}';
