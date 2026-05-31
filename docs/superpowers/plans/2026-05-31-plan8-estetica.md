# Plan 8 — Estética: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a grooming (estética) module: sidebar section "Servicios", a dedicated page `/dashboard/servicios/estetica`, configurable service catalog in Settings, a reusable session-registration modal (used from 3 entry points), and a cartilla section on the pet profile.

**Architecture:** New tables `grooming_service_catalog`, `grooming_sessions`, and `grooming_session_services` follow the same tenant-scoped, RLS-isolated pattern as `vaccine_catalog` and `pet_vaccinations`. A shared `GroomingSessionModal` is the single component for registering sessions from all 3 entry points (services page, pet profile, completed appointment). The `appointments` table gains an `appointment_type` column (default `'consultation'`) to distinguish grooming appointments.

**Tech Stack:** Next.js App Router (server components for data fetching, client components for interactivity), Supabase (RLS), React Hook Form + Zod, shadcn/ui Dialog, lucide-react icons, `FreeTextCombobox` and `DateInput` (existing shared components).

**Spec:** `docs/superpowers/specs/2026-05-31-plan8-estetica-design.md`

---

## File Map

**New files:**
- `supabase/migrations/20260531000001_plan8_estetica.sql`
- `lib/validations/grooming.ts`
- `app/api/catalog/grooming-services/route.ts`
- `app/api/catalog/grooming-services/[id]/route.ts`
- `app/api/servicios/estetica/route.ts`
- `app/api/pets/[petId]/grooming-sessions/route.ts`
- `components/settings/GroomingServiceCatalogTab.tsx`
- `app/dashboard/settings/servicios/page.tsx`
- `components/servicios/GroomingSessionModal.tsx`
- `components/servicios/GroomingHistoryModal.tsx`
- `app/dashboard/servicios/estetica/page.tsx`
- `components/servicios/GroomingSessionsTable.tsx`

**Modified files:**
- `lib/types/database.ts` — add 3 new table types + extend `appointments`
- `lib/validations/catalog.ts` — keep existing; grooming schemas go in new `grooming.ts`
- `components/settings/SettingsNav.tsx` — add "Servicios" tab
- `components/dashboard/SidebarNav.tsx` — add "Servicios" group with sub-item
- `components/pets/PetCartillaButtons.tsx` — add Estética button
- `components/appointments/NewAppointmentModal.tsx` — add appointment_type toggle + grooming services field

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260531000001_plan8_estetica.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260531000001_plan8_estetica.sql

-- 1. Grooming service catalog (per-tenant, no pricing in v1)
CREATE TABLE IF NOT EXISTS grooming_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  duration_minutes INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grooming_service_catalog_tenant_id_idx
  ON grooming_service_catalog(tenant_id);

ALTER TABLE grooming_service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_grooming_catalog" ON grooming_service_catalog
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_insert_grooming_catalog" ON grooming_service_catalog
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_update_grooming_catalog" ON grooming_service_catalog
  FOR UPDATE USING (tenant_id = auth_tenant_id());

-- 2. Extend appointments with type
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'consultation'
  CHECK (appointment_type IN ('consultation', 'grooming'));

-- 3. Grooming sessions (immutable after insert)
CREATE TABLE IF NOT EXISTS grooming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grooming_sessions_tenant_id_idx ON grooming_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS grooming_sessions_pet_id_idx ON grooming_sessions(pet_id);

ALTER TABLE grooming_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_grooming_sessions" ON grooming_sessions
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_insert_grooming_sessions" ON grooming_sessions
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());

