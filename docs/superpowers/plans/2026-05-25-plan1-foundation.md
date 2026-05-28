# VeterinaIAs — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inicializar el proyecto Next.js + Supabase con autenticacion, modelo de datos multitenant completo, RLS policies, roles de usuario y routing protegido — la base sobre la que se construyen todos los demas planes.

**Architecture:** Next.js 14 App Router con Supabase para auth, base de datos (PostgreSQL + RLS) y storage. El multitenant se aplica a nivel base de datos via Row Level Security. Los expedientes clinicos son entidades de plataforma (sin tenant_id) accesibles por cualquier vet autenticado. El super admin es un flag especial en user_profiles.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase JS v2 + @supabase/ssr, Tailwind CSS, shadcn/ui, Zod, React Hook Form, Vitest, @testing-library/react

> **Nota:** Este es Plan 1 de 5. Los planes siguientes son:
> - Plan 2: Dueños, Mascotas y Expediente Clinico
> - Plan 3: Agenda y Calendario
> - Plan 4: Super Admin y Billing (Stripe)
> - Plan 5: Settings y Compartir Expediente

---

## Mapa de Archivos

```
veterinaias/
├── .env.local                                       # Vars de entorno (gitignored)
├── .env.example                                     # Template de vars
├── middleware.ts                                    # Proteccion de rutas
├── vitest.config.ts                                 # Configuracion de tests
├── vitest.setup.ts                                  # Setup global de tests
├── supabase/
│   └── migrations/
│       ├── 20260525000000_initial_schema.sql        # Todas las tablas + seed
│       └── 20260525000001_rls_policies.sql          # RLS + helper functions
├── lib/
│   ├── supabase/
│   │   ├── client.ts                                # Cliente browser
│   │   ├── server.ts                                # Cliente server (SSR)
│   │   └── admin.ts                                 # Cliente service role (super admin)
│   ├── types/
│   │   └── database.ts                              # Tipos TypeScript de todas las tablas
│   └── validations/
│       ├── auth.ts                                  # Schemas Zod login/register
│       └── tenant.ts                                # Schema Zod creacion de tenant
├── app/
│   ├── layout.tsx                                   # Root layout
│   ├── page.tsx                                     # Redirect a /dashboard o /login
│   ├── (auth)/
│   │   ├── layout.tsx                               # Layout paginas de auth
│   │   ├── login/page.tsx                           # Pagina login
│   │   └── register/page.tsx                        # Pagina registro
│   ├── onboarding/
│   │   └── page.tsx                                 # Setup del tenant tras registro
│   ├── (dashboard)/
│   │   ├── layout.tsx                               # Layout dashboard (requiere auth + tenant)
│   │   └── page.tsx                                 # Home del dashboard
│   ├── (dashboard)/settings/team/
│   │   └── page.tsx                                 # Gestion del equipo
│   ├── super-admin/
│   │   ├── layout.tsx                               # Layout super admin
│   │   └── page.tsx                                 # Lista de tenants
│   └── api/
│       ├── tenants/route.ts                         # POST /api/tenants
│       └── invitations/route.ts                     # POST /api/invitations
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── onboarding/
│   │   └── TenantSetupForm.tsx
│   └── team/
│       └── InviteUserForm.tsx
└── __tests__/
    ├── auth/
    │   ├── LoginForm.test.tsx
    │   └── RegisterForm.test.tsx
    ├── onboarding/
    │   └── TenantSetupForm.test.tsx
    └── api/
        ├── tenants.test.ts
        └── invitations.test.ts
```

---

## Task 1: Inicializacion del Proyecto

**Files:**
- Create: `package.json` (via CLI)
- Create: `.env.local`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Crear el proyecto Next.js**

```bash
npx create-next-app@latest veterinaias \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd veterinaias
```

- [ ] **Step 2: Instalar dependencias de produccion**

```bash
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers
```

- [ ] **Step 3: Instalar dependencias de desarrollo y test**

```bash
npm install -D vitest @testing-library/react @testing-library/user-event \
  @vitejs/plugin-react jsdom @types/node
```

