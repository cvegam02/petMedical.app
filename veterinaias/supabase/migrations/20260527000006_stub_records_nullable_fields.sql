-- Allow stub owners (created during first-visit scheduling) to have no phone
ALTER TABLE owners ALTER COLUMN phone DROP NOT NULL;

-- Allow stub pets (created during first-visit scheduling) to have no species
ALTER TABLE pets ALTER COLUMN species_id DROP NOT NULL;