-- 4. Services per session (cascade delete)
CREATE TABLE IF NOT EXISTS grooming_session_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES grooming_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_catalog_id UUID REFERENCES grooming_service_catalog(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grooming_session_services_session_id_idx
  ON grooming_session_services(session_id);

ALTER TABLE grooming_session_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_grooming_session_services" ON grooming_session_services
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_insert_grooming_session_services" ON grooming_session_services
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
```

- [ ] **Step 2: Apply the migration**

```bash
cd veterinaias
npx supabase db push
```

Expected: migration applies without errors. Verify in the Supabase dashboard that the 3 new tables exist and `appointments` has the new `appointment_type` column.

- [ ] **Step 3: Update TypeScript types in `lib/types/database.ts`**

In the `Tables` block (inside `public`), add after the `pet_dewormings` entry:

```ts
grooming_service_catalog: {
  Row: { id: string; tenant_id: string; name: string; duration_minutes: number | null; active: boolean; notes: string | null; created_at: string; updated_at: string }
  Insert: { tenant_id: string; name: string; duration_minutes?: number | null; active?: boolean; notes?: string | null }
  Update: { name?: string; duration_minutes?: number | null; active?: boolean; notes?: string | null; updated_at?: string }
  Relationships: []
}
grooming_sessions: {
  Row: { id: string; tenant_id: string; pet_id: string; appointment_id: string | null; session_date: string; notes: string | null; created_by: string; created_at: string }
  Insert: { tenant_id: string; pet_id: string; appointment_id?: string | null; session_date: string; notes?: string | null; created_by: string }
  Update: Record<string, never>
  Relationships: []
}
grooming_session_services: {
  Row: { id: string; session_id: string; tenant_id: string; service_catalog_id: string | null; service_name: string; created_at: string }
  Insert: { session_id: string; tenant_id: string; service_catalog_id?: string | null; service_name: string }
  Update: Record<string, never>
  Relationships: []
}
```

Also add a convenience type alias at the bottom of `database.ts` (after the existing aliases like `VaccineCatalog`):

```ts
export type GroomingServiceCatalog = Database['public']['Tables']['grooming_service_catalog']['Row']
export type GroomingSession = Database['public']['Tables']['grooming_sessions']['Row']
export type GroomingSessionService = Database['public']['Tables']['grooming_session_services']['Row']
```

And extend the `appointments` Row type by adding `appointment_type: 'consultation' | 'grooming'` to the `Row`, `Insert`, and `Update` shapes. Find the `appointments` entry and update:

```ts
appointments: {
  Row: { ...(existing fields)...; appointment_type: 'consultation' | 'grooming' }
  Insert: { ...(existing fields)...; appointment_type?: 'consultation' | 'grooming' }
  Update: { ...(existing fields)...; appointment_type?: 'consultation' | 'grooming' }
  Relationships: []
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd veterinaias
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to the new types.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260531000001_plan8_estetica.sql lib/types/database.ts
git commit -m "feat: plan8 — migration (grooming tables + appointment_type) + TS types"
```

---

## Task 2: Validation schemas

**Files:**
- Create: `lib/validations/grooming.ts`

- [ ] **Step 1: Create the validation file**

```ts
// lib/validations/grooming.ts
import { z } from 'zod'

export const groomingServiceCatalogSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive('Debe ser mayor a 0').optional()
  ),
  notes: z.string().optional(),
})

export const updateGroomingServiceCatalogSchema = groomingServiceCatalogSchema.partial().extend({
  active: z.boolean().optional(),
})

export const groomingSessionSchema = z.object({
  pet_id: z.string().uuid('Mascota requerida'),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  services: z
    .array(
      z.object({
        service_name: z.string().min(1),
        service_catalog_id: z.string().uuid().optional(),
      })
    )
    .min(1, 'Agrega al menos un servicio'),
  notes: z.string().optional(),
  appointment_id: z.string().uuid().optional(),
})

