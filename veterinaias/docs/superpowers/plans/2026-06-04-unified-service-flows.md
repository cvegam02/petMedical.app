# Unified Service Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all service creation and lifecycle management into a single calendar-centric flow with one modal, consistent detail pages per service, and explicit initiation/conclusion actions per service type.

**Architecture:** The Agenda screen (calendar day-view) replaces the Dashboard as home. All appointments are created through one `NewAppointmentModal` that accepts an optional `serviceType` prop to skip the type selector. Every service lifecycle (initiation, status transitions, conclusion) lives exclusively on the service's detail page — the AppointmentPanel is read-only + navigation only.

**Tech Stack:** Next.js 14 App Router, Supabase, Tailwind CSS, shadcn/ui, Zod, lucide-react

---

## File Map

**Created:**
- `veterinaias/components/agenda/DayView.tsx` — time-slot calendar grid
- `veterinaias/components/agenda/AppointmentPanel.tsx` — read-only side panel with "Ver detalle" navigation
- `veterinaias/components/agenda/AgendaScreen.tsx` — MetricsStrip + DayView + "Atender Ahora" (client shell)

**Modified:**
- `veterinaias/components/appointments/NewAppointmentModal.tsx` — add `'cirugia'` to `initialAppointmentType`, add surgery fields, route surgery POST to `/api/servicios/cirugia`
- `veterinaias/app/dashboard/page.tsx` — swap `DashboardHome` for `AgendaScreen` server wrapper
- `veterinaias/app/dashboard/layout.tsx` — rename sidebar nav item to "Agenda"
- `veterinaias/app/dashboard/servicios/consulta/page.tsx` — add "Nueva consulta" button using unified modal
- `veterinaias/app/dashboard/servicios/estetica/page.tsx` — add "Nueva sesión" button using unified modal
- `veterinaias/app/dashboard/servicios/hotel/page.tsx` — swap `NewHotelReservationButton` for unified modal button
- `veterinaias/app/dashboard/servicios/cirugia/page.tsx` — swap `ScheduleSurgeryModalTrigger` for unified modal button
- `veterinaias/app/dashboard/servicios/consulta/[id]/page.tsx` — explicit lifecycle: Iniciar → Finalizar consulta
- `veterinaias/app/dashboard/servicios/estetica/[id]/page.tsx` — standardize lifecycle: Iniciar → Concluir
- `veterinaias/app/dashboard/servicios/hotel/[id]/page.tsx` — standardize lifecycle: Check-in → Check-out
- `veterinaias/app/dashboard/servicios/cirugia/[id]/page.tsx` — standardize lifecycle: Iniciar → Concluir cirugía

**Deleted:**
- `veterinaias/components/servicios/GroomingSessionModal.tsx`
- `veterinaias/components/servicios/NewHotelReservationButton.tsx`
- `veterinaias/components/dashboard/DashboardCTAs.tsx`
- `veterinaias/components/dashboard/DashboardHome.tsx`

---

## Task 1: Add 'cirugia' to NewAppointmentModal + surgery fields

The modal currently supports `'consultation' | 'grooming' | 'boarding'`. Add `'cirugia'` and its pre-op fields.

**Files:**
- Modify: `veterinaias/components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Expand the type union**

Find the `NewAppointmentModalProps` interface and update `initialAppointmentType`:

```typescript
export interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  team: TeamMember[]
  businessHours?: BusinessHoursConfig
  initialAppointmentType?: 'consultation' | 'grooming' | 'boarding' | 'cirugia'
  initialPet?: { petId: string; petName: string; ownerId: string; ownerName: string }
}
```

Also update the `appointmentType` state type and `setAppointmentType` calls throughout the component to include `'cirugia'`.

- [ ] **Step 2: Add surgery-specific state fields**

After the existing state declarations, add:

```typescript
// Surgery (cirugia) fields
const [surgeryDiagnosis, setSurgeryDiagnosis] = useState('')
const [surgeryWeight, setSurgeryWeight] = useState('')
const [surgeryAnesthesia, setSurgeryAnesthesia] = useState<'local' | 'general' | 'sedacion' | ''>('')
const [surgeryProcedure, setSurgeryProcedure] = useState('')
```

- [ ] **Step 3: Add the surgery type button to the service selector UI**

Find the section where the Médico / Estético / Hotel type buttons are rendered (around line 280-316). Add a Cirugía button alongside them:

```tsx
<button
  type="button"
  onClick={() => { setAppointmentType('cirugia'); setShowSelector(false) }}
  className={cn(
    'flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-sm font-medium transition-colors',
    appointmentType === 'cirugia' && !showSelector
      ? 'border-blue-600 bg-blue-50 text-blue-700'
      : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
  )}
