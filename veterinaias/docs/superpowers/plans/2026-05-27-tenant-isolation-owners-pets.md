# Tenant Isolation: Owners & Pets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `owners` to tenant-scoped and introduce a `pet_registrations` junction table so each clinic has a private client and patient list, while `pets` (platform) and `medical_records` stay cross-tenant accessible.

**Architecture:** `pets` remain platform entities (no `tenant_id`) — one animal ID per animal, all medical history consolidated. `owners` gain `tenant_id` — client relationships are private per clinic. New `pet_registrations(tenant_id, pet_id, owner_id)` table replaces the direct `pets.owner_id` FK. Cross-clinic search is exposed only via a `SECURITY DEFINER` Postgres function that returns name+phone only.

**Tech Stack:** Supabase PostgreSQL, Row Level Security, `auth_tenant_id()` helper, Next.js 14 App Router API routes, Zod, Vitest + testing-library

---

## File Map

**New files:**
- `veterinaias/supabase/migrations/20260527000001_create_pet_registrations.sql`
- `veterinaias/supabase/migrations/20260527000002_owners_tenant_scoped.sql`
- `veterinaias/supabase/migrations/20260527000003_pets_drop_owner_id.sql`
- `veterinaias/supabase/migrations/20260527000004_rls_policies_v2.sql`
- `veterinaias/supabase/migrations/20260527000005_search_pets_cross_tenant.sql`
- `veterinaias/app/api/pets/search-cross-tenant/route.ts`
- `veterinaias/app/api/pet-registrations/route.ts`
- `veterinaias/__tests__/api/pet-registrations.test.ts`

**Modified files:**
- `veterinaias/supabase/seeds/seed_dev.sql`
- `veterinaias/lib/types/database.ts`
- `veterinaias/lib/validations/pet.ts`
- `veterinaias/app/api/pets/route.ts`
- `veterinaias/app/api/pets/[id]/route.ts`
- `veterinaias/app/api/owners/route.ts`
- `veterinaias/app/api/owners/[id]/route.ts`
- `veterinaias/__tests__/api/pets.test.ts`
- `veterinaias/__tests__/api/owners.test.ts`
- `veterinaias/app/dashboard/owners/[ownerId]/page.tsx`
- `veterinaias/app/dashboard/pets/[petId]/page.tsx`

---

## Task 1: Migration — Create pet_registrations table

**Files:**
- Create: `veterinaias/supabase/migrations/20260527000001_create_pet_registrations.sql`

- [ ] **Step 1: Write migration file**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/supabase/migrations/20260527000001_create_pet_registrations.sql
git commit -m "feat: add pet_registrations migration — tenant-scoped pet list"
```

---

## Task 2: Migration — Make owners tenant-scoped

**Files:**
- Create: `veterinaias/supabase/migrations/20260527000002_owners_tenant_scoped.sql`

This migration runs against an empty database (seed hasn't run yet at migration time), so we can add `NOT NULL` directly without a data-backfill step.

- [ ] **Step 1: Write migration file**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/supabase/migrations/20260527000002_owners_tenant_scoped.sql
git commit -m "feat: add tenant_id to owners, replace email unique constraint"
```

---

## Task 3: Migration — Drop pets.owner_id

**Files:**
- Create: `veterinaias/supabase/migrations/20260527000003_pets_drop_owner_id.sql`

The `owner_id` column is replaced by `pet_registrations`. This is safe to run against an empty table.

- [ ] **Step 1: Write migration file**

```sql
-- Remove direct owner reference from pets table
-- Owner relationship is now via pet_registrations (tenant-specific)
ALTER TABLE pets DROP COLUMN owner_id;
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/supabase/migrations/20260527000003_pets_drop_owner_id.sql
git commit -m "feat: drop pets.owner_id — relationship moved to pet_registrations"
```

---

## Task 4: Migration — Update RLS policies

**Files:**
- Create: `veterinaias/supabase/migrations/20260527000004_rls_policies_v2.sql`

Replaces the permissive "any authenticated user" policies on `owners` and `pets` with tenant-isolated ones. Tightens `medical_records` INSERT to enforce `tenant_id`. Adds RLS for `pet_registrations`.

Note: uses `auth_tenant_id()` helper (already defined in `20260525000001_rls_policies.sql`).

- [ ] **Step 1: Write migration file**

```sql
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
-- ============================================================
ALTER TABLE pet_registrations ENABLE ROW LEVEL SECURITY;

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
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/supabase/migrations/20260527000004_rls_policies_v2.sql
git commit -m "feat: rls v2 — tenant isolation for owners/pet_registrations, cross-tenant read for pets/records"
```

---

## Task 5: Migration — Create search_pets_cross_tenant function

**Files:**
- Create: `veterinaias/supabase/migrations/20260527000005_search_pets_cross_tenant.sql`

`SECURITY DEFINER` bypasses RLS so the function can join across all tenants' owners, but it returns only the minimal data needed for identity verification (name + phone of last-known owner, summary stats). No email, no address, no tenant IDs of client.

- [ ] **Step 1: Write migration file**

