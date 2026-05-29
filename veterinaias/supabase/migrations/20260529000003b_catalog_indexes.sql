-- Performance indexes for multi-tenant catalog queries (RLS evaluates tenant_id on every query)
CREATE INDEX IF NOT EXISTS vaccine_catalog_tenant_id_idx ON vaccine_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS medication_catalog_tenant_id_idx ON medication_catalog(tenant_id);
