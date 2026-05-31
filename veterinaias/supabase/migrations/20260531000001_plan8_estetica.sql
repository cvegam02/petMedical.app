-- supabase/migrations/20260531000001_plan8_estetica.sql

-- 1. Grooming service catalog (per-tenant, no pricing in v1)
CREATE TABLE IF NOT EXISTS grooming_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  duration_minutes INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grooming_service_catalog_tenant_id_idx
  ON grooming_service_catalog(tenant_id);

ALTER TABLE grooming_service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_grooming_catalog" ON grooming_service_catalog
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_insert_grooming_catalog" ON grooming_service_catalog
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_update_grooming_catalog" ON grooming_service_catalog
  FOR UPDATE USING (tenant_id = auth_tenant_id());

-- 2. Extend appointments with type
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'consultation'
  CHECK (appointment_type IN ('consultation', 'grooming'));

-- 3. Grooming sessions (immutable after insert)
CREATE TABLE IF NOT EXISTS grooming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grooming_sessions_tenant_id_idx ON grooming_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS grooming_sessions_pet_id_idx ON grooming_sessions(pet_id);

ALTER TABLE grooming_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_grooming_sessions" ON grooming_sessions
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_insert_grooming_sessions" ON grooming_sessions
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());

-- 4. Services per session (cascade delete)
CREATE TABLE IF NOT EXISTS grooming_session_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES grooming_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_catalog_id UUID REFERENCES grooming_service_catalog(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grooming_session_services_session_id_idx
  ON grooming_session_services(session_id);

ALTER TABLE grooming_session_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_grooming_session_services" ON grooming_session_services
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_insert_grooming_session_services" ON grooming_session_services
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
