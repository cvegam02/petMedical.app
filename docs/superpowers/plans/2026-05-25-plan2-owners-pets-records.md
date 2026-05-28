# VeterinaIAs — Plan 2: Dueños, Mascotas y Expediente Clínico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo de dueños, mascotas y expediente clínico — buscar/crear dueños, registrar mascotas, crear y visualizar expedientes clínicos con vitales, recetas, adjuntos y adendas.

**Architecture:** Entidades de plataforma (sin tenant_id en owners/pets), con medical_records inmutables que incluyen tenant_id solo para scoping de creación. Supabase Storage para archivos adjuntos con subida directa desde el browser. Pages son Server Components que hacen fetch directo a Supabase; formularios son Client Components.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase JS v2 + @supabase/ssr, Zod v4, React Hook Form + zodResolver, shadcn/ui, Tailwind CSS, Vitest + @testing-library/react

---

## Contexto de Codebase

**Imports clave:**
- Servidor: `import { createClient } from '@/lib/supabase/server'` → `const supabase = await createClient()`  
- Admin: `import { createAdminClient } from '@/lib/supabase/admin'` → `const admin = createAdminClient()`  
- Browser: `import { createClient } from '@/lib/supabase/client'` → `const supabase = createClient()`  
- En rutas API que necesitan ambos: `import { createClient as createServerClient } from '@/lib/supabase/server'`  
- Zod v4: usar `result.error.issues[0].message` (no `.errors`)  
- Next.js 15: `params` y `searchParams` son `Promise<>` — siempre `await params`  
- La función `safeParse` de Zod v4: `const result = schema.safeParse(body)` → `if (!result.success) { result.error.issues[0].message }`

**Patrón de ruta API existente** (ver `app/api/tenants/route.ts`):
```typescript
import { createClient as createServerClient } from '@/lib/supabase/server'
// ...
const supabase = await createServerClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
```

**Dashboard layout existente** (`app/(dashboard)/layout.tsx`): tiene links a `/dashboard/patients` (Pacientes) y `/dashboard/appointments` (Citas) que son placeholders — Task 7 los actualiza.

---

## Mapa de Archivos

### Nuevos archivos a crear

```
veterinaias/
├── supabase/migrations/
│   ├── 20260525000002_breeds_seed.sql          # Razas comunes por especie
│   └── 20260525000003_storage_buckets.sql      # Bucket medical-attachments + RLS
├── lib/
│   ├── validations/
│   │   ├── owner.ts                            # ownerSchema, updateOwnerSchema
│   │   ├── pet.ts                              # petSchema, updatePetSchema
│   │   └── medical-record.ts                  # medicalRecordSchema, prescriptionSchema, addendumSchema
│   └── supabase/
│       └── storage.ts                         # uploadAttachment, getAttachmentUrl helpers
├── app/
│   ├── api/
│   │   ├── species/
│   │   │   ├── route.ts                       # GET lista de especies
│   │   │   └── [id]/breeds/route.ts           # GET razas por especie
│   │   ├── owners/
│   │   │   ├── route.ts                       # GET (buscar/listar), POST (crear)
│   │   │   └── [id]/route.ts                  # GET (detalle+mascotas), PATCH (editar)
│   │   ├── pets/
│   │   │   ├── route.ts                       # POST (crear mascota)
│   │   │   └── [id]/route.ts                  # GET (perfil+historial), PATCH (editar)
│   │   ├── medical-records/
│   │   │   ├── route.ts                       # POST (crear expediente)
│   │   │   └── [id]/
│   │   │       ├── route.ts                   # GET (detalle completo)
│   │   │       └── addendums/route.ts         # POST (agregar adenda)
│   │   └── attachments/
│   │       └── route.ts                       # POST (subir archivo + guardar metadata)
│   └── (dashboard)/
│       ├── owners/
│       │   ├── page.tsx                       # Lista/búsqueda de dueños
│       │   ├── new/page.tsx                   # Formulario crear dueño
│       │   └── [ownerId]/
│       │       ├── page.tsx                   # Detalle dueño + lista mascotas
│       │       └── edit/page.tsx              # Editar dueño
│       └── pets/
│           └── [petId]/
│               ├── page.tsx                   # Perfil mascota + historial clínico
│               ├── records/
│               │   ├── new/page.tsx           # Crear expediente clínico
│               │   └── [recordId]/page.tsx    # Detalle expediente
│               └── edit/page.tsx             # Editar mascota
├── components/
│   ├── owners/
│   │   ├── OwnerSearch.tsx                    # Barra búsqueda con debounce
│   │   ├── OwnerForm.tsx                      # Crear/editar dueño (react-hook-form)
│   │   └── OwnerCard.tsx                      # Card resumen en lista
│   ├── pets/
│   │   ├── PetForm.tsx                        # Crear/editar mascota (species/breeds dinámico)
│   │   └── PetCard.tsx                        # Card resumen en detalle dueño
│   └── medical-records/
│       ├── MedicalRecordForm.tsx              # Formulario completo (vitales + recetas)
│       ├── MedicalRecordCard.tsx              # Card en timeline de historial
│       ├── PrescriptionsFields.tsx            # useFieldArray para recetas
│       ├── AddendumForm.tsx                   # Agregar adenda a expediente
│       └── AttachmentUploader.tsx             # Subida de archivos a Supabase Storage
└── __tests__/
    ├── api/
    │   ├── owners.test.ts
    │   ├── pets.test.ts
    │   └── medical-records.test.ts
    └── components/
        ├── OwnerSearch.test.tsx
        └── MedicalRecordForm.test.tsx
```

### Archivos a modificar

```
app/(dashboard)/layout.tsx        # Actualizar link Pacientes → /owners
```

---

## Task 1: Validaciones Zod

**Files:**
- Create: `veterinaias/lib/validations/owner.ts`
- Create: `veterinaias/lib/validations/pet.ts`
- Create: `veterinaias/lib/validations/medical-record.ts`

- [ ] **Step 1: Crear `lib/validations/owner.ts`**

```typescript
import { z } from 'zod'

export const ownerSchema = z.object({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(7, 'Teléfono debe tener al menos 7 caracteres'),
  address: z.string().optional(),
})

export const updateOwnerSchema = ownerSchema.partial()

export type OwnerFormValues = z.infer<typeof ownerSchema>
```

- [ ] **Step 2: Crear `lib/validations/pet.ts`**