>
  <Syringe className="h-6 w-6" />
  Cirugía
</button>
```

Import `Syringe` from `lucide-react`.

- [ ] **Step 4: Render surgery fields when appointmentType === 'cirugia'**

Find the conditional block that renders grooming/boarding specific fields. Add a new block for surgery after it:

```tsx
{appointmentType === 'cirugia' && (
  <div className="space-y-3">
    <div>
      <Label>Diagnóstico pre-operatorio</Label>
      <Input
        value={surgeryDiagnosis}
        onChange={e => setSurgeryDiagnosis(e.target.value)}
        placeholder="Ej. Masa abdominal, fractura tibia..."
      />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label>Peso del paciente (kg)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={surgeryWeight}
          onChange={e => setSurgeryWeight(e.target.value)}
          placeholder="0.0"
        />
      </div>
      <div>
        <Label>Tipo de anestesia</Label>
        <Select value={surgeryAnesthesia} onValueChange={v => setSurgeryAnesthesia(v as typeof surgeryAnesthesia)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="sedacion">Sedación</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div>
      <Label>Procedimiento a realizar</Label>
      <Input
        value={surgeryProcedure}
        onChange={e => setSurgeryProcedure(e.target.value)}
        placeholder="Ej. Ovariohisterectomía, reducción de fractura..."
      />
    </div>
  </div>
)}
```

- [ ] **Step 5: Route surgery submission to /api/servicios/cirugia**

Find the `handleSubmit` function. Before the existing POST to `/api/appointments`, add a branch for surgery:

```typescript
if (appointmentType === 'cirugia') {
  const res = await fetch('/api/servicios/cirugia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pet_id: selectedPetId,
      owner_id: selectedOwner!.id,
      scheduled_at: combineDateAndTime(selectedDate!, selectedTime).toISOString(),
      assigned_to: assignedTo || null,
      diagnosis: surgeryDiagnosis || null,
      weight_kg: surgeryWeight ? parseFloat(surgeryWeight) : null,
      anesthesia_type: surgeryAnesthesia || null,
      procedure_description: surgeryProcedure || null,
    }),
  })
  const json = await res.json()
  if (!res.ok) { toast.error(json.error ?? 'Error al agendar cirugía'); return }
  toast.success('Cirugía agendada')
  onClose()
  router.refresh()
  return
}
```

- [ ] **Step 6: Reset surgery fields on modal close**

In the function that resets state on `onClose` / `useEffect([isOpen])`, add:

```typescript
setSurgeryDiagnosis('')
setSurgeryWeight('')
setSurgeryAnesthesia('')
setSurgeryProcedure('')
```

---

## Task 2: Overlap warning UI in NewAppointmentModal

The modal already has a `conflictWarning` state. Wire the check and the UI display.

**Files:**
- Modify: `veterinaias/components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Fetch conflicts when date + time are selected**

Add a `useEffect` that fires when `selectedDate` and `selectedTime` both have values:

```typescript
useEffect(() => {
  if (!selectedDate || !selectedTime) { setConflictWarning(null); return }
  const dt = combineDateAndTime(selectedDate, selectedTime)
  const from = dt.toISOString()
  const to = new Date(dt.getTime() + 90 * 60_000).toISOString() // 90-min window

  fetch(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
    .then(r => r.json())
    .then(json => {
      const conflicts: any[] = json.data ?? []
      if (conflicts.length === 0) { setConflictWarning(null); return }
      setConflictWarning({
        message: `Hay ${conflicts.length} cita(s) en este horario`,
        appointments: conflicts.map((a: any) => ({
          id: a.id,
          pet_name: a.pet?.name ?? '—',
          owner_name: a.owner?.full_name ?? '—',
        })),
      })
    })
    .catch(() => setConflictWarning(null))
}, [selectedDate, selectedTime])
```

- [ ] **Step 2: Render the warning banner**

After the time selector fields and before the submit button, render:

```tsx
{conflictWarning && (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    <div className="flex items-center gap-2 font-medium">
      <TriangleAlert className="h-4 w-4 shrink-0" />
      {conflictWarning.message}
    </div>
    <ul className="mt-1 space-y-0.5 pl-6 text-xs text-amber-700">
      {conflictWarning.appointments.map(a => (
        <li key={a.id}>{a.pet_name} — {a.owner_name}</li>
      ))}
    </ul>
    <p className="mt-1.5 text-xs text-amber-600">Puedes continuar si tienes personal disponible.</p>
  </div>
)}
```

---

## Task 3: Build DayView calendar component

A vertical time-slot grid for the current day, showing appointments as blocks.

**Files:**
- Create: `veterinaias/components/agenda/DayView.tsx`

- [ ] **Step 1: Define props and time-slot generation**

```typescript
'use client'
import { useMemo } from 'react'
import { format, isSameHour, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export interface AgendaAppointment {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  service_type: 'consultation' | 'grooming' | 'boarding' | 'cirugia'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  pet: { id: string; name: string } | null
  owner: { id: string; full_name: string } | null
}

interface DayViewProps {
  date: Date
  appointments: AgendaAppointment[]
  onSlotClick: (date: Date, hour: number) => void
  onAppointmentClick: (appt: AgendaAppointment) => void
}
```

- [ ] **Step 2: Render the time grid**

```tsx
export function DayView({ date, appointments, onSlotClick, onAppointmentClick }: DayViewProps) {
  const hours = useMemo(() => Array.from({ length: 13 }, (_, i) => i + 7), []) // 07:00–19:00

  return (
    <div className="flex flex-col divide-y divide-border overflow-y-auto">
      {hours.map(hour => {
        const slotAppts = appointments.filter(a => {
          const h = parseISO(a.scheduled_at).getHours()
          return h === hour
        })

        return (
          <div
            key={hour}
            className="group relative flex min-h-[64px] cursor-pointer gap-3 px-4 py-2 hover:bg-muted/40"
            onClick={() => onSlotClick(date, hour)}
          >
            <span className="w-12 shrink-0 pt-1 text-xs text-muted-foreground">
              {hour.toString().padStart(2, '0')}:00
            </span>
            <div className="flex flex-1 flex-wrap gap-2">
              {slotAppts.map(appt => (
                <AppointmentChip
                  key={appt.id}
                  appt={appt}
                  onClick={e => { e.stopPropagation(); onAppointmentClick(appt) }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Add AppointmentChip sub-component**

```tsx
const SERVICE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  grooming: 'Estética',
  boarding: 'Hotel',
  cirugia: 'Cirugía',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'border-amber-300 bg-amber-50 text-amber-800',
  confirmed: 'border-blue-300 bg-blue-50 text-blue-800',
  completed: 'border-green-300 bg-green-50 text-green-800',
  cancelled: 'border-red-200 bg-red-50 text-red-700 line-through',
  no_show: 'border-gray-300 bg-gray-50 text-gray-600 line-through',
}

function AppointmentChip({ appt, onClick }: { appt: AgendaAppointment; onClick: React.MouseEventHandler }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-left text-xs font-medium transition-shadow hover:shadow-sm ${STATUS_COLORS[appt.status] ?? ''}`}
    >
      <div className="font-semibold">{appt.pet?.name ?? '—'}</div>
      <div className="opacity-75">{SERVICE_LABELS[appt.service_type]} · {appt.owner?.full_name}</div>
    </button>
  )
}
```

---

## Task 4: Build AppointmentPanel side panel

Read-only summary. Quick status transitions (confirm, cancel, no-show). "Ver detalle" navigates to the detail page.

**Files:**
- Create: `veterinaias/components/agenda/AppointmentPanel.tsx`

- [ ] **Step 1: Define the component**

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AgendaAppointment } from './DayView'

interface AppointmentPanelProps {
  appointment: AgendaAppointment
  onClose: () => void
}

const SERVICE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  grooming: 'Estética',
  boarding: 'Hotel',
  cirugia: 'Cirugía',
}

const DETAIL_ROUTES: Record<string, string> = {
  consultation: 'consulta',
  grooming: 'estetica',
  boarding: 'hotel',
  cirugia: 'cirugia',
}
```

- [ ] **Step 2: Render the panel**

```tsx
export function AppointmentPanel({ appointment, onClose }: AppointmentPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const detailRoute = DETAIL_ROUTES[appointment.service_type]

  async function transition(newStatus: string) {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error'); return }
      router.refresh()
      onClose()
    } finally { setLoading(null) }
  }

  const canConfirm = appointment.status === 'scheduled'
  const canCancel = ['scheduled', 'confirmed'].includes(appointment.status)
  const canNoShow = appointment.status === 'confirmed'

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold">{appointment.pet?.name ?? '—'}</p>
          <p className="text-sm text-muted-foreground">{appointment.owner?.full_name}</p>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex gap-2">
        <Badge variant="outline">{SERVICE_LABELS[appointment.service_type]}</Badge>
        <Badge variant="outline">{appointment.status}</Badge>
      </div>

      {/* Quick actions — pre-initiation only */}
      <div className="flex flex-col gap-2">
        {canConfirm && (
          <Button size="sm" onClick={() => transition('confirmed')} disabled={loading === 'confirmed'}>
            Confirmar cita
          </Button>
        )}
        {canNoShow && (
          <Button size="sm" variant="outline" onClick={() => transition('no_show')} disabled={loading === 'no_show'}>
            No se presentó
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="outline" onClick={() => transition('cancelled')} disabled={loading === 'cancelled'}
            className="text-red-600 hover:bg-red-50">
            Cancelar
          </Button>
        )}
      </div>

      {/* Primary navigation */}
      {detailRoute && (
        <Link
          href={`/dashboard/servicios/${detailRoute}/${appointment.id}`}
          className="mt-auto flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          Ver detalle
        </Link>
      )}
    </div>
  )
}
```

---

## Task 5: Build AgendaScreen and replace dashboard

**Files:**
- Create: `veterinaias/components/agenda/AgendaScreen.tsx`
- Modify: `veterinaias/app/dashboard/page.tsx`

- [ ] **Step 1: Create AgendaScreen client component**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import { DayView, type AgendaAppointment } from './DayView'
import { AppointmentPanel } from './AppointmentPanel'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface Metrics {
  total: number          // citas hoy
  inService: number      // en curso (no hotel)
  hotelActive: number    // estadías activas
  pendingConfirm: number // sin confirmar
}

interface AgendaScreenProps {
  date: Date
  appointments: AgendaAppointment[]
  metrics: Metrics
  team: { id: string; full_name: string }[]
  businessHours: BusinessHoursConfig
}

export function AgendaScreen({ date, appointments, metrics, team, businessHours }: AgendaScreenProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTime, setModalTime] = useState<Date | undefined>()
  const [selectedAppt, setSelectedAppt] = useState<AgendaAppointment | null>(null)

  function handleSlotClick(d: Date, hour: number) {
    const dt = new Date(d)
    dt.setHours(hour, 0, 0, 0)
    setModalTime(dt)
    setModalOpen(true)
  }

  async function handleAtenderAhora() {
    try {
      const res = await fetch('/api/appointments/walkin', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error'); return }
      router.push(`/dashboard/servicios/consulta/${json.data.appointment_id}`)
    } catch { toast.error('Error de red') }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Metrics strip */}
      <div className="flex gap-4 border-b px-6 py-3 text-sm">
        <span><strong>{metrics.total}</strong> citas hoy</span>
        <span><strong>{metrics.inService}</strong> en curso</span>
        <span><strong>{metrics.hotelActive}</strong> hotel activo</span>
        {metrics.pendingConfirm > 0 && (
          <span className="text-amber-600"><strong>{metrics.pendingConfirm}</strong> sin confirmar</span>
        )}
        <Button size="sm" variant="destructive" className="ml-auto" onClick={handleAtenderAhora}>
          Atender Ahora
        </Button>
      </div>

      {/* Calendar + Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <DayView
            date={date}
            appointments={appointments}
            onSlotClick={handleSlotClick}
            onAppointmentClick={setSelectedAppt}
          />
        </div>

        {selectedAppt && (
          <div className="w-72 shrink-0 border-l">
            <AppointmentPanel
              appointment={selectedAppt}
              onClose={() => setSelectedAppt(null)}
            />
          </div>
        )}
      </div>

      <NewAppointmentModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalTime(undefined) }}
        team={team}
        businessHours={businessHours}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update dashboard page.tsx to use AgendaScreen**

Replace the `DashboardHome` import and return with `AgendaScreen`. Keep the same Supabase queries — they already fetch everything needed.

In `veterinaias/app/dashboard/page.tsx`, change the import:
```typescript
import { AgendaScreen } from '@/components/agenda/AgendaScreen'
import type { AgendaAppointment } from '@/components/agenda/DayView'
```

Replace the `return` block:
```tsx
return (
  <AgendaScreen
    date={todayStart}
    appointments={(appointments ?? []) as AgendaAppointment[]}
    metrics={{
      total: todayAppointments.length,
      inService: initialActiveServices.filter(s => s.service_type !== 'boarding').length,
      hotelActive: initialActiveServices.filter(s => s.service_type === 'boarding').length,
      pendingConfirm: todayAppointments.filter(a => a.status === 'scheduled').length,
    }}
    team={team ?? []}
    businessHours={businessHours}
  />
)
```

---

## Task 6: Walk-in "Atender Ahora" API endpoint

**Files:**
- Create: `veterinaias/app/api/appointments/walkin/route.ts`

- [ ] **Step 1: Create the walk-in POST route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  // Create a minimal consultation appointment scheduled for now, status confirmed
  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      tenant_id: profile.tenant_id,
      service_type: 'consultation',
      status: 'confirmed',
      scheduled_at: new Date().toISOString(),
      duration_minutes: 30,
      assigned_to: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: { appointment_id: appt.id } })
}
```

Note: Walk-in appointments have no `pet_id` or `owner_id` initially — the doctor assigns them on the consultation detail page when they open the patient's record. If the schema requires `pet_id` as NOT NULL, add a temporary "Paciente sin identificar" placeholder or make `pet_id` nullable. Check `supabase/migrations/` for the appointments table definition and adjust accordingly.

---

## Task 7: Consulta detail page — explicit lifecycle

The consultation detail page needs: Confirmar → Iniciar consulta → Finalizar consulta.

**Files:**
- Modify: `veterinaias/app/dashboard/servicios/consulta/[id]/page.tsx` (or wherever the consulta detail lives — check if it's a Server Component calling a client component)

- [ ] **Step 1: Identify the page structure**

Read the current page at `veterinaias/app/dashboard/servicios/consulta/[id]/page.tsx`. It likely shows the consultation view. Determine what client component manages actions (there may be a `ConsultationPanel` or similar).

- [ ] **Step 2: Add a ServiceLifecycleBar component inline or reuse AppointmentPanel logic**

The detail page should display a bar showing the current state and the one primary action:

```tsx
// At the top of the detail page content (before the medical record form)
<ServiceLifecycleBar appointmentId={id} status={appointment.status} serviceType="consultation" />
```

Create `veterinaias/components/servicios/ServiceLifecycleBar.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ServiceLifecycleBarProps {
  appointmentId: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  serviceType: 'consultation' | 'grooming' | 'boarding' | 'cirugia'
  serviceVisitId?: string   // needed for grooming/hotel/cirugia to call service APIs
  onInitiate?: () => void   // called when "Iniciar" is clicked (grooming/hotel/cirugia)
}

export function ServiceLifecycleBar({ appointmentId, status, serviceType, serviceVisitId, onInitiate }: ServiceLifecycleBarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function transitionAppointment(newStatus: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error'); return }
      router.refresh()
    } finally { setLoading(false) }
  }

  if (status === 'completed') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
        Servicio completado
      </div>
    )
  }

  if (status === 'cancelled' || status === 'no_show') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {status === 'cancelled' ? 'Cita cancelada' : 'No se presentó'}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <StatusTimeline status={status} />
      <div className="flex gap-2">
        {status === 'scheduled' && (
          <Button size="sm" onClick={() => transitionAppointment('confirmed')} disabled={loading}>
            Confirmar cita
          </Button>
        )}
        {status === 'confirmed' && serviceType === 'consultation' && (
          <Button size="sm" onClick={() => transitionAppointment('in_progress')} disabled={loading}>
            Iniciar consulta
          </Button>
        )}
        {status === 'confirmed' && serviceType !== 'consultation' && (
          <Button size="sm" onClick={onInitiate} disabled={loading}>
            {serviceType === 'grooming' ? 'Iniciar sesión' : serviceType === 'boarding' ? 'Check-in' : 'Iniciar cirugía'}
          </Button>
        )}
        {/* Cancelar / No se presentó — secondary actions */}
        {['scheduled', 'confirmed'].includes(status) && (
          <Button size="sm" variant="outline" onClick={() => transitionAppointment('cancelled')} disabled={loading}
            className="text-red-600">
            Cancelar
          </Button>
        )}
        {status === 'confirmed' && (
          <Button size="sm" variant="outline" onClick={() => transitionAppointment('no_show')} disabled={loading}>
            No se presentó
          </Button>
        )}
      </div>
    </div>
  )
}

function StatusTimeline({ status }: { status: string }) {
  const steps = ['scheduled', 'confirmed', 'in_progress', 'completed']
  const currentIdx = steps.indexOf(status)
  const labels = ['Agendado', 'Confirmado', 'En curso', 'Completado']

  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((step, i) => (
        <span key={step} className={`flex items-center gap-1 ${i <= currentIdx ? 'text-foreground' : 'text-muted-foreground'}`}>
          {i > 0 && <span className="text-muted-foreground">→</span>}
          <span className={i === currentIdx ? 'font-semibold' : ''}>{labels[i]}</span>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Wire the "Finalizar consulta" button**

The consulta detail page already has a "Finalizar Consulta" button that saves the medical record. Ensure that saving the record also transitions the appointment to `completed`. The existing `/api/appointments/[id]` PATCH endpoint handles `status: 'completed'` — just call it after saving the record:

```typescript
// In the form submit handler for the consultation record:
await fetch(`/api/appointments/${appointmentId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'completed' }),
})
```

---

## Task 8: Estética detail page — standardize lifecycle

**Files:**
- Modify: `veterinaias/app/dashboard/servicios/estetica/[id]/page.tsx`

- [ ] **Step 1: Add ServiceLifecycleBar at the top of the detail page**

```tsx
<ServiceLifecycleBar
  appointmentId={appointment.id}
  status={appointment.status}
  serviceType="grooming"
  onInitiate={handleIniciarSesion}
/>
```

- [ ] **Step 2: Implement handleIniciarSesion**

```typescript
async function handleIniciarSesion() {
  const res = await fetch('/api/servicios/estetica', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId }),
  })
  const json = await res.json()
  if (!res.ok) { toast.error(json.error ?? 'Error al iniciar sesión'); return }
  router.refresh()
}
```

- [ ] **Step 3: Ensure "Concluir sesión" button calls the existing PATCH endpoint**

The conclusion button should PATCH `/api/servicios/estetica/[serviceVisitId]` with `ended_at: new Date().toISOString()` and any notes. This is already partially implemented — verify the button is on the detail page and not only on the panel.

---

## Task 9: Hotel detail page — standardize lifecycle

**Files:**
- Modify: `veterinaias/app/dashboard/servicios/hotel/[id]/page.tsx`

- [ ] **Step 1: Add ServiceLifecycleBar**

```tsx
<ServiceLifecycleBar
  appointmentId={appointment.id}
  status={appointment.status}
  serviceType="boarding"
  onInitiate={handleCheckIn}
/>
```

- [ ] **Step 2: Implement handleCheckIn**

```typescript
async function handleCheckIn() {
  const res = await fetch('/api/servicios/hotel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId }),
  })
  const json = await res.json()
  if (!res.ok) { toast.error(json.error ?? 'Error al hacer check-in'); return }
  router.refresh()
}
```

- [ ] **Step 3: Verify "Check-out" button is on the detail page**

The check-out calls `PATCH /api/servicios/hotel/[id]` with `ended_at`. Confirm this button is visible when `status === 'in_progress'` and renders a notes field before confirming.

---

## Task 10: Cirugía detail page — standardize lifecycle

**Files:**
- Modify: `veterinaias/app/dashboard/servicios/cirugia/[id]/page.tsx`

- [ ] **Step 1: Add ServiceLifecycleBar**

```tsx
<ServiceLifecycleBar
  appointmentId={appointment.id}
  status={appointment.status}
  serviceType="cirugia"
  onInitiate={handleIniciarCirugia}
/>
```

- [ ] **Step 2: Implement handleIniciarCirugia**

This sets `started_at` on the surgery record. Call `PATCH /api/servicios/cirugia/[id]` with `{ started_at: new Date().toISOString() }`:

```typescript
async function handleIniciarCirugia() {
  const res = await fetch(`/api/servicios/cirugia/${surgeryRecordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ started_at: new Date().toISOString() }),
  })
  const json = await res.json()
  if (!res.ok) { toast.error(json.error ?? 'Error'); return }
  router.refresh()
}
```

- [ ] **Step 3: Verify "Concluir cirugía" form is gated behind in_progress status**

The conclusion form (procedure, findings, complications, recovery instructions, follow-up date) should only be submittable when `started_at` is set. Add a guard:

```tsx
{surgeryRecord?.started_at && !surgeryRecord?.ended_at && (
  <ConclusionForm surgeryId={surgeryRecord.id} appointmentId={appointment.id} />
)}
```

---

## Task 11: Wire "Nueva [X]" button on each service page

All service pages need a "Nueva [tipo]" button that opens `NewAppointmentModal` with that service type pre-selected.

**Files:**
- Modify: `veterinaias/app/dashboard/servicios/consulta/page.tsx`
- Modify: `veterinaias/app/dashboard/servicios/estetica/page.tsx`
- Modify: `veterinaias/app/dashboard/servicios/hotel/page.tsx`
- Modify: `veterinaias/app/dashboard/servicios/cirugia/page.tsx`

- [ ] **Step 1: Create a reusable NewServiceButton wrapper**

In each service page, convert it to a client component (add `'use client'`) if it isn't already, then add:

```typescript
const [modalOpen, setModalOpen] = useState(false)
```

Add a button in the page header:
```tsx
<Button onClick={() => setModalOpen(true)}>
  + Nueva {serviceLabel}
</Button>

<NewAppointmentModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  team={team}
  businessHours={businessHours}
  initialAppointmentType={serviceType}  // 'consultation' | 'grooming' | 'boarding' | 'cirugia'
/>
```

- [ ] **Step 2: Remove deprecated entry points**

In `/servicios/hotel/page.tsx`: remove `NewHotelReservationButton` usage.
In `/servicios/cirugia/page.tsx`: remove `ScheduleSurgeryModalTrigger` / `ScheduleSurgeryModal` usage.
In `/servicios/estetica/page.tsx`: remove `GroomingSessionsTable`'s `onNew` prop that opens `GroomingSessionModal`.

Note: `GroomingSessionsTable` may need its `onNew` prop removed or replaced — check if the table still needs the callback for other purposes.

---

## Task 12: Cleanup — remove deprecated components

**Files:**
- Delete: `veterinaias/components/servicios/GroomingSessionModal.tsx`
- Delete: `veterinaias/components/servicios/NewHotelReservationButton.tsx`
- Delete: `veterinaias/components/dashboard/DashboardCTAs.tsx`
- Delete: `veterinaias/components/dashboard/DashboardHome.tsx`
- Modify: `veterinaias/app/dashboard/layout.tsx`

- [ ] **Step 1: Search for all imports of each deleted component**

Run:
```bash
grep -r "GroomingSessionModal\|NewHotelReservationButton\|DashboardCTAs\|DashboardHome" veterinaias --include="*.tsx" --include="*.ts" -l
```

For each file listed, remove the import and any JSX usage.

- [ ] **Step 2: Delete the files**

```bash
rm veterinaias/components/servicios/GroomingSessionModal.tsx
rm veterinaias/components/servicios/NewHotelReservationButton.tsx
rm veterinaias/components/dashboard/DashboardCTAs.tsx
rm veterinaias/components/dashboard/DashboardHome.tsx
```

- [ ] **Step 3: Update sidebar nav label**

In `veterinaias/app/dashboard/layout.tsx`, find the sidebar nav item that links to `/dashboard`. Change its label and icon to "Agenda" / `CalendarDays` (from lucide-react):

```tsx
{ href: '/dashboard', label: 'Agenda', icon: CalendarDays }
```

- [ ] **Step 4: Verify the build**

```bash
cd veterinaias && npm run build
```

Fix any TypeScript errors or missing imports reported by the build.

---

## Self-Review Notes

- **Walk-in pet_id constraint** (Task 6): The `appointments` table may require `pet_id NOT NULL`. If so, the walk-in route will fail. Check migration `20260602000001` or the initial schema and either make `pet_id` nullable for walk-ins or create a system-level "Paciente pendiente" placeholder. Adjust the route accordingly.

- **ServiceLifecycleBar needs `serviceVisitStatus` prop** (Tasks 7–10): The `appointments` table uses `scheduled | confirmed | completed | cancelled | no_show` — there is no `in_progress` appointment status. The "En curso" step is tracked via `service_visits.status` and `service_visits.started_at`. The `ServiceLifecycleBar` component should accept an additional prop:
  ```typescript
  serviceVisitStartedAt?: string | null  // set = en curso, null = not started
  ```
  And derive "En curso" from `serviceVisitStartedAt !== null` rather than from `appointment.status`. Each detail page fetches both the appointment and the service_visit, so both pieces of data are available.

- **Hospitalización detail page** (not a separate task): The hospitalization detail page already has a discharge flow. Verify that `ServiceLifecycleBar` is not needed there — hospitalization is created directly in `in_progress` state so there is no scheduling/confirmation step. Only the "Dar de alta" button matters, which should already exist. No new task needed unless the button is missing.

- **Surgery PATCH for started_at** (Task 10): The `/api/servicios/cirugia/[id]` PATCH route may only handle conclusion data. Check `veterinaias/app/api/servicios/cirugia/[id]/route.ts` — if `started_at` is not handled, add a branch before the conclusion logic:
  ```typescript
  if (body.started_at && !body.ended_at) {
    // update surgery_record.started_at only
  }
  ```

- **DayView date-fns** (Task 3): Confirm `date-fns` is in `package.json` (`grep '"date-fns"' veterinaias/package.json`). If not, replace `parseISO` with `new Date(a.scheduled_at).getHours()` and remove the `date-fns` imports.
