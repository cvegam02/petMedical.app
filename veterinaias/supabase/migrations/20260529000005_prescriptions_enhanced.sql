ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS medication_catalog_id UUID REFERENCES medication_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_ingredient TEXT,
  ADD COLUMN IF NOT EXISTS suggested_dose TEXT,
  ADD COLUMN IF NOT EXISTS route_of_administration TEXT;
