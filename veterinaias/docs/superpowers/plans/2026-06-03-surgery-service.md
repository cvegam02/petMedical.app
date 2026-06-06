# Servicio de Cirugía — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar el servicio de Cirugía sobre `service_visits`: se agenda como cita y, al terminar, el veterinario llena el registro quirúrgico (con recetas reutilizadas) y concluye; con página de Cirugías, detalle e integración al historial del perfil.

**Architecture:** `surgery` ya es valor del enum `service_type`. Tabla de extensión `surgery_records`. Sin estado "en curso": el registro se crea+concluye en un solo POST que reutiliza `conclude_service_visit`. Form de registro reutiliza `PrescriptionsFields` y `AttendingVetField`. Las cirugías concluidas se integran al historial del perfil de la mascota.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS + RPC), TypeScript, react-hook-form + zod, Tailwind, lucide-react, sonner.

**Spec:** `docs/superpowers/specs/2026-06-03-surgery-service-design.md`

**Convenciones:** Sin tests. Sin commits por tarea (commit final cuando el usuario lo pida). Lint acepta solo patrones pre-existentes (`@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/exhaustive-deps`). Comandos desde `/home/cvega/Documentos/Projects/VeterinaIAs/veterinaias`. Project ref Supabase `qgruuhrgwgjduzlctdlx`; `(supabase as any)` para tablas no tipadas. Migraciones las aplica el controlador vía MCP `apply_migration` y se guardan en `supabase/migrations/`.

---

## Task 1: Migración — `surgery_records`

**Files:** Create `supabase/migrations/20260603000001_surgery_records.sql`

- [ ] **Step 1: Crear el archivo**

```sql
-- 20260603000001_surgery_records.sql
CREATE TABLE surgery_records (
  visit_id              UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  attended_by           UUID REFERENCES user_profiles(id),
  diagnosis             TEXT,
  weight_kg             NUMERIC(5,2),
  pre_op_notes          TEXT,
  anesthesia_type       TEXT,
  anesthesia_notes      TEXT,
  procedure             TEXT,
  findings              TEXT,
  complications         TEXT,
  supplies              TEXT,
  post_op_notes         TEXT,
  recovery_instructions TEXT,
  follow_up_date        DATE
);

ALTER TABLE surgery_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_surgery_records" ON surgery_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_surgery_records" ON surgery_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_update_surgery_records" ON surgery_records
  FOR UPDATE USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
```

- [ ] **Step 2: Aplicar (controlador)** — MCP `apply_migration`, name `surgery_records`.
- [ ] **Step 3: Verificar** — `execute_sql`: `SELECT table_name FROM information_schema.tables WHERE table_name='surgery_records';` → 1 fila.

---

## Task 2: Validación `lib/validations/surgery.ts`

**Files:** Create `lib/validations/surgery.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { z } from 'zod'
import { prescriptionSchema } from './medical-record'

export const surgeryRecordSchema = z.object({
  appointment_id: z.string().uuid('Cita requerida'),
  attended_by: z.string().uuid().optional(),
  diagnosis: z.string().optional(),
  weight_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  pre_op_notes: z.string().optional(),
  anesthesia_type: z.string().optional(),
  anesthesia_notes: z.string().optional(),
  procedure: z.string().min(1, 'Procedimiento requerido'),
  findings: z.string().optional(),
  complications: z.string().optional(),
  supplies: z.string().optional(),
  post_op_notes: z.string().optional(),
  recovery_instructions: z.string().optional(),
  follow_up_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  prescriptions: z.array(prescriptionSchema).default([]),
})

export type SurgeryRecordValues = z.infer<typeof surgeryRecordSchema>
```

- [ ] **Step 2: Verificar** — `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` → `0`.

---

## Task 3: Enum de citas + service-type config

**Files:** Modify `lib/validations/appointment.ts`, `lib/constants/service-type.ts`

- [ ] **Step 1: appointment.ts** — reemplazar las 3 ocurrencias de `z.enum(['consultation', 'grooming', 'boarding'])` por `z.enum(['consultation', 'grooming', 'boarding', 'surgery'])` (replace_all).

- [ ] **Step 2: service-type.ts** — reescribir el archivo completo:

```ts
import { Stethoscope, Scissors, BedDouble, Syringe, type LucideIcon } from 'lucide-react'
import type { ServiceType } from '@/lib/types/database'

export const SERVICE_TYPE_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  consultation: { label: 'Médico', Icon: Stethoscope },
  grooming: { label: 'Estético', Icon: Scissors },
  boarding: { label: 'Hotel', Icon: BedDouble },
  surgery: { label: 'Cirugía', Icon: Syringe },
}

export function serviceTypeConfig(type: ServiceType | undefined | null) {
  return SERVICE_TYPE_CONFIG[type ?? 'consultation'] ?? SERVICE_TYPE_CONFIG.consultation
}
```

- [ ] **Step 3: Verificar** — tsc → `0`.

---

## Task 4: `NewAppointmentModal` — tipo Cirugía

**Files:** Modify `components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Import del icono** — find `import { Search, Loader2, TriangleAlert, Stethoscope, Scissors, BedDouble } from 'lucide-react'` → replace agregando `Syringe`:
`import { Search, Loader2, TriangleAlert, Stethoscope, Scissors, BedDouble, Syringe } from 'lucide-react'`

- [ ] **Step 2: Tipos del estado/props** — find `initialAppointmentType?: 'consultation' | 'grooming' | 'boarding'` → replace con `| 'surgery'`. Y `useState<'consultation' | 'grooming' | 'boarding'>(...)` → agregar `| 'surgery'`.

- [ ] **Step 3: Botón en el selector** — el selector usa `grid grid-cols-3 gap-4`. Cambiarlo a `grid grid-cols-2 gap-4` para que 4 opciones queden 2×2 (find `<div className="grid grid-cols-3 gap-4">` en el bloque del selector → `<div className="grid grid-cols-2 gap-4">`). Justo después del botón de Hotel (el que tiene `setAppointmentType('boarding')` y texto "Hotel" / "Hospedaje por noche"), agregar:

```tsx
              <button
                type="button"
                onClick={() => { setAppointmentType('surgery'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Syringe size={28} className="text-rose-600" />
                </div>
                <span className="font-bold text-base">Cirugía</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Procedimiento quirúrgico</p>
              </button>
```

(Inserción: localizar el cierre del botón de Hotel — el `</button>` que sigue al `<p ...>Hospedaje por noche</p></div>` de Hotel — e insertar el bloque anterior antes del `</div>` que cierra el grid.)

- [ ] **Step 4: Verificar** — tsc → `0`. Nota: el payload ya tolera surgery (no agrega extras; manda `service_type: 'surgery'`).

---

## Task 5: API lista + registro (`/api/servicios/cirugia/route.ts`)

**Files:** Create `app/api/servicios/cirugia/route.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { surgeryRecordSchema } from '@/lib/validations/surgery'

const LIST_SELECT = `
  id, started_at, ended_at, status, created_at, appointment_id,
  pet:pet_id(id, name, species:species_id(name)),
  record:surgery_records(procedure, diagnosis)
`

function mapRow(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    appointment_id: row.appointment_id,
    pet: row.pet ?? null,
    procedure: record?.procedure ?? null,
    diagnosis: record?.diagnosis ?? null,
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
      .from('service_visits').select(LIST_SELECT)
      .eq('tenant_id', tenantId).eq('service_type', 'surgery').eq('appointment_id', appointmentId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Error al obtener cirugía' }, { status: 500 })
    return NextResponse.json({ data: data ? mapRow(data) : null })
  }

  const { data, error } = await (supabase as any)
    .from('service_visits').select(LIST_SELECT)
    .eq('tenant_id', tenantId).eq('service_type', 'surgery')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Error al obtener cirugías' }, { status: 500 })

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

  const result = surgeryRecordSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const d = result.data

  // Resolver pet_id + owner_id desde la cita
  const { data: appt } = await (supabase as any)
    .from('appointments').select('pet_id, owner_id').eq('id', d.appointment_id).eq('tenant_id', tenantId).maybeSingle()
  if (!appt?.pet_id || !appt?.owner_id)
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

  const startedAt = d.started_at ?? new Date().toISOString()

  // Visita
  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: appt.pet_id,
      owner_id: appt.owner_id,
      appointment_id: d.appointment_id,
      service_type: 'surgery',
      status: 'in_progress',
      started_at: startedAt,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (visitError) return NextResponse.json({ error: 'Error al crear la cirugía' }, { status: 500 })
  const visitId: string = visit.id

  // Registro quirúrgico
  const { error: recError } = await (supabase as any)
    .from('surgery_records')
    .insert({
      visit_id: visitId,
      attended_by: d.attended_by ?? user.id,
      diagnosis: d.diagnosis ?? null,
      weight_kg: d.weight_kg ?? null,
      pre_op_notes: d.pre_op_notes ?? null,
      anesthesia_type: d.anesthesia_type ?? null,
      anesthesia_notes: d.anesthesia_notes ?? null,
      procedure: d.procedure,
      findings: d.findings ?? null,
      complications: d.complications ?? null,
      supplies: d.supplies ?? null,
      post_op_notes: d.post_op_notes ?? null,
      recovery_instructions: d.recovery_instructions ?? null,
      follow_up_date: d.follow_up_date ?? null,
    })
  if (recError) {
    await (supabase as any).from('service_visits').delete().eq('id', visitId)
    return NextResponse.json({ error: 'Error al guardar el registro' }, { status: 500 })
  }

  // Recetas (mismo patrón que consulta)
  if (d.prescriptions && d.prescriptions.length > 0) {
    const { error: presError } = await (supabase as any)
      .from('prescriptions')
      .insert(d.prescriptions.map(p => ({ ...p, visit_id: visitId })))
    if (presError) {
      await (supabase as any).from('service_visits').delete().eq('id', visitId)
      return NextResponse.json({ error: 'Error al guardar las recetas' }, { status: 500 })
    }
  }

  // Concluir (cierra visita + cita atómicamente)
  const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
    p_visit_id: visitId,
    p_ended_at: d.ended_at ?? new Date().toISOString(),
    p_notes: null,
    p_intake_notes: null,
  })
  if (rpcError) return NextResponse.json({ error: 'Error al concluir la cirugía' }, { status: 500 })

  return NextResponse.json({ data: { id: visitId } }, { status: 201 })
}
```

- [ ] **Step 2: Verificar** — tsc → `0`.
- [ ] **Step 3: Verificar embed (service role)**
```bash
KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-) && URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-) && curl -s "$URL/rest/v1/service_visits?select=id,record:surgery_records(procedure,diagnosis)&service_type=eq.surgery&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Expected: `[]` sin `PGRST200`.

