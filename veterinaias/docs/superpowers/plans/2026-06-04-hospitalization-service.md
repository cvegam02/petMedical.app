# Hospitalization Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the hospitalization service — internamiento clínico that derives from a consultation or surgery, with admission form, daily clinical log, and discharge with prescriptions and optional follow-up appointment.

**Architecture:** New `service_visit` (type `hospitalization`) linked to an origin visit via `source_visit_id` in `hospitalization_records`. Triggered by a "Requiere hospitalización" checkbox in SurgeryDetail's conclusion form, or a "Hospitalizar paciente" button in ConsultationPanel when the appointment is completed. Redirect carries `?from=<visitId>` or `?fromAppt=<appointmentId>`; the hospitalization page resolves pre-fill data via a `/prefill` sub-route and opens `AdmitPatientModal` automatically.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), Zod validation, React Hook Form, shadcn/ui, Tailwind CSS, lucide-react.

---

## File Map

**New files**
- `supabase/migrations/20260604000001_hospitalization_tables.sql`
- `lib/validations/hospitalization.ts`
- `app/api/servicios/hospitalizacion/route.ts`
- `app/api/servicios/hospitalizacion/[id]/route.ts`
- `app/api/servicios/hospitalizacion/[id]/daily-logs/route.ts`
- `app/api/servicios/hospitalizacion/prefill/route.ts`
- `components/appointments/panels/HospitalizationPanel.tsx`
- `components/servicios/AdmitPatientModal.tsx`
- `components/servicios/HospitalizationDetailModal.tsx`
- `components/servicios/HospitalizationTable.tsx`
- `app/dashboard/servicios/hospitalizacion/page.tsx`

**Modified files**
- `lib/constants/service-type.ts` — add hospitalization entry
- `lib/types/database.ts` — add HospitalizationRecord + DailyLog interfaces
- `components/appointments/panels/index.ts` — register HospitalizationPanel
- `components/appointments/panels/ConsultationPanel.tsx` — add "Hospitalizar" button when completed
- `components/servicios/SurgeryDetail.tsx` — add checkbox in ConclusionForm
- `app/api/service-visits/active/route.ts` — embed hospitalization_records
- `components/dashboard/ActiveServicesBand.tsx` — handle hospitalization items
- `components/dashboard/SidebarNav.tsx` — add Hospitalización nav item

---

## Task 1: Migration — hospitalization tables + RLS

**Files:**
- Create: `supabase/migrations/20260604000001_hospitalization_tables.sql`

- [ ] **Step 1: Write migration file**

```sql
-- 20260604000001_hospitalization_tables.sql
CREATE TABLE hospitalization_records (
  visit_id                    UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  source_visit_id             UUID REFERENCES service_visits(id),
  admitted_by                 UUID REFERENCES user_profiles(id),
  reason                      TEXT NOT NULL,
  diagnosis                   TEXT,
  weight_kg                   NUMERIC(5,2),
  treatment_plan              TEXT,
  discharge_notes             TEXT,
  discharge_diagnosis         TEXT,
  post_discharge_instructions TEXT
);

ALTER TABLE hospitalization_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_hospitalization_records" ON hospitalization_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_hospitalization_records" ON hospitalization_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_hospitalization_records" ON hospitalization_records
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

CREATE TABLE hospitalization_daily_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  medications  TEXT,
  fed          BOOLEAN NOT NULL DEFAULT false,
  temperature  NUMERIC(4,1),
  created_by   UUID NOT NULL REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (visit_id, log_date)
);
CREATE INDEX hospitalization_daily_logs_visit_id_idx ON hospitalization_daily_logs(visit_id);

ALTER TABLE hospitalization_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_hosp_daily_logs" ON hospitalization_daily_logs
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_hosp_daily_logs" ON hospitalization_daily_logs
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_hosp_daily_logs" ON hospitalization_daily_logs
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
```

- [ ] **Step 2: Apply migration**

```bash
cd veterinaias
npx supabase db push
```

Expected: migration applies without errors. Verify tables exist in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260604000001_hospitalization_tables.sql
git commit -m "feat: add hospitalization_records and hospitalization_daily_logs tables"
```

---

## Task 2: Types, validations, service-type config

**Files:**
- Modify: `lib/types/database.ts`
- Create: `lib/validations/hospitalization.ts`
- Modify: `lib/constants/service-type.ts`

- [ ] **Step 1: Add types to `lib/types/database.ts`**

Add after the last interface in the file:

```typescript
export interface HospitalizationRecord {
  visit_id: string
  source_visit_id: string | null
  admitted_by: string | null
  reason: string
  diagnosis: string | null
  weight_kg: number | null
  treatment_plan: string | null
  discharge_notes: string | null
  discharge_diagnosis: string | null
  post_discharge_instructions: string | null
}

export interface HospitalizationDailyLog {
  id: string
  visit_id: string
  log_date: string
  notes: string | null
  medications: string | null
  fed: boolean
  temperature: number | null
  created_by: string
  created_at: string
}
```

- [ ] **Step 2: Create `lib/validations/hospitalization.ts`**

```typescript
import { z } from 'zod'

export const admitPatientSchema = z.object({
  source_visit_id: z.string().uuid('Visita de origen requerida'),
  reason: z.string().min(1, 'Motivo de hospitalización requerido'),
  diagnosis: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  treatment_plan: z.string().optional(),
  admitted_by: z.string().uuid().optional(),
})

export const dischargeSchema = z.object({
  ended_at: z.string().datetime(),
  discharge_notes: z.string().optional(),
  discharge_diagnosis: z.string().optional(),
  post_discharge_instructions: z.string().optional(),
  prescriptions: z.array(z.object({
    medication_name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    route_of_administration: z.string().optional(),
    notes: z.string().optional(),
  })).optional().default([]),
})

export const hospitalizationDailyLogSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
  notes: z.string().optional(),
  medications: z.string().optional(),
  fed: z.boolean().optional().default(false),
  temperature: z.number().min(30).max(45).optional(),
})

