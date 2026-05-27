-- ============================================================
-- OWNERS: tenant-isolated (private client list per clinic)
-- ============================================================
DROP POLICY IF EXISTS "authenticated_read_owners"   ON owners;
DROP POLICY IF EXISTS "authenticated_insert_owners" ON owners;
DROP POLICY IF EXISTS "authenticated_update_owners" ON owners;

CREATE POLICY "owners_tenant_isolation" ON owners
  FOR ALL
  USING   (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================
-- PETS: platform entity — any authenticated vet can read/write
-- (no tenant_id on pets — the same pet is accessible everywhere)
-- ============================================================
DROP POLICY IF EXISTS "authenticated_read_pets"   ON pets;
DROP POLICY IF EXISTS "authenticated_insert_pets" ON pets;
DROP POLICY IF EXISTS "authenticated_update_pets" ON pets;

CREATE POLICY "pets_select_authenticated" ON pets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pets_insert_authenticated" ON pets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "pets_update_authenticated" ON pets
  FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- PET_REGISTRATIONS: tenant-isolated patient list
-- (RLS was enabled in migration 20260527000001)
-- ============================================================
CREATE POLICY "pet_registrations_tenant_isolation" ON pet_registrations
  FOR ALL
  USING   (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================
-- MEDICAL_RECORDS: cross-tenant READ, own-tenant INSERT
-- ============================================================
DROP POLICY IF EXISTS "authenticated_read_records"   ON medical_records;
DROP POLICY IF EXISTS "authenticated_insert_records" ON medical_records;

-- Any vet can read any pet's full history
CREATE POLICY "medical_records_select_authenticated" ON medical_records
  FOR SELECT TO authenticated USING (true);

-- Only own-tenant records can be created
CREATE POLICY "medical_records_insert_own_tenant" ON medical_records
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