- [ ] **Step 4: Inicializar shadcn/ui**

```bash
npx shadcn@latest init
# Responder: Default style: Default, Base color: Slate, CSS variables: yes
npx shadcn@latest add button input form label card select tabs badge separator
```

- [ ] **Step 5: Crear vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 6: Crear vitest.setup.ts**

```typescript
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}))
```

- [ ] **Step 7: Crear .env.example**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 8: Crear .env.local con tus valores reales de Supabase**

Copia `.env.example` a `.env.local` y llena los valores desde el dashboard de Supabase (Settings > API).

- [ ] **Step 9: Agregar script de test a package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js project with Supabase, shadcn/ui, and Vitest"
```

---

## Task 2: Migracion del Schema de Base de Datos

**Files:**
- Create: `supabase/migrations/20260525000000_initial_schema.sql`

- [ ] **Step 1: Instalar Supabase CLI**

```bash
npm install -D supabase
npx supabase login
npx supabase init
```

- [ ] **Step 2: Crear la migracion del schema**

```bash
mkdir -p supabase/migrations
```

Crear `supabase/migrations/20260525000000_initial_schema.sql`:

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE tenant_type AS ENUM ('individual', 'enterprise');
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'doctor', 'assistant');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'grace_period');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE pet_sex AS ENUM ('male', 'female', 'unknown');

-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type tenant_type NOT NULL,
  subscription_status subscription_status DEFAULT 'trial' NOT NULL,
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days' NOT NULL,
  grace_period_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  settings JSONB DEFAULT '{"confirmation_reminder_days": 2, "share_link_expiry_days": 7}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User profiles (extiende auth.users de Supabase)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  role user_role,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Invitaciones pendientes
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tenant_id, email)
);

-- Catalogo de especies
CREATE TABLE species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Catalogo de razas
CREATE TABLE breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(species_id, name)
);

-- Dueños de mascotas (nivel plataforma, sin tenant_id)
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Mascotas (nivel plataforma)
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  species_id UUID NOT NULL REFERENCES species(id),
  breed_id UUID REFERENCES breeds(id),
  sex pet_sex DEFAULT 'unknown' NOT NULL,
  date_of_birth DATE,
  color TEXT,
  microchip TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Expedientes clinicos (nivel plataforma, INMUTABLES una vez guardados)
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  appointment_id UUID,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  reason TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  notes TEXT,
  weight_kg NUMERIC(5,2),
  temperature_celsius NUMERIC(4,1),
  heart_rate_bpm INTEGER,
  respiratory_rate_bpm INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  -- Sin updated_at: los registros son inmutables
);

-- Recetas dentro de un expediente
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Archivos adjuntos (labs, radiografias, imagenes)
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Adendas (correcciones o notas adicionales sobre un expediente)
CREATE TABLE addendums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Citas (nivel tenant)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id),
  owner_id UUID NOT NULL REFERENCES owners(id),
  assigned_to UUID REFERENCES user_profiles(id),
  status appointment_status DEFAULT 'scheduled' NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30 NOT NULL,
  reason TEXT,
  notes TEXT,
  medical_record_id UUID REFERENCES medical_records(id),
  origin_record_id UUID REFERENCES medical_records(id),
  google_event_id TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tokens de compartir expediente
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed: especies comunes
INSERT INTO species (name) VALUES
  ('Perro'), ('Gato'), ('Conejo'), ('Ave'), ('Reptil'), ('Hamster'), ('Otro');

-- Trigger para updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER owners_updated_at BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pets_updated_at BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 3: Agregar trigger para auto-crear user_profile al final del mismo archivo SQL**

```sql
-- Trigger: crea user_profile automaticamente cuando un usuario se registra en auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 4: Aplicar la migracion en Supabase**

```bash
npx supabase db push
```

