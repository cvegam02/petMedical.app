-- 20260601000003_migrate_grooming.sql

INSERT INTO service_visits (id, tenant_id, pet_id, owner_id, appointment_id, service_type, status, started_at, ended_at, created_by, created_at)
SELECT
  gs.id, gs.tenant_id, gs.pet_id,
  COALESCE(
    (SELECT a.owner_id FROM appointments a WHERE a.id = gs.appointment_id),
    (SELECT pr.owner_id FROM pet_registrations pr WHERE pr.pet_id = gs.pet_id AND pr.tenant_id = gs.tenant_id LIMIT 1)
  ),
  gs.appointment_id, 'grooming',
  CASE WHEN gs.ended_at IS NOT NULL THEN 'completed'::visit_status
       WHEN gs.started_at IS NOT NULL THEN 'in_progress'::visit_status
       ELSE 'completed'::visit_status END,
  gs.started_at, gs.ended_at, gs.created_by, gs.created_at
FROM grooming_sessions gs
WHERE EXISTS (SELECT 1 FROM pet_registrations pr WHERE pr.pet_id = gs.pet_id AND pr.tenant_id = gs.tenant_id)
   OR gs.appointment_id IS NOT NULL;

CREATE TABLE grooming_records (
  visit_id UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  notes    TEXT
);

INSERT INTO grooming_records (visit_id, notes)
SELECT id, notes FROM grooming_sessions WHERE id IN (SELECT id FROM service_visits);

ALTER TABLE grooming_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_grooming_records" ON grooming_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_grooming_records" ON grooming_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_grooming_records" ON grooming_records
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

CREATE TABLE grooming_record_services (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id          UUID NOT NULL REFERENCES grooming_records(visit_id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES grooming_service_catalog(id) ON DELETE SET NULL,
  service_name       TEXT NOT NULL
);

INSERT INTO grooming_record_services (id, record_id, service_catalog_id, service_name)
SELECT gss.id, gss.session_id, gss.service_catalog_id, gss.service_name
FROM grooming_session_services gss
WHERE gss.session_id IN (SELECT id FROM service_visits);

CREATE INDEX grooming_record_services_record_id_idx ON grooming_record_services(record_id);

ALTER TABLE grooming_record_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_grooming_record_services" ON grooming_record_services
  FOR SELECT USING (record_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_grooming_record_services" ON grooming_record_services
  FOR INSERT WITH CHECK (record_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

DROP TABLE grooming_session_services CASCADE;
DROP TABLE grooming_sessions CASCADE;
