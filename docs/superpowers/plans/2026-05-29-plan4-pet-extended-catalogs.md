# Plan 4 — Perfil de Mascota Extendido + Catálogos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar campos de estilo de vida a la mascota y crear la sección Catálogos en Settings con CRUD para vacunas (con inventario) y medicamentos (con regla de dosis).

**Architecture:** Dos migraciones independientes (campos en `pets` y tablas de catálogos), API routes RESTful por recurso, componentes de UI en Settings con tabs Vacunas / Medicamentos. Los catálogos son nivel tenant (aislados por RLS con `tenant_id`). La lógica de sugerencia de dosis se define aquí pero se consume en Plan 6.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), react-hook-form, Zod, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-05-29-veterinaias-roadmap-planes4-11.md` §Plan 4

---

### Task 1: Migración — Campos extendidos en `pets`

**Files:**
- Create: `veterinaias/supabase/migrations/20260529000002_pet_extended_fields.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260529000002_pet_extended_fields.sql

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS sterilized BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS habitat TEXT,
  ADD COLUMN IF NOT EXISTS feeding TEXT,
  ADD COLUMN IF NOT EXISTS cohabitation BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS cohabitation_details TEXT;
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Abre el SQL Editor en el dashboard de Supabase y ejecuta el contenido del archivo, O usa la CLI:
```bash
cd veterinaias && npx supabase db push
```
Verifica que la tabla `pets` tenga las 5 columnas nuevas.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/supabase/migrations/20260529000002_pet_extended_fields.sql
git commit -m "feat: add extended lifestyle fields to pets table"
```

---

### Task 2: Migración — Tablas de catálogos

**Files:**
- Create: `veterinaias/supabase/migrations/20260529000003_catalogs.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260529000003_catalogs.sql

-- Catálogo de vacunas (nivel tenant)
CREATE TABLE vaccine_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manufacturer TEXT,
  lot_number TEXT,
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  low_stock_threshold INTEGER DEFAULT 5 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Catálogo de medicamentos (nivel tenant, sin inventario)
CREATE TABLE medication_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active_ingredient TEXT,
  description TEXT,
  dose_per_kg NUMERIC(8,4),
  dose_unit TEXT,
  concentration TEXT,
  default_route TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Triggers para updated_at
CREATE TRIGGER vaccine_catalog_updated_at BEFORE UPDATE ON vaccine_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER medication_catalog_updated_at BEFORE UPDATE ON medication_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE vaccine_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_catalog ENABLE ROW LEVEL SECURITY;

-- Vaccine catalog: solo el tenant dueño puede leer y gestionar
CREATE POLICY "tenant_read_vaccine_catalog" ON vaccine_catalog
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "admin_insert_vaccine_catalog" ON vaccine_catalog
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

CREATE POLICY "admin_update_vaccine_catalog" ON vaccine_catalog
  FOR UPDATE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

CREATE POLICY "admin_delete_vaccine_catalog" ON vaccine_catalog
  FOR DELETE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

-- Medication catalog: mismas políticas
CREATE POLICY "tenant_read_medication_catalog" ON medication_catalog
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "admin_insert_medication_catalog" ON medication_catalog
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

CREATE POLICY "admin_update_medication_catalog" ON medication_catalog
  FOR UPDATE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');

CREATE POLICY "admin_delete_medication_catalog" ON medication_catalog
  FOR DELETE USING (tenant_id = auth_tenant_id() AND auth_role() = 'admin');
```

- [ ] **Step 2: Aplicar la migración**

```bash
cd veterinaias && npx supabase db push
```
Verifica que existan las tablas `vaccine_catalog` y `medication_catalog` con RLS habilitado.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/supabase/migrations/20260529000003_catalogs.sql
git commit -m "feat: add vaccine_catalog and medication_catalog tables with RLS"
```

---

### Task 3: Actualizar tipos TypeScript

**Files:**
- Modify: `veterinaias/lib/types/database.ts`

