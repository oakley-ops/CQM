-- Insert #2515# Loading of Software into IC / ICM / IL / Card (SMT category)
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'SMT' LIMIT 1),
  '#2515#',
  'Loading of Software into IC / ICM / IL / Card',
  'SW Loading',
  'Vendor-defined electrical test program',
  'Vendor specification',
  NULL,
  'passfail',
  '1/Batch',
  true,
  'active',
  'SW selection verified by independent staff member. '
    'Correct ATR verified after loading. '
    'Loaded ICM passes full electrical functionality test. '
    'Device packaging identified with unique SW + Device identifier.',
  'Verify correct SW selection (independent verifier), correct SW loading (ATR check), '
    'and full ICM functionality (electrical test program) before personalization. '
    'Vendor shall qualify SW before volume loading. '
    'SW storage shall be secure against unauthorized disclosure, modification, and loss.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#2515#');
