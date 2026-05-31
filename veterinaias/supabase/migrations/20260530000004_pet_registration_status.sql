-- Estado de la mascota por clínica (tenant-scoped).
-- Las mascotas son identidad compartida entre clínicas, pero el estado
-- (activa / inactiva / fallecida) es propio de cada tenant: marcarla en una
-- clínica NO afecta cómo la ven las demás. Por eso vive en pet_registrations,
-- no en pets.

alter table pet_registrations
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'deceased')),
  add column if not exists status_changed_at timestamptz,
  add column if not exists date_of_death date;

comment on column pet_registrations.status is 'Estado de la mascota en esta clínica: active, inactive o deceased. Tenant-scoped, no afecta a otras clínicas.';
comment on column pet_registrations.date_of_death is 'Fecha de fallecimiento, capturada al marcar la mascota como deceased.';
