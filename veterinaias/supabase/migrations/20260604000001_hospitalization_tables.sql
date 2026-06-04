-- 20260604000001_hospitalization_tables.sql
CREATE TABLE hospitalization_records (
  visit_id                    UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  source_visit_id             UUID REFERENCES service_visits(id),
  admitted_by                 UUID REFERENCES user_profiles(id),
  reason                      TEXT NOT NULL,
  diagnosis                   TEXT,
  weight_kg                   NUMERIC(5,2),
  treatment_plan              TEXT,
  discharge_notes             TEXT,
  discharge_diagnosis         TEXT,
  post_discharge_instructions TEXT
);

ALTER TABLE hospitalization_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_hospitalization_records" ON hospitalization_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_hospitalization_records" ON hospitalization_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_hospitalization_records" ON hospitalization_records
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

CREATE TABLE hospitalization_daily_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  medications  TEXT,
  fed          BOOLEAN NOT NULL DEFAULT false,
  temperature  NUMERIC(4,1),
  created_by   UUID NOT NULL REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (visit_id, log_date)
);
CREATE INDEX hospitalization_daily_logs_visit_id_idx ON hospitalization_daily_logs(visit_id);

ALTER TABLE hospitalization_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_hosp_daily_logs" ON hospitalization_daily_logs
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_hosp_daily_logs" ON hospitalization_daily_logs
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_hosp_daily_logs" ON hospitalization_daily_logs
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
