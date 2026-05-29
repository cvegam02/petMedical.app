-- Replace breed_id FK with free-text breed field
ALTER TABLE pets ADD COLUMN breed text;
ALTER TABLE pets DROP COLUMN breed_id;
DROP INDEX IF EXISTS idx_pets_breed_id;

-- Update search_pets_cross_tenant to accept text breed filter
DROP FUNCTION IF EXISTS search_pets_cross_tenant(uuid, text, uuid, uuid);

CREATE OR REPLACE FUNCTION search_pets_cross_tenant(
  p_tenant_id  UUID,
  p_phone      TEXT    DEFAULT NULL,
  p_pet_name   TEXT    DEFAULT NULL,
  p_species_id UUID    DEFAULT NULL,
  p_breed      TEXT    DEFAULT NULL
)
RETURNS TABLE (
  pet_id          UUID,
  pet_name        TEXT,
  breed_name      TEXT,
  species_name    TEXT,
  owner_id        UUID,
  owner_name      TEXT,
  owner_phone     TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_phone IS NULL AND p_pet_name IS NULL AND p_species_id IS NULL AND p_breed IS NULL THEN
    RAISE EXCEPTION 'At least one search param required';
  END IF;

  RETURN QUERY
  SELECT
    p.id                AS pet_id,
    p.name              AS pet_name,
    p.breed             AS breed_name,
    s.name              AS species_name,
    o.id                AS owner_id,
    o.full_name         AS owner_name,
    o.phone             AS owner_phone
  FROM pet_registrations pr
  JOIN pets       p  ON p.id  = pr.pet_id
  JOIN owners     o  ON o.id  = pr.owner_id
  LEFT JOIN species s ON s.id = p.species_id
  WHERE pr.tenant_id = p_tenant_id
    AND (p_phone      IS NULL OR o.phone      ILIKE '%' || p_phone      || '%')
    AND (p_pet_name   IS NULL OR p.name       ILIKE '%' || p_pet_name   || '%')
    AND (p_species_id IS NULL OR p.species_id = p_species_id)
    AND (p_breed      IS NULL OR p.breed      ILIKE '%' || p_breed      || '%');
END;
$$;
