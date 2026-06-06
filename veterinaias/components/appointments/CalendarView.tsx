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
      {/* Filter bar — same toggle style as the Lista/Calendario toggle in this page */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveFilters(new Set())}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            activeFilters.size === 0
              ? 'bg-secondary-foreground text-primary-foreground border-secondary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-secondary-foreground text-primary-foreground border-secondary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
      <div className="flex rounded-xl border border-border overflow-hidden" style={{ height: 640 }}>
        {/* Calendar */}
        <div className="relative flex-1 min-w-0">
          {loading && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-sm">
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

        {/* Side panel — slides in from right when an appointment is selected */}
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
