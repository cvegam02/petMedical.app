-- Veterinario que atiende la consulta.
-- Una misma sesión/computadora puede ser usada por varios veterinarios: el
-- usuario logueado (created_by) puede ser Ana, pero quien atendió y firma la
-- receta puede ser Marcos. attended_by guarda al veterinario real; created_by
-- se conserva como traza de auditoría de quién capturó el registro.

alter table medical_records
  add column if not exists attended_by uuid references user_profiles(id);

-- Backfill: registros existentes => el veterinario que atendió es quien lo creó.
update medical_records set attended_by = created_by where attended_by is null;

comment on column medical_records.attended_by is 'Veterinario que realmente atendió la consulta. Puede diferir de created_by (usuario logueado que capturó el registro). Tenant-scoped vía la fila.';