```sql
CREATE OR REPLACE FUNCTION search_pets_cross_tenant(
  p_phone      TEXT DEFAULT NULL,
  p_pet_name   TEXT DEFAULT NULL,
  p_species_id UUID DEFAULT NULL,
  p_breed_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  pet_id          UUID,
  pet_name        TEXT,
  species_name    TEXT,
  breed_name      TEXT,
  sex             pet_sex,
  date_of_birth   DATE,
  microchip       TEXT,
  owner_full_name TEXT,
  owner_phone     TEXT,
  record_count    BIGINT,
  last_visit_at   TIMESTAMPTZ,
  last_clinic     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require at least one search parameter
  IF p_phone IS NULL AND p_pet_name IS NULL AND p_species_id IS NULL AND p_breed_id IS NULL THEN
    RAISE EXCEPTION 'At least one search parameter is required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name::TEXT,
    s.name::TEXT,
    b.name::TEXT,
    p.sex,
    p.date_of_birth,
    p.microchip,
    o.full_name::TEXT,
    o.phone::TEXT,
    COUNT(mr.id),
    MAX(mr.created_at),
    (
      SELECT t.name::TEXT
      FROM tenants t
      JOIN medical_records mr2 ON mr2.tenant_id = t.id
      WHERE mr2.pet_id = p.id
      ORDER BY mr2.created_at DESC
      LIMIT 1
    )
  FROM pets p
  JOIN species s ON s.id = p.species_id
  LEFT JOIN breeds b ON b.id = p.breed_id
  LEFT JOIN pet_registrations pr ON pr.pet_id = p.id
  LEFT JOIN owners o ON o.id = pr.owner_id
  LEFT JOIN medical_records mr ON mr.pet_id = p.id
  WHERE
    (p_phone      IS NULL OR o.phone ILIKE '%' || p_phone      || '%')
    AND (p_pet_name  IS NULL OR p.name  ILIKE '%' || p_pet_name  || '%')
    AND (p_species_id IS NULL OR p.species_id = p_species_id)
    AND (p_breed_id   IS NULL OR p.breed_id   = p_breed_id)
  GROUP BY p.id, p.name, s.name, b.name, p.sex, p.date_of_birth, p.microchip, o.full_name, o.phone
  ORDER BY MAX(mr.created_at) DESC NULLS LAST;
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION search_pets_cross_tenant FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_pets_cross_tenant TO authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/supabase/migrations/20260527000005_search_pets_cross_tenant.sql
git commit -m "feat: add search_pets_cross_tenant SECURITY DEFINER function"
```

---

## Task 6: Update seed data

**Files:**
- Modify: `veterinaias/supabase/seeds/seed_dev.sql`

Changes needed:
1. Add UUID comment for pet_registrations (prefix `g7g7g7g7-0008-...`)
2. Cleanup section: add `DELETE FROM pet_registrations` BEFORE `DELETE FROM pets`
3. Owners section: add `tenant_id` to each row (001–003 → San Mateo, 004–006 → Hospital Paws)
4. Pets section: remove `owner_id` from every INSERT
5. New section: INSERT pet_registrations (10 rows)
6. Appointments: fix appointment 010 — change `owner_id` from `003` to `004` (Lucía Morales, Hospital Paws)

- [ ] **Step 1: Update UUID comment block** (top of file, after line 14)

Replace:
```sql
--   Dueños:      c3c3c3c3-0003-4000-a000-0000000000XX
--   Mascotas:    d4d4d4d4-0004-4000-a000-0000000000XX
```
With:
```sql
--   Dueños:      c3c3c3c3-0003-4000-a000-0000000000XX
--   Mascotas:    d4d4d4d4-0004-4000-a000-0000000000XX
--   Registros:   g7g7g7g7-0008-4000-a000-0000000000XX
```

- [ ] **Step 2: Add pet_registrations cleanup** before the `DELETE FROM pets` block

Add this DELETE block immediately before `DELETE FROM medical_records`:
```sql
DELETE FROM pet_registrations WHERE id IN (
  'g7g7g7g7-0008-4000-a000-000000000001',
  'g7g7g7g7-0008-4000-a000-000000000002',
  'g7g7g7g7-0008-4000-a000-000000000003',
  'g7g7g7g7-0008-4000-a000-000000000004',
  'g7g7g7g7-0008-4000-a000-000000000005',
  'g7g7g7g7-0008-4000-a000-000000000006',
  'g7g7g7g7-0008-4000-a000-000000000007',
  'g7g7g7g7-0008-4000-a000-000000000008',
  'g7g7g7g7-0008-4000-a000-000000000009',
  'g7g7g7g7-0008-4000-a000-000000000010'
);
```

- [ ] **Step 3: Update owners INSERT — add tenant_id**

