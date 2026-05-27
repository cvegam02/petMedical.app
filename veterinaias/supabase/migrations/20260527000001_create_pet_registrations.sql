-- Create pet_registrations junction table
-- Represents "this clinic has this pet registered to this local owner"
-- Replaces the direct pets.owner_id FK with a tenant-scoped relationship
CREATE TABLE pet_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  owner_id      UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes         TEXT,
  UNIQUE(tenant_id, pet_id)
);

CREATE INDEX idx_pet_registrations_tenant_id ON pet_registrations(tenant_id);
CREATE INDEX idx_pet_registrations_pet_id    ON pet_registrations(pet_id);
CREATE INDEX idx_pet_registrations_owner_id  ON pet_registrations(owner_id);

ALTER TABLE pet_registrations ENABLE ROW LEVEL SECURITY;
