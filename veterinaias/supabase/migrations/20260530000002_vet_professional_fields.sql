-- Campos profesionales del veterinario para la impresión de recetas (NOM-064-ZOO-2000)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS professional_license TEXT,
  ADD COLUMN IF NOT EXISTS professional_address TEXT;