Replace the owners INSERT block with:
```sql
-- ============================================================
-- DUEÑOS (tenant-scoped: clientes privados por clínica)
-- 001-003 → Clínica San Mateo | 004-006 → Hospital Paws
-- ============================================================
INSERT INTO owners (id, full_name, email, phone, address, tenant_id) VALUES
  ('c3c3c3c3-0003-4000-a000-000000000001', 'Carlos Ramírez',  'carlos.ramirez@example.com',  '555-0101', 'Av. Insurgentes Sur 123, CDMX',   'a1a1a1a1-0001-4000-a000-000000000001'),
  ('c3c3c3c3-0003-4000-a000-000000000002', 'María González',  'maria.gonzalez@example.com',  '555-0202', 'Calle Madero 456, Guadalajara',   'a1a1a1a1-0001-4000-a000-000000000001'),
  ('c3c3c3c3-0003-4000-a000-000000000003', 'Roberto Jiménez', 'roberto.jimenez@example.com', '555-0303', 'Blvd. Kukulcán 789, Cancún',      'a1a1a1a1-0001-4000-a000-000000000001'),
  ('c3c3c3c3-0003-4000-a000-000000000004', 'Lucía Morales',   'lucia.morales@example.com',   '555-0404', 'Av. Juárez 321, Monterrey',       'a1a1a1a1-0001-4000-a000-000000000002'),
  ('c3c3c3c3-0003-4000-a000-000000000005', 'Fernando Ruiz',   'fernando.ruiz@example.com',   '555-0505', 'Calle Hidalgo 654, Puebla',       'a1a1a1a1-0001-4000-a000-000000000002'),
  ('c3c3c3c3-0003-4000-a000-000000000006', 'Patricia Vega',   'patricia.vega@example.com',   '555-0606', 'Av. Reforma 987, CDMX',           'a1a1a1a1-0001-4000-a000-000000000002');
```

- [ ] **Step 4: Update pets INSERT — remove owner_id**

Replace the pets INSERT block with (remove `owner_id` column and values, keep all other columns):
```sql
-- ============================================================
-- MASCOTAS (plataforma — sin tenant_id ni owner_id)
-- Relación con dueño es via pet_registrations (tenant-específica)
-- ============================================================
INSERT INTO pets (id, name, species_id, breed_id, sex, date_of_birth, color) VALUES
  (
    'd4d4d4d4-0004-4000-a000-000000000001', 'Max',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Labrador Retriever' LIMIT 1),
    'male', '2020-03-15', 'Dorado'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000002', 'Luna',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Golden Retriever' LIMIT 1),
    'female', '2021-07-20', 'Dorado claro'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000003', 'Misifú',
    (SELECT id FROM species WHERE name = 'Gato'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Gato' AND b.name = 'Persa' LIMIT 1),
    'male', '2019-11-05', 'Blanco'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000009', 'Buddy',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Beagle' LIMIT 1),
    'male', '2022-01-10', 'Tricolor'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000004', 'Tobías',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Mestizo' LIMIT 1),
    'male', '2018-06-30', 'Café y blanco'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000010', 'Lola',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Chihuahua' LIMIT 1),
    'female', '2023-04-18', 'Negro'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000005', 'Nala',
    (SELECT id FROM species WHERE name = 'Gato'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Gato' AND b.name = 'Siamés' LIMIT 1),
    'female', '2020-09-12', 'Crema y chocolate'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000006', 'Copito',
    (SELECT id FROM species WHERE name = 'Conejo'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Conejo' AND b.name = 'Holland Lop' LIMIT 1),
    'male', '2022-12-01', 'Blanco'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000007', 'Rocky',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Pastor Alemán' LIMIT 1),
    'male', '2019-02-28', 'Negro y café'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000008', 'Canela',
    (SELECT id FROM species WHERE name = 'Gato'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Gato' AND b.name = 'Maine Coon' LIMIT 1),
    'female', '2021-05-22', 'Anaranjado'
  );
```

- [ ] **Step 5: Add pet_registrations INSERT section** (after pets INSERT, before medical_records INSERT)

