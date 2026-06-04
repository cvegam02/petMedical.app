# Surgery Flow Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the surgery flow into two inline phases — schedule from the surgery page (with pre-op data) and conclude inline in the appointment panel — eliminating the separate `/registro` page.

**Architecture:** New `ScheduleSurgeryModal` replaces the old button+generic-modal combo; `POST /api/servicios/cirugia` is redesigned to create appointment+visit+record atomically; new `PATCH /api/servicios/cirugia/[id]` handles conclusion; `SurgeryPanel` shows the full conclusion form inline using `FormSection`/`MedicalRecordForm` conventions.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL), React Hook Form + Zod, shadcn/ui, Tailwind CSS

---

## File Map

| Action | File |
|--------|------|
| Modify | `lib/validations/surgery.ts` |
| Modify | `app/api/servicios/cirugia/route.ts` |
| Modify | `app/api/servicios/cirugia/[id]/route.ts` |
| Create | `components/servicios/ScheduleSurgeryModal.tsx` |
| Modify | `components/appointments/panels/SurgeryPanel.tsx` |
| Modify | `app/dashboard/servicios/cirugia/page.tsx` |
| Modify | `components/appointments/NewAppointmentModal.tsx` |
| Delete | `components/servicios/SurgeryRecordForm.tsx` |
| Delete | `components/servicios/NewSurgeryReservationButton.tsx` |
| Delete | `app/dashboard/servicios/cirugia/registro/page.tsx` |

---

## Task 1: Split surgery validation schemas

**Files:**
- Modify: `lib/validations/surgery.ts`

- [ ] **Step 1: Replace the file content with two focused schemas**

```typescript
// lib/validations/surgery.ts
import { z } from 'zod'
import { prescriptionSchema } from './medical-record'

const weightPreprocess = z.preprocess(
  v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
  z.number().positive().optional()
)

// Phase 1 — used by ScheduleSurgeryModal → POST /api/servicios/cirugia
export const scheduleSurgerySchema = z.object({
  pet_id: z.string().uuid('Mascota requerida'),
  owner_id: z.string().uuid('Dueño requerido'),
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  attended_by: z.string().uuid('Veterinario requerido'),
  diagnosis: z.string().optional(),
  weight_kg: weightPreprocess,
  pre_op_notes: z.string().optional(),
  anesthesia_type: z.string().optional(),
  anesthesia_notes: z.string().optional(),
})
export type ScheduleSurgeryValues = z.infer<typeof scheduleSurgerySchema>

// Phase 2 — used by SurgeryPanel → PATCH /api/servicios/cirugia/[id]
export const concludeSurgerySchema = z.object({
  procedure: z.string().min(1, 'Procedimiento requerido'),
  findings: z.string().optional(),
  complications: z.string().optional(),
  supplies: z.string().optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  post_op_notes: z.string().optional(),
  recovery_instructions: z.string().optional(),
  follow_up_date: z.preprocess(
    v => v === '' ? undefined : v,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
  prescriptions: z.array(prescriptionSchema).default([]),
})
export type ConcludeSurgeryValues = z.infer<typeof concludeSurgerySchema>
```

- [ ] **Step 2: Commit**

```bash
git add lib/validations/surgery.ts
git commit -m "refactor: split surgeryRecordSchema into scheduleSurgerySchema + concludeSurgerySchema"
```

---

## Task 2: Redesign `POST /api/servicios/cirugia`

**Files:**
- Modify: `app/api/servicios/cirugia/route.ts`

The POST now accepts scheduling data and creates three records atomically (appointment → service_visit → surgery_records). It does NOT call `conclude_service_visit`. The GET handler is unchanged.

- [ ] **Step 1: Replace the POST handler (keep GET as-is)**

