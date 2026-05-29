-- Catálogo de vacunas (nivel tenant)
CREATE TABLE vaccine_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manufacturer TEXT,
  lot_number TEXT,
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  low_stock_threshold INTEGER DEFAULT 5 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Catálogo de medicamentos (nivel tenant, sin inventario)
CREATE TABLE medication_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active_ingredient TEXT,
  description TEXT,
  dose_per_kg NUMERIC(8,4),
  dose_unit TEXT,
  concentration TEXT,
  default_route TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Triggers para updated_at
CREATE TRIGGER vaccine_catalog_updated_at BEFORE UPDATE ON vaccine_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER medication_catalog_updated_at BEFORE UPDATE ON medication_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE vaccine_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_vaccine_catalog" ON vaccine_catalog
  FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "admin_insert_vaccine_catalog" ON vaccine_catalog
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id() AND auth_role() = 'admin');
CREATE POLICY "admin_update_vaccine_catalog" ON vaccine_catalog
  FOR UPDATE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');
CREATE POLICY "admin_delete_vaccine_catalog" ON vaccine_catalog
  FOR DELETE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

CREATE POLICY "tenant_read_medication_catalog" ON medication_catalog
  FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "admin_insert_medication_catalog" ON medication_catalog
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id() AND auth_role() = 'admin');
CREATE POLICY "admin_update_medication_catalog" ON medication_catalog
  FOR UPDATE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');
CREATE POLICY "admin_delete_medication_catalog" ON medication_catalog
  FOR DELETE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');
