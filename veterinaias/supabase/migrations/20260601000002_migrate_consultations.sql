-- 20260601000002_migrate_consultations.sql

-- 1. Crear un service_visit por cada medical_record existente, reutilizando el id.
INSERT INTO service_visits (id, tenant_id, pet_id, owner_id, appointment_id, service_type, status, started_at, ended_at, created_by, created_at)
SELECT
  mr.id,
  mr.tenant_id,
  mr.pet_id,
  COALESCE(
    (SELECT a.owner_id FROM appointments a WHERE a.id = mr.appointment_id),
    (SELECT pr.owner_id FROM pet_registrations pr WHERE pr.pet_id = mr.pet_id AND pr.tenant_id = mr.tenant_id LIMIT 1)
  ),
  mr.appointment_id,
  'consultation',
  'completed',
  mr.created_at,
  mr.created_at,
  mr.created_by,
  mr.created_at
FROM medical_records mr
WHERE EXISTS (
  SELECT 1 FROM pet_registrations pr WHERE pr.pet_id = mr.pet_id AND pr.tenant_id = mr.tenant_id
) OR mr.appointment_id IS NOT NULL;

-- 2. consultation_records (datos clínicos), keyed por visit_id = medical_record.id
CREATE TABLE consultation_records (
  visit_id            UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  attended_by         UUID REFERENCES user_profiles(id),
  reason              TEXT NOT NULL,
  diagnosis           TEXT,
  treatment           TEXT,
  notes               TEXT,
  weight_kg           NUMERIC(5,2),
  temperature_celsius NUMERIC(4,1),
  follow_up_for_visit_id UUID REFERENCES service_visits(id)
);

INSERT INTO consultation_records (visit_id, attended_by, reason, diagnosis, treatment, notes, weight_kg, temperature_celsius)
SELECT id, attended_by, reason, diagnosis, treatment, notes, weight_kg, temperature_celsius
FROM medical_records
WHERE id IN (SELECT id FROM service_visits);

ALTER TABLE consultation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_consultation_records" ON consultation_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_consultation_records" ON consultation_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

CREATE INDEX consultation_records_follow_up_idx ON consultation_records(follow_up_for_visit_id);

-- 3. Repuntar hijos: renombrar medical_record_id -> visit_id (apunta al mismo id, ahora en service_visits)
ALTER TABLE prescriptions RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE attachments   RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE addendums     RENAME COLUMN medical_record_id TO visit_id;

ALTER TABLE prescriptions DROP CONSTRAINT prescriptions_medical_record_id_fkey;
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE CASCADE;
ALTER TABLE attachments DROP CONSTRAINT attachments_medical_record_id_fkey;
ALTER TABLE attachments ADD CONSTRAINT attachments_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE CASCADE;
ALTER TABLE addendums DROP CONSTRAINT addendums_medical_record_id_fkey;
ALTER TABLE addendums ADD CONSTRAINT addendums_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE CASCADE;

-- 4. Vacunaciones/desparasitaciones: medical_record_id nullable -> visit_id
ALTER TABLE pet_vaccinations RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE pet_dewormings   RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE pet_vaccinations DROP CONSTRAINT pet_vaccinations_medical_record_id_fkey;
ALTER TABLE pet_vaccinations ADD CONSTRAINT pet_vaccinations_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE SET NULL;
ALTER TABLE pet_dewormings DROP CONSTRAINT pet_dewormings_medical_record_id_fkey;
ALTER TABLE pet_dewormings ADD CONSTRAINT pet_dewormings_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE SET NULL;

-- 5. Appointments: la relación ahora vive en service_visits.appointment_id
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_medical_record_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_origin_record_id_fkey;
ALTER TABLE appointments DROP COLUMN IF EXISTS medical_record_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS origin_record_id;

-- 6. Eliminar medical_records
DROP TABLE medical_records CASCADE;
