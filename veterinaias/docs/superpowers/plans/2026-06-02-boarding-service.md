# Servicio de Hotel (boarding) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar el servicio de Hotel para mascotas (boarding) sobre `service_visits`: reserva por cita → check-in → bitácora diaria → check-out, con su página, detalle y presencia en el dashboard.

**Architecture:** `boarding` ya es un valor del enum `service_type`. Dos tablas de extensión nuevas (`boarding_records`, `boarding_daily_logs`). API espejo de estética bajo `/api/servicios/hotel`. UI: tipo "Hotel" en `NewAppointmentModal`, `BoardingPanel` en el detalle de cita, página `/dashboard/servicios/hotel` con `BoardingStayDetailModal`, y boarding en la banda de servicios activos + un 4º CTA. El check-out reutiliza la función `conclude_service_visit`.

**Tech Stack:** Next.js 14 (App Router), Supabase (Postgres + RLS + RPC), TypeScript, Tailwind, lucide-react, sonner, Zod.

**Spec:** `docs/superpowers/specs/2026-06-02-boarding-service-design.md`

**Convenciones del proyecto (importante):**
- **Sin tests automatizados.** Cada tarea cierra con verificación: `tsc --noEmit` y `eslint` aceptando SOLO los patrones pre-existentes (`@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/exhaustive-deps`).
- **Sin commits por tarea.** Commit final solo cuando el usuario lo pida.
- Comandos desde `/home/cvega/Documentos/Projects/VeterinaIAs/veterinaias`. Project ref Supabase: `qgruuhrgwgjduzlctdlx`.
- Patrón Supabase: `(supabase as any)` para tablas no tipadas; auth + tenant scoping vía `user_profiles.tenant_id`.
- Nomenclatura: visible = **"Hotel"**; `service_type` interno = `boarding`; nombres técnicos = "Boarding".
- Las migraciones SQL se aplican vía MCP `apply_migration` (operación sensible: la aplica el controlador) y se guardan como archivo en `supabase/migrations/`.

---

## File Map

**Nuevos**
- `supabase/migrations/20260602000005_boarding_tables.sql`
- `lib/validations/boarding.ts`
- `app/api/servicios/hotel/route.ts`
- `app/api/servicios/hotel/[id]/route.ts`
- `app/api/servicios/hotel/[id]/daily-logs/route.ts`
- `components/appointments/panels/BoardingPanel.tsx`
- `components/servicios/BoardingStaysTable.tsx`
- `components/servicios/BoardingStayDetailModal.tsx`
- `app/dashboard/servicios/hotel/page.tsx`

**Modificados**
- `lib/validations/appointment.ts` · `lib/constants/service-type.ts` · `components/appointments/NewAppointmentModal.tsx` · `components/appointments/panels/index.ts` · `components/dashboard/ActiveServicesBand.tsx` · `components/dashboard/DashboardCTAs.tsx` · `components/dashboard/DashboardHome.tsx` · `components/dashboard/SidebarNav.tsx`

---

## Task 1: Migración — tablas boarding

**Files:**
- Create: `supabase/migrations/20260602000005_boarding_tables.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- 20260602000005_boarding_tables.sql
-- Servicio de Hotel (boarding): extensión 1:1 + bitácora diaria, sobre service_visits.

CREATE TABLE boarding_records (
  visit_id             UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  expected_check_out   DATE,
  feeding_instructions TEXT,
  belongings           TEXT,
  special_care         TEXT,
  notes                TEXT
);

ALTER TABLE boarding_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_boarding_records" ON boarding_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_boarding_records" ON boarding_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_boarding_records" ON boarding_records
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

CREATE TABLE boarding_daily_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id   UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  fed        BOOLEAN NOT NULL DEFAULT false,
  walked     BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX boarding_daily_logs_visit_id_idx ON boarding_daily_logs(visit_id);

ALTER TABLE boarding_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_boarding_daily_logs" ON boarding_daily_logs
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_boarding_daily_logs" ON boarding_daily_logs
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
```

- [ ] **Step 2: Aplicar la migración (controlador)**

Vía MCP `apply_migration` (project_id `qgruuhrgwgjduzlctdlx`, name `boarding_tables`) con el SQL de arriba. Si ejecutas como subagente sin MCP, reporta NEEDS_CONTEXT.

- [ ] **Step 3: Verificar**

Vía MCP `execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('boarding_records','boarding_daily_logs');
```
Expected: las 2 filas.

---

## Task 2: Validaciones Zod

**Files:**
- Create: `lib/validations/boarding.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { z } from 'zod'

// Check-in: crea la estancia ligada a una cita.
export const boardingCheckInSchema = z.object({
  pet_id: z.string().uuid('Mascota requerida'),
  appointment_id: z.string().uuid('Cita requerida'),
  expected_check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
  feeding_instructions: z.string().optional(),
  belongings: z.string().optional(),
  special_care: z.string().optional(),
})

export const boardingCheckOutSchema = z.object({
  ended_at: z.string().datetime(),
  notes: z.string().optional(),
})

export const boardingDailyLogSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
  notes: z.string().optional(),
  fed: z.boolean().optional().default(false),
  walked: z.boolean().optional().default(false),
})

export type BoardingCheckInValues = z.infer<typeof boardingCheckInSchema>
export type BoardingDailyLogValues = z.infer<typeof boardingDailyLogSchema>
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

---

## Task 3: API lista + check-in (`/api/servicios/hotel/route.ts`)

**Files:**
- Create: `app/api/servicios/hotel/route.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { boardingCheckInSchema } from '@/lib/validations/boarding'

