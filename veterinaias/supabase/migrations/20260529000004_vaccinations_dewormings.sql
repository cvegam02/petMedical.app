-- Create pet_vaccinations table
CREATE TABLE IF NOT EXISTS pet_vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  applied_by UUID NOT NULL REFERENCES user_profiles(id),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  vaccine_catalog_id UUID REFERENCES vaccine_catalog(id) ON DELETE SET NULL,
  vaccine_name TEXT NOT NULL,
  lot_number TEXT,
  application_date DATE NOT NULL,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create pet_dewormings table
CREATE TABLE IF NOT EXISTS pet_dewormings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  applied_by UUID NOT NULL REFERENCES user_profiles(id),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  application_date DATE NOT NULL,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS pet_vaccinations_pet_id_idx ON pet_vaccinations(pet_id);
CREATE INDEX IF NOT EXISTS pet_vaccinations_tenant_id_idx ON pet_vaccinations(tenant_id);
CREATE INDEX IF NOT EXISTS pet_dewormings_pet_id_idx ON pet_dewormings(pet_id);
CREATE INDEX IF NOT EXISTS pet_dewormings_tenant_id_idx ON pet_dewormings(tenant_id);

-- Enable RLS
ALTER TABLE pet_vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_dewormings ENABLE ROW LEVEL SECURITY;

-- RLS policies for pet_vaccinations
CREATE POLICY "authenticated_read_pet_vaccinations" ON pet_vaccinations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_insert_pet_vaccinations" ON pet_vaccinations
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());

-- RLS policies for pet_dewormings
CREATE POLICY "authenticated_read_pet_dewormings" ON pet_dewormings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_insert_pet_dewormings" ON pet_dewormings
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
