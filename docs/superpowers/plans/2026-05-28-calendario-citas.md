# Vista de Calendario en Citas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una vista de calendario (semana y mes) a `/dashboard/appointments` con toggle Lista/Calendario, usando react-big-calendar; el calendario muestra citas como eventos y abre un popover al hacer clic.

**Architecture:** La página existente es un Server Component que lee `?vista` del searchParam y renderiza condicionalmente la lista existente o un nuevo `CalendarView` Client Component. CalendarView fetches `/api/appointments?from=&to=` para el rango visible y usa un componente propio de evento que abre `AppointmentPopover` (Base UI). El API se extiende con params opcionales `from`/`to` sin romper la lógica de tabs existente.

**Tech Stack:** Next.js 15 App Router, TypeScript, react-big-calendar, date-fns v4.3.0 (ya instalado), Base UI Popover via `components/ui/popover.tsx`, Tailwind CSS, Vitest + @testing-library/react

> Spec: `docs/superpowers/specs/2026-05-28-calendario-citas-design.md`

---

## Mapa de Archivos

### Nuevos
```
components/appointments/AppointmentPopover.tsx
components/appointments/CalendarView.tsx
__tests__/components/appointments/AppointmentPopover.test.tsx
__tests__/components/appointments/CalendarView.test.tsx
```

### Modificados
```
app/api/appointments/route.ts         # Agregar ?from= & ?to=
app/dashboard/appointments/page.tsx   # Toggle + render condicional + businessHours
app/globals.css                       # Overrides de estilos de react-big-calendar
__tests__/api/appointments.test.ts    # Test para ?from=&?to=
```

### Dependencias nuevas
```
react-big-calendar
@types/react-big-calendar
```

---

## Task 1: Instalar react-big-calendar

**Files:**
- `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar**

```bash
cd veterinaias && npm install react-big-calendar @types/react-big-calendar
```

Expected: sin errores, `node_modules/react-big-calendar` presente.

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-big-calendar dependency"
```

---

## Task 2: Extender GET /api/appointments con ?from= & ?to=

**Files:**
- Modify: `veterinaias/app/api/appointments/route.ts`
- Modify: `veterinaias/__tests__/api/appointments.test.ts`

- [ ] **Step 1: Agregar test de rango de fechas**

Abrir `__tests__/api/appointments.test.ts` y agregar al final del archivo:

```typescript
describe('GET /api/appointments con ?from= y ?to=', () => {
  it('filtra por rango de fechas cuando from y to están presentes', async () => {
    const appointments = [
      { id: 'apt-range', status: 'confirmed', scheduled_at: '2026-06-15T10:00:00Z' },
    ]
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: appointments, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    }
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const req = new NextRequest(
      'http://localhost/api/appointments?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(chain.gte).toHaveBeenCalledWith('scheduled_at', '2026-06-01T00:00:00Z')
    expect(chain.lte).toHaveBeenCalledWith('scheduled_at', '2026-06-30T23:59:59Z')
  })
})
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
npm run test -- __tests__/api/appointments.test.ts 2>&1 | tail -10
```

Expected: FAIL — el código actual no llama `.lte`

- [ ] **Step 3: Modificar `app/api/appointments/route.ts`**

Localizar el bloque `const tab = ...` y la lógica de fechas en la función `GET`. Reemplazar esa sección con:

```typescript
  const tab = req.nextUrl.searchParams.get('tab') ?? 'hoy'
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (!VALID_TABS.includes(tab as typeof VALID_TABS[number]) && !(from && to)) {
    return NextResponse.json({ error: 'Tab inválido' }, { status: 400 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + ONE_DAY_MS)
  const in8Days = new Date(todayStart.getTime() + 8 * ONE_DAY_MS)
  const in2DaysFromNow = new Date(now.getTime() + 2 * ONE_DAY_MS)

  if (from && to) {
    query = query
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)
  } else if (tab === 'hoy') {
    query = query
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', tomorrowStart.toISOString())
  } else if (tab === 'proximas') {
    query = query
      .gte('scheduled_at', tomorrowStart.toISOString())
      .lt('scheduled_at', in8Days.toISOString())
  } else {
    // confirmar
    query = query
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', in2DaysFromNow.toISOString())
      .eq('status', 'scheduled')
  }
```

La variable `query` se inicializa antes de este bloque en la función GET existente. Solo hay que reemplazar la sección de tab y filtros de fecha.

- [ ] **Step 4: Ejecutar — debe pasar**

```bash
npm run test -- __tests__/api/appointments.test.ts 2>&1 | tail -10
```

