-- 20260602000006_boarding_check_in_out.sql
-- Hotel: la reserva (cita) captura entrada (scheduled_at) y salida planeada (expected_check_out).
-- La salida planeada pasa a fecha+hora (timestamptz) tanto en la cita como en el registro.

ALTER TABLE appointments ADD COLUMN expected_check_out TIMESTAMPTZ;

ALTER TABLE boarding_records
  ALTER COLUMN expected_check_out TYPE TIMESTAMPTZ
  USING expected_check_out::timestamptz;