---

## Task 6: API detalle (`/api/servicios/cirugia/[id]/route.ts`)

**Files:** Create `app/api/servicios/cirugia/[id]/route.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    .select(`
      id, started_at, ended_at, status, created_at,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      record:surgery_records(*, attended_by_profile:attended_by(full_name)),
      prescriptions(id, medication_name, active_ingredient, dosage, route_of_administration, frequency, duration, notes)
    `)
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'surgery')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Error al obtener cirugía' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cirugía no encontrada' }, { status: 404 })

  const record = Array.isArray(data.record) ? data.record[0] : data.record
  return NextResponse.json({
    data: {
      id: data.id,
      started_at: data.started_at,
      ended_at: data.ended_at,
      status: data.status,
      pet: data.pet ?? null,
      owner: data.owner ?? null,
      prescriptions: data.prescriptions ?? [],
      ...(record ?? {}),
      attended_by_name: record?.attended_by_profile?.full_name ?? null,
    },
  })
}
```

- [ ] **Step 2: Verificar** — tsc → `0`.

---

## Task 7: `SurgeryPanel` + registro

**Files:** Create `components/appointments/panels/SurgeryPanel.tsx`; Modify `components/appointments/panels/index.ts`

- [ ] **Step 1: Crear `SurgeryPanel.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Syringe, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PanelProps } from './index'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface SurgeryStub { id: string; procedure: string | null }

export function SurgeryPanel({ appointment, onClose, onRefresh }: PanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [surgery, setSurgery] = useState<SurgeryStub | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)

  const isActive = ACTIVE_STATUSES.includes(appointment.status)

  useEffect(() => {
    setLoading(true)
    setSurgery(null)
    fetch(`/api/servicios/cirugia?appointmentId=${appointment.id}`)
      .then(r => r.json())
      .then(json => setSurgery(json.data ?? null))
      .catch(() => setSurgery(null))
      .finally(() => setLoading(false))
  }, [appointment.id])

  async function transition(newStatus: string) {
    setLoadingStatus(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { return }
      onClose()
      onRefresh()
    } finally {
      setLoadingStatus(null)
    }
  }

  if (loading) return <p className="text-sm text-center text-muted-foreground py-1">Cargando…</p>

  if (surgery || appointment.status === 'completed') {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">Cirugía registrada</p>
        </div>
        {surgery?.id && (
          <Button
            size="sm" variant="outline" className="ml-[22px]"
            onClick={() => router.push(`/dashboard/servicios/cirugia/${surgery.id}`)}
          >
            Ver registro
          </Button>
        )}
      </div>
    )
  }

  if (!isActive) {
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'cancelled' && 'Esta cirugía fue cancelada.'}
        {appointment.status === 'no_show' && 'El paciente no se presentó.'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full justify-center gap-2 py-3 text-base font-semibold"
        onClick={() => router.push(`/dashboard/servicios/cirugia/registro?appointmentId=${appointment.id}`)}
      >
        <Syringe size={16} />
        Registrar y concluir cirugía
      </Button>
      <div className="flex items-center justify-center gap-4 pt-1">
        {appointment.status === 'scheduled' && (
          <>
            <button type="button" onClick={() => transition('confirmed')} disabled={loadingStatus === 'confirmed'}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
              {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
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

- [ ] **Step 2: Registrar** — en `components/appointments/panels/index.ts` agregar `import { SurgeryPanel } from './SurgeryPanel'` y la entrada `surgery: SurgeryPanel,` en `SERVICE_PANELS`.

- [ ] **Step 3: Verificar** — tsc → `0`.

---

## Task 8: `SurgeryRecordForm` (reutiliza recetas + vet)

**Files:** Create `components/servicios/SurgeryRecordForm.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Control } from 'react-hook-form'
import { surgeryRecordSchema, type SurgeryRecordValues } from '@/lib/validations/surgery'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PrescriptionsFields } from '@/components/medical-records/PrescriptionsFields'
import { AttendingVetField, type TenantVet } from '@/components/medical-records/AttendingVetField'

