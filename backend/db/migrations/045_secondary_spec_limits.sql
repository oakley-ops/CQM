-- Add secondary spec limit columns to support asymmetric Width vs Height tolerances
ALTER TABLE test_definitions
  ADD COLUMN IF NOT EXISTS secondary_min_acceptable_value DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS secondary_max_acceptable_value DECIMAL(10,4);

-- #3002# Width/Height (asymmetric, from manufacturing tolerance table)
--   Width  (primary)   : LSL = -0.130 mm / USL = +0.120 mm
--   Height (secondary) : LSL = -0.060 mm / USL = +0.050 mm
UPDATE test_definitions SET
  min_acceptable_value           = -0.1300,
  max_acceptable_value           =  0.1200,
  secondary_min_acceptable_value = -0.0600,
  secondary_max_acceptable_value =  0.0500
WHERE test_id = '#3002#';

-- #3003# Card Thickness — widen to manufacturing process tolerance
--   ±0.080 mm around 0.80 mm nominal → LSL = 0.720 mm / USL = 0.880 mm
UPDATE test_definitions SET
  min_acceptable_value = 0.7200,
  max_acceptable_value = 0.8800
WHERE test_id = '#3003#';

-- Backfill pass_status on imported #3002# entries (width primary value)
UPDATE test_entries SET
  pass_status = (measurement_value >= -0.130 AND measurement_value <= 0.120)
WHERE test_definition_id = (SELECT id FROM test_definitions WHERE test_id = '#3002#')
  AND measurement_value IS NOT NULL;

-- Backfill pass_status on imported #3003# entries
UPDATE test_entries SET
  pass_status = (measurement_value >= 0.720 AND measurement_value <= 0.880)
WHERE test_definition_id = (SELECT id FROM test_definitions WHERE test_id = '#3003#')
  AND measurement_value IS NOT NULL;
