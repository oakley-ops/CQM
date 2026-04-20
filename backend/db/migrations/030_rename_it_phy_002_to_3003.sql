-- Rename IT-PHY-002 to the CQM requirement number #3003#.
-- Card Thickness outside Contacts, Embossed Areas and Add-on Areas per ISO/IEC 10373-1 method #8040#.
-- Acceptance: 0.76 – 0.84 mm (ID-1 card body).

UPDATE test_definitions
SET
  test_id             = '#3003#',
  test_name           = 'Card Thickness Outside Contacts, Embossed Areas and Add-on Areas [IS7810]',
  short_name          = 'Card Thickness',
  description         = 'Measures the thickness of the card in areas outside the ICM area, embossed areas, '
                        'and Add-on Areas (signature panels, holograms, etc.) per ISO/IEC 10373-1 method #8040#. '
                        '5 measurement points per card; card fails if any single point falls outside 0.76–0.84 mm.',
  iso_standard        = 'ISO/IEC 10373-1',
  unit_of_measurement = 'mm',
  min_acceptable_value = 0.76,
  max_acceptable_value = 0.84,
  updated_at          = NOW()
WHERE test_id = 'IT-PHY-002';