const ANESTHESIA = ['General', 'Sedación', 'Local'] as const

function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  appointmentId: string
  petName: string
  vets: TenantVet[]
  currentVetId: string
}

export function SurgeryRecordForm({ appointmentId, petName, vets, currentVetId }: Props) {
  const router = useRouter()
  const [startedAtLocal, setStartedAtLocal] = useState(nowLocalInput())
  const [endedAtLocal, setEndedAtLocal] = useState(nowLocalInput())

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<SurgeryRecordValues>({
      resolver: zodResolver(surgeryRecordSchema) as any,
      defaultValues: {
        appointment_id: appointmentId,
        attended_by: currentVetId,
        procedure: '',
        anesthesia_type: '',
        prescriptions: [],
      },
    })

  const attendedBy = watch('attended_by') ?? currentVetId
  const anesthesiaType = watch('anesthesia_type') ?? ''

  async function onSubmit(values: SurgeryRecordValues) {
    const payload = {
      ...values,
      started_at: startedAtLocal ? new Date(startedAtLocal).toISOString() : undefined,
      ended_at: endedAtLocal ? new Date(endedAtLocal).toISOString() : undefined,
    }
    const res = await fetch('/api/servicios/cirugia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success('Cirugía registrada')
    router.push(`/dashboard/servicios/cirugia/${json.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <p className="text-sm text-muted-foreground">Paciente: <span className="font-medium text-foreground">{petName}</span></p>

      <AttendingVetField vets={vets} value={attendedBy} onChange={v => setValue('attended_by', v)} currentVetId={currentVetId} />

      {/* Pre-operatorio */}
      <div className="space-y-3">
        <p className="label-overline text-muted-foreground/50">Pre-operatorio</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Diagnóstico / motivo</Label>
            <Input {...register('diagnosis')} placeholder="Motivo de la cirugía" />
          </div>
          <div>
            <Label className="text-xs">Peso (kg)</Label>
            <Input type="number" step="0.01" {...register('weight_kg')} placeholder="ej. 12.5" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Notas pre-operatorias</Label>
          <Textarea {...register('pre_op_notes')} className="resize-none h-16" placeholder="Ayuno, estado, riesgos…" />
        </div>
      </div>

      {/* Anestesia */}
      <div className="space-y-3">
        <p className="label-overline text-muted-foreground/50">Anestesia</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={anesthesiaType} onValueChange={v => setValue('anesthesia_type', v ?? '')} items={Object.fromEntries(ANESTHESIA.map(a => [a, a]))}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>{ANESTHESIA.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Notas / protocolo</Label>
          <Textarea {...register('anesthesia_notes')} className="resize-none h-16" placeholder="Agentes, manejo anestésico…" />
        </div>
      </div>

      {/* Procedimiento */}
      <div className="space-y-3">
        <p className="label-overline text-muted-foreground/50">Procedimiento</p>
        <div>
          <Label className="text-xs">Procedimiento <span className="text-destructive">*</span></Label>
          <Input {...register('procedure')} placeholder="Nombre / descripción" />
          {errors.procedure && <p className="text-destructive text-xs mt-1">{errors.procedure.message}</p>}
        </div>
        <div>
          <Label className="text-xs">Hallazgos / técnica</Label>
          <Textarea {...register('findings')} className="resize-none h-16" />
        </div>
        <div>
          <Label className="text-xs">Complicaciones</Label>
          <Textarea {...register('complications')} className="resize-none h-14" placeholder="Ninguna / descripción" />
        </div>
        <div>
          <Label className="text-xs">Insumos (suturas, implantes)</Label>
          <Input {...register('supplies')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Hora inicio</Label>
            <input type="datetime-local" value={startedAtLocal} onChange={e => setStartedAtLocal(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <Label className="text-xs">Hora fin</Label>
            <input type="datetime-local" value={endedAtLocal} onChange={e => setEndedAtLocal(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
        </div>
      </div>

      {/* Post-operatorio */}
      <div className="space-y-3">
        <p className="label-overline text-muted-foreground/50">Post-operatorio</p>
        <div>
          <Label className="text-xs">Notas post-operatorias</Label>
          <Textarea {...register('post_op_notes')} className="resize-none h-16" />
        </div>
        <div>
          <Label className="text-xs">Indicaciones de recuperación (dueño)</Label>
          <Textarea {...register('recovery_instructions')} className="resize-none h-16" />
        </div>
        <div>
          <Label className="text-xs">Próximo control / retiro de puntos</Label>
          <Input type="date" {...register('follow_up_date')} />
        </div>
        <PrescriptionsFields
          control={control as unknown as Control<MedicalRecordFormValues>}
          setValue={setValue as any}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Registrar y concluir'}</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verificar** — tsc → `0`; lint del archivo `clean`.

---

## Task 9: Página de registro

**Files:** Create `app/dashboard/servicios/cirugia/registro/page.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
import { redirect } from 'next/navigation'
import { Syringe } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SurgeryRecordForm } from '@/components/servicios/SurgeryRecordForm'

export default async function SurgeryRecordPage({ searchParams }: { searchParams: Promise<{ appointmentId?: string }> }) {
  const { appointmentId } = await searchParams
  if (!appointmentId) redirect('/dashboard/servicios/cirugia')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user!.id).single() as any
  const tenantId = profile?.tenant_id

  const { data: appt } = await (supabase as any)
    .from('appointments')
    .select('id, pet:pet_id(name)')
    .eq('id', appointmentId).eq('tenant_id', tenantId).maybeSingle()
  if (!appt) redirect('/dashboard/servicios/cirugia')

  const { data: vets } = await supabase
    .from('user_profiles').select('id, full_name').eq('tenant_id', tenantId ?? '').order('full_name') as { data: { id: string; full_name: string }[] | null }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Syringe size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
          Registrar cirugía
        </h1>
      </div>
      <SurgeryRecordForm
        appointmentId={appointmentId}
        petName={(appt.pet as any)?.name ?? '—'}
        vets={(vets ?? []) as any}
        currentVetId={user!.id}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar** — tsc → `0`.

---

## Task 10: Página de Cirugías (lista) + botón de reserva

**Files:** Create `components/servicios/NewSurgeryReservationButton.tsx`, `components/servicios/SurgeryTable.tsx`, `app/dashboard/servicios/cirugia/page.tsx`

- [ ] **Step 1: `NewSurgeryReservationButton.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface TeamMember { id: string; full_name: string }

export function NewSurgeryReservationButton({ team, businessHours }: { team: TeamMember[]; businessHours: BusinessHoursConfig }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} className="mr-1" />Nueva cirugía</Button>
      <NewAppointmentModal
        isOpen={open}
        onClose={() => setOpen(false)}
        team={team}
        businessHours={businessHours}
        initialAppointmentType="surgery"
      />
    </>
  )
}
```

- [ ] **Step 2: `SurgeryTable.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SurgeryRow {
  id: string
  started_at: string | null
  ended_at: string | null
  procedure: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SurgeryTable() {
  const router = useRouter()
  const [rows, setRows] = useState<SurgeryRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/servicios/cirugia')
    const json = await res.json()
    setRows(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin cirugías registradas</p>
          <p className="text-xs text-muted-foreground mt-1">Agenda una cirugía y regístrala al concluir.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mascota</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Procedimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(r => (
                <tr key={r.id} onClick={() => router.push(`/dashboard/servicios/cirugia/${r.id}`)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatDate(r.ended_at ?? r.started_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.pet?.name ?? '—'}</p>
                    {r.pet?.species?.name && <p className="text-xs text-muted-foreground">{r.pet.species.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.procedure ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `app/dashboard/servicios/cirugia/page.tsx`**

```tsx
import { Syringe } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { SurgeryTable } from '@/components/servicios/SurgeryTable'
import { NewSurgeryReservationButton } from '@/components/servicios/NewSurgeryReservationButton'

export default async function CirugiaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id, tenants(settings)').eq('id', user!.id).single() as any
  const businessHours = (profile?.tenants as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS
  const { data: team } = await supabase
    .from('user_profiles').select('id, full_name').eq('tenant_id', profile?.tenant_id ?? '').order('full_name') as { data: { id: string; full_name: string }[] | null }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Syringe size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Cirugía
          </h1>
          <NewSurgeryReservationButton team={team ?? []} businessHours={businessHours} />
        </div>
      </div>
      <SurgeryTable />
    </div>
  )
}
```

- [ ] **Step 4: Verificar** — tsc → `0`; lint `clean`.

---

## Task 11: Detalle de cirugía

**Files:** Create `components/servicios/SurgeryDetail.tsx`, `app/dashboard/servicios/cirugia/[id]/page.tsx`

- [ ] **Step 1: `SurgeryDetail.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Syringe, ChevronLeft } from 'lucide-react'

interface Prescription { id: string; medication_name: string; dosage: string; frequency: string; duration: string; route_of_administration: string | null; notes: string | null }
interface Surgery {
  id: string; started_at: string | null; ended_at: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  procedure: string | null; diagnosis: string | null; weight_kg: number | null
  pre_op_notes: string | null; anesthesia_type: string | null; anesthesia_notes: string | null
  findings: string | null; complications: string | null; supplies: string | null
  post_op_notes: string | null; recovery_instructions: string | null; follow_up_date: string | null
  attended_by_name: string | null; prescriptions: Prescription[]
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{value || '—'}</p>
    </div>
  )
}

