-- 20260601000004_appointments_service_type.sql
ALTER TABLE appointments ADD COLUMN service_type service_type NOT NULL DEFAULT 'consultation';
UPDATE appointments SET service_type = appointment_type::service_type WHERE appointment_type IS NOT NULL;
ALTER TABLE appointments DROP COLUMN appointment_type;
