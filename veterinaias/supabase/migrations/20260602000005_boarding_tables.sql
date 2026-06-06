-- 20260602000005_boarding_tables.sql
-- Servicio de Hotel (boarding): extensión 1:1 + bitácora diaria, sobre service_visits.

CREATE TABLE boarding_records (
  visit_id             UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  expected_check_out   DATE,
  feeding_instructions TEXT,
  belongings           TEXT,
  special_care         TEXT,
  notes                TEXT
);

ALTER TABLE boarding_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_boarding_records" ON boarding_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_boarding_records" ON boarding_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_boarding_records" ON boarding_records
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

CREATE TABLE boarding_daily_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id   UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  fed        BOOLEAN NOT NULL DEFAULT false,
  walked     BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX boarding_daily_logs_visit_id_idx ON boarding_daily_logs(visit_id);

ALTER TABLE boarding_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_boarding_daily_logs" ON boarding_daily_logs
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_boarding_daily_logs" ON boarding_daily_logs
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
