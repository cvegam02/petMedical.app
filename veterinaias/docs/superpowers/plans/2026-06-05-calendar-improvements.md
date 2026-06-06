# Calendar Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/dashboard/appointments` calendar with Day view, service type filters, and an inline side panel replacing the modal dialog.

**Architecture:** Two focused changes — a new `CalendarSidePanel` component (extracts + adapts the dialog header/body into a panel), and an updated `CalendarView` that wires in the panel, filter bar, and Day view. No other files touched.

**Tech Stack:** react-big-calendar (already installed), date-fns, Tailwind CSS, existing `SERVICE_PANELS` and `DashboardAppointment` types.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/appointments/CalendarSidePanel.tsx` | **Create** | Inline panel: pet header + status stripe + service-specific panel |
| `components/appointments/CalendarView.tsx` | **Modify** | Day view, filter bar, swap dialog → side panel |

---

### Task 1: Create `CalendarSidePanel`

**Files:**
- Create: `veterinaias/components/appointments/CalendarSidePanel.tsx`

The panel is a narrow column (`w-80`) that renders the appointment header (same as `AppointmentDetailDialog`) plus the service-specific `Panel` from `SERVICE_PANELS`. It lives inside the calendar's flex layout.

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { X, Calendar, Clock, Phone, Cat, Dog, PawPrint } from 'lucide-react'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import { SERVICE_PANELS } from './panels'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface CalendarSidePanelProps {
  appointment: DashboardAppointment
  onClose: () => void
  onRefresh: () => void
}

function speciesIcon(name: string | undefined) {
  const s = (name ?? '').toLowerCase()
  if (s.includes('fel') || s.includes('gat')) return Cat
  if (s.includes('can') || s.includes('perr')) return Dog
  return PawPrint
}

export function CalendarSidePanel({ appointment, onClose, onRefresh }: CalendarSidePanelProps) {
  const router = useRouter()
  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const serviceType = appointment.service_type ?? 'consultation'
  const isGrooming = serviceType === 'grooming'
  const svc = serviceTypeConfig(serviceType)
  const ServiceIcon = svc.Icon
  const SpeciesIcon = speciesIcon(appointment.pet?.species?.name)
  const Panel = SERVICE_PANELS[serviceType] ?? SERVICE_PANELS.consultation!

  const dateObj = new Date(appointment.scheduled_at)
  const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="w-80 shrink-0 border-l border-border flex flex-col overflow-hidden bg-card">
      {/* Status stripe */}
      <div className={`h-1 w-full shrink-0 ${statusCfg.stripe}`} />

      {/* Pet header */}
      <div className="px-4 pt-4 pb-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
              <SpeciesIcon size={20} strokeWidth={1.75} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-base leading-tight truncate">
                {appointment.pet?.name ?? '—'}
              </p>
              {appointment.pet?.species && (
                <p className="text-xs text-muted-foreground truncate">{appointment.pet.species.name}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border bg-muted/40 text-foreground/70">
                  <ServiceIcon size={9} strokeWidth={2.25} />{svc.label}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Date / time / owner */}
      <div className="px-4 py-3 border-b border-border/60 space-y-2">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-muted-foreground/60 shrink-0" />
          <span className="capitalize text-foreground text-xs">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-muted-foreground/60 shrink-0" />
          <span className="text-foreground font-medium tabular-nums text-xs">{timeStr}</span>
          {!isGrooming && appointment.duration_minutes && (
            <span className="text-muted-foreground text-xs">· {appointment.duration_minutes} min</span>
          )}
        </div>
        {appointment.owner && (
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-muted-foreground/60 shrink-0" />
            <span className="font-medium text-foreground text-xs truncate">{appointment.owner.full_name}</span>
            {appointment.owner.phone && (
              <a href={`tel:${appointment.owner.phone}`} className="text-xs text-primary hover:underline tabular-nums ml-auto shrink-0">
                {appointment.owner.phone}
              </a>
            )}
          </div>
        )}
        {appointment.reason && !isGrooming && (
          <p className="text-xs text-muted-foreground italic pl-[21px]">"{appointment.reason}"</p>
        )}
        {isGrooming && appointment.reason && (
          <div className="pl-[21px] flex flex-wrap gap-1">
            {appointment.reason.split(', ').filter(Boolean).map(s => (
              <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border bg-muted/40 text-foreground/70">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Service-specific panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Panel
          appointment={appointment}
          onClose={onClose}
          onRefresh={() => { onRefresh(); router.refresh() }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

Expected: no output (no errors).

---

### Task 2: Update `CalendarView`

**Files:**
- Modify: `veterinaias/components/appointments/CalendarView.tsx`

Changes:
1. Add `Views.DAY` to the views array
2. Add `activeFilters` state + filter bar UI
3. Derive `filteredEvents` from `events + activeFilters`
4. Remove `AppointmentDetailDialog` + `dialogOpen` state; replace with `selected: DashboardAppointment | null`
5. Change layout to `flex` row so panel sits beside the calendar
6. Use `DashboardAppointment` as the resource type (same shape as `AppointmentResource`, avoids a separate import)

- [ ] **Step 1: Replace `CalendarView.tsx` entirely**

```tsx
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import type { EventProps, View } from 'react-big-calendar'
import { format, parse, startOfWeek, endOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { serviceTypeConfig } from '@/lib/constants/service-type'
import { CalendarSidePanel } from './CalendarSidePanel'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'
import type { ServiceType } from '@/lib/types/database'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
})

