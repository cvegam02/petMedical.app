-- 20260603000001_surgery_records.sql
CREATE TABLE surgery_records (
  visit_id              UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  attended_by           UUID REFERENCES user_profiles(id),
  diagnosis             TEXT,
  weight_kg             NUMERIC(5,2),
  pre_op_notes          TEXT,
  anesthesia_type       TEXT,
  anesthesia_notes      TEXT,
  procedure             TEXT,
  findings              TEXT,
  complications         TEXT,
  supplies              TEXT,
  post_op_notes         TEXT,
  recovery_instructions TEXT,
  follow_up_date        DATE
);

ALTER TABLE surgery_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_surgery_records" ON surgery_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_surgery_records" ON surgery_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_surgery_records" ON surgery_records
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