The full file content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scheduleSurgerySchema } from '@/lib/validations/surgery'

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

  const result = scheduleSurgerySchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const d = result.data

  // 1. Create appointment
  const { data: appt, error: apptError } = await (supabase as any)
    .from('appointments')
    .insert({
      tenant_id: tenantId,
      pet_id: d.pet_id,
      owner_id: d.owner_id,
      scheduled_at: d.scheduled_at,
      service_type: 'surgery',
      assigned_to: d.attended_by,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (apptError) return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
  const appointmentId: string = appt.id

  // 2. Create service_visit (started_at=null — surgery hasn't happened yet)
  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: d.pet_id,
      owner_id: d.owner_id,
      appointment_id: appointmentId,
      service_type: 'surgery',
      status: 'in_progress',
      started_at: null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (visitError) {
    await (supabase as any).from('appointments').delete().eq('id', appointmentId)
    return NextResponse.json({ error: 'Error al crear el registro de cirugía' }, { status: 500 })
  }
  const visitId: string = visit.id

  // 3. Create surgery_records with pre-op data only
  const { error: recError } = await (supabase as any)
    .from('surgery_records')
    .insert({
      visit_id: visitId,
      attended_by: d.attended_by,
      diagnosis: d.diagnosis ?? null,
      weight_kg: d.weight_kg ?? null,
      pre_op_notes: d.pre_op_notes ?? null,
      anesthesia_type: d.anesthesia_type ?? null,
      anesthesia_notes: d.anesthesia_notes ?? null,
    })
  if (recError) {
    await (supabase as any).from('service_visits').delete().eq('id', visitId)
    await (supabase as any).from('appointments').delete().eq('id', appointmentId)
    return NextResponse.json({ error: 'Error al guardar datos pre-operatorios' }, { status: 500 })
  }

  return NextResponse.json({ data: { id: visitId, appointment_id: appointmentId } }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/servicios/cirugia/route.ts
git commit -m "feat: redesign POST /api/servicios/cirugia — creates appointment+visit+record atomically at scheduling time"
```

---

## Task 3: Add `PATCH /api/servicios/cirugia/[id]`

**Files:**
- Modify: `app/api/servicios/cirugia/[id]/route.ts`

- [ ] **Step 1: Add PATCH handler after the existing GET**

Append this export to the existing file (keep GET unchanged):

```typescript
import { concludeSurgerySchema } from '@/lib/validations/surgery'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = concludeSurgerySchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const d = result.data

  // Verify visit belongs to tenant
  const { data: visit } = await (supabase as any)
    .from('service_visits')
    .select('id, surgery_records(id)')
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'surgery')
    .maybeSingle()
  if (!visit) return NextResponse.json({ error: 'Cirugía no encontrada' }, { status: 404 })

  const recordId = Array.isArray(visit.surgery_records)
    ? visit.surgery_records[0]?.id
    : visit.surgery_records?.id
  if (!recordId) return NextResponse.json({ error: 'Registro quirúrgico no encontrado' }, { status: 404 })

  // 1. Update surgery_records with conclusion data
  const { error: recError } = await (supabase as any)
    .from('surgery_records')
    .update({
      procedure: d.procedure,
      findings: d.findings ?? null,
      complications: d.complications ?? null,
      supplies: d.supplies ?? null,
      post_op_notes: d.post_op_notes ?? null,
      recovery_instructions: d.recovery_instructions ?? null,
      follow_up_date: d.follow_up_date ?? null,
    })
    .eq('id', recordId)
  if (recError) return NextResponse.json({ error: 'Error al actualizar el registro' }, { status: 500 })

  // 2. Update service_visit.started_at if surgery start time was provided
  if (d.started_at) {
    await (supabase as any)
      .from('service_visits')
      .update({ started_at: d.started_at })
      .eq('id', id)
  }

  // 3. Insert prescriptions
  if (d.prescriptions && d.prescriptions.length > 0) {
    const { error: presError } = await (supabase as any)
      .from('prescriptions')
      .insert(d.prescriptions.map((p: any) => ({ ...p, visit_id: id })))
    if (presError) return NextResponse.json({ error: 'Error al guardar las recetas' }, { status: 500 })
  }

  // 4. Conclude service visit — sets ended_at, marks appointment as completed
  const endedAt = d.ended_at ?? new Date().toISOString()
  const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
    p_visit_id: id,
    p_ended_at: endedAt,
    p_notes: null,
    p_intake_notes: null,
  })
  if (rpcError) return NextResponse.json({ error: 'Error al concluir la cirugía' }, { status: 500 })

  return NextResponse.json({ data: { id } })
}
```

The full file after the edit will have the existing `import` statements and `GET` handler at the top, then this `PATCH` appended. Make sure the imports at the top of the file include `concludeSurgerySchema`:

The top of the file should look like:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { concludeSurgerySchema } from '@/lib/validations/surgery'
```

