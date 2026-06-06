-- 20260603000002_prescriptions_rls.sql
-- `prescriptions` tenía RLS habilitado pero sin políticas vigentes tras renombrar
-- medical_record_id -> visit_id (las viejas referían columnas/tablas eliminadas y se
-- quedaron sin reemplazo), por lo que toda lectura/escritura del rol autenticado quedaba
-- denegada. Se recrean las políticas tenant-scoped vía service_visits.

DROP POLICY IF EXISTS "same_tenant_insert_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_select_own_tenant" ON prescriptions;
DROP POLICY IF EXISTS "authenticated_read_prescriptions" ON prescriptions;

CREATE POLICY "tenant_read_prescriptions" ON prescriptions
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_prescriptions" ON prescriptions
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_prescriptions" ON prescriptions
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_delete_prescriptions" ON prescriptions
  FOR DELETE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