```sql
-- ============================================================
-- REGISTROS DE MASCOTAS POR CLÍNICA
-- Reemplaza la relación directa pets.owner_id
-- San Mateo: registros 001-005 | Hospital Paws: registros 006-010
-- ============================================================
INSERT INTO pet_registrations (id, tenant_id, pet_id, owner_id) VALUES
  -- Clínica San Mateo
  ('g7g7g7g7-0008-4000-a000-000000000001', 'a1a1a1a1-0001-4000-a000-000000000001', 'd4d4d4d4-0004-4000-a000-000000000001', 'c3c3c3c3-0003-4000-a000-000000000001'), -- Max / Carlos Ramírez
  ('g7g7g7g7-0008-4000-a000-000000000002', 'a1a1a1a1-0001-4000-a000-000000000001', 'd4d4d4d4-0004-4000-a000-000000000002', 'c3c3c3c3-0003-4000-a000-000000000001'), -- Luna / Carlos Ramírez
  ('g7g7g7g7-0008-4000-a000-000000000003', 'a1a1a1a1-0001-4000-a000-000000000001', 'd4d4d4d4-0004-4000-a000-000000000003', 'c3c3c3c3-0003-4000-a000-000000000002'), -- Misifú / María González
  ('g7g7g7g7-0008-4000-a000-000000000004', 'a1a1a1a1-0001-4000-a000-000000000001', 'd4d4d4d4-0004-4000-a000-000000000004', 'c3c3c3c3-0003-4000-a000-000000000003'), -- Tobías / Roberto Jiménez
  ('g7g7g7g7-0008-4000-a000-000000000005', 'a1a1a1a1-0001-4000-a000-000000000001', 'd4d4d4d4-0004-4000-a000-000000000009', 'c3c3c3c3-0003-4000-a000-000000000002'), -- Buddy / María González
  -- Hospital Veterinario Paws
  ('g7g7g7g7-0008-4000-a000-000000000006', 'a1a1a1a1-0001-4000-a000-000000000002', 'd4d4d4d4-0004-4000-a000-000000000005', 'c3c3c3c3-0003-4000-a000-000000000004'), -- Nala / Lucía Morales
  ('g7g7g7g7-0008-4000-a000-000000000007', 'a1a1a1a1-0001-4000-a000-000000000002', 'd4d4d4d4-0004-4000-a000-000000000006', 'c3c3c3c3-0003-4000-a000-000000000004'), -- Copito / Lucía Morales
  ('g7g7g7g7-0008-4000-a000-000000000008', 'a1a1a1a1-0001-4000-a000-000000000002', 'd4d4d4d4-0004-4000-a000-000000000007', 'c3c3c3c3-0003-4000-a000-000000000005'), -- Rocky / Fernando Ruiz
  ('g7g7g7g7-0008-4000-a000-000000000009', 'a1a1a1a1-0001-4000-a000-000000000002', 'd4d4d4d4-0004-4000-a000-000000000008', 'c3c3c3c3-0003-4000-a000-000000000006'), -- Canela / Patricia Vega
  ('g7g7g7g7-0008-4000-a000-000000000010', 'a1a1a1a1-0001-4000-a000-000000000002', 'd4d4d4d4-0004-4000-a000-000000000010', 'c3c3c3c3-0003-4000-a000-000000000004'); -- Lola / Lucía Morales (cross-clinic demo)
```

- [ ] **Step 6: Fix appointment 010 — Lola must belong to a Hospital Paws owner**

In the appointments INSERT, change appointment `000000000010`:
```sql
-- BEFORE:
'c3c3c3c3-0003-4000-a000-000000000003', -- Roberto Jiménez  ← San Mateo owner, wrong tenant

-- AFTER:
'c3c3c3c3-0003-4000-a000-000000000004', -- Lucía Morales    ← Hospital Paws owner, correct
```

- [ ] **Step 7: Commit**

```bash
git add veterinaias/supabase/seeds/seed_dev.sql
git commit -m "chore: update seed — tenant_id on owners, pet_registrations data, fix appt-010 owner"
```

---

## Task 7: Apply migrations and verify

- [ ] **Step 1: Run supabase db reset**

From the `veterinaias/` directory:
```bash
cd veterinaias && npx supabase db reset
```

Expected output: `Finished supabase db reset.` with no errors.

- [ ] **Step 2: Verify schema**

```bash
npx supabase db diff --linked 2>/dev/null || npx supabase status
```

Run a quick verification query to confirm the structure:
```bash
npx supabase db execute --local "
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name IN ('owners', 'pets', 'pet_registrations')
  ORDER BY table_name, ordinal_position;
"
```

Expected:
- `owners` has `tenant_id uuid NOT NULL`
- `owners` does NOT have `email` in a unique constraint (replaced by `owners_tenant_email_unique`)
- `pets` does NOT have `owner_id`
- `pet_registrations` exists with `tenant_id`, `pet_id`, `owner_id`, `UNIQUE(tenant_id, pet_id)`

- [ ] **Step 3: Verify seed data loaded correctly**

```bash
npx supabase db execute --local "SELECT COUNT(*) FROM pet_registrations;"
```

Expected: `10`

```bash
npx supabase db execute --local "SELECT COUNT(*) FROM owners WHERE tenant_id IS NOT NULL;"
```

Expected: `6`

- [ ] **Step 4: Commit (no new files — just verify)**

No commit needed here. The verification step is a checkpoint only.

---

## Task 8: Update TypeScript types

**Files:**
- Modify: `veterinaias/lib/types/database.ts`

- [ ] **Step 1: Update Owner interface — add tenant_id, remove implicit global uniqueness note**