Expected: PASS — todos los tests en verde

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/api/appointments/route.ts __tests__/api/appointments.test.ts
git commit -m "feat: extend GET /api/appointments with ?from=&to= date range filter"
```

---

## Task 3: AppointmentPopover

**Files:**
- Create: `veterinaias/components/appointments/AppointmentPopover.tsx`
- Create: `veterinaias/__tests__/components/appointments/AppointmentPopover.test.tsx`

Popover con resumen de la cita. Usa `Popover`, `PopoverTrigger`, `PopoverContent` de `components/ui/popover.tsx` (Base UI internamente). Exporta también el tipo `AppointmentResource` que CalendarView reutilizará.

- [ ] **Step 1: Escribir el test**

Crear `__tests__/components/appointments/AppointmentPopover.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppointmentPopover } from '@/components/appointments/AppointmentPopover'

const apt = {
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-06-15T10:00:00Z',
  duration_minutes: 30,
  reason: 'Vacunación',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
}

describe('AppointmentPopover', () => {
  it('renderiza el trigger sin explotar', () => {
    render(
      <AppointmentPopover appointment={apt}>
        <button>Trigger</button>
      </AppointmentPopover>
    )
    expect(screen.getByText('Trigger')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
npm run test -- __tests__/components/appointments/AppointmentPopover.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '@/components/appointments/AppointmentPopover'`

- [ ] **Step 3: Crear `components/appointments/AppointmentPopover.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programada',     className: 'bg-muted text-muted-foreground border-border' },
  confirmed: { label: 'Confirmada',     className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completada',     className: 'bg-primary/20 text-primary border-primary/30' },
  cancelled: { label: 'Cancelada',      className: 'bg-destructive/10 text-destructive border-destructive/20' },
  no_show:   { label: 'No se presentó', className: 'bg-orange-50 text-orange-600 border-orange-200' },
}

export interface AppointmentResource {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
}

interface AppointmentPopoverProps {
  appointment: AppointmentResource
  children: React.ReactNode
}

export function AppointmentPopover({ appointment, children }: AppointmentPopoverProps) {
  const status = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled
  const dateObj = new Date(appointment.scheduled_at)
  const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const date = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm text-foreground leading-none">
                {appointment.pet?.name ?? '—'}
              </p>
              {appointment.pet?.species && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {appointment.pet.species.name}
                </p>
              )}
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${status.className}`}>
              {status.label}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {appointment.owner?.full_name ?? '—'}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={11} />
            <span className="capitalize">{date} · {time} · {appointment.duration_minutes}min</span>
          </div>

          {appointment.reason && (
            <p className="text-xs text-muted-foreground italic">{appointment.reason}</p>
          )}

          <Link
            href={`/dashboard/appointments/${appointment.id}`}
            className="block w-full text-center text-xs font-medium text-primary hover:underline pt-1 border-t border-border mt-1"
          >
            Ver detalle →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Ejecutar — debe pasar**

```bash
npm run test -- __tests__/components/appointments/AppointmentPopover.test.tsx 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add components/appointments/AppointmentPopover.tsx \
        __tests__/components/appointments/AppointmentPopover.test.tsx
git commit -m "feat: add AppointmentPopover with Base UI popover"
```

---

## Task 4: CalendarView

**Files:**
- Create: `veterinaias/components/appointments/CalendarView.tsx`
- Create: `veterinaias/__tests__/components/appointments/CalendarView.test.tsx`

**Notas de react-big-calendar:**
- Requiere CSS: `import 'react-big-calendar/lib/css/react-big-calendar.css'`
- Localizer con `dateFnsLocalizer` de `react-big-calendar` + funciones de `date-fns`
- `onRangeChange` recibe `Date[]` (semana) o `{ start: Date; end: Date }` (mes)
- `min`/`max` controlan el horario visible en vista semana — se calculan desde strings "HH:mm"
- El componente de evento personalizado recibe `{ event: CalendarEvent }` y debe llamar `e.stopPropagation()` para que el popover no interfiera con react-big-calendar

- [ ] **Step 1: Escribir el test**

Crear `__tests__/components/appointments/CalendarView.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CalendarView } from '@/components/appointments/CalendarView'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

vi.mock('react-big-calendar', () => ({
  Calendar: ({ events }: any) => (
    <div data-testid="rbc-calendar">
      {events.map((e: any) => (
        <div key={e.resource.id} data-testid="rbc-event">{e.title}</div>
      ))}
    </div>
  ),
  dateFnsLocalizer: vi.fn(() => ({})),
  Views: { WEEK: 'week', MONTH: 'month' },
}))

const businessHours: BusinessHoursConfig = {
  days: [1, 2, 3, 4, 5, 6],
  start: '09:00',
  end: '18:00',
  slot_interval: 30,
}

describe('CalendarView', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as any)
  })

  it('renderiza el calendario', () => {
    render(<CalendarView businessHours={businessHours} />)
    expect(screen.getByTestId('rbc-calendar')).toBeInTheDocument()
  })

  it('llama al API con rango de fechas al montar', async () => {
    render(<CalendarView businessHours={businessHours} />)
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/appointments?from=')
      )
    })
  })
})
```

- [ ] **Step 2: Ejecutar — debe fallar**

```bash
npm run test -- __tests__/components/appointments/CalendarView.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '@/components/appointments/CalendarView'`

- [ ] **Step 3: Crear `components/appointments/CalendarView.tsx`**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import {
  format, parse, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { AppointmentPopover, type AppointmentResource } from './AppointmentPopover'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
})

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-muted-foreground/40',
  confirmed:  'bg-primary',
  completed:  'bg-primary/70',
  cancelled:  'bg-destructive',
  no_show:    'bg-orange-400',
}

interface CalendarEvent {
  title: string
  start: Date
  end: Date
  resource: AppointmentResource
}

function EventComponent({ event }: { event: CalendarEvent }) {
  return (
    <AppointmentPopover appointment={event.resource}>
      <button
        className="w-full h-full text-left flex items-center gap-1 px-1 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[event.resource.status] ?? 'bg-muted-foreground/40'}`} />
        <span className="text-[11px] truncate leading-tight">
          {event.resource.pet?.name ?? '—'}
          {event.resource.pet?.species ? ` · ${event.resource.pet.species.name}` : ''}
        </span>
      </button>
    </AppointmentPopover>
  )
}