Expected: `Applying migration 20260525000000_initial_schema.sql... done`

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with all tables, seed data, and user profile trigger"
```

---

## Task 3: RLS Policies

**Files:**
- Create: `supabase/migrations/20260525000001_rls_policies.sql`

- [ ] **Step 1: Crear la migracion de RLS**

Crear `supabase/migrations/20260525000001_rls_policies.sql`:

```sql
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
  FOR INSERT WITH CHECK (TRUE); -- la insercion se hace desde API route con service role

-- INVITATIONS
CREATE POLICY "admins_manage_invitations" ON invitations
  FOR ALL USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

CREATE POLICY "anyone_read_invitation_by_token" ON invitations
  FOR SELECT USING (TRUE); -- validacion del token en capa de aplicacion

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
```

- [ ] **Step 2: Aplicar la migracion**

```bash
npx supabase db push
```

Expected: `Applying migration 20260525000001_rls_policies.sql... done`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525000001_rls_policies.sql
git commit -m "feat: add RLS policies for all tables"
```

---

## Task 4: TypeScript Types y Clientes Supabase

**Files:**
- Create: `lib/types/database.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Crear lib/types/database.ts**

```typescript
export type TenantType = 'individual' | 'enterprise'
export type UserRole = 'admin' | 'staff' | 'doctor' | 'assistant'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'grace_period'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type PetSex = 'male' | 'female' | 'unknown'

export interface TenantSettings {
  confirmation_reminder_days: number
  share_link_expiry_days: number
}

export interface Tenant {
  id: string
  name: string
  slug: string
  type: TenantType
  subscription_status: SubscriptionStatus
  trial_ends_at: string
  grace_period_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  settings: TenantSettings
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  tenant_id: string | null
  role: UserRole | null
  full_name: string
  phone: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  tenant_id: string
  email: string
  role: UserRole
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface Species {
  id: string
  name: string
  created_at: string
}

export interface Breed {
  id: string
  species_id: string
  name: string
  created_at: string
}

export interface Owner {
  id: string
  full_name: string
  email: string | null
  phone: string
  address: string | null
  created_at: string
  updated_at: string
}

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

export interface MedicalRecord {
  id: string
  pet_id: string
  appointment_id: string | null
  tenant_id: string
  created_by: string
  reason: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  weight_kg: number | null
  temperature_celsius: number | null
  heart_rate_bpm: number | null
  respiratory_rate_bpm: number | null
  created_at: string
}

export interface Prescription {
  id: string
  medical_record_id: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  notes: string | null
  created_at: string
}

export interface Attachment {
  id: string
  medical_record_id: string
  file_name: string
  file_type: string
  storage_path: string
  created_by: string
  created_at: string
}

export interface Addendum {
  id: string
  medical_record_id: string
  content: string
  created_by: string
  created_at: string
}

export interface Appointment {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  assigned_to: string | null
  status: AppointmentStatus
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  notes: string | null
  medical_record_id: string | null
  origin_record_id: string | null
  google_event_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ShareToken {
  id: string
  pet_id: string
  token: string
  created_by: string
  expires_at: string
  accessed_at: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      tenants: { Row: Tenant; Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Tenant, 'id' | 'created_at'>> }
      user_profiles: { Row: UserProfile; Insert: Omit<UserProfile, 'created_at' | 'updated_at'>; Update: Partial<Omit<UserProfile, 'id' | 'created_at'>> }
      invitations: { Row: Invitation; Insert: Omit<Invitation, 'id' | 'token' | 'created_at'>; Update: Pick<Invitation, 'accepted_at'> }
      species: { Row: Species; Insert: Omit<Species, 'id' | 'created_at'>; Update: never }
      breeds: { Row: Breed; Insert: Omit<Breed, 'id' | 'created_at'>; Update: never }
      owners: { Row: Owner; Insert: Omit<Owner, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Owner, 'id' | 'created_at'>> }
      pets: { Row: Pet; Insert: Omit<Pet, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Pet, 'id' | 'created_at'>> }
      medical_records: { Row: MedicalRecord; Insert: Omit<MedicalRecord, 'id' | 'created_at'>; Update: never }
      prescriptions: { Row: Prescription; Insert: Omit<Prescription, 'id' | 'created_at'>; Update: never }
      attachments: { Row: Attachment; Insert: Omit<Attachment, 'id' | 'created_at'>; Update: never }
      addendums: { Row: Addendum; Insert: Omit<Addendum, 'id' | 'created_at'>; Update: never }
      appointments: { Row: Appointment; Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Appointment, 'id' | 'created_at'>> }
      share_tokens: { Row: ShareToken; Insert: Omit<ShareToken, 'id' | 'token' | 'created_at'>; Update: Pick<ShareToken, 'accessed_at'> }
    }
  }
}
```

- [ ] **Step 2: Crear lib/supabase/client.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Crear lib/supabase/server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Crear lib/supabase/admin.ts**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Solo usar en API routes del servidor — NUNCA en el cliente
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/
git commit -m "feat: add TypeScript types and Supabase client utilities"
```