In `database.ts`, change the `Owner` interface from:
```typescript
export interface Owner {
  id: string
  full_name: string
  email: string | null
  phone: string
  address: string | null
  created_at: string
  updated_at: string
}
```
To:
```typescript
export interface Owner {
  id: string
  tenant_id: string
  full_name: string
  email: string | null
  phone: string
  address: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Update Pet interface — remove owner_id**

Change the `Pet` interface from:
```typescript
export interface Pet {
  id: string
  owner_id: string
  name: string
  species_id: string
  breed_id: string | null
  sex: PetSex
  date_of_birth: string | null
  color: string | null
  microchip: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
```
To:
```typescript
export interface Pet {
  id: string
  name: string
  species_id: string
  breed_id: string | null
  sex: PetSex
  date_of_birth: string | null
  color: string | null
  microchip: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Add PetRegistration interface** — add after the `Pet` interface:

```typescript
export interface PetRegistration {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  registered_at: string
  notes: string | null
}
```

- [ ] **Step 4: Add CrossTenantPetResult interface** — add after `PetRegistration`:

```typescript
export interface CrossTenantPetResult {
  pet_id: string
  pet_name: string
  species_name: string
  breed_name: string | null
  sex: PetSex
  date_of_birth: string | null
  microchip: string | null
  owner_full_name: string | null
  owner_phone: string | null
  record_count: number
  last_visit_at: string | null
  last_clinic: string | null
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 6: Commit**

```bash
git add veterinaias/lib/types/database.ts
git commit -m "feat: update TypeScript types — Owner.tenant_id, remove Pet.owner_id, add PetRegistration"
```

---

## Task 9: Update validations

**Files:**
- Modify: `veterinaias/lib/validations/pet.ts`

The `owner_id` in `petSchema` is still needed — it tells the POST handler which owner to link in `pet_registrations`. No change needed to the schema shape, but the validation file should be confirmed correct.

- [ ] **Step 1: Verify pet.ts still has owner_id in schema**

Open `veterinaias/lib/validations/pet.ts`. Confirm `owner_id: z.string().uuid('Dueño es requerido')` is present. This field is consumed by the POST handler to create the `pet_registrations` row.

No changes needed to `pet.ts` or `owner.ts` — their Zod schemas remain correct.

- [ ] **Step 2: Confirm build passes**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0 errors"
```

Expected: `0 errors`

---

## Task 10: Update POST /api/pets — two-step insert

**Files:**
- Modify: `veterinaias/app/api/pets/route.ts`
- Modify: `veterinaias/__tests__/api/pets.test.ts`

The POST handler now inserts into `pets` (no `owner_id`) then into `pet_registrations`. The GET handler queries via `pet_registrations` instead of `pets` directly.

- [ ] **Step 1: Write failing test for new POST flow**

In `veterinaias/__tests__/api/pets.test.ts`, replace the entire file with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/pets/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validPetBody = {
  name: 'Max',
  owner_id: 'ab7a5c57-ae17-4e49-ba5a-fdd90d2e0dc3',
  species_id: 'cf63956c-d04c-459e-940d-688d58347a7e',
  sex: 'male',
}

const mockProfile = { tenant_id: 'tenant-1' }
const mockPet = { id: 'pet-1', name: 'Max', sex: 'male' }

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    ...overrides,
  }
}

describe('POST /api/pets', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no tenant', async () => {
    let callIndex = 0
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callIndex++
          return Promise.resolve({ data: { tenant_id: null }, error: null })
        }),
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 422 when name is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ owner_id: validPetBody.owner_id, species_id: validPetBody.species_id, sex: 'male' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when pet and registration are created', async () => {
    let callCount = 0
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'pets') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPet, error: null }),
          }
        }
        // pet_registrations
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('Max')
  })

  it('returns 400 when body is not valid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'text/plain' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when microchip already exists', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ ...validPetBody, microchip: 'CHIP-001' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('GET /api/pets', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pets')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns pets list from pet_registrations', async () => {
    const mockRegs = [
      { pet: { id: 'pet-1', name: 'Max', sex: 'male', date_of_birth: null }, owner: { id: 'owner-1', full_name: 'Carlos' } },
    ]
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockRegs, error: null }),
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pets')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Max')
    expect(body.data[0].owner.full_name).toBe('Carlos')
  })
})
```

- [ ] **Step 2: Run test — expect failures**

```bash
cd veterinaias && npx vitest run __tests__/api/pets.test.ts 2>&1 | tail -20
```

Expected: multiple FAIL (GET doesn't exist yet, POST mock structure mismatch)

- [ ] **Step 3: Update POST and GET in app/api/pets/route.ts**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { petSchema } from '@/lib/validations/pet'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ownerId = req.nextUrl.searchParams.get('ownerId')
  const q = req.nextUrl.searchParams.get('q')

  if (ownerId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ownerId)) {
      return NextResponse.json({ error: 'ownerId inválido' }, { status: 400 })
    }
  }

  let query = (supabase.from('pet_registrations') as any)
    .select(`
      owner:owner_id(id, full_name, phone),
      pet:pet_id(id, name, sex, date_of_birth, species:species_id(id, name), breed:breed_id(id, name))
    `)
    .limit(100)

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let pets = (data ?? []).map((reg: any) => ({ ...reg.pet, owner: reg.owner }))

  if (q?.trim()) {
    const lower = q.toLowerCase()
    pets = pets.filter((p: any) => p.name?.toLowerCase().includes(lower))
  }

  return NextResponse.json({ data: pets })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = petSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 })

  const { owner_id, date_of_birth, breed_id, ...petData } = result.data

  const { data: pet, error: petError } = await supabase
    .from('pets')
    .insert({ ...petData, date_of_birth: date_of_birth || null, breed_id: breed_id || null })
    .select()
    .single()

  if (petError?.code === '23505') return NextResponse.json({ error: 'Ya existe una mascota con ese microchip' }, { status: 409 })
  if (petError) return NextResponse.json({ error: petError.message }, { status: 500 })

  const { error: regError } = await supabase
    .from('pet_registrations')
    .insert({ tenant_id: profile.tenant_id, pet_id: pet.id, owner_id })

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 })

  return NextResponse.json({ data: pet }, { status: 201 })
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd veterinaias && npx vitest run __tests__/api/pets.test.ts 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add veterinaias/app/api/pets/route.ts veterinaias/__tests__/api/pets.test.ts
git commit -m "feat: pets API — two-step insert (pets + pet_registrations), GET via pet_registrations"
```