const STAY_SELECT = `
  id, started_at, ended_at, status, created_at, appointment_id,
  pet:pet_id(id, name, species:species_id(name)),
  record:boarding_records(expected_check_out, feeding_instructions, belongings, special_care, notes)
`

function mapStay(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    appointment_id: row.appointment_id,
    pet: row.pet ?? null,
    expected_check_out: record?.expected_check_out ?? null,
    feeding_instructions: record?.feeding_instructions ?? null,
    belongings: record?.belongings ?? null,
    special_care: record?.special_care ?? null,
    notes: record?.notes ?? null,
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id
  const appointmentId = new URL(req.url).searchParams.get('appointmentId')

  if (appointmentId) {
    const { data, error } = await (supabase as any)
      .from('service_visits')
      .select(STAY_SELECT)
      .eq('tenant_id', tenantId)
      .eq('service_type', 'boarding')
      .eq('appointment_id', appointmentId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Error al obtener estancia' }, { status: 500 })
    return NextResponse.json({ data: data ? mapStay(data) : null })
  }

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(STAY_SELECT)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'boarding')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Error al obtener estancias' }, { status: 500 })

  return NextResponse.json({ data: (data ?? []).map(mapStay) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = boardingCheckInSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const data = result.data

  // Resolver owner_id: cita primero, luego pet_registrations
  let ownerId: string | null = null
  const { data: appt } = await (supabase as any)
    .from('appointments').select('owner_id').eq('id', data.appointment_id).eq('tenant_id', tenantId).maybeSingle()
  ownerId = appt?.owner_id ?? null
  if (!ownerId) {
    const { data: reg } = await (supabase as any)
      .from('pet_registrations').select('owner_id').eq('pet_id', data.pet_id).eq('tenant_id', tenantId).maybeSingle()
    ownerId = reg?.owner_id ?? null
  }
  if (!ownerId) return NextResponse.json({ error: 'No se pudo determinar el dueño de la mascota' }, { status: 422 })

  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: data.pet_id,
      owner_id: ownerId,
      appointment_id: data.appointment_id,
      service_type: 'boarding',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single()
  if (visitError) return NextResponse.json({ error: 'Error al crear la estancia' }, { status: 500 })

  const { error: recordError } = await (supabase as any)
    .from('boarding_records')
    .insert({
      visit_id: visit.id,
      expected_check_out: data.expected_check_out ?? null,
      feeding_instructions: data.feeding_instructions ?? null,
      belongings: data.belongings ?? null,
      special_care: data.special_care ?? null,
    })
  if (recordError) {
    await (supabase as any).from('service_visits').delete().eq('id', visit.id)
    return NextResponse.json({ error: 'Error al guardar la recepción' }, { status: 500 })
  }

  return NextResponse.json({ data: { ...visit } }, { status: 201 })
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

- [ ] **Step 3: Verificar el embed contra la DB (service role)**

```bash
KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-) && \
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-) && \
curl -s "$URL/rest/v1/service_visits?select=id,record:boarding_records(expected_check_out,notes)&service_type=eq.boarding&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Expected: `[]` (sin estancias todavía) y **sin** error `PGRST200`.

---

## Task 4: API detalle + check-out (`/api/servicios/hotel/[id]/route.ts`)

**Files:**
- Create: `app/api/servicios/hotel/[id]/route.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { boardingCheckOutSchema } from '@/lib/validations/boarding'

const STAY_SELECT = `
  id, started_at, ended_at, status, created_at, appointment_id,
  pet:pet_id(id, name, species:species_id(name)),
  record:boarding_records(expected_check_out, feeding_instructions, belongings, special_care, notes)
`

function mapStay(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    appointment_id: row.appointment_id,
    pet: row.pet ?? null,
    expected_check_out: record?.expected_check_out ?? null,
    feeding_instructions: record?.feeding_instructions ?? null,
    belongings: record?.belongings ?? null,
    special_care: record?.special_care ?? null,
    notes: record?.notes ?? null,
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(STAY_SELECT)
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'boarding')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Error al obtener estancia' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })

  return NextResponse.json({ data: mapStay(data) })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = boardingCheckOutSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: existing, error: fetchError } = await (supabase as any)
    .from('service_visits').select('ended_at').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (fetchError) return NextResponse.json({ error: 'Error al verificar estancia' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })
  if (existing.ended_at) return NextResponse.json({ error: 'La estancia ya fue concluida' }, { status: 409 })

  // Notas finales -> boarding_records (antes del cierre atómico)
  if (result.data.notes !== undefined) {
    const { error: notesError } = await (supabase as any)
      .from('boarding_records').update({ notes: result.data.notes }).eq('visit_id', id)
    if (notesError) return NextResponse.json({ error: 'Error al guardar notas' }, { status: 500 })
  }

  // Cierre atómico de visita + cita (reutiliza la función de conclusión)
  const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
    p_visit_id: id,
    p_ended_at: result.data.ended_at,
    p_notes: null,
    p_intake_notes: null,
  })
  if (rpcError) return NextResponse.json({ error: 'Error al hacer check-out' }, { status: 500 })

  const { data, error } = await (supabase as any)
    .from('service_visits').select(STAY_SELECT).eq('id', id).eq('tenant_id', tenantId).single()
  if (error) return NextResponse.json({ error: 'Error al obtener estancia actualizada' }, { status: 500 })

  return NextResponse.json({ data: mapStay(data) })
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

