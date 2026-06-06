-- 20260602000002_grooming_intake_notes.sql
-- Split grooming notes into two distinct concepts:
--   intake_notes -> condiciones de recepción, capturadas al iniciar el servicio
--   notes        -> observaciones finales, capturadas al concluir el servicio

ALTER TABLE grooming_records ADD COLUMN intake_notes TEXT;

-- Backfill: notes recorded on still-in-progress sessions could only have been
-- entered at intake (the conclude step had not run yet), so move them.
UPDATE grooming_records gr
SET intake_notes = gr.notes,
    notes = NULL
FROM service_visits sv
WHERE gr.visit_id = sv.id
  AND sv.ended_at IS NULL
  AND gr.notes IS NOT NULL
  AND btrim(gr.notes) <> '';