---

## Task 11: Update GET /api/pets/[id] — two-query merge

**Files:**
- Modify: `veterinaias/app/api/pets/[id]/route.ts`

The pet detail now requires two separate queries: one for the pet + medical records (platform-wide, via `pets`), one for the owner at the current tenant (via `pet_registrations`). The results are merged into a single response.

- [ ] **Step 1: Update app/api/pets/[id]/route.ts — GET handler only**

Replace only the GET function (keep PATCH unchanged):

```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [petResult, regResult] = await Promise.all([
    supabase
      .from('pets')
      .select(`
        id, name, sex, date_of_birth, color, microchip, notes, created_at, updated_at,
        species:species_id(id, name),
        breed:breed_id(id, name),
        medical_records(
          id, reason, diagnosis, treatment, notes,
          weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
          created_at, tenant_id,
          created_by_profile:created_by(full_name),
          prescriptions(id, medication_name, dosage, frequency, duration, notes),
          attachments(id, file_name, file_type, storage_path, created_at),
          addendums(id, content, created_at, created_by_profile:created_by(full_name))
        )
      `)
      .eq('id', id)
      .order('created_at', { referencedTable: 'medical_records', ascending: false })
      .single(),
    (supabase.from('pet_registrations') as any)
      .select('owner:owner_id(id, full_name, email, phone)')
      .eq('pet_id', id)
      .maybeSingle(),
  ])

  if (petResult.error?.code === 'PGRST116') return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
  if (petResult.error) return NextResponse.json({ error: petResult.error.message }, { status: 500 })

  const data = {
    ...petResult.data,
    owner: regResult.data?.owner ?? null,
  }

  return NextResponse.json({ data })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "pets/\[id\]" || echo "no errors in this file"
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/pets/[id]/route.ts
git commit -m "feat: pets/[id] GET — parallel queries for pet+records and tenant owner"
```

---

## Task 12: Update owners API routes

**Files:**
- Modify: `veterinaias/app/api/owners/route.ts`
- Modify: `veterinaias/app/api/owners/[id]/route.ts`
- Modify: `veterinaias/__tests__/api/owners.test.ts`

GET /api/owners now queries only the current tenant's owners (RLS handles isolation). POST includes `tenant_id`. GET /api/owners/[id] returns pets via `pet_registrations` instead of direct FK.

- [ ] **Step 1: Write failing tests for owners**

Replace `veterinaias/__tests__/api/owners.test.ts` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/owners/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const mockProfile = { tenant_id: 'tenant-1' }

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    ...overrides,
  }
}

describe('POST /api/owners', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
    } as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García', phone: '5551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no tenant', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: null }, error: null }),
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García', phone: '5551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 422 when phone is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when owner is created with tenant_id', async () => {
    const mockOwner = { id: 'owner-1', full_name: 'Ana García', phone: '5551234567', email: null, tenant_id: 'tenant-1' }
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOwner, error: null }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García', phone: '5551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.full_name).toBe('Ana García')
  })
})