- [ ] **Step 2: Commit**

```bash
git add app/api/servicios/cirugia/[id]/route.ts
git commit -m "feat: add PATCH /api/servicios/cirugia/[id] — conclusion handler with prescriptions + conclude_service_visit RPC"
```

---

## Task 4: Create `ScheduleSurgeryModal`

**Files:**
- Create: `components/servicios/ScheduleSurgeryModal.tsx`

This modal handles surgery scheduling. It uses the same owner → pet selection pattern as `NewAppointmentModal` and the field style conventions of `MedicalRecordForm` (`FormSection`, `Label text-[13px] font-bold`, `Input bg-muted/30 focus:bg-white`).

- [ ] **Step 1: Create the file**

```typescript
'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Syringe, Search, Loader2, User, ClipboardList } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'
import { DateInput } from '@/components/ui/date-input'
import { AttendingVetField, type TenantVet } from '@/components/medical-records/AttendingVetField'
import { generateTimeSlots, combineDateAndTime, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

const ANESTHESIA_OPTIONS = ['General', 'Sedación', 'Local'] as const

interface Props {
  isOpen: boolean
  onClose: () => void
  team: TenantVet[]
  businessHours?: BusinessHoursConfig
}

export function ScheduleSurgeryModal({ isOpen, onClose, team, businessHours = DEFAULT_BUSINESS_HOURS }: Props) {
  // Patient selection
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string }[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingOwner, setIsSearchingOwner] = useState(false)
  const [isLoadingPets, setIsLoadingPets] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Date/time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState('')

  // Vet
  const [attendedBy, setAttendedBy] = useState('')

  // Pre-op fields
  const [diagnosis, setDiagnosis] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [preOpNotes, setPreOpNotes] = useState('')
  const [anesthesiaType, setAnesthesiaType] = useState('')
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const timeSlots = useMemo(() => {
    if (!selectedDate) return []
    return generateTimeSlots({
      days: businessHours?.days ?? [1, 2, 3, 4, 5, 6],
      start: businessHours?.start ?? '09:00',
      end: businessHours?.end ?? '18:00',
      slot_interval: businessHours?.slot_interval ?? 30,
    }, selectedDate)
  }, [selectedDate, businessHours])

  // Owner search debounce
  useEffect(() => {
    if (ownerQuery.length < 1) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsSearchingOwner(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/owners?q=${encodeURIComponent(ownerQuery)}`)
        const json = await res.json()
        setOwnerResults(json.data ?? [])
        setShowSuggestions(true)
      } catch {
        setOwnerResults([])
      } finally {
        setIsSearchingOwner(false)
      }
    }, 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ownerQuery])

  // Fetch pets when owner is selected
  useEffect(() => {
    if (!selectedOwner) { setPets([]); setSelectedPetId(''); return }
    setIsLoadingPets(true)
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => { setPets(json.data ?? []); setSelectedPetId('') })
      .catch(() => setPets([]))
      .finally(() => setIsLoadingPets(false))
  }, [selectedOwner])

  async function preloadOwners() {
    if (ownerResults.length > 0) { setShowSuggestions(true); return }
    setIsSearchingOwner(true)
    try {
      const res = await fetch('/api/owners?limit=5')
      const json = await res.json()
      setOwnerResults(json.data ?? [])
      setShowSuggestions(true)
    } catch {
      setOwnerResults([])
    } finally {
      setIsSearchingOwner(false)
    }
  }

  function reset() {
    setOwnerQuery('')
    setOwnerResults([])
    setSelectedOwner(null)
    setPets([])
    setSelectedPetId('')
    setShowSuggestions(false)
    setIsSearchingOwner(false)
    setIsLoadingPets(false)
    setSelectedDate(undefined)
    setSelectedTime('')
    setAttendedBy('')
    setDiagnosis('')
    setWeightKg('')
    setPreOpNotes('')
    setAnesthesiaType('')
    setAnesthesiaNotes('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedOwner) { toast.error('Selecciona un dueño'); return }
    if (!selectedPetId) { toast.error('Selecciona una mascota'); return }
    if (!selectedDate || !selectedTime) { toast.error('Fecha y hora son requeridas'); return }
    if (!attendedBy) { toast.error('Selecciona el veterinario asignado'); return }

    setIsSubmitting(true)
    try {
      const scheduledAt = combineDateAndTime(selectedDate, selectedTime).toISOString()
      const res = await fetch('/api/servicios/cirugia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: selectedPetId,
          owner_id: selectedOwner.id,
          scheduled_at: scheduledAt,
          attended_by: attendedBy,
          ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
          ...(weightKg ? { weight_kg: parseFloat(weightKg) } : {}),
          ...(preOpNotes.trim() ? { pre_op_notes: preOpNotes.trim() } : {}),
          ...(anesthesiaType ? { anesthesia_type: anesthesiaType } : {}),
          ...(anesthesiaNotes.trim() ? { anesthesia_notes: anesthesiaNotes.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al agendar'); return }
      toast.success('Cirugía agendada')
      handleClose()
      window.dispatchEvent(new CustomEvent('appointment:created'))
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Syringe size={18} className="text-rose-500" />
            Nueva cirugía
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* ── Paciente y reserva ── */}
          <FormSection title={
            <div className="flex items-center gap-2">
              <User size={14} className="text-primary/60" />
              <span>Paciente y reserva</span>
            </div>
          }>
            {/* Owner search */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="owner_search" className="text-[13px] font-bold">
                Dueño <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="owner_search"
                  value={ownerQuery}
                  onChange={e => {
                    setOwnerQuery(e.target.value)
                    if (selectedOwner) { setSelectedOwner(null); setSelectedPetId('') }
                  }}
                  onFocus={preloadOwners}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Buscar dueño..."
                  className="pl-8 bg-muted/30 focus:bg-white transition-all"
                  autoComplete="off"
                />
                {isSearchingOwner && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {showSuggestions && ownerResults.length > 0 && (
                <div className="absolute z-50 w-full top-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {ownerResults.map(o => (
                    <button
                      key={o.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                      onMouseDown={() => {
                        setSelectedOwner({ id: o.id, full_name: o.full_name })
                        setOwnerQuery(o.full_name)
                        setShowSuggestions(false)
                      }}
                    >
                      <span className="font-medium">{o.full_name}</span>
                      {o.phone && <span className="text-muted-foreground ml-2 text-xs">{o.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pet selector */}
            <div className="space-y-1.5 mt-4">
              <Label className="text-[13px] font-bold">
                Mascota <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedPetId}
                onValueChange={setSelectedPetId}
                disabled={!selectedOwner || isLoadingPets}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder={
                    !selectedOwner ? 'Primero selecciona un dueño' :
                    isLoadingPets ? 'Cargando...' :
                    pets.length === 0 ? 'Sin mascotas registradas' :
                    'Selecciona una mascota'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {pets.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <DateInput value={selectedDate} onChange={setSelectedDate} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">
                  Hora <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedTime}
                  onValueChange={setSelectedTime}
                  disabled={!selectedDate || timeSlots.length === 0}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder={!selectedDate ? 'Elige fecha primero' : 'Hora'} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vet */}
            <div className="mt-4">
              <AttendingVetField
                vets={team}
                value={attendedBy}
                onChange={setAttendedBy}
                currentVetId=""
              />
            </div>
          </FormSection>

          {/* ── Pre-operatorio ── */}
          <FormSection title={
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-primary/60" />
              <span>Pre-operatorio</span>
            </div>
          }>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="diagnosis" className="text-[13px] font-bold">Diagnóstico / motivo</Label>
                <Input
                  id="diagnosis"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="Motivo de la cirugía"
                  className="bg-muted/30 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg" className="text-[13px] font-bold">Peso (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.01"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  placeholder="ej. 12.5"
                  className="bg-muted/30 focus:bg-white transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pre_op_notes" className="text-[13px] font-bold">Notas pre-op</Label>
                <Textarea
                  id="pre_op_notes"
                  value={preOpNotes}
                  onChange={e => setPreOpNotes(e.target.value)}
                  placeholder="Ayuno, estado, riesgos..."
                  className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
                />
              </div>
            </div>
          </FormSection>

          {/* ── Anestesia ── */}
          <FormSection title={
            <div className="flex items-center gap-2">
              <Syringe size={14} className="text-primary/60" />
              <span>Anestesia</span>
            </div>
          }>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">Tipo de anestesia</Label>
                <Select value={anesthesiaType} onValueChange={setAnesthesiaType}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANESTHESIA_OPTIONS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="anesthesia_notes" className="text-[13px] font-bold">Notas / protocolo</Label>
                <Textarea
                  id="anesthesia_notes"
                  value={anesthesiaNotes}
                  onChange={e => setAnesthesiaNotes(e.target.value)}
                  placeholder="Agentes, manejo anestésico..."
                  className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
                />
              </div>
            </div>
          </FormSection>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Agendando...' : 'Agendar cirugía'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/servicios/ScheduleSurgeryModal.tsx
git commit -m "feat: ScheduleSurgeryModal — owner→pet selection, pre-op fields, MedicalRecordForm style"
```

---

## Task 5: Revamp `SurgeryPanel`

**Files:**
- Modify: `components/appointments/panels/SurgeryPanel.tsx`

The panel now shows an inline conclusion form (using RHF + `concludeSurgerySchema`) when the surgery exists but `ended_at` is null. The form uses `FormSection` and `MedicalRecordForm` field conventions.

- [ ] **Step 1: Replace the entire file**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Syringe, CheckCircle2, ClipboardList, Pill } from 'lucide-react'
import { toast } from 'sonner'
import type { Control } from 'react-hook-form'
import { concludeSurgerySchema, type ConcludeSurgeryValues } from '@/lib/validations/surgery'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormSection } from '@/components/ui/form-section'
import { PrescriptionsFields } from '@/components/medical-records/PrescriptionsFields'
import type { PanelProps } from './index'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface SurgeryStub {
  id: string
  ended_at: string | null
  procedure: string | null
  diagnosis: string | null
}

function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ConclusionForm({ visitId, onSuccess }: { visitId: string; onSuccess: () => void }) {
  const [startedAtLocal, setStartedAtLocal] = useState(nowLocalInput())
  const [endedAtLocal, setEndedAtLocal] = useState(nowLocalInput())

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } =
    useForm<ConcludeSurgeryValues>({
      resolver: zodResolver(concludeSurgerySchema) as any,
      defaultValues: { procedure: '', prescriptions: [] },
    })

  async function onSubmit(values: ConcludeSurgeryValues) {
    const payload = {
      ...values,
      ...(startedAtLocal ? { started_at: new Date(startedAtLocal).toISOString() } : {}),
      ...(endedAtLocal ? { ended_at: new Date(endedAtLocal).toISOString() } : {}),
    }
    const res = await fetch(`/api/servicios/cirugia/${visitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al registrar'); return }
    toast.success('Cirugía registrada y concluida')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormSection title={
        <div className="flex items-center gap-2">
          <Syringe size={14} className="text-primary/60" />
          <span>Procedimiento</span>
        </div>
      }>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">
              Procedimiento <span className="text-destructive">*</span>
            </Label>
            <Input
              {...register('procedure')}
              placeholder="Nombre / descripción"
              className="bg-muted/30 focus:bg-white transition-all"
            />
            {errors.procedure && (
              <p className="text-destructive text-[11px] font-medium">{errors.procedure.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Hallazgos / técnica</Label>
            <Textarea
              {...register('findings')}
              className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Complicaciones</Label>
            <Textarea
              {...register('complications')}
              placeholder="Ninguna / descripción"
              className="resize-none h-14 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Insumos (suturas, implantes)</Label>
            <Input {...register('supplies')} className="bg-muted/30 focus:bg-white transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">Hora inicio</Label>
              <input
                type="datetime-local"
                value={startedAtLocal}
                onChange={e => setStartedAtLocal(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">Hora fin</Label>
              <input
                type="datetime-local"
                value={endedAtLocal}
                onChange={e => setEndedAtLocal(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title={
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-primary/60" />
          <span>Post-operatorio</span>
        </div>
      }>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Notas post-operatorias</Label>
            <Textarea
              {...register('post_op_notes')}
              className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Indicaciones de recuperación (dueño)</Label>
            <Textarea
              {...register('recovery_instructions')}
              className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Próximo control / retiro de puntos</Label>
            <Input
              type="date"
              {...register('follow_up_date')}
              className="bg-muted/30 focus:bg-white transition-all"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title={
        <div className="flex items-center gap-2">
          <Pill size={14} className="text-primary/60" />
          <span>Prescripción</span>
        </div>
      }>
        <PrescriptionsFields
          control={control as unknown as Control<MedicalRecordFormValues>}
          setValue={setValue as any}
        />
      </FormSection>

      <div className="px-5 py-4 border-t border-border">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full justify-center gap-2 py-3 text-base font-semibold"
        >
          <Syringe size={16} />
          {isSubmitting ? 'Registrando...' : 'Registrar y concluir cirugía'}
        </Button>
      </div>
    </form>
  )
}

export function SurgeryPanel({ appointment, onClose, onRefresh }: PanelProps) {
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
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoadingStatus(null)
    }
  }

  if (loading) return <p className="text-sm text-center text-muted-foreground py-1">Cargando…</p>

  // Completed — green summary
  if (surgery?.ended_at || appointment.status === 'completed') {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">Cirugía registrada</p>
        </div>
        {surgery?.procedure && (
          <p className="text-xs text-green-700 pl-[22px]">{surgery.procedure}</p>
        )}
        {surgery?.id && (
          <div className="pl-[22px]">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = `/dashboard/servicios/cirugia/${surgery.id}`}
            >
              Ver detalles
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Terminal states
  if (!isActive) {
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'cancelled' && 'Esta cirugía fue cancelada.'}
        {appointment.status === 'no_show' && 'El paciente no se presentó.'}
      </p>
    )
  }

  // Active — show conclusion form + status transitions below
  return (
    <div>
      {surgery?.id ? (
        <ConclusionForm
          visitId={surgery.id}
          onSuccess={() => { onClose(); onRefresh() }}
        />
      ) : (
        <p className="text-sm text-center text-muted-foreground py-4">
          Sin datos de cirugía. Agendá desde la página de Cirugías.
        </p>
      )}
      <div className="flex items-center justify-center gap-4 px-5 pb-4 pt-2">
        {appointment.status === 'scheduled' && (
          <>
            <button
              type="button"
              onClick={() => transition('confirmed')}
              disabled={loadingStatus === 'confirmed'}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
            </button>
            <span className="text-border text-xs">·</span>
          </>
        )}
        <button
          type="button"
          onClick={() => transition('no_show')}
          disabled={loadingStatus === 'no_show'}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {loadingStatus === 'no_show' ? 'Guardando…' : 'No se presentó'}
        </button>
        <span className="text-border text-xs">·</span>
        <button
          type="button"
          onClick={() => transition('cancelled')}
          disabled={loadingStatus === 'cancelled'}
          className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
        >
          {loadingStatus === 'cancelled' ? 'Guardando…' : 'Cancelar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/appointments/panels/SurgeryPanel.tsx
git commit -m "feat: revamp SurgeryPanel — inline conclusion form with FormSection style, remove /registro navigation"
```

---

## Task 6: Wire up page, remove surgery from generic modal, delete old files

**Files:**
- Modify: `app/dashboard/servicios/cirugia/page.tsx`
- Modify: `components/appointments/NewAppointmentModal.tsx`
- Delete: `components/servicios/SurgeryRecordForm.tsx`
- Delete: `components/servicios/NewSurgeryReservationButton.tsx`
- Delete: `app/dashboard/servicios/cirugia/registro/page.tsx`

- [ ] **Step 1: Update `app/dashboard/servicios/cirugia/page.tsx`**

Replace the file to import `ScheduleSurgeryModal` instead of `NewSurgeryReservationButton`. The page now renders the modal trigger inline:

```typescript
import { Syringe } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { SurgeryTable } from '@/components/servicios/SurgeryTable'
import { ScheduleSurgeryModalTrigger } from '@/components/servicios/ScheduleSurgeryModal'

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
          <ScheduleSurgeryModalTrigger team={team ?? []} businessHours={businessHours} />
        </div>
      </div>
      <SurgeryTable />
    </div>
  )
}
```

Also add a named export `ScheduleSurgeryModalTrigger` to `ScheduleSurgeryModal.tsx`. Append this to the end of the `ScheduleSurgeryModal.tsx` file created in Task 4:

```typescript
// Thin trigger wrapper for use in Server Components
'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ScheduleSurgeryModalTrigger({ team, businessHours }: { team: { id: string; full_name: string }[]; businessHours: any }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="mr-1" />Nueva cirugía
      </Button>
      <ScheduleSurgeryModal
        isOpen={open}
        onClose={() => setOpen(false)}
        team={team}
        businessHours={businessHours}
      />
    </>
  )
}
```

- [ ] **Step 2: Remove surgery from `NewAppointmentModal`**

In `components/appointments/NewAppointmentModal.tsx`, remove the surgery button from the selector grid (lines ~318–328) and remove `surgery` from the type union:

Remove this block from the selector `<div className="grid grid-cols-2 gap-4">`:
```typescript
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

Change the type annotations from `'consultation' | 'grooming' | 'boarding' | 'surgery'` to `'consultation' | 'grooming' | 'boarding'` in these three lines:
- `initialAppointmentType?: 'consultation' | 'grooming' | 'boarding' | 'surgery'` → `initialAppointmentType?: 'consultation' | 'grooming' | 'boarding'`
- `const [appointmentType, setAppointmentType] = useState<'consultation' | 'grooming' | 'boarding' | 'surgery'>` → `useState<'consultation' | 'grooming' | 'boarding'>`
- The `Syringe` import can stay (it's used by the icon system elsewhere) or be removed if it's only used in the surgery button.

Also remove the `Syringe` import from the lucide-react import line if it's no longer used anywhere else in the file.

- [ ] **Step 3: Delete old files**

```bash
rm veterinaias/components/servicios/SurgeryRecordForm.tsx
rm veterinaias/components/servicios/NewSurgeryReservationButton.tsx
rm -rf veterinaias/app/dashboard/servicios/cirugia/registro
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire surgery page to ScheduleSurgeryModal, remove surgery from generic appointment modal, delete old registro flow"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Scheduling from surgery page only | Task 6 (remove from NewAppointmentModal) |
| Owner → pet two-step selection | Task 4 (ScheduleSurgeryModal) |
| Pre-op fields in scheduling modal | Task 4 |
| Atomic create: appointment + visit + record | Task 2 (POST redesign) |
| Conclusion inline in SurgeryPanel | Task 5 |
| MedicalRecordForm style conventions | Task 4 + Task 5 |
| PATCH endpoint for conclusion | Task 3 |
| Prescriptions in conclusion | Task 3 + Task 5 |
| Green completed card with "Ver detalles" | Task 5 |
| conclude_service_visit called at conclusion | Task 3 |
| Delete SurgeryRecordForm, registro page, old button | Task 6 |
| scheduleSurgerySchema + concludeSurgerySchema | Task 1 |

All spec requirements covered. ✅

**Type consistency check:**
- `SurgeryStub.id` = service_visit ID throughout → `ConclusionForm.visitId` → `PATCH /api/servicios/cirugia/${visitId}` → `[id]/route.ts` queries `service_visits.id` ✅
- `ConcludeSurgeryValues` defined in Task 1, used in Task 3 (API) and Task 5 (form) ✅
- `ScheduleSurgeryValues` defined in Task 1, used in Task 2 (API) ✅
- `ScheduleSurgeryModalTrigger` defined and exported in Task 6 step 1, imported in page ✅
