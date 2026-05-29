# Plan 5 — Vacunas y Desparasitación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar vacunas y desparasitaciones durante una consulta (con descuento automático de inventario) y mostrar la cartilla completa en el perfil de la mascota con modales independientes.

**Architecture:** Dos tablas nuevas (`pet_vaccinations`, `pet_dewormings`) con RLS. Las vacunas aplicadas durante una consulta decrementan `vaccine_catalog.stock_quantity` en el mismo request. Los modales de cartilla son componentes cliente que fetchean sus propios datos. La sección de vacunas/desparasitación se agrega al `MedicalRecordForm` después de diagnóstico y tratamiento.

**Prerequisite:** Plan 4 debe estar completo (tablas `vaccine_catalog` y `medication_catalog` deben existir).

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), react-hook-form, useFieldArray, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-05-29-veterinaias-roadmap-planes4-11.md` §Plan 5

---

### Task 1: Migración — Tablas de vacunas y desparasitaciones

**Files:**
- Create: `veterinaias/supabase/migrations/20260529000004_vaccinations_dewormings.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260529000004_vaccinations_dewormings.sql

CREATE TABLE pet_vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  applied_by UUID NOT NULL REFERENCES user_profiles(id),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  vaccine_catalog_id UUID REFERENCES vaccine_catalog(id) ON DELETE SET NULL,
  vaccine_name TEXT NOT NULL,
  lot_number TEXT,
  application_date DATE NOT NULL,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE pet_dewormings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  applied_by UUID NOT NULL REFERENCES user_profiles(id),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  application_date DATE NOT NULL,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE pet_vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_dewormings ENABLE ROW LEVEL SECURITY;

-- Vacunaciones: cualquier vet autenticado puede leer (historial de plataforma)
-- pero solo el tenant que la creó puede insertar
CREATE POLICY "authenticated_read_pet_vaccinations" ON pet_vaccinations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_insert_pet_vaccinations" ON pet_vaccinations
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());

-- Desparasitaciones: mismas políticas
CREATE POLICY "authenticated_read_pet_dewormings" ON pet_dewormings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_insert_pet_dewormings" ON pet_dewormings
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
```

- [ ] **Step 2: Aplicar la migración**

```bash
cd veterinaias && npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/supabase/migrations/20260529000004_vaccinations_dewormings.sql
git commit -m "feat: add pet_vaccinations and pet_dewormings tables with RLS"
```

---

### Task 2: Actualizar tipos TypeScript

**Files:**
- Modify: `veterinaias/lib/types/database.ts`

- [ ] **Step 1: Agregar interfaces `PetVaccination` y `PetDeworming`**

En `lib/types/database.ts`, añade después de `MedicationCatalog`:

```typescript
export interface PetVaccination {
  id: string
  pet_id: string
  tenant_id: string
  applied_by: string
  medical_record_id: string | null
  vaccine_catalog_id: string | null
  vaccine_name: string
  lot_number: string | null
  application_date: string
  next_due_date: string | null
  notes: string | null
  created_at: string
}