describe('GET /api/owners', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
    } as any)
    const req = new NextRequest('http://localhost/api/owners')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns tenant owners list (RLS-filtered)', async () => {
    const mockOwners = [{ id: 'owner-1', full_name: 'Ana García', phone: '555', email: null, tenant_id: 'tenant-1' }]
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockOwners, error: null }),
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/owners')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('filters owners when ?q= param is provided', async () => {
    const mockOwners = [{ id: 'owner-2', full_name: 'Carlos López', phone: '5559999', email: null }]
    const mockOr = vi.fn().mockResolvedValue({ data: mockOwners, error: null })
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: mockOr,
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/owners?q=Carlos')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockOr).toHaveBeenCalledWith(expect.stringContaining('Carlos'))
  })
})
```

- [ ] **Step 2: Run tests — expect some failures (POST 403 and 201 tests will fail)**

```bash
cd veterinaias && npx vitest run __tests__/api/owners.test.ts 2>&1 | tail -20
```

- [ ] **Step 3: Update app/api/owners/route.ts**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ownerSchema } from '@/lib/validations/owner'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  let query = (supabase.from('owners') as any)
    .select('id, full_name, email, phone, created_at')
    .order('full_name')
    .limit(50)

  if (q && q.trim()) {
    const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = ownerSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 })

  const { email, ...rest } = result.data
  const { data, error } = await supabase
    .from('owners')
    .insert({ ...rest, tenant_id: profile.tenant_id, email: email || null })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe un dueño con ese email en tu clínica' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 4: Update app/api/owners/[id]/route.ts — GET handler**

Replace only the GET function in `app/api/owners/[id]/route.ts` (keep PATCH):

```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: owner, error } = await (supabase.from('owners') as any)
    .select('id, full_name, email, phone, address, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: registrations } = await (supabase.from('pet_registrations') as any)
    .select(`
      pet:pet_id(
        id, name, sex, date_of_birth, color, microchip, notes, created_at,
        species:species_id(id, name),
        breed:breed_id(id, name)
      )
    `)
    .eq('owner_id', id)

  const pets = (registrations ?? []).map((reg: any) => reg.pet).filter(Boolean)

  return NextResponse.json({ data: { ...owner, pets } })
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd veterinaias && npx vitest run __tests__/api/owners.test.ts 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add veterinaias/app/api/owners/route.ts veterinaias/app/api/owners/[id]/route.ts veterinaias/__tests__/api/owners.test.ts
git commit -m "feat: owners API — tenant isolation, POST requires tenant_id, GET[id] pets via pet_registrations"
```

---

## Task 13: Create GET /api/pets/search-cross-tenant

**Files:**
- Create: `veterinaias/app/api/pets/search-cross-tenant/route.ts`

Calls the `search_pets_cross_tenant` Postgres function. At least one query param required.

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const phone      = req.nextUrl.searchParams.get('phone') || undefined
  const petName    = req.nextUrl.searchParams.get('name') || undefined
  const speciesId  = req.nextUrl.searchParams.get('species_id') || undefined
  const breedId    = req.nextUrl.searchParams.get('breed_id') || undefined

  if (!phone && !petName && !speciesId && !breedId) {
    return NextResponse.json({ error: 'Se requiere al menos un parámetro de búsqueda' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('search_pets_cross_tenant', {
    p_phone:      phone      ?? null,
    p_pet_name:   petName    ?? null,
    p_species_id: speciesId  ?? null,
    p_breed_id:   breedId    ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/api/pets/search-cross-tenant/route.ts
git commit -m "feat: add GET /api/pets/search-cross-tenant — calls SECURITY DEFINER RPC"
```

---

## Task 14: Create POST /api/pet-registrations

**Files:**
- Create: `veterinaias/app/api/pet-registrations/route.ts`

Used when registering an existing platform pet (found via cross-clinic search) with a local owner at the current clinic.

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  pet_id:   z.string().uuid('pet_id inválido'),
  owner_id: z.string().uuid('owner_id inválido'),
  notes:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = schema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 })

  const { data, error } = await supabase
    .from('pet_registrations')
    .insert({ tenant_id: profile.tenant_id, ...result.data })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Esta mascota ya está registrada en tu clínica' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/api/pet-registrations/route.ts
git commit -m "feat: add POST /api/pet-registrations — register existing platform pet at current tenant"
```

---

## Task 15: Tests for pet-registrations API

**Files:**
- Create: `veterinaias/__tests__/api/pet-registrations.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/pet-registrations/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validBody = {
  pet_id:   'aaaaaaaa-0000-4000-a000-000000000001',
  owner_id: 'bbbbbbbb-0000-4000-a000-000000000001',
}

const mockProfile = { tenant_id: 'tenant-1' }

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    ...overrides,
  }
}