- [ ] **Step 1: Agregar nuevos campos a la interfaz `Pet`**

En `lib/types/database.ts`, reemplaza la interfaz `Pet` con:

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
  sterilized: boolean
  habitat: string | null
  feeding: string | null
  cohabitation: boolean
  cohabitation_details: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Agregar interfaces nuevas para los catálogos**

Añade después de la interfaz `Pet`:

```typescript
export interface VaccineCatalog {
  id: string
  tenant_id: string
  name: string
  manufacturer: string | null
  lot_number: string | null
  stock_quantity: number
  low_stock_threshold: number
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MedicationCatalog {
  id: string
  tenant_id: string
  name: string
  active_ingredient: string | null
  description: string | null
  dose_per_kg: number | null
  dose_unit: string | null
  concentration: string | null
  default_route: string | null
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Actualizar el tipo `Database` con las tablas nuevas y los campos de `pets`**

En `Database.public.Tables`, actualiza la entrada `pets`:

```typescript
pets: {
  Row: {
    id: string; name: string; species_id: string; breed_id: string | null;
    sex: PetSex; date_of_birth: string | null; color: string | null;
    microchip: string | null; notes: string | null;
    sterilized: boolean; habitat: string | null; feeding: string | null;
    cohabitation: boolean; cohabitation_details: string | null;
    created_at: string; updated_at: string
  }
  Insert: {
    name: string; species_id: string; breed_id?: string | null;
    sex: PetSex; date_of_birth?: string | null; color?: string | null;
    microchip?: string | null; notes?: string | null;
    sterilized?: boolean; habitat?: string | null; feeding?: string | null;
    cohabitation?: boolean; cohabitation_details?: string | null
  }
  Update: {
    name?: string; species_id?: string; breed_id?: string | null;
    sex?: PetSex; date_of_birth?: string | null; color?: string | null;
    microchip?: string | null; notes?: string | null;
    sterilized?: boolean; habitat?: string | null; feeding?: string | null;
    cohabitation?: boolean; cohabitation_details?: string | null;
    updated_at?: string
  }
  Relationships: []
}
```

Agrega después de `share_tokens` en `Database.public.Tables`:

```typescript
vaccine_catalog: {
  Row: { id: string; tenant_id: string; name: string; manufacturer: string | null; lot_number: string | null; stock_quantity: number; low_stock_threshold: number; active: boolean; notes: string | null; created_at: string; updated_at: string }
  Insert: { tenant_id: string; name: string; manufacturer?: string | null; lot_number?: string | null; stock_quantity?: number; low_stock_threshold?: number; active?: boolean; notes?: string | null }
  Update: { name?: string; manufacturer?: string | null; lot_number?: string | null; stock_quantity?: number; low_stock_threshold?: number; active?: boolean; notes?: string | null; updated_at?: string }
  Relationships: []
}
medication_catalog: {
  Row: { id: string; tenant_id: string; name: string; active_ingredient: string | null; description: string | null; dose_per_kg: number | null; dose_unit: string | null; concentration: string | null; default_route: string | null; active: boolean; notes: string | null; created_at: string; updated_at: string }
  Insert: { tenant_id: string; name: string; active_ingredient?: string | null; description?: string | null; dose_per_kg?: number | null; dose_unit?: string | null; concentration?: string | null; default_route?: string | null; active?: boolean; notes?: string | null }
  Update: { name?: string; active_ingredient?: string | null; description?: string | null; dose_per_kg?: number | null; dose_unit?: string | null; concentration?: string | null; default_route?: string | null; active?: boolean; notes?: string | null; updated_at?: string }
  Relationships: []
}
```

- [ ] **Step 4: Commit**

```bash
git add veterinaias/lib/types/database.ts
git commit -m "feat: add extended pet fields and catalog types to database.ts"
```

---

### Task 4: Actualizar validación y API de mascotas

**Files:**
- Modify: `veterinaias/lib/validations/pet.ts`
- Modify: `veterinaias/app/api/pets/[id]/route.ts`

- [ ] **Step 1: Agregar campos nuevos al schema Zod de mascota**

En `lib/validations/pet.ts`, actualiza `petSchema`:

```typescript
export const petSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  owner_id: z.string().uuid('Dueño es requerido'),
  species_id: z.string().uuid('Especie es requerida'),
  breed: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']),
  date_of_birth: z.preprocess(
    v => (v === '' ? undefined : v),
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD')
      .refine(s => !isNaN(new Date(s).getTime()), 'Fecha inválida')
      .optional()
  ),
  color: z.string().optional(),
  microchip: z.string().optional(),
  notes: z.string().optional(),
  sterilized: z.boolean().optional(),
  habitat: z.string().optional(),
  feeding: z.string().optional(),
  cohabitation: z.boolean().optional(),
  cohabitation_details: z.string().optional(),
})