---

## Task 5: API bitácora diaria (`/api/servicios/hotel/[id]/daily-logs/route.ts`)

**Files:**
- Create: `app/api/servicios/hotel/[id]/daily-logs/route.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { boardingDailyLogSchema } from '@/lib/validations/boarding'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // RLS limita por tenant a través del visit_id
  const { data, error } = await (supabase as any)
    .from('boarding_daily_logs')
    .select('id, log_date, notes, fed, walked, created_at')
    .eq('visit_id', id)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Error al obtener la bitácora' }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = boardingDailyLogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('boarding_daily_logs')
    .insert({
      visit_id: id,
      log_date: result.data.log_date ?? new Date().toISOString().split('T')[0],
      notes: result.data.notes ?? null,
      fed: result.data.fed ?? false,
      walked: result.data.walked ?? false,
      created_by: user.id,
    })
    .select('id, log_date, notes, fed, walked, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Error al guardar la entrada' }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

---

## Task 6: `service-type.ts` — registrar boarding

**Files:**
- Modify: `lib/constants/service-type.ts`

- [ ] **Step 1: Reemplazar el archivo completo**

```ts
import { Stethoscope, Scissors, BedDouble, type LucideIcon } from 'lucide-react'
import type { ServiceType } from '@/lib/types/database'

/**
 * Service type is differentiated ACROSS THE APP by ICON ONLY (no color).
 * Color is reserved for appointment STATUS — see APPOINTMENT_STATUS_CONFIG.
 * This is the single source of truth for the per-service icon + label.
 */
export const SERVICE_TYPE_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  consultation: { label: 'Médico', Icon: Stethoscope },
  grooming: { label: 'Estético', Icon: Scissors },
  boarding: { label: 'Hotel', Icon: BedDouble },
}

