-- 20260602000003_conclude_service_visit_fn.sql
-- Cierre atómico de un servicio: marca el service_visit como completed, guarda notas,
-- y cierra la cita ligada (si no queda otro servicio en curso) en una sola transacción.
-- SECURITY INVOKER => respeta RLS del usuario que llama (tenant scoping).

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