```typescript
import { z } from 'zod'

export const petSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  owner_id: z.string().uuid('Dueño es requerido'),
  species_id: z.string().uuid('Especie es requerida'),
  breed_id: z.string().uuid().optional(),
  sex: z.enum(['male', 'female', 'unknown']),
  date_of_birth: z.string().optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  notes: z.string().optional(),
})

export const updatePetSchema = petSchema.omit({ owner_id: true }).partial()

export type PetFormValues = z.infer<typeof petSchema>
```

- [ ] **Step 3: Crear `lib/validations/medical-record.ts`**

```typescript
import { z } from 'zod'

export const prescriptionSchema = z.object({
  medication_name: z.string().min(1, 'Nombre del medicamento es requerido'),
  dosage: z.string().min(1, 'Dosis es requerida'),
  frequency: z.string().min(1, 'Frecuencia es requerida'),
  duration: z.string().min(1, 'Duración es requerida'),
  notes: z.string().optional(),
})

export const medicalRecordSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  reason: z.string().min(1, 'Motivo de consulta es requerido'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  weight_kg: z.coerce.number().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  temperature_celsius: z.coerce.number().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  heart_rate_bpm: z.coerce.number().int().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  respiratory_rate_bpm: z.coerce.number().int().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  prescriptions: z.array(prescriptionSchema).default([]),
})

export const addendumSchema = z.object({
  content: z.string().min(1, 'El contenido de la adenda es requerido'),
})

export type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>
export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>
export type AddendumFormValues = z.infer<typeof addendumSchema>
```

- [ ] **Step 4: Commit**

```bash
cd veterinaias
git add lib/validations/owner.ts lib/validations/pet.ts lib/validations/medical-record.ts
git commit -m "feat: add Zod validation schemas for owners, pets, and medical records"
```

---

## Task 2: Migraciones — Razas y Storage

**Files:**
- Create: `veterinaias/supabase/migrations/20260525000002_breeds_seed.sql`
- Create: `veterinaias/supabase/migrations/20260525000003_storage_buckets.sql`

- [ ] **Step 1: Crear `supabase/migrations/20260525000002_breeds_seed.sql`**

```sql
-- Seed: razas comunes
-- Perro (buscar UUID de 'Perro')
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Labrador Retriever'), ('Golden Retriever'), ('Bulldog'), ('Pastor Alemán'),
  ('Caniche/Poodle'), ('Chihuahua'), ('Beagle'), ('Yorkshire Terrier'),
  ('Shih Tzu'), ('Boxer'), ('Schnauzer'), ('Dálmata'), ('Mestizo')
) AS b(name)
WHERE s.name = 'Perro'
ON CONFLICT (species_id, name) DO NOTHING;

-- Gato
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Siamés'), ('Persa'), ('Maine Coon'), ('Bengalí'), ('Ragdoll'),
  ('Angora'), ('Abisinio'), ('British Shorthair'), ('Mestizo')
) AS b(name)
WHERE s.name = 'Gato'
ON CONFLICT (species_id, name) DO NOTHING;

-- Conejo
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Holland Lop'), ('Mini Rex'), ('Angora Inglés'), ('Cabeza de León'), ('Mestizo')
) AS b(name)
WHERE s.name = 'Conejo'
ON CONFLICT (species_id, name) DO NOTHING;
```

- [ ] **Step 2: Crear `supabase/migrations/20260525000003_storage_buckets.sql`**

```sql
-- Bucket para archivos adjuntos de expedientes clínicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-attachments',
  'medical-attachments',
  false,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/dicom']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: solo usuarios autenticados pueden subir
CREATE POLICY "authenticated_upload_attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-attachments');

-- RLS: solo usuarios autenticados pueden leer
CREATE POLICY "authenticated_read_attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-attachments');

-- RLS: el creador puede eliminar (path empieza con su user_id)
CREATE POLICY "creator_delete_attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medical-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

- [ ] **Step 3: Aplicar las migraciones al proyecto Supabase via MCP**

Usar la herramienta MCP `mcp__plugin_supabase_supabase__apply_migration` para aplicar cada migración.

Proyecto: `qgruuhrgwgjduzlctdlx`

Primero `20260525000002_breeds_seed.sql`, luego `20260525000003_storage_buckets.sql`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000002_breeds_seed.sql supabase/migrations/20260525000003_storage_buckets.sql
git commit -m "feat: add breeds seed data and Supabase Storage bucket for medical attachments"
```

---

## Task 3: API Owners

**Files:**
- Create: `veterinaias/app/api/owners/route.ts`
- Create: `veterinaias/app/api/owners/[id]/route.ts`
- Create: `veterinaias/__tests__/api/owners.test.ts`

- [ ] **Step 1: Escribir tests para owners API**

Crear `__tests__/api/owners.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/owners/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

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

  it('returns 422 when phone is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/owners', {
      method: 'POST',
      body: JSON.stringify({ full_name: 'Ana García' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when owner is created', async () => {
    const mockOwner = { id: 'owner-1', full_name: 'Ana García', phone: '5551234567', email: null, address: null }
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockOwner, error: null }),
      }),
    } as any)
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
  it('returns owners list when authenticated', async () => {
    const mockOwners = [{ id: 'owner-1', full_name: 'Ana García', phone: '555', email: null }]
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockOwners, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/owners')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Verificar que tests fallan**

```bash
cd veterinaias && npx vitest run __tests__/api/owners.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/owners/route'"

- [ ] **Step 3: Crear `app/api/owners/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ownerSchema } from '@/lib/validations/owner'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  let query = supabase
    .from('owners')
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

  const { email, ...rest } = result.data
  const { data, error } = await supabase
    .from('owners')
    .insert({ ...rest, email: email || null })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe un dueño con ese email' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 4: Crear `app/api/owners/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { updateOwnerSchema } from '@/lib/validations/owner'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('owners')
    .select(`
      id, full_name, email, phone, address, created_at, updated_at,
      pets (
        id, name, sex, date_of_birth, color, microchip, notes, created_at,
        species:species_id(id, name),
        breed:breed_id(id, name)
      )
    `)
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateOwnerSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { email, ...rest } = result.data
  const update: Record<string, unknown> = { ...rest }
  if (email !== undefined) update.email = email || null

  const { data, error } = await supabase
    .from('owners')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe un dueño con ese email' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 5: Verificar tests pasan**

```bash
npx vitest run __tests__/api/owners.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 6: Crear `app/api/species/route.ts` y `app/api/species/[id]/breeds/route.ts`**

`app/api/species/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase.from('species').select('id, name').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