export type AdmitPatientValues = z.infer<typeof admitPatientSchema>
export type DischargeValues = z.infer<typeof dischargeSchema>
export type HospitalizationDailyLogValues = z.infer<typeof hospitalizationDailyLogSchema>
```

- [ ] **Step 3: Update `lib/constants/service-type.ts`**

```typescript
import { Stethoscope, Scissors, BedDouble, Syringe, HeartPulse, type LucideIcon } from 'lucide-react'
import type { ServiceType } from '@/lib/types/database'

export const SERVICE_TYPE_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  consultation: { label: 'Médico', Icon: Stethoscope },
  grooming: { label: 'Estético', Icon: Scissors },
  boarding: { label: 'Hotel', Icon: BedDouble },
  surgery: { label: 'Cirugía', Icon: Syringe },
  hospitalization: { label: 'Hospitalización', Icon: HeartPulse },
}

export function serviceTypeConfig(type: ServiceType | undefined | null) {
  return SERVICE_TYPE_CONFIG[type ?? 'consultation'] ?? SERVICE_TYPE_CONFIG.consultation
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/types/database.ts lib/validations/hospitalization.ts lib/constants/service-type.ts
git commit -m "feat: add hospitalization types, validations, and service-type config"
```

---

## Task 3: API — POST + GET /api/servicios/hospitalizacion

**Files:**
- Create: `app/api/servicios/hospitalizacion/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { admitPatientSchema } from '@/lib/validations/hospitalization'

const VISIT_SELECT = `
  id, started_at, ended_at, status, created_at,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  record:hospitalization_records(
    source_visit_id, reason, diagnosis, weight_kg, treatment_plan,
    discharge_notes, discharge_diagnosis, post_discharge_instructions
  )
`

function mapRow(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    source_visit_id: record?.source_visit_id ?? null,
    reason: record?.reason ?? null,
    diagnosis: record?.diagnosis ?? null,
    weight_kg: record?.weight_kg ?? null,
    treatment_plan: record?.treatment_plan ?? null,
    discharge_notes: record?.discharge_notes ?? null,
    discharge_diagnosis: record?.discharge_diagnosis ?? null,
    post_discharge_instructions: record?.post_discharge_instructions ?? null,
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

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'hospitalization')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener hospitalizaciones' }, { status: 500 })

  return NextResponse.json({ data: (data ?? []).map(mapRow) })
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

  const result = admitPatientSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const data = result.data

  // Resolve pet_id and owner_id from source visit
  const { data: sourceVisit } = await (supabase as any)
    .from('service_visits')
    .select('pet_id, owner_id')
    .eq('id', data.source_visit_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!sourceVisit) return NextResponse.json({ error: 'Visita de origen no encontrada' }, { status: 404 })

  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: sourceVisit.pet_id,
      owner_id: sourceVisit.owner_id,
      service_type: 'hospitalization',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single()
  if (visitError) return NextResponse.json({ error: 'Error al crear hospitalización' }, { status: 500 })

  const { error: recordError } = await (supabase as any)
    .from('hospitalization_records')
    .insert({
      visit_id: visit.id,
      source_visit_id: data.source_visit_id,
      admitted_by: data.admitted_by ?? user.id,
      reason: data.reason,
      diagnosis: data.diagnosis ?? null,
      weight_kg: data.weight_kg ?? null,
      treatment_plan: data.treatment_plan ?? null,
    })
  if (recordError) {
    await (supabase as any).from('service_visits').delete().eq('id', visit.id)
    return NextResponse.json({ error: 'Error al guardar datos de ingreso' }, { status: 500 })
  }

  return NextResponse.json({ data: { id: visit.id } }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/servicios/hospitalizacion/route.ts
git commit -m "feat: add GET + POST /api/servicios/hospitalizacion"
```

---

## Task 4: API — GET + PATCH /api/servicios/hospitalizacion/[id]

**Files:**
- Create: `app/api/servicios/hospitalizacion/[id]/route.ts`

- [ ] **Step 1: Create route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dischargeSchema } from '@/lib/validations/hospitalization'

const VISIT_SELECT = `
  id, started_at, ended_at, status, created_at,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  record:hospitalization_records(
    source_visit_id, admitted_by, reason, diagnosis, weight_kg, treatment_plan,
    discharge_notes, discharge_diagnosis, post_discharge_instructions
  )
`

function mapRow(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    source_visit_id: record?.source_visit_id ?? null,
    admitted_by: record?.admitted_by ?? null,
    reason: record?.reason ?? null,
    diagnosis: record?.diagnosis ?? null,
    weight_kg: record?.weight_kg ?? null,
    treatment_plan: record?.treatment_plan ?? null,
    discharge_notes: record?.discharge_notes ?? null,
    discharge_diagnosis: record?.discharge_diagnosis ?? null,
    post_discharge_instructions: record?.post_discharge_instructions ?? null,
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
    .select(VISIT_SELECT)
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'hospitalization')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Error al obtener hospitalización' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Hospitalización no encontrada' }, { status: 404 })

  return NextResponse.json({ data: mapRow(data) })
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

  const result = dischargeSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const data = result.data

  const { data: existing } = await (supabase as any)
    .from('service_visits').select('ended_at').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Hospitalización no encontrada' }, { status: 404 })
  if (existing.ended_at) return NextResponse.json({ error: 'La hospitalización ya fue concluida' }, { status: 409 })

  const updateFields: Record<string, unknown> = {}
  if (data.discharge_notes !== undefined) updateFields.discharge_notes = data.discharge_notes
  if (data.discharge_diagnosis !== undefined) updateFields.discharge_diagnosis = data.discharge_diagnosis
  if (data.post_discharge_instructions !== undefined) updateFields.post_discharge_instructions = data.post_discharge_instructions

  if (Object.keys(updateFields).length > 0) {
    const { error: updateError } = await (supabase as any)
      .from('hospitalization_records').update(updateFields).eq('visit_id', id)
    if (updateError) return NextResponse.json({ error: 'Error al guardar datos de alta' }, { status: 500 })
  }

  if (data.prescriptions && data.prescriptions.length > 0) {
    const { data: visitForPet } = await (supabase as any)
      .from('service_visits').select('pet_id, owner_id').eq('id', id).single()
    const rxRows = data.prescriptions.map((rx: any) => ({
      tenant_id: tenantId,
      service_visit_id: id,
      pet_id: visitForPet?.pet_id,
      owner_id: visitForPet?.owner_id,
      medication_name: rx.medication_name,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      route_of_administration: rx.route_of_administration ?? null,
      notes: rx.notes ?? null,
      prescribed_by: user.id,
    }))
    const { error: rxError } = await (supabase as any).from('prescriptions').insert(rxRows)
    if (rxError) return NextResponse.json({ error: 'Error al guardar prescripciones' }, { status: 500 })
  }

  const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
    p_visit_id: id,
    p_ended_at: data.ended_at,
    p_notes: null,
    p_intake_notes: null,
  })
  if (rpcError) return NextResponse.json({ error: 'Error al dar de alta' }, { status: 500 })

  return NextResponse.json({ data: { id } })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/servicios/hospitalizacion/[id]/route.ts
git commit -m "feat: add GET + PATCH /api/servicios/hospitalizacion/[id]"
```

---

## Task 5: API — daily-logs + prefill

**Files:**
- Create: `app/api/servicios/hospitalizacion/[id]/daily-logs/route.ts`
- Create: `app/api/servicios/hospitalizacion/prefill/route.ts`

- [ ] **Step 1: Create daily-logs route**

```typescript
// app/api/servicios/hospitalizacion/[id]/daily-logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hospitalizationDailyLogSchema } from '@/lib/validations/hospitalization'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('hospitalization_daily_logs')
    .select('id, log_date, notes, medications, fed, temperature, created_at')
    .eq('visit_id', id)
    .order('log_date', { ascending: true })
    .order('created_at', { ascending: true })
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

  const result = hospitalizationDailyLogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('hospitalization_daily_logs')
    .upsert({
      visit_id: id,
      log_date: result.data.log_date ?? new Date().toISOString().split('T')[0],
      notes: result.data.notes ?? null,
      medications: result.data.medications ?? null,
      fed: result.data.fed ?? false,
      temperature: result.data.temperature ?? null,
      created_by: user.id,
    }, { onConflict: 'visit_id,log_date' })
    .select('id, log_date, notes, medications, fed, temperature, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Error al guardar la entrada' }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Create prefill route**

This endpoint resolves pre-fill data for the admission modal from either a `visitId` or `appointmentId`.

```typescript
// app/api/servicios/hospitalizacion/prefill/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id
  const url = new URL(req.url)
  const visitId = url.searchParams.get('visitId')
  const appointmentId = url.searchParams.get('appointmentId')

  if (!visitId && !appointmentId)
    return NextResponse.json({ error: 'Debe proveer visitId o appointmentId' }, { status: 400 })

  // Resolve the source service_visit
  let sourceVisit: any = null
  if (visitId) {
    const { data } = await (supabase as any)
      .from('service_visits')
      .select('id, service_type, pet_id, pet:pet_id(id, name, species:species_id(name))')
      .eq('id', visitId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    sourceVisit = data
  } else {
    const { data } = await (supabase as any)
      .from('service_visits')
      .select('id, service_type, pet_id, pet:pet_id(id, name, species:species_id(name))')
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', tenantId)
      .in('service_type', ['consultation', 'surgery'])
      .maybeSingle()
    sourceVisit = data
  }

  if (!sourceVisit) return NextResponse.json({ error: 'Visita de origen no encontrada' }, { status: 404 })

  // Fetch diagnosis from the appropriate records table
  let diagnosis: string | null = null
  if (sourceVisit.service_type === 'surgery') {
    const { data: rec } = await (supabase as any)
      .from('surgery_records')
      .select('diagnosis')
      .eq('visit_id', sourceVisit.id)
      .maybeSingle()
    diagnosis = rec?.diagnosis ?? null
  } else if (sourceVisit.service_type === 'consultation') {
    const { data: rec } = await (supabase as any)
      .from('medical_records')
      .select('diagnosis')
      .eq('service_visit_id', sourceVisit.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    diagnosis = rec?.diagnosis ?? null
  }

  return NextResponse.json({
    data: {
      sourceVisitId: sourceVisit.id,
      serviceType: sourceVisit.service_type,
      pet: sourceVisit.pet ?? null,
      diagnosis,
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/servicios/hospitalizacion/[id]/daily-logs/route.ts app/api/servicios/hospitalizacion/prefill/route.ts
git commit -m "feat: add hospitalization daily-logs and prefill API routes"
```

---

## Task 6: Update active service-visits + panels index + SidebarNav

**Files:**
- Modify: `app/api/service-visits/active/route.ts`
- Modify: `components/appointments/panels/index.ts`
- Modify: `components/dashboard/SidebarNav.tsx`

- [ ] **Step 1: Update active/route.ts to embed hospitalization_records**

In `app/api/service-visits/active/route.ts`, change the `.select(...)` string to add the hospitalization embed:

```typescript
    .select(`
      id, service_type, status, started_at, ended_at, created_at, appointment_id,
      pet:pet_id(id, name, species:species_id(name)),
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name)),
      boarding:boarding_records(expected_check_out),
      hospitalization:hospitalization_records(reason, diagnosis)
    `)
```

Also update the `mapped` block to include hospitalization:

```typescript
  const mapped = (data ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    const boarding = Array.isArray(row.boarding) ? row.boarding[0] : row.boarding
    const hospitalization = Array.isArray(row.hospitalization) ? row.hospitalization[0] : row.hospitalization
    return {
      id: row.id,
      service_type: row.service_type,
      status: row.status,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      appointment_id: row.appointment_id,
      pet: row.pet ?? null,
      services: record?.services ?? [],
      intake_notes: record?.intake_notes ?? null,
      expected_check_out: boarding?.expected_check_out ?? null,
      hosp_reason: hospitalization?.reason ?? null,
    }
  })
```

- [ ] **Step 2: Register HospitalizationPanel in `components/appointments/panels/index.ts`**

```typescript
import type { ComponentType } from 'react'
import type { ServiceType } from '@/lib/types/database'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

export interface PanelProps {
  appointment: DashboardAppointment
  onClose: () => void
  onRefresh: () => void
}

export { ConsultationPanel } from './ConsultationPanel'
export { GroomingPanel } from './GroomingPanel'
export { BoardingPanel } from './BoardingPanel'
export { SurgeryPanel } from './SurgeryPanel'
export { HospitalizationPanel } from './HospitalizationPanel'

import { ConsultationPanel } from './ConsultationPanel'
import { GroomingPanel } from './GroomingPanel'
import { BoardingPanel } from './BoardingPanel'
import { SurgeryPanel } from './SurgeryPanel'
import { HospitalizationPanel } from './HospitalizationPanel'

export const SERVICE_PANELS: Partial<Record<ServiceType, ComponentType<PanelProps>>> = {
  consultation: ConsultationPanel,
  grooming: GroomingPanel,
  boarding: BoardingPanel,
  surgery: SurgeryPanel,
  hospitalization: HospitalizationPanel,
}
```

- [ ] **Step 3: Add Hospitalización to `components/dashboard/SidebarNav.tsx`**

Add `HeartPulse` to lucide imports and add entry to `SERVICES_NAV_ITEMS`:

```typescript
import { Home, Users, PawPrint, Calendar, Settings2, Scissors, BedDouble, Syringe, HeartPulse } from 'lucide-react'

const SERVICES_NAV_ITEMS = [
  { href: '/dashboard/servicios/estetica', icon: Scissors, label: 'Estética' },
  { href: '/dashboard/servicios/hotel', icon: BedDouble, label: 'Hotel' },
  { href: '/dashboard/servicios/cirugia', icon: Syringe, label: 'Cirugía' },
  { href: '/dashboard/servicios/hospitalizacion', icon: HeartPulse, label: 'Hospitalización' },
]
```

- [ ] **Step 4: Commit**

```bash
git add app/api/service-visits/active/route.ts components/appointments/panels/index.ts components/dashboard/SidebarNav.tsx
git commit -m "feat: register HospitalizationPanel, add sidebar nav, update active visits embed"
```

---

## Task 7: HospitalizationPanel (appointment panel)

**Files:**
- Create: `components/appointments/panels/HospitalizationPanel.tsx`

This panel shows in the appointment detail dialog for `hospitalization` type appointments. Since hospitalizations don't have their own appointment, this panel handles the rare case where `service_type='hospitalization'` appears.

- [ ] **Step 1: Create the panel**

```typescript
// components/appointments/panels/HospitalizationPanel.tsx
'use client'
import { useState, useEffect } from 'react'
import { HeartPulse, CheckCircle2 } from 'lucide-react'
import type { PanelProps } from './index'

interface HospStub {
  id: string
  started_at: string | null
  ended_at: string | null
  reason: string | null
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const start = new Date(startedAt)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(1, Math.round((todayDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

export function HospitalizationPanel({ appointment }: PanelProps) {
  const [loading, setLoading] = useState(false)
  const [hosp, setHosp] = useState<HospStub | null>(null)

  useEffect(() => {
    if (!appointment.id) return
    setLoading(true)
    fetch(`/api/servicios/hospitalizacion?appointmentId=${appointment.id}`)
      .then(r => r.json())
      .then(json => {
        const list = json.data ?? []
        setHosp(list[0] ?? null)
      })
      .catch(() => setHosp(null))
      .finally(() => setLoading(false))
  }, [appointment.id])

  if (loading) return <p className="text-sm text-center text-muted-foreground py-1">Cargando…</p>

  if (hosp?.ended_at) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2">
        <CheckCircle2 size={14} className="text-green-600 shrink-0" />
        <p className="text-sm font-semibold text-green-800">Alta completada</p>
      </div>
    )
  }

  if (hosp?.started_at) {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 space-y-1">
        <div className="flex items-center gap-2">
          <HeartPulse size={14} className="text-blue-600 shrink-0" />
          <p className="text-sm font-semibold text-blue-800">Hospitalizado · Día {dayNumber(hosp.started_at)}</p>
        </div>
        {hosp.reason && <p className="text-xs text-blue-700 pl-[22px]">{hosp.reason}</p>}
      </div>
    )
  }

  return (
    <p className="text-sm text-center text-muted-foreground py-1">Sin datos de hospitalización.</p>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/appointments/panels/HospitalizationPanel.tsx
git commit -m "feat: add HospitalizationPanel for appointment detail dialog"
```

---

## Task 8: Add "Requiere hospitalización" to SurgeryDetail + ConsultationPanel

**Files:**
- Modify: `components/servicios/SurgeryDetail.tsx`
- Modify: `components/appointments/panels/ConsultationPanel.tsx`

- [ ] **Step 1: Add checkbox to SurgeryDetail's ConclusionForm**

In `components/servicios/SurgeryDetail.tsx`, add `useRouter` import and a state for the checkbox. The `ConclusionForm` component receives `visitId`; after successful submit, if checkbox is checked, redirect.

Add imports at top of file (after existing imports):
```typescript
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
```

Add state inside `ConclusionForm` (after `endedAtLocal` state):
```typescript
const router = useRouter()
const [requiresHosp, setRequiresHosp] = useState(false)
```

Change the `onSubmit` success block from:
```typescript
    toast.success('Cirugía registrada y concluida')
    onSuccess()
```
to:
```typescript
    toast.success('Cirugía registrada y concluida')
    if (requiresHosp) {
      router.push(`/dashboard/servicios/hospitalizacion?from=${visitId}`)
    } else {
      onSuccess()
    }
```

Add the checkbox UI as the last item inside the `<form>`, just before the submit button section. Find the submit button block and add above it:

```tsx
          {/* Hospitalización */}
          <div className="px-6 py-4 flex items-center gap-3">
            <Checkbox
              id="requires-hosp"
              checked={requiresHosp}
              onCheckedChange={v => setRequiresHosp(v === true)}
            />
            <label htmlFor="requires-hosp" className="text-sm font-medium cursor-pointer select-none">
              Requiere hospitalización post-quirúrgica
            </label>
          </div>
```

- [ ] **Step 2: Add "Hospitalizar" button to ConsultationPanel when completed**

In `components/appointments/panels/ConsultationPanel.tsx`, change the `!isActive` return block:

Find:
```typescript
  if (!isActive) {
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'completed' && 'Esta cita ya fue completada.'}
        {appointment.status === 'cancelled' && 'Esta cita fue cancelada.'}
        {appointment.status === 'no_show' && 'El paciente no se presentó.'}
      </p>
    )
  }
```

Replace with:
```typescript
  if (!isActive) {
    if (appointment.status === 'completed') {
      return (
        <div className="space-y-2">
          <p className="text-sm text-center text-muted-foreground py-1">Esta cita ya fue completada.</p>
          <Link
            href={`/dashboard/servicios/hospitalizacion?fromAppt=${appointment.id}`}
            className={`${buttonVariants({ variant: 'outline' })} w-full justify-center gap-2 text-sm`}
          >
            <HeartPulse size={14} />
            Hospitalizar paciente
          </Link>
        </div>
      )
    }
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'cancelled' && 'Esta cita fue cancelada.'}
        {appointment.status === 'no_show' && 'El paciente no se presentó.'}
      </p>
    )
  }
```

Add missing imports at the top of `ConsultationPanel.tsx`:
```typescript
import Link from 'next/link'
import { ArrowRight, HeartPulse } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
```

(Replace the existing `ArrowRight` import if already present — it's not in the current file, so add all three.)

- [ ] **Step 3: Commit**

```bash
git add components/servicios/SurgeryDetail.tsx components/appointments/panels/ConsultationPanel.tsx
git commit -m "feat: add hospitalization trigger to SurgeryDetail and ConsultationPanel"
```

---

## Task 9: AdmitPatientModal

**Files:**
- Create: `components/servicios/AdmitPatientModal.tsx`

This modal is opened from the hospitalization page when `?from=<visitId>` or `?fromAppt=<appointmentId>` is in the URL. It fetches pre-fill data from `/api/servicios/hospitalizacion/prefill` and submits to `POST /api/servicios/hospitalizacion`.

- [ ] **Step 1: Create the modal**

```typescript
// components/servicios/AdmitPatientModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { HeartPulse } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PrefillData {
  sourceVisitId: string
  serviceType: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  diagnosis: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitId?: string | null
  appointmentId?: string | null
  onAdmitted: (hospVisitId: string) => void
}

export function AdmitPatientModal({ open, onOpenChange, visitId, appointmentId, onAdmitted }: Props) {
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const [loadingPrefill, setLoadingPrefill] = useState(false)

  const [reason, setReason] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!visitId && !appointmentId) return

    setLoadingPrefill(true)
    const param = visitId ? `visitId=${visitId}` : `appointmentId=${appointmentId}`
    fetch(`/api/servicios/hospitalizacion/prefill?${param}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setPrefill(json.data)
          setDiagnosis(json.data.diagnosis ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrefill(false))
  }, [open, visitId, appointmentId])

  function reset() {
    setPrefill(null)
    setReason('')
    setDiagnosis('')
    setWeightKg('')
    setTreatmentPlan('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prefill?.sourceVisitId) return
    if (!reason.trim()) { toast.error('El motivo es requerido'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/servicios/hospitalizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_visit_id: prefill.sourceVisitId,
          reason: reason.trim(),
          ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
          ...(weightKg ? { weight_kg: parseFloat(weightKg) } : {}),
          ...(treatmentPlan.trim() ? { treatment_plan: treatmentPlan.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al registrar ingreso'); return }
      toast.success('Paciente hospitalizado')
      reset()
      onOpenChange(false)
      onAdmitted(json.data.id)
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const serviceLabel = prefill?.serviceType === 'surgery' ? 'Cirugía' : 'Consulta'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse size={18} className="text-primary/60" />
            Registrar ingreso
          </DialogTitle>
        </DialogHeader>

        {loadingPrefill ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando datos…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {prefill?.pet && (
              <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 space-y-0.5">
                <p className="text-sm font-semibold">{prefill.pet.name}</p>
                <p className="text-xs text-muted-foreground">
                  {prefill.pet.species?.name ?? '—'} · Origen: {serviceLabel}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">
                Motivo de hospitalización <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Descripción del motivo de internamiento…"
                className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">Diagnóstico al ingreso</Label>
              <Input
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="Pre-cargado de la consulta/cirugía, editable"
                className="bg-muted/30 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">Peso al ingreso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  placeholder="0.0"
                  className="bg-muted/30 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">Plan de tratamiento inicial</Label>
              <Textarea
                value={treatmentPlan}
                onChange={e => setTreatmentPlan(e.target.value)}
                placeholder="Medicación, procedimientos planificados…"
                className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving || !prefill}>
              {saving ? 'Registrando ingreso…' : 'Registrar ingreso'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/servicios/AdmitPatientModal.tsx
git commit -m "feat: add AdmitPatientModal with prefill from source visit"
```

---

## Task 10: HospitalizationDetailModal

**Files:**
- Create: `components/servicios/HospitalizationDetailModal.tsx`

Detail modal with daily log list + add log form + discharge form with prescriptions.

- [ ] **Step 1: Create the modal**

```typescript
// components/servicios/HospitalizationDetailModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { HeartPulse, CheckCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { HospitalizationDailyLog } from '@/lib/types/database'

interface HospVisit {
  id: string
  started_at: string | null
  ended_at: string | null
  status: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  reason: string | null
  diagnosis: string | null
  weight_kg: number | null
  treatment_plan: string | null
  discharge_notes: string | null
  discharge_diagnosis: string | null
  post_discharge_instructions: string | null
}

interface Props {
  visitId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
  onScheduleFollowUp?: (petId: string) => void
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const start = new Date(startedAt)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(1, Math.round((todayDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function HospitalizationDetailModal({ visitId, open, onOpenChange, onChanged, onScheduleFollowUp }: Props) {
  const [hosp, setHosp] = useState<HospVisit | null>(null)
  const [logs, setLogs] = useState<HospitalizationDailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // Daily log form state
  const [logNotes, setLogNotes] = useState('')
  const [logMeds, setLogMeds] = useState('')
  const [logFed, setLogFed] = useState(false)
  const [logTemp, setLogTemp] = useState('')
  const [savingLog, setSavingLog] = useState(false)

  // Discharge form state
  const [showDischarge, setShowDischarge] = useState(false)
  const [dischargeNotes, setDischargeNotes] = useState('')
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('')
  const [dischargeInstructions, setDischargeInstructions] = useState('')
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)
  const [dischargeSaving, setDischargeSaving] = useState(false)

  async function load(id: string) {
    setLoading(true)
    try {
      const [hospRes, logsRes] = await Promise.all([
        fetch(`/api/servicios/hospitalizacion/${id}`),
        fetch(`/api/servicios/hospitalizacion/${id}/daily-logs`),
      ])
      const hospJson = await hospRes.json()
      const logsJson = await logsRes.json()
      setHosp(hospRes.ok ? hospJson.data : null)
      setLogs(logsRes.ok ? logsJson.data ?? [] : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && visitId && visitId !== syncedId) {
      setSyncedId(visitId)
      load(visitId)
    }
    if (!open) {
      setHosp(null)
      setLogs([])
      setSyncedId(null)
      setShowDischarge(false)
    }
  }, [open, visitId])

  async function handleAddLog() {
    if (!visitId) return
    setSavingLog(true)
    try {
      const res = await fetch(`/api/servicios/hospitalizacion/${visitId}/daily-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: logNotes.trim() || undefined,
          medications: logMeds.trim() || undefined,
          fed: logFed,
          temperature: logTemp ? parseFloat(logTemp) : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar entrada'); return }
      toast.success('Entrada registrada')
      setLogNotes(''); setLogMeds(''); setLogFed(false); setLogTemp('')
      setLogs(prev => {
        const existing = prev.findIndex(l => l.log_date === json.data.log_date)
        if (existing >= 0) {
          return prev.map((l, i) => i === existing ? json.data : l)
        }
        return [...prev, json.data].sort((a, b) => a.log_date.localeCompare(b.log_date))
      })
    } catch {
      toast.error('Error de red.')
    } finally {
      setSavingLog(false)
    }
  }

  async function handleDischarge() {
    if (!visitId) return
    setDischargeSaving(true)
    try {
      const res = await fetch(`/api/servicios/hospitalizacion/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          discharge_notes: dischargeNotes.trim() || undefined,
          discharge_diagnosis: dischargeDiagnosis.trim() || undefined,
          post_discharge_instructions: dischargeInstructions.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al dar de alta'); return }
      toast.success('Alta registrada')
      onChanged?.()
      if (scheduleFollowUp && hosp?.pet?.id) {
        onOpenChange(false)
        onScheduleFollowUp?.(hosp.pet.id)
      } else {
        onOpenChange(false)
      }
    } catch {
      toast.error('Error de red.')
    } finally {
      setDischargeSaving(false)
    }
  }

  const inProgress = hosp?.started_at && !hosp.ended_at

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse size={18} className="text-primary/60" />
            {loading ? 'Cargando…' : (hosp?.pet?.name ?? 'Hospitalización')}
            {inProgress && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · Día {dayNumber(hosp!.started_at)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-center text-muted-foreground py-8">Cargando…</p>}

        {!loading && hosp && (
          <div className="space-y-5 pt-1">
            {/* Completed banner */}
            {hosp.ended_at && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Alta completada</p>
                  <p className="text-xs text-green-700 mt-0.5">Egreso: {formatDate(hosp.ended_at)}</p>
                </div>
              </div>
            )}

            {/* Admission info */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Ingreso</p>
              {hosp.reason && (
                <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">Motivo</p>
                  <p className="text-sm">{hosp.reason}</p></div>
              )}
              {hosp.diagnosis && (
                <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Diagnóstico</p>
                  <p className="text-sm">{hosp.diagnosis}</p></div>
              )}
              {hosp.treatment_plan && (
                <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Plan de tratamiento</p>
                  <p className="text-sm">{hosp.treatment_plan}</p></div>
              )}
            </div>

            {/* Daily logs */}
            <div>
              <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-3">Bitácora diaria</p>
              {logs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">Sin entradas aún.</p>
              )}
              <div className="space-y-2 mb-4">
                {logs.map(log => (
                  <div key={log.id} className="rounded-lg border border-border bg-card px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground/60">{formatDate(log.log_date)}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {log.fed && <span className="text-green-600 font-medium">✓ Alimentado</span>}
                        {log.temperature != null && <span>{log.temperature}°C</span>}
                      </div>
                    </div>
                    {log.notes && <p className="text-sm">{log.notes}</p>}
                    {log.medications && <p className="text-xs text-muted-foreground">Meds: {log.medications}</p>}
                  </div>
                ))}
              </div>

              {/* Add log form — only when in progress */}
              {inProgress && (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground/60">Nueva entrada de hoy</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Notas de evolución</Label>
                    <Textarea value={logNotes} onChange={e => setLogNotes(e.target.value)}
                      className="resize-none h-16 text-sm" placeholder="Estado general, observaciones…" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Medicamentos administrados</Label>
                    <Input value={logMeds} onChange={e => setLogMeds(e.target.value)}
                      className="text-sm" placeholder="Medicación, dosis…" />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">Temperatura (°C)</Label>
                      <Input type="number" step="0.1" min="30" max="45"
                        value={logTemp} onChange={e => setLogTemp(e.target.value)}
                        className="text-sm" placeholder="38.5" />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <Checkbox id="fed" checked={logFed} onCheckedChange={v => setLogFed(v === true)} />
                      <label htmlFor="fed" className="text-sm cursor-pointer">Alimentado</label>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleAddLog} disabled={savingLog}>
                    <Plus size={14} />
                    {savingLog ? 'Guardando…' : 'Agregar entrada'}
                  </Button>
                </div>
              )}
            </div>

            {/* Discharge section — only when in progress */}
            {inProgress && !showDischarge && (
              <Button variant="destructive" className="w-full" onClick={() => setShowDischarge(true)}>
                Dar de alta
              </Button>
            )}

            {inProgress && showDischarge && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <p className="text-sm font-bold">Alta hospitalaria</p>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Notas de egreso</Label>
                  <Textarea value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)}
                    className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                    placeholder="Estado al egreso, evolución general…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Diagnóstico final</Label>
                  <Input value={dischargeDiagnosis} onChange={e => setDischargeDiagnosis(e.target.value)}
                    className="bg-muted/30 focus:bg-white transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Instrucciones para el dueño</Label>
                  <Textarea value={dischargeInstructions} onChange={e => setDischargeInstructions(e.target.value)}
                    className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                    placeholder="Cuidados en casa, restricciones, señales de alerta…" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="follow-up" checked={scheduleFollowUp}
                    onCheckedChange={v => setScheduleFollowUp(v === true)} />
                  <label htmlFor="follow-up" className="text-sm cursor-pointer">
                    Agendar cita de seguimiento (consulta)
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDischarge(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handleDischarge} disabled={dischargeSaving}>
                    {dischargeSaving ? 'Guardando…' : 'Confirmar alta'}
                  </Button>
                </div>
              </div>
            )}

            {/* Completed discharge summary */}
            {hosp.ended_at && (hosp.discharge_notes || hosp.discharge_diagnosis || hosp.post_discharge_instructions) && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Alta</p>
                {hosp.discharge_diagnosis && (
                  <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">Diagnóstico final</p>
                    <p className="text-sm">{hosp.discharge_diagnosis}</p></div>
                )}
                {hosp.discharge_notes && (
                  <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Notas de egreso</p>
                    <p className="text-sm">{hosp.discharge_notes}</p></div>
                )}
                {hosp.post_discharge_instructions && (
                  <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Instrucciones</p>
                    <p className="text-sm">{hosp.post_discharge_instructions}</p></div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/servicios/HospitalizationDetailModal.tsx
git commit -m "feat: add HospitalizationDetailModal with daily log and discharge"
```

---

## Task 11: HospitalizationTable + Hospitalization page

**Files:**
- Create: `components/servicios/HospitalizationTable.tsx`
- Create: `app/dashboard/servicios/hospitalizacion/page.tsx`

- [ ] **Step 1: Create HospitalizationTable**

```typescript
// components/servicios/HospitalizationTable.tsx
'use client'
import { useEffect, useState } from 'react'
import { HeartPulse } from 'lucide-react'

interface HospRow {
  id: string
  started_at: string | null
  ended_at: string | null
  status: string
  reason: string | null
  diagnosis: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const start = new Date(startedAt)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(1, Math.round((todayDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

interface Props {
  onSelect: (visitId: string) => void
}

export function HospitalizationTable({ onSelect }: Props) {
  const [rows, setRows] = useState<HospRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/servicios/hospitalizacion')
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('hospitalization:changed', handler)
    return () => window.removeEventListener('hospitalization:changed', handler)
  }, [])

  const active = rows.filter(r => r.started_at && !r.ended_at)
  const history = rows.filter(r => r.ended_at)

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section>
          <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-3">En curso</p>
          <div className="space-y-2">
            {active.map(row => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className="w-full text-left rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3.5 hover:shadow-sm hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{row.pet?.name ?? '—'}</p>
                      {row.reason && <p className="text-xs text-muted-foreground truncate">{row.reason}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-blue-700 whitespace-nowrap shrink-0">
                    Día {dayNumber(row.started_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-3">Historial</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Paciente</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Motivo</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Ingreso</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map(row => (
                  <tr key={row.id} onClick={() => onSelect(row.id)}
                    className="hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium">{row.pet?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.started_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.ended_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <HeartPulse size={32} className="text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">No hay hospitalizaciones registradas.</p>
          <p className="text-xs text-muted-foreground/60">
            Las hospitalizaciones se inician desde la consulta o cirugía del paciente.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the hospitalization page**

This page handles the `?from=<visitId>` and `?fromAppt=<appointmentId>` query params to auto-open the admission modal. It also wires `NewAppointmentModal` for follow-up scheduling.

```typescript
// app/dashboard/servicios/hospitalizacion/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { HeartPulse } from 'lucide-react'
import { HospitalizationTable } from '@/components/servicios/HospitalizationTable'
import { AdmitPatientModal } from '@/components/servicios/AdmitPatientModal'
import { HospitalizationDetailModal } from '@/components/servicios/HospitalizationDetailModal'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'

export default function HospitalizacionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const fromVisitId = searchParams.get('from')
  const fromApptId = searchParams.get('fromAppt')

  const [admitOpen, setAdmitOpen] = useState(false)
  const [detailVisitId, setDetailVisitId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [followUpPetId, setFollowUpPetId] = useState<string | null>(null)

  // Auto-open admission modal when redirected from surgery/consultation
  useEffect(() => {
    if (fromVisitId || fromApptId) {
      setAdmitOpen(true)
    }
  }, [fromVisitId, fromApptId])

  function clearAdmitParams() {
    router.replace('/dashboard/servicios/hospitalizacion')
  }

  function handleAdmitted(hospVisitId: string) {
    clearAdmitParams()
    setDetailVisitId(hospVisitId)
    setDetailOpen(true)
    window.dispatchEvent(new Event('hospitalization:changed'))
  }

  function handleScheduleFollowUp(petId: string) {
    setFollowUpPetId(petId)
    setFollowUpOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <HeartPulse size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Hospitalización
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Internamiento clínico. Se inicia desde la consulta o cirugía del paciente.
          </p>
        </div>
      </div>

      <HospitalizationTable
        onSelect={id => { setDetailVisitId(id); setDetailOpen(true) }}
      />

      <AdmitPatientModal
        open={admitOpen}
        onOpenChange={v => { setAdmitOpen(v); if (!v) clearAdmitParams() }}
        visitId={fromVisitId}
        appointmentId={fromApptId}
        onAdmitted={handleAdmitted}
      />

      <HospitalizationDetailModal
        visitId={detailVisitId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={() => window.dispatchEvent(new Event('hospitalization:changed'))}
        onScheduleFollowUp={handleScheduleFollowUp}
      />

      {followUpOpen && followUpPetId && (
        <NewAppointmentModal
          open={followUpOpen}
          onOpenChange={setFollowUpOpen}
          initialPetId={followUpPetId}
          initialAppointmentType="consultation"
          onSuccess={() => setFollowUpOpen(false)}
        />
      )}
    </div>
  )
}
```

> **Note:** `NewAppointmentModal` may not accept `initialPetId` and `initialAppointmentType` props yet. If those props don't exist, open the modal without pre-fill — the staff will select the pet manually. Do not modify `NewAppointmentModal` as part of this task; leave a `// TODO: pre-fill pet` comment if needed.

- [ ] **Step 3: Commit**

```bash
git add components/servicios/HospitalizationTable.tsx app/dashboard/servicios/hospitalizacion/page.tsx
git commit -m "feat: add HospitalizationTable and hospitalization page with admit + detail modals"
```

---

## Task 12: Update ActiveServicesBand for hospitalization

**Files:**
- Modify: `components/dashboard/ActiveServicesBand.tsx`

- [ ] **Step 1: Add hospitalization routing to ActiveServicesBand**

The band needs to open `HospitalizationDetailModal` for hospitalization items, and show "Día N" label.

Add import at top of file:
```typescript
import { HospitalizationDetailModal } from '@/components/servicios/HospitalizationDetailModal'
```

Add state for hospitalization detail:
```typescript
const [hospDetailId, setHospDetailId] = useState<string | null>(null)
const [hospDetailOpen, setHospDetailOpen] = useState(false)
```

Update `openDetail` to route by service type:
```typescript
function openDetail(item: ActiveServiceItem) {
  if (item.service_type === 'hospitalization') {
    setHospDetailId(item.id)
    setHospDetailOpen(true)
  } else {
    setSelected(item)
    setDetailOpen(true)
  }
}
```

Add the `boardingDayLabel` fallthrough for hospitalization in the time label (find the existing ternary and add a case):

```typescript
{item.service_type === 'boarding' || item.service_type === 'hospitalization'
  ? boardingDayLabel(item.started_at, item.expected_check_out, now)
  : elapsedLabel(item.started_at, now)}
```

Add the `HospitalizationDetailModal` at the end of the component's JSX (after the `BoardingStayDetailModal`):
```tsx
<HospitalizationDetailModal
  visitId={hospDetailOpen ? hospDetailId : null}
  open={hospDetailOpen}
  onOpenChange={setHospDetailOpen}
  onChanged={() => { refresh(); onChanged?.() }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/ActiveServicesBand.tsx
git commit -m "feat: handle hospitalization items in ActiveServicesBand"
```

---

## Verification

- [ ] **Manual check 1: Trigger from surgery**
  1. Open a surgery appointment detail, go to the surgery detail page.
  2. Fill the conclusion form, check "Requiere hospitalización post-quirúrgica", submit.
  3. Verify redirect to `/dashboard/servicios/hospitalizacion?from=<visitId>`.
  4. Verify `AdmitPatientModal` opens with pet info pre-filled and diagnosis from surgery.

- [ ] **Manual check 2: Trigger from consultation**
  1. Open a completed consultation appointment detail.
  2. Verify "Hospitalizar paciente" button is visible.
  3. Click it — verify redirect to `/dashboard/servicios/hospitalizacion?fromAppt=<appointmentId>`.
  4. Verify `AdmitPatientModal` opens with pet info pre-filled.

- [ ] **Manual check 3: Admission → active band**
  1. Complete admission form → click "Registrar ingreso".
  2. Verify hospitalization appears in `/dashboard/servicios/hospitalizacion` under "En curso".
  3. Navigate to dashboard — verify "Hospitalización · Día 1" card appears in the active services band.

- [ ] **Manual check 4: Daily log**
  1. Open hospitalization detail → add a daily log entry (notes + medications + fed + temperature).
  2. Verify entry appears in the log list.

- [ ] **Manual check 5: Discharge with follow-up**
  1. Click "Dar de alta" → fill discharge fields → check "Agendar cita de seguimiento" → confirm.
  2. Verify hospitalization moves to historial.
  3. Verify `NewAppointmentModal` opens (or opens without pet pre-fill if props not supported).
  4. Verify active services band no longer shows the hospitalization.

- [ ] **Final commit check**

```bash
git log --oneline -10
```

Expected: all tasks committed cleanly with descriptive messages.