const SERVICE_FILTERS: { type: ServiceType; label: string }[] = [
  { type: 'consultation', label: 'Consulta' },
  { type: 'grooming',     label: 'Estética' },
  { type: 'boarding',     label: 'Hotel'    },
  { type: 'surgery',      label: 'Cirugía'  },
]

interface CalendarEvent {
  title: string
  start: Date
  end: Date
  resource: DashboardAppointment
}

function EventComponent({ event }: EventProps<CalendarEvent>) {
  const { Icon } = serviceTypeConfig(event.resource.service_type)
  return (
    <span className="w-full h-full flex items-center justify-center gap-1 px-1 overflow-hidden">
      <Icon size={10} strokeWidth={2.25} className="shrink-0" />
      <span className="text-[11px] truncate leading-tight">
        {event.resource.pet?.name ?? '—'}
        {event.resource.pet?.species ? ` · ${event.resource.pet.species.name}` : ''}
      </span>
    </span>
  )
}

function eventPropGetter(event: CalendarEvent) {
  return { className: `rbc-event--${event.resource.status}` }
}

function parseHHMM(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return new Date(1970, 0, 1, hours, minutes, 0, 0)
}

interface CalendarViewProps {
  businessHours: BusinessHoursConfig
}

export function CalendarView({ businessHours }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<View>(Views.WEEK)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<ServiceType>>(new Set())
  const abortRef = useRef<AbortController | null>(null)
  const lastRangeRef = useRef<{ from: Date; to: Date } | null>(null)

  const components = useMemo(() => ({ event: EventComponent }), [])

  const filteredEvents = useMemo(
    () =>
      activeFilters.size === 0
        ? events
        : events.filter(e => activeFilters.has(e.resource.service_type ?? 'consultation')),
    [events, activeFilters]
  )

  function toggleFilter(type: ServiceType) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    lastRangeRef.current = { from, to }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const url = `/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) { setError('No se pudieron cargar las citas.'); return }
      const json = await res.json()
      const apts: DashboardAppointment[] = json.data ?? []
      setEvents(
        apts.map(apt => {
          const start = new Date(apt.scheduled_at)
          const end = new Date(start.getTime() + (apt.duration_minutes ?? 30) * 60_000)
          return { title: apt.pet?.name ?? '—', start, end, resource: apt }
        })
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('No se pudieron cargar las citas.')
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRange(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      endOfWeek(new Date(), { weekStartsOn: 1 })
    )
    return () => { abortRef.current?.abort() }
  }, [fetchRange])

  useEffect(() => {
    function onCreated() {
      const r = lastRangeRef.current
      if (r) fetchRange(r.from, r.to)
    }
    window.addEventListener('appointment:created', onCreated)
    return () => window.removeEventListener('appointment:created', onCreated)
  }, [fetchRange])

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        fetchRange(range[0], range[range.length - 1])
      } else {
        fetchRange(range.start, range.end)
      }
    },
    [fetchRange]
  )

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelected(event.resource)
  }, [])

  const refetchCurrent = useCallback(() => {
    const r = lastRangeRef.current
    if (r) fetchRange(r.from, r.to)
  }, [fetchRange])

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveFilters(new Set())}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
            activeFilters.size === 0
              ? 'bg-secondary-foreground text-primary-foreground border-secondary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
          }`}
        >
          Todos
        </button>
        {SERVICE_FILTERS.map(({ type, label }) => {
          const { Icon } = serviceTypeConfig(type)
          const active = activeFilters.has(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleFilter(type)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                active
                  ? 'bg-secondary-foreground text-primary-foreground border-secondary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              <Icon size={11} strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Calendar + side panel */}
      <div className="flex rounded-xl border border-border overflow-hidden" style={{ height: 650 }}>
        {/* Calendar */}
        <div className="relative flex-1 min-w-0">
          {loading && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              <div className="rbc-loading-shimmer absolute inset-0" />
              <div className="rbc-loading-scanline" />
            </div>
          )}
          <div className={`rbc-wrapper h-full transition-opacity duration-500 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <Calendar<CalendarEvent>
              localizer={localizer}
              events={filteredEvents}
              date={currentDate}
              onNavigate={setCurrentDate}
              view={currentView}
              onView={(v) => { setCurrentView(v); setSelected(null) }}
              views={[Views.DAY, Views.WEEK, Views.MONTH]}
              onRangeChange={handleRangeChange}
              min={parseHHMM(businessHours.start)}
              max={parseHHMM(businessHours.end)}
              culture="es"
              components={components}
              eventPropGetter={eventPropGetter}
              onSelectEvent={handleSelectEvent}
              selectable={false}
              style={{ height: '100%' }}
              messages={{
                day: 'Día',
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

        {/* Side panel — slides in when appointment selected */}
        {selected && (
          <CalendarSidePanel
            appointment={selected}
            onClose={() => setSelected(null)}
            onRefresh={refetchCurrent}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd veterinaias && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Verify in browser**
  - Open `http://localhost:3000/dashboard/appointments?vista=calendario`
  - Confirm three view buttons appear: Día / Semana / Mes
  - Confirm filter pills appear above the calendar: Todos / Consulta / Estética / Hotel / Cirugía
  - Click an event → side panel opens on the right, calendar narrows
  - Click X in panel → panel closes, calendar expands back
  - Toggle a filter → only matching events shown
  - Click Todos → all events shown again
  - Switch to Día view → single-day grid renders

---

## Self-Review

**Spec coverage:**
- ✅ Day view native react-big-calendar → `Views.DAY` added
- ✅ Week and Month preserved → unchanged
- ✅ Navigation between dates → react-big-calendar built-in (unchanged)
- ✅ Filter by service type → `activeFilters` Set + filter bar
- ✅ Side panel with AppointmentPanel info → `CalendarSidePanel` with `SERVICE_PANELS`
- ✅ Modal dialog removed from calendar context → `AppointmentDetailDialog` no longer used in `CalendarView`

**Placeholder scan:** None found.

**Type consistency:**
- `DashboardAppointment` used throughout — same type in `CalendarEvent.resource`, `CalendarSidePanel` props, and `SERVICE_PANELS` `PanelProps`. ✅
- `ServiceType` from `@/lib/types/database` used in `activeFilters` Set and `SERVICE_FILTERS`. ✅
