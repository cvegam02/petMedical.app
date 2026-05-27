CREATE OR REPLACE FUNCTION search_pets_cross_tenant(
  p_phone      TEXT DEFAULT NULL,
  p_pet_name   TEXT DEFAULT NULL,
  p_species_id UUID DEFAULT NULL,
  p_breed_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  pet_id          UUID,
  pet_name        TEXT,
  species_name    TEXT,
  breed_name      TEXT,
  sex             pet_sex,
  date_of_birth   DATE,
  microchip       TEXT,
  owner_full_name TEXT,
  owner_phone     TEXT,
  record_count    BIGINT,
  last_visit_at   TIMESTAMPTZ,
  last_clinic     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require at least one search parameter
  IF p_phone IS NULL AND p_pet_name IS NULL AND p_species_id IS NULL AND p_breed_id IS NULL THEN
    RAISE EXCEPTION 'At least one search parameter is required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name::TEXT,
    s.name::TEXT,
    b.name::TEXT,
    p.sex,
    p.date_of_birth,
    p.microchip,
    o.full_name::TEXT,
    o.phone::TEXT,
    COUNT(mr.id),
    MAX(mr.created_at),
    (
      SELECT t.name::TEXT
      FROM tenants t
      JOIN medical_records mr2 ON mr2.tenant_id = t.id
      WHERE mr2.pet_id = p.id
      ORDER BY mr2.created_at DESC
      LIMIT 1
    )
  FROM pets p
  JOIN species s ON s.id = p.species_id
  LEFT JOIN breeds b ON b.id = p.breed_id
  LEFT JOIN pet_registrations pr ON pr.pet_id = p.id
  LEFT JOIN owners o ON o.id = pr.owner_id
  LEFT JOIN medical_records mr ON mr.pet_id = p.id
  WHERE
    (p_phone      IS NULL OR o.phone ILIKE '%' || p_phone      || '%')
    AND (p_pet_name  IS NULL OR p.name  ILIKE '%' || p_pet_name  || '%')
    AND (p_species_id IS NULL OR p.species_id = p_species_id)
    AND (p_breed_id   IS NULL OR p.breed_id   = p_breed_id)
  GROUP BY p.id, p.name, s.name, b.name, p.sex, p.date_of_birth, p.microchip, o.full_name, o.phone
  ORDER BY MAX(mr.created_at) DESC NULLS LAST;
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION search_pets_cross_tenant FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_pets_cross_tenant TO authenticated;