export const updatePetSchema = petSchema.omit({ owner_id: true }).partial()

export type PetFormValues = z.infer<typeof petSchema>
```

- [ ] **Step 2: El PATCH handler de `/api/pets/[id]` ya usa `updatePetSchema.partial()`, así que automáticamente acepta los campos nuevos. Verificar que el update block incluya los nuevos campos:**

En `app/api/pets/[id]/route.ts`, dentro del handler PATCH, actualiza el bloque de construcción del update:

```typescript
const { date_of_birth, breed, sterilized, habitat, feeding, cohabitation, cohabitation_details, ...rest } = result.data
const update: Record<string, unknown> = { ...rest }
if (date_of_birth !== undefined) update.date_of_birth = date_of_birth || null
if (breed !== undefined) update.breed = breed || null
if (sterilized !== undefined) update.sterilized = sterilized
if (habitat !== undefined) update.habitat = habitat || null
if (feeding !== undefined) update.feeding = feeding || null
if (cohabitation !== undefined) update.cohabitation = cohabitation
if (cohabitation_details !== undefined) update.cohabitation_details = cohabitation_details || null
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/lib/validations/pet.ts veterinaias/app/api/pets/\[id\]/route.ts
git commit -m "feat: extend pet schema and PATCH handler with lifestyle fields"
```

---

### Task 5: Actualizar PetForm UI con los campos nuevos

**Files:**
- Create: `veterinaias/components/ui/free-text-combobox.tsx`
- Modify: `veterinaias/components/pets/PetForm.tsx`

- [ ] **Step 1: Crear el componente `FreeTextCombobox`**

Es idéntico a `BreedCombobox` pero genérico. Crea `components/ui/free-text-combobox.tsx`:

```typescript
'use client'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface FreeTextComboboxProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
}

