-- Activar RLS en todas las tablas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE addendums ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER para acceder a auth.uid() sin recursion)
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_super_admin, FALSE) FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- TENANTS
CREATE POLICY "super_admin_all_tenants" ON tenants
  FOR ALL USING (is_super_admin());

CREATE POLICY "users_read_own_tenant" ON tenants
  FOR SELECT USING (id = auth_tenant_id());

CREATE POLICY "admins_update_own_tenant" ON tenants
  FOR UPDATE USING (id = auth_tenant_id() AND auth_role() = 'admin');

-- USER_PROFILES
CREATE POLICY "super_admin_all_profiles" ON user_profiles
  FOR ALL USING (is_super_admin());

CREATE POLICY "users_read_same_tenant_profiles" ON user_profiles
  FOR SELECT USING (tenant_id = auth_tenant_id() OR id = auth.uid());

CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "system_insert_profile" ON user_profiles
  FOR INSERT WITH CHECK (TRUE);

-- INVITATIONS
CREATE POLICY "admins_manage_invitations" ON invitations
  FOR ALL USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

CREATE POLICY "anyone_read_invitation_by_token" ON invitations
  FOR SELECT USING (TRUE);

-- OWNERS (nivel plataforma — cualquier vet autenticado puede leer/crear)
CREATE POLICY "authenticated_read_owners" ON owners
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_owners" ON owners
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_update_owners" ON owners
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- PETS (nivel plataforma)
CREATE POLICY "authenticated_read_pets" ON pets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_pets" ON pets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_update_pets" ON pets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- MEDICAL_RECORDS (nivel plataforma, inmutables — sin UPDATE policy)
CREATE POLICY "authenticated_read_records" ON medical_records
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_records" ON medical_records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PRESCRIPTIONS (inmutables con su medical_record)
CREATE POLICY "authenticated_read_prescriptions" ON prescriptions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "same_tenant_insert_prescriptions" ON prescriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_records mr
      WHERE mr.id = medical_record_id AND mr.tenant_id = auth_tenant_id()
    )
  );

-- ATTACHMENTS
CREATE POLICY "authenticated_read_attachments" ON attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_attachments" ON attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ADDENDUMS
CREATE POLICY "authenticated_read_addendums" ON addendums
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_addendums" ON addendums
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- APPOINTMENTS (nivel tenant)
CREATE POLICY "super_admin_all_appointments" ON appointments
  FOR ALL USING (is_super_admin());

CREATE POLICY "tenant_read_appointments" ON appointments
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_manage_appointments" ON appointments
  FOR ALL USING (tenant_id = auth_tenant_id());

-- SHARE_TOKENS
CREATE POLICY "authenticated_read_share_tokens" ON share_tokens
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_share_tokens" ON share_tokens
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "creator_delete_share_tokens" ON share_tokens
  FOR DELETE USING (created_by = auth.uid());