---

## Task 5: Middleware de Proteccion de Rutas

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Crear middleware.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/accept-invite']
const SUPER_ADMIN_ROUTES = ['/super-admin']
const ONBOARDING_ROUTE = '/onboarding'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas publicas: redirigir a dashboard si ya esta autenticado
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  // Sin sesion: redirigir a login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar si el usuario tiene tenant asignado
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, is_super_admin')
    .eq('id', user.id)
    .single()

  // Super admin: solo puede acceder a /super-admin
  if (profile?.is_super_admin) {
    if (!SUPER_ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/super-admin', request.url))
    }
    return response
  }

  // Sin tenant: forzar onboarding
  if (!profile?.tenant_id && pathname !== ONBOARDING_ROUTE) {
    return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
  }

  // Con tenant en onboarding: redirigir a dashboard
  if (profile?.tenant_id && pathname === ONBOARDING_ROUTE) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|share/).*)'],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add route protection middleware with tenant and super admin checks"
```

---

## Task 6: Validaciones y Flujo de Login

**Files:**
- Create: `lib/validations/auth.ts`
- Create: `components/auth/LoginForm.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Test: `__tests__/auth/LoginForm.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `__tests__/auth/LoginForm.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { createClient } from '@/lib/supabase/client'
import { vi } from 'vitest'

const mockSignIn = vi.fn()
vi.mocked(createClient).mockReturnValue({
  auth: { signInWithPassword: mockSignIn },
} as any)

describe('LoginForm', () => {
  beforeEach(() => mockSignIn.mockClear())

  it('muestra errores de validacion cuando los campos estan vacios', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    expect(await screen.findByText(/email es requerido/i)).toBeInTheDocument()
    expect(await screen.findByText(/contrasena es requerida/i)).toBeInTheDocument()
  })

  it('llama a signInWithPassword con email y password correctos', async () => {
    mockSignIn.mockResolvedValue({ data: { user: {} }, error: null })
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'vet@clinica.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'vet@clinica.com',
        password: 'password123',
      })
    })
  })

  it('muestra mensaje de error cuando las credenciales son invalidas', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'vet@clinica.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    expect(await screen.findByText(/credenciales invalidas/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
npm run test -- __tests__/auth/LoginForm.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/auth/LoginForm'`

- [ ] **Step 3: Crear lib/validations/auth.ts**

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email es requerido').email('Email invalido'),
  password: z.string().min(1, 'Contrasena es requerida'),
})

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().min(1, 'Email es requerido').email('Email invalido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
```

- [ ] **Step 4: Crear components/auth/LoginForm.tsx**

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      setServerError('Credenciales invalidas. Verifica tu email y contrasena.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contrasena</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Iniciando sesion...' : 'Iniciar sesion'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Crear app/(auth)/layout.tsx**

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">VeterinaIAs</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Crear app/(auth)/login/page.tsx**

```typescript
import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesion</CardTitle>
        <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="text-sm text-center mt-4 text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Ejecutar tests para verificar que pasan**

```bash
npm run test -- __tests__/auth/LoginForm.test.tsx
```

Expected: PASS — 3 tests passing

- [ ] **Step 8: Commit**

```bash
git add lib/validations/auth.ts components/auth/LoginForm.tsx app/\(auth\)/
git commit -m "feat: add login page with validation and error handling"
```

---

## Task 7: Flujo de Registro

**Files:**
- Create: `components/auth/RegisterForm.tsx`
- Create: `app/(auth)/register/page.tsx`
- Test: `__tests__/auth/RegisterForm.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `__tests__/auth/RegisterForm.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { createClient } from '@/lib/supabase/client'
import { vi } from 'vitest'

const mockSignUp = vi.fn()
vi.mocked(createClient).mockReturnValue({
  auth: { signUp: mockSignUp },
} as any)

describe('RegisterForm', () => {
  beforeEach(() => mockSignUp.mockClear())

  it('muestra error si la contrasena tiene menos de 8 caracteres', async () => {
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Dr. Lopez')
    await userEvent.type(screen.getByLabelText(/email/i), 'dr@vet.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('llama a signUp con datos validos', async () => {
    mockSignUp.mockResolvedValue({ data: { user: {} }, error: null })
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Dr. Lopez')
    await userEvent.type(screen.getByLabelText(/email/i), 'dr@vet.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'dr@vet.com',
        password: 'password123',
        options: { data: { full_name: 'Dr. Lopez' } },
      })
    })
  })
})
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
npm run test -- __tests__/auth/RegisterForm.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/auth/RegisterForm'`

