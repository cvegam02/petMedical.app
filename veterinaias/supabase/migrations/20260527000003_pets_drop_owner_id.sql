-- Remove direct owner reference from pets table
-- Owner relationship is now via pet_registrations (tenant-specific)
ALTER TABLE pets DROP COLUMN owner_id;