export function SurgeryDetail({ visitId }: { visitId: string }) {
  const [s, setS] = useState<Surgery | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/servicios/cirugia/${visitId}`)
      const json = await res.json()
      setS(res.ok ? json.data : null)
    } catch {
      setS(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [visitId])

  if (loading) return <div className="max-w-4xl mx-auto pb-10"><p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p></div>
  if (!s) return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link href="/dashboard/servicios/cirugia" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft size={14} />Cirugía</Link>
      <div className="text-center py-16 mt-8 rounded-xl border-2 border-dashed border-border/60 bg-muted/10"><p className="text-sm font-medium text-foreground">Cirugía no encontrada</p></div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/servicios/cirugia" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft size={14} />Cirugía</Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-11 h-11 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground/50 shrink-0">
            <Syringe size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{s.pet?.name ?? '—'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{s.procedure || 'Cirugía'}{s.pet?.species?.name ? ` · ${s.pet.species.name}` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border/60">
          <div><p className="label-overline text-muted-foreground/50">Inicio</p><p className="text-sm text-foreground mt-0.5">{fmtDateTime(s.started_at)}</p></div>
          <div><p className="label-overline text-muted-foreground/50">Fin</p><p className="text-sm text-foreground mt-0.5">{fmtDateTime(s.ended_at)}</p></div>
          <div><p className="label-overline text-muted-foreground/50">Veterinario</p><p className="text-sm text-foreground mt-0.5">{s.attended_by_name || '—'}</p></div>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Pre-operatorio</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Diagnóstico / motivo" value={s.diagnosis} />
            <Field label="Peso (kg)" value={s.weight_kg != null ? String(s.weight_kg) : null} />
            <Field label="Notas pre-op" value={s.pre_op_notes} />
          </div>
        </section>
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Anestesia</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Tipo" value={s.anesthesia_type} />
            <div className="sm:col-span-2"><Field label="Notas" value={s.anesthesia_notes} /></div>
          </div>
        </section>
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Procedimiento</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Hallazgos / técnica" value={s.findings} />
            <Field label="Complicaciones" value={s.complications} />
            <Field label="Insumos" value={s.supplies} />
          </div>
        </section>
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Post-operatorio</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Notas post-op" value={s.post_op_notes} />
            <Field label="Indicaciones de recuperación" value={s.recovery_instructions} />
            <Field label="Próximo control" value={fmtDate(s.follow_up_date)} />
          </div>
        </section>
        {s.prescriptions.length > 0 && (
          <section>
            <p className="label-overline text-muted-foreground/50 mb-2.5">Recetas</p>
            <div className="space-y-2">
              {s.prescriptions.map(p => (
                <div key={p.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">{p.medication_name} · {p.dosage}</p>
                  <p className="text-xs text-muted-foreground">{[p.route_of_administration, p.frequency, p.duration].filter(Boolean).join(' · ')}{p.notes ? ` — ${p.notes}` : ''}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/dashboard/servicios/cirugia/[id]/page.tsx`**

```tsx
import { SurgeryDetail } from '@/components/servicios/SurgeryDetail'

export default async function SurgeryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SurgeryDetail visitId={id} />
}
```

- [ ] **Step 3: Verificar** — tsc → `0`; lint `clean`.

---

## Task 12: SidebarNav — link Cirugía

**Files:** Modify `components/dashboard/SidebarNav.tsx`

- [ ] **Step 1** — find `import { Home, Users, PawPrint, Calendar, Settings2, Scissors, BedDouble } from 'lucide-react'` → agregar `Syringe`.
- [ ] **Step 2** — en `SERVICES_NAV_ITEMS`, después del item de Hotel agregar:
```tsx
  { href: '/dashboard/servicios/cirugia', icon: Syringe, label: 'Cirugía' },
```
- [ ] **Step 3: Verificar** — tsc → `0`.

---

## Task 13: Historial del perfil — incluir cirugías

**Files:** Modify `app/dashboard/pets/[petId]/page.tsx`

- [ ] **Step 1: Ampliar la query del embed**

Buscar:
```tsx
        service_visits(
          id, created_at, status,
          consultation:consultation_records!visit_id(reason, diagnosis, weight_kg, attended_by_profile:attended_by(full_name)),
          prescriptions(id),
          attachments(id),
          addendums(id)
        )
```
Reemplazar por:
```tsx
        service_visits(
          id, created_at, status, service_type,
          consultation:consultation_records!visit_id(reason, diagnosis, weight_kg, attended_by_profile:attended_by(full_name)),
          surgery:surgery_records!visit_id(procedure, diagnosis),
          prescriptions(id),
          attachments(id),
          addendums(id)
        )
```

Y la línea del filtro:
```tsx
      .eq('service_visits.service_type', 'consultation')
```
Reemplazar por:
```tsx
      .in('service_visits.service_type', ['consultation', 'surgery'])
```

- [ ] **Step 2: Mapear el tipo en `records`**

Buscar:
```tsx
  const records = rawVisits.map((v: any) => ({
    ...v,
    ...(v.consultation ?? {}),
    created_by_profile: v.consultation?.attended_by_profile ?? null,
  }))
```
Reemplazar por:
```tsx
  const records = rawVisits.map((v: any) => ({
    ...v,
    ...(v.consultation ?? {}),
    created_by_profile: v.consultation?.attended_by_profile ?? null,
    _isSurgery: v.service_type === 'surgery',
    _surgeryProcedure: v.surgery?.procedure ?? null,
  }))
```

- [ ] **Step 3: Render diferenciado**

Buscar el bloque que renderiza cada record (la línea `<MedicalRecordCard record={record} petId={petId} />`, dentro de un `.map`). Reemplazar esa línea por una rama por tipo:
```tsx
              {record._isSurgery ? (
                <Link
                  href={`/dashboard/servicios/cirugia/${record.id}`}
                  className="block bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                      <Syringe size={16} className="text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Cirugía{record._surgeryProcedure ? ` · ${record._surgeryProcedure}` : ''}</p>
                      <p className="text-xs text-muted-foreground">{new Date(record.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <MedicalRecordCard record={record} petId={petId} />
              )}
```

- [ ] **Step 4: Imports** — asegurar que `Syringe` esté importado de lucide-react en la página y que `Link` (de `next/link`) ya esté importado (lo está). Agregar `Syringe` al import de lucide existente.

- [ ] **Step 5: Verificar** — tsc → `0`; lint `clean`. Smoke: el perfil debe seguir mostrando consultas y ahora también cirugías concluidas con su entrada.

---

## Task 14: Verificación final

- [ ] **Step 1: Typecheck** — `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` → `0`.
- [ ] **Step 2: Lint del set** (mismo node-filter de patrones aceptados que en los planes previos) sobre:
  `lib/validations/surgery.ts lib/validations/appointment.ts lib/constants/service-type.ts components/appointments/NewAppointmentModal.tsx components/appointments/panels/SurgeryPanel.tsx components/appointments/panels/index.ts 'app/api/servicios/cirugia/route.ts' 'app/api/servicios/cirugia/[id]/route.ts' components/servicios/SurgeryRecordForm.tsx components/servicios/SurgeryTable.tsx components/servicios/SurgeryDetail.tsx components/servicios/NewSurgeryReservationButton.tsx 'app/dashboard/servicios/cirugia/page.tsx' 'app/dashboard/servicios/cirugia/registro/page.tsx' 'app/dashboard/servicios/cirugia/[id]/page.tsx' components/dashboard/SidebarNav.tsx 'app/dashboard/pets/[petId]/page.tsx'`
  Expected: `clean (solo patrones pre-existentes)`.
- [ ] **Step 3: Verificación manual** — agendar cirugía → panel "Registrar y concluir cirugía" → llenar form (con una receta) + horas → guardar → la cita queda `completed`; la cirugía aparece en `/dashboard/servicios/cirugia`, en su detalle (con receta) y en el historial del perfil.
- [ ] **Step 4: Commit (solo cuando el usuario lo pida)**
```bash
git add supabase/migrations/20260603000001_surgery_records.sql lib/validations/surgery.ts lib/validations/appointment.ts lib/constants/service-type.ts app/api/servicios/cirugia/ app/dashboard/servicios/cirugia/ components/appointments/ components/servicios/ components/dashboard/SidebarNav.tsx 'app/dashboard/pets/[petId]/page.tsx'
git commit -m "feat: servicio de Cirugía — agenda, registro quirúrgico (recetas reutilizadas), página/detalle e historial"
```

---

## Self-Review (cobertura del spec)

- Tabla `surgery_records` + RLS → Task 1. ✓
- Validación (campos + recetas reutilizadas) → Task 2. ✓
- Enum citas +surgery / service-type +surgery (Syringe) → Task 3. ✓
- Tipo Cirugía en `NewAppointmentModal` → Task 4. ✓
- API lista + POST registro+conclusión (visita + surgery_records + prescriptions + `conclude_service_visit`) → Task 5. ✓
- API detalle → Task 6. ✓
- `SurgeryPanel` ("Registrar y concluir cirugía" → registro) + registro → Task 7. ✓
- Form de registro reutilizando `PrescriptionsFields` + `AttendingVetField` + horas → Task 8 + página Task 9. ✓
- Página de Cirugías (lista + "Nueva cirugía") → Task 10. ✓
- Detalle read-only en página → Task 11. ✓
- SidebarNav +Cirugía → Task 12. ✓
- Integración en historial del perfil → Task 13. ✓

**Placeholder scan:** sin TBD/TODO. **Consistencia:** `SurgeryRecordValues` (Task 2) usado por el form (Task 8) y el POST (Task 5); el shape del detalle (Task 6) lo consume `SurgeryDetail` (Task 11); `conclude_service_visit` reutilizado (existe). `PrescriptionsFields` recibe `control` casteado a `Control<MedicalRecordFormValues>` (el form incluye `prescriptions` y `weight_kg`, compatibles en runtime).