export type GroomingServiceCatalogFormValues = z.infer<typeof groomingServiceCatalogSchema>
export type GroomingSessionFormValues = z.infer<typeof groomingSessionSchema>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/grooming.ts
git commit -m "feat: plan8 — Zod schemas for grooming catalog and sessions"
```

---

## Task 3: Grooming catalog API routes

**Files:**
- Create: `app/api/catalog/grooming-services/route.ts`
- Create: `app/api/catalog/grooming-services/[id]/route.ts`

- [ ] **Step 1: Create the collection route**

```ts
// app/api/catalog/grooming-services/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groomingServiceCatalogSchema } from '@/lib/validations/grooming'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('grooming_service_catalog')
    .select('*')
    .eq('tenant_id', (profile as any).tenant_id)
    .order('name')

  if (error) return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role, tenant_id').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin')
    return NextResponse.json({ error: 'Solo admins pueden gestionar catálogos' }, { status: 403 })
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = groomingServiceCatalogSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('grooming_service_catalog')
    .insert({ ...result.data, tenant_id: (profile as any).tenant_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Create the single-item route**

```ts
// app/api/catalog/grooming-services/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateGroomingServiceCatalogSchema } from '@/lib/validations/grooming'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role, tenant_id').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin')
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = updateGroomingServiceCatalogSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('grooming_service_catalog')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/catalog/grooming-services/
git commit -m "feat: plan8 — grooming catalog API routes (GET, POST, PATCH)"
```

---

## Task 4: Settings — GroomingServiceCatalogTab + Servicios page + nav

**Files:**
- Create: `components/settings/GroomingServiceCatalogTab.tsx`
- Create: `app/dashboard/settings/servicios/page.tsx`
- Modify: `components/settings/SettingsNav.tsx`

- [ ] **Step 1: Create `GroomingServiceCatalogTab`**

```tsx
// components/settings/GroomingServiceCatalogTab.tsx
'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Archive } from 'lucide-react'
import { groomingServiceCatalogSchema, type GroomingServiceCatalogFormValues } from '@/lib/validations/grooming'
import type { GroomingServiceCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function GroomingServiceCatalogTab() {
  const [services, setServices] = useState<GroomingServiceCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GroomingServiceCatalog | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<GroomingServiceCatalogFormValues>({
      resolver: zodResolver(groomingServiceCatalogSchema) as any,
    })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/catalog/grooming-services')
    const json = await res.json()
    setServices(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({ name: '', duration_minutes: undefined, notes: '' })
    setModalOpen(true)
  }

  function openEdit(s: GroomingServiceCatalog) {
    setEditing(s)
    reset({
      name: s.name,
      duration_minutes: s.duration_minutes ?? undefined,
      notes: s.notes ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(values: GroomingServiceCatalogFormValues) {
    const url = editing
      ? `/api/catalog/grooming-services/${editing.id}`
      : '/api/catalog/grooming-services'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success(editing ? 'Servicio actualizado' : 'Servicio agregado')
    setModalOpen(false)
    load()
  }

  async function archive(id: string) {
    const res = await fetch(`/api/catalog/grooming-services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    })
    if (!res.ok) { toast.error('Error al archivar'); return }
    toast.success('Servicio archivado')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Servicios de estética</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} className="mr-1" />Agregar servicio
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : services.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin servicios en el catálogo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agrega los servicios que ofrece tu servicio de estética.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Servicio</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Duración</th>
                <th className="text-right px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {services.map(s => (
                <tr key={s.id} className={s.active ? '' : 'opacity-40'}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {s.name}
                    {!s.active && <span className="ml-2 text-xs text-muted-foreground">(archivado)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.duration_minutes ? `${s.duration_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.active && (
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger render={
                              <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                                <Pencil size={13} />
                              </Button>
                            } />
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={
                              <Button
                                size="sm" variant="ghost"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => archive(s.id)}
                              >
                                <Archive size={13} />
                              </Button>
                            } />
                            <TooltipContent>Archivar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Agregar servicio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input {...register('name')} placeholder="ej. Baño, Corte de pelo..." />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Duración estimada (min)</Label>
              <Input
                type="number"
                min={1}
                {...register('duration_minutes')}
                placeholder="ej. 60"
              />
              {errors.duration_minutes && (
                <p className="text-destructive text-xs">{errors.duration_minutes.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input {...register('notes')} placeholder="Observaciones opcionales" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Create Settings Servicios page**

```tsx
// app/dashboard/settings/servicios/page.tsx
'use client'
import { useState } from 'react'
import { GroomingServiceCatalogTab } from '@/components/settings/GroomingServiceCatalogTab'

type Tab = 'grooming'

export default function ServiciosPage() {
  const [tab, setTab] = useState<Tab>('grooming')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Servicios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configura los servicios adicionales que ofrece tu clínica.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['grooming', 'Estética']] as [Tab, string][]).map(([value, label]) => (
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
        {tab === 'grooming' && <GroomingServiceCatalogTab />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add "Servicios" to SettingsNav**

In `components/settings/SettingsNav.tsx`, add `Scissors` to the lucide import and add the new section after `BookOpen` (Catálogos):

```tsx
// Change the import line:
import { Building2, SlidersHorizontal, Plug, Users, BookOpen, FileText, Scissors } from 'lucide-react'

// Change the SECTIONS array:
const SECTIONS = [
  { href: '/dashboard/settings/clinica', icon: Building2, label: 'Clínica' },
  { href: '/dashboard/settings/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
  { href: '/dashboard/settings/catalogos', icon: BookOpen, label: 'Catálogos' },
  { href: '/dashboard/settings/servicios', icon: Scissors, label: 'Servicios' },
  { href: '/dashboard/settings/recetas', icon: FileText, label: 'Recetas' },
  { href: '/dashboard/settings/integraciones', icon: Plug, label: 'Integraciones' },
  { href: '/dashboard/settings/team', icon: Users, label: 'Equipo' },
]
```

- [ ] **Step 4: Verify the Settings page renders**

Start the dev server and navigate to `/dashboard/settings/servicios`. Verify:
- The "Servicios" tab is visible in the settings nav
- The Estética sub-tab shows an empty state
- Clicking "Agregar servicio" opens the modal
- Saving a service (e.g. "Baño", 45 min) adds it to the list

```bash
cd veterinaias && npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add components/settings/GroomingServiceCatalogTab.tsx \
        app/dashboard/settings/servicios/page.tsx \
        components/settings/SettingsNav.tsx
git commit -m "feat: plan8 — Settings > Servicios page with Estética catalog tab"
```

---

## Task 5: Grooming sessions API routes

**Files:**
- Create: `app/api/servicios/estetica/route.ts`
- Create: `app/api/pets/[petId]/grooming-sessions/route.ts`

- [ ] **Step 1: Create the tenant-wide sessions route**

This powers the `/dashboard/servicios/estetica` page.

```ts
// app/api/servicios/estetica/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groomingSessionSchema } from '@/lib/validations/grooming'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  const { data, error, count } = await (supabase as any)
    .from('grooming_sessions')
    .select(`
      id, session_date, notes, created_at,
      pet:pet_id(id, name, species:species_id(name)),
      services:grooming_session_services(id, service_name)
    `, { count: 'exact' })
    .eq('tenant_id', (profile as any).tenant_id)
    .order('session_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: 'Error al obtener sesiones' }, { status: 500 })
  return NextResponse.json({ data, meta: { total: count ?? 0, page, limit } })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = groomingSessionSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { services, ...sessionData } = result.data
  const tenantId = (profile as any).tenant_id

  // Insert session
  const { data: session, error: sessionError } = await (supabase as any)
    .from('grooming_sessions')
    .insert({
      tenant_id: tenantId,
      pet_id: sessionData.pet_id,
      appointment_id: sessionData.appointment_id ?? null,
      session_date: sessionData.session_date,
      notes: sessionData.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (sessionError)
    return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 })

  // Insert services
  const serviceRows = services.map(s => ({
    session_id: session.id,
    tenant_id: tenantId,
    service_catalog_id: s.service_catalog_id ?? null,
    service_name: s.service_name,
  }))

  const { error: servicesError } = await (supabase as any)
    .from('grooming_session_services')
    .insert(serviceRows)

  if (servicesError)
    return NextResponse.json({ error: 'Error al guardar servicios' }, { status: 500 })

  return NextResponse.json({ data: session }, { status: 201 })
}
```

- [ ] **Step 2: Create the per-pet sessions route**

This powers the pet profile cartilla modal.

```ts
// app/api/pets/[petId]/grooming-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  const { petId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('grooming_sessions')
    .select(`
      id, session_date, notes, created_at,
      services:grooming_session_services(id, service_name),
      tenant:tenant_id(name)
    `)
    .eq('pet_id', petId)
    .eq('tenant_id', (profile as any).tenant_id)
    .order('session_date', { ascending: false })

  if (error)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add app/api/servicios/ app/api/pets/
git commit -m "feat: plan8 — grooming sessions API routes (tenant-wide + per-pet)"
```

---

## Task 6: GroomingSessionModal (reusable — all 3 entry points)

**Files:**
- Create: `components/servicios/GroomingSessionModal.tsx`

This modal is the single component for registering a session. It receives an optional `petId` (pre-selected) and an optional `appointmentId`.

- [ ] **Step 1: Create the modal**

```tsx
// components/servicios/GroomingSessionModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, X, Scissors } from 'lucide-react'
import { groomingSessionSchema, type GroomingSessionFormValues } from '@/lib/validations/grooming'
import type { GroomingServiceCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'
import { DateInput } from '@/components/ui/date-input'

const TODAY = new Date().toISOString().split('T')[0]

interface GroomingSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected pet. If not provided, shows a pet search field. */
  petId?: string
  petName?: string
  /** Link session to an existing appointment */
  appointmentId?: string
  onSuccess?: () => void
}

export function GroomingSessionModal({
  open,
  onOpenChange,
  petId,
  petName,
  appointmentId,
  onSuccess,
}: GroomingSessionModalProps) {
  const [catalog, setCatalog] = useState<GroomingServiceCatalog[]>([])
  const [petSearch, setPetSearch] = useState('')
  const [petResults, setPetResults] = useState<{ pet_id: string; name: string; species_name: string }[]>([])
  const [resolvedPetId, setResolvedPetId] = useState<string | undefined>(petId)
  const [resolvedPetName, setResolvedPetName] = useState<string | undefined>(petName)
  const [showPetResults, setShowPetResults] = useState(false)

  const {
    handleSubmit, setValue, watch, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<GroomingSessionFormValues>({
    resolver: zodResolver(groomingSessionSchema) as any,
    defaultValues: {
      pet_id: petId ?? '',
      session_date: TODAY,
      services: [{ service_name: '', service_catalog_id: undefined }],
      notes: '',
      appointment_id: appointmentId,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'services' })

  // Load catalog on open
  useEffect(() => {
    if (!open) return
    fetch('/api/catalog/grooming-services')
      .then(r => r.json())
      .then(json => setCatalog((json.data ?? []).filter((s: GroomingServiceCatalog) => s.active)))
  }, [open])

  // Reset when opened with a new petId
  useEffect(() => {
    if (open) {
      setResolvedPetId(petId)
      setResolvedPetName(petName)
      reset({
        pet_id: petId ?? '',
        session_date: TODAY,
        services: [{ service_name: '', service_catalog_id: undefined }],
        notes: '',
        appointment_id: appointmentId,
      })
    }
  }, [open, petId, petName, appointmentId, reset])

  // Pet search (only when petId is not pre-provided)
  useEffect(() => {
    if (petId || petSearch.length < 1) return
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/pets?q=${encodeURIComponent(petSearch)}&limit=5`)
      const json = await res.json()
      setPetResults(json.data ?? [])
      setShowPetResults(true)
    }, 200)
    return () => clearTimeout(timeout)
  }, [petSearch, petId])

  function selectPet(pet: { pet_id: string; name: string }) {
    setResolvedPetId(pet.pet_id)
    setResolvedPetName(pet.name)
    setValue('pet_id', pet.pet_id)
    setPetSearch(pet.name)
    setShowPetResults(false)
  }

  const catalogNames = catalog.map(s => s.name)

  function onServiceNameChange(index: number, name: string | undefined) {
    const matched = catalog.find(s => s.name === name)
    setValue(`services.${index}.service_name`, name ?? '')
    setValue(
      `services.${index}.service_catalog_id`,
      matched ? matched.id : undefined
    )
  }

  async function onSubmit(values: GroomingSessionFormValues) {
    const petIdToUse = resolvedPetId ?? values.pet_id
    if (!petIdToUse) { toast.error('Selecciona una mascota'); return }

    const res = await fetch('/api/servicios/estetica', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, pet_id: petIdToUse }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success('Sesión registrada')
    onOpenChange(false)
    onSuccess?.()
  }

  const sessionDate = watch('session_date')
  const servicesWatch = watch('services')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors size={16} />Registrar sesión de estética
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Pet selection */}
          {petId ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
              <p className="text-xs text-muted-foreground mb-0.5">Mascota</p>
              <p className="font-semibold text-foreground">{resolvedPetName ?? petId}</p>
            </div>
          ) : (
            <div className="space-y-1 relative">
              <Label>Mascota <span className="text-destructive">*</span></Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Busca por nombre de mascota..."
                value={resolvedPetName ?? petSearch}
                onChange={e => {
                  setPetSearch(e.target.value)
                  setResolvedPetId(undefined)
                  setResolvedPetName(undefined)
                  setValue('pet_id', '')
                }}
              />
              {showPetResults && petResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
                  {petResults.map(p => (
                    <button
                      key={p.pet_id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                      onClick={() => selectPet({ pet_id: p.pet_id, name: p.name })}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-1.5">{p.species_name}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.pet_id && (
                <p className="text-destructive text-xs">{errors.pet_id.message}</p>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1">
            <Label>Fecha <span className="text-destructive">*</span></Label>
            <DateInput
              value={sessionDate}
              onChange={v => setValue('session_date', v ?? TODAY)}
            />
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label>Servicios realizados <span className="text-destructive">*</span></Label>
            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <FreeTextCombobox
                    value={servicesWatch[idx]?.service_name ?? ''}
                    onChange={v => onServiceNameChange(idx, v)}
                    options={catalogNames}
                    placeholder="Selecciona o escribe un servicio..."
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => remove(idx)}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
            {errors.services && (
              <p className="text-destructive text-xs">
                {typeof errors.services === 'object' && 'message' in errors.services
                  ? (errors.services as any).message
                  : 'Agrega al menos un servicio'}
              </p>
            )}
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => append({ service_name: '', service_catalog_id: undefined })}
            >
              <Plus size={13} className="mr-1" />Agregar otro
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observaciones, estado del pelaje, incidencias..."
              {...{ onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue('notes', e.target.value) }}
              value={watch('notes') ?? ''}
              className="resize-none h-20"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Registrar sesión'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add components/servicios/
git commit -m "feat: plan8 — GroomingSessionModal (reusable, 3 entry points)"
```

---

## Task 7: Pet profile — Estética cartilla

**Files:**
- Create: `components/servicios/GroomingHistoryModal.tsx`
- Modify: `components/pets/PetCartillaButtons.tsx`

- [ ] **Step 1: Create `GroomingHistoryModal`**

```tsx
// components/servicios/GroomingHistoryModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { Scissors, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GroomingSessionModal } from './GroomingSessionModal'

interface SessionRow {
  id: string
  session_date: string
  notes: string | null
  services: { id: string; service_name: string }[]
  tenant: { name: string } | null
}

interface GroomingHistoryModalProps {
  petId: string
  petName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroomingHistoryModal({ petId, petName, open, onOpenChange }: GroomingHistoryModalProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  async function loadSessions() {
    setLoading(true)
    const res = await fetch(`/api/pets/${petId}/grooming-sessions`)
    const json = await res.json()
    setSessions(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) loadSessions()
  }, [open, petId])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Scissors size={16} />Historial de Estética
              </DialogTitle>
              <Button size="sm" onClick={() => setAddOpen(true)} className="mr-6">
                <Plus size={14} className="mr-1" />Registrar sesión
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
              <p className="text-sm font-medium text-foreground">Sin sesiones registradas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Registra la primera sesión de estética o agrégala desde la página de Servicios.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Servicios</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        {new Date(s.session_date + 'T12:00:00').toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.services.map(sv => (
                            <span
                              key={sv.id}
                              className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                            >
                              {sv.service_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                        {s.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GroomingSessionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        petId={petId}
        petName={petName}
        onSuccess={() => { setAddOpen(false); loadSessions() }}
      />
    </>
  )
}
```

- [ ] **Step 2: Update `PetCartillaButtons` to add the Estética button**

Replace the full content of `components/pets/PetCartillaButtons.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Syringe, Bug, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VaccinationsModal } from './VaccinationsModal'
import { DewormingsModal } from './DewormingsModal'
import { GroomingHistoryModal } from '@/components/servicios/GroomingHistoryModal'

interface PetCartillaButtonsProps {
  petId: string
  petName: string
}

export function PetCartillaButtons({ petId, petName }: PetCartillaButtonsProps) {
  const [vaccinationsOpen, setVaccinationsOpen] = useState(false)
  const [dewormingsOpen, setDewormingsOpen] = useState(false)
  const [groomingOpen, setGroomingOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          onClick={() => setVaccinationsOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Syringe size={13} />Vacunas
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => setDewormingsOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Bug size={13} />Desparasitaciones
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => setGroomingOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Scissors size={13} />Estética
        </Button>
      </div>

      <VaccinationsModal petId={petId} open={vaccinationsOpen} onOpenChange={setVaccinationsOpen} />
      <DewormingsModal petId={petId} open={dewormingsOpen} onOpenChange={setDewormingsOpen} />
      <GroomingHistoryModal
        petId={petId}
        petName={petName}
        open={groomingOpen}
        onOpenChange={setGroomingOpen}
      />
    </>
  )
}
```

- [ ] **Step 3: Update the call-site in `app/dashboard/pets/[petId]/page.tsx`**

Find the line that renders `<PetCartillaButtons petId={petId} />` and pass `petName`:

```tsx
<PetCartillaButtons petId={petId} petName={pet.name} />
```

- [ ] **Step 4: Verify the pet profile renders without errors**

Navigate to any pet's profile page. Verify:
- Three buttons appear: Vacunas | Desparasitaciones | Estética
- Clicking Estética opens the history modal (empty state expected)
- The "Registrar sesión" button inside the modal opens `GroomingSessionModal`
- Saving a session adds it to the list

- [ ] **Step 5: Commit**

```bash
git add components/servicios/GroomingHistoryModal.tsx \
        components/pets/PetCartillaButtons.tsx \
        app/dashboard/pets/
git commit -m "feat: plan8 — Estética cartilla in pet profile"
```

---

## Task 8: Appointments — appointment_type selector + grooming prompt

**Files:**
- Modify: `components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Add `appointmentType` state and load catalog**

In `NewAppointmentModal.tsx`, add to the existing state declarations (after the `mode` state):

```tsx
const [appointmentType, setAppointmentType] = useState<'consultation' | 'grooming'>('consultation')
const [groomingCatalog, setGroomingCatalog] = useState<{ id: string; name: string }[]>([])
const [selectedGroomingServices, setSelectedGroomingServices] = useState<string[]>([])
```

Add a `useEffect` to load the catalog when the modal opens:

```tsx
useEffect(() => {
  if (!isOpen) return
  fetch('/api/catalog/grooming-services')
    .then(r => r.json())
    .then(json => setGroomingCatalog((json.data ?? []).filter((s: any) => s.active)))
}, [isOpen])
```

Add `appointmentType` and `selectedGroomingServices` to the `reset()` function:

```tsx
function reset() {
  // ... existing resets ...
  setAppointmentType('consultation')
  setSelectedGroomingServices([])
}
```

- [ ] **Step 2: Add the type toggle UI and grooming services field**

In the form JSX, add a type toggle **before** the existing Mode toggle (after `<div className="px-6 pt-5 pb-2 space-y-6">`):

```tsx
{/* Appointment type toggle */}
<div className="flex gap-1 p-1 bg-muted rounded-lg">
  <button
    type="button"
    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
      appointmentType === 'consultation'
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`}
    onClick={() => setAppointmentType('consultation')}
  >
    Consulta
  </button>
  <button
    type="button"
    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
      appointmentType === 'grooming'
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`}
    onClick={() => setAppointmentType('grooming')}
  >
    Estética
  </button>
</div>
```

Replace the existing "reason" field (the text input for `reason`) with this conditional block:

```tsx
{appointmentType === 'consultation' ? (
  <div className="space-y-1">
    <Label>Motivo (opcional)</Label>
    <Input
      placeholder="Motivo de la consulta"
      value={reason}
      onChange={e => setReason(e.target.value)}
    />
  </div>
) : (
  <div className="space-y-1">
    <Label>Servicios (opcional)</Label>
    <div className="flex flex-wrap gap-1.5">
      {groomingCatalog.map(s => (
        <button
          key={s.id}
          type="button"
          onClick={() =>
            setSelectedGroomingServices(prev =>
              prev.includes(s.name)
                ? prev.filter(n => n !== s.name)
                : [...prev, s.name]
            )
          }
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            selectedGroomingServices.includes(s.name)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {s.name}
        </button>
      ))}
      {groomingCatalog.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No hay servicios en el catálogo. Configúralos en Settings › Servicios.
        </p>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Pass `appointment_type` and services to the API**

In `submitAppointment`, update the payload construction to include `appointment_type`. For grooming, encode selected services as the `reason` field (comma-separated):

```tsx
const groomingReason = appointmentType === 'grooming' && selectedGroomingServices.length > 0
  ? selectedGroomingServices.join(', ')
  : undefined

const payload = mode === 'registered'
  ? {
      pet_id: selectedPetId,
      owner_id: selectedOwner!.id,
      scheduled_at: scheduledAtISO,
      appointment_type: appointmentType,
      ...(appointmentType === 'consultation' && reason ? { reason } : {}),
      ...(appointmentType === 'grooming' && groomingReason ? { reason: groomingReason } : {}),
      ...(assignedTo ? { assigned_to: assignedTo } : {}),
      ...(force ? { force: true } : {}),
    }
  : {
      pet_name: petName.trim(),
      scheduled_at: scheduledAtISO,
      appointment_type: appointmentType,
      ...(appointmentType === 'consultation' && reason ? { reason } : {}),
      ...(appointmentType === 'grooming' && groomingReason ? { reason: groomingReason } : {}),
      ...(assignedTo ? { assigned_to: assignedTo } : {}),
      ...(force ? { force: true } : {}),
    }
```

- [ ] **Step 4: Visual differentiation in the calendar**

In the calendar appointment rendering (find where appointments are displayed with their color/style), add a check for `appointment_type`. Search for where `bg-primary` or similar classes are applied per appointment and add:

```tsx
// In whichever component renders appointment tiles:
const isGrooming = appointment.appointment_type === 'grooming'
// Apply a different color for grooming appointments:
className={isGrooming ? 'bg-violet-500/20 text-violet-700 border-violet-300' : 'bg-primary/20 text-primary border-primary/30'}
```

Find this component by running:

```bash
grep -r "appointment_type\|scheduled_at" veterinaias/app/dashboard/appointments/ --include="*.tsx" -l
```

Open the calendar rendering component and add the `isGrooming` styling.

- [ ] **Step 5: Verify in the UI**

Start the dev server and navigate to `/dashboard/appointments`. Verify:
- The "Nueva cita" modal shows the Consulta / Estética toggle
- Selecting "Estética" replaces the reason text field with service chips
- Creating a grooming appointment saves successfully
- Grooming appointments appear in the calendar (with different styling if step 4 was applied)

- [ ] **Step 6: Commit**

```bash
git add components/appointments/NewAppointmentModal.tsx
git commit -m "feat: plan8 — appointments gain appointment_type toggle (consultation/grooming)"
```

---

## Task 9: Sidebar — "Servicios" section

**Files:**
- Modify: `components/dashboard/SidebarNav.tsx`

- [ ] **Step 1: Update the sidebar**

Replace the full content of `components/dashboard/SidebarNav.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, PawPrint, Calendar, Settings2, Scissors } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio', exact: true },
  { href: '/dashboard/owners', icon: Users, label: 'Dueños' },
  { href: '/dashboard/pets', icon: PawPrint, label: 'Mascotas' },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Citas' },
]

const SERVICES_NAV_ITEMS = [
  { href: '/dashboard/servicios/estetica', icon: Scissors, label: 'Estética' },
]

const ADMIN_NAV_ITEMS = [
  { href: '/dashboard/settings', icon: Settings2, label: 'Configuración' },
]

interface SidebarNavProps {
  role: string
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname()

  const renderItems = (items: typeof NAV_ITEMS, label?: string) => (
    <div className="space-y-0.5">
      {label && (
        <div className="pt-5 pb-1.5 px-3">
          <p className="text-[10px] font-bold text-foreground/35 uppercase tracking-[0.14em]">{label}</p>
        </div>
      )}
      {items.map(({ href, icon: Icon, label: itemLabel, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? 'bg-card text-primary font-semibold shadow-sm border border-primary/10'
                : 'text-foreground/55 hover:text-foreground hover:bg-white/60'
            }`}
          >
            <Icon
              size={15}
              strokeWidth={isActive ? 2.5 : 1.75}
              className={`shrink-0 ${isActive ? 'text-primary' : 'text-foreground/40'}`}
            />
            <span className="tracking-tight">{itemLabel}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-1">
      {renderItems(NAV_ITEMS)}
      {renderItems(SERVICES_NAV_ITEMS, 'Servicios')}
      {role === 'admin' && renderItems(ADMIN_NAV_ITEMS, 'Administración')}
    </div>
  )
}
```

- [ ] **Step 2: Verify sidebar renders**

Refresh the dashboard. Verify:
- A "Servicios" group label appears below Citas
- "Estética" sub-item is visible with the Scissors icon
- Clicking it navigates to `/dashboard/servicios/estetica` (page created in Task 10)
- Active state highlights correctly

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/SidebarNav.tsx
git commit -m "feat: plan8 — sidebar Servicios section with Estética sub-item"
```

---

## Task 10: /dashboard/servicios/estetica page

**Files:**
- Create: `components/servicios/GroomingSessionsTable.tsx`
- Create: `app/dashboard/servicios/estetica/page.tsx`

- [ ] **Step 1: Create `GroomingSessionsTable`**

```tsx
// components/servicios/GroomingSessionsTable.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SessionRow {
  id: string
  session_date: string
  notes: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  services: { id: string; service_name: string }[]
}

interface Meta { total: number; page: number; limit: number }

interface GroomingSessionsTableProps {
  onNew: () => void
}

export function GroomingSessionsTable({ onNew }: GroomingSessionsTableProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)

  async function load(page = 1) {
    setLoading(true)
    const res = await fetch(`/api/servicios/estetica?page=${page}`)
    const json = await res.json()
    setSessions(json.data ?? [])
    setMeta(json.meta ?? { total: 0, page, limit: 20 })
    setLoading(false)
  }

  useEffect(() => { load(1) }, [])

  function refresh() { load(meta.page) }

  const totalPages = Math.ceil(meta.total / meta.limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {meta.total} {meta.total === 1 ? 'sesión registrada' : 'sesiones registradas'}
        </p>
        <Button size="sm" onClick={onNew}>+ Nueva sesión</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin sesiones registradas</p>
          <p className="text-xs text-muted-foreground mt-1">
            Registra la primera sesión desde aquí o desde el perfil de una mascota.
          </p>
          <Button size="sm" className="mt-4" onClick={onNew}>+ Nueva sesión</Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mascota</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Servicios</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Notas</th>
                  <th className="text-right px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {new Date(s.session_date + 'T12:00:00').toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{s.pet?.name ?? '—'}</p>
                      {s.pet?.species?.name && (
                        <p className="text-xs text-muted-foreground">{s.pet.species.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.services.map(sv => (
                          <span
                            key={sv.id}
                            className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                          >
                            {sv.service_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">
                      {s.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.pet?.id && (
                        <Link
                          href={`/dashboard/pets/${s.pet.id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink size={12} />Ver mascota
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <Button
                variant="outline" size="sm"
                disabled={meta.page <= 1}
                onClick={() => load(meta.page - 1)}
              >
                Anterior
              </Button>
              <span>Página {meta.page} de {totalPages}</span>
              <Button
                variant="outline" size="sm"
                disabled={meta.page >= totalPages}
                onClick={() => load(meta.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the page**

```tsx
// app/dashboard/servicios/estetica/page.tsx
'use client'
import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { GroomingSessionsTable } from '@/components/servicios/GroomingSessionsTable'
import { GroomingSessionModal } from '@/components/servicios/GroomingSessionModal'

export default function EsteticaPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setModalOpen(false)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Scissors size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Estética
          </h1>
        </div>
      </div>

      <GroomingSessionsTable
        key={refreshKey}
        onNew={() => setModalOpen(true)}
      />

      <GroomingSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify the full flow end-to-end**

Navigate to `/dashboard/servicios/estetica`. Verify:
- Page renders with the overline "Servicios" and H1 "Estética"
- Empty state shows with "Nueva sesión" button
- Clicking the button opens `GroomingSessionModal` without a pre-selected pet
- Searching for a pet by name returns results
- Selecting a pet + adding services + saving creates the session
- The session appears in the table with date, pet name, service chips
- "Ver mascota" link navigates to the correct pet profile
- From the pet profile, clicking Estética → "Registrar sesión" also creates a session visible in this table

- [ ] **Step 4: Commit**

```bash
git add components/servicios/GroomingSessionsTable.tsx \
        app/dashboard/servicios/
git commit -m "feat: plan8 — /dashboard/servicios/estetica page with sessions table"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| `grooming_service_catalog` table + RLS | Task 1 |
| `appointments.appointment_type` column | Task 1 |
| `grooming_sessions` table + RLS | Task 1 |
| `grooming_session_services` table + RLS | Task 1 |
| TypeScript types | Task 1 |
| Validation schemas | Task 2 |
| Catalog API (GET/POST/PATCH) | Task 3 |
| Settings › Servicios tab + Estética sub-tab | Task 4 |
| GroomingServiceCatalogTab CRUD | Task 4 |
| Settings nav update | Task 4 |
| Tenant-wide sessions API | Task 5 |
| Per-pet sessions API | Task 5 |
| GroomingSessionModal (shared, 3 entry points) | Task 6 |
| Pet profile — GroomingHistoryModal | Task 7 |
| PetCartillaButtons — add Estética | Task 7 |
| NewAppointmentModal — type toggle | Task 8 |
| Calendar — grooming visual differentiation | Task 8 |
| Sidebar — Servicios section | Task 9 |
| `/dashboard/servicios/estetica` page | Task 10 |
| GroomingSessionsTable + pagination | Task 10 |

**Placeholder scan:** No TBDs, TODOs, or "similar to Task N" references. Every step contains complete code.

**Type consistency:**
- `GroomingServiceCatalog`, `GroomingSession`, `GroomingSessionService` defined in Task 1, used in Tasks 4, 6, 7.
- `groomingServiceCatalogSchema`, `groomingSessionSchema`, `GroomingSessionFormValues`, `GroomingServiceCatalogFormValues` defined in Task 2, used in Tasks 3, 4, 6.
- API routes (`/api/catalog/grooming-services`, `/api/servicios/estetica`, `/api/pets/[petId]/grooming-sessions`) defined in Tasks 3 and 5, called in Tasks 4, 6, 7, 10.
- `GroomingSessionModal` props (`petId?`, `petName?`, `appointmentId?`, `onSuccess?`) defined in Task 6, consumed identically in Tasks 7 and 10.
