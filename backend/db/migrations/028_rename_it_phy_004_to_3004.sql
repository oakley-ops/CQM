-- Rename IT-PHY-004 to the CQM requirement number #3004# and set spec limit.
-- Thickness within Add-on Areas per ISO/IEC 10373-1 method #8050#.
-- Acceptance: delta (inside − outside) ≤ 0.05 mm.

UPDATE test_definitions
SET
  test_id              = '#3004#',
  test_name            = 'Thickness within Add-on Areas [IS10373-1]',
  short_name           = 'Add-On Thickness',
  description          = 'Relative height of Add-On areas (signature panel, hologram, etc.) '
                         'per ISO/IEC 10373-1 method #8050#. '
                         'Delta = avg thickness inside Add-On minus avg outside thickness (#8040# / #3003#).',
  iso_standard         = 'ISO/IEC 10373-1',
  unit_of_measurement  = 'mm',
  max_acceptable_value = 0.05,
  min_acceptable_value = NULL,
  updated_at           = NOW()
WHERE test_id = 'IT-PHY-004';
