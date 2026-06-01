-- 20260601000005_shared_records_fk.sql
-- El CASCADE de la migración de consultas dropeó el FK original de shared_records
-- a medical_records. Los record_id ahora son service_visits.id válidos. Re-establecer FK.
ALTER TABLE shared_records
  ADD CONSTRAINT shared_records_record_id_fkey
  FOREIGN KEY (record_id) REFERENCES service_visits(id) ON DELETE CASCADE;
