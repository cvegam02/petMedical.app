-- Registros de carnet (vacunas históricas) no tienen un aplicador conocido del sistema.
-- applied_by se deja NULL para esos casos y la UI muestra "Desconocido".
ALTER TABLE pet_vaccinations ALTER COLUMN applied_by DROP NOT NULL;
