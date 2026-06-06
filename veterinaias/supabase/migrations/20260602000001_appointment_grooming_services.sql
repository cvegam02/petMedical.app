-- 20260602000001_appointment_grooming_services.sql
-- Structured storage of the grooming services selected when booking an appointment.
-- Previously these were only persisted as a comma-joined string in appointments.reason,
-- so they could not be carried into the grooming service_visit on session start.

CREATE TABLE appointment_grooming_services (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES grooming_service_catalog(id) ON DELETE SET NULL,
  service_name       TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX appointment_grooming_services_appointment_id_idx
  ON appointment_grooming_services(appointment_id);

ALTER TABLE appointment_grooming_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_appointment_grooming_services" ON appointment_grooming_services
  FOR SELECT USING (appointment_id IN (SELECT id FROM appointments WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_appointment_grooming_services" ON appointment_grooming_services
  FOR INSERT WITH CHECK (appointment_id IN (SELECT id FROM appointments WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_delete_appointment_grooming_services" ON appointment_grooming_services
  FOR DELETE USING (appointment_id IN (SELECT id FROM appointments WHERE tenant_id = auth_tenant_id()));

-- Backfill 1: reconstruct structured services from existing grooming appointments' reason text.
-- reason was built as catalog_names.join(', '), so splitting on ', ' recovers the names;
-- match against the tenant's catalog to recover the catalog id when possible.
INSERT INTO appointment_grooming_services (appointment_id, service_catalog_id, service_name)
SELECT a.id, c.id, btrim(part)
FROM appointments a
CROSS JOIN LATERAL unnest(string_to_array(a.reason, ', ')) AS part
LEFT JOIN grooming_service_catalog c
  ON c.tenant_id = a.tenant_id AND c.name = btrim(part)
WHERE a.service_type = 'grooming'
  AND a.reason IS NOT NULL
  AND btrim(a.reason) <> '';

-- Backfill 2: copy the appointment's services into existing grooming sessions that were
-- started from an appointment but have no recorded services yet.
INSERT INTO grooming_record_services (record_id, service_catalog_id, service_name)
SELECT sv.id, ags.service_catalog_id, ags.service_name
FROM service_visits sv
JOIN appointment_grooming_services ags ON ags.appointment_id = sv.appointment_id
WHERE sv.service_type = 'grooming'
  AND sv.appointment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM grooming_record_services g WHERE g.record_id = sv.id
  );