export function serviceTypeConfig(type: ServiceType | undefined | null) {
  return SERVICE_TYPE_CONFIG[type ?? 'consultation'] ?? SERVICE_TYPE_CONFIG.consultation
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

---

## Task 7: `appointment.ts` — enum service_type +boarding

**Files:**
- Modify: `lib/validations/appointment.ts`

- [ ] **Step 1: Reemplazar las 3 ocurrencias del enum**

En `lib/validations/appointment.ts` hay tres líneas con `z.enum(['consultation', 'grooming'])`. Cambiar las tres por `z.enum(['consultation', 'grooming', 'boarding'])` (en `appointmentSchema`, en `updateAppointmentSchema.extend`, y en `firstVisitSchema`). Conservar el resto (`.optional()`, `.default('consultation')`) idéntico.

Usar replace_all sobre el fragmento exacto:
`z.enum(['consultation', 'grooming'])` → `z.enum(['consultation', 'grooming', 'boarding'])`

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

---

## Task 8: `NewAppointmentModal` — tipo Hotel

**Files:**
- Modify: `components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Ampliar el import de iconos**

Buscar:
```tsx
import { Search, Loader2, TriangleAlert, Stethoscope, Scissors } from 'lucide-react'
```
Reemplazar por:
```tsx
import { Search, Loader2, TriangleAlert, Stethoscope, Scissors, BedDouble } from 'lucide-react'
```

- [ ] **Step 2: Ampliar el tipo de `initialAppointmentType`**

Buscar:
```tsx
  /** Pre-select a service type when opening from a service CTA */
  initialAppointmentType?: 'consultation' | 'grooming'
```
Reemplazar por:
```tsx
  /** Pre-select a service type when opening from a service CTA */
  initialAppointmentType?: 'consultation' | 'grooming' | 'boarding'
```

- [ ] **Step 3: Ampliar el estado**

Buscar:
```tsx
  const [appointmentType, setAppointmentType] = useState<'consultation' | 'grooming'>(initialAppointmentType ?? 'consultation')
```
Reemplazar por:
```tsx
  const [appointmentType, setAppointmentType] = useState<'consultation' | 'grooming' | 'boarding'>(initialAppointmentType ?? 'consultation')
```

- [ ] **Step 4: Agregar la opción Hotel al selector (3 columnas)**

Buscar:
```tsx
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setAppointmentType('consultation'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Stethoscope size={28} className="text-primary" />
                </div>
                <span className="font-bold text-base">Médico</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Consulta, vacunas y revisiones</p>
              </button>

              <button
                type="button"
                onClick={() => { setAppointmentType('grooming'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Scissors size={28} className="text-blue-600" />
                </div>
                <span className="font-bold text-base">Estético</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Baño, corte y peluquería</p>
              </button>
            </div>
```
Reemplazar por:
```tsx
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => { setAppointmentType('consultation'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Stethoscope size={28} className="text-primary" />
                </div>
                <span className="font-bold text-base">Médico</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Consulta, vacunas y revisiones</p>
              </button>

              <button
                type="button"
                onClick={() => { setAppointmentType('grooming'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Scissors size={28} className="text-blue-600" />
                </div>
                <span className="font-bold text-base">Estético</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Baño, corte y peluquería</p>
              </button>

              <button
                type="button"
                onClick={() => { setAppointmentType('boarding'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BedDouble size={28} className="text-amber-600" />
                </div>
                <span className="font-bold text-base">Hotel</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Hospedaje por noche</p>
              </button>
            </div>
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

Nota: el payload de envío ya tolera boarding — `groomingExtras` solo aplica a grooming y `reason` solo a consultation, así que para boarding el payload queda `{ ..., service_type: 'boarding' }` sin extras. No requiere más cambios.

---

## Task 9: `BoardingPanel` + registro

**Files:**
- Create: `components/appointments/panels/BoardingPanel.tsx`
- Modify: `components/appointments/panels/index.ts`

- [ ] **Step 1: Crear `BoardingPanel.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { BedDouble, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-input'
import type { PanelProps } from './index'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface Stay {
  id: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  feeding_instructions: string | null
  belongings: string | null
  special_care: string | null
  notes: string | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const ms = Date.now() - new Date(startedAt).getTime()
  return Math.max(1, Math.floor(ms / 86400000) + 1)
}

export function BoardingPanel({ appointment, onClose, onRefresh }: PanelProps) {
  const [loading, setLoading] = useState(false)
  const [stay, setStay] = useState<Stay | null>(null)
  const [saving, setSaving] = useState(false)

  // Check-in form
  const [expectedCheckOut, setExpectedCheckOut] = useState<string | undefined>(undefined)
  const [feeding, setFeeding] = useState('')
  const [belongings, setBelongings] = useState('')
  const [specialCare, setSpecialCare] = useState('')

  // Check-out
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)

  const isActive = ACTIVE_STATUSES.includes(appointment.status)
  const inProgress = stay && stay.started_at && !stay.ended_at
  const completed = stay && stay.ended_at

  useEffect(() => {
    setLoading(true)
    setStay(null)
    fetch(`/api/servicios/hotel?appointmentId=${appointment.id}`)
      .then(r => r.json())
      .then(json => setStay(json.data ?? null))
      .catch(() => setStay(null))
      .finally(() => setLoading(false))
  }, [appointment.id])

  async function handleCheckIn() {
    if (!appointment.pet?.id) return
    setSaving(true)
    try {
      const res = await fetch('/api/servicios/hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: appointment.pet.id,
          appointment_id: appointment.id,
          ...(expectedCheckOut ? { expected_check_out: expectedCheckOut } : {}),
          ...(feeding.trim() ? { feeding_instructions: feeding.trim() } : {}),
          ...(belongings.trim() ? { belongings: belongings.trim() } : {}),
          ...(specialCare.trim() ? { special_care: specialCare.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error en el check-in'); return }
      toast.success('Check-in realizado')
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCheckOut() {
    if (!stay?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${stay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          ...(checkoutNotes.trim() ? { notes: checkoutNotes.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error en el check-out'); return }
      toast.success('Check-out realizado')
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function transition(newStatus: string) {
    setLoadingStatus(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoadingStatus(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-center text-muted-foreground py-1">Cargando estancia…</p>
  }

  if (completed) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">Estancia finalizada</p>
        </div>
        <div className="pl-[22px] space-y-1 text-xs text-green-700">
          <p>Entrada: {formatDate(stay!.started_at)}</p>
          <p>Salida: {formatDate(stay!.ended_at)}</p>
          {stay!.notes && <p className="italic">{stay!.notes}</p>}
        </div>
      </div>
    )
  }

  if (inProgress) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <BedDouble size={14} className="text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">Hospedado · Día {dayNumber(stay!.started_at)}</p>
          </div>
          <div className="pl-[22px] space-y-0.5 text-xs text-amber-700">
            <p>Entrada: {formatDate(stay!.started_at)}</p>
            <p>Salida esperada: {formatDate(stay!.expected_check_out)}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notas de salida (opcional)</Label>
          <Textarea
            placeholder="Estado de la mascota al entregar, observaciones..."
            value={checkoutNotes}
            onChange={e => setCheckoutNotes(e.target.value)}
            className="resize-none h-16 text-sm"
          />
        </div>
        <Button className="w-full" onClick={handleCheckOut} disabled={saving}>
          {saving ? 'Guardando...' : 'Check-out'}
        </Button>
      </div>
    )
  }

  if (!isActive) {
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'completed' && 'Esta reserva ya fue completada.'}
        {appointment.status === 'cancelled' && 'Esta reserva fue cancelada.'}
        {appointment.status === 'no_show' && 'El cliente no se presentó.'}
      </p>
    )
  }

  // Activa, sin estancia — formulario de check-in
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Salida esperada</Label>
        <DateInput value={expectedCheckOut} onChange={v => setExpectedCheckOut(v ?? undefined)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Instrucciones de alimentación</Label>
        <Textarea value={feeding} onChange={e => setFeeding(e.target.value)} className="resize-none h-14 text-sm" placeholder="Qué, cuánto y cuándo come..." />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Pertenencias</Label>
        <Textarea value={belongings} onChange={e => setBelongings(e.target.value)} className="resize-none h-14 text-sm" placeholder="Correa, cobija, juguetes, comida propia..." />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Cuidados especiales / medicación</Label>
        <Textarea value={specialCare} onChange={e => setSpecialCare(e.target.value)} className="resize-none h-14 text-sm" placeholder="Medicamentos, condiciones, alergias..." />
      </div>
      <Button className="w-full justify-center gap-2 py-3 text-base font-semibold" onClick={handleCheckIn} disabled={saving}>
        <BedDouble size={16} />
        {saving ? 'Procesando...' : 'Check-in'}
      </Button>
      <div className="flex items-center justify-center gap-4 pt-1">
        {appointment.status === 'scheduled' && (
          <>
            <button type="button" onClick={() => transition('confirmed')} disabled={loadingStatus === 'confirmed'}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
              {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar reserva'}
            </button>
            <span className="text-border text-xs">·</span>
          </>
        )}
        <button type="button" onClick={() => transition('no_show')} disabled={loadingStatus === 'no_show'}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
          {loadingStatus === 'no_show' ? 'Guardando…' : 'No se presentó'}
        </button>
        <span className="text-border text-xs">·</span>
        <button type="button" onClick={() => transition('cancelled')} disabled={loadingStatus === 'cancelled'}
          className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40">
          {loadingStatus === 'cancelled' ? 'Guardando…' : 'Cancelar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Registrar el panel**

En `components/appointments/panels/index.ts`, importar y registrar `BoardingPanel`. Añadir el import junto a los otros paneles:
```ts
import { BoardingPanel } from './BoardingPanel'
```
y agregar la entrada en el objeto `SERVICE_PANELS`:
```ts
  boarding: BoardingPanel,
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

---

## Task 10: `BoardingStayDetailModal`

**Files:**
- Create: `components/servicios/BoardingStayDetailModal.tsx`

Modal que carga la estancia + bitácora por id, permite agregar entradas y hacer check-out.

- [ ] **Step 1: Crear el componente**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { BedDouble, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface BoardingStay {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  feeding_instructions: string | null
  belongings: string | null
  special_care: string | null
  notes: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

interface DailyLog {
  id: string
  log_date: string
  notes: string | null
  fed: boolean
  walked: boolean
  created_at: string
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function stayDayLabel(startedAt: string | null, expectedCheckOut: string | null): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000) + 1)
  if (!expectedCheckOut) return `Día ${day}`
  const total = Math.max(1, Math.round((new Date(expectedCheckOut + 'T12:00:00').getTime() - new Date(startedAt).getTime()) / 86400000))
  return `Día ${day} de ${total}`
}

interface Props {
  visitId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

export function BoardingStayDetailModal({ visitId, open, onOpenChange, onChanged }: Props) {
  const [stay, setStay] = useState<BoardingStay | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)
  // Add-log form
  const [logNotes, setLogNotes] = useState('')
  const [fed, setFed] = useState(false)
  const [walked, setWalked] = useState(false)
  const [savingLog, setSavingLog] = useState(false)
  // Check-out
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  async function load(id: string) {
    setLoading(true)
    try {
      const [stayRes, logsRes] = await Promise.all([
        fetch(`/api/servicios/hotel/${id}`),
        fetch(`/api/servicios/hotel/${id}/daily-logs`),
      ])
      const stayJson = await stayRes.json()
      const logsJson = await logsRes.json()
      setStay(stayRes.ok ? stayJson.data : null)
      setLogs(logsRes.ok ? (logsJson.data ?? []) : [])
    } catch {
      setStay(null); setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar cuando se abre con un visitId nuevo (set state during render pattern)
  if (open && visitId && visitId !== syncedId) {
    setSyncedId(visitId)
    setLogNotes(''); setFed(false); setWalked(false); setCheckoutNotes('')
    load(visitId)
  }
  if (!open && syncedId !== null) {
    setSyncedId(null)
  }

  async function addLog() {
    if (!visitId) return
    setSavingLog(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}/daily-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: logNotes.trim() || undefined, fed, walked }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      setLogs(prev => [json.data, ...prev])
      setLogNotes(''); setFed(false); setWalked(false)
      toast.success('Entrada agregada')
    } catch {
      toast.error('Error de red.')
    } finally {
      setSavingLog(false)
    }
  }

  async function checkOut() {
    if (!visitId) return
    setCheckingOut(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_at: new Date().toISOString(), ...(checkoutNotes.trim() ? { notes: checkoutNotes.trim() } : {}) }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error en el check-out'); return }
      toast.success('Check-out realizado')
      onOpenChange(false)
      onChanged?.()
    } catch {
      toast.error('Error de red.')
    } finally {
      setCheckingOut(false)
    }
  }

  const inProgress = stay && stay.started_at && !stay.ended_at

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble size={16} className="text-muted-foreground" />
            Detalle de estancia
          </DialogTitle>
        </DialogHeader>

        {loading || !stay ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>
        ) : (
          <div className="space-y-5 mt-1">
            {/* Pet + day */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">{stay.pet?.name ?? '—'}</p>
                {stay.pet?.species?.name && <p className="text-xs text-muted-foreground">{stay.pet.species.name}</p>}
              </div>
              {inProgress && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                  {stayDayLabel(stay.started_at, stay.expected_check_out)}
                </span>
              )}
            </div>

            {/* Dates */}
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 space-y-1 text-sm">
              <p>Entrada: <span className="text-muted-foreground">{formatDate(stay.started_at)}</span></p>
              <p>Salida esperada: <span className="text-muted-foreground">{formatDate(stay.expected_check_out)}</span></p>
              {stay.ended_at && <p>Salida: <span className="text-muted-foreground">{formatDate(stay.ended_at)}</span></p>}
            </div>

            {/* Reception info */}
            <div className="space-y-1.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recepción</p>
              <p><span className="font-medium">Alimentación:</span> {stay.feeding_instructions || '—'}</p>
              <p><span className="font-medium">Pertenencias:</span> {stay.belongings || '—'}</p>
              <p><span className="font-medium">Cuidados:</span> {stay.special_care || '—'}</p>
            </div>

            {/* Daily logs */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bitácora diaria</p>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin entradas todavía.</p>
              ) : (
                <div className="space-y-1.5">
                  {logs.map(l => (
                    <div key={l.id} className="rounded-lg border border-border/60 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{formatDate(l.log_date)}</span>
                        <span className="flex gap-1.5">
                          {l.fed && <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">Alimentó</span>}
                          {l.walked && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Paseó</span>}
                        </span>
                      </div>
                      {l.notes && <p className="text-muted-foreground mt-1">{l.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {inProgress && (
                <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-2 mt-2">
                  <Textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Nota del día…" className="resize-none h-14 text-sm" />
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={fed} onChange={e => setFed(e.target.checked)} /> Alimentó
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={walked} onChange={e => setWalked(e.target.checked)} /> Paseó
                    </label>
                    <Button size="sm" variant="outline" className="ml-auto" onClick={addLog} disabled={savingLog}>
                      <Plus size={13} className="mr-1" />{savingLog ? 'Guardando…' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Final notes (completed) */}
            {!inProgress && stay.notes && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas de salida</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{stay.notes}</p>
              </div>
            )}

            {/* Check-out */}
            {inProgress && (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <Label className="text-xs">Notas de salida (opcional)</Label>
                <Textarea value={checkoutNotes} onChange={e => setCheckoutNotes(e.target.value)} className="resize-none h-16 text-sm" placeholder="Estado al entregar…" />
                <Button className="w-full" onClick={checkOut} disabled={checkingOut}>
                  {checkingOut ? 'Procesando…' : 'Check-out'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verificar tipos + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'
npx eslint components/servicios/BoardingStayDetailModal.tsx -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;for(const m of r)console.log(`${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean")'
```
Expected: `0` y `clean`.

---

## Task 11: Página Hotel + tabla

**Files:**
- Create: `components/servicios/BoardingStaysTable.tsx`
- Create: `app/dashboard/servicios/hotel/page.tsx`

- [ ] **Step 1: Crear `BoardingStaysTable.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BoardingStayDetailModal } from './BoardingStayDetailModal'

interface StayRow {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function dayLabel(startedAt: string | null): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000) + 1)
  return `Día ${day}`
}

export function BoardingStaysTable() {
  const [stays, setStays] = useState<StayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/servicios/hotel')
    const json = await res.json()
    setStays(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openDetail(id: string) {
    setDetailId(id)
    setDetailOpen(true)
  }

  const inProgress = stays.filter(s => s.started_at && !s.ended_at)
  const past = stays.filter(s => s.ended_at)

  function renderRow(s: StayRow) {
    const active = s.started_at && !s.ended_at
    return (
      <tr key={s.id} onClick={() => openDetail(s.id)} className="hover:bg-muted/20 transition-colors cursor-pointer">
        <td className="px-4 py-3">
          {active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{dayLabel(s.started_at)}
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-green-700 bg-green-50 border-green-200">Finalizada</span>
          )}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{s.pet?.name ?? '—'}</p>
          {s.pet?.species?.name && <p className="text-xs text-muted-foreground">{s.pet.species.name}</p>}
        </td>
        <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatDate(s.started_at)}</td>
        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(s.ended_at ?? s.expected_check_out)}</td>
        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => openDetail(s.id)}>
            <Eye size={13} className="mr-1" />Ver
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : stays.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin estancias registradas</p>
          <p className="text-xs text-muted-foreground mt-1">Crea una reserva de hotel desde la agenda o el dashboard.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mascota</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Entrada</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Salida</th>
                <th className="text-right px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {inProgress.map(renderRow)}
              {past.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}

      <BoardingStayDetailModal
        visitId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={() => load()}
      />
    </div>
  )
}
```

- [ ] **Step 2: Crear `app/dashboard/servicios/hotel/page.tsx`**

```tsx
import { BedDouble } from 'lucide-react'
import { BoardingStaysTable } from '@/components/servicios/BoardingStaysTable'

export default function HotelPage() {
  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <BedDouble size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
          Hotel
        </h1>
      </div>
      <BoardingStaysTable />
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'
npx eslint components/servicios/BoardingStaysTable.tsx 'app/dashboard/servicios/hotel/page.tsx' -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;console.log(f.filePath.split("/veterinaias/")[1]);for(const m of r)console.log(`  ${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean")'
```
Expected: `0` y `clean`.

---

## Task 12: `ActiveServicesBand` — label de días + ruteo por tipo

**Files:**
- Modify: `components/dashboard/ActiveServicesBand.tsx`

- [ ] **Step 1: Importar el detalle de boarding**

Buscar:
```tsx
import {
  GroomingSessionDetailModal,
  type GroomingSessionDetail,
} from '@/components/servicios/GroomingSessionDetailModal'
```
Reemplazar por:
```tsx
import {
  GroomingSessionDetailModal,
  type GroomingSessionDetail,
} from '@/components/servicios/GroomingSessionDetailModal'
import { BoardingStayDetailModal } from '@/components/servicios/BoardingStayDetailModal'
```

- [ ] **Step 2: Agregar helper de etiqueta de día**

Justo después de la función `elapsedLabel(...)` (antes de `interface Props`), agregar:
```tsx
function boardingDayLabel(startedAt: string | null, now: number): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((now - new Date(startedAt).getTime()) / 86400000) + 1)
  return `Día ${day}`
}
```

- [ ] **Step 3: Usar el label correcto por tipo**

Buscar:
```tsx
              <span className="flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
                <Timer size={12} />
                {elapsedLabel(item.started_at, now)}
              </span>
```
Reemplazar por:
```tsx
              <span className="flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
                <Timer size={12} />
                {item.service_type === 'boarding' ? boardingDayLabel(item.started_at, now) : elapsedLabel(item.started_at, now)}
              </span>
```

- [ ] **Step 4: Rutear el detalle por service_type**

Buscar el bloque del modal al final del componente:
```tsx
      <GroomingSessionDetailModal
        session={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onFinalized={() => { refresh(); onChanged?.() }}
      />
```
Reemplazar por:
```tsx
      {selected?.service_type === 'boarding' ? (
        <BoardingStayDetailModal
          visitId={detailOpen ? selected.id : null}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onChanged={() => { refresh(); onChanged?.() }}
        />
      ) : (
        <GroomingSessionDetailModal
          session={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onFinalized={() => { refresh(); onChanged?.() }}
        />
      )}
```

- [ ] **Step 5: Verificar tipos + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'
npx eslint components/dashboard/ActiveServicesBand.tsx -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;for(const m of r)console.log(`${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean")'
```
Expected: `0` y `clean`.

---

## Task 13: CTA de Hotel en el dashboard

**Files:**
- Modify: `components/dashboard/DashboardCTAs.tsx`
- Modify: `components/dashboard/DashboardHome.tsx`

- [ ] **Step 1: Reescribir `DashboardCTAs.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { Calendar, Stethoscope, Scissors, BedDouble } from 'lucide-react'

interface DashboardCTAsProps {
  onNewAppointment: () => void
  onNewGrooming: () => void
  onNewBoarding: () => void
}

export function DashboardCTAs({ onNewAppointment, onNewGrooming, onNewBoarding }: DashboardCTAsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <button
        type="button"
        onClick={onNewAppointment}
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
          <Calendar size={17} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nueva cita</p>
          <p className="text-xs text-muted-foreground">Agenda una cita</p>
        </div>
      </button>

      <Link
        href="/dashboard/records/new"
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-green-300 hover:shadow-sm transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
          <Stethoscope size={17} className="text-green-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nueva consulta</p>
          <p className="text-xs text-muted-foreground">Paciente walk-in</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={onNewGrooming}
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
          <Scissors size={17} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nuevo servicio de estética</p>
          <p className="text-xs text-muted-foreground">Sesión walk-in</p>
        </div>
      </button>

      <button
        type="button"
        onClick={onNewBoarding}
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-amber-300 hover:shadow-sm transition-all text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
          <BedDouble size={17} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nueva reserva de hotel</p>
          <p className="text-xs text-muted-foreground">Hospedaje por noche</p>
        </div>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Cablear el handler en `DashboardHome.tsx`**

En `components/dashboard/DashboardHome.tsx`:

(a) Agregar estado para el modal de reserva de hotel — buscar:
```tsx
  const [newGroomingOpen, setNewGroomingOpen] = useState(false)
```
Reemplazar por:
```tsx
  const [newGroomingOpen, setNewGroomingOpen] = useState(false)
  const [newBoardingOpen, setNewBoardingOpen] = useState(false)
```

(b) Pasar el handler a `DashboardCTAs` — buscar:
```tsx
        <DashboardCTAs
          onNewAppointment={() => setNewApptOpen(true)}
          onNewGrooming={() => setNewGroomingOpen(true)}
        />
```
Reemplazar por:
```tsx
        <DashboardCTAs
          onNewAppointment={() => setNewApptOpen(true)}
          onNewGrooming={() => setNewGroomingOpen(true)}
          onNewBoarding={() => setNewBoardingOpen(true)}
        />
```

(c) Renderizar un segundo `NewAppointmentModal` con boarding preseleccionado — buscar:
```tsx
      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        team={team}
        businessHours={businessHours}
      />
```
Reemplazar por:
```tsx
      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        team={team}
        businessHours={businessHours}
      />

      <NewAppointmentModal
        isOpen={newBoardingOpen}
        onClose={() => setNewBoardingOpen(false)}
        team={team}
        businessHours={businessHours}
        initialAppointmentType="boarding"
      />
```

- [ ] **Step 3: Verificar tipos + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'
npx eslint components/dashboard/DashboardCTAs.tsx components/dashboard/DashboardHome.tsx -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;console.log(f.filePath.split("/veterinaias/")[1]);for(const m of r)console.log(`  ${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean")'
```
Expected: `0` y `clean`.

---

## Task 14: SidebarNav — link Hotel

**Files:**
- Modify: `components/dashboard/SidebarNav.tsx`

- [ ] **Step 1: Ampliar el import de iconos**

Buscar:
```tsx
import { Home, Users, PawPrint, Calendar, Settings2, Scissors } from 'lucide-react'
```
Reemplazar por:
```tsx
import { Home, Users, PawPrint, Calendar, Settings2, Scissors, BedDouble } from 'lucide-react'
```

- [ ] **Step 2: Agregar el item de Hotel**

Buscar:
```tsx
const SERVICES_NAV_ITEMS = [
  { href: '/dashboard/servicios/estetica', icon: Scissors, label: 'Estética' },
]
```
Reemplazar por:
```tsx
const SERVICES_NAV_ITEMS = [
  { href: '/dashboard/servicios/estetica', icon: Scissors, label: 'Estética' },
  { href: '/dashboard/servicios/hotel', icon: BedDouble, label: 'Hotel' },
]
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` — expected `0`.

---

## Task 15: Verificación final

- [ ] **Step 1: Typecheck completo**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

- [ ] **Step 2: Lint del set completo (sin nuevas violaciones)**

Run:
```bash
npx eslint \
  app/api/servicios/hotel/route.ts \
  'app/api/servicios/hotel/[id]/route.ts' \
  'app/api/servicios/hotel/[id]/daily-logs/route.ts' \
  lib/validations/boarding.ts lib/validations/appointment.ts lib/constants/service-type.ts \
  components/appointments/NewAppointmentModal.tsx components/appointments/panels/BoardingPanel.tsx components/appointments/panels/index.ts \
  components/servicios/BoardingStaysTable.tsx components/servicios/BoardingStayDetailModal.tsx \
  'app/dashboard/servicios/hotel/page.tsx' \
  components/dashboard/ActiveServicesBand.tsx components/dashboard/DashboardCTAs.tsx components/dashboard/DashboardHome.tsx components/dashboard/SidebarNav.tsx \
  -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;console.log(f.filePath.split("/veterinaias/")[1]);for(const m of r)console.log(`  ${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean (solo patrones pre-existentes)")'
```
Expected: `clean (solo patrones pre-existentes)`

- [ ] **Step 3: Verificación manual (dev server)**

1. Dashboard → CTA "Nueva reserva de hotel" → crear cita de Hotel (cliente registrado, fecha).
2. Abrir esa cita desde el calendario → `BoardingPanel` → **Check-in** con los 4 datos.
3. Dashboard: aparece en "Servicios activos" con **"Día 1"**; click → abre el detalle de estancia.
4. En el detalle: agregar 2 entradas de bitácora (con alimentó/paseó).
5. `/dashboard/servicios/hotel`: la estancia aparece en curso.
6. Check-out (desde el detalle o el panel) con notas → pasa a finalizada, la cita queda `completed`, sale de la banda.

- [ ] **Step 4: Commit (solo cuando el usuario lo pida)**

```bash
git add supabase/migrations/20260602000005_boarding_tables.sql lib/validations/boarding.ts lib/validations/appointment.ts lib/constants/service-type.ts app/api/servicios/hotel/ app/dashboard/servicios/hotel/ components/appointments/ components/servicios/ components/dashboard/
git commit -m "feat: servicio de Hotel (boarding) — reserva, check-in, bitácora diaria y check-out"
```

---

## Self-Review (cobertura del spec)

- Tablas `boarding_records` + `boarding_daily_logs` + RLS → Task 1. ✓
- Validaciones (check-in/out, daily log) → Task 2. ✓
- API lista + check-in → Task 3; detalle + check-out (reutiliza `conclude_service_visit`) → Task 4; bitácora → Task 5. ✓
- `service_type` config (label Hotel, BedDouble) → Task 6. ✓
- Enum de validación de citas +boarding → Task 7. ✓
- Reserva: tipo Hotel en `NewAppointmentModal` → Task 8. ✓
- Check-in/out desde el panel de cita (`BoardingPanel`) + registro → Task 9. ✓
- Modal de detalle (carga por id + bitácora + check-out) → Task 10. ✓
- Página Hotel + tabla (en curso / pasadas) → Task 11. ✓
- Banda de activos: label "Día N" + ruteo de detalle por service_type → Task 12. ✓
- 4º CTA "Nueva reserva de hotel" → Task 13. ✓
- SidebarNav "Hotel" → Task 14. ✓
- Solo-reserva (sin walk-in), bitácora append-only, sin cobro → reflejado (no se construye alta manual ni edición de bitácora). ✓

**Placeholder scan:** sin TBD/TODO; cada paso tiene SQL/código/edición exacta.
**Consistencia de tipos:** `service_type='boarding'` y el shape de estancia (`expected_check_out`, `feeding_instructions`, `belongings`, `special_care`, `notes`, `pet`) son consistentes entre API (Tasks 3-4), detalle (Task 10), tabla (Task 11) y panel (Task 9). `BoardingStayDetailModal` recibe `visitId` en todos sus usos (tabla y banda).
