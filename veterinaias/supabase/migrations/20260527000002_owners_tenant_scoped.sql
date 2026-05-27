-- owners is now a tenant-scoped entity (client relationship per clinic)
-- tenant_id NOT NULL is safe because migrations run before the seed
ALTER TABLE owners
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- Replace global email uniqueness with per-tenant email uniqueness
-- (same person can be a client at two clinics with the same email)
ALTER TABLE owners DROP CONSTRAINT IF EXISTS owners_email_key;
ALTER TABLE owners ADD CONSTRAINT owners_tenant_email_unique UNIQUE (tenant_id, email);

-- Support fast cross-tenant search by phone
CREATE INDEX idx_owners_phone     ON owners(phone);
CREATE INDEX idx_owners_tenant_id ON owners(tenant_id);
