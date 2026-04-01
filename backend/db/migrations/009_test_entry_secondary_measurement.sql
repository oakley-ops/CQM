-- Second measurement value per card entry (e.g. Embossed warpage alongside No-Embossing warpage)
ALTER TABLE test_entries
  ADD COLUMN IF NOT EXISTS secondary_measurement_value DECIMAL(10,4);