`app/api/species/[id]/breeds/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('breeds')
    .select('id, name')
    .eq('species_id', id)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 7: Commit**

```bash
git add app/api/owners/ app/api/species/ __tests__/api/owners.test.ts
git commit -m "feat: add owners and species/breeds API routes"
```

---

## Task 4: API Pets

**Files:**
- Create: `veterinaias/app/api/pets/route.ts`
- Create: `veterinaias/app/api/pets/[id]/route.ts`
- Create: `veterinaias/__tests__/api/pets.test.ts`

- [ ] **Step 1: Escribir tests para pets API**

Crear `__tests__/api/pets.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/pets/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validPetBody = {
  name: 'Max',
  owner_id: '00000000-0000-0000-0000-000000000001',
  species_id: '00000000-0000-0000-0000-000000000002',
  sex: 'male',
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

  it('returns 422 when name is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ owner_id: validPetBody.owner_id, species_id: validPetBody.species_id, sex: 'male' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when pet is created', async () => {
    const mockPet = { id: 'pet-1', ...validPetBody }
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPet, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify(validPetBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Verificar que tests fallan**

```bash
npx vitest run __tests__/api/pets.test.ts
```

Expected: FAIL

- [ ] **Step 3: Crear `app/api/pets/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { petSchema } from '@/lib/validations/pet'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = petSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { date_of_birth, breed_id, ...rest } = result.data
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...rest, date_of_birth: date_of_birth || null, breed_id: breed_id || null })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe una mascota con ese microchip' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 4: Crear `app/api/pets/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { updatePetSchema } from '@/lib/validations/pet'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('pets')
    .select(`
      id, name, sex, date_of_birth, color, microchip, notes, created_at, updated_at,
      owner:owner_id(id, full_name, email, phone),
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
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updatePetSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { date_of_birth, breed_id, ...rest } = result.data
  const update: Record<string, unknown> = { ...rest }
  if (date_of_birth !== undefined) update.date_of_birth = date_of_birth || null
  if (breed_id !== undefined) update.breed_id = breed_id || null

  const { data, error } = await supabase
    .from('pets')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe una mascota con ese microchip' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 5: Verificar tests pasan**

```bash
npx vitest run __tests__/api/pets.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add app/api/pets/ __tests__/api/pets.test.ts
git commit -m "feat: add pets API routes (create, get with history, update)"
```

---

## Task 5: API Medical Records

**Files:**
- Create: `veterinaias/app/api/medical-records/route.ts`
- Create: `veterinaias/app/api/medical-records/[id]/route.ts`
- Create: `veterinaias/__tests__/api/medical-records.test.ts`

- [ ] **Step 1: Escribir tests para medical-records API**

Crear `__tests__/api/medical-records.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/medical-records/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/server'

const validRecordBody = {
  pet_id: '00000000-0000-0000-0000-000000000001',
  reason: 'Revisión general',
}

describe('POST /api/medical-records', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error() }) },
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(validRecordBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no tenant', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: null }, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(validRecordBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 422 when reason is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null }),
      }),
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify({ pet_id: validRecordBody.pet_id }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 when record is created', async () => {
    const mockRecord = { id: 'rec-1', ...validRecordBody, tenant_id: 'tenant-1', created_by: 'user-1' }
    const mockFrom = vi.fn()
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null }),
      })
      .mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: mockFrom,
    } as any)
    const req = new NextRequest('http://localhost/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(validRecordBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Verificar que tests fallan**

```bash
npx vitest run __tests__/api/medical-records.test.ts
```

Expected: FAIL

- [ ] **Step 3: Crear `app/api/medical-records/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { medicalRecordSchema } from '@/lib/validations/medical-record'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'No hay clínica asociada a tu cuenta' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = medicalRecordSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { prescriptions, weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm, ...rest } = result.data

  const { data: record, error: recordError } = await supabase
    .from('medical_records')
    .insert({
      ...rest,
      weight_kg: weight_kg ?? null,
      temperature_celsius: temperature_celsius ?? null,
      heart_rate_bpm: heart_rate_bpm ?? null,
      respiratory_rate_bpm: respiratory_rate_bpm ?? null,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 })

  if (prescriptions && prescriptions.length > 0) {
    const { error: presError } = await supabase
      .from('prescriptions')
      .insert(prescriptions.map(p => ({ ...p, medical_record_id: record.id })))
    if (presError) return NextResponse.json({ error: presError.message }, { status: 500 })
  }

  return NextResponse.json({ data: record }, { status: 201 })
}
```

- [ ] **Step 4: Crear `app/api/medical-records/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('medical_records')
    .select(`
      id, reason, diagnosis, treatment, notes,
      weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
      created_at, tenant_id,
      pet:pet_id(id, name, species:species_id(name), owner:owner_id(full_name, phone)),
      created_by_profile:created_by(full_name),
      prescriptions(id, medication_name, dosage, frequency, duration, notes),
      attachments(id, file_name, file_type, storage_path, created_at),
      addendums(id, content, created_at, created_by_profile:created_by(full_name))
    `)
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 5: Verificar tests pasan**

```bash
npx vitest run __tests__/api/medical-records.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add app/api/medical-records/ __tests__/api/medical-records.test.ts
git commit -m "feat: add medical records API routes (create with prescriptions, get detail)"
```

---

## Task 6: Adendas, Adjuntos y Storage Helper

**Files:**
- Create: `veterinaias/app/api/medical-records/[id]/addendums/route.ts`
- Create: `veterinaias/app/api/attachments/route.ts`
- Create: `veterinaias/lib/supabase/storage.ts`

- [ ] **Step 1: Crear `app/api/medical-records/[id]/addendums/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { addendumSchema } from '@/lib/validations/medical-record'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = addendumSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await supabase
    .from('addendums')
    .insert({ medical_record_id: id, content: result.data.content, created_by: user.id })
    .select('id, content, created_at, created_by_profile:created_by(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Crear `lib/supabase/storage.ts`**

```typescript
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'medical-attachments'

export async function uploadAttachment(
  file: File,
  userId: string,
  recordId: string
): Promise<{ path: string }> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${recordId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) throw new Error(error.message)
  return { path }
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60) // 1 hora

  if (!data?.signedUrl) throw new Error('No se pudo generar la URL del archivo')
  return data.signedUrl
}
```

- [ ] **Step 3: Crear `app/api/attachments/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { storage_path, file_name, file_type, medical_record_id } = await req.json().catch(() => ({}))

  if (!storage_path || !file_name || !file_type || !medical_record_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('attachments')
    .insert({ storage_path, file_name, file_type, medical_record_id, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/medical-records/[id]/addendums/ app/api/attachments/ lib/supabase/storage.ts
git commit -m "feat: add addendums and attachments API routes, Supabase Storage helper"
```

---

## Task 7: Página Owners List + Actualizar Sidebar

**Files:**
- Modify: `veterinaias/app/(dashboard)/layout.tsx`
- Create: `veterinaias/app/(dashboard)/owners/page.tsx`
- Create: `veterinaias/components/owners/OwnerSearch.tsx`
- Create: `veterinaias/components/owners/OwnerCard.tsx`

- [ ] **Step 1: Actualizar dashboard layout para agregar link Dueños**

En `app/(dashboard)/layout.tsx` reemplazar el bloque `<nav>`:

```tsx
<nav className="flex-1 p-4 space-y-1">
  <Link href="/dashboard" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Inicio</Link>
  <Link href="/dashboard/owners" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Dueños y Mascotas</Link>
  <Link href="/dashboard/appointments" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Citas</Link>
  {profile?.role === 'admin' && (
    <Link href="/dashboard/settings/team" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Equipo</Link>
  )}
</nav>
```

- [ ] **Step 2: Crear `components/owners/OwnerSearch.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'

interface Owner {
  id: string
  full_name: string
  email: string | null
  phone: string
}

interface OwnerSearchProps {
  onResults: (owners: Owner[]) => void
  onLoadingChange: (loading: boolean) => void
}

export function OwnerSearch({ onResults, onLoadingChange }: OwnerSearchProps) {
  const [query, setQuery] = useState('')

  const search = useCallback(async (q: string) => {
    onLoadingChange(true)
    try {
      const url = q.trim() ? `/api/owners?q=${encodeURIComponent(q)}` : '/api/owners'
      const res = await fetch(url)
      const json = await res.json()
      onResults(json.data ?? [])
    } finally {
      onLoadingChange(false)
    }
  }, [onResults, onLoadingChange])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  return (
    <Input
      placeholder="Buscar por nombre, teléfono o email..."
      value={query}
      onChange={e => setQuery(e.target.value)}
      className="max-w-md"
    />
  )
}
```

- [ ] **Step 3: Crear `components/owners/OwnerCard.tsx`**

```tsx
import Link from 'next/link'

interface OwnerCardProps {
  owner: {
    id: string
    full_name: string
    email: string | null
    phone: string
  }
}

export function OwnerCard({ owner }: OwnerCardProps) {
  return (
    <Link
      href={`/dashboard/owners/${owner.id}`}
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
    >
      <div>
        <p className="font-medium text-slate-900">{owner.full_name}</p>
        <p className="text-sm text-slate-500">{owner.phone}{owner.email ? ` · ${owner.email}` : ''}</p>
      </div>
      <span className="text-slate-400 text-sm">Ver →</span>
    </Link>
  )
}
```

- [ ] **Step 4: Crear `app/(dashboard)/owners/page.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { OwnerSearch } from '@/components/owners/OwnerSearch'
import { OwnerCard } from '@/components/owners/OwnerCard'
import { Button } from '@/components/ui/button'

interface Owner {
  id: string
  full_name: string
  email: string | null
  phone: string
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/owners')
      .then(r => r.json())
      .then(json => { setOwners(json.data ?? []); setLoading(false) })
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dueños y Mascotas</h1>
        <Button asChild>
          <Link href="/dashboard/owners/new">+ Nuevo dueño</Link>
        </Button>
      </div>
      <div className="mb-4">
        <OwnerSearch onResults={setOwners} onLoadingChange={setLoading} />
      </div>
      {loading ? (
        <p className="text-slate-500 text-sm">Cargando...</p>
      ) : owners.length === 0 ? (
        <p className="text-slate-500 text-sm">No se encontraron dueños.</p>
      ) : (
        <div className="space-y-2">
          {owners.map(owner => <OwnerCard key={owner.id} owner={owner} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Escribir test para OwnerSearch**

Crear `__tests__/components/OwnerSearch.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { OwnerSearch } from '@/components/owners/OwnerSearch'

global.fetch = vi.fn()

describe('OwnerSearch', () => {
  it('renders search input', () => {
    render(<OwnerSearch onResults={vi.fn()} onLoadingChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument()
  })

  it('calls fetch after typing with debounce', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ data: [] }),
    } as Response)

    const onResults = vi.fn()
    render(<OwnerSearch onResults={onResults} onLoadingChange={vi.fn()} />)
    const input = screen.getByPlaceholderText(/buscar/i)

    await act(async () => {
      await userEvent.type(input, 'Ana')
      await new Promise(r => setTimeout(r, 400))
    })

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=Ana'))
  })
})
```

- [ ] **Step 6: Verificar tests pasan**

```bash
npx vitest run __tests__/components/OwnerSearch.test.tsx
```

Expected: PASS — 2 tests

- [ ] **Step 7: Commit**

```bash
git add app/\(dashboard\)/layout.tsx app/\(dashboard\)/owners/page.tsx components/owners/ __tests__/components/OwnerSearch.test.tsx
git commit -m "feat: add owners list page with search and sidebar navigation update"
```

---

## Task 8: Formularios Owner y Pet + Página Owner Detail

**Files:**
- Create: `veterinaias/components/owners/OwnerForm.tsx`
- Create: `veterinaias/components/pets/PetForm.tsx`
- Create: `veterinaias/components/pets/PetCard.tsx`
- Create: `veterinaias/app/(dashboard)/owners/new/page.tsx`
- Create: `veterinaias/app/(dashboard)/owners/[ownerId]/page.tsx`
- Create: `veterinaias/app/(dashboard)/owners/[ownerId]/edit/page.tsx`

- [ ] **Step 1: Crear `components/owners/OwnerForm.tsx`**

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { ownerSchema, type OwnerFormValues } from '@/lib/validations/owner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OwnerFormProps {
  defaultValues?: Partial<OwnerFormValues>
  ownerId?: string
}

export function OwnerForm({ defaultValues, ownerId }: OwnerFormProps) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues: defaultValues ?? { sex: undefined },
  })

  const onSubmit = async (values: OwnerFormValues) => {
    const url = ownerId ? `/api/owners/${ownerId}` : '/api/owners'
    const method = ownerId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    router.push(`/dashboard/owners/${ownerId ?? json.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="full_name">Nombre completo *</Label>
        <Input id="full_name" {...register('full_name')} />
        {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Teléfono *</Label>
        <Input id="phone" {...register('phone')} />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" {...register('address')} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : ownerId ? 'Guardar cambios' : 'Crear dueño'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Crear `components/pets/PetCard.tsx`**

```tsx
import Link from 'next/link'

interface PetCardProps {
  pet: {
    id: string
    name: string
    sex: string
    date_of_birth: string | null
    color: string | null
    species: { name: string } | null
    breed: { name: string } | null
  }
}

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

export function PetCard({ pet }: PetCardProps) {
  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
    >
      <div>
        <p className="font-medium text-slate-900">{pet.name}</p>
        <p className="text-sm text-slate-500">
          {pet.species?.name ?? ''}{pet.breed ? ` · ${pet.breed.name}` : ''} · {SEX_LABELS[pet.sex] ?? pet.sex}
          {pet.color ? ` · ${pet.color}` : ''}
        </p>
      </div>
      <span className="text-slate-400 text-sm">Expediente →</span>
    </Link>
  )
}
```

- [ ] **Step 3: Crear `components/pets/PetForm.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { petSchema, type PetFormValues } from '@/lib/validations/pet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Species { id: string; name: string }
interface Breed { id: string; name: string }

interface PetFormProps {
  ownerId: string
  petId?: string
  defaultValues?: Partial<PetFormValues>
}

export function PetForm({ ownerId, petId, defaultValues }: PetFormProps) {
  const router = useRouter()
  const [species, setSpecies] = useState<Species[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: { ...defaultValues, owner_id: ownerId, sex: defaultValues?.sex ?? 'unknown' },
  })

  const selectedSpeciesId = watch('species_id')

  useEffect(() => {
    fetch('/api/species').then(r => r.json()).then(j => setSpecies(j.data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedSpeciesId) return
    fetch(`/api/species/${selectedSpeciesId}/breeds`).then(r => r.json()).then(j => setBreeds(j.data ?? []))
  }, [selectedSpeciesId])

  const onSubmit = async (values: PetFormValues) => {
    const url = petId ? `/api/pets/${petId}` : '/api/pets'
    const method = petId ? 'PATCH' : 'POST'
    const payload = petId ? (() => { const { owner_id, ...rest } = values; return rest })() : values
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    const petResultId = petId ?? json.data.id
    router.push(`/dashboard/owners/${ownerId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <input type="hidden" {...register('owner_id')} />
      <div>
        <Label htmlFor="name">Nombre de la mascota *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="species_id">Especie *</Label>
        <select id="species_id" {...register('species_id')} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
          <option value="">Seleccionar especie</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {errors.species_id && <p className="text-red-500 text-sm mt-1">{errors.species_id.message}</p>}
      </div>
      {breeds.length > 0 && (
        <div>
          <Label htmlFor="breed_id">Raza</Label>
          <select id="breed_id" {...register('breed_id')} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            <option value="">Sin especificar</option>
            {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <Label htmlFor="sex">Sexo *</Label>
        <select id="sex" {...register('sex')} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
          <option value="unknown">Desconocido</option>
          <option value="male">Macho</option>
          <option value="female">Hembra</option>
        </select>
      </div>
      <div>
        <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
        <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
      </div>
      <div>
        <Label htmlFor="color">Color</Label>
        <Input id="color" {...register('color')} placeholder="ej. café con blanco" />
      </div>
      <div>
        <Label htmlFor="microchip">Microchip</Label>
        <Input id="microchip" {...register('microchip')} />
      </div>
      <div>
        <Label htmlFor="notes">Notas</Label>
        <Input id="notes" {...register('notes')} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : petId ? 'Guardar cambios' : 'Agregar mascota'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Crear `app/(dashboard)/owners/new/page.tsx`**

```tsx
import { OwnerForm } from '@/components/owners/OwnerForm'

export default function NewOwnerPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nuevo dueño</h1>
      <OwnerForm />
    </div>
  )
}
```

- [ ] **Step 5: Crear `app/(dashboard)/owners/[ownerId]/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PetCard } from '@/components/pets/PetCard'
import { Button } from '@/components/ui/button'

export default async function OwnerDetailPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await supabase
    .from('owners')
    .select(`
      id, full_name, email, phone, address, created_at,
      pets(
        id, name, sex, date_of_birth, color, microchip,
        species:species_id(id, name),
        breed:breed_id(id, name)
      )
    `)
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/dashboard/owners" className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">← Dueños</Link>
          <h1 className="text-2xl font-bold text-slate-900">{owner.full_name}</h1>
          <p className="text-slate-500">{owner.phone}{owner.email ? ` · ${owner.email}` : ''}</p>
          {owner.address && <p className="text-slate-500 text-sm">{owner.address}</p>}
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/owners/${ownerId}/edit`}>Editar</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-800">Mascotas</h2>
        <Button asChild size="sm">
          <Link href={`/dashboard/owners/${ownerId}/pets/new`}>+ Agregar mascota</Link>
        </Button>
      </div>

      {(owner.pets as any[]).length === 0 ? (
        <p className="text-slate-500 text-sm">Este dueño no tiene mascotas registradas.</p>
      ) : (
        <div className="space-y-2">
          {(owner.pets as any[]).map((pet: any) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Crear `app/(dashboard)/owners/[ownerId]/edit/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OwnerForm } from '@/components/owners/OwnerForm'

export default async function EditOwnerPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await supabase
    .from('owners')
    .select('id, full_name, email, phone, address')
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Editar dueño</h1>
      <OwnerForm
        ownerId={owner.id}
        defaultValues={{
          full_name: owner.full_name,
          phone: owner.phone,
          email: owner.email ?? '',
          address: owner.address ?? '',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 7: Crear ruta para nueva mascota desde detalle de dueño**

Crear `app/(dashboard)/owners/[ownerId]/pets/new/page.tsx`:

```tsx
import { PetForm } from '@/components/pets/PetForm'

export default async function NewPetPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nueva mascota</h1>
      <PetForm ownerId={ownerId} />
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add components/owners/ components/pets/ app/\(dashboard\)/owners/
git commit -m "feat: add owner and pet forms, owner detail page with pets list"
```

---

## Task 9: Página Pet Detail (Perfil + Historial Clínico)

**Files:**
- Create: `veterinaias/app/(dashboard)/pets/[petId]/page.tsx`
- Create: `veterinaias/components/medical-records/MedicalRecordCard.tsx`

- [ ] **Step 1: Crear `components/medical-records/MedicalRecordCard.tsx`**

```tsx
import Link from 'next/link'

interface MedicalRecordCardProps {
  record: {
    id: string
    reason: string
    diagnosis: string | null
    created_at: string
    weight_kg: number | null
    created_by_profile: { full_name: string } | null
    prescriptions: Array<{ id: string; medication_name: string }>
    attachments: Array<{ id: string }>
    addendums: Array<{ id: string }>
  }
  petId: string
}

export function MedicalRecordCard({ record, petId }: MedicalRecordCardProps) {
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Link
      href={`/dashboard/pets/${petId}/records/${record.id}`}
      className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-slate-900">{record.reason}</p>
          {record.diagnosis && <p className="text-sm text-slate-600 mt-1">{record.diagnosis}</p>}
          <div className="flex gap-3 mt-2 text-xs text-slate-400">
            <span>{date}</span>
            {record.weight_kg && <span>· {record.weight_kg} kg</span>}
            {record.created_by_profile && <span>· Dr. {record.created_by_profile.full_name}</span>}
            {record.prescriptions.length > 0 && <span>· {record.prescriptions.length} receta(s)</span>}
            {record.attachments.length > 0 && <span>· {record.attachments.length} adjunto(s)</span>}
            {record.addendums.length > 0 && <span>· {record.addendums.length} adenda(s)</span>}
          </div>
        </div>
        <span className="text-slate-400 text-sm ml-4">Ver →</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Crear `app/(dashboard)/pets/[petId]/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordCard } from '@/components/medical-records/MedicalRecordCard'
import { Button } from '@/components/ui/button'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await supabase
    .from('pets')
    .select(`
      id, name, sex, date_of_birth, color, microchip, notes, created_at,
      owner:owner_id(id, full_name),
      species:species_id(name),
      breed:breed_id(name),
      medical_records(
        id, reason, diagnosis, weight_kg, created_at,
        created_by_profile:created_by(full_name),
        prescriptions(id),
        attachments(id),
        addendums(id)
      )
    `)
    .eq('id', petId)
    .order('created_at', { referencedTable: 'medical_records', ascending: false })
    .single()

  if (error || !pet) notFound()

  const owner = pet.owner as any
  const species = pet.species as any
  const breed = pet.breed as any
  const records = (pet.medical_records as any[]) ?? []

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/dashboard/owners/${owner?.id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">
        ← {owner?.full_name}
      </Link>

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pet.name}</h1>
            <p className="text-slate-500 mt-1">
              {species?.name}{breed ? ` · ${breed.name}` : ''} · {SEX_LABELS[pet.sex] ?? pet.sex}
              {pet.color ? ` · ${pet.color}` : ''}
            </p>
            {pet.date_of_birth && (
              <p className="text-slate-500 text-sm mt-1">
                Nacimiento: {new Date(pet.date_of_birth).toLocaleDateString('es-MX')}
              </p>
            )}
            {pet.microchip && <p className="text-slate-500 text-sm">Microchip: {pet.microchip}</p>}
            {pet.notes && <p className="text-slate-600 text-sm mt-2 italic">{pet.notes}</p>}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/pets/${petId}/edit`}>Editar</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Historial Clínico ({records.length})</h2>
        <Button asChild>
          <Link href={`/dashboard/pets/${petId}/records/new`}>+ Nuevo expediente</Link>
        </Button>
      </div>

      {records.length === 0 ? (
        <p className="text-slate-500 text-sm">No hay expedientes registrados para esta mascota.</p>
      ) : (
        <div className="space-y-3">
          {records.map((record: any) => (
            <MedicalRecordCard key={record.id} record={record} petId={petId} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Crear `app/(dashboard)/pets/[petId]/edit/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PetForm } from '@/components/pets/PetForm'

export default async function EditPetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await supabase
    .from('pets')
    .select('id, name, owner_id, species_id, breed_id, sex, date_of_birth, color, microchip, notes')
    .eq('id', petId)
    .single()

  if (error || !pet) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Editar mascota</h1>
      <PetForm
        ownerId={pet.owner_id}
        petId={pet.id}
        defaultValues={{
          name: pet.name,
          species_id: pet.species_id,
          breed_id: pet.breed_id ?? undefined,
          sex: pet.sex as 'male' | 'female' | 'unknown',
          date_of_birth: pet.date_of_birth ?? undefined,
          color: pet.color ?? undefined,
          microchip: pet.microchip ?? undefined,
          notes: pet.notes ?? undefined,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/medical-records/MedicalRecordCard.tsx app/\(dashboard\)/pets/
git commit -m "feat: add pet detail page with clinical history timeline"
```

---

## Task 10: Formulario de Expediente Clínico

**Files:**
- Create: `veterinaias/components/medical-records/PrescriptionsFields.tsx`
- Create: `veterinaias/components/medical-records/MedicalRecordForm.tsx`
- Create: `veterinaias/app/(dashboard)/pets/[petId]/records/new/page.tsx`

- [ ] **Step 1: Crear `components/medical-records/PrescriptionsFields.tsx`**

```tsx
'use client'
import { useFieldArray, Control } from 'react-hook-form'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PrescriptionsFieldsProps {
  control: Control<MedicalRecordFormValues>
}

export function PrescriptionsFields({ control }: PrescriptionsFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'prescriptions' })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Recetas médicas</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ medication_name: '', dosage: '', frequency: '', duration: '', notes: '' })}
        >
          + Agregar medicamento
        </Button>
      </div>
      {fields.map((field, index) => (
        <div key={field.id} className="border border-slate-200 rounded p-3 mb-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Medicamento *</Label>
              <Input {...control.register(`prescriptions.${index}.medication_name`)} placeholder="ej. Amoxicilina" />
            </div>
            <div>
              <Label className="text-xs">Dosis *</Label>
              <Input {...control.register(`prescriptions.${index}.dosage`)} placeholder="ej. 250mg" />
            </div>
            <div>
              <Label className="text-xs">Frecuencia *</Label>
              <Input {...control.register(`prescriptions.${index}.frequency`)} placeholder="ej. Cada 8 horas" />
            </div>
            <div>
              <Label className="text-xs">Duración *</Label>
              <Input {...control.register(`prescriptions.${index}.duration`)} placeholder="ej. 7 días" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notas</Label>
            <Input {...control.register(`prescriptions.${index}.notes`)} placeholder="Instrucciones adicionales" />
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => remove(index)}>
            Eliminar
          </Button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Escribir test para MedicalRecordForm**

Crear `__tests__/components/MedicalRecordForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MedicalRecordForm } from '@/components/medical-records/MedicalRecordForm'

describe('MedicalRecordForm', () => {
  it('renders required fields', () => {
    render(<MedicalRecordForm petId="pet-1" />)
    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
  })

  it('renders prescriptions section', () => {
    render(<MedicalRecordForm petId="pet-1" />)
    expect(screen.getByText(/recetas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar medicamento/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Verificar que tests fallan**

```bash
npx vitest run __tests__/components/MedicalRecordForm.test.tsx
```

Expected: FAIL

- [ ] **Step 4: Crear `components/medical-records/MedicalRecordForm.tsx`**

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { medicalRecordSchema, type MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { PrescriptionsFields } from './PrescriptionsFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MedicalRecordFormProps {
  petId: string
}

export function MedicalRecordForm({ petId }: MedicalRecordFormProps) {
  const router = useRouter()
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: { pet_id: petId, prescriptions: [] },
  })

  const onSubmit = async (values: MedicalRecordFormValues) => {
    const res = await fetch('/api/medical-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    router.push(`/dashboard/pets/${petId}/records/${json.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('pet_id')} />

      <div>
        <Label htmlFor="reason">Motivo de consulta *</Label>
        <Input id="reason" {...register('reason')} placeholder="Razón de la visita" />
        {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="diagnosis">Diagnóstico</Label>
          <textarea id="diagnosis" {...register('diagnosis')} rows={3}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
            placeholder="Diagnóstico del veterinario"
          />
        </div>
        <div>
          <Label htmlFor="treatment">Tratamiento</Label>
          <textarea id="treatment" {...register('treatment')} rows={3}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
            placeholder="Tratamiento indicado"
          />
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Signos Vitales</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label htmlFor="weight_kg" className="text-xs">Peso (kg)</Label>
            <Input id="weight_kg" type="number" step="0.01" {...register('weight_kg')} placeholder="ej. 12.5" />
          </div>
          <div>
            <Label htmlFor="temperature_celsius" className="text-xs">Temperatura (°C)</Label>
            <Input id="temperature_celsius" type="number" step="0.1" {...register('temperature_celsius')} placeholder="ej. 38.5" />
          </div>
          <div>
            <Label htmlFor="heart_rate_bpm" className="text-xs">Frecuencia cardíaca (lpm)</Label>
            <Input id="heart_rate_bpm" type="number" {...register('heart_rate_bpm')} placeholder="ej. 80" />
          </div>
          <div>
            <Label htmlFor="respiratory_rate_bpm" className="text-xs">Frecuencia respiratoria (rpm)</Label>
            <Input id="respiratory_rate_bpm" type="number" {...register('respiratory_rate_bpm')} placeholder="ej. 20" />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas del veterinario</Label>
        <textarea id="notes" {...register('notes')} rows={3}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
          placeholder="Observaciones adicionales"
        />
      </div>

      <PrescriptionsFields control={control} />

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar expediente'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Verificar tests pasan**

```bash
npx vitest run __tests__/components/MedicalRecordForm.test.tsx
```

Expected: PASS — 2 tests

- [ ] **Step 6: Crear `app/(dashboard)/pets/[petId]/records/new/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordForm } from '@/components/medical-records/MedicalRecordForm'

export default async function NewRecordPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await supabase
    .from('pets')
    .select('id, name, owner_id')
    .eq('id', petId)
    .single()

  if (error || !pet) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/dashboard/pets/${petId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">
        ← {pet.name}
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nuevo Expediente Clínico</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
        ⚠️ Este expediente será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
      </div>
      <MedicalRecordForm petId={petId} />
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add components/medical-records/ app/\(dashboard\)/pets/\[petId\]/records/new/ __tests__/components/MedicalRecordForm.test.tsx
git commit -m "feat: add medical record form with vitals, prescriptions, and create page"
```

---

## Task 11: Página Detalle de Expediente + Adendas + Adjuntos

**Files:**
- Create: `veterinaias/components/medical-records/AddendumForm.tsx`
- Create: `veterinaias/components/medical-records/AttachmentUploader.tsx`
- Create: `veterinaias/app/(dashboard)/pets/[petId]/records/[recordId]/page.tsx`

- [ ] **Step 1: Crear `components/medical-records/AddendumForm.tsx`**

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { addendumSchema, type AddendumFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface AddendumFormProps {
  recordId: string
  onAdded: (addendum: { id: string; content: string; created_at: string; created_by_profile: { full_name: string } | null }) => void
}

export function AddendumForm({ recordId, onAdded }: AddendumFormProps) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddendumFormValues>({
    resolver: zodResolver(addendumSchema),
  })

  const onSubmit = async (values: AddendumFormValues) => {
    const res = await fetch(`/api/medical-records/${recordId}/addendums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    onAdded(json.data)
    reset()
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Agregar adenda
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border border-slate-200 rounded-lg p-4 space-y-3">
      <div>
        <Label htmlFor="content">Adenda</Label>
        <textarea
          id="content"
          {...register('content')}
          rows={3}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none mt-1"
          placeholder="Corrección o nota adicional sobre este expediente..."
        />
        {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar adenda'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Crear `components/medical-records/AttachmentUploader.tsx`**

```tsx
'use client'
import { useRef, useState } from 'react'
import { uploadAttachment } from '@/lib/supabase/storage'
import { Button } from '@/components/ui/button'

interface AttachmentUploaderProps {
  recordId: string
  userId: string
  onUploaded: (attachment: { id: string; file_name: string; file_type: string; storage_path: string }) => void
}

export function AttachmentUploader({ recordId, userId, onUploaded }: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const { path } = await uploadAttachment(file, userId, recordId)
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: path,
          file_name: file.name,
          file_type: file.type,
          medical_record_id: recordId,
        }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error); return }
      onUploaded(json.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Subiendo...' : '+ Adjuntar archivo'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Crear `app/(dashboard)/pets/[petId]/records/[recordId]/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AddendumForm } from '@/components/medical-records/AddendumForm'
import { AttachmentUploader } from '@/components/medical-records/AttachmentUploader'
import { RecordDetailClient } from '@/components/medical-records/RecordDetailClient'

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ petId: string; recordId: string }>
}) {
  const { petId, recordId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: record, error } = await supabase
    .from('medical_records')
    .select(`
      id, reason, diagnosis, treatment, notes,
      weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
      created_at,
      pet:pet_id(id, name, owner:owner_id(id, full_name)),
      created_by_profile:created_by(full_name),
      prescriptions(id, medication_name, dosage, frequency, duration, notes),
      attachments(id, file_name, file_type, storage_path, created_at),
      addendums(id, content, created_at, created_by_profile:created_by(full_name))
    `)
    .eq('id', recordId)
    .single()

  if (error || !record) notFound()

  const pet = record.pet as any
  const createdBy = record.created_by_profile as any
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/dashboard/pets/${petId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">
        ← {pet?.name}
      </Link>

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{record.reason}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {date} · {createdBy?.full_name ?? 'Veterinario'}
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Inmutable</span>
        </div>

        {record.diagnosis && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Diagnóstico</p>
            <p className="text-slate-700">{record.diagnosis}</p>
          </div>
        )}

        {record.treatment && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Tratamiento</p>
            <p className="text-slate-700">{record.treatment}</p>
          </div>
        )}

        {(record.weight_kg || record.temperature_celsius || record.heart_rate_bpm || record.respiratory_rate_bpm) && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Signos Vitales</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.weight_kg && <span className="text-slate-600">Peso: <strong>{record.weight_kg} kg</strong></span>}
              {record.temperature_celsius && <span className="text-slate-600">Temperatura: <strong>{record.temperature_celsius} °C</strong></span>}
              {record.heart_rate_bpm && <span className="text-slate-600">F. Cardíaca: <strong>{record.heart_rate_bpm} lpm</strong></span>}
              {record.respiratory_rate_bpm && <span className="text-slate-600">F. Respiratoria: <strong>{record.respiratory_rate_bpm} rpm</strong></span>}
            </div>
          </div>
        )}

        {record.notes && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notas</p>
            <p className="text-slate-600 text-sm italic">{record.notes}</p>
          </div>
        )}

        {(record.prescriptions as any[]).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Recetas</p>
            <div className="space-y-2">
              {(record.prescriptions as any[]).map((p: any) => (
                <div key={p.id} className="bg-slate-50 rounded p-3 text-sm">
                  <p className="font-medium">{p.medication_name} — {p.dosage}</p>
                  <p className="text-slate-500">{p.frequency} por {p.duration}</p>
                  {p.notes && <p className="text-slate-500 italic">{p.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RecordDetailClient
        recordId={recordId}
        petId={petId}
        userId={user?.id ?? ''}
        initialAttachments={record.attachments as any[]}
        initialAddendums={record.addendums as any[]}
      />
    </div>
  )
}
```

- [ ] **Step 4: Crear `components/medical-records/RecordDetailClient.tsx`**

Este componente cliente maneja el estado mutable de adjuntos y adendas:

```tsx
'use client'
import { useState } from 'react'
import { AddendumForm } from './AddendumForm'
import { AttachmentUploader } from './AttachmentUploader'
import { getAttachmentUrl } from '@/lib/supabase/storage'

interface Attachment { id: string; file_name: string; file_type: string; storage_path: string; created_at: string }
interface Addendum { id: string; content: string; created_at: string; created_by_profile: { full_name: string } | null }

interface RecordDetailClientProps {
  recordId: string
  petId: string
  userId: string
  initialAttachments: Attachment[]
  initialAddendums: Addendum[]
}

export function RecordDetailClient({ recordId, petId, userId, initialAttachments, initialAddendums }: RecordDetailClientProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  const [addendums, setAddendums] = useState<Addendum[]>(initialAddendums)

  const openAttachment = async (path: string) => {
    try {
      const url = await getAttachmentUrl(path)
      window.open(url, '_blank')
    } catch {
      alert('No se pudo abrir el archivo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Adjuntos ({attachments.length})</h2>
          <AttachmentUploader
            recordId={recordId}
            userId={userId}
            onUploaded={a => setAttachments(prev => [...prev, a as Attachment])}
          />
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400">Sin archivos adjuntos.</p>
        ) : (
          <div className="space-y-1">
            {attachments.map(a => (
              <button
                key={a.id}
                onClick={() => openAttachment(a.storage_path)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <span>📎</span> {a.file_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Adendas ({addendums.length})</h2>
          <AddendumForm
            recordId={recordId}
            onAdded={a => setAddendums(prev => [...prev, a as Addendum])}
          />
        </div>
        {addendums.length === 0 ? (
          <p className="text-sm text-slate-400">Sin adendas.</p>
        ) : (
          <div className="space-y-3">
            {addendums.map(a => (
              <div key={a.id} className="border-l-2 border-amber-400 pl-3">
                <p className="text-sm text-slate-700">{a.content}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(a.created_at).toLocaleDateString('es-MX')} · {a.created_by_profile?.full_name ?? 'Veterinario'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verificar que todos los tests pasan**

```bash
npx vitest run
```

Expected: All tests pass (≥ 11 tests)

- [ ] **Step 6: Verificar build sin errores**

```bash
npx tsc --noEmit
```

Expected: 0 errores

- [ ] **Step 7: Commit final**

```bash
git add components/medical-records/ app/\(dashboard\)/pets/\[petId\]/records/\[recordId\]/
git commit -m "feat: add medical record detail page with addendums and file attachments"
```

---

## Self-Review

### Spec Coverage

- ✅ Dueños: crear, buscar, editar, ver mascotas (Sección 4)
- ✅ Mascotas: crear, editar, species/breeds catalogo, historial completo (Sección 4)
- ✅ Expediente clínico: campos completos — motivo, diagnóstico, tratamiento, vitales, recetas, notas (Sección 7)
- ✅ Inmutabilidad: sin UPDATE policy en RLS, mensaje de advertencia en UI (Sección 7 + Decisiones)
- ✅ Adendas: crear, mostrar con autor y fecha (Sección 7)
- ✅ Adjuntos: subir a Supabase Storage, ver con URL firmada (Sección 7)
- ✅ Historial cross-tenant: pets API retorna todos los medical_records sin filtro de tenant (Sección 3)
- ✅ Navegación: sidebar actualizado con link Dueños y Mascotas

### Type Consistency

- `OwnerFormValues` → usado en `OwnerForm.tsx`
- `PetFormValues` → usado en `PetForm.tsx`  
- `MedicalRecordFormValues` → usado en `MedicalRecordForm.tsx` y `PrescriptionsFields.tsx`
- `AddendumFormValues` → usado en `AddendumForm.tsx`
- `uploadAttachment(file, userId, recordId)` → usado en `AttachmentUploader.tsx`
- `getAttachmentUrl(path)` → usado en `RecordDetailClient.tsx`
- `createClient` from `@/lib/supabase/server` → consistente en todas las rutas API y Server Components