export interface PetDeworming {
  id: string
  pet_id: string
  tenant_id: string
  applied_by: string
  medical_record_id: string | null
  product_name: string
  application_date: string
  next_due_date: string | null
  notes: string | null
  created_at: string
}
```

- [ ] **Step 2: Agregar al tipo `Database`**

Dentro de `Database.public.Tables`, añade:

```typescript
pet_vaccinations: {
  Row: { id: string; pet_id: string; tenant_id: string; applied_by: string; medical_record_id: string | null; vaccine_catalog_id: string | null; vaccine_name: string; lot_number: string | null; application_date: string; next_due_date: string | null; notes: string | null; created_at: string }
  Insert: { pet_id: string; tenant_id: string; applied_by: string; medical_record_id?: string | null; vaccine_catalog_id?: string | null; vaccine_name: string; lot_number?: string | null; application_date: string; next_due_date?: string | null; notes?: string | null }
  Update: Record<string, never>
  Relationships: []
}
pet_dewormings: {
  Row: { id: string; pet_id: string; tenant_id: string; applied_by: string; medical_record_id: string | null; product_name: string; application_date: string; next_due_date: string | null; notes: string | null; created_at: string }
  Insert: { pet_id: string; tenant_id: string; applied_by: string; medical_record_id?: string | null; product_name: string; application_date: string; next_due_date?: string | null; notes?: string | null }
  Update: Record<string, never>
  Relationships: []
}
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/lib/types/database.ts
git commit -m "feat: add PetVaccination and PetDeworming types to database.ts"
```

---

### Task 3: API Routes — Vacunaciones y Desparasitaciones

**Files:**
- Create: `veterinaias/app/api/pets/[id]/vaccinations/route.ts`
- Create: `veterinaias/app/api/pets/[id]/dewormings/route.ts`

- [ ] **Step 1: Crear `app/api/pets/[id]/vaccinations/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const createVaccinationSchema = z.object({
  vaccine_catalog_id: z.string().uuid().optional(),
  vaccine_name: z.string().min(1, 'Nombre de vacuna es requerido'),
  lot_number: z.string().optional(),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
  medical_record_id: z.string().uuid().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data, error } = await (supabase as any)
    .from('pet_vaccinations')
    .select('*, applied_by_profile:applied_by(full_name), tenant:tenant_id(name)')
    .eq('pet_id', id)
    .order('application_date', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener vacunaciones' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })
  const tenantId = (profile as any).tenant_id as string

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = createVaccinationSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { vaccine_catalog_id, ...rest } = result.data

  const { data, error } = await (supabase as any)
    .from('pet_vaccinations')
    .insert({
      ...rest,
      pet_id: id,
      tenant_id: tenantId,
      applied_by: user.id,
      ...(vaccine_catalog_id ? { vaccine_catalog_id } : {}),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al registrar vacunación' }, { status: 500 })

  // Decrementar stock si viene del catálogo
  if (vaccine_catalog_id) {
    await (supabase as any)
      .from('vaccine_catalog')
      .update({ stock_quantity: (supabase as any).rpc('decrement', { x: 1 }) })
      .eq('id', vaccine_catalog_id)
      .eq('tenant_id', tenantId)

    // Forma alternativa si rpc no está disponible:
    const { data: vaccine } = await (supabase as any)
      .from('vaccine_catalog')
      .select('stock_quantity')
      .eq('id', vaccine_catalog_id)
      .single()

    if (vaccine && vaccine.stock_quantity > 0) {
      await (supabase as any)
        .from('vaccine_catalog')
        .update({ stock_quantity: vaccine.stock_quantity - 1 })
        .eq('id', vaccine_catalog_id)
    }
  }

  return NextResponse.json({ data }, { status: 201 })
}
```

**Nota:** El decremento de stock usa un select + update. Para producción, convertir a una función RPC de PostgreSQL para atomicidad. Por ahora es funcional para el caso de uso esperado.

- [ ] **Step 2: Crear `app/api/pets/[id]/dewormings/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const createDewormingSchema = z.object({
  product_name: z.string().min(1, 'Nombre del producto es requerido'),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
  medical_record_id: z.string().uuid().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data, error } = await (supabase as any)
    .from('pet_dewormings')
    .select('*, applied_by_profile:applied_by(full_name), tenant:tenant_id(name)')
    .eq('pet_id', id)
    .order('application_date', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener desparasitaciones' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = createDewormingSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('pet_dewormings')
    .insert({
      ...result.data,
      pet_id: id,
      tenant_id: (profile as any).tenant_id,
      applied_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al registrar desparasitación' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/pets/\[id\]/vaccinations/ veterinaias/app/api/pets/\[id\]/dewormings/
git commit -m "feat: add vaccination and deworming API routes with inventory decrement"
```

---

### Task 4: Componente Modal — Vacunas

**Files:**
- Create: `veterinaias/components/pets/VaccinationsModal.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, Syringe, AlertTriangle } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { PetVaccination, VaccineCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'

const TODAY = new Date().toISOString().split('T')[0]

const vaccinationFormSchema = z.object({
  vaccine_name: z.string().min(1, 'Nombre requerido'),
  vaccine_catalog_id: z.string().uuid().optional(),
  lot_number: z.string().optional(),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})
type VaccinationFormValues = z.infer<typeof vaccinationFormSchema>

interface VaccinationWithProfile extends PetVaccination {
  applied_by_profile?: { full_name: string } | null
  tenant?: { name: string } | null
}

interface VaccinationsModalProps {
  petId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function dueBadge(nextDate: string | null) {
  if (!nextDate) return null
  const now = new Date()
  const due = new Date(nextDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} />Vencida</span>
  if (diffDays <= 30) return <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Próxima en {diffDays}d</span>
  return <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Vigente</span>
}

export function VaccinationsModal({ petId, open, onOpenChange }: VaccinationsModalProps) {
  const [vaccinations, setVaccinations] = useState<VaccinationWithProfile[]>([])
  const [catalogVaccines, setCatalogVaccines] = useState<VaccineCatalog[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationFormSchema) as any,
    defaultValues: { application_date: TODAY },
  })

  async function loadVaccinations() {
    setLoading(true)
    const res = await fetch(`/api/pets/${petId}/vaccinations`)
    const json = await res.json()
    setVaccinations(json.data ?? [])
    setLoading(false)
  }

  async function loadCatalog() {
    const res = await fetch('/api/catalog/vaccines')
    const json = await res.json()
    setCatalogVaccines((json.data ?? []).filter((v: VaccineCatalog) => v.active))
  }

  useEffect(() => {
    if (open) { loadVaccinations(); loadCatalog() }
  }, [open, petId])

  const catalogNames = catalogVaccines.map(v => v.name)

  function onVaccineNameChange(name: string | undefined) {
    setValue('vaccine_name', name ?? '')
    const matched = catalogVaccines.find(v => v.name === name)
    if (matched) {
      setValue('vaccine_catalog_id', matched.id)
      setValue('lot_number', matched.lot_number ?? '')
    } else {
      setValue('vaccine_catalog_id', undefined)
    }
  }

  async function onSubmit(values: VaccinationFormValues) {
    const res = await fetch(`/api/pets/${petId}/vaccinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success('Vacunación registrada')
    setAddOpen(false)
    reset({ application_date: TODAY })
    loadVaccinations()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><Syringe size={16} />Historial de Vacunas</DialogTitle>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mr-6"><Plus size={14} className="mr-1" />Agregar</Button>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
        ) : vaccinations.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
            <p className="text-sm font-medium text-foreground">Sin vacunas registradas</p>
            <p className="text-xs text-muted-foreground mt-1">Agrega las vacunas previas o aplícalas durante una consulta.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Vacuna</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Aplicada</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Próxima</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Lote</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {vaccinations.map(v => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{v.vaccine_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.application_date}</td>
                    <td className="px-4 py-3">{v.next_due_date ? dueBadge(v.next_due_date) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{v.lot_number ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {v.applied_by_profile?.full_name ?? '—'}
                      {v.tenant?.name ? <span className="block text-muted-foreground/60">{v.tenant.name}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sub-modal para agregar */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar vacuna</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Vacuna <span className="text-destructive">*</span></Label>
                <FreeTextCombobox
                  value={watch('vaccine_name')}
                  onChange={v => onVaccineNameChange(v)}
                  options={catalogNames}
                  placeholder="Selecciona del catálogo o escribe..."
                />
              </div>
              <div className="space-y-1">
                <Label>Lote</Label>
                <Input {...register('lot_number')} placeholder="Se pre-llena si seleccionas del catálogo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha de aplicación <span className="text-destructive">*</span></Label>
                  <Input type="date" {...register('application_date')} />
                </div>
                <div className="space-y-1">
                  <Label>Próxima fecha</Label>
                  <Input type="date" {...register('next_due_date')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Input {...register('notes')} placeholder="Reacción, observaciones..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/pets/VaccinationsModal.tsx
git commit -m "feat: add VaccinationsModal with history table and add form"
```

---

### Task 5: Componente Modal — Desparasitaciones

**Files:**
- Create: `veterinaias/components/pets/DewormingsModal.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, AlertTriangle, Bug } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { PetDeworming } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const TODAY = new Date().toISOString().split('T')[0]

const dewormingFormSchema = z.object({
  product_name: z.string().min(1, 'Nombre del producto requerido'),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})
type DewormingFormValues = z.infer<typeof dewormingFormSchema>

interface DewormingWithProfile extends PetDeworming {
  applied_by_profile?: { full_name: string } | null
  tenant?: { name: string } | null
}

interface DewormingsModalProps {
  petId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function dueBadge(nextDate: string | null) {
  if (!nextDate) return null
  const now = new Date()
  const due = new Date(nextDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} />Vencida</span>
  if (diffDays <= 30) return <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Próxima en {diffDays}d</span>
  return <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Vigente</span>
}

export function DewormingsModal({ petId, open, onOpenChange }: DewormingsModalProps) {
  const [dewormings, setDewormings] = useState<DewormingWithProfile[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<DewormingFormValues>({
    resolver: zodResolver(dewormingFormSchema) as any,
    defaultValues: { application_date: TODAY },
  })

  async function loadDewormings() {
    setLoading(true)
    const res = await fetch(`/api/pets/${petId}/dewormings`)
    const json = await res.json()
    setDewormings(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) loadDewormings()
  }, [open, petId])

  async function onSubmit(values: DewormingFormValues) {
    const res = await fetch(`/api/pets/${petId}/dewormings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success('Desparasitación registrada')
    setAddOpen(false)
    reset({ application_date: TODAY })
    loadDewormings()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><Bug size={16} />Historial de Desparasitaciones</DialogTitle>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mr-6"><Plus size={14} className="mr-1" />Agregar</Button>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
        ) : dewormings.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
            <p className="text-sm font-medium text-foreground">Sin desparasitaciones registradas</p>
            <p className="text-xs text-muted-foreground mt-1">Agrega el historial o regístralas durante una consulta.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Producto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Aplicada</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Próxima</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {dewormings.map(d => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{d.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.application_date}</td>
                    <td className="px-4 py-3">{d.next_due_date ? dueBadge(d.next_due_date) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {d.applied_by_profile?.full_name ?? '—'}
                      {d.tenant?.name ? <span className="block text-muted-foreground/60">{d.tenant.name}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar desparasitación</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Producto <span className="text-destructive">*</span></Label>
                <Input {...register('product_name')} placeholder="ej. Bravecto, NexGard, Revolution..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha de aplicación <span className="text-destructive">*</span></Label>
                  <Input type="date" {...register('application_date')} />
                </div>
                <div className="space-y-1">
                  <Label>Próxima fecha</Label>
                  <Input type="date" {...register('next_due_date')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Input {...register('notes')} placeholder="Observaciones..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/pets/DewormingsModal.tsx
git commit -m "feat: add DewormingsModal with history table and add form"
```

---

### Task 6: Actualizar perfil de mascota — botones de cartilla en el hero

**Files:**
- Modify: `veterinaias/app/dashboard/pets/[petId]/page.tsx`

- [ ] **Step 1: Convertir el componente a Client Component o crear un wrapper**

La página de detalle de mascota es un Server Component. Los modales necesitan estado cliente. Crea un componente wrapper:

Crea `veterinaias/components/pets/PetCartillaButtons.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Syringe, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VaccinationsModal } from './VaccinationsModal'
import { DewormingsModal } from './DewormingsModal'

interface PetCartillaButtonsProps {
  petId: string
}

export function PetCartillaButtons({ petId }: PetCartillaButtonsProps) {
  const [vaccinationsOpen, setVaccinationsOpen] = useState(false)
  const [dewormingsOpen, setDewormingsOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVaccinationsOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Syringe size={13} />
          Vacunas
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDewormingsOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Bug size={13} />
          Desparasitaciones
        </Button>
      </div>

      <VaccinationsModal
        petId={petId}
        open={vaccinationsOpen}
        onOpenChange={setVaccinationsOpen}
      />
      <DewormingsModal
        petId={petId}
        open={dewormingsOpen}
        onOpenChange={setDewormingsOpen}
      />
    </>
  )
}
```

- [ ] **Step 2: Agregar `PetCartillaButtons` en el hero de la página de mascota**

En `app/dashboard/pets/[petId]/page.tsx`, importa el componente e insértalo en el hero card (después de la sección de datos de la grilla y antes de las notas):

```typescript
import { PetCartillaButtons } from '@/components/pets/PetCartillaButtons'
```

Agrega dentro del `bg-white` card del pet, después del `grid` de datos y antes del bloque `{pet.notes && ...}`:

```tsx
{/* Cartilla buttons */}
<div className="mt-4 pt-4 border-t border-border/60">
  <p className="label-overline text-muted-foreground/50 mb-2">Cartilla</p>
  <PetCartillaButtons petId={petId} />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/pets/PetCartillaButtons.tsx veterinaias/app/dashboard/pets/\[petId\]/page.tsx
git commit -m "feat: add vaccination and deworming cartilla buttons to pet hero"
```

---

### Task 7: Sección de Vacunas y Desparasitación en el formulario de consulta

**Files:**
- Create: `veterinaias/components/medical-records/VaccinationsField.tsx`
- Create: `veterinaias/components/medical-records/DewormingsField.tsx`
- Modify: `veterinaias/components/medical-records/MedicalRecordForm.tsx`
- Modify: `veterinaias/lib/validations/medical-record.ts`

- [ ] **Step 1: Crear `VaccinationsField.tsx`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useFieldArray, Control, useWatch } from 'react-hook-form'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import type { VaccineCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'
import { Plus, Trash2 } from 'lucide-react'

const TODAY = new Date().toISOString().split('T')[0]

interface VaccinationsFieldProps {
  control: Control<MedicalRecordFormValues>
}

export function VaccinationsField({ control }: VaccinationsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'vaccinations' })
  const [catalogVaccines, setCatalogVaccines] = useState<VaccineCatalog[]>([])
  const vaccinations = useWatch({ control, name: 'vaccinations' })

  useEffect(() => {
    fetch('/api/catalog/vaccines')
      .then(r => r.json())
      .then(j => setCatalogVaccines((j.data ?? []).filter((v: VaccineCatalog) => v.active)))
      .catch(() => {})
  }, [])

  const catalogNames = catalogVaccines.map(v => v.name)

  function onVaccineSelect(index: number, name: string | undefined) {
    control._formValues.vaccinations[index].vaccine_name = name ?? ''
    const matched = catalogVaccines.find(v => v.name === name)
    if (matched) {
      control._formValues.vaccinations[index].vaccine_catalog_id = matched.id
      control._formValues.vaccinations[index].lot_number = matched.lot_number ?? ''
    }
  }

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="border border-border/60 rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Vacuna *</Label>
              <FreeTextCombobox
                value={vaccinations?.[index]?.vaccine_name}
                onChange={v => onVaccineSelect(index, v)}
                options={catalogNames}
                placeholder="Selecciona o escribe..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lote</Label>
              <Input {...control.register(`vaccinations.${index}.lot_number`)} placeholder="Pre-llenado del catálogo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Fecha aplicación</Label>
              <Input type="date" {...control.register(`vaccinations.${index}.application_date`)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Próxima fecha</Label>
              <Input type="date" {...control.register(`vaccinations.${index}.next_due_date`)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2">
              <Input {...control.register(`vaccinations.${index}.notes`)} placeholder="Notas opcionales" />
            </div>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(index)}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ vaccine_name: '', lot_number: '', application_date: TODAY, next_due_date: '', notes: '', vaccine_catalog_id: '' })}
      >
        <Plus size={13} className="mr-1" />Agregar vacuna
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Crear `DewormingsField.tsx`**

```typescript
'use client'
import { useFieldArray, Control } from 'react-hook-form'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

const TODAY = new Date().toISOString().split('T')[0]

interface DewormingsFieldProps {
  control: Control<MedicalRecordFormValues>
}

export function DewormingsField({ control }: DewormingsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'dewormings' })

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="border border-border/60 rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="space-y-1">
            <Label className="text-xs">Producto *</Label>
            <Input {...control.register(`dewormings.${index}.product_name`)} placeholder="ej. Bravecto, NexGard..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Fecha aplicación</Label>
              <Input type="date" {...control.register(`dewormings.${index}.application_date`)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Próxima fecha</Label>
              <Input type="date" {...control.register(`dewormings.${index}.next_due_date`)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2">
              <Input {...control.register(`dewormings.${index}.notes`)} placeholder="Notas opcionales" />
            </div>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(index)}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ product_name: '', application_date: TODAY, next_due_date: '', notes: '' })}
      >
        <Plus size={13} className="mr-1" />Agregar desparasitación
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar `lib/validations/medical-record.ts` — agregar vaccinations y dewormings**

Añade al inicio los sub-schemas:

```typescript
export const vaccinationEntrySchema = z.object({
  vaccine_name: z.string().min(1),
  vaccine_catalog_id: z.string().optional(),
  lot_number: z.string().optional(),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})

export const dewormingEntrySchema = z.object({
  product_name: z.string().min(1),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})
```

Actualiza `medicalRecordSchema` para incluir los dos arrays:

```typescript
export const medicalRecordSchema = z.object({
  // ... (todos los campos existentes)
  vaccinations: z.array(vaccinationEntrySchema).default([]),
  dewormings: z.array(dewormingEntrySchema).default([]),
})
```

Agrega los tipos:

```typescript
export type VaccinationEntryValues = z.infer<typeof vaccinationEntrySchema>
export type DewormingEntryValues = z.infer<typeof dewormingEntrySchema>
```

- [ ] **Step 4: Actualizar `MedicalRecordForm.tsx` — agregar la nueva sección**

Importa los nuevos componentes:

```typescript
import { VaccinationsField } from './VaccinationsField'
import { DewormingsField } from './DewormingsField'
```

Agrega el `defaultValues` en el useForm con los nuevos arrays:

```typescript
defaultValues: {
  pet_id: petId,
  prescriptions: [],
  vaccinations: [],
  dewormings: [],
  ...(appointmentId ? { appointment_id: appointmentId } : {}),
},
```

Agrega la nueva `FormSection` **después** de la sección "Evaluación" (diagnóstico/tratamiento) y **antes** de "Recetas":

```tsx
<FormSection title="Vacunas y Desparasitación">
  <div className="space-y-4">
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Vacunas aplicadas</p>
      <VaccinationsField control={control as any} />
    </div>
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Desparasitaciones</p>
      <DewormingsField control={control as any} />
    </div>
  </div>
</FormSection>
```

- [ ] **Step 5: Commit**

```bash
git add veterinaias/components/medical-records/VaccinationsField.tsx veterinaias/components/medical-records/DewormingsField.tsx veterinaias/components/medical-records/MedicalRecordForm.tsx veterinaias/lib/validations/medical-record.ts
git commit -m "feat: add vaccinations and dewormings section to consultation form"
```

---

### Task 8: Actualizar API de expedientes — guardar vacunaciones y desparasitaciones

**Files:**
- Modify: `veterinaias/app/api/medical-records/route.ts`

- [ ] **Step 1: Actualizar el handler POST para guardar vacunaciones y desparasitaciones**

En `app/api/medical-records/route.ts`, actualiza el handler para extraer y guardar los nuevos arrays:

```typescript
const { prescriptions, vaccinations, dewormings, weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm, ...rest } = result.data

// ... (crear medical_record igual que antes)

// Guardar vacunaciones
if (vaccinations && vaccinations.length > 0) {
  for (const v of vaccinations) {
    if (!v.vaccine_name?.trim()) continue
    const { vaccine_catalog_id, ...vaccinationRest } = v

    await (supabase as any).from('pet_vaccinations').insert({
      ...vaccinationRest,
      pet_id: rest.pet_id,
      tenant_id: profile.tenant_id,
      applied_by: user.id,
      medical_record_id: record.id,
      ...(vaccine_catalog_id ? { vaccine_catalog_id } : {}),
    })

    // Decrementar stock si viene del catálogo
    if (vaccine_catalog_id) {
      const { data: catalogItem } = await (supabase as any)
        .from('vaccine_catalog')
        .select('stock_quantity')
        .eq('id', vaccine_catalog_id)
        .single()
      if (catalogItem && catalogItem.stock_quantity > 0) {
        await (supabase as any)
          .from('vaccine_catalog')
          .update({ stock_quantity: catalogItem.stock_quantity - 1 })
          .eq('id', vaccine_catalog_id)
      }
    }
  }
}

// Guardar desparasitaciones
if (dewormings && dewormings.length > 0) {
  const dewormingRows = dewormings
    .filter(d => d.product_name?.trim())
    .map(d => ({
      ...d,
      pet_id: rest.pet_id,
      tenant_id: profile.tenant_id,
      applied_by: user.id,
      medical_record_id: record.id,
    }))
  if (dewormingRows.length > 0) {
    await (supabase as any).from('pet_dewormings').insert(dewormingRows)
  }
}
```

- [ ] **Step 2: Verificar en browser**

1. Abre una consulta existente o inicia una nueva desde `/dashboard/pets/[petId]/records/new`
2. Verifica que aparezca la sección "Vacunas y Desparasitación" después del bloque de Evaluación
3. Agrega una vacuna, guarda la consulta
4. Abre el perfil de la mascota → clic en "Vacunas" → debe aparecer la vacuna recién registrada
5. Verifica que el stock en Settings › Catálogos › Vacunas se decrementó

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/medical-records/route.ts
git commit -m "feat: save vaccinations and dewormings when creating medical record"
```

---

### Nota de implementación — setValue en VaccinationsField y DewormingsField

`control._formValues` no dispara re-renders en RHF v7. Al implementar `VaccinationsField.tsx` y el combobox de selección de vacuna, en lugar de mutar `control._formValues` directamente, pasar `setValue` como prop desde `MedicalRecordForm.tsx` y usarlo para setear campos:

```typescript
// En MedicalRecordForm.tsx — pasar setValue a VaccinationsField
const { register, handleSubmit, control, setValue, formState: ... } = useForm(...)

<VaccinationsField control={control as any} setValue={setValue as any} />
```

```typescript
// En VaccinationsField.tsx — agregar setValue a la interfaz de props
interface VaccinationsFieldProps {
  control: Control<MedicalRecordFormValues>
  setValue: (name: string, value: unknown) => void
}

// En onVaccineSelect — usar setValue en lugar de control._formValues
function onVaccineSelect(index: number, name: string | undefined) {
  setValue(`vaccinations.${index}.vaccine_name`, name ?? '')
  const matched = catalogVaccines.find(v => v.name === name)
  if (matched) {
    setValue(`vaccinations.${index}.vaccine_catalog_id`, matched.id)
    setValue(`vaccinations.${index}.lot_number`, matched.lot_number ?? '')
  } else {
    setValue(`vaccinations.${index}.vaccine_catalog_id`, undefined)
  }
}
```

Lo mismo aplica para `DewormingsField` si se agregan comboboxes en el futuro.
