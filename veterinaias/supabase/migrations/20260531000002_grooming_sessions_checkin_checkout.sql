-- Add check-in / check-out tracking to grooming sessions
ALTER TABLE grooming_sessions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at   TIMESTAMPTZ;

-- Allow staff to update only the temporal fields (started_at / ended_at)
CREATE POLICY "tenant_update_grooming_sessions" ON grooming_sessions
  FOR UPDATE USING (tenant_id = auth_tenant_id());
