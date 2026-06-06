-- 20260602000004_conclude_service_visit_fn_guard.sql
-- Refina conclude_service_visit: si el visit_id no existe o RLS lo bloquea (otro tenant),
-- el primer UPDATE afecta 0 filas; lanzamos excepción para que el endpoint reciba un error
-- real (en vez de un no-op silencioso seguido de un 404 confuso).

CREATE OR REPLACE FUNCTION conclude_service_visit(
  p_visit_id uuid,
  p_ended_at timestamptz,
  p_notes text,
  p_intake_notes text
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE service_visits
  SET ended_at = p_ended_at, status = 'completed'
  WHERE id = p_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_visit % not found or access denied', p_visit_id
      USING ERRCODE = 'P0002';
  END IF;

  -- grooming_records: 0 filas afectadas para visitas sin registro de estética (otros tipos) — esperado.
  UPDATE grooming_records
  SET notes        = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
      intake_notes = CASE WHEN p_intake_notes IS NOT NULL THEN p_intake_notes ELSE intake_notes END
  WHERE visit_id = p_visit_id;

  UPDATE appointments a
  SET status = 'completed'
  WHERE a.id = (SELECT appointment_id FROM service_visits WHERE id = p_visit_id)
    AND NOT EXISTS (
      SELECT 1 FROM service_visits sv2
      WHERE sv2.appointment_id = a.id
        AND sv2.id <> p_visit_id
        AND sv2.status = 'in_progress'
    );
END;
$$;
