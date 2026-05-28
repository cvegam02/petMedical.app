# Nueva Cita Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/dashboard/appointments/new` page with a modal accessible from the dashboard and the appointments list, and support first-visit scheduling (pet name only) with deferred patient data capture during consultation.

**Architecture:** Three layers of change: (1) schema migration to allow null `phone` and `species_id`, (2) new `POST /api/appointments/first-visit` endpoint for atomic stub creation, (3) UI — a reusable `NewAppointmentButton` + `NewAppointmentModal` component pair, and a `PatientDataSection` that appears at the top of the medical record form when a stub profile is detected.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), React Hook Form, Zod, shadcn/ui, sonner (toasts), Lucide React icons, Vitest (tests skipped — written at end of sprint)

**Spec:** `docs/superpowers/specs/2026-05-27-nueva-cita-modal.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `veterinaias/supabase/migrations/20260527000006_stub_records_nullable_fields.sql` | Create | Make `owners.phone` and `pets.species_id` nullable |
| `veterinaias/lib/validations/appointment.ts` | Modify | Add `firstVisitSchema` and `FirstVisitValues` |
| `veterinaias/app/api/appointments/first-visit/route.ts` | Create | POST endpoint: create stub owner+pet+registration+appointment atomically |
| `veterinaias/components/appointments/NewAppointmentModal.tsx` | Create | Modal with "Cliente registrado" / "Primera visita" toggle |
| `veterinaias/components/appointments/NewAppointmentButton.tsx` | Create | Button + isOpen state wrapper |
| `veterinaias/app/dashboard/page.tsx` | Modify | Add team fetch; replace Link→/appointments/new with NewAppointmentButton |
| `veterinaias/app/dashboard/appointments/page.tsx` | Modify | Add team fetch; replace both Links→/appointments/new with NewAppointmentButton |
| `veterinaias/app/dashboard/appointments/new/page.tsx` | Delete | Replaced by modal |
| `veterinaias/components/appointments/AppointmentForm.tsx` | Delete | Only used by the deleted page |
| `veterinaias/components/medical-records/PatientDataSection.tsx` | Create | "00. Datos del Paciente" section for incomplete profiles |
| `veterinaias/app/dashboard/pets/[petId]/records/new/page.tsx` | Modify | Detect incomplete profile; pass incompletePatient to form |
| `veterinaias/components/medical-records/MedicalRecordForm.tsx` | Modify | Accept incompletePatient prop; render PatientDataSection; PATCH owner+pet on submit |

---

## Task 1: Schema Migration

**Files:**
- Create: `veterinaias/supabase/migrations/20260527000006_stub_records_nullable_fields.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Allow stub owners (created during first-visit scheduling) to have no phone
ALTER TABLE owners ALTER COLUMN phone DROP NOT NULL;

-- Allow stub pets (created during first-visit scheduling) to have no species
ALTER TABLE pets ALTER COLUMN species_id DROP NOT NULL;
```

- [ ] **Step 2: Apply the migration**

```bash
cd veterinaias
npx supabase db push
```

Expected: migration applied with no errors. Confirm with:
```bash
npx supabase db diff
```
Expected: no diff (all migrations applied).

- [ ] **Step 3: Commit**

```bash
git add veterinaias/supabase/migrations/20260527000006_stub_records_nullable_fields.sql
git commit -m "feat: make owners.phone and pets.species_id nullable for stub records"
```

---

## Task 2: firstVisitSchema + API Endpoint

**Files:**
- Modify: `veterinaias/lib/validations/appointment.ts`
- Create: `veterinaias/app/api/appointments/first-visit/route.ts`

- [ ] **Step 1: Add `firstVisitSchema` to the validations file**

Current file ends at line 39. Add to the end of `veterinaias/lib/validations/appointment.ts`:

```typescript
export const firstVisitSchema = z.object({
  pet_name: z.string().min(1, 'Nombre de mascota requerido'),
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas')
  ),
  reason: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export type FirstVisitValues = z.infer<typeof firstVisitSchema>
```

- [ ] **Step 2: Create the first-visit API route**

Create `veterinaias/app/api/appointments/first-visit/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { firstVisitSchema } from '@/lib/validations/appointment'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = firstVisitSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { pet_name, scheduled_at, duration_minutes, reason, notes, assigned_to } = result.data

  // Step 1: Create stub owner (no phone, no email — marks profile as incomplete)
  const { data: owner, error: ownerError } = await (supabase.from('owners') as any)
    .insert({
      full_name: `Dueño de ${pet_name}`,
      phone: null,
      email: null,
      tenant_id: profile.tenant_id,
    })
    .select('id')
    .single()
  if (ownerError) return NextResponse.json({ error: 'Error al crear el dueño' }, { status: 500 })

  // Step 2: Create stub pet (no species_id — filled during consultation)
  const { data: pet, error: petError } = await (supabase.from('pets') as any)
    .insert({ name: pet_name, sex: 'unknown' })
    .select('id')
    .single()
  if (petError) {
    await (supabase.from('owners') as any).delete().eq('id', owner.id)
    return NextResponse.json({ error: 'Error al crear la mascota' }, { status: 500 })
  }

  // Step 3: Register pet under this tenant
  const { error: regError } = await supabase
    .from('pet_registrations')
    .insert({ tenant_id: profile.tenant_id, pet_id: pet.id, owner_id: owner.id })
  if (regError) {
    await Promise.all([
      (supabase.from('pets') as any).delete().eq('id', pet.id),
      (supabase.from('owners') as any).delete().eq('id', owner.id),
    ])
    return NextResponse.json({ error: 'Error al registrar la mascota' }, { status: 500 })
  }

  // Step 4: Create appointment
  const { data: appointment, error: aptError } = await (supabase.from('appointments') as any)
    .insert({
      pet_id: pet.id,
      owner_id: owner.id,
      tenant_id: profile.tenant_id,
      scheduled_at,
      duration_minutes,
      reason: reason ?? null,
      notes: notes ?? null,
      assigned_to: assigned_to ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (aptError) {
    await Promise.all([
      supabase.from('pet_registrations').delete().eq('pet_id', pet.id),
      (supabase.from('pets') as any).delete().eq('id', pet.id),
      (supabase.from('owners') as any).delete().eq('id', owner.id),
    ])
    return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
  }

  return NextResponse.json(
    { data: { id: appointment.id, pet_id: pet.id, owner_id: owner.id } },
    { status: 201 }
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd veterinaias
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add veterinaias/lib/validations/appointment.ts \
        veterinaias/app/api/appointments/first-visit/route.ts
git commit -m "feat: first-visit API endpoint — creates stub owner+pet+appointment"
```

---

## Task 3: NewAppointmentModal Component

**Files:**
- Create: `veterinaias/components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Create the component**

Create `veterinaias/components/appointments/NewAppointmentModal.tsx`:

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TeamMember { id: string; full_name: string }

export interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  team: TeamMember[]
}

type Mode = 'registered' | 'first_visit'

export function NewAppointmentModal({ isOpen, onClose, team }: NewAppointmentModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('registered')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Shared fields
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [reason, setReason] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  // Registered mode
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string; species: { name: string } | null }[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // First visit mode
  const [petName, setPetName] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus modal on open
  useEffect(() => {
    if (isOpen) modalRef.current?.focus()
  }, [isOpen])

  // Owner search debounce
  useEffect(() => {
    if (ownerQuery.length < 2) { setOwnerResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/owners?q=${encodeURIComponent(ownerQuery)}`)
        const json = await res.json()
        setOwnerResults(json.data ?? [])
        setShowSuggestions(true)
      } catch {
        setOwnerResults([])
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ownerQuery])

  // Load pets when owner is selected
  useEffect(() => {
    if (!selectedOwner) { setPets([]); return }
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => setPets(json.data ?? []))
      .catch(() => setPets([]))
  }, [selectedOwner])

  function reset() {
    setMode('registered')
    setScheduledAt('')
    setDurationMinutes(30)
    setReason('')
    setAssignedTo('')
    setOwnerQuery('')
    setOwnerResults([])
    setSelectedOwner(null)
    setPets([])
    setSelectedPetId('')
    setPetName('')
    setShowSuggestions(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt) { toast.error('Fecha y hora son requeridas'); return }

    if (mode === 'registered') {
      if (!selectedOwner) { toast.error('Selecciona un dueño'); return }
      if (!selectedPetId) { toast.error('Selecciona una mascota'); return }
    } else {
      if (!petName.trim()) { toast.error('Ingresa el nombre de la mascota'); return }
    }

    setIsSubmitting(true)
    try {
      const scheduledAtISO = new Date(scheduledAt).toISOString()

      if (mode === 'registered') {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_id: selectedPetId,
            owner_id: selectedOwner!.id,
            scheduled_at: scheduledAtISO,
            duration_minutes: durationMinutes,
            ...(reason ? { reason } : {}),
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
          }),
        })
        const json = await res.json()
        if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      } else {
        const res = await fetch('/api/appointments/first-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_name: petName.trim(),
            scheduled_at: scheduledAtISO,
            duration_minutes: durationMinutes,
            ...(reason ? { reason } : {}),
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
          }),
        })
        const json = await res.json()
        if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      }

      toast.success('Cita creada')
      handleClose()
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Nueva cita"
        tabIndex={-1}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Nueva cita</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-5 pb-2 space-y-6">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  mode === 'registered'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setMode('registered')}
              >
                Cliente registrado
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  mode === 'first_visit'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setMode('first_visit')}
              >
                Primera visita
              </button>
            </div>

            {/* Patient fields */}
            <div className="space-y-4">
              {mode === 'registered' ? (
                <>
                  <div className="relative space-y-1">
                    <Label htmlFor="owner_search">Dueño <span className="text-destructive">*</span></Label>
                    <Input
                      id="owner_search"
                      value={ownerQuery}
                      onChange={e => {
                        setOwnerQuery(e.target.value)
                        setSelectedOwner(null)
                        setSelectedPetId('')
                      }}
                      onFocus={() => ownerResults.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Buscar por nombre o teléfono..."
                      autoComplete="off"
                    />
                    {showSuggestions && ownerResults.length > 0 && (
                      <ul className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                        {ownerResults.map(o => (
                          <li key={o.id}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                              onMouseDown={() => {
                                setSelectedOwner(o)
                                setOwnerQuery(o.full_name)
                                setShowSuggestions(false)
                                setSelectedPetId('')
                              }}
                            >
                              <span className="font-medium">{o.full_name}</span>
                              {o.phone && (
                                <span className="text-muted-foreground ml-2">{o.phone}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Mascota <span className="text-destructive">*</span></Label>
                    <Select
                      value={selectedPetId}
                      onValueChange={setSelectedPetId}
                      disabled={!selectedOwner || pets.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedOwner
                              ? 'Selecciona un dueño primero'
                              : pets.length === 0
                              ? 'Sin mascotas registradas'
                              : 'Selecciona una mascota'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {pets.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{p.species ? ` (${p.species.name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="pet_name">
                    Nombre de la mascota <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pet_name"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    placeholder="Ej. Luna, Max, Pelusa..."
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Los datos del dueño y perfil completo se llenan durante la consulta.
                  </p>
                </div>
              )}
            </div>

            {/* Shared fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="scheduled_at">
                    Fecha y hora <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Duración</Label>
                  <Select
                    value={String(durationMinutes)}
                    onValueChange={v => setDurationMinutes(Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1.5 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ej. Consulta general, vacunación..."
                />
              </div>
              {team.length > 0 && (
                <div className="space-y-1">
                  <Label>Asignar a</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {team.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear cita'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/appointments/NewAppointmentModal.tsx
git commit -m "feat: NewAppointmentModal — registered and first-visit modes"
```

---

## Task 4: NewAppointmentButton Component

**Files:**
- Create: `veterinaias/components/appointments/NewAppointmentButton.tsx`

- [ ] **Step 1: Create the component**

Create `veterinaias/components/appointments/NewAppointmentButton.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAppointmentModal } from './NewAppointmentModal'

interface NewAppointmentButtonProps {
  team: { id: string; full_name: string }[]
  size?: 'sm' | 'default'
}

export function NewAppointmentButton({ team, size = 'sm' }: NewAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button size={size} onClick={() => setIsOpen(true)}>
        <Plus size={14} />
        Nueva cita
      </Button>
      <NewAppointmentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        team={team}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/appointments/NewAppointmentButton.tsx
git commit -m "feat: NewAppointmentButton — button wrapper with modal state"
```

---

## Task 5: Wire Modal into Pages + Delete Old Files

**Files:**
- Modify: `veterinaias/app/dashboard/page.tsx`
- Modify: `veterinaias/app/dashboard/appointments/page.tsx`
- Delete: `veterinaias/app/dashboard/appointments/new/page.tsx`
- Delete: `veterinaias/components/appointments/AppointmentForm.tsx`

### 5a — dashboard/page.tsx

- [ ] **Step 1: Add team fetch and replace the "Nueva cita" Link**

Replace the full content of `veterinaias/app/dashboard/page.tsx` with:

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, PawPrint, Calendar, Settings2, ChevronRight, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import { NextAppointmentCard } from '@/components/dashboard/NextAppointmentCard'
import { AppointmentQuickModal } from '@/components/dashboard/AppointmentQuickModal'
import { NewAppointmentButton } from '@/components/appointments/NewAppointmentButton'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name, type, subscription_status)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86400000)

  const showAll =
    tenant?.type === 'individual' ||
    profile?.role === 'admin' ||
    profile?.role === 'assistant' ||
    profile?.role === 'staff'

  let appointmentsQuery = supabase
    .from('appointments')
    .select(`
      id, status, scheduled_at, duration_minutes, reason,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .gte('scheduled_at', todayStart.toISOString())
    .order('scheduled_at', { ascending: true })

  if (!showAll && profile?.role === 'doctor') {
    appointmentsQuery = appointmentsQuery.eq('assigned_to', user!.id)
  }

  const { data: appointments } = await appointmentsQuery as { data: any[] | null }

  const todayAppointments = appointments?.filter(a =>
    new Date(a.scheduled_at) < tomorrowStart
  ) ?? []

  const futureAppointments = appointments?.filter(a =>
    new Date(a.scheduled_at) >= tomorrowStart
  ).slice(0, 5) ?? []

  const PENDING_STATUSES = ['scheduled', 'confirmed']
  const nextAppointment: DashboardAppointment | null =
    (todayAppointments as DashboardAppointment[]).find(a => PENDING_STATUSES.includes(a.status)) ?? null
  const otherAppointments: DashboardAppointment[] = nextAppointment
    ? (todayAppointments as DashboardAppointment[]).filter(a => a.id !== nextAppointment.id)
    : (todayAppointments as DashboardAppointment[])

  return (
    <div className="space-y-10">
      {/* Header & Quick actions */}
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {greeting}, {firstName}
          </h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/owners/new" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            <Plus size={13} />
            Nuevo dueño
          </Link>
          <NewAppointmentButton team={team ?? []} />
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Appointments Sections */}
        <div className="space-y-6">
          {/* Today's Appointments */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="label-overline text-muted-foreground/50">Citas de hoy</p>
              {todayAppointments.length > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {todayAppointments.length}
                </span>
              )}
            </div>

            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-xl bg-muted/30">
                <Calendar className="text-muted-foreground/20 mb-2" size={24} />
                <p className="text-xs text-muted-foreground">No hay citas para hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nextAppointment && <NextAppointmentCard appointment={nextAppointment} />}
                {otherAppointments.length > 0 && (
                  <AppointmentQuickModal appointments={otherAppointments} />
                )}
              </div>
            )}
          </section>

          {/* Future Appointments */}
          {futureAppointments.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="label-overline text-muted-foreground/50">Próximas citas</p>
                <Link href="/dashboard/appointments" className="text-[10px] font-medium text-primary hover:underline">
                  Ver agenda completa
                </Link>
              </div>
              <div className="space-y-2">
                {futureAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Work areas */}
        <div className="space-y-2">
          <p className="label-overline text-muted-foreground/50 px-1 mb-3">Módulos</p>

          <Link
            href="/dashboard/owners"
            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Users size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Dueños</p>
              <p className="text-xs text-muted-foreground mt-1">Directorio de clientes y responsables</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>

          <Link
            href="/dashboard/pets"
            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <PawPrint size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Mascotas</p>
              <p className="text-xs text-muted-foreground mt-1">Expedientes clínicos y búsqueda por paciente</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>

          <Link
            href="/dashboard/appointments"
            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Calendar size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Agenda</p>
              <p className="text-xs text-muted-foreground mt-1">Citas programadas y confirmaciones pendientes</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>

          {profile?.role === 'admin' && (
            <Link
              href="/dashboard/settings/team"
              className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <Settings2 size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">Equipo</p>
                <p className="text-xs text-muted-foreground mt-1">Roles, accesos e invitaciones</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
            </Link>
          )}
        </div>

        {/* Clinic info */}
        <div className="border-t border-border/60 pt-6">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground/60">
            <span>{tenant?.name}</span>
            <span>{tenant?.type === 'enterprise' ? 'Plan empresa' : 'Plan individual'}</span>
            <span className="font-mono">{user?.id.split('-')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 5b — appointments/page.tsx

- [ ] **Step 2: Add team fetch and replace both "Nueva cita" Links**

Replace the full content of `veterinaias/app/dashboard/appointments/page.tsx` with:

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import { NewAppointmentButton } from '@/components/appointments/NewAppointmentButton'

const TABS = [
  { key: 'hoy',      label: 'Hoy' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'confirmar',label: 'Por confirmar' },
]

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab = 'hoy' } = await searchParams
  const VALID_TABS = ['hoy', 'proximas', 'confirmar'] as const
  const tab = (VALID_TABS as readonly string[]).includes(rawTab) ? rawTab : 'hoy'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, tenants(type)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const showAll =
    tenant?.type === 'individual' ||
    profile?.role === 'admin' ||
    profile?.role === 'assistant' ||
    profile?.role === 'staff'

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const in8Days = new Date(todayStart.getTime() + 8 * 86_400_000)
  const in2Days = new Date(now.getTime() + 2 * 86_400_000)

  let query = (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('tenant_id', profile?.tenant_id)
    .order('scheduled_at', { ascending: true })

  if (!showAll && profile?.role === 'doctor') {
    query = query.eq('assigned_to', user!.id)
  }

  if (tab === 'hoy') {
    query = query
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', tomorrowStart.toISOString())
  } else if (tab === 'proximas') {
    query = query
      .gte('scheduled_at', tomorrowStart.toISOString())
      .lt('scheduled_at', in8Days.toISOString())
  } else if (tab === 'confirmar') {
    query = query
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', in2Days.toISOString())
      .eq('status', 'scheduled')
  }

  const { data: appointments } = await query
  const list = (appointments as any[]) ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Agenda</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Citas</h1>
          </div>
          <NewAppointmentButton team={team ?? []} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(t => (
            <Link
              key={t.key}
              href={`/dashboard/appointments?tab=${t.key}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto w-full">
        {tab === 'confirmar' && list.length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 text-sm text-foreground">
            Estas citas necesitan confirmación. Llama al dueño y marca la cita como confirmada.
          </div>
        )}

        {list.length === 0 ? (
          <div className="text-center py-20 rounded-[2rem] border-2 border-dashed border-border/60 bg-zinc-50/50">
            <div className="w-14 h-14 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center mx-auto mb-5">
              <CalendarDays size={22} className="text-muted-foreground/25" />
            </div>
            <p className="font-bold text-foreground text-lg tracking-tight">
              {tab === 'hoy' ? 'Sin citas para hoy' : tab === 'proximas' ? 'Sin citas próximas' : 'Sin citas por confirmar'}
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
              {tab === 'confirmar' ? 'Todas las citas próximas están confirmadas.' : 'Agrega una nueva cita para comenzar.'}
            </p>
            {tab !== 'confirmar' && (
              <div className="mt-7 flex justify-center">
                <NewAppointmentButton team={team ?? []} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((apt: any) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                showPhone={tab === 'confirmar'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 5c — Delete old files

- [ ] **Step 3: Delete the page and component that are now replaced**

```bash
rm veterinaias/app/dashboard/appointments/new/page.tsx
rm veterinaias/components/appointments/AppointmentForm.tsx
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors. If there are lingering imports of `AppointmentForm` or `appointments/new`, fix them.

- [ ] **Step 5: Commit**

```bash
git add veterinaias/app/dashboard/page.tsx \
        veterinaias/app/dashboard/appointments/page.tsx
git rm veterinaias/app/dashboard/appointments/new/page.tsx \
       veterinaias/components/appointments/AppointmentForm.tsx
git commit -m "feat: replace /appointments/new page with NewAppointmentButton modal in dashboard and appointments list"
```

---

## Task 6: PatientDataSection Component

**Files:**
- Create: `veterinaias/components/medical-records/PatientDataSection.tsx`

This component renders the "00. Datos del Paciente" section in the consultation form when a stub profile is detected.

- [ ] **Step 1: Create the component**

Create `veterinaias/components/medical-records/PatientDataSection.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Species { id: string; name: string }

export interface PatientDataValues {
  owner: { id: string; full_name: string; phone: string; email: string }
  pet: { id: string; species_id: string; sex: string; date_of_birth: string }
}

interface PatientDataSectionProps {
  initialOwner: { id: string; full_name: string; phone: string | null; email: string | null }
  initialPet: { id: string; species_id: string | null; sex: string; date_of_birth: string | null }
  onChange: (values: PatientDataValues) => void
}

export function PatientDataSection({ initialOwner, initialPet, onChange }: PatientDataSectionProps) {
  const [species, setSpecies] = useState<Species[]>([])
  const [ownerName, setOwnerName] = useState(initialOwner.full_name)
  const [ownerPhone, setOwnerPhone] = useState(initialOwner.phone ?? '')
  const [ownerEmail, setOwnerEmail] = useState(initialOwner.email ?? '')
  const [speciesId, setSpeciesId] = useState(initialPet.species_id ?? '')
  const [sex, setSex] = useState(initialPet.sex ?? 'unknown')
  const [dateOfBirth, setDateOfBirth] = useState(initialPet.date_of_birth ?? '')

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(json => setSpecies(json.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    onChange({
      owner: { id: initialOwner.id, full_name: ownerName, phone: ownerPhone, email: ownerEmail },
      pet: { id: initialPet.id, species_id: speciesId, sex, date_of_birth: dateOfBirth },
    })
  }, [ownerName, ownerPhone, ownerEmail, speciesId, sex, dateOfBirth]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
          <UserRound size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">00. Datos del Paciente</h3>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
            Perfil incompleto — completa antes de finalizar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Owner fields */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Dueño</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="patient_owner_name" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Nombre completo
              </Label>
              <Input
                id="patient_owner_name"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="Nombre del dueño"
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="patient_owner_phone" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Teléfono
              </Label>
              <Input
                id="patient_owner_phone"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
                placeholder="55-1234-5678"
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="patient_owner_email" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Email
              </Label>
              <Input
                id="patient_owner_email"
                type="email"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* Pet fields */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Mascota</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Especie
              </Label>
              <Select value={speciesId} onValueChange={setSpeciesId}>
                <SelectTrigger className="bg-white border-zinc-200 rounded-2xl">
                  <SelectValue placeholder="Seleccionar especie" />
                </SelectTrigger>
                <SelectContent>
                  {species.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Sexo
              </Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger className="bg-white border-zinc-200 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Macho</SelectItem>
                  <SelectItem value="female">Hembra</SelectItem>
                  <SelectItem value="unknown">Desconocido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="patient_pet_dob" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Fecha de nacimiento
              </Label>
              <Input
                id="patient_pet_dob"
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/medical-records/PatientDataSection.tsx
git commit -m "feat: PatientDataSection — captures owner+pet data for incomplete profiles"
```

---

## Task 7: records/new Page + MedicalRecordForm Update

**Files:**
- Modify: `veterinaias/app/dashboard/pets/[petId]/records/new/page.tsx`
- Modify: `veterinaias/components/medical-records/MedicalRecordForm.tsx`

### 7a — Update records/new page

- [ ] **Step 1: Add incomplete-profile detection to the page**

Replace the full content of `veterinaias/app/dashboard/pets/[petId]/records/new/page.tsx` with:

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordForm } from '@/components/medical-records/MedicalRecordForm'
import type { IncompletePatient } from '@/components/medical-records/MedicalRecordForm'

export default async function MedicalRecordNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ petId: string }>
  searchParams: Promise<{ appointmentId?: string }>
}) {
  const { petId } = await params
  const { appointmentId } = await searchParams
  const supabase = await createClient()

  const { data: pet, error } = await (supabase.from('pets') as any)
    .select('id, name')
    .eq('id', petId)
    .single()

  if (error || !pet) {
    console.error('Pet not found or error:', error)
    notFound()
  }

  // Detect incomplete profile (stub owner created during first-visit scheduling)
  let incompletePatient: IncompletePatient | null = null

  if (appointmentId) {
    const { data: appointment } = await (supabase.from('appointments') as any)
      .select('owner_id')
      .eq('id', appointmentId)
      .maybeSingle()

    if (appointment?.owner_id) {
      const [ownerResult, petProfileResult] = await Promise.all([
        (supabase.from('owners') as any)
          .select('id, full_name, email, phone')
          .eq('id', appointment.owner_id)
          .single(),
        (supabase.from('pets') as any)
          .select('id, species_id, sex, date_of_birth')
          .eq('id', petId)
          .single(),
      ])

      const owner = ownerResult.data
      if (owner && !owner.phone && !owner.email) {
        incompletePatient = {
          owner: {
            id: owner.id,
            full_name: owner.full_name,
            phone: owner.phone,
            email: owner.email,
          },
          pet: petProfileResult.data
            ? {
                id: petProfileResult.data.id,
                species_id: petProfileResult.data.species_id,
                sex: petProfileResult.data.sex,
                date_of_birth: petProfileResult.data.date_of_birth,
              }
            : null,
        }
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/dashboard/pets/${petId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        ← {pet.name}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">Nueva consulta</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Este registro será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
      </p>
      <MedicalRecordForm
        petId={petId}
        appointmentId={appointmentId}
        incompletePatient={incompletePatient}
      />
    </div>
  )
}
```

### 7b — Update MedicalRecordForm

- [ ] **Step 2: Extend MedicalRecordForm to handle incomplete patient data**

Replace the full content of `veterinaias/components/medical-records/MedicalRecordForm.tsx` with:

```typescript
'use client'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { medicalRecordSchema, type MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { PatientDataSection, type PatientDataValues } from './PatientDataSection'
import { PrescriptionsFields } from './PrescriptionsFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stethoscope, Activity, ClipboardList, Pill, Save, X, Heart, Thermometer } from 'lucide-react'

export interface IncompletePatient {
  owner: { id: string; full_name: string; phone: string | null; email: string | null }
  pet: { id: string; species_id: string | null; sex: string; date_of_birth: string | null } | null
}

interface MedicalRecordFormProps {
  petId: string
  appointmentId?: string
  incompletePatient?: IncompletePatient | null
}

export function MedicalRecordForm({ petId, appointmentId, incompletePatient }: MedicalRecordFormProps) {
  const router = useRouter()
  const patientDataRef = useRef<PatientDataValues | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema) as any,
    defaultValues: {
      pet_id: petId,
      prescriptions: [],
      ...(appointmentId ? { appointment_id: appointmentId } : {}),
    },
  })

  async function patchOwner(owner: PatientDataValues['owner']) {
    const body: Record<string, string> = { full_name: owner.full_name }
    if (owner.phone) body.phone = owner.phone
    if (owner.email) body.email = owner.email
    const res = await fetch(`/api/owners/${owner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('owner patch failed')
  }

  async function patchPet(pet: PatientDataValues['pet']) {
    const body: Record<string, string> = {}
    if (pet.species_id) body.species_id = pet.species_id
    if (pet.sex && pet.sex !== 'unknown') body.sex = pet.sex
    if (pet.date_of_birth) body.date_of_birth = pet.date_of_birth
    if (Object.keys(body).length === 0) return
    const res = await fetch(`/api/pets/${pet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('pet patch failed')
  }

  const onSubmit = async (values: MedicalRecordFormValues) => {
    try {
      // Save patient data and medical record in parallel
      const tasks: Promise<unknown>[] = [
        fetch('/api/medical-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            ...(appointmentId ? { appointment_id: appointmentId } : {}),
          }),
        }),
      ]

      if (incompletePatient && patientDataRef.current) {
        tasks.push(
          patchOwner(patientDataRef.current.owner).catch(() => {
            toast.warning('Datos del dueño no guardados — puedes actualizarlos en su perfil.')
          }),
        )
        if (patientDataRef.current.pet && incompletePatient.pet) {
          tasks.push(
            patchPet(patientDataRef.current.pet).catch(() => {
              toast.warning('Datos de la mascota no guardados — puedes actualizarlos en su perfil.')
            }),
          )
        }
      }

      const [recordRes] = await Promise.all(tasks) as [Response, ...unknown[]]
      const json = await recordRes.json()
      if (!recordRes.ok) { toast.error(json.error ?? 'Error al guardar el expediente'); return }

      router.push(`/dashboard/pets/${petId}/records/${json.data.id}`)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 pb-24">
      <input type="hidden" {...register('pet_id')} />
      {appointmentId && <input type="hidden" {...register('appointment_id')} />}

      {/* PHASE 00: PATIENT DATA (only for incomplete profiles) */}
      {incompletePatient && (
        <PatientDataSection
          initialOwner={incompletePatient.owner}
          initialPet={incompletePatient.pet ?? {
            id: petId,
            species_id: null,
            sex: 'unknown',
            date_of_birth: null,
          }}
          onChange={values => { patientDataRef.current = values }}
        />
      )}

      {/* PHASE 01: TRIAGE */}
      <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Stethoscope size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">01. Triaje Inicial</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Motivo y Signos Vitales</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-12">
            <Label htmlFor="reason" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block">Motivo de consulta *</Label>
            <Input
              id="reason"
              {...register('reason')}
              placeholder="Ej. Control de vacunas, pérdida de apetito, cirugía programada..."
              className="bg-white border-zinc-200 focus:ring-4 focus:ring-primary/5 rounded-2xl py-7 text-lg font-medium shadow-sm transition-all"
            />
            {errors.reason && <p className="text-destructive text-xs mt-2 font-bold flex items-center gap-1"><X size={12} /> {errors.reason.message}</p>}
          </div>

          <div className="md:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/20 p-8 rounded-[2rem] border border-zinc-100/50 shadow-inner">
            <div className="space-y-3">
              <Label htmlFor="weight_kg" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Activity size={11} className="text-primary" /> Peso (kg)
              </Label>
              <Input id="weight_kg" type="number" step="0.01" {...register('weight_kg', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="0.00" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="temperature_celsius" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Thermometer size={11} className="text-primary" /> Temp (°C)
              </Label>
              <Input id="temperature_celsius" type="number" step="0.1" {...register('temperature_celsius', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="38.5" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="heart_rate_bpm" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Heart size={11} className="text-primary" /> FC (lpm)
              </Label>
              <Input id="heart_rate_bpm" type="number" {...register('heart_rate_bpm', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="80" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="respiratory_rate_bpm" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Activity size={11} className="rotate-90 text-primary" /> FR (rpm)
              </Label>
              <Input id="respiratory_rate_bpm" type="number" {...register('respiratory_rate_bpm', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="20" />
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 02: EVALUATION */}
      <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <ClipboardList size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">02. Evaluación Médica</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Diagnóstico y Evolución</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label htmlFor="diagnosis" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Diagnóstico Clínico</Label>
            <textarea
              id="diagnosis"
              {...register('diagnosis')}
              rows={5}
              className="w-full bg-white border border-zinc-200 rounded-[1.5rem] px-5 py-4 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium shadow-sm leading-relaxed"
              placeholder="Describa el cuadro clínico observado..."
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="treatment" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Plan de Tratamiento</Label>
            <textarea
              id="treatment"
              {...register('treatment')}
              rows={5}
              className="w-full bg-white border border-zinc-200 rounded-[1.5rem] px-5 py-4 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium shadow-sm leading-relaxed"
              placeholder="Procedimientos realizados o indicados..."
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <Label htmlFor="notes" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Observaciones Internas</Label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="w-full bg-muted/30 border border-zinc-200/60 rounded-2xl px-5 py-4 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all italic text-zinc-600 leading-relaxed"
              placeholder="Notas confidenciales para el equipo..."
            />
          </div>
        </div>
      </section>

      {/* PHASE 03: PLAN */}
      <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 delay-300">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Pill size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">03. Gestión de Recetas</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Medicamentos y Dosis</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-border/60 shadow-xl shadow-primary/5 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <PrescriptionsFields control={control} />
        </div>
      </section>

      {/* ACTIONS BAR */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-2 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-700 fill-mode-both delay-500">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded px-6 h-10"
        >
          <X size={18} />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-white font-semibold rounded px-8 h-10 shadow-sm shadow-primary/20 active:scale-[0.97] transition-all duration-150"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Activity size={18} className="animate-spin" /> Procesando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save size={18} strokeWidth={2.5} /> Finalizar Consulta
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add veterinaias/app/dashboard/pets/[petId]/records/new/page.tsx \
        veterinaias/components/medical-records/MedicalRecordForm.tsx
git commit -m "feat: detect incomplete profile on records/new; add PatientDataSection to consultation form"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Covered By |
|-----------------|-----------|
| Modal with toggle "Cliente registrado / Primera visita" | Task 3: NewAppointmentModal |
| "Cliente registrado" mode — owner search + pet select | Task 3 |
| "Primera visita" mode — only pet name | Task 3 |
| POST /api/appointments/first-visit creates stub owner+pet+registration+appointment | Task 2 |
| Schema: owners.phone nullable | Task 1 |
| Schema: pets.species_id nullable | Task 1 |
| NewAppointmentButton accessible from dashboard | Task 5a |
| NewAppointmentButton accessible from /appointments header | Task 5b |
| NewAppointmentButton accessible from /appointments empty state | Task 5b |
| Delete appointments/new page + AppointmentForm | Task 5c |
| PatientDataSection — owner name/phone/email + pet species/sex/dob | Task 6 |
| Incomplete profile detection (null phone + null email) | Task 7a |
| MedicalRecordForm shows PatientDataSection when incompletePatient | Task 7b |
| PATCH owner + pet in parallel with medical record on submit | Task 7b |
| Non-blocking: toast.warning if PATCH fails, record still saves | Task 7b |
| Modal closes + router.refresh() on success | Task 3 |
| Escape key + click outside closes modal | Task 3 |
| firstVisitSchema validation | Task 2 |

**Type consistency check:**
- `IncompletePatient` defined in `MedicalRecordForm.tsx`, imported in `records/new/page.tsx` ✓
- `PatientDataValues` defined in `PatientDataSection.tsx`, used in `MedicalRecordForm.tsx` ✓
- `NewAppointmentModalProps` defined and exported from `NewAppointmentModal.tsx` ✓
- `team` prop type `{ id: string; full_name: string }[]` consistent across all components ✓

**No placeholders found** ✓