function parseHHMM(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

interface CalendarViewProps {
  businessHours: BusinessHoursConfig
}

export function CalendarView({ businessHours }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    setLoading(true)
    try {
      const url = `/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`
      const res = await fetch(url)
      if (!res.ok) return
      const json = await res.json()
      const apts: AppointmentResource[] = json.data ?? []
      setEvents(
        apts.map(apt => {
          const start = new Date(apt.scheduled_at)
          const end = new Date(start.getTime() + apt.duration_minutes * 60_000)
          return { title: apt.pet?.name ?? '—', start, end, resource: apt }
        })
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const now = new Date()
    fetchRange(
      startOfWeek(now, { weekStartsOn: 1 }),
      endOfWeek(now, { weekStartsOn: 1 })
    )
  }, [fetchRange])

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        fetchRange(range[0], range[range.length - 1])
      } else {
        fetchRange(startOfMonth(range.start), endOfMonth(range.end))
      }
    },
    [fetchRange]
  )

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground animate-pulse">
          Cargando...
        </div>
      )}
      <div className="rbc-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.MONTH]}
          onRangeChange={handleRangeChange}
          min={parseHHMM(businessHours.start)}
          max={parseHHMM(businessHours.end)}
          culture="es"
          components={{ event: EventComponent as any }}
          selectable={false}
          style={{ height: 600 }}
          messages={{
            week: 'Semana',
            month: 'Mes',
            today: 'Hoy',
            previous: '‹',
            next: '›',
            noEventsInRange: 'Sin citas en este período.',
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar — debe pasar**

```bash
npm run test -- __tests__/components/appointments/CalendarView.test.tsx 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: `✓ Compiled successfully`.

Si hay un error de CSS import (`Module parse failed`) agregar al `next.config.ts` (o `next.config.js`):

```typescript
// en el objeto de configuración de NextConfig:
transpilePackages: ['react-big-calendar'],
```

- [ ] **Step 6: Commit**

```bash
git add components/appointments/CalendarView.tsx \
        __tests__/components/appointments/CalendarView.test.tsx
git commit -m "feat: add CalendarView with react-big-calendar week/month views"
```

---

## Task 5: Toggle y render condicional en page.tsx

**Files:**
- Modify: `veterinaias/app/dashboard/appointments/page.tsx`
- Modify: `veterinaias/app/globals.css`

- [ ] **Step 1: Reemplazar `app/dashboard/appointments/page.tsx`**

Reemplazar el contenido completo del archivo:

```typescript
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import Link from 'next/link'
import { CalendarDays, LayoutList, Calendar } from 'lucide-react'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import { NewAppointmentButton } from '@/components/appointments/NewAppointmentButton'
import { CalendarView } from '@/components/appointments/CalendarView'

const TABS = [
  { key: 'hoy',       label: 'Hoy' },
  { key: 'proximas',  label: 'Próximas' },
  { key: 'confirmar', label: 'Por confirmar' },
]

const VALID_TABS = ['hoy', 'proximas', 'confirmar'] as const

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; vista?: string }>
}) {
  const { tab: rawTab = 'hoy', vista = 'lista' } = await searchParams
  const tab = (VALID_TABS as readonly string[]).includes(rawTab) ? rawTab : 'hoy'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, tenants(type, settings)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const businessHours = (tenant as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS
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

  let list: any[] = []
  if (vista !== 'calendario') {
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
    list = (appointments as any[]) ?? []
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Agenda</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Citas</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Lista / Calendario */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <Link
                href="/dashboard/appointments?vista=lista"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  vista !== 'calendario'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <LayoutList size={13} />
                Lista
              </Link>
              <Link
                href="/dashboard/appointments?vista=calendario"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  vista === 'calendario'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Calendar size={13} />
                Calendario
              </Link>
            </div>

            <NewAppointmentButton team={team ?? []} businessHours={businessHours} />
          </div>
        </div>

        {/* Tabs — solo en vista lista */}
        {vista !== 'calendario' && (
          <div className="flex gap-1 border-b border-border">
            {TABS.map(t => (
              <Link
                key={t.key}
                href={`/dashboard/appointments?tab=${t.key}&vista=lista`}
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
        )}
      </div>

      {/* Vista Calendario */}
      {vista === 'calendario' ? (
        <CalendarView businessHours={businessHours} />
      ) : (
        /* Vista Lista */
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
                  <NewAppointmentButton team={team ?? []} businessHours={businessHours} />
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
      )}
    </div>
  )
}
```

- [ ] **Step 2: Agregar overrides de CSS al final de `app/globals.css`**

Agregar al final del archivo:

```css
/* react-big-calendar overrides */
.rbc-wrapper .rbc-calendar {
  font-family: inherit;
}
.rbc-wrapper .rbc-toolbar {
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.rbc-wrapper .rbc-toolbar-label {
  font-size: 0.875rem;
  font-weight: 600;
}
.rbc-wrapper .rbc-btn-group button {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-color: hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  transition: color 0.15s, background 0.15s;
}
.rbc-wrapper .rbc-btn-group button:hover {
  background: hsl(var(--muted) / 0.5);
  color: hsl(var(--foreground));
}
.rbc-wrapper .rbc-btn-group button.rbc-active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}
.rbc-wrapper .rbc-header {
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  padding: 0.5rem 0;
  border-color: hsl(var(--border));
}
.rbc-wrapper .rbc-today {
  background: hsl(var(--primary) / 0.05);
}
.rbc-wrapper .rbc-event {
  background: hsl(var(--primary) / 0.1);
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 0.25rem;
  color: hsl(var(--foreground));
  padding: 1px 2px;
}
.rbc-wrapper .rbc-event.rbc-selected {
  background: hsl(var(--primary) / 0.2);
}
.rbc-wrapper .rbc-current-time-indicator {
  background: hsl(var(--primary));
}
.rbc-wrapper .rbc-off-range-bg {
  background: hsl(var(--muted) / 0.3);
}
```

- [ ] **Step 3: Ejecutar todos los tests**

```bash
npm run test 2>&1 | tail -20
```

Expected: todos en verde, sin regresiones.

- [ ] **Step 4: Build final**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/appointments/page.tsx app/globals.css
git commit -m "feat: add Lista/Calendario toggle to appointments page"
```

---

## Self-Review

### Cobertura del spec

| Requisito | Task |
|---|---|
| Toggle Lista/Calendario via `?vista=` URL param | Task 5 |
| Vista lista sin cambios | Task 5 (misma lógica, solo se mueve al bloque condicional) |
| API `?from=&?to=` opcionales, ignora `tab` si están | Task 2 |
| CalendarView — vistas semana y mes | Task 4 |
| Horario visible por `businessHours.start`/`.end` (string "HH:mm") | Task 4 (`parseHHMM`) |
| Clic en evento → popover | Task 3 + Task 4 (`EventComponent`) |
| Popover: mascota, dueño, hora, status, "Ver detalle" | Task 3 |
| Solo lectura (sin crear desde slots) | Task 4 (`selectable={false}`) |
| Locale español | Task 4 (`culture="es"`, `messages`) |
| Tabs se ocultan en vista calendario | Task 5 |
| Popover usa `components/ui/popover.tsx` (Base UI) | Task 3 |
| date-fns ya instalado | No necesita instalación |
| Integración estilos con sistema de diseño | Task 5 (globals.css) |

### Sin placeholders ✓

Todo el código está completo. Comandos con output esperado en cada paso.

### Consistencia de tipos ✓

- `AppointmentResource` definido y exportado en `AppointmentPopover.tsx` (Task 3) → importado en `CalendarView.tsx` (Task 4)
- `BusinessHoursConfig` importado de `lib/utils/time-slots.ts` en ambos Task 4 y Task 5
- `CalendarEvent.resource` es `AppointmentResource` — consistente en Task 3 y Task 4
- `parseHHMM(timeStr: string): Date` definido y usado en el mismo archivo (Task 4)
- `VALID_TABS` en `page.tsx` (Task 5) mantiene los mismos valores que en la API (Task 2)