describe('POST /api/pet-registrations', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no tenant', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: null }, error: null }),
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 422 when pet_id is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient() as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify({ owner_id: validBody.owner_id }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when registration is created', async () => {
    const mockReg = { id: 'reg-1', tenant_id: 'tenant-1', ...validBody }
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockReg, error: null }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.pet_id).toBe(validBody.pet_id)
  })

  it('returns 409 when pet is already registered at this tenant', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
        }
      }),
    }) as any)
    const req = new NextRequest('http://localhost/api/pet-registrations', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd veterinaias && npx vitest run __tests__/api/pet-registrations.test.ts 2>&1 | tail -15
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add veterinaias/__tests__/api/pet-registrations.test.ts
git commit -m "test: add pet-registrations API tests"
```

---

## Task 16: Update dashboard/owners/[ownerId]/page.tsx

**Files:**
- Modify: `veterinaias/app/dashboard/owners/[ownerId]/page.tsx`

The owner detail page queries pets via `pet_registrations` instead of the old `pets(...)` FK join.

- [ ] **Step 1: Update the Supabase query and pets extraction**

In `veterinaias/app/dashboard/owners/[ownerId]/page.tsx`, replace the Supabase query block:

```typescript
// BEFORE:
const { data: owner, error } = await (supabase.from('owners') as any)
  .select(`
    id, full_name, email, phone, address, created_at,
    pets(
      id, name, sex, date_of_birth, color, microchip,
      species:species_id(id, name),
      breed:breed_id(id, name),
      medical_records(created_at)
    )
  `)
  .eq('id', ownerId)
  .single()

if (error || !owner) notFound()

const pets = (owner.pets as any[]) ?? []
```

With:

```typescript
// AFTER:
const { data: owner, error } = await (supabase.from('owners') as any)
  .select('id, full_name, email, phone, address, created_at')
  .eq('id', ownerId)
  .single()

if (error || !owner) notFound()

const { data: registrations } = await (supabase.from('pet_registrations') as any)
  .select(`
    pet:pet_id(
      id, name, sex, date_of_birth, color, microchip,
      species:species_id(id, name),
      breed:breed_id(id, name),
      medical_records(created_at)
    )
  `)
  .eq('owner_id', ownerId)

const pets = (registrations ?? []).map((reg: any) => reg.pet).filter(Boolean)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "ownerId" || echo "no errors in this file"
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/owners/[ownerId]/page.tsx
git commit -m "feat: owner detail page — pets via pet_registrations"
```

---

## Task 17: Update dashboard/pets/[petId]/page.tsx

**Files:**
- Modify: `veterinaias/app/dashboard/pets/[petId]/page.tsx`

The pet detail page currently queries `owner:owner_id(...)` as a join on the `pets` table. After the migration `owner_id` is gone from `pets`. We need two parallel queries: one for pet data, one for the owner via `pet_registrations`.

- [ ] **Step 1: Read the current file to locate the query**

The file queries Supabase with `owner:owner_id(id, full_name)`. Find and replace that pattern.

- [ ] **Step 2: Update the Supabase query in pets/[petId]/page.tsx**

Replace the Supabase fetch block (the single query that includes `owner:owner_id`) with two parallel queries:

```typescript
// BEFORE (single query with owner:owner_id):
const { data, error } = await supabase
  .from('pets')
  .select(`
    ...,
    owner:owner_id(id, full_name),
    ...
  `)
  .eq('id', petId)
  .single()

// AFTER (two queries merged):
const [petResult, regResult] = await Promise.all([
  supabase
    .from('pets')
    .select(`
      id, name, sex, date_of_birth, color, microchip, notes, created_at,
      species:species_id(id, name),
      breed:breed_id(id, name),
      medical_records(
        id, reason, diagnosis, treatment, notes,
        weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
        created_at, tenant_id,
        created_by_profile:created_by(full_name),
        prescriptions(id, medication_name, dosage, frequency, duration, notes),
        attachments(id, file_name, file_type, storage_path, created_at),
        addendums(id, content, created_at, created_by_profile:created_by(full_name))
      )
    `)
    .eq('id', petId)
    .order('created_at', { referencedTable: 'medical_records', ascending: false })
    .single(),
  (supabase as any).from('pet_registrations')
    .select('owner:owner_id(id, full_name, email, phone)')
    .eq('pet_id', petId)
    .maybeSingle(),
])

if (petResult.error?.code === 'PGRST116') notFound()
if (petResult.error) throw petResult.error

const pet = petResult.data
const owner = regResult?.data?.owner ?? null
```

> Note: The actual page file needs to be read before editing to preserve all the JSX. Use the Read tool first, then apply a targeted Edit. The pattern above shows the logic change — preserve all surrounding JSX and variable usage (`owner?.id`, `owner?.full_name`).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "petId" || echo "no errors in this file"
```

- [ ] **Step 4: Commit**

```bash
git add veterinaias/app/dashboard/pets/[petId]/page.tsx
git commit -m "feat: pet detail page — owner via pet_registrations, parallel queries"
```

---

## Task 18: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
cd veterinaias && npx vitest run 2>&1 | tail -30
```

Expected: all tests PASS, no failures

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 3: Verify dev server starts cleanly**

```bash
cd veterinaias && npx next build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing warnings)

- [ ] **Step 4: Final commit**

```bash
git add -p  # review any remaining changes
git commit -m "chore: tenant isolation complete — owners/pet_registrations isolated, medical_records cross-tenant"
```

---

## Quick Reference

### New query pattern: list pets for current tenant
```typescript
// Via pet_registrations (RLS auto-filters to current tenant)
const { data } = await supabase
  .from('pet_registrations')
  .select('owner:owner_id(id, full_name), pet:pet_id(id, name, species:species_id(name))')
```

### New query pattern: pet detail with owner
```typescript
// Two queries, merge results
const [{ data: pet }, { data: reg }] = await Promise.all([
  supabase.from('pets').select('...medical_records(...)').eq('id', petId).single(),
  supabase.from('pet_registrations').select('owner:owner_id(id, full_name, phone)').eq('pet_id', petId).maybeSingle(),
])
const data = { ...pet, owner: reg?.owner ?? null }
```

### New query pattern: create owner (auto-assigns to current tenant)
```typescript
const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
await supabase.from('owners').insert({ ...ownerData, tenant_id: profile.tenant_id })
```

### New query pattern: register existing pet at this clinic
```typescript
await supabase.from('pet_registrations').insert({ tenant_id: profile.tenant_id, pet_id, owner_id })
```

### Cross-clinic search
```typescript
const { data } = await supabase.rpc('search_pets_cross_tenant', { p_phone: '555-1234' })
// Returns: pet_name, owner_full_name, owner_phone, record_count, last_clinic
// Does NOT return: owner email, address, tenant_id, full client profile
```