export function FreeTextCombobox({ value, onChange, options, placeholder, disabled }: FreeTextComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputValue = value ?? ''

  const filtered = inputValue.trim().length > 0
    ? options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={e => { onChange(e.target.value || undefined); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onMouseDown={e => {
                e.preventDefault()
                onChange(opt)
                setOpen(false)
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Agregar la sección "Información de vida" al PetForm**

En `components/pets/PetForm.tsx`, importa `FreeTextCombobox`:

```typescript
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'
```

Agrega estas constantes antes del componente:

```typescript
const HABITAT_OPTIONS = ['Interior', 'Exterior', 'Terreno campestre']
const FEEDING_OPTIONS = ['Croquetas', 'Comida blanda', 'Comida para humanos']
```

Agrega una nueva `FormSection` después de la sección "Notas" (antes del bloque de botones):

```tsx
<FormSection title="Información de vida">
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
      <Label>Dónde vive</Label>
      <FreeTextCombobox
        value={watch('habitat')}
        onChange={v => setValue('habitat', v)}
        options={HABITAT_OPTIONS}
        placeholder="ej. Interior, Exterior..."
      />
    </div>
    <div className="space-y-1">
      <Label>Alimentación</Label>
      <FreeTextCombobox
        value={watch('feeding')}
        onChange={v => setValue('feeding', v)}
        options={FEEDING_OPTIONS}
        placeholder="ej. Croquetas..."
      />
    </div>
  </div>
  <div className="mt-4 flex items-center gap-3">
    <input
      type="checkbox"
      id="sterilized"
      {...register('sterilized')}
      className="rounded border-border"
    />
    <Label htmlFor="sterilized" className="cursor-pointer">Esterilizado/a</Label>
  </div>
  <div className="mt-4 space-y-2">
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id="cohabitation"
        {...register('cohabitation')}
        className="rounded border-border"
      />
      <Label htmlFor="cohabitation" className="cursor-pointer">Convive con otras mascotas</Label>
    </div>
    {watch('cohabitation') && (
      <div className="space-y-1 ml-6">
        <Label htmlFor="cohabitation_details">Descripción de convivencia</Label>
        <textarea
          id="cohabitation_details"
          {...register('cohabitation_details')}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
          placeholder="ej. 2 perros y 1 gato, conviven sin conflictos en casa..."
        />
      </div>
    )}
  </div>
</FormSection>
```

- [ ] **Step 3: Agregar sección "Información de vida" en la vista de detalle de mascota**

En `app/dashboard/pets/[petId]/page.tsx`, dentro del bloque de datos del pet card (después de `pet.notes`), agregar:

```tsx
{(pet.sterilized || pet.habitat || pet.feeding || pet.cohabitation) && (
  <div className="mt-4 pt-4 border-t border-border/60">
    <p className="label-overline text-muted-foreground/50 mb-2">Información de vida</p>
    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
      {pet.habitat && <p><span className="text-muted-foreground">Dónde vive: </span>{pet.habitat}</p>}
      {pet.feeding && <p><span className="text-muted-foreground">Alimentación: </span>{pet.feeding}</p>}
      <p><span className="text-muted-foreground">Esterilizado: </span>{pet.sterilized ? 'Sí' : 'No'}</p>
      {pet.cohabitation && pet.cohabitation_details && (
        <p className="col-span-2"><span className="text-muted-foreground">Convive con: </span>{pet.cohabitation_details}</p>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add veterinaias/components/ui/free-text-combobox.tsx veterinaias/components/pets/PetForm.tsx veterinaias/app/dashboard/pets/\[petId\]/page.tsx
git commit -m "feat: add lifestyle fields to pet form and detail page"
```

---

### Task 6: Schemas Zod para catálogos

**Files:**
- Create: `veterinaias/lib/validations/catalog.ts`

- [ ] **Step 1: Crear el archivo de validaciones**

```typescript
// lib/validations/catalog.ts
import { z } from 'zod'

export const vaccineCatalogSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  manufacturer: z.string().optional(),
  lot_number: z.string().optional(),
  stock_quantity: z.preprocess(
    v => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().int().min(0, 'Stock no puede ser negativo')
  ),
  low_stock_threshold: z.preprocess(
    v => (v === '' || v === null || v === undefined ? 5 : Number(v)),
    z.number().int().min(1, 'Umbral mínimo es 1')
  ),
  notes: z.string().optional(),
})

export const updateVaccineCatalogSchema = vaccineCatalogSchema.partial().extend({
  active: z.boolean().optional(),
  stock_quantity: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(0).optional()
  ),
})

export const medicationCatalogSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  active_ingredient: z.string().optional(),
  description: z.string().optional(),
  dose_per_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Debe ser mayor a 0').optional()
  ),
  dose_unit: z.string().optional(),
  concentration: z.string().optional(),
  default_route: z.string().optional(),
  notes: z.string().optional(),
})

export const updateMedicationCatalogSchema = medicationCatalogSchema.partial().extend({
  active: z.boolean().optional(),
})

export type VaccineCatalogFormValues = z.infer<typeof vaccineCatalogSchema>
export type MedicationCatalogFormValues = z.infer<typeof medicationCatalogSchema>
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/lib/validations/catalog.ts
git commit -m "feat: add Zod validation schemas for vaccine and medication catalogs"
```

---

### Task 7: API Routes — Catálogo de Vacunas

**Files:**
- Create: `veterinaias/app/api/catalog/vaccines/route.ts`
- Create: `veterinaias/app/api/catalog/vaccines/[id]/route.ts`

- [ ] **Step 1: Crear `app/api/catalog/vaccines/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vaccineCatalogSchema } from '@/lib/validations/catalog'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('vaccine_catalog')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: 'Error al obtener vacunas' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('role, tenant_id').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins pueden gestionar catálogos' }, { status: 403 })
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = vaccineCatalogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('vaccine_catalog')
    .insert({ ...result.data, tenant_id: (profile as any).tenant_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear vacuna' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Crear `app/api/catalog/vaccines/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateVaccineCatalogSchema } from '@/lib/validations/catalog'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateVaccineCatalogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('vaccine_catalog')
    .update(result.data)
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  // Archivar en lugar de borrar para preservar historial
  const { data, error } = await (supabase as any)
    .from('vaccine_catalog')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Error al archivar' }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/catalog/
git commit -m "feat: add vaccine catalog API routes (GET, POST, PATCH, archive)"
```

---

### Task 8: API Routes — Catálogo de Medicamentos

**Files:**
- Create: `veterinaias/app/api/catalog/medications/route.ts`
- Create: `veterinaias/app/api/catalog/medications/[id]/route.ts`

- [ ] **Step 1: Crear `app/api/catalog/medications/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { medicationCatalogSchema } from '@/lib/validations/catalog'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('medication_catalog')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: 'Error al obtener medicamentos' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('role, tenant_id').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = medicationCatalogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('medication_catalog')
    .insert({ ...result.data, tenant_id: (profile as any).tenant_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear medicamento' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Crear `app/api/catalog/medications/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateMedicationCatalogSchema } from '@/lib/validations/catalog'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateMedicationCatalogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('medication_catalog')
    .update(result.data)
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('medication_catalog')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Error al archivar' }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/catalog/medications/
git commit -m "feat: add medication catalog API routes (GET, POST, PATCH, archive)"
```

---

### Task 9: UI — Vaccine Catalog Tab

**Files:**
- Create: `veterinaias/components/settings/VaccineCatalogTab.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Archive, AlertTriangle } from 'lucide-react'
import { vaccineCatalogSchema, type VaccineCatalogFormValues } from '@/lib/validations/catalog'
import type { VaccineCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function VaccineCatalogTab() {
  const [vaccines, setVaccines] = useState<VaccineCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VaccineCatalog | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VaccineCatalogFormValues>({
    resolver: zodResolver(vaccineCatalogSchema) as any,
    defaultValues: { stock_quantity: 0, low_stock_threshold: 5 },
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/catalog/vaccines')
    const json = await res.json()
    setVaccines(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({ stock_quantity: 0, low_stock_threshold: 5 })
    setModalOpen(true)
  }

  function openEdit(v: VaccineCatalog) {
    setEditing(v)
    reset({
      name: v.name,
      manufacturer: v.manufacturer ?? undefined,
      lot_number: v.lot_number ?? undefined,
      stock_quantity: v.stock_quantity,
      low_stock_threshold: v.low_stock_threshold,
      notes: v.notes ?? undefined,
    })
    setModalOpen(true)
  }

  async function onSubmit(values: VaccineCatalogFormValues) {
    const url = editing ? `/api/catalog/vaccines/${editing.id}` : '/api/catalog/vaccines'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success(editing ? 'Vacuna actualizada' : 'Vacuna agregada')
    setModalOpen(false)
    load()
  }

  async function archive(id: string) {
    const res = await fetch(`/api/catalog/vaccines/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al archivar'); return }
    toast.success('Vacuna archivada')
    load()
  }

  const lowStockCount = vaccines.filter(v => v.active && v.stock_quantity <= v.low_stock_threshold).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Vacunas registradas</h3>
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <AlertTriangle size={11} />
              {lowStockCount} con stock bajo
            </span>
          )}
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" />Agregar vacuna</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : vaccines.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin vacunas en el catálogo</p>
          <p className="text-xs text-muted-foreground mt-1">Agrega las vacunas que usas en tu clínica.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Vacuna</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Laboratorio</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Lote</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {vaccines.map(v => {
                const isLow = v.active && v.stock_quantity <= v.low_stock_threshold
                const isOut = v.active && v.stock_quantity === 0
                return (
                  <tr key={v.id} className={v.active ? '' : 'opacity-40'}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {v.name}
                      {!v.active && <span className="ml-2 text-xs text-muted-foreground">(archivada)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.manufacturer ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{v.lot_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isOut ? 'bg-red-50 text-red-600 border border-red-200' :
                        isLow ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {isOut && <AlertTriangle size={10} />}
                        {isLow && !isOut && <AlertTriangle size={10} />}
                        {v.stock_quantity} unidades
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v.active && (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(v)}><Pencil size={13} /></Button>
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => archive(v.id)}><Archive size={13} /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar vacuna' : 'Agregar vacuna'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input {...register('name')} placeholder="ej. Rabia, Parvovirus..." />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Laboratorio</Label>
                <Input {...register('manufacturer')} placeholder="ej. Zoetis" />
              </div>
              <div className="space-y-1">
                <Label>Lote</Label>
                <Input {...register('lot_number')} placeholder="ej. B2024-01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Stock actual</Label>
                <Input type="number" min={0} {...register('stock_quantity')} />
                {errors.stock_quantity && <p className="text-destructive text-xs">{errors.stock_quantity.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Alerta stock bajo</Label>
                <Input type="number" min={1} {...register('low_stock_threshold')} />
                {errors.low_stock_threshold && <p className="text-destructive text-xs">{errors.low_stock_threshold.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input {...register('notes')} placeholder="Observaciones opcionales" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/settings/VaccineCatalogTab.tsx
git commit -m "feat: add VaccineCatalogTab component with CRUD and low-stock alerts"
```

---

### Task 10: UI — Medication Catalog Tab

**Files:**
- Create: `veterinaias/components/settings/MedicationCatalogTab.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Archive } from 'lucide-react'
import { medicationCatalogSchema, type MedicationCatalogFormValues } from '@/lib/validations/catalog'
import type { MedicationCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ROUTE_OPTIONS = ['Oral', 'IV', 'IM', 'SC', 'Tópica', 'Oftálmica', 'Ótica']

export function MedicationCatalogTab() {
  const [medications, setMedications] = useState<MedicationCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MedicationCatalog | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MedicationCatalogFormValues>({
    resolver: zodResolver(medicationCatalogSchema) as any,
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/catalog/medications')
    const json = await res.json()
    setMedications(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({})
    setModalOpen(true)
  }

  function openEdit(m: MedicationCatalog) {
    setEditing(m)
    reset({
      name: m.name,
      active_ingredient: m.active_ingredient ?? undefined,
      description: m.description ?? undefined,
      dose_per_kg: m.dose_per_kg ?? undefined,
      dose_unit: m.dose_unit ?? undefined,
      concentration: m.concentration ?? undefined,
      default_route: m.default_route ?? undefined,
      notes: m.notes ?? undefined,
    })
    setModalOpen(true)
  }

  async function onSubmit(values: MedicationCatalogFormValues) {
    const url = editing ? `/api/catalog/medications/${editing.id}` : '/api/catalog/medications'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success(editing ? 'Medicamento actualizado' : 'Medicamento agregado')
    setModalOpen(false)
    load()
  }

  async function archive(id: string) {
    const res = await fetch(`/api/catalog/medications/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al archivar'); return }
    toast.success('Medicamento archivado')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Medicamentos registrados</h3>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" />Agregar medicamento</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : medications.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin medicamentos en el catálogo</p>
          <p className="text-xs text-muted-foreground mt-1">Agrega los medicamentos que recetas habitualmente.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Medicamento</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Principio activo</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Dosis</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Vía</th>
                <th className="text-right px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {medications.map(m => (
                <tr key={m.id} className={m.active ? '' : 'opacity-40'}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {m.name}
                    {!m.active && <span className="ml-2 text-xs text-muted-foreground">(archivado)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.active_ingredient ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {m.dose_per_kg ? `${m.dose_per_kg} ${m.dose_unit ?? ''}/kg` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.default_route ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {m.active && (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil size={13} /></Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => archive(m.id)}><Archive size={13} /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar medicamento' : 'Agregar medicamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre comercial <span className="text-destructive">*</span></Label>
                <Input {...register('name')} placeholder="ej. Amoxil" />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Principio activo</Label>
                <Input {...register('active_ingredient')} placeholder="ej. Amoxicilina trihidratada" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción / presentación</Label>
              <Input {...register('description')} placeholder="ej. Suspensión oral 250mg/5ml" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Dosis por kg</Label>
                <Input type="number" step="0.01" {...register('dose_per_kg')} placeholder="ej. 10" />
                {errors.dose_per_kg && <p className="text-destructive text-xs">{errors.dose_per_kg.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Unidad</Label>
                <Input {...register('dose_unit')} placeholder="mg, ml, UI..." />
              </div>
              <div className="space-y-1">
                <Label>Concentración</Label>
                <Input {...register('concentration')} placeholder="ej. 500mg/ml" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Vía de administración</Label>
              <Input {...register('default_route')} list="route-options" placeholder="ej. Oral" />
              <datalist id="route-options">
                {ROUTE_OPTIONS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input {...register('notes')} placeholder="Contraindicaciones, precauciones..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/settings/MedicationCatalogTab.tsx
git commit -m "feat: add MedicationCatalogTab component with CRUD"
```

---

### Task 11: Settings › Catálogos — Página y navegación

**Files:**
- Create: `veterinaias/app/dashboard/settings/catalogos/page.tsx`
- Modify: `veterinaias/components/settings/SettingsNav.tsx`

- [ ] **Step 1: Crear la página `settings/catalogos/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { VaccineCatalogTab } from '@/components/settings/VaccineCatalogTab'
import { MedicationCatalogTab } from '@/components/settings/MedicationCatalogTab'

type Tab = 'vaccines' | 'medications'

export default function CatalogosPage() {
  const [tab, setTab] = useState<Tab>('vaccines')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Catálogos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Gestiona las vacunas y medicamentos disponibles en tu clínica.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['vaccines', 'Vacunas'], ['medications', 'Medicamentos']] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'vaccines' ? <VaccineCatalogTab /> : <MedicationCatalogTab />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Agregar "Catálogos" en `SettingsNav.tsx`**

En `components/settings/SettingsNav.tsx`, agrega la entrada al array `SECTIONS`:

```typescript
import { Building2, SlidersHorizontal, Plug, Users, BookOpen } from 'lucide-react'

const SECTIONS = [
  { href: '/dashboard/settings/clinica', icon: Building2, label: 'Clínica' },
  { href: '/dashboard/settings/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
  { href: '/dashboard/settings/catalogos', icon: BookOpen, label: 'Catálogos' },
  { href: '/dashboard/settings/integraciones', icon: Plug, label: 'Integraciones' },
  { href: '/dashboard/settings/team', icon: Users, label: 'Equipo' },
]
```

- [ ] **Step 3: Verificar en browser**

Abre `http://localhost:3000/dashboard/settings/catalogos`. Deberías ver los dos tabs (Vacunas / Medicamentos) con sus tablas vacías y los botones de agregar funcionando.

- [ ] **Step 4: Commit final del plan**

```bash
git add veterinaias/app/dashboard/settings/catalogos/ veterinaias/components/settings/SettingsNav.tsx
git commit -m "feat: add Catálogos settings page with tabs for vaccines and medications"
```
