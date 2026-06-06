-- 20260602000008_boarding_daily_logs_update_policy.sql
-- El upsert de bitácora (INSERT ... ON CONFLICT DO UPDATE) requiere política de UPDATE;
-- sin ella, la segunda guardada del mismo día queda bloqueada por RLS.

CREATE POLICY "tenant_update_boarding_daily_logs" ON boarding_daily_logs
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
