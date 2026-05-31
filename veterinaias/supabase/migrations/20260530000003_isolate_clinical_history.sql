-- Aislamiento total del historial clínico por tenant.
-- Cada clínica ve únicamente los registros que ella creó. El intercambio de
-- información entre clínicas se hace explícitamente (PDF / WhatsApp), no por
-- lectura cruzada en la base de datos.

-- medical_records: SELECT solo del propio tenant (antes: USING (true))
DROP POLICY IF EXISTS "medical_records_select_authenticated" ON medical_records;
CREATE POLICY "medical_records_select_own_tenant" ON medical_records
  FOR SELECT TO authenticated USING (tenant_id = auth_tenant_id());

-- prescriptions: SELECT vía el expediente padre del propio tenant
DROP POLICY IF EXISTS "authenticated_read_prescriptions" ON prescriptions;
CREATE POLICY "prescriptions_select_own_tenant" ON prescriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      WHERE mr.id = medical_record_id AND mr.tenant_id = auth_tenant_id()
    )
  );

-- attachments
DROP POLICY IF EXISTS "authenticated_read_attachments" ON attachments;
CREATE POLICY "attachments_select_own_tenant" ON attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      WHERE mr.id = medical_record_id AND mr.tenant_id = auth_tenant_id()
    )
  );

-- addendums
DROP POLICY IF EXISTS "authenticated_read_addendums" ON addendums;
CREATE POLICY "addendums_select_own_tenant" ON addendums
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      WHERE mr.id = medical_record_id AND mr.tenant_id = auth_tenant_id()
    )
  );

-- pet_vaccinations: SELECT solo del propio tenant
DROP POLICY IF EXISTS "authenticated_read_pet_vaccinations" ON pet_vaccinations;
CREATE POLICY "pet_vaccinations_select_own_tenant" ON pet_vaccinations
  FOR SELECT USING (tenant_id = auth_tenant_id());

-- pet_dewormings: SELECT solo del propio tenant
DROP POLICY IF EXISTS "authenticated_read_pet_dewormings" ON pet_dewormings;
CREATE POLICY "pet_dewormings_select_own_tenant" ON pet_dewormings
  FOR SELECT USING (tenant_id = auth_tenant_id());
