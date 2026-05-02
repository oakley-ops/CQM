-- Rename IT-PHY-003 to #3005# and set the official test method and spec
UPDATE test_definitions
SET
  test_id             = '#3005#',
  test_name           = 'Corners [IS7810]',
  short_name          = 'Corner Radius',
  test_method         = '#8060#: Corners [IS7810]',
  iso_standard        = 'ISO 7810',
  standard_section    = 'IS7810',
  unit_of_measurement = 'mm',
  min_acceptable_value = 2.88,
  max_acceptable_value = 3.48,
  pass_criteria       = 'All four corner radii shall be 3.18 mm ± 0.30 mm (2.88–3.48 mm). '
                        'Both criteria must be satisfied: (1) corner profile fits between concentric '
                        'circle lines of gauge template; (2) adjacent card edges fit between parallel lines.',
  description         = 'Verify that all four corner radii of the card comply with ISO 7810 ID-1 '
                        'specifications using test method #8060#. Measured with a radius gauge, '
                        'profile projector, or optical comparator at minimum ×10 magnification.',
  updated_at          = NOW()
WHERE test_id = 'IT-PHY-003';