- [ ] **Step 3: Crear components/auth/RegisterForm.tsx**

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })
    if (error) {
      setServerError('No se pudo crear la cuenta. ' + error.message)
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" {...register('full_name')} />
        {errors.full_name && <p className="text-sm text-red-500">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contrasena</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Crear app/(auth)/register/page.tsx**

```typescript
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Registra tu veterinaria o clinica en VeterinaIAs</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="text-sm text-center mt-4 text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Inicia sesion
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
npm run test -- __tests__/auth/RegisterForm.test.tsx
```

Expected: PASS — 2 tests passing

- [ ] **Step 6: Commit**

```bash
git add components/auth/RegisterForm.tsx app/\(auth\)/register/
git commit -m "feat: add register page with full name, email, and password validation"
```

---

## Task 8: Onboarding del Tenant

**Files:**
- Create: `lib/validations/tenant.ts`
- Create: `app/api/tenants/route.ts`
- Create: `components/onboarding/TenantSetupForm.tsx`
- Create: `app/onboarding/page.tsx`
- Test: `__tests__/api/tenants.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `__tests__/api/tenants.test.ts`:

```typescript
import { POST } from '@/app/api/tenants/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/admin')
vi.mock('@/lib/supabase/server')

const mockInsert = vi.fn()
vi.mocked(createAdminClient).mockReturnValue({
  from: vi.fn(() => ({ insert: mockInsert, select: vi.fn().mockReturnThis(), single: vi.fn() })),
} as any)

describe('POST /api/tenants', () => {
  it('devuelve 400 si falta el nombre del tenant', async () => {
    const req = new NextRequest('http://localhost/api/tenants', {
      method: 'POST',
      body: JSON.stringify({ type: 'individual' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/nombre/i)
  })

  it('devuelve 400 si el tipo no es valido', async () => {
    const req = new NextRequest('http://localhost/api/tenants', {
      method: 'POST',
      body: JSON.stringify({ name: 'Clinica Test', type: 'invalid' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
npm run test -- __tests__/api/tenants.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/tenants/route'`

- [ ] **Step 3: Crear lib/validations/tenant.ts**

```typescript
import { z } from 'zod'

export const tenantSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  type: z.enum(['individual', 'enterprise'], {
    errorMap: () => ({ message: 'Tipo debe ser individual o enterprise' }),
  }),
})

export type TenantInput = z.infer<typeof tenantSchema>

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
```

- [ ] **Step 4: Crear app/api/tenants/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tenantSchema, generateSlug } from '@/lib/validations/tenant'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const result = tenantSchema.safeParse(body)

  if (!result.success) {
    const firstError = result.error.errors[0]
    return NextResponse.json({ error: firstError.message }, { status: 400 })
  }

  const { name, type } = result.data
  const slug = generateSlug(name)
  const admin = createAdminClient()

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name, slug, type })
    .select()
    .single()

  if (tenantError) {
    if (tenantError.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una clinica con ese nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear la clinica' }, { status: 500 })
  }

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({ tenant_id: tenant.id, role: 'admin' })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: 'Error al configurar el perfil' }, { status: 500 })
  }

  return NextResponse.json({ tenant }, { status: 201 })
}
```

- [ ] **Step 5: Crear components/onboarding/TenantSetupForm.tsx**

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { tenantSchema, type TenantInput } from '@/lib/validations/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export function TenantSetupForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<TenantInput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { type: 'individual' },
  })

  const selectedType = watch('type')

  async function onSubmit(data: TenantInput) {
    setServerError(null)
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setServerError(json.error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="name">Nombre de tu clinica o veterinaria</Label>
        <Input id="name" placeholder="Ej: Clinica Veterinaria Lopez" {...register('name')} />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Tipo de negocio</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'individual', label: 'Veterinaria Individual', desc: 'Hasta 5 personas, calendario compartido' },
            { value: 'enterprise', label: 'Hospital / Clinica', desc: 'Multiples doctores, calendarios independientes' },
          ].map(({ value, label, desc }) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" value={value} {...register('type')} className="sr-only" />
              <Card className={`border-2 transition-colors ${selectedType === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-slate-500 mt-1">{desc}</p>
                </CardContent>
              </Card>
            </label>
          ))}
        </div>
        {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Configurando...' : 'Crear mi clinica'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 6: Crear app/onboarding/page.tsx**

Si el usuario llego desde un link de invitacion (`?invite=<token>`), auto-acepta la invitacion en lugar de mostrar el form de crear tenant.

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { TenantSetupForm } from '@/components/onboarding/TenantSetupForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { invite?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Si viene con token de invitacion, auto-aceptar
  if (searchParams.invite) {
    const admin = createAdminClient()
    const { data: invitation } = await admin
      .from('invitations')
      .select('*')
      .eq('token', searchParams.invite)
      .eq('email', user.email!)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invitation) {
      await admin.from('user_profiles')
        .update({ tenant_id: invitation.tenant_id, role: invitation.role })
        .eq('id', user.id)
      await admin.from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
      redirect('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">VeterinaIAs</h1>
          <p className="text-slate-500 mt-2">Configura tu clinica para empezar</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>
              Cuentanos sobre tu negocio para personalizar tu experiencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantSetupForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Ejecutar tests**

```bash
npm run test -- __tests__/api/tenants.test.ts
```

Expected: PASS — 2 tests passing

- [ ] **Step 8: Commit**

```bash
git add lib/validations/tenant.ts app/api/tenants/ components/onboarding/ app/onboarding/
git commit -m "feat: add tenant onboarding flow with individual/enterprise selection"
```

---

## Task 9: Invitacion de Usuarios

**Files:**
- Create: `app/api/invitations/route.ts`
- Create: `components/team/InviteUserForm.tsx`
- Create: `app/(dashboard)/settings/team/page.tsx`
- Create: `app/(auth)/accept-invite/[token]/page.tsx`
- Test: `__tests__/api/invitations.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `__tests__/api/invitations.test.ts`:

```typescript
import { POST } from '@/app/api/invitations/route'
import { vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/admin')

describe('POST /api/invitations', () => {
  it('devuelve 400 si el email es invalido', async () => {
    const req = new NextRequest('http://localhost/api/invitations', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', role: 'staff' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email/i)
  })

  it('devuelve 400 si el rol no es valido', async () => {
    const req = new NextRequest('http://localhost/api/invitations', {
      method: 'POST',
      body: JSON.stringify({ email: 'nuevo@vet.com', role: 'superuser' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
npm run test -- __tests__/api/invitations.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/invitations/route'`

- [ ] **Step 3: Crear app/api/invitations/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['staff', 'doctor', 'assistant'], {
    errorMap: () => ({ message: 'Rol invalido' }),
  }),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos para invitar usuarios' }, { status: 403 })
  }

  const body = await request.json()
  const result = inviteSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: invitation, error } = await admin
    .from('invitations')
    .insert({
      tenant_id: profile.tenant_id,
      email: result.data.email,
      role: result.data.role,
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una invitacion para ese email' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear invitacion' }, { status: 500 })
  }

  // TODO Plan 5: enviar email con invitation.token al email invitado
  return NextResponse.json({ invitation }, { status: 201 })
}
```

- [ ] **Step 4: Crear components/team/InviteUserForm.tsx**

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TenantType } from '@/lib/types/database'

const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['staff', 'doctor', 'assistant']),
})
type InviteInput = z.infer<typeof inviteSchema>

export function InviteUserForm({ tenantType, onSuccess }: { tenantType: TenantType; onSuccess?: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'staff' },
  })

  async function onSubmit(data: InviteInput) {
    setServerError(null)
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error); return }
    setSuccess(true)
    reset()
    onSuccess?.()
  }

  const roleOptions = tenantType === 'enterprise'
    ? [{ value: 'doctor', label: 'Doctor' }, { value: 'assistant', label: 'Asistente' }, { value: 'staff', label: 'Staff' }]
    : [{ value: 'staff', label: 'Staff' }]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {success && <p className="text-sm text-green-600">Invitacion enviada exitosamente</p>}
      <div className="space-y-1">
        <Label htmlFor="invite-email">Email del nuevo usuario</Label>
        <Input id="invite-email" type="email" placeholder="doctor@clinica.com" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Rol</Label>
        <Select defaultValue="staff" onValueChange={(v) => setValue('role', v as InviteInput['role'])}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Invitando...' : 'Enviar invitacion'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Crear app/(dashboard)/settings/team/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { InviteUserForm } from '@/components/team/InviteUserForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Tenant, UserProfile } from '@/lib/types/database'

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, tenants(*)')
    .eq('id', user!.id)
    .single() as { data: UserProfile & { tenants: Tenant } | null }

  const { data: members } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('created_at')

  const { data: pendingInvites } = await supabase
    .from('invitations')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .is('accepted_at', null)

  const canInvite = profile?.role === 'admin'
  const tenantType = (profile as any)?.tenants?.type ?? 'individual'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Equipo</h1>

      <Card>
        <CardHeader><CardTitle>Miembros activos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members?.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="font-medium">{m.full_name}</span>
                <Badge variant="secondary">{m.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pendingInvites && pendingInvites.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Invitaciones pendientes</CardTitle></CardHeader>
          <CardContent>
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2">
                <span className="text-slate-600">{inv.email}</span>
                <Badge>{inv.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canInvite && (
        <Card>
          <CardHeader><CardTitle>Invitar nuevo usuario</CardTitle></CardHeader>
          <CardContent>
            <InviteUserForm tenantType={tenantType} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Crear app/(auth)/accept-invite/[token]/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: invitation } = await admin
    .from('invitations')
    .select('*, tenants(name)')
    .eq('token', params.token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-500">Invitacion invalida o expirada.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Ya autenticado: asignar tenant y rol
    await admin.from('user_profiles')
      .update({ tenant_id: invitation.tenant_id, role: invitation.role })
      .eq('id', user.id)
    await admin.from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)
    redirect('/dashboard')
  }

  const tenantName = (invitation.tenants as any)?.name ?? 'la clinica'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitacion a {tenantName}</CardTitle>
          <CardDescription>
            Fuiste invitado como <strong>{invitation.role}</strong>. Crea tu cuenta para aceptar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Registrate con el email <strong>{invitation.email}</strong> para unirte.
          </p>
          <a href={`/register?invite=${params.token}`} className="block w-full text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
            Crear cuenta
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Ejecutar tests**

```bash
npm run test -- __tests__/api/invitations.test.ts
```

Expected: PASS — 2 tests passing

- [ ] **Step 8: Commit**

```bash
git add app/api/invitations/ components/team/ app/\(dashboard\)/settings/ app/\(auth\)/accept-invite/
git commit -m "feat: add user invitation flow with role assignment and accept invite page"
```

---

## Task 10: Dashboard Shell y Super Admin Shell

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `app/super-admin/layout.tsx`
- Create: `app/super-admin/page.tsx`

- [ ] **Step 1: Crear app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VeterinaIAs',
  description: 'Plataforma de gestion veterinaria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Crear app/page.tsx**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/dashboard' : '/login')
}
```

- [ ] **Step 3: Crear app/(dashboard)/layout.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name)')
    .eq('id', user!.id)
    .single()

  const tenantName = (profile as any)?.tenants?.name ?? ''

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <p className="font-bold text-sm truncate">{tenantName}</p>
          <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Inicio</Link>
          <Link href="/dashboard/patients" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Pacientes</Link>
          <Link href="/dashboard/appointments" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Citas</Link>
          {profile?.role === 'admin' && (
            <Link href="/dashboard/settings/team" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Equipo</Link>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-sm text-slate-300 truncate">{profile?.full_name}</p>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Crear app/(dashboard)/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, tenants(name, type, subscription_status)')
    .eq('id', user!.id)
    .single()

  const tenant = (profile as any)?.tenants

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Bienvenido, {profile?.full_name}</h1>
      <p className="text-slate-500 mb-8">{tenant?.name}</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pacientes', href: '/dashboard/patients', desc: 'Gestionar dueños y mascotas' },
          { label: 'Citas', href: '/dashboard/appointments', desc: 'Ver y agendar citas' },
          { label: 'Expedientes', href: '/dashboard/records', desc: 'Historial clinico' },
        ].map(({ label, href, desc }) => (
          <a key={href} href={href} className="block p-6 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
            <h2 className="font-semibold mb-1">{label}</h2>
            <p className="text-sm text-slate-500">{desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Crear app/super-admin/layout.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin, full_name')
    .eq('id', user!.id)
    .single()

  if (!profile?.is_super_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <p className="font-bold text-sm">VeterinaIAs</p>
          <p className="text-xs text-slate-400">Super Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/super-admin" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Tenants</Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-sm text-slate-300">{profile.full_name}</p>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Crear app/super-admin/page.tsx**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'

export default async function SuperAdminPage() {
  const admin = createAdminClient()

  const { data: tenants } = await admin
    .from('tenants')
    .select('*, user_profiles(count)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tenants</h1>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Nombre', 'Tipo', 'Estado', 'Creado'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants?.map(t => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3"><Badge variant="outline">{t.type}</Badge></td>
                <td className="px-4 py-3"><Badge>{t.subscription_status}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{new Date(t.created_at).toLocaleDateString('es')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Ejecutar todos los tests**

```bash
npm run test:run
```

Expected: PASS — todos los tests en verde

- [ ] **Step 8: Commit final del Plan 1**

```bash
git add app/layout.tsx app/page.tsx app/\(dashboard\)/ app/super-admin/
git commit -m "feat: add dashboard and super admin shells with navigation"
```

---

## Verificacion Final del Plan 1

- [ ] Ejecutar `npm run dev` y verificar:
  - `/login` — formulario de login funciona
  - `/register` — registro crea usuario en Supabase Auth
  - `/onboarding` — crea tenant y asigna rol admin
  - `/dashboard` — solo accesible con auth + tenant
  - `/dashboard/settings/team` — invitar usuarios (solo admin)
  - `/super-admin` — solo accesible con is_super_admin = true
  - Sin sesion → redirige a `/login`
  - Con sesion sin tenant → redirige a `/onboarding`

- [ ] Ejecutar suite completa de tests

```bash
npm run test:run
```

Expected: todos los tests en verde

---

*Continuar con Plan 2: Dueños, Mascotas y Expediente Clinico*
