-- 20260601000001_service_visits_foundation.sql

-- Enums centrales
CREATE TYPE service_type AS ENUM (
  'consultation', 'grooming', 'surgery', 'hospitalization', 'boarding'
);

CREATE TYPE visit_status AS ENUM (
  'scheduled', 'in_progress', 'completed', 'cancelled'
);

-- Tabla central de visitas de servicio
CREATE TABLE service_visits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id         UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  owner_id       UUID NOT NULL REFERENCES owners(id),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  service_type   service_type NOT NULL,
  status         visit_status NOT NULL DEFAULT 'scheduled',
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  created_by     UUID NOT NULL REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX service_visits_tenant_id_idx     ON service_visits(tenant_id);
CREATE INDEX service_visits_pet_id_idx        ON service_visits(pet_id);
CREATE INDEX service_visits_appointment_id_idx ON service_visits(appointment_id);
CREATE INDEX service_visits_status_idx         ON service_visits(tenant_id, status);

CREATE TRIGGER service_visits_updated_at
  BEFORE UPDATE ON service_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE service_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_service_visits" ON service_visits
  FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_insert_service_visits" ON service_visits
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_update_service_visits" ON service_visits
  FOR UPDATE USING (tenant_id = auth_tenant_id());

-- Registro de entregas al dueño (whatsapp / email / pdf / print)
CREATE TABLE service_visit_deliveries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'pdf', 'print')),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_by UUID NOT NULL REFERENCES user_profiles(id)
);

CREATE INDEX service_visit_deliveries_visit_id_idx ON service_visit_deliveries(visit_id);

ALTER TABLE service_visit_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_deliveries" ON service_visit_deliveries
  FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_insert_deliveries" ON service_visit_deliveries
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
