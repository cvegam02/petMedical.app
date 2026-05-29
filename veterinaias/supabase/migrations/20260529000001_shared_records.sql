CREATE TABLE shared_records (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token      UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  record_id  UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE shared_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_insert_shared_records" ON shared_records
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "members_select_shared_records" ON shared_records
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );
