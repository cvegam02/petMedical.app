# Date/Time Picker — NewAppointmentModal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `datetime-local` native input in the appointment modal with a shadcn Calendar popover (date) + slot Select (time), and derive `duration_minutes` automatically from tenant business hours settings.

**Architecture:** A pure utility `lib/utils/time-slots.ts` generates available slots from a `BusinessHoursConfig`. The modal receives `businessHours` as a prop (fetched by the server page components from `tenants.settings`). The API routes derive `duration_minutes` from the tenant's `settings.business_hours.slot_interval` instead of the request body.

**Tech Stack:** react-day-picker v9, shadcn Calendar + Popover, date-fns (bundled with react-day-picker), Vitest

---

## File Map

| File | Action |
|------|--------|
| `lib/utils/time-slots.ts` | Create — `BusinessHoursConfig` type, `generateTimeSlots`, `combineDateAndTime`, `DEFAULT_BUSINESS_HOURS` |
| `__tests__/utils/time-slots.test.ts` | Create — unit tests for the utility |
| `components/ui/calendar.tsx` | Create via shadcn CLI |
| `components/ui/popover.tsx` | Create via shadcn CLI |
| `supabase/migrations/20260527000007_tenant_business_hours.sql` | Create — add `business_hours` to `tenants.settings` |
| `lib/validations/appointment.ts` | Modify — make `duration_minutes` optional in `appointmentSchema` and `firstVisitSchema` |
| `app/api/appointments/route.ts` | Modify — fetch tenant settings; set `duration_minutes` from `slot_interval` |
| `app/api/appointments/first-visit/route.ts` | Modify — same |
| `__tests__/api/appointments.test.ts` | Modify — update mock for 3-call flow; remove `duration_minutes` from POST body |
| `components/appointments/NewAppointmentModal.tsx` | Modify — DatePicker + slot Select; remove Duration field |
| `components/appointments/NewAppointmentButton.tsx` | Modify — add `businessHours` prop |
| `app/dashboard/page.tsx` | Modify — fetch `settings` from tenant; pass `businessHours` |
| `app/dashboard/appointments/page.tsx` | Modify — fetch `settings` from tenant; pass `businessHours` |

---

### Task 1: Install shadcn Calendar and Popover components

**Files:**
- Create: `veterinaias/components/ui/calendar.tsx` (via CLI)
- Create: `veterinaias/components/ui/popover.tsx` (via CLI)

- [ ] **Step 1: Add components via shadcn CLI**

```bash
cd veterinaias && npx shadcn add calendar popover
```

Expected: prompts may appear — accept all. Installs `react-day-picker`, `@radix-ui/react-popover`, creates `components/ui/calendar.tsx` and `components/ui/popover.tsx`.

- [ ] **Step 2: Verify files were created**

```bash
ls veterinaias/components/ui/calendar.tsx veterinaias/components/ui/popover.tsx
```

Expected: both files exist.

- [ ] **Step 3: Verify date-fns is available**

```bash
ls veterinaias/node_modules/date-fns/package.json
```

Expected: file exists (react-day-picker installs date-fns as a dependency).

- [ ] **Step 4: Commit**

```bash
cd veterinaias && git add components/ui/calendar.tsx components/ui/popover.tsx package.json package-lock.json
git commit -m "chore: add shadcn Calendar and Popover components"
```

---

### Task 2: DB migration — business_hours in tenants.settings

**Files:**
- Create: `veterinaias/supabase/migrations/20260527000007_tenant_business_hours.sql`

- [ ] **Step 1: Create migration file**

Create `veterinaias/supabase/migrations/20260527000007_tenant_business_hours.sql` with:

```sql
-- Update tenants.settings default to include business_hours
ALTER TABLE tenants
  ALTER COLUMN settings SET DEFAULT '{
    "confirmation_reminder_days": 2,
    "share_link_expiry_days": 7,
    "business_hours": {
      "days": [1, 2, 3, 4, 5, 6],
      "start": "09:00",
      "end": "18:00",
      "slot_interval": 30
    }
  }'::jsonb;

-- Backfill existing rows that don't have business_hours yet
UPDATE tenants
SET settings = settings || '{
  "business_hours": {
    "days": [1, 2, 3, 4, 5, 6],
    "start": "09:00",
    "end": "18:00",
    "slot_interval": 30
  }
}'::jsonb
WHERE settings -> 'business_hours' IS NULL;
```

- [ ] **Step 2: Apply migration locally**

```bash
cd veterinaias && npx supabase db push
```

Expected: migration applied without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260527000007_tenant_business_hours.sql
git commit -m "feat: add business_hours to tenants.settings"
```

---

### Task 3: Time slots utility (TDD)

**Files:**
- Create: `veterinaias/lib/utils/time-slots.ts`
- Create: `veterinaias/__tests__/utils/time-slots.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `veterinaias/__tests__/utils/time-slots.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateTimeSlots, combineDateAndTime, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

const CONFIG = DEFAULT_BUSINESS_HOURS // Mon-Sat, 09:00-18:00, 30 min

afterEach(() => { vi.useRealTimers() })

describe('generateTimeSlots', () => {
  it('generates slots from start to end (exclusive) for a future date', () => {
    const date = new Date(2026, 5, 5) // June 5 2026 — Friday, not today
    const slots = generateTimeSlots(CONFIG, date)
    expect(slots[0]).toBe('09:00')
    expect(slots[slots.length - 1]).toBe('17:30')
    // (18:00 - 09:00) / 30 min = 18 slots
    expect(slots.length).toBe(18)
  })

  it('filters past slots when the date is today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 1, 10, 15)) // June 1 2026, 10:15
    const today = new Date(2026, 5, 1)
    const slots = generateTimeSlots(CONFIG, today)
    // 09:00, 09:30, 10:00 have passed (10:15 > 10:00); 10:30 is first available
    expect(slots[0]).toBe('10:30')
  })

  it('respects custom slot_interval', () => {
    const config = { ...CONFIG, slot_interval: 15 }
    const date = new Date(2026, 5, 5)
    const slots = generateTimeSlots(config, date)
    expect(slots[0]).toBe('09:00')
    expect(slots[1]).toBe('09:15')
    // (18:00 - 09:00) / 15 min = 36 slots
    expect(slots.length).toBe(36)
  })

  it('returns empty array when all slots have passed today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 1, 18, 0)) // 18:00 — all done
    const today = new Date(2026, 5, 1)
    const slots = generateTimeSlots(CONFIG, today)
    expect(slots).toEqual([])
  })
})

describe('combineDateAndTime', () => {
  it('sets hours and minutes on the given date without mutating it', () => {
    const date = new Date(2026, 5, 5, 0, 0, 0, 0)
    const original = date.getTime()
    const result = combineDateAndTime(date, '14:30')
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
    expect(result.getSeconds()).toBe(0)
    expect(result.getDate()).toBe(5)
    expect(date.getTime()).toBe(original) // original is not mutated
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd veterinaias && npm run test:run -- __tests__/utils/time-slots.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils/time-slots'`

- [ ] **Step 3: Create the utility**

Create `veterinaias/lib/utils/time-slots.ts`:

```ts
export interface BusinessHoursConfig {
  days: number[]       // 0=Sunday … 6=Saturday
  start: string        // "HH:mm"
  end: string          // "HH:mm"
  slot_interval: number // minutes between slots
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  days: [1, 2, 3, 4, 5, 6],
  start: '09:00',
  end: '18:00',
  slot_interval: 30,
}

export function generateTimeSlots(config: BusinessHoursConfig, date: Date): string[] {
  const [startH, startM] = config.start.split(':').map(Number)
  const [endH, endM] = config.end.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1

  const slots: string[] = []
  for (let m = startMinutes; m < endMinutes; m += config.slot_interval) {
    if (isToday && m <= currentMinutes) continue
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return slots
}

export function combineDateAndTime(date: Date, timeSlot: string): Date {
  const [h, m] = timeSlot.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h, m, 0, 0)
  return result
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd veterinaias && npm run test:run -- __tests__/utils/time-slots.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/time-slots.ts __tests__/utils/time-slots.test.ts
git commit -m "feat: time-slots utility — generateTimeSlots + combineDateAndTime"
```

---

### Task 4: Update Zod schemas — make duration_minutes optional

**Files:**
- Modify: `veterinaias/lib/validations/appointment.ts`

- [ ] **Step 1: Make duration_minutes optional in appointmentSchema and firstVisitSchema**

In `veterinaias/lib/validations/appointment.ts`, find the `duration_minutes` field in `appointmentSchema` and `firstVisitSchema` and add `.optional()`:

In `appointmentSchema`, replace:
```ts
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas')
  ),
```

With:
```ts
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas').optional()
  ),
```

In `firstVisitSchema`, replace:
```ts
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas')
  ),
```

With:
```ts
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas').optional()
  ),
```

Also update `appointmentFormSchema` — remove `duration_minutes` entirely since the form no longer has that field:

```ts
export const appointmentFormSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  owner_id: z.string().uuid('Dueño es requerido'),
  scheduled_at: z.string().min(1, 'Fecha y hora son requeridas'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})
```

And update the derived type:
```ts
export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/appointment.ts
git commit -m "feat: make duration_minutes optional in appointment schemas"
```

---

### Task 5: Update /api/appointments/route.ts — derive duration_minutes from tenant settings

**Files:**
- Modify: `veterinaias/app/api/appointments/route.ts`

- [ ] **Step 1: Add import for DEFAULT_BUSINESS_HOURS**

At the top of `veterinaias/app/api/appointments/route.ts`, add:

```ts
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
```

- [ ] **Step 2: Fetch tenant settings and derive duration_minutes in POST handler**

In the `POST` handler, after the line:
```ts
if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })
```

Add:
```ts
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single()

  const businessHours = (tenantData?.settings as any)?.business_hours ?? DEFAULT_BUSINESS_HOURS
  const slotInterval: number = businessHours.slot_interval
```

Then replace the insert block (after the Zod validation succeeds):

Find:
```ts
  const { data, error } = await (supabase.from('appointments') as any)
    .insert({
      ...result.data,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
```

Replace with:
```ts
  const { data, error } = await (supabase.from('appointments') as any)
    .insert({
      ...result.data,
      duration_minutes: result.data.duration_minutes ?? slotInterval,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/appointments/route.ts
git commit -m "feat: derive duration_minutes from tenant business_hours in POST /api/appointments"
```

---

### Task 6: Update /api/appointments/first-visit/route.ts — same pattern

**Files:**
- Modify: `veterinaias/app/api/appointments/first-visit/route.ts`

- [ ] **Step 1: Add import for DEFAULT_BUSINESS_HOURS**

At the top of `veterinaias/app/api/appointments/first-visit/route.ts`, add:

```ts
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
```

- [ ] **Step 2: Fetch tenant settings after getting profile**

In the `POST` handler, after:
```ts
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })
```

Add:
```ts
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single()

  const businessHours = (tenantData?.settings as any)?.business_hours ?? DEFAULT_BUSINESS_HOURS
  const slotInterval: number = businessHours.slot_interval
```

- [ ] **Step 3: Use slotInterval in the appointment insert (Step 4)**

Find the line that destructures `result.data`:
```ts
  const { pet_name, scheduled_at, duration_minutes, reason, notes, assigned_to } = result.data
```

Replace with:
```ts
  const { pet_name, scheduled_at, reason, notes, assigned_to } = result.data
  const duration_minutes = result.data.duration_minutes ?? slotInterval
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/appointments/first-visit/route.ts
git commit -m "feat: derive duration_minutes from tenant business_hours in first-visit route"
```

---

### Task 7: Update existing appointment API tests

**Files:**
- Modify: `veterinaias/__tests__/api/appointments.test.ts`

The POST handler now calls `from()` 3 times:
1. `user_profiles` → profile
2. `tenants` → settings
3. `appointments` → insert

- [ ] **Step 1: Update the POST 201 test to match the new 3-call flow**

In `veterinaias/__tests__/api/appointments.test.ts`, find the test `'returns 201 for valid appointment creation'` and replace its mock setup and body:

```ts
  it('returns 201 for valid appointment creation', async () => {
    const newAppointment = {
      id: VALID_APT_ID,
      pet_id: VALID_PET_ID,
      owner_id: VALID_OWNER_ID,
      scheduled_at: new Date().toISOString(),
      duration_minutes: 30,
      status: 'scheduled',
    }
    // POST route calls from() 3 times:
    //   1st: user_profiles → profile
    //   2nd: tenants → settings (business_hours)
    //   3rd: appointments → insert
    let fromCallCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return makeChain({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })
      }
      if (fromCallCount === 2) {
        return makeChain({
          single: vi.fn().mockResolvedValue({
            data: { settings: { business_hours: { days: [1,2,3,4,5,6], start: '09:00', end: '18:00', slot_interval: 30 } } },
            error: null,
          }),
        })
      }
      // 3rd: appointments insert
      return makeChain({
        single: vi.fn().mockResolvedValue({ data: newAppointment, error: null }),
      })
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: fromMock,
    } as any)
    const req = new NextRequest('http://localhost/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        pet_id: VALID_PET_ID,
        owner_id: VALID_OWNER_ID,
        scheduled_at: new Date().toISOString(),
        // duration_minutes intentionally omitted — API derives it from settings
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe(VALID_APT_ID)
  })
```

- [ ] **Step 2: Run appointment tests — expect all PASS**

```bash
cd veterinaias && npm run test:run -- __tests__/api/appointments.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/api/appointments.test.ts
git commit -m "test: update appointment POST mock for 3-call flow (tenant settings)"
```

---

### Task 8: Update NewAppointmentModal — DatePicker + time slots

**Files:**
- Modify: `veterinaias/components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Replace the full modal file**

Replace `veterinaias/components/appointments/NewAppointmentModal.tsx` with:

```tsx
'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { generateTimeSlots, combineDateAndTime, BusinessHoursConfig, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

interface TeamMember { id: string; full_name: string }

export interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  team: TeamMember[]
  businessHours?: BusinessHoursConfig
}

type Mode = 'registered' | 'first_visit'

export function NewAppointmentModal({ isOpen, onClose, team, businessHours = DEFAULT_BUSINESS_HOURS }: NewAppointmentModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('registered')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Date/time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Shared fields
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

  const timeSlots = useMemo(
    () => selectedDate ? generateTimeSlots(businessHours, selectedDate) : [],
    [selectedDate, businessHours]
  )

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
    setSelectedDate(undefined)
    setSelectedTime('')
    setDatePickerOpen(false)
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
    if (!selectedDate || !selectedTime) { toast.error('Fecha y hora son requeridas'); return }

    if (mode === 'registered') {
      if (!selectedOwner) { toast.error('Selecciona un dueño'); return }
      if (!selectedPetId) { toast.error('Selecciona una mascota'); return }
    } else {
      if (!petName.trim()) { toast.error('Ingresa el nombre de la mascota'); return }
    }

    setIsSubmitting(true)
    try {
      const scheduledAtISO = combineDateAndTime(selectedDate, selectedTime).toISOString()

      if (mode === 'registered') {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_id: selectedPetId,
            owner_id: selectedOwner!.id,
            scheduled_at: scheduledAtISO,
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
                      onValueChange={v => setSelectedPetId(v ?? '')}
                      disabled={!selectedOwner || pets.length === 0}
                      items={Object.fromEntries(pets.map(p => [p.id, p.name + (p.species ? ` (${p.species.name})` : '')]))}
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
              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>
                    Fecha <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal text-sm"
                      >
                        <CalendarIcon size={14} className="mr-2 shrink-0" />
                        {selectedDate
                          ? format(selectedDate, 'd MMM yyyy', { locale: es })
                          : <span className="text-muted-foreground">Selecciona una fecha</span>
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date)
                          setSelectedTime('')
                          setDatePickerOpen(false)
                        }}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today || !businessHours.days.includes(date.getDay())
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>
                    Hora <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedTime}
                    onValueChange={v => setSelectedTime(v ?? '')}
                    disabled={!selectedDate || timeSlots.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={!selectedDate ? 'Primero elige fecha' : 'Selecciona hora'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
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
                  <Select
                    value={assignedTo}
                    onValueChange={v => setAssignedTo(v ?? '')}
                    items={{ '': 'Sin asignar', ...Object.fromEntries(team.map(m => [m.id, m.full_name])) }}
                  >
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/appointments/NewAppointmentModal.tsx
git commit -m "feat: replace datetime-local with DatePicker + slot Select in NewAppointmentModal"
```

---

### Task 9: Update NewAppointmentButton — add businessHours prop

**Files:**
- Modify: `veterinaias/components/appointments/NewAppointmentButton.tsx`

- [ ] **Step 1: Add businessHours prop**

Replace `veterinaias/components/appointments/NewAppointmentButton.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAppointmentModal } from './NewAppointmentModal'
import { BusinessHoursConfig, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

interface NewAppointmentButtonProps {
  team: { id: string; full_name: string }[]
  businessHours?: BusinessHoursConfig
  size?: 'sm' | 'default'
}

export function NewAppointmentButton({ team, businessHours = DEFAULT_BUSINESS_HOURS, size = 'sm' }: NewAppointmentButtonProps) {
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
        businessHours={businessHours}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/appointments/NewAppointmentButton.tsx
git commit -m "feat: pass businessHours prop through NewAppointmentButton"
```

---

### Task 10: Update dashboard pages — fetch and pass businessHours

**Files:**
- Modify: `veterinaias/app/dashboard/page.tsx`
- Modify: `veterinaias/app/dashboard/appointments/page.tsx`

- [ ] **Step 1: Add DEFAULT_BUSINESS_HOURS import to dashboard/page.tsx**

At the top of `veterinaias/app/dashboard/page.tsx`, add:

```ts
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
```

- [ ] **Step 2: Extend tenants select to include settings in dashboard/page.tsx**

Find:
```ts
    .select('full_name, role, tenant_id, tenants(name, type, subscription_status)')
```

Replace with:
```ts
    .select('full_name, role, tenant_id, tenants(name, type, subscription_status, settings)')
```

- [ ] **Step 3: Extract businessHours in dashboard/page.tsx**

After `const tenant = profile?.tenants`, add:

```ts
  const businessHours = (tenant as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS
```

- [ ] **Step 4: Pass businessHours to both NewAppointmentButton usages in dashboard/page.tsx**

Find all `<NewAppointmentButton team={team ?? []} />` occurrences and replace with:

```tsx
<NewAppointmentButton team={team ?? []} businessHours={businessHours} />
```

- [ ] **Step 5: Update appointments/page.tsx — add import**

At the top of `veterinaias/app/dashboard/appointments/page.tsx`, add:

```ts
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
```

- [ ] **Step 6: Extend tenants select to include settings in appointments/page.tsx**

Find:
```ts
    .select('role, tenant_id, tenants(type)')
```

Replace with:
```ts
    .select('role, tenant_id, tenants(type, settings)')
```

- [ ] **Step 7: Extract businessHours in appointments/page.tsx**

After `const tenant = profile?.tenants`, add:

```ts
  const businessHours = (tenant as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS
```

- [ ] **Step 8: Pass businessHours to all NewAppointmentButton usages in appointments/page.tsx**

Find all `<NewAppointmentButton team={team ?? []} />` occurrences (there are 2) and replace with:

```tsx
<NewAppointmentButton team={team ?? []} businessHours={businessHours} />
```

- [ ] **Step 9: Verify TypeScript compiles and all tests pass**

```bash
cd veterinaias && npx tsc --noEmit && npm run test:run
```

Expected: no TypeScript errors, all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/appointments/page.tsx
git commit -m "feat: fetch business_hours from tenant settings and pass to appointment modal"
```

---

## Done ✓

After all tasks:
- The appointment modal shows a calendar popover for date selection and a slot Select for time
- Days outside `business_hours.days` are disabled in the calendar
- Past dates are disabled
- Time slots are generated from the tenant's configured `start`/`end`/`slot_interval`
- `duration_minutes` is derived automatically on the server from `slot_interval`
- The Duration field is gone from the modal
- All existing tests pass
